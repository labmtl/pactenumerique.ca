import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const alternativesPath = path.join(rootDir, 'public/data/alternatives.json');
const longevityDir = path.join(rootDir, 'data/longevity');

// Assurer l'existence du répertoire data/longevity
if (!fs.existsSync(longevityDir)) {
  fs.mkdirSync(longevityDir, { recursive: true });
}

/**
 * Extrait le domaine de premier niveau organisationnel (Apex domain)
 */
function getApexDomain(hostname) {
  const host = hostname.toLowerCase();
  const parts = host.split('.');
  if (parts.length <= 2) return host;

  if (host.endsWith('umontreal.ca')) return 'umontreal.ca';

  // Cas général : prendre les 2 dernières parties (ex: facil.services, stockage.quebec, encommun.io)
  return parts.slice(-2).join('.');
}

/**
 * Interroge le protocole RDAP avec User-Agent adapté et repli automatique vers WHOIS
 */
async function fetchDomainRegistration(domain) {
  // 1. Tentative RDAP (standard REST/JSON de l'ICANN / CIRA)
  try {
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rdap+json, application/json'
      },
      redirect: 'follow'
    });

    if (res.ok) {
      const data = await res.json();
      const regEvent = data.events?.find(e => e.eventAction === 'registration');
      const registrar = data.entities?.[0]?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3] || null;

      if (regEvent?.eventDate) {
        const iso = regEvent.eventDate;
        const ym = iso.slice(0, 7);
        return {
          success: true,
          source: 'rdap',
          domain,
          registration_date: iso,
          registration_ym: ym,
          registrar,
          events: data.events || []
        };
      }
    }
  } catch (err) {
    // Échec réseau RDAP, on tente WHOIS ci-dessous
  }

  // 2. Repli vers la commande WHOIS système
  try {
    const out = execSync(`whois ${domain}`, { timeout: 10000, encoding: 'utf-8' });
    const match = out.match(/(?:Creation Date|created|Registration Date):\s*([0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9:]+)/i)
      || out.match(/(?:created-date|creation date):\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);

    if (match) {
      const rawDate = match[1].trim();
      const ym = rawDate.slice(0, 7);
      return {
        success: true,
        source: 'whois',
        domain,
        registration_date: rawDate,
        registration_ym: ym,
        registrar: null,
        raw_output_snippet: out.slice(0, 500)
      };
    }
  } catch (err) {
    // Échec WHOIS
  }

  return {
    success: false,
    domain,
    error: 'Impossible d’extraire la date d’enregistrement par RDAP ou WHOIS'
  };
}

/**
 * Interroge l'API CDX de la Wayback Machine (Internet Archive) pour obtenir le premier instantané archivé
 */
async function fetchWaybackFirstSnapshot(urlStr) {
  try {
    const u = new URL(urlStr);
    const target = u.hostname + (u.pathname.length > 1 ? u.pathname.replace(/\/$/, '') : '');
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(target)}&limit=1&output=json`;

    const res = await fetch(cdxUrl, {
      headers: {
        'User-Agent': 'PacteNumeriqueLongevityBot/1.0 (+https://pactenumerique.ca)'
      }
    });

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 1) {
        const record = rows[1];
        const timestamp = record[1]; // format YYYYMMDDhhmmss
        const originalUrl = record[2];
        const ym = `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}`;
        const fullDate = `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;
        const snapshotUrl = `https://web.archive.org/web/${timestamp}/${originalUrl}`;

        return {
          success: true,
          timestamp,
          first_snapshot_ym: ym,
          first_snapshot_date: fullDate,
          snapshot_url: snapshotUrl
        };
      } else {
        return {
          success: true,
          first_snapshot_ym: null,
          message: 'Aucun instantané archivé trouvé sur Wayback Machine'
        };
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }

  return { success: false, error: 'Réponse invalide de l’API CDX Wayback Machine' };
}

/**
 * Détermine la date cible 'established' (YYYY-MM)
 */
function resolveEstablishedDate(alt, domainReg, waybackSnap) {
  const u = new URL(alt.url);
  const apex = getApexDomain(u.hostname);
  const isSubdomain = u.hostname !== apex;

  const regYm = domainReg?.registration_ym || null;
  const wbYm = waybackSnap?.first_snapshot_ym || null;

  // Si le service est sur un sous-domaine d'une grande organisation (ex: jasette.facil.services, classe.iro.umontreal.ca)
  if (isSubdomain) {
    if (wbYm) {
      return { established: wbYm, reason: 'Premier instantané web documenté sur le sous-domaine spécifique' };
    }
    if (regYm) {
      return { established: regYm, reason: 'Date d’enregistrement du domaine de l’organisation hôte' };
    }
  }

  // Pour un domaine dédié (ex: pataterie.ca, mastodon.quebec, beluga.quebec) :
  // La date d'enregistrement du domaine détenu par l'organisation est la référence première
  if (regYm && wbYm) {
    // Si l'archive web précède l'enregistrement (ex: domaine réenregistré), prendre la plus ancienne
    const earliest = regYm < wbYm ? regYm : wbYm;
    return { established: earliest, reason: 'Date d’enregistrement du domaine ou plus ancienne trace web' };
  }

  if (regYm) {
    return { established: regYm, reason: 'Date d’enregistrement du nom de domaine via RDAP/WHOIS' };
  }

  if (wbYm) {
    return { established: wbYm, reason: 'Première capture web archivée sur la Wayback Machine' };
  }

  return { established: '2024-01', reason: 'Date par défaut estimée (nécessite audit manuel)' };
}

/**
 * Calcule l'âge en années et mois par rapport à la date courante
 */
function calculateAge(ymStr) {
  if (!ymStr || !ymStr.match(/^\d{4}-\d{2}$/)) return '';
  const [year, month] = ymStr.split('-').map(Number);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let totalMonths = (currentYear - year) * 12 + (currentMonth - month);
  if (totalMonths < 0) totalMonths = 0;

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  const parts = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? 's' : ''}`);
  if (months > 0 && years < 5) parts.push(`${months} mois`);
  return parts.length > 0 ? parts.join(' et ') : '< 1 mois';
}

/**
 * Exécution principale de l'audit
 */
async function main() {
  const args = process.argv.slice(2);
  const forceRefresh = args.includes('--force') || args.includes('-f');
  const targetId = args.find((arg, idx) => args[idx - 1] === '--id');

  console.log(`\n======================================================`);
  console.log(`🛡️  AUDIT DE LONGÉVITÉ & PÉRENNITÉ DES DOMAINES SOUVERAINS`);
  console.log(`======================================================`);
  console.log(`Mode : ${forceRefresh ? 'Forcer rafraîchissement réseau' : 'Lecture cache archive prioritaire'}`);
  if (targetId) console.log(`Cible unique : ${targetId}`);
  console.log(`Répertoire des audits : ${longevityDir}\n`);

  const alternatives = JSON.parse(fs.readFileSync(alternativesPath, 'utf-8'));
  let updatedCount = 0;
  let cachedCount = 0;
  let networkCount = 0;

  for (const alt of alternatives) {
    if (targetId && alt.id !== targetId) continue;

    const auditFile = path.join(longevityDir, `${alt.id}.json`);
    let auditData = null;

    if (!forceRefresh && fs.existsSync(auditFile)) {
      // Charger le fichier d'audit déjà archivé
      try {
        auditData = JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
        cachedCount++;
      } catch (e) {
        auditData = null;
      }
    }

    if (!auditData) {
      // Exécuter l'interrogation réseau
      networkCount++;
      const u = new URL(alt.url);
      const apex = getApexDomain(u.hostname);

      process.stdout.write(`🌐 Audit réseau pour ${alt.name} (${apex})... `);

      const [domainReg, waybackSnap] = await Promise.all([
        fetchDomainRegistration(apex),
        fetchWaybackFirstSnapshot(alt.url)
      ]);

      const resolution = resolveEstablishedDate(alt, domainReg, waybackSnap);

      auditData = {
        id: alt.id,
        name: alt.name,
        url: alt.url,
        apex_domain: apex,
        audited_at: new Date().toISOString(),
        established: resolution.established,
        established_reason: resolution.reason,
        domain_registration: domainReg.registration_ym || null,
        first_web_archive: waybackSnap.first_snapshot_ym || null,
        sources: {
          rdap_whois: domainReg,
          wayback_machine: waybackSnap
        }
      };

      // Sauvegarder dans data/longevity/<id>.json
      fs.writeFileSync(auditFile, JSON.stringify(auditData, null, 2) + '\n', 'utf-8');
      process.stdout.write(`✔ Résolu: ${resolution.established}\n`);

      // Courtoisie réseau (pause de 300ms entre les requêtes externes)
      await new Promise(r => setTimeout(r, 300));
    }

    // Synchroniser la date established dans l'objet alternative
    if (alt.established !== auditData.established) {
      alt.established = auditData.established;
      updatedCount++;
    }

    const age = calculateAge(auditData.established);
    const badgeSrc = auditData.sources.rdap_whois?.success ? 'RDAP/WHOIS' : 'Wayback';
    const sourceStatus = fs.existsSync(auditFile) && !forceRefresh && cachedCount > 0 ? '📁 ARCHIVE' : '🌐 RÉSEAU';

    console.log(
      `[${sourceStatus}] ${alt.name.padEnd(28, ' ')} ` +
      `📅 ${auditData.established} (${age.padEnd(16, ' ')}) ` +
      `| Domaine: ${auditData.domain_registration || 'N/D'} ` +
      `| Archive: ${auditData.first_web_archive || 'N/D'}`
    );
  }

  // Écriture du fichier alternatives.json synchronisé
  fs.writeFileSync(alternativesPath, JSON.stringify(alternatives, null, 2) + '\n', 'utf-8');

  console.log(`\n======================================================`);
  console.log(`Plateformes vérifiées : ${alternatives.length}`);
  console.log(`- Fichiers d'audit existants réutilisés : ${cachedCount}`);
  console.log(`- Audits réseau effectués et archivés : ${networkCount}`);
  console.log(`- alternatives.json mis à jour avec le champ 'established' (YYYY-MM).`);
  console.log(`✨ Fichiers d'audit sauvegardés dans data/longevity/*.json\n`);
}

main().catch(err => {
  console.error('Erreur lors de l’audit de longévité :', err);
  process.exit(1);
});
