#!/usr/bin/env node
// Prepare mechanically derived metadata for a draft snapshot.
// Prose, proposal provenance, changelog content, tags, and publication remain manual.
//
// Usage: node scripts/prepare-draft-snapshot.mjs <iteration> <YYYY-MM-DD>

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { formatCanonicalJson } from './canonical-json.mjs';

const root = process.cwd();
const iteration = Number(process.argv[2]);
const date = process.argv[3];

function die(message) {
  console.error(`prepare-draft-snapshot: ${message}`);
  process.exit(1);
}

if (!Number.isInteger(iteration) || iteration < 1) die('iteration must be a positive integer');
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) die('date must use YYYY-MM-DD');
const parsedDate = new Date(`${date}T00:00:00Z`);
if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date) die('date must be a real calendar date');

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) die(`could not find current ${label} in 00-front-matter.md`);
  return source.replaceAll(search, replacement);
}

const statusPath = path.join(root, 'specification-status.json');
const draftPath = path.join(root, 'schemas', 'draft.json');
const sectionPath = path.join(root, 'spec', 'draft', 'sections', '00-front-matter.md');
const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
const previousIteration = status.draft?.iteration;
const previousDate = status.draft?.snapshotDate;
const version = status.draft?.version;
if (!version || !Number.isInteger(previousIteration)) die('invalid draft status in specification-status.json');

const previousTag = `v${version}-draft.${previousIteration}`;
const snapshotTag = `v${version}-draft.${iteration}`;
const previousTagPublished = execFileSync('git', ['tag', '--list', previousTag], { cwd: root, encoding: 'utf8' }).trim() !== '';
if (iteration < previousIteration || (iteration === previousIteration && previousTagPublished)) {
  die(`iteration must be greater than published iteration ${previousIteration}, or equal to it while ${previousTag} is untagged`);
}
let section = fs.readFileSync(sectionPath, 'utf8');
for (const [search, replacement, label] of [
  [`status: Community working draft ${previousIteration}`, `status: Community working draft ${iteration}`, 'status'],
  [`draft-iteration: ${previousIteration}`, `draft-iteration: ${iteration}`, 'iteration'],
  [`snapshot-tag: ${previousTag}`, `snapshot-tag: ${snapshotTag}`, 'snapshot tag'],
  [`date: ${previousDate}`, `date: ${date}`, 'front-matter date'],
  [`community working draft ${previousIteration}`, `community working draft ${iteration}`, 'lowercase status prose'],
  [`Community working draft ${previousIteration}`, `Community working draft ${iteration}`, 'status prose'],
  [`Community Working Draft ${previousIteration}`, `Community Working Draft ${iteration}`, 'title-case status prose'],
  [previousTag, snapshotTag, 'snapshot-tag prose'],
  [`**Date**: ${previousDate}`, `**Date**: ${date}`, 'display date']
]) {
  section = replaceRequired(section, search, replacement, label);
}

// A new snapshot supersedes a release-candidate editorial edition, not the stable release's.
if (status.editorialEdition?.target !== 'stable') delete status.editorialEdition;
status.draft = { ...status.draft, iteration, snapshotTag, snapshotDate: date, released: false };
const previousSchemaId = draft.schemaId;
const schemaId = `https://mcpdesc.org/schema/mcp-description/${snapshotTag.slice(1)}.json`;
const schemaPath = path.join(root, draft.schema ?? `schemas/mcp-description/${version}.json`);
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
if (previousSchemaId && schema.$id !== previousSchemaId) die(`${path.relative(root, schemaPath)} $id does not match schemas/draft.json schemaId`);
schema.$id = schemaId;
draft.schemaId = schemaId;
draft.iteration = iteration;
draft.snapshotTag = snapshotTag;
draft.snapshotDate = date;
draft.released = false;
draft.note = `${snapshotTag} identifies Community Working Draft ${iteration}, not a stable release or a distinct mcpdesc conformance version. schemas/latest.json remains pinned to the stable ${status.stable.version} release.`;

fs.writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`);
fs.writeFileSync(draftPath, `${JSON.stringify(draft, null, 2)}\n`);
fs.writeFileSync(schemaPath, formatCanonicalJson(schema));
fs.writeFileSync(sectionPath, section);

if (previousSchemaId && previousSchemaId !== schemaId) {
  const pending = ['examples', 'fixtures', 'projection-fixtures', 'conversion', 'serialization-fixtures', 'guides', 'sections']
    .map((directory) => path.join(root, 'spec', 'draft', directory))
    .filter((directory) => fs.existsSync(directory));
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

execFileSync(process.execPath, ['scripts/assemble-draft.mjs'], { cwd: root, stdio: 'inherit' });
console.log('Draft metadata prepared. Update README/status prose, PROPOSALS.md, and CHANGELOG.md, then run:');
console.log('  npm run release:check -- draft');
console.log('  npm test');
console.log('Before tagging a public Draft 4-or-later snapshot whose canonical schema URL is live, also run:');
console.log('  npm run release:check -- draft-publication');