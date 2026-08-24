// Exercise projection, merge, and semantic-equivalence behavior.
//
// This executable uses repository fixtures to verify revision filtering,
// scope removal and union, security semantics, conflict detection, extension
// preservation, Tool-example preservation, unresolved-reference preservation,
// and round trips. It is the
// Effective Protocol View test half of `npm test`.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { mergeProtocolDescriptions, projectProtocolView, semanticallyEquivalent } from './mcpdesc-views.mjs';

const root = process.cwd();

function fixture(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(fixture('schemas/mcp-description/0.8.0.json'));

function assertStructurallyConforming(document) {
  assert.equal(
    validate(document),
    true,
    validate.errors?.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ')
  );
}

const scoped = fixture('spec/draft/fixtures/expected-valid/protocol-scoped-primitives.json');
const view2025 = projectProtocolView(scoped, '2025-11-25');
const view2026 = projectProtocolView(scoped, '2026-07-28');

assert.deepEqual(view2025.protocolVersions, ['2025-11-25']);
assert.deepEqual(view2026.protocolVersions, ['2026-07-28']);
assert.equal(view2025.tools.length, 1);
assert.equal(view2025.tools[0].execution.taskSupport, 'optional');
assert.equal('protocolVersions' in view2025.tools[0], false);
assert.equal(view2026.tools.length, 1);
assert.equal('execution' in view2026.tools[0], false);
assert.equal('protocolVersions' in view2026.tools[0], false);
assert.throws(() => projectProtocolView(scoped, '2025-06-18'), /absent from root protocolVersions/);
assertStructurallyConforming(view2025);
assertStructurallyConforming(view2026);

const capabilityScoped = structuredClone(scoped);
capabilityScoped.capabilities = [
  {
    protocolVersions: ['2025-11-25'],
    tools: { listChanged: true }
  }
];
const viewWithoutCapabilities = projectProtocolView(capabilityScoped, '2026-07-28');
assert.equal('capabilities' in viewWithoutCapabilities, false);
assertStructurallyConforming(viewWithoutCapabilities);

const merged = mergeProtocolDescriptions([view2025, view2026]);
assert.deepEqual(merged.protocolVersions, ['2025-11-25', '2026-07-28']);
assert.equal(merged.tools.length, 2);
assert.ok(semanticallyEquivalent(projectProtocolView(merged, '2025-11-25'), view2025));
assert.ok(semanticallyEquivalent(projectProtocolView(merged, '2026-07-28'), view2026));

const secured = fixture('spec/draft/fixtures/expected-valid/security-root-and-override.json');
const securedView = projectProtocolView(secured, secured.protocolVersions[0]);
assert.deepEqual(securedView.security, secured.security);
assert.deepEqual(securedView.tools.find((tool) => tool.name === 'health').security, []);

const composedSecurity = fixture('spec/draft/fixtures/expected-valid/security-composition-and-inheritance.json');
const composedSecurityView = projectProtocolView(composedSecurity, '2026-07-28');
const clearedSecurity = composedSecurityView.tools.find((tool) => tool.name === 'cleared_requirement');
const anonymousSecurity = composedSecurityView.tools.find((tool) => tool.name === 'anonymous_only');
assert.deepEqual(clearedSecurity.security, []);
assert.deepEqual(anonymousSecurity.security, [{}]);

const clearedVariant = structuredClone(composedSecurityView);
clearedVariant.tools = [clearedSecurity];
const anonymousVariant = structuredClone(composedSecurityView);
anonymousVariant.tools = [{ ...clearedSecurity, security: [{}] }];
assert.equal(semanticallyEquivalent(clearedVariant, anonymousVariant), false);
assert.throws(
  () => mergeProtocolDescriptions([clearedVariant, anonymousVariant]),
  /Conflicting Effective Protocol Views/
);

const securityOrder2025 = projectProtocolView(secured, '2025-11-25');
delete securityOrder2025.capabilities;
securityOrder2025.tools = [
  {
    name: 'ordered_security',
    inputSchema: {
      type: 'object',
      additionalProperties: false
    },
    security: [
      { oauth: ['issues:read', 'issues:write'] },
      { 'api-key': [] }
    ]
  }
];
const securityOrder2026 = structuredClone(securityOrder2025);
securityOrder2026.protocolVersions = ['2026-07-28'];
securityOrder2026.tools[0].security = [
  { 'api-key': [] },
  { oauth: ['issues:write', 'issues:read'] }
];
const mergedSecurityOrder = mergeProtocolDescriptions([securityOrder2025, securityOrder2026]);
assert.equal(mergedSecurityOrder.tools.length, 1);
assert.equal('protocolVersions' in mergedSecurityOrder.tools[0], false);
assert.ok(semanticallyEquivalent(projectProtocolView(mergedSecurityOrder, '2025-11-25'), securityOrder2025));
assert.ok(semanticallyEquivalent(projectProtocolView(mergedSecurityOrder, '2026-07-28'), securityOrder2026));
assertStructurallyConforming(mergedSecurityOrder);

const extensionSource = fixture('spec/draft/fixtures/expected-valid/unknown-extension-identifier.json');
const extensionView = projectProtocolView(extensionSource, '2026-07-28');
assert.deepEqual(
  extensionView.capabilities[0].extensions['com.example/custom-feature'],
  { enabled: true }
);
const mergedExtension = mergeProtocolDescriptions([extensionView]);
assert.deepEqual(
  mergedExtension.capabilities[0].extensions['com.example/custom-feature'],
  { enabled: true }
);

const reservedExtensionSource = fixture('spec/draft/fixtures/expected-warning/unknown-reserved-extension-identifier.json');
const reservedExtensionView = projectProtocolView(reservedExtensionSource, '2026-07-28');
assert.deepEqual(
  reservedExtensionView.capabilities[0].extensions['io.modelcontextprotocol/future-capability'],
  { enabled: true }
);
const mergedReservedExtension = mergeProtocolDescriptions([reservedExtensionView]);
assert.deepEqual(
  mergedReservedExtension.capabilities[0].extensions['io.modelcontextprotocol/future-capability'],
  { enabled: true }
);

const externalReferenceSource = fixture('spec/draft/fixtures/expected-warning/unresolved-external-tool-ref.json');
const externalReferenceView = projectProtocolView(externalReferenceSource, '2026-07-28');
assert.equal(
  externalReferenceView.tools[0].inputSchema.properties.identifier.$ref,
  'https://schemas.example.com/common.json#/$defs/identifier'
);
const mergedExternalReference = mergeProtocolDescriptions([externalReferenceView]);
assert.equal(
  mergedExternalReference.tools[0].inputSchema.properties.identifier.$ref,
  'https://schemas.example.com/common.json#/$defs/identifier'
);

const toolExampleSource = fixture('spec/draft/fixtures/expected-valid/named-tool-examples.json');
const toolExampleView = projectProtocolView(toolExampleSource, '2026-07-28');
assert.deepEqual(toolExampleView.tools[0].examples, toolExampleSource.tools[0].examples);
const mergedToolExamples = mergeProtocolDescriptions([toolExampleView]);
assert.deepEqual(mergedToolExamples.tools[0].examples, toolExampleSource.tools[0].examples);

const resourceExampleSource = fixture('spec/draft/fixtures/expected-valid/named-resource-examples.json');
const resourceExampleView = projectProtocolView(resourceExampleSource, '2026-07-28');
assert.deepEqual(resourceExampleView.resources[0].examples, resourceExampleSource.resources[1].examples);
assert.deepEqual(resourceExampleView.resourceTemplates[0].examples, resourceExampleSource.resourceTemplates[0].examples);
const mergedResourceExamples = mergeProtocolDescriptions([resourceExampleView]);
assert.deepEqual(mergedResourceExamples.resources[0].examples, resourceExampleView.resources[0].examples);
assert.deepEqual(mergedResourceExamples.resourceTemplates[0].examples, resourceExampleView.resourceTemplates[0].examples);

const changedInstructions = structuredClone(view2026);
changedInstructions.instructions = 'Different durable guidance.';
assert.throws(
  () => mergeProtocolDescriptions([view2025, changedInstructions]),
  /Conflicting unscoped metadata/
);

const conflictingView = structuredClone(view2025);
conflictingView.tools[0].description = 'A conflicting declaration for the same revision.';
assert.throws(
  () => mergeProtocolDescriptions([view2025, conflictingView]),
  /Conflicting Effective Protocol Views/
);

const invalidProjectionSource = structuredClone(scoped);
invalidProjectionSource.transports = [
  {
    type: 'stdio',
    command: 'scope-gap',
    protocolVersions: ['2025-11-25']
  }
];
assert.throws(
  () => projectProtocolView(invalidProjectionSource, '2025-11-25'),
  /transport-coverage-gap/
);

const invalidRevisionApplicabilitySource = structuredClone(scoped);
invalidRevisionApplicabilitySource.info.description = 'This field is not defined for the 2024-11-05 root revision';
invalidRevisionApplicabilitySource.protocolVersions = ['2024-11-05', '2025-11-25'];
assert.throws(
  () => projectProtocolView(invalidRevisionApplicabilitySource, '2024-11-05'),
  /field-not-supported-by-version/
);

const invalidMergeInput = structuredClone(view2025);
delete invalidMergeInput.tools[0].inputSchema;
assert.throws(
  () => mergeProtocolDescriptions([invalidMergeInput]),
  /schema-validation/
);

console.log('Protocol projection and merge tests passed.');
