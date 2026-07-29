import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

// The stable v0.7.0 schema and its predecessors are authored against JSON Schema
// draft-07 and must be preserved verbatim. Future 0.8.0 draft schemas are
// expected to target JSON Schema 2020-12. Meta-validate and compile each schema
// against the dialect it actually declares in `$schema`.
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
  'spec/draft/mcp-description.md'
];

function fail(message) {
  errors.push(message);
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

for (const rel of requiredFiles) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing required file: ${rel}`);
}

for (const rel of ['ORIGIN.md', 'README.md', 'NOTICE']) {
  if (fs.existsSync(path.join(root, rel)) && /<UPSTREAM_|<IMPORT_DATE>|<[^>]+>/.test(readText(rel))) {
    fail(`${rel}: unresolved placeholder found`);
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

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

// Example documents live under any version folder's `examples/` directory,
// e.g. `spec/draft/examples/` or a frozen `spec/<x.y.z>/examples/`.
const specRoot = path.join(root, 'spec');
const exampleFiles = walk(specRoot).filter(
  (file) => /(^|[\\/])examples[\\/]/.test(path.relative(specRoot, file)) && /\.(json|ya?ml)$/i.test(file)
);
for (const full of exampleFiles) {
  const rel = path.relative(root, full);
  let document;
  try {
    const text = fs.readFileSync(full, 'utf8');
    document = /\.json$/i.test(full) ? JSON.parse(text) : YAML.parse(text);
  } catch (error) {
    fail(`${rel}: cannot parse example: ${error.message}`);
    continue;
  }
  const version = String(document?.mcpdesc ?? '');
  if (!version) {
    fail(`${rel}: missing mcpdesc version`);
    continue;
  }
  const validate = schemas.get(version);
  if (!validate) {
    fail(`${rel}: no versioned schema found for mcpdesc ${version}`);
    continue;
  }
  if (!validate(document)) {
    fail(`${rel}: does not validate against ${version}: ${validate.errors ? validate.errors.map((e) => `${e.instancePath} ${e.message}`).join('; ') : 'unknown error'}`);
  }
}

if (errors.length) {
  console.error(`Repository validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Repository validation passed. Checked ${schemas.size} versioned schema(s).`);
