import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getUsageLabel,
  formatLongevity,
  getReadyInviteMessage,
  renderCriticalMassGauge,
  resolveLocationInput
} from '../public/js/app.js';

describe('Logique UX & Simplification Citoyenne (app.js)', () => {
  it('traduit les protocoles techniques en notions d\'usage intuitives', () => {
    assert.strictEqual(getUsageLabel({ category: 'microblogging' }), 'Alternative libre et sans pub');
    assert.strictEqual(getUsageLabel({ category: 'messaging' }), 'Messagerie privée chiffrée');
    assert.strictEqual(getUsageLabel({ category: 'photos' }), 'Partage photo sans algorithme toxique');
    assert.strictEqual(getUsageLabel({ category: 'forums' }), 'Espace d\'échange communautaire libre');
    assert.strictEqual(getUsageLabel({ category: 'video' }), 'Vidéos indépendantes et éthiques');
  });

  it('génère un message d\'invitation concret prêt pour SMS / WhatsApp', () => {
    const inviteUrl = 'https://pactenumerique.ca/#cercle=123&k=abc';
    const msgX = getReadyInviteMessage(inviteUrl, 5, ['X / Twitter']);
    assert.strictEqual(
      msgX,
      'Salut ! Dès qu\'on est 5 à s\'inscrire, on quitte X ensemble. Rejoins mon groupe ici : https://pactenumerique.ca/#cercle=123&k=abc'
    );

    const msgFb = getReadyInviteMessage(inviteUrl, 3, ['Facebook']);
    assert.strictEqual(
      msgFb,
      'Salut ! Dès qu\'on est 3 à s\'inscrire, on quitte Facebook ensemble. Rejoins mon groupe ici : https://pactenumerique.ca/#cercle=123&k=abc'
    );
  });

  it('génère la jauge de masse critique visuelle avec avatars', () => {
    const html1 = renderCriticalMassGauge(1, 5, false);
    assert.ok(html1.includes('critical-gauge-container'));
    assert.ok(html1.includes('Déjà 1 personne sur 5'));
    assert.ok(html1.includes('gauge-avatar joined is-me'));
    assert.ok(html1.includes('width: 20%;'));

    const html3 = renderCriticalMassGauge(3, 5, false);
    assert.ok(html3.includes('Déjà 3 personnes sur 5'));
    assert.ok(html3.includes('width: 60%;'));

    const htmlComplete = renderCriticalMassGauge(5, 5, true);
    assert.ok(htmlComplete.includes('Masse critique atteinte'));
    assert.ok(htmlComplete.includes('width: 100%;'));
  });

  it('résout automatiquement les villes ou codes postaux sans forcer la saisie de RTA', () => {
    // Ville connue
    const mtl = resolveLocationInput('Montréal');
    assert.strictEqual(mtl.fsa, 'H2T');
    assert.strictEqual(mtl.province, 'QC');
    assert.strictEqual(mtl.region, 'MTL');

    const qc = resolveLocationInput('Québec');
    assert.strictEqual(qc.fsa, 'G1K');
    assert.strictEqual(qc.province, 'QC');

    const gat = resolveLocationInput('Gatineau');
    assert.strictEqual(gat.fsa, 'J8X');

    // Code postal complet
    const cp = resolveLocationInput('H2T 2N5');
    assert.strictEqual(cp.fsa, 'H2T');

    // Valeur vide ou nulle (déduction automatique)
    const empty = resolveLocationInput('');
    assert.strictEqual(empty.fsa, 'H2T');
  });

  it('formate la date d\'établissement et calcule l\'ancienneté en français et anglais', () => {
    // Test FR
    const resFr = formatLongevity('2021-04', 'fr');
    assert.strictEqual(resFr.monthYear, 'avril 2021');
    assert.strictEqual(resFr.year, 2021);
    assert.strictEqual(resFr.month, 4);
    assert.ok(resFr.ageStr.includes('an'));
    assert.ok(resFr.fullDisplay.startsWith('avril 2021 ('));

    // Test EN
    const resEn = formatLongevity('2024-04', 'en');
    assert.strictEqual(resEn.monthYear, 'April 2024');
    assert.strictEqual(resEn.year, 2024);
    assert.strictEqual(resEn.month, 4);
    assert.ok(resEn.ageStr.includes('yr') || resEn.ageStr.includes('mo'));

    // Test format invalide
    assert.strictEqual(formatLongevity('invalid'), null);
    assert.strictEqual(formatLongevity(null), null);
    assert.strictEqual(formatLongevity('2024'), null);
  });
});
