/**
 * Cryptographie côté client - Web Crypto API
 * Garantit l'absence d'accès au graphe social par le serveur (Zero-Knowledge)
 * Supporte le chiffrement de bout en bout AES-GCM pour le relais boîte morte
 */

function getCrypto() {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error('Web Crypto API non disponible dans cet environnement');
}

/**
 * Encode un Uint8Array en chaîne hexadécimale
 */
export function bufToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encode un Uint8Array en Base64URL (compatible avec les fragments d'URL)
 */
export function bufToBase64Url(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const btoaFn = typeof btoa === 'function' ? btoa : (s) => Buffer.from(s, 'binary').toString('base64');
  return btoaFn(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Décode une chaîne Base64URL en Uint8Array
 */
export function base64UrlToBuf(base64Url) {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const atobFn = typeof atob === 'function' ? atob : (s) => Buffer.from(s, 'base64').toString('binary');
  const binary = atobFn(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Génère une clé cryptographique symétrique aléatoire de 32 octets (256 bits)
 */
export function generateRandomKeyBytes() {
  const bytes = new Uint8Array(32);
  getCrypto().getRandomValues(bytes);
  return bytes;
}

/**
 * Dérive l'identifiant public aveugle (Blind ID) à partir de la clé de cercle
 * Blind ID = SHA-256(cle_cercle || "pacte_blind_circle_v1")
 */
export async function deriveBlindId(keyBytes) {
  const tag = new TextEncoder().encode(':pacte_blind_circle_v1');
  const combined = new Uint8Array(keyBytes.length + tag.length);
  combined.set(keyBytes, 0);
  combined.set(tag, keyBytes.length);

  const hashBuffer = await getCrypto().subtle.digest('SHA-256', combined);
  return bufToHex(hashBuffer);
}

/**
 * Résout une Preuve de Travail (Proof-of-Work) légère
 * Calcule un nonce tel que SHA-256(payload + ':' + nonce) commence par '00'
 */
export async function solveProofOfWork(payload, leadingZeros = '00') {
  let nonce = 0;
  const encoder = new TextEncoder();
  while (true) {
    const data = encoder.encode(`${payload}:${nonce}`);
    const hashBuf = await getCrypto().subtle.digest('SHA-256', data);
    const hashHex = bufToHex(hashBuf);
    if (hashHex.startsWith(leadingZeros)) {
      return nonce;
    }
    nonce++;
    // Sécurité pour ne pas bloquer l'interface
    if (nonce % 500 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }
}

/**
 * Chiffre une chaîne ou objet JSON avec AES-GCM (256-bit) via la clé du cercle
 * Retourne { iv: string, ciphertext: string } encodé en Base64URL
 */
export async function encryptMessage(plaintext, keyBytes) {
  const cryptoObj = getCrypto();
  const rawKey = keyBytes instanceof Uint8Array ? keyBytes : new Uint8Array(keyBytes);

  const key = await cryptoObj.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = new Uint8Array(12);
  cryptoObj.getRandomValues(iv);

  const encoded = new TextEncoder().encode(plaintext);
  const ciphertextBuf = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    iv: bufToBase64Url(iv),
    ciphertext: bufToBase64Url(ciphertextBuf)
  };
}

/**
 * Déchiffre un message AES-GCM via { iv, ciphertext } et la clé du cercle
 */
export async function decryptMessage(encryptedObj, keyBytes) {
  if (!encryptedObj || !encryptedObj.iv || !encryptedObj.ciphertext) {
    throw new Error('Objet chiffré invalide');
  }

  const cryptoObj = getCrypto();
  const rawKey = keyBytes instanceof Uint8Array ? keyBytes : new Uint8Array(keyBytes);

  const key = await cryptoObj.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const iv = base64UrlToBuf(encryptedObj.iv);
  const ciphertext = base64UrlToBuf(encryptedObj.ciphertext);

  const decryptedBuf = await cryptoObj.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuf);
}
