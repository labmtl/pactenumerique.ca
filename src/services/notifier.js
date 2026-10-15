import webpush from 'web-push';

// Configuration VAPID
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:contact@pactenumerique.ca';

let vapidConfigured = false;
if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    console.log('[Notifier] VAPID configuré pour les notifications fureteur.');
  } catch (err) {
    console.warn(`[Notifier] Erreur de configuration VAPID: ${err.message}`);
  }
} else {
  console.log('[Notifier] Clés VAPID non définies dans .env (générez-en avec "npm run vapid:generate").');
}

/**
 * Envoie une notification de déverrouillage de cercle à tous ses membres
 */
export async function notifyCircleMembers(subscriptions, { targetCount }) {
  if (!vapidConfigured) {
    console.log(`[Notifier] Simulation d'envoi de notification (VAPID non actif): Le cercle de ${targetCount} amis est complet !`);
    return { sent: 0, simulated: subscriptions.length };
  }

  const payload = JSON.stringify({
    title: '🎉 Pacte Numérique : Masse critique atteinte !',
    body: `Votre cercle de ${targetCount} amis a rejoint le pacte ! Il est temps de faire le saut ensemble vers les réseaux souverains.`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: '/#souverainete-active'
    }
  });

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (err) {
      console.warn(`[Notifier] Échec d'envoi Web Push (${err.statusCode || err.message})`);
    }
  }

  return { sent, total: subscriptions.length };
}

/**
 * Retourne la clé publique VAPID pour les fureteurs clients
 */
export function getVapidPublicKey() {
  return publicKey || null;
}
