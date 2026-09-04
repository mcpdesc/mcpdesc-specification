// Validate the repository as a synchronized specification distribution.
//
// This executable checks required files and lifecycle invariants, compiles each
// versioned JSON Schema with its declared dialect, validates draft examples and
// fixtures, runs the v0.8.0 semantic rules, and detects assembled-spec drift.
// It is the repository-validation half of `npm test`; projection and merge
// behavior is exercised separately by `scripts/test-views.mjs`.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { decodeDocumentSource, documentFormatForPath } from './decode-document.mjs';
import { assembleDraft } from './draft-assembly.mjs';
import { canonicalizeJsonSource } from './canonical-json.mjs';
import { validateMcpdesc08Document } from './validate-0.8.mjs';

function createValidatorForDialect(dialect) {
  const Factory = dialect === '2020-12' ? Ajv2020 : Ajv;
  const instance = new Factory({ allErrors: true, strict: false });
  addFormats(instance);
  return instance;
}

function dialectFor(schema) {
  const declared = String(schema?.$schema ?? '');
  if (declared.includes('2020-12')) return '2020-12';
  return 'draft-07';
}

const ajvByDialect = {
  'draft-07': createValidatorForDialect('draft-07'),
  '2020-12': createValidatorForDialect('2020-12')
};

const root = process.cwd();
const errors = [];
const warnings = [];
const requiredFiles = [
  'README.md',
  'LICENSE',
  'NOTICE',
  'ORIGIN.md',
  'GOVERNANCE.md',
  'CONTRIBUTING.md',
  'specification-status.json',
  'schemas/latest.json',
  'schemas/mcp-description/0.7.0.json',
  'schemas/mcp-description/0.8.0.json',
  'spec/draft/mcp-description.md'
];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function validateDraftDocument(document) {
  return validateMcpdesc08Document(document);
}

function reportDiagnostic(rel, diagnostic) {
  return `${rel}: ${diagnostic.message}`;
}

function readText(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function readJson(rel) {
  try {
    return JSON.parse(readText(rel));
  } catch (error) {
    fail(`${rel}: invalid JSON: ${error.message}`);
    return null;
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function parseDocumentFile(full) {
  const rel = path.relative(root, full);
  try {
    const text = fs.readFileSync(full, 'utf8');
    const document = decodeDocumentSource(text, documentFormatForPath(full), rel);
    return { rel, document };
  } catch (error) {
    return { rel, parseError: error.message };
  }
}

for (const rel of requiredFiles) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing required file: ${rel}`);
}

for (const rel of ['ORIGIN.md', 'README.md', 'NOTICE']) {
  if (fs.existsSync(path.join(root, rel)) && /<UPSTREAM_|<IMPORT_DATE>|<[^>]+>/.test(readText(rel))) {
    fail(`${rel}: unresolved placeholder found`);
  }
}

const sectionDir = path.join(root, 'spec', 'draft', 'sections');
if (fs.existsSync(sectionDir) && fs.existsSync(path.join(root, 'spec/draft/mcp-description.md'))) {
  const { content: assembledFromSections } = assembleDraft(root);
  if (readText('spec/draft/mcp-description.md') !== assembledFromSections) {
    fail('spec/draft/mcp-description.md: assembled specification is out of sync with spec/draft/sections');
  }
}

const status = readJson('specification-status.json');
const latest = readJson('schemas/latest.json');
if (status && status.stable?.version !== '0.7.0') fail('stable status must remain 0.7.0 during bootstrap');
if (status && status.draft?.version !== '0.8.0') fail('draft status must identify 0.8.0');
if (status && !Number.isInteger(status.draft?.iteration)) fail('draft status iteration must be an integer');
if (status && !['community-working-draft', 'release-candidate'].includes(status.draft?.status)) fail('draft status must identify a community working draft or release candidate');
if (status) {
  const prereleaseLabel = status.draft?.status === 'release-candidate' ? 'rc' : 'draft';
  if (status.draft?.snapshotTag !== `v${status.draft?.version}-${prereleaseLabel}.${status.draft?.iteration}`) {
    fail('draft status snapshot tag must match its status, version, and iteration');
  }
}
if (status && !/^\d{4}-\d{2}-\d{2}$/.test(status.draft?.snapshotDate ?? '')) fail('draft status snapshot date must use YYYY-MM-DD');
if (status && status.draft?.released !== false) fail('v0.8.0 must remain unreleased during bootstrap');
if (latest && latest['mcp-description'] !== '0.7.0') fail('schemas/latest.json must remain on 0.7.0 until release');

if (fs.existsSync(path.join(root, 'schemas/draft.json'))) {
  const draft = readJson('schemas/draft.json');
  const activeDraftSchema = draft?.schema ? readJson(draft.schema) : null;
  if (draft && draft['mcp-description'] !== '0.8.0') fail('schemas/draft.json must identify draft 0.8.0');
  if (draft && draft.iteration !== status?.draft?.iteration) fail('schemas/draft.json iteration must match specification-status.json');
  if (draft && draft.snapshotTag !== status?.draft?.snapshotTag) fail('schemas/draft.json snapshotTag must match specification-status.json');
  if (draft && draft.snapshotDate !== status?.draft?.snapshotDate) fail('schemas/draft.json snapshotDate must match specification-status.json');
  if (draft && draft.released !== false) fail('schemas/draft.json must remain unreleased while v0.8.0 is a draft');
  if (draft && draft.branch !== status?.draft?.branch) fail('schemas/draft.json branch must match specification-status.json');
  if (draft && draft.status !== status?.draft?.status) fail('schemas/draft.json status must match specification-status.json');
  if (draft && draft.schemaId !== `https://mcpdesc.org/schema/mcp-description/${draft.snapshotTag?.slice(1)}.json`) fail('schemas/draft.json must record the canonical prerelease schema ID');
  if (draft && activeDraftSchema && draft.schemaId !== activeDraftSchema.$id) fail('schemas/draft.json schemaId must match the active draft schema root $id');
  if (draft && Object.hasOwn(draft, '$id')) fail('schemas/draft.json is a status manifest and must not declare a JSON Schema $id');
  if (draft && latest && draft['mcp-description'] === latest['mcp-description']) fail('schemas/draft.json must not equal the released schemas/latest.json version');
}

const proposalSnapshots = [
  ['0001-mcp-2026-07-28-alignment.md', 'c7328e6c9ee858f712248d2003d8587da4933cd9', 'proposals/0001-mcp-2026-07-28-alignment.md', '9713db4d1c8583c9480a5597c8f4500b804f00ddb4c957c2a710821b4d83a02a'],
  ['0002-meta-support.md', 'c1301cb60f7edc740a937b551e9c0c4e6467d943', 'proposals/0002-meta-support.md', '42b39d056019d26a304929fc5bca68d8c72f01d2340ee3aebbc4d1a041a35adc'],
  ['0003-security-requirements.md', '199555ade2b13eb179c0a473712027582441158b', 'proposals/0003-security-requirements.md', 'fcba623df2b345d8a060ab9a265949dbcf795f0b17651e8fccd4cb7c0d17150d'],
  ['0004-tool-input-output-examples.md', 'efa6130a4818d16f8d4034264ae4641e51cfaf3b', 'proposals/0004-tool-input-output-examples.md', '769451ad9a5bbb6b3c2b1ef87855d8f66daa5a1962f3c6dd57a94c1d5a470f56'],
  ['0005-resource-examples.md', '4e83d3980af46fa0f28a05f9bf4dfee6a391ab94', 'proposals/0005-resource-examples.md', 'bc7ddbc27fc316821a6f993fafd07b1fa16dd006aa4acc350c3161fa30d4f3c6'],
  ['0007-elicitation.md', 'bea999a5ec537ed6ebb68e9681f0f4a48d812f20', 'proposals/0007-elicitation.md', '32bbb63c5fe04539414bf46af42023f870f230b738f40278af28592e5d2e9efc'],
  ['0008-primitive-provenance.md', 'f4ba3d43d67365a8c8aee48160870a6dec6a9e15', 'proposals/0008-primitive-provenance.md', '1be8746bcb0914cbcd7add6246f6105637df3e96aec719fe9f8cd02ae05cef3c'],
  ['0009-reusable-components.md', '309f006f5a0f42c612e2f3f0a06e25441437f8b3', 'proposals/0009-reusable-components.md', '0bc534169c0f1a05e3bc50e96c63859536ab905d2d68dec5737627b168f26e1c'],
  ['0010-json-yaml-serialization.md', '2171023d01a7f24d97510c6185d464c32ef8ba09', 'proposals/0010-json-yaml-serialization.md', '2d11a529ba94041c390c1e3dab80b56c9408be260c881873db7341c6f4718291'],
  ['0011-primitive-specification-extensions.md', 'de79bcd28da06b4355668f5403b84ac276f7ae7e', 'proposals/0011-primitive-specification-extensions.md', '4b2dd0c29a520e9bfe00b6571bc6a486e70f17ee2e368797d655e747351a3f12'],
  ['0012-primitive-client-capability-requirements.md', '45e033975e22b699b3c3f2f0eeb160f9678e4369', 'proposals/0012-primitive-client-capability-requirements.md', '4bc568e6374af3745a62ce7892d574171e0fefac091a133ecca0ed77899c86f8'],
  ['0013-optional-sections-non-empty-collections.md', 'e6243738ef685f5da5fa9418269cfe4317fe7b12', 'proposals/0013-optional-sections-non-empty-collections.md', '47fe7d3380ba92d3ad10ae719a29017221868d99c4336011fd2f2bdd2aa36a83'],
  ['0015-prompt-examples.md', 'f5cd5a5b62f4b074702f6405d209cee3e7b683d0', 'proposals/0015-prompt-examples.md', 'e2c74d3b4615ad4898a82c6918e919e3e9f337ec0e870dac32d9281900e67eed'],
  ['0016-completion-examples.md', '81393cf4b232c71a25d828f09a6836dc1ff316a6', 'proposals/0016-completion-examples.md', '0196662c57b7bed2a4ef2720e7acf5d74b2cc17bdecd2cbb027349fa3d480fe9'],
  ['0017-tool-interaction-examples.md', '067788c14c1361f4994ed1f819df388a29c9e978', 'proposals/0017-tool-interaction-examples.md', 'b4ad04ce763256e14b0f59cfbcd0fe10414d9d71fe4ec67ddb75e2289f7e90ed'],
  ['0019-schema-identity-publication.md', '9680328d5aeb2e446a62e2eb4dec03ee028cfa60', 'proposals/0019-schema-identity-publication.md', 'c7a6b08f7851b49b1f324fc4c5d19b9eb180bd3f0302f0c1b122f4490be0f2bd']
];
const proposalManifest = fs.existsSync(path.join(root, 'spec/draft/PROPOSALS.md')) ? readText('spec/draft/PROPOSALS.md') : '';
if (!proposalManifest) fail('missing required file: spec/draft/PROPOSALS.md');
for (const [filename, commit, sourcePath, expectedDigest] of proposalSnapshots) {
  const rel = `spec/draft/proposal-snapshots/${filename}`;
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fail(`missing proposal snapshot: ${rel}`);
    continue;
  }
  const digest = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  if (digest !== expectedDigest) fail(`${rel}: SHA-256 differs from recorded proposal revision`);
  for (const provenanceValue of [filename, commit, sourcePath, expectedDigest]) {
    if (!proposalManifest.includes(provenanceValue)) fail(`spec/draft/PROPOSALS.md: missing provenance value ${provenanceValue}`);
  }
}

const schemaDir = path.join(root, 'schemas', 'mcp-description');
const schemas = new Map();
if (fs.existsSync(schemaDir)) {
  for (const filename of fs.readdirSync(schemaDir).filter((name) => /^\d+\.\d+\.\d+\.json$/.test(name))) {
    const rel = path.posix.join('schemas/mcp-description', filename);
    const source = readText(rel);
    const schema = readJson(rel);
    if (!schema) continue;
    if (filename === '0.8.0.json' && source !== canonicalizeJsonSource(source)) {
      fail(`${rel}: schema must use canonical object-key ordering, 2-space indentation, and one trailing newline`);
    }
    const ajv = ajvByDialect[dialectFor(schema)];
    try {
      ajv.validateSchema(schema, true);
      const validate = ajv.compile(schema);
      schemas.set(filename.replace(/\.json$/, ''), validate);
    } catch (error) {
      fail(`${rel}: invalid or uncompilable JSON Schema: ${error.message}`);
    }
  }
}

const specRoot = path.join(root, 'spec');
const exampleFiles = walk(specRoot).filter(
  (file) => {
    const relative = path.relative(specRoot, file);
    return !relative.startsWith(`draft${path.sep}materials${path.sep}`)
      && /(^|[\\/])examples[\\/]/.test(relative)
      && /\.(json|ya?ml)$/i.test(file);
  }
);

function validateAgainstVersionedSchema(document, rel) {
  const version = String(document?.mcpdesc ?? '');
  if (!version) {
    return [`${rel}: missing mcpdesc version`];
  }
  const validate = schemas.get(version);
  if (!validate) {
    return [`${rel}: no versioned schema found for mcpdesc ${version}`];
  }
  if (!validate(document)) {
    return [
      `${rel}: does not validate against ${version}: ${validate.errors ? validate.errors.map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ') : 'unknown error'}`
    ];
  }
  return [];
}

for (const full of exampleFiles) {
  const { rel, document, parseError } = parseDocumentFile(full);
  if (parseError) {
    fail(parseError);
    continue;
  }
  for (const error of validateAgainstVersionedSchema(document, rel)) fail(error);
  if (document?.mcpdesc === '0.8.0') {
    const diagnostics = validateDraftDocument(document);
    for (const diagnostic of diagnostics) {
      if (diagnostic.severity === 'error') fail(reportDiagnostic(rel, diagnostic));
      if (diagnostic.severity === 'warning') warn(reportDiagnostic(rel, diagnostic));
    }
  }
}

const fixtureRoot = path.join(root, 'spec', 'draft', 'fixtures');
const fixtureGroups = [
  ['expected-valid', false, false],
  ['expected-invalid', true, false],
  ['expected-warning', false, true]
];

for (const [group, expectsErrors, expectsWarnings] of fixtureGroups) {
  const dir = path.join(fixtureRoot, group);
  for (const full of walk(dir).filter((file) => /\.(json|ya?ml)$/i.test(file))) {
    const { rel, document, parseError } = parseDocumentFile(full);
    if (parseError) {
      fail(parseError);
      continue;
    }

    const schemaErrors = validateAgainstVersionedSchema(document, rel);
    const semanticDiagnostics = document?.mcpdesc === '0.8.0' ? validateDraftDocument(document) : [];
    const semanticErrors = semanticDiagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')
      .map((diagnostic) => reportDiagnostic(rel, diagnostic));
    const semanticWarnings = semanticDiagnostics
      .filter((diagnostic) => diagnostic.severity === 'warning')
      .map((diagnostic) => reportDiagnostic(rel, diagnostic));
    const fixtureErrors = [...schemaErrors, ...semanticErrors];

    if (expectsErrors) {
      if (!fixtureErrors.length) {
        fail(`${rel}: expected fixture to fail validation, but it passed`);
      }
      continue;
    }

    if (fixtureErrors.length) {
      for (const fixtureError of fixtureErrors) fail(fixtureError);
      continue;
    }

    if (expectsWarnings && semanticWarnings.length === 0) {
      fail(`${rel}: expected fixture to emit at least one warning, but it did not`);
      continue;
    }
    if (!expectsWarnings && semanticWarnings.length > 0) {
      fail(`${rel}: expected fixture to validate without warnings, but got: ${semanticWarnings.join(' | ')}`);
      continue;
    }
    for (const fixtureWarning of semanticWarnings) warn(fixtureWarning);
  }
}

if (errors.length) {
  errors.sort();
  console.error(`Repository validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

warnings.sort();
console.log(`Repository validation passed. Checked ${schemas.size} versioned schema(s).`);
if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  for (const warning of warnings) console.log(`- ${warning}`);
}
