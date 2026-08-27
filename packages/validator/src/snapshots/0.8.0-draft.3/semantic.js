// Validate the immutable Draft 3 snapshot using only snapshot-local artifacts.

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from './schema.json' with { type: 'json' };
import {
  semanticValidateDocument as validateBaseSemantics,
  supportedProtocolVersions
} from './base.js';

export { supportedProtocolVersions };

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateStructure = ajv.compile(schema);
const primitiveCollections = ['tools', 'resources', 'resourceTemplates', 'prompts'];
const componentNamespaces = ['schemas', 'toolExamples', 'resourceExamples', 'resourceTemplateExamples'];
const knownClientCapabilities = new Set(['roots', 'sampling', 'elicitation', 'tasks', 'extensions', 'experimental']);
const knownReservedCapabilityExtensions = new Set(['io.modelcontextprotocol/tasks']);

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
    resourceTemplates: document?.resourceTemplates
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
        : collection === 'resources' ? 'resourceExamples' : 'resourceTemplateExamples';
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
