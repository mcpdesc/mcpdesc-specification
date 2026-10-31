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
    'scripts/document-schema-owners.mjs',
    'scripts/rule-summaries.mjs',
    'scripts/candidate-specification.mjs',
    'scripts/decode-document.mjs',
    'specification-status.json',
    `${candidate.specificationRoot}/validation/rules`,
    candidate.schemaPath,
    `${candidate.specificationRoot}/fixtures`
  ]) copy(relativePath);
  const projectionFixtures = `${candidate.specificationRoot}/projection-fixtures`;
  const hasProjectionFixtures = fs.existsSync(path.join(root, projectionFixtures));
  if (hasProjectionFixtures) copy(projectionFixtures);
  const viewFixtures = `${candidate.specificationRoot}/view-fixtures`;
  const hasViewFixtures = fs.existsSync(path.join(root, viewFixtures));
  if (hasViewFixtures) copy(viewFixtures);
  const conversion = `${candidate.specificationRoot}/conversion`;
  const hasConversion = fs.existsSync(path.join(root, conversion));
  if (hasConversion) {
    copy(conversion);
    for (const name of fs.readdirSync(path.join(root, conversion, 'fixtures')).filter((entry) => entry.endsWith('.json'))) {
      const { document } = JSON.parse(fs.readFileSync(path.join(root, conversion, 'fixtures', name), 'utf8'));
      if (typeof document === 'string' && document.startsWith('../../../')) copy(`spec/${document.slice('../../../'.length)}`);
    }
  }

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
  const headerResults = (document) => runtime.validate(document).results
    .filter((result) => result.rule === 'mcp.tool.input-schema.x-mcp-header')
    .map((result) => `${result.protocolVersion} ${result.status}`);
  assert.deepEqual(headerResults(fixture('expected-invalid', 'invalid-mcp-header-value.json')), ['2026-07-28 failed']);
  assert.deepEqual(headerResults(fixture('expected-valid', 'custom-tool-schema-keywords.json')), ['2025-11-25 not-applicable', '2026-07-28 passed']);

  if (hasProjectionFixtures) {
    const cases = fs.readdirSync(path.join(output, 'projection-fixtures')).filter((name) => name.endsWith('.json'));
    assert.ok(cases.length > 0, 'projection fixtures are exported');
    for (const name of cases) {
      const { document } = JSON.parse(fs.readFileSync(path.join(output, 'projection-fixtures', name), 'utf8'));
      if (typeof document === 'string') {
        assert.ok(fs.existsSync(path.join(output, 'projection-fixtures', document)), `${name}: ${document} resolves in the bundle`);
      }
    }
  }
  if (hasViewFixtures) {
    const cases = fs.readdirSync(path.join(output, 'view-fixtures')).filter((name) => name.endsWith('.json'));
    assert.ok(cases.length > 0, 'view fixtures are exported');
    for (const name of cases) {
      const { inputs, expected } = JSON.parse(fs.readFileSync(path.join(output, 'view-fixtures', name), 'utf8'));
      for (const relative of [...inputs, expected].filter(Boolean)) {
        assert.ok(fs.existsSync(path.join(output, 'view-fixtures', relative)), `${name}: ${relative} resolves in the bundle`);
      }
    }
  }
  if (hasConversion) {
    const caseDirectory = path.join(output, 'conversion', 'fixtures');
    const cases = fs.readdirSync(caseDirectory).filter((name) => name.endsWith('.json'));
    assert.ok(cases.length > 0, 'conversion fixtures are exported');
    assert.ok(fs.existsSync(path.join(output, 'conversion', 'schema', 'conversion-case.schema.json')), 'conversion case schema is exported');
    for (const name of cases) {
      const { document } = JSON.parse(fs.readFileSync(path.join(caseDirectory, name), 'utf8'));
      if (typeof document === 'string') {
        assert.ok(!document.startsWith('../'), `${name}: ${document} stays inside the bundle`);
        assert.ok(fs.existsSync(path.join(caseDirectory, document)), `${name}: ${document} resolves in the bundle`);
      }
    }
  }
} finally {
  fs.rmSync(repository, { recursive: true, force: true });
}

console.log('Validator snapshot export tests passed.');