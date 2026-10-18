import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashEmail, isValidBlindId, verifyProofOfWork, generateUUID, generateSalt } from '../src/services/cryptoService.js';
import crypto from 'node:crypto';

describe('Service Cryptographique & Zero-Knowledge', () => {
  it('hache les courriels de manière déterministe avec le sel', () => {
    const email1 = 'citoyen@exemple.ca';
    const email2 = 'CITOYEN@EXEMPLE.CA '; // Normalisation de la casse et des espaces
    const salt = 'test_salt_1234567890';

    const hash1 = hashEmail(email1, salt);
    const hash2 = hashEmail(email2, salt);

    assert.ok(hash1);
    assert.strictEqual(hash1.length, 64); // 64 caractères hexadécimaux (SHA-256)
    assert.strictEqual(hash1, hash2); // Insensible à la casse

    // Un sel différent doit produire un hash différent
    const hashOtherSalt = hashEmail(email1, 'different_salt');
    assert.notStrictEqual(hash1, hashOtherSalt);
  });

  it('gère correctement les valeurs nulles ou vides pour le courriel', () => {
    assert.strictEqual(hashEmail(null), null);
    assert.strictEqual(hashEmail(''), null);
    assert.strictEqual(hashEmail(undefined), null);
  });

  it('valide le format des identifiants aveugles (Blind IDs de 64 hex)', () => {
    const validBlindId = 'a1b2c3d4e5f60718293a4b5c6d7e8f00112233445566778899aabbccddeeff00';
    assert.strictEqual(isValidBlindId(validBlindId), true);

    // Trop court
    assert.strictEqual(isValidBlindId('a1b2c3d4'), false);
    // Trop long
    assert.strictEqual(isValidBlindId(validBlindId + 'ff'), false);
    // Caractères non hexadécimaux
    assert.strictEqual(isValidBlindId('g1b2c3d4e5f60718293a4b5c6d7e8f00112233445566778899aabbccddeeff00'), false);
    // Vide
    assert.strictEqual(isValidBlindId(''), false);
    assert.strictEqual(isValidBlindId(null), false);
  });

  it('vérifie la preuve de travail (Proof-of-Work anti-spam)', () => {
    const payload = 'H2T';

    // Trouver un nonce valide pour le test (hash commençant par '00')
    let validNonce = 0;
    while (true) {
      const hash = crypto.createHash('sha256').update(`${payload}:${validNonce}`).digest('hex');
      if (hash.startsWith('00')) break;
      validNonce++;
    }

    assert.strictEqual(verifyProofOfWork(payload, validNonce), true);
    // Un mauvais nonce doit être rejeté
    assert.strictEqual(verifyProofOfWork(payload, 999999999), false);
    assert.strictEqual(verifyProofOfWork(payload, null), false);
  });

  it('génère des UUIDv4 valides', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();

    assert.ok(uuid1);
    assert.strictEqual(typeof uuid1, 'string');
    assert.match(uuid1, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.notStrictEqual(uuid1, uuid2);
  });

  it('génère un sel cryptographique sécurisé', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    assert.ok(salt1);
    assert.strictEqual(typeof salt1, 'string');
    assert.strictEqual(salt1.length, 64); // 32 octets = 64 caractères hex
    assert.match(salt1, /^[0-9a-f]{64}$/i);
    assert.notStrictEqual(salt1, salt2);

    // Test avec taille personnalisée
    const customSalt = generateSalt(16);
    assert.strictEqual(customSalt.length, 32); // 16 octets = 32 caractères hex
  });

  it('chiffre et déchiffre de bout en bout avec AES-GCM (public/js/crypto.js)', async () => {
    const { generateRandomKeyBytes, deriveBlindId, encryptMessage, decryptMessage, solveProofOfWork } = await import('../public/js/crypto.js');

    const keyBytes = generateRandomKeyBytes();
    assert.strictEqual(keyBytes.length, 32);

    const blindId = await deriveBlindId(keyBytes);
    assert.strictEqual(blindId.length, 64);
    assert.match(blindId, /^[0-9a-f]{64}$/);

    const originalText = JSON.stringify({
      author: 'Membre 1',
      text: 'Tout le monde a créé son profil ? On ferme samedi ?',
      timestamp: Date.now()
    });

    const encrypted = await encryptMessage(originalText, keyBytes);
    assert.ok(encrypted.iv);
    assert.ok(encrypted.ciphertext);
    assert.notStrictEqual(encrypted.ciphertext, originalText);

    const decrypted = await decryptMessage(encrypted, keyBytes);
    assert.strictEqual(decrypted, originalText);

    const parsed = JSON.parse(decrypted);
    assert.strictEqual(parsed.author, 'Membre 1');

    // Test de résolution de la preuve de travail côté client
    const nonce = await solveProofOfWork(blindId, '00');
    assert.strictEqual(typeof nonce, 'number');
    assert.strictEqual(verifyProofOfWork(blindId, nonce), true);
  });
});

