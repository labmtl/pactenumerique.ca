import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const alternativesPath = path.join(rootDir, 'public/data/alternatives.json');
const longevityDir = path.join(rootDir, 'data/longevity');

describe('Audit et pérennité des domaines souverains (data/longevity/)', () => {
  const rawAlternatives = fs.readFileSync(alternativesPath, 'utf-8');
  const alternatives = JSON.parse(rawAlternatives);

  it('le répertoire data/longevity existe et contient un fichier pour chaque alternative', () => {
    assert.ok(fs.existsSync(longevityDir), 'Le répertoire data/longevity doit exister');
    const files = fs.readdirSync(longevityDir).filter(f => f.endsWith('.json'));
    assert.strictEqual(
      files.length,
      alternatives.length,
      `Chaque plateforme doit avoir son audit archivé (${alternatives.length} attendus, ${files.length} trouvés)`
    );
  });

  it('chaque alternative possède une date established valide (YYYY-MM)', () => {
    const ymRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    for (const alt of alternatives) {
      assert.ok(alt.established, `Champ 'established' manquant pour ${alt.id}`);
      assert.match(
        alt.established,
        ymRegex,
        `Format YYYY-MM invalide pour ${alt.id} : ${alt.established}`
      );
    }
  });

  it('chaque fichier d’audit archivé respecte le schéma complet et concorde avec alternatives.json', () => {
    const ymRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

    for (const alt of alternatives) {
      const auditFile = path.join(longevityDir, `${alt.id}.json`);
      assert.ok(fs.existsSync(auditFile), `Fichier d'audit manquant pour ${alt.id}`);

      const audit = JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
      assert.strictEqual(audit.id, alt.id);
      assert.strictEqual(audit.name, alt.name);
      assert.strictEqual(audit.url, alt.url);
      assert.ok(audit.apex_domain, `apex_domain manquant pour ${alt.id}`);
      assert.ok(audit.audited_at, `audited_at manquant pour ${alt.id}`);
      assert.strictEqual(
        audit.established,
        alt.established,
        `Incohérence established entre audit (${audit.established}) et alternatives.json (${alt.established}) pour ${alt.id}`
      );

      // Structure des sources
      assert.ok(audit.sources, `sources manquantes pour ${alt.id}`);
      assert.ok(audit.sources.rdap_whois, `sources.rdap_whois manquantes pour ${alt.id}`);
      assert.ok(audit.sources.wayback_machine, `sources.wayback_machine manquantes pour ${alt.id}`);

      if (audit.domain_registration) {
        assert.match(audit.domain_registration, ymRegex, `domain_registration invalide pour ${alt.id}`);
      }
      if (audit.first_web_archive) {
        assert.match(audit.first_web_archive, ymRegex, `first_web_archive invalide pour ${alt.id}`);
      }
    }
  });
});
