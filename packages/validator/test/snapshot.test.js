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
    schemaSha256: draft1SchemaSha256
  });
});

test('binds Draft 2 to the exact canonical schema bytes and metadata', () => {
  const canonical = fs.readFileSync(new URL('../../../schemas/mcp-description/0.8.0.json', import.meta.url));
  const embedded = fs.readFileSync(new URL('../src/snapshots/0.8.0-draft.2/schema.json', import.meta.url));
  const draft2SchemaSha256 = '57594803b38a2acd054241e85a34446e681924e5e579ecf5341091f26e217a52';
  const digest = createHash('sha256').update(embedded).digest('hex');

  assert.deepEqual(embedded, canonical);
  assert.equal(digest, draft2SchemaSha256);
  assert.deepEqual(specificationProvenance['0.8.0-draft.2'], {
    snapshotTag: 'v0.8.0-draft.2',
    schemaSha256: draft2SchemaSha256
  });
});