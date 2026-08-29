// Validate the immutable 0.8.0-draft.4 snapshot using only snapshot-local artifacts.

import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { UriTemplateMatcher } from 'uri-template-matcher';
import schema from './schema.json' with { type: 'json' };
import {
  semanticValidateDocument as validateBaseSemantics,
  supportedProtocolVersions
} from './base.js';

export { supportedProtocolVersions };

const TOOL_INTERACTION_SENTINEL = '__interaction_example__';
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const ajvDraft7 = new Ajv({ allErrors: true, strict: false });
addFormats(ajvDraft7);
const validateStructure = ajv.compile(schema);
const primitiveCollections = ['tools', 'resources', 'resourceTemplates', 'prompts'];
const componentNamespaces = ['schemas', 'toolExamples', 'resourceExamples', 'resourceTemplateExamples', 'promptExamples'];
const knownClientCapabilities = new Set(['roots', 'sampling', 'elicitation', 'tasks', 'extensions', 'experimental']);
const knownReservedCapabilityExtensions = new Set(['io.modelcontextprotocol/tasks']);
const protocolOrder = new Map(supportedProtocolVersions.map((version, index) => [version, index]));

const clientCapabilitiesByVersion = {
  '2024-11-05': new Set(['roots', 'sampling', 'experimental']),
  '2025-03-26': new Set(['roots', 'sampling', 'experimental']),
  '2025-06-18': new Set(['roots', 'sampling', 'elicitation', 'experimental']),
  '2025-11-25': new Set(['roots', 'sampling', 'elicitation', 'tasks', 'experimental']),
  '2026-07-28': new Set(['roots', 'sampling', 'elicitation', 'extensions', 'experimental'])
};

function semanticDiagnostic(code, severity, message, path) {
  return { code, severity, message, path };
}

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
      return reference;
    }

    const key = `${namespace}/${name}`;
    if (stack.includes(key)) {
      diagnostics.push(componentDiagnostic(
        'component-reference-cycle',
        rel,
        `forms a cycle through ${[...stack, key].join(' -> ')}`,
        path
      ));
      return reference;
    }

    const target = document?.components?.[namespace]?.[name];
    if (target === undefined) {
      diagnostics.push(componentDiagnostic(
        'missing-component-reference-target',
        rel,
        `targets missing component ${JSON.stringify(reference.$componentRef)}`,
        path
      ));
      return reference;
    }
    substitutions += 1;
    return isReferenceObject(target)
      ? resolve(target, expectedNamespace, path, [...stack, key])
      : structuredClone(target);
  }

  for (const namespace of componentNamespaces) {
    for (const [name, value] of Object.entries(document?.components?.[namespace] ?? {})) {
      if (isReferenceObject(value)) {
        resolved.components[namespace][name] = resolve(value, namespace, ['components', namespace, name], [`${namespace}/${name}`]);
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
            resolvedDeclaration[field] = resolve(declaration[field], 'schemas', [collection, declarationIndex, field]);
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
          resolvedDeclaration.examples[name] = resolve(
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
          resolved[collection][declarationIndex].elicitations[elicitationIndex].requestedSchema = resolve(
            elicitation.requestedSchema,
            'schemas',
            [collection, declarationIndex, 'elicitations', elicitationIndex, 'requestedSchema']
          );
        }
      }
    }
  }

  return { document: resolved, diagnostics, substitutions };
}

function structuralPath(document, error) {
  const path = error.instancePath
    ? error.instancePath.slice(1).split('/').map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    : [];
  if (error.keyword === 'required' && typeof error.params.missingProperty === 'string') {
    path.push(error.params.missingProperty);
  } else if (error.keyword === 'additionalProperties' && typeof error.params.additionalProperty === 'string') {
    path.push(error.params.additionalProperty);
  }
  return path.map((segment) => Array.isArray(document) && /^(?:0|[1-9][0-9]*)$/.test(segment) ? Number(segment) : segment);
}

function structuralDiagnostics(document) {
  if (validateStructure(document)) return [];
  return (validateStructure.errors ?? []).map((error) => ({
    code: 'schema-validation',
    severity: 'error',
    message: `does not validate against 0.8.0: ${error.instancePath || '/'} ${error.message ?? 'unknown error'}`,
    path: structuralPath(document, error)
  }));
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
    mcpdesc: '0.8.0',
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
  return validateBaseSemantics(synthetic)
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

        if (step.type === 'elicitation') {
          const request = step.request ?? {};
          const response = step.response ?? {};
          const declaration = typeof step.declaration === 'string'
            ? (tool.elicitations ?? []).find((candidate) => candidate.name === step.declaration)
            : undefined;

          for (const version of scope) {
            if (protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
              diagnostics.push(semanticDiagnostic(
                'interaction-example-version-mismatch',
                'error',
                `${stepLocation}.type is not defined for MCP ${version}`,
                [...stepPath, 'type']
              ));
            }
            if (request.mode === 'url' && protocolOrder.get(version) < protocolOrder.get('2025-11-25')) {
              diagnostics.push(semanticDiagnostic(
                'interaction-example-version-mismatch',
                'error',
                `${stepLocation}.request.mode "url" is not defined for MCP ${version}`,
                [...stepPath, 'request', 'mode']
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
            if ((Object.hasOwn(step.request, 'tools') || Object.hasOwn(step.request, 'toolChoice'))
              && protocolOrder.get(version) < protocolOrder.get('2025-11-25')) {
              diagnostics.push(semanticDiagnostic(
                'interaction-example-version-mismatch',
                'error',
                `${stepLocation}.request uses sampling Tool fields that are not defined for MCP ${version}`,
                [...stepPath, 'request', Object.hasOwn(step.request, 'tools') ? 'tools' : 'toolChoice']
              ));
            }
          }
        }

        if (step.type === 'roots') {
          for (const [rootIndex, root] of (step.response.roots ?? []).entries()) {
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
      [...path, member]
    ));
  }

  function requireObject(value, location, path, version) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return true;
    diagnostics.push(semanticDiagnostic(
      'invalid-client-requirement-value',
      'error',
      `${location} must be an object for MCP ${version}`,
      path
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
          if (knownClientCapabilities.has(capability) && !available.has(capability)) {
            diagnostics.push(semanticDiagnostic(
              'client-requirement-version-mismatch',
              'error',
              `${baseLocation}.${capability} is not defined by MCP ${version}; split the primitive into disjoint protocol-scoped variants when requirements differ`,
              [...basePath, capability]
            ));
            continue;
          }
          if (!available.has(capability)) continue;

          const location = `${baseLocation}.${capability}`;
          const path = [...basePath, capability];
          if (capability === 'roots') {
            validateClosedMembers(value, version === '2026-07-28' ? new Set() : new Set(['listChanged']), location, path, version);
            if (version !== '2026-07-28' && Object.hasOwn(value, 'listChanged') && typeof value.listChanged !== 'boolean') {
              diagnostics.push(semanticDiagnostic('invalid-client-requirement-value', 'error', `${location}.listChanged must be a boolean for MCP ${version}`, [...path, 'listChanged']));
            }
          } else if (capability === 'sampling' && ['2025-11-25', '2026-07-28'].includes(version)) {
            validateClosedMembers(value, new Set(['context', 'tools']), location, path, version);
            for (const member of ['context', 'tools']) {
              if (Object.hasOwn(value, member)) requireObject(value[member], `${location}.${member}`, [...path, member], version);
            }
            if (Object.hasOwn(value, 'context')) {
              diagnostics.push(semanticDiagnostic('deprecated-client-requirement', 'warning', `${location}.context uses deprecated MCP context-inclusion capability semantics in MCP ${version}`, [...path, 'context']));
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
              if (usesMcpReservedPrefix(extension) && !knownReservedCapabilityExtensions.has(extension)) {
                diagnostics.push(semanticDiagnostic(
                  'unknown-reserved-extension-identifier',
                  'warning',
                  `${location} contains unrecognized extension ${JSON.stringify(extension)} under an MCP-reserved prefix; preserve it and review its authority`,
                  [...path, extension]
                ));
              }
            }
          }

          if (version === '2026-07-28' && ['roots', 'sampling'].includes(capability)) {
            diagnostics.push(semanticDiagnostic(
              'deprecated-client-requirement',
              'warning',
              `${location} requires an MCP capability deprecated in MCP ${version}`,
              path
            ));
          }
        }
      }
    }
  }

  return diagnostics;
}

function validatePromptContentVersion(content, contentLocation, contentPath, version, diagnostics) {
  if (content.type === 'audio' && protocolOrder.get(version) < protocolOrder.get('2025-03-26')) {
    diagnostics.push(semanticDiagnostic('prompt-example-content-version-mismatch', 'error', `${contentLocation} uses audio content, which is not defined for MCP ${version}`, [...contentPath, 'type']));
  }
  if (content.type === 'resource_link' && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
    diagnostics.push(semanticDiagnostic('prompt-example-content-version-mismatch', 'error', `${contentLocation} uses resource-link content, which is not defined for MCP ${version}`, [...contentPath, 'type']));
  }
  if (Object.hasOwn(content, '_meta') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
    diagnostics.push(semanticDiagnostic('prompt-example-content-version-mismatch', 'error', `${contentLocation}._meta is not defined for MCP ${version}`, [...contentPath, '_meta']));
  }
  if (content.type === 'resource' && Object.hasOwn(content.resource ?? {}, '_meta') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
    diagnostics.push(semanticDiagnostic('prompt-example-content-version-mismatch', 'error', `${contentLocation}.resource._meta is not defined for MCP ${version}`, [...contentPath, 'resource', '_meta']));
  }
  if (content.type === 'resource_link' && Array.isArray(content.icons) && protocolOrder.get(version) < protocolOrder.get('2025-11-25')) {
    diagnostics.push(semanticDiagnostic('prompt-example-content-version-mismatch', 'error', `${contentLocation}.icons is not defined for MCP ${version}`, [...contentPath, 'icons']));
  }
  if (content.annotations?.lastModified !== undefined && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
    diagnostics.push(semanticDiagnostic('prompt-example-content-version-mismatch', 'error', `${contentLocation}.annotations.lastModified is not defined for MCP ${version}`, [...contentPath, 'annotations', 'lastModified']));
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
        if (version === '2026-07-28' && result.resultType !== 'complete') {
          diagnostics.push(semanticDiagnostic('prompt-example-result-version-mismatch', 'error', `${resultLocation}.resultType must be "complete" for MCP ${version}`, [...resultPath, 'resultType']));
        }
        if (version !== '2026-07-28' && Object.hasOwn(result, 'resultType')) {
          diagnostics.push(semanticDiagnostic('prompt-example-result-version-mismatch', 'error', `${resultLocation}.resultType is not defined for MCP ${version}`, [...resultPath, 'resultType']));
        }
        if (Object.hasOwn(result, '_meta') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
          diagnostics.push(semanticDiagnostic('prompt-example-result-version-mismatch', 'error', `${resultLocation}._meta is not defined for MCP ${version}`, [...resultPath, '_meta']));
        }
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
      [...resultPath, 'resultType']
    ));
  }
  if (version !== '2026-07-28' && Object.hasOwn(result, 'resultType')) {
    diagnostics.push(semanticDiagnostic(
      'completion-example-result-version-mismatch',
      'error',
      `${resultLocation}.resultType is not defined for MCP ${version}`,
      [...resultPath, 'resultType']
    ));
  }
  if (Object.hasOwn(result, '_meta') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
    diagnostics.push(semanticDiagnostic(
      'completion-example-result-version-mismatch',
      'error',
      `${resultLocation}._meta is not defined for MCP ${version}`,
      [...resultPath, '_meta']
    ));
  }
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
        } catch (error) {
          diagnostics.push(semanticDiagnostic(
            'resource-template-completion-example-invalid-template',
            'error',
            `${ownerLocation}.uriTemplate is not a valid RFC 6570 template: ${error.message}`,
            [kind, ownerIndex, 'uriTemplate']
          ));
          allowedNames = undefined;
        }
      }

      for (const [exampleName, example] of Object.entries(owner.completionExamples)) {
        if (!example || typeof example !== 'object' || Array.isArray(example)) continue;
        const exampleLocation = `${ownerLocation}.completionExamples[${JSON.stringify(exampleName)}]`;
        const examplePath = [kind, ownerIndex, 'completionExamples', exampleName];
        const targetName = example.argument?.name;
        const contextArguments = example.context?.arguments;

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
          if (protocolOrder.get(version) < protocolOrder.get('2025-03-26')) {
            diagnostics.push(semanticDiagnostic(
              'completion-example-version-mismatch',
              'error',
              `${exampleLocation} is not defined for MCP ${version}`,
              examplePath
            ));
            continue;
          }
          if (Object.hasOwn(example, 'context') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
            diagnostics.push(semanticDiagnostic(
              'completion-example-context-version-mismatch',
              'error',
              `${exampleLocation}.context is not defined for MCP ${version}`,
              [...examplePath, 'context']
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

export function semanticValidateDocument(document, rel = 'document') {
  const resolution = resolveComponentReferences(document, rel);
  const resolvedStructureDiagnostics = resolution.diagnostics.length || resolution.substitutions === 0
    ? []
    : structuralDiagnostics(resolution.document);
  const diagnostics = [
    ...resolution.diagnostics,
    ...resolvedStructureDiagnostics,
    ...(resolution.diagnostics.length || resolvedStructureDiagnostics.length
      ? []
      : validateBaseSemantics(resolution.document, rel)),
    ...validateToolInteractionExamples(resolution.document),
    ...validatePromptExamples(resolution.document),
    ...validateCompletionExamples(resolution.document),
    ...validateClientRequirements(document)
  ];
  const filtered = Object.hasOwn(document, 'transports')
    ? diagnostics
    : diagnostics.filter((diagnostic) => diagnostic.code !== 'transport-coverage-gap');
  return filtered.sort(
    (left, right) => left.code.localeCompare(right.code)
      || left.message.localeCompare(right.message)
      || JSON.stringify(left.path).localeCompare(JSON.stringify(right.path))
  );
}

export function validateMcpdesc08Document(document) {
  const diagnostics = structuralDiagnostics(document);
  return diagnostics.length ? diagnostics : semanticValidateDocument(document);
}
