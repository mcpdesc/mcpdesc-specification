// Check native projection fixtures under <specification>/projection-fixtures/ (Section 4.14).
//
// This repository contains no projection implementation. The checks use the
// candidate validator, Effective Protocol View projection, component
// resolution, and the pinned MCP JSON Schemas: every source document has the
// validity the case expects, every case selects what it claims to select, and
// every expected MCP value validates against its pinned MCP type and equals
// its declaration without MCP Description fields. Validation already rejects
// fields a revision does not define, so every other declaration field must be
// present and unchanged. A postcondition case must select a declaration whose
// value, built the same way, fails its pinned MCP type.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { formatCanonicalJson } from './canonical-json.mjs';
import { candidateSpecification } from './candidate-specification.mjs';
import { decodeDocumentSource, documentFormatForPath } from './decode-document.mjs';
import { projectProtocolView } from './mcpdesc-views.mjs';
import { resolveComponentReferences, supportedProtocolVersions, validateDocument } from './validate-document.mjs';

const root = process.cwd();
const { specificationRoot } = candidateSpecification(root);
const specificationDirectory = path.join(root, specificationRoot);
const fixtureDirectory = path.join(specificationDirectory, 'projection-fixtures');
const fixtureRel = `${specificationRoot}/projection-fixtures`;

if (!fs.existsSync(fixtureDirectory)) {
  console.log(`Projection fixtures: none in ${specificationRoot}.`);
  process.exit(0);
}

const errors = [];
const fail = (message) => errors.push(message);

const caseAjv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true });
const validateCase = caseAjv.compile(JSON.parse(fs.readFileSync(path.join(fixtureDirectory, 'schema', 'projection-case.schema.json'), 'utf8')));

const mcpType = { tool: 'Tool', resource: 'Resource', resourceTemplate: 'ResourceTemplate', prompt: 'Prompt' };
const collection = { tool: 'tools', resource: 'resources', resourceTemplate: 'resourceTemplates', prompt: 'prompts' };
const identifierField = { tool: 'name', resource: 'uri', resourceTemplate: 'uriTemplate', prompt: 'name' };
// Section 4.14: declaration fields that never reach an MCP value.
const descriptionOnlyFields = new Set(['protocolVersions', 'examples', 'interactionExamples', 'completionExamples', 'tags', 'elicitations', 'deprecated', 'security', 'clientRequirements']);
const projectionErrors = ['projection-source-invalid', 'projection-revision-not-declared', 'projection-declaration-not-applicable'];
const postconditionError = 'projection-postcondition-failed';

const mcpValidators = new Map();
function mcpTypeValidator(revision, type) {
  const key = `${revision}/${type}`;
  if (!mcpValidators.has(key)) {
    const schema = JSON.parse(fs.readFileSync(path.join(specificationDirectory, 'validation', 'mcp-schemas', revision, 'schema.json'), 'utf8'));
    const ajv = schema.$schema?.includes('2020-12') ? new Ajv2020({ allErrors: true, strict: false }) : new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const id = `https://mcp-schema.invalid/${revision}/schema.json`;
    ajv.addSchema(schema, id);
    mcpValidators.set(key, ajv.getSchema(`${id}#/${schema.$defs ? '$defs' : 'definitions'}/${type}`));
  }
  return mcpValidators.get(key);
}

const same = (left, right) => formatCanonicalJson(left) === formatCanonicalJson(right);
const isDescriptionOnly = (key) => descriptionOnlyFields.has(key) || key.startsWith('x-');
const withoutExtensions = (entry) => Object.fromEntries(Object.entries(entry).filter(([field]) => !field.startsWith('x-')));

function nativeValue(declaration) {
  return Object.fromEntries(Object.entries(declaration)
    .filter(([key]) => !isDescriptionOnly(key))
    .map(([key, child]) => [key, (key === 'arguments' || key === 'icons') && Array.isArray(child) ? child.map(withoutExtensions) : child]));
}

function checkValue(where, declaration, value, kind, revision) {
  const validate = mcpTypeValidator(revision, mcpType[kind]);
  if (!validate(value)) {
    for (const error of validate.errors ?? []) fail(`${where}: not a valid MCP ${revision} ${mcpType[kind]}: ${error.instancePath || '/'} ${error.message}`);
  }
  for (const key of Object.keys(declaration)) {
    if (!isDescriptionOnly(key) && !Object.hasOwn(value, key)) fail(`${where}: MCP field ${key} of the declaration is missing`);
  }
  for (const [key, child] of Object.entries(value)) {
    if (isDescriptionOnly(key)) {
      fail(`${where}: ${key} is an MCP Description field`);
    } else if (!Object.hasOwn(declaration, key)) {
      fail(`${where}: ${key} is not in the declaration; projection never adds a field`);
    } else if (key === 'arguments' || key === 'icons') {
      // Entries keep a subset of their fields (MCP PromptArgument or Icon), each copied unchanged.
      const source = declaration[key];
      if (!Array.isArray(child) || child.length !== source.length) {
        fail(`${where}: ${key} must keep every declared entry in order`);
        continue;
      }
      child.forEach((entry, index) => {
        for (const field of Object.keys(source[index])) {
          if (!field.startsWith('x-') && !Object.hasOwn(entry, field)) fail(`${where}: ${key}[${index}].${field} of the declaration is missing`);
        }
        for (const [field, fieldValue] of Object.entries(entry)) {
          if (field.startsWith('x-')) fail(`${where}: ${key}[${index}].${field} is a specification extension`);
          else if (!Object.hasOwn(source[index], field) || !same(source[index][field], fieldValue)) fail(`${where}: ${key}[${index}].${field} differs from the declaration`);
        }
      });
    } else if (!same(child, declaration[key])) {
      fail(`${where}: ${key} differs from the declaration after reference resolution`);
    }
  }
}

function loadDocument(caseFile, document) {
  if (typeof document !== 'string') return document;
  const full = path.join(path.dirname(caseFile), document);
  return decodeDocumentSource(fs.readFileSync(full, 'utf8'), documentFormatForPath(full), document);
}

const coverage = new Map(Object.keys(mcpType).map((kind) => [kind, { revisions: new Set(), codes: new Set(), list: false }]));
const referencedDocuments = new Set();
let postconditionCases = 0;
const caseFiles = fs.readdirSync(fixtureDirectory).filter((name) => name.endsWith('.json')).sort();

for (const name of caseFiles) {
  const caseFile = path.join(fixtureDirectory, name);
  const where = `${fixtureRel}/${name}`;
  const testCase = JSON.parse(fs.readFileSync(caseFile, 'utf8'));
  if (!validateCase(testCase)) {
    for (const error of validateCase.errors ?? []) fail(`${where}: ${error.instancePath || '/'} ${error.message}`);
    continue;
  }
  const { document, revision, kind, identifier, expected, expectedError } = testCase;
  if (typeof document === 'string') {
    const full = path.join(fixtureDirectory, document);
    if (!fs.existsSync(full)) {
      fail(`${where}: document ${document} does not exist`);
      continue;
    }
    referencedDocuments.add(path.relative(fixtureDirectory, full));
  }
  const kindCoverage = coverage.get(kind);
  if (expectedError) kindCoverage.codes.add(expectedError);
  else if (identifier === undefined) kindCoverage.list = true;
  else kindCoverage.revisions.add(revision);

  const source = loadDocument(caseFile, document);
  const sourceErrors = validateDocument(source).filter((diagnostic) => diagnostic.severity === 'error');
  if (expectedError === 'projection-source-invalid') {
    if (!sourceErrors.length) fail(`${where}: expects projection-source-invalid, but the source document is valid`);
    continue;
  }
  if (sourceErrors.length) {
    fail(`${where}: source document has validation errors: ${sourceErrors.map((diagnostic) => diagnostic.code).join(', ')}`);
    continue;
  }
  if (!supportedProtocolVersions.includes(revision)) {
    fail(`${where}: MCP ${revision} is not supported`);
    continue;
  }
  const declared = source.protocolVersions.includes(revision);
  if (expectedError === 'projection-revision-not-declared') {
    if (declared) fail(`${where}: expects projection-revision-not-declared, but MCP ${revision} is in root protocolVersions`);
    continue;
  }
  if (!declared) {
    fail(`${where}: MCP ${revision} is not in root protocolVersions`);
    continue;
  }

  const view = resolveComponentReferences(projectProtocolView(source, revision)).document;
  const declarations = view[collection[kind]] ?? [];
  const select = (id) => declarations.find((declaration) => declaration[identifierField[kind]] === id);
  if (expectedError === 'projection-declaration-not-applicable') {
    if (select(identifier)) fail(`${where}: expects projection-declaration-not-applicable, but ${identifier} is in the MCP ${revision} view`);
    continue;
  }
  if (expectedError === postconditionError) {
    postconditionCases += 1;
    const selected = identifier === undefined ? declarations : [select(identifier)].filter(Boolean);
    if (!selected.length) fail(`${where}: expects ${postconditionError}, but selects no declaration in the MCP ${revision} view`);
    else if (selected.every((declaration) => mcpTypeValidator(revision, mcpType[kind])(nativeValue(declaration)))) {
      fail(`${where}: expects ${postconditionError}, but every selected value validates against the pinned MCP ${revision} ${mcpType[kind]}`);
    }
    continue;
  }
  if (identifier !== undefined) {
    const declaration = select(identifier);
    if (!declaration) fail(`${where}: ${identifier} is not in the MCP ${revision} view`);
    else checkValue(where, declaration, expected, kind, revision);
    continue;
  }
  if (expected.length !== declarations.length) {
    fail(`${where}: the MCP ${revision} view has ${declarations.length} ${collection[kind]}, the list case ${expected.length}`);
    continue;
  }
  expected.forEach((value, index) => {
    if (value[identifierField[kind]] !== declarations[index][identifierField[kind]]) fail(`${where}: entry ${index} is not in document order`);
    else checkValue(`${where} [${index}]`, declarations[index], value, kind, revision);
  });
}

const documentsDirectory = path.join(fixtureDirectory, 'documents');
for (const name of fs.existsSync(documentsDirectory) ? fs.readdirSync(documentsDirectory).sort() : []) {
  if (!referencedDocuments.has(path.join('documents', name))) fail(`${fixtureRel}/documents/${name} is not used by any case`);
}

for (const [kind, { revisions, codes, list }] of coverage) {
  for (const revision of supportedProtocolVersions) {
    if (!revisions.has(revision)) fail(`${fixtureRel}: no ${kind} case projects a declaration for MCP ${revision}`);
  }
  for (const code of projectionErrors) {
    if (!codes.has(code)) fail(`${fixtureRel}: no ${kind} case expects ${code}`);
  }
  if (!list) fail(`${fixtureRel}: no ${kind} list case`);
}
if (!postconditionCases) fail(`${fixtureRel}: no case expects ${postconditionError}`);

if (errors.length) {
  console.error(`Projection fixture check failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Projection fixtures passed: ${caseFiles.length} case(s) cover ${Object.keys(mcpType).length} kinds, every supported revision, every projection error, a list per kind, and ${postconditionCases} postcondition failure case(s).`);
