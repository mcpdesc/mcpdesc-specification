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

This section tracks changes for the MCP Description v0.8.0 Community Working Draft. It is under active proposal review, implementation, and interoperability testing and is **not** a released specification. The current stable release remains v0.7.0, whose canonical source is `cisco-open/mcptoolkit-contract`. `schemas/latest.json` remains pinned to 0.7.0.

### Release candidates

#### Release Candidate 1 — 2026-08-31 (`v0.8.0-rc.1`)

Release Candidate 1 selects Community Working Draft 4 as its baseline for final interoperability and release review. It adds no normative features.

- Documented how MCP's JSON Schema references, runtime URI identifiers, Completion references, and URL-valued metadata map to MCP Description, and clarified that MCP has no general arbitrary-object reference mechanism.
- Clarified that `$componentRef` syntax and local-only resolution are independent design choices, and compared both with JSON Schema and OpenAPI `$ref` semantics.
- Removed the bundled Cisco-specific extension documentation and CLI dump metadata from active draft examples; current specification examples use vendor-neutral extension identifiers.
- Assigned the immutable release-candidate schema identity `https://mcpdesc.org/schema/mcp-description/0.8.0-rc.1.json` while keeping `mcpdesc: 0.8.0` and `schemas/latest.json` on stable 0.7.0.
- Added release-candidate preparation, metadata validation, and canonical schema publication checks. Exact schema bytes must be published and verified before the candidate is tagged.
- Added an `@mcpdesc/validator/standalone` browser entry for strict Content Security Policies, without runtime code generation or network schema retrieval.
- Added the immutable `0.8.0-rc.1` validator selector and selected cumulative validator version `0.5.0` for npm `latest`, subject to RC.1 tagging and package tarball review before publication.

### Draft snapshots

#### Community Working Draft 4 — 2026-08-28 (`v0.8.0-draft.4`)

Draft 4 adds the reviewed revisions of Proposals 0015, 0016, 0017, and 0019 as experimental design inputs. It remains unreleased and under active review.

- Added named Prompt invocation and completed-result examples, including reusable `components.promptExamples` entries.
- Added declaration-local completion examples for Prompt arguments and Resource Template variables.
- Added declaration-local Tool interaction examples with ordered elicitation, sampling, and roots steps.
- Assigned Draft 4 an immutable format-qualified schema identity and added an opt-in live-publication release check.
- Preserved Draft 3 behavior and proposal inputs; Proposals 0006, 0014, and 0018 remain explicitly excluded.
- Added an immutable `0.8.0-draft.4` validator selector and selected cumulative validator version `0.4.0` for npm `latest`, subject to review of the Draft 4 specification tag and package tarball before publication.
- Require the exact Draft 4 schema bytes to be served directly from the canonical URI and pass publication checks before the snapshot is tagged or announced.

#### Community Working Draft 3 — 2026-08-27 (`v0.8.0-draft.3`)

Draft 3 incorporates editorial and presentation feedback from review of Draft 2. It remains unreleased and under active review.

- Simplified the normative `_meta` section by delegating key grammar, reserved namespaces, contexts, and value shapes to each applicable MCP protocol revision while preserving existing conformance behavior.
- Removed the experimental native provenance registry and primitive attribution model from Draft 3 after review of Proposal 0008. A competing project-defined extension design is being evaluated separately.
- Moved reusable components before the appendices in the assembled specification and corrected companion-document links.
- Added a concise inline Reference Object example with a link to the complete validated example.
- Clarified that normative text and the versioned JSON Schema define conformance, examples are informative but expected to validate when presented as valid, and fixtures are test artifacts rather than independent requirements.
- Removed the obsolete local `spec/draft/materials` ignore rule.
- Preserved the immutable Draft 1 and Draft 2 validator snapshots and added the sibling `0.8.0-draft.3` runtime and frozen test snapshot.
- Selected cumulative validator version `0.3.0` for npm `latest`, subject to review of the Draft 3 tag and package tarball before publication.

#### Community Working Draft 2 — 2026-08-26 (`v0.8.0-draft.2`)

Draft 2 is the second public interoperability snapshot of v0.8.0. It remains unreleased: the snapshot identifier does not change the `mcpdesc` value from `0.8.0`, update `schemas/latest.json`, accept any proposal, or publish the validator package.

The [proposal revision manifest](PROPOSALS.md) records exact source commits and SHA-256 digests for the six Draft 1 inputs and six additional review-stage proposals: 0008, 0009, 0010, 0011, 0012, and 0013. All 12 are implemented experimentally. Proposal 0006 (Issue #13, PR #15) is explicitly excluded.

Issue [#18](https://github.com/mcpdesc/mcpdesc-specification/issues/18) established the validator snapshot lifecycle used by this assembly:

- [x] preserve immutable Draft 1 runtime and test snapshots;
- [x] add sibling Draft 2 runtime and frozen test snapshots with exact selector and schema provenance;
- [x] select cumulative validator version `0.2.0` and record npm `latest` as the intended dist-tag;
- [x] require package, declaration, browser, fixture, and tarball validation before release review;
- [ ] create or push `v0.8.0-draft.2` only after explicit maintainer approval;
- [ ] publish validator `0.2.0` only after reviewing the tarball from the approved tag.

#### Community Working Draft 1 — 2026-08-24 (`v0.8.0-draft.1`)

Draft 1 is the first public interoperability snapshot of v0.8.0. The tag identifies an immutable snapshot, not a distinct `mcpdesc` conformance version, stable release, feature freeze, or claim of community consensus. Review-stage features may change incompatibly or be removed before a later draft or stable release.

The [proposal revision manifest](PROPOSALS.md) records the exact proposal contents represented in this snapshot, including immutable source commit IDs and SHA-256 digests. Proposals 0001, 0002, 0003, 0004, 0005, and 0007 remain in **Review**; Draft 1 implements their captured revisions experimentally. Proposal 0006 is not represented.

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
- Structural 0.8.0 JSON Schema at `schemas/mcp-description/0.8.0.json`; each public prerelease assigns its own immutable canonical `$id`.
- Canonical MCP Description schema URI families under `https://mcpdesc.org/schema/<format-family>/<version-or-snapshot>.json`, with distinct roles for instance `$schema`, schema `$id`, and schema-dialect `$schema`.
- Semantic validation for protocol coverage, scope containment and overlap, security references, tags, and revision-specific fields.
- Shared structural and semantic validation used by repository checks, projection, and merge tooling, including validation of every view input and output.
- Explicit support for zero-primitive descriptions.
- Runtime-observation versus curated-aggregate guidance.
- A concise multi-version example showing common declarations and protocol-scoped capability variants across MCP 2025-11-25 and MCP 2026-07-28.
- Optional named Tool `examples` that pair complete invocation arguments with completed MCP Tool Results for documentation, contract tests, and deterministic mocks.
- Structural and semantic validation for Tool-example names, revision-specific result/content shapes, execution-error constraints, and input/output schema compatibility.
- Optional declaration-local Tool `interactionExamples` for ordered semantic elicitation, sampling, and roots scenarios attached to one Tool invocation, with terminal completed Tool Results and no new component namespace.
- Optional named Resource and Resource Template `examples` containing completed MCP Resource read results for documentation, contract tests, and deterministic mocks.
- Structural and semantic validation for Resource-example names, RFC 6570 expansions, completed result revisions, content URIs, base64 data, MIME-type consistency, and raw-size diagnostics.
- Revision-aware MCP `CacheableResult` fidelity for Resource examples: MCP 2026-07-28 completed read results require non-negative `ttlMs` and `public` or `private` `cacheScope`, while earlier revision examples reject those fields.
- Optional named Prompt `examples` containing complete `prompts/get` argument maps and completed Prompt results, with local `components.promptExamples` reuse and no-argument support via omitted or empty `arguments`.
- Literal MCP `_meta` semantics for supported declarations and named Tool and Resource result/content examples, including structural key grammar, revision-aware reserved-key context and value checks, warning-and-preserve handling for unknown reserved keys, and security guidance.
- Experimental operation-level Elicitation Declarations for Tools, Resources, Resource Templates, and Prompts, with form and URL modes, nested protocol scopes, revision-aware restricted form schemas, and Effective Protocol View support, implementing Proposal 0007 while it remains under review.
- Object-level `x-*` specification extensions on explicitly eligible MCP Description semantic objects, with strict excluded locations and projection, merge, preservation, and core-semantics boundaries, implementing Proposal 0011 while it remains under review.
- JSON and restricted YAML as equally conforming serializations of one JSON-compatible data model, including YAML 1.2.2 JSON-schema scalar resolution, deterministic profile restrictions, serialization-specific capability claims, and file-extension and media-type guidance, implementing Proposal 0010 while it remains under review.
- Repository-only strict raw-source decoding and isolated serialization fixtures for JSON/YAML equivalence, safe YAML parsing, single-document input, string and unique mapping keys, tag and alias rejection, disabled merge semantics, and finite numbers. The public `@mcpdesc/validator` API remains a parsed-value API.
- Optional typed `components` namespaces and local `$componentRef` Reference Objects for reusable Tool schemas, Elicitation schemas, and named Tool, Resource, and Resource Template examples, including contextual resolution, cycle detection, projection pruning, and collision-safe merge rewriting, implementing Proposal 0009 while it remains under review.
- Optional non-empty primitive `clientRequirements` using revision-specific MCP `ClientCapabilities` shapes for unconditional Tool call, Resource read, Resource Template read, and Prompt get preconditions, including semantic validation, deprecation diagnostics, formal extension requirements, compatibility evaluation, and projection and merge behavior, implementing Proposal 0012 while it remains under review.

### Changed

- Made `transports` optional and defined omission of an optional section as no declaration rather than evidence of runtime non-support.
- Required ordinary declaration collections to be non-empty when present, while preserving `security: []`, `security: [{}]`, and empty Security Requirement scope arrays.
- Required projection and merge to omit emptied ordinary collections and made transport coverage conditional on a present `transports` section.
- Capability wording is no longer tied to MCP initialization or notification wire mechanisms.
- `resources.subscribe` and `listChanged` fields retain their durable semantic meaning across protocol revisions.
- Core Tasks in MCP 2025-11-25 and Tasks extensions in MCP 2026-07-28 are treated as distinct declarations.
- Material `instructions` changes are semantically significant.
- Uncatalogued OAuth/OpenID Connect scopes are warning conditions rather than validation failures.
- Corrected `info.description` protocol applicability to MCP 2025-11-25 and later.
- Corrected Tool `execution` applicability to MCP 2025-11-25 only and added embedded Tool schema and MCP 2026 `x-mcp-header` semantic validation.
- Added Tool schema dialect, unresolved external-reference warning-and-preserve, output-root, transport-revision, legacy SSE warning, and OAuth flow endpoint checks.
- Defined immutable canonical schema publication, direct-serving and alias rules, legacy Draft 1-3 and stable 0.7.0 archival treatment, retrieval-security boundaries, and an opt-in draft publication release check that verifies live bytes and headers before tagging.
- Defined shape-only Tool schema validation before MCP 2025-11-25 rather than inferring a dialect from the enclosing generated MCP schema.
- Defined warning-and-preserve handling for unrecognized extension identifiers under MCP-reserved prefixes.
- Distinguished MCP Tool Annotations from Resource Annotations, defined Resource Annotation fields and revision applicability, and aligned Resource, Resource Template, and embedded content schemas with the applicable MCP types.
- Clarified that Resource and Resource Template annotations describe discovery declarations, while named Resource examples contain native completed read results and do not define per-example Resource Annotations.
- Defined Prompt-example argument membership and required-argument semantics, revision-aware completed Prompt result validation, and Effective Protocol View preservation for Prompt example maps.
- Added Prompt and Resource Template `completionExamples` with local target binding, exact MCP completion request-result shapes, RFC 6570 variable membership checks, revision-aware context/result validation, and Effective Protocol View preservation.
- Added Tool `interactionExamples` semantic validation for initial Tool input and terminal Tool result compatibility, elicitation declaration linkage, revision-aware sampling and roots fields, explicit `clientRequirements` contradiction warnings, and Effective Protocol View preservation.
- Refocused the FAQ on MCP Description authority, multi-revision coverage, Effective Protocol Views, merge behavior, validation, and supplemental metadata; clarified that normative MCP specifications remain authoritative for runtime behavior.
- Defined MCP 2025-06-18 as the floor for complete revision-specific semantic conformance; MCP 2024-11-05 and MCP 2025-03-26 remain recognized legacy compatibility revisions with incomplete-validation diagnostics.
- Distinguished literal MCP `_meta` from root `x-*` specification extensions and MCP `capabilities.extensions`; reusable metadata schemas remain outside Proposal 0002.
- Clarified that tags are document-wide supplemental metadata, remain unscoped across Effective Protocol Views, and do not extend to nested Elicitation Declarations; corrected explicit empty tag catalogues to reject all tag references.
- Removed the bundled vendor-specific extension package and CLI dump metadata from active draft examples; the core specification remains vendor-neutral and does not register or endorse particular extensions.

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
