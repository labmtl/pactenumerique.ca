/**
 * Notions d'usage intuitives et formatage de la longévité / ancienneté des plateformes
 */
import { state, t } from './state.js';

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
 * Formate la date d'établissement (YYYY-MM) en texte lisible avec calcul d'ancienneté
 */
export function formatLongevity(establishedYm, lang = null) {
  if (!establishedYm || !/^\d{4}-\d{2}$/.test(establishedYm)) return null;
  const currentLang = lang || state.lang || 'fr';
  const [yearStr, monthStr] = establishedYm.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const monthNamesFr = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const mName = currentLang === 'fr' ? monthNamesFr[month - 1] : monthNamesEn[month - 1];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const totalMonths = (currentYear - year) * 12 + (currentMonth - month);
  const years = Math.floor(totalMonths / 12);
  const remMonths = totalMonths % 12;

  let ageStr = '';
  if (years >= 1) {
    if (remMonths > 0 && years < 5) {
      ageStr = currentLang === 'fr'
        ? `${years} an${years > 1 ? 's' : ''} et ${remMonths} mois`
        : `${years} yr${years > 1 ? 's' : ''} ${remMonths} mo`;
    } else {
      ageStr = currentLang === 'fr'
        ? `${years} an${years > 1 ? 's' : ''}`
        : `${years} yr${years > 1 ? 's' : ''}`;
    }
  } else {
    ageStr = currentLang === 'fr'
      ? `${totalMonths} mois`
      : `${totalMonths} mo${totalMonths > 1 ? 's' : ''}`;
  }

  return {
    year,
    month,
    monthYear: `${mName} ${year}`,
    ageStr,
    fullDisplay: `${mName} ${year} (${ageStr})`
  };
}
