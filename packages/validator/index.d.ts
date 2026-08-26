export type McpDescriptionSpecification = '0.8.0-draft.1' | '0.8.0-draft.2';

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
    readonly schemaSha256: '4ceb6042c3fd31703199cd3db869ec5c35c17d2fe9ab7b2f5b96a2a3af0cebe4';
  };
  readonly '0.8.0-draft.2': {
    readonly snapshotTag: 'v0.8.0-draft.2';
    readonly schemaSha256: '57594803b38a2acd054241e85a34446e681924e5e579ecf5341091f26e217a52';
  };
}

export declare const supportedSpecifications: readonly ['0.8.0-draft.1', '0.8.0-draft.2'];

export declare const supportedProtocolVersions: readonly [
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
  '2025-11-25',
  '2026-07-28'
];

export declare const specificationProvenance: Readonly<SpecificationProvenance>;

export declare function validateMcpDescription(
  document: unknown,
  options: ValidateMcpDescriptionOptions
): McpDescriptionValidationResult;