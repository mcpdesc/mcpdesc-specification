## 16. Conformance

### 16.1 Document Conformance

<a id="req-conforming-document"></a>A conforming MCP Description document MUST:

1. Decode from one conforming JSON or restricted YAML serialization to the JSON-compatible MCP Description data model (Sections 3.1 and 15).
2. Include the `mcpdesc` property with a recognized specification version (Section 4).
3. Include the `info` object with at least `name` and `version` (Section 5).
4. Include non-empty root `protocolVersions` containing only protocol versions supported by mcpdesc 0.9.0 (Section 4).
5. Contain at least one entry in every present ordinary declaration collection (Section 3.3).
6. When `transports` is present, contain at least one Transport Object and provide complete root protocol coverage (Section 6).
7. <a id="req-document-schema"></a>Validate against the JSON Schema for the declared `mcpdesc` version.
8. Satisfy semantic scope, identifier, Elicitation Declaration, client-requirement, security-reference, tag-reference, component-reference, protocol version-applicability, embedded Tool schema and example, and `x-mcp-header` constraints.
9. Not contain unknown properties on closed MCP Description-defined objects, except specification extensions matching `^x-` at eligible locations.

### 16.2 Implementation Conformance

<a id="req-conforming-implementation"></a>A conforming implementation (such as an authoring tool, validator, or platform) MUST:

1. Support at least one conforming serialization and state whether it supports JSON, YAML, or both for input and for output.
2. Accept and correctly parse conforming documents in every serialization for which it claims input support.
3. Emit only conforming documents in every serialization for which it claims output support.
4. Reject documents that fail the requirements in Section 16.1 or the restricted profile of a claimed input serialization.
5. Ignore unrecognized specification extensions when interpreting core semantics and accept them without error at eligible locations (Section 14.4).
6. Preserve root and object-level specification extensions when processing, projecting, merging, and reserializing documents, unless explicitly asked to strip them (Sections 14.4 and 14.5). Native MCP projection is different: it produces MCP values, not documents, and omits specification extensions (Section 4.14).
7. Apply the same structural JSON Schema validation and cross-object semantic requirements after decoding JSON or YAML.
8. Use safe YAML parsing and reject unsupported YAML constructs when claiming YAML input support (Section 15.3).
9. Apply reasonable document-size, nesting-depth, scalar-length, and collection-size limits to supported input serializations.
10. Resolve `$componentRef` only within the same parsed document, without network access, before contextual semantic validation.

The published JSON Schema expresses structural constraints only. Passing JSON Schema validation alone does not make a document conforming. Protocol scope, protocol version applicability, Client Capability Requirements, Elicitation Declarations, security and component reference resolution, embedded Tool schemas and examples, extension namespace diagnostics, and other cross-object constraints require semantic validation.

A warning condition defined by this specification is non-fatal and does not by itself make a document non-conforming. <a id="req-stricter-profile"></a>An implementation MAY offer a stricter profile that promotes warnings to errors, but it MUST identify that profile separately from baseline mcpdesc conformance.

Complete protocol-version-specific `_meta` validation begins with MCP 2025-06-18. <a id="req-legacy-validation-scope"></a>For the recognized legacy compatibility protocol versions MCP 2024-11-05 and MCP 2025-03-26, validators MUST apply the structural checks and the subset of semantic checks that are sound for that version, SHOULD warn that validation is incomplete, and MUST NOT report partial validation as complete MCP semantic conformance.

<a id="req-implementation-recommendations"></a>A conforming implementation SHOULD:

1. Support at least the current specification version.
2. Provide clear error messages when rejecting non-conforming documents.
3. Support JSON Schema validation against the published schema.

### 16.3 Partial Conformance

<a id="req-partial-support"></a>Implementations that support only a subset of the specification (for example, only Tools or only one transport type) SHOULD document their limitations clearly.

### 16.4 Versioned Conformance

Conformance is assessed against a specific specification version. <a id="req-conformance-claim"></a>An implementation claiming conformance MUST state which `mcpdesc` versions it supports.

### 16.5 Validation Results

Validation rules identify the requirements that validators check (Section 2.3). The validation result format, published as [`validation/result.schema.json`](../validation/result.schema.json), represents diagnostics and rule results; [`validation/README.md`](../validation/README.md#rule-results) explains them.

<a id="req-diagnostic-rule"></a>Each diagnostic that a validator reports MUST identify the registered validation rule it reports, its severity, and the location it concerns in the document. When the finding depends on an MCP protocol version, the diagnostic SHOULD identify that version. A diagnostic MAY carry a code and a message; this specification does not define their values.

<a id="req-diagnostic-source-location"></a>The location of a diagnostic MUST identify a value or member name present in the document as written, before component references are replaced. A diagnostic for a missing member MUST identify the closest enclosing object. In validation result format `1.4.0`, its `detail.member` MUST identify the missing member, and its message, when present, SHOULD identify it. A diagnostic for an unexpected or invalid member name MUST identify that member.

<a id="req-diagnostic-component-provenance"></a>A diagnostic for content reached through `$componentRef` MUST identify the reference object at the use site as its primary location. In validation result format `1.4.0`, it MUST also include the location within the component as a related location with relation `component-definition`. When references are chained, the related location is in the final component definition. For a finding at resolved path `P`, the applicable provenance entry is the one whose `referencePath` is the longest prefix of `P`, including `P` itself. The primary location is that `referencePath`. The related location is the entry's `targetPath` followed by the rest of `P`. When no entry matches, `P` is already a location in the source document. For a missing member, the related location identifies the enclosing component object.

<a id="req-rule-results"></a>A validator MAY report rule results. A validator that claims conformance with this specification's validation fixtures MUST report them: one status for each rule and each protocol version declared by the document, or one status for a rule whose applicability does not depend on the protocol version. A status is `passed`, `failed`, `warning`, `not-applicable`, `not-evaluated`, or `delegated`. Rule results do not affect document validity; errors alone determine it.

<a id="req-rule-results-executed"></a>A rule result MUST come from the checks the validator executed. A validator MUST NOT report `passed` for a rule that it did not check for that protocol version, including when an earlier validation stage failed, when it does not implement the check, or when the check is not applied to a legacy compatibility protocol version.

### 16.6 Schema-Derived Diagnostics

This section covers how the document schema expresses unions and how validators report findings derived from it.

<a id="req-diagnostic-union-conditionals"></a>The document schema MUST express every union that has a deterministic, portable selector as guarded conditionals using JSON Schema 2020-12. A guard MUST use a discriminator value, the presence of `$componentRef`, a JSON type, or defining members; a discriminator guard MAY be combined with defining members. The conditionals MUST select only the applicable alternative and preserve the original acceptance constraints, including closure, required members, and specification extensions. The one exception is the explicit closure of the Elicitation Interaction Response Object ([Section 9.4](#req-interaction-response-closed)). A selector typo does not authorize a validator to infer the intended alternative. A schema check MUST reject unreviewed `oneOf` or `anyOf` occurrences and conditional guards outside these forms. An allowlisted `anyOf` remains inclusive. When it fails, it MUST produce one `missing-alternative` finding at the union value, and failures of its individual alternatives MUST NOT be emitted.

<a id="req-diagnostic-union-closure"></a>For each discriminated object union, the parent schema MUST declare the union of member names accepted by its alternatives, keep the discriminator's constraint, and reject other members while preserving its specification-extension pattern. Other parent member schemas MUST be `true`, so value constraints remain in the selected branch. Each alternative schema keeps its own closure: a member allowed by a different alternative is still invalid in the selected alternative.

<a id="req-diagnostic-conditional-reduction"></a>Findings from the selected `then` or `else` branch MUST be retained. A failure reported for an `if` keyword MUST NOT be emitted when another finding exists at or below the same instance location; otherwise, it MUST be emitted as kind `constraint` with keyword `if`. A `not` failure over `required` members MUST produce one `conflicting-members` finding at the object. Its member list names the enclosing guard's required members, followed by the members that `not` forbids. When selected by a discriminator, the finding also identifies that selector. Unselected alternatives MUST NOT be reconstructed or inferred.

<a id="req-diagnostic-rule-attribution"></a>A schema-derived finding MUST be attributed to the rule whose catalog schema pointer is the longest prefix of the absolute schema pointer of the subschema containing the failing keyword. This pointer is a location in the document schema, not an engine evaluation path relative to a `$ref`, so a shared definition is attributed to the same rule wherever it is used. A validator MUST NOT attribute a finding to an enclosing union by choosing a best-matching alternative. Findings removed by conditional or `anyOf` reduction MUST NOT cause a rule to be reported as `failed`.

<a id="req-diagnostic-detail"></a>Validation result format `1.4.0` defines factual `detail` for findings derived from the document schema. It identifies missing, unexpected, or invalid members and values; expected types; conflicting members; missing alternatives; and the failing keyword for other constraints. `allowedValues`, `allowedMembers`, and `expectedTypes` describe the subschema that reported the finding. The format also defines related component locations. `kind` is extensible; consumers MUST fall back to `message` for an unrecognized kind. Detail states facts, not remedies. This specification defines the location, rule, severity, conditional reduction, and generic handling of remaining `anyOf` and `not` findings. It does not define raw engine error counts, schema paths, `code`, or `message` wording.

<a id="req-diagnostic-deduplication"></a>Duplicate findings share the same source path, rule, severity, kind, and relevant member or member-list facts. Constraint findings with different failing keywords are not duplicates. Of a set of duplicates, a validator MUST emit only one: the finding whose failing keyword has the longest absolute schema pointer. Independent findings MUST be retained. Diagnostic order is not part of the contract; producers SHOULD order findings by document position.
