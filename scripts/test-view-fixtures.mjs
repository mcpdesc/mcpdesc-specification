// Check the Effective Protocol View and merge cases in <specification>/view-fixtures/
// (Sections 4.12 and 4.13, Proposal 0033) against the reference operations of
// scripts/mcpdesc-views.mjs. A view or merge case expects either a result
// document, compared by semantic equivalence, or a failure that a cited
// requirement anchor mandates. Every merge result must also satisfy the
// round-trip invariant of Section 4.13 for each input revision.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv2020 from 'ajv/dist/2020.js';
import { candidateSpecification } from './candidate-specification.mjs';
import { decodeDocumentSource, documentFormatForPath } from './decode-document.mjs';
import { mergeProtocolDescriptions, projectProtocolView, semanticallyEquivalent } from './mcpdesc-views.mjs';
import { resolveComponentReferences, validateDocument } from './validate-document.mjs';

const root = process.cwd();
const { specificationRoot } = candidateSpecification(root);
const specificationDirectory = path.join(root, specificationRoot);
const fixtureDirectory = path.join(specificationDirectory, 'view-fixtures');
const fixtureRel = `${specificationRoot}/view-fixtures`;

if (!fs.existsSync(fixtureDirectory)) {
  console.log(`View fixtures: none in ${specificationRoot}.`);
  process.exit(0);
}

const errors = [];
const fail = (message) => errors.push(message);
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
const validateCase = ajv.compile(JSON.parse(fs.readFileSync(path.join(fixtureDirectory, 'schema', 'view-case.schema.json'), 'utf8')));

const anchors = new Set();
for (const name of fs.readdirSync(path.join(specificationDirectory, 'sections')).filter((file) => file.endsWith('.md'))) {
  for (const match of fs.readFileSync(path.join(specificationDirectory, 'sections', name), 'utf8').matchAll(/<a id="(req-[a-z0-9-]+)"><\/a>/g)) anchors.add(match[1]);
}

const used = new Set();
function load(relative) {
  const full = path.join(fixtureDirectory, relative);
  if (relative.startsWith('inputs/') || relative.startsWith('expected/')) used.add(relative);
  return decodeDocumentSource(fs.readFileSync(full, 'utf8'), documentFormatForPath(full), relative);
}

// Reference identity is not semantic: compare documents with every component reference resolved.
function resolved(document) {
  const result = resolveComponentReferences(document).document;
  delete result.components;
  return result;
}

const coverage = { view: { value: 0, failure: 0 }, merge: { value: 0, failure: 0 } };
const caseFiles = fs.readdirSync(fixtureDirectory).filter((name) => name.endsWith('.json')).sort();
for (const name of caseFiles) {
  const where = `${fixtureRel}/${name}`;
  const testCase = JSON.parse(fs.readFileSync(path.join(fixtureDirectory, name), 'utf8'));
  if (!validateCase(testCase)) {
    for (const error of validateCase.errors ?? []) fail(`${where}: ${error.instancePath || '/'} ${error.message}`);
    continue;
  }
  const missing = [...testCase.inputs, testCase.expected].filter((relative) => relative && !fs.existsSync(path.join(fixtureDirectory, relative)));
  if (missing.length) {
    fail(`${where}: missing ${missing.join(', ')}`);
    continue;
  }
  const inputs = testCase.inputs.map(load);
  let result;
  let failure;
  try {
    result = testCase.operation === 'view' ? projectProtocolView(inputs[0], testCase.revision) : mergeProtocolDescriptions(inputs);
  } catch (error) {
    failure = error;
  }

  if (testCase.expectedFailure) {
    coverage[testCase.operation].failure += 1;
    if (!anchors.has(testCase.expectedFailure)) fail(`${where}: requirement anchor ${testCase.expectedFailure} does not exist`);
    if (!failure) fail(`${where}: expects a failure required by ${testCase.expectedFailure}, but the ${testCase.operation} succeeds`);
    continue;
  }
  coverage[testCase.operation].value += 1;
  if (failure) {
    fail(`${where}: the ${testCase.operation} fails: ${failure.message}`);
    continue;
  }
  const expected = load(testCase.expected);
  const expectedErrors = validateDocument(expected).filter((diagnostic) => diagnostic.severity === 'error');
  if (expectedErrors.length) fail(`${where}: ${testCase.expected} is not valid: ${expectedErrors.map((diagnostic) => diagnostic.code).join(', ')}`);
  if (!semanticallyEquivalent(result, expected)) fail(`${where}: the ${testCase.operation} result is not semantically equivalent to ${testCase.expected}`);
  if (testCase.operation === 'merge') {
    inputs.forEach((input, index) => {
      for (const revision of input.protocolVersions) {
        if (!semanticallyEquivalent(resolved(projectProtocolView(result, revision)), resolved(projectProtocolView(input, revision)))) {
          fail(`${where}: the merge result's MCP ${revision} view is not equivalent to input ${index + 1}'s (Section 4.13 round trip)`);
        }
      }
    });
  }
}

for (const folder of ['inputs', 'expected']) {
  const directory = path.join(fixtureDirectory, folder);
  for (const name of fs.existsSync(directory) ? fs.readdirSync(directory).sort() : []) {
    if (!used.has(`${folder}/${name}`)) fail(`${fixtureRel}/${folder}/${name} is not used by any case`);
  }
}
for (const [operation, counts] of Object.entries(coverage)) {
  if (!counts.value || !counts.failure) fail(`${fixtureRel}: ${operation} needs at least one case with a result and one with a failure`);
}

if (errors.length) {
  console.error(`View fixture check failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`View fixtures passed: ${caseFiles.length} case(s): ${coverage.view.value} view result(s), ${coverage.view.failure} view failure(s), ${coverage.merge.value} merge result(s), and ${coverage.merge.failure} merge failure(s); every merge result satisfies the round-trip invariant.`);
