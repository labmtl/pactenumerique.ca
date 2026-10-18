/**
 * Formulaire d'engagement citoyen, Zero-Knowledge cryptographique et gestion du cercle privé
 */
import { state, t, showToast } from './state.js';
import { resolveLocationInput } from './geo.js';
import { getUsageLabel } from './longevity.js';
import {
  renderCriticalMassGauge,
  getReadyInviteMessage,
  renderReadyShareBox,
  attachShareBoxListeners,
  triggerThresholdCelebration
} from './gauge.js';
import { syncPushSubscriptionWithCircle, testLocalNotification } from './push-ui.js';
import {
  generateRandomKeyBytes,
  deriveBlindId,
  bufToBase64Url,
  base64UrlToBuf,
  solveProofOfWork
} from '../crypto.js';
import { checkOrRestorePushSubscription } from '../push.js';
import { loadTerritoryStats } from './stats.js';

/**
 * Détection du parrainage aveugle dans le fragment d'URL (#cercle=...&k=...)
 */
export function detectInviteHash() {
  if (typeof window === 'undefined') return;

  const hash = window.location.hash.substring(1);
  if (!hash) return;

  const params = new URLSearchParams(hash);
  const cercle = params.get('cercle');

  if (cercle && /^[a-f0-9]{64}$/i.test(cercle)) {
    state.inviterCircleId = cercle;
    const banner = document.getElementById('inviteBanner');
    if (banner) {
      banner.style.display = 'flex';
      banner.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

/**
 * Restaure le cercle personnel sauvegardé localement dans localStorage
 */
export async function restoreSavedCircle() {
  if (typeof localStorage === 'undefined') return;

  const saved = localStorage.getItem('pacte_my_circle');
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    if (data && data.blindId && /^[a-f0-9]{64}$/i.test(data.blindId)) {
      state.myBlindCircleId = data.blindId;
      state.savedCircleData = data;
      if (data.keyB64) {
        state.circleKeyBytes = base64UrlToBuf(data.keyB64);
      }
      if (data.targetCount) {
        state.targetCount = Number(data.targetCount) || 5;
      }
      if (data.chosenAlternativeId) {
        state.chosenAlternativeId = data.chosenAlternativeId;
      }

      await renderMyCircleWidget();

      // Si l'utilisateur a un abonnement Web Push actif, assurer sa liaison avec le cercle
      if (state.pushSubscription) {
        syncPushSubscriptionWithCircle(data.blindId, state.pushSubscription);
      }
    }
  } catch (err) {
    console.warn('[Cercle] Erreur chargement cercle local:', err);
  }
}

/**
 * Affiche ou met à jour le widget de progression du cercle sauvegardé
 */
export async function renderMyCircleWidget() {
  if (typeof document === 'undefined') return;

  const widget = document.getElementById('myCircleWidget');
  if (!widget) return;

  const saved = state.savedCircleData || (typeof localStorage !== 'undefined' && localStorage.getItem('pacte_my_circle') ? JSON.parse(localStorage.getItem('pacte_my_circle')) : null);
  if (!saved || !saved.blindId) {
    widget.style.display = 'none';
    const form = document.getElementById('pactForm');
    if (form) form.style.display = 'block';
    return;
  }

  // Interroger le statut en direct depuis l'API
  let currentCount = 1;
  let targetCount = Number(saved.targetCount) || 5;
  let unlocked = false;

  try {
    const res = await fetch(`/api/circle/${saved.blindId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.circle) {
        currentCount = data.circle.current_count;
        targetCount = data.circle.target_count;
        unlocked = data.circle.unlocked;
      }
    }
  } catch (err) {
    console.warn('[Cercle] Erreur récupération statut serveur:', err);
  }

  // Déclencher la célébration si le seuil est débloqué pour la 1re fois
  if (unlocked) {
    widget.classList.add('celebrate');
    if (!saved.celebrated) {
      triggerThresholdCelebration(saved, currentCount, targetCount);
    }
  } else {
    widget.classList.remove('celebrate');
  }

  // S'assurer que le push subscription est associé au cercle sur le serveur
  if (state.pushSubscription) {
    syncPushSubscriptionWithCircle(saved.blindId, state.pushSubscription);
  }

  const percent = Math.min(100, Math.round((currentCount / targetCount) * 100));
  const inviteUrl = `${window.location.origin}/#cercle=${saved.blindId}${saved.keyB64 ? `&k=${saved.keyB64}` : ''}`;

  let statusBadge = '';
  if (unlocked) {
    statusBadge = `<span class="my-circle-badge unlocked">🎉 ${t('circle_widget.unlocked_title') || 'Masse critique atteinte !'}</span>`;
  } else {
    statusBadge = `<span class="my-circle-badge">⏳ ${currentCount} / ${targetCount} ${state.lang === 'fr' ? 'amis' : 'friends'} (${percent}%)</span>`;
  }

  const chosenAlt = state.alternatives?.find(a => a.id === saved.chosenAlternativeId);
  const chosenText = chosenAlt ? `&bull; Serveur associé : <strong>${chosenAlt.name}</strong> (${getUsageLabel(chosenAlt)})` : '';

  widget.style.display = 'block';
  widget.innerHTML = `
    <div class="my-circle-header">
      <div>
        <h3 class="my-circle-title">
          <span>⚜️ 🍁</span>
          <span>${t('circle_widget.title') || 'Mon cercle d\'action souverain'}</span>
        </h3>
        <p class="my-circle-subtitle">
          ${t('circle_widget.subtitle') || 'Votre engagement est sauvegardé dans ce fureteur. Partagez votre lien privé pour faire le saut ensemble.'} ${chosenText}
        </p>
      </div>
      <div>${statusBadge}</div>
    </div>

    <!-- Jauge de masse critique visuelle et intuitive -->
    ${renderCriticalMassGauge(currentCount, targetCount, unlocked)}

    <!-- Boîte de message tout prêt pour SMS ou WhatsApp -->
    ${renderReadyShareBox(inviteUrl, targetCount, saved.leavingNetworks, 'myCircle')}

    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; font-size:0.85rem; margin-top:0.6rem;">
      <div id="myCirclePushStatus" style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
        ${state.isPushActive 
          ? `<span style="color:var(--accent-emerald); font-weight:600;">${t('circle_widget.push_active') || '🔔 Notifications actives pour ce cercle'}</span>`
          : `<span style="color:var(--text-muted);">${t('circle_widget.push_inactive') || '🔕 Notifications inactives'}</span> <button type="button" id="btnQuickEnablePush" class="btn-toggle-push" style="padding:0.25rem 0.65rem; font-size:0.75rem;">${t('circle_widget.enable_push_btn') || 'Activer'}</button>`}
        <button type="button" id="btnTestMyCirclePush" class="my-circle-btn-text" style="color:var(--accent-teal, #0d9488); font-size:0.8rem; margin-left:0.25rem;">🔔 ${t('circle_widget.test_push_btn') || 'Tester mes notifications'}</button>
      </div>
    </div>

    <div class="my-circle-actions">
      <button type="button" id="btnTogglePactForm" class="my-circle-btn-text">
        ${state.isFormManuallyShown ? (t('circle_widget.toggle_form_hide') || 'Masquer le formulaire') : (t('circle_widget.toggle_form_show') || 'Afficher le formulaire d\'engagement')}
      </button>
      <button type="button" id="btnResetMyCircle" class="my-circle-btn-text" style="color:var(--accent-rose, #e11d48);">
        ${t('circle_widget.reset_btn') || 'Nouveau cercle / Réinitialiser'}
      </button>
    </div>
  `;

  // Attache les écouteurs pour la boîte de partage SMS/WhatsApp
  attachShareBoxListeners('myCircle', inviteUrl, getReadyInviteMessage(inviteUrl, targetCount, saved.leavingNetworks));

  // Écouteur pour activer push en un clic
  const quickPushBtn = document.getElementById('btnQuickEnablePush');
  if (quickPushBtn) {
    quickPushBtn.addEventListener('click', async () => {
      const toggleBtn = document.getElementById('btnTogglePush');
      if (toggleBtn) toggleBtn.click();
      setTimeout(renderMyCircleWidget, 800);
    });
  }

  // Écouteur pour tester les notifications bureau
  const testPushBtn = document.getElementById('btnTestMyCirclePush');
  if (testPushBtn) {
    testPushBtn.addEventListener('click', () => {
      testLocalNotification();
    });
  }

  // Écouteur pour afficher / masquer le formulaire
  const toggleFormBtn = document.getElementById('btnTogglePactForm');
  const form = document.getElementById('pactForm');
  if (toggleFormBtn && form) {
    if (!state.isFormManuallyShown) {
      form.style.display = 'none';
    } else {
      form.style.display = 'block';
    }

    toggleFormBtn.addEventListener('click', () => {
      state.isFormManuallyShown = !state.isFormManuallyShown;
      if (state.isFormManuallyShown) {
        form.style.display = 'block';
        toggleFormBtn.textContent = t('circle_widget.toggle_form_hide') || 'Masquer le formulaire';
        form.scrollIntoView({ behavior: 'smooth' });
      } else {
        form.style.display = 'none';
        toggleFormBtn.textContent = t('circle_widget.toggle_form_show') || 'Afficher le formulaire d\'engagement';
      }
    });
  }

  // Écouteur pour réinitialiser
  const resetBtn = document.getElementById('btnResetMyCircle');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const confirmMsg = t('circle_widget.confirm_reset') || 'Voulez-vous réinitialiser votre progression locale et créer un nouveau pacte ?';
      if (confirm(confirmMsg)) {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('pacte_my_circle');
        }
        state.myBlindCircleId = null;
        state.savedCircleData = null;
        state.isFormManuallyShown = true;
        widget.style.display = 'none';
        if (form) form.style.display = 'block';
        showToast(state.lang === 'fr' ? 'Progression locale réinitialisée.' : 'Local progress reset.');
      }
    });
  }
}

/**
 * Soumission du pacte avec Zero-Knowledge & Web Crypto
 */
export async function handlePactSubmit(e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }
  if (typeof document === 'undefined') return;

  const submitBtn = document.getElementById('btnSubmitPact');
  const postalInput = document.getElementById('postalCodeInput');
  const emailInput = document.getElementById('emailInput');

  const rawCityOrPostal = postalInput ? postalInput.value.trim() : '';
  const resolvedLoc = resolveLocationInput(rawCityOrPostal);
  const fsa = resolvedLoc.fsa;

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = t('form.submitting');
    }

    // 1. Génération de la clé symétrique du cercle local (32 octets)
    state.circleKeyBytes = generateRandomKeyBytes();
    state.myBlindCircleId = await deriveBlindId(state.circleKeyBytes);

    // 2. Preuve de Travail (Proof-of-Work anti-spam)
    const powNonce = await solveProofOfWork(fsa);

    // S'assurer que pushSubscription est récupéré si la permission est déjà accordée
    if (!state.pushSubscription && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        state.pushSubscription = await checkOrRestorePushSubscription();
      } catch (e) {
        console.warn('[Push] Vérification souscription avant commit:', e);
      }
    }

    const rawPush = state.pushSubscription
      ? (typeof state.pushSubscription.toJSON === 'function' ? state.pushSubscription.toJSON() : state.pushSubscription)
      : null;

    // 3. Payload d'engagement avec réseaux ciblés
    const payload = {
      postal_code: fsa,
      email: emailInput ? emailInput.value.trim() || null : null,
      blind_circle_id: state.myBlindCircleId,
      inviter_circle_id: state.inviterCircleId || null,
      target_count: state.targetCount,
      push_subscription: rawPush,
      pow_nonce: powNonce,
      target_networks: {
        leaving: Array.from(state.selectedNetworks),
        chosen_alternative: state.chosenAlternativeId
      }
    };

    const res = await fetch('/api/pact/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erreur lors de la signature');
    }

    if (state.pushSubscription) {
      syncPushSubscriptionWithCircle(state.myBlindCircleId, state.pushSubscription);
    }

    // 4. Générer le lien d'invitation avec clé dans le fragment (#k=...)
    const keyB64 = bufToBase64Url(state.circleKeyBytes);
    const inviteUrl = `${window.location.origin}/#cercle=${state.myBlindCircleId}&k=${keyB64}`;

    // Sauvegarder dans localStorage pour conserver la progression au rechargement
    const myCircleData = {
      blindId: state.myBlindCircleId,
      keyB64: keyB64,
      targetCount: state.targetCount,
      fsa: fsa,
      createdAt: new Date().toISOString(),
      chosenAlternativeId: state.chosenAlternativeId,
      leavingNetworks: Array.from(state.selectedNetworks)
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pacte_my_circle', JSON.stringify(myCircleData));
    }
    state.savedCircleData = myCircleData;

    // Afficher le widget de progression en direct
    await renderMyCircleWidget();

    // Afficher la jauge intuitive dans le modal
    const modalGaugeBox = document.getElementById('modalGaugeContainer');
    if (modalGaugeBox) {
      modalGaugeBox.innerHTML = renderCriticalMassGauge(1, state.targetCount, false);
    }

    // Afficher le message tout prêt pour SMS ou WhatsApp
    const modalReadyText = document.getElementById('modalReadyShareText');
    const readyMsg = getReadyInviteMessage(inviteUrl, state.targetCount, Array.from(state.selectedNetworks));
    if (modalReadyText) {
      modalReadyText.textContent = readyMsg;
    }
    attachShareBoxListeners('modal', inviteUrl, readyMsg);

    // Afficher la destination ciblée dans le modal sans jargon
    const chosenAlt = state.alternatives?.find(a => a.id === state.chosenAlternativeId);
    const modalTargetBox = document.getElementById('modalTargetRecom');
    const modalTargetText = document.getElementById('modalTargetRecomText');
    if (chosenAlt && modalTargetBox && modalTargetText) {
      modalTargetBox.style.display = 'block';
      modalTargetText.textContent = ` ${chosenAlt.name} (${getUsageLabel(chosenAlt)}) - ${chosenAlt.url}`;
    }

    const successModal = document.getElementById('successModal');
    if (successModal) {
      successModal.classList.add('show');
    }

    // Recharger les statistiques territoriales
    loadTerritoryStats();
  } catch (err) {
    if (typeof alert !== 'undefined') {
      alert(err.message);
    } else {
      console.error(err);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = t('form.submit_btn');
    }
  }
}

/**
 * Copie du lien d'invitation privé
 */
export async function handleCopyInviteLink() {
  if (typeof document === 'undefined') return;

  const input = document.getElementById('inviteLinkInput');
  if (!input) return;

  try {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(input.value);
    } else {
      input.select();
      document.execCommand('copy');
    }
    showToast(t('modal_success.copied'));
  } catch (err) {
    input.select();
    document.execCommand('copy');
    showToast(t('modal_success.copied'));
  }
}
