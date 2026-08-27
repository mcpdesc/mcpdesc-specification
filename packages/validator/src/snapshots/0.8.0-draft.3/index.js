import {
  supportedProtocolVersions,
  validateMcpdesc08Document
} from './semantic.js';

export const specification = '0.8.0-draft.3';
export const snapshotTag = 'v0.8.0-draft.3';
export const schemaSha256 = '8823c1f1946360b2a44d00920e2092e5e4acd139a1964befad4eb0bf3ce96002';
export { supportedProtocolVersions };

export function validate(document) {
  const diagnostics = validateMcpdesc08Document(document);
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics
  };
}