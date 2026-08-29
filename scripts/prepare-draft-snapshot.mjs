#!/usr/bin/env node
// Prepare mechanically derived metadata for a draft snapshot.
// Prose, proposal provenance, changelog content, tags, and publication remain manual.
//
// Usage: node scripts/prepare-draft-snapshot.mjs <iteration> <YYYY-MM-DD>

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

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
if (iteration <= previousIteration) die(`iteration must be greater than current iteration ${previousIteration}`);

const previousTag = `v${version}-draft.${previousIteration}`;
const snapshotTag = `v${version}-draft.${iteration}`;
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

status.draft = { ...status.draft, iteration, snapshotTag, snapshotDate: date, released: false };
draft.iteration = iteration;
draft.snapshotTag = snapshotTag;
draft.snapshotDate = date;
draft.released = false;
draft.note = `${snapshotTag} identifies Community Working Draft ${iteration}, not a stable release or a distinct mcpdesc conformance version. schemas/latest.json remains pinned to the stable ${status.stable.version} release.`;

fs.writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`);
fs.writeFileSync(draftPath, `${JSON.stringify(draft, null, 2)}\n`);
fs.writeFileSync(sectionPath, section);

execFileSync(process.execPath, ['scripts/assemble-draft.mjs'], { cwd: root, stdio: 'inherit' });
console.log('Draft metadata prepared. Update README/status prose, PROPOSALS.md, and CHANGELOG.md, then run:');
console.log('  npm run release:check -- draft');
console.log('  npm test');
console.log('Before tagging a public Draft 4-or-later snapshot whose canonical schema URL is live, also run:');
console.log('  npm run release:check -- draft-publication');