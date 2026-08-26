# Frequently Asked Questions

This FAQ explains MCP Description. It does not restate or modify MCP runtime requirements. For runtime behavior, use the normative MCP specification for the applicable protocol revision. MCP Description complements those specifications with a static, portable description format.

## Purpose and Authority

### What is an MCP Description?

An MCP Description is a JSON or YAML document that statically describes an MCP server surface: identity, protocol coverage, transports, capabilities, Tools, Resources, Resource Templates, Prompts, security requirements, and related documentation metadata.

It supports offline discovery, documentation, design review, governance, testing, and description-driven development without requiring a live server connection.

### Does MCP Description override the MCP specification?

No. The normative MCP specification for each declared protocol revision defines MCP types, runtime behavior, negotiation, requests, responses, and security requirements. MCP Description governs only the description document and its projection, merge, validation, and supplemental static metadata.

When MCP Description reuses an MCP field or type, that field retains the semantics and revision applicability defined by MCP. If a description conflicts with the applicable MCP specification or with observed runtime behavior, the description does not change the protocol or the server; it is inaccurate and should be corrected.

See [Relationship to MCP](relationship-to-mcp.md).

### Why not just use OpenAPI?

OpenAPI describes HTTP APIs. MCP Description describes MCP servers using MCP-native concepts such as Tools, Resources, Resource Templates, Prompts, capabilities, and protocol-revision scopes. It also supports MCP transports that are not HTTP APIs.

MCP Description adopts familiar description patterns where they fit, including server identity, reusable security schemes, and extensions, but it is not an OpenAPI replacement or profile. Use the format that describes the interface being documented; a service exposing both HTTP APIs and MCP may publish both. See [Comparison with OpenAPI](comparison-with-openapi.md).

### Is an MCP Description guaranteed to be complete or current?

No. A description represents its declared server surface and may be authored from design metadata, generated from a runtime observation, or assembled from both. An observation can cover only the protocol revision, authorization context, and server state that were actually observed.

Omitted primitives do not prove that no other revision or runtime context exposes them. Producers should record provenance in surrounding tooling or a documented extension when consumers need to assess freshness or authority.

## Versions and Views

### What is the difference between `mcpdesc` and `protocolVersions`?

`mcpdesc` selects the MCP Description specification used to validate the document. `protocolVersions` lists the MCP protocol revisions described by the document. These are independent version dimensions.

For example, one document conforming to MCP Description 0.8.0 can describe both MCP 2025-11-25 and MCP 2026-07-28.

### How can one document describe multiple MCP revisions?

The root `protocolVersions` declares total coverage. Transports, Capabilities Objects, Tools, Resources, Resource Templates, and Prompts can narrow their applicability with their own `protocolVersions`.

Omitting a declaration-level scope means that the declaration applies to its complete parent scope; it does not mean that applicability is unknown. When a field or primitive differs between MCP revisions, use separate declarations with disjoint scopes rather than combining incompatible shapes.

### How should a consumer use a multi-version description?

Select one declared MCP revision and produce its Effective Protocol View. The view retains only declarations applicable to that revision, removes redundant declaration scopes, and is validated as an ordinary single-version MCP Description.

An Effective Protocol View is still a static description. It does not perform MCP runtime version negotiation and does not replace the selected revision's MCP rules.

### Can descriptions from different revisions be merged?

Yes, when they describe compatible views of the same logical server. Merge tooling should compare per-revision Effective Protocol Views, preserve differing declarations as disjoint variants, and report conflicts rather than guess. Inputs covering the same revision must be semantically equivalent for that revision.

## Creating Documents

### What is the minimum valid document?

A document needs `mcpdesc`, `info` with `name` and `version`, a non-empty `protocolVersions` array, and one or more transports that collectively cover every declared revision. Tool, Resource, Resource Template, and Prompt collections are optional. See [the minimal example](../examples/minimal.yaml).

### Do I have to write it by hand?

No. An MCP Description may be:

- hand-authored in a JSON or YAML editor;
- generated from implementation metadata, code annotations, or configuration;
- captured from a running server; or
- assembled from multiple authoritative sources.

Generation does not make a description complete or authoritative. Generators must not infer unobserved protocol revisions, primitives, authorization policy, or behavior.

### How is an MCP Description validated?

Use the schema for the declared `mcpdesc` version and apply that version's semantic validation rules. Schema validation alone cannot enforce cross-object rules such as protocol coverage, scoped uniqueness, revision-specific fields, security references, or example consistency.

For MCP Description 0.8.0, add `"$schema": "https://mcpdesc.org/schema/0.8.0.json"` for editor support and use the repository validation workflow for complete validation.

### What file extension should be used?

The recommended JSON extension is `.mcpdesc.json`; `.mcp-description.json` is also recognized by existing tooling. YAML may be used where tooling supports it.

## Supplemental MCP Description Metadata

### What do static security requirements mean?

They describe authorization requirements known to the document author. They do not acquire tokens, enforce access, predict authorization-filtered discovery, or override the applicable MCP authorization specification.

Within MCP Description, a primitive `security` value replaces a selected transport's value, which replaces root `security`. Omission inherits, `security: []` clears inherited requirements, and `security: [{}]` includes an explicit anonymous alternative.

### Do Tool or Resource examples define runtime behavior?

No. Named examples are MCP Description metadata for documentation, contract tests, and deterministic mocks. They do not alter MCP schemas, guarantee live results, establish freshness, or define a default runtime response.

Tool examples pair one complete input with a completed Tool Result. Static Resource examples use the Resource URI as the implicit read input; Resource Template examples record the exact concrete RFC 6570 expansion. Consumers must not execute Tools or dereference Resource URIs merely because an example exists.

### Can custom metadata be added?

Yes. Properties beginning with `x-` on the root or another explicitly eligible MCP Description semantic object are specification extensions. Unrecognized extensions are ignored for core interpretation and should be preserved when round-tripping. Extensions cannot override MCP or MCP Description requirements, and their authors should publish their schema, semantics, versioning policy, and eligible object locations. See the [Vendor Extensions Guide](vendor-extensions-guide.md).
