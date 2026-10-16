import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, '../public/data/alternatives.json');

describe('Catalogue des alternatives souveraines (alternatives.json)', () => {
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  let data;

  it('charge un fichier JSON valide', () => {
    data = JSON.parse(raw);
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 15, 'Doit contenir au moins 15 plateformes');
  });

  it('chaque entrée possède les champs obligatoires et un protocole HTTPS', () => {
    for (const item of data) {
      assert.ok(item.id, `ID manquant pour ${JSON.stringify(item)}`);
      assert.ok(item.name, `Nom manquant pour ${item.id}`);
      assert.ok(item.url.startsWith('https://'), `URL non-HTTPS pour ${item.id}: ${item.url}`);
      assert.ok(Array.isArray(item.replaces) && item.replaces.length > 0, `Réseaux remplacés manquants pour ${item.id}`);
      assert.ok(item.category, `Catégorie manquante pour ${item.id}`);
      assert.ok(item.protocol, `Protocole manquant pour ${item.id}`);
      assert.ok(typeof item.hosted_in_qc === 'boolean', `hosted_in_qc doit être un booléen pour ${item.id}`);
      assert.ok(typeof item.support_fr === 'boolean', `support_fr doit être un booléen pour ${item.id}`);
      assert.ok(typeof item.support_en === 'boolean', `support_en doit être un booléen pour ${item.id}`);
      assert.ok(item.desc_fr, `desc_fr manquant pour ${item.id}`);
      assert.ok(item.desc_en, `desc_en manquant pour ${item.id}`);
    }
  });

  it('toutes les solutions québécoises offrent un support en français', () => {
    const qcItems = data.filter(item => item.region === 'QC' || item.hosted_in_qc);
    assert.ok(qcItems.length >= 8, 'Doit avoir au moins 8 solutions associées au Québec');

    for (const item of qcItems) {
      assert.strictEqual(
        item.support_fr,
        true,
        `La solution québécoise ${item.name} (${item.id}) doit impérativement supporter le français`
      );
    }
  });

  it('propose au moins une alternative hébergée au Québec pour chaque grand besoin', () => {
    const mainCategories = ['microblogging', 'photos', 'forums', 'video', 'messaging', 'professional', 'events'];
    for (const cat of mainCategories) {
      const hasQcOption = data.some(item => item.category === cat && (item.hosted_in_qc || item.region === 'QC'));
      assert.ok(hasQcOption, `La catégorie '${cat}' doit disposer d'au moins une alternative hébergée au Québec`);
    }
  });

  it('priorise les solutions québécoises et francophones lors du tri pour le Québec', () => {
    const simulatedSelected = ['X / Twitter', 'Instagram'];
    const matching = data.filter(alt =>
      alt.replaces.some(rep => simulatedSelected.some(s => rep.includes(s) || s.includes(rep)))
    );

    matching.sort((a, b) => {
      const aIsQc = (a.region === 'QC' || a.hosted_in_qc) ? 1 : 0;
      const bIsQc = (b.region === 'QC' || b.hosted_in_qc) ? 1 : 0;
      if (bIsQc !== aIsQc) return bIsQc - aIsQc;
      const aFr = a.support_fr ? 1 : 0;
      const bFr = b.support_fr ? 1 : 0;
      return bFr - aFr;
    });

    assert.ok(matching[0].hosted_in_qc || matching[0].region === 'QC');
    assert.strictEqual(matching[0].support_fr, true);
  });
});
