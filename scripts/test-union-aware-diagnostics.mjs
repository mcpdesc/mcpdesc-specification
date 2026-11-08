import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { candidateSpecification } from './candidate-specification.mjs';
import { decodeDocumentSource, documentFormatForPath } from './decode-document.mjs';
import { evaluateDocument } from './validate-document.mjs';

const root = process.cwd();
const candidate = candidateSpecification(root);
const baseline = JSON.parse(fs.readFileSync('scripts/fixtures/mcp-description-0.9.0-rc.2.schema.json', 'utf8'));
const current = JSON.parse(fs.readFileSync(candidate.schemaPath, 'utf8'));

function compile(schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

const baselineValidate = compile(baseline);
const currentValidate = compile(current);
let comparisons = 0;
let intentionalNarrowings = 0;
function compareDocument(document, label, preserveAcceptance = true) {
  const before = baselineValidate(document);
  const after = currentValidate(document);
  if (preserveAcceptance) {
    assert.equal(after, before, `document acceptance changed for ${label}`);
  } else {
    assert.equal(before, true, `RC.2 must accept the intentional compatibility case: ${label}`);
    assert.equal(after, false, `RC.3 must reject the narrowed compatibility case: ${label}`);
    intentionalNarrowings += 1;
  }
  comparisons += 1;
}

const fixtureRoot = path.join(root, candidate.specificationRoot, 'fixtures', 'expected-valid');
const invalidRoot = path.join(root, candidate.specificationRoot, 'fixtures', 'expected-invalid');
function fixturePaths(directory) {
  return fs.readdirSync(directory).filter((name) => /\.(?:json|ya?ml)$/.test(name))
    .map((name) => path.join(directory, name)).sort();
}

const validDocuments = fixturePaths(fixtureRoot).map((file) => {
  const relative = path.relative(root, file);
  return { file, relative, document: decodeDocumentSource(fs.readFileSync(file, 'utf8'), documentFormatForPath(file), relative) };
});
for (const file of [...fixturePaths(invalidRoot), ...validDocuments.map(({ file }) => file)]) {
  const relative = path.relative(root, file);
  const isResponseClosureNarrowing = relative.endsWith('/elicitation-response-unknown-member.json');
  compareDocument(
    decodeDocumentSource(fs.readFileSync(file, 'utf8'), documentFormatForPath(file), relative),
    relative,
    !isResponseClosureNarrowing
  );
}

function mutateAt(document, segments, mutate) {
  const clone = structuredClone(document);
  if (segments.length === 0) return mutate(clone);
  const parent = segments.slice(0, -1).reduce((node, key) => node[key], clone);
  parent[segments.at(-1)] = mutate(parent[segments.at(-1)]);
  return clone;
}

function collectLocations(value, segments = [], result = []) {
  if (Array.isArray(value)) {
    result.push({ value, segments });
    value.forEach((child, index) => collectLocations(child, [...segments, index], result));
  } else if (value !== null && typeof value === 'object') {
    result.push({ value, segments });
    for (const [key, child] of Object.entries(value)) collectLocations(child, [...segments, key], result);
  }
  return result;
}

const replacements = [null, true, 0, '', [], {}];
for (const { relative, document } of validDocuments) {
  for (const { value, segments } of collectLocations(document)) {
    if (Array.isArray(value)) {
      compareDocument(mutateAt(document, segments, () => ({})), `${relative}: array/object ${JSON.stringify(segments)}`);
      compareDocument(mutateAt(document, segments, () => [null]), `${relative}: array values ${JSON.stringify(segments)}`);
      continue;
    }
    const unknownMember = mutateAt(document, segments, (target) => ({ ...target, __proposal0035_probe: null }));
    const elicitationResponse = segments.at(-1) === 'response'
      && segments.includes('steps')
      && ['accept', 'decline', 'cancel'].includes(value.action);
    compareDocument(
      unknownMember,
      `${relative}: unknown member ${JSON.stringify(segments)}`,
      !elicitationResponse
    );
    for (const key of Object.keys(value)) {
      compareDocument(mutateAt(document, segments, (target) => {
        const clone = { ...target };
        delete clone[key];
        return clone;
      }),
        `${relative}: missing ${JSON.stringify([...segments, key])}`);
      for (const replacement of replacements) {
        compareDocument(mutateAt(document, segments, (target) => ({ ...target, [key]: replacement })),
          `${relative}: replacement ${JSON.stringify([...segments, key])}`);
      }
    }
  }
}

function getValidator(schema, pointer) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(schema);
  const validator = ajv.getSchema(`${schema.$id}${pointer}`);
  assert.ok(validator, `no schema at ${pointer}`);
  return validator;
}

function compareDefinition(oldPointer, newPointer, values) {
  const before = getValidator(baseline, oldPointer);
  const after = getValidator(current, newPointer);
  for (const value of values) {
    assert.equal(after(value), before(value),
      `${newPointer} acceptance changed for ${JSON.stringify(value)}`);
    comparisons += 1;
  }
}

const reference = { $componentRef: '#/components/schemas/Form' };
const inlineSchema = { type: 'object', properties: { ready: { type: 'boolean' } } };
compareDefinition('#/$defs/schemaComponentValue', '#/$defs/schemaComponentValue', [
  reference, inlineSchema, null, [], {}, { ...reference, type: 'object' }
]);
compareDefinition('#/$defs/elicitationDeclaration', '#/$defs/elicitationDeclaration', [
  { name: 'form', mode: 'form', message: 'Choose', requestedSchema: inlineSchema },
  { name: 'form-ref', mode: 'form', message: 'Choose', requestedSchema: reference },
  { name: 'url', mode: 'url', message: 'Authorize', url: 'https://example.test/auth' },
  { name: 'invalid', mode: 'form', message: 'Choose', requestedSchema: null },
  { name: 'invalid', mode: 'form', message: 'Choose', requestedSchema: [] },
  { name: 'invalid', mode: 'form', message: 'Choose', requestedSchema: {} },
  { name: 'invalid', mode: 'form', message: 'Choose', requestedSchema: inlineSchema, url: 'https://example.test/auth' }
]);
compareDefinition('#/$defs/elicitationFormProperty', '#/$defs/elicitationFormProperty', [
  { type: 'string' },
  { type: 'string', enum: ['a', 'b'] },
  { type: 'string', oneOf: [{ const: 'a', title: 'A' }] },
  { type: 'number' },
  { type: 'integer', minimum: 0 },
  { type: 'boolean' },
  { type: 'array', items: { type: 'string', enum: ['a'] } },
  { type: 'array', items: { anyOf: [{ const: 'a', title: 'A' }] } },
  { type: 'string', enum: ['a'], oneOf: [] },
  { type: 'other' },
  null, [], {}
]);
compareDefinition(
  '#/$defs/elicitationFormProperty/oneOf/5/properties/items',
  '#/$defs/elicitationFormProperty/allOf/3/then/properties/items',
  [
    { type: 'string', enum: ['a'] },
    { anyOf: [{ const: 'a', title: 'A' }] },
    { type: 'string', enum: ['a'], anyOf: [] },
    { type: 'string' },
    null, [], {}
  ]
);
compareDefinition('#/$defs/resourceContents', '#/$defs/resourceContents', [
  { uri: 'https://example.test/a', text: 'a' },
  { uri: 'https://example.test/a', blob: 'YQ==' },
  { uri: 'https://example.test/a', text: 'a', blob: 'YQ==' },
  { uri: 'https://example.test/a' },
  { uri: 'https://example.test/a', text: 1 },
  { uri: 'https://example.test/a', text: 'a', extra: true },
  null, [], {}
]);
compareDefinition('#/$defs/samplingMessageContent', '#/$defs/samplingMessageContent', [
  { type: 'text', text: 'a' },
  [{ type: 'text', text: 'a' }],
  [], null, true, 0, {}
]);
compareDefinition(
  '#/$defs/samplingToolResultContent/properties/content',
  '#/$defs/samplingToolResultContent/properties/content',
  [{ type: 'text', text: 'a' }, [{ type: 'text', text: 'a' }], [], null, true, 0, {}]
);
compareDefinition('#/$defs/jsonValue', '#/$defs/jsonValue', [
  null, true, false, 0, -1.5, 'text', [], [null, { nested: ['x'] }], {},
  { nested: { ok: true, values: [1, 'a', null] } }
]);

function pathExists(document, location) {
  let value = document;
  for (const segment of location) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, segment)) return false;
    value = value[segment];
  }
  return true;
}

function assertSourceLocations(document, diagnostics, label) {
  for (const diagnostic of diagnostics) {
    assert.ok(pathExists(document, diagnostic.path), `${label}: primary path does not resolve: ${JSON.stringify(diagnostic.path)}`);
    for (const related of diagnostic.relatedLocations ?? []) {
      assert.ok(pathExists(document, related.path), `${label}: related path does not resolve: ${JSON.stringify(related.path)}`);
    }
  }
}

const misspelledTransport = {
  mcpdesc: '0.9.0',
  info: { name: 'probe', version: '1.0.0' },
  protocolVersions: ['2025-11-25'],
  transports: [{ typ: 'stdio', command: 'probe' }]
};
const transportReport = evaluateDocument(misspelledTransport);
assertSourceLocations(misspelledTransport, transportReport.diagnostics, 'missing transport discriminator');
assert.deepEqual(transportReport.diagnostics.map(({ path: location, detail }) => [location, detail.kind, detail.member]), [
  [['transports', 0], 'missing-member', 'type'],
  [['transports', 0, 'typ'], 'unexpected-member', 'typ']
]);

const invalidTransport = {
  ...misspelledTransport,
  transports: [{ type: 'stdio', command: 'probe', arg: [] }]
};
const transportFailure = evaluateDocument(invalidTransport);
assertSourceLocations(invalidTransport, transportFailure.diagnostics, 'selected transport alternative');
assert.equal(transportFailure.diagnostics.length, 1, 'conditional summaries and unrelated alternatives are suppressed');
assert.equal(transportFailure.diagnostics[0].detail.kind, 'unexpected-member');
assert.equal(transportFailure.diagnostics[0].detail.selector.value, 'stdio');

const componentDiagnosticPath = path.join(root, candidate.specificationRoot, 'fixtures', 'expected-invalid', 'component-contextual-schemas.json');
const componentDocument = decodeDocumentSource(
  fs.readFileSync(componentDiagnosticPath, 'utf8'),
  documentFormatForPath(componentDiagnosticPath),
  path.relative(root, componentDiagnosticPath)
);
const componentReport = evaluateDocument(componentDocument);
assertSourceLocations(componentDocument, componentReport.diagnostics, 'component reference');
assert.deepEqual(componentReport.diagnostics[0].path,
  ['tools', 0, 'elicitations', 0, 'requestedSchema']);
assert.deepEqual(componentReport.diagnostics[0].relatedLocations[0], {
  path: ['components', 'schemas', 'NestedForm', 'properties', 'profile', 'type'],
  relation: 'component-definition'
});

const componentExample = validDocuments.find(({ relative }) => relative.endsWith('/reusable-components.json')).document;
componentExample.components.toolExamples.basic.inpt = componentExample.components.toolExamples.basic.input;
delete componentExample.components.toolExamples.basic.input;
const componentExampleReport = evaluateDocument(componentExample);
assertSourceLocations(componentExample, componentExampleReport.diagnostics, 'inline component example');
assert.ok(componentExampleReport.diagnostics.some((diagnostic) =>
  diagnostic.rule === 'mcpdesc.example.members' && diagnostic.detail.kind === 'missing-member'));
assert.ok(componentExampleReport.results.some((result) =>
  result.rule === 'mcpdesc.components.members' && result.status === 'passed'));
assert.ok(componentExampleReport.results.some((result) =>
  result.rule === 'mcpdesc.example.members' && result.status === 'failed'));

const resourceDocument = validDocuments.find(({ relative }) => relative.endsWith('/named-resource-examples.json')).document;
let resourceContent;
function findResourceContent(value) {
  if (!value || typeof value !== 'object' || resourceContent) return;
  if (Array.isArray(value.contents)) {
    resourceContent = value.contents[0];
    return;
  }
  for (const child of Object.values(value)) findResourceContent(child);
}
findResourceContent(resourceDocument);
assert.ok(resourceContent, 'resource fixture has content');
resourceContent.blob = 'YQ==';
const resourceReport = evaluateDocument(resourceDocument);
assertSourceLocations(resourceDocument, resourceReport.diagnostics, 'conflicting resource content');
assert.ok(resourceReport.diagnostics.some((diagnostic) =>
  diagnostic.detail.kind === 'conflicting-members'
    && JSON.stringify(diagnostic.detail.members) === JSON.stringify(['blob', 'text'])));
assert.ok(!resourceReport.diagnostics.some((diagnostic) => diagnostic.detail.kind === 'unexpected-member'));

const oauthDocument = validDocuments.find(({ relative }) => relative.endsWith('/security-composition-and-inheritance.json')).document;
oauthDocument.securitySchemes.oauth.flows = {};
const oauthReport = evaluateDocument(oauthDocument);
assertSourceLocations(oauthDocument, oauthReport.diagnostics, 'empty OAuth flows');
assert.equal(oauthReport.diagnostics.length, 1);
assert.deepEqual(oauthReport.diagnostics[0].detail, {
  kind: 'missing-alternative',
  members: ['implicit', 'password', 'clientCredentials', 'authorizationCode']
});

assert.ok(intentionalNarrowings > 0, 'test corpus exercises the documented elicitation-response narrowing');
console.log(`RC.2 acceptance comparisons passed (${comparisons} cases; ${intentionalNarrowings} intentional elicitation-response narrowings).`);
