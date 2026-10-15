import crypto from 'node:crypto';

/**
 * Service cryptographique côté serveur
 * Conçu pour respecter le modèle Zero-Knowledge
 */

/**
 * Calcule un hachage HMAC-SHA256 pour l'anti-doublon d'adresses courriels
 * Empêche quiconque de retrouver l'adresse d'origine sans connaître le sel secret
 */
export function hashEmail(email, serverSalt = process.env.SERVER_SALT || 'pacte_default_salt') {
  if (!email || typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return crypto.createHmac('sha256', serverSalt).update(normalized).digest('hex');
}

/**
 * Valide un format d'identifiant aveugle (hash hex de 64 caractères)
 */
export function isValidBlindId(blindId) {
  if (!blindId || typeof blindId !== 'string') return false;
  return /^[a-f0-9]{64}$/i.test(blindId.trim());
}

/**
 * Vérifie la Preuve de Travail (Proof of Work) anti-spam
 * Le nonce fourni par le client doit produire un hash SHA-256 avec 2 zéros initiaux
 */
export function verifyProofOfWork(payload, nonce) {
  if (nonce === undefined || nonce === null) return false;
  const data = `${payload}:${nonce}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  // Exigence : 2 zéros hexadécimaux en tête (facile pour un fureteur, coûteux pour un spammeur)
  return hash.startsWith('00');
}

/**
 * Génère un identifiant unique aléatoire UUIDv4
 */
export function generateUUID() {
  return crypto.randomUUID();
}
