export type McpDescriptionSpecification = '0.8.0-draft.1' | '0.8.0-draft.2' | '0.8.0-draft.3' | '0.8.0-draft.4' | '0.8.0-rc.1';

export type SupportedProtocolVersion =
  | '2024-11-05'
  | '2025-03-26'
  | '2025-06-18'
  | '2025-11-25'
  | '2026-07-28';

export type McpDescriptionDiagnosticSeverity = 'error' | 'warning';

export interface McpDescriptionDiagnostic {
  readonly code: string;
  readonly severity: McpDescriptionDiagnosticSeverity;
  readonly message: string;
  readonly path: Array<string | number>;
}

export interface McpDescriptionValidationResult {
  readonly valid: boolean;
  readonly diagnostics: McpDescriptionDiagnostic[];
}

export interface ValidateMcpDescriptionOptions {
  specification: McpDescriptionSpecification;
}

export interface SpecificationProvenance {
  readonly '0.8.0-draft.1': {
    readonly snapshotTag: 'v0.8.0-draft.1';
    readonly schemaUri: 'https://mcpdesc.org/schema/0.8.0.json';
    readonly schemaSha256: '4ceb6042c3fd31703199cd3db869ec5c35c17d2fe9ab7b2f5b96a2a3af0cebe4';
  };
  readonly '0.8.0-draft.2': {
    readonly snapshotTag: 'v0.8.0-draft.2';
    readonly schemaUri: 'https://mcpdesc.org/schema/0.8.0.json';
    readonly schemaSha256: 'ab692c1a5a0f7e5f29be1940aa8c64a56d4620be0a19d00cf0a64680b7e517fa';
  };
  readonly '0.8.0-draft.3': {
    readonly snapshotTag: 'v0.8.0-draft.3';
    readonly schemaUri: 'https://mcpdesc.org/schema/0.8.0.json';
    readonly schemaSha256: '8823c1f1946360b2a44d00920e2092e5e4acd139a1964befad4eb0bf3ce96002';
  };
  readonly '0.8.0-draft.4': {
    readonly snapshotTag: 'v0.8.0-draft.4';
    readonly schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json';
    readonly schemaSha256: '93ed03f74059b5b3ce7509a96b59161bdab2c3cf7734397a9bec5a7588d0b03b';
  };
  readonly '0.8.0-rc.1': {
    readonly snapshotTag: 'v0.8.0-rc.1';
    readonly schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.1.json';
    readonly schemaSha256: '936a0f24ade501fcabf3d6498c0440c445daa672a575573a35954cee49430ac4';
  };
}

export interface ResolveMcpDescriptionSpecificationOptions {
  readonly specification?: McpDescriptionSpecification;
}

export interface ResolvedMcpDescriptionSpecification {
  readonly status: 'resolved';
  readonly specification: McpDescriptionSpecification;
  readonly schemaUri: string;
  readonly provenance: SpecificationProvenance[McpDescriptionSpecification];
  readonly diagnostics: McpDescriptionDiagnostic[];
}

export interface UnresolvedMcpDescriptionSpecification {
  readonly status: 'unresolved';
  readonly diagnostics: McpDescriptionDiagnostic[];
}

export type McpDescriptionSpecificationResolution =
  | ResolvedMcpDescriptionSpecification
  | UnresolvedMcpDescriptionSpecification;

export declare const supportedSpecifications: readonly ['0.8.0-draft.1', '0.8.0-draft.2', '0.8.0-draft.3', '0.8.0-draft.4', '0.8.0-rc.1'];

export declare const supportedProtocolVersions: readonly [
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
  '2025-11-25',
  '2026-07-28'
];

export declare const specificationProvenance: Readonly<SpecificationProvenance>;

export declare function resolveMcpDescriptionSpecification(
  document: unknown,
  options?: ResolveMcpDescriptionSpecificationOptions
): McpDescriptionSpecificationResolution;

export declare function validateMcpDescription(
  document: unknown,
  options: ValidateMcpDescriptionOptions
): McpDescriptionValidationResult;