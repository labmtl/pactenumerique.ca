/**
 * Cryptographie côté client - Web Crypto API
 * Garantit l'absence d'accès au graphe social par le serveur (Zero-Knowledge)
 */

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
  return btoa(binary)
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
  const binary = atob(base64);
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
  window.crypto.getRandomValues(bytes);
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

  const hashBuffer = await window.crypto.subtle.digest('SHA-256', combined);
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
    const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
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
