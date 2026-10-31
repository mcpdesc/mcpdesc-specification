// Validate documents for the candidate specification version in this working
// tree by layering current semantics over the shared validator base.

import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { UriTemplateMatcher } from 'uri-template-matcher';
import schema from '../schemas/mcp-description/0.9.0.json' with { type: 'json' };
import { documentSchemaOwners } from './document-schema-owners.mjs';
import { ruleSummaries } from './rule-summaries.mjs';
import {
  checkStage,
  classifyCarriedFields,
  declareChecks,
  evaluated,
  isRecording,
  mcpExtensionCatalogue,
  mcpExtensionMaturity,
  recordEvaluations,
  semanticValidateDocument as validateBaseSemantics,
  supportedProtocolVersions
} from './validator-base.mjs';

export { mcpExtensionCatalogue, mcpExtensionMaturity, supportedProtocolVersions };

const TOOL_INTERACTION_SENTINEL = '__interaction_example__';
const specificationVersion = schema.properties.mcpdesc.const;
const ajv = new Ajv2020({ allErrors: true, strict: false, verbose: true });
addFormats(ajv);
const ajvDraft7 = new Ajv({ allErrors: true, strict: false });
addFormats(ajvDraft7);

// Each owned schema location records the instances it evaluates, for rule results (Proposal 0031).
const evaluationKeyword = 'x-mcpdesc-rule';
let structuralEvaluations;
ajv.addKeyword({
  keyword: evaluationKeyword,
  schemaType: 'string',
  errors: false,
  validate(rule, data, parentSchema, dataContext) {
    structuralEvaluations?.push([rule, dataContext?.instancePath ?? '']);
    return true;
  }
});
const instrumentedSchema = structuredClone(schema);
for (const [pointer, rule] of documentSchemaOwners) {
  const target = pointer.split('/').slice(1).map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((node, token) => node?.[token], instrumentedSchema);
  if (target && typeof target === 'object' && !Array.isArray(target)) target[evaluationKeyword] = rule;
}
const validateStructure = ajv.compile(instrumentedSchema);
const primitiveCollections = ['tools', 'resources', 'resourceTemplates', 'prompts'];
const componentNamespaces = ['schemas', 'toolExamples', 'resourceExamples', 'resourceTemplateExamples', 'promptExamples'];
const knownClientCapabilities = new Set(['roots', 'sampling', 'elicitation', 'tasks', 'extensions', 'experimental']);
const protocolOrder = new Map(supportedProtocolVersions.map((version, index) => [version, index]));

const clientCapabilitiesByVersion = {
  '2024-11-05': new Set(['roots', 'sampling', 'experimental']),
  '2025-03-26': new Set(['roots', 'sampling', 'experimental']),
  '2025-06-18': new Set(['roots', 'sampling', 'elicitation', 'experimental']),
  '2025-11-25': new Set(['roots', 'sampling', 'elicitation', 'tasks', 'experimental']),
  '2026-07-28': new Set(['roots', 'sampling', 'elicitation', 'extensions', 'experimental'])
};

function semanticDiagnostic(code, severity, message, path, rule, protocolVersions) {
  return {
    code,
    severity,
    message,
    path,
    ...(rule ? { rule } : {}),
    ...(protocolVersions ? { protocolVersions: [protocolVersions].flat() } : {})
  };
}

declareChecks('semantic', [
  'mcp.annotations.last-modified.revision-availability',
  'mcp.client-capabilities.deprecated',
  'mcp.client-capabilities.revision-shape',
  'mcp.completion.context.revision-availability',
  'mcp.completion.revision-availability',
  'mcp.content-block.revision-availability',
  'mcp.elicitation.revision-availability',
  'mcp.input-response.closed',
  'mcp.resource-contents.meta.revision-availability',
  'mcp.result.additional-properties.preserve',
  'mcp.root.meta.revision-availability',
  'mcp.root.uri.file-scheme',
  'mcp.sampling.tools.revision-availability',
  'mcpdesc.completion-example.target',
  'mcpdesc.components.references',
  'mcpdesc.example.completed-result-form',
  'mcpdesc.example.result.revision-fidelity',
  'mcpdesc.extensions.catalogue-maturity',
  'mcpdesc.prompt.example.arguments',
  'mcpdesc.tool.interaction.client-requirements-consistency',
  'mcpdesc.tool.interaction.elicitation-consistency'
]);

function usesMcpReservedPrefix(identifier) {
  if (typeof identifier !== 'string' || !identifier.includes('/')) return false;
  const labels = identifier.slice(0, identifier.indexOf('/')).split('.');
  return labels.length >= 2 && ['modelcontextprotocol', 'mcp'].includes(labels[1].toLowerCase());
}

function isReferenceObject(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.hasOwn(value, '$componentRef');
}

function componentDiagnostic(code, rel, message, path) {
  return {
    code,
    severity: 'error',
    message: `${rel}.${path.map((segment) => typeof segment === 'number' ? `[${segment}]` : segment).join('.')} ${message}`,
    path
  };
}

export function resolveComponentReferences(document, rel = 'document') {
  const resolved = structuredClone(document);
  const diagnostics = [];
  const provenance = [];
  let substitutions = 0;

  function resolve(reference, expectedNamespace, path, stack = []) {
    const match = /^#\/components\/([^/]+)\/([^/]+)$/.exec(reference?.$componentRef ?? '');
    if (!match) return reference;
    const [, namespace, name] = match;
    if (namespace !== expectedNamespace) {
      diagnostics.push(componentDiagnostic(
        'wrong-component-reference-namespace',
        rel,
        `must target #/components/${expectedNamespace}, not #/components/${namespace}`,
        path
      ));
      return { value: reference };
    }

    const key = `${namespace}/${name}`;
    if (stack.includes(key)) {
      diagnostics.push(componentDiagnostic(
        'component-reference-cycle',
        rel,
        `forms a cycle through ${[...stack, key].join(' -> ')}`,
        path
      ));
      return { value: reference };
    }

    const target = document?.components?.[namespace]?.[name];
    if (target === undefined) {
      diagnostics.push(componentDiagnostic(
        'missing-component-reference-target',
        rel,
        `targets missing component ${JSON.stringify(reference.$componentRef)}`,
        path
      ));
      return { value: reference };
    }
    substitutions += 1;
    return isReferenceObject(target)
      ? resolve(target, expectedNamespace, path, [...stack, key])
      : {
          value: structuredClone(target),
          targetPath: ['components', namespace, name]
        };
  }

  function substitute(reference, expectedNamespace, path, stack = []) {
    evaluated('mcpdesc.components.references', path);
    const result = resolve(reference, expectedNamespace, path, stack);
    if (result.targetPath) {
      provenance.push({ referencePath: path, targetPath: result.targetPath });
    }
    return result.value;
  }

  for (const namespace of componentNamespaces) {
    for (const [name, value] of Object.entries(document?.components?.[namespace] ?? {})) {
      if (isReferenceObject(value)) {
        resolved.components[namespace][name] = substitute(value, namespace, ['components', namespace, name], [`${namespace}/${name}`]);
      }
    }
  }

  for (const [collection, declarations] of Object.entries({
    tools: document?.tools,
    resources: document?.resources,
    resourceTemplates: document?.resourceTemplates,
    prompts: document?.prompts
  })) {
    for (const [declarationIndex, declaration] of (declarations ?? []).entries()) {
      const resolvedDeclaration = resolved[collection][declarationIndex];
      if (collection === 'tools') {
        for (const field of ['inputSchema', 'outputSchema']) {
          if (isReferenceObject(declaration[field])) {
            resolvedDeclaration[field] = substitute(declaration[field], 'schemas', [collection, declarationIndex, field]);
          }
        }
      }

      const exampleNamespace = collection === 'tools'
        ? 'toolExamples'
        : collection === 'resources'
          ? 'resourceExamples'
          : collection === 'resourceTemplates'
            ? 'resourceTemplateExamples'
            : 'promptExamples';
      for (const [name, example] of Object.entries(declaration.examples ?? {})) {
        if (isReferenceObject(example)) {
          resolvedDeclaration.examples[name] = substitute(
            example,
            exampleNamespace,
            [collection, declarationIndex, 'examples', name]
          );
        }
      }
    }
  }

  for (const collection of primitiveCollections) {
    for (const [declarationIndex, declaration] of (document?.[collection] ?? []).entries()) {
      for (const [elicitationIndex, elicitation] of (declaration.elicitations ?? []).entries()) {
        if (isReferenceObject(elicitation.requestedSchema)) {
          resolved[collection][declarationIndex].elicitations[elicitationIndex].requestedSchema = substitute(
            elicitation.requestedSchema,
            'schemas',
            [collection, declarationIndex, 'elicitations', elicitationIndex, 'requestedSchema']
          );
        }
      }
    }
  }

  return { document: resolved, diagnostics, substitutions, provenance };
}

function structuralPath(document, error) {
  const segments = error.instancePath
    ? error.instancePath.slice(1).split('/').map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    : [];
  if (error.keyword === 'required' && typeof error.params.missingProperty === 'string') {
    segments.push(error.params.missingProperty);
  } else if (error.keyword === 'additionalProperties' && typeof error.params.additionalProperty === 'string') {
    segments.push(error.params.additionalProperty);
  }
  let node = document;
  return segments.map((segment) => {
    const index = Array.isArray(node) && /^(?:0|[1-9][0-9]*)$/.test(segment) ? Number(segment) : segment;
    node = node !== null && typeof node === 'object' ? node[index] : undefined;
    return index;
  });
}

function structuralDiagnostics(document) {
  const outer = structuralEvaluations;
  structuralEvaluations = isRecording() ? [] : undefined;
  const valid = validateStructure(document);
  for (const visit of new Set((structuralEvaluations ?? []).map((entry) => JSON.stringify(entry)))) {
    const [rule, instancePath] = JSON.parse(visit);
    evaluated(rule, structuralPath(document, { instancePath, keyword: undefined, params: {} }));
  }
  structuralEvaluations = outer;
  if (valid) return [];
  const errors = validateStructure.errors ?? [];
  return errors.map((error) => ({
    code: 'schema-validation',
    severity: 'error',
    message: `does not validate against ${specificationVersion}: ${error.instancePath || '/'} ${error.message ?? 'unknown error'}`,
    path: structuralPath(document, error),
    rule: structuralRule(error, errors)
  }));
}

// JSON Pointer of every subschema object, so a verbose error's parentSchema locates the failing keyword.
const schemaPointers = new Map();
(function indexSchema(node, pointer) {
  if (node === null || typeof node !== 'object') return;
  if (!Array.isArray(node)) schemaPointers.set(node, pointer);
  for (const [key, child] of Object.entries(node)) indexSchema(child, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`);
})(instrumentedSchema, '#');

const within = (pointer, owned) => pointer === owned || pointer.startsWith(`${owned}/`);
function schemaOwner(pointer) {
  let best;
  for (const [owned, rule] of documentSchemaOwners) {
    if (within(pointer, owned) && (!best || owned.length > best[0].length)) best = [owned, rule];
  }
  return best;
}
const withinInstance = (instancePath, container) => instancePath === container || instancePath.startsWith(`${container}/`);

// Subschema objects reachable from an alternative, following local $ref, so a failure can be traced to its alternative.
const reachable = new WeakMap();
function reachableFrom(node) {
  if (reachable.has(node)) return reachable.get(node);
  const found = new Set();
  const stack = [node];
  while (stack.length) {
    const current = stack.pop();
    if (current === null || typeof current !== 'object' || found.has(current)) continue;
    found.add(current);
    if (typeof current.$ref === 'string' && current.$ref.startsWith('#/$defs/')) stack.push(instrumentedSchema.$defs[current.$ref.slice(8)]);
    stack.push(...Object.values(current));
  }
  reachable.set(node, found);
  return found;
}
const depth = (instancePath) => (instancePath ? instancePath.split('/').length - 1 : 0);

// The alternative of a failed oneOf or anyOf that best matches the instance: its failures reach
// deepest into the instance, then it has the fewest failures, then it comes first.
function selectedAlternative(container, errors) {
  let best;
  container.parentSchema[container.keyword].forEach((alternative, index) => {
    const members = reachableFrom(alternative);
    const failures = errors.filter((error) => error !== container && withinInstance(error.instancePath, container.instancePath) && members.has(error.parentSchema));
    if (!failures.length) return;
    const score = [Math.max(...failures.map((error) => depth(error.instancePath))), -failures.length, -index];
    if (!best || score[0] > best.score[0] || (score[0] === best.score[0] && (score[1] > best.score[1] || (score[1] === best.score[1] && score[2] > best.score[2])))) {
      best = { members, score };
    }
  });
  return best?.members;
}

// Registered rule for a JSON Schema failure (Proposals 0024 and 0033): the rule owning the longest
// documentSchema pointer that contains the failing location. A failure in an alternative of a
// failed oneOf or anyOf other than the best-matching one belongs to the owner of the alternatives.
function structuralRule(error, errors) {
  const own = schemaOwner(schemaPointers.get(error.parentSchema) ?? '#')?.[1];
  const containers = errors
    .filter((candidate) => candidate !== error && (candidate.keyword === 'oneOf' || candidate.keyword === 'anyOf') && withinInstance(error.instancePath, candidate.instancePath))
    .sort((left, right) => depth(left.instancePath) - depth(right.instancePath));
  for (const container of containers) {
    const alternatives = container.parentSchema[container.keyword];
    if (!alternatives.some((alternative) => reachableFrom(alternative).has(error.parentSchema))) continue;
    if (!selectedAlternative(container, errors)?.has(error.parentSchema)) return schemaOwner(schemaPointers.get(container.parentSchema) ?? '#')?.[1];
  }
  return own;
}

// Rules for diagnostic codes that only one registered rule emits. Codes shared
// by several rules are attributed where they are emitted.
const ruleForCode = new Map([
  ['result-field-not-defined-by-version', 'mcp.result.additional-properties.preserve'],
  ['completion-example-version-mismatch', 'mcp.completion.revision-availability'],
  ['meta-reserved-key-context', 'mcp.meta.reserved-key-context'],
  ['meta-reserved-key-value', 'mcp.meta.reserved-key-context'],
  ['invalid-x-mcp-header', 'mcp.tool.input-schema.x-mcp-header'],
  ['duplicate-x-mcp-header', 'mcp.tool.input-schema.x-mcp-header'],
  ['tool-example-result-version-mismatch', 'mcpdesc.example.result.revision-fidelity'],
  ['resource-example-result-version-mismatch', 'mcpdesc.example.result.revision-fidelity'],
  ['resource-example-cache-fields-version-mismatch', 'mcpdesc.example.result.revision-fidelity'],
  ['prompt-example-result-version-mismatch', 'mcpdesc.example.result.revision-fidelity'],
  ['completion-example-result-version-mismatch', 'mcpdesc.example.result.revision-fidelity'],
  ['resource-example-content-version-mismatch', 'mcp.resource-contents.meta.revision-availability'],
  ['resource-annotation-not-supported-by-version', 'mcp.annotations.last-modified.revision-availability'],
  ['tool-example-schema-mismatch', 'mcpdesc.tool.example.schema-conformance'],
  ['incomplete-tool-example-validation', 'mcpdesc.tool.example.schema-conformance'],
  ['missing-tool-example-structured-content', 'mcp.tool.structured-content.output-schema'],
  ['structured-tool-error-example', 'mcpdesc.tool.example.error-result'],
  ['tool-example-json-rpc-envelope', 'mcpdesc.example.completed-result-form'],
  ['prompt-example-json-rpc-envelope', 'mcpdesc.example.completed-result-form'],
  ['resource-example-json-rpc-envelope', 'mcpdesc.example.completed-result-form'],
  ['completion-example-json-rpc-envelope', 'mcpdesc.example.completed-result-form'],
  ['incomplete-tool-example-result', 'mcpdesc.example.completed-result-form'],
  ['incomplete-prompt-example-result', 'mcpdesc.example.completed-result-form'],
  ['incomplete-resource-example-result', 'mcpdesc.example.completed-result-form'],
  ['incomplete-completion-example-result', 'mcpdesc.example.completed-result-form'],
  ['invalid-tool-schema', 'json-schema.tool-schema.valid'],
  ['unsupported-tool-schema-dialect', 'json-schema.tool-schema.valid'],
  ['unresolved-external-tool-schema-reference', 'json-schema.tool-schema.valid'],
  ['invalid-legacy-tool-schema-shape', 'mcp.tool.schema.legacy-shape'],
  ['tool-input-schema-not-object', 'mcp.tool.input-schema.object-root'],
  ['tool-schema-mcp-type-mismatch', 'mcp.tool.schema.native-shape'],
  ['completion-example-context-version-mismatch', 'mcp.completion.context.revision-availability'],
  ['prompt-completion-example-unknown-argument', 'mcpdesc.completion-example.target'],
  ['prompt-completion-example-context-unknown-argument', 'mcpdesc.completion-example.target'],
  ['resource-template-completion-example-unknown-variable', 'mcpdesc.completion-example.target'],
  ['resource-template-completion-example-context-unknown-variable', 'mcpdesc.completion-example.target'],
  ['completion-example-duplicate-target-context', 'mcpdesc.completion-example.target'],
  ['invalid-resource-template-uri-template', 'mcp.resource-template.uri-template'],
  ['prompt-example-unknown-argument', 'mcpdesc.prompt.example.arguments'],
  ['prompt-example-missing-required-argument', 'mcpdesc.prompt.example.arguments'],
  ['invalid-resource-example-base64', 'mcp.resource-contents.blob.base64'],
  ['resource-example-mime-type-mismatch', 'mcpdesc.resource.example.consistency'],
  ['resource-example-requested-uri-not-returned', 'mcpdesc.resource.example.consistency'],
  ['resource-example-size-mismatch', 'mcpdesc.resource.example.consistency'],
  ['resource-template-example-invalid-expansion', 'mcpdesc.resource-template.example.expansion'],
  ['duplicate-elicitation-name', 'mcpdesc.elicitation.name-unique'],
  ['elicitation-mode-not-supported-by-version', 'mcp.elicitation.revision-availability'],
  ['elicitation-form-schema-version-mismatch', 'mcp.elicitation.form-schema.revision-shape'],
  ['elicitation-form-required-property-unknown', 'mcpdesc.elicitation.form-schema.consistency'],
  ['elicitation-form-enum-names-mismatch', 'mcpdesc.elicitation.form-schema.consistency'],
  ['elicitation-form-default-outside-enum', 'mcpdesc.elicitation.form-schema.consistency'],
  ['elicitation-form-invalid-range', 'mcpdesc.elicitation.form-schema.consistency'],
  ['unknown-elicitation-declaration', 'mcpdesc.tool.interaction.elicitation-consistency'],
  ['interaction-example-elicitation-declaration-mismatch', 'mcpdesc.tool.interaction.elicitation-consistency'],
  ['interaction-example-elicitation-response-mismatch', 'mcpdesc.tool.interaction.elicitation-consistency'],
  ['interaction-example-elicitation-content-schema-mismatch', 'mcpdesc.tool.interaction.elicitation-consistency'],
  ['interaction-example-client-requirements-contradiction', 'mcpdesc.tool.interaction.client-requirements-consistency'],
  ['interaction-example-roots-uri', 'mcp.root.uri.file-scheme'],
  ['capability-scope-overlap', 'mcpdesc.protocol-scope.consistency'],
  ['primitive-scope-overlap', 'mcpdesc.protocol-scope.consistency'],
  ['protocol-scope-outside-parent', 'mcpdesc.protocol-scope.consistency'],
  ['transport-coverage-gap', 'mcpdesc.transports.coverage'],
  ['client-requirement-version-mismatch', 'mcp.client-capabilities.revision-shape'],
  ['invalid-client-requirement-value', 'mcp.client-capabilities.revision-shape'],
  ['deprecated-client-requirement', 'mcp.client-capabilities.deprecated'],
  ['extensions-not-supported-by-version', 'mcp.capabilities.extensions.revision-availability'],
  ['experimental-reserved-extension-identifier', 'mcpdesc.extensions.catalogue-maturity'],
  ['unknown-reserved-extension-identifier', 'mcpdesc.extensions.catalogue-maturity'],
  ['tasks-core-not-valid-in-2026', 'mcp.capabilities.tasks.revision-availability'],
  ['logging-deprecated-in-2026', 'mcp.capabilities.logging.deprecated'],
  ['transport-not-supported-by-version', 'mcp.transport.streamable-http.revision-availability'],
  ['legacy-sse-for-modern-version', 'mcp.transport.legacy-sse.deprecated'],
  ['legacy-protocol-validation-incomplete', 'mcpdesc.legacy-revisions.validation-scope'],
  ['duplicate-root-tag', 'mcpdesc.tags.references'],
  ['unknown-tag-reference', 'mcpdesc.tags.references'],
  ['unknown-security-scheme', 'mcpdesc.security.requirements'],
  ['non-oauth-scope-misuse', 'mcpdesc.security.requirements'],
  ['duplicate-security-scope', 'mcpdesc.security.requirements'],
  ['uncatalogued-oauth-scope', 'mcpdesc.security.requirements'],
  ['component-reference-cycle', 'mcpdesc.components.references'],
  ['missing-component-reference-target', 'mcpdesc.components.references'],
  ['wrong-component-reference-namespace', 'mcpdesc.components.references'],
  ['meta-key-invalid', 'mcp.meta.key-format'],
  ['meta-unknown-reserved-key', 'mcp.meta.reserved-prefix']
]);

function attributeRule(diagnostic) {
  if (diagnostic.rule || !ruleForCode.has(diagnostic.code)) return diagnostic;
  return { ...diagnostic, rule: ruleForCode.get(diagnostic.code) };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

function canonicalString(value) {
  return JSON.stringify(canonicalize(value));
}

function remapSyntheticToolExampleDiagnostic(diagnostic, toolIndex, exampleName) {
  if (!Array.isArray(diagnostic.path)) return diagnostic;
  const prefix = ['tools', 0, 'examples', TOOL_INTERACTION_SENTINEL];
  const matches = prefix.every((segment, index) => diagnostic.path[index] === segment);
  if (!matches) return diagnostic;
  return {
    ...diagnostic,
    message: diagnostic.message.replace(
      `tools[0].examples[${JSON.stringify(TOOL_INTERACTION_SENTINEL)}]`,
      `tools[${toolIndex}].interactionExamples[${JSON.stringify(exampleName)}]`
    ),
    path: ['tools', toolIndex, 'interactionExamples', exampleName, ...diagnostic.path.slice(prefix.length)]
  };
}

function validateToolInteractionInputAndResult(tool, toolIndex, exampleName, example, scope) {
  const synthetic = {
    mcpdesc: specificationVersion,
    info: { name: 'tool-interaction-validation', version: '1.0.0' },
    protocolVersions: [...scope],
    tools: [
      {
        name: tool.name,
        inputSchema: structuredClone(tool.inputSchema),
        ...(tool.outputSchema ? { outputSchema: structuredClone(tool.outputSchema) } : {}),
        examples: {
          [TOOL_INTERACTION_SENTINEL]: {
            input: structuredClone(example.input),
            result: structuredClone(example.result)
          }
        }
      }
    ]
  };
  const { result: diagnostics, evaluations } = recordEvaluations(() => validateBaseSemantics(synthetic));
  for (const evaluation of evaluations) {
    const remapped = remapSyntheticToolExampleDiagnostic({ ...evaluation, message: '' }, toolIndex, exampleName);
    if (remapped.path[2] === 'interactionExamples') evaluated(evaluation.rule, remapped.path, evaluation.protocolVersions);
  }
  return diagnostics
    .map((diagnostic) => remapSyntheticToolExampleDiagnostic(diagnostic, toolIndex, exampleName))
    .filter((diagnostic) => diagnostic.path?.[0] === 'tools' && diagnostic.path?.[1] === toolIndex && diagnostic.path?.[2] === 'interactionExamples');
}

function validateAgainstRequestedSchema(schemaValue, value, location, path, diagnostics) {
  try {
    const validate = ajv.compile(schemaValue);
    if (!validate(value)) {
      const details = validate.errors?.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ') ?? 'unknown validation error';
      diagnostics.push(semanticDiagnostic(
        'interaction-example-elicitation-content-schema-mismatch',
        'error',
        `${location} does not validate against the elicitation request schema: ${details}`,
        path
      ));
    }
  } catch {
    try {
      const validate = ajvDraft7.compile(schemaValue);
      if (!validate(value)) {
        const details = validate.errors?.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ') ?? 'unknown validation error';
        diagnostics.push(semanticDiagnostic(
          'interaction-example-elicitation-content-schema-mismatch',
          'error',
          `${location} does not validate against the elicitation request schema: ${details}`,
          path
        ));
      }
    } catch {
      // The containing Elicitation Declaration schema validator reports malformed schemas.
    }
  }
}

function warnClientRequirementsContradiction(tool, step, stepLocation, stepPath, diagnostics) {
  const requirements = tool.clientRequirements;
  if (!requirements || typeof requirements !== 'object' || Array.isArray(requirements)) return;
  evaluated('mcpdesc.tool.interaction.client-requirements-consistency', stepPath);

  function warn(message, path) {
    diagnostics.push(semanticDiagnostic(
      'interaction-example-client-requirements-contradiction',
      'warning',
      `${stepLocation} ${message}`,
      path
    ));
  }

  if (step.type === 'roots') {
    if (!Object.hasOwn(requirements, 'roots')) {
      warn('illustrates roots input, but the Tool clientRequirements do not declare roots', [...stepPath, 'type']);
    }
    return;
  }

  if (step.type === 'sampling') {
    if (!Object.hasOwn(requirements, 'sampling')) {
      warn('illustrates sampling input, but the Tool clientRequirements do not declare sampling', [...stepPath, 'type']);
      return;
    }
    const sampling = requirements.sampling ?? {};
    if ((Object.hasOwn(step.request, 'tools') || Object.hasOwn(step.request, 'toolChoice')) && !Object.hasOwn(sampling, 'tools')) {
      warn('illustrates sampling Tool use, but the Tool clientRequirements do not declare sampling.tools', [...stepPath, 'request', Object.hasOwn(step.request, 'tools') ? 'tools' : 'toolChoice']);
    }
    if (step.request.includeContext && step.request.includeContext !== 'none' && !Object.hasOwn(sampling, 'context')) {
      warn('illustrates sampling context inclusion, but the Tool clientRequirements do not declare sampling.context', [...stepPath, 'request', 'includeContext']);
    }
    return;
  }

  if (step.type === 'elicitation') {
    if (!Object.hasOwn(requirements, 'elicitation')) {
      warn('illustrates elicitation input, but the Tool clientRequirements do not declare elicitation', [...stepPath, 'type']);
      return;
    }
    const elicitation = requirements.elicitation ?? {};
    if (step.request.mode === 'url' && !Object.hasOwn(elicitation, 'url')) {
      warn('illustrates URL elicitation, but the Tool clientRequirements do not declare elicitation.url', [...stepPath, 'request', 'mode']);
    }
    if (step.request.mode === 'form' && Object.keys(elicitation).length > 0 && !Object.hasOwn(elicitation, 'form')) {
      warn('illustrates form elicitation, but the Tool clientRequirements do not declare elicitation.form', [...stepPath, 'request', 'mode']);
    }
  }
}

function validateToolInteractionExamples(document) {
  const diagnostics = [];
  const rootScope = document.protocolVersions ?? [];

  for (const [toolIndex, tool] of (document.tools ?? []).entries()) {
    if (!tool.interactionExamples || typeof tool.interactionExamples !== 'object' || Array.isArray(tool.interactionExamples)) continue;
    const scope = tool.protocolVersions ?? rootScope;

    for (const [exampleName, example] of Object.entries(tool.interactionExamples)) {
      if (!example || typeof example !== 'object' || Array.isArray(example)) continue;
      const exampleLocation = `tools[${toolIndex}].interactionExamples[${JSON.stringify(exampleName)}]`;
      const examplePath = ['tools', toolIndex, 'interactionExamples', exampleName];

      diagnostics.push(...validateToolInteractionInputAndResult(tool, toolIndex, exampleName, example, scope));

      for (const [stepIndex, step] of (example.steps ?? []).entries()) {
        const stepLocation = `${exampleLocation}.steps[${stepIndex}]`;
        const stepPath = [...examplePath, 'steps', stepIndex];
        warnClientRequirementsContradiction(tool, step, stepLocation, stepPath, diagnostics);

        const responseType = { sampling: 'CreateMessageResult', elicitation: 'ElicitResult', roots: 'ListRootsResult' }[step.type];
        for (const version of scope) {
          if (!responseType || (step.type === 'elicitation' && protocolOrder.get(version) < protocolOrder.get('2025-06-18'))) continue;
          diagnostics.push(...classifyCarriedFields(
            step.response,
            responseType,
            version,
            `${stepLocation}.response`,
            [...stepPath, 'response'],
            'interaction-example-version-mismatch',
            'mcp.input-response.closed'
          ));
        }

        if (step.type === 'elicitation') {
          const request = step.request ?? {};
          const response = step.response ?? {};
          const declaration = typeof step.declaration === 'string'
            ? (tool.elicitations ?? []).find((candidate) => candidate.name === step.declaration)
            : undefined;

          evaluated('mcpdesc.tool.interaction.elicitation-consistency', stepPath);
          for (const version of scope) {
            evaluated('mcp.elicitation.revision-availability', [...stepPath, 'type'], version);
            if (protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
              diagnostics.push(semanticDiagnostic(
                'interaction-example-version-mismatch',
                'error',
                `${stepLocation}.type is not defined for MCP ${version}`,
                [...stepPath, 'type'],
                'mcp.elicitation.revision-availability',
                version
              ));
            }
            if (request.mode === 'url' && protocolOrder.get(version) < protocolOrder.get('2025-11-25')) {
              diagnostics.push(semanticDiagnostic(
                'interaction-example-version-mismatch',
                'error',
                `${stepLocation}.request.mode "url" is not defined for MCP ${version}`,
                [...stepPath, 'request', 'mode'],
                'mcp.elicitation.revision-availability',
                version
              ));
            }
          }

          if (typeof step.declaration === 'string' && !declaration) {
            diagnostics.push(semanticDiagnostic(
              'unknown-elicitation-declaration',
              'error',
              `${stepLocation}.declaration identifies no Tool elicitation named ${JSON.stringify(step.declaration)}`,
              [...stepPath, 'declaration']
            ));
          }

          if (declaration) {
            if (declaration.mode !== request.mode) {
              diagnostics.push(semanticDiagnostic(
                'interaction-example-elicitation-declaration-mismatch',
                'error',
                `${stepLocation}.request.mode ${JSON.stringify(request.mode)} is incompatible with elicitation declaration ${JSON.stringify(step.declaration)} mode ${JSON.stringify(declaration.mode)}`,
                [...stepPath, 'request', 'mode']
              ));
            }
            if (request.mode === 'form' && canonicalString(declaration.requestedSchema) !== canonicalString(request.requestedSchema)) {
              diagnostics.push(semanticDiagnostic(
                'interaction-example-elicitation-declaration-mismatch',
                'error',
                `${stepLocation}.request.requestedSchema is incompatible with elicitation declaration ${JSON.stringify(step.declaration)}`,
                [...stepPath, 'request', 'requestedSchema']
              ));
            }
            if (request.mode === 'url' && declaration.url !== undefined && declaration.url !== request.url) {
              diagnostics.push(semanticDiagnostic(
                'interaction-example-elicitation-declaration-mismatch',
                'error',
                `${stepLocation}.request.url is incompatible with elicitation declaration ${JSON.stringify(step.declaration)}`,
                [...stepPath, 'request', 'url']
              ));
            }
          }

          if (request.mode === 'form') {
            if (response.action === 'accept') {
              if (!Object.hasOwn(response, 'content')) {
                diagnostics.push(semanticDiagnostic(
                  'interaction-example-elicitation-response-mismatch',
                  'error',
                  `${stepLocation}.response.content is required when a form elicitation is accepted`,
                  [...stepPath, 'response', 'content']
                ));
              } else {
                validateAgainstRequestedSchema(
                  request.requestedSchema,
                  response.content,
                  `${stepLocation}.response.content`,
                  [...stepPath, 'response', 'content'],
                  diagnostics
                );
              }
            } else if (Object.hasOwn(response, 'content')) {
              diagnostics.push(semanticDiagnostic(
                'interaction-example-elicitation-response-mismatch',
                'error',
                `${stepLocation}.response.content is not allowed when action is ${JSON.stringify(response.action)}`,
                [...stepPath, 'response', 'content']
              ));
            }
          } else if (Object.hasOwn(response, 'content')) {
            diagnostics.push(semanticDiagnostic(
              'interaction-example-elicitation-response-mismatch',
              'error',
              `${stepLocation}.response.content is not allowed for URL elicitation responses`,
              [...stepPath, 'response', 'content']
            ));
          }
        }

        if (step.type === 'sampling') {
          for (const version of scope) {
            if (Object.hasOwn(step.request, 'tools') || Object.hasOwn(step.request, 'toolChoice')) {
              evaluated('mcp.sampling.tools.revision-availability', [...stepPath, 'request'], version);
            }
            if ((Object.hasOwn(step.request, 'tools') || Object.hasOwn(step.request, 'toolChoice'))
              && protocolOrder.get(version) < protocolOrder.get('2025-11-25')) {
              diagnostics.push(semanticDiagnostic(
                'interaction-example-version-mismatch',
                'error',
                `${stepLocation}.request uses sampling Tool fields that are not defined for MCP ${version}`,
                [...stepPath, 'request', Object.hasOwn(step.request, 'tools') ? 'tools' : 'toolChoice'],
                'mcp.sampling.tools.revision-availability',
                version
              ));
            }
          }
        }

        if (step.type === 'roots') {
          for (const [rootIndex, root] of (step.response.roots ?? []).entries()) {
            for (const version of scope) {
              if (Object.hasOwn(root, '_meta')) evaluated('mcp.root.meta.revision-availability', [...stepPath, 'response', 'roots', rootIndex, '_meta'], version);
              if (Object.hasOwn(root, '_meta') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
                diagnostics.push(semanticDiagnostic(
                  'interaction-example-version-mismatch',
                  'error',
                  `${stepLocation}.response.roots[${rootIndex}]._meta is not defined for MCP ${version}`,
                  [...stepPath, 'response', 'roots', rootIndex, '_meta'],
                  'mcp.root.meta.revision-availability',
                  version
                ));
              }
            }
            if (typeof root.uri === 'string') evaluated('mcp.root.uri.file-scheme', [...stepPath, 'response', 'roots', rootIndex, 'uri']);
            if (typeof root.uri === 'string' && !root.uri.startsWith('file://')) {
              diagnostics.push(semanticDiagnostic(
                'interaction-example-roots-uri',
                'error',
                `${stepLocation}.response.roots[${rootIndex}].uri must be a file:// URI`,
                [...stepPath, 'response', 'roots', rootIndex, 'uri']
              ));
            }
          }
        }
      }
    }
  }

  return diagnostics;
}

function validateClientRequirements(document) {
  const diagnostics = [];
  const rootScope = document.protocolVersions ?? [];

  function invalidMember(location, path, version, member) {
    diagnostics.push(semanticDiagnostic(
      'client-requirement-version-mismatch',
      'error',
      `${location} member ${JSON.stringify(member)} is not defined by MCP ${version}`,
      [...path, member],
      undefined,
      version
    ));
  }

  function requireObject(value, location, path, version) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return true;
    diagnostics.push(semanticDiagnostic(
      'invalid-client-requirement-value',
      'error',
      `${location} must be an object for MCP ${version}`,
      path,
      undefined,
      version
    ));
    return false;
  }

  function validateClosedMembers(value, allowed, location, path, version) {
    if (!requireObject(value, location, path, version)) return false;
    for (const member of Object.keys(value)) {
      if (!allowed.has(member)) invalidMember(location, path, version, member);
    }
    return true;
  }

  function validateTasks(value, location, path, version) {
    validateClosedMembers(value, new Set(['list', 'cancel', 'requests']), location, path, version);
    for (const member of ['list', 'cancel']) {
      if (Object.hasOwn(value, member)) requireObject(value[member], `${location}.${member}`, [...path, member], version);
    }
    if (!Object.hasOwn(value, 'requests') || !requireObject(value.requests, `${location}.requests`, [...path, 'requests'], version)) return;
    validateClosedMembers(value.requests, new Set(['sampling', 'elicitation']), `${location}.requests`, [...path, 'requests'], version);
    for (const [family, operation] of [['sampling', 'createMessage'], ['elicitation', 'create']]) {
      if (!Object.hasOwn(value.requests, family)) continue;
      const familyValue = value.requests[family];
      const familyPath = [...path, 'requests', family];
      if (!validateClosedMembers(familyValue, new Set([operation]), `${location}.requests.${family}`, familyPath, version)) continue;
      if (Object.hasOwn(familyValue, operation)) {
        requireObject(familyValue[operation], `${location}.requests.${family}.${operation}`, [...familyPath, operation], version);
      }
    }
  }

  for (const collection of primitiveCollections) {
    for (const [primitiveIndex, primitive] of (document[collection] ?? []).entries()) {
      const requirements = primitive.clientRequirements;
      if (!requirements || typeof requirements !== 'object' || Array.isArray(requirements)) continue;
      const scope = primitive.protocolVersions ?? rootScope;
      const baseLocation = `${collection}[${primitiveIndex}].clientRequirements`;
      const basePath = [collection, primitiveIndex, 'clientRequirements'];

      for (const version of scope) {
        const available = clientCapabilitiesByVersion[version] ?? new Set();
        for (const [capability, value] of Object.entries(requirements)) {
          if (capability.startsWith('x-')) continue;
          if (knownClientCapabilities.has(capability)) evaluated('mcp.client-capabilities.revision-shape', [...basePath, capability], version);
          if (knownClientCapabilities.has(capability) && !available.has(capability)) {
            diagnostics.push(semanticDiagnostic(
              'client-requirement-version-mismatch',
              'error',
              `${baseLocation}.${capability} is not defined by MCP ${version}; split the primitive into disjoint protocol-scoped variants when requirements differ`,
              [...basePath, capability],
              undefined,
              version
            ));
            continue;
          }
          if (!available.has(capability)) continue;

          const location = `${baseLocation}.${capability}`;
          const path = [...basePath, capability];
          if (capability === 'roots') {
            validateClosedMembers(value, version === '2026-07-28' ? new Set() : new Set(['listChanged']), location, path, version);
            if (version !== '2026-07-28' && Object.hasOwn(value, 'listChanged') && typeof value.listChanged !== 'boolean') {
              diagnostics.push(semanticDiagnostic('invalid-client-requirement-value', 'error', `${location}.listChanged must be a boolean for MCP ${version}`, [...path, 'listChanged'], undefined, version));
            }
          } else if (capability === 'sampling' && ['2025-11-25', '2026-07-28'].includes(version)) {
            validateClosedMembers(value, new Set(['context', 'tools']), location, path, version);
            for (const member of ['context', 'tools']) {
              if (Object.hasOwn(value, member)) requireObject(value[member], `${location}.${member}`, [...path, member], version);
            }
            if (Object.hasOwn(value, 'context')) {
              diagnostics.push(semanticDiagnostic('deprecated-client-requirement', 'warning', `${location}.context uses deprecated MCP context-inclusion capability semantics in MCP ${version}`, [...path, 'context'], undefined, version));
            }
          } else if (capability === 'elicitation' && ['2025-11-25', '2026-07-28'].includes(version)) {
            validateClosedMembers(value, new Set(['form', 'url']), location, path, version);
            for (const member of ['form', 'url']) {
              if (Object.hasOwn(value, member)) requireObject(value[member], `${location}.${member}`, [...path, member], version);
            }
          } else if (capability === 'tasks') {
            validateTasks(value, location, path, version);
          } else if (capability === 'extensions') {
            for (const extension of Object.keys(value)) {
              evaluated('mcpdesc.extensions.catalogue-maturity', [...path, extension]);
              if (!usesMcpReservedPrefix(extension)) continue;
              const maturity = mcpExtensionMaturity(extension);
              if (maturity === 'official') continue;
              if (maturity === 'experimental') {
                diagnostics.push(semanticDiagnostic(
                  'experimental-reserved-extension-identifier',
                  'warning',
                  `${location} contains experimental MCP extension ${JSON.stringify(extension)}; preserve it and review its maturity before relying on it`,
                  [...path, extension]
                ));
              } else {
                diagnostics.push(semanticDiagnostic(
                  'unknown-reserved-extension-identifier',
                  'warning',
                  `${location} contains unrecognized extension ${JSON.stringify(extension)} under an MCP-reserved prefix; preserve it and review its authority`,
                  [...path, extension]
                ));
              }
            }
          }

          if (['roots', 'sampling'].includes(capability)) evaluated('mcp.client-capabilities.deprecated', path, version);
          if (version === '2026-07-28' && ['roots', 'sampling'].includes(capability)) {
            diagnostics.push(semanticDiagnostic(
              'deprecated-client-requirement',
              'warning',
              `${location} requires an MCP capability deprecated in MCP ${version}`,
              path,
              undefined,
              version
            ));
          }
        }
      }
    }
  }

  return diagnostics;
}

function validatePromptContentVersion(content, contentLocation, contentPath, version, diagnostics) {
  evaluated('mcp.content-block.revision-availability', contentPath, version);
  if (content.type === 'resource') evaluated('mcp.resource-contents.meta.revision-availability', [...contentPath, 'resource'], version);
  if (content.annotations?.lastModified !== undefined) evaluated('mcp.annotations.last-modified.revision-availability', [...contentPath, 'annotations', 'lastModified'], version);
  if (content.type === 'audio' && protocolOrder.get(version) < protocolOrder.get('2025-03-26')) {
    diagnostics.push(semanticDiagnostic('prompt-example-content-version-mismatch', 'error', `${contentLocation} uses audio content, which is not defined for MCP ${version}`, [...contentPath, 'type'], 'mcp.content-block.revision-availability', version));
  }
  if (content.type === 'resource_link' && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
    diagnostics.push(semanticDiagnostic('prompt-example-content-version-mismatch', 'error', `${contentLocation} uses resource-link content, which is not defined for MCP ${version}`, [...contentPath, 'type'], 'mcp.content-block.revision-availability', version));
  }
  if (Object.hasOwn(content, '_meta') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
    diagnostics.push(semanticDiagnostic('prompt-example-content-version-mismatch', 'error', `${contentLocation}._meta is not defined for MCP ${version}`, [...contentPath, '_meta'], 'mcp.content-block.revision-availability', version));
  }
  if (content.type === 'resource' && Object.hasOwn(content.resource ?? {}, '_meta') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
    diagnostics.push(semanticDiagnostic('prompt-example-content-version-mismatch', 'error', `${contentLocation}.resource._meta is not defined for MCP ${version}`, [...contentPath, 'resource', '_meta'], 'mcp.resource-contents.meta.revision-availability', version));
  }
  if (content.type === 'resource_link' && Array.isArray(content.icons) && protocolOrder.get(version) < protocolOrder.get('2025-11-25')) {
    diagnostics.push(semanticDiagnostic('prompt-example-content-version-mismatch', 'error', `${contentLocation}.icons is not defined for MCP ${version}`, [...contentPath, 'icons'], 'mcp.content-block.revision-availability', version));
  }
  if (content.annotations?.lastModified !== undefined && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
    diagnostics.push(semanticDiagnostic('prompt-example-content-version-mismatch', 'error', `${contentLocation}.annotations.lastModified is not defined for MCP ${version}`, [...contentPath, 'annotations', 'lastModified'], 'mcp.annotations.last-modified.revision-availability', version));
  }
}

function validatePromptExamples(document) {
  const diagnostics = [];
  const rootScope = document.protocolVersions ?? [];

  for (const [promptIndex, prompt] of (document.prompts ?? []).entries()) {
    if (!prompt.examples || typeof prompt.examples !== 'object' || Array.isArray(prompt.examples)) continue;
    const scope = prompt.protocolVersions ?? rootScope;
    const declaredArguments = new Map((prompt.arguments ?? []).map((argument) => [argument.name, argument]));

    for (const [exampleName, example] of Object.entries(prompt.examples)) {
      if (!example || typeof example !== 'object' || Array.isArray(example)) continue;
      const exampleLocation = `prompts[${promptIndex}].examples[${JSON.stringify(exampleName)}]`;
      const examplePath = ['prompts', promptIndex, 'examples', exampleName];
      const result = example.result ?? {};
      const resultPath = [...examplePath, 'result'];
      const argumentsValue = example.arguments;
      evaluated('mcpdesc.prompt.example.arguments', [...examplePath, 'arguments']);

      if (argumentsValue && typeof argumentsValue === 'object' && !Array.isArray(argumentsValue)) {
        for (const [argumentName] of Object.entries(argumentsValue)) {
          if (!declaredArguments.has(argumentName)) {
            diagnostics.push(semanticDiagnostic(
              'prompt-example-unknown-argument',
              'error',
              `${exampleLocation}.arguments contains undeclared Prompt argument ${JSON.stringify(argumentName)}`,
              [...examplePath, 'arguments', argumentName]
            ));
          }
        }
      }

      for (const [argumentName, argument] of declaredArguments) {
        if (argument.required === true && !Object.hasOwn(argumentsValue ?? {}, argumentName)) {
          diagnostics.push(semanticDiagnostic(
            'prompt-example-missing-required-argument',
            'error',
            `${exampleLocation}.arguments is missing required Prompt argument ${JSON.stringify(argumentName)}`,
            [...examplePath, 'arguments', argumentName]
          ));
        }
      }

      evaluated('mcpdesc.example.completed-result-form', resultPath);
      for (const envelopeField of ['jsonrpc', 'id', 'error']) {
        if (Object.hasOwn(result, envelopeField)) {
          diagnostics.push(semanticDiagnostic('prompt-example-json-rpc-envelope', 'error', `${exampleLocation}.result must not contain JSON-RPC envelope field ${JSON.stringify(envelopeField)}`, [...resultPath, envelopeField]));
        }
      }
      for (const incompleteField of ['task', 'inputRequests', 'requestState']) {
        if (Object.hasOwn(result, incompleteField)) {
          diagnostics.push(semanticDiagnostic('incomplete-prompt-example-result', 'error', `${exampleLocation}.result must not contain non-completed workflow field ${JSON.stringify(incompleteField)}`, [...resultPath, incompleteField]));
        }
      }

      for (const version of scope) {
        const resultLocation = `${exampleLocation}.result`;
        evaluated('mcpdesc.example.result.revision-fidelity', resultPath, version);
        if (version === '2026-07-28' && result.resultType !== 'complete') {
          diagnostics.push(semanticDiagnostic('prompt-example-result-version-mismatch', 'error', `${resultLocation}.resultType must be "complete" for MCP ${version}`, [...resultPath, 'resultType'], undefined, version));
        }
        diagnostics.push(...classifyCarriedFields(result, 'GetPromptResult', version, resultLocation, resultPath));
        (result.messages ?? []).forEach((message, messageIndex) => {
          const contentLocation = `${resultLocation}.messages[${messageIndex}].content`;
          const contentPath = [...resultPath, 'messages', messageIndex, 'content'];
          validatePromptContentVersion(message.content ?? {}, contentLocation, contentPath, version, diagnostics);
        });
      }
    }
  }

  return diagnostics;
}

function extractUriTemplateVariables(uriTemplate) {
  const matcher = new UriTemplateMatcher();
  matcher.add(uriTemplate);
  return new Set(
    matcher.templates.flatMap((template) => template.parts)
      .filter((part) => part.type === 'expression')
      .flatMap((part) => part.expressions.map((expression) => expression.name))
  );
}

function validateCompletionExampleResult(result, exampleLocation, examplePath, version, diagnostics) {
  const resultLocation = `${exampleLocation}.result`;
  const resultPath = [...examplePath, 'result'];
  evaluated('mcpdesc.example.completed-result-form', resultPath);
  evaluated('mcpdesc.example.result.revision-fidelity', resultPath, version);

  for (const envelopeField of ['jsonrpc', 'id', 'error']) {
    if (Object.hasOwn(result, envelopeField)) {
      diagnostics.push(semanticDiagnostic(
        'completion-example-json-rpc-envelope',
        'error',
        `${resultLocation} must not contain JSON-RPC envelope field ${JSON.stringify(envelopeField)}`,
        [...resultPath, envelopeField]
      ));
    }
  }
  for (const incompleteField of ['task', 'inputRequests', 'requestState']) {
    if (Object.hasOwn(result, incompleteField)) {
      diagnostics.push(semanticDiagnostic(
        'incomplete-completion-example-result',
        'error',
        `${resultLocation} must not contain non-completed workflow field ${JSON.stringify(incompleteField)}`,
        [...resultPath, incompleteField]
      ));
    }
  }
  if (version === '2026-07-28' && result.resultType !== 'complete') {
    diagnostics.push(semanticDiagnostic(
      'completion-example-result-version-mismatch',
      'error',
      `${resultLocation}.resultType must be "complete" for MCP ${version}`,
      [...resultPath, 'resultType'],
      undefined,
      version
    ));
  }
  diagnostics.push(...classifyCarriedFields(result, 'CompleteResult', version, resultLocation, resultPath));
}

function validateCompletionExamples(document) {
  const diagnostics = [];
  const rootScope = document.protocolVersions ?? [];

  for (const [kind, items] of [
    ['prompts', document.prompts ?? []],
    ['resourceTemplates', document.resourceTemplates ?? []]
  ]) {
    for (const [ownerIndex, owner] of items.entries()) {
      if (!owner.completionExamples || typeof owner.completionExamples !== 'object' || Array.isArray(owner.completionExamples)) continue;
      const scope = owner.protocolVersions ?? rootScope;
      const ownerLocation = `${kind}[${ownerIndex}]`;
      let allowedNames;

      if (kind === 'prompts') {
        allowedNames = new Set((owner.arguments ?? []).map((argument) => argument.name));
      } else {
        try {
          allowedNames = extractUriTemplateVariables(owner.uriTemplate);
        } catch {
          // The base validator reports invalid-resource-template-uri-template.
          allowedNames = undefined;
        }
      }

      for (const [exampleName, example] of Object.entries(owner.completionExamples)) {
        if (!example || typeof example !== 'object' || Array.isArray(example)) continue;
        const exampleLocation = `${ownerLocation}.completionExamples[${JSON.stringify(exampleName)}]`;
        const examplePath = [kind, ownerIndex, 'completionExamples', exampleName];
        const targetName = example.argument?.name;
        const contextArguments = example.context?.arguments;
        if (allowedNames) evaluated('mcpdesc.completion-example.target', [...examplePath, 'argument']);

        if (typeof targetName === 'string' && allowedNames && !allowedNames.has(targetName)) {
          diagnostics.push(semanticDiagnostic(
            kind === 'prompts'
              ? 'prompt-completion-example-unknown-argument'
              : 'resource-template-completion-example-unknown-variable',
            'error',
            kind === 'prompts'
              ? `${exampleLocation}.argument.name identifies undeclared Prompt argument ${JSON.stringify(targetName)}`
              : `${exampleLocation}.argument.name identifies no RFC 6570 variable in ${JSON.stringify(owner.uriTemplate)}`,
            [...examplePath, 'argument', 'name']
          ));
        }

        if (contextArguments && typeof contextArguments === 'object' && !Array.isArray(contextArguments)) {
          for (const argumentName of Object.keys(contextArguments)) {
            if (allowedNames && !allowedNames.has(argumentName)) {
              diagnostics.push(semanticDiagnostic(
                kind === 'prompts'
                  ? 'prompt-completion-example-context-unknown-argument'
                  : 'resource-template-completion-example-context-unknown-variable',
                'error',
                kind === 'prompts'
                  ? `${exampleLocation}.context.arguments contains undeclared Prompt argument ${JSON.stringify(argumentName)}`
                  : `${exampleLocation}.context.arguments contains no RFC 6570 variable ${JSON.stringify(argumentName)} from ${JSON.stringify(owner.uriTemplate)}`,
                [...examplePath, 'context', 'arguments', argumentName]
              ));
            }
            if (argumentName === targetName) {
              diagnostics.push(semanticDiagnostic(
                'completion-example-duplicate-target-context',
                'error',
                `${exampleLocation}.context.arguments MUST NOT repeat the completed argument ${JSON.stringify(argumentName)}`,
                [...examplePath, 'context', 'arguments', argumentName]
              ));
            }
          }
        }

        const result = example.result ?? {};
        for (const version of scope) {
          evaluated('mcp.completion.revision-availability', examplePath, version);
          if (protocolOrder.get(version) < protocolOrder.get('2025-03-26')) {
            diagnostics.push(semanticDiagnostic(
              'completion-example-version-mismatch',
              'error',
              `${exampleLocation} is not supported by MCP Description for MCP ${version}`,
              examplePath,
              undefined,
              version
            ));
            continue;
          }
          if (Object.hasOwn(example, 'context')) evaluated('mcp.completion.context.revision-availability', [...examplePath, 'context'], version);
          if (Object.hasOwn(example, 'context') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
            diagnostics.push(semanticDiagnostic(
              'completion-example-context-version-mismatch',
              'error',
              `${exampleLocation}.context is not defined for MCP ${version}`,
              [...examplePath, 'context'],
              undefined,
              version
            ));
          }
          validateCompletionExampleResult(result, exampleLocation, examplePath, version, diagnostics);
        }
      }
    }
  }

  return diagnostics;
}

export function evaluateClientRequirements(requirements, clientCapabilities, version) {
  if (!supportedProtocolVersions.includes(version)) {
    throw new Error(`Unsupported MCP protocol revision ${JSON.stringify(version)}`);
  }
  if (requirements === undefined) {
    return { status: 'satisfied', declared: false, unsatisfied: [], indeterminate: [] };
  }

  const profile = clientCapabilities && typeof clientCapabilities === 'object' && !Array.isArray(clientCapabilities)
    ? clientCapabilities
    : {};
  const unsatisfied = [];
  const indeterminate = [];

  function requirePresence(owner, key, path) {
    if (Object.hasOwn(owner, key)) return true;
    unsatisfied.push(path);
    return false;
  }

  function evaluateMarkerMap(required, advertised, path) {
    for (const [member, settings] of Object.entries(required)) {
      const memberPath = [...path, member];
      if (!requirePresence(advertised, member, memberPath)) continue;
      if (Object.keys(settings).length > 0) indeterminate.push(memberPath);
    }
  }

  for (const [capability, required] of Object.entries(requirements)) {
    if (capability.startsWith('x-')) continue;
    const path = [capability];
    if (!requirePresence(profile, capability, path)) continue;
    const advertised = profile[capability];

    if (capability === 'roots') {
      if (Object.hasOwn(required, 'listChanged')
        && (!advertised || advertised.listChanged !== required.listChanged)) {
        unsatisfied.push([...path, 'listChanged']);
      }
    } else if (capability === 'sampling' || capability === 'elicitation') {
      evaluateMarkerMap(required, advertised ?? {}, path);
    } else if (capability === 'tasks') {
      for (const member of ['list', 'cancel']) {
        if (Object.hasOwn(required, member)) requirePresence(advertised ?? {}, member, [...path, member]);
      }
      for (const [family, operation] of [['sampling', 'createMessage'], ['elicitation', 'create']]) {
        if (!Object.hasOwn(required.requests ?? {}, family)) continue;
        const familyPath = [...path, 'requests', family];
        if (!requirePresence(advertised?.requests ?? {}, family, familyPath)) continue;
        if (Object.hasOwn(required.requests[family], operation)) {
          requirePresence(advertised.requests[family] ?? {}, operation, [...familyPath, operation]);
        }
      }
    } else if (capability === 'extensions') {
      evaluateMarkerMap(required, advertised ?? {}, path);
    } else if (capability === 'experimental') {
      for (const member of Object.keys(required)) {
        const memberPath = [...path, member];
        if (requirePresence(advertised ?? {}, member, memberPath)) indeterminate.push(memberPath);
      }
    } else {
      indeterminate.push(path);
    }
  }

  return {
    status: unsatisfied.length ? 'unsatisfied' : indeterminate.length ? 'indeterminate' : 'satisfied',
    declared: true,
    unsatisfied,
    indeterminate
  };
}

function runSemantics(document, rel = 'document') {
  const resolution = resolveComponentReferences(document, rel);
  const resolvedStructureDiagnostics = resolution.diagnostics.length || resolution.substitutions === 0
    ? []
    : structuralDiagnostics(resolution.document);
  const base = !resolution.diagnostics.length && !resolvedStructureDiagnostics.length;
  const diagnostics = [
    ...resolution.diagnostics,
    ...resolvedStructureDiagnostics,
    ...(base ? validateBaseSemantics(resolution.document, rel) : []),
    ...validateToolInteractionExamples(resolution.document),
    ...validatePromptExamples(resolution.document),
    ...validateCompletionExamples(resolution.document),
    ...validateClientRequirements(document)
  ];
  const filtered = Object.hasOwn(document, 'transports')
    ? diagnostics
    : diagnostics.filter((diagnostic) => diagnostic.code !== 'transport-coverage-gap');
  return {
    diagnostics: filtered.map(attributeRule).sort(
      (left, right) => left.code.localeCompare(right.code)
        || left.message.localeCompare(right.message)
        || JSON.stringify(left.path).localeCompare(JSON.stringify(right.path))
    ),
    stages: { semantic: true, base }
  };
}

export function semanticValidateDocument(document, rel = 'document') {
  return runSemantics(document, rel).diagnostics;
}

export { specificationVersion };

function runValidation(document) {
  const diagnostics = structuralDiagnostics(document);
  return diagnostics.length ? { diagnostics, stages: { semantic: false, base: false } } : runSemantics(document);
}

export function validateDocument(document) {
  return runValidation(document).diagnostics;
}

function declaredVersions(document) {
  const declared = Array.isArray(document?.protocolVersions) ? document.protocolVersions : [];
  return supportedProtocolVersions.filter((version) => declared.includes(version));
}

// The versions of the nearest object on the path that declares protocolVersions, else the document's.
function scopeAt(document, path) {
  let scope = declaredVersions(document);
  let node = document;
  for (const segment of path) {
    node = node !== null && typeof node === 'object' ? node[segment] : undefined;
    if (node && typeof node === 'object' && Array.isArray(node.protocolVersions)) {
      scope = supportedProtocolVersions.filter((version) => node.protocolVersions.includes(version));
    }
  }
  return scope;
}

// One status per rule and declared protocol version, or one status for an independent rule (Proposal 0031).
// A status comes from the checks that ran: passed needs a recorded evaluation, never only silence.
function ruleResults(document, diagnostics, evaluations, stages) {
  const versions = declaredVersions(document);
  const concerns = (entry, version) => version === undefined || (entry.protocolVersions ?? scopeAt(document, entry.path)).includes(version);
  return ruleSummaries.flatMap((rule) => {
    const independent = rule.protocolVersions === 'independent';
    const ruleDiagnostics = diagnostics.filter((diagnostic) => diagnostic.rule === rule.id);
    const ruleEvaluations = evaluations.filter((evaluation) => evaluation.rule === rule.id);
    const stage = checkStage(rule.id);
    return (independent || !versions.length ? [undefined] : versions).map((version) => {
      const result = version ? { rule: rule.id, protocolVersion: version } : { rule: rule.id };
      const found = ruleDiagnostics.filter((diagnostic) => concerns(diagnostic, version));
      if (rule.delegated) return { ...result, status: 'delegated' };
      if (found.some((diagnostic) => diagnostic.severity === 'error')) return { ...result, status: 'failed' };
      if (found.length) return { ...result, status: 'warning' };
      if (version && !independent && rule.protocolVersions[version] !== 'applies') return { ...result, status: 'not-applicable' };
      if (stage && !stages[stage]) return { ...result, status: 'not-evaluated', reason: 'earlier-stage-failed' };
      if (!stage && !rule.documentSchema) {
        return { ...result, status: 'not-evaluated', reason: rule.kind === 'preservation' ? 'operation' : 'not-implemented' };
      }
      return { ...result, status: ruleEvaluations.some((evaluation) => concerns(evaluation, version)) ? 'passed' : 'not-applicable' };
    });
  });
}

// The report with the stages and evaluations behind it, so tests can check where each rule ran.
export function evaluateDocument(document) {
  const { result: { diagnostics, stages }, evaluations } = recordEvaluations(() => runValidation(document));
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics,
    results: ruleResults(document, diagnostics, evaluations, stages),
    stages,
    evaluations: evaluations.map((evaluation) => ({ ...evaluation, protocolVersions: evaluation.protocolVersions ?? scopeAt(document, evaluation.path) }))
  };
}

export function validateDocumentWithResults(document) {
  const { stages, evaluations, ...report } = evaluateDocument(document);
  return report;
}
