import {
  supportedProtocolVersions,
  validateMcpdesc08Document
} from './semantic.js';

export const specification = '0.8.0-draft.2';
export const snapshotTag = 'v0.8.0-draft.2';
export const schemaSha256 = '57594803b38a2acd054241e85a34446e681924e5e579ecf5341091f26e217a52';
export { supportedProtocolVersions };

export function validate(document) {
  const diagnostics = validateMcpdesc08Document(document);
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics
  };
}