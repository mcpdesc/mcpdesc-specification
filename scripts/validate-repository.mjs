// Validate the repository as a synchronized specification distribution.
//
// This executable checks required files and lifecycle invariants, compiles each
// versioned JSON Schema with its declared dialect, validates draft examples and
// fixtures, runs the v0.8.0 semantic rules, and detects assembled-spec drift.
// It is the repository-validation half of `npm test`; projection and merge
// behavior is exercised separately by `scripts/test-views.mjs`.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import YAML from 'yaml';
import { semanticValidateDocument } from './validate-0.8.mjs';

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
    const document = /\.json$/i.test(full) ? JSON.parse(text) : YAML.parse(text);
    return { rel, document };
  } catch (error) {
    return { rel, parseError: `${rel}: cannot parse document: ${error.message}` };
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
  const assembledFromSections = fs.readdirSync(sectionDir)
    .filter((filename) => /^\d{2}-.+\.md$/.test(filename))
    .sort()
    .map((filename) => fs.readFileSync(path.join(sectionDir, filename), 'utf8').trimEnd())
    .join('\n\n')
    .replaceAll('../../implementations.md', '../implementations.md');
  if (readText('spec/draft/mcp-description.md').trimEnd() !== assembledFromSections) {
    fail('spec/draft/mcp-description.md: assembled specification is out of sync with spec/draft/sections');
  }
}

const status = readJson('specification-status.json');
const latest = readJson('schemas/latest.json');
if (status && status.stable?.version !== '0.7.0') fail('stable status must remain 0.7.0 during bootstrap');
if (status && status.draft?.version !== '0.8.0') fail('draft status must identify 0.8.0');
if (status && status.draft?.released !== false) fail('v0.8.0 must remain unreleased during bootstrap');
if (latest && latest['mcp-description'] !== '0.7.0') fail('schemas/latest.json must remain on 0.7.0 until release');

if (fs.existsSync(path.join(root, 'schemas/draft.json'))) {
  const draft = readJson('schemas/draft.json');
  if (draft && draft['mcp-description'] !== '0.8.0') fail('schemas/draft.json must identify draft 0.8.0');
  if (draft && draft.released !== false) fail('schemas/draft.json must remain unreleased while v0.8.0 is a draft');
  if (draft && draft.branch !== 'experiment/0.8.0-draft-implementation') fail('schemas/draft.json must record the current experimental implementation branch');
  if (draft && draft.$id !== 'https://mcpdesc.org/schema/0.8.0.json') fail('schemas/draft.json must record the canonical 0.8.0 schema $id');
  if (draft && latest && draft['mcp-description'] === latest['mcp-description']) fail('schemas/draft.json must not equal the released schemas/latest.json version');
}

const schemaDir = path.join(root, 'schemas', 'mcp-description');
const schemas = new Map();
if (fs.existsSync(schemaDir)) {
  for (const filename of fs.readdirSync(schemaDir).filter((name) => /^\d+\.\d+\.\d+\.json$/.test(name))) {
    const rel = path.posix.join('schemas/mcp-description', filename);
    const schema = readJson(rel);
    if (!schema) continue;
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
  (file) => /(^|[\\/])examples[\\/]/.test(path.relative(specRoot, file)) && /\.(json|ya?ml)$/i.test(file)
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
    const diagnostics = semanticValidateDocument(document, rel);
    for (const diagnostic of diagnostics) {
      if (diagnostic.level === 'error') fail(diagnostic.message);
      if (diagnostic.level === 'warning') warn(diagnostic.message);
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
    const semanticDiagnostics = document?.mcpdesc === '0.8.0' ? semanticValidateDocument(document, rel) : [];
    const semanticErrors = semanticDiagnostics.filter((diagnostic) => diagnostic.level === 'error').map((diagnostic) => diagnostic.message);
    const semanticWarnings = semanticDiagnostics.filter((diagnostic) => diagnostic.level === 'warning').map((diagnostic) => diagnostic.message);
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
