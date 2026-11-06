import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import standaloneCode from 'ajv/dist/standalone/index.js';
import { formatCanonicalJson } from './canonical-json.mjs';
import { candidateSpecification } from './candidate-specification.mjs';
import { decodeDocumentSource, documentFormatForPath } from './decode-document.mjs';
import { evaluateDocument, validateDocument } from './validate-document.mjs';

const candidate = candidateSpecification(process.cwd());
const schema = JSON.parse(fs.readFileSync(candidate.schemaPath, 'utf8'));
const definitions = {
  transport: ['type', '01ee56245a31b8c08e14e2ce776598032a3ee22b3327e9b5637173fc57f9a30a'],
  securityScheme: ['type', '2091295d3ad82b46e8b8197d4771b1c146c03c4ee09f288c9a504fb5d9638252'],
  toolInteractionStep: ['type', 'aee78a65281442f057e82311b0a479b8247ac4ee9ee6dd3afbaa99888f5f6520'],
  elicitationInteractionRequest: ['mode', '5416357dcca85496f39152c2254e5f0b58f76ef1be7f80eb1b1e2acc4501c861'],
  elicitationInteractionResponse: ['action', '256e3be40f4c07e4659e19361014565e4b95096a152ae0509e2e7ac91f7478fa'],
  elicitationDeclaration: ['mode', '75265296fc799654f848e3a7b48ab8552fd81518eaebf87e3881d7f6140cc7b1'],
  toolResultContent: ['type', '7d16a06983585d1e726d359cc51f043fc3daba881c92fced4d52581e1feec970'],
  samplingContentBlock: ['type', 'ffac150b104da42129e8b996388c65b295394df86dcc823388d8c8080971eb93']
};
const baseline = structuredClone(schema);
for (const [name, [selector, digest]] of Object.entries(definitions)) {
  const definition = baseline.$defs[name];
  assert.equal(definition.type, 'object', `${name}: reject non-objects at the union level`);
  assert.ok(definition.required.includes(selector));
  assert.equal(definition.oneOf, undefined);
  const values = definition.allOf.flatMap(({ if: condition, then }) => {
    assert.equal(condition.type, 'object', `${name}: guard non-objects inside if`);
    assert.deepEqual(condition.required, [selector]);
    assert.ok(then && typeof then === 'object');
    const tag = condition.properties[selector];
    return tag.enum ?? [tag.const];
  });
  assert.equal(new Set(values).size, values.length, `${name}: disjoint selectors`);
  assert.deepEqual(definition.properties[selector].enum, values);
  definition.oneOf = definition.allOf.map((entry) => entry.then);
  delete definition.allOf;
  if (name !== 'elicitationDeclaration') {
    delete definition.type;
    delete definition.required;
    delete definition.properties;
  }
  // Hashes pin the original RC.1 definitions, including every branch and parent constraint.
  const normalized = JSON.parse(formatCanonicalJson({ definition })).definition;
  assert.equal(createHash('sha256').update(JSON.stringify(normalized)).digest('hex'), digest,
    `${name}: inverse rewrite must recover the exact RC.1 definition`);
}

function compiler(documentSchema, allErrors) {
  const ajv = new Ajv2020({ allErrors, strict: false, code: { source: true } });
  addFormats(ajv);
  ajv.addSchema(documentSchema);
  return ajv;
}

const exports = Object.fromEntries([
  ['document', schema.$id],
  ...Object.keys(definitions).map((name) => [name, `${schema.$id}#/$defs/${name}`])
]);
const baselineAjv = compiler(baseline, true);
assert.throws(() => new vm.Script('Function("return true")()').runInNewContext({}, {
  contextCodeGeneration: { strings: false, wasm: false }
}), /Code generation from strings disallowed/);
const modes = [true, false].map((allErrors) => {
  const ajv = compiler(schema, allErrors);
  const runtime = Object.fromEntries(Object.entries(exports).map(([name, reference]) => [name, ajv.getSchema(reference)]));
  const source = standaloneCode(ajv, exports);
  const sandbox = { exports: {}, require: createRequire(import.meta.url) };
  new vm.Script(source).runInNewContext(sandbox, { contextCodeGeneration: { strings: false, wasm: false } });
  return { allErrors, runtime, standalone: sandbox.exports };
});

const form = { type: 'object', properties: { approved: { type: 'boolean' } } };
const text = { type: 'text', text: 'Hello' };
const contents = [
  text,
  { type: 'image', data: 'AA==', mimeType: 'image/png' },
  { type: 'audio', data: 'AA==', mimeType: 'audio/wav' },
  { type: 'resource', resource: { uri: 'file:///readme', text: 'Read me' } },
  { type: 'resource_link', name: 'readme', uri: 'file:///readme', size: 12 }
];
const request = { mode: 'form', message: 'Approve?', requestedSchema: form };
const response = { action: 'accept', content: { approved: true } };
const seeds = {
  transport: [
    { type: 'streamable-http', url: 'https://example.test/mcp' },
    { type: 'stdio', command: 'chess-rating', args: ['serve'], env: { MODE: 'test' } },
    { type: 'sse', url: 'https://example.test/sse' }
  ],
  securityScheme: [
    { type: 'http', scheme: 'bearer' },
    { type: 'apiKey', name: 'X-Key', in: 'header' },
    { type: 'oauth2', flows: { clientCredentials: { tokenUrl: 'https://example.test/token', scopes: {} } } },
    { type: 'openIdConnect', openIdConnectUrl: 'https://example.test/.well-known/openid-configuration' }
  ],
  toolInteractionStep: [
    { type: 'elicitation', request, response },
    {
      type: 'sampling',
      request: { messages: [{ role: 'user', content: text }], maxTokens: 10 },
      response: { role: 'assistant', content: text, model: 'example' }
    },
    { type: 'roots', request: {}, response: { roots: [] } }
  ],
  elicitationInteractionRequest: [request, { mode: 'url', message: 'Authorize', url: 'https://example.test/auth' }],
  elicitationInteractionResponse: [response, { action: 'decline' }, { action: 'cancel' }],
  elicitationDeclaration: [
    { name: 'approve', mode: 'form', message: 'Approve?', requestedSchema: form },
    { name: 'authorize', mode: 'url', message: 'Authorize', url: 'https://example.test/auth' }
  ],
  toolResultContent: contents,
  samplingContentBlock: [
    ...contents,
    { type: 'tool_use', id: '1', name: 'inspect', input: {} },
    { type: 'tool_result', toolUseId: '1', content: text },
    { type: 'tool_result', toolUseId: '1', content: [text] }
  ]
};
const nonObjects = [null, true, false, 0, 5, 'stdio', [], [text]];
const mutations = [null, true, 5, '', [], {}, ['wrong'], { unexpected: 1 }];
let comparisons = 0;
let accepted = 0;
const errorShape = (errors) => JSON.parse(JSON.stringify(errors));
function compare(name, value, expected) {
  const old = baselineAjv.getSchema(exports[name]);
  const valid = old(value);
  if (expected !== undefined) assert.equal(valid, expected, `${name}: baseline ${JSON.stringify(value)}`);
  for (const { allErrors, runtime, standalone } of modes) {
    assert.equal(runtime[name](value), valid, `${name}: runtime equivalence ${JSON.stringify(value)}`);
    const errors = errorShape(runtime[name].errors);
    assert.equal(standalone[name](value), valid, `${name}: standalone equivalence`);
    assert.deepEqual(errorShape(standalone[name].errors), errors, `${name}: standalone diagnostic parity (${allErrors})`);
  }
  comparisons++;
  accepted += Number(valid);
}

for (const [name, validSeeds] of Object.entries(seeds)) {
  const [selector] = definitions[name];
  const covered = new Set(validSeeds.map((seed) => seed[selector]));
  assert.deepEqual([...covered].sort(), [...schema.$defs[name].properties[selector].enum].sort(), `${name}: every tag has a valid seed`);
  for (const value of [...nonObjects, {}]) compare(name, value, false);
  for (const seed of validSeeds) {
    compare(name, seed, true);
    for (const tag of [undefined, 'unknown', seed[selector].toUpperCase(), null, 5, true, [], {}]) {
      const value = { ...seed, [selector]: tag };
      if (tag === undefined) delete value[selector];
      compare(name, value, false);
    }
    for (const key of Object.keys(seed)) {
      const missing = { ...seed };
      delete missing[key];
      compare(name, missing);
      for (const value of mutations) compare(name, { ...seed, [key]: value });
    }
    for (const key of ['x-vendor', 'X-vendor', 'unexpected', 'url', 'command', 'content', 'requestedSchema']) {
      for (const value of mutations) compare(name, { ...seed, [key]: value });
    }
    // Include a valid and invalid deep value wherever a seed has a nested container.
    for (const [key, value] of Object.entries(seed)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        compare(name, { ...seed, [key]: { ...value, unexpected: 1 } });
      }
    }
  }
}

const fields = {
  url: ['https://example.test/mcp', 'not a URI', 3],
  command: ['run', 5],
  args: [['serve'], 'serve', [1]],
  arg: [['serve']],
  env: [{ A: '1' }, { A: 1 }],
  protocolVersions: [['2025-11-25'], 'wrong'],
  security: [[], 5],
  'x-vendor': [1],
  'X-vendor': [1]
};
const entries = Object.entries(fields);
for (const type of [undefined, 'stdio', 'sse', 'streamable-http', 'STDIO', 'unknown', null, 5]) {
  for (let mask = 0; mask < 2 ** entries.length; mask++) {
    const selected = entries.filter((_, index) => mask & (1 << index));
    if (selected.length > 3) continue;
    let values = [type === undefined ? {} : { type }];
    for (const [key, candidates] of selected) values = values.flatMap((value) => candidates.map((field) => ({ ...value, [key]: field })));
    for (const value of values) compare('transport', value);
  }
}

const runtime = modes[0].runtime;
function rawErrors(name, value, keywords) {
  assert.equal(runtime[name](value), false);
  assert.deepEqual(runtime[name].errors.map((error) => error.keyword), keywords);
}
rawErrors('transport', { type: 'stdio', command: 'run', arg: ['serve'] }, ['additionalProperties', 'if']);
rawErrors('transport', { type: 'stdio', command: 5, arg: ['serve'] }, ['additionalProperties', 'type', 'if']);
rawErrors('transport', {}, ['required']);
for (const type of ['unknown', null, 5]) rawErrors('transport', { type }, ['enum']);
for (const value of nonObjects) rawErrors('transport', value, ['type']);
rawErrors('transport', { type: 'stdio' }, ['required', 'if']);
rawErrors('transport', { type: 'stdio', command: 'run', url: 'https://example.test' }, ['additionalProperties', 'if']);
rawErrors('transport', { type: 'stdio', command: 'run', env: { A: 1 } }, ['type', 'if']);
assert.equal(runtime.transport.errors[0].instancePath, '/env/A');
assert.equal(runtime.transport({ type: 'stdio', command: 'run', 'x-vendor': { nested: [1, null] } }), true);
assert.equal(runtime.toolResultContent({ ...text, 'x-vendor': true }), false, 'MCP content blocks remain closed to specification extensions');

const fixture = (group, name) => JSON.parse(fs.readFileSync(path.join(candidate.specificationRoot, 'fixtures', group, name), 'utf8'));
const typo = fixture('expected-invalid', 'transport-arg-typo.json');
const typoReport = evaluateDocument(typo);
assert.deepEqual(typoReport.diagnostics.map(({ code, rule, path: location }) => ({ code, rule, path: location })), [
  { code: 'schema-validation', rule: 'mcpdesc.transport.members', path: ['transports', 0, 'arg'] }
]);
assert.ok(typoReport.results.some((result) => result.rule === 'mcpdesc.transport.members' && result.status === 'failed'));
const defects = fixture('expected-invalid', 'transport-independent-defects.json');
assert.deepEqual(validateDocument(defects).map(({ path: location }) => location), [
  ['transports', 0, 'arg'], ['transports', 0, 'command'], ['transports', 1, 'env', 'MODE']
]);
const discriminatorErrors = validateDocument(fixture('expected-invalid', 'transport-discriminator-errors.json'));
assert.deepEqual(discriminatorErrors.map(({ rule }) => rule), Array(12).fill('mcpdesc.transport.members'));
assert.deepEqual(discriminatorErrors.map(({ path: location }) => location), [
  ['transports', 0, 'type'], ['transports', 1, 'type'], ['transports', 2, 'type'], ['transports', 3, 'type'],
  ...[4, 5, 6, 7, 8].map((index) => ['transports', index]),
  ['transports', 9, 'command'], ['transports', 10, 'url'], ['transports', 11, 'X-vendor']
]);
const members = evaluateDocument(fixture('expected-invalid', 'discriminated-union-members.json'));
assert.deepEqual(members.diagnostics.map(({ rule }) => rule), [
  'mcpdesc.security-scheme.members', 'mcpdesc.security-scheme.members', 'mcpdesc.elicitation.members',
  'mcp.content.members', 'mcp.content.members',
  'mcp.interaction-message.members', 'mcp.interaction-message.members', 'mcp.interaction-message.members',
  'mcpdesc.tool.interaction.members', 'mcpdesc.tool.interaction.members'
]);
for (const rule of new Set(members.diagnostics.map((diagnostic) => diagnostic.rule))) {
  assert.ok(members.results.some((result) => result.rule === rule && result.status === 'failed'), `${rule}: specific failures determine rule results`);
}
const size = fixture('expected-invalid', 'discriminated-resource-link-size.json');
const sizeReport = evaluateDocument(size);
assert.equal(runtime.document(size), false);
assert.ok(runtime.document.errors.filter((error) => error.keyword === 'if').length >= 2, 'Exercise nested conditional wrappers');
assert.equal(sizeReport.diagnostics.length, 3, 'Retain the untouched object/array union errors');
assert.equal(sizeReport.diagnostics[0].rule, 'mcp.resource.size');
assert.equal(sizeReport.diagnostics[0].path.at(-1), 'size');
assert.ok(sizeReport.diagnostics.every((diagnostic) => !diagnostic.message.includes('must match "then"')), 'Remove nested if wrappers only');
assert.ok(sizeReport.results.some((result) => result.rule === 'mcp.resource.size' && result.status === 'failed'));
assert.ok(sizeReport.results.some((result) => result.rule === 'mcpdesc.tool.interaction.members' && result.status === 'passed'),
  'A removed generic wrapper does not falsely fail the enclosing step rule');
const validReport = evaluateDocument(fixture('expected-valid', 'discriminated-unions.json'));
assert.deepEqual(validReport.diagnostics, []);
assert.ok(validReport.results.some((result) => result.rule === 'mcpdesc.transport.members' && result.status === 'passed'));
assert.ok(validReport.results.some((result) => result.rule === 'mcp.resource.size' && result.status === 'passed'));

let corpus = 0;
for (const directory of ['examples', 'fixtures']) {
  const root = path.join(candidate.specificationRoot, directory);
  for (const relative of fs.readdirSync(root, { recursive: true }).filter((name) => /\.(?:json|ya?ml)$/.test(name))) {
    const full = path.join(root, relative);
    const document = decodeDocumentSource(fs.readFileSync(full, 'utf8'), documentFormatForPath(full), full);
    compare('document', document);
    corpus++;
  }
}
assert.ok(accepted > 100, 'Exercise accepted instances, not only rejection-heavy combinations');
console.log(`Discriminated unions: ${comparisons} equivalence cases (${accepted} accepted), including ${corpus} corpus documents; AJV runtime/standalone all-errors/first-error parity and CSP checks passed.`);
