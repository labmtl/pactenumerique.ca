import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveCommitment,
  createBlindCircle,
  incrementBlindCircle,
  getBlindCircle,
  markCircleTriggered,
  addCirclePushListener,
  getCirclePushListeners,
  getTerritoryStats,
  initDatabase
} from '../src/services/db.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Service de Persistance & Logique de Masse Critique', () => {
  const testBlindId = 'e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0';

  it('enregistre un engagement et met à jour les agrégats territoriaux', async () => {
    const commitment = {
      id: 'test-uuid-001',
      fsa: 'H2T',
      province: 'QC',
      emailHash: 'hash123',
      encryptedEmail: null,
      pushSubscription: { endpoint: 'https://example.com/push/1' },
      targetNetworks: ['X / Twitter', 'Instagram']
    };

    await saveCommitment(commitment);
    const stats = await getTerritoryStats();

    assert.ok(stats.total_national >= 1);
    assert.ok(stats.provinces.QC >= 1);
    const h2tStat = stats.fsa_top.find(s => s.fsa === 'H2T');
    assert.ok(h2tStat);
    assert.ok(h2tStat.signers_count >= 1);
  });

  it('gère le cycle de vie d\'un cercle aveugle et déclenche le déblocage au seuil', async () => {
    // Créer un cercle avec un seuil de 3 personnes
    await createBlindCircle({ blindId: testBlindId, targetCount: 3 });

    // Enregistrer un écouteur push
    await addCirclePushListener({
      id: 'listener-001',
      blindId: testBlindId,
      pushSubscription: { endpoint: 'https://example.com/push/alice' }
    });

    const listeners = await getCirclePushListeners(testBlindId);
    assert.strictEqual(listeners.length, 1);
    assert.strictEqual(listeners[0].endpoint, 'https://example.com/push/alice');

    // 1er ami rejoint : count = 2 / 3 -> non débloqué
    const step1 = await incrementBlindCircle(testBlindId);
    assert.strictEqual(step1.current_count, 2);
    assert.strictEqual(step1.target_count, 3);
    assert.strictEqual(step1.unlocked, false);
    assert.strictEqual(step1.is_newly_unlocked, false);

    // 2e ami rejoint : count = 3 / 3 -> seuil atteint !
    const step2 = await incrementBlindCircle(testBlindId);
    assert.strictEqual(step2.current_count, 3);
    assert.strictEqual(step2.target_count, 3);
    assert.strictEqual(step2.unlocked, true);
    assert.strictEqual(step2.is_newly_unlocked, true);

    // Marquer comme notifié
    await markCircleTriggered(testBlindId);

    // Si une 4e personne rejoint après déblocage, is_newly_unlocked reste false
    const step3 = await incrementBlindCircle(testBlindId);
    assert.strictEqual(step3.current_count, 4);
    assert.strictEqual(step3.unlocked, true);
    assert.strictEqual(step3.is_newly_unlocked, false);

    // Test de getBlindCircle
    const circleData = await getBlindCircle(testBlindId);
    assert.ok(circleData);
    assert.strictEqual(circleData.blind_id, testBlindId);
    assert.strictEqual(circleData.current_count, 4);
    assert.strictEqual(circleData.target_count, 3);
    assert.strictEqual(circleData.unlocked, true);

    const nonExistent = await getBlindCircle('0000000000000000000000000000000000000000000000000000000000000000');
    assert.strictEqual(nonExistent, null);
  });

  it('exécute initDatabase sans erreur en mode mémoire', async () => {
    await assert.doesNotReject(async () => {
      await initDatabase();
    });
  });

  it('valide que schema.sql extrait correctement toutes les tables et index sans être tronqué par les commentaires', () => {
    const schemaPath = path.join(__dirname, '../src/db/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    const cleanSql = sql
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Vérifie la présence des 4 CREATE TABLE
    const createTables = statements.filter(s => s.toUpperCase().startsWith('CREATE TABLE'));
    assert.strictEqual(createTables.length, 4);

    assert.ok(createTables.some(s => s.includes('pact_commitments')));
    assert.ok(createTables.some(s => s.includes('blind_circles')));
    assert.ok(createTables.some(s => s.includes('circle_push_listeners')));
    assert.ok(createTables.some(s => s.includes('territory_stats')));

    // Vérifie la présence des 7 CREATE INDEX
    const createIndexes = statements.filter(s => s.toUpperCase().startsWith('CREATE INDEX'));
    assert.strictEqual(createIndexes.length, 7);
  });
});
