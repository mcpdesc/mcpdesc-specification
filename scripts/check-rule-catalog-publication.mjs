import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { formatCanonicalJson } from './canonical-json.mjs';
import {
  catalogIdentity, catalogIndexUrl, emptyCatalogIndex, extendCatalogIndex,
  readCatalogBundle, ruleSchemaUrl, verifyCatalogIndexPublication, verifyCatalogPublication
} from './validation-catalog.mjs';

const [snapshot, directory, ...flags] = process.argv.slice(2);
try {
  const indexOutputAt = flags.indexOf('--index-out');
  const indexOutput = indexOutputAt < 0 ? undefined : flags[indexOutputAt + 1];
  const allowed = indexOutputAt < 0 ? [] : ['--index-out', indexOutput];
  assert.ok(snapshot && directory && (flags.length === 0 || ['--check-index', '--schema-only'].includes(flags[0]) && flags.length === 1
    || flags.length === 2 && indexOutput && JSON.stringify(flags) === JSON.stringify(allowed)),
  'Usage: node scripts/check-rule-catalog-publication.mjs <snapshot> <bundle> [--schema-only | --check-index | --index-out <new-file>]');
  const bundle = readCatalogBundle(directory, snapshot);
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  if (!flags.includes('--schema-only')) {
    assert.equal(git('cat-file', '-t', bundle.manifest.source.tag), 'tag', 'Publication requires an annotated tag');
    assert.equal(git('rev-parse', `${bundle.manifest.source.tag}^{}`), bundle.manifest.source.commit, 'Published tag must identify the bundle source commit');
  }
  const fetchImpl = (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  await verifyCatalogPublication(bundle, fetchImpl, { schemaOnly: flags.includes('--schema-only') });
  const schemaBytes = bundle.files.get(new URL(bundle.manifest.ruleSchema.url).pathname.slice(1));
  if (flags.includes('--check-index') || indexOutput) {
    assert.equal(bundle.manifest.ruleSchema.url, ruleSchemaUrl, 'Index checks and updates require a catalog in the current rule format');
  }
  if (flags.includes('--check-index')) {
    const index = await verifyCatalogIndexPublication(schemaBytes, fetchImpl);
    assert.ok(index.catalogs.some((entry) => entry.manifest === catalogIdentity(snapshot).manifestUrl), 'Published index must list this catalog');
  }
  if (indexOutput) {
    assert.ok(!fs.existsSync(indexOutput), 'Index output must be a new file');
    const response = await fetchImpl(catalogIndexUrl, { redirect: 'manual' });
    // The live index may still declare an earlier rule format; the update re-declares it in the current one.
    const previous = response.status === 404 ? emptyCatalogIndex() : await verifyCatalogIndexPublication(schemaBytes, fetchImpl, { allowEarlierFormat: true });
    const next = extendCatalogIndex(previous, bundle, true);
    fs.mkdirSync(path.dirname(path.resolve(indexOutput)), { recursive: true });
    fs.writeFileSync(indexOutput, formatCanonicalJson(next));
    console.log(`Verified index update prepared at ${indexOutput}; publish it last.`);
  }
  console.log(flags.includes('--schema-only')
    ? `Verified ${bundle.manifest.resultSchema ? 'rule-format and validation result schemas' : 'rule-format schema'} only; catalog publication is not checked.`
    : `Verified catalog publication: ${snapshot}, ${bundle.manifest.ruleCount} rules.`);
} catch (error) {
  console.error(`check-rule-catalog-publication: ${error.message}`);
  process.exitCode = 1;
}