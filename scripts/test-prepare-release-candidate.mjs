import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mcpdesc-rc-prepare-'));
const copy = (relative) => {
  const destination = path.join(temporaryRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(path.join(root, relative), destination, { recursive: true });
};
const read = (relative) => fs.readFileSync(path.join(temporaryRoot, relative), 'utf8');
const prepare = (iteration, date) => execFileSync(
  process.execPath,
  ['scripts/prepare-release-candidate.mjs', String(iteration), date],
  { cwd: temporaryRoot, stdio: 'pipe' }
);

try {
  for (const relative of [
    'specification-status.json',
    'schemas/draft.json',
    'schemas/mcp-description',
    'spec/draft',
    'scripts/prepare-release-candidate.mjs',
    'scripts/canonical-json.mjs',
    'scripts/assemble-draft.mjs',
    'scripts/draft-assembly.mjs'
  ]) copy(relative);

  const initial = JSON.parse(read('specification-status.json')).draft;
  assert.equal(initial.status, 'release-candidate');
  prepare(initial.iteration, initial.snapshotDate);
  const repeated = JSON.parse(read('specification-status.json')).draft;
  assert.equal(repeated.baselineTag, initial.baselineTag);
  assert.equal(JSON.parse(read('schemas/draft.json')).baselineTag, initial.baselineTag);
  assert.ok(read('spec/draft/sections/00-front-matter.md').includes(`baseline-snapshot: ${initial.baselineTag}`));
  assert.ok(read('spec/draft/mcp-description.md').includes(`baseline-snapshot: ${initial.baselineTag}`));

  prepare(initial.iteration + 1, initial.snapshotDate);
  const next = JSON.parse(read('specification-status.json')).draft;
  assert.equal(next.baselineTag, initial.snapshotTag);
  assert.equal(JSON.parse(read('schemas/draft.json')).baselineTag, initial.snapshotTag);
  prepare(next.iteration, next.snapshotDate);
  assert.equal(JSON.parse(read('specification-status.json')).draft.baselineTag, initial.snapshotTag);
  assert.throws(() => prepare(next.iteration, '2000-01-01'));
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log('Release candidate preparation tests passed.');
