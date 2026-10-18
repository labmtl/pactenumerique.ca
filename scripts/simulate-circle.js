#!/usr/bin/env node

/**
 * Simulateur de signatures pour cercle d'amis - Pacte Numérique Canada
 * 
 * Permet de tester facilement le déblocage d'un cercle et la réception
 * des notifications Web Push en simulant l'ajout d'amis à un cercle existant.
 * 
 * Usage:
 *   node scripts/simulate-circle.js "<url_invitation_ou_id>" [nombre_amis] [options]
 * 
 * Exemples:
 *   node scripts/simulate-circle.js "http://localhost:3000/#cercle=6a41f8...&k=fK83..."
 *   node scripts/simulate-circle.js "http://localhost:3000/#cercle=6a41f8..." 4
 *   node scripts/simulate-circle.js 6a41f8a84668b598b0451cfdbec0ae0441fe972e259b3cfcc65ff1c8cae28318
 *   npm run circle:simulate -- "http://localhost:3000/#cercle=6a41f8..." 3
 */

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
======================================================================
 🍁 Simulateur de Cercle d'Amis & Notifications — Pacte Numérique ⚜️
======================================================================

Description:
  Prend en entrée une URL d'invitation privée ou un identifiant de cercle
  et simule l'adhésion successive d'amis jusqu'au déclenchement de la
  masse critique et de la notification Web Push.

Usage:
  node scripts/simulate-circle.js <url_ou_circle_id> [count] [options]
  npm run circle:simulate -- "<url_ou_circle_id>" [count]

Arguments:
  url_ou_circle_id   URL complète générée après la signature
                     (ex: "http://localhost:3000/#cercle=abc123...&k=xyz...")
                     ou identifiant aveugle hex de 64 caractères.
  count (optionnel)  Nombre d'utilisateurs à ajouter au cercle.
                     Par défaut, calcule automatiquement le nombre requis
                     pour déverrouiller le cercle (atteindre target_count).

Options:
  --server <url>     URL de base du serveur API (défaut: extrait de l'URL ou http://localhost:3000)
  --delay <ms>       Délai entre chaque adhésion en ms (défaut: 400)
  --mode <join|pact> Mode d'adhésion : 'join' (API /circle/join direct) ou
                     'pact' (API /pact/commit avec code postal canadien simulé)
  -h, --help         Affiche cette aide
`);
}

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  printHelp();
  process.exit(0);
}

// Extraction des arguments et options
let inputTarget = null;
let requestedCount = null;
let serverUrl = null;
let delayMs = 400;
let mode = 'join';

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--server' && args[i + 1]) {
    serverUrl = args[++i].replace(/\/$/, '');
  } else if (arg === '--delay' && args[i + 1]) {
    delayMs = parseInt(args[++i], 10) || 400;
  } else if (arg === '--mode' && args[i + 1]) {
    mode = args[++i];
  } else if (!arg.startsWith('-')) {
    if (!inputTarget) {
      inputTarget = arg;
    } else if (requestedCount === null) {
      const parsed = parseInt(arg, 10);
      if (!isNaN(parsed)) requestedCount = parsed;
    }
  }
}

if (!inputTarget) {
  console.error('❌ Erreur : Veuillez fournir une URL d\'invitation ou un identifiant de cercle.');
  printHelp();
  process.exit(1);
}

// Extraction de l'identifiant aveugle du cercle (64 hex characters)
let circleId = null;

// Cas 1 : URL contenant #cercle=... ou ?cercle=...
const cercleMatch = inputTarget.match(/[#?&]cercle=([a-f0-9]{64})/i);
if (cercleMatch) {
  circleId = cercleMatch[1];
} else if (/^[a-f0-9]{64}$/i.test(inputTarget.trim())) {
  // Cas 2 : Identifiant hex direct
  circleId = inputTarget.trim();
} else {
  // Recherche d'un hash hex de 64 caractères n'importe où dans la chaîne
  const anyHex64 = inputTarget.match(/[a-f0-9]{64}/i);
  if (anyHex64) {
    circleId = anyHex64[0];
  }
}

if (!circleId) {
  console.error(`❌ Erreur : Impossible d'extraire un identifiant de cercle valide (64 caractères hexadécimaux) de : "${inputTarget}"`);
  process.exit(1);
}

// Détection de l'URL du serveur si non spécifiée
if (!serverUrl) {
  if (inputTarget.startsWith('http://') || inputTarget.startsWith('https://')) {
    try {
      const parsedUrl = new URL(inputTarget);
      if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
        serverUrl = parsedUrl.origin;
      } else {
        // Domaine externe (ex: pactenumerique.ca) : si testé en local, privilégier localhost:3000
        serverUrl = 'http://localhost:3000';
        console.log(`ℹ Domaine distant "${parsedUrl.origin}" détecté dans l'URL. Redirection vers le serveur local de test : ${serverUrl}`);
      }
    } catch {
      serverUrl = 'http://localhost:3000';
    }
  } else {
    serverUrl = process.env.APP_URL || 'http://localhost:3000';
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Échantillons de codes postaux canadiens pour mode 'pact'
const SAMPLE_POSTAL_CODES = [
  'H2T 2N5', 'G1R 2J7', 'H2X 1Y4', 'J4P 2L1', 'H3B 1A7',
  'K1P 1J1', 'M5V 2T6', 'V6B 1A1', 'B3H 1P7', 'R3C 0P8'
];

async function run() {
  console.log(`\n=======================================================`);
  console.log(` 🍁 Pacte Numérique Canada — Simulateur de Cercle ⚜️`);
  console.log(`=======================================================`);
  console.log(`🎯 Cercle ciblé : ${circleId}`);
  console.log(`🌐 Serveur API   : ${serverUrl}`);
  console.log(`⚙️  Mode         : ${mode}`);
  console.log(`⏱️  Délai        : ${delayMs}ms par ami`);

  // 1. Vérification de l'état actuel du cercle
  let currentCount = 1;
  let targetCount = 5;
  let alreadyUnlocked = false;

  try {
    const statusRes = await fetch(`${serverUrl}/api/circle/${circleId}`);
    const isJson = (statusRes.headers.get('content-type') || '').includes('application/json');

    if (statusRes.ok && isJson) {
      const data = await statusRes.json();
      if (data.circle) {
        currentCount = data.circle.current_count;
        targetCount = data.circle.target_count;
        alreadyUnlocked = data.circle.unlocked;
        console.log(`\n📊 Statut actuel du cercle :`);
        console.log(`   • Signataires actuels : ${currentCount} / ${targetCount}`);
        console.log(`   • Seuil déverrouillé  : ${alreadyUnlocked ? 'Oui ✅' : 'Non ⏳'}`);
        console.log(`   • Déjà notifié        : ${data.circle.is_triggered ? 'Oui 🔔' : 'Non 🔕'}`);
      }
    } else if (statusRes.status === 404 || !isJson) {
      console.log(`\nℹ️  Le cercle n'est pas encore enregistré en base de données.`);
      console.log(`   Il sera initialisé dès la première signature.`);
    }
  } catch (err) {
    console.error(`\n❌ Impossible de contacter le serveur sur ${serverUrl} : ${err.message}`);
    console.error(`   Vérifiez que le serveur est bien démarré ("npm run dev" ou "npm start").`);
    process.exit(1);
  }

  // 2. Détermination du nombre d'adhésions à simuler
  let toAdd = requestedCount;
  if (toAdd === null) {
    if (alreadyUnlocked) {
      toAdd = 1; // Le seuil est déjà atteint, on en ajoute un pour la démonstration
      console.log(`\nℹ Le seuil de ce cercle est déjà atteint. Simulation de 1 adhésion supplémentaire...`);
    } else {
      toAdd = Math.max(1, targetCount - currentCount);
      console.log(`\n✨ Nombre calculé pour atteindre le seuil critique (${targetCount}) : ${toAdd} ami(s)`);
    }
  } else {
    console.log(`\n✨ Ajout programmé de ${toAdd} ami(s) au cercle...`);
  }

  // 3. Boucle d'adhésion successive
  let step = 0;
  let lastResult = null;

  for (let i = 0; i < toAdd; i++) {
    step++;
    await sleep(delayMs);

    try {
      let res;
      if (mode === 'pact') {
        const postal = SAMPLE_POSTAL_CODES[i % SAMPLE_POSTAL_CODES.length];
        res = await fetch(`${serverUrl}/api/pact/commit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postal_code: postal,
            inviter_circle_id: circleId,
            target_count: targetCount
          })
        });
      } else {
        res = await fetch(`${serverUrl}/api/circle/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blind_circle_id: circleId
          })
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error(`❌ Échec à l'étape ${step}/${toAdd} : ${errData.error || res.statusText}`);
        continue;
      }

      const data = await res.json();
      lastResult = data;

      const cCount = data.current_count || (data.circle_update && data.circle_update.current_count) || (currentCount + step);
      const tCount = data.target_count || (data.circle_update && data.circle_update.target_count) || targetCount;
      const isUnlocked = data.unlocked || (data.circle_update && data.circle_update.unlocked);
      const isNewlyUnlocked = (data.circle_update && data.circle_update.is_newly_unlocked);

      const percent = Math.min(100, Math.round((cCount / tCount) * 100));
      const progressBar = '█'.repeat(Math.round(percent / 10)) + '░'.repeat(10 - Math.round(percent / 10));

      if (isUnlocked || isNewlyUnlocked) {
        console.log(`   [${step}/${toAdd}] 👤 Ami rejoint ! Progression : [${progressBar}] ${cCount}/${tCount} (${percent}%) — 🔓 SEUIL ATTEINT !`);
      } else {
        console.log(`   [${step}/${toAdd}] 👤 Ami rejoint ! Progression : [${progressBar}] ${cCount}/${tCount} (${percent}%)`);
      }
    } catch (err) {
      console.error(`❌ Erreur réseau lors de l'adhésion : ${err.message}`);
    }
  }

  // 4. Bilan final
  console.log(`\n=======================================================`);
  const finalUnlocked = lastResult && (lastResult.unlocked || (lastResult.circle_update && lastResult.circle_update.unlocked));
  
  if (finalUnlocked) {
    console.log(` 🎉 SUCCÈS : MASSE CRITIQUE ATTEINTE !`);
    console.log(` 🔔 Le serveur a déverrouillé le seuil et déclenché l'envoi Web Push`);
    console.log(`    à tous les membres abonnés de ce cercle !`);
    console.log(` 👀 Regardez votre fureteur / le tableau de bord (mise à jour en temps réel).`);
    console.log(` 💡 Astuce notifications bureau :`);
    console.log(`    Si aucune bannière système n'apparaît sur votre écran macOS :`);
    console.log(`    1. Utilisez le bouton "🔔 Tester mes notifications" sur le tableau de bord.`);
    console.log(`    2. Vérifiez : Réglages Système macOS > Notifications > Google Chrome.`);
    console.log(`    3. Assurez-vous que le mode "Ne pas déranger / Concentration" est désactivé.`);
  } else {
    console.log(` ℹ Simulation terminée.`);
    console.log(`    Le cercle compte maintenant ${lastResult?.current_count || (currentCount + toAdd)} membres.`);
    console.log(`    Relancez le script pour ajouter d'autres amis jusqu'au seuil !`);
  }
  console.log(`=======================================================\n`);
}

run().catch(err => {
  console.error('Erreur critique simulation:', err);
  process.exit(1);
});
