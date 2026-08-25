import schema from './schema.json' with { type: 'json' };

import {
  createMcpdesc08Validator,
  semanticValidateDocument,
  supportedProtocolVersions
} from './semantic.js';

export const specification = '0.8.0-draft.1';
export const snapshotTag = 'v0.8.0-draft.1';
export const schemaSha256 = '4ceb6042c3fd31703199cd3db869ec5c35c17d2fe9ab7b2f5b96a2a3af0cebe4';
export { supportedProtocolVersions };

const validateStructure = createMcpdesc08Validator(schema);

function decodePointerSegment(segment) {
  return segment.replaceAll('~1', '/').replaceAll('~0', '~');
}

function instancePath(document, pointer) {
  if (!pointer) return [];
  const path = [];
  let current = document;
  for (const encodedSegment of pointer.slice(1).split('/')) {
    const segment = decodePointerSegment(encodedSegment);
    const key = Array.isArray(current) && /^(?:0|[1-9][0-9]*)$/.test(segment)
      ? Number(segment)
      : segment;
    path.push(key);
    current = current?.[key];
  }
  return path;
}

function structuralPath(document, error) {
  const path = instancePath(document, error.instancePath);
  if (error.keyword === 'required' && typeof error.params.missingProperty === 'string') {
    path.push(error.params.missingProperty);
  } else if (error.keyword === 'additionalProperties' && typeof error.params.additionalProperty === 'string') {
    path.push(error.params.additionalProperty);
  }
  return path;
}

function compareDiagnostics(left, right) {
  return left.code.localeCompare(right.code)
    || left.message.localeCompare(right.message)
    || JSON.stringify(left.path).localeCompare(JSON.stringify(right.path));
}

export function validate(document) {
  let diagnostics;
  if (validateStructure(document)) {
    diagnostics = semanticValidateDocument(document);
  } else {
    diagnostics = (validateStructure.errors ?? []).map((error) => ({
      code: 'schema-validation',
      severity: 'error',
      message: `does not validate against 0.8.0: ${error.instancePath || '/'} ${error.message ?? 'unknown error'}`,
      path: structuralPath(document, error)
    }));
    diagnostics.sort(compareDiagnostics);
  }

  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics
  };
}