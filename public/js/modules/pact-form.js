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
  deriveNeighborhoodCredentials,
  bufToBase64Url,
  base64UrlToBuf,
  solveProofOfWork
} from '../crypto.js';
import { checkOrRestorePushSubscription } from '../push.js';
import { loadTerritoryStats } from './stats.js';
import {
  fetchAndDecryptRelayBlobs,
  renderRelayChat,
  renderMigrationGuide,
  postEncryptedRelayMessage,
  renderNeighborhoodGroupChat
} from './relay-chat.js';

/**
 * Détection du parrainage aveugle dans le fragment d'URL (#cercle=...&k=...)
 */
export async function detectInviteHash() {
  if (typeof window === 'undefined') return;

  const hash = window.location.hash.substring(1);
  if (!hash) return;

  const params = new URLSearchParams(hash);
  const cercle = params.get('cercle') || params.get('c');
  const k = params.get('k') || params.get('cle');

  if (cercle && /^[a-f0-9]{64}$/i.test(cercle)) {
    // Si l'utilisateur ouvre un lien d'invitation sur une page sans le module d'engagement (ex: /#cercle=...),
    // rediriger vers la page dédiée /engagement en conservant le fragment Zero-Knowledge intact.
    if (typeof document !== 'undefined' && !document.getElementById('myCircleWidget')) {
      window.location.replace(`/engagement${window.location.hash}`);
      return;
    }

    state.inviterCircleId = cercle;
    if (k) {
      try {
        state.circleKeyBytes = base64UrlToBuf(k);
      } catch (err) {
        console.warn('[Crypto] Erreur décodage clé d\'URL:', err);
      }
    }

    const banner = document.getElementById('inviteBanner');
    if (banner) {
      banner.style.display = 'flex';
      banner.scrollIntoView({ behavior: 'smooth' });
    }

    // Si l'utilisateur n'a pas encore de cercle enregistré localement, afficher l'invitation avec boîte morte
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('pacte_my_circle') : null;
    if (!saved && state.circleKeyBytes) {
      await renderGuestInviteWidget(cercle, state.circleKeyBytes);
    }
  }
}

/**
 * Affiche le tableau de bord pour un invité arrivant par lien avec fragment chiffré
 */
export async function renderGuestInviteWidget(circleHash, keyBytes) {
  if (typeof document === 'undefined') return;
  const widget = document.getElementById('myCircleWidget');
  if (!widget) return;

  let currentCount = 1;
  let targetCount = 13;
  let unlocked = false;

  try {
    const res = await fetch(`/api/circle/${circleHash}`);
    if (res.ok) {
      const data = await res.json();
      if (data.circle) {
        currentCount = data.circle.current_count;
        targetCount = data.circle.target_count;
        unlocked = data.circle.unlocked;
      }
    }
  } catch (err) {
    console.warn('[Invité] Erreur lecture cercle:', err);
  }

  const percent = Math.min(100, Math.round((currentCount / targetCount) * 100));

  // Découvrir le nom de l'initiateur et des membres via les messages chiffrés du groupe
  let initiatorName = null;
  try {
    const msgs = await fetchAndDecryptRelayBlobs(circleHash, keyBytes);
    if (msgs.length > 0 && msgs[0].author && !['Initiateur', 'Initiator', 'Moi', 'Me'].includes(msgs[0].author)) {
      initiatorName = msgs[0].author.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  } catch {
    // Ignorer si pas encore de messages
  }

  const savedGuestPseudo = (typeof localStorage !== 'undefined' && localStorage.getItem('pacte_my_pseudo')) || '';

  widget.style.display = 'block';
  widget.innerHTML = `
    <div class="guest-invite-card">
      <div class="guest-invite-header">
        <span class="guest-badge">💌 ${initiatorName ? `Invitation de ${initiatorName}` : 'Invitation d\'un proche'}</span>
        <h3 class="guest-title">On quitte les réseaux commerciaux ensemble ?</h3>
        <p class="guest-desc">${initiatorName ? `<strong>${initiatorName}</strong> vous invite` : 'Un ami vous invite'} à faire le saut vers un réseau libre dès que le groupe est complet. Aucun compte ni courriel requis.</p>
      </div>

      <!-- Jauge de progression du cercle d'amis -->
      ${renderCriticalMassGauge(currentCount, targetCount, unlocked)}

      <form class="guest-join-action" id="guestJoinForm" style="max-width: 440px; margin: 1.25rem auto; display: flex; flex-direction: column; gap: 0.65rem;">
        <input
          type="text"
          id="guestPseudoInput"
          class="input-field"
          placeholder="${state.lang === 'fr' ? 'Votre prénom ou pseudo (pour vos amis)' : 'Your name or handle (for your friends)'}"
          value="${savedGuestPseudo}"
          maxlength="40"
          required
          style="text-align: center;"
        />
        <button type="submit" class="btn-submit" id="btnGuestJoinCircle" style="margin-top: 0;">
          <span>🤝</span> <span>J'embarque dans le groupe</span>
        </button>
      </form>

      <!-- Guide de migration si déjà débloqué -->
      <div id="guestMigrationGuide"></div>

      <!-- Mur de messages privé repliable -->
      <details class="circle-section-details" style="margin-top: 1rem;">
        <summary class="circle-section-summary">
          <span>💬</span>
          <span>Messages privés du groupe</span>
          <span class="summary-hint">Écrire un mot à vos amis</span>
        </summary>
        <div id="guestRelayChat" class="circle-section-body"></div>
      </details>
    </div>
  `;

  const chatContainer = widget.querySelector('#guestRelayChat');
  if (chatContainer) {
    renderRelayChat(chatContainer, circleHash, keyBytes);
  }

  if (unlocked || currentCount >= targetCount) {
    const guideContainer = widget.querySelector('#guestMigrationGuide');
    if (guideContainer) {
      renderMigrationGuide(guideContainer, 'X / Twitter', circleHash, keyBytes);
    }
  }

  const joinForm = widget.querySelector('#guestJoinForm');
  const joinBtn = widget.querySelector('#btnGuestJoinCircle');
  const guestPseudoEl = widget.querySelector('#guestPseudoInput');
  if (joinForm && joinBtn) {
    joinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const guestPseudo = (guestPseudoEl ? guestPseudoEl.value.trim() : '') || (state.lang === 'fr' ? 'Ami(e)' : 'Friend');
      joinBtn.disabled = true;
      joinBtn.textContent = 'Connexion...';
      try {
        if (typeof localStorage !== 'undefined' && guestPseudo) {
          localStorage.setItem('pacte_my_pseudo', guestPseudo);
        }

        await fetch('/api/circle/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blind_circle_id: circleHash })
        });

        // Déposer un message chiffré dans le mur du groupe avec le vrai prénom/pseudo
        try {
          await postEncryptedRelayMessage(circleHash, keyBytes, {
            type: 'chat',
            author: guestPseudo,
            text: state.lang === 'fr' ? 'Je viens de rejoindre le départ collectif ! 🚀' : 'I just joined the departure! 🚀',
            timestamp: Date.now()
          });
        } catch (e) {
          console.warn('[Relais] Erreur dépôt join:', e);
        }

        const circleData = {
          blindId: circleHash,
          keyB64: bufToBase64Url(keyBytes),
          targetCount,
          fsa: 'H2T',
          pseudo: guestPseudo,
          createdAt: new Date().toISOString(),
          leavingNetworks: ['X / Twitter']
        };
        localStorage.setItem('pacte_my_circle', JSON.stringify(circleData));
        state.myBlindCircleId = circleHash;
        state.savedCircleData = circleData;

        showToast(state.lang === 'fr' ? 'Vous avez rejoint le groupe !' : 'You joined the group!');
        await renderMyCircleWidget();
      } catch (err) {
        alert(err.message || 'Erreur');
        joinBtn.disabled = false;
        joinBtn.textContent = 'J\'embarque dans le groupe';
      }
    });
  }
}

/**
 * Met à jour dynamiquement l'énoncé d'engagement ("Je m'engage à...")
 * et synchronise state.targetCount / state.selectedNetworks avec les boutons actifs du formulaire
 */
export function updatePledgeStatement() {
  if (typeof document === 'undefined') return;

  const activeThresholdBtn = document.querySelector('#pactForm .threshold-btn.active');
  if (activeThresholdBtn && activeThresholdBtn.dataset.threshold) {
    state.targetCount = Number(activeThresholdBtn.dataset.threshold) || 13;
  }

  const activePlatformBtn = document.querySelector('#pactForm .origin-platform-card.active');
  if (activePlatformBtn && activePlatformBtn.dataset.network) {
    state.selectedNetworks = new Set([activePlatformBtn.dataset.network]);
  }

  const count = state.targetCount || 13;
  const net = Array.from(state.selectedNetworks)[0] || 'X / Twitter';

  const statementEl = document.getElementById('pledgeStatementText');
  if (statementEl) {
    if (state.lang === 'en') {
      statementEl.innerHTML = `“I pledge to leave <strong id="pledgeNetworkName">${net}</strong> for an open, locally hosted social network as soon as <strong id="pledgeTargetCount">${count} friends</strong> join my departure group. Until that threshold is reached, I don't have to change anything.”`;
    } else {
      statementEl.innerHTML = `« Je m'engage à quitter <strong id="pledgeNetworkName">${net}</strong> pour un réseau social libre et hébergé ici dès que <strong id="pledgeTargetCount">${count} amis</strong> auront rejoint mon groupe de départ. Tant que ce seuil n'est pas atteint, je n'ai rien à changer. »`;
    }
  }
}

/**
 * Restaure le cercle personnel sauvegardé localement dans localStorage
 */
export async function restoreSavedCircle() {
  if (typeof localStorage === 'undefined') return;

  const saved = localStorage.getItem('pacte_my_circle');
  if (!saved) {
    updatePledgeStatement();
    return;
  }

  try {
    const data = JSON.parse(saved);
    if (data && data.blindId && /^[a-f0-9]{64}$/i.test(data.blindId)) {
      state.myBlindCircleId = data.blindId;
      state.savedCircleData = data;
      if (data.keyB64) {
        state.circleKeyBytes = base64UrlToBuf(data.keyB64);
      }
      if (data.targetCount) {
        const savedTarget = Number(data.targetCount) || 13;
        const matchingBtn = typeof document !== 'undefined'
          ? document.querySelector(`#pactForm .threshold-btn[data-threshold="${savedTarget}"]`)
          : null;
        if (matchingBtn) {
          document.querySelectorAll('#pactForm .threshold-btn').forEach(b => b.classList.remove('active'));
          matchingBtn.classList.add('active');
          state.targetCount = savedTarget;
        }
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
  let targetCount = Number(saved.targetCount) || 13;
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
          <span>${t('circle_widget.title') || 'Mon groupe de départ'}</span>
        </h3>
        <p class="my-circle-subtitle">
          ${t('circle_widget.subtitle') || 'Invitez vos proches ci-dessous : vous ferez le saut ensemble dès que le groupe est complet.'} ${chosenText}
        </p>
      </div>
      <div>${statusBadge}</div>
    </div>

    <!-- Jauge de masse critique visuelle et intuitive -->
    ${renderCriticalMassGauge(currentCount, targetCount, unlocked)}

    <!-- Guide de migration coordonnée (déverrouillé au seuil) -->
    <div id="myCircleMigrationGuideContainer" style="margin-top: 1rem;"></div>

    <!-- Boîte de message tout prêt pour inviter les proches -->
    ${renderReadyShareBox(inviteUrl, targetCount, saved.leavingNetworks, 'myCircle')}

    <!-- Alerte simple sur l'appareil (proposée après signature) -->
    <div class="circle-push-bar" id="myCirclePushStatus">
      ${state.isPushActive 
        ? `<span style="color:var(--accent-emerald); font-weight:600;">${t('circle_widget.push_active') || '🔔 Alerte activée sur cet appareil'}</span>
           <button type="button" id="btnTestMyCirclePush" class="my-circle-btn-text" style="color:var(--accent-teal, #0d9488); font-size:0.8rem;">Tester</button>`
        : `<span>🔔 ${t('form.push_desc') || 'Recevoir une alerte sur cet appareil dès que votre groupe est complet ?'}</span>
           <button type="button" id="btnQuickEnablePush" class="btn-toggle-push" style="padding:0.35rem 0.85rem; font-size:0.8rem;">${t('circle_widget.enable_push_btn') || 'M\'alerter'}</button>`}
    </div>

    <!-- Sections complémentaires repliables (Divulgation progressive) -->
    <div class="circle-accordions-group">
      <details class="circle-section-details" name="circle-extra-panel" id="detailsPrivateChat" ${unlocked ? 'open' : ''}>
        <summary class="circle-section-summary">
          <span>💬</span>
          <span>${t('relay_chat.title') || 'Messages privés du groupe'}</span>
          <span class="summary-hint">${state.lang === 'fr' ? 'Coordonnez-vous avec vos amis' : 'Coordinate with your friends'}</span>
        </summary>
        <div id="myCircleRelayChatContainer" class="circle-section-body"></div>
      </details>

      <details class="circle-section-details" name="circle-extra-panel" id="detailsNeighborhood" ${state.activeCircleTab === 'neighborhood' ? 'open' : ''}>
        <summary class="circle-section-summary" id="tabNeighborhoodGroup">
          <span>📍</span>
          <span>${t('circle_widget.tab_neighborhood') || 'Voisins du secteur'} (${saved.fsa || 'H2T'})</span>
          <span class="summary-hint">${state.lang === 'fr' ? 'Comptes libres près de chez vous' : 'Local open accounts'}</span>
        </summary>
        <div id="myNeighborhoodChatContainer" class="circle-section-body"></div>
      </details>
    </div>

    <div class="my-circle-actions">
      <button type="button" id="btnTogglePactForm" class="my-circle-btn-text">
        ${state.isFormManuallyShown ? (t('circle_widget.toggle_form_hide') || 'Masquer le formulaire') : (t('circle_widget.toggle_form_show') || 'Modifier mon engagement')}
      </button>
      <button type="button" id="btnResetMyCircle" class="my-circle-btn-text" style="color:var(--accent-rose, #e11d48);">
        ${t('circle_widget.reset_btn') || 'Recommencer à zéro'}
      </button>
    </div>
  `;

  // Chargement à la demande du groupe de quartier lors de l'ouverture du panneau <details>
  const detailsNeighborhood = widget.querySelector('#detailsNeighborhood');
  const neighContainer = widget.querySelector('#myNeighborhoodChatContainer');
  if (detailsNeighborhood && neighContainer) {
    if (detailsNeighborhood.open) {
      renderNeighborhoodGroupChat(neighContainer, saved.fsa || 'H2T');
    }
    detailsNeighborhood.addEventListener('toggle', () => {
      state.activeCircleTab = detailsNeighborhood.open ? 'neighborhood' : 'private';
      if (detailsNeighborhood.open && !neighContainer.hasChildNodes()) {
        renderNeighborhoodGroupChat(neighContainer, saved.fsa || 'H2T');
      }
    });
  }

  // Attache les écouteurs pour la boîte de partage (X, Facebook, LinkedIn, SMS, WhatsApp)
  attachShareBoxListeners('myCircle', inviteUrl, getReadyInviteMessage(inviteUrl, targetCount, saved.leavingNetworks));

  // Rendu du mur de messages privé du groupe
  if (state.circleKeyBytes) {
    const chatContainer = widget.querySelector('#myCircleRelayChatContainer');
    if (chatContainer) {
      renderRelayChat(chatContainer, saved.blindId, state.circleKeyBytes);
    }
  }

  // Rendu du guide de migration coordonnée si seuil atteint
  if (unlocked || currentCount >= targetCount) {
    const guideContainer = widget.querySelector('#myCircleMigrationGuideContainer');
    if (guideContainer) {
      const leavingNet = (saved.leavingNetworks && saved.leavingNetworks[0]) || 'X / Twitter';
      renderMigrationGuide(guideContainer, leavingNet, saved.blindId, state.circleKeyBytes);
    }
  }

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
        updatePledgeStatement();
        toggleFormBtn.textContent = t('circle_widget.toggle_form_hide') || 'Masquer le formulaire';
        form.scrollIntoView({ behavior: 'smooth' });
      } else {
        form.style.display = 'none';
        toggleFormBtn.textContent = t('circle_widget.toggle_form_show') || 'Modifier mon engagement';
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
        updatePledgeStatement();
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

  // Toujours synchroniser le seuil et le réseau avec les boutons réellement sélectionnés dans le formulaire
  updatePledgeStatement();

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

    const pseudoInput = document.getElementById('pseudoInput');
    const sourceProfileInput = document.getElementById('sourceProfileInput');
    const sourceProfile = sourceProfileInput ? sourceProfileInput.value.trim() : '';
    const pseudo = (pseudoInput ? pseudoInput.value.trim() : '') || (sourceProfile ? sourceProfile.replace(/^https?:\/\/(www\.)?/, '') : '');

    if (typeof localStorage !== 'undefined' && pseudo) {
      localStorage.setItem('pacte_my_pseudo', pseudo);
    }

    const joinNeighborhoodCheck = document.getElementById('joinNeighborhoodInput');
    const joinNeighborhood = joinNeighborhoodCheck ? joinNeighborhoodCheck.checked : true;

    // Sauvegarder dans localStorage pour conserver la progression au rechargement
    const myCircleData = {
      blindId: state.myBlindCircleId,
      keyB64: keyB64,
      targetCount: state.targetCount,
      fsa: fsa,
      pseudo: pseudo || null,
      createdAt: new Date().toISOString(),
      chosenAlternativeId: state.chosenAlternativeId,
      leavingNetworks: Array.from(state.selectedNetworks),
      sourceProfile: sourceProfile || null,
      joinNeighborhood: joinNeighborhood
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pacte_my_circle', JSON.stringify(myCircleData));
    }
    state.savedCircleData = myCircleData;

    const displayAuthor = pseudo || (state.lang === 'fr' ? 'Membre du pacte' : 'Pact member');

    // Message amical initial dans le groupe de quartier si activé
    if (joinNeighborhood) {
      try {
        const { circleHash: neighHash, keyBytes: neighKey } = await deriveNeighborhoodCredentials(fsa);
        await postEncryptedRelayMessage(neighHash, neighKey, {
          type: 'chat',
          author: displayAuthor,
          sourceProfile: sourceProfile || null,
          text: state.lang === 'fr'
            ? `Pacte signé dans le secteur ${fsa} ! Prêt(e) à coordonner notre départ des réseaux commerciaux.`
            : `Pledge signed in ${fsa} area! Ready to coordinate our departure from commercial networks.`,
          timestamp: Date.now()
        });
      } catch (neighErr) {
        console.warn('[Quartier] Message initial non déposé:', neighErr);
      }
    }

    // Déposer le message initial dans le groupe privé
    try {
      const leavingName = Array.from(state.selectedNetworks)[0] || 'la Big Tech';
      await postEncryptedRelayMessage(state.myBlindCircleId, state.circleKeyBytes, {
        type: 'chat',
        author: displayAuthor,
        sourceProfile: sourceProfile || null,
        text: state.lang === 'fr'
          ? `J'ai lancé ce groupe pour quitter ${leavingName} ensemble !`
          : `I started this group to leave ${leavingName} together!`,
        timestamp: Date.now()
      });
    } catch (relayErr) {
      console.warn('[Relais] Message initial non déposé:', relayErr);
    }

    // Masquer le formulaire et afficher directement le tableau de bord du groupe
    state.isFormManuallyShown = false;
    await renderMyCircleWidget();
    document.getElementById('myCircleWidget')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(
      state.lang === 'fr'
        ? '🎉 Pacte signé ! Partagez maintenant l\'invitation avec vos proches.'
        : '🎉 Pledge signed! Share the invite below with your friends.',
      5000
    );

    // Rétrocompatibilité si un modal existe dans le DOM
    const successModal = document.getElementById('successModal');
    if (successModal) {
      const modalGaugeBox = document.getElementById('modalGaugeContainer');
      if (modalGaugeBox) {
        modalGaugeBox.innerHTML = renderCriticalMassGauge(1, state.targetCount, false);
      }
      const modalReadyText = document.getElementById('modalReadyShareText');
      const readyMsg = getReadyInviteMessage(inviteUrl, state.targetCount, Array.from(state.selectedNetworks));
      if (modalReadyText) {
        modalReadyText.textContent = readyMsg;
      }
      attachShareBoxListeners('modal', inviteUrl, readyMsg);
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
