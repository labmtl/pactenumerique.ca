import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool = null;
let useMemoryFallback = false;

// Fallback en mémoire au cas où PostgreSQL n'est pas encore configuré sur WHC ou en local
const memoryDb = {
  commitments: [],
  blindCircles: new Map(),
  circlePushListeners: [],
  territoryStats: new Map()
};

/**
 * Initialise le pool PostgreSQL ou bascule en mode simulation
 */
export async function getDb() {
  if (pool) return pool;
  if (useMemoryFallback) return null;

  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pactenumerique',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    };

    const testPool = new Pool(config);
    // Test de connexion rapide
    const client = await testPool.connect();
    client.release();
    pool = testPool;
    console.log(`[DB] Connexion PostgreSQL établie avec succès sur ${config.host}:${config.port}/${config.database}`);
    return pool;
  } catch (err) {
    pool = null;
    useMemoryFallback = true;
    console.warn(`[DB] Avertissement: Impossible de se connecter à PostgreSQL (${err.message}).`);
    console.warn(`[DB] Bascule temporaire en mode simulation mémoire (In-Memory). Renseignez le fichier .env avec vos identifiants PostgreSQL WHC.ca pour activer la persistance.`);
    return null;
  }
}

/**
 * Exécute le schéma DDL pour initialiser les tables PostgreSQL
 */
export async function initDatabase() {
  const p = await getDb();
  if (!p) {
    console.log('[DB] Mode mémoire actif: les tables sont prêtes en mémoire.');
    return;
  }

  try {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await p.query(statement);
    }
    console.log('[DB] Schéma PostgreSQL validé et tables vérifiées avec succès.');
  } catch (err) {
    console.error(`[DB] Erreur lors de l'initialisation du schéma PostgreSQL: ${err.message}`);
  }
}

/**
 * Enregistre un engagement de pacte
 */
export async function saveCommitment({ id, fsa, province, emailHash, encryptedEmail, pushSubscription, targetNetworks }) {
  const p = await getDb();
  const pushJson = pushSubscription ? JSON.stringify(pushSubscription) : null;
  const networksJson = targetNetworks ? JSON.stringify(targetNetworks) : null;

  if (p) {
    // PostgreSQL avec gestion de conflit
    await p.query(
      `INSERT INTO pact_commitments (id, fsa, province, email_hash, encrypted_email, push_subscription, target_networks)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET 
         push_subscription = EXCLUDED.push_subscription,
         target_networks = EXCLUDED.target_networks`,
      [id, fsa, province, emailHash, encryptedEmail, pushJson, networksJson]
    );

    // Mise à jour de l'agrégat territorial
    await p.query(
      `INSERT INTO territory_stats (fsa, province, signers_count, target_threshold)
       VALUES ($1, $2, 1, 100)
       ON CONFLICT (fsa) DO UPDATE SET signers_count = territory_stats.signers_count + 1`,
      [fsa, province]
    );
  } else {
    // Fallback mémoire
    memoryDb.commitments.push({
      id,
      fsa,
      province,
      emailHash,
      encryptedEmail,
      pushJson,
      targetNetworks: networksJson,
      created_at: new Date()
    });
    const current = memoryDb.territoryStats.get(fsa) || { fsa, province, signers_count: 0, target_threshold: 100 };
    current.signers_count += 1;
    memoryDb.territoryStats.set(fsa, current);
  }
}

/**
 * Crée un cercle aveugle
 */
export async function createBlindCircle({ blindId, targetCount = 5 }) {
  const p = await getDb();
  if (p) {
    await p.query(
      `INSERT INTO blind_circles (blind_id, target_count, current_count, is_triggered)
       VALUES ($1, $2, 1, FALSE)
       ON CONFLICT (blind_id) DO UPDATE SET target_count = EXCLUDED.target_count`,
      [blindId, targetCount]
    );
  } else {
    memoryDb.blindCircles.set(blindId, {
      blind_id: blindId,
      target_count: targetCount,
      current_count: 1,
      is_triggered: false
    });
  }
}

/**
 * Incrémente un cercle aveugle
 */
export async function incrementBlindCircle(blindId) {
  const p = await getDb();
  if (p) {
    const res = await p.query(
      `SELECT blind_id, target_count, current_count, is_triggered FROM blind_circles WHERE blind_id = $1`,
      [blindId]
    );

    if (res.rows.length === 0) {
      await p.query(
        `INSERT INTO blind_circles (blind_id, target_count, current_count, is_triggered) VALUES ($1, 5, 1, FALSE)`,
        [blindId]
      );
      return { current_count: 1, target_count: 5, unlocked: false, is_newly_unlocked: false };
    }

    const circle = res.rows[0];
    const newCount = circle.current_count + 1;
    const isUnlocked = newCount >= circle.target_count;
    const isNewlyUnlocked = isUnlocked && !circle.is_triggered;

    await p.query(
      `UPDATE blind_circles SET current_count = $1, updated_at = CURRENT_TIMESTAMP WHERE blind_id = $2`,
      [newCount, blindId]
    );

    return {
      current_count: newCount,
      target_count: circle.target_count,
      unlocked: isUnlocked,
      is_newly_unlocked: isNewlyUnlocked
    };
  } else {
    let circle = memoryDb.blindCircles.get(blindId);
    if (!circle) {
      circle = { blind_id: blindId, target_count: 5, current_count: 1, is_triggered: false };
      memoryDb.blindCircles.set(blindId, circle);
      return { current_count: 1, target_count: 5, unlocked: false, is_newly_unlocked: false };
    }
    circle.current_count += 1;
    const isUnlocked = circle.current_count >= circle.target_count;
    const isNewlyUnlocked = isUnlocked && !circle.is_triggered;
    return {
      current_count: circle.current_count,
      target_count: circle.target_count,
      unlocked: isUnlocked,
      is_newly_unlocked: isNewlyUnlocked
    };
  }
}

/**
 * Marque un cercle comme notifié
 */
export async function markCircleTriggered(blindId) {
  const p = await getDb();
  if (p) {
    await p.query(`UPDATE blind_circles SET is_triggered = TRUE, updated_at = CURRENT_TIMESTAMP WHERE blind_id = $1`, [blindId]);
  } else {
    const c = memoryDb.blindCircles.get(blindId);
    if (c) c.is_triggered = true;
  }
}

/**
 * Enregistre un écouteur Web Push pour un cercle aveugle
 */
export async function addCirclePushListener({ id, blindId, pushSubscription }) {
  const p = await getDb();
  const pushJson = JSON.stringify(pushSubscription);

  if (p) {
    await p.query(
      `INSERT INTO circle_push_listeners (id, blind_id, push_subscription) VALUES ($1, $2, $3)`,
      [id, blindId, pushJson]
    );
  } else {
    memoryDb.circlePushListeners.push({ id, blindId, push_subscription: pushJson });
  }
}

/**
 * Récupère les écouteurs Web Push d'un cercle
 */
export async function getCirclePushListeners(blindId) {
  const p = await getDb();
  if (p) {
    const res = await p.query(
      `SELECT push_subscription FROM circle_push_listeners WHERE blind_id = $1`,
      [blindId]
    );
    return res.rows.map(r => JSON.parse(r.push_subscription));
  } else {
    return memoryDb.circlePushListeners
      .filter(l => l.blindId === blindId)
      .map(l => JSON.parse(l.push_subscription));
  }
}

/**
 * Récupère les statistiques territoriales publiques
 */
export async function getTerritoryStats() {
  const p = await getDb();
  if (p) {
    const totalRes = await p.query(`SELECT COUNT(*) as total FROM pact_commitments`);
    const provRes = await p.query(`SELECT province, COUNT(*) as count FROM pact_commitments GROUP BY province`);
    const fsaRes = await p.query(`SELECT fsa, province, signers_count, target_threshold FROM territory_stats ORDER BY signers_count DESC LIMIT 20`);

    const provinces = {};
    for (const r of provRes.rows) {
      provinces[r.province] = Number(r.count);
    }

    return {
      total_national: Number(totalRes.rows[0]?.total || 0),
      provinces,
      fsa_top: fsaRes.rows.map(r => ({
        fsa: r.fsa,
        province: r.province,
        signers_count: Number(r.signers_count),
        target_threshold: Number(r.target_threshold)
      }))
    };
  } else {
    const provinces = {};
    for (const c of memoryDb.commitments) {
      provinces[c.province] = (provinces[c.province] || 0) + 1;
    }
    const fsa_top = Array.from(memoryDb.territoryStats.values())
      .sort((a, b) => b.signers_count - a.signers_count)
      .slice(0, 20);

    return {
      total_national: memoryDb.commitments.length,
      provinces,
      fsa_top
    };
  }
}
