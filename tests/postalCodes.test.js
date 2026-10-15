import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validatePostalCode, extractFSA, getProvinceFromFSA } from '../src/utils/postalCodes.js';

describe('Utilitaires Codes Postaux Canadiens & RTA (FSA)', () => {
  it('valide correctement les codes postaux canadiens valides', () => {
    assert.strictEqual(validatePostalCode('H2T 2N5'), true);
    assert.strictEqual(validatePostalCode('h2t 2n5'), true);
    assert.strictEqual(validatePostalCode('H2T2N5'), true);
    assert.strictEqual(validatePostalCode('K1A 0B1'), true);
    assert.strictEqual(validatePostalCode('G1K 7P4'), true);
    assert.strictEqual(validatePostalCode('V6B 2W9'), true);
    assert.strictEqual(validatePostalCode('H2T'), true); // Format RTA direct
  });

  it('rejette les codes postaux invalides ou étrangers', () => {
    assert.strictEqual(validatePostalCode(''), false);
    assert.strictEqual(validatePostalCode(null), false);
    assert.strictEqual(validatePostalCode('90210'), false); // Code postal US
    assert.strictEqual(validatePostalCode('75001'), false); // Code postal France
    assert.strictEqual(validatePostalCode('W1A 1AA'), false); // Code UK
    assert.strictEqual(validatePostalCode('D1A 1A1'), false); // D est interdit dans les codes canadiens
    assert.strictEqual(validatePostalCode('F1A 1A1'), false); // F est interdit
    assert.strictEqual(validatePostalCode('123 456'), false);
  });

  it('extrait correctement la RTA (FSA - 3 premiers caractères)', () => {
    assert.strictEqual(extractFSA('H2T 2N5'), 'H2T');
    assert.strictEqual(extractFSA('h2t2n5'), 'H2T');
    assert.strictEqual(extractFSA(' G1K 7P4 '), 'G1K');
    assert.strictEqual(extractFSA('k1a0b1'), 'K1A');
    assert.strictEqual(extractFSA('V6B'), 'V6B');
    assert.strictEqual(extractFSA('invalid'), null);
  });

  it('associe la bonne province à partir de la première lettre de la RTA', () => {
    assert.strictEqual(getProvinceFromFSA('H2T').code, 'QC');
    assert.strictEqual(getProvinceFromFSA('G1K').code, 'QC');
    assert.strictEqual(getProvinceFromFSA('J4B').code, 'QC');
    assert.strictEqual(getProvinceFromFSA('K1A').code, 'ON');
    assert.strictEqual(getProvinceFromFSA('M5V').code, 'ON');
    assert.strictEqual(getProvinceFromFSA('V6B').code, 'BC');
    assert.strictEqual(getProvinceFromFSA('T2P').code, 'AB');
    assert.strictEqual(getProvinceFromFSA('R3C').code, 'MB');
    assert.strictEqual(getProvinceFromFSA('E1C').code, 'NB');
    assert.strictEqual(getProvinceFromFSA('B3H').code, 'NS');
  });
});
