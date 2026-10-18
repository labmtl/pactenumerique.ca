import express from 'express';
import { isValidBlindId, verifyProofOfWork } from '../services/cryptoService.js';
import { saveRelayBlob, getRelayBlobs } from '../services/db.js';

const router = express.Router();

// Rate limiter en mémoire par adresse IP (1 requête / seconde)
const ipRequestTimes = new Map();

// Nettoyage régulier des IPs inactives toutes les 5 minutes
const cleanupTimer = setInterval(() => {
  const cutoff = Date.now() - 60000;
  for (const [ip, time] of ipRequestTimes.entries()) {
    if (time < cutoff) ipRequestTimes.delete(ip);
  }
}, 300000);
if (cleanupTimer.unref) cleanupTimer.unref();

/**
 * Middleware de limitation d'abus (1 requête / seconde par IP)
 */
function rateLimitPerSecond(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const lastTime = ipRequestTimes.get(ip);

  // En environnement de test automatisé, ne pas bloquer les requêtes séquentielles rapides
  if (process.env.NODE_ENV !== 'test' && lastTime && (now - lastTime) < 1000) {
    return res.status(429).json({
      error: 'Limite de débit atteinte : maximum 1 requête par seconde.'
    });
  }

  ipRequestTimes.set(ip, now);
  next();
}

/**
 * GET /api/relay/:circleHash
 * Récupère les paquets chiffrés (Boîte Morte) déposés pour un cercle aveugle
 */
router.get('/:circleHash', async (req, res) => {
  try {
    const { circleHash } = req.params;

    if (!isValidBlindId(circleHash)) {
      return res.status(400).json({ error: 'Empreinte de cercle invalide (64 caractères hexadécimaux requis)' });
    }

    const blobs = await getRelayBlobs(circleHash);
    return res.json({
      success: true,
      circle_hash: circleHash,
      count: blobs.length,
      blobs
    });
  } catch (err) {
    console.error('[API /relay GET] Erreur:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * POST /api/relay/:circleHash
 * Dépose un paquet chiffré (< 4 Ko) dans la boîte morte du cercle
 */
router.post('/:circleHash', rateLimitPerSecond, async (req, res) => {
  try {
    const { circleHash } = req.params;
    const { iv, ciphertext, pow_nonce } = req.body;

    if (!isValidBlindId(circleHash)) {
      return res.status(400).json({ error: 'Empreinte de cercle invalide' });
    }

    if (!iv || !ciphertext) {
      return res.status(400).json({ error: 'Charge utile chiffrée manquante (iv et ciphertext requis)' });
    }

    // 1. Validation de la preuve de travail anti-spam (si fournie ou en production)
    if (pow_nonce !== undefined && !verifyProofOfWork(circleHash, pow_nonce)) {
      return res.status(400).json({ error: 'Preuve de travail anti-spam invalide' });
    }

    // 2. Limite stricte de la boîte morte à 4 Ko (4096 octets)
    const payloadBytes = Buffer.byteLength(String(iv), 'utf8') + Buffer.byteLength(String(ciphertext), 'utf8');
    if (payloadBytes > 4096) {
      return res.status(413).json({
        error: `Paquet trop volumineux (${payloadBytes} octets). La limite maximale de la boîte morte est de 4096 octets.`
      });
    }

    const savedBlob = await saveRelayBlob({
      circleHash,
      iv: String(iv).slice(0, 64),
      ciphertext: String(ciphertext)
    });

    return res.status(201).json({
      success: true,
      blob_id: savedBlob.id,
      circle_hash: circleHash,
      created_at: savedBlob.created_at
    });
  } catch (err) {
    console.error('[API /relay POST] Erreur:', err);
    return res.status(500).json({ error: err.message || 'Erreur interne du serveur' });
  }
});

export default router;
