import assert from 'node:assert/strict';
import {
  canonicalizeJsonSource,
  formatCanonicalJson
} from './canonical-json.mjs';

const left = {
  z: { beta: true, alpha: false },
  array: [{ second: 2, first: 1 }, 'z', 'a'],
  a: null
};
const right = {
  a: null,
  array: [{ first: 1, second: 2 }, 'z', 'a'],
  z: { alpha: false, beta: true }
};

assert.equal(formatCanonicalJson(left), formatCanonicalJson(right));
assert.equal(formatCanonicalJson(left), `{
  "a": null,
  "array": [
    {
      "first": 1,
      "second": 2
    },
    "z",
    "a"
  ],
  "z": {
    "alpha": false,
    "beta": true
  }
}
`);
assert.equal(canonicalizeJsonSource('{"b":2,"a":1}'), '{\n  "a": 1,\n  "b": 2\n}\n');
assert.equal(canonicalizeJsonSource(JSON.stringify({
  $defs: { zebra: {}, alpha: {} },
  patternProperties: {},
  properties: {},
  additionalProperties: false,
  required: ['mcpdesc', 'info'],
  type: 'object',
  description: 'Description',
  title: 'Title',
  $id: 'https://example.com/schema.json',
  $schema: 'https://json-schema.org/draft/2020-12/schema'
})), `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schema.json",
  "title": "Title",
  "description": "Description",
  "type": "object",
  "required": [
    "mcpdesc",
    "info"
  ],
  "additionalProperties": false,
  "properties": {},
  "patternProperties": {},
  "$defs": {
    "alpha": {},
    "zebra": {}
  }
}
`);
assert.throws(() => canonicalizeJsonSource('{ invalid json }'), SyntaxError);

console.log('Canonical JSON tests passed.');