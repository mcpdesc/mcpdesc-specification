import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { decodeDocumentSource } from './decode-document.mjs';
import { validateMcpdesc08Document } from './validate-0.8.mjs';

const fixtureRoot = path.join(process.cwd(), 'spec', 'draft', 'serialization-fixtures');
const readFixture = (relative) => fs.readFileSync(path.join(fixtureRoot, relative), 'utf8');

const yamlDocument = decodeDocumentSource(
  readFixture('equivalent/document.yaml'),
  'yaml',
  'equivalent/document.yaml'
);
const jsonDocument = decodeDocumentSource(
  readFixture('equivalent/document.json'),
  'json',
  'equivalent/document.json'
);
assert.deepEqual(yamlDocument, jsonDocument);
assert.deepEqual(validateMcpdesc08Document(yamlDocument), validateMcpdesc08Document(jsonDocument));

const integratedSource = fs.readFileSync(
  path.join(process.cwd(), 'spec', 'draft', 'fixtures', 'expected-valid', 'integrated-draft2-features.yaml'),
  'utf8'
);
const integratedYamlDocument = decodeDocumentSource(
  integratedSource,
  'yaml',
  'expected-valid/integrated-draft2-features.yaml'
);
const integratedJsonDocument = decodeDocumentSource(
  JSON.stringify(integratedYamlDocument),
  'json',
  'integrated-draft2-features.json'
);
assert.deepEqual(integratedYamlDocument, integratedJsonDocument);
assert.equal('transports' in integratedJsonDocument, false);
assert.deepEqual(integratedJsonDocument.security, [{ 'api-key': [] }]);
assert.deepEqual(integratedJsonDocument.tools[0].security, []);
const integratedDiagnostics = validateMcpdesc08Document(integratedYamlDocument);
assert.deepEqual(integratedDiagnostics, []);
assert.deepEqual(validateMcpdesc08Document(integratedYamlDocument), integratedDiagnostics);
assert.deepEqual(validateMcpdesc08Document(integratedJsonDocument), integratedDiagnostics);

assert.throws(
  () => decodeDocumentSource(`components:
  schemas:
    Input: &shared
      type: object
    Duplicate: *shared
`, 'yaml', 'component-alias.yaml'),
  /YAML aliases are not supported/
);

for (const filename of fs.readdirSync(path.join(fixtureRoot, 'expected-invalid'))) {
  const relative = `expected-invalid/${filename}`;
  assert.throws(
    () => decodeDocumentSource(readFixture(relative), 'yaml', relative),
    SyntaxError,
    relative
  );
}

assert.deepEqual(
  decodeDocumentSource(
    readFixture('expected-valid/scalars-and-ordinary-merge-key.yaml'),
    'yaml',
    'expected-valid/scalars-and-ordinary-merge-key.yaml'
  ),
  {
    value: { '<<': { a: 1 } },
    scalars: [true, false, null, 0, -12, 1.5, 6.02e23, '2026-08-25', '.nan']
  }
);

const exampleDir = path.join(process.cwd(), 'spec', 'draft', 'examples');
for (const filename of fs.readdirSync(exampleDir).filter((name) => /\.ya?ml$/i.test(name))) {
  const source = fs.readFileSync(path.join(exampleDir, filename), 'utf8');
  decodeDocumentSource(source, 'yaml', `spec/draft/examples/${filename}`);
}

console.log('Serialization tests passed.');