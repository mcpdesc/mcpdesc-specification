import assert from 'node:assert/strict';
import fs from 'node:fs';
import { candidateSpecification } from './candidate-specification.mjs';

const schema = JSON.parse(fs.readFileSync(candidateSpecification(process.cwd()).schemaPath, 'utf8'));
const unions = [];
const guards = [];

function visitSchema(node, pointer = '#') {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;
  for (const keyword of ['oneOf', 'anyOf']) {
    if (Array.isArray(node[keyword])) unions.push({ pointer: `${pointer}/${keyword}`, keyword });
  }
  if (node.if) guards.push({ pointer: `${pointer}/if`, guard: node.if });

  for (const keyword of ['$defs', 'definitions', 'properties', 'patternProperties', 'dependentSchemas']) {
    for (const [name, child] of Object.entries(node[keyword] ?? {})) {
      visitSchema(child, `${pointer}/${keyword}/${name.replaceAll('~', '~0').replaceAll('/', '~1')}`);
    }
  }
  for (const keyword of [
    'additionalProperties', 'additionalItems', 'contains', 'else', 'if', 'items',
    'not', 'propertyNames', 'then', 'unevaluatedProperties'
  ]) {
    visitSchema(node[keyword], `${pointer}/${keyword}`);
  }
  for (const keyword of ['allOf', 'anyOf', 'oneOf', 'prefixItems']) {
    node[keyword]?.forEach((child, index) => visitSchema(child, `${pointer}/${keyword}/${index}`));
  }
}

function isApprovedGuard(guard) {
  if (typeof guard.type === 'string'
    && ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string'].includes(guard.type)
    && Object.keys(guard).length === 1) return true;
  if (guard.type !== 'object' || !Array.isArray(guard.required) || !guard.required.length) return false;
  if (new Set(guard.required).size !== guard.required.length) return false;
  const properties = guard.properties;
  if (properties === undefined) return Object.keys(guard).every((key) => ['type', 'required'].includes(key));
  if (Object.keys(properties).length !== 1) return false;
  const [member] = Object.keys(properties);
  const selector = properties[member];
  const hasValueGuard = Object.hasOwn(selector, 'const')
    || (Array.isArray(selector.enum) && selector.enum.length > 0);
  return guard.required.includes(member)
    && hasValueGuard
    && Object.keys(guard).every((key) => ['type', 'required', 'properties'].includes(key))
    && Object.keys(selector).every((key) => ['const', 'enum'].includes(key));
}

visitSchema(schema);
assert.deepEqual(unions, [{ pointer: '#/$defs/oauthFlows/anyOf', keyword: 'anyOf' }],
  'only oauthFlows.anyOf may remain as a union applicator');
for (const { pointer, guard } of guards) {
  assert.ok(isApprovedGuard(guard), `${pointer} uses an unapproved selector guard: ${JSON.stringify(guard)}`);
}
const discriminated = {
  transport: 'type',
  securityScheme: 'type',
  toolInteractionStep: 'type',
  elicitationInteractionRequest: 'mode',
  elicitationInteractionResponse: 'action',
  elicitationDeclaration: 'mode',
  toolResultContent: 'type',
  samplingContentBlock: 'type'
};
for (const [name, selector] of Object.entries(discriminated)) {
  const definition = schema.$defs[name];
  assert.equal(definition.additionalProperties, false, `${name}: union parent rejects unknown members`);
  assert.ok(Array.isArray(definition.properties[selector].enum), `${name}: parent declares selector values`);
  for (const [member, memberSchema] of Object.entries(definition.properties)) {
    if (member !== selector) assert.equal(memberSchema, true, `${name}.${member}: value constraint stays in its branch`);
  }
}
assert.deepEqual(schema.$defs.jsonValue.type, ['object', 'array', 'string', 'number', 'boolean', 'null']);
console.log(`Schema union check passed (${guards.length} approved guards, one allowlisted anyOf).`);
