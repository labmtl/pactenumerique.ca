import express from 'express';
import { extractFSA, getProvinceFromFSA } from '../utils/postalCodes.js';
import { hashEmail, isValidBlindId, verifyProofOfWork, generateUUID } from '../services/cryptoService.js';
import {
  saveCommitment,
  createBlindCircle,
  incrementBlindCircle,
  getBlindCircle,
  addCirclePushListener,
  getCirclePushListeners,
  markCircleTriggered,
  getTerritoryStats
} from '../services/db.js';
import { notifyCircleMembers } from '../services/notifier.js';

const router = express.Router();

/**
 * POST /api/pact/commit
 * Signature d'engagement et/ou création de cercle d'amis
 */
router.post('/commit', async (req, res) => {
  try {
    const {
      postal_code,
      email,
      encrypted_email,
      blind_circle_id,
      inviter_circle_id,
      target_count = 5,
      push_subscription,
      pow_nonce,
      target_networks
    } = req.body;

    // 1. Validation de la RTA (FSA)
    const fsa = extractFSA(postal_code);
    if (!fsa) {
      return res.status(400).json({
        error: 'Code postal canadien invalide (ex: H2T 2N5 ou H2T)'
      });
    }

    const provInfo = getProvinceFromFSA(fsa);
    const province = provInfo ? provInfo.code : 'CA';

    // 2. Preuve de Travail (optionnelle en dev, validée si présente)
    if (pow_nonce !== undefined && !verifyProofOfWork(fsa, pow_nonce)) {
      return res.status(400).json({ error: 'Preuve de travail (anti-spam) invalide' });
    }

    // 3. Hachage salé du courriel (Zero-Knowledge)
    const emailHash = email ? hashEmail(email) : null;
    const commitmentId = generateUUID();

    // 4. Enregistrement de l'engagement
    await saveCommitment({
      id: commitmentId,
      fsa,
      province,
      emailHash,
      encryptedEmail: encrypted_email || null,
      pushSubscription: push_subscription || null,
      targetNetworks: target_networks || null
    });

    // 5. Gestion du cercle d'amis personnel si créé
    if (blind_circle_id) {
      if (!isValidBlindId(blind_circle_id)) {
        return res.status(400).json({ error: 'Identifiant aveugle invalide' });
      }
      await createBlindCircle({
        blindId: blind_circle_id,
        targetCount: Math.min(Math.max(Number(target_count) || 13, 2), 50)
      });

      if (push_subscription) {
        await addCirclePushListener({
          id: generateUUID(),
          blindId: blind_circle_id,
          pushSubscription: push_subscription
        });
      }
    }

    // 6. Si l'utilisateur a rejoint via un cercle d'invitation (parrainage aveugle)
    let circleUpdate = null;
    if (inviter_circle_id && isValidBlindId(inviter_circle_id)) {
      circleUpdate = await incrementBlindCircle(inviter_circle_id);

      if (push_subscription) {
        await addCirclePushListener({
          id: generateUUID(),
          blindId: inviter_circle_id,
          pushSubscription: push_subscription
        });
      }

      // Si le seuil du cercle vient d'être atteint, envoyer la notification Web Push !
      if (circleUpdate.is_newly_unlocked) {
        const listeners = await getCirclePushListeners(inviter_circle_id);
        console.log(`[API /commit] Cercle parrain ${inviter_circle_id} déverrouillé ! ${listeners.length} abonné(s) push.`);
        if (listeners.length > 0) {
          await notifyCircleMembers(listeners, { targetCount: circleUpdate.target_count });
          await markCircleTriggered(inviter_circle_id);
        } else {
          console.warn(`[API /commit] Cercle parrain ${inviter_circle_id} déverrouillé mais aucun abonné push inscrit.`);
        }
      }
    }

    return res.status(201).json({
      success: true,
      id: commitmentId,
      fsa,
      province,
      circle_update: circleUpdate
    });
  } catch (err) {
    console.error('[API /commit] Erreur:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * POST /api/circle/join
 * Adhésion à un cercle aveugle existant
 */
router.post('/join', async (req, res) => {
  try {
    const { blind_circle_id, push_subscription, pow_nonce } = req.body;

    if (!isValidBlindId(blind_circle_id)) {
      return res.status(400).json({ error: 'Identifiant de cercle invalide' });
    }

    if (pow_nonce !== undefined && !verifyProofOfWork(blind_circle_id, pow_nonce)) {
      return res.status(400).json({ error: 'Preuve de travail anti-spam invalide' });
    }

    const circleUpdate = await incrementBlindCircle(blind_circle_id);

    if (push_subscription) {
      await addCirclePushListener({
        id: generateUUID(),
        blindId: blind_circle_id,
        pushSubscription: push_subscription
      });
    }

    if (circleUpdate.is_newly_unlocked) {
      const listeners = await getCirclePushListeners(blind_circle_id);
      console.log(`[API /circle/join] Cercle ${blind_circle_id} déverrouillé ! ${listeners.length} abonné(s) push.`);
      if (listeners.length > 0) {
        await notifyCircleMembers(listeners, { targetCount: circleUpdate.target_count });
        await markCircleTriggered(blind_circle_id);
      } else {
        console.warn(`[API /circle/join] Cercle ${blind_circle_id} déverrouillé mais aucun abonné push inscrit.`);
      }
    }

    return res.json({
      success: true,
      current_count: circleUpdate.current_count,
      target_count: circleUpdate.target_count,
      unlocked: circleUpdate.unlocked
    });
  } catch (err) {
    console.error('[API /join] Erreur:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * POST /api/circle/subscribe
 * Enregistre ou associe un abonnement Web Push à un cercle aveugle
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { blind_circle_id, push_subscription } = req.body;

    if (!isValidBlindId(blind_circle_id)) {
      return res.status(400).json({ error: 'Identifiant de cercle invalide' });
    }

    if (!push_subscription || !push_subscription.endpoint) {
      return res.status(400).json({ error: 'Abonnement Web Push manquant ou invalide' });
    }

    await addCirclePushListener({
      id: generateUUID(),
      blindId: blind_circle_id,
      pushSubscription: push_subscription
    });

    return res.json({
      success: true,
      message: 'Abonnement Web Push associé au cercle'
    });
  } catch (err) {
    console.error('[API /circle/subscribe] Erreur:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * GET /api/circle/:blind_circle_id
 * Consulte l'état actuel d'un cercle aveugle
 */
router.get('/:blind_circle_id', async (req, res) => {
  try {
    const { blind_circle_id } = req.params;

    if (!isValidBlindId(blind_circle_id)) {
      return res.status(400).json({ error: 'Identifiant de cercle invalide' });
    }

    const circle = await getBlindCircle(blind_circle_id);
    if (!circle) {
      return res.status(404).json({ error: 'Cercle introuvable' });
    }

    return res.json({
      success: true,
      circle
    });
  } catch (err) {
    console.error('[API /circle/:id] Erreur:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;
