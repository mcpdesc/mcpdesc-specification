#!/usr/bin/env node
// Prepare mechanically derived metadata for an MCP Description release candidate.
// Prose, proposal decisions, changelog content, tags, and publication remain manual.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const iteration = Number(process.argv[2]);
const date = process.argv[3];

function die(message) {
  console.error(`prepare-release-candidate: ${message}`);
  process.exit(1);
}

if (!Number.isInteger(iteration) || iteration < 1) die('iteration must be a positive integer');
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) die('date must use YYYY-MM-DD');
const parsedDate = new Date(`${date}T00:00:00Z`);
if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date) die('date must be a real calendar date');

const statusPath = path.join(root, 'specification-status.json');
const manifestPath = path.join(root, 'schemas', 'draft.json');
const sectionPath = path.join(root, 'spec', 'draft', 'sections', '00-front-matter.md');
const schemaPath = path.join(root, 'schemas', 'mcp-description', '0.8.0.json');
const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const previous = status.draft;
const version = previous?.version;
if (!version || !Number.isInteger(previous.iteration)) die('invalid prerelease status in specification-status.json');
if (previous.status === 'release-candidate' && iteration <= previous.iteration) {
  die(`iteration must be greater than current release candidate ${previous.iteration}`);
}

const baselineTag = previous.status === 'release-candidate' ? previous.baselineTag : previous.snapshotTag;
if (!/^v\d+\.\d+\.\d+-draft\.\d+$/.test(baselineTag ?? '')) die('release candidate requires a draft snapshot baseline tag');
const snapshotTag = `v${version}-rc.${iteration}`;
const schemaId = `https://mcpdesc.org/schema/mcp-description/${snapshotTag.slice(1)}.json`;
const previousSchemaId = manifest.schemaId;

status.draft = { ...previous, status: 'release-candidate', iteration, snapshotTag, snapshotDate: date, baselineTag, branch: `release/${version}-rc.${iteration}`, released: false };
Object.assign(manifest, {
  status: 'release-candidate', iteration, snapshotTag, snapshotDate: date, baselineTag,
  released: false, branch: `release/${version}-rc.${iteration}`, schemaId,
  note: `${snapshotTag} identifies Release Candidate ${iteration} based on ${baselineTag}, not a stable release or a distinct mcpdesc conformance version. schemas/latest.json remains pinned to the stable ${status.stable.version} release.`
});
schema.$id = schemaId;
schema.description = `MCP Description ${version} Release Candidate ${iteration} (${snapshotTag}; prerelease).`;

let section = fs.readFileSync(sectionPath, 'utf8');
section = section
  .replace(/^status: .+$/m, `status: Release candidate ${iteration}`)
  .replace(/^(?:draft|release-candidate)-iteration: \d+$/m, `release-candidate-iteration: ${iteration}`)
  .replace(/^snapshot-tag: .+$/m, `snapshot-tag: ${snapshotTag}`)
  .replace(/^date: \d{4}-\d{2}-\d{2}$/m, `date: ${date}`);
if (section.includes('baseline-snapshot:')) section = section.replace(/^baseline-snapshot: .+$/m, `baseline-snapshot: ${baselineTag}`);
else section = section.replace(/^baseline: .+$/m, (line) => `${line}\nbaseline-snapshot: ${baselineTag}`);

for (const directory of ['examples', 'fixtures', 'guides', 'sections']) {
  const pending = [path.join(root, 'spec', 'draft', directory)];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(target);
      else if (/\.(?:json|md|ya?ml)$/.test(entry.name)) {
        const source = fs.readFileSync(target, 'utf8');
        if (source.includes(previousSchemaId)) fs.writeFileSync(target, source.replaceAll(previousSchemaId, schemaId));
      }
    }
  }
}

fs.writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
fs.writeFileSync(sectionPath, section);
execFileSync(process.execPath, ['scripts/assemble-draft.mjs'], { cwd: root, stdio: 'inherit' });
console.log('Release-candidate metadata prepared. Complete release prose and proposal decisions, then run npm run release:check -- rc and npm test.');
console.log('Before tagging, publish the exact schema bytes and run npm run release:check -- rc-publication.');