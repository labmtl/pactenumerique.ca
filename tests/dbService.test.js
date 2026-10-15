import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveCommitment,
  createBlindCircle,
  incrementBlindCircle,
  markCircleTriggered,
  addCirclePushListener,
  getCirclePushListeners,
  getTerritoryStats
} from '../src/services/db.js';

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
  });
});
