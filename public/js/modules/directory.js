/**
 * Répertoire des alternatives souveraines et système de recommandation territorial
 */
import { state, t, showToast } from './state.js';
import { getLocationHierarchy, getMtlRosetteSvg } from './geo.js';
import { getUsageLabel, formatLongevity } from './longevity.js';

/**
 * Chargement du catalogue des alternatives souveraines
 */
export async function loadAlternatives() {
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
 * Affiche les recommandations prioritaires dans le formulaire (Étape 1)
 */
export function renderRecommendations() {
  if (typeof document === 'undefined') return;

  const box = document.getElementById('recommendationsBox');
  const container = document.getElementById('recomCards');
  const qcRecomBadge = document.getElementById('recomQcBadge');
  const pickedBadge = document.getElementById('autoServerPickedBadge');
  if (!container || !state.alternatives || state.alternatives.length === 0) return;

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

  // Par défaut, sélectionner la meilleure alternative locale recommandée si aucune sélection manuelle
  if (!state.chosenAlternativeId || !state.isManualServerChoice) {
    state.chosenAlternativeId = topMatches[0]?.id || null;
  }

  // Afficher le macaron clair de l'attribution automatique si en mode automatique
  if (pickedBadge && state.chosenAlternativeId && !state.isManualServerChoice) {
    const autoPicked = state.alternatives.find(a => a.id === state.chosenAlternativeId);
    if (autoPicked) {
      const hier = getLocationHierarchy(autoPicked.location);
      const locText = hier.cityName || hier.provinceName || 'Canada';
      pickedBadge.innerHTML = `<span class="badge-auto-choice">🎯 Serveur assigné : <strong>${autoPicked.name}</strong> (${getUsageLabel(autoPicked)} &bull; ${locText})</span>`;
    }
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
 * Affiche les instances dans le répertoire interactif (/repertoire)
 */
export function renderDirectory() {
  if (typeof document === 'undefined') return;

  const grid = document.getElementById('instancesGrid');
  if (!grid || !state.alternatives || state.alternatives.length === 0) return;

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

    const longevityInfo = formatLongevity(alt.established, state.lang);
    const longevityBadge = longevityInfo
      ? `<span class="badge-tag longevity" title="${t('directory.track_record') || 'Pérennité et historique documenté'}">⏳ ${t('directory.established_since') || (state.lang === 'fr' ? 'Actif depuis' : 'Active since')} ${longevityInfo.monthYear}</span>`
      : '';

    const longevityMeta = longevityInfo
      ? `<div>⏳ <strong>${t('directory.established_label') || (state.lang === 'fr' ? 'Historique :' : 'History:')}</strong> ${t('directory.established_since') || (state.lang === 'fr' ? 'Actif depuis' : 'Active since')} ${longevityInfo.fullDisplay}</div>`
      : '';

    return `
      <div class="instance-card ${cardClass}">
        <div>
          <div class="instance-header">
            <h4 class="instance-name">${alt.name}</h4>
            <div class="instance-badges">
              ${flagBadges}
              ${hostBadge}
              ${langBadges}
              ${longevityBadge}
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
            ${longevityMeta}
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
                <div>⏳ <strong>${t('directory.activity_period_label') || 'Période d\'activité'} :</strong> ${longevityInfo ? `${longevityInfo.fullDisplay} [${alt.established}]` : (alt.established || 'N/D')}</div>
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
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('pacte_preselected_alt', altId);
        }

        if (window.location.pathname.includes('/repertoire')) {
          window.location.href = '/#engagement';
          return;
        }

        if (Array.isArray(targetAlt.replaces) && targetAlt.replaces.length > 0) {
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
        document.getElementById('engagement')?.scrollIntoView({ behavior: 'smooth' });
        showToast(state.lang === 'fr' ? `${targetAlt.name} sélectionné pour votre pacte !` : `${targetAlt.name} selected for your pact!`);
      }
    });
  });
}
