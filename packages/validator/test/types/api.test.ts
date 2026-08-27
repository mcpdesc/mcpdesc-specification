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
validateMcpDescription(document, { specification: '0.8.0-draft.2' });
validateMcpDescription(document, { specification: '0.8.0-draft.3' });
const diagnostic: McpDescriptionDiagnostic | undefined = result.diagnostics[0];
const pathSegment: string | number | undefined = diagnostic?.path[0];
const draft1: '0.8.0-draft.1' = supportedSpecifications[0];
const draft2: '0.8.0-draft.2' = supportedSpecifications[1];
const draft3: '0.8.0-draft.3' = supportedSpecifications[2];
const protocolVersion: string = supportedProtocolVersions[0];
const draft1Tag: 'v0.8.0-draft.1' = specificationProvenance[draft1].snapshotTag;
const draft2Tag: 'v0.8.0-draft.2' = specificationProvenance[draft2].snapshotTag;
const draft3Tag: 'v0.8.0-draft.3' = specificationProvenance[draft3].snapshotTag;

void pathSegment;
void protocolVersion;
void draft1Tag;
void draft2Tag;
void draft3Tag;

// @ts-expect-error The options argument is required.
validateMcpDescription(document);
// @ts-expect-error Unqualified draft selectors are not supported.
validateMcpDescription(document, { specification: '0.8.0' });
// @ts-expect-error Draft 4 is not supported by this package version.
validateMcpDescription(document, { specification: '0.8.0-draft.4' });
// @ts-expect-error Supported specification exports are readonly.
supportedSpecifications.push('0.8.0-draft.1');
// @ts-expect-error Provenance is only available for supported selectors.
specificationProvenance['0.8.0-draft.4'];