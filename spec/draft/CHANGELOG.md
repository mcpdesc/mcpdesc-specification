# Changelog

All notable changes to the MCP Description Specification will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses specification versioning aligned with its `mcpdesc` field.

<!-- update with `markdown-toc -i CHANGELOG.md --maxdepth 2 -->
<!-- toc -->

- [[0.9.0] — Unreleased (community working draft)](#090--unreleased-community-working-draft)
- [[0.8.0+editorial.1] — 2026-10-19](#080editorial1--2026-10-19)
- [[0.8.0] — 2026-09-09](#080--2026-09-09)
- [[0.7.0] — 2026-03-23](#070--2026-03-23)
- [[0.6.0] — 2026-03-20](#060--2026-03-20)
- [[0.5.2] — 2026-03-18](#052--2026-03-18)
- [[0.5.1] — 2026-03-17](#051--2026-03-17)
- [[0.5.0] — 2026-03-17](#050--2026-03-17)
- [[0.4.0] — 2026-03-16](#040--2026-03-16)
- [[0.3.0] — 2026-01-15](#030--2026-01-15)
- [[0.1.0] — 2025-11-01](#010--2025-11-01)

<!-- tocstop -->

## [0.9.0] — Unreleased (community working draft)

### Community Working Draft 1 — 2026-10-24 (`v0.9.0-draft.1`)

Initialization of the 0.9.0 draft from the stable 0.8.0 release; the `v0.9.0-draft.1` tag has not been published. Normative changes made since initialization are listed in the sections below.

- Copied the 0.8.0 sections, examples, fixtures, serialization fixtures, and guides into `spec/draft/`.
- Draft documents use `mcpdesc: 0.9.0`, and the draft schema [`schemas/mcp-description/0.9.0.json`](../../schemas/mcp-description/0.9.0.json) uses the prerelease identity `https://mcpdesc.org/schema/mcp-description/0.9.0-draft.1.json`. At initialization its validation rules were otherwise identical to 0.8.0.
- Updated version-identity statements to 0.9.0; historical references to earlier versions are unchanged.
- Removed the 0.7.0 to 0.8.0 migration guide from the draft; it belongs to the 0.8.0 release and remains in [`spec/0.8.0/guides/`](../0.8.0/guides/migration-0.7-to-0.8.md). Added the [0.8.0 to 0.9.0 migration guide](guides/migration-0.8-to-0.9.md).

### Validation rules (draft Proposal 0024; subject to review and possible incompatible change or removal)

- Added a pilot validation rule registry: [`validation/rule.schema.json`](validation/rule.schema.json) and rule records under [`validation/rules/`](validation/rules/), initially covering Tool `outputSchema` availability and object root, Tool `inputSchema` object root, Tool schema keyword preservation, `x-mcp-header`, open Result properties, example result revision fidelity, completion example availability, and document schema validation. The registry is non-normative until the proposal is accepted and does not change document conformance.
- Documented MCP's sources of truth in [`validation/README.md`](validation/README.md): the revision's `schema.ts` for structures, its specification text for semantics, and generated JSON Schema, SEPs, and SDKs as evidence only. Rule records gain an optional `requirement` level; MCP rules at `should` or `may` level do not emit errors.
- Recorded the tension between dialect selection and the literal `type: "object"` root of `inputSchema` (MCP issue #3238) as an arbitration on `mcp.tool.input-schema.object-root`; validation is unchanged. Added fixture `expected-invalid/non-object-input-schema.json`.
- Recorded the "examples fail fast" principle in [`validation/README.md`](validation/README.md): incorrect examples are conformance errors rather than an optional linter concern, measured against MCP's own types. Fields an applicable revision allows but does not define are planned to be accepted with a warning; until then, the differences are recorded as rule gaps.
- Added fixtures `expected-invalid/output-schema-before-2025-06-18.json` and `expected-warning/open-result-unknown-properties.json` for revision boundaries not covered before.
- Diagnostics carry a `rule` property with the rule identifier, next to `code` (Proposal 0024, Section 5). A `schema-validation` diagnostic identifies a specific rule where the failing schema location does, otherwise `mcpdesc.document.schema`.
- Migration for diagnostic consumers: validator output gains the `rule` property. Tools, CI checks, and snapshot tests that compare whole diagnostic objects, or reject unknown diagnostic properties, must accept it or compare `code`, `severity`, `message`, and `path` only. In `@mcpdesc/core`, frozen diagnostic expectations change at the next validator snapshot intake. See the [0.8.0 to 0.9.0 migration guide](guides/migration-0.8-to-0.9.md).
- Rule inventory, first batch: registered Tool schema validity and legacy shape, `structuredContent` for Tools with `outputSchema`, Tool example schema conformance and error results, the completed-result form of examples, content-block, Resource Contents `_meta`, and Annotations `lastModified` revision availability. Added fixtures `expected-invalid/unsupported-tool-schema-dialect.json` and `expected-invalid/annotations-last-modified-before-2025-06-18.json`.
- Rule inventory completed: 58 rules declare all 88 diagnostic codes of the candidate validator, and every diagnostic identifies its rule. The registry test now fails on an undeclared code or an unattributed fixture diagnostic. Added fixtures `expected-invalid/duplicate-root-tag.json`, `meta-key-invalid.json`, `tasks-capability-2026.json`, `invalid-client-requirement-value.json`, `elicitation-form-schema-2025-06-18.json`, and `elicitation-form-invalid-range.json` for codes no fixture exercised.
- Inventory findings recorded in the registry: the pre-standard server `extensions` map for revisions before MCP 2026-07-28 is an explicit exception to closed server capabilities (arbitration on `mcp.capabilities.extensions.revision-availability`, Proposal 0021); no document currently produces `experimental-reserved-extension-identifier`, because the pinned extension catalogue lists no experimental identifiers.

### Open MCP results in examples (draft Proposal 0026; subject to review and possible incompatible change or removal)

- Added [Section 3.6](sections/03-document-structure.md), Carried MCP Values. Example results and Tool Interaction step responses are validated for each applicable MCP revision against the type that revision's TypeScript schema defines. Former Sections 3.6 to 3.9 are renumbered 3.7 to 3.10.
- A field that an open MCP type allows but the revision does not define is now accepted, preserved without meaning, and reported with the warning `result-field-not-defined-by-version`. This replaces errors for `resultType` before MCP 2026-07-28 (Tool, Resource, Prompt, and completion examples), `ttlMs` and `cacheScope` before MCP 2026-07-28 (Resource examples), and `structuredContent` before MCP 2025-06-18 (Tool examples). Unknown field names that previously passed silently now produce the same warning.
- Declarations whose examples span MCP 2026-07-28 and an earlier revision no longer have to be split; splitting remains available to avoid the warnings (Sections 9.3, 10.4.4, 10.4.6, 11.3, and 11.4).
- Tool Interaction step responses for sampling, elicitation, and roots accept `_meta` and, with warnings, unknown fields through MCP 2025-11-25, where they extend MCP `Result`. For MCP 2026-07-28, where they are closed input responses, unknown fields are rejected with `interaction-example-version-mismatch`; `_meta` is accepted only on sampling responses. The schema now accepts additional properties on these responses and the validator enforces each revision's type.
- **Breaking:** the `completion` object of a completion example result is closed, as `CompleteResult.completion` is in every MCP revision; extra fields are rejected.
- Value constraints are unchanged and apply in every revision: when present, `resultType` is `"complete"`, `ttlMs` is non-negative, and `cacheScope` is `"public"` or `"private"`.
- Fixtures: added `expected-warning/open-results-shared-across-revisions.json`, `expected-warning/open-step-responses-before-2026.json`, `expected-invalid/closed-step-responses-2026.json`, and `expected-invalid/completion-result-extra-field.json`; moved `open-result-unknown-properties.json` and `component-protocol-scope.json` to `expected-warning`.
- Migration: no change is required for documents that remain valid. Variants split only because of `resultType`, `ttlMs`, or `cacheScope` MAY be merged. Extra fields inside `completion` objects must be removed or moved, for example to result `_meta`.

### Closed MCP types (draft Proposal 0027; subject to review and possible incompatible change or removal)

- **Breaking:** Tool Annotations (Section 9.6) and Resource Annotations (Section 10.3), including annotations on content blocks, accept only the properties MCP defines. MCP's `ToolAnnotations` and `Annotations` types are closed in every revision; MCP Description 0.8.0 allowed additional properties, so projected values could fail MCP's schema. Unknown properties, including `x-*` keys, are now rejected with `schema-validation`.
- **Breaking:** client capability requirements (Section 8.5) accept only the client capabilities the applicable MCP revisions define, `experimental`, and from MCP 2026-07-28 `extensions`, plus `x-*` specification extensions. Unknown top-level members are rejected with `schema-validation`. MCP's `ClientCapabilities` and `ServerCapabilities` types are closed, while their doc comments say the set is "not a closed set"; the arbitration follows the types for both, with [MCP issue 1898](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1898) as the upstream reference. Server capabilities were already closed (Section 8.4). Rule records gain the arbitration status `proposed` for arbitrations awaiting a decision.
- Fixtures: added `expected-invalid/tool-annotations-unknown-property.json`, `expected-invalid/resource-annotations-unknown-property.json`, `expected-invalid/content-annotations-unknown-property.json`, `expected-invalid/unknown-server-capability.json`, and `expected-invalid/unknown-client-capability-requirement.json`; removed unknown properties from `expected-valid/distinct-tool-and-resource-annotations.json` and `expected-valid/client-capability-requirements.json`.
- Migration: remove unknown annotation properties. Server-defined metadata belongs in the declaration's `_meta` where the revision defines it, and MCP Description metadata in `x-*` properties on the declaration. Move unknown client capability requirements into `experimental` or, for MCP 2026-07-28, into `extensions`.

### Validator corrections

- Every Resource Template `uriTemplate` is checked against RFC 6570, as Section 10.2.1 now states explicitly. Previously a malformed template was reported only when the template had examples or completion examples, once per example kind. The new error code `invalid-resource-template-uri-template` replaces `resource-template-example-invalid-template` and `resource-template-completion-example-invalid-template` and is reported once per template. Added fixture `expected-invalid/malformed-uri-template-without-examples.json`.
- Roots in Tool Interaction roots responses accept `_meta` from MCP 2025-06-18, where MCP `Root` defines it; earlier revisions reject it with `interaction-example-version-mismatch`. Previously `_meta` was rejected on roots in every revision. Added fixture `expected-invalid/root-meta-before-2025-06-18.json`.
- Reserved `_meta` key checks (Section 3.5) now also apply to Prompt example results and their message content, completion example results, Tool Interaction step responses, and roots. In MCP 2026-07-28, step responses are checked as client responses rather than results, so result-only keys such as `io.modelcontextprotocol/serverInfo` are rejected there. Added fixture `expected-invalid/meta-reserved-keys-in-carried-values.json`.
- Result `_meta` in Resource, Prompt, and completion examples is accepted for MCP 2024-11-05 and 2025-03-26, as it already was in Tool examples. MCP's `Result` defines `_meta` in every supported revision, and Section 3.5 already permitted it; Section 10.4.4 and the validator wrongly limited it to MCP 2025-06-18 and later. Resource Contents `_meta` remains limited to MCP 2025-06-18 and later. Added fixture `expected-warning/legacy-result-meta.json`.
- Sections 10.4.6 and 11.4 now state that MCP Description does not support completion examples for MCP 2024-11-05, matching existing validator behavior. MCP 2024-11-05 defines `completion/complete`, so the `completion-example-version-mismatch` message now says "not supported by MCP Description" instead of "not defined for MCP". The limitation is recorded as a known defect in [`validation/mcp-revisions.md`](validation/mcp-revisions.md).
- Structural (`schema-validation`) diagnostic paths report array indices as numbers, consistent with semantic diagnostic paths. Previously, indices below the document root were reported as strings, for example `["tools", "0", "inputSchema"]`.

## [0.8.0+editorial.1] — 2026-10-19

### Documentation

- Addressed feedback about why MCP Description does not directly inherit the MCP `Tool`, `Resource`, and `Prompt` schemas with a concise [FAQ answer](guides/faq.md#why-not-inherit-and-extend-tool-resource-and-prompt-definitions-from-the-mcp-schema).
- Added a detailed [comparison with the MCP primitive schemas](guides/relationship-to-mcp-schemas.md), including shared fields, intentional differences, tradeoffs, and potential improvements for stronger machine-verifiable alignment.

### Security

- Updated the transitive development dependency `fast-uri` from 3.1.6 to 3.1.8, resolving the authority-bracket host-confusion vulnerability and all other advisories reported by `npm audit` for the dependency tree.

## [0.8.0] — 2026-09-09

Version 0.8 adds protocol-version-scoped declarations and deterministic views for each supported MCP protocol version.

It also introduces reusable components, richer examples and interaction scenarios, client capability requirements, elicitation declarations, extension support, and stronger validation across JSON and YAML documents.

The accepted proposals represented by this release are listed in the [0.8.0 proposal revision manifest](PROPOSALS.md).

### Breaking

- Removed `info.protocolVersion` and added required root `protocolVersions` using the closed set of MCP revisions whose semantics 0.8.0 validates (Proposal 0001).
- Changed root `capabilities` from one object to an array of protocol-scoped Capabilities Objects (Proposal 0001).
- Replaced inline security definitions with named root `securitySchemes` and Security Requirement Arrays (Proposal 0003).
- Required every Tool to contain an object-rooted `inputSchema` (Proposal 0001).

### Added

- MCP `2026-07-28` support and protocol applicability across transports, capabilities, and primitive declarations (Proposal 0001).
- Deterministic Effective Protocol Views with projection and conflict-detecting merge behavior (Proposal 0001).
- Root `instructions`, formal MCP extension declarations, and primitive `clientRequirements` (Proposals 0001, 0012).
- Named Tool, Resource, Resource Template, and Prompt examples, plus Tool interaction and completion examples (Proposals 0004, 0005, 0015, 0016, 0017).
- Reusable typed `components` referenced through local `$componentRef` objects (Proposal 0009).
- Operation-level elicitation declarations and object-level `x-*` specification extensions (Proposals 0007, 0011).
- JSON and restricted YAML serializations, canonical versioned schema URIs, and expanded semantic validation (Proposals 0010, 0019).

### Changed

- Defined the root Info Object as document-wide metadata independent of MCP protocol revisions, preserving all Info properties during migration and projection and removing runtime `Implementation` availability gates (Proposal 0022).
- Made `transports` optional and defined omission of an optional section as no declaration rather than evidence of runtime non-support (Proposal 0013).
- Required ordinary declaration collections to be non-empty when present and projection or merge to omit collections that become empty (Proposal 0013).
- Defined MCP 2025-06-18 as the floor for complete revision-specific semantic validation; older recognized revisions produce incomplete-validation diagnostics (Proposals 0001, 0002).
- Aligned Tool, Resource, Resource Template, Prompt, annotation, `_meta`, and extension validation with their applicable MCP revisions (Proposals 0001, 0002).
- Treated pre-standard or unrecognized MCP extension declarations and unresolved external Tool schema references as warning-and-preserve conditions (Proposals 0001, 0021).
- Distinguished MCP 2025-11-25 core Tasks from MCP 2026-07-28 Tasks extensions (Proposal 0001).
- Made active specification examples vendor-neutral and removed bundled vendor-specific extension metadata (editorial).

## [0.7.0] — 2026-03-23

### Changed
- **Simplified tags to flat structure** — removed hierarchical nesting. The Tag Object no longer includes a recursive `tags` property. All tags are now declared in a flat array at the root level.
- **Tag uniqueness requirement simplified** — tag names MUST be unique across all tags (previously "across the entire tag tree").
- **Tag reference validation simplified** — per-entity tags must reference tag names declared in the root `tags` array (no nesting levels to traverse).
- **Added `uniqueItems: true` constraint** to per-entity `tags` arrays on tools, resources, resource templates, and prompts to prevent duplicate tag references.

### Removed
- **Removed hierarchical tag support** — Tag Objects no longer support nested `tags` arrays. The tag taxonomy is now a simple flat list.

### Updated
- **Section 12 (Tags)** — completely rewritten to reflect flat tag structure. Removed hierarchical examples and references to "tag tree" and "nesting levels".
- **All examples** — converted from hierarchical tags to flat tag lists (stdio-server, http-server, full-featured examples in both JSON and YAML formats).

## [0.6.0] — 2026-03-20

### Removed
- **Removed the `metadata` object** from the root document structure. The `authors`, `documentation`, and `repository` fields are redundant with `info.contact` and `info.websiteUrl`, or belong in vendor extensions.
- **Removed the `lifecycle` object** from the root document structure. Server lifecycle management belongs in a server manifest or registry, not in a static capability description.

### Added
- **Root-level `tags` array** with structured Tag Objects (`name`, `description`, `tags`) replacing `metadata.tags`. Tags support hierarchical nesting via nested `tags` arrays (Option C). Tag names MUST be globally unique across the entire tree.
- **Tag reference validation requirement** — per-entity `tags` on tools, resources, resource templates, and prompts MUST reference tag names declared in the root `tags` array when present. Undeclared tag references are a validation error.

### Changed
- **Section 12** rewritten from "Metadata" to "Tags" — defines the Tag Object, uniqueness constraints, and tag reference semantics.
- **Sections 9, 10, 11** — per-entity `tags` description updated with normative cross-reference to Section 12.3 tag declaration requirement.
- **Section 3** root object table — `metadata` and `lifecycle` rows removed; `tags` row added.
- **Sections renumbered** — removal of lifecycle (formerly Section 12) shifts Tags to 12, Specification Extensions to 13, Serialization to 14, Conformance to 15.

## [0.5.2] — 2026-03-18

### Changed
- **Documented MCP `Implementation` type provenance in the Info Object** — `name`, `title`, `description`, `version`, `icons`, and `websiteUrl` are now explicitly traced to the MCP `Implementation` type returned in the `initialize` response (`serverInfo`), with protocol version annotations:
  - `title` — MCP `BaseMetadata`, since 2025-06-18
  - `description` — MCP `Implementation`, since 2025-11-25
  - `websiteUrl` — MCP `Implementation`, since 2025-11-25
  - `icons` — MCP `Implementation` (via `Icons` mixin), since 2025-11-25
- **Updated Info Object example** to include `icons` and `websiteUrl` fields
- **Clarified `contact` and `license`** as OpenAPI-style additions not present in the MCP `Implementation` type

## [0.5.1] — 2026-03-17

### Changed
- **Removed `_generated` from the core MCP Description specification** (`mcpdesc: "0.5.1"`), including the root object definition and current schema.
- **Updated Cisco extension to `x-cisco-metadata` v0.2.0 shape** with extension-level `version` and nested `dump` payload
- **Removed `_generated` from Cisco extension examples**, with provenance retained in `x-cisco-metadata.dump` (`toolName`, `toolVersion`, `createdAt`)

## [0.5.0] — 2026-03-17

### Changed
- **Renamed `transport` field to `transports`** (plural) for consistency with `tools`, `resources`, `prompts` and OpenAPI's `servers` — see [DECISION-001](../../docs/maintainers/design/mcp-description/DECISION-001-transports-array.md)
- **Added transport-scoped `security`** — each transport MAY include its own `security` array that overrides the root-level default (see Section 6.4)
- Root-level `security` is now the default; transport-level `security` overrides it (OpenAPI-style inheritance)

## [0.4.0] — 2026-03-16

### Added
- MCP 2025-11-25 support: icons, websiteUrl, task capabilities, tool execution properties
- Tool `outputSchema` with explicit `$schema` dialect support (MCP 2025-06-18+)
- Tool `execution.taskSupport` property for task-augmented execution (MCP 2025-11-25 only)
- `icons` definition for server, tools, resources, resource templates, and prompts
- `capabilities.tasks` for task-augmented request support
- `capabilities.completions` and `capabilities.logging` declarations

### Changed
- **Renamed `mcpspec` field to `mcpdesc`** to clearly distinguish the description format version from the MCP protocol specification version
- `protocolVersion` enum now includes `2025-11-25`
- Tool `annotations` now supports `additionalProperties` for forward compatibility

## [0.3.0] — 2026-01-15

### Added
- `title` field on all MCP entities (BaseMetadata, since MCP 2025-06-18)
- Tool `outputSchema` for structured tool output
- `_meta` protocol-reserved metadata on tools, resources, resource templates, and prompts
- `tags` for categorization on tools, resources, resource templates, and prompts
- `deprecated` flag on tools, resources, resource templates, and prompts

### Changed
- Aligned more closely with MCP 2025-06-18 protocol structures

## [0.1.0] — 2025-11-01

### Added
- Initial specification draft
- Core document structure: `mcpspec`, `info`, `transport`, `tools`, `resources`, `resourceTemplates`, `prompts`
- Transport definitions: `streamable-http`, `stdio`, `sse`
- Security schemes aligned with OpenAPI 3.1
- `capabilities` object from MCP InitializeResult
- `metadata` for authors, documentation, repository, tags
- `_generated` provenance tracking
- Specification extension mechanism (`x-` prefix)
- `anyOf` constraint requiring at least one of tools, resources, resourceTemplates, or prompts
