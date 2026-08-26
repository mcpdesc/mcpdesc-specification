import {
  specificationProvenance,
  supportedProtocolVersions,
  supportedSpecifications,
  validateMcpDescription,
  type McpDescriptionDiagnostic,
  type McpDescriptionValidationResult
} from '@mcpdesc/validator';

declare const document: unknown;

const result: McpDescriptionValidationResult = validateMcpDescription(document, {
  specification: '0.8.0-draft.1'
});
const diagnostic: McpDescriptionDiagnostic | undefined = result.diagnostics[0];
const pathSegment: string | number | undefined = diagnostic?.path[0];
const snapshot: '0.8.0-draft.1' = supportedSpecifications[0];
const protocolVersion: string = supportedProtocolVersions[0];
const tag: 'v0.8.0-draft.1' = specificationProvenance[snapshot].snapshotTag;

void pathSegment;
void protocolVersion;
void tag;

// @ts-expect-error The options argument is required.
validateMcpDescription(document);
// @ts-expect-error Unqualified draft selectors are not supported.
validateMcpDescription(document, { specification: '0.8.0' });
// @ts-expect-error Draft 2 is not supported by this package version.
validateMcpDescription(document, { specification: '0.8.0-draft.2' });
// @ts-expect-error Supported specification exports are readonly.
supportedSpecifications.push('0.8.0-draft.1');
// @ts-expect-error Provenance is only available for supported selectors.
specificationProvenance['0.8.0-draft.2'];