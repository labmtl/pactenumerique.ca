/**
 * Interface utilisateur et synchronisation des notifications Web Push VAPID
 */
import { state, t, showToast } from './state.js';
import { playCelebrationChime } from './gauge.js';
import {
  subscribeToPushNotifications,
  checkOrRestorePushSubscription,
  unsubscribeFromPush
} from '../push.js';

/**
 * Met à jour l'apparence et le texte du bouton d'activation Push selon l'état actuel
 */
export function updatePushButtonUI() {
  if (typeof document === 'undefined') return;

  const pushBtn = document.getElementById('btnTogglePush');
  if (!pushBtn) return;

  if (state.isPushActive) {
    pushBtn.classList.add('active');
    pushBtn.classList.remove('blocked');
    pushBtn.disabled = false;
    pushBtn.textContent = '✓ ' + (state.lang === 'fr' ? 'Activé' : 'Enabled');
    pushBtn.title = state.lang === 'fr'
      ? 'Notifications fureteur activées (cliquez pour désactiver)'
      : 'Browser notifications active (click to disable)';
  } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    pushBtn.classList.remove('active');
    pushBtn.classList.add('blocked');
    pushBtn.disabled = true;
    pushBtn.textContent = t('form.push_blocked') || (state.lang === 'fr' ? 'Notifications bloquées' : 'Notifications blocked');
    pushBtn.title = state.lang === 'fr'
      ? 'Notifications bloquées dans les réglages de votre fureteur'
      : 'Notifications blocked in browser settings';
  } else {
    pushBtn.classList.remove('active');
    pushBtn.classList.remove('blocked');
    pushBtn.disabled = false;
    pushBtn.textContent = t('form.enable_push') || (state.lang === 'fr' ? 'Activer la notification du fureteur' : 'Enable browser notification');
    pushBtn.title = '';
  }
}

/**
 * Vérifie le statut actuel des notifications et restaure l'état au rechargement de la page
 */
export async function checkPushStatus() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const pushBtn = document.getElementById('btnTogglePush');
  if (!pushBtn) return;

  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    pushBtn.disabled = true;
    pushBtn.classList.add('blocked');
    pushBtn.textContent = t('form.push_unsupported') || (state.lang === 'fr' ? 'Non supporté' : 'Not supported');
    return;
  }

  if (Notification.permission === 'denied') {
    updatePushButtonUI();
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      const sub = await checkOrRestorePushSubscription();
      if (sub) {
        state.pushSubscription = sub;
        state.isPushActive = true;
        if (state.myBlindCircleId) {
          syncPushSubscriptionWithCircle(state.myBlindCircleId, sub);
        }
      }
    } catch (err) {
      console.warn('[Push] Impossible de restaurer le statut push:', err);
    }
  }

  updatePushButtonUI();
}

/**
 * Associe l'abonnement push courant au cercle sur le serveur
 */
export async function syncPushSubscriptionWithCircle(blindId, pushSubscription) {
  if (!blindId || !pushSubscription) return;
  try {
    const rawSub = typeof pushSubscription.toJSON === 'function' ? pushSubscription.toJSON() : pushSubscription;
    await fetch('/api/circle/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blind_circle_id: blindId,
        push_subscription: rawSub
      })
    });
  } catch (err) {
    console.warn('[Push] Erreur liaison abonnement au cercle:', err);
  }
}

/**
 * Teste la capacité du fureteur à afficher des notifications système
 */
export async function testLocalNotification() {
  if (typeof window === 'undefined') return;

  if (!('Notification' in window)) {
    alert(state.lang === 'fr' 
      ? 'Les notifications ne sont pas supportées par votre fureteur.'
      : 'Notifications are not supported by your browser.');
    return;
  }

  if (Notification.permission === 'denied') {
    alert(state.lang === 'fr'
      ? '⚠️ Les notifications sont bloquées dans les réglages de votre fureteur.\n\nPour les activer :\n1. Cliquez sur l\'icône de cadenas ou de réglages à gauche de l\'adresse URL.\n2. Modifiez "Notifications" vers "Autoriser".\n3. Rechargez la page.'
      : '⚠️ Notifications are blocked in your browser settings.\n\nTo enable:\n1. Click the lock/settings icon to the left of the URL bar.\n2. Change "Notifications" to "Allow".\n3. Reload the page.');
    return;
  }

  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
    await checkPushStatus();
  }

  if (perm !== 'granted') {
    alert(state.lang === 'fr' ? 'Permission de notification non accordée.' : 'Notification permission not granted.');
    return;
  }

  playCelebrationChime();

  const title = '🍁 Pacte Numérique Canada — Test de notification ⚜️';
  const body = state.lang === 'fr'
    ? 'Vos notifications fureteur fonctionnent parfaitement !'
    : 'Your browser notifications are working properly!';

  let displayed = false;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          vibrate: [200, 100, 200],
          data: { url: '/#souverainete-active' }
        });
        displayed = true;
      }
    }
    if (!displayed) {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
    const tip = t('circle_widget.test_push_tip') || (state.lang === 'fr'
      ? "Si rien n'apparaît en haut à droite : vérifiez les Réglages Système macOS > Notifications > Google Chrome et désactivez le mode Ne pas déranger."
      : "If nothing appears in top right: check macOS System Settings > Notifications > Google Chrome and turn off Do Not Disturb.");
    showToast(`🔔 ${t('circle_widget.test_push_success') || 'Notification de test envoyée !'}\n${tip}`, 8000);
  } catch (err) {
    console.warn('[Notification Test] Erreur:', err);
    alert(state.lang === 'fr' 
      ? `Erreur lors de l'envoi de la notification : ${err.message}` 
      : `Error sending notification: ${err.message}`);
  }
}
