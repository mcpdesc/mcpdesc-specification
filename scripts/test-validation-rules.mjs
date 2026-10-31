// Check the validation rule registry under <specification>/validation/.
//
// Validates registry files against rule.schema.json and checks identifier
// ownership, revision applicability, source tiers, the revision support-tier
// policy for gaps, and fixture evidence. Each fixture citation's outcome must
// match what the candidate validator or projection case shows, every fixture
// diagnostic must identify a registered rule that cites a fixture with that
// outcome, and every rule identifier in the validator must be registered.
// Diagnostic codes belong to validator output, not to rule records.

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { candidateSpecification } from './candidate-specification.mjs';
import { decodeDocumentSource, documentFormatForPath } from './decode-document.mjs';
import { obligationSentences } from './normative-sentences.mjs';
import { evaluateDocument, supportedProtocolVersions } from './validate-document.mjs';
import { checkRuleApplicability } from './validation-catalog.mjs';
import { checkStage, declaredCheckRules } from './validator-base.mjs';

// Revisions whose defects may be left uncorrected as not-fixed gaps (Proposal 0024, Section 4.1).
const historicalRevisions = new Set(['2024-11-05', '2025-03-26']);

const root = process.cwd();
const { specificationRoot, schemaPath } = candidateSpecification(root);
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
const ruleSchema = JSON.parse(fs.readFileSync(path.join(validationRoot, 'rule.schema.json'), 'utf8'));
ajv.addSchema(ruleSchema);
const validateRegistryFile = ajv.getSchema(ruleSchema.$id);
const validateUnchecked = ajv.getSchema(`${ruleSchema.$id}#/$defs/unchecked-requirements`);
const resultSchemaPath = path.join(validationRoot, 'result.schema.json');
const validateResult = fs.existsSync(resultSchemaPath) ? ajv.compile(JSON.parse(fs.readFileSync(resultSchemaPath, 'utf8'))) : undefined;

const validatorRuleReferences = new Set();
for (const file of ['scripts/validator-base.mjs', 'scripts/validate-document.mjs']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of source.matchAll(/['"]((?:mcp|mcpdesc|json-schema)(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+)['"]/g)) validatorRuleReferences.add(match[1]);
}

const fixtureRoot = path.join(root, specificationRoot, 'fixtures');
const fixtureReports = new Map();
// The candidate validator's result with rule results (Proposal 0031) and the evaluations behind them.
function reportForFixture(relative) {
  if (!fixtureReports.has(relative)) {
    const full = path.join(fixtureRoot, relative);
    const document = decodeDocumentSource(fs.readFileSync(full, 'utf8'), documentFormatForPath(full), relative);
    fixtureReports.set(relative, evaluateDocument(document));
  }
  return fixtureReports.get(relative);
}
const diagnosticsForFixture = (relative) => reportForFixture(relative).diagnostics;
const registeredRules = new Map();

const specificationDirectory = path.join(root, specificationRoot);
const readText = (relative) => fs.readFileSync(path.join(specificationDirectory, relative), 'utf8');
const pinnedMcpCommit = (() => {
  try {
    return JSON.parse(readText('validation/mcp-schemas/manifest.json')).commit;
  } catch {
    return undefined;
  }
})();
const headingSlug = (heading) => heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');

const anchorIds = new Map();
// Operation failure identifiers that a requirement sentence defines, such as Section 4.14's projection failures.
const failuresByAnchor = new Map();
const sectionsDirectory = path.join(specificationDirectory, 'sections');
for (const name of fs.existsSync(sectionsDirectory) ? fs.readdirSync(sectionsDirectory).filter((file) => file.endsWith('.md')).sort() : []) {
  for (const match of readText(`sections/${name}`).matchAll(/<a id="(req-[a-z0-9-]+)"><\/a>((?:(?!<a id="req-)[^\n])*)/g)) {
    if (anchorIds.has(match[1])) fail(`${specificationRoot}/sections/${name}: duplicate requirement anchor ${match[1]}`);
    anchorIds.set(match[1], name);
    failuresByAnchor.set(match[1], new Set([...match[2].matchAll(/fail with `([a-z][a-z0-9-]+)`/g)].map((failure) => failure[1])));
  }
}
const citedAnchors = new Set();

// Returns an error message, or undefined when the location resolves.
function checkLocation(location) {
  const [target, fragment] = location.split('#');
  if (target.startsWith('https://')) {
    const pinned = location.match(/^https:\/\/github\.com\/modelcontextprotocol\/modelcontextprotocol\/blob\/([0-9a-f]+)\//);
    if (pinned && pinned[1] !== pinnedMcpCommit) return `MCP permalink must use the pinned commit ${pinnedMcpCommit}`;
    return undefined;
  }
  const full = path.join(specificationDirectory, target);
  if (!fs.existsSync(full)) return `${target} does not exist`;
  if (target.startsWith('validation/mcp-schemas/')) {
    const [first, last = first] = fragment.replaceAll('L', '').split('-').map(Number);
    const lineCount = fs.readFileSync(full, 'utf8').split('\n').length;
    if (!(first >= 1 && first <= last && last <= lineCount)) return `line range ${fragment} is outside ${target}`;
  } else if (target.startsWith('sections/')) {
    if (anchorIds.get(fragment) !== path.basename(target)) return `requirement anchor ${fragment} is not in ${target}`;
    citedAnchors.add(fragment);
  } else if (fragment && !readText(target).split('\n').some((line) => /^#{1,6} /.test(line) && headingSlug(line.replace(/^#+/, '')) === fragment)) {
    return `heading #${fragment} is not in ${target}`;
  }
  return undefined;
}

function resolvePointer(document, pointer) {
  let node = document;
  for (const token of pointer.split('/').slice(1).map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (node === null || typeof node !== 'object' || !Object.hasOwn(node, Array.isArray(node) ? Number(token) : token)) return { found: false };
    node = node[Array.isArray(node) ? Number(token) : token];
  }
  return { found: true };
}
const pointerOf = (segments) => segments.map((segment) => `/${String(segment).replaceAll('~', '~0').replaceAll('/', '~1')}`).join('');
const withinPointer = (diagnostic, pointer) => pointer === '' || pointer.startsWith('/components/')
  || pointerOf(diagnostic.path) === pointer || pointerOf(diagnostic.path).startsWith(`${pointer}/`);
// An evaluation concerns a fragment when either contains the other; checks run at use sites, not in components.
const evaluatedThere = (evaluation, pointer) => withinPointer(evaluation, pointer) || pointer.startsWith(`${pointerOf(evaluation.path)}/`);
const appliesTo = (rule, version) => rule.applicability.protocolVersions === 'independent' || rule.applicability.protocolVersions[version] === 'applies';
const statusesFor = { passes: ['passed'], error: ['failed'], warning: ['warning', 'failed'] };
const weakMcpRequirement = (rule) => rule.owner === 'mcp' && ['should', 'may'].includes(rule.requirement);

const ruleIds = new Set();
const ruleTitles = new Set();
const citedOutcomes = new Map();
const outcomeCounts = { passes: 0, error: 0, warning: 0, 'not-applicable': 0 };
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
    const title = rule.title.trim().toLowerCase();
    if (ruleTitles.has(title)) fail(`${where}: duplicate reader title ${rule.title}`);
    ruleTitles.add(title);
    if (rule.title !== rule.title.trim() || !/^[A-Z]/.test(rule.title)) fail(`${where}: title must be trimmed and start with a capital letter`);
    if (rule.description.trim().split(/\n\s*\n/).length > 3) fail(`${where}: description must contain at most three paragraphs`);
    if (rule.id.split('.')[0] !== rule.owner) fail(`${where}: owner ${rule.owner} does not match the identifier namespace`);

    try {
      checkRuleApplicability(rule, supportedProtocolVersions);
    } catch (error) {
      fail(`${where}: ${error.message}`);
    }
    if (rule.owner === 'mcp' && !(rule.sources ?? []).some((source) => source.tier <= 3)) {
      fail(`${where}: an mcp rule must cite a tier 1 to 3 source`);
    }
    if (rule.owner === 'json-schema' && !rule.sources) fail(`${where}: a json-schema rule must cite its sources`);
    for (const [field, entries] of [['specification', rule.specification], ['source', rule.sources ?? []]]) {
      for (const location of entries.flatMap((entry) => entry.locations)) {
        const problem = checkLocation(location);
        if (problem) fail(`${where}: ${field} location ${location}: ${problem}`);
      }
    }
    if (!rule.specification.some((entry) => entry.locations.some((location) => location.startsWith('sections/')))) {
      fail(`${where}: a rule must cite the MCP Description requirement it checks (a specification location at a requirement anchor)`);
    }
    if (weakMcpRequirement(rule) && rule.fixtures.some((fixture) => fixture.outcome === 'error')) {
      fail(`${where}: a ${rule.requirement}-level mcp rule must not cite error outcomes`);
    }

    if (rule.status === 'retired') continue;

    for (const gap of rule.gaps ?? []) {
      for (const revision of gap.revisions ?? []) {
        if (!supportedProtocolVersions.includes(revision)) fail(`${where}: gap names unsupported revision ${revision}`);
      }
      if (gap.resolution === 'not-fixed' && !(gap.revisions?.length && gap.revisions.every((revision) => historicalRevisions.has(revision)))) {
        fail(`${where}: only historical revisions (${[...historicalRevisions].join(', ')}) may have not-fixed gaps`);
      }
    }

    const outcomes = new Set();
    citedOutcomes.set(rule.id, outcomes);
    const ruleAnchors = rule.specification.flatMap((entry) => entry.locations).filter((location) => location.startsWith('sections/')).map((location) => location.split('#')[1]);
    for (const { path: fixture, pointer, outcome } of rule.fixtures) {
      outcomes.add(outcome);
      outcomeCounts[outcome] += 1;
      if (fixture.startsWith('serialization-fixtures/')) {
        const full = path.join(specificationDirectory, fixture);
        if (!fs.existsSync(full)) {
          fail(`${where}: missing fixture ${fixture}`);
          continue;
        }
        if (pointer !== '') fail(`${where}: ${fixture} must be cited whole, with the empty pointer`);
        let actual = 'passes';
        try {
          decodeDocumentSource(fs.readFileSync(full, 'utf8'), documentFormatForPath(full), fixture);
        } catch {
          actual = 'error';
        }
        if (outcome !== actual) fail(`${where}: ${fixture} is cited as ${outcome}, but decoding ${actual === 'error' ? 'rejects' : 'accepts'} it`);
        continue;
      }
      if (fixture.startsWith('view-fixtures/')) {
        const full = path.join(specificationDirectory, fixture);
        if (!fs.existsSync(full)) {
          fail(`${where}: missing fixture ${fixture}`);
          continue;
        }
        const testCase = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (!resolvePointer(testCase, pointer).found) fail(`${where}: pointer ${JSON.stringify(pointer)} does not resolve in ${fixture}`);
        const actual = testCase.expectedFailure ? 'error' : 'passes';
        if (outcome !== actual) fail(`${where}: ${fixture} is cited as ${outcome}, but the case ${testCase.expectedFailure ? 'expects a failure' : 'expects a document'}`);
        if (testCase.expectedFailure && !ruleAnchors.includes(testCase.expectedFailure)) {
          fail(`${where}: ${fixture} fails under ${testCase.expectedFailure}, which this rule does not cite`);
        }
        continue;
      }
      if (fixture.startsWith('projection-fixtures/')) {
        const full = path.join(specificationDirectory, fixture);
        if (!fs.existsSync(full)) {
          fail(`${where}: missing fixture ${fixture}`);
          continue;
        }
        const testCase = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (!resolvePointer(testCase, pointer).found) fail(`${where}: pointer ${JSON.stringify(pointer)} does not resolve in ${fixture}`);
        const actual = testCase.expectedError ? 'error' : 'passes';
        if (outcome !== actual) fail(`${where}: ${fixture} is cited as ${outcome}, but the case ${testCase.expectedError ? `expects ${testCase.expectedError}` : 'expects a value'}`);
        if (testCase.expectedError && !ruleAnchors.some((anchor) => failuresByAnchor.get(anchor)?.has(testCase.expectedError))) {
          fail(`${where}: ${fixture} expects ${testCase.expectedError}, which no requirement cited by this rule defines`);
        }
        continue;
      }
      if (!fs.existsSync(path.join(fixtureRoot, fixture))) {
        fail(`${where}: missing fixture ${fixture}`);
        continue;
      }
      const full = path.join(fixtureRoot, fixture);
      const document = decodeDocumentSource(fs.readFileSync(full, 'utf8'), documentFormatForPath(full), fixture);
      if (!resolvePointer(document, pointer).found) fail(`${where}: pointer ${JSON.stringify(pointer)} does not resolve in ${fixture}`);
      const ruleDiagnostics = diagnosticsForFixture(fixture).filter((diagnostic) => diagnostic.rule === rule.id);
      // Diagnostics are reported at use sites, so a pointer to a referenced component cannot contain one.
      if (ruleDiagnostics.length && !pointer.startsWith('/components/') && !ruleDiagnostics.some((diagnostic) => withinPointer(diagnostic, pointer))) {
        fail(`${where}: pointer ${JSON.stringify(pointer)} in ${fixture} does not contain a diagnostic of this rule`);
      }
      const severities = new Set(ruleDiagnostics.filter((diagnostic) => withinPointer(diagnostic, pointer)).map((diagnostic) => diagnostic.severity));
      if (severities.size > 1) {
        fail(`${where}: ${fixture} at ${JSON.stringify(pointer)} shows both ${[...severities].join(' and ')}; cite narrower fragments`);
        continue;
      }
      const actual = severities.size
        ? [...severities][0]
        : reportForFixture(fixture).evaluations.some((evaluation) => evaluation.rule === rule.id
          && evaluatedThere(evaluation, pointer)
          && evaluation.protocolVersions.some((version) => appliesTo(rule, version)))
          ? 'passes'
          : 'not-applicable';
      if (outcome !== actual) {
        const shown = { passes: 'ran there and reported nothing', 'not-applicable': 'did not run there for a protocol version it applies to' }[actual] ?? `reports ${actual}`;
        fail(`${where}: ${fixture} at ${JSON.stringify(pointer)} is cited as ${outcome}, but the rule ${shown}`);
      }
      // A document with errors can skip later checks, so silence is evidence only in an error-free fixture.
      if (['passes', 'not-applicable'].includes(actual) && diagnosticsForFixture(fixture).some((diagnostic) => diagnostic.severity === 'error')) {
        fail(`${where}: ${fixture} has errors, so a ${actual} outcome there does not show what the rule checks`);
      }
      // Rule results are the conformance contract: the citation also holds for the document's results (Proposal 0031).
      const statuses = reportForFixture(fixture).results.filter((result) => result.rule === rule.id).map((result) => result.status);
      if (statusesFor[outcome] && !statuses.some((status) => statusesFor[outcome].includes(status))) {
        fail(`${where}: ${fixture} is cited as ${outcome}, but the rule results are ${[...new Set(statuses)].join(', ')}`);
      }
    }
  }
}

// Every fixture diagnostic identifies a registered rule that cites evidence of its severity (Proposals 0024 and 0030).
let attributed = 0;
let schemaDiagnostics = 0;
let rootSchemaDiagnostics = 0;
const observedSeverities = new Map();
const statusCounts = {};
const evaluatedRules = new Set();
for (const category of fs.readdirSync(fixtureRoot).filter((name) => name.startsWith('expected-')).sort()) {
  for (const name of fs.readdirSync(path.join(fixtureRoot, category)).filter((file) => /\.(?:json|ya?ml)$/.test(file)).sort()) {
    const fixture = `${category}/${name}`;
    const { evaluations, stages, ...report } = reportForFixture(fixture);
    if (validateResult && !validateResult(report)) {
      for (const error of validateResult.errors ?? []) fail(`${fixture}: validation result ${error.instancePath || '/'} ${error.message}`);
    }
    const resultKeys = new Set();
    for (const result of report.results) {
      const key = `${result.rule} ${result.protocolVersion ?? ''}`;
      if (resultKeys.has(key)) fail(`${fixture}: rule result ${key.trim()} is reported twice`);
      resultKeys.add(key);
      const status = result.reason ? `${result.status} (${result.reason})` : result.status;
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      // passed comes from a check that ran, never from silence (Proposal 0031).
      if (result.status === 'passed' && !evaluations.some((evaluation) => evaluation.rule === result.rule
        && (!result.protocolVersion || evaluation.protocolVersions.includes(result.protocolVersion)))) {
        fail(`${fixture}: ${key.trim()} is passed, but the candidate validator recorded no evaluation of it`);
      }
      // A check in a skipped stage did not run, so it is neither passed nor without a subject.
      const stage = checkStage(result.rule);
      if (stage && !stages[stage] && ['passed', 'not-applicable'].includes(result.status)
        && (!result.protocolVersion || appliesTo(registeredRules.get(result.rule), result.protocolVersion))) {
        fail(`${fixture}: ${key.trim()} is ${result.status}, but its ${stage} check did not run`);
      }
    }
    for (const ruleId of registeredRules.keys()) {
      if (registeredRules.get(ruleId).status !== 'retired' && !report.results.some((result) => result.rule === ruleId)) fail(`${fixture}: no rule result for ${ruleId}`);
    }
    for (const evaluation of evaluations) {
      evaluatedRules.add(evaluation.rule);
      if (!registeredRules.has(evaluation.rule)) fail(`${fixture}: the candidate validator evaluates unregistered rule ${evaluation.rule}`);
    }
    for (const diagnostic of diagnosticsForFixture(fixture)) {
      if (diagnostic.code === 'schema-validation') {
        schemaDiagnostics += 1;
        if (diagnostic.rule === 'mcpdesc.document.schema') rootSchemaDiagnostics += 1;
      }
      if (!diagnostic.rule) {
        fail(`${fixture}: diagnostic ${diagnostic.code} does not identify a rule`);
        continue;
      }
      attributed += 1;
      const rule = registeredRules.get(diagnostic.rule);
      if (!rule) {
        fail(`${fixture}: diagnostic ${diagnostic.code} identifies unregistered rule ${diagnostic.rule}`);
      } else if (rule.status === 'retired') {
        fail(`${fixture}: diagnostic ${diagnostic.code} identifies retired rule ${diagnostic.rule}`);
      } else {
        if (weakMcpRequirement(rule) && diagnostic.severity === 'error') fail(`${fixture}: ${rule.requirement}-level mcp rule ${rule.id} reports an error`);
        for (const version of diagnostic.protocolVersions ?? []) {
          if (!appliesTo(rule, version)) fail(`${fixture}: ${rule.id} reports ${diagnostic.code} for MCP ${version}, which its applicability does not include`);
        }
        const severities = observedSeverities.get(rule.id) ?? new Map();
        if (!severities.has(diagnostic.severity)) severities.set(diagnostic.severity, fixture);
        observedSeverities.set(rule.id, severities);
      }
    }
  }
}
for (const [ruleId, severities] of observedSeverities) {
  for (const [severity, fixture] of severities) {
    if (!citedOutcomes.get(ruleId)?.has(severity)) fail(`${ruleId}: fixtures report ${severity} diagnostics (for example ${fixture}), but the rule cites no fixture with outcome ${severity}`);
  }
}
for (const reference of validatorRuleReferences) {
  const rule = registeredRules.get(reference);
  if (!rule) fail(`candidate validator references unregistered rule ${reference}`);
  else if (rule.status === 'retired') fail(`candidate validator references retired rule ${reference}`);
}
// Every semantic check the candidate validator declares records an evaluation in some fixture.
for (const ruleId of declaredCheckRules()) {
  if (!evaluatedRules.has(ruleId)) fail(`candidate validator declares a check for ${ruleId}, but no fixture records an evaluation of it`);
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

const uncitedAnchors = [...anchorIds.keys()].filter((id) => !citedAnchors.has(id));

// Every requirement anchor is checked by a rule or listed as unchecked, never both (Proposal 0033).
const uncheckedRel = `${specificationRoot}/validation/unchecked-requirements.yaml`;
const uncheckedAnchors = new Map();
if (fs.existsSync(path.join(root, uncheckedRel))) {
  const unchecked = decodeDocumentSource(fs.readFileSync(path.join(root, uncheckedRel), 'utf8'), 'yaml', uncheckedRel);
  if (!validateUnchecked(unchecked)) {
    for (const error of validateUnchecked.errors ?? []) fail(`${uncheckedRel}: ${error.instancePath || '/'} ${error.message}`);
  } else {
    for (const { location, reason } of unchecked.uncheckedRequirements) {
      const [target, fragment] = location.split('#');
      if (anchorIds.get(fragment) !== path.basename(target)) fail(`${uncheckedRel}: requirement anchor ${fragment} is not in ${target}`);
      else if (uncheckedAnchors.has(fragment)) fail(`${uncheckedRel}: ${fragment} is listed twice`);
      else if (citedAnchors.has(fragment)) fail(`${uncheckedRel}: ${fragment} is cited by a rule, so it is not unchecked`);
      uncheckedAnchors.set(fragment, reason);
    }
  }
}
for (const id of uncitedAnchors) {
  if (!uncheckedAnchors.has(id)) fail(`${specificationRoot}/sections/${anchorIds.get(id)}: requirement anchor ${id} is neither cited by a rule nor listed in ${uncheckedRel}`);
}

// Every obligation sentence starts with, or follows in the same block, a requirement anchor (Proposal 0033).
let obligations = 0;
for (const name of fs.existsSync(sectionsDirectory) ? fs.readdirSync(sectionsDirectory).filter((file) => file.endsWith('.md')).sort() : []) {
  for (const { line, sentence, anchor } of obligationSentences(readText(`sections/${name}`))) {
    obligations += 1;
    if (!anchor) fail(`${specificationRoot}/sections/${name}:${line}: obligation without a requirement anchor: ${sentence.slice(0, 120)}`);
  }
}

// Every canonical schema location belongs to a rule (Proposal 0033).
const documentSchema = JSON.parse(fs.readFileSync(path.join(root, schemaPath), 'utf8'));
const schemaOwners = new Map();
for (const rule of registeredRules.values()) {
  for (const pointer of rule.documentSchema ?? []) {
    const found = pointer.split('/').slice(1).map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'))
      .reduce((node, token) => (node !== null && typeof node === 'object' && Object.hasOwn(node, token) ? node[token] : undefined), documentSchema);
    if (found === undefined) fail(`${rule.id}: documentSchema location ${pointer} does not resolve in ${schemaPath}`);
    if (schemaOwners.has(pointer)) fail(`${rule.id}: documentSchema location ${pointer} is also owned by ${schemaOwners.get(pointer)}`);
    schemaOwners.set(pointer, rule.id);
  }
}
for (const pointer of ['#', ...Object.keys(documentSchema.$defs ?? {}).map((name) => `#/$defs/${name}`)]) {
  if (!schemaOwners.has(pointer)) fail(`${schemaPath}: ${pointer} is not owned by any rule's documentSchema`);
}
const rulesWithFailureEvidence = [...citedOutcomes.values()].filter((outcomes) => outcomes.has('error') || outcomes.has('warning')).length;

if (errors.length) {
  console.error(`Validation rule registry check failed with ${errors.length} error(s):`);
  for (const error of errors.sort()) console.error(`- ${error}`);
  process.exit(1);
}

const citations = Object.values(outcomeCounts).reduce((sum, count) => sum + count, 0);
console.log(`Validation rule registry passed: ${ruleIds.size} rule(s) in ${files.length} file(s); ${citations} fixture citation(s) match their outcome and rule results (${outcomeCounts.passes} passes, ${outcomeCounts.error} error, ${outcomeCounts.warning} warning, ${outcomeCounts['not-applicable']} not-applicable); ${attributed} fixture diagnostic(s) identify a rule with cited evidence of their severity; ${validatorRuleReferences.size} validator rule reference(s) resolve; ${citedAnchors.size} of ${anchorIds.size} requirement anchor(s) cited by a rule and ${uncheckedAnchors.size} listed as unchecked.`);
console.log(`Rule results: ${fixtureReports.size} fixture report(s) match the validation result schema with a result for every rule (${Object.entries(statusCounts).sort().map(([status, count]) => `${count} ${status}`).join(', ')}).`);
console.log(`Catalog coverage: ${schemaOwners.size} document-schema location(s) owned; ${schemaDiagnostics - rootSchemaDiagnostics} of ${schemaDiagnostics} document-schema diagnostic(s) in fixtures attributed below the document root; ${rulesWithFailureEvidence} of ${ruleIds.size} rule(s) cite error or warning evidence; all ${obligations} obligation sentence(s) anchored.`);
