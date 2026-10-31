import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { formatCanonicalJson } from './canonical-json.mjs';
import { decodeDocumentSource, documentFormatForPath } from './decode-document.mjs';
import { fetchSchemaPublication, verifySchemaPublication } from './schema-publication.mjs';

export const ruleFormatVersion = '1.2.0';
export const ruleSchemaUrl = `https://mcpdesc.org/schema/validation-rule/${ruleFormatVersion}.json`;
export const resultFormatVersion = '1.0.0';
export const resultSchemaUrl = `https://mcpdesc.org/schema/validation-result/${resultFormatVersion}.json`;
export const catalogIndexUrl = 'https://mcpdesc.org/validation/catalogs/index.json';
const repository = 'https://github.com/mcpdesc/mcpdesc-specification';
export const catalogDigest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const jsonBytes = (value) => Buffer.from(formatCanonicalJson(value));
const artifactPath = (url) => new URL(url).pathname.slice(1);

export function catalogIdentity(snapshot) {
  const match = /^(\d+\.\d+\.\d+)(?:-(draft|rc)\.\d+)?(?:\+editorial\.\d+)?$/.exec(snapshot);
  assert.ok(match, `Unsupported catalog snapshot: ${snapshot}`);
  return {
    mcpdescVersion: match[1],
    status: match[2] === 'draft' ? 'draft' : match[2] === 'rc' ? 'release-candidate' : 'stable',
    tag: `v${snapshot}`,
    specificationPath: match[2] ? 'spec/draft' : `spec/${match[1]}`,
    manifestUrl: `https://mcpdesc.org/validation/catalogs/${snapshot}/manifest.json`,
    catalogUrl: `https://mcpdesc.org/validation/catalogs/${snapshot}/rules.json`
  };
}

function schemaValidators(schema) {
  assert.equal(schema.$id, ruleSchemaUrl, 'Unexpected rule-format identity');
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(schema);
  return Object.fromEntries(['', '#/$defs/catalog-manifest', '#/$defs/catalog-index', '#/$defs/unchecked-requirements'].map((fragment) => {
    const validate = ajv.getSchema(`${ruleSchemaUrl}${fragment}`);
    return [fragment || 'rules', (value) => assert.ok(validate(value), ajv.errorsText(validate.errors))];
  }));
}

export function resolveCatalogFile(root, relative) {
  assert.ok(!path.isAbsolute(relative) && !relative.includes('\\'), `Invalid source path: ${relative}`);
  const base = fs.realpathSync(root);
  const full = fs.realpathSync(path.resolve(base, relative));
  assert.ok(full === base || full.startsWith(`${base}${path.sep}`), `Source path escapes repository: ${relative}`);
  return full;
}

function checkReference(root, specificationPath, relative) {
  if (/^https:\/\//.test(relative)) return;
  assert.ok(!/^[a-z][a-z0-9+.-]*:|^\/\//i.test(relative), `Unsupported link: ${relative}`);
  const [target, fragment] = relative.split('#');
  const full = resolveCatalogFile(root, `${specificationPath}/${decodeURIComponent(target)}`);
  if (!fragment) return;
  const text = fs.readFileSync(full, 'utf8');
  if (/^L\d+(?:-L\d+)?$/.test(fragment)) {
    const [first, last = first] = fragment.replaceAll('L', '').split('-').map(Number);
    assert.ok(first > 0 && last >= first && last <= text.split('\n').length, `Invalid line reference: ${relative}`);
  } else {
    const slug = (heading) => heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
    assert.ok(text.includes(`id="${fragment}"`)
      || text.split('\n').some((line) => /^#+ /.test(line) && slug(line.replace(/^#+ /, '')) === fragment), `Missing anchor: ${relative}`);
  }
}

export function checkRuleApplicability(rule, protocolVersions) {
  if (rule.status === 'retired') return;
  assert.ok(rule.applicability && typeof rule.applicability === 'object', `Missing applicability: ${rule.id}`);
  const applicability = rule.applicability.protocolVersions;
  if (applicability !== 'independent') {
    assert.ok(applicability && typeof applicability === 'object' && !Array.isArray(applicability), `Invalid protocol applicability: ${rule.id}`);
    if (protocolVersions) assert.deepEqual(Object.keys(applicability).sort(), [...protocolVersions].sort(), `Incomplete applicability: ${rule.id}`);
    for (const behavior of Object.values(applicability)) {
      assert.ok(['applies', 'opaque', 'not-applicable'].includes(behavior) || rule.description.includes(behavior), `Unexplained applicability: ${rule.id}`);
    }
  }
  if (rule.applicability.schemaDialects) {
    assert.ok(rule.applicability.schemaDialects.length > 0, `Empty dialect information: ${rule.id}`);
    for (const dialect of rule.applicability.schemaDialects) assert.ok(/^https?:\/\//.test(dialect), `Invalid schema dialect: ${rule.id}`);
  }
}

function checkRecords(catalog, protocolVersions) {
  const ids = new Set();
  const titles = new Set();
  for (const rule of catalog.rules) {
    assert.ok(!ids.has(rule.id), `Duplicate rule: ${rule.id}`);
    ids.add(rule.id);
    const title = rule.title.trim().toLowerCase();
    assert.ok(!titles.has(title), `Duplicate title: ${rule.title}`);
    titles.add(title);
    assert.ok(rule.title === rule.title.trim() && /^[A-Z]/.test(rule.title), `Invalid reader title: ${rule.id}`);
    assert.ok(rule.description.trim().split(/\n\s*\n/).length <= 3, `Too many description paragraphs: ${rule.id}`);
    checkRuleApplicability(rule, protocolVersions);
  }
  assert.deepEqual(catalog.rules.map((rule) => rule.id), [...ids].sort(), 'Catalog records must be ordered by permanent ID');
}

export function buildValidationCatalog(root, snapshot, commit) {
  const identity = catalogIdentity(snapshot);
  assert.match(commit, /^[0-9a-f]{40}$/);
  const schemaBytes = fs.readFileSync(resolveCatalogFile(root, `${identity.specificationPath}/validation/rule.schema.json`));
  const schema = JSON.parse(schemaBytes);
  const validate = schemaValidators(schema);
  const descriptionSchema = JSON.parse(fs.readFileSync(resolveCatalogFile(root, `schemas/mcp-description/${identity.mcpdescVersion}.json`)));
  assert.equal(descriptionSchema.properties.mcpdesc.const, identity.mcpdescVersion);
  const status = JSON.parse(fs.readFileSync(resolveCatalogFile(root, 'specification-status.json')));
  if (identity.status !== 'stable') {
    assert.equal(status.draft.snapshotTag, identity.tag, 'Snapshot must match draft metadata');
    assert.equal(descriptionSchema.$id, `https://mcpdesc.org/schema/mcp-description/${snapshot}.json`);
  }
  const directory = resolveCatalogFile(root, `${identity.specificationPath}/validation/rules`);
  const rules = fs.readdirSync(directory).filter((name) => /\.ya?ml$/.test(name)).sort().flatMap((name) => {
    const file = resolveCatalogFile(root, `${identity.specificationPath}/validation/rules/${name}`);
    const record = decodeDocumentSource(fs.readFileSync(file, 'utf8'), 'yaml', name);
    validate.rules(record);
    return record.rules;
  }).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  const catalog = { rules };
  const uncheckedPath = `${identity.specificationPath}/validation/unchecked-requirements.yaml`;
  if (fs.existsSync(path.join(root, uncheckedPath))) {
    const unchecked = decodeDocumentSource(fs.readFileSync(resolveCatalogFile(root, uncheckedPath), 'utf8'), 'yaml', uncheckedPath);
    validate['#/$defs/unchecked-requirements'](unchecked);
    catalog.uncheckedRequirements = [...unchecked.uncheckedRequirements].sort((left, right) => left.location < right.location ? -1 : left.location > right.location ? 1 : 0);
    for (const entry of catalog.uncheckedRequirements) checkReference(root, identity.specificationPath, entry.location);
  }
  validate.rules(catalog);
  checkRecords(catalog, descriptionSchema.$defs.supportedProtocolVersion.enum);
  for (const rule of rules) {
    for (const location of [...rule.specification, ...(rule.sources ?? [])].flatMap((entry) => entry.locations)) {
      checkReference(root, identity.specificationPath, location);
    }
    for (const match of rule.description.matchAll(/\]\(([^)\s]+)\)/g)) checkReference(root, identity.specificationPath, match[1]);
    for (const fixture of rule.fixtures) {
      const relative = `${/^(?:projection|view|serialization)-fixtures\//.test(fixture.path) ? '' : 'fixtures/'}${fixture.path}`;
      const file = resolveCatalogFile(root, `${identity.specificationPath}/${relative}`);
      // A serialization fixture may be undecodable by design; it is cited as a whole.
      if (fixture.path.startsWith('serialization-fixtures/')) {
        assert.equal(fixture.pointer, '', `Serialization fixtures are cited whole: ${rule.id} ${fixture.path}`);
        continue;
      }
      let node = decodeDocumentSource(fs.readFileSync(file, 'utf8'), documentFormatForPath(file), fixture.path);
      for (const key of fixture.pointer.split('/').slice(1).map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'))) {
        assert.ok(node !== null && typeof node === 'object' && Object.hasOwn(node, key), `Missing fixture pointer: ${rule.id} ${fixture.pointer}`);
        node = node[key];
      }
    }
  }
  const catalogBytes = jsonBytes(catalog);
  const resultSchemaPath = `${identity.specificationPath}/validation/result.schema.json`;
  const resultSchemaBytes = fs.existsSync(path.join(root, resultSchemaPath)) ? fs.readFileSync(resolveCatalogFile(root, resultSchemaPath)) : undefined;
  const manifest = {
    $schema: `${ruleSchemaUrl}#/$defs/catalog-manifest`,
    ruleFormatVersion,
    mcpdescVersion: identity.mcpdescVersion,
    snapshot,
    status: identity.status,
    source: { repository, tag: identity.tag, commit, specificationPath: identity.specificationPath },
    ruleSchema: { url: ruleSchemaUrl, sha256: catalogDigest(schemaBytes) },
    ...(resultSchemaBytes ? { resultSchema: { url: resultSchemaUrl, sha256: catalogDigest(resultSchemaBytes) } } : {}),
    catalog: { url: identity.catalogUrl, sha256: catalogDigest(catalogBytes) },
    specificationBaseUrl: `${repository}/blob/${identity.tag}/${identity.specificationPath}/`,
    ruleCount: rules.length
  };
  const files = new Map([
    [artifactPath(ruleSchemaUrl), schemaBytes],
    ...(resultSchemaBytes ? [[artifactPath(resultSchemaUrl), resultSchemaBytes]] : []),
    [artifactPath(identity.catalogUrl), catalogBytes],
    [artifactPath(identity.manifestUrl), jsonBytes(manifest)]
  ]);
  return validateCatalogBundle(files, snapshot);
}

export function validateCatalogBundle(files, snapshot) {
  const identity = catalogIdentity(snapshot);
  const bytes = (url) => {
    const value = files.get(artifactPath(url));
    assert.ok(value, `Missing artifact: ${url}`);
    return value;
  };
  const schema = JSON.parse(bytes(ruleSchemaUrl));
  const manifest = JSON.parse(bytes(identity.manifestUrl));
  const catalog = JSON.parse(bytes(identity.catalogUrl));
  const validate = schemaValidators(schema);
  validate['#/$defs/catalog-manifest'](manifest);
  validate.rules(catalog);
  checkRecords(catalog);
  assert.equal(manifest.ruleFormatVersion, ruleFormatVersion);
  assert.equal(manifest.snapshot, snapshot);
  assert.equal(manifest.mcpdescVersion, identity.mcpdescVersion);
  assert.equal(manifest.status, identity.status);
  assert.equal(manifest.source.tag, identity.tag);
  assert.equal(manifest.source.repository, repository);
  assert.equal(manifest.source.specificationPath, identity.specificationPath);
  assert.equal(manifest.specificationBaseUrl, `${repository}/blob/${identity.tag}/${identity.specificationPath}/`);
  assert.equal(manifest.catalog.url, identity.catalogUrl);
  assert.equal(manifest.ruleSchema.url, ruleSchemaUrl);
  assert.equal(manifest.ruleSchema.sha256, catalogDigest(bytes(ruleSchemaUrl)));
  assert.equal(manifest.catalog.sha256, catalogDigest(bytes(identity.catalogUrl)));
  assert.equal(manifest.ruleCount, catalog.rules.length);
  if (manifest.resultSchema) {
    assert.equal(manifest.resultSchema.url, resultSchemaUrl);
    assert.equal(manifest.resultSchema.sha256, catalogDigest(bytes(resultSchemaUrl)));
    const resultSchema = JSON.parse(bytes(resultSchemaUrl));
    assert.equal(resultSchema.$id, resultSchemaUrl, 'Unexpected validation result format identity');
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    ajv.compile(resultSchema);
  }
  return { files, manifest, catalog, schema };
}

const bundleUrls = (manifest, identity, schemaOnly = false) => [
  ruleSchemaUrl,
  ...(manifest.resultSchema ? [resultSchemaUrl] : []),
  ...(schemaOnly ? [] : [identity.catalogUrl, identity.manifestUrl])
];

export function readCatalogBundle(directory, snapshot) {
  const identity = catalogIdentity(snapshot);
  const read = (url) => fs.readFileSync(resolveCatalogFile(directory, artifactPath(url)));
  const manifest = JSON.parse(read(identity.manifestUrl));
  return validateCatalogBundle(new Map(bundleUrls(manifest, identity).map((url) => [artifactPath(url), read(url)])), snapshot);
}

export function validateCatalogIndex(index, schema) {
  schemaValidators(schema)['#/$defs/catalog-index'](index);
  const snapshots = new Set();
  const manifests = new Set();
  for (const entry of index.catalogs) {
    const identity = catalogIdentity(entry.snapshot);
    assert.ok(!snapshots.has(entry.snapshot) && !manifests.has(entry.manifest), 'Duplicate catalog index identity');
    snapshots.add(entry.snapshot);
    manifests.add(entry.manifest);
    assert.equal(entry.mcpdescVersion, identity.mcpdescVersion);
    assert.equal(entry.status, identity.status);
    assert.equal(entry.manifest, identity.manifestUrl);
  }
  for (const [pointer, statuses] of [['currentStable', ['stable']], ['currentDraft', ['draft', 'release-candidate']]]) {
    if (index[pointer] === null) continue;
    const entry = index.catalogs.find((catalog) => catalog.manifest === index[pointer]);
    assert.ok(entry && statuses.includes(entry.status), `Invalid ${pointer} catalog`);
  }
  return index;
}

export function extendCatalogIndex(index, bundle, makeCurrent = false) {
  const next = structuredClone(validateCatalogIndex(index, bundle.schema));
  const manifest = bundle.manifest;
  const entry = { mcpdescVersion: manifest.mcpdescVersion, snapshot: manifest.snapshot, status: manifest.status, manifest: catalogIdentity(manifest.snapshot).manifestUrl };
  const existing = next.catalogs.find((item) => item.snapshot === entry.snapshot);
  if (existing) assert.deepEqual(existing, entry, 'Cannot redefine a published catalog identity');
  else next.catalogs.push(entry);
  next.catalogs.sort((left, right) => left.snapshot < right.snapshot ? -1 : left.snapshot > right.snapshot ? 1 : 0);
  if (makeCurrent) next[entry.status === 'stable' ? 'currentStable' : 'currentDraft'] = entry.manifest;
  return validateCatalogIndex(next, bundle.schema);
}

export function emptyCatalogIndex() {
  return { $schema: `${ruleSchemaUrl}#/$defs/catalog-index`, catalogs: [], currentStable: null, currentDraft: null };
}

export async function verifyCatalogPublication(bundle, fetchImpl = fetch, { schemaOnly = false } = {}) {
  const identity = catalogIdentity(bundle.manifest.snapshot);
  for (const url of bundleUrls(bundle.manifest, identity, schemaOnly)) {
    const expectedBytes = bundle.files.get(artifactPath(url));
    const expected = JSON.parse(expectedBytes);
    const result = await verifySchemaPublication({ requestedUrl: url, expectedBytes, expectedRootId: expected.$id, expectedDialect: expected.$schema, fetchImpl });
    assert.ok(result.ok, `${url}: ${result.errors.join('; ')}`);
  }
}

export async function verifyCatalogIndexPublication(schemaBytes, fetchImpl = fetch) {
  const schema = JSON.parse(schemaBytes);
  const result = await fetchSchemaPublication(catalogIndexUrl, { fetchImpl });
  assert.equal(result.status, 200);
  assert.ok(!result.redirected && (!result.responseUrl || result.responseUrl === catalogIndexUrl), 'Catalog index must not redirect');
  assert.match(result.headers.get('content-type') ?? '', /^application\/(?:[a-z0-9.+-]+\+)?json(?:;|$)/i);
  assert.ok(['*', result.requestOrigin].includes(result.headers.get('access-control-allow-origin')), 'Catalog index must permit CORS');
  const cache = result.headers.get('cache-control') ?? '';
  assert.ok(!/\bimmutable\b/i.test(cache), 'Catalog index must not be immutable');
  assert.ok(/\bno-cache\b|\bno-store\b/i.test(cache) || /\bmax-age=(\d+)\b/i.test(cache) && Number(cache.match(/\bmax-age=(\d+)\b/i)[1]) <= 300, 'Catalog index cache lifetime must be at most 300 seconds or revalidate');
  const index = validateCatalogIndex(JSON.parse(result.bodyBytes), schema);
  for (const entry of index.catalogs) {
    const manifestResponse = await fetchSchemaPublication(entry.manifest, { fetchImpl });
    assert.equal(manifestResponse.status, 200, `Missing indexed manifest: ${entry.manifest}`);
    const manifest = JSON.parse(manifestResponse.bodyBytes);
    schemaValidators(schema)['#/$defs/catalog-manifest'](manifest);
    assert.equal(manifest.catalog.url, catalogIdentity(entry.snapshot).catalogUrl);
    assert.equal(manifest.ruleSchema.url, ruleSchemaUrl);
    const catalogResponse = await fetchSchemaPublication(catalogIdentity(entry.snapshot).catalogUrl, { fetchImpl });
    const resultSchemaResponse = manifest.resultSchema ? await fetchSchemaPublication(resultSchemaUrl, { fetchImpl }) : undefined;
    const files = new Map([
      [artifactPath(ruleSchemaUrl), schemaBytes],
      ...(resultSchemaResponse ? [[artifactPath(resultSchemaUrl), resultSchemaResponse.bodyBytes]] : []),
      [artifactPath(entry.manifest), manifestResponse.bodyBytes],
      [artifactPath(catalogIdentity(entry.snapshot).catalogUrl), catalogResponse.bodyBytes]
    ]);
    const bundle = validateCatalogBundle(files, entry.snapshot);
    await verifyCatalogPublication(bundle, fetchImpl);
  }
  return index;
}