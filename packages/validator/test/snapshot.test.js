import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import { specificationProvenance } from '../src/index.js';

const embeddedSchema = new URL('../src/snapshots/0.8.0-draft.1/schema.json', import.meta.url);
const canonicalSchema = new URL('../../../schemas/mcp-description/0.8.0.json', import.meta.url);

test('binds Draft 1 to the exact canonical schema bytes and digest', () => {
  const embedded = fs.readFileSync(embeddedSchema);
  const canonical = fs.readFileSync(canonicalSchema);
  const digest = createHash('sha256').update(embedded).digest('hex');

  assert.deepEqual(embedded, canonical);
  assert.equal(digest, specificationProvenance['0.8.0-draft.1'].schemaSha256);
  assert.equal(specificationProvenance['0.8.0-draft.1'].snapshotTag, 'v0.8.0-draft.1');
});