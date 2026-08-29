import {
  supportedProtocolVersions,
  validateMcpdesc08Document
} from './semantic.js';

export const specification = '0.8.0-draft.4';
export const snapshotTag = 'v0.8.0-draft.4';
export const schemaSha256 = '93ed03f74059b5b3ce7509a96b59161bdab2c3cf7734397a9bec5a7588d0b03b';
export { supportedProtocolVersions };

export function validate(document) {
  const diagnostics = validateMcpdesc08Document(document);
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics
  };
}
