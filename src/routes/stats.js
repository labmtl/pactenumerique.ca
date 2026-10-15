import express from 'express';
import { getTerritoryStats } from '../services/db.js';
import { getVapidPublicKey } from '../services/notifier.js';

const router = express.Router();

/**
 * GET /api/stats/territory
 * Statistiques agrégées publiques pour jauges territoriales
 */
router.get('/territory', async (req, res) => {
  try {
    const stats = await getTerritoryStats();
    return res.json(stats);
  } catch (err) {
    console.error('[API /stats/territory] Erreur:', err);
    return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

/**
 * GET /api/stats/vapid
 * Fournit la clé publique VAPID pour l'inscription aux notifications fureteur
 */
router.get('/vapid', (req, res) => {
  const key = getVapidPublicKey();
  return res.json({ vapid_public_key: key });
});

/**
 * GET /api/stats/alternatives
 * Répertoire des réseaux souverains québécois et canadiens
 */
router.get('/alternatives', async (req, res) => {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.join(__dirname, '../../public/data/alternatives.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return res.json(data);
  } catch (err) {
    console.error('[API /stats/alternatives] Erreur:', err);
    return res.status(500).json({ error: 'Erreur chargement des alternatives' });
  }
});

export default router;
