import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkEditorialEdition } from './editorial-edition.mjs';

function write(root, relativePath, content) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function git(root, ...args) {
  execFileSync('git', args, { cwd: root, stdio: 'ignore' });
}

function status(baseTag, target) {
  const stable = target === 'stable'
    ? { version: '0.8.0' }
    : undefined;
  const draft = target === 'prerelease'
    ? { snapshotTag: baseTag }
    : undefined;
  return {
    stable,
    draft,
    editorialEdition: {
      baseTag,
      iteration: 1,
      editionTag: `${baseTag}+editorial.1`,
      editionDate: '2026-09-09',
      target
    }
  };
}

function frontMatter(baseTag) {
  return `---\neditorial-edition: 1\neditorial-base-tag: ${baseTag}\nedition-tag: ${baseTag}+editorial.1\nedition-date: 2026-09-09\n---\n`;
}

function createRepository(target) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcpdesc-editorial-'));
  const baseTag = target === 'stable' ? 'v0.8.0' : 'v0.8.0-rc.4';
  const specificationPath = target === 'stable' ? 'spec/0.8.0' : 'spec/draft';
  git(root, 'init', '--quiet');
  git(root, 'config', 'user.email', 'test@example.com');
  git(root, 'config', 'user.name', 'Test');
  write(root, 'specification-status.json', '{}\n');
  write(root, `${specificationPath}/mcp-description.md`, 'base\n');
  write(root, `${specificationPath}/PROPOSALS.md`, 'base\n');
  write(root, `${specificationPath}/proposal-snapshots/0001.md`, 'base\n');
  write(root, `${specificationPath}/examples/example.yaml`, 'base\n');
  write(root, `${specificationPath}/fixtures/expected-valid/example.json`, '{}\n');
  write(root, `${specificationPath}/serialization-fixtures/example.yaml`, 'base\n');
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'base');
  git(root, 'tag', baseTag);
  write(root, 'specification-status.json', `${JSON.stringify(status(baseTag, target), null, 2)}\n`);
  write(root, `${specificationPath}/mcp-description.md`, frontMatter(baseTag));
  return { root, baseTag, specificationPath };
}

for (const target of ['stable', 'prerelease']) {
  const { root, specificationPath } = createRepository(target);
  try {
    write(root, `${specificationPath}/examples/example.yaml`, 'corrected\n');
    write(root, `${specificationPath}/fixtures/expected-valid/example.json`, '{"corrected":true}\n');
    write(root, `${specificationPath}/serialization-fixtures/example.yaml`, 'corrected\n');
    assert.deepEqual(checkEditorialEdition(root).errors, []);

    write(root, `${specificationPath}/proposal-snapshots/0001.md`, 'changed\n');
    assert.match(checkEditorialEdition(root).errors.join('\n'), /protected conformance artifacts differ/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log('Editorial edition tests passed.');