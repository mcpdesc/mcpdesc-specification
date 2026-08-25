export type McpDescriptionSpecification = '0.8.0-draft.1';

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
  readonly snapshotTag: 'v0.8.0-draft.1';
  readonly schemaSha256: '4ceb6042c3fd31703199cd3db869ec5c35c17d2fe9ab7b2f5b96a2a3af0cebe4';
}

export declare const supportedSpecifications: readonly ['0.8.0-draft.1'];

export declare const supportedProtocolVersions: readonly [
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
  '2025-11-25',
  '2026-07-28'
];

export declare const specificationProvenance: Readonly<{
  readonly '0.8.0-draft.1': Readonly<SpecificationProvenance>;
}>;

export declare function validateMcpDescription(
  document: unknown,
  options: ValidateMcpDescriptionOptions
): McpDescriptionValidationResult;