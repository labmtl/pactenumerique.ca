import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, '../public/data/alternatives.json');

const alternatives = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

console.log(`\n🔍 Vérification de la disponibilité des ${alternatives.length} plateformes souveraines...\n`);

async function checkUrl(alt) {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(alt.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'PacteNumeriqueHealthCheck/1.0 (+https://pactenumerique.ca)'
      },
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const duration = Date.now() - start;

    if (res.ok) {
      const isMtl = alt.location?.city === 'Montreal' || alt.location?.city === 'Montréal';
      const isQc = isMtl || alt.location?.province === 'QC';
      const qcFlag = isMtl ? '🌹 MTL' : (isQc ? '⚜️ QC ' : '🍁 CA ');
      const langBadge = alt.support_fr && alt.support_en ? 'FR/EN' : (alt.support_fr ? 'FR' : 'EN');
      return {
        id: alt.id,
        name: alt.name,
        url: alt.url,
        status: res.status,
        duration,
        qcFlag,
        langBadge,
        ok: true
      };
    } else {
      return {
        id: alt.id,
        name: alt.name,
        url: alt.url,
        status: res.status,
        duration,
        ok: false
      };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      id: alt.id,
      name: alt.name,
      url: alt.url,
      status: err.name === 'AbortError' ? 'TIMEOUT' : 'ERROR',
      error: err.message,
      duration: Date.now() - start,
      ok: false
    };
  }
}

async function run() {
  const results = await Promise.all(alternatives.map(checkUrl));
  let onlineCount = 0;

  for (const r of results) {
    const padName = r.name.padEnd(28, ' ');
    const padUrl = r.url.padEnd(46, ' ');
    if (r.ok) {
      onlineCount++;
      console.log(`[${r.qcFlag}] [${r.langBadge.padEnd(5, ' ')}] ${padName} ${padUrl} ✔ ${r.status} OK (${r.duration}ms)`);
    } else {
      console.log(`[❌] ${padName} ${padUrl} ✖ Statut: ${r.status} (${r.error || ''})`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`Total plateformes vérifiées : ${results.length}`);
  console.log(`✔ En ligne et opérationnelles : ${onlineCount} / ${results.length} (${Math.round(onlineCount / results.length * 100)}%)`);
  if (onlineCount < results.length) {
    console.log(`❌ Échecs : ${results.length - onlineCount}`);
    process.exit(1);
  } else {
    console.log(`✨ Toutes les plateformes répondent correctement.`);
  }
}

run();
