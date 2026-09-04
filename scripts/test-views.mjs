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
import { decodeDocumentSource, documentFormatForPath } from './decode-document.mjs';
import { mergeProtocolDescriptions, projectProtocolView, semanticallyEquivalent } from './mcpdesc-views.mjs';
import {
  evaluateClientRequirements,
  mcpExtensionCatalogue,
  mcpExtensionMaturity,
  resolveComponentReferences,
  semanticValidateDocument,
  validateMcpdesc08Document
} from './validate-0.8.mjs';

const root = process.cwd();

assert.equal(mcpExtensionCatalogue.effectiveDate, '2026-09-04');
assert.equal(mcpExtensionMaturity('io.modelcontextprotocol/ui'), 'official');
assert.equal(mcpExtensionMaturity('io.modelcontextprotocol/future-capability'), 'uncatalogued');

function fixture(relativePath) {
  return decodeDocumentSource(
    fs.readFileSync(path.join(root, relativePath), 'utf8'),
    documentFormatForPath(relativePath),
    relativePath
  );
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

const partial = fixture('spec/draft/fixtures/expected-valid/minimal-zero-primitives.json');
assertStructurallyConforming(partial);
assert.equal('transports' in partial, false);
for (const [property, emptyValue] of [
  ['transports', []],
  ['securitySchemes', {}],
  ['capabilities', []],
  ['tools', []],
  ['resources', []],
  ['resourceTemplates', []],
  ['prompts', []],
  ['tags', []]
]) {
  const invalid = { ...partial, [property]: emptyValue };
  assert.equal(validate(invalid), false, `${property} must be non-empty when present`);
}
const emptyInputSchema = { type: 'object', additionalProperties: false };
for (const [label, document] of [
  ['info.icons', { ...partial, info: { ...partial.info, icons: [] } }],
  ['capabilities.extensions', { ...partial, capabilities: [{ extensions: {} }] }],
  ['tool.icons', { ...partial, tools: [{ name: 'tool', inputSchema: emptyInputSchema, icons: [] }] }],
  ['tool.tags', { ...partial, tools: [{ name: 'tool', inputSchema: emptyInputSchema, tags: [] }] }],
  ['tool.elicitations', { ...partial, tools: [{ name: 'tool', inputSchema: emptyInputSchema, elicitations: [] }] }],
  ['tool.interactionExamples', { ...partial, tools: [{ name: 'tool', inputSchema: emptyInputSchema, interactionExamples: {} }] }],
  ['resource.tags', { ...partial, resources: [{ uri: 'test://resource', name: 'resource', tags: [] }] }],
  ['resource.elicitations', { ...partial, resources: [{ uri: 'test://resource', name: 'resource', elicitations: [] }] }],
  ['resourceTemplate.tags', { ...partial, resourceTemplates: [{ uriTemplate: 'test://resource/{id}', name: 'template', tags: [] }] }],
  ['resourceTemplate.completionExamples', { ...partial, resourceTemplates: [{ uriTemplate: 'test://resource/{id}', name: 'template', completionExamples: {} }] }],
  ['resourceTemplate.elicitations', { ...partial, resourceTemplates: [{ uriTemplate: 'test://resource/{id}', name: 'template', elicitations: [] }] }],
  ['prompt.tags', { ...partial, prompts: [{ name: 'prompt', tags: [] }] }],
  ['prompt.arguments', { ...partial, prompts: [{ name: 'prompt', arguments: [] }] }],
  ['prompt.completionExamples', { ...partial, prompts: [{ name: 'prompt', completionExamples: {} }] }],
  ['prompt.elicitations', { ...partial, prompts: [{ name: 'prompt', elicitations: [] }] }],
  ['prompt.clientRequirements', { ...partial, prompts: [{ name: 'prompt', clientRequirements: {} }] }]
]) {
  assert.equal(validate(document), false, `${label} must be non-empty when present`);
}
const partialView = projectProtocolView(partial, '2026-07-28');
assert.equal('transports' in partialView, false);
const mergedPartial = mergeProtocolDescriptions([partialView]);
assert.equal('transports' in mergedPartial, false);

const scoped = fixture('spec/draft/fixtures/expected-valid/protocol-scoped-primitives.json');
const view2025 = projectProtocolView(scoped, '2025-11-25');
const view2026 = projectProtocolView(scoped, '2026-07-28');

assert.deepEqual(view2025.protocolVersions, ['2025-11-25']);
assert.deepEqual(view2026.protocolVersions, ['2026-07-28']);
assert.equal(view2025.tools.length, 1);
assert.equal(view2025.tools[0].execution.taskSupport, 'optional');
assert.deepEqual(view2025.tools[0].tags, ['queued']);
assert.deepEqual(view2025.tags, scoped.tags);
assert.equal('protocolVersions' in view2025.tools[0], false);
assert.equal(view2026.tools.length, 1);
assert.equal('execution' in view2026.tools[0], false);
assert.deepEqual(view2026.tools[0].tags, ['stateless']);
assert.deepEqual(view2026.tags, scoped.tags);
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

const primitiveScoped = structuredClone(scoped);
primitiveScoped.tools = primitiveScoped.tools.filter((tool) => tool.protocolVersions?.includes('2025-11-25'));
const viewWithoutTools = projectProtocolView(primitiveScoped, '2026-07-28');
assert.equal('tools' in viewWithoutTools, false);
assertStructurallyConforming(viewWithoutTools);

const merged = mergeProtocolDescriptions([view2025, view2026]);
assert.deepEqual(merged.protocolVersions, ['2025-11-25', '2026-07-28']);
assert.equal(merged.tools.length, 2);
assert.ok(semanticallyEquivalent(projectProtocolView(merged, '2025-11-25'), view2025));
assert.ok(semanticallyEquivalent(projectProtocolView(merged, '2026-07-28'), view2026));

const clientRequirementSource = fixture('spec/draft/fixtures/expected-valid/client-capability-requirements.json');
const clientRequirementView2025 = projectProtocolView(clientRequirementSource, '2025-11-25');
const clientRequirementView2026 = projectProtocolView(clientRequirementSource, '2026-07-28');
assert.deepEqual(clientRequirementView2025.tools[0].clientRequirements, {
  tasks: { requests: { sampling: { createMessage: {} } } }
});
assert.deepEqual(clientRequirementView2026.tools[0].clientRequirements, {
  extensions: {
    'io.modelcontextprotocol/tasks': {},
    'io.modelcontextprotocol/ui': { mimeTypes: ['text/html;profile=mcp-app'] }
  }
});
const mergedClientRequirements = mergeProtocolDescriptions([clientRequirementView2025, clientRequirementView2026]);
assert.equal(mergedClientRequirements.tools.length, 2);
assert.ok(mergedClientRequirements.tools.every((tool) => tool.protocolVersions?.length === 1));
assert.ok(semanticallyEquivalent(
  projectProtocolView(mergedClientRequirements, '2025-11-25'),
  clientRequirementView2025
));
assert.ok(semanticallyEquivalent(
  projectProtocolView(mergedClientRequirements, '2026-07-28'),
  clientRequirementView2026
));

const conflictingClientRequirements = structuredClone(clientRequirementView2026);
conflictingClientRequirements.tools[0].clientRequirements = { elicitation: { form: {} } };
assert.throws(
  () => mergeProtocolDescriptions([clientRequirementView2026, conflictingClientRequirements]),
  /Conflicting Effective Protocol Views/
);

assert.deepEqual(
  evaluateClientRequirements(undefined, {}, '2026-07-28'),
  { status: 'satisfied', declared: false, unsatisfied: [], indeterminate: [] }
);
assert.equal(evaluateClientRequirements(
  { elicitation: { form: {} }, extensions: { 'io.modelcontextprotocol/tasks': {} } },
  { elicitation: { form: {} }, extensions: { 'io.modelcontextprotocol/tasks': {} } },
  '2026-07-28'
).status, 'satisfied');
assert.equal(evaluateClientRequirements(
  { elicitation: { form: {} }, extensions: { 'io.modelcontextprotocol/tasks': {} } },
  { elicitation: { form: {} } },
  '2026-07-28'
).status, 'unsatisfied');
assert.equal(evaluateClientRequirements(
  { extensions: { 'com.example/configured': { mode: 'strict' } } },
  { extensions: { 'com.example/configured': { mode: 'strict' } } },
  '2026-07-28'
).status, 'indeterminate');
assert.equal(evaluateClientRequirements(
  { futureCapability: {} },
  { futureCapability: {} },
  '2026-07-28'
).status, 'indeterminate');

const invalidClientRequirement = structuredClone(clientRequirementView2026);
invalidClientRequirement.tools[0].clientRequirements = { roots: { listChanged: true } };
assert.ok(validateMcpdesc08Document(invalidClientRequirement).some(
  (diagnostic) => diagnostic.code === 'client-requirement-version-mismatch'
));
const malformedClientRequirement = structuredClone(clientRequirementView2025);
malformedClientRequirement.tools[0].clientRequirements = { tasks: { requests: { sampling: null } } };
assert.ok(validateMcpdesc08Document(malformedClientRequirement).some(
  (diagnostic) => diagnostic.code === 'invalid-client-requirement-value'
));

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

const objectExtensionSource = fixture('spec/draft/fixtures/expected-valid/object-level-specification-extensions.json');
const objectExtensionView2025 = projectProtocolView(objectExtensionSource, '2025-11-25');
const objectExtensionView2026 = projectProtocolView(objectExtensionSource, '2026-07-28');
assert.deepEqual(objectExtensionView2025.info['x-example-owner'], {
  team: 'platform',
  protocolVersions: ['extension-private-version']
});
assert.deepEqual(objectExtensionView2025.tools[0]['x-example-lifecycle'], { status: 'legacy' });
assert.equal(objectExtensionView2025.tools[0].examples.default['x-example-confidence'], 0.9);
assert.deepEqual(objectExtensionView2026.tools[0]['x-example-lifecycle'], { status: 'current' });
assert.equal(objectExtensionView2026.tools.length, 1);
const mergedObjectExtensions = mergeProtocolDescriptions([objectExtensionView2025, objectExtensionView2026]);
assert.deepEqual(mergedObjectExtensions.info['x-example-owner'], {
  team: 'platform',
  protocolVersions: ['extension-private-version']
});
assert.equal(mergedObjectExtensions.tools.length, 2);
assert.ok(semanticallyEquivalent(projectProtocolView(mergedObjectExtensions, '2025-11-25'), objectExtensionView2025));
assert.ok(semanticallyEquivalent(projectProtocolView(mergedObjectExtensions, '2026-07-28'), objectExtensionView2026));

const mergeableObjectExtensionView2025 = structuredClone(objectExtensionView2025);
delete mergeableObjectExtensionView2025.tools[0].examples;
const equivalentObjectExtensionView = structuredClone(mergeableObjectExtensionView2025);
equivalentObjectExtensionView.protocolVersions = ['2026-07-28'];
const collapsedObjectExtensions = mergeProtocolDescriptions([mergeableObjectExtensionView2025, equivalentObjectExtensionView]);
assert.equal(collapsedObjectExtensions.tools.length, 1);
assert.equal('protocolVersions' in collapsedObjectExtensions.tools[0], false);

const conflictingObjectExtensionView = structuredClone(equivalentObjectExtensionView);
conflictingObjectExtensionView.tools[0]['x-example-lifecycle'] = { status: 'conflicting' };
assert.equal(semanticallyEquivalent(equivalentObjectExtensionView, conflictingObjectExtensionView), false);
const distinctObjectExtensions = mergeProtocolDescriptions([mergeableObjectExtensionView2025, conflictingObjectExtensionView]);
assert.equal(distinctObjectExtensions.tools.length, 2);
assert.deepEqual(
  distinctObjectExtensions.tools.map((tool) => tool['x-example-lifecycle'].status).sort(),
  ['conflicting', 'legacy']
);

const sameRevisionExtensionConflict = structuredClone(mergeableObjectExtensionView2025);
sameRevisionExtensionConflict.tools[0]['x-example-lifecycle'] = { status: 'conflicting' };
assert.throws(
  () => mergeProtocolDescriptions([mergeableObjectExtensionView2025, sameRevisionExtensionConflict]),
  /Conflicting Effective Protocol Views/
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
assert.equal(resourceExampleView.resources[0].examples['two-files'].result.ttlMs, 60000);
assert.equal(resourceExampleView.resources[0].examples['two-files'].result.cacheScope, 'private');
assert.equal(resourceExampleView.resourceTemplates[0].examples['sample-game'].result.ttlMs, 300000);
assert.equal(resourceExampleView.resourceTemplates[0].examples['sample-game'].result.cacheScope, 'public');
const mergedResourceExamples = mergeProtocolDescriptions([resourceExampleView]);
assert.deepEqual(mergedResourceExamples.resources[0].examples, resourceExampleView.resources[0].examples);
assert.deepEqual(mergedResourceExamples.resourceTemplates[0].examples, resourceExampleView.resourceTemplates[0].examples);

const promptExampleSource = fixture('spec/draft/fixtures/expected-valid/named-prompt-examples.json');
const promptExampleView2025 = projectProtocolView(promptExampleSource, '2025-11-25');
const promptExampleView2026 = projectProtocolView(promptExampleSource, '2026-07-28');
const promptGreeting2025 = promptExampleView2025.prompts.find((prompt) => prompt.name === 'greeting');
const promptGreeting2026 = promptExampleView2026.prompts.find((prompt) => prompt.name === 'greeting');
assert.deepEqual(promptGreeting2025.examples, promptExampleSource.prompts[1].examples);
assert.deepEqual(promptGreeting2026.examples, promptExampleSource.prompts[0].examples);
assert.equal(Object.hasOwn(promptGreeting2025.examples.default.result, 'resultType'), false);
assert.equal(promptGreeting2026.examples.default.$componentRef, '#/components/promptExamples/default-greeting');
const resolvedPromptGreeting2026 = resolveComponentReferences(promptExampleView2026).document.prompts.find((prompt) => prompt.name === 'greeting');
assert.equal(resolvedPromptGreeting2026.examples.default.result.resultType, 'complete');
const mergedPromptExamples = mergeProtocolDescriptions([promptExampleView2025, promptExampleView2026]);
assert.equal(mergedPromptExamples.prompts.length, 3);
assert.deepEqual(
  projectProtocolView(mergedPromptExamples, '2025-11-25').prompts.find((prompt) => prompt.name === 'greeting').examples,
  promptGreeting2025.examples
);
assert.deepEqual(
  projectProtocolView(mergedPromptExamples, '2026-07-28').prompts.find((prompt) => prompt.name === 'greeting').examples,
  promptGreeting2026.examples
);

const completionExampleSource = fixture('spec/draft/fixtures/expected-valid/named-completion-examples.json');
const completionExampleView202511 = projectProtocolView(completionExampleSource, '2025-11-25');
const completionExampleView2026 = projectProtocolView(completionExampleSource, '2026-07-28');
const completionTemplate202511 = completionExampleView202511.resourceTemplates.find((template) => template.name === 'repository_issue');
const completionTemplate2026 = completionExampleView2026.resourceTemplates.find((template) => template.name === 'repository_issue');
const completionPrompt202511 = completionExampleView202511.prompts.find((prompt) => prompt.name === 'team_lead');
const completionPrompt2026 = completionExampleView2026.prompts.find((prompt) => prompt.name === 'team_lead');
assert.deepEqual(
  completionTemplate202511.completionExamples,
  completionExampleSource.resourceTemplates.find((template) => template.protocolVersions?.includes('2025-11-25')).completionExamples
);
assert.equal(Object.hasOwn(completionTemplate202511.completionExamples['issue-prefix'].result, 'resultType'), false);
assert.deepEqual(
  completionPrompt202511.completionExamples,
  completionExampleSource.prompts.find((prompt) => prompt.protocolVersions?.includes('2025-11-25')).completionExamples
);
assert.equal(Object.hasOwn(completionPrompt202511.completionExamples['engineering-a'].result, 'resultType'), false);
assert.deepEqual(
  completionPrompt2026.completionExamples,
  completionExampleSource.prompts.find((prompt) => prompt.protocolVersions?.includes('2026-07-28')).completionExamples
);
assert.equal(completionPrompt2026.completionExamples['engineering-a'].result.resultType, 'complete');
assert.equal(completionTemplate2026.completionExamples['issue-prefix'].result.resultType, 'complete');
const mergedCompletionExamples = mergeProtocolDescriptions([
  completionExampleView202511,
  completionExampleView2026
]);
assert.deepEqual(
  projectProtocolView(mergedCompletionExamples, '2025-11-25').prompts.find((prompt) => prompt.name === 'team_lead').completionExamples,
  completionPrompt202511.completionExamples
);
assert.deepEqual(
  projectProtocolView(mergedCompletionExamples, '2025-11-25').resourceTemplates.find((template) => template.name === 'repository_issue').completionExamples,
  completionTemplate202511.completionExamples
);
assert.deepEqual(
  projectProtocolView(mergedCompletionExamples, '2026-07-28').prompts.find((prompt) => prompt.name === 'team_lead').completionExamples,
  completionPrompt2026.completionExamples
);

const interactionExampleSource = fixture('spec/draft/fixtures/expected-valid/named-tool-interaction-examples.json');
const interactionExampleView202511 = projectProtocolView(interactionExampleSource, '2025-11-25');
const interactionExampleView2026 = projectProtocolView(interactionExampleSource, '2026-07-28');
const interactionTool202511 = interactionExampleView202511.tools.find((tool) => tool.name === 'prepare_release');
const interactionTool2026 = interactionExampleView2026.tools.find((tool) => tool.name === 'prepare_release');
assert.deepEqual(
  interactionTool202511.interactionExamples,
  interactionExampleSource.tools.find((tool) => tool.protocolVersions?.includes('2025-11-25')).interactionExamples
);
assert.deepEqual(
  interactionTool2026.interactionExamples,
  interactionExampleSource.tools.find((tool) => tool.protocolVersions?.includes('2026-07-28')).interactionExamples
);
const mergedInteractionExamples = mergeProtocolDescriptions([
  interactionExampleView202511,
  interactionExampleView2026
]);
assert.equal(mergedInteractionExamples.tools.length, 2);
assert.deepEqual(
  projectProtocolView(mergedInteractionExamples, '2025-11-25').tools.find((tool) => tool.name === 'prepare_release').interactionExamples,
  interactionTool202511.interactionExamples
);
assert.deepEqual(
  projectProtocolView(mergedInteractionExamples, '2026-07-28').tools.find((tool) => tool.name === 'prepare_release').interactionExamples,
  interactionTool2026.interactionExamples
);

const componentSource = fixture('spec/draft/fixtures/expected-valid/reusable-components.json');
assertStructurallyConforming(componentSource);
assert.deepEqual(validateMcpdesc08Document(componentSource).filter((diagnostic) => diagnostic.severity === 'error'), []);
const resolvedComponents = resolveComponentReferences(componentSource).document;
assert.deepEqual(resolvedComponents.tools[0].inputSchema, componentSource.components.schemas.Input);
assert.deepEqual(resolvedComponents.tools[0].examples.basic, componentSource.components.toolExamples.basic);
assert.deepEqual(resolvedComponents.prompts[0].examples.default, componentSource.components.promptExamples.default);
assert.equal(
  resolvedComponents.components.schemas.Input.properties.query.$componentRef,
  undefined,
  '$componentRef inside an embedded JSON Schema is not traversed'
);

for (const [label, mutate] of [
  ['empty outer object', (document) => { document.components = {}; }],
  ['empty namespace', (document) => { document.components.schemas = {}; }],
  ['invalid component name', (document) => { document.components.schemas['bad/name'] = { type: 'object' }; }],
  ['outer protocol scope', (document) => { document.components.protocolVersions = ['2026-07-28']; }],
  ['example component protocol scope', (document) => { document.components.toolExamples.basic.protocolVersions = ['2026-07-28']; }],
  ['reference sibling', (document) => { document.tools[0].inputSchema['x-forbidden'] = true; }],
  ['remote reference', (document) => { document.tools[0].inputSchema.$componentRef = 'https://example.com/components.json#/schemas/Input'; }],
  ['non-component reference', (document) => { document.tools[0].inputSchema.$componentRef = '#/tools/0/inputSchema'; }],
  ['namespace extension value', (document) => { document.components.toolExamples['x-map-extension'] = true; }]
]) {
  const invalid = structuredClone(componentSource);
  mutate(invalid);
  assert.equal(validate(invalid), false, `components must reject ${label}`);
}

const schemaKeywordBoundary = structuredClone(componentSource);
schemaKeywordBoundary.components.schemas.Input.properties.query.$componentRef = 'not-an-mcp-description-reference';
assert.deepEqual(validateMcpdesc08Document(schemaKeywordBoundary).filter((diagnostic) => diagnostic.severity === 'error'), []);
assert.equal(
  resolveComponentReferences(schemaKeywordBoundary).document.tools[0].inputSchema.properties.query.$componentRef,
  'not-an-mcp-description-reference'
);

const invalidComponentResolution = fixture('spec/draft/fixtures/expected-invalid/component-reference-resolution.json');
const invalidResolutionCodes = semanticValidateDocument(invalidComponentResolution).map((diagnostic) => diagnostic.code);
assert.ok(invalidResolutionCodes.includes('missing-component-reference-target'));
assert.ok(invalidResolutionCodes.includes('wrong-component-reference-namespace'));
assert.ok(invalidResolutionCodes.includes('component-reference-cycle'));

const invalidComponentSchemas = fixture('spec/draft/fixtures/expected-invalid/component-contextual-schemas.json');
assert.ok(validateMcpdesc08Document(invalidComponentSchemas).some((diagnostic) => diagnostic.code === 'schema-validation'));
const invalidComponentExamples = fixture('spec/draft/fixtures/expected-invalid/component-contextual-examples.json');
const referencedExampleDiagnostics = semanticValidateDocument(invalidComponentExamples);
assert.ok(referencedExampleDiagnostics.some(
  (diagnostic) => diagnostic.code === 'tool-example-schema-mismatch' && diagnostic.path.at(-1) === 'input'
));
assert.ok(referencedExampleDiagnostics.some(
  (diagnostic) => diagnostic.code === 'tool-example-schema-mismatch' && diagnostic.path.at(-1) === 'structuredContent'
));
assert.ok(referencedExampleDiagnostics.some((diagnostic) => diagnostic.code === 'resource-template-example-invalid-expansion'));
assert.ok(referencedExampleDiagnostics.some((diagnostic) => diagnostic.code === 'prompt-example-unknown-argument'));
const inlineInvalidExamples = structuredClone(invalidComponentExamples);
inlineInvalidExamples.tools[0].examples.bad = structuredClone(inlineInvalidExamples.components.toolExamples['bad-input']);
inlineInvalidExamples.resourceTemplates[0].examples.bad = structuredClone(
  inlineInvalidExamples.components.resourceTemplateExamples['bad-uri']
);
inlineInvalidExamples.prompts[0].examples.bad = structuredClone(inlineInvalidExamples.components.promptExamples['bad-arguments']);
assert.deepEqual(
  semanticValidateDocument(inlineInvalidExamples).map(({ code, path }) => ({ code, path })),
  referencedExampleDiagnostics.map(({ code, path }) => ({ code, path }))
);
const invalidComponentProtocolScope = fixture('spec/draft/fixtures/expected-invalid/component-protocol-scope.json');
const componentProtocolDiagnostics = semanticValidateDocument(invalidComponentProtocolScope);
assert.ok(componentProtocolDiagnostics.some(
  (diagnostic) => diagnostic.code === 'resource-example-cache-fields-version-mismatch'
    && diagnostic.path[0] === 'resources'
    && diagnostic.path[1] === 0
));
assert.equal(componentProtocolDiagnostics.some(
  (diagnostic) => diagnostic.path[0] === 'resources' && diagnostic.path[1] === 1
), false);

const componentProjectionSource = structuredClone(componentSource);
componentProjectionSource.components.schemas.Unused = { type: 'object' };
componentProjectionSource.components.toolExamples.Unused = structuredClone(componentSource.components.toolExamples.basic);
componentProjectionSource.components.promptExamples.Unused = structuredClone(componentSource.components.promptExamples.default);
const projectedComponents = projectProtocolView(componentProjectionSource, '2026-07-28');
assert.deepEqual(Object.keys(projectedComponents.components.schemas), ['Input', 'InputAlias', 'Output', 'Form']);
assert.deepEqual(Object.keys(projectedComponents.components.toolExamples), ['basic']);
assert.deepEqual(Object.keys(projectedComponents.components.promptExamples), ['default']);
assert.equal(projectedComponents.components['x-example-owner'], 'documentation');

const integratedSource = fixture('spec/draft/fixtures/expected-valid/integrated-draft2-features.yaml');
assert.deepEqual(validateMcpdesc08Document(integratedSource), []);
assert.equal('transports' in integratedSource, false);
const integratedView = projectProtocolView(integratedSource, '2026-07-28');
assert.deepEqual(Object.keys(integratedView.components.schemas), ['Input']);
assert.deepEqual(Object.keys(integratedView.components.toolExamples), ['basic']);
assert.equal(integratedView.components['x-example-registry'], 'shared');
assert.equal(integratedView.tools[0].inputSchema.$componentRef, '#/components/schemas/Input');
assert.deepEqual(integratedView.tools[0].clientRequirements, { elicitation: { form: {} } });
assert.deepEqual(integratedView.security, [{ 'api-key': [] }]);
assert.deepEqual(integratedView.tools[0].security, []);
assert.equal('transports' in integratedView, false);
assert.deepEqual(validateMcpdesc08Document(integratedView), []);
const integratedInvalid = structuredClone(integratedSource);
integratedInvalid.tools[0].clientRequirements = { roots: {} };
const integratedInvalidDiagnostics = validateMcpdesc08Document(integratedInvalid);
assert.deepEqual(
  integratedInvalidDiagnostics.map((diagnostic) => diagnostic.code),
  ['deprecated-client-requirement']
);
assert.deepEqual(validateMcpdesc08Document(structuredClone(integratedInvalid)), integratedInvalidDiagnostics);

function componentMergeInput(version, schema, extension = 'shared') {
  return {
    mcpdesc: '0.8.0',
    info: { name: 'component-merge', version: '1.0.0' },
    protocolVersions: [version],
    components: {
      schemas: { Input: schema },
      'x-example-registry': extension
    },
    tools: [{ name: 'search', inputSchema: { $componentRef: '#/components/schemas/Input' } }]
  };
}

const component2025 = componentMergeInput('2025-11-25', { type: 'object', properties: { legacy: { type: 'string' } } });
const component2026 = componentMergeInput('2026-07-28', { type: 'object', properties: { query: { type: 'string' } } });
const mergedComponentCollision = mergeProtocolDescriptions([component2025, component2026]);
assert.deepEqual(Object.keys(mergedComponentCollision.components.schemas), ['Input', 'Input-2']);
assert.deepEqual(
  mergedComponentCollision.tools.map((tool) => tool.inputSchema.$componentRef).sort(),
  ['#/components/schemas/Input', '#/components/schemas/Input-2']
);
assert.deepEqual(mergeProtocolDescriptions([component2025, component2026]), mergedComponentCollision);
assertStructurallyConforming(mergedComponentCollision);

const equivalentComponent2026 = componentMergeInput('2026-07-28', structuredClone(component2025.components.schemas.Input));
const mergedEquivalentComponents = mergeProtocolDescriptions([component2025, equivalentComponent2026]);
assert.deepEqual(Object.keys(mergedEquivalentComponents.components.schemas), ['Input']);
assert.equal(mergedEquivalentComponents.tools.length, 1);
assert.throws(
  () => mergeProtocolDescriptions([component2025, componentMergeInput('2026-07-28', structuredClone(component2025.components.schemas.Input), 'conflict')]),
  /Conflicting Components Object extension/
);

const invalidResourceCacheFields = fixture('spec/draft/fixtures/expected-invalid/resource-example-cache-fields.json');
const invalidResourceCacheDiagnostics = semanticValidateDocument(invalidResourceCacheFields);
assert.ok(invalidResourceCacheDiagnostics.some((diagnostic) => diagnostic.code === 'resource-example-cache-fields-version-mismatch' && diagnostic.message.includes('.ttlMs is required')));
assert.ok(invalidResourceCacheDiagnostics.some((diagnostic) => diagnostic.code === 'resource-example-cache-fields-version-mismatch' && diagnostic.message.includes('.cacheScope is required')));
assert.ok(invalidResourceCacheDiagnostics.some((diagnostic) => diagnostic.code === 'resource-example-cache-fields-version-mismatch' && diagnostic.message.includes('.ttlMs is not defined')));
assert.ok(invalidResourceCacheDiagnostics.some((diagnostic) => diagnostic.code === 'resource-example-cache-fields-version-mismatch' && diagnostic.message.includes('.cacheScope is not defined')));

const invalidInteractionExamples = fixture('spec/draft/fixtures/expected-invalid/invalid-tool-interaction-example-semantics.json');
const invalidInteractionDiagnostics = semanticValidateDocument(invalidInteractionExamples);
assert.ok(invalidInteractionDiagnostics.some((diagnostic) => diagnostic.code === 'unknown-elicitation-declaration'));
assert.ok(invalidInteractionDiagnostics.some((diagnostic) => diagnostic.code === 'interaction-example-elicitation-declaration-mismatch'));
assert.ok(invalidInteractionDiagnostics.some((diagnostic) => diagnostic.code === 'interaction-example-elicitation-content-schema-mismatch'));
assert.ok(invalidInteractionDiagnostics.some((diagnostic) => diagnostic.code === 'interaction-example-version-mismatch'));
assert.ok(invalidInteractionDiagnostics.some((diagnostic) => diagnostic.code === 'interaction-example-roots-uri'));

const warningInteractionExamples = fixture('spec/draft/fixtures/expected-warning/tool-interaction-client-requirements-contradictions.json');
const warningInteractionDiagnostics = semanticValidateDocument(warningInteractionExamples)
  .filter((diagnostic) => diagnostic.severity === 'warning');
const contradictionWarnings = warningInteractionDiagnostics
  .filter((diagnostic) => diagnostic.code === 'interaction-example-client-requirements-contradiction');
assert.ok(contradictionWarnings.length >= 4);

const elicitationSource = fixture('spec/draft/fixtures/expected-valid/elicitation-declarations.json');
const filteredElicitationSource = structuredClone(elicitationSource);
filteredElicitationSource.tools[0].elicitations = filteredElicitationSource.tools[0].elicitations.filter(
  (elicitation) => elicitation.protocolVersions?.includes('2025-11-25')
);
const viewWithoutElicitations = projectProtocolView(filteredElicitationSource, '2025-06-18');
assert.equal('elicitations' in viewWithoutElicitations.tools[0], false);
assertStructurallyConforming(viewWithoutElicitations);
const elicitationView0618 = projectProtocolView(elicitationSource, '2025-06-18');
const elicitationView1125 = projectProtocolView(elicitationSource, '2025-11-25');
assert.deepEqual(elicitationView0618.tools[0].elicitations.map((elicitation) => elicitation.name), ['choose_assignee']);
assert.deepEqual(
  elicitationView1125.tools[0].elicitations.map((elicitation) => elicitation.name),
  ['choose_assignee', 'authorize_tracker', 'choose_labels']
);
assert.ok(elicitationView1125.tools[0].elicitations.every((elicitation) => !Object.hasOwn(elicitation, 'protocolVersions')));
assertStructurallyConforming(elicitationView0618);
assertStructurallyConforming(elicitationView1125);
const mergedElicitations = mergeProtocolDescriptions([
  elicitationView0618,
  elicitationView1125,
  projectProtocolView(elicitationSource, '2026-07-28')
]);
assert.ok(semanticallyEquivalent(projectProtocolView(mergedElicitations, '2025-06-18'), elicitationView0618));
assert.ok(semanticallyEquivalent(projectProtocolView(mergedElicitations, '2025-11-25'), elicitationView1125));
assertStructurallyConforming(mergedElicitations);

const metaSource = fixture('spec/draft/fixtures/expected-valid/meta-literal-values.json');
const metaView = projectProtocolView(metaSource, '2026-07-28');
assert.deepEqual(metaView.tools[0]._meta, metaSource.tools[0]._meta);
assert.deepEqual(metaView.tools[0].examples.complete.result._meta, metaSource.tools[0].examples.complete.result._meta);
assert.deepEqual(metaView.resources[0]._meta, metaSource.resources[0]._meta);
assert.deepEqual(metaView.resources[0].examples.current.result.contents[0]._meta, metaSource.resources[0].examples.current.result.contents[0]._meta);
const mergedMeta = mergeProtocolDescriptions([metaView]);
assert.deepEqual(mergedMeta.tools[0]._meta, metaView.tools[0]._meta);
assert.deepEqual(mergedMeta.tools[0].examples, metaView.tools[0].examples);
assert.deepEqual(mergedMeta.resources[0]._meta, metaView.resources[0]._meta);
assert.deepEqual(mergedMeta.resources[0].examples, metaView.resources[0].examples);

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
