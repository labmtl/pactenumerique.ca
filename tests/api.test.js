import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import pactRoutes from '../src/routes/pact.js';
import statsRoutes from '../src/routes/stats.js';

describe('Intégration API HTTP REST', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/pact', pactRoutes);
    app.use('/api/circle', pactRoutes);
    app.use('/api/stats', statsRoutes);
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
});
