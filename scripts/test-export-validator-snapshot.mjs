import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { candidateSpecification } from './candidate-specification.mjs';

const root = process.cwd();
const candidate = candidateSpecification(root);
const repository = fs.mkdtempSync(path.join(root, '.tmp-validator-export-'));
const output = path.join(repository, 'bundle');
const selector = candidate.isDraft
  ? candidate.status.draft.snapshotTag.slice(1)
  : `${candidate.version}-rev.20261021`;
const snapshotTag = `v${selector}`;
const candidateSchemaBytes = fs.readFileSync(path.join(root, candidate.schemaPath));
const expectedSchemaDigest = createHash('sha256').update(candidateSchemaBytes).digest('hex');
const expectedSchemaId = JSON.parse(candidateSchemaBytes.toString('utf8')).$id;

assert.equal(
  createHash('sha256').update(fs.readFileSync(path.join(root, 'schemas/mcp-description/0.8.0.json'))).digest('hex'),
  '36686f92ba0cc98bde2c34eaad31c0304d6e5cebdd2c4d2be1be06aecef41119',
  'frozen 0.8.0 schema bytes changed'
);

function copy(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(repository, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function git(...args) {
  return execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
}

function filesUnder(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(prefix, entry.name);
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath, relativePath) : [relativePath];
  });
}

try {
  for (const relativePath of [
    'scripts/export-validator-snapshot.mjs',
    'scripts/validate-document.mjs',
    'scripts/validator-base.mjs',
    candidate.schemaPath,
    `${candidate.specificationRoot}/fixtures`
  ]) copy(relativePath);

  git('init', '--quiet');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('add', '.');
  git('commit', '--quiet', '-m', 'validator snapshot source');
  git('tag', '-a', snapshotTag, '-m', snapshotTag);

  execFileSync(process.execPath, ['scripts/export-validator-snapshot.mjs', selector, output], {
    cwd: repository,
    stdio: 'pipe'
  });

  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
  assert.equal(manifest.selector, selector);
  assert.equal(manifest.snapshotTag, snapshotTag);
  assert.equal(manifest.source.commit, git('rev-parse', 'HEAD'));

  const artifactPaths = filesUnder(output)
    .filter((relativePath) => relativePath !== 'manifest.json')
    .sort();
  assert.deepEqual(manifest.files.map((file) => file.path), artifactPaths);
  for (const file of manifest.files) {
    const digest = createHash('sha256')
      .update(fs.readFileSync(path.join(output, file.path)))
      .digest('hex');
    assert.equal(file.sha256, digest, file.path);
  }

  const schemaBytes = fs.readFileSync(path.join(output, 'runtime/schema.json'));
  assert.equal(createHash('sha256').update(schemaBytes).digest('hex'), expectedSchemaDigest);
  assert.equal(JSON.parse(schemaBytes.toString('utf8')).$id, expectedSchemaId);

  const runtime = await import(pathToFileURL(path.join(output, 'runtime/index.js')).href);
  assert.equal(runtime.specification, selector);
  assert.equal(runtime.snapshotTag, snapshotTag);
  assert.equal(runtime.schemaSha256, expectedSchemaDigest);

  const fixture = (group, filename) => JSON.parse(
    fs.readFileSync(path.join(output, 'fixtures', group, filename), 'utf8')
  );
  assert.equal(runtime.validate(fixture('expected-valid', 'revision-inapplicable-mcp-header.json')).valid, true);
  assert.equal(runtime.validate(fixture('expected-valid', 'custom-tool-schema-keywords.json')).valid, true);
  assert.equal(runtime.validate(fixture('expected-invalid', 'invalid-mcp-header-value.json')).valid, false);
  assert.equal(runtime.validate(fixture('expected-invalid', 'invalid-mcp-header-placement.json')).valid, false);
  assert.equal(runtime.validate(fixture('expected-invalid', 'duplicate-mcp-header.json')).valid, false);
} finally {
  fs.rmSync(repository, { recursive: true, force: true });
}

console.log('Validator snapshot export tests passed.');