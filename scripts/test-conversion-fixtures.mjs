// Check version conversion fixtures under <specification>/conversion/ (Proposal 0028).
//
// Conversion is a non-normative tooling profile implemented in @mcpdesc/core.
// This script recomputes each case from the conversion rules: automatic
// rewrites, requested fixes, then the candidate validator on the result. A
// target error that no conversion rule explains fails the check, so an
// undeclared incompatibility between two versions cannot be released. Source
// documents are checked against the frozen source schema only; their semantic
// validity is checked by core with the source selector.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse as parseYaml } from 'yaml';
import { formatCanonicalJson } from './canonical-json.mjs';
import { candidateSpecification } from './candidate-specification.mjs';
import { decodeDocumentSource, documentFormatForPath } from './decode-document.mjs';
import { validateDocument } from './validate-document.mjs';

const root = process.cwd();
const { specificationRoot } = candidateSpecification(root);
const specificationDirectory = path.join(root, specificationRoot);
const conversionDirectory = path.join(specificationDirectory, 'conversion');
const conversionRel = `${specificationRoot}/conversion`;
const fixtureDirectory = path.join(conversionDirectory, 'fixtures');

if (!fs.existsSync(conversionDirectory)) {
  console.log(`Conversion fixtures: none in ${specificationRoot}.`);
  process.exit(0);
}

const errors = [];
const fail = (message) => errors.push(message);
const canonical = (value) => formatCanonicalJson(value);
const pointer = (segments) => segments.map((segment) => `/${String(segment).replaceAll('~', '~0').replaceAll('/', '~1')}`).join('');
const isPrefix = (prefix, segments) => prefix.length <= segments.length && prefix.every((segment, index) => segment === segments[index]);

const schemaAjv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true });
const loadSchema = (name) => schemaAjv.compile(JSON.parse(fs.readFileSync(path.join(conversionDirectory, 'schema', name), 'utf8')));
const validateRules = loadSchema('conversion-rules.schema.json');
const validateCase = loadSchema('conversion-case.schema.json');

const registeredRules = new Set();
const ruleDirectory = path.join(specificationDirectory, 'validation', 'rules');
for (const file of fs.readdirSync(ruleDirectory).filter((name) => name.endsWith('.yaml'))) {
  for (const rule of parseYaml(fs.readFileSync(path.join(ruleDirectory, file), 'utf8')).rules) registeredRules.add(rule.id);
}

const sourceValidators = new Map();
function sourceValidator(version) {
  if (!sourceValidators.has(version)) {
    const file = path.join(root, 'schemas', 'mcp-description', `${version}.json`);
    let validate = null;
    if (fs.existsSync(file)) {
      const ajv = new Ajv2020({ allErrors: true, strict: false });
      addFormats(ajv);
      validate = ajv.compile(JSON.parse(fs.readFileSync(file, 'utf8')));
    }
    sourceValidators.set(version, validate);
  }
  return sourceValidators.get(version);
}

// Conversion rules, one file per adjacent version pair.
const conversions = new Map();
for (const file of fs.readdirSync(conversionDirectory).filter((name) => name.endsWith('.json')).sort()) {
  const where = `${conversionRel}/${file}`;
  const data = JSON.parse(fs.readFileSync(path.join(conversionDirectory, file), 'utf8'));
  if (!validateRules(data)) {
    fail(`${where}: ${schemaAjv.errorsText(validateRules.errors)}`);
    continue;
  }
  if (file !== `${data.from}-to-${data.to}.json`) fail(`${where}: file name must be ${data.from}-to-${data.to}.json`);
  const fixIds = new Set(data.fixes.map((fix) => fix.id));
  const ruleIds = new Set();
  const explained = new Map();
  for (const rule of data.rules) {
    if (ruleIds.has(rule.id)) fail(`${where}: duplicate rule ${rule.id}`);
    ruleIds.add(rule.id);
    for (const target of rule.targetRules) {
      if (!registeredRules.has(target)) fail(`${where}: ${rule.id} explains unregistered target rule ${target}`);
      if (explained.has(target)) fail(`${where}: target rule ${target} is explained by both ${explained.get(target)} and ${rule.id}`);
      explained.set(target, rule.id);
    }
    for (const fix of rule.fixes) if (!fixIds.has(fix)) fail(`${where}: ${rule.id} offers undefined fix ${fix}`);
  }
  const targetSchema = JSON.parse(fs.readFileSync(path.join(root, 'schemas', 'mcp-description', `${data.to}.json`), 'utf8'));
  conversions.set(`${data.from}->${data.to}`, { ...data, file, explained, targetSchemaId: targetSchema.$id });
}

function getNode(document, segments) {
  let node = document;
  for (const segment of segments) {
    if (node === null || typeof node !== 'object' || !Object.hasOwn(node, segment)) return { found: false };
    node = node[segment];
  }
  return { found: true, node };
}

function decodePointer(value) {
  return value === '' ? [] : value.slice(1).split('/').map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function applyPatch(source, patch) {
  const document = structuredClone(source);
  for (const operation of patch) {
    const segments = decodePointer(operation.path);
    const parent = getNode(document, segments.slice(0, -1));
    const key = segments.at(-1);
    if (!parent.found || parent.node === null || typeof parent.node !== 'object') throw new Error(`patch target ${operation.path} has no parent`);
    if (operation.op === 'move') {
      const from = decodePointer(operation.from);
      const fromParent = getNode(document, from.slice(0, -1)).node;
      if (!Object.hasOwn(fromParent, from.at(-1))) throw new Error(`patch source ${operation.from} does not exist`);
      const value = fromParent[from.at(-1)];
      delete fromParent[from.at(-1)];
      parent.node[key] = value;
    } else if (operation.op === 'remove') {
      if (!Object.hasOwn(parent.node, key)) throw new Error(`patch target ${operation.path} does not exist`);
      delete parent.node[key];
    } else {
      if (operation.op === 'replace' && !Object.hasOwn(parent.node, key)) throw new Error(`patch target ${operation.path} does not exist`);
      parent.node[key] = structuredClone(operation.value);
    }
  }
  return document;
}

// Blockers are target errors whose rule a conversion rule explains. A generic
// schema error reported at, or next to, an explained location is a
// consequence of it (for example the alternatives of a oneOf); any other
// target error is an undeclared incompatibility.
function analyze(conversion, document, where) {
  const targetErrors = validateDocument(document).filter((diagnostic) => diagnostic.severity === 'error');
  const explained = targetErrors.filter((diagnostic) => conversion.explained.has(diagnostic.rule));
  const blockers = new Map();
  for (const diagnostic of explained) {
    const rule = conversion.explained.get(diagnostic.rule);
    blockers.set(`${rule} ${pointer(diagnostic.path)}`, { code: 'conversion-blocked', rule, path: diagnostic.path });
  }
  for (const diagnostic of targetErrors) {
    if (conversion.explained.has(diagnostic.rule)) continue;
    const consequence = diagnostic.rule === 'mcpdesc.document.schema'
      && explained.some((cause) => isPrefix(diagnostic.path.slice(0, -1), cause.path));
    if (!consequence) fail(`${where}: undeclared incompatibility ${diagnostic.code} (${diagnostic.rule}) at ${pointer(diagnostic.path)}: ${diagnostic.message}`);
  }
  return [...blockers.values()];
}

function convert(source, from, to, fixes, where) {
  const conversion = conversions.get(`${from}->${to}`);
  if (!conversion) {
    return { status: 'unsupported', diagnostics: [{ code: 'conversion-path-undefined', rule: 'mcpdesc.conversion.path-defined', path: [] }] };
  }
  const validateSource = sourceValidator(from);
  if (!validateSource || !validateSource(source)) {
    return { status: 'invalid-source', diagnostics: [{ code: 'conversion-source-invalid', rule: 'mcpdesc.conversion.source-valid', path: [] }] };
  }

  const patch = [];
  for (const rewrite of conversion.rewrites) {
    const segments = decodePointer(rewrite.path);
    if (rewrite.ifPresent && !getNode(source, segments).found) continue;
    patch.push({ op: 'replace', path: rewrite.path, value: rewrite.valueFrom === 'target-schema-id' ? conversion.targetSchemaId : rewrite.value });
  }

  const diagnostics = [];
  if (fixes.length) {
    const blockers = analyze(conversion, applyPatch(source, patch), where);
    for (const request of fixes) {
      const notApplicable = { code: 'conversion-fix-not-applicable', rule: 'mcpdesc.conversion.fix-applicable', path: request.path };
      const blocker = blockers.find((candidate) => pointer(candidate.path) === pointer(request.path));
      const rule = blocker && conversion.rules.find((candidate) => candidate.id === blocker.rule);
      if (!rule?.fixes.includes(request.fix)) {
        diagnostics.push(notApplicable);
        continue;
      }
      if (request.fix === 'remove-property') {
        patch.push({ op: 'remove', path: pointer(request.path) });
      } else if (request.fix === 'move-to-experimental') {
        const owner = request.path.slice(0, -1);
        const name = request.path.at(-1);
        const experimental = getNode(applyPatch(source, patch), [...owner, 'experimental']);
        if (experimental.found && Object.hasOwn(experimental.node, name)) {
          diagnostics.push(notApplicable);
          continue;
        }
        if (!experimental.found) patch.push({ op: 'add', path: pointer([...owner, 'experimental']), value: {} });
        patch.push({ op: 'move', from: pointer(request.path), path: pointer([...owner, 'experimental', name]) });
      } else {
        fail(`${where}: no test implementation for fix ${request.fix}`);
      }
    }
  }

  diagnostics.push(...analyze(conversion, applyPatch(source, patch), where));
  return diagnostics.length ? { status: 'blocked', diagnostics } : { status: 'converted', patch };
}

const sortedCanonical = (diagnostics) => diagnostics.map(canonical).sort();
const caseFiles = fs.existsSync(fixtureDirectory)
  ? fs.readdirSync(fixtureDirectory).filter((name) => name.endsWith('.json')).sort()
  : [];
const usedDocuments = new Set();
const coveredRules = new Set();
const appliedFixes = new Set();
const coveredCodes = new Set();
let yamlSource = false;

for (const file of caseFiles) {
  const where = `${conversionRel}/fixtures/${file}`;
  const testCase = JSON.parse(fs.readFileSync(path.join(fixtureDirectory, file), 'utf8'));
  if (!validateCase(testCase)) {
    fail(`${where}: ${schemaAjv.errorsText(validateCase.errors)}`);
    continue;
  }
  let source = testCase.document;
  if (typeof source === 'string') {
    const full = path.resolve(fixtureDirectory, source);
    usedDocuments.add(full);
    if (!fs.existsSync(full)) {
      fail(`${where}: missing document ${source}`);
      continue;
    }
    if (documentFormatForPath(full) === 'yaml') yamlSource = true;
    source = decodeDocumentSource(fs.readFileSync(full, 'utf8'), documentFormatForPath(full), source);
  }

  const result = convert(source, testCase.from, testCase.to, testCase.fixes ?? [], where);
  if (result.status !== testCase.expectedStatus) {
    fail(`${where}: status is ${result.status}, expected ${testCase.expectedStatus}${result.diagnostics ? `; diagnostics ${JSON.stringify(result.diagnostics)}` : ''}`);
    continue;
  }
  if (result.status === 'converted') {
    if (canonical(result.patch) !== canonical(testCase.expectedPatch)) {
      fail(`${where}: patch is ${JSON.stringify(result.patch)}, expected ${JSON.stringify(testCase.expectedPatch)}`);
    }
    for (const request of testCase.fixes ?? []) appliedFixes.add(request.fix);
  } else {
    if (canonical(sortedCanonical(result.diagnostics)) !== canonical(sortedCanonical(testCase.expectedDiagnostics))) {
      fail(`${where}: diagnostics are ${JSON.stringify(result.diagnostics)}, expected ${JSON.stringify(testCase.expectedDiagnostics)}`);
    }
    for (const diagnostic of result.diagnostics) {
      coveredCodes.add(diagnostic.code);
      if (diagnostic.code === 'conversion-blocked') coveredRules.add(diagnostic.rule);
    }
  }
}

// Coverage: every released document of each source version, every rule, fix,
// and diagnostic code, a YAML source, and no unused source document.
for (const conversion of conversions.values()) {
  const released = path.join(root, 'spec', conversion.from);
  for (const directory of ['examples', 'fixtures/expected-valid', 'fixtures/expected-warning']) {
    const full = path.join(released, directory);
    if (!fs.existsSync(full)) continue;
    for (const name of fs.readdirSync(full).filter((entry) => /\.(?:json|ya?ml)$/.test(entry))) {
      if (!usedDocuments.has(path.join(full, name))) fail(`${conversionRel}: no case converts spec/${conversion.from}/${directory}/${name}`);
    }
  }
  for (const rule of conversion.rules) if (!coveredRules.has(rule.id)) fail(`${conversionRel}: no case is blocked by ${rule.id}`);
  for (const fix of conversion.fixes) if (!appliedFixes.has(fix.id)) fail(`${conversionRel}: no converted case applies fix ${fix.id}`);
}
for (const code of ['conversion-source-invalid', 'conversion-path-undefined', 'conversion-blocked', 'conversion-fix-not-applicable']) {
  if (!coveredCodes.has(code)) fail(`${conversionRel}: no case expects ${code}`);
}
if (!yamlSource) fail(`${conversionRel}: no case converts a YAML source`);
const documentDirectory = path.join(fixtureDirectory, 'documents');
if (fs.existsSync(documentDirectory)) {
  for (const name of fs.readdirSync(documentDirectory)) {
    if (!usedDocuments.has(path.join(documentDirectory, name))) fail(`${conversionRel}/fixtures/documents/${name}: not used by any case`);
  }
}

if (errors.length) {
  console.error(`Conversion fixture check failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const ruleCount = [...conversions.values()].reduce((count, conversion) => count + conversion.rules.length, 0);
console.log(`Conversion fixtures passed: ${caseFiles.length} case(s) cover ${conversions.size} version pair(s), ${ruleCount} conversion rule(s), every fix and diagnostic code, and every released source document.`);
