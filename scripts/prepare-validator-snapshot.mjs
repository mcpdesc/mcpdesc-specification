#!/usr/bin/env node
// Freeze current prerelease validator inputs into a new immutable sibling snapshot.
// Registry, declarations, package version, tests, tags, and publication remain manual.
//
// Usage: node scripts/prepare-validator-snapshot.mjs <x.y.z-draft.n|x.y.z-rc.n>

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const selector = process.argv[2];

function die(message) {
  console.error(`prepare-validator-snapshot: ${message}`);
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+-(?:draft|rc)\.\d+$/.test(selector ?? '')) die('selector must use x.y.z-draft.n or x.y.z-rc.n');

const runtimeRoot = path.join(root, 'packages', 'validator', 'src', 'snapshots');
const testRoot = path.join(root, 'packages', 'validator', 'test', 'snapshots');
const runtimeTarget = path.join(runtimeRoot, selector);
const testTarget = path.join(testRoot, selector);
if (fs.existsSync(runtimeTarget) || fs.existsSync(testTarget)) die(`${selector} already exists; snapshots are immutable`);

const version = selector.split(/-(?:draft|rc)\./)[0];
const previousSelectors = fs.readdirSync(runtimeRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && new RegExp(`^${version.replaceAll('.', '\\.')}-(?:draft|rc)\\.\\d+$`).test(entry.name))
  .map((entry) => entry.name)
  .sort((left, right) => {
    const stageDifference = Number(left.includes('-rc.')) - Number(right.includes('-rc.'));
    return stageDifference || Number(left.split('.').at(-1)) - Number(right.split('.').at(-1));
  });
const previous = previousSelectors.at(-1);
if (!previous) die(`no previous ${version} validator snapshot found`);

const baseCandidate = path.join(runtimeRoot, previous, 'base.js');
const baseSource = fs.existsSync(baseCandidate) ? baseCandidate : path.join(runtimeRoot, previous, 'semantic.js');
const schemaSource = path.join(root, 'schemas', 'mcp-description', `${version}.json`);
const fixtureSource = path.join(root, 'spec', 'draft', 'fixtures');
for (const [source, label] of [
  [baseSource, `base semantics from ${previous}`],
  [schemaSource, `schema for ${version}`],
  [fixtureSource, 'draft fixtures']
]) {
  if (!fs.existsSync(source)) die(`missing ${label}: ${path.relative(root, source)}`);
}

function replaceRequired(source, search, replacement, label) {
  const first = source.indexOf(search);
  if (first === -1) die(`could not find ${label} in scripts/validate-0.8.mjs`);
  if (source.indexOf(search, first + search.length) !== -1) die(`found multiple ${label} values in scripts/validate-0.8.mjs`);
  return source.replace(search, replacement);
}

const semanticSource = fs.readFileSync(path.join(root, 'scripts', 'validate-0.8.mjs'), 'utf8');
let semantic = replaceRequired(
  semanticSource,
  '// Validate the current 0.8.0 working tree by layering draft additions over\n// immutable snapshot base semantics.',
  `// Validate the immutable ${selector} snapshot using only snapshot-local artifacts.`,
  'working-tree module comment'
);
semantic = replaceRequired(
  semantic,
  "import schema from '../schemas/mcp-description/0.8.0.json' with { type: 'json' };",
  "import schema from './schema.json' with { type: 'json' };",
  'canonical schema import'
);
semantic = replaceRequired(
  semantic,
  "} from '../packages/validator/src/internal.js';",
  "} from './base.js';",
  'base semantics import'
);
if (semantic.includes("../schemas/") || semantic.includes("../packages/")) die('semantic validator retains mutable repository imports');

fs.mkdirSync(runtimeTarget, { recursive: true });
fs.mkdirSync(testTarget, { recursive: true });
fs.copyFileSync(schemaSource, path.join(runtimeTarget, 'schema.json'));
fs.copyFileSync(baseSource, path.join(runtimeTarget, 'base.js'));
fs.writeFileSync(path.join(runtimeTarget, 'semantic.js'), semantic);

const schema = fs.readFileSync(path.join(runtimeTarget, 'schema.json'));
const digest = createHash('sha256').update(schema).digest('hex');
fs.writeFileSync(path.join(runtimeTarget, 'index.js'), `import {\n  supportedProtocolVersions,\n  validateMcpdesc08Document\n} from './semantic.js';\n\nexport const specification = '${selector}';\nexport const snapshotTag = 'v${selector}';\nexport const schemaSha256 = '${digest}';\nexport { supportedProtocolVersions };\n\nexport function validate(document) {\n  const diagnostics = validateMcpdesc08Document(document);\n  return {\n    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),\n    diagnostics\n  };\n}\n`);

fs.cpSync(fixtureSource, path.join(testTarget, 'fixtures'), { recursive: true });
fs.writeFileSync(path.join(testTarget, 'README.md'), `# Validator fixture snapshot: ${selector}\n\nThe \`fixtures/\` tree is a byte-for-byte copy of the fixture corpus associated with the immutable \`v${selector}\` specification snapshot. Validator package tests use this copy so later work in \`spec/draft/fixtures/\` cannot change this snapshot's coverage or expectations.\n`);

console.log(`Prepared ${selector} from current schema and fixtures.`);
console.log(`Schema SHA-256: ${digest}`);
console.log('Register the selector and update declarations, tests, package checks, version, and documentation. Then run:');
console.log('  npm run release:check -- validator');
console.log('  npm test');