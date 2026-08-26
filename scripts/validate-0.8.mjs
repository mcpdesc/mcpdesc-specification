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

export function semanticValidateDocument(document, rel = 'document') {
  const diagnostics = validateDraft1Semantics(document, rel);
  if (Object.hasOwn(document, 'transports')) return diagnostics;
  return diagnostics.filter((diagnostic) => diagnostic.code !== 'transport-coverage-gap');
}

export function validateMcpdesc08Document(document) {
  if (validateStructure(document)) return semanticValidateDocument(document);
  return (validateStructure.errors ?? []).map((error) => ({
    code: 'schema-validation',
    severity: 'error',
    message: `does not validate against 0.8.0: ${error.instancePath || '/'} ${error.message ?? 'unknown error'}`,
    path: structuralPath(document, error)
  }));
}
