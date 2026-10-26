// Check the validation rule registry under <specification>/validation/.
//
// Validates registry files against rule.schema.json and checks identifier
// ownership, revision applicability, source tiers, the revision support-tier
// policy for gaps, fixtures, and diagnostic codes against the candidate
// validator. Reports diagnostic-code coverage without failing until the
// rule inventory is complete.

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { candidateSpecification } from './candidate-specification.mjs';
import { decodeDocumentSource, documentFormatForPath } from './decode-document.mjs';
import { supportedProtocolVersions, validateDocument } from './validate-document.mjs';

// Revisions whose defects may be left uncorrected as not-fixed gaps (Proposal 0024, Section 4.1).
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
const fixtureDiagnostics = new Map();
function diagnosticsForFixture(relative) {
  if (!fixtureDiagnostics.has(relative)) {
    const full = path.join(fixtureRoot, relative);
    const document = decodeDocumentSource(fs.readFileSync(full, 'utf8'), documentFormatForPath(full), relative);
    fixtureDiagnostics.set(relative, validateDocument(document));
  }
  return fixtureDiagnostics.get(relative);
}
const codesForFixture = (relative) => new Set(diagnosticsForFixture(relative).map((diagnostic) => diagnostic.code));
const rulesForFixture = (relative) => new Set(diagnosticsForFixture(relative).map((diagnostic) => diagnostic.rule));
const registeredRules = new Map();

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
    registeredRules.set(rule.id, rule);
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
    if (rule.owner === 'mcp' && ['should', 'may'].includes(rule.requirement) && rule.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
      fail(`${where}: a ${rule.requirement}-level mcp rule must not emit error diagnostics`);
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
        } else if (!rulesForFixture(fixture).has(rule.id)) {
          fail(`${where}: no diagnostic in ${fixture} identifies this rule`);
        }
      }
    }
  }
}

// Diagnostics identify registered rules consistently (Proposal 0024, Section 5).
let attributed = 0;
for (const category of fs.readdirSync(fixtureRoot).filter((name) => name.startsWith('expected-')).sort()) {
  for (const name of fs.readdirSync(path.join(fixtureRoot, category)).filter((file) => /\.(?:json|ya?ml)$/.test(file)).sort()) {
    const fixture = `${category}/${name}`;
    for (const diagnostic of diagnosticsForFixture(fixture)) {
      if (diagnostic.code === 'schema-validation' && !diagnostic.rule) fail(`${fixture}: schema-validation diagnostic without a rule`);
      if (!diagnostic.rule) continue;
      attributed += 1;
      const rule = registeredRules.get(diagnostic.rule);
      if (!rule) {
        fail(`${fixture}: diagnostic ${diagnostic.code} identifies unregistered rule ${diagnostic.rule}`);
      } else if (!rule.diagnostics.some(({ code, severity }) => code === diagnostic.code && severity === diagnostic.severity)) {
        fail(`${fixture}: rule ${diagnostic.rule} does not declare ${diagnostic.severity} ${diagnostic.code}`);
      }
    }
  }
}

const mcpSchemasDirectory = path.join(validationRoot, 'mcp-schemas');
const mcpSchemasRel = `${specificationRoot}/validation/mcp-schemas`;
if (!fs.existsSync(path.join(mcpSchemasDirectory, 'manifest.json'))) {
  fail(`${mcpSchemasRel}/manifest.json is missing`);
} else {
  const manifest = JSON.parse(fs.readFileSync(path.join(mcpSchemasDirectory, 'manifest.json'), 'utf8'));
  if (!/^[0-9a-f]{40}$/.test(manifest.commit ?? '')) fail(`${mcpSchemasRel}/manifest.json: commit must be a full commit ID`);
  const listed = new Set();
  for (const entry of manifest.files ?? []) {
    listed.add(entry.path);
    const full = path.join(mcpSchemasDirectory, entry.path);
    if (!fs.existsSync(full)) {
      fail(`${mcpSchemasRel}/${entry.path} is listed in the manifest but missing`);
    } else if (createHash('sha256').update(fs.readFileSync(full)).digest('hex') !== entry.sha256) {
      fail(`${mcpSchemasRel}/${entry.path}: SHA-256 differs from the manifest; vendored MCP files must stay byte-identical`);
    }
  }
  for (const revision of supportedProtocolVersions) {
    for (const file of ['schema.ts', 'schema.json']) {
      if (!listed.has(`${revision}/${file}`)) fail(`${mcpSchemasRel}: manifest does not list ${revision}/${file}`);
    }
  }
  const present = fs.readdirSync(mcpSchemasDirectory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(mcpSchemasDirectory, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
  for (const file of present) {
    if (file !== 'manifest.json' && !listed.has(file)) fail(`${mcpSchemasRel}/${file} is not listed in the manifest`);
  }
}

if (errors.length) {
  console.error(`Validation rule registry check failed with ${errors.length} error(s):`);
  for (const error of errors.sort()) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validation rule registry passed: ${ruleIds.size} rule(s) in ${files.length} file(s); ${attributed} fixture diagnostic(s) identify a rule; covers ${coveredCodes.size} of ${emittedCodes.size} candidate diagnostic codes.`);
