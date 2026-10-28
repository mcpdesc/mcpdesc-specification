// Validate the repository as a synchronized specification distribution.
//
// This executable checks required files and lifecycle invariants, compiles each
// versioned JSON Schema with its declared dialect, validates candidate examples
// and fixtures, runs the candidate semantic rules, and detects assembled-spec drift.
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
import { assembleSpecification } from './draft-assembly.mjs';
import { canonicalizeJsonSource } from './canonical-json.mjs';
import { candidateSpecification } from './candidate-specification.mjs';
import { validateDocument } from './validate-document.mjs';

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
const expectedFixtureWarnings = [];
const expectedWarningCodesByFixture = new Map([
  ['component-protocol-scope.json', [
    'result-field-not-defined-by-version',
    'result-field-not-defined-by-version',
    'result-field-not-defined-by-version'
  ]],
  ['deprecated-client-capability-requirements.json', [
    'deprecated-client-requirement',
    'deprecated-client-requirement',
    'deprecated-client-requirement',
    'unknown-reserved-extension-identifier'
  ]],
  ['legacy-completion-examples.json', ['legacy-protocol-validation-incomplete']],
  ['legacy-result-meta.json', ['legacy-protocol-validation-incomplete']],
  ['legacy-sse-modern-revision.json', [
    'legacy-protocol-validation-incomplete',
    'legacy-sse-for-modern-version'
  ]],
  ['logging-deprecated-2026.json', ['logging-deprecated-in-2026']],
  ['open-result-unknown-properties.json', [
    'result-field-not-defined-by-version',
    'result-field-not-defined-by-version'
  ]],
  ['open-results-shared-across-revisions.json', [
    'result-field-not-defined-by-version',
    'result-field-not-defined-by-version',
    'result-field-not-defined-by-version',
    'result-field-not-defined-by-version',
    'result-field-not-defined-by-version'
  ]],
  ['open-step-responses-before-2026.json', [
    'result-field-not-defined-by-version',
    'result-field-not-defined-by-version'
  ]],
  ['pre-dialect-tool-example.json', [
    'incomplete-tool-example-validation',
    'legacy-protocol-validation-incomplete'
  ]],
  ['pre-dialect-tool-schema-shape.json', ['legacy-protocol-validation-incomplete']],
  ['pre-standard-extension-capabilities.json', ['extensions-not-supported-by-version']],
  ['resource-example-consistency.json', [
    'resource-example-mime-type-mismatch',
    'resource-example-requested-uri-not-returned',
    'resource-example-size-mismatch'
  ]],
  ['tool-interaction-client-requirements-contradictions.json', [
    'deprecated-client-requirement',
    'interaction-example-client-requirements-contradiction',
    'interaction-example-client-requirements-contradiction',
    'interaction-example-client-requirements-contradiction',
    'interaction-example-client-requirements-contradiction'
  ]],
  ['uncatalogued-oauth-scope.json', ['uncatalogued-oauth-scope']],
  ['uncatalogued-openid-scope.json', ['uncatalogued-oauth-scope']],
  ['unknown-reserved-extension-identifier.json', ['unknown-reserved-extension-identifier']],
  ['unknown-reserved-meta-key.json', ['meta-unknown-reserved-key']],
  ['unresolved-external-tool-example-ref.json', [
    'incomplete-tool-example-validation',
    'unresolved-external-tool-schema-reference'
  ]],
  ['unresolved-external-tool-ref.json', ['unresolved-external-tool-schema-reference']]
]);
const seenExpectedWarningFixtures = new Set();
const candidate = candidateSpecification(root);
const specificationDirectory = candidate.directory;
const specificationRoot = candidate.specificationRoot;
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
  `schemas/mcp-description/${candidate.stableVersion}.json`,
  candidate.schemaPath,
  `${specificationRoot}/mcp-description.md`
];

function compareVersions(left, right) {
  const parse = (value) => String(value ?? '').split('.').map(Number);
  const [a, b] = [parse(left), parse(right)];
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) - (b[index] ?? 0);
  }
  return 0;
}

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function validateCandidateDocument(document) {
  return validateDocument(document);
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

const sectionDir = path.join(root, specificationRoot, 'sections');
if (fs.existsSync(sectionDir) && fs.existsSync(path.join(root, specificationRoot, 'mcp-description.md'))) {
  const { content: assembledFromSections } = assembleSpecification(root, specificationDirectory);
  if (readText(`${specificationRoot}/mcp-description.md`) !== assembledFromSections) {
    fail(`${specificationRoot}/mcp-description.md: assembled specification is out of sync with ${specificationRoot}/sections`);
  }
}

const status = readJson('specification-status.json');
const latest = readJson('schemas/latest.json');
const hasActiveDraft = candidate.isDraft;
if (hasActiveDraft !== fs.existsSync(path.join(root, 'spec', 'draft'))) fail('spec/draft must exist exactly when specification-status.json identifies an active draft');
if (status && latest && status.stable?.version !== latest['mcp-description']) fail('stable status must match schemas/latest.json');
if (hasActiveDraft && status && compareVersions(status.draft?.version, status.stable?.version) <= 0) fail('draft status must identify a version later than the stable release');
if (hasActiveDraft && status && !Number.isInteger(status.draft?.iteration)) fail('draft status iteration must be an integer');
if (hasActiveDraft && status && !['community-working-draft', 'release-candidate'].includes(status.draft?.status)) fail('draft status must identify a community working draft or release candidate');
if (hasActiveDraft && status) {
  const prereleaseLabel = status.draft?.status === 'release-candidate' ? 'rc' : 'draft';
  if (status.draft?.snapshotTag !== `v${status.draft?.version}-${prereleaseLabel}.${status.draft?.iteration}`) {
    fail('draft status snapshot tag must match its status, version, and iteration');
  }
}
if (hasActiveDraft && status && !/^\d{4}-\d{2}-\d{2}$/.test(status.draft?.snapshotDate ?? '')) fail('draft status snapshot date must use YYYY-MM-DD');
if (hasActiveDraft && status && status.draft?.released !== false) fail('active draft must remain unreleased');
if (!hasActiveDraft && status?.draft) fail('specification-status.json must not identify an active draft when spec/draft is absent');
if (!hasActiveDraft && fs.existsSync(path.join(root, 'schemas/draft.json'))) fail('schemas/draft.json must be retired when no draft is active');

if (fs.existsSync(path.join(root, 'schemas/draft.json'))) {
  const draft = readJson('schemas/draft.json');
  const activeDraftSchema = draft?.schema ? readJson(draft.schema) : null;
  if (draft && draft['mcp-description'] !== status?.draft?.version) fail('schemas/draft.json must identify the active draft version');
  if (draft && draft.schema !== candidate.schemaPath) fail(`schemas/draft.json schema must be ${candidate.schemaPath}`);
  if (draft && draft.iteration !== status?.draft?.iteration) fail('schemas/draft.json iteration must match specification-status.json');
  if (draft && draft.snapshotTag !== status?.draft?.snapshotTag) fail('schemas/draft.json snapshotTag must match specification-status.json');
  if (draft && draft.snapshotDate !== status?.draft?.snapshotDate) fail('schemas/draft.json snapshotDate must match specification-status.json');
  if (draft && draft.released !== false) fail('schemas/draft.json must remain unreleased while its version is a draft');
  if (draft && draft.branch !== status?.draft?.branch) fail('schemas/draft.json branch must match specification-status.json');
  if (draft && draft.status !== status?.draft?.status) fail('schemas/draft.json status must match specification-status.json');
  if (draft && draft.schemaId !== `https://mcpdesc.org/schema/mcp-description/${draft.snapshotTag?.slice(1)}.json`) fail('schemas/draft.json must record the canonical prerelease schema ID');
  if (draft && activeDraftSchema && draft.schemaId !== activeDraftSchema.$id) fail('schemas/draft.json schemaId must match the active draft schema root $id');
  if (draft && Object.hasOwn(draft, '$id')) fail('schemas/draft.json is a status manifest and must not declare a JSON Schema $id');
  if (draft && latest && draft['mcp-description'] === latest['mcp-description']) fail('schemas/draft.json must not equal the released schemas/latest.json version');
}

const releasedProposalSnapshots = [
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
  ['0019-schema-identity-publication.md', '9680328d5aeb2e446a62e2eb4dec03ee028cfa60', 'proposals/0019-schema-identity-publication.md', 'c7a6b08f7851b49b1f324fc4c5d19b9eb180bd3f0302f0c1b122f4490be0f2bd'],
  ['0021-pre-standard-extension-capabilities.md', 'bd1b6e53b1d44fb5177478ffefa32a466cfb1de4', 'proposals/0021-pre-standard-extension-capabilities.md', '4355bf4aee9e89a1681a337a5dacd9b3f6ed23d4d7bc430f05f9e413f57b64cc'],
  ['0022-protocol-independent-info-metadata.md', '87b2d493cfa87a9cbea8148ae1f6638bd1aae786', 'proposals/0022-protocol-independent-info-metadata.md', '45c66ad65bbdae67c0afea416e025ddb1ce3dd4125306b40742fb6f887824785']
];
// Proposal revisions captured for the active draft: [file, commit, source path, SHA-256].
const draftProposalSnapshots = [
  ['0024-validation-rule-identity-and-provenance.md', '62f1f8e726c69398f8bc3edc1c0bb737c9f5b53c', 'proposals/0024-validation-rule-identity-and-provenance.md', 'fc25d6b6a0fb47e1bc6aba31cb4b6e08cc31bc029319e3c66b2c8776eb732374'],
  ['0025-native-mcp-projection.md', 'a44be2a02c16230ac6aa1613c28c72eb0544eb35', 'proposals/0025-native-mcp-projection.md', '1e841a9c460d10fefb39b1ed9890c5819be7f89b446deebb63516e3fae1e07ec'],
  ['0026-open-mcp-results-in-examples.md', '3d4e5ce773f5f61ecb67177aa34cbfbb302d06e0', 'proposals/0026-open-mcp-results-in-examples.md', '3a50753bf217c0ceb5fb60f28766c05b06f073524eafc3c899661b6810d6cd3b'],
  ['0027-closed-mcp-types.md', '609700bac005e182a0e65970b59f0a5c1f3dfc25', 'proposals/0027-closed-mcp-types.md', '8e83c57fc4c243bd8cde0e2d15c8f93e148311e54399445eecba171cb95a8f79'],
  ['0028-version-conversion.md', '192e5580270d94607f9d90ad1f97236b70c318a8', 'proposals/0028-version-conversion.md', '4ca5c8876ec115ba814f81456de88d32cc27cb4f0e48df1fa771e0958d108c4a'],
  ['0029-integer-mcp-numbers.md', 'f6ce500cdbe3e051abbf219d1005fca212c87f96', 'proposals/0029-integer-mcp-numbers.md', 'be901a5ad909e9c30ff373928f61aa31bdb4954e23307161e34631ba4bea1127']
];

function checkProposalSnapshots(specificationPath, snapshots) {
  const manifestPath = `${specificationPath}/PROPOSALS.md`;
  const manifest = fs.existsSync(path.join(root, manifestPath)) ? readText(manifestPath) : '';
  if (!manifest) fail(`missing required file: ${manifestPath}`);
  for (const [filename, commit, sourcePath, expectedDigest] of snapshots) {
    const rel = `${specificationPath}/proposal-snapshots/${filename}`;
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      fail(`missing proposal snapshot: ${rel}`);
      continue;
    }
    const digest = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    if (digest !== expectedDigest) fail(`${rel}: SHA-256 differs from recorded proposal revision`);
    for (const provenanceValue of [filename, commit, sourcePath, expectedDigest]) {
      if (!manifest.includes(provenanceValue)) fail(`${manifestPath}: missing provenance value ${provenanceValue}`);
    }
  }
}

checkProposalSnapshots('spec/0.8.0', releasedProposalSnapshots);
if (hasActiveDraft) checkProposalSnapshots(specificationRoot, draftProposalSnapshots);

for (const [filename] of releasedProposalSnapshots) {
  if (filename === '0008-primitive-provenance.md') continue;
  const rel = `proposals/${filename}`;
  if (!fs.existsSync(path.join(root, rel))) {
    fail(`missing implemented proposal record: ${rel}`);
  } else if (!readText(rel).includes('- Status: Implemented')) {
    fail(`${rel}: stable proposal record must have Implemented status`);
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
    if (filename === `${candidate.version}.json` && source !== canonicalizeJsonSource(source)) {
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
    return /(^|[\\/])examples[\\/]/.test(relative)
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
  if (document?.mcpdesc === candidate.version) {
    const diagnostics = validateCandidateDocument(document);
    for (const diagnostic of diagnostics) {
      if (diagnostic.severity === 'error') fail(reportDiagnostic(rel, diagnostic));
      if (diagnostic.severity === 'warning') warn(reportDiagnostic(rel, diagnostic));
    }
  }
}

const fixtureRoot = path.join(root, specificationRoot, 'fixtures');
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
    const semanticDiagnostics = document?.mcpdesc === candidate.version ? validateCandidateDocument(document) : [];
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
    if (expectsWarnings) {
      const fixtureName = path.relative(dir, full).split(path.sep).join('/');
      const expectedCodes = expectedWarningCodesByFixture.get(fixtureName);
      const actualCodes = semanticDiagnostics
        .filter((diagnostic) => diagnostic.severity === 'warning')
        .map((diagnostic) => diagnostic.code)
        .sort();
      if (!expectedCodes) {
        fail(`${rel}: expected-warning fixture has no declared diagnostic-code expectations`);
        continue;
      }
      seenExpectedWarningFixtures.add(fixtureName);
      const sortedExpectedCodes = [...expectedCodes].sort();
      if (JSON.stringify(actualCodes) !== JSON.stringify(sortedExpectedCodes)) {
        fail(`${rel}: expected warning codes ${JSON.stringify(sortedExpectedCodes)}, but got ${JSON.stringify(actualCodes)}`);
        continue;
      }
      expectedFixtureWarnings.push(...semanticWarnings);
      continue;
    }
    for (const fixtureWarning of semanticWarnings) warn(fixtureWarning);
  }
}

for (const fixtureName of expectedWarningCodesByFixture.keys()) {
  if (!seenExpectedWarningFixtures.has(fixtureName)) {
    fail(`${specificationRoot}/fixtures/expected-warning/${fixtureName}: declared warning expectations have no fixture`);
  }
}

if (errors.length) {
  errors.sort();
  console.error(`Repository validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

warnings.sort();
expectedFixtureWarnings.sort();
console.log(`Repository validation passed. Checked ${schemas.size} versioned schema(s).`);
console.log(`Expected warning fixture diagnostics: ${expectedFixtureWarnings.length} across ${seenExpectedWarningFixtures.size} fixture(s).`);
if (process.env.MCPDESC_VERBOSE_EXPECTED_WARNINGS === '1') {
  for (const warning of expectedFixtureWarnings) console.log(`- ${warning}`);
}
if (warnings.length) {
  console.log(`Non-fixture repository warnings (${warnings.length}):`);
  for (const warning of warnings) console.log(`- ${warning}`);
} else {
  console.log('Non-fixture repository warnings: 0.');
}
