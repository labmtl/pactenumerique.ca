/**
 * Point d'entrée principal & Orchestrateur client (PacteNumérique.ca)
 * Architecture modulaire sans étape de compilation (Zero-build ES Modules)
 */

// 1. Ré-exportations complètes pour rétrocompatibilité et tests Node.js
export * from './modules/state.js';
export * from './modules/geo.js';
export * from './modules/longevity.js';
export * from './modules/gauge.js';
export * from './modules/directory.js';
export * from './modules/push-ui.js';
export * from './modules/pact-form.js';
export * from './modules/stats.js';

// 2. Imports internes pour l'initialisation de l'application
import { state, t, setupLanguage, applyTranslations, showToast } from './modules/state.js';
import { updatePostalCodeFeedback } from './modules/geo.js';
import { renderRecommendations, renderDirectory, loadAlternatives } from './modules/directory.js';
import { updatePushButtonUI, checkPushStatus, syncPushSubscriptionWithCircle } from './modules/push-ui.js';
import {
  detectInviteHash,
  restoreSavedCircle,
  renderMyCircleWidget,
  handlePactSubmit,
  handleCopyInviteLink
} from './modules/pact-form.js';
import { loadTerritoryStats } from './modules/stats.js';
import { playCelebrationChime } from './modules/gauge.js';
import {
  registerServiceWorker,
  subscribeToPushNotifications,
  unsubscribeFromPush
} from './push.js';

/**
 * Configuration globale des écouteurs d'événements de l'interface
 */
function setupEventListeners() {
  if (typeof document === 'undefined') return;

  // Saisie ville ou code postal
  const postalInput = document.getElementById('postalCodeInput');
  if (postalInput) {
    postalInput.addEventListener('input', () => {
      updatePostalCodeFeedback();
      renderRecommendations();
    });
  }

  // Puces de réseaux Big Tech à remplacer (Étape 1)
  document.querySelectorAll('.network-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const net = chip.dataset.network;
      if (state.selectedNetworks.has(net)) {
        if (state.selectedNetworks.size > 1) {
          state.selectedNetworks.delete(net);
          chip.classList.remove('active');
        }
      } else {
        state.selectedNetworks.add(net);
        chip.classList.add('active');
      }
      renderRecommendations();
    });
  });

  // Choix du seuil de cercle (Étape 2)
  document.querySelectorAll('.threshold-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.threshold-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      state.targetCount = Number(target.dataset.threshold) || 5;
    });
  });

  // Bouton d'activation et de bascule des notifications push
  const pushBtn = document.getElementById('btnTogglePush');
  if (pushBtn) {
    pushBtn.addEventListener('click', async () => {
      if (state.isPushActive) {
        try {
          pushBtn.disabled = true;
          pushBtn.textContent = '...';
          await unsubscribeFromPush();
          state.pushSubscription = null;
          state.isPushActive = false;
          updatePushButtonUI();
          showToast(t('form.push_toast_disabled') || (state.lang === 'fr' ? 'Notifications du fureteur désactivées' : 'Browser notifications disabled'));
        } catch (err) {
          console.warn('[Push] Erreur désactivation push:', err);
        } finally {
          pushBtn.disabled = false;
        }
        return;
      }

      try {
        pushBtn.disabled = true;
        pushBtn.textContent = '...';
        const sub = await subscribeToPushNotifications();
        if (sub) {
          state.pushSubscription = sub;
          state.isPushActive = true;
          updatePushButtonUI();
          showToast(t('form.push_toast_enabled') || (state.lang === 'fr' ? 'Notifications du fureteur activées !' : 'Browser notifications enabled!'));
          if (state.myBlindCircleId) {
            syncPushSubscriptionWithCircle(state.myBlindCircleId, sub);
            renderMyCircleWidget();
          }
        } else {
          updatePushButtonUI();
        }
      } catch (err) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
          updatePushButtonUI();
        } else {
          alert(err.message);
          updatePushButtonUI();
        }
      } finally {
        pushBtn.disabled = false;
      }
    });
  }

  // Filtres du répertoire par besoin (Catégories)
  document.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.currentDirectoryCat = e.currentTarget.dataset.cat;
      renderDirectory();
    });
  });

  // Filtres du répertoire par territoire (Régions)
  document.querySelectorAll('[data-region]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-region]').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.currentDirectoryRegion = e.currentTarget.dataset.region;
      renderDirectory();
    });
  });

  // Filtres du répertoire par langue
  document.querySelectorAll('[data-lang-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-lang-filter]').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.currentDirectoryLang = e.currentTarget.dataset.langFilter;
      renderDirectory();
    });
  });

  // Recherche textuelle dans le répertoire
  const searchInput = document.getElementById('directorySearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.directorySearchQuery = e.target.value.trim().toLowerCase();
      renderDirectory();
    });
  }

  // Case à cocher pour sélection manuelle d'instance
  const chkManual = document.getElementById('chkManualServer');
  if (chkManual) {
    chkManual.addEventListener('change', (e) => {
      state.isManualServerChoice = e.target.checked;
      const box = document.getElementById('recommendationsBox');
      if (box) {
        box.style.display = state.isManualServerChoice ? 'block' : 'none';
        if (state.isManualServerChoice) {
          box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    });
  }

  // Préréglage d'instance choisie depuis /repertoire
  if (typeof localStorage !== 'undefined') {
    const preselected = localStorage.getItem('pacte_preselected_alt');
    if (preselected) {
      state.chosenAlternativeId = preselected;
      state.isManualServerChoice = true;
      if (chkManual) chkManual.checked = true;
      localStorage.removeItem('pacte_preselected_alt');
      setTimeout(() => {
        const box = document.getElementById('recommendationsBox');
        if (box) box.style.display = 'block';
      }, 150);
    }
  }

  // Soumission du formulaire d'engagement
  const form = document.getElementById('pactForm');
  if (form) {
    form.addEventListener('submit', handlePactSubmit);
  }

  // Bouton de copie du lien d'invitation
  const copyBtn = document.getElementById('btnCopyInvite');
  if (copyBtn) {
    copyBtn.addEventListener('click', handleCopyInviteLink);
  }

  // Fermeture du modal de succès
  const modalClose = document.getElementById('btnModalClose');
  if (modalClose) {
    modalClose.addEventListener('click', () => {
      document.getElementById('successModal')?.classList.remove('show');
    });
  }
}

// 3. Initialisation au chargement du document
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    // Initialisation i18n avec rafraîchissement réactif
    await setupLanguage(() => {
      updatePostalCodeFeedback();
      renderRecommendations();
      renderDirectory();
    });

    detectInviteHash();
    setupEventListeners();
    loadTerritoryStats();
    await loadAlternatives();
    await registerServiceWorker();
    await restoreSavedCircle();
    await checkPushStatus();

    // Écoute des messages du Service Worker (notification Web Push reçue)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'PUSH_NOTIFICATION_RECEIVED') {
          playCelebrationChime();
          const title = event.data.title || '🎉 Masse critique atteinte !';
          const body = event.data.body || '';
          showToast(`${title}\n${body}`, 8000);
          renderMyCircleWidget();
        }
      });
    }

    // Polling doux des statistiques territoriales (30 secondes)
    setInterval(loadTerritoryStats, 30000);

    // Polling doux du statut du cercle personnel (15 secondes)
    setInterval(() => {
      if (state.myBlindCircleId) {
        renderMyCircleWidget();
      }
    }, 15000);
  });
}
