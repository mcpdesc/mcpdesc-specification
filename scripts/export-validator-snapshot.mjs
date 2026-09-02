#!/usr/bin/env node
// Export an approved specification snapshot for manifest-verified validator intake.
// Usage: node scripts/export-validator-snapshot.mjs <x.y.z-draft.n|x.y.z-rc.n> <output-directory>

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const selector = process.argv[2];
const outputArgument = process.argv[3];

function die(message) {
  console.error(`export-validator-snapshot: ${message}`);
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+-(?:draft|rc)\.\d+$/.test(selector ?? '')) {
  die('selector must use x.y.z-draft.n or x.y.z-rc.n');
}
if (!outputArgument) die('output directory is required');

const snapshotTag = `v${selector}`;
const head = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
let taggedCommit;
try {
  taggedCommit = execFileSync('git', ['rev-parse', `${snapshotTag}^{commit}`], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  die(`missing approved specification tag ${snapshotTag}`);
}
if (taggedCommit !== head) die(`${snapshotTag} does not identify HEAD`);
if (
  execFileSync('git', ['status', '--porcelain'], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
) {
  die('worktree must be clean');
}

const output = path.resolve(outputArgument);
if (fs.existsSync(output)) die(`output already exists: ${output}`);
const runtimeTarget = path.join(output, 'runtime');
const fixtureTarget = path.join(output, 'fixtures');
const version = selector.split(/-(?:draft|rc)\./)[0];
const schemaSource = path.join(
  root,
  'schemas',
  'mcp-description',
  `${version}.json`,
);
const fixtureSource = path.join(root, 'spec', 'draft', 'fixtures');
const baseSource = path.join(root, 'scripts', 'validator-base.mjs');
for (const [source, label] of [
  [schemaSource, `schema for ${version}`],
  [fixtureSource, 'draft fixtures'],
  [baseSource, 'candidate semantic base'],
]) {
  if (!fs.existsSync(source)) die(`missing ${label}: ${path.relative(root, source)}`);
}

function replaceRequired(source, search, replacement, label) {
  const first = source.indexOf(search);
  if (first === -1) die(`could not find ${label} in scripts/validate-0.8.mjs`);
  if (source.indexOf(search, first + search.length) !== -1) {
    die(`found multiple ${label} values in scripts/validate-0.8.mjs`);
  }
  return source.replace(search, replacement);
}

const semanticSource = fs.readFileSync(
  path.join(root, 'scripts', 'validate-0.8.mjs'),
  'utf8',
);
let semantic = replaceRequired(
  semanticSource,
  '// Validate the current 0.8.0 working tree by layering draft additions over\n// immutable snapshot base semantics.',
  `// Validate the immutable ${selector} snapshot using only snapshot-local artifacts.`,
  'working-tree module comment',
);
semantic = replaceRequired(
  semantic,
  "import schema from '../schemas/mcp-description/0.8.0.json' with { type: 'json' };",
  "import schema from './schema.json' with { type: 'json' };",
  'canonical schema import',
);
semantic = replaceRequired(
  semantic,
  "} from './validator-base.mjs';",
  "} from './base.js';",
  'candidate semantic base import',
);
if (semantic.includes('../schemas/') || semantic.includes('validator-base.mjs')) {
  die('semantic validator retains mutable repository imports');
}

fs.mkdirSync(runtimeTarget, { recursive: true });
fs.cpSync(fixtureSource, fixtureTarget, { recursive: true });
fs.copyFileSync(schemaSource, path.join(runtimeTarget, 'schema.json'));
fs.copyFileSync(baseSource, path.join(runtimeTarget, 'base.js'));
fs.writeFileSync(path.join(runtimeTarget, 'semantic.js'), semantic);

const schema = fs.readFileSync(path.join(runtimeTarget, 'schema.json'));
const schemaDigest = createHash('sha256').update(schema).digest('hex');
fs.writeFileSync(
  path.join(runtimeTarget, 'index.js'),
  `import {\n  supportedProtocolVersions,\n  validateMcpdesc08Document\n} from './semantic.js';\n\nexport const specification = '${selector}';\nexport const snapshotTag = '${snapshotTag}';\nexport const schemaSha256 = '${schemaDigest}';\nexport { supportedProtocolVersions };\n\nexport function validate(document) {\n  const diagnostics = validateMcpdesc08Document(document);\n  return {\n    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),\n    diagnostics\n  };\n}\n`,
);

function filesUnder(directory, prefix) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(prefix, entry.name);
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? filesUnder(fullPath, relativePath)
      : [relativePath];
  });
}

const files = [
  ...filesUnder(runtimeTarget, 'runtime'),
  ...filesUnder(fixtureTarget, 'fixtures'),
]
  .sort()
  .map((relativePath) => ({
    path: relativePath,
    sha256: createHash('sha256')
      .update(fs.readFileSync(path.join(output, relativePath)))
      .digest('hex'),
  }));
const manifest = {
  formatVersion: 1,
  selector,
  snapshotTag,
  source: {
    repository: 'https://github.com/mcpdesc/mcpdesc-specification',
    commit: head,
  },
  files,
};
fs.writeFileSync(
  path.join(output, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(`Exported ${selector} from ${head} (${files.length} files).`);
console.log(`Schema SHA-256: ${schemaDigest}`);
console.log(
  'Import and review this bundle in mcpdesc/core with the validator-snapshot-intake workflow.',
);