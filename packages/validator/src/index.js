import {
  schemaSha256,
  snapshotTag,
  specification,
  supportedProtocolVersions,
  validate
} from './snapshots/0.8.0-draft.1/index.js';

export const supportedSpecifications = Object.freeze([specification]);
export { supportedProtocolVersions };

export const specificationProvenance = Object.freeze({
  [specification]: Object.freeze({
    snapshotTag,
    schemaSha256
  })
});

export function validateMcpDescription(document, options) {
  if (!options || typeof options !== 'object' || Array.isArray(options) || !Object.hasOwn(options, 'specification')) {
    throw new TypeError('options.specification is required');
  }
  if (options.specification !== specification) {
    throw new RangeError(`Unsupported MCP Description specification: ${String(options.specification)}`);
  }

  return validate(document);
}