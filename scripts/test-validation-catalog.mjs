import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse, stringify } from 'yaml';
import { formatCanonicalJson } from './canonical-json.mjs';
import { candidateSpecification } from './candidate-specification.mjs';
import { validateDocument } from './validate-document.mjs';
import {
  buildValidationCatalog, catalogIdentity, catalogIndexUrl, checkRuleApplicability, emptyCatalogIndex,
  extendCatalogIndex, readCatalogBundle, resolveCatalogFile, ruleSchemaUrl,
  validateCatalogBundle, validateCatalogIndex, verifyCatalogIndexPublication,
  verifyCatalogPublication
} from './validation-catalog.mjs';

const root = process.cwd();
const candidate = candidateSpecification(root);
const schemaFile = path.join(root, candidate.specificationRoot, 'validation', 'rule.schema.json');
if (!fs.existsSync(schemaFile) || !JSON.parse(fs.readFileSync(schemaFile)).$id) {
  console.log('Validation catalog: no published rule format in the candidate.');
  process.exit(0);
}
const snapshot = candidate.isDraft ? candidate.status.draft.snapshotTag.slice(1) : candidate.version;
const commit = 'a'.repeat(40);
const bundle = buildValidationCatalog(root, snapshot, commit);
const second = buildValidationCatalog(root, snapshot, commit);
assert.deepEqual(bundle.files, second.files, 'Catalog generation is deterministic');
assert.equal(bundle.catalog.rules.length, bundle.manifest.ruleCount);
assert.equal(bundle.files.size, 3);
const schemaBytes = fs.readFileSync(schemaFile);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(bundle.schema);
const firstRule = bundle.catalog.rules[0];
const versions = candidate.status.draft?.protocolVersions
  ?? JSON.parse(fs.readFileSync(path.join(root, candidate.schemaPath))).$defs.supportedProtocolVersion.enum;
const independent = bundle.catalog.rules.filter((rule) => rule.applicability.protocolVersions === 'independent');
assert.ok(independent.length > 0 && independent.length < bundle.catalog.rules.length);
assert.ok(independent.some((rule) => rule.owner === 'mcp'));
assert.ok(bundle.catalog.rules.some((rule) => rule.owner === 'mcpdesc' && rule.applicability.protocolVersions !== 'independent'));
const dialectRule = bundle.catalog.rules.find((rule) => rule.id === 'json-schema.tool-schema.valid');
assert.ok(dialectRule.applicability.schemaDialects.includes('https://json-schema.org/draft/2020-12/schema'));
assert.ok(dialectRule.applicability.schemaDialects.includes('http://json-schema.org/draft-07/schema#'));
assert.notEqual(dialectRule.applicability.protocolVersions, 'independent');
const unsupportedDialect = JSON.parse(fs.readFileSync(path.join(root, candidate.specificationRoot, 'fixtures', 'expected-invalid', 'unsupported-tool-schema-dialect.json')));
assert.ok(validateDocument(unsupportedDialect).some((diagnostic) => diagnostic.rule === dialectRule.id
  && diagnostic.code === 'unsupported-tool-schema-dialect' && diagnostic.severity === 'error'), 'Dialect metadata must not suppress unsupported-dialect errors');
const retired = { ...firstRule, status: 'retired', description: 'This requirement is retired in this catalog; consult the prior snapshot for its former behavior.' };
delete retired.applicability;
assert.ok(validate({ rules: [retired] }), ajv.errorsText(validate.errors));
checkRuleApplicability(retired, versions);
for (const applicability of [
  {},
  { protocolVersions: 'unspecified' },
  { protocolVersions: 'independent', schemaDialects: [] },
  { protocolVersions: 'independent', schemaDialects: ['not a URI'] },
  { protocolVersions: 'independent', unknown: true }
]) assert.equal(validate({ rules: [{ ...firstRule, applicability }] }), false);
const incomplete = { ...firstRule, applicability: { protocolVersions: { [versions[0]]: 'applies' } } };
assert.throws(() => checkRuleApplicability(incomplete, versions), /Incomplete applicability/);
for (const missing of ['title', 'description', 'applicability']) {
  const rule = structuredClone(firstRule);
  delete rule[missing];
  assert.equal(validate({ rules: [rule] }), false, `Missing ${missing} must fail`);
}
for (const [field, value] of [['title', 'x'.repeat(61)], ['title', 'Trailing period.'], ['description', 'x'.repeat(801)]]) {
  assert.equal(validate({ rules: [{ ...firstRule, [field]: value }] }), false, `Invalid ${field} must fail`);
}
assert.equal(validate({ rules: [{ ...firstRule, description: '   ' }] }), false, 'Blank explanations must fail');

const manifestPath = new URL(catalogIdentity(snapshot).manifestUrl).pathname.slice(1);
const rulesPath = new URL(bundle.manifest.catalog.url).pathname.slice(1);
function changedManifest(change) {
  const manifest = structuredClone(bundle.manifest);
  change(manifest);
  const files = new Map(bundle.files);
  files.set(manifestPath, Buffer.from(formatCanonicalJson(manifest)));
  return files;
}
for (const change of [
  (manifest) => { manifest.catalog.sha256 = '0'.repeat(64); },
  (manifest) => { manifest.ruleCount++; },
  (manifest) => { manifest.source.tag = 'v9.9.9'; },
  (manifest) => { manifest.specificationBaseUrl = 'https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/'; },
  (manifest) => { manifest.status = 'stable'; },
  (manifest) => { manifest.ruleSchema.url = 'https://untrusted.invalid/schema.json'; },
  (manifest) => { manifest.catalog.url = 'https://untrusted.invalid/rules.json'; }
]) assert.throws(() => validateCatalogBundle(changedManifest(change), snapshot));
const corrupt = new Map(bundle.files);
corrupt.set(rulesPath, Buffer.from('{}'));
assert.throws(() => validateCatalogBundle(corrupt, snapshot));
const duplicateTitle = new Map(bundle.files);
const duplicateCatalog = structuredClone(bundle.catalog);
duplicateCatalog.rules[1].title = duplicateCatalog.rules[0].title;
duplicateTitle.set(rulesPath, Buffer.from(formatCanonicalJson(duplicateCatalog)));
assert.throws(() => validateCatalogBundle(duplicateTitle, snapshot), /Duplicate title/);

const empty = emptyCatalogIndex();
const index = extendCatalogIndex(empty, bundle, true);
assert.equal(empty.catalogs.length, 0, 'Index update does not mutate its input');
assert.equal(index.currentStable, null, 'No stable catalog is invented');
assert.equal(index.currentDraft, catalogIdentity(snapshot).manifestUrl);
assert.deepEqual(extendCatalogIndex(index, bundle, true), index, 'Index update is idempotent');
assert.throws(() => validateCatalogIndex({ ...index, currentStable: index.currentDraft }, bundle.schema));
assert.throws(() => validateCatalogIndex({ ...index, currentDraft: 'https://mcpdesc.org/missing.json' }, bundle.schema));
assert.throws(() => validateCatalogIndex({ ...index, catalogs: [...index.catalogs, index.catalogs[0]] }, bundle.schema));
assert.throws(() => validateCatalogIndex({ ...index, catalogs: [{ ...index.catalogs[0], status: 'stable' }] }, bundle.schema));

const responses = new Map([...bundle.files].map(([relative, bytes]) => [`https://mcpdesc.org/${relative}`, bytes]));
responses.set(catalogIndexUrl, Buffer.from(formatCanonicalJson(index)));
const makeFetch = (overrides = {}) => async (url, options) => {
  assert.equal(options.redirect, 'manual');
  const bytes = responses.get(url);
  assert.ok(bytes, `Unexpected request: ${url}`);
  return new Response(overrides.body ?? bytes, {
    status: overrides.status ?? 200,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': url === catalogIndexUrl ? 'public, max-age=60' : 'public, max-age=31536000, immutable',
      etag: '"fixture"',
      ...overrides.headers
    }
  });
};
await verifyCatalogPublication(bundle, makeFetch());
const schemaRequests = [];
await verifyCatalogPublication(bundle, async (url, options) => {
  schemaRequests.push(url);
  return makeFetch()(url, options);
}, { schemaOnly: true });
assert.deepEqual(schemaRequests, [ruleSchemaUrl], 'Pre-tag schema check fetches no catalog or index');
assert.deepEqual(await verifyCatalogIndexPublication(schemaBytes, makeFetch()), index);
for (const options of [
  { body: '<html>fallback</html>' },
  { status: 302 },
  { headers: { 'content-type': 'text/html' } },
  { headers: { 'access-control-allow-origin': 'https://not-allowed.invalid' } },
  { headers: { 'cache-control': 'public, max-age=60' } },
  { headers: { etag: 'W/"weak"' } },
  { headers: { etag: '' } }
]) await assert.rejects(() => verifyCatalogPublication(bundle, makeFetch(options)));
await assert.rejects(() => verifyCatalogIndexPublication(schemaBytes, makeFetch({ headers: { 'cache-control': 'public, max-age=31536000, immutable' } })));
await assert.rejects(() => verifyCatalogIndexPublication(schemaBytes, makeFetch({ headers: { 'cache-control': 'public, max-age=600' } })));

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'mcpdesc-catalog-test-'));
try {
  const repository = path.join(temporary, 'repository');
  fs.mkdirSync(repository);
  for (const relative of [candidate.specificationRoot, candidate.schemaPath, 'specification-status.json', 'proposals']) {
    fs.mkdirSync(path.dirname(path.join(repository, relative)), { recursive: true });
    fs.cpSync(path.join(root, relative), path.join(repository, relative), { recursive: true });
  }
  for (const script of ['validation-catalog.mjs', 'export-rule-catalog.mjs', 'schema-publication.mjs', 'canonical-json.mjs', 'decode-document.mjs']) {
    fs.mkdirSync(path.join(repository, 'scripts'), { recursive: true });
    fs.copyFileSync(path.join(root, 'scripts', script), path.join(repository, 'scripts', script));
  }
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(repository, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(repository, '.gitignore'), 'node_modules/\n');
  const git = (...args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '--quiet');
  git('config', 'user.name', 'Catalog Test');
  git('config', 'user.email', 'catalog@example.invalid');
  git('add', '.');
  git('commit', '--quiet', '-m', 'catalog source');
  const run = (output, ...flags) => spawnSync(process.execPath, ['scripts/export-rule-catalog.mjs', snapshot, output, ...flags], { cwd: repository, encoding: 'utf8' });
  assert.notEqual(run(path.join(temporary, 'missing-tag')).status, 0, 'Untagged export must fail');
  const preview = run(path.join(temporary, 'preview'), '--prepare');
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /PREPARATION ONLY/);
  git('tag', `v${snapshot}`);
  assert.notEqual(run(path.join(temporary, 'lightweight')).status, 0, 'Lightweight tag must fail');
  git('tag', '-d', `v${snapshot}`);
  git('tag', '-a', `v${snapshot}`, '-m', snapshot);
  const output = path.join(temporary, 'published');
  const result = run(output);
  assert.equal(result.status, 0, result.stderr);
  const exported = readCatalogBundle(output, snapshot);
  assert.equal(exported.manifest.source.commit, git('rev-parse', 'HEAD'));
  assert.deepEqual(exported.catalog, bundle.catalog, 'Every authored record is exported unchanged');
  const recordFile = path.join(repository, candidate.specificationRoot, 'validation', 'rules', 'annotations.yaml');
  const records = fs.readFileSync(recordFile, 'utf8');
  fs.writeFileSync(recordFile, records.replace(/^        "2024-11-05": .*\n/m, ''));
  assert.throws(() => buildValidationCatalog(repository, snapshot, commit), /Incomplete applicability/);
  fs.writeFileSync(recordFile, records);
  const registry = parse(records);
  registry.rules.push({ ...retired, id: 'mcpdesc.retired-test', owner: 'mcpdesc', title: 'Retired example requirement' });
  fs.writeFileSync(recordFile, stringify(registry));
  const historical = buildValidationCatalog(repository, snapshot, commit);
  assert.equal(historical.manifest.ruleCount, bundle.manifest.ruleCount + 1);
  const retained = historical.catalog.rules.find((rule) => rule.id === 'mcpdesc.retired-test');
  assert.equal(retained.status, 'retired');
  assert.equal(retained.applicability, undefined);
  fs.writeFileSync(recordFile, records);
  assert.notEqual(run(output).status, 0, 'Export must not overwrite an existing output');
  fs.writeFileSync(path.join(repository, 'untracked.txt'), 'dirty');
  assert.notEqual(run(path.join(temporary, 'dirty')).status, 0, 'Dirty source must fail');
  assert.throws(() => resolveCatalogFile(repository, '../outside'));
  fs.writeFileSync(path.join(temporary, 'outside.txt'), 'outside');
  fs.symlinkSync(path.join(temporary, 'outside.txt'), path.join(repository, 'escape.txt'));
  assert.throws(() => resolveCatalogFile(repository, 'escape.txt'));
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

console.log(`Validation catalog tests passed: ${bundle.manifest.ruleCount} readable records, deterministic artifacts, discovery, publication failures, and clean annotated-tag exports.`);