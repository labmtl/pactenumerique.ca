import {
  generateRandomKeyBytes,
  deriveBlindId,
  bufToBase64Url,
  base64UrlToBuf,
  solveProofOfWork
} from './crypto.js';
import { subscribeToPushNotifications, registerServiceWorker } from './push.js';

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
  alternatives: [],
  selectedNetworks: new Set(['X / Twitter', 'Instagram']),
  chosenAlternativeId: null,
  currentDirectoryCat: 'all',
  currentDirectoryRegion: 'all',
  currentDirectoryLang: 'all',
  directorySearchQuery: ''
};

// Dictionnaire des provinces canadiennes pour badge interactif
const PROVINCE_MAP = {
  A: { code: 'NL', fr: 'Terre-Neuve-et-Labrador', en: 'Newfoundland & Labrador', icon: '🇨🇦' },
  B: { code: 'NS', fr: 'Nouvelle-Écosse', en: 'Nova Scotia', icon: '🇨🇦' },
  C: { code: 'PE', fr: 'Île-du-Prince-Édouard', en: 'Prince Edward Island', icon: '🇨🇦' },
  E: { code: 'NB', fr: 'Nouveau-Brunswick', en: 'New Brunswick', icon: '🇨🇦' },
  G: { code: 'QC', fr: 'Québec (Est)', en: 'Quebec (East)', icon: '⚜️' },
  H: { code: 'QC', fr: 'Québec (Montréal / Laval)', en: 'Quebec (Montreal / Laval)', icon: '⚜️' },
  J: { code: 'QC', fr: 'Québec (Ouest & Nord)', en: 'Quebec (West & North)', icon: '⚜️' },
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
document.addEventListener('DOMContentLoaded', async () => {
  await setupLanguage();
  detectInviteHash();
  setupEventListeners();
  loadTerritoryStats();
  await loadAlternatives();
  registerServiceWorker();

  // Polling doux des statistiques toutes les 30 secondes
  setInterval(loadTerritoryStats, 30000);
});

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

  // Bouton d'activation des notifications push
  const pushBtn = document.getElementById('btnTogglePush');
  if (pushBtn) {
    pushBtn.addEventListener('click', async () => {
      try {
        pushBtn.disabled = true;
        pushBtn.textContent = '...';
        const sub = await subscribeToPushNotifications();
        if (sub) {
          state.pushSubscription = sub;
          state.isPushActive = true;
          pushBtn.classList.add('active');
          pushBtn.textContent = '✓ ' + (state.lang === 'fr' ? 'Activé' : 'Enabled');
          showToast(state.lang === 'fr' ? 'Notifications du fureteur activées !' : 'Browser notifications enabled!');
        } else {
          pushBtn.disabled = false;
          pushBtn.textContent = t('form.enable_push');
        }
      } catch (err) {
        alert(err.message);
        pushBtn.disabled = false;
        pushBtn.textContent = t('form.enable_push');
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
 * Mise à jour visuelle lors de la saisie du code postal
 */
function updatePostalCodeFeedback() {
  const input = document.getElementById('postalCodeInput');
  const badge = document.getElementById('geoBadge');
  const qcRecomBadge = document.getElementById('recomQcBadge');
  if (!input || !badge) return;

  const val = input.value.trim().toUpperCase().replace(/\s+/g, '');
  if (val.length >= 1) {
    const firstLetter = val[0];
    const prov = PROVINCE_MAP[firstLetter];
    if (prov) {
      state.userProvince = prov.code;
      badge.style.display = 'inline-flex';
      const provName = state.lang === 'fr' ? prov.fr : prov.en;
      const icon = prov.icon || (prov.code === 'QC' ? '⚜️' : '🇨🇦');
      badge.textContent = `📍 ${icon} ${prov.code} - ${provName}`;
      badge.className = prov.code === 'QC' ? 'geo-badge qc' : 'geo-badge';
      if (qcRecomBadge) {
        qcRecomBadge.style.display = prov.code === 'QC' ? 'inline-flex' : 'none';
      }
      return;
    }
  }
  badge.style.display = 'none';
  if (qcRecomBadge) {
    qcRecomBadge.style.display = state.userProvince === 'QC' ? 'inline-flex' : 'none';
  }
}

/**
 * Calcule et affiche les recommandations d'alternatives dans le formulaire
 */
function renderRecommendations() {
  const box = document.getElementById('recommendationsBox');
  const container = document.getElementById('recomCards');
  const qcRecomBadge = document.getElementById('recomQcBadge');
  if (!box || !container || state.alternatives.length === 0) return;

  // Filtrer les alternatives qui remplacent les réseaux cochés
  const matching = state.alternatives.filter(alt => {
    return alt.replaces.some(rep => {
      for (const selected of state.selectedNetworks) {
        if (rep.toLowerCase().includes(selected.toLowerCase()) || selected.toLowerCase().includes(rep.toLowerCase())) {
          return true;
        }
      }
      return false;
    });
  });

  if (matching.length === 0) {
    box.style.display = 'none';
    return;
  }

  // Trier pour mettre en avant les solutions hébergées au Québec si l'usager est au Québec
  matching.sort((a, b) => {
    if (state.userProvince === 'QC') {
      const aIsQc = (a.region === 'QC' || a.hosted_in_qc) ? 1 : 0;
      const bIsQc = (b.region === 'QC' || b.hosted_in_qc) ? 1 : 0;
      if (bIsQc !== aIsQc) return bIsQc - aIsQc;
      // Prioriser le support en français
      const aFr = a.support_fr ? 1 : 0;
      const bFr = b.support_fr ? 1 : 0;
      if (bFr !== aFr) return bFr - aFr;
    } else {
      const aIsLocal = a.region === state.userProvince ? 1 : 0;
      const bIsLocal = b.region === state.userProvince ? 1 : 0;
      if (bIsLocal !== aIsLocal) return bIsLocal - aIsLocal;
    }
    return 0;
  });

  const topMatches = matching.slice(0, 4);

  // Par défaut, choisir la première si aucune n'est choisie
  if (!state.chosenAlternativeId || !matching.some(m => m.id === state.chosenAlternativeId)) {
    state.chosenAlternativeId = topMatches[0]?.id || null;
  }

  box.style.display = 'block';
  if (qcRecomBadge) {
    qcRecomBadge.style.display = state.userProvince === 'QC' ? 'inline-flex' : 'none';
  }

  container.innerHTML = topMatches.map(alt => {
    const isSelected = alt.id === state.chosenAlternativeId;
    const isQc = alt.region === 'QC' || alt.hosted_in_qc;
    const hostTag = alt.hosted_in_qc 
      ? `<span class="recom-host-pill qc" title="${alt.host}">⚜️ Hébergé au QC</span>`
      : `<span class="recom-host-pill ca" title="${alt.host}">🇨🇦 Hébergé au CA</span>`;

    let langPill = '';
    if (alt.support_fr && alt.support_en) {
      langPill = '<span class="recom-lang-badge bilingual" title="Support bilingue (FR / EN)">FR/EN</span>';
    } else if (alt.support_fr) {
      langPill = '<span class="recom-lang-badge fr" title="Support en français">FR</span>';
    } else if (alt.support_en) {
      langPill = '<span class="recom-lang-badge en" title="Support en anglais">EN</span>';
    }

    return `
      <div class="recom-card ${isSelected ? 'selected' : ''} ${isQc ? 'qc-card' : ''}" data-recom-id="${alt.id}">
        <div class="recom-card-title">
          <span class="recom-name">${alt.name}</span>
          <div class="recom-badges-row">
            ${hostTag}
            ${langPill}
          </div>
        </div>
        <div class="recom-card-sub">${alt.protocol}</div>
        <div class="recom-card-host"><small>${alt.host}</small></div>
      </div>
    `;
  }).join('');

  // Clic pour choisir l'alternative cible
  container.querySelectorAll('.recom-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.recom-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.chosenAlternativeId = card.dataset.recomId;
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
    // Filtre catégorie
    if (state.currentDirectoryCat !== 'all' && alt.category !== state.currentDirectoryCat) {
      return false;
    }
    // Filtre région
    if (state.currentDirectoryRegion === 'QC' && !(alt.region === 'QC' || alt.hosted_in_qc)) {
      return false;
    }
    if (state.currentDirectoryRegion === 'CA' && alt.region !== 'CA' && alt.hosted_in_qc) {
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
      const haystack = `${alt.name} ${alt.protocol} ${alt.desc_fr} ${alt.desc_en} ${alt.host} ${alt.org} ${alt.replaces.join(' ')} ${alt.lang}`.toLowerCase();
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

  // Si l'utilisateur est au Québec, trier pour mettre en premier les solutions hébergées au Québec
  filtered.sort((a, b) => {
    if (state.userProvince === 'QC') {
      const aQc = (a.hosted_in_qc || a.region === 'QC') ? 1 : 0;
      const bQc = (b.hosted_in_qc || b.region === 'QC') ? 1 : 0;
      if (bQc !== aQc) return bQc - aQc;
    }
    return 0;
  });

  grid.innerHTML = filtered.map(alt => {
    const isQc = alt.region === 'QC' || alt.hosted_in_qc;
    const flagBadge = isQc 
      ? '<span class="badge-tag qc">⚜️ Québec</span>' 
      : '<span class="badge-tag ca">🇨🇦 Canada</span>';
    
    const hostBadge = alt.hosted_in_qc
      ? `<span class="badge-tag qc-host" title="Données hébergées en sol québécois, conformité Loi 25">⚜️ ${t('directory.hosted_in_qc') || 'Hébergé au Québec'}</span>`
      : `<span class="badge-tag ca-host" title="Données hébergées en sol canadien">🇨🇦 ${t('directory.hosted_in_ca') || 'Hébergé au Canada'}</span>`;

    let langBadges = '';
    if (alt.support_fr && alt.support_en) {
      langBadges = '<span class="badge-lang bilingual" title="Support complet français et anglais">🌐 Bilingue FR / EN</span>';
    } else if (alt.support_fr) {
      langBadges = '<span class="badge-lang fr" title="Support complet en français">⚜️ Support FR</span>';
    } else if (alt.support_en) {
      langBadges = '<span class="badge-lang en" title="Support en anglais">🇨🇦 Support EN</span>';
    }

    const replacesText = alt.replaces.join(', ');
    const desc = state.lang === 'fr' ? alt.desc_fr : alt.desc_en;
    const langDisplay = state.lang === 'fr' 
      ? (alt.lang_display_fr || alt.lang)
      : (alt.lang_display_en || alt.lang);

    return `
      <div class="instance-card ${isQc ? 'qc-card' : ''}">
        <div>
          <div class="instance-header">
            <h4 class="instance-name">${alt.name}</h4>
            <div class="instance-badges">
              ${flagBadge}
              ${hostBadge}
              ${langBadges}
              <span class="badge-tag proto">${alt.protocol.split(' ')[0]}</span>
            </div>
          </div>
          <div class="instance-replaces">
            ${state.lang === 'fr' ? 'Alternative à :' : 'Replaces:'} <span>${replacesText}</span>
          </div>
          <p class="instance-desc">${desc}</p>
        </div>
        
        <div>
          <div class="instance-meta">
            <div>📍 <strong>${state.lang === 'fr' ? 'Hébergement :' : 'Hosting:'}</strong> ${alt.host}</div>
            <div>🏛️ <strong>${state.lang === 'fr' ? 'Organisation :' : 'Organization:'}</strong> ${alt.org}</div>
            <div>💬 <strong>${state.lang === 'fr' ? 'Langues et support :' : 'Language & support:'}</strong> ${langDisplay} ${alt.support_fr ? '<span class="lang-check" title="Support français validé">✔ FR</span>' : ''} ${alt.support_en ? '<span class="lang-check" title="Support anglais validé">✔ EN</span>' : ''}</div>
          </div>
          <div class="instance-actions">
            <a href="${alt.url}" target="_blank" rel="noopener noreferrer" class="btn-instance-visit">
              ${t('directory.btn_visit')} ↗
            </a>
            <button type="button" class="btn-instance-choose" data-choose-alt="${alt.id}">
              ${t('directory.btn_choose')}
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
        renderRecommendations();
        // Défilement doux vers le formulaire
        document.getElementById('engagement')?.scrollIntoView({ behavior: 'smooth' });
        showToast(state.lang === 'fr' ? `${targetAlt.name} sélectionné pour votre pacte !` : `${targetAlt.name} selected for your pact!`);
      }
    });
  });
}

/**
 * Soumission du pacte avec Zero-Knowledge & Web Crypto
 */
async function handlePactSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('btnSubmitPact');
  const postalInput = document.getElementById('postalCodeInput');
  const emailInput = document.getElementById('emailInput');

  const rawPostal = postalInput.value.trim().toUpperCase();
  if (rawPostal.length < 3) {
    alert(state.lang === 'fr' ? 'Veuillez saisir un code postal canadien valide.' : 'Please enter a valid Canadian postal code.');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = t('form.submitting');

    // 1. Génération de la clé symétrique du cercle local (32 octets)
    state.circleKeyBytes = generateRandomKeyBytes();
    state.myBlindCircleId = await deriveBlindId(state.circleKeyBytes);

    // 2. Preuve de Travail (Proof-of-Work anti-spam)
    const fsa = rawPostal.substring(0, 3);
    const powNonce = await solveProofOfWork(fsa);

    // 3. Payload d'engagement avec réseaux ciblés
    const payload = {
      postal_code: rawPostal,
      email: emailInput.value.trim() || null,
      blind_circle_id: state.myBlindCircleId,
      inviter_circle_id: state.inviterCircleId || null,
      target_count: state.targetCount,
      push_subscription: state.pushSubscription,
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

    // 4. Générer le lien d'invitation avec clé dans le fragment (#k=...)
    const keyB64 = bufToBase64Url(state.circleKeyBytes);
    const inviteUrl = `${window.location.origin}/#cercle=${state.myBlindCircleId}&k=${keyB64}`;

    document.getElementById('inviteLinkInput').value = inviteUrl;
    document.getElementById('circleTargetDisplay').textContent = `${state.targetCount} ${state.lang === 'fr' ? 'amis' : 'friends'}`;

    // Afficher la destination ciblée dans le modal
    const chosenAlt = state.alternatives.find(a => a.id === state.chosenAlternativeId);
    const modalTargetBox = document.getElementById('modalTargetRecom');
    const modalTargetText = document.getElementById('modalTargetRecomText');
    if (chosenAlt && modalTargetBox && modalTargetText) {
      modalTargetBox.style.display = 'block';
      modalTargetText.textContent = ` ${chosenAlt.name} (${chosenAlt.protocol}) - ${chosenAlt.url}`;
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
