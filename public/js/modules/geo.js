/**
 * Résolution territoriale, hiérarchie géographique et insignes visuels
 */
import { state, t } from './state.js';

// Villes canadiennes connues et inférence territoriale
export const KNOWN_CITIES = {
  Montreal: { province: 'QC', country: 'CA', fr: 'Montréal', en: 'Montreal' },
  Montréal: { province: 'QC', country: 'CA', fr: 'Montréal', en: 'Montreal' },
  Quebec: { province: 'QC', country: 'CA', fr: 'Québec', en: 'Quebec City' },
  Québec: { province: 'QC', country: 'CA', fr: 'Québec', en: 'Quebec City' },
  Levis: { province: 'QC', country: 'CA', fr: 'Lévis', en: 'Levis' },
  Lévis: { province: 'QC', country: 'CA', fr: 'Lévis', en: 'Levis' },
  Beauharnois: { province: 'QC', country: 'CA', fr: 'Beauharnois', en: 'Beauharnois' },
  Toronto: { province: 'ON', country: 'CA', fr: 'Toronto', en: 'Toronto' }
};

// Dictionnaire des indicatifs de provinces canadiennes pour les RTA (FSA)
export const PROVINCE_MAP = {
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
 */
export function getMtlRosetteSvg(size = 14, color = null) {
  const colorAttr = color ? `style="fill:${color};"` : '';
  return `<span class="mtl-rosette-icon" aria-hidden="true" style="display:inline-flex;align-items:center;vertical-align:middle;width:${size}px;height:${size}px;"><svg viewBox="0 0 100 100" class="svg-mtl-rosette" ${colorAttr} width="${size}" height="${size}"><path d="M 50,50 C 42,38 24,24 24,14 C 24,5 37,2 50,15 C 63,2 76,5 76,14 C 76,24 58,38 50,50 Z" /><path d="M 50,50 C 42,38 24,24 24,14 C 24,5 37,2 50,15 C 63,2 76,5 76,14 C 76,24 58,38 50,50 Z" transform="rotate(90 50 50)" /><path d="M 50,50 C 42,38 24,24 24,14 C 24,5 37,2 50,15 C 63,2 76,5 76,14 C 76,24 58,38 50,50 Z" transform="rotate(180 50 50)" /><path d="M 50,50 C 42,38 24,24 24,14 C 24,5 37,2 50,15 C 63,2 76,5 76,14 C 76,24 58,38 50,50 Z" transform="rotate(270 50 50)" /></svg></span>`;
}

/**
 * Hiérarchie territoriale normalisée : Ville -> Province -> Pays
 * Règle canonique : si une instance est à Montréal, elle est nécessairement
 * aussi au Québec et au Canada.
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

/**
 * Mise à jour visuelle lors de la saisie de la ville ou du code postal
 */
export function updatePostalCodeFeedback() {
  if (typeof document === 'undefined') return;

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
  } else {
    badge.style.display = 'none';
    if (qcRecomBadge) qcRecomBadge.style.display = 'none';
  }
}
