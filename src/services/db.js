import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool = null;
let useMemoryFallback = false;

// Fallback en mémoire au cas où MySQL n'est pas encore configuré sur WHC ou en local
const memoryDb = {
  commitments: [],
  blindCircles: new Map(),
  circlePushListeners: [],
  territoryStats: new Map()
};

/**
 * Initialise le pool MySQL ou bascule en mode simulation
 */
export async function getDb() {
  if (pool) return pool;
  if (useMemoryFallback) return null;

  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pactenumerique',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    };

    const testPool = mysql.createPool(config);
    // Test de connexion rapide
    const connection = await testPool.getConnection();
    connection.release();
    pool = testPool;
    console.log(`[DB] Connexion MySQL établie avec succès sur ${config.host}:${config.port}/${config.database}`);
    return pool;
  } catch (err) {
    pool = null;
    useMemoryFallback = true;
    console.warn(`[DB] Avertissement: Impossible de se connecter à MySQL (${err.message}).`);
    console.warn(`[DB] Bascule temporaire en mode simulation mémoire (In-Memory). Renseignez le fichier .env avec vos identifiants WHC.ca pour activer MySQL.`);
    return null;
  }
}

/**
 * Exécute le schéma DDL pour initialiser les tables MySQL
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

    const connection = await p.getConnection();
    try {
      for (const statement of statements) {
        await connection.query(statement);
      }
      console.log('[DB] Schéma MySQL validé et tables vérifiées avec succès.');
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(`[DB] Erreur lors de l'initialisation du schéma MySQL: ${err.message}`);
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
    // MySQL
    await p.query(
      `INSERT INTO pact_commitments (id, fsa, province, email_hash, encrypted_email, push_subscription, target_networks)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
      [id, fsa, province, emailHash, encryptedEmail, pushJson, networksJson]
    );

    // Mise à jour de l'agrégat territorial
    await p.query(
      `INSERT INTO territory_stats (fsa, province, signers_count, target_threshold)
       VALUES (?, ?, 1, 100)
       ON DUPLICATE KEY UPDATE signers_count = signers_count + 1`,
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
       VALUES (?, ?, 1, 0)
       ON DUPLICATE KEY UPDATE target_count = VALUES(target_count)`,
      [blindId, targetCount]
    );
  } else {
    memoryDb.blindCircles.set(blindId, {
      blind_id: blindId,
      target_count: targetCount,
      current_count: 1,
      is_triggered: 0
    });
  }
}

/**
 * Incrémente un cercle aveugle
 */
export async function incrementBlindCircle(blindId) {
  const p = await getDb();
  if (p) {
    const [rows] = await p.query(
      `SELECT blind_id, target_count, current_count, is_triggered FROM blind_circles WHERE blind_id = ?`,
      [blindId]
    );

    if (rows.length === 0) {
      // Auto-création si non existant avec seuil par défaut 5
      await p.query(
        `INSERT INTO blind_circles (blind_id, target_count, current_count, is_triggered) VALUES (?, 5, 1, 0)`,
        [blindId]
      );
      return { current_count: 1, target_count: 5, unlocked: false, is_newly_unlocked: false };
    }

    const circle = rows[0];
    const newCount = circle.current_count + 1;
    const isUnlocked = newCount >= circle.target_count;
    const isNewlyUnlocked = isUnlocked && !circle.is_triggered;

    await p.query(
      `UPDATE blind_circles SET current_count = ? WHERE blind_id = ?`,
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
      circle = { blind_id: blindId, target_count: 5, current_count: 1, is_triggered: 0 };
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
    await p.query(`UPDATE blind_circles SET is_triggered = 1 WHERE blind_id = ?`, [blindId]);
  } else {
    const c = memoryDb.blindCircles.get(blindId);
    if (c) c.is_triggered = 1;
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
      `INSERT INTO circle_push_listeners (id, blind_id, push_subscription) VALUES (?, ?, ?)`,
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
    const [rows] = await p.query(
      `SELECT push_subscription FROM circle_push_listeners WHERE blind_id = ?`,
      [blindId]
    );
    return rows.map(r => JSON.parse(r.push_subscription));
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
    const [totalRows] = await p.query(`SELECT COUNT(*) as total FROM pact_commitments`);
    const [provRows] = await p.query(`SELECT province, COUNT(*) as count FROM pact_commitments GROUP BY province`);
    const [fsaRows] = await p.query(`SELECT fsa, province, signers_count, target_threshold FROM territory_stats ORDER BY signers_count DESC LIMIT 20`);

    const provinces = {};
    for (const r of provRows) {
      provinces[r.province] = r.count;
    }

    return {
      total_national: totalRows[0]?.total || 0,
      provinces,
      fsa_top: fsaRows
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
