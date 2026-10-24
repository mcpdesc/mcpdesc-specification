// Check the validation rule registry under <specification>/validation/.
//
// Validates registry files against rule.schema.json and checks identifier
// ownership, revision applicability, source tiers, the revision support-tier
// policy for gaps, fixtures, and diagnostic codes against the candidate
// validator. Reports diagnostic-code coverage without failing until the
// rule inventory is complete.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { candidateSpecification } from './candidate-specification.mjs';
import { decodeDocumentSource, documentFormatForPath } from './decode-document.mjs';
import { supportedProtocolVersions, validateDocument } from './validate-document.mjs';

// Revisions whose rule defects are recorded but not corrected (Proposal 0024, Section 4.1).
const historicalRevisions = new Set(['2024-11-05', '2025-03-26']);

const root = process.cwd();
const { specificationRoot } = candidateSpecification(root);
const validationRoot = path.join(root, specificationRoot, 'validation');
const rulesDirectory = path.join(validationRoot, 'rules');
const errors = [];
const fail = (message) => errors.push(message);

if (!fs.existsSync(rulesDirectory)) {
  console.log(`Validation rule registry: none in ${specificationRoot}.`);
  process.exit(0);
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateRegistryFile = ajv.compile(JSON.parse(fs.readFileSync(path.join(validationRoot, 'rule.schema.json'), 'utf8')));

const emittedCodes = new Set();
for (const file of ['scripts/validator-base.mjs', 'scripts/validate-document.mjs']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of source.matchAll(/(?:makeDiagnostic|semanticDiagnostic|componentDiagnostic|diagnostic)\(\s*(?:maturity[^?]*\?\s*)?['"]([a-z][a-z0-9-]+)['"]/g)) emittedCodes.add(match[1]);
  for (const match of source.matchAll(/code:\s*['"]([a-z][a-z0-9-]+)['"]/g)) emittedCodes.add(match[1]);
  for (const match of source.matchAll(/\?\s*['"]([a-z][a-z0-9-]+)['"]\s*:\s*['"]([a-z][a-z0-9-]+)['"]/g)) {
    if (match[1].includes('-') && match[2].includes('-')) emittedCodes.add(match[1]).add(match[2]);
  }
}

const fixtureRoot = path.join(root, specificationRoot, 'fixtures');
const fixtureCodes = new Map();
function codesForFixture(relative) {
  if (!fixtureCodes.has(relative)) {
    const full = path.join(fixtureRoot, relative);
    const document = decodeDocumentSource(fs.readFileSync(full, 'utf8'), documentFormatForPath(full), relative);
    fixtureCodes.set(relative, new Set(validateDocument(document).map((diagnostic) => diagnostic.code)));
  }
  return fixtureCodes.get(relative);
}

const ruleIds = new Set();
const coveredCodes = new Set();
const files = fs.readdirSync(rulesDirectory).filter((name) => /\.ya?ml$/.test(name)).sort();
if (!files.length) fail(`${specificationRoot}/validation/rules: no registry files`);

for (const filename of files) {
  const rel = `${specificationRoot}/validation/rules/${filename}`;
  let registry;
  try {
    registry = decodeDocumentSource(fs.readFileSync(path.join(rulesDirectory, filename), 'utf8'), 'yaml', rel);
  } catch (error) {
    fail(error.message);
    continue;
  }
  if (!validateRegistryFile(registry)) {
    for (const error of validateRegistryFile.errors ?? []) fail(`${rel}: ${error.instancePath || '/'} ${error.message}`);
    continue;
  }

  for (const rule of registry.rules) {
    const where = `${rel}: ${rule.id}`;
    if (ruleIds.has(rule.id)) fail(`${where}: duplicate rule identifier`);
    ruleIds.add(rule.id);
    if (rule.id.split('.')[0] !== rule.owner) fail(`${where}: owner ${rule.owner} does not match the identifier namespace`);

    if (rule.applicability || rule.owner !== 'mcpdesc') {
      const revisions = Object.keys(rule.applicability ?? {}).sort();
      if (JSON.stringify(revisions) !== JSON.stringify([...supportedProtocolVersions].sort())) {
        fail(`${where}: applicability must list exactly ${supportedProtocolVersions.join(', ')}`);
      }
    }
    if (rule.owner === 'mcp' && !rule.sources.some((source) => source.tier <= 3)) {
      fail(`${where}: an mcp rule must cite a tier 1 to 3 source`);
    }

    for (const gap of rule.gaps ?? []) {
      for (const revision of gap.revisions ?? []) {
        if (!supportedProtocolVersions.includes(revision)) fail(`${where}: gap names unsupported revision ${revision}`);
      }
      if (gap.resolution === 'not-fixed' && !(gap.revisions?.length && gap.revisions.every((revision) => historicalRevisions.has(revision)))) {
        fail(`${where}: only historical revisions (${[...historicalRevisions].join(', ')}) may have not-fixed gaps`);
      }
    }

    const ruleCodes = new Set(rule.diagnostics.map((diagnostic) => diagnostic.code));
    for (const code of ruleCodes) {
      if (!emittedCodes.has(code)) fail(`${where}: diagnostic code ${code} is not emitted by the candidate validator`);
      coveredCodes.add(code);
    }

    for (const fixture of rule.fixtures) {
      if (!fs.existsSync(path.join(fixtureRoot, fixture))) {
        fail(`${where}: missing fixture ${fixture}`);
        continue;
      }
      if (fixture.startsWith('expected-invalid/')) {
        if (!ruleCodes.size) fail(`${where}: a rule without diagnostics cannot cite expected-invalid fixture ${fixture}`);
        else if (![...ruleCodes].some((code) => codesForFixture(fixture).has(code))) {
          fail(`${where}: ${fixture} does not emit any of ${[...ruleCodes].join(', ')}`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error(`Validation rule registry check failed with ${errors.length} error(s):`);
  for (const error of errors.sort()) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validation rule registry passed: ${ruleIds.size} rule(s) in ${files.length} file(s); covers ${coveredCodes.size} of ${emittedCodes.size} candidate diagnostic codes.`);
