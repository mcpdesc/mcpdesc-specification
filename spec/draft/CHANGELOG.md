# Changelog

All notable changes to the MCP Description Specification will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses specification versioning aligned with its `mcpdesc` field.

<!-- update with `markdown-toc -i CHANGELOG.md --maxdepth 2 -->
<!-- toc -->

- [[0.8.0] — Unreleased (community working draft)](#080--unreleased-community-working-draft)
- [[0.7.0] — 2026-03-23](#070--2026-03-23)
- [[0.6.0] — 2026-03-20](#060--2026-03-20)
- [[0.5.2] — 2026-03-18](#052--2026-03-18)
- [[0.5.1] — 2026-03-17](#051--2026-03-17)
- [[0.5.0] — 2026-03-17](#050--2026-03-17)
- [[0.4.0] — 2026-03-16](#040--2026-03-16)
- [[0.3.0] — 2026-01-15](#030--2026-01-15)
- [[0.1.0] — 2025-11-01](#010--2025-11-01)

<!-- tocstop -->

## [0.8.0] — Unreleased (community working draft)

This section tracks changes for the MCP Description v0.8.0 Community Working Draft. It is under active implementation and interoperability testing on the experimental draft branch and is **not** a released specification. The current stable release remains v0.7.0, whose canonical source is `cisco-open/mcptoolkit-contract`. `schemas/latest.json` remains pinned to 0.7.0.

### Breaking

- Removed `info.protocolVersion` and added required root `protocolVersions` using the closed set of MCP revisions whose semantics 0.8.0 validates.
- Changed root `capabilities` from one object to an array of protocol-scoped Capabilities Objects.
- Replaced inline security definitions with named root `securitySchemes` and Security Requirement Arrays.
- Required every Tool to contain an object-rooted `inputSchema`.
- Updated pre-1.0 versioning policy to permit breaking changes in `0.x` minor releases.

### Added

- MCP `2026-07-28` protocol support.
- Protocol applicability on transports, capabilities, tools, resources, resource templates, and prompts.
- Deterministic Effective Protocol Views, projection rules, and conflict-detecting merge requirements.
- Root `instructions` for durable model-facing server guidance.
- Formal MCP `capabilities.extensions` declarations.
- Primitive-level security overrides, OAuth/OpenID Connect scopes, anonymous alternatives, and explicit clearing.
- Structural 0.8.0 JSON Schema at `schemas/mcp-description/0.8.0.json` using the canonical `$id` `https://mcpdesc.org/schema/0.8.0.json`.
- Semantic validation for protocol coverage, scope containment and overlap, security references, tags, and revision-specific fields.
- Shared structural and semantic validation used by repository checks, projection, and merge tooling, including validation of every view input and output.
- Explicit support for zero-primitive descriptions.
- Runtime-observation versus curated-aggregate guidance.
- A concise multi-version example showing common declarations and protocol-scoped capability variants across MCP 2025-11-25 and MCP 2026-07-28.
- Optional named Tool `examples` that pair complete invocation arguments with completed MCP Tool Results for documentation, contract tests, and deterministic mocks.
- Structural and semantic validation for Tool-example names, revision-specific result/content shapes, execution-error constraints, and input/output schema compatibility.
- Optional named Resource and Resource Template `examples` containing completed MCP Resource read results for documentation, contract tests, and deterministic mocks.
- Structural and semantic validation for Resource-example names, RFC 6570 expansions, completed result revisions, content URIs, base64 data, MIME-type consistency, and raw-size diagnostics.
- Revision-aware MCP `CacheableResult` fidelity for Resource examples: MCP 2026-07-28 completed read results require non-negative `ttlMs` and `public` or `private` `cacheScope`, while earlier revision examples reject those fields.
- Literal MCP `_meta` semantics for supported declarations and named Tool and Resource result/content examples, including structural key grammar, revision-aware reserved-key context and value checks, warning-and-preserve handling for unknown reserved keys, and security guidance.
- Experimental operation-level Elicitation Declarations for Tools, Resources, Resource Templates, and Prompts, with form and URL modes, nested protocol scopes, revision-aware restricted form schemas, and Effective Protocol View support, implementing Proposal 0007 while it remains under review.

### Changed

- Capability wording is no longer tied to MCP initialization or notification wire mechanisms.
- `resources.subscribe` and `listChanged` fields retain their durable semantic meaning across protocol revisions.
- Core Tasks in MCP 2025-11-25 and Tasks extensions in MCP 2026-07-28 are treated as distinct declarations.
- Material `instructions` changes are semantically significant.
- Uncatalogued OAuth/OpenID Connect scopes are warning conditions rather than validation failures.
- Corrected `info.description` protocol applicability to MCP 2025-11-25 and later.
- Corrected Tool `execution` applicability to MCP 2025-11-25 only and added embedded Tool schema and MCP 2026 `x-mcp-header` semantic validation.
- Added Tool schema dialect, unresolved external-reference warning-and-preserve, output-root, transport-revision, legacy SSE warning, and OAuth flow endpoint checks.
- Defined shape-only Tool schema validation before MCP 2025-11-25 rather than inferring a dialect from the enclosing generated MCP schema.
- Defined warning-and-preserve handling for unrecognized extension identifiers under MCP-reserved prefixes.
- Distinguished MCP Tool Annotations from Resource Annotations, defined Resource Annotation fields and revision applicability, and aligned Resource, Resource Template, and embedded content schemas with the applicable MCP types.
- Clarified that Resource and Resource Template annotations describe discovery declarations, while named Resource examples contain native completed read results and do not define per-example Resource Annotations.
- Refocused the FAQ on MCP Description authority, multi-revision coverage, Effective Protocol Views, merge behavior, validation, and supplemental metadata; clarified that normative MCP specifications remain authoritative for runtime behavior.
- Defined MCP 2025-06-18 as the floor for complete revision-specific semantic conformance; MCP 2024-11-05 and MCP 2025-03-26 remain recognized legacy compatibility revisions with incomplete-validation diagnostics.
- Distinguished literal MCP `_meta` from root `x-*` specification extensions and MCP `capabilities.extensions`; reusable metadata schemas remain outside Proposal 0002.
- Clarified that tags are document-wide supplemental metadata, remain unscoped across Effective Protocol Views, and do not extend to nested Elicitation Declarations; corrected explicit empty tag catalogues to reject all tag references.

### Deferred

- Discovery-specific and subscription-specific security metadata.
- mcpdesc-specific Tool error catalogues.
- Generic variants/profiles and transport-specific primitive inventories.

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
