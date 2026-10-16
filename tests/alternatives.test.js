import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, '../public/data/alternatives.json');
const frLocalePath = path.join(__dirname, '../public/locales/fr.json');
const enLocalePath = path.join(__dirname, '../public/locales/en.json');

// Fonction miroir de la hiérarchie territoriale
function getLocationHierarchy(loc = {}) {
  const city = loc?.city || null;
  const isMtl = city === 'Montreal' || city === 'Montréal';
  const province = isMtl ? 'QC' : (loc?.province || null);
  const isQc = isMtl || province === 'QC';
  const country = (isQc || province || loc?.country === 'CA') ? 'CA' : (loc?.country || 'CA');
  const isCa = country === 'CA' || isQc || isMtl;

  return { city, province, country, isMtl, isQc, isCa };
}

describe('Catalogue des alternatives souveraines (alternatives.json)', () => {
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const frLocale = JSON.parse(fs.readFileSync(frLocalePath, 'utf-8'));
  const enLocale = JSON.parse(fs.readFileSync(enLocalePath, 'utf-8'));
  let data;

  it('charge un fichier JSON valide avec schéma normalisé', () => {
    data = JSON.parse(raw);
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 15, 'Doit contenir au moins 15 plateformes');
  });

  it('chaque entrée possède les champs canoniques obligatoires, stack et code source', () => {
    for (const item of data) {
      assert.ok(item.id, `ID manquant pour ${JSON.stringify(item)}`);
      assert.ok(item.name, `Nom manquant pour ${item.id}`);
      assert.ok(item.url.startsWith('https://'), `URL non-HTTPS pour ${item.id}: ${item.url}`);
      assert.ok(Array.isArray(item.replaces) && item.replaces.length > 0, `Réseaux remplacés manquants pour ${item.id}`);
      assert.ok(item.category, `Catégorie manquante pour ${item.id}`);
      assert.ok(item.protocol, `Protocole manquant pour ${item.id}`);
      assert.ok(typeof item.support_fr === 'boolean', `support_fr doit être un booléen pour ${item.id}`);
      assert.ok(typeof item.support_en === 'boolean', `support_en doit être un booléen pour ${item.id}`);

      // Hiérarchie territoriale
      assert.ok(item.location && typeof item.location === 'object', `location doit être un objet pour ${item.id}`);
      assert.strictEqual(item.location.country, 'CA', `Le pays doit être 'CA' pour ${item.id}`);

      // Pile logicielle (Stack)
      assert.ok(item.stack && typeof item.stack === 'object', `stack doit être un objet pour ${item.id}`);
      assert.ok(item.stack.name, `Nom de stack manquant pour ${item.id}`);
      assert.strictEqual(typeof item.stack.is_opensource, 'boolean', `is_opensource doit être un booléen pour ${item.id}`);
      if (item.stack.is_opensource) {
        assert.ok(item.stack.repo_url && item.stack.repo_url.startsWith('https://'), `URL de dépôt de stack manquante ou non HTTPS pour ${item.id}`);
      }

      // Code source du projet
      assert.ok(item.project_source && typeof item.project_source === 'object', `project_source doit être un objet pour ${item.id}`);
      assert.strictEqual(typeof item.project_source.is_available, 'boolean', `is_available doit être un booléen pour ${item.id}`);
      if (item.project_source.is_available) {
        assert.ok(item.project_source.repo_url && item.project_source.repo_url.startsWith('https://'), `URL du projet manquante pour ${item.id}`);
      }
    }
  });

  it('élimine les redondances dans alternatives.json (textes traduits déplacés dans locales/*.json)', () => {
    for (const item of data) {
      assert.strictEqual(item.categoryName_fr, undefined, `categoryName_fr ne doit plus être dans alternatives.json pour ${item.id}`);
      assert.strictEqual(item.categoryName_en, undefined, `categoryName_en ne doit plus être dans alternatives.json pour ${item.id}`);
      assert.strictEqual(item.regionName_fr, undefined, `regionName_fr ne doit plus être dans alternatives.json pour ${item.id}`);
      assert.strictEqual(item.regionName_en, undefined, `regionName_en ne doit plus être dans alternatives.json pour ${item.id}`);
      assert.strictEqual(item.hosted_in_qc, undefined, `hosted_in_qc ne doit plus être en dur dans alternatives.json pour ${item.id}`);
      assert.strictEqual(item.hosted_in_mtl, undefined, `hosted_in_mtl ne doit plus être en dur dans alternatives.json pour ${item.id}`);
      assert.strictEqual(item.desc_fr, undefined, `desc_fr doit être dans fr.json et non dans alternatives.json pour ${item.id}`);
      assert.strictEqual(item.desc_en, undefined, `desc_en doit être dans en.json et non dans alternatives.json pour ${item.id}`);
    }
  });

  it('valide la hiérarchie territoriale : si hébergé à Montréal, est nécessairement au Québec et au Canada', () => {
    const mtlItems = data.filter(item => item.location?.city === 'Montreal' || item.location?.city === 'Montréal');
    assert.ok(mtlItems.length >= 5, `Doit contenir au moins 5 solutions montréalaises (trouvé: ${mtlItems.length})`);

    for (const item of mtlItems) {
      const hier = getLocationHierarchy(item.location);
      assert.strictEqual(hier.isMtl, true, `${item.id} doit être reconnu à Montréal`);
      assert.strictEqual(hier.isQc, true, `Si c'est à Montréal (${item.id}), c'est nécessairement au Québec`);
      assert.strictEqual(hier.isCa, true, `Si c'est à Montréal (${item.id}), c'est nécessairement au Canada`);
      assert.strictEqual(item.support_fr, true, `La solution montréalaise ${item.id} doit offrir le support français`);
    }
  });

  it('toutes les solutions québécoises offrent un support en français', () => {
    const qcItems = data.filter(item => getLocationHierarchy(item.location).isQc);
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
      const hasQcOption = data.some(item => item.category === cat && getLocationHierarchy(item.location).isQc);
      assert.ok(hasQcOption, `La catégorie '${cat}' doit disposer d'au moins une alternative québécoise`);
    }
  });

  it('toutes les plateformes reposent sur une pile logicielle libre (Open Source)', () => {
    for (const item of data) {
      assert.strictEqual(
        item.stack.is_opensource,
        true,
        `La pile logicielle de ${item.name} (${item.stack.name}) doit être libre et auditable`
      );
    }
  });

  it('les fichiers de traduction (fr.json et en.json) contiennent toutes les descriptions et catégories', () => {
    for (const item of data) {
      assert.ok(frLocale.alternatives?.[item.id]?.desc, `Description FR manquante dans fr.json pour ${item.id}`);
      assert.ok(enLocale.alternatives?.[item.id]?.desc, `Description EN manquante dans en.json pour ${item.id}`);
      assert.ok(frLocale.categories?.[item.category], `Catégorie FR manquante pour ${item.category}`);
      assert.ok(enLocale.categories?.[item.category], `Catégorie EN manquante pour ${item.category}`);
    }
  });

  it('priorise les solutions montréalaises lorsque l\'utilisateur réside à Montréal (userRegion === MTL)', () => {
    const simulatedSelected = ['X / Twitter', 'Discord'];
    const matching = data.filter(alt =>
      alt.replaces.some(rep => simulatedSelected.some(s => rep.includes(s) || s.includes(rep)))
    );

    matching.sort((a, b) => {
      const aHier = getLocationHierarchy(a.location);
      const bHier = getLocationHierarchy(b.location);

      const aMtl = aHier.isMtl ? 1 : 0;
      const bMtl = bHier.isMtl ? 1 : 0;
      if (bMtl !== aMtl) return bMtl - aMtl;

      const aQc = aHier.isQc ? 1 : 0;
      const bQc = bHier.isQc ? 1 : 0;
      if (bQc !== aQc) return bQc - aQc;

      const aFr = a.support_fr ? 1 : 0;
      const bFr = b.support_fr ? 1 : 0;
      return bFr - aFr;
    });

    const topHier = getLocationHierarchy(matching[0].location);
    assert.strictEqual(
      topHier.isMtl,
      true,
      `La première recommandation pour un résident montréalais doit être hébergée à Montréal (trouvé: ${matching[0].name})`
    );
  });
});
