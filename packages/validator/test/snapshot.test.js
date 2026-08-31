import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import { specificationProvenance } from '../src/index.js';

test('preserves the immutable Draft 1 schema digest and metadata', () => {
  const embedded = fs.readFileSync(new URL('../src/snapshots/0.8.0-draft.1/schema.json', import.meta.url));
  const draft1SchemaSha256 = '4ceb6042c3fd31703199cd3db869ec5c35c17d2fe9ab7b2f5b96a2a3af0cebe4';
  const digest = createHash('sha256').update(embedded).digest('hex');

  assert.equal(digest, draft1SchemaSha256);
  assert.deepEqual(specificationProvenance['0.8.0-draft.1'], {
    snapshotTag: 'v0.8.0-draft.1',
    schemaUri: 'https://mcpdesc.org/schema/0.8.0.json',
    schemaSha256: draft1SchemaSha256
  });
});

test('preserves the immutable Draft 2 schema digest and metadata', () => {
  const embedded = fs.readFileSync(new URL('../src/snapshots/0.8.0-draft.2/schema.json', import.meta.url));
  const draft2SchemaSha256 = 'ab692c1a5a0f7e5f29be1940aa8c64a56d4620be0a19d00cf0a64680b7e517fa';
  const digest = createHash('sha256').update(embedded).digest('hex');

  assert.equal(digest, draft2SchemaSha256);
  assert.deepEqual(specificationProvenance['0.8.0-draft.2'], {
    snapshotTag: 'v0.8.0-draft.2',
    schemaUri: 'https://mcpdesc.org/schema/0.8.0.json',
    schemaSha256: draft2SchemaSha256
  });
});

test('preserves the immutable Draft 3 schema digest and metadata', () => {
  const embedded = fs.readFileSync(new URL('../src/snapshots/0.8.0-draft.3/schema.json', import.meta.url));
  const draft3SchemaSha256 = '8823c1f1946360b2a44d00920e2092e5e4acd139a1964befad4eb0bf3ce96002';
  const digest = createHash('sha256').update(embedded).digest('hex');

  assert.equal(digest, draft3SchemaSha256);
  assert.deepEqual(specificationProvenance['0.8.0-draft.3'], {
    snapshotTag: 'v0.8.0-draft.3',
    schemaUri: 'https://mcpdesc.org/schema/0.8.0.json',
    schemaSha256: draft3SchemaSha256
  });
});

test('preserves the immutable Draft 4 schema digest and metadata', () => {
  const embedded = fs.readFileSync(new URL('../src/snapshots/0.8.0-draft.4/schema.json', import.meta.url));
  const draft4SchemaSha256 = '93ed03f74059b5b3ce7509a96b59161bdab2c3cf7734397a9bec5a7588d0b03b';
  const digest = createHash('sha256').update(embedded).digest('hex');

  assert.equal(digest, draft4SchemaSha256);
  assert.deepEqual(specificationProvenance['0.8.0-draft.4'], {
    snapshotTag: 'v0.8.0-draft.4',
    schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json',
    schemaSha256: draft4SchemaSha256
  });
});

test('preserves the immutable Release Candidate 1 schema digest and metadata', () => {
  const embedded = fs.readFileSync(new URL('../src/snapshots/0.8.0-rc.1/schema.json', import.meta.url));
  const rc1SchemaSha256 = '936a0f24ade501fcabf3d6498c0440c445daa672a575573a35954cee49430ac4';
  const digest = createHash('sha256').update(embedded).digest('hex');

  assert.equal(digest, rc1SchemaSha256);
  assert.deepEqual(specificationProvenance['0.8.0-rc.1'], {
    snapshotTag: 'v0.8.0-rc.1',
    schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.1.json',
    schemaSha256: rc1SchemaSha256
  });
});