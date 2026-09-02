import {
  resolveMcpDescriptionSpecification,
  specificationProvenance,
  supportedProtocolVersions,
  supportedSpecifications,
  validateMcpDescription,
  type McpDescriptionDiagnostic,
  type McpDescriptionValidationResult
} from '@mcpdesc/validator';
import { validateMcpDescription as validateBrowser } from '@mcpdesc/validator/browser';
import { validateMcpDescription as validateStandalone } from '@mcpdesc/validator/standalone';

declare const document: unknown;

const result: McpDescriptionValidationResult = validateMcpDescription(document, {
  specification: '0.8.0-draft.1'
});
validateMcpDescription(document, { specification: '0.8.0-draft.2' });
validateMcpDescription(document, { specification: '0.8.0-draft.3' });
validateMcpDescription(document, { specification: '0.8.0-draft.4' });
validateMcpDescription(document, { specification: '0.8.0-rc.1' });
const standaloneResult: McpDescriptionValidationResult = validateStandalone(document, {
  specification: '0.8.0-rc.1'
});
const browserResult: McpDescriptionValidationResult = validateBrowser(document, {
  specification: '0.8.0-rc.1'
});
const diagnostic: McpDescriptionDiagnostic | undefined = result.diagnostics[0];
const pathSegment: string | number | undefined = diagnostic?.path[0];
const draft1: '0.8.0-draft.1' = supportedSpecifications[0];
const draft2: '0.8.0-draft.2' = supportedSpecifications[1];
const draft3: '0.8.0-draft.3' = supportedSpecifications[2];
const draft4: '0.8.0-draft.4' = supportedSpecifications[3];
const rc1: '0.8.0-rc.1' = supportedSpecifications[4];
const protocolVersion: string = supportedProtocolVersions[0];
const draft1Tag: 'v0.8.0-draft.1' = specificationProvenance[draft1].snapshotTag;
const draft2Tag: 'v0.8.0-draft.2' = specificationProvenance[draft2].snapshotTag;
const draft3Tag: 'v0.8.0-draft.3' = specificationProvenance[draft3].snapshotTag;
const draft4Tag: 'v0.8.0-draft.4' = specificationProvenance[draft4].snapshotTag;
const draft4SchemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json' = specificationProvenance[draft4].schemaUri;
const rc1SchemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.1.json' = specificationProvenance[rc1].schemaUri;
const resolution = resolveMcpDescriptionSpecification(document, { specification: draft4 });
if (resolution.status === 'resolved') {
  const resolvedSelector: string = resolution.specification;
  const resolvedSchemaUri: string = resolution.schemaUri;
  void resolvedSelector;
  void resolvedSchemaUri;
}

void pathSegment;
void protocolVersion;
void draft1Tag;
void draft2Tag;
void draft3Tag;
void draft4Tag;
void draft4SchemaUri;
void rc1SchemaUri;
void browserResult;
void standaloneResult;

// @ts-expect-error The options argument is required.
validateMcpDescription(document);
// @ts-expect-error Unqualified draft selectors are not supported.
validateMcpDescription(document, { specification: '0.8.0' });
// @ts-expect-error Later drafts are not supported by this package version.
validateMcpDescription(document, { specification: '0.8.0-draft.5' });
// @ts-expect-error Supported specification exports are readonly.
supportedSpecifications.push('0.8.0-draft.1');
// @ts-expect-error Provenance is only available for supported selectors.
specificationProvenance['0.8.0-draft.5'];