## 16. Conformance

### 16.1 Document Conformance

A conforming MCP Description document MUST:

1. Decode from one conforming JSON or restricted YAML serialization to the JSON-compatible MCP Description data model (Sections 3.1 and 15).
2. Include the `mcpdesc` property with a recognized specification version (Section 4).
3. Include the `info` object with at least `name` and `version` (Section 5).
4. Include non-empty root `protocolVersions` containing only revisions supported by mcpdesc 0.8.0 (Section 4).
5. Contain at least one entry in every present ordinary declaration collection (Section 3.3).
6. When `transports` is present, contain at least one Transport Object and provide complete root protocol coverage (Section 6).
7. Validate against the JSON Schema for the declared `mcpdesc` version.
8. Satisfy semantic scope, identifier, Elicitation Declaration, client-requirement, security-reference, tag-reference, component-reference, revision-applicability, embedded Tool schema and example, and `x-mcp-header` constraints.
9. Not contain unknown properties on closed MCP Description-defined objects except specification extensions matching `^x-` at eligible locations.

### 16.2 Implementation Conformance

A conforming implementation (tool, validator, or platform) MUST:

1. Support at least one conforming serialization and declare JSON, YAML, or both for each applicable input or output capability.
2. Accept and correctly parse conforming documents in every serialization for which it claims input support.
3. Emit only conforming documents in every serialization for which it claims output support.
4. Reject documents that fail the requirements in Section 16.1 or the restricted profile of a claimed input serialization.
5. Ignore unrecognized specification extensions when interpreting core semantics and accept them without error at eligible locations (Section 14.4).
6. Preserve root and object-level specification extensions when processing, projecting, merging, and reserializing documents unless explicitly requested to strip them (Sections 14.4 and 14.5).
7. Apply the same structural JSON Schema validation and cross-object semantic requirements after decoding JSON or YAML.
8. Use safe YAML parsing and reject unsupported YAML constructs when claiming YAML input support (Section 15.3).
9. Apply reasonable document-size, nesting-depth, scalar-length, and collection-size limits to supported input serializations.
10. Resolve `$componentRef` only within the same parsed document, without network access, before contextual semantic validation.

The published JSON Schema expresses structural constraints only. JSON-Schema-only acceptance is insufficient for document conformance because protocol scope, revision applicability, Client Capability Requirements, Elicitation Declarations, security and component reference resolution, embedded Tool schemas and examples, extension namespace diagnostics, and other cross-object rules require semantic validation.

A warning condition defined by this specification is non-fatal and does not by itself make a document non-conforming. An implementation MAY offer a stricter profile that promotes warnings to errors, but it MUST identify that profile separately from baseline mcpdesc conformance.

Complete revision-specific `_meta` validation begins with MCP 2025-06-18. For the recognized legacy compatibility revisions MCP 2024-11-05 and MCP 2025-03-26, validators MUST apply sound structural and selected checks, SHOULD warn that validation is incomplete, and MUST NOT report partial validation as complete MCP semantic conformance.

A conforming implementation SHOULD:

1. Support at least the current specification version.
2. Provide clear error messages when rejecting non-conforming documents.
3. Support JSON Schema validation against the published schema.

### 16.3 Partial Conformance

Implementations that support only a subset of the specification (e.g., only tools, or only a specific transport type) SHOULD document their limitations clearly.

### 16.4 Versioned Conformance

Conformance is assessed against a specific specification version. An implementation claiming conformance MUST state which `mcpdesc` version(s) it supports.
