/**
 * Gestionnaire Web Push côté client
 */

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Enregistre le Service Worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Les Service Workers ne sont pas supportés par ce fureteur.');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('[Push] Erreur d\'enregistrement du Service Worker:', err);
    return null;
  }
}

/**
 * Demande la permission et souscrit aux notifications Push
 */
export async function subscribeToPushNotifications() {
  if (!('Notification' in window) || !('PushManager' in window)) {
    throw new Error('Les notifications fureteur ne sont pas supportées par votre navigateur.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permission de notification refusée.');
  }

  const reg = await registerServiceWorker();
  if (!reg) {
    throw new Error('Impossible d\'activer le Service Worker.');
  }

  // Récupérer la clé publique VAPID du serveur
  const res = await fetch('/api/stats/vapid');
  if (!res.ok) {
    throw new Error('Impossible de contacter le service de notification.');
  }

  const { vapid_public_key } = await res.json();
  if (!vapid_public_key) {
    console.warn('[Push] Clé VAPID non disponible sur le serveur.');
    return null;
  }

  // Souscription push
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(vapid_public_key)
  });

  return subscription;
}
