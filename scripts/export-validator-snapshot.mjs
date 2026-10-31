#!/usr/bin/env node
// Export an approved specification snapshot for manifest-verified validator intake.
// Usage: node scripts/export-validator-snapshot.mjs <x.y.z|x.y.z-draft.n|x.y.z-rc.n|x.y.z-rev.YYYYMMDD> <output-directory>

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { readDocumentSchemaOwners } from './document-schema-owners.mjs';
import { readRuleSummaries } from './rule-summaries.mjs';

const root = process.cwd();
const selector = process.argv[2];
const outputArgument = process.argv[3];

function die(message) {
  console.error(`export-validator-snapshot: ${message}`);
  process.exit(1);
}

const selectorMatch = /^(\d+\.\d+\.\d+)(?:(?:-(?:draft|rc)\.\d+)|(?:-rev\.\d{8}))?$/.exec(selector ?? '');
if (!selectorMatch) {
  die('selector must use x.y.z, x.y.z-draft.n, x.y.z-rc.n, or x.y.z-rev.YYYYMMDD');
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
const version = selectorMatch[1];
const usesStableArtifacts = selector === version || selector.startsWith(`${version}-rev.`);
const schemaSource = path.join(
  root,
  'schemas',
  'mcp-description',
  `${version}.json`,
);
const fixtureSource = path.join(root, 'spec', usesStableArtifacts ? version : 'draft', 'fixtures');
const projectionFixtureSource = path.join(root, 'spec', usesStableArtifacts ? version : 'draft', 'projection-fixtures');
const projectionFixtureTarget = path.join(output, 'projection-fixtures');
const viewFixtureSource = path.join(root, 'spec', usesStableArtifacts ? version : 'draft', 'view-fixtures');
const viewFixtureTarget = path.join(output, 'view-fixtures');
const conversionSource = path.join(root, 'spec', usesStableArtifacts ? version : 'draft', 'conversion');
const conversionTarget = path.join(output, 'conversion');
const baseSource = path.join(root, 'scripts', 'validator-base.mjs');
for (const [source, label] of [
  [schemaSource, `schema for ${version}`],
  [fixtureSource, `${selector} fixtures`],
  [baseSource, 'candidate semantic base'],
]) {
  if (!fs.existsSync(source)) die(`missing ${label}: ${path.relative(root, source)}`);
}

function replaceRequired(source, search, replacement, label) {
  const first = source.indexOf(search);
  if (first === -1) die(`could not find ${label} in scripts/validate-document.mjs`);
  if (source.indexOf(search, first + search.length) !== -1) {
    die(`found multiple ${label} values in scripts/validate-document.mjs`);
  }
  return source.replace(search, replacement);
}

const semanticSource = fs.readFileSync(
  path.join(root, 'scripts', 'validate-document.mjs'),
  'utf8',
);
let semantic = replaceRequired(
  semanticSource,
  '// Validate documents for the candidate specification version in this working\n// tree by layering current semantics over the shared validator base.',
  `// Validate the immutable ${selector} snapshot using only snapshot-local artifacts.`,
  'working-tree module comment',
);
semantic = replaceRequired(
  semantic,
  `import schema from '../schemas/mcp-description/${version}.json' with { type: 'json' };`,
  "import schema from './schema.json' with { type: 'json' };",
  `canonical ${version} schema import`,
);
semantic = replaceRequired(
  semantic,
  "} from './validator-base.mjs';",
  "} from './base.js';",
  'candidate semantic base import',
);
semantic = replaceRequired(
  semantic,
  "import { documentSchemaOwners } from './document-schema-owners.mjs';",
  `const documentSchemaOwners = ${JSON.stringify(readDocumentSchemaOwners(root))};`,
  'document-schema ownership import',
);
semantic = replaceRequired(
  semantic,
  "import { ruleSummaries } from './rule-summaries.mjs';",
  `const ruleSummaries = ${JSON.stringify(readRuleSummaries(root))};`,
  'rule summaries import',
);
if (semantic.includes('../schemas/') || semantic.includes('validator-base.mjs') || semantic.includes('document-schema-owners.mjs') || semantic.includes('rule-summaries.mjs')) {
  die('semantic validator retains mutable repository imports');
}

fs.mkdirSync(runtimeTarget, { recursive: true });
fs.cpSync(fixtureSource, fixtureTarget, { recursive: true });
// Projection cases reference ../fixtures/, so both folders keep their relative layout.
if (fs.existsSync(projectionFixtureSource)) fs.cpSync(projectionFixtureSource, projectionFixtureTarget, { recursive: true });
if (fs.existsSync(viewFixtureSource)) fs.cpSync(viewFixtureSource, viewFixtureTarget, { recursive: true });
if (fs.existsSync(conversionSource)) {
  fs.cpSync(conversionSource, conversionTarget, { recursive: true });
  // Cases that convert released documents point outside the draft; bundle those sources under fixtures/released/.
  const caseDirectory = path.join(conversionTarget, 'fixtures');
  for (const name of fs.existsSync(caseDirectory) ? fs.readdirSync(caseDirectory).filter((entry) => entry.endsWith('.json')) : []) {
    const casePath = path.join(caseDirectory, name);
    const testCase = JSON.parse(fs.readFileSync(casePath, 'utf8'));
    if (typeof testCase.document !== 'string' || !testCase.document.startsWith('../../../')) continue;
    const released = testCase.document.slice('../../../'.length);
    const releasedSource = path.join(root, 'spec', released);
    if (!fs.existsSync(releasedSource)) die(`missing released conversion source: spec/${released}`);
    fs.mkdirSync(path.dirname(path.join(caseDirectory, 'released', released)), { recursive: true });
    fs.copyFileSync(releasedSource, path.join(caseDirectory, 'released', released));
    testCase.document = `released/${released}`;
    fs.writeFileSync(casePath, `${JSON.stringify(testCase, null, 2)}\n`);
  }
}
fs.copyFileSync(schemaSource, path.join(runtimeTarget, 'schema.json'));
fs.copyFileSync(baseSource, path.join(runtimeTarget, 'base.js'));
fs.writeFileSync(path.join(runtimeTarget, 'semantic.js'), semantic);

const schema = fs.readFileSync(path.join(runtimeTarget, 'schema.json'));
const schemaDigest = createHash('sha256').update(schema).digest('hex');
fs.writeFileSync(
  path.join(runtimeTarget, 'index.js'),
  `import {\n  supportedProtocolVersions,\n  validateDocumentWithResults\n} from './semantic.js';\n\nexport const specification = '${selector}';\nexport const snapshotTag = '${snapshotTag}';\nexport const schemaSha256 = '${schemaDigest}';\nexport { supportedProtocolVersions };\n\nexport function validate(document) {\n  return validateDocumentWithResults(document);\n}\n`,
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
  ...(fs.existsSync(projectionFixtureTarget) ? filesUnder(projectionFixtureTarget, 'projection-fixtures') : []),
  ...(fs.existsSync(viewFixtureTarget) ? filesUnder(viewFixtureTarget, 'view-fixtures') : []),
  ...(fs.existsSync(conversionTarget) ? filesUnder(conversionTarget, 'conversion') : []),
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