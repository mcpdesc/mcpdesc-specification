import * as draft1 from './snapshots/0.8.0-draft.1/index.js';
import * as draft2 from './snapshots/0.8.0-draft.2/index.js';

const snapshots = Object.freeze({
  [draft1.specification]: draft1,
  [draft2.specification]: draft2
});

export const supportedSpecifications = Object.freeze(Object.keys(snapshots));
export const supportedProtocolVersions = Object.freeze([
  ...new Set(Object.values(snapshots).flatMap((snapshot) => snapshot.supportedProtocolVersions))
]);

export const specificationProvenance = Object.freeze(Object.fromEntries(
  Object.entries(snapshots).map(([selector, snapshot]) => [selector, Object.freeze({
    snapshotTag: snapshot.snapshotTag,
    schemaSha256: snapshot.schemaSha256
  })])
));

export function validateMcpDescription(document, options) {
  if (!options || typeof options !== 'object' || Array.isArray(options) || !Object.hasOwn(options, 'specification')) {
    throw new TypeError('options.specification is required');
  }
  if (typeof options.specification !== 'string' || !Object.hasOwn(snapshots, options.specification)) {
    throw new RangeError(`Unsupported MCP Description specification: ${String(options.specification)}`);
  }

  return snapshots[options.specification].validate(document);
}