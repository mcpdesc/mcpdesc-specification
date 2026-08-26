// Validate the current Draft 2 working tree without changing the immutable
// Draft 1 validator snapshot.

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../schemas/mcp-description/0.8.0.json' with { type: 'json' };
import {
  semanticValidateDocument as validateDraft1Semantics,
  supportedProtocolVersions
} from '../packages/validator/src/internal.js';

export { supportedProtocolVersions };

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateStructure = ajv.compile(schema);
const provenanceDigestPattern = /^[A-Za-z][A-Za-z0-9+._-]*:[^\s]+$/;
const primitiveCollections = ['tools', 'resources', 'resourceTemplates', 'prompts'];
const componentNamespaces = ['schemas', 'toolExamples', 'resourceExamples', 'resourceTemplateExamples'];

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

function validateProvenance(document, rel) {
  const diagnostics = [];
  const records = document?.provenance?.records ?? {};

  for (const [recordId, record] of Object.entries(records)) {
    const digest = record?.artifact?.digest;
    if (typeof digest === 'string' && !provenanceDigestPattern.test(digest)) {
      diagnostics.push({
        code: 'invalid-provenance-digest',
        severity: 'error',
        message: `${rel}.provenance.records[${JSON.stringify(recordId)}].artifact.digest must identify a digest algorithm and non-empty value separated by ":"`,
        path: ['provenance', 'records', recordId, 'artifact', 'digest']
      });
    }
  }

  const references = [
    ['provenance', 'defaultIds', document?.provenance?.defaultIds]
  ];
  for (const collection of primitiveCollections) {
    for (const [index, primitive] of (document?.[collection] ?? []).entries()) {
      references.push([collection, index, 'provenanceIds', primitive?.provenanceIds]);
    }
  }

  for (const reference of references) {
    const ids = reference.at(-1);
    if (!Array.isArray(ids)) continue;
    const path = reference.slice(0, -1);
    for (const [index, id] of ids.entries()) {
      if (Object.hasOwn(records, id)) continue;
      diagnostics.push({
        code: 'unknown-provenance-reference',
        severity: 'error',
        message: `${rel}.${path.join('.')}[${index}] references unknown provenance record ${JSON.stringify(id)}`,
        path: [...path, index]
      });
    }
  }

  return diagnostics;
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
      : validateDraft1Semantics(resolution.document, rel)),
    ...validateProvenance(document, rel)
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
