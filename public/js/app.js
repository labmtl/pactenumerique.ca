import {
  generateRandomKeyBytes,
  deriveBlindId,
  bufToBase64Url,
  base64UrlToBuf,
  solveProofOfWork
} from './crypto.js';
import {
  subscribeToPushNotifications,
  registerServiceWorker,
  getExistingPushSubscription,
  checkOrRestorePushSubscription,
  unsubscribeFromPush
} from './push.js';

// État global de l'application
const state = {
  lang: 'fr',
  translations: {},
  inviterCircleId: null,
  circleKeyBytes: null,
  myBlindCircleId: null,
  targetCount: 5,
  pushSubscription: null,
  isPushActive: false,
  userProvince: 'QC', // Détecté via code postal (par défaut QC)
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
 * Retourne une notion d'usage intuitive et non-technique pour une alternative
 */
export function getUsageLabel(alt) {
  if (!alt) return state.lang === 'fr' ? 'Alternative libre et sans pub' : 'Ad-free open alternative';
  const cat = alt.category;
  const usageKey = `usages.${cat}`;
  const translated = t(usageKey);
  if (translated && translated !== usageKey) {
    return translated;
  }
  const fallbacks = {
    fr: {
      microblogging: 'Alternative libre et sans pub',
      photos: 'Partage photo sans algorithme toxique',
      forums: 'Espace d\'échange communautaire libre',
      messaging: 'Messagerie privée chiffrée',
      video: 'Vidéos indépendantes et éthiques',
      professional: 'Réseau d\'entraide professionnelle citoyenne',
      events: 'Babillard et événements locaux'
    },
    en: {
      microblogging: 'Ad-free open alternative',
      photos: 'Photo sharing with no toxic algorithm',
      forums: 'Open community discussions',
      messaging: 'Private encrypted messaging',
      video: 'Independent & ethical videos',
      professional: 'Civic professional network',
      events: 'Local events and bulletin board'
    }
  };
  return fallbacks[state.lang]?.[cat] || (state.lang === 'fr' ? 'Alternative libre et éthique' : 'Open ethical alternative');
}

/**
 * Rendu visuel et intuitif de la jauge de masse critique
 */
export function renderCriticalMassGauge(currentCount, targetCount, isUnlocked) {
  const percent = Math.min(100, Math.round((currentCount / targetCount) * 100));
  const needed = Math.max(0, targetCount - currentCount);

  let statusText = '';
  const status1 = t('circle_widget.gauge_status_1');
  const template1 = (status1 && status1 !== 'circle_widget.gauge_status_1') 
    ? status1 
    : `Déjà 1 personne sur {target} prête à faire le saut (plus que {needed} !)`;

  const statusN = t('circle_widget.gauge_status_n');
  const templateN = (statusN && statusN !== 'circle_widget.gauge_status_n') 
    ? statusN 
    : `Déjà {current} personnes sur {target} prêtes à faire le saut (plus que {needed} !)`;

  const statusComp = t('circle_widget.gauge_status_complete');
  const templateComp = (statusComp && statusComp !== 'circle_widget.gauge_status_complete') 
    ? statusComp 
    : `🎉 {target} personnes sur {target} : Masse critique atteinte ! C'est le moment de faire le saut ensemble !`;

  if (isUnlocked) {
    statusText = templateComp.replace('{target}', targetCount);
  } else if (currentCount === 1) {
    statusText = template1.replace('{target}', targetCount).replace('{needed}', needed);
  } else {
    statusText = templateN.replace('{current}', currentCount).replace('{target}', targetCount).replace('{needed}', needed);
  }

  const avatars = [];
  for (let i = 0; i < targetCount; i++) {
    if (i < currentCount) {
      const isMe = i === 0;
      avatars.push(`
        <div class="gauge-avatar joined ${isMe ? 'is-me' : ''}" title="${isMe ? (state.lang === 'fr' ? 'Vous (prêt·e)' : 'You (ready)') : (state.lang === 'fr' ? `Ami ${i + 1} (a rejoint)` : `Friend ${i + 1} (joined)`)}">
          <span class="gauge-avatar-icon">👤</span>
          <span class="gauge-avatar-num">${isMe ? (state.lang === 'fr' ? 'Vous' : 'You') : `#${i + 1}`}</span>
        </div>
      `);
    } else {
      avatars.push(`
        <div class="gauge-avatar pending" title="${state.lang === 'fr' ? `En attente d'un ami (${i + 1}/${targetCount})` : `Waiting for friend (${i + 1}/${targetCount})`}">
          <span class="gauge-avatar-icon">⚪</span>
          <span class="gauge-avatar-num">#${i + 1}</span>
        </div>
      `);
    }
  }

  return `
    <div class="critical-gauge-container ${isUnlocked ? 'unlocked' : ''}">
      <div class="critical-gauge-headline">
        <span class="critical-gauge-icon">${isUnlocked ? '🚀' : '👥'}</span>
        <span class="critical-gauge-text">${statusText}</span>
      </div>

      <div class="critical-gauge-avatars">
        ${avatars.join('')}
      </div>

      <div class="critical-gauge-track">
        <div class="critical-gauge-fill" style="width: ${percent}%;"></div>
      </div>
    </div>
  `;
}

/**
 * Message d'invitation concret tout prêt à envoyer par SMS / WhatsApp
 */
export function getReadyInviteMessage(inviteUrl, targetCount = 5, networks = null) {
  let netText = 'la Big Tech';
  if (networks && networks.length > 0) {
    const netList = Array.isArray(networks) ? networks : Array.from(networks);
    if (netList.includes('X / Twitter')) {
      netText = 'X';
    } else if (netList.includes('Facebook')) {
      netText = 'Facebook';
    } else if (netList.includes('Instagram')) {
      netText = 'Instagram';
    } else {
      netText = netList[0];
    }
  }

  if (state.lang === 'en') {
    return `Hey! As soon as ${targetCount} of us sign up, we're leaving ${netText} together. Join my group here: ${inviteUrl}`;
  }
  return `Salut ! Dès qu'on est ${targetCount} à s'inscrire, on quitte ${netText} ensemble. Rejoins mon groupe ici : ${inviteUrl}`;
}

/**
 * Rendu de la boîte de partage SMS / WhatsApp tout prêt
 */
export function renderReadyShareBox(inviteUrl, targetCount, leavingNetworks, prefix = 'widget') {
  const message = getReadyInviteMessage(inviteUrl, targetCount, leavingNetworks);
  return `
    <div class="ready-share-box">
      <div class="ready-share-header">
        <strong>💬 ${t('circle_widget.share_ready_title') || 'Message tout prêt à envoyer par SMS ou WhatsApp :'}</strong>
      </div>
      <div class="ready-share-bubble">
        <p id="${prefix}ShareBubbleText">${message}</p>
      </div>
      <div class="ready-share-actions">
        <button type="button" class="btn-share-social whatsapp" id="${prefix}BtnWhatsApp">
          <span>💬</span> <span>WhatsApp</span>
        </button>
        <button type="button" class="btn-share-social sms" id="${prefix}BtnSMS">
          <span>📱</span> <span>SMS</span>
        </button>
        <button type="button" class="btn-share-social copy" id="${prefix}BtnCopyMessage">
          <span>📋</span> <span>${t('circle_widget.btn_copy_message') || 'Copier le message'}</span>
        </button>
        <button type="button" class="btn-share-social link-only" id="${prefix}BtnCopyLink">
          <span>🔗</span> <span>${t('circle_widget.btn_copy_link') || 'Copier le lien'}</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Attache les écouteurs pour la boîte de partage SMS/WhatsApp
 */
export function attachShareBoxListeners(prefix, inviteUrl, message) {
  const btnWa = document.getElementById(`${prefix}BtnWhatsApp`);
  if (btnWa) {
    btnWa.onclick = () => {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    };
  }

  const btnSms = document.getElementById(`${prefix}BtnSMS`);
  if (btnSms) {
    btnSms.onclick = () => {
      window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
    };
  }

  const btnCopyMsg = document.getElementById(`${prefix}BtnCopyMessage`);
  if (btnCopyMsg) {
    btnCopyMsg.onclick = async () => {
      try {
        await navigator.clipboard.writeText(message);
        showToast(t('circle_widget.message_copied') || 'Message complet copié ! Prêt à coller.');
      } catch {
        showToast('Erreur copie presse-papier');
      }
    };
  }

  const btnCopyLnk = document.getElementById(`${prefix}BtnCopyLink`);
  if (btnCopyLnk) {
    btnCopyLnk.onclick = async () => {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        showToast(t('circle_widget.link_copied') || 'Lien copié dans le presse-papier !');
      } catch {
        showToast('Erreur copie presse-papier');
      }
    };
  }
}

/**
 * Résout une entrée de ville ou code postal sans forcer l'utilisateur à connaître la RTA
 */
export function resolveLocationInput(input) {
  if (!input || !input.trim()) {
    return { fsa: 'H2T', city: 'Montréal', province: 'QC', region: 'MTL' };
  }
  const clean = input.trim();
  const cleanPostal = clean.replace(/\s+/g, '').toUpperCase();
  if (/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]/i.test(cleanPostal)) {
    const fsa = cleanPostal.substring(0, 3);
    const prov = PROVINCE_MAP[fsa[0]];
    return {
      fsa,
      city: prov ? (state.lang === 'fr' ? prov.fr : prov.en) : clean,
      province: prov?.code || 'QC',
      region: prov?.region || prov?.code || 'QC'
    };
  }

  const normCity = clean.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
  const cityMap = {
    montreal: { fsa: 'H2T', city: 'Montréal', province: 'QC', region: 'MTL' },
    quebec: { fsa: 'G1K', city: 'Québec', province: 'QC', region: 'QC' },
    laval: { fsa: 'H7N', city: 'Laval', province: 'QC', region: 'MTL' },
    gatineau: { fsa: 'J8X', city: 'Gatineau', province: 'QC', region: 'QC' },
    longueuil: { fsa: 'J4H', city: 'Longueuil', province: 'QC', region: 'QC' },
    sherbrooke: { fsa: 'J1H', city: 'Sherbrooke', province: 'QC', region: 'QC' },
    saguenay: { fsa: 'G7H', city: 'Saguenay', province: 'QC', region: 'QC' },
    levis: { fsa: 'G6V', city: 'Lévis', province: 'QC', region: 'QC' },
    troisrivieres: { fsa: 'G9A', city: 'Trois-Rivières', province: 'QC', region: 'QC' },
    drummondville: { fsa: 'J2B', city: 'Drummondville', province: 'QC', region: 'QC' },
    granby: { fsa: 'J2G', city: 'Granby', province: 'QC', region: 'QC' },
    saintjean: { fsa: 'J3B', city: 'Saint-Jean-sur-Richelieu', province: 'QC', region: 'QC' },
    ottawa: { fsa: 'K1P', city: 'Ottawa', province: 'ON', region: 'CA' },
    toronto: { fsa: 'M5V', city: 'Toronto', province: 'ON', region: 'CA' },
    vancouver: { fsa: 'V6B', city: 'Vancouver', province: 'BC', region: 'CA' },
    calgary: { fsa: 'T2P', city: 'Calgary', province: 'AB', region: 'CA' },
    edmonton: { fsa: 'T5J', city: 'Edmonton', province: 'AB', region: 'CA' },
    winnipeg: { fsa: 'R3C', city: 'Winnipeg', province: 'MB', region: 'CA' },
    halifax: { fsa: 'B3H', city: 'Halifax', province: 'NS', region: 'CA' }
  };

  if (cityMap[normCity]) {
    return cityMap[normCity];
  }

  if (cleanPostal.length >= 1 && PROVINCE_MAP[cleanPostal[0]]) {
    const prov = PROVINCE_MAP[cleanPostal[0]];
    return {
      fsa: `${cleanPostal[0]}1A`,
      city: prov.fr,
      province: prov.code,
      region: prov.region || prov.code
    };
  }

  return { fsa: 'H2T', city: clean, province: 'QC', region: 'MTL' };
}

/**
 * Génère le SVG de la rosace officielle de la Ville de Montréal (Georges Huel, 1981)
 * Quatre cœurs stylisés orientés à 90 degrés se rejoignant au centre
 */
export function getMtlRosetteSvg(size = 14, color = null) {
  const colorAttr = color ? `style="fill:${color};"` : '';
  return `<span class="mtl-rosette-icon" aria-hidden="true" style="display:inline-flex;align-items:center;vertical-align:middle;width:${size}px;height:${size}px;"><svg viewBox="0 0 100 100" class="svg-mtl-rosette" ${colorAttr} width="${size}" height="${size}"><path d="M 50,50 C 42,38 24,24 24,14 C 24,5 37,2 50,15 C 63,2 76,5 76,14 C 76,24 58,38 50,50 Z" /><path d="M 50,50 C 42,38 24,24 24,14 C 24,5 37,2 50,15 C 63,2 76,5 76,14 C 76,24 58,38 50,50 Z" transform="rotate(90 50 50)" /><path d="M 50,50 C 42,38 24,24 24,14 C 24,5 37,2 50,15 C 63,2 76,5 76,14 C 76,24 58,38 50,50 Z" transform="rotate(180 50 50)" /><path d="M 50,50 C 42,38 24,24 24,14 C 24,5 37,2 50,15 C 63,2 76,5 76,14 C 76,24 58,38 50,50 Z" transform="rotate(270 50 50)" /></svg></span>`;
}

// Villes connues et inférence territoriale
const KNOWN_CITIES = {
  Montreal: { province: 'QC', country: 'CA', fr: 'Montréal', en: 'Montreal' },
  Montréal: { province: 'QC', country: 'CA', fr: 'Montréal', en: 'Montreal' },
  Quebec: { province: 'QC', country: 'CA', fr: 'Québec', en: 'Quebec City' },
  Québec: { province: 'QC', country: 'CA', fr: 'Québec', en: 'Quebec City' },
  Levis: { province: 'QC', country: 'CA', fr: 'Lévis', en: 'Levis' },
  Lévis: { province: 'QC', country: 'CA', fr: 'Lévis', en: 'Levis' },
  Beauharnois: { province: 'QC', country: 'CA', fr: 'Beauharnois', en: 'Beauharnois' },
  Toronto: { province: 'ON', country: 'CA', fr: 'Toronto', en: 'Toronto' }
};

/**
 * Hiérarchie territoriale normalisée : Ville -> Province -> Pays
 * Règle canonique : si une instance est à Montréal, elle est nécessairement
 * aussi au Québec et nécessairement aussi au Canada.
 */
export function getLocationHierarchy(loc = {}) {
  const city = loc?.city || null;
  const isMtl = city === 'Montreal' || city === 'Montréal';
  const province = isMtl ? 'QC' : (loc?.province || (city && KNOWN_CITIES[city]?.province) || null);
  const isQc = isMtl || province === 'QC';
  const country = (isQc || province || loc?.country === 'CA') ? 'CA' : (loc?.country || 'CA');
  const isCa = country === 'CA' || isQc || isMtl;

  const cityName = city ? (t(`locations.cities.${city}`) || KNOWN_CITIES[city]?.[state.lang] || city) : null;
  const provinceName = province ? (t(`locations.provinces.${province}`) || province) : null;
  const countryName = country ? (t(`locations.countries.${country}`) || country) : null;

  return {
    city,
    province,
    country,
    isMtl,
    isQc,
    isCa,
    cityName,
    provinceName,
    countryName
  };
}

// Dictionnaire des provinces canadiennes pour badge interactif
const PROVINCE_MAP = {
  A: { code: 'NL', region: 'CA', fr: 'Terre-Neuve-et-Labrador', en: 'Newfoundland & Labrador', icon: '🇨🇦' },
  B: { code: 'NS', region: 'CA', fr: 'Nouvelle-Écosse', en: 'Nova Scotia', icon: '🇨🇦' },
  C: { code: 'PE', region: 'CA', fr: 'Île-du-Prince-Édouard', en: 'Prince Edward Island', icon: '🇨🇦' },
  E: { code: 'NB', region: 'CA', fr: 'Nouveau-Brunswick', en: 'New Brunswick', icon: '🇨🇦' },
  G: { code: 'QC', region: 'QC', fr: 'Québec (Est)', en: 'Quebec (East)', icon: '⚜️' },
  H: { code: 'QC', region: 'MTL', fr: 'Montréal / Laval', en: 'Montreal / Laval', icon: 'mtl' },
  J: { code: 'QC', region: 'QC', fr: 'Québec (Ouest & Nord)', en: 'Quebec (West & North)', icon: '⚜️' },
  K: { code: 'ON', fr: 'Ontario (Est / Ottawa)', en: 'Ontario (East / Ottawa)', icon: '🇨🇦' },
  L: { code: 'ON', fr: 'Ontario (Centre)', en: 'Ontario (Central)', icon: '🇨🇦' },
  M: { code: 'ON', fr: 'Ontario (Grand Toronto)', en: 'Ontario (Greater Toronto)', icon: '🇨🇦' },
  N: { code: 'ON', fr: 'Ontario (Sud-Ouest)', en: 'Ontario (Southwest)', icon: '🇨🇦' },
  P: { code: 'ON', fr: 'Ontario (Nord)', en: 'Ontario (North)', icon: '🇨🇦' },
  R: { code: 'MB', fr: 'Manitoba', en: 'Manitoba', icon: '🇨🇦' },
  S: { code: 'SK', fr: 'Saskatchewan', en: 'Saskatchewan', icon: '🇨🇦' },
  T: { code: 'AB', fr: 'Alberta', en: 'Alberta', icon: '🇨🇦' },
  V: { code: 'BC', fr: 'Colombie-Britannique', en: 'British Columbia', icon: '🇨🇦' },
  X: { code: 'NT', fr: 'Territoires du Nord-Ouest / Nunavut', en: 'Northwest Territories / Nunavut', icon: '🇨🇦' },
  Y: { code: 'YT', fr: 'Yukon', en: 'Yukon', icon: '🇨🇦' }
};

// Initialisation au chargement du DOM
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
  await setupLanguage();
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

  // Polling doux des statistiques territoriales toutes les 30 secondes
  setInterval(loadTerritoryStats, 30000);

  // Polling doux du cercle personnel toutes les 15 secondes
  setInterval(() => {
    if (state.myBlindCircleId) {
      renderMyCircleWidget();
    }
  }, 15000);
  });
}

/**
 * Gestion de la langue et de l'i18n
 */
async function setupLanguage() {
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
      updatePostalCodeFeedback();
      renderRecommendations();
      renderDirectory();
    });
  }
}

async function loadTranslations(lang) {
  try {
    const res = await fetch(`/locales/${lang}.json`);
    state.translations = await res.json();
  } catch (err) {
    console.error('Erreur chargement i18n:', err);
  }
}

function t(keyPath) {
  const parts = keyPath.split('.');
  let curr = state.translations;
  for (const part of parts) {
    if (!curr || curr[part] === undefined) return keyPath;
    curr = curr[part];
  }
  return curr;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    // Le bouton push est géré dynamiquement par updatePushButtonUI()
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

  updatePushButtonUI();

  if (state.savedCircleData || localStorage.getItem('pacte_my_circle')) {
    renderMyCircleWidget();
  }

  if (state.alternatives && state.alternatives.length > 0) {
    renderRecommendations();
    renderDirectory();
  }
}

/**
 * Met à jour l'apparence et le texte du bouton d'activation Push selon l'état actuel
 */
export function updatePushButtonUI() {
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
 * Chargement du répertoire des alternatives souveraines
 */
async function loadAlternatives() {
  try {
    const res = await fetch('/data/alternatives.json');
    if (!res.ok) return;
    state.alternatives = await res.json();
    renderRecommendations();
    renderDirectory();
  } catch (err) {
    console.warn('Erreur chargement des alternatives:', err);
  }
}

/**
 * Détection du parrainage aveugle dans le fragment d'URL (#cercle=...&k=...)
 */
function detectInviteHash() {
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
 * Configuration des écouteurs d'événements
 */
function setupEventListeners() {
  // Validation du code postal
  const postalInput = document.getElementById('postalCodeInput');
  if (postalInput) {
    postalInput.addEventListener('input', () => {
      updatePostalCodeFeedback();
      renderRecommendations();
    });
  }

  // Sélection des puces Big Tech dans le formulaire
  document.querySelectorAll('.network-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
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

  // Choix du seuil de cercle
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
        // Désactivation de la notification
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

      // Activation de la notification
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

  // Filtres du répertoire (Catégories)
  document.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.currentDirectoryCat = e.currentTarget.dataset.cat;
      renderDirectory();
    });
  });

  // Filtres du répertoire (Régions)
  document.querySelectorAll('[data-region]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-region]').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.currentDirectoryRegion = e.currentTarget.dataset.region;
      renderDirectory();
    });
  });

  // Filtres du répertoire (Langues)
  document.querySelectorAll('[data-lang-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-lang-filter]').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.currentDirectoryLang = e.currentTarget.dataset.langFilter;
      renderDirectory();
    });
  });

  // Recherche dans le répertoire
  const searchInput = document.getElementById('directorySearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.directorySearchQuery = e.target.value.trim().toLowerCase();
      renderDirectory();
    });
  }

  // Case à cocher pour sélection manuelle d'instance (utilisateurs avancés)
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

  // Si une instance a été choisie depuis la page /repertoire
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

  // Soumission du formulaire de pacte
  const form = document.getElementById('pactForm');
  if (form) {
    form.addEventListener('submit', handlePactSubmit);
  }

  // Copie du lien d'invitation
  const copyBtn = document.getElementById('btnCopyInvite');
  if (copyBtn) {
    copyBtn.addEventListener('click', handleCopyInviteLink);
  }

  // Fermeture du modal de succès
  const modalClose = document.getElementById('btnModalClose');
  if (modalClose) {
    modalClose.addEventListener('click', () => {
      document.getElementById('successModal').classList.remove('show');
    });
  }
}

/**
 * Mise à jour visuelle lors de la saisie de la ville ou du code postal
 */
function updatePostalCodeFeedback() {
  const input = document.getElementById('postalCodeInput');
  const badge = document.getElementById('geoBadge');
  const qcRecomBadge = document.getElementById('recomQcBadge');
  if (!input || !badge) return;

  const val = input.value.trim();
  if (val.length >= 1) {
    const resolved = resolveLocationInput(val);
    state.userProvince = resolved.province;
    state.userRegion = resolved.region;
    badge.style.display = 'inline-flex';
    if (resolved.region === 'MTL') {
      badge.innerHTML = `📍 ${getMtlRosetteSvg(14)} ${resolved.city} (QC)`;
      badge.className = 'geo-badge mtl';
    } else {
      const icon = resolved.province === 'QC' ? '⚜️' : '🍁';
      badge.textContent = `📍 ${icon} ${resolved.city} (${resolved.province})`;
      badge.className = resolved.province === 'QC' ? 'geo-badge qc' : 'geo-badge ca';
    }

    if (qcRecomBadge) {
      if (resolved.region === 'MTL') {
        qcRecomBadge.style.display = 'inline-flex';
        qcRecomBadge.className = 'recom-qc-badge mtl';
        qcRecomBadge.innerHTML = `${getMtlRosetteSvg(12)} Solutions montréalaises priorisées`;
      } else if (resolved.province === 'QC') {
        qcRecomBadge.style.display = 'inline-flex';
        qcRecomBadge.className = 'recom-qc-badge';
        qcRecomBadge.innerHTML = `⚜️ Solutions québécoises priorisées`;
      } else {
        qcRecomBadge.style.display = 'none';
      }
    }
    renderRecommendations();
    if (document.getElementById('instancesGrid')) {
      renderDirectory();
    }
    return;
  }

  state.userRegion = 'QC';
  badge.style.display = 'none';
  if (qcRecomBadge) {
    qcRecomBadge.style.display = state.userProvince === 'QC' ? 'inline-flex' : 'none';
    qcRecomBadge.className = 'recom-qc-badge';
    qcRecomBadge.innerHTML = `⚜️ Solutions québécoises priorisées`;
  }
}

/**
 * Calcule et affiche les recommandations d'alternatives dans le formulaire
 */
function renderRecommendations() {
  const box = document.getElementById('recommendationsBox');
  const container = document.getElementById('recomCards');
  const qcRecomBadge = document.getElementById('recomQcBadge');
  const pickedBadge = document.getElementById('autoServerPickedBadge');
  if (!container || state.alternatives.length === 0) return;

  // Filtrer les alternatives qui remplacent les réseaux cochés
  let matching = state.alternatives.filter(alt => {
    return alt.replaces.some(rep => {
      for (const selected of state.selectedNetworks) {
        const repL = rep.toLowerCase();
        const selL = selected.toLowerCase();
        if (repL.includes(selL) || selL.includes(repL)) {
          return true;
        }
        if (selL.includes('facebook') && repL.includes('facebook')) {
          return true;
        }
      }
      return false;
    });
  });

  if (matching.length === 0) {
    matching = [...state.alternatives];
  }

  // Trier pour mettre en avant les solutions locales selon la région de l'utilisateur
  matching.sort((a, b) => {
    const aHier = getLocationHierarchy(a.location);
    const bHier = getLocationHierarchy(b.location);

    if (state.userRegion === 'MTL') {
      const aMtl = aHier.isMtl ? 1 : 0;
      const bMtl = bHier.isMtl ? 1 : 0;
      if (bMtl !== aMtl) return bMtl - aMtl;

      const aQc = aHier.isQc ? 1 : 0;
      const bQc = bHier.isQc ? 1 : 0;
      if (bQc !== aQc) return bQc - aQc;

      const aFr = a.support_fr ? 1 : 0;
      const bFr = b.support_fr ? 1 : 0;
      if (bFr !== aFr) return bFr - aFr;
    } else if (state.userProvince === 'QC') {
      const aQc = aHier.isQc ? 1 : 0;
      const bQc = bHier.isQc ? 1 : 0;
      if (bQc !== aQc) return bQc - aQc;

      const aFr = a.support_fr ? 1 : 0;
      const bFr = b.support_fr ? 1 : 0;
      if (bFr !== aFr) return bFr - aFr;
    } else {
      const aIsLocal = aHier.province === state.userProvince ? 1 : 0;
      const bIsLocal = bHier.province === state.userProvince ? 1 : 0;
      if (bIsLocal !== aIsLocal) return bIsLocal - aIsLocal;
    }
    return 0;
  });

  const topMatches = matching.slice(0, 4);

  // Par défaut, choisir automatiquement la première alternative optimale
  if (!state.chosenAlternativeId || !matching.some(m => m.id === state.chosenAlternativeId)) {
    state.chosenAlternativeId = topMatches[0]?.id || null;
  }

  // Mise à jour de l'affichage de l'attribution automatique (Recommandation transparente)
  const topAlt = state.alternatives.find(a => a.id === state.chosenAlternativeId) || topMatches[0];
  if (topAlt && pickedBadge) {
    const hier = getLocationHierarchy(topAlt.location);
    const locText = hier.cityName || hier.provinceName || 'Canada';
    pickedBadge.innerHTML = `<span class="badge-auto-choice">🎯 Serveur associé : <strong>${topAlt.name}</strong> (${getUsageLabel(topAlt)} &bull; ${locText})</span>`;
  }

  // Afficher ou masquer la sélection manuelle selon l'état de la case à cocher
  const chkManual = document.getElementById('chkManualServer');
  const showManual = (chkManual && chkManual.checked) || state.isManualServerChoice;
  if (box) {
    box.style.display = showManual ? 'block' : 'none';
  }

  if (qcRecomBadge) {
    if (state.userRegion === 'MTL') {
      qcRecomBadge.style.display = 'inline-flex';
      qcRecomBadge.className = 'recom-qc-badge mtl';
      qcRecomBadge.innerHTML = `${getMtlRosetteSvg(12)} Solutions montréalaises priorisées`;
    } else if (state.userProvince === 'QC') {
      qcRecomBadge.style.display = 'inline-flex';
      qcRecomBadge.className = 'recom-qc-badge';
      qcRecomBadge.innerHTML = `⚜️ Solutions québécoises priorisées`;
    } else {
      qcRecomBadge.style.display = 'none';
    }
  }

  container.innerHTML = topMatches.map(alt => {
    const isSelected = alt.id === state.chosenAlternativeId;
    const hier = getLocationHierarchy(alt.location);
    const cardClass = hier.isMtl ? 'mtl-card' : (hier.isQc ? 'qc-card' : 'ca-card');

    let hostTag = '';
    if (hier.isMtl) {
      const mtlTxt = state.lang === 'fr' ? 'Hébergé à MTL' : 'Hosted in MTL';
      hostTag = `<span class="recom-host-pill mtl" title="${alt.host}">${getMtlRosetteSvg(11)} ${mtlTxt}</span>`;
    } else if (hier.isQc) {
      const qcTxt = state.lang === 'fr' ? 'Hébergé au QC' : 'Hosted in QC';
      hostTag = `<span class="recom-host-pill qc" title="${alt.host}">⚜️ ${qcTxt}</span>`;
    } else {
      const caTxt = state.lang === 'fr' ? 'Hébergé au CA' : 'Hosted in CA';
      hostTag = `<span class="recom-host-pill ca" title="${alt.host}">🍁 ${caTxt}</span>`;
    }

    let langPill = '';
    if (alt.support_fr && alt.support_en) {
      langPill = '<span class="recom-lang-badge bilingual" title="Support bilingue (FR / EN)">⚜️ 🍁 FR/EN</span>';
    } else if (alt.support_fr) {
      langPill = '<span class="recom-lang-badge fr" title="Support en français">⚜️ FR</span>';
    } else if (alt.support_en) {
      langPill = '<span class="recom-lang-badge en" title="Support en anglais">🍁 EN</span>';
    }

    return `
      <div class="recom-card ${isSelected ? 'selected' : ''} ${cardClass}" data-recom-id="${alt.id}">
        <div class="recom-card-title">
          <span class="recom-name">${alt.name}</span>
          <div class="recom-badges-row">
            ${hostTag}
            ${langPill}
          </div>
        </div>
        <div class="recom-card-sub">${getUsageLabel(alt)}</div>
        <div class="recom-card-host"><small>📍 ${hier.cityName ? `${hier.cityName}, ` : ''}${hier.provinceName || 'Canada'}</small></div>
      </div>
    `;
  }).join('');

  // Clic pour choisir manuellement l'alternative cible
  container.querySelectorAll('.recom-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.recom-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.chosenAlternativeId = card.dataset.recomId;
      const chosen = state.alternatives.find(a => a.id === state.chosenAlternativeId);
      if (chosen && pickedBadge) {
        const hier = getLocationHierarchy(chosen.location);
        const locText = hier.cityName || hier.provinceName || 'Canada';
        pickedBadge.innerHTML = `<span class="badge-auto-choice">🎯 Serveur choisi : <strong>${chosen.name}</strong> (${getUsageLabel(chosen)} &bull; ${locText})</span>`;
      }
    });
  });
}

/**
 * Affiche les instances dans le répertoire interactif
 */
function renderDirectory() {
  const grid = document.getElementById('instancesGrid');
  if (!grid || state.alternatives.length === 0) return;

  let filtered = state.alternatives.filter(alt => {
    const hier = getLocationHierarchy(alt.location);

    // Filtre catégorie
    if (state.currentDirectoryCat !== 'all' && alt.category !== state.currentDirectoryCat) {
      return false;
    }
    // Filtre région
    if (state.currentDirectoryRegion === 'MTL' && !hier.isMtl) {
      return false;
    }
    // Une solution hébergée à Montréal est automatiquement au Québec
    if (state.currentDirectoryRegion === 'QC' && !hier.isQc) {
      return false;
    }
    // Filtre Canada (hors Québec/Montréal)
    if (state.currentDirectoryRegion === 'CA' && hier.isQc) {
      return false;
    }
    // Filtre langue
    if (state.currentDirectoryLang === 'fr' && !alt.support_fr) {
      return false;
    }
    if (state.currentDirectoryLang === 'en' && !alt.support_en) {
      return false;
    }
    if (state.currentDirectoryLang === 'bilingual' && (!alt.support_fr || !alt.support_en)) {
      return false;
    }
    // Filtre recherche textuelle
    if (state.directorySearchQuery) {
      const q = state.directorySearchQuery;
      const desc = t(`alternatives.${alt.id}.desc`) || '';
      const catName = t(`categories.${alt.category}`) || alt.category;
      const haystack = `${alt.name} ${alt.protocol} ${desc} ${catName} ${alt.host} ${alt.org} ${alt.replaces.join(' ')} ${alt.stack?.name || ''} ${hier.cityName || ''} ${hier.provinceName || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-dim);">
        <p style="font-size:1.1rem;">${state.lang === 'fr' ? 'Aucune instance ne correspond à ces critères de recherche.' : 'No instances match these filter criteria.'}</p>
      </div>
    `;
    return;
  }

  // Si l'utilisateur est à Montréal ou au Québec, trier en conséquence
  filtered.sort((a, b) => {
    const aHier = getLocationHierarchy(a.location);
    const bHier = getLocationHierarchy(b.location);

    if (state.userRegion === 'MTL') {
      const aMtl = aHier.isMtl ? 1 : 0;
      const bMtl = bHier.isMtl ? 1 : 0;
      if (bMtl !== aMtl) return bMtl - aMtl;

      const aQc = aHier.isQc ? 1 : 0;
      const bQc = bHier.isQc ? 1 : 0;
      if (bQc !== aQc) return bQc - aQc;
    } else if (state.userProvince === 'QC') {
      const aQc = aHier.isQc ? 1 : 0;
      const bQc = bHier.isQc ? 1 : 0;
      if (bQc !== aQc) return bQc - aQc;
    }
    return 0;
  });

  grid.innerHTML = filtered.map(alt => {
    const hier = getLocationHierarchy(alt.location);
    const cardClass = hier.isMtl ? 'mtl-card' : (hier.isQc ? 'qc-card' : 'ca-card');

    let flagBadges = '';
    if (hier.isMtl) {
      // Montréal -> automatiquement aussi Québec et Canada
      const mtlName = t('locations.cities.Montreal') || 'Montréal';
      flagBadges = `
        <span class="badge-tag mtl" title="Hébergé à Montréal">${getMtlRosetteSvg(12)} ${mtlName}</span>
        <span class="badge-tag qc" title="Province de Québec">⚜️ Québec</span>
      `;
    } else if (hier.isQc) {
      const qcName = t('locations.provinces.QC') || 'Québec';
      flagBadges = `<span class="badge-tag qc">⚜️ ${qcName}</span>`;
    } else {
      flagBadges = '<span class="badge-tag ca">🍁 Canada</span>';
    }

    let hostBadge = '';
    if (hier.isMtl) {
      hostBadge = `<span class="badge-tag mtl-host" title="Données hébergées à Montréal (Québec, Canada), conformité Loi 25">${getMtlRosetteSvg(12)} ${t('directory.hosted_in_mtl') || 'Hébergé à Montréal'}</span>`;
    } else if (hier.isQc) {
      hostBadge = `<span class="badge-tag qc-host" title="Données hébergées en sol québécois, conformité Loi 25">⚜️ ${t('directory.hosted_in_qc') || 'Hébergé au Québec'}</span>`;
    } else {
      hostBadge = `<span class="badge-tag ca-host" title="Données hébergées en sol canadien">🍁 ${t('directory.hosted_in_ca') || 'Hébergé au Canada'}</span>`;
    }

    let langBadges = '';
    if (alt.support_fr && alt.support_en) {
      langBadges = '<span class="badge-lang bilingual" title="Support complet français et anglais">⚜️ 🍁 Bilingue FR / EN</span>';
    } else if (alt.support_fr) {
      langBadges = '<span class="badge-lang fr" title="Support complet en français">⚜️ Support FR</span>';
    } else if (alt.support_en) {
      langBadges = '<span class="badge-lang en" title="Support en anglais">🍁 Support EN</span>';
    }

    const replacesText = alt.replaces.join(', ');
    const desc = t(`alternatives.${alt.id}.desc`) || '';
    const catName = t(`categories.${alt.category}`) || alt.category;

    // Pile logicielle et code source
    const stackBadge = alt.stack?.is_opensource && alt.stack?.repo_url
      ? `<a href="${alt.stack.repo_url}" target="_blank" rel="noopener noreferrer" class="meta-link-badge open" title="Code source ouvert de la pile logicielle">${alt.stack.name} <span class="badge-sub">✔ ${t('directory.stack_open_source') || 'Libre'} ↗</span></a>`
      : `<span class="meta-text">${alt.stack?.name || alt.protocol}</span>`;

    const sourceBadge = alt.project_source?.is_available && alt.project_source?.repo_url
      ? `<a href="${alt.project_source.repo_url}" target="_blank" rel="noopener noreferrer" class="meta-link-badge source" title="Code source / dépôt public du projet">✔ ${t('directory.project_source_public') || 'Dépôt public'} ↗</a>`
      : `<span class="meta-text-muted">${t('directory.project_source_standard') || 'Déploiement standard'}</span>`;

    let locationStr = '';
    if (hier.cityName && hier.provinceName) {
      locationStr = `${hier.cityName} (${hier.provinceName}, ${hier.countryName})`;
    } else if (hier.provinceName) {
      locationStr = `${hier.provinceName} (${hier.countryName})`;
    } else {
      locationStr = hier.countryName || 'Canada';
    }

    return `
      <div class="instance-card ${cardClass}">
        <div>
          <div class="instance-header">
            <h4 class="instance-name">${alt.name}</h4>
            <div class="instance-badges">
              ${flagBadges}
              ${hostBadge}
              ${langBadges}
              <span class="badge-tag proto">${getUsageLabel(alt)}</span>
            </div>
          </div>
          <div class="instance-replaces">
            ${state.lang === 'fr' ? 'Alternative à :' : 'Replaces:'} <span>${replacesText}</span>
          </div>
          <p class="instance-desc">${desc}</p>
        </div>
        
        <div>
          <div class="instance-meta">
            <div>📍 <strong>${state.lang === 'fr' ? 'Territoire :' : 'Location:'}</strong> ${locationStr} &bull; <small>${alt.host}</small></div>
            <div>🏛️ <strong>${state.lang === 'fr' ? 'Organisation :' : 'Organization:'}</strong> ${alt.org}</div>
            <div>💬 <strong>${state.lang === 'fr' ? 'Support :' : 'Support:'}</strong> ${alt.support_fr ? '<span class="lang-check" title="Support français validé">✔ FR</span>' : ''} ${alt.support_en ? '<span class="lang-check" title="Support anglais validé">✔ EN</span>' : ''}</div>
          </div>
          
          <!-- Section repliable pour les détails d'infrastructure -->
          <details class="technical-details">
            <summary class="technical-summary">${t('directory.tech_details_summary') || '🔧 En savoir plus : infrastructure technique et code source'}</summary>
            <div class="technical-content">
              <p class="technical-intro"><small>${t('directory.tech_details_intro') || 'Détails techniques pour les profanes du web et passionnés d\'informatique libre :'}</small></p>
              <div class="technical-grid">
                <div>⚙️ <strong>${t('directory.protocol_label') || 'Protocole ouvert'} :</strong> ${alt.protocol}</div>
                <div>🛠️ <strong>${t('directory.stack_label') || 'Pile logicielle'} :</strong> ${stackBadge}</div>
                <div>📂 <strong>${t('directory.project_source_label') || 'Code source du projet'} :</strong> ${sourceBadge}</div>
                <div>🏢 <strong>${t('directory.host_datacenter') || 'Hébergement physique'} :</strong> ${alt.host}</div>
              </div>
            </div>
          </details>

          <div class="instance-actions">
            <a href="${alt.url}" target="_blank" rel="noopener noreferrer" class="btn-instance-visit">
              ${t('directory.btn_visit') || 'Visiter l\'instance'} ↗
            </a>
            <button type="button" class="btn-instance-choose" data-choose-alt="${alt.id}">
              ${t('directory.btn_choose') || 'Choisir pour mon pacte'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Boutons "Choisir pour mon pacte"
  grid.querySelectorAll('[data-choose-alt]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const altId = e.currentTarget.dataset.chooseAlt;
      const targetAlt = state.alternatives.find(a => a.id === altId);
      if (targetAlt) {
        state.chosenAlternativeId = altId;
        localStorage.setItem('pacte_preselected_alt', altId);

        if (window.location.pathname.includes('/repertoire')) {
          window.location.href = '/#engagement';
          return;
        }

        // Ajuster les réseaux sélectionnés
        if (targetAlt.replaces && targetAlt.replaces.length > 0) {
          state.selectedNetworks.clear();
          targetAlt.replaces.forEach(r => state.selectedNetworks.add(r));
          document.querySelectorAll('.network-chip').forEach(chip => {
            const net = chip.dataset.network;
            if (targetAlt.replaces.some(r => r.includes(net) || net.includes(r))) {
              chip.classList.add('active');
            } else {
              chip.classList.remove('active');
            }
          });
        }
        state.isManualServerChoice = true;
        const chk = document.getElementById('chkManualServer');
        if (chk) chk.checked = true;
        renderRecommendations();
        // Défilement doux vers le formulaire
        document.getElementById('engagement')?.scrollIntoView({ behavior: 'smooth' });
        showToast(state.lang === 'fr' ? `${targetAlt.name} sélectionné pour votre pacte !` : `${targetAlt.name} selected for your pact!`);
      }
    });
  });
}

/**
 * Joue un carillon harmonique de célébration civique via la Web Audio API (Do-Mi-Sol-Do)
 */
export function playCelebrationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.2, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.5);
    });
  } catch (err) {
    console.warn('[Audio] Carillon audio non disponible:', err);
  }
}

/**
 * Déclenche la célébration de déblocage du seuil : carillon audio, notification locale et toast persistant
 */
export async function triggerThresholdCelebration(savedCircle, currentCount, targetCount) {
  playCelebrationChime();

  const title = t('circle_widget.unlocked_title') || '🎉 Masse critique atteinte !';
  const body = (t('circle_widget.celebration_toast') || '🎉 Masse critique atteinte ! Votre cercle de {count} personnes est complet. Vous pouvez faire le saut ensemble !').replace('{count}', targetCount);

  // Notification bureau native si autorisée
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          reg.showNotification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200],
            data: { url: '/#souverainete-active' }
          });
        } else {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      } else {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    } catch (e) {
      console.warn('[Push] Erreur affichage notification locale:', e);
    }
  }

  showToast(`${title}\n${body}`, 10000);

  // Mémoriser la célébration pour ne pas rejouer le carillon à chaque cycle de 15s
  savedCircle.celebrated = true;
  localStorage.setItem('pacte_my_circle', JSON.stringify(savedCircle));
  state.savedCircleData = savedCircle;
}

/**
 * Teste la capacité du fureteur à afficher des notifications système
 */
export async function testLocalNotification() {
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

/**
 * Restaure le cercle personnel sauvegardé localement dans localStorage
 */
async function restoreSavedCircle() {
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
 * Affiche ou met à jour le widget de progression du cercle sauvegardé
 */
async function renderMyCircleWidget() {
  const widget = document.getElementById('myCircleWidget');
  if (!widget) return;

  const saved = state.savedCircleData || (localStorage.getItem('pacte_my_circle') ? JSON.parse(localStorage.getItem('pacte_my_circle')) : null);
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
  const needed = Math.max(0, targetCount - currentCount);
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
        localStorage.removeItem('pacte_my_circle');
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
async function handlePactSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('btnSubmitPact');
  const postalInput = document.getElementById('postalCodeInput');
  const emailInput = document.getElementById('emailInput');

  const rawCityOrPostal = postalInput ? postalInput.value.trim() : '';
  const resolvedLoc = resolveLocationInput(rawCityOrPostal);
  const fsa = resolvedLoc.fsa;

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = t('form.submitting');

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
      email: emailInput.value.trim() || null,
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
    localStorage.setItem('pacte_my_circle', JSON.stringify(myCircleData));
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
    const chosenAlt = state.alternatives.find(a => a.id === state.chosenAlternativeId);
    const modalTargetBox = document.getElementById('modalTargetRecom');
    const modalTargetText = document.getElementById('modalTargetRecomText');
    if (chosenAlt && modalTargetBox && modalTargetText) {
      modalTargetBox.style.display = 'block';
      modalTargetText.textContent = ` ${chosenAlt.name} (${getUsageLabel(chosenAlt)}) - ${chosenAlt.url}`;
    }

    document.getElementById('successModal').classList.add('show');

    // Recharger les statistiques territoriales
    loadTerritoryStats();
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = t('form.submit_btn');
  }
}

/**
 * Copie du lien d'invitation privé
 */
async function handleCopyInviteLink() {
  const input = document.getElementById('inviteLinkInput');
  if (!input) return;

  try {
    await navigator.clipboard.writeText(input.value);
    showToast(t('modal_success.copied'));
  } catch (err) {
    input.select();
    document.execCommand('copy');
    showToast(t('modal_success.copied'));
  }
}

/**
 * Chargement des statistiques territoriales
 */
async function loadTerritoryStats() {
  try {
    const res = await fetch('/api/stats/territory');
    if (!res.ok) return;

    const data = await res.json();

    // Compteurs héro
    const nationalCounter = document.getElementById('counterNational');
    if (nationalCounter) {
      nationalCounter.textContent = Number(data.total_national || 0).toLocaleString();
    }

    // Jauges par province
    renderProvinceStats(data.provinces || {});

    // Top RTA / FSA
    renderFsaStats(data.fsa_top || []);
  } catch (err) {
    console.warn('Erreur chargement stats territoriales:', err);
  }
}

function renderProvinceStats(provinces) {
  const container = document.getElementById('provinceStatsList');
  if (!container) return;

  const entries = Object.entries(provinces).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    container.innerHTML = `<p style="color:var(--text-dim);font-size:0.9rem;">${state.lang === 'fr' ? 'Soyez les premiers à vous engager dans votre province !' : 'Be the first to commit in your province!'}</p>`;
    return;
  }

  const max = Math.max(...entries.map(e => e[1]), 10);
  container.innerHTML = entries.map(([prov, count]) => {
    const pct = Math.min(Math.round((count / max) * 100), 100);
    return `
      <div class="stat-item">
        <div class="stat-header">
          <span>${prov}</span>
          <span><strong>${count}</strong> ${state.lang === 'fr' ? 'signataires' : 'signers'}</span>
        </div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderFsaStats(fsaList) {
  const container = document.getElementById('fsaStatsList');
  if (!container) return;

  if (fsaList.length === 0) {
    container.innerHTML = `<p style="color:var(--text-dim);font-size:0.9rem;">${state.lang === 'fr' ? 'Aucun quartier actif pour le moment. Signez pour mobiliser le vôtre !' : 'No active neighborhoods yet. Sign to mobilize yours!'}</p>`;
    return;
  }

  container.innerHTML = fsaList.slice(0, 7).map(item => {
    const threshold = item.target_threshold || 100;
    const pct = Math.min(Math.round((item.signers_count / threshold) * 100), 100);
    return `
      <div class="stat-item">
        <div class="stat-header">
          <span>Quartier <strong>${item.fsa}</strong> (${item.province})</span>
          <span>${item.signers_count} / ${threshold} (${pct}%)</span>
        </div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Affiche une bulle d'information temporaire (Toast)
 */
function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
