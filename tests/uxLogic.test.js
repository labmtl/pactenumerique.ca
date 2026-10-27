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

    // Nouveaux seuils stratégiques : 7, 13, 21
    const msg7 = getReadyInviteMessage(inviteUrl, 7, ['Instagram']);
    assert.strictEqual(
      msg7,
      'Salut ! Dès qu\'on est 7 à s\'inscrire, on quitte Instagram ensemble. Rejoins mon groupe ici : https://pactenumerique.ca/#cercle=123&k=abc'
    );

    const msg13 = getReadyInviteMessage(inviteUrl, 13, ['X / Twitter']);
    assert.strictEqual(
      msg13,
      'Salut ! Dès qu\'on est 13 à s\'inscrire, on quitte X ensemble. Rejoins mon groupe ici : https://pactenumerique.ca/#cercle=123&k=abc'
    );

    const msg21 = getReadyInviteMessage(inviteUrl, 21, ['Facebook']);
    assert.strictEqual(
      msg21,
      'Salut ! Dès qu\'on est 21 à s\'inscrire, on quitte Facebook ensemble. Rejoins mon groupe ici : https://pactenumerique.ca/#cercle=123&k=abc'
    );
  });

  it('génère le message préformaté de preuve sociale pour publication sur X / Facebook', async () => {
    const { getSocialShareMessage } = await import('../public/js/app.js');
    const inviteUrl = 'https://pactenumerique.ca/#cercle=123&k=abc';
    const msg = getSocialShareMessage(inviteUrl, 5, ['X / Twitter']);
    assert.strictEqual(
      msg,
      'J’ai signé le pacte pour basculer vers un réseau libre dès qu’on est 5 dans mon cercle. Rejoignez mon départ ici : https://pactenumerique.ca/#cercle=123&k=abc'
    );

    const msg13 = getSocialShareMessage(inviteUrl, 13, ['X / Twitter']);
    assert.strictEqual(
      msg13,
      'J’ai signé le pacte pour basculer vers un réseau libre dès qu’on est 13 dans mon cercle. Rejoignez mon départ ici : https://pactenumerique.ca/#cercle=123&k=abc'
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

    // Test seuil 13 et 21
    const html13 = renderCriticalMassGauge(7, 13, false);
    assert.ok(html13.includes('Déjà 7 personnes sur 13'));
    assert.ok(html13.includes('width: 54%;'));

    const html21 = renderCriticalMassGauge(21, 21, true);
    assert.ok(html21.includes('Masse critique atteinte'));
    assert.ok(html21.includes('width: 100%;'));
    // Doit contenir 21 avatars
    const avatarCount = (html21.match(/class="gauge-avatar\s/g) || []).length;
    assert.strictEqual(avatarCount, 21);
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

  it('place le formulaire d\'engagement dans sa propre section de menu (/engagement) et l\'hébergement WHC en pied de page', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const publicDir = path.resolve(import.meta.dirname, '../public');

    const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
    const howHtml = fs.readFileSync(path.join(publicDir, 'comment-ca-marche.html'), 'utf8');
    const engagementHtml = fs.readFileSync(path.join(publicDir, 'engagement.html'), 'utf8');
    const repertoireHtml = fs.readFileSync(path.join(publicDir, 'repertoire.html'), 'utf8');
    const statsHtml = fs.readFileSync(path.join(publicDir, 'statistiques.html'), 'utf8');

    // Le formulaire #pactForm ne doit être présent que sur engagement.html
    assert.ok(engagementHtml.includes('id="pactForm"'), 'engagement.html doit contenir #pactForm');
    assert.ok(!indexHtml.includes('id="pactForm"'), 'index.html (Notre vision) ne doit pas dupliquer #pactForm');
    assert.ok(!howHtml.includes('id="pactForm"'), 'comment-ca-marche.html ne doit pas dupliquer #pactForm');

    // Toutes les pages doivent avoir le lien de menu vers /engagement (nav.pledge) et le badge WHC en bas de page (footer)
    for (const [name, html] of [
      ['index.html', indexHtml],
      ['comment-ca-marche.html', howHtml],
      ['engagement.html', engagementHtml],
      ['repertoire.html', repertoireHtml],
      ['statistiques.html', statsHtml]
    ]) {
      assert.ok(html.includes('href="/engagement"') && html.includes('data-i18n="nav.pledge"'), `${name} doit inclure la section de menu /engagement`);
      assert.ok(!html.includes('id="counterHost"'), `${name} ne doit plus avoir la carte WHC dans les compteurs du haut`);
      assert.ok(html.includes('footer-sovereign-badge'), `${name} doit afficher le badge d'hébergement souverain WHC dans le pied de page`);
    }

    // Vérification de la simplification de l'interface d'engagement
    assert.ok(!engagementHtml.includes('id="successModal"'), 'engagement.html ne doit plus dupliquer le tableau de bord dans un modal surgissant redondant');
    assert.ok(!engagementHtml.includes('3 caractères de la RTA'), 'engagement.html ne doit plus imposer de jargon administratif (RTA)');
    assert.ok(!engagementHtml.includes('Je veux quitter '), 'les cartes de plateformes doivent être concises sans répéter "Je veux quitter"');
    assert.ok(engagementHtml.includes('pact-optional-details'), 'les options secondaires doivent être repliées dans un accordéon <details> par défaut');
  });
});
