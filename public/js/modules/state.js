/**
 * Gestionnaire d'état partagé et système de localisation i18n
 */

export const state = {
  lang: 'fr',
  translations: {},
  inviterCircleId: null,
  circleKeyBytes: null,
  myBlindCircleId: null,
  targetCount: 13,
  joinNeighborhood: true,
  activeCircleTab: 'private',
  pushSubscription: null,
  isPushActive: false,
  userProvince: 'QC', // Détecté via code postal ou ville (par défaut QC)
  userRegion: 'QC',   // Région spécifique ('MTL', 'QC', etc.)
  alternatives: [],
  selectedNetworks: new Set(['X / Twitter', 'Instagram']),
  chosenAlternativeId: null,
  isManualServerChoice: false,
  currentDirectoryCat: 'all',
  currentDirectoryRegion: 'all',
  currentDirectoryLang: 'all',
  directorySearchQuery: '',
  savedCircleData: null,
  isFormManuallyShown: false
};

/**
 * Traduit une clé imbriquée (ex: "nav.mission")
 */
export function t(keyPath) {
  if (!keyPath || typeof keyPath !== 'string') return '';
  const parts = keyPath.split('.');
  let curr = state.translations;
  for (const part of parts) {
    if (!curr || curr[part] === undefined) return keyPath;
    curr = curr[part];
  }
  return curr;
}

/**
 * Charge les traductions pour une langue donnée
 */
export async function loadTranslations(lang) {
  try {
    const res = await fetch(`/locales/${lang}.json`);
    state.translations = await res.json();
  } catch (err) {
    console.error('Erreur chargement i18n:', err);
  }
}

/**
 * Applique les traductions aux éléments marqués avec data-i18n
 */
export function applyTranslations() {
  if (typeof document === 'undefined') return;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.id === 'btnTogglePush') return;
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(key));
  });

  const langBtn = document.getElementById('btnLangToggle');
  if (langBtn) {
    langBtn.textContent = state.lang === 'fr' ? 'EN' : 'FR';
  }
}

/**
 * Initialisation de la langue depuis URL ou localStorage
 */
export async function setupLanguage(onLanguageChanged) {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  const savedLang = localStorage.getItem('pacte_lang');
  state.lang = (urlLang === 'en' || urlLang === 'fr') ? urlLang : (savedLang || 'fr');

  await loadTranslations(state.lang);
  applyTranslations();

  const langBtn = document.getElementById('btnLangToggle');
  if (langBtn) {
    langBtn.addEventListener('click', async () => {
      state.lang = state.lang === 'fr' ? 'en' : 'fr';
      localStorage.setItem('pacte_lang', state.lang);
      await loadTranslations(state.lang);
      applyTranslations();
      if (typeof onLanguageChanged === 'function') {
        onLanguageChanged();
      }
    });
  }
}

/**
 * Affiche une bulle d'information temporaire (Toast)
 */
export function showToast(message, duration = 3500) {
  if (typeof document === 'undefined') return;

  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
