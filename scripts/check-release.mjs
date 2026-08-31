#!/usr/bin/env node
// Check release metadata and immutable artifacts without creating tags or publishing.
//
// Usage:
//   node scripts/check-release.mjs draft
//   node scripts/check-release.mjs draft-publication
//   node scripts/check-release.mjs rc
//   node scripts/check-release.mjs rc-publication
//   node scripts/check-release.mjs validator
//   node scripts/check-release.mjs stable 0.8.0
//   node scripts/check-release.mjs all

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  loadDraftSchemaPublicationExpectation,
  verifySchemaPublication
} from './schema-publication.mjs';

const root = process.cwd();
const mode = process.argv[2] ?? 'all';
const requestedVersion = process.argv[3];
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readText(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fail(`missing ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function readJson(rel) {
  const source = readText(rel);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(`${rel}: invalid JSON: ${error.message}`);
    return null;
  }
}

function sha256(rel) {
  return createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');
}

function frontMatter(rel) {
  const source = readText(rel);
  const match = /^---\n([\s\S]*?)\n---/.exec(source);
  if (!match) {
    fail(`${rel}: missing YAML front matter`);
    return {};
  }
  return Object.fromEntries(match[1].split('\n').flatMap((line) => {
    const field = /^([a-z][a-z-]*):\s*(.+)$/.exec(line);
    return field ? [[field[1], field[2]]] : [];
  }));
}

function expectEqual(actual, expected, label) {
  if (actual !== expected) fail(`${label}: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`);
}

function expectIncludes(source, value, label) {
  if (!source.includes(value)) fail(`${label}: missing ${JSON.stringify(value)}`);
}

function checkPrerelease(expectedStatus) {
  const status = readJson('specification-status.json');
  const draft = readJson('schemas/draft.json');
  const section = frontMatter('spec/draft/sections/00-front-matter.md');
  const assembled = frontMatter('spec/draft/mcp-description.md');
  if (!status?.draft || !draft) return;

  const { version, status: prereleaseStatus, iteration, snapshotTag, snapshotDate, baselineTag } = status.draft;
  expectEqual(prereleaseStatus, expectedStatus, 'specification-status.json draft status');
  const iterationText = String(iteration);
  const isReleaseCandidate = prereleaseStatus === 'release-candidate';
  const expectedTag = `v${version}-${isReleaseCandidate ? 'rc' : 'draft'}.${iteration}`;
  expectEqual(snapshotTag, expectedTag, 'specification-status.json draft snapshotTag');
  expectEqual(status.draft.released, false, 'specification-status.json draft released');
  expectEqual(draft['mcp-description'], version, 'schemas/draft.json mcp-description');
  expectEqual(draft.iteration, iteration, 'schemas/draft.json iteration');
  expectEqual(draft.snapshotTag, snapshotTag, 'schemas/draft.json snapshotTag');
  expectEqual(draft.snapshotDate, snapshotDate, 'schemas/draft.json snapshotDate');
  expectEqual(draft.released, false, 'schemas/draft.json released');
  expectEqual(draft.status, prereleaseStatus, 'schemas/draft.json status');
  if (isReleaseCandidate) expectEqual(draft.baselineTag, baselineTag, 'schemas/draft.json baselineTag');

  for (const [label, metadata] of [
    ['spec/draft/sections/00-front-matter.md', section],
    ['spec/draft/mcp-description.md', assembled]
  ]) {
    expectEqual(metadata.version, version, `${label} version`);
    const iterationField = isReleaseCandidate ? 'release-candidate-iteration' : 'draft-iteration';
    expectEqual(metadata[iterationField], iterationText, `${label} ${iterationField}`);
    expectEqual(metadata['snapshot-tag'], snapshotTag, `${label} snapshot-tag`);
    expectEqual(metadata.released, 'false', `${label} released`);
    expectEqual(metadata.date, snapshotDate, `${label} date`);
  }

  const statusLabel = isReleaseCandidate ? `Release Candidate ${iteration}` : `Community Working Draft ${iteration}`;
  const releaseLabel = isReleaseCandidate ? 'prerelease' : 'unreleased';
  expectIncludes(readText('README.md'), `${statusLabel} (\`${snapshotTag}\`; ${releaseLabel})`, 'README.md');
  expectIncludes(readText('spec/README.md'), `${statusLabel} (\`${snapshotTag}\`; ${releaseLabel})`, 'spec/README.md');
  expectIncludes(readText('GOVERNANCE.md'), `${statusLabel} (\`${snapshotTag}\`; ${releaseLabel})`, 'GOVERNANCE.md');
  const baselineIteration = isReleaseCandidate ? Number(/-draft\.(\d+)$/.exec(baselineTag ?? '')?.[1]) : iteration;
  expectIncludes(readText('spec/draft/PROPOSALS.md'), `MCP Description ${version} Draft ${baselineIteration}`, 'spec/draft/PROPOSALS.md');
  expectIncludes(readText('spec/draft/CHANGELOG.md'), `${statusLabel} — ${snapshotDate} (\`${snapshotTag}\`)`, 'spec/draft/CHANGELOG.md');
  console.log(`Checked ${statusLabel.toLowerCase()} for ${version} (${snapshotTag}).`);
}

async function checkDraftPublication() {
  let expectation;
  try {
    expectation = loadDraftSchemaPublicationExpectation(root);
  } catch (error) {
    fail(`draft publication setup failed: ${error.message}`);
    return;
  }

  for (const message of expectation.localErrors) fail(`draft publication: ${message}`);
  if (expectation.localErrors.length > 0) return;

  let result;
  try {
    result = await verifySchemaPublication(expectation);
  } catch (error) {
    fail(`draft publication fetch failed: ${error.message}`);
    return;
  }

  for (const message of result.errors) fail(`draft publication: ${message}`);
  for (const message of result.warnings) warn(`draft publication: ${message}`);
  if (result.errors.length === 0) {
    console.log(`Checked draft publication ${expectation.requestedUrl} (${result.observed.actualDigest}).`);
  }
}

function checkValidator() {
  const packageJson = readJson('packages/validator/package.json');
  const lock = readJson('package-lock.json');
  if (!packageJson || !lock) return;
  expectEqual(lock.packages?.['packages/validator']?.version, packageJson.version, 'package-lock.json validator version');

  const snapshotRoot = path.join(root, 'packages/validator/src/snapshots');
  const selectors = fs.readdirSync(snapshotRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const runtimeIndex = readText('packages/validator/src/index.js');
  const declarations = readText('packages/validator/index.d.ts');
  const packageReadme = readText('packages/validator/README.md');

  expectIncludes(packageReadme, `Version \`${packageJson.version}\``, 'packages/validator/README.md');
  for (const selector of selectors) {
    const base = `packages/validator/src/snapshots/${selector}`;
    const index = readText(`${base}/index.js`);
    const metadataSelector = /export const specification = '([^']+)'/.exec(index)?.[1];
    const snapshotTag = /export const snapshotTag = '([^']+)'/.exec(index)?.[1];
    const recordedDigest = /export const schemaSha256 = '([a-f0-9]{64})'/.exec(index)?.[1];
    expectEqual(metadataSelector, selector, `${base}/index.js specification`);
    expectEqual(snapshotTag, `v${selector}`, `${base}/index.js snapshotTag`);
    if (!recordedDigest) {
      fail(`${base}/index.js: missing or malformed schemaSha256 export`);
    } else {
      expectEqual(recordedDigest, sha256(`${base}/schema.json`), `${base}/index.js schemaSha256`);
    }
    expectIncludes(runtimeIndex, `./snapshots/${selector}/index.js`, 'packages/validator/src/index.js');
    expectIncludes(declarations, `'${selector}'`, 'packages/validator/index.d.ts');
    expectIncludes(packageReadme, `| \`${selector}\` | \`${snapshotTag}\` | \`${recordedDigest}\` |`, 'packages/validator/README.md');
    if (!fs.existsSync(path.join(root, `packages/validator/test/snapshots/${selector}/fixtures`))) {
      fail(`missing frozen fixtures for ${selector}`);
    }
  }

  try {
    execFileSync(process.execPath, ['packages/validator/scripts/check-package.mjs'], { cwd: root, stdio: 'inherit' });
  } catch {
    fail('validator package tarball check failed');
  }
  console.log(`Checked validator ${packageJson.version} with ${selectors.length} immutable selector(s).`);
}

function checkStable() {
  if (!requestedVersion || !/^\d+\.\d+\.\d+$/.test(requestedVersion)) {
    fail('stable mode requires an x.y.z version argument');
    return;
  }
  const status = readJson('specification-status.json');
  const latest = readJson('schemas/latest.json');
  expectEqual(status?.stable?.version, requestedVersion, 'specification-status.json stable version');
  expectEqual(latest?.['mcp-description'], requestedVersion, 'schemas/latest.json mcp-description');
  readText(`schemas/mcp-description/${requestedVersion}.json`);
  readText(`spec/${requestedVersion}/mcp-description.md`);
  expectIncludes(readText('README.md'), `| ${requestedVersion} | Current stable release |`, 'README.md');
  expectIncludes(readText('spec/README.md'), `| ${requestedVersion} | Current stable release |`, 'spec/README.md');
  if (fs.existsSync(path.join(root, 'schemas/draft.json'))) {
    const draft = readJson('schemas/draft.json');
    if (draft?.['mcp-description'] === requestedVersion) {
      fail('schemas/draft.json must be retired or reinitialized for a later draft');
    }
  }
  console.log(`Checked stable release ${requestedVersion}.`);
}

async function main() {
  if (!['all', 'draft', 'draft-publication', 'rc', 'rc-publication', 'validator', 'stable'].includes(mode)) {
    fail(`unknown mode ${JSON.stringify(mode)}; expected all, draft, draft-publication, rc, rc-publication, validator, or stable`);
  } else {
    if (mode === 'draft') checkPrerelease('community-working-draft');
    if (mode === 'rc') checkPrerelease('release-candidate');
    if (mode === 'all') checkPrerelease(readJson('specification-status.json')?.draft?.status);
    if (mode === 'draft-publication' || mode === 'rc-publication') await checkDraftPublication();
    if (mode === 'all' || mode === 'validator') checkValidator();
    if (mode === 'stable') checkStable();
  }

  if (warnings.length > 0) {
    console.warn(`Release checks warnings (${warnings.length}):`);
    for (const warning of warnings) console.warn(`- ${warning}`);
  }

  if (errors.length > 0) {
    console.error(`Release checks failed (${errors.length}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('Release checks passed.');
  }
}

await main();