import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  specificationProvenance,
  supportedProtocolVersions,
  supportedSpecifications,
  validateMcpDescription
} from '../src/index.js';

const fixtureRoot = new URL('../../../spec/draft/fixtures/', import.meta.url);

function fixture(group, name) {
  return JSON.parse(fs.readFileSync(new URL(`${group}/${name}`, fixtureRoot), 'utf8'));
}

function validate(document) {
  return validateMcpDescription(document, { specification: '0.8.0-draft.1' });
}

test('exports the Draft 1 validator API', () => {
  assert.equal(typeof validateMcpDescription, 'function');
  assert.deepEqual(supportedSpecifications, ['0.8.0-draft.1']);
  assert.ok(supportedProtocolVersions.includes('2026-07-28'));
  assert.deepEqual(specificationProvenance, {
    '0.8.0-draft.1': {
      snapshotTag: 'v0.8.0-draft.1',
      schemaSha256: '4ceb6042c3fd31703199cd3db869ec5c35c17d2fe9ab7b2f5b96a2a3af0cebe4'
    }
  });
});

test('requires an explicit exact specification selector', () => {
  const document = fixture('expected-valid', 'minimal-zero-primitives.json');
  assert.throws(() => validateMcpDescription(document), /options\.specification is required/);
  assert.throws(() => validateMcpDescription(document, {}), /options\.specification is required/);
  assert.throws(
    () => validateMcpDescription(document, { specification: '0.8.0' }),
    /Unsupported MCP Description specification: 0\.8\.0/
  );
  assert.throws(
    () => validateMcpDescription(document, { specification: '0.8.0-draft.2' }),
    /Unsupported MCP Description specification: 0\.8\.0-draft\.2/
  );
});

test('accepts an unknown JavaScript value and returns individual structural diagnostics', () => {
  const result = validate(null);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.length > 0);
  assert.ok(result.diagnostics.every((diagnostic) => diagnostic.code === 'schema-validation'));
  assert.ok(result.diagnostics.every((diagnostic) => diagnostic.severity === 'error'));
  assert.ok(result.diagnostics.every((diagnostic) => Array.isArray(diagnostic.path)));
});

test('appends required and additional property names to structural paths', () => {
  const document = fixture('expected-valid', 'minimal-zero-primitives.json');
  delete document.info;
  document.unexpected = true;

  const result = validate(document);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.message.includes("required property 'info'") && assert.deepEqual(diagnostic.path, ['info']) === undefined));
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.message.includes('additional properties') && assert.deepEqual(diagnostic.path, ['unexpected']) === undefined));
});

test('emits the public diagnostic shape and semantic rule-site paths', () => {
  const result = validate(fixture('expected-invalid', 'duplicate-tag-reference.json'));
  const diagnostic = result.diagnostics.find((candidate) => candidate.code === 'unknown-tag-reference');
  assert.ok(diagnostic);
  assert.deepEqual(Object.keys(diagnostic).sort(), ['code', 'message', 'path', 'severity']);
  assert.deepEqual(diagnostic.path, ['tools', 0, 'tags', 0]);
  assert.equal(Object.hasOwn(diagnostic, 'level'), false);
});

test('is deterministic and does not mutate the input document', () => {
  const document = fixture('expected-invalid', 'resource-example-cache-fields.json');
  const original = structuredClone(document);
  const first = validate(document);
  const second = validate(document);
  assert.deepEqual(first, second);
  assert.deepEqual(document, original);
});

test('exports immutable support and provenance data', () => {
  assert.ok(Object.isFrozen(supportedSpecifications));
  assert.ok(Object.isFrozen(supportedProtocolVersions));
  assert.ok(Object.isFrozen(specificationProvenance));
  assert.ok(Object.isFrozen(specificationProvenance['0.8.0-draft.1']));
  assert.throws(() => supportedSpecifications.push('0.8.0'));
  assert.throws(() => supportedProtocolVersions.pop());
  assert.throws(() => {
    specificationProvenance['0.8.0-draft.1'].snapshotTag = 'changed';
  });
});

test('keeps unresolved external references offline', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('network access attempted');
  };
  try {
    const result = validate(fixture('expected-warning', 'unresolved-external-tool-ref.json'));
    assert.equal(result.valid, true);
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'unresolved-external-tool-schema-reference'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uses browser-neutral UTF-8 lengths and canonical base64 checks', () => {
  const utf8Document = fixture('expected-valid', 'minimal-zero-primitives.json');
  utf8Document.protocolVersions = ['2025-11-25'];
  utf8Document.resources = [{
    uri: 'test://utf8',
    name: 'utf8',
    size: 2,
    examples: {
      sample: {
        result: {
          contents: [{ uri: 'test://utf8', text: '\u00e9' }]
        }
      }
    }
  }];
  assert.deepEqual(validate(utf8Document), { valid: true, diagnostics: [] });

  const base64Document = structuredClone(utf8Document);
  delete base64Document.resources[0].size;
  base64Document.resources[0].examples.sample.result.contents[0] = {
    uri: 'test://utf8',
    blob: 'Zh=='
  };
  const result = validate(base64Document);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((diagnostic) => (
    diagnostic.code === 'invalid-resource-example-base64'
      && diagnostic.path.join('.') === 'resources.0.examples.sample.result.contents.0.blob'
  )));
});