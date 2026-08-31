import {
  supportedProtocolVersions,
  validateMcpdesc08Document
} from './semantic.js';

export const specification = '0.8.0-rc.1';
export const snapshotTag = 'v0.8.0-rc.1';
export const schemaSha256 = '936a0f24ade501fcabf3d6498c0440c445daa672a575573a35954cee49430ac4';
export { supportedProtocolVersions };

export function validate(document) {
  const diagnostics = validateMcpdesc08Document(document);
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics
  };
}
