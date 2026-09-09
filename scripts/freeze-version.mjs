#!/usr/bin/env node
// Freeze an approved release candidate into an immutable stable-release folder.
//
// STATUS: This generic implementation has not been exercised end to end. Do not
// use it for a release until the next active draft/RC cycle adds fixtures and
// validates its complete diff. It is intentionally not used for v0.8.0.
//
// This script performs mechanical identity and repository-state transitions
// only. Release prose, changelog content, proposal decisions, public status
// pages, tags, and publication remain manual and must be reviewed separately.
//
// Usage:
//   node scripts/freeze-version.mjs <version> <YYYY-MM-DD>
//
// Example:
//   node scripts/freeze-version.mjs 0.9.0 2027-01-15
//
// Do not use this script for v<version>-draft.<iteration> or release-candidate
// snapshot tags.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { assembleSpecification } from './draft-assembly.mjs';

const root = process.cwd();
const [version, releaseDate] = process.argv.slice(2);

function die(message) {
  console.error(`freeze-version: ${message}`);
  process.exit(1);
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  } catch (error) {
    die(`${relativePath}: ${error.message}`);
  }
}

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) die(`could not find ${label}`);
  return source.replace(search, replacement);
}

function replacePatternRequired(source, pattern, replacement, label) {
  if (!pattern.test(source)) die(`could not find ${label}`);
  return source.replace(pattern, replacement);
}

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : [fullPath];
  });
}

if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) die('version must use x.y.z');
if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate ?? '')) die('release date must use YYYY-MM-DD');
const parsedDate = new Date(`${releaseDate}T00:00:00Z`);
if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== releaseDate) {
  die('release date must be a real calendar date');
}

const draftDir = path.join(root, 'spec', 'draft');
const targetDir = path.join(root, 'spec', version);
const schemaRelativePath = `schemas/mcp-description/${version}.json`;
const releaseTag = `v${version}`;
const stableSchemaId = `https://mcpdesc.org/schema/mcp-description/${version}.json`;

if (!fs.existsSync(draftDir)) die('spec/draft does not exist');
if (fs.existsSync(targetDir)) die(`spec/${version} already exists; frozen versions are immutable`);

const status = readJson('specification-status.json');
const draftManifest = readJson('schemas/draft.json');
const latest = readJson('schemas/latest.json');
const schema = readJson(schemaRelativePath);
const draftStatus = status.draft;

if (draftStatus?.version !== version) {
  die(`specification-status.json draft version must be ${version}`);
}
if (draftStatus.status !== 'release-candidate') {
  die('only an approved release-candidate state can be frozen');
}
if (draftStatus.released !== false) {
  die('release candidate must have released: false before freezing');
}
const escapedVersion = version.replaceAll('.', '\\.');
if (!new RegExp(`^v${escapedVersion}-rc\\.\\d+$`).test(draftStatus.snapshotTag ?? '')) {
  die(`invalid release-candidate snapshot tag ${JSON.stringify(draftStatus.snapshotTag)}`);
}
if (draftManifest['mcp-description'] !== version || draftManifest.status !== 'release-candidate') {
  die('schemas/draft.json does not identify the requested release candidate');
}

const prereleaseSchemaId = draftManifest.schemaId;
if (typeof prereleaseSchemaId !== 'string' || prereleaseSchemaId === stableSchemaId) {
  die('schemas/draft.json must contain a distinct prerelease schemaId');
}
if (schema.$id !== prereleaseSchemaId) {
  die(`${schemaRelativePath} $id does not match schemas/draft.json schemaId`);
}

const sectionRelativePath = 'sections/00-front-matter.md';
const sourceFrontMatterPath = path.join(draftDir, sectionRelativePath);
let frontMatter = fs.readFileSync(sourceFrontMatterPath, 'utf8');
frontMatter = replacePatternRequired(frontMatter, /^status: .+$/m, 'status: Stable release', 'front-matter status');
frontMatter = replacePatternRequired(frontMatter, /^release-candidate-iteration: .+\n/m, '', 'release-candidate iteration');
frontMatter = replacePatternRequired(frontMatter, /^snapshot-tag: .+$/m, `release-tag: ${releaseTag}`, 'snapshot tag');
frontMatter = replaceRequired(frontMatter, 'released: false', 'released: true', 'front-matter release state');
frontMatter = replacePatternRequired(frontMatter, /^date: .+$/m, `date: ${releaseDate}`, 'front-matter date');
frontMatter = frontMatter
  .replace(/^baseline-snapshot: .+\n/m, '')
  .replace(/^edition-date: .+\n/m, '')
  .replace(/^edition-tag: .+\n/m, '')
  .replace(/^editorial-base-tag: .+\n/m, '')
  .replace(/^editorial-edition: .+\n/m, '');

fs.cpSync(draftDir, targetDir, { recursive: true });
fs.writeFileSync(path.join(targetDir, sectionRelativePath), frontMatter);

for (const fullPath of filesUnder(targetDir)) {
  if (!/\.(?:json|md|ya?ml)$/.test(fullPath)) continue;
  const source = fs.readFileSync(fullPath, 'utf8');
  if (source.includes(prereleaseSchemaId)) {
    fs.writeFileSync(fullPath, source.replaceAll(prereleaseSchemaId, stableSchemaId));
  }
}

const { content: assembledSpecification } = assembleSpecification(root, version);
fs.writeFileSync(path.join(targetDir, 'mcp-description.md'), assembledSpecification);

schema.$id = stableSchemaId;
schema.description = `MCP Description ${version}.`;
fs.writeFileSync(path.join(root, schemaRelativePath), `${JSON.stringify(schema, null, 2)}\n`);

latest['mcp-description'] = version;
fs.writeFileSync(path.join(root, 'schemas', 'latest.json'), `${JSON.stringify(latest, null, 2)}\n`);

status.stable = {
  version,
  status: 'current-stable-release',
  canonicalSource: 'https://github.com/mcpdesc/mcpdesc-specification',
  path: `spec/${version}`,
  releaseTag,
  releaseDate,
};
delete status.draft;
delete status.editorialEdition;
fs.writeFileSync(path.join(root, 'specification-status.json'), `${JSON.stringify(status, null, 2)}\n`);

fs.rmSync(draftDir, { recursive: true });
fs.rmSync(path.join(root, 'schemas', 'draft.json'));

console.log(`Prepared stable ${version}: froze spec/draft -> spec/${version} and retired active draft state.`);
console.log('');
console.log('UNTESTED RELEASE PATH: review the complete diff before making any further release change.');
console.log('Complete stable-release prose, changelog, proposal decisions, and public status pages, then run:');
console.log(`  npm run release:check -- stable ${version}`);
console.log('  npm test');