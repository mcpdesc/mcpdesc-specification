import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { assembleSpecification } from './draft-assembly.mjs';

const root = process.cwd();
if (!fs.existsSync(path.join(root, 'spec', 'draft')) || !fs.existsSync(path.join(root, 'schemas', 'draft.json'))) {
  console.log('Stable version freeze tests skipped: no active draft.');
  process.exit(0);
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mcpdesc-stable-freeze-'));
const copy = (relative) => {
  const destination = path.join(temporaryRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(path.join(root, relative), destination, { recursive: true });
};
const read = (relative) => fs.readFileSync(path.join(temporaryRoot, relative), 'utf8');

try {
  for (const relative of [
    'specification-status.json',
    'schemas/latest.json',
    'schemas/draft.json',
    'schemas/mcp-description/0.9.0.json',
    'spec/draft',
    'scripts/freeze-version.mjs',
    'scripts/draft-assembly.mjs'
  ]) copy(relative);

  execFileSync(
    process.execPath,
    ['scripts/freeze-version.mjs', '0.9.0', '2026-11-12'],
    { cwd: temporaryRoot, stdio: 'pipe' }
  );

  const status = JSON.parse(read('specification-status.json'));
  const latest = JSON.parse(read('schemas/latest.json'));
  const schema = JSON.parse(read('schemas/mcp-description/0.9.0.json'));
  const frontMatter = read('spec/0.9.0/sections/00-front-matter.md');

  assert.equal(status.stable.version, '0.9.0');
  assert.equal(status.stable.releaseTag, 'v0.9.0');
  assert.equal(status.stable.releaseDate, '2026-11-12');
  assert.equal('draft' in status, false);
  assert.equal(latest['mcp-description'], '0.9.0');
  assert.equal(schema.$id, 'https://mcpdesc.org/schema/mcp-description/0.9.0.json');
  assert.equal(schema.description, 'MCP Description 0.9.0.');
  assert.match(frontMatter, /^status: Stable release$/m);
  assert.match(frontMatter, /^release-tag: v0\.9\.0$/m);
  assert.match(frontMatter, /^released: true$/m);
  assert.match(frontMatter, /^date: 2026-11-12$/m);
  assert.ok(fs.existsSync(path.join(temporaryRoot, 'spec/0.9.0/mcp-description.md')));
  assert.ok(fs.existsSync(path.join(temporaryRoot, 'spec/0.9.0/PROPOSALS.md')));
  assert.equal(fs.existsSync(path.join(temporaryRoot, 'spec/draft')), false);
  assert.equal(fs.existsSync(path.join(temporaryRoot, 'schemas/draft.json')), false);
  assert.ok(read('spec/0.9.0/mcp-description.md').includes('https://mcpdesc.org/schema/mcp-description/0.9.0.json'));
  assert.ok(!read('spec/0.9.0/mcp-description.md').includes('0.9.0-rc.4.json'));
  assert.equal(
    read('spec/0.9.0/mcp-description.md'),
    assembleSpecification(temporaryRoot, '0.9.0').content
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log('Stable version freeze tests passed.');