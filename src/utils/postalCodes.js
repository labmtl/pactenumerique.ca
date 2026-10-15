/**
 * Validation et utilitaires pour les codes postaux canadiens
 * et Régions de Tri d'Acheminement (RTA / FSA)
 */

const PROVINCE_MAP = {
  A: { code: 'NL', name_fr: 'Terre-Neuve-et-Labrador', name_en: 'Newfoundland and Labrador' },
  B: { code: 'NS', name_fr: 'Nouvelle-Écosse', name_en: 'Nova Scotia' },
  C: { code: 'PE', name_fr: 'Île-du-Prince-Édouard', name_en: 'Prince Edward Island' },
  E: { code: 'NB', name_fr: 'Nouveau-Brunswick', name_en: 'New Brunswick' },
  G: { code: 'QC', name_fr: 'Québec (Est)', name_en: 'Quebec (East)' },
  H: { code: 'QC', name_fr: 'Québec (Montréal / Laval)', name_en: 'Quebec (Montreal / Laval)' },
  J: { code: 'QC', name_fr: 'Québec (Ouest & Nord)', name_en: 'Quebec (West & North)' },
  K: { code: 'ON', name_fr: 'Ontario (Est / Ottawa)', name_en: 'Ontario (East / Ottawa)' },
  L: { code: 'ON', name_fr: 'Ontario (Centre / Golden Horseshoe)', name_en: 'Ontario (Central)' },
  M: { code: 'ON', name_fr: 'Ontario (Toronto métropolitain)', name_en: 'Ontario (Toronto)' },
  N: { code: 'ON', name_fr: 'Ontario (Sud-Ouest)', name_en: 'Ontario (Southwest)' },
  P: { code: 'ON', name_fr: 'Ontario (Nord)', name_en: 'Ontario (North)' },
  R: { code: 'MB', name_fr: 'Manitoba', name_en: 'Manitoba' },
  S: { code: 'SK', name_fr: 'Saskatchewan', name_en: 'Saskatchewan' },
  T: { code: 'AB', name_fr: 'Alberta', name_en: 'Alberta' },
  V: { code: 'BC', name_fr: 'Colombie-Britannique', name_en: 'British Columbia' },
  X: { code: 'NT', name_fr: 'Territoires du Nord-Ouest / Nunavut', name_en: 'Northwest Territories / Nunavut' },
  Y: { code: 'YT', name_fr: 'Yukon', name_en: 'Yukon' }
};

// Regex standard code postal canadien (ex: H2T 2N5 ou H2T2N5)
const CANADIAN_POSTAL_CODE_REGEX = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ ]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;

// Regex pour les 3 premiers caractères (RTA / FSA)
const FSA_REGEX = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]$/i;

/**
 * Valide un code postal complet ou une RTA (FSA)
 */
export function validatePostalCode(input) {
  if (!input || typeof input !== 'string') return false;
  const clean = input.trim().toUpperCase();
  return CANADIAN_POSTAL_CODE_REGEX.test(clean) || FSA_REGEX.test(clean);
}

/**
 * Extrait la RTA (FSA - 3 premiers caractères) et normalise
 */
export function extractFSA(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim().toUpperCase().replace(/\s+/g, '');
  if (clean.length < 3) return null;
  const fsa = clean.substring(0, 3);
  if (!FSA_REGEX.test(fsa)) return null;
  return fsa;
}

/**
 * Retourne les détails de la province associée à une RTA
 */
export function getProvinceFromFSA(fsa) {
  if (!fsa || typeof fsa !== 'string' || fsa.length < 1) return null;
  const firstLetter = fsa.trim().toUpperCase()[0];
  return PROVINCE_MAP[firstLetter] || { code: 'CA', name_fr: 'Canada', name_en: 'Canada' };
}
