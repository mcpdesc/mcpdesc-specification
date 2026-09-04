import assert from 'node:assert/strict';
import { compareSchemas, formatSchemaDiff } from './schema-diff.mjs';

const metadataOnly = compareSchemas(
  { $id: 'rc.1', description: 'RC 1', type: 'object' },
  { type: 'object', description: 'RC 2', $id: 'rc.2' }
);
assert.deepEqual(metadataOnly.validation, []);
assert.deepEqual(metadataOnly.metadata.map((change) => change.path), ['/$id', '/description']);

const changed = compareSchemas(
  { required: ['name'], properties: { name: { type: 'string' } } },
  { required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'number' } } }
);
assert.deepEqual(changed.validation.map(({ kind, path }) => ({ kind, path })), [
  { kind: 'added', path: '/properties/id' },
  { kind: 'changed', path: '/properties/name/type' },
  { kind: 'changed', path: '/required/0' },
  { kind: 'added', path: '/required/1' }
]);

assert.match(formatSchemaDiff({ type: 'object' }, { type: 'object' }).output, /Validation changes:\n  none/);

console.log('Schema diff tests passed.');