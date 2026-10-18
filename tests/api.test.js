import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import pactRoutes from '../src/routes/pact.js';
import statsRoutes from '../src/routes/stats.js';
import relayRoutes from '../src/routes/relay.js';

describe('Intégration API HTTP REST', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/pact', pactRoutes);
    app.use('/api/circle', pactRoutes);
    app.use('/api/stats', statsRoutes);
    app.use('/api/relay', relayRoutes);
    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  it('GET /api/health répond avec un statut 200 OK', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
  });

  it('GET /api/stats/territory retourne les statistiques territoriales', async () => {
    const res = await fetch(`${baseUrl}/api/stats/territory`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.total_national === 'number');
    assert.ok(data.provinces);
    assert.ok(Array.isArray(data.fsa_top));
  });

  it('GET /api/stats/alternatives renvoie le catalogue des réseaux souverains', async () => {
    const res = await fetch(`${baseUrl}/api/stats/alternatives`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 5);

    // Vérifier les propriétés d'une entrée
    const qlub = data.find(item => item.id === 'qlub');
    assert.ok(qlub);
    assert.strictEqual(qlub.location.province, 'QC');
    assert.strictEqual(qlub.location.country, 'CA');
    assert.strictEqual(qlub.stack.is_opensource, true);
    assert.ok(qlub.replaces.includes('X / Twitter'));
  });

  it('POST /api/pact/commit rejette un code postal invalide avec code 400', async () => {
    const res = await fetch(`${baseUrl}/api/pact/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postal_code: 'INVALID_CODE' })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  it('POST /api/pact/commit valide et enregistre un engagement citoyen', async () => {
    const blindId = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
    const payload = {
      postal_code: 'G1K 7P4',
      email: 'citoyen.test@exemple.ca',
      blind_circle_id: blindId,
      target_count: 5,
      target_networks: {
        leaving: ['X / Twitter', 'Instagram'],
        chosen_alternative: 'qlub'
      }
    };

    const res = await fetch(`${baseUrl}/api/pact/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.fsa, 'G1K');
    assert.strictEqual(data.province, 'QC');
    assert.ok(data.id);
  });

  it('POST /api/circle/join incrémente un cercle aveugle', async () => {
    const blindId = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
    const res = await fetch(`${baseUrl}/api/circle/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blind_circle_id: blindId })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.current_count >= 2);
  });

  it('GET /api/circle/:id retourne les détails d\'un cercle aveugle ou 404', async () => {
    const blindId = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
    const res = await fetch(`${baseUrl}/api/circle/${blindId}`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.circle);
    assert.strictEqual(data.circle.blind_id, blindId);
    assert.ok(data.circle.current_count >= 2);

    // Cercle inconnu -> 404
    const res404 = await fetch(`${baseUrl}/api/circle/0000000000000000000000000000000000000000000000000000000000000000`);
    assert.strictEqual(res404.status, 404);

    // ID invalide -> 400
    const res400 = await fetch(`${baseUrl}/api/circle/invalid-id`);
    assert.strictEqual(res400.status, 400);
  });

  it('POST /api/circle/subscribe associe un abonnement push ou renvoie 400', async () => {
    const blindId = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
    
    // Succès
    const resOk = await fetch(`${baseUrl}/api/circle/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blind_circle_id: blindId,
        push_subscription: { endpoint: 'https://example.com/push/sub1' }
      })
    });
    assert.strictEqual(resOk.status, 200);
    const dataOk = await resOk.json();
    assert.strictEqual(dataOk.success, true);

    // Paramètres manquants
    const resBad = await fetch(`${baseUrl}/api/circle/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blind_circle_id: 'invalid-id',
        push_subscription: null
      })
    });
    assert.strictEqual(resBad.status, 400);
  });

  it('POST & GET /api/relay/:circleHash gère la boîte morte chiffrée Zero-Knowledge', async () => {
    const validCircleHash = 'a1b2c3d4e5f60718293a4b5c6d7e8f00112233445566778899aabbccddeeff00';

    // 1. Rejet d'un hash de cercle invalide
    const resBadHash = await fetch(`${baseUrl}/api/relay/not-a-valid-hash`, {
      method: 'GET'
    });
    assert.strictEqual(resBadHash.status, 400);

    // Calcul d'un nonce PoW valide pour validCircleHash (hash commençant par '00')
    const crypto = await import('node:crypto');
    let validNonce = 0;
    while (true) {
      const hash = crypto.createHash('sha256').update(`${validCircleHash}:${validNonce}`).digest('hex');
      if (hash.startsWith('00')) break;
      validNonce++;
    }

    // 2a. Rejet si la preuve de travail est erronée
    const resBadPow = await fetch(`${baseUrl}/api/relay/${validCircleHash}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        iv: 'dGVzdF9pdl8xMmJ5dGVz',
        ciphertext: 'ZW5jcnlwdGVkX2NoYXJfeXB0b19kYXRhX2hlcmU',
        pow_nonce: 99999999
      })
    });
    assert.strictEqual(resBadPow.status, 400);

    // 2b. Dépôt réussi avec PoW valide d'un blob chiffré (< 4 Ko)
    const resPost = await fetch(`${baseUrl}/api/relay/${validCircleHash}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        iv: 'dGVzdF9pdl8xMmJ5dGVz',
        ciphertext: 'ZW5jcnlwdGVkX2NoYXJfeXB0b19kYXRhX2hlcmU',
        pow_nonce: validNonce
      })
    });
    assert.strictEqual(resPost.status, 201);
    const postData = await resPost.json();
    assert.strictEqual(postData.success, true);
    assert.strictEqual(postData.circle_hash, validCircleHash);

    // 3. Récupération des blobs chiffrés pour ce cercle
    const resGet = await fetch(`${baseUrl}/api/relay/${validCircleHash}`);
    assert.strictEqual(resGet.status, 200);
    const getData = await resGet.json();
    assert.strictEqual(getData.success, true);
    assert.ok(getData.count >= 1);
    const found = getData.blobs.find(b => b.iv === 'dGVzdF9pdl8xMmJ5dGVz');
    assert.ok(found);
    assert.strictEqual(found.ciphertext, 'ZW5jcnlwdGVkX2NoYXJfeXB0b19kYXRhX2hlcmU');

    // 4. Rejet d'un paquet dépassant 4096 octets
    const giantPayload = 'A'.repeat(5000);
    const resTooLarge = await fetch(`${baseUrl}/api/relay/${validCircleHash}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        iv: 'iv_ok',
        ciphertext: giantPayload
      })
    });
    assert.strictEqual(resTooLarge.status, 413);
  });
});


