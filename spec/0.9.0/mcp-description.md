---
title: MCP Description Specification
version: 0.9.0
status: Stable release
release-tag: v0.9.0
released: true
baseline: 0.8.0
date: 2026-11-16
---

# MCP Description Specification

**Version**: 0.9.0 (Stable release; `v0.9.0`)

**Status**: Stable release prepared for publication; not yet tagged or published

**Baseline**: v0.8.0

**Date**: 2026-11-16

## Abstract

This specification defines the **MCP Description** format. It is a portable, machine-readable document that describes the durable, externally relevant surface of a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server.

An MCP Description declares the MCP protocol versions it covers, instructions, transports, security requirements, and capabilities. It also describes tools, resources, resource templates, prompts, and metadata.

It enables offline discovery and documentation generation. It also supports description validation, change analysis, testing, governance, and [interoperable tooling](../implementations.md) across the MCP ecosystem.

## Status of This Document

This document defines the stable MCP Description 0.9.0 release and is prepared for tag `v0.9.0`. It has not yet been tagged or published. Until publication, 0.8.0 remains the published stable release.

This release:

- Adds protocol-version-specific views and conversion guidance, and a native MCP projection.
- Expands validation rules, rule-level results, and diagnostics.
- Clarifies MCP-aligned type constraints, integer values, and Tool schema dialects.
- Defines a normalized YAML presentation profile and clarifies YAML scalar resolution.

The proposals implemented in this release are listed in [`PROPOSALS.md`](PROPOSALS.md).

## 1. Introduction

### 1.1 Purpose

The MCP Description Specification defines a standard format for describing an MCP server surface in a static, curated document.

The MCP ecosystem supports runtime discovery and capability inspection. These features are effective for dynamic interactions. However, runtime discovery alone limits offline tooling, cross-platform interoperability, design review, and governance workflows.

This specification addresses these limitations by providing a portable description format for MCP servers, much as OpenAPI provides a description format for HTTP APIs.

### 1.2 Goals

An MCP Description document enables:

- **Standardized server descriptions** — a consistent structure for declaring server metadata, transports, tools, resources, prompts, and capabilities.
- **Offline discoverability** — platforms can index and display server descriptions without establishing a runtime connection.
- **Tooling interoperability** — documentation generators, testing frameworks, agent discovery tools, IDE integrations, and governance platforms can operate on a common format.
- **Description-driven development** — teams can define, review, and validate MCP server surfaces before deployment.

### 1.3 Audience

This specification is intended for:

- MCP server developers who publish server descriptions
- MCP client and agent developers who consume server descriptions
- Platform developers building registries, documentation portals, and governance tools
- Tool authors creating validators, generators, and IDE integrations

### 1.4 Relationship to the MCP Protocol

The MCP Description Specification does **not** replace the MCP protocol. It complements the protocol by providing a static description format for MCP servers.

| MCP Protocol | MCP Description |
|---|---|
| Runtime communication | Static declaration |
| Discovery and runtime metadata | Server metadata and declared protocol coverage |
| Tool invocation | Tool definitions |
| Resource fetching | Resource definitions |

The MCP protocol defines runtime communication and behavior. An MCP Description statically represents durable, externally relevant server semantics. It does not reproduce the protocol's runtime message exchanges.

### 1.5 Scope

This specification defines:

- The structure and semantics of an MCP Description document
- Conforming JSON and YAML serializations
- Validation requirements, including a JSON Schema for structural validation
- Protocol-version views, merge, and native MCP projection
- The specification extension mechanism for vendor-specific metadata

This specification does not define:

- The MCP protocol itself
- Runtime behavior of MCP servers or clients
- The content or structure of vendor extensions (these are defined independently by extension authors)

## 2. Terminology

### 2.1 Key Words

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals, as shown here.

### 2.2 Definitions

**MCP Description Document**
A document conforming to this specification that describes an MCP server surface as the JSON-compatible data model defined in Section 3.1, serialized as conforming JSON or YAML.

**Server Surface**
The durable, externally relevant characteristics and behavior of an MCP server that MCP Description can represent, including transports, instructions, security requirements, capabilities, primitives, schemas, and applicable extensions.

**Described Server Surface**
The server surface represented by an MCP Description Document. It need not include everything the server implements or exposes in every runtime context.

**Effective Protocol View**
The projection of an MCP Description Document containing the declarations applicable to one MCP protocol version.

**Primitive**
A Tool, Resource, Resource Template, or Prompt declaration in an MCP Description. The [MCP specification](https://modelcontextprotocol.io/specification/2025-11-25/server) calls Tools, Resources, and Prompts server primitives.

**Specification Extension**
A property in an MCP Description document whose name begins with `x-` that provides vendor-specific metadata outside the core specification.

**Capability**
A protocol feature or behavior supported by a server or client. MCP Description declares server capabilities in a Capabilities Object, such as resource subscriptions or list-change notifications. A primitive's `clientRequirements` instead records the minimum client capabilities needed to use it.

**Protocol Applicability**
The MCP protocol versions to which a declaration applies, determined from its effective protocol scope.

### 2.3 Normative and Informative Content

The requirements in this document and the versioned JSON Schema are normative. Together, they define conformance. If they conflict, the specification has a defect.

Examples, code excerpts, guides, and other companion documents are informative unless explicitly identified as normative. A complete example presented as valid is expected to conform. It does not create requirements or override normative text or schema constraints.

Repository fixtures are test artifacts, not independent sources of requirements. Their directory indicates whether the repository validator expects them to be valid, invalid, or valid with warnings. If a fixture conflicts with the specification, the fixture or implementation needs correction.

Section sources contain invisible anchors of the form `req-<topic>` before requirement sentences. Validation rules cite these anchors to identify the requirement they check. See [`validation/README.md`](validation/README.md#rule-records) for details.

Anchors are informative markup. They do not create, change, or rank requirements.

## 3. Document Structure

### 3.1 Format

An MCP Description document uses a JSON-compatible data model. The model consists of objects with string property names, arrays, strings, finite numbers, booleans, and null.

The data model defines the document's meaning, whether it is serialized as JSON or YAML.

<a id="req-conforming-serialization"></a>An MCP Description document MUST use one of the conforming serializations defined in Section 15. JSON and restricted YAML conform equally. Neither has greater semantic or conformance status.

Property ordering is not significant unless a field explicitly defines ordering for an array. <a id="req-serialization-order"></a>Mapping serialization order MUST NOT affect conformance.

### 3.2 Root Object

<a id="req-root-fields"></a>The root of an MCP Description document is an object with the following structure:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$schema` | string | No | JSON Schema resource for structural validation and editor tooling |
| `mcpdesc` | string | **Yes** | Specification version (`"0.9.0"`) |
| `info` | [Info Object](#5-info-object) | **Yes** | Server metadata |
| `protocolVersions` | array\<string\> | **Yes** | MCP protocol versions described by the document |
| `instructions` | string | No | Durable natural-language guidance for using the server |
| `transports` | non-empty array\<[Transport Object](#6-transports)\> | No | Declared transports |
| `securitySchemes` | non-empty map\<string, [Security Scheme Object](#72-security-scheme-object)\> | No | Reusable named security schemes |
| `security` | [Security Requirement Array](#73-security-requirement-array) | No | Default security requirements |
| `capabilities` | non-empty array\<[Capabilities Object](#8-capabilities)\> | No | Protocol-scoped server capability declarations |
| `tools` | non-empty array\<[Tool Object](#9-tools)\> | No | Tools declared by the document |
| `resources` | non-empty array\<[Resource Object](#1011-resource-object)\> | No | Resources declared by the document |
| `resourceTemplates` | non-empty array\<[Resource Template Object](#1021-resource-template-object)\> | No | Resource templates declared by the document |
| `prompts` | non-empty array\<[Prompt Object](#11-prompts)\> | No | Prompts declared by the document |
| `components` | [Components Object](#171-components-object) | No | Reusable schemas and named primitive examples |
| `tags` | non-empty array\<[Tag Object](#13-tags)\> | No | Document-wide flat tag catalog for primitive categorization |

The optional `$schema` property selects a JSON Schema resource for structural validation and editor tooling. It does not replace the required `mcpdesc` format discriminator.

The document's `protocolVersions` separately declares its MCP protocol coverage.

### 3.3 Optional Sections and Ordinary Collections

Only `mcpdesc`, `info`, and non-empty `protocolVersions` are required at the document root. If an optional section is omitted, the document makes no declaration for it.

<a id="req-omission-not-absence"></a>Unless a property's definition explicitly states otherwise, omission MUST NOT be interpreted as proof that the server does not support, expose, or use the corresponding runtime behavior.

<a id="req-ordinary-collections-non-empty"></a>An optional ordinary declaration collection MUST contain at least one entry when present.

<a id="req-ordinary-collections-omitted"></a>A producer MUST omit such a property when it has no entries, and a consumer MUST reject a present empty collection.

The non-empty collection requirement applies to:

- Root `transports`, `securitySchemes`, `capabilities`, `tools`, `resources`, `resourceTemplates`, `prompts`, and `tags`.
- The outer `components` object and each present component namespace map.
- Icon, primitive tag-reference, Elicitation Declaration, Prompt Argument, and extension-capability collections.
- Named Tool, Resource, Resource Template, and Prompt example maps.
- Prompt and Resource Template `completionExamples` maps.

This requirement does not constrain embedded JSON Schemas, specification-extension values, arbitrary literal example values, or transport invocation values. Protocol-native content and annotation collections follow their own rules.

An empty collection remains valid when its property definition assigns a distinct meaning to emptiness. <a id="req-security-empties-preserved"></a>Implementations MUST preserve `security: []`, `security: [{}]`, and empty scope arrays in Security Requirement Objects.

### 3.4 Zero-Primitive Descriptions

A document MAY omit all of `tools`, `resources`, `resourceTemplates`, and `prompts`. It can still describe a server under development, a legitimately empty server, or an authorization-scoped observation.

<a id="req-primitive-absence"></a>Absence of a primitive collection MUST NOT be interpreted as proof that no other runtime context exposes primitives of that kind.

### 3.5 MCP `_meta`

The `_meta` property allows additional metadata on Tool, Resource, Resource Template, and Prompt declarations. It can also appear on supported result, content, Tool Interaction step response, and root objects in named examples.

<a id="req-meta-protocol-version-availability"></a>`_meta` MAY appear only when every protocol version in the effective scope of the containing declaration defines it for the corresponding MCP object.

Metadata in a named example describes only that example. It does not define a reusable metadata schema or require a server to send that metadata.

<a id="req-meta-keys"></a>Each key name, its use, and the value of any reserved key MUST follow the rules of every applicable MCP protocol version. A recognized violation is a document-conformance error.

<a id="req-meta-reserved-prefix"></a>A valid but unrecognized key under an MCP-reserved prefix MUST be preserved and SHOULD produce a warning. Other valid keys MUST be accepted and preserved. A single-version projection MUST preserve `_meta`. It MUST NOT combine metadata from variants that cover different protocol versions.

### 3.6 Carried MCP Values

Named examples carry MCP values in these places:

- `result` in Tool Examples and Tool Interaction Examples;
- `response` in Tool Interaction steps for sampling, elicitation, and roots; and
- `result` in Resource, Resource Template, Prompt, and completion examples.

This includes values reached through component references.

A carried value is validated against the type defined by every MCP protocol version in the containing declaration's effective scope. A type accepts fields it does not list only if its protocol version's TypeScript schema declares or inherits an index signature. Such a type is open; every other type is closed.

<a id="req-mcp-integer-numbers"></a>A field declared as `number` by the protocol version's TypeScript schema is an integer unless the schema annotates it `@TJS-type number`. This matches the JSON Schema that MCP generates from its TypeScript schema.

For each applicable protocol version and each field of a carried value:

1. <a id="req-carried-defined-fields"></a>A field defined by the protocol version MUST satisfy its type. A field required by that version MUST be present.
2. <a id="req-carried-open-preserve"></a>A field not defined by the protocol version MUST be accepted and preserved when its type is open in that version. Implementations MUST NOT apply the meaning that another protocol version gives the same field name. Validators MUST report the warning `result-field-not-defined-by-version` and identify the field and protocol version.
3. <a id="req-carried-closed-reject"></a>A field not defined by the protocol version MUST be rejected when its type is closed in that version.

Example rules in Sections 9.3, 9.4, 10.4, and 11 govern JSON-RPC envelope fields and fields of incomplete workflow forms, such as task or input-required results.

Every result type carried by examples extends the open MCP `Result` in every supported protocol version. Sampling, elicitation, and roots responses extend `Result` through MCP 2025-11-25.

In MCP 2026-07-28, sampling, elicitation, and roots responses are closed input responses. Only the sampling response defines `_meta`.

<a id="req-carried-nested-closed"></a>Nested objects such as content blocks, resource contents, roots, and the `completion` object of a completion result are closed.

Example `result` values are completed results. <a id="req-completed-result-fields"></a>In every protocol version, a present `resultType` MUST be `"complete"`. A present `ttlMs` MUST be a non-negative integer. A present `cacheScope` MUST be `"public"` or `"private"`.

A declaration covering several protocol versions MAY use one example map even when a field is defined by only some of them. Authors MAY instead split the declaration into protocol-scoped variants to avoid the warnings.

Each warning is attributed to one protocol version. The warnings for a document therefore equal the union of warnings for its per-version Effective Protocol Views.

### 3.7 Property Ordering

Property ordering within objects is not significant. <a id="req-property-order"></a>Implementations MUST NOT depend on property or mapping serialization order.

### 3.8 Specification Extensions

Any property whose name matches the pattern `^x-` on the root or another eligible MCP Description-defined semantic object is a specification extension. See [Section 14: Specification Extensions](#14-specification-extensions) for eligibility and exclusion rules.

### 3.9 Additional Properties

<a id="req-closed-objects"></a>Properties not defined in this specification and not matching the `x-` extension pattern MUST NOT appear on the root or another closed eligible semantic object. Implementations MUST reject such unknown properties.

An `x-*` property does not make an otherwise ineligible object extensible.

### 3.10 Example

A minimal valid MCP Description document:

```json
{
  "$schema": "https://mcpdesc.org/schema/mcp-description/0.9.0.json",
  "mcpdesc": "0.9.0",
  "info": {
    "name": "chess-rating-server",
    "version": "1.0.0"
  },
  "protocolVersions": ["2026-07-28"]
}
```

This document makes no transport or primitive declarations. Their omission does not assert runtime non-support.

## 4. Versioning

### 4.1 The `mcpdesc` Field

<a id="req-mcpdesc-required"></a>Every MCP Description document MUST include a `mcpdesc` property at the root level. This property declares which version of this specification the document conforms to.

```json
{
  "mcpdesc": "0.9.0"
}
```

### 4.2 Version Format

<a id="req-mcpdesc-version"></a>The `mcpdesc` value MUST identify the specification version against which conformance is assessed.

The specification uses [Semantic Versioning](https://semver.org/) for its version numbers. Before 1.0.0, a minor version can include breaking changes.

### 4.3 Identifier Roles

The root `$schema` property, when present, identifies a JSON Schema resource for structurally validating the document's data model. It does not replace the `mcpdesc` format discriminator.

```yaml
$schema: https://mcpdesc.org/schema/mcp-description/0.9.0.json
mcpdesc: 0.9.0
```

The root `$schema` property is optional. <a id="req-schema-identifier-exact"></a>When present, it SHOULD identify the exact schema resource used to produce or validate the document. Omitting `$schema` does not make an otherwise conforming document invalid; a validator MAY select an applicable bundled schema through its API, surrounding metadata, or explicit user configuration.

The `$schema` value does not change the MCP Description conformance version identified by `mcpdesc`.

The schema document's root `$id` identifies that schema resource and establishes its base URI for JSON Schema reference resolution.

The schema document's own `$schema` property identifies the JSON Schema dialect used to interpret the schema. Schemas defined by this specification use `https://json-schema.org/draft/2020-12/schema`.

### 4.4 Canonical Schema URI Families

Canonical MCP Description schema URIs use this form:

```text
https://mcpdesc.org/schema/<format-family>/<version>.json
```

This specification assigns `mcp-description` as the MCP Description format family.

### 4.5 Unique and Immutable Schema Resources

<a id="req-schema-uri-immutable"></a>Every canonical schema URI MUST identify exactly one immutable sequence of schema bytes. A schema published at a canonical URI MUST declare that exact URI as its root `$id`.

<a id="req-schema-bytes-immutable"></a>A canonical schema resource MUST NOT be replaced with different bytes, even to correct an error or non-normative description. A changed schema MUST use a different canonical URI.

### 4.6 Live Publication and Aliases

<a id="req-schema-publication-http"></a>A canonical mcpdesc.org schema URI MUST use HTTPS and return HTTP 200 for `GET`. It MUST serve the exact immutable schema bytes directly, without redirect, as a syntactically valid JSON Schema document rather than an HTML fallback. The response MUST declare the request URI as the root `$id` and MUST be retrievable cross-origin for browser-hosted editors and tools.

<a id="req-schema-publication-headers"></a>Canonical responses MUST return a JSON-compatible media type. They SHOULD use `application/schema+json`. They MUST return `Cache-Control` including `public`, `max-age=31536000`, and `immutable`. They SHOULD include a strong `ETag`.

Mutable convenience aliases MAY point to canonical schema resources. <a id="req-schema-aliases"></a>An alias SHOULD redirect to its selected immutable canonical resource. An alias MUST NOT be declared as a schema `$id`. Examples SHOULD use immutable canonical URIs instead.

### 4.7 Retrieval and Security Boundary

<a id="req-no-network-conformance"></a>MCP Description conformance MUST NOT require network retrieval. A validator MAY bundle known schema resources and resolve their canonical URIs locally.

<a id="req-schema-retrieval-policy"></a>Consumers MUST NOT automatically retrieve an arbitrary `$schema` URI from an untrusted document without an explicit network policy. Implementations that permit retrieval SHOULD restrict schemes and destinations, bound redirects and response sizes, validate media type and schema structure, and mitigate SSRF and cache-poisoning risks.

The `$schema` property assists structural schema selection and editor integration. It does not make a structurally valid document semantically conforming and does not supersede protocol-version or cross-object validation.

### 4.8 Version Compatibility

Implementations MAY support multiple MCP Description versions. <a id="req-version-support"></a>An implementation claiming support for a version MUST process its `mcpdesc` discriminator according to that version's requirements.

<a id="req-version-check"></a>When processing a document, implementations MUST check the `mcpdesc` value and:

- accept documents with a recognized `mcpdesc` version; and
- reject documents with an unrecognized `mcpdesc` version.

Implementations MAY also report a clear diagnostic when rejecting a document.

### 4.9 MCP Protocol Coverage

The root `protocolVersions` array identifies the MCP protocol versions described by the document. <a id="req-protocol-versions-values"></a>It MUST be non-empty, MUST contain unique values, and every value MUST be one of:

- `2024-11-05`
- `2025-03-26`
- `2025-06-18`
- `2025-11-25`
- `2026-07-28`

This specification cannot validate the semantics of an unknown or later MCP protocol version, so such a value is invalid. Supporting a later protocol version requires a later specification version.

Root coverage states which protocol versions the document describes. It does not prove that the server supports no other protocol versions.

### 4.10 Protocol Scopes and Inheritance

Transports, Capabilities Objects, Tools, Resources, Resource Templates, and Prompts MAY declare `protocolVersions`.

The root Info Object is unscoped, document-wide MCP Description metadata. <a id="req-info-unscoped"></a>Its properties are valid independently of root `protocolVersions` and MUST NOT be treated as protocol-scoped declarations.

For root version set `R`, a top-level declaration's effective scope is its explicit `protocolVersions` when present. If omitted, its effective scope is `R`. <a id="req-scope-root-subset"></a>An explicit scope MUST be a non-empty subset of `R`.

For a nested scoped declaration, the effective scope is its explicit `protocolVersions` when present. If omitted, its effective scope is its parent's effective scope. <a id="req-scope-subset"></a>An explicit child scope MUST be a non-empty subset of its parent's effective scope.

Omission therefore means the complete effective parent scope; it does not mean unknown applicability.

<a id="req-field-protocol-version-availability"></a>A field that this specification marks as available since an MCP protocol version, or for one MCP protocol version only, MUST NOT appear in a declaration whose effective scope includes a protocol version outside that range.

### 4.11 Relationship Between Version Fields

The `mcpdesc` version identifies this description format. Root and declaration-level `protocolVersions` identify MCP protocol applicability. The optional root `$schema` identifies a structural validation schema resource. These version dimensions are independent.

### 4.12 Effective Protocol Views and Projection

For protocol version `V`, the Effective Protocol View `P_V(D)` of document `D` contains each scoped declaration whose effective scope includes `V` and excludes every other scoped declaration. It preserves the complete Info Object unchanged.

<a id="req-view-projection"></a>A conforming single-version projection tool MUST:

1. validate the source document;
2. require `V` to occur in root `protocolVersions`;
3. set root `protocolVersions` to `[V]`;
4. retain applicable transports, capabilities, primitives, and nested declarations;
5. remove `protocolVersions` from retained declarations because applicability is unambiguous;
6. preserve semantically significant empty values and inheritance, including security declarations;
7. omit every ordinary declaration collection from which projection removes the last entry; and
8. validate the projected document structurally and semantically for `V`.

Projection produces an ordinary conforming MCP Description document, not a second format. <a id="req-view-projection-transports"></a>It MUST NOT materialize transport-dependent inherited values onto a primitive unless the operation also selects a transport and defines that resolution.

### 4.13 Merge

A merge tool MAY combine single-version or multi-version descriptions into one aggregate description. <a id="req-merge-inputs"></a>It MUST validate every input and MUST report a conflict rather than guess when inputs cannot be represented faithfully.

<a id="req-merge-algorithm"></a>A conforming merge algorithm SHOULD project inputs into individual protocol views, require compatible logical server identity and unscoped metadata, union root protocol sets, collapse equivalent declarations by unioning their scopes, retain differing declarations as disjoint scoped variants, and validate the aggregate result.

<a id="req-merge-equivalence"></a>When inputs cover the same protocol version, their Effective Protocol Views MUST be semantically equivalent or merge MUST fail. Conflicting `info`, `instructions`, root extension values, security declarations, or other unscoped values also cause failure.

For every merged source view `D_V`, this round-trip invariant applies:

```text
P_V(merge(D_1, ..., D_n)) is semantically equivalent to D_V
```

Semantic equivalence need not preserve property order, redundant scopes, array order where semantically insignificant, or the original choice between an omitted scope and an explicit full-parent scope. <a id="req-merge-security"></a>Merge tools MUST preserve the distinction among omitted `security`, `security: []`, and `security: [{}]`.

Omission contributes no entries to an ordinary declaration collection during merge. <a id="req-merge-collections"></a>A merge result MUST omit an ordinary declaration collection when it has no entries. Merge output MUST satisfy transport protocol coverage whenever it contains `transports`.

### 4.14 Native MCP Projection

Native projection produces the MCP values that a server returns from `tools/list`, `resources/list`, `resources/templates/list`, and `prompts/list` for one MCP protocol version. Unlike the Effective Protocol View (Section 4.12), its result is not an MCP Description document.

Native projection `N_V(D, k, i)` takes a document `D`, an MCP protocol version `V`, a primitive kind `k` (Tool, Resource, Resource Template, or Prompt), and an identifier `i`. The identifier is the Tool `name`, Resource `uri`, Resource Template `uriTemplate`, or Prompt `name`, and is unique within `P_V(D)` (Sections 9.5, 10.5, and 11.5). <a id="req-native-projection-steps"></a>A conforming native projection implementation MUST:

1. <a id="req-native-projection-source-valid"></a>validate `D` and fail with `projection-source-invalid` when validation reports an error;
2. <a id="req-native-projection-protocol-version-declared"></a>require `V` to occur in root `protocolVersions`, otherwise fail with `projection-protocol-version-not-declared`;
3. <a id="req-native-projection-declaration-applicable"></a>select the declaration of kind `k` with identifier `i` in `P_V(D)`, otherwise fail with `projection-declaration-not-applicable`;
4. <a id="req-native-projection-references-resolved"></a>resolve every Reference Object in Tool `inputSchema` and `outputSchema` (Section 17);
5. <a id="req-native-projection-fields"></a>build the value from the declaration fields that the MCP type of `k` defines in `V`, copying each value unchanged, where Prompt `arguments` entries and `icons` entries keep only the fields that MCP `PromptArgument` and `Icon` define in `V`; and
6. <a id="req-native-projection-postcondition"></a>validate the value against the definition of that MCP type in the pinned MCP `schema.json` of `V`, and fail with `projection-postcondition-failed`, without returning the value, when it does not validate.

Because validation already rejects fields that `V` does not define, step 5 removes only MCP Description metadata: `protocolVersions`, `examples`, `interactionExamples`, `completionExamples`, `tags`, `elicitations`, `deprecated`, `security`, `clientRequirements`, and the `x-*` specification extensions of the declaration, its Prompt arguments, and its icons. Embedded JSON Schema keywords in `inputSchema` and `outputSchema`, including `x-*` keywords and `x-mcp-header`, and `_meta` entries are copied unchanged.

<a id="req-native-projection-no-synthesis"></a>Native projection MUST NOT add a field that the declaration does not contain, materialize a protocol default, copy a value into another field, or rewrite a value. An absent annotation hint stays absent, `execution.taskSupport` is not set to `"forbidden"`, no `$schema` is inserted into an embedded schema, and a Prompt argument without `required` stays without it. `deprecated` has no MCP counterpart and is omitted rather than moved into `_meta` or `description`.

<a id="req-native-projection-lists"></a>The list projection of kind `k` for `V` is the sequence of `N_V(D, k, i)` for every declaration of kind `k` in `P_V(D)`, in document order. A failure for any declaration fails the whole list.

<a id="req-native-projection-no-repair"></a>A `projection-postcondition-failed` failure indicates a defect in this specification, its validator, or the implementation. The exception is a Tool and protocol version for which validation reports the warning of [Section 9.2](#req-tool-schema-native-shape). There, the failure reflects a restriction of the MCP `Tool` type that this specification reports but does not enforce. In either case, implementations MUST NOT repair the value.

The `projection-fixtures/` folder of this specification gives, for each kind and supported protocol version, the exact expected MCP value or failure, in the case format of `projection-fixtures/schema/projection-case.schema.json`. Values are compared as canonical JSON.

## 5. Info Object

The `info` object provides metadata about the MCP server. <a id="req-info-required"></a>It is REQUIRED.

The `info` object combines OpenAPI-style metadata (`contact`, `license`) with server identity fields from MCP.

During initialization, an MCP server identifies itself by returning an `Implementation` value as `serverInfo` in its `initialize` result. The Info fields `name`, `title`, `description`, `version`, `icons`, and `websiteUrl` correspond to fields of that type. The "Runtime mapping" entries in Section 5.1 name the corresponding field and the MCP protocol version that introduced it, so tools can compare a description with what a running server reports.

Info is unscoped, document-wide MCP Description metadata (Section 4.10). Every property defined in this section MAY appear regardless of the protocol versions listed in root `protocolVersions`. <a id="req-info-protocol-version-independent"></a>A runtime mapping MUST NOT be interpreted as requiring the value to come from a running server, or as limiting the property to protocol versions whose `Implementation` type defines the field. MCP 2025-11-25 and MCP 2026-07-28 define every mapped field, so this requirement matters only for documents that cover earlier protocol versions. For example, `description` is valid in a document that covers MCP 2025-06-18, although `Implementation.description` is available only since MCP 2025-11-25. Validators MUST NOT emit a protocol-version applicability diagnostic solely because an Info property is unavailable on `Implementation` in an applicable MCP protocol version.

A producer MAY obtain Info metadata from author input, configuration, package metadata, a registry, runtime discovery, or another source. <a id="req-info-trust"></a>This specification does not assign trust or precedence among those sources, and consumers MUST NOT infer that an Info value was asserted by a live server.

### 5.1 Properties

<a id="req-info-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Programmatic server name (identifier). <a id="req-info-name-non-empty"></a>MUST be non-empty. Runtime mapping: `Implementation.name` (MCP `BaseMetadata`). |
| `version` | string | **Yes** | Server version. <a id="req-info-version-semver"></a>Semantic Versioning RECOMMENDED. <a id="req-info-version-non-empty"></a>MUST be non-empty. Runtime mapping: `Implementation.version`. |
| `title` | string | No | Human-readable display name for UI contexts. Falls back to `name` if not provided. Runtime mapping: `Implementation.title` (MCP `BaseMetadata`, available since MCP 2025-06-18). |
| `description` | string | No | Brief description of what the server does. Runtime mapping: `Implementation.description` (available since MCP 2025-11-25). |
| `id` | string | No | Unique server identifier (URI, DID, or URN). |
| `icons` | non-empty array\<[Icon](#appendix-a-icon-object)\> | No | Icons for UI display. Runtime mapping: `Implementation.icons` (available since MCP 2025-11-25). |
| `websiteUrl` | string (URI) | No | URL of the server's website. Runtime mapping: `Implementation.websiteUrl` (available since MCP 2025-11-25). |
| `contact` | [Contact Object](#52-contact-object) | No | Contact information (OpenAPI-style, not part of MCP `Implementation`). |
| `license` | [License Object](#53-license-object) | No | License information (OpenAPI-style, not part of MCP `Implementation`). |

### 5.2 Contact Object

<a id="req-contact-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | No | Organization or maintainer name |
| `url` | string (URI) | No | Contact URL |
| `email` | string (email) | No | Contact email address |

### 5.3 License Object

<a id="req-license-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | License name (e.g., `"Apache-2.0"`, `"MIT"`) |
| `url` | string (URI) | No | URL to the license text |

### 5.4 Example

```json
{
  "info": {
    "name": "chess-coach",
    "title": "Chess Coach MCP Server",
    "version": "2.1.0",
    "description": "Analyze chess games, track player ratings, and review game history",
    "id": "urn:mcp:chess-coach",
    "icons": [
      {
        "src": "https://chess-coach.example.com/icons/icon-48.png",
        "mimeType": "image/png",
        "sizes": ["48x48"]
      },
      {
        "src": "https://chess-coach.example.com/icons/icon.svg",
        "mimeType": "image/svg+xml",
        "sizes": ["any"],
        "theme": "light"
      }
    ],
    "websiteUrl": "https://chess-coach.example.com",
    "contact": {
      "name": "Chess Coach Team",
      "url": "https://example.com/chess-coach",
      "email": "chess@example.com"
    },
    "license": {
      "name": "MIT",
      "url": "https://opensource.org/licenses/MIT"
    }
  }
}
```

## 6. Transports

The optional `transports` property declares one or more communication mechanisms for the MCP server. <a id="req-transports-non-empty"></a>When present, it MUST contain at least one Transport Object.

Omission means that the document declares no connection mechanism. <a id="req-transports-omission"></a>It MUST NOT be interpreted as proof that the server has no transport.

### 6.1 Overview

MCP servers can be accessed through different transport mechanisms. The `transports` array lets one MCP Description document declare several supported transports, so clients can select the most appropriate one.

### 6.2 Transport Types

Every Transport Object MAY contain `protocolVersions` and `security`. `protocolVersions` follows [Section 4.10](#410-protocol-scopes-and-inheritance). A transport's `security` value is a Security Requirement Array and follows Sections 6.4 and 7.

<a id="req-transport-type"></a>Each Transport Object MUST include a `type` property. The following transport types are defined.

#### 6.2.1 Streamable HTTP Transport

<a id="req-transport-streamable-http-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"streamable-http"` | **Yes** | Transport type identifier |
| `url` | string (URI) | **Yes** | MCP endpoint URL |

The streamable HTTP transport connects to an MCP server over HTTP with streaming response support. <a id="req-transport-streamable-http-protocol-versions"></a>It is defined for MCP 2025-03-26 and later. It is the RECOMMENDED transport for remote MCP servers in those protocol versions.

```json
{
  "type": "streamable-http",
  "url": "https://chess-coach.example.com/mcp"
}
```

#### 6.2.2 stdio Transport

<a id="req-transport-stdio-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"stdio"` | **Yes** | Transport type identifier |
| `command` | string | **Yes** | Command to launch the server |
| `args` | array\<string\> | No | Command arguments |
| `env` | object | No | Environment variables (string values) |

The stdio transport launches the MCP server as a subprocess and communicates over standard input/output.

```json
{
  "type": "stdio",
  "command": "chess-coach",
  "args": ["mcp", "--level", "advanced"],
  "env": {
    "CHESS_DB_PATH": "/data/games.db"
  }
}
```

#### 6.2.3 SSE Transport (Legacy)

<a id="req-transport-sse-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"sse"` | **Yes** | Transport type identifier |
| `url` | string (URI) | **Yes** | SSE endpoint URL |

The Server-Sent Events transport is a legacy transport type retained for backward compatibility. It is the remote transport defined by MCP 2024-11-05. <a id="req-transport-legacy-sse-warning"></a>Validators SHOULD warn when its effective scope includes MCP 2025-03-26 or later, where Streamable HTTP is the standard remote transport. New implementations SHOULD use `streamable-http` instead.

```json
{
  "type": "sse",
  "url": "https://chess-coach.example.com/sse"
}
```

### 6.3 Multiple Transports

A server MAY support multiple transports. <a id="req-transport-selection"></a>Clients SHOULD select the most appropriate transport based on their environment and capabilities.

```json
{
  "transports": [
    { "type": "streamable-http", "url": "https://chess-coach.example.com/mcp" },
    { "type": "stdio", "command": "chess-coach", "args": ["mcp"] }
  ]
}
```

### 6.4 Transport-Scoped Security

Each Transport Object MAY include a `security` property containing a Security Requirement Array (see Section 7). When present, transport security replaces root security for that transport.

| Transport `security` | Effective transport security |
|----------------------|------------------------------|
| Omitted | Root `security` when present; otherwise no mcpdesc-declared requirement |
| `[]` (empty) | Clears any inherited requirement |
| Non-empty | The transport's own requirements |

This mechanism allows a single MCP Description document to declare different security requirements for different transports. For example, an HTTP transport typically requires bearer authentication while a stdio transport relies on OS-level process isolation:

```json
{
  "transports": [
    {
      "type": "streamable-http",
      "url": "https://chess-coach.example.com/mcp",
      "security": [
        { "bearer": [] }
      ]
    },
    {
      "type": "stdio",
      "command": "chess-coach",
      "args": ["mcp"],
      "security": []
    }
  ]
}
```

<a id="req-transport-security-example"></a>The `bearer` name in this example MUST identify a root `securitySchemes` entry.

### 6.5 Protocol Coverage

<a id="req-transport-coverage"></a>When `transports` is present, the union of all effective transport protocol scopes MUST equal root `protocolVersions`. Transport scopes MAY overlap because a server can expose multiple transports for one protocol version.

A document with `transports` is invalid when any root protocol version has no applicable transport or when a transport scope contains a protocol version outside root coverage. <a id="req-transport-coverage-omitted"></a>When `transports` is omitted, transport coverage validation does not apply: validators MUST NOT infer a transport or report uncovered root protocol versions.

### 6.6 Extensibility

Transport Objects MAY carry `x-*` specification extensions. <a id="req-transport-closed"></a>They MUST NOT contain properties other than those defined for their type and the common optional `protocolVersions` and `security` properties.

## 7. Security

MCP Description represents statically known authentication and authorization through reusable named Security Scheme Objects and Security Requirement Arrays. Both `securitySchemes` and `security` are OPTIONAL.

These declarations describe access requirements. They do not define token acquisition, authorization-server discovery, runtime access-control policy, or authorization-filtered discovery behavior.

### 7.1 Named Security Schemes

Root `securitySchemes` is a map from a local name to a Security Scheme Object. <a id="req-security-schemes-map"></a>When present, it MUST contain at least one entry. Every local name MUST match `^[A-Za-z0-9._-]+$`. <a id="req-security-schemes-omission"></a>Omission makes no security-scheme declaration and MUST NOT be interpreted as proof that the runtime uses no authentication or authorization mechanism.

```json
{
  "securitySchemes": {
    "oauth": {
      "type": "oauth2",
      "flows": {
        "authorizationCode": {
          "authorizationUrl": "https://auth.example.com/authorize",
          "tokenUrl": "https://auth.example.com/token",
          "scopes": { "games:read": "Read games" }
        }
      }
    },
    "api-key": {
      "type": "apiKey",
      "in": "header",
      "name": "X-API-Key"
    }
  }
}
```

### 7.2 Security Scheme Object

<a id="req-security-scheme-fields"></a>Each Security Scheme Object MUST include `type`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | **Yes** | `"http"`, `"apiKey"`, `"oauth2"`, or `"openIdConnect"` |
| `scheme` | string | For `http` | HTTP authentication scheme |
| `bearerFormat` | string | No | Bearer-token format hint |
| `name` | string | For `apiKey` | API-key parameter name |
| `in` | string | For `apiKey` | `"header"`, `"query"`, or `"cookie"` |
| `flows` | OAuth Flows Object | For `oauth2` | One or more OAuth2 flows |
| `openIdConnectUrl` | string (URI) | For `openIdConnect` | OpenID Connect discovery URL |
| `description` | string | No | Human-readable description |

An OAuth Flows Object MAY contain `implicit`, `password`, `clientCredentials`, and `authorizationCode`. <a id="req-oauth-flows-fields"></a>At least one flow MUST be present. Every flow MUST contain a `scopes` map and MAY contain `refreshUrl`. An `implicit` flow MUST contain `authorizationUrl`. `password` and `clientCredentials` flows MUST contain `tokenUrl`. An `authorizationCode` flow MUST contain both `authorizationUrl` and `tokenUrl`.

### 7.3 Security Requirement Array

A `security` value is an array of Security Requirement Objects. Each object maps local security-scheme names to arrays of scope strings.

```json
{
  "security": [
    { "oauth": ["games:read"] },
    { "api-key": [] }
  ]
}
```

Entries in the outer array are alternatives (**OR**). Multiple scheme names in one object are jointly required (**AND**). Every listed OAuth2 or OpenID Connect scope is required.

<a id="req-security-scheme-references"></a>Every referenced name MUST exist in root `securitySchemes`. <a id="req-security-scopes-unique"></a>Scope arrays MUST contain unique strings. <a id="req-security-scopes-oauth-only"></a>HTTP and API-key schemes MUST use an empty scope array. <a id="req-security-uncataloged-scope"></a>An OAuth2 or OpenID Connect requirement MAY use a scope absent from a static scope catalog. Validators MAY warn but MUST NOT reject solely for that reason.

Array order, scheme-key order, and scope order are not semantically significant.

### 7.4 Omission, Clearing, and Anonymous Access

The following forms are distinct:

- omitted `security`: inherit at a nested level, or make no declaration at root;
- `security: []`: explicitly clear any inherited mcpdesc security requirement;
- `security: [{}]`: explicitly allow anonymous access as an alternative;
- `security: [{}, {"oauth": ["games:read"]}]`: allow anonymous access or the named OAuth requirement.

<a id="req-security-empty-distinction"></a>Implementations MUST preserve the distinction between `[]` and `[{}]` and MUST NOT normalize one into the other.

### 7.5 Placement and Precedence

`security` MAY appear at the document root, a Transport Object, or any Tool, Resource, Resource Template, or Prompt Object.

For a primitive used through a selected transport, the effective requirement is the first present value in this order:

1. primitive `security`;
2. selected transport `security`;
3. root `security`;
4. no mcpdesc-declared requirement.

This is replacement, not merging. <a id="req-security-projection"></a>Single-version projection MUST preserve security declarations and MUST NOT copy one transport's inherited security onto a primitive unless a separate operation also selects that transport.

### 7.6 Interpretation Limits

Primitive requirements describe access conditions, not identities, roles, ownership, or exact discovery visibility. A requirement neither guarantees that a primitive is hidden before authorization nor guarantees that it is visible.

A primitive-level override applies regardless of selected transport. <a id="req-security-transport-variants"></a>If transport inheritance cannot faithfully represent materially different per-transport primitive requirements, authors SHOULD publish separate descriptions or use a specification extension. <a id="req-security-no-combined-requirement"></a>Tooling MUST NOT invent a combined requirement.

## 8. Capabilities

The optional `capabilities` array declares protocol-scoped, durable server capabilities. <a id="req-capabilities-non-empty"></a>When present, it MUST contain at least one Capabilities Object.

### 8.1 Overview

Capabilities represent externally relevant server behavior beyond primitive inventories. They describe semantics, not the RPC or notification mechanism used to expose them.

Completion examples on Prompt and Resource Template declarations are descriptive metadata about observed `completion/complete` behavior. They do not themselves assert that the server advertises the `completions` capability in every deployment or Effective Protocol View.

### 8.2 Properties

| Property | Type | Description |
|----------|------|-------------|
| `protocolVersions` | array\<string\> | MCP protocol versions to which this object applies; inherits root coverage when omitted |
| `tools` | object | Tool-related capabilities |
| `tools.listChanged` | boolean | Whether the server sends `notifications/tools/list_changed` |
| `resources` | object | Resource-related capabilities |
| `resources.subscribe` | boolean | Whether the server supports resource subscriptions |
| `resources.listChanged` | boolean | Whether the server sends `notifications/resources/list_changed` |
| `prompts` | object | Prompt-related capabilities |
| `prompts.listChanged` | boolean | Whether the server sends `notifications/prompts/list_changed` |
| `completions` | object | Present if the server supports argument autocompletion (available since MCP 2025-03-26) |
| `logging` | object | Present if the server supports sending log messages to the client |
| `tasks` | object | Present if the server supports core task-augmented requests (MCP 2025-11-25 only) |
| `extensions` | non-empty map\<string, object\> | Formal MCP extension capabilities (available since MCP 2026-07-28). For earlier protocol versions, see Section 8.4 |
| `experimental` | object | Experimental, non-standard capabilities |

### 8.3 Tasks Capability

The `tasks` object, when present, indicates the server supports long-running task management:

| Property | Type | Description |
|----------|------|-------------|
| `tasks.list` | object | Server supports listing active tasks |
| `tasks.cancel` | object | Server supports cancelling tasks |
| `tasks.requests.tools.call` | object | Tool calls can be task-augmented |

### 8.4 Extensibility

Formal `extensions` capability negotiation begins with MCP 2026-07-28. <a id="req-capabilities-extensions-pre-standard"></a>When a server Capabilities Object containing `extensions` applies to an earlier protocol version, the map MUST satisfy the same structural requirements and MUST be accepted and preserved. It MUST NOT imply that the earlier MCP core protocol version defines the field or that the server supports MCP 2026-07-28. Validators SHOULD warn for each applicable earlier protocol version that its core schema does not define the field and that the description preserves a deployed pre-standard extension negotiation convention. Implementations MAY escalate this warning under an explicit local policy.

<a id="req-extensions-identifier-form"></a>`extensions` keys MUST use the MCP mandatory-prefix metadata form `prefix/name`. A prefix whose second label is `modelcontextprotocol` or `mcp` is reserved for MCP use. Unknown syntactically valid extension identifiers are accepted and MUST be preserved. <a id="req-extensions-reserved-identifiers"></a>A validator SHOULD warn about an unrecognized identifier under a reserved prefix. It MUST NOT treat absence from its local catalog alone as proof of namespace misuse. Using an identifier known to be unauthorized is a semantic error.

Protocol-version, identifier-authority, and identifier-maturity diagnostics are independent. <a id="req-extensions-not-reinterpreted"></a>Tooling MUST NOT move, copy, or reinterpret a pre-standard server extension map as `experimental`, `_meta`, an MCP Description `x-*` property, or a declaration for another protocol version.

For this purpose, an official MCP extension is recognized when the validator's extension catalog identifies it from an authoritative MCP extension source. <a id="req-extensions-official-no-warning"></a>A validator SHOULD NOT emit an unknown-reserved-identifier warning for a cataloged official extension. <a id="req-extensions-catalog-maturity"></a>It SHOULD identify a cataloged experimental extension as experimental rather than unknown and SHOULD warn that its maturity must be reviewed. Recognition establishes identifier authority and maturity only; it does not establish that an extension value satisfies extension-specific settings or semantics.

An extension catalog is validator metadata rather than part of the MCP Description document or its core conformance result. <a id="req-extensions-catalog-disclosure"></a>A validator that uses one MUST disclose its authoritative source, effective date, and identifier maturity assignments. A frozen validator snapshot MUST pin that metadata. Catalog updates MAY change authority or maturity diagnostics without changing whether an otherwise conforming document satisfies this specification.

A validator MAY apply deeper extension-specific validation only through an explicitly selected profile or other configured trusted mechanism. <a id="req-extensions-profiles"></a>Such validation SHOULD identify an immutable or otherwise pinned extension specification version and MUST distinguish profile diagnostics from core MCP Description conformance. Failure to retrieve mutable extension material MUST NOT invalidate an otherwise conforming document.

<a id="req-capabilities-tasks-distinct"></a>Core `tasks` in MCP 2025-11-25 and a Tasks extension in MCP 2026-07-28 are distinct declarations and MUST NOT be automatically reinterpreted as one another. <a id="req-capabilities-logging-deprecated"></a>`logging` remains representable for protocol versions that define it; validators SHOULD warn when it applies to MCP 2026-07-28, where it is deprecated.

<a id="req-capabilities-closed"></a>The Capabilities Object and the MCP Description-defined `tools`, `resources`, and `prompts` capability declaration objects MAY carry `x-*` specification extensions. Other unknown properties on those objects are invalid. MCP-native capability payloads retain their own forward-compatibility rules. The `capabilities.extensions` map is a formal MCP protocol-extension namespace, not an MCP Description specification-extension location. Tooling MUST NOT reinterpret or move values between these mechanisms.

### 8.5 Primitive Client Capability Requirements

Tool, Resource, Resource Template, and Prompt Objects MAY contain a `clientRequirements` Client Capability Requirements Object. It describes an unconditional static precondition on the minimum MCP client capabilities required to use that primitive through `tools/call`, `resources/read`, or `prompts/get`. A Resource Template requirement applies to reading a concrete URI produced from the template. Requirements do not apply to listing or discovery, and this specification neither requires nor prohibits runtime filtering based on them.

The object uses the `ClientCapabilities` structure of every MCP protocol version in the containing primitive's effective protocol scope. <a id="req-client-requirements-shape"></a>It MUST be non-empty, MUST NOT contain `protocolVersions`, and inherits no value from the root, a Transport Object, server `capabilities`, an Elicitation Declaration, or another primitive. <a id="req-client-requirements-protocol-version-valid"></a>Every declared capability and nested capability member MUST be valid for every effective protocol version. The pre-standard server-advertisement preservation rule in Section 8.4 does not relax this requirement. When requirements differ materially between protocol versions, the primitive MUST be split into pairwise-disjoint protocol-scoped variants.

All requirements are conjunctive. Satisfying them does not guarantee success or authorization. <a id="req-client-requirements-unconditional"></a>Authors MUST NOT declare a capability that is optional, opportunistic, input-dependent, or used only on some runtime paths as an unconditional requirement.

The recognized core structure is protocol-version-specific:

| Protocol version | Core client capability shape |
|----------|------------------------------|
| MCP 2024-11-05 and MCP 2025-03-26 | `roots.listChanged`, `sampling`, and `experimental` |
| MCP 2025-06-18 | The earlier shape plus `elicitation` |
| MCP 2025-11-25 | `roots.listChanged`; `sampling.context` and `sampling.tools`; `elicitation.form` and `elicitation.url`; core `tasks.list`, `tasks.cancel`, `tasks.requests.sampling.createMessage`, and `tasks.requests.elicitation.create`; and `experimental` |
| MCP 2026-07-28 | `elicitation.form` and `elicitation.url`; formal `extensions`; `experimental`; deprecated empty `roots`; and deprecated `sampling.context` and `sampling.tools` |

<a id="req-client-requirements-values"></a>Capability marker and settings values MUST be objects. MCP 2026-07-28 `roots` MUST be empty. <a id="req-client-requirements-deprecated"></a>Validators SHOULD warn when a requirement uses a capability or nested member deprecated in its applicable protocol version. MCP 2024-11-05 and MCP 2025-03-26 retain the legacy incomplete-validation treatment in [Section 16](#req-legacy-validation-scope): validators apply structural and selected sound checks and MUST NOT report complete MCP semantic conformance.

<a id="req-client-requirements-closed"></a>The object contains only the client capabilities that the applicable MCP protocol versions define. MCP's `ClientCapabilities` type declares no index signature in any supported protocol version, so other top-level members MUST NOT appear. Custom requirements belong in `experimental` and, for MCP 2026-07-28, in `extensions`. Entries of `experimental` are accepted and MUST be preserved. Validators MUST NOT invent matching semantics for them.

The Client Capability Requirements Object is an MCP Description-defined semantic object and MAY carry `x-*` specification extensions. Those properties are MCP Description metadata, not client capabilities.

<a id="req-client-requirements-extensions"></a>For MCP 2026-07-28, `extensions` MUST be a non-empty map whose keys satisfy the same mandatory-prefix identifier grammar and reserved-prefix rules as `capabilities.extensions`, and whose values are objects. Unknown syntactically valid identifiers MUST be preserved. Validators SHOULD warn about an unrecognized identifier under an MCP-reserved prefix. <a id="req-client-requirements-extension-compatibility"></a>A generic compatibility checker MAY treat an empty extension requirement value as satisfied by presence of that identifier in the client's extension map. It MUST NOT claim a non-empty extension requirement is satisfied without understanding the extension-specific settings semantics.

<a id="req-client-requirements-compatibility"></a>A compatibility tool comparing `clientRequirements` with a client capability profile for one protocol version SHOULD report `satisfied` when every requirement is known to be satisfied, `unsatisfied` when any requirement is known not to be satisfied, and `indeterminate` when none is known to fail but at least one cannot be evaluated. An omitted property means that the description makes no primitive-level hard-requirement claim; it does not prove that no runtime path can optionally use a capability.

Server `capabilities`, primitive `clientRequirements`, Elicitation Declarations, Tool `interactionExamples`, and `security` are independent. <a id="req-capability-independence"></a>Tooling MUST NOT infer or copy one from another. In particular, a conditional elicitation or an illustrative interaction scenario does not imply an unconditional client-capability requirement, and capability compatibility is not an authorization decision.

<a id="req-client-requirements-views"></a>A single-version projection MUST preserve `clientRequirements` on every retained primitive and MUST NOT synthesize requirements. Merge tooling MAY collapse otherwise equivalent declarations with equivalent requirements. It MUST NOT select or union materially different requirements over overlapping protocol scope; it MUST preserve distinct non-overlapping variants where representable or report a conflict.

### 8.6 Scope Uniqueness

<a id="req-capability-scopes-disjoint"></a>Effective Capabilities Object scopes MUST be pairwise disjoint. At most one Capabilities Object can therefore apply to a protocol version.

### 8.7 Example

```json
{
  "capabilities": [
    {
      "protocolVersions": ["2025-11-25"],
      "tools": { "listChanged": true },
      "resources": { "subscribe": true, "listChanged": true },
      "prompts": { "listChanged": false },
      "completions": {},
      "logging": {},
      "tasks": { "requests": { "tools": { "call": {} } } }
    },
    {
      "protocolVersions": ["2026-07-28"],
      "tools": { "listChanged": true },
      "extensions": { "io.example/tasks": {} }
    }
  ]
}
```

## 9. Tools

The `tools` array declares the tools exposed by the MCP server. Each tool represents a server-side function that clients can invoke.

### 9.1 Tool Object

<a id="req-tool-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP protocol versions to which this declaration applies. |
| `name` | string | **Yes** | Programmatic tool name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Available since MCP 2025-06-18. |
| `description` | string | No | Human-readable tool description. |
| `inputSchema` | object or Reference Object | **Yes** | Inline or reusable JSON Schema whose root describes an object containing tool input parameters. |
| `outputSchema` | object or Reference Object | No | Inline or reusable JSON Schema for structured Tool output. Available since MCP 2025-06-18. |
| `annotations` | [Tool Annotations Object](#96-tool-annotations) | No | Behavioral hints. Available since MCP 2025-03-26. |
| `execution` | [Execution Object](#97-execution-object) | No | Task-augmented execution support. MCP 2025-11-25 only. |
| `examples` | map&lt;string, Tool Example Object&gt; | No | Named complete Tool invocation/result pairs. |
| `interactionExamples` | map&lt;string, Tool Interaction Example Object&gt; | No | Named ordered semantic client-input scenarios attached to one Tool invocation. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Available since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. <a id="req-tool-tags-references"></a>When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that may be needed while fulfilling the Tool (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the Tool is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Tool declaration, subject to [Section 3.5](#35-mcp-_meta). Available since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |
| `clientRequirements` | [Client Capability Requirements Object](#85-primitive-client-capability-requirements) | No | Unconditional minimum client capabilities required for `tools/call`; does not apply to `tools/list`. |

### 9.2 Input and Output Schemas

<a id="req-tool-input-schema-required"></a>Every Tool MUST contain `inputSchema`. Repair or conversion tooling MUST NOT insert a no-argument `inputSchema` unless the author confirms it. <a id="req-tool-input-schema-object-root"></a>The schema root MUST describe an object, because Tool arguments are always a JSON object. If the root declares `type`, its value MUST be `"object"` or an array that contains `"object"`. Before MCP 2025-11-25, the root MUST declare `"type": "object"`.

`inputSchema` and `outputSchema` MAY be Reference Objects targeting the `schemas` component namespace (see [Section 17](#17-reusable-components-and-local-references)). <a id="req-tool-schema-references-resolved"></a>References MUST be resolved before any inline schema requirement in this section is applied, including root shape, dialect, protocol applicability, `x-mcp-header`, and example compatibility.

<a id="req-tool-schema-closed-recommended"></a>A Tool that takes no parameters SHOULD use `{ "type": "object", "additionalProperties": false }`. A Tool that accepts unspecified parameters can use `{ "type": "object" }`, but this is NOT RECOMMENDED because it offers little validation or guidance. A schema that declares parameters lists them in `properties` and adds `additionalProperties: false` when undeclared properties must be rejected.

<a id="req-tool-output-schema-valid"></a>When present, `outputSchema` MUST be a valid JSON Schema object describing the Tool's structured output. For MCP 2025-11-25 and MCP 2026-07-28, its dialect defaults to JSON Schema 2020-12 when no explicit `$schema` is provided.

<a id="req-tool-output-schema-object-root"></a>Before MCP 2026-07-28, `outputSchema` MUST describe an object, because structured output is an object in those protocol versions. For MCP 2025-06-18, it MUST declare `"type": "object"`. For MCP 2025-11-25, if the root declares `type`, its value MUST be `"object"` or an array that contains `"object"`. MCP 2026-07-28 permits any valid JSON Schema root for `outputSchema`.

For MCP 2025-11-25 and MCP 2026-07-28, both schemas MAY include an explicit `$schema` property to declare the JSON Schema dialect. <a id="req-tool-schema-dialect-keyword"></a>Earlier protocol versions do not define that property on Tool schemas. <a id="req-tool-schema-vocabulary"></a>For MCP 2026-07-28, validators MUST accept the applicable JSON Schema 2020-12 vocabulary, including references, composition, and conditionals, plus MCP-defined annotations where valid. For earlier protocol versions, validators MUST apply the applicable MCP schema rules.

<a id="req-tool-schema-dialect-valid"></a>For MCP 2025-11-25 and MCP 2026-07-28, every embedded Tool schema MUST be valid under its declared or default dialect. Both protocol versions default to JSON Schema 2020-12.

<a id="req-tool-schema-dialect-set"></a>A declared dialect MUST be JSON Schema 2020-12 (`https://json-schema.org/draft/2020-12/schema`) or JSON Schema draft-07 (`http://json-schema.org/draft-07/schema#`). Either URI can use `http` or `https`, with or without the empty fragment. A schema that declares any other dialect makes the MCP Description invalid. This specification fixes the set so that conformance does not depend on the validator. MCP requires implementations to support only JSON Schema 2020-12, so authors SHOULD prefer it.

For MCP 2025-11-25 and MCP 2026-07-28, the dialect, not the TypeScript type of the MCP `Tool`, decides whether an embedded schema is valid. However, the MCP `Tool` type of these protocol versions restricts some syntax that the dialect allows:

- In both protocol versions, it requires `"type": "object"` at the `inputSchema` root.
- In MCP 2025-11-25, it also requires `"type": "object"` at the `outputSchema` root, and an object as the value of every top-level `properties` entry of either schema.

<a id="req-tool-schema-native-shape"></a>A Tool schema that is valid under its dialect but does not meet such a restriction for an applicable protocol version MUST NOT make the MCP Description invalid. Validators MUST report a warning for each such location, naming the protocol versions concerned, because native projection fails for them ([Section 4.14](#414-native-mcp-projection)). Authors SHOULD meet these restrictions or SHOULD narrow the Tool's `protocolVersions`. For example, `{}` can replace `true`, `{ "not": {} }` can replace `false`, and `"type": "object"` can be added beside `$ref` or `allOf`.

The supported protocol versions before MCP 2025-11-25 define an object-rooted Tool schema shape but do not state an embedded-schema dialect default. <a id="req-tool-schema-legacy-no-dialect"></a>For those protocol versions, validators MUST enforce the applicable shape without inferring a dialect solely from the enclosing generated MCP schema. <a id="req-tool-schema-legacy-shape"></a>`properties`, when present, MUST be an object whose values are objects, and `required`, when present, MUST be an array of strings. <a id="req-tool-schema-keywords-preserved"></a>Other keywords MUST be preserved and MUST NOT be rejected solely by applying an inferred meta-schema.

<a id="req-tool-schema-no-fetch"></a>A validator MUST NOT automatically retrieve an external `$ref` target from a network. It MAY resolve external references from an explicitly supplied trusted local catalog or an explicitly enabled resolver that follows the applicable MCP security guidance. <a id="req-tool-schema-external-ref"></a>If a target remains unavailable, the `$ref` MUST be preserved, and its presence alone MUST NOT make the containing MCP Description invalid. The validator SHOULD warn that complete embedded-schema validation was not possible. It MUST NOT report a weakened or partial validation as complete. <a id="req-tool-schema-consumer-certainty"></a>Consumers that require executable schema certainty SHOULD require resolution or treat this warning as an error. <a id="req-tool-schema-self-contained"></a>Authors SHOULD prefer self-contained Tool schemas using local `$defs`.

For MCP 2026-07-28, `inputSchema` properties MAY use `x-mcp-header` to map an input to an HTTP header. <a id="req-tool-x-mcp-header"></a>The annotation value MUST be a non-empty HTTP field-name token and MUST be unique, case-insensitively, within that `inputSchema`. It is valid only on a `string`, `integer`, or `boolean` property that is statically reachable from the schema root through `properties` chains. It MUST NOT be used on a property reached through arrays, composition, conditionals, or `$ref`.

### 9.3 Named Tool Examples

A Tool Object MAY contain `examples`, a map from a local example name to an inline Tool Example Object or a Reference Object targeting `#/components/toolExamples/<name>`. <a id="req-tool-examples-map"></a>When present, the map MUST contain at least one entry. Each name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and scoped to the containing Tool declaration. They serve both as human-meaningful labels and as stable local selection names. Entry order is not semantically significant. <a id="req-tool-example-references-resolved"></a>A referenced example MUST be resolved before any requirement that depends on the containing Tool or its effective protocol scope is applied.

<a id="req-tool-example-fields"></a>A Tool Example Object contains these core properties and MAY carry `x-*` specification extensions:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `input` | object | **Yes** | Complete `params.arguments` value from a `tools/call` request. |
| `result` | object | **Yes** | Complete applicable completed Tool Result payload, excluding the JSON-RPC envelope. |

<a id="req-tool-example-closed"></a>The Tool Example Object MUST NOT contain other additional properties. In particular, MCP Description 0.9.0 does not define `summary`, `description`, or `externalValue`.

<a id="req-tool-example-input-valid"></a>`input` MUST be an object and MUST validate against the containing Tool's `inputSchema` under every applicable protocol version's schema rules. A no-argument invocation MUST use `input: {}`. Schema-invalid values belong in negative test material, not conforming Tool Examples.

<a id="req-tool-example-result-shape"></a>`result` MUST contain `content` and MUST have the completed Tool Result shape defined by every applicable protocol version. For MCP 2026-07-28 it MUST contain `resultType: "complete"`. Fields that an applicable protocol version does not define follow [Section 3.6](#36-carried-mcp-values). <a id="req-tool-example-completed-form"></a>Task, input-required, streaming, progress, JSON-RPC envelope, and JSON-RPC protocol-error forms are not Tool Examples. <a id="req-tool-example-content-protocol-version"></a>Content blocks MAY use any text, image, audio, embedded-resource, or resource-link form supported by every applicable protocol version.

Where an applicable protocol version supports `_meta` on the completed result, content blocks, or embedded Resource Contents, that `_meta` is literal illustrative metadata governed by [Section 3.5](#35-mcp-_meta). It is not a schema or a request-metadata declaration. In MCP 2026-07-28, a result example MAY use `io.modelcontextprotocol/serverInfo` with an MCP Implementation value. Request-only and notification-only reserved keys are invalid in these contexts.

<a id="req-tool-example-success"></a>A successful result MUST omit `isError` or set it to `false`. It MAY contain `structuredContent` only in protocol versions that support that field. <a id="req-tool-example-structured-content"></a>If the Tool declares `outputSchema`, a successful result MUST contain `structuredContent`, which MUST validate against that schema under the applicable schema rules. Unstructured `content` remains required when `structuredContent` is present. If the Tool has no `outputSchema`, a successful result MAY contain `structuredContent` where the protocol version supports it, but MCP Description makes no schema-compatibility claim for that value.

<a id="req-tool-example-error-result"></a>A Tool execution-error result MUST set `isError` to `true`, MUST contain unstructured `content`, and MUST NOT contain `structuredContent`. `outputSchema` does not validate error content. JSON-RPC protocol errors and transport or intermediary failures that prevent a Tool Result are outside this model.

Example compatibility is a semantic conformance requirement. <a id="req-tool-example-incomplete-validation"></a>For protocol versions before MCP 2025-11-25, validators MUST enforce the constraints they can interpret without inventing an embedded-schema dialect. They SHOULD warn when complete compatibility validation is impossible and MUST NOT report incomplete validation as complete. An unresolved external `$ref` follows the policy in [Section 9.2](#92-input-and-output-schemas): validators preserve the schema and example, do not retrieve the target automatically, and warn that compatibility validation is incomplete. A schema-incompatible example is an error whenever complete evaluation is possible.

Tool `examples` and JSON Schema `examples` annotations are independent. Schema annotations remain suitable for anonymous values at an instance location; Tool Examples pair named complete invocations with completed results. <a id="req-tool-example-not-inferred"></a>Producers MUST NOT infer an author-supplied Tool Example by combining unrelated schema annotations.

Tool Examples are illustrative and non-exhaustive. They do not alter schemas, annotations, security requirements, side effects, or runtime behavior, and they do not guarantee that a live server returns a shown result. <a id="req-tool-example-tooling"></a>Documentation tooling SHOULD preserve names and input/result pairing. Mock or contract-test tooling MAY permit explicit selection by name. Such tooling MUST NOT execute a live Tool or reproduce declared side effects merely because an example exists. Selection without an explicit name MUST use a deterministic, documented policy and MUST NOT be presented as a prediction of live behavior.

Examples are untrusted descriptive content. <a id="req-tool-example-no-secrets"></a>Authors MUST NOT include secrets and SHOULD use conspicuously fictitious values. <a id="req-tool-example-untrusted"></a>Consumers MUST validate values, render content as data, and apply appropriate size and evaluation limits. They MUST NOT treat examples as authorization, proof of behavior, or safe executable instructions.

Tool Examples are MCP Description metadata, not fields of the MCP Tool type. <a id="req-tool-example-projection-omitted"></a>Native MCP projection ([Section 4.14](#414-native-mcp-projection)) MUST omit `examples` unless an independently specified MCP extension defines a destination. <a id="req-tool-example-views-preserved"></a>MCP Description round-tripping and Effective Protocol View projection ([Section 4.12](#412-effective-protocol-views-and-projection)) MUST preserve each selected Tool declaration's example map and MUST NOT merge maps from disjoint variants with the same Tool name.

### 9.4 Tool Interaction Examples

A Tool Object MAY contain `interactionExamples`, a non-empty map from a local scenario name to a Tool Interaction Example Object. <a id="req-interaction-examples-map"></a>Each name MUST match `^[A-Za-z0-9._-]+$`, is case-sensitive, and is scoped to the containing Tool declaration. The map is declaration-local: MCP Description 0.9.0 defines no `components` namespace for interaction scenarios.

Tool `interactionExamples` are separate from completed Tool `examples`. <a id="req-tool-example-not-interaction"></a>A producer MUST NOT place an incomplete workflow, semantic interaction step, or non-terminal Tool result in the completed `examples` map.

<a id="req-interaction-example-fields"></a>A Tool Interaction Example Object contains these core properties and MAY carry `x-*` specification extensions:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `input` | object | **Yes** | Complete initial `params.arguments` value from a `tools/call` request. |
| `steps` | non-empty array\<Tool Interaction Step Object\> | **Yes** | Ordered semantic client-input exchanges for this illustrated invocation. |
| `result` | object | **Yes** | Terminal completed Tool Result payload, excluding the JSON-RPC envelope. |

`input` follows the same schema-compatibility rules as Tool Example `input`. `result` follows the same completed success and execution-error rules as Tool Example `result`.

The scenario is illustrative and non-exhaustive. It asserts only that the shown steps occur in the displayed order in this example. It does not define branching, retries, correlation IDs, task state, transport framing, timing, or behavior for responses not shown.

<a id="req-interaction-step-fields"></a>Every Tool Interaction Step Object MUST contain `type`, `request`, and `response`. MCP Description 0.9.0 defines three step kinds:

| `type` | Request payload | Response payload |
|--------|-----------------|------------------|
| `elicitation` | Canonical elicitation request fields | Canonical elicitation response action and optional form content |
| `sampling` | Native `sampling/createMessage` parameters | Native completed sampling result |
| `roots` | Empty object | Native ordered `roots` result object |

<a id="req-interaction-step-closed"></a>Steps MAY carry `x-*` specification extensions. They MUST NOT contain any other fields beyond those defined for their step kind. Step `response` values are carried MCP values governed by [Section 3.6](#36-carried-mcp-values). A step is semantic MCP Description metadata, not a native MCP wire object. <a id="req-interaction-step-not-wire"></a>An implementation MUST NOT serialize a Tool Interaction Step directly onto an MCP connection.

An `elicitation` step MAY contain `declaration`, naming an Elicitation Declaration on the same Tool. <a id="req-interaction-elicitation-declaration"></a>When present, the request mode and the request schema or known URL MUST be compatible with that declaration after local reference resolution. <a id="req-interaction-elicitation-response"></a>For `mode: "form"`, an accepted response MUST contain `content` conforming to the request schema; declined and cancelled responses MUST NOT contain `content`. For `mode: "url"`, the response MUST omit `content`.

<a id="req-interaction-response-closed"></a>The Elicitation Interaction Response Object is closed. It MUST NOT contain fields other than `action`, `content`, and `_meta`. The action rules above determine when `content` is permitted. This closure applies to the response value in a Tool Interaction Example, not to the native MCP response received at runtime.

<a id="req-interaction-sampling-protocol-version"></a>A `sampling` step request uses the native `sampling/createMessage` parameter field names and constraints of every MCP protocol version in the containing Tool's effective protocol scope, excluding JSON-RPC, transport, task, and Multi Round-Trip Request framing. The request includes the required `messages` and `maxTokens`. It MAY include model preferences, system prompt, context inclusion, stop sequences, temperature, metadata, and Tool-related fields where the applicable protocol versions support them. Its response uses the native completed sampling result field names and constraints of every applicable protocol version, excluding JSON-RPC and task framing.

A `roots` step request is an empty object. Its response contains the ordered native `roots` declarations returned by the client for this illustration. Roots are descriptive input only; they do not authorize filesystem access.

The containing Tool's effective protocol scope controls validation. <a id="req-interaction-protocol-version-valid"></a>Every represented semantic field MUST be valid in every applicable protocol version. A Tool that spans materially incompatible interaction shapes MUST be split into disjoint protocol-scoped variants. `interactionExamples` themselves do not carry `protocolVersions`.

Tool `interactionExamples` do not add server capabilities, `clientRequirements`, or Elicitation Declarations. <a id="req-interaction-client-requirements-warning"></a>Validators SHOULD warn when a scenario contradicts an explicit primitive `clientRequirements` declaration. They MUST NOT infer a requirement when the Tool declares none.

Tool Interaction Examples are MCP Description metadata, not fields of the MCP Tool type. <a id="req-interaction-projection-omitted"></a>Native MCP projection ([Section 4.14](#414-native-mcp-projection)) MUST omit `interactionExamples` unless an independently specified MCP extension defines a destination. <a id="req-interaction-views-preserved"></a>Effective Protocol View projection ([Section 4.12](#412-effective-protocol-views-and-projection)) MUST preserve the selected Tool declaration's scenario map without combining disjoint variants. Merge tooling MUST NOT concatenate step arrays or guess how to combine unequal same-name scenarios.

Interaction scenarios are untrusted descriptive content. <a id="req-interaction-no-secrets"></a>Authors MUST use fictitious or sanitized values and MUST NOT include secrets, credentials, opaque runtime request state, task handles, or live session identifiers. <a id="req-interaction-untrusted"></a>Consumers MUST treat URLs, prompts, roots, and generated content as data and MUST NOT navigate, execute, or trust them merely because a scenario exists.

### 9.5 Protocol Variants and Security

<a id="req-tool-names-disjoint"></a>Tools with the same `name` MUST have pairwise-disjoint effective protocol scopes. Each Effective Protocol View therefore contains at most one Tool with that name. An omitted scope covers all root protocol versions and overlaps every scoped Tool with the same name.

Tool `security` describes statically known authorization required to call the Tool and replaces inherited transport or root security in full.

Tool `clientRequirements` applies only to invocation through `tools/call`. It does not state that a client needs those capabilities to discover the Tool through `tools/list`.

### 9.6 Tool Annotations

Tool Annotations provide hints about Tool behavior. They are distinct from the Resource Annotations used by Resources, Resource Templates, and content blocks (see [Section 10.3](#103-resource-annotations)). <a id="req-tool-annotations-fields"></a>A Tool `annotations` object MUST use the fields and semantics defined in this section. Resource Annotation fields such as `audience`, `priority`, and `lastModified` are not Tool Annotation fields.

All Tool Annotation fields, including `title`, are advisory. They are not guaranteed to describe Tool behavior faithfully. <a id="req-tool-annotations-untrusted"></a>Clients MUST treat Tool Annotations from untrusted servers as untrusted and MUST NOT make Tool-use decisions based on them.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | string | — | Human-readable title for the Tool |
| `readOnlyHint` | boolean | `false` | If `true`, the Tool does not modify its environment |
| `destructiveHint` | boolean | `true` | If `true`, the Tool may perform destructive updates |
| `idempotentHint` | boolean | `false` | If `true`, repeated calls with the same arguments have no additional effect |
| `openWorldHint` | boolean | `true` | If `true`, the Tool may interact with external entities |

<a id="req-tool-annotations-closed"></a>The Tool Annotations object contains only the fields above. MCP defines `ToolAnnotations` as a closed type in every supported protocol version, so other fields, including `x-*` keys, MUST NOT appear. Resource Annotation fields MUST NOT be used here.

### 9.7 Execution Object

The Execution Object describes whether a Tool supports task-augmented execution. It applies only to MCP 2025-11-25.

<a id="req-execution-fields"></a>

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `taskSupport` | string | `"forbidden"` | Whether the tool supports task-augmented execution: `"forbidden"`, `"optional"`, or `"required"` |

### 9.8 Example

```yaml
mcpdesc: 0.9.0
info:
  name: chess-rating-server
  title: Chess Rating MCP Server
  version: 1.0.0
protocolVersions:
  - "2026-07-28"
tools:
  - name: get_player_rating
    description: Get the current FIDE standard rating for a chess player
    inputSchema:
      type: object
      properties:
        player_id:
          description: FIDE player identifier
          type: string
      required:
        - player_id
    outputSchema:
      type: integer
      description: Current FIDE standard rating
    examples:
      fide-rating:
        input:
          player_id: planchaman
        result:
          resultType: complete
          content:
            - type: text
              text: The player's FIDE rating is 1701
          structuredContent: 1701
```

## 10. Resources and Resource Templates

### 10.1 Resources

The `resources` array declares the static resources exposed by the MCP server. Each resource represents a data source identified by a URI.

#### 10.1.1 Resource Object

<a id="req-resource-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP protocol versions to which this declaration applies. |
| `uri` | string (URI) | **Yes** | Resource URI. |
| `name` | string | **Yes** | Programmatic resource name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Available since MCP 2025-06-18. |
| `description` | string | No | Human-readable Resource description. |
| `mimeType` | string | No | MIME type of the Resource content. |
| `size` | integer | No | Size of the raw Resource content in bytes. |
| `annotations` | [Resource Annotations Object](#103-resource-annotations) | No | Audience, priority, and modification-time hints. |
| `examples` | map\<string, [Resource Example Object](#1042-static-resource-example-object)\> | No | Named completed Resource read examples. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Available since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. <a id="req-resource-tags-references"></a>When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that may be needed while reading the Resource (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the Resource is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Resource declaration, subject to [Section 3.5](#35-mcp-_meta). Available since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |
| `clientRequirements` | [Client Capability Requirements Object](#85-primitive-client-capability-requirements) | No | Unconditional minimum client capabilities required for `resources/read`; does not apply to `resources/list`. |

<a id="req-resource-size-integer"></a>When present, `size` MUST be an integer. This applies to Resource declarations and to resource link content blocks. MCP declares `size` as an unannotated `number`, which denotes an integer (see [Section 3.6](#36-carried-mcp-values)). MCP defines no minimum.

#### 10.1.2 Resource URI

The `uri` field identifies the Resource. <a id="req-resource-uri-syntax"></a>It MUST be an absolute URI with a scheme as defined by [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986), not a relative reference. This specification does not restrict the scheme. Servers MAY use custom URI schemes appropriate to their domain.

### 10.2 Resource Templates

The `resourceTemplates` array declares parameterized resource definitions using URI templates ([RFC 6570](https://www.rfc-editor.org/rfc/rfc6570)).

#### 10.2.1 Resource Template Object

<a id="req-resource-template-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP protocol versions to which this declaration applies. |
| `uriTemplate` | string | **Yes** | URI template (RFC 6570). |
| `name` | string | **Yes** | Programmatic template name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Available since MCP 2025-06-18. |
| `description` | string | No | Human-readable Resource Template description. |
| `mimeType` | string | No | MIME type of the Resource content. |
| `annotations` | [Resource Annotations Object](#103-resource-annotations) | No | Audience, priority, and modification-time hints. |
| `examples` | map\<string, [Resource Template Example Object](#1043-resource-template-example-object)\> | No | Named concrete URI and completed read-result examples. |
| `completionExamples` | map\<string, [Completion Example Object](#1046-resource-template-completion-examples)\> | No | Named `completion/complete` request-result observations for template variables. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Available since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. <a id="req-resource-template-tags-references"></a>When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that may be needed while reading an expanded Resource (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the Resource Template is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Resource Template declaration, subject to [Section 3.5](#35-mcp-_meta). Available since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |
| `clientRequirements` | [Client Capability Requirements Object](#85-primitive-client-capability-requirements) | No | Unconditional minimum client capabilities required to read a concrete URI produced from the template; does not apply to `resources/templates/list`. |

<a id="req-resource-template-uri-template"></a>`uriTemplate` MUST be a valid RFC 6570 URI template, whether or not the Resource Template has examples.

### 10.3 Resource Annotations

Resource Annotations provide optional client hints about how a Resource, Resource Template, or content block may be used or displayed. They are distinct from the behavioral [Tool Annotations](#96-tool-annotations) on a Tool Object.

| Property | Type | Description |
|----------|------|-------------|
| `audience` | array\<string\> | Intended audiences. Each value is `"user"` or `"assistant"`. |
| `priority` | number | Relative importance from `0` (least important) through `1` (most important). |
| `lastModified` | string | Resource modification time in ISO 8601 form. Available since MCP 2025-06-18. |

Every MCP protocol version supported by this specification defines Resource Annotations. MCP 2024-11-05 and MCP 2025-03-26 define only `audience` and `priority`. <a id="req-resource-annotations-last-modified"></a>`lastModified` MUST NOT appear where an applicable protocol version is MCP 2024-11-05 or MCP 2025-03-26.

Resource Annotations are hints, not access controls or integrity claims. <a id="req-resource-annotations-hints"></a>Consumers MUST NOT treat `audience` as authorization, `priority` as a mandatory processing order, or `lastModified` as proof of freshness.

<a id="req-resource-annotations-closed"></a>The object contains only the fields above. MCP defines `Annotations` as a closed type in every supported protocol version, so other fields, including `x-*` keys and Tool Annotation fields, MUST NOT appear.

Annotations on a Resource describe the Resource declaration returned by `resources/list`. Annotations on a Resource Template describe the template as a whole, not one particular URI expansion.

Named Resource examples represent completed `resources/read` results. Their entries follow the applicable MCP Resource Contents type, which does not define `annotations`. <a id="req-resource-annotations-not-in-examples"></a>Declaration annotations MUST NOT be copied into an example result. MCP Description 0.9.0 does not define per-example Resource Annotations.

MCP also uses the Resource Annotations type for content blocks: text, image, audio, embedded-resource, and resource-link content, where the applicable protocol version defines that block type. <a id="req-content-annotations-distinct"></a>When an MCP Description field embeds such content, its `annotations` MUST be treated as Resource Annotations, not Tool Annotations.

### 10.4 Named Resource Examples

#### 10.4.1 Shared Named-Map Rules

A Resource or Resource Template Object MAY contain an `examples` map. Each value is either an inline example object or a Reference Object (see [Section 17](#17-reusable-components-and-local-references)). A Resource references the `resourceExamples` component namespace, and a Resource Template references `resourceTemplateExamples`.

<a id="req-resource-examples-map"></a>When present, the map MUST contain at least one entry. Each name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and scoped to the containing declaration. They serve both as human-meaningful labels and as stable local selection names. Entry order is not semantically significant. MCP Description 0.9.0 does not define separate example prose fields.

<a id="req-resource-example-references-resolved"></a>A referenced example MUST be resolved before the URI, result-shape, content, and protocol-scope requirements of its use site are applied.

Declarations for the same `uri` or `uriTemplate` in disjoint effective protocol scopes have independent example maps.

#### 10.4.2 Static Resource Example Object

<a id="req-resource-example-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `result` | [Completed Resource Read Result](#1044-completed-resource-read-result) | **Yes** | Completed `resources/read` result payload for the containing Resource's `uri`, excluding the JSON-RPC envelope. |

The object MAY carry `x-*` specification extensions. No other fields are allowed. <a id="req-resource-example-closed"></a>The requested URI is the containing Resource's `uri`, so the example MUST NOT repeat it.

#### 10.4.3 Resource Template Example Object

<a id="req-resource-template-example-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `uri` | string | **Yes** | Concrete Resource URI sent as `params.uri` in the `resources/read` request. |
| `result` | [Completed Resource Read Result](#1044-completed-resource-read-result) | **Yes** | Completed `resources/read` result payload for `uri`, excluding the JSON-RPC envelope. |

The object MAY carry `x-*` specification extensions. No other fields are allowed.

<a id="req-resource-template-example-expansion"></a>`uri` MUST be a valid RFC 6570 expansion of the containing `uriTemplate`. It records the exact request value, not template variables inferred from it.

#### 10.4.4 Completed Resource Read Result

The `result` value is the `result` member of a successful JSON-RPC response. <a id="req-resource-example-contents"></a>It MUST contain a non-empty `contents` array.

<a id="req-resource-example-result-shape"></a>For MCP 2026-07-28, `result` MUST contain `resultType: "complete"`, a non-negative integer `ttlMs`, and `cacheScope` equal to `"public"` or `"private"`. These are required fields of the MCP `CacheableResult` type, which `ReadResourceResult` extends. Earlier protocol versions do not define these fields. When they appear for an earlier protocol version, [Section 3.6](#36-carried-mcp-values) governs them. A declaration whose scope includes MCP 2026-07-28 and an earlier protocol version MAY therefore use one example map for all of them.

<a id="req-resource-contents-meta"></a>Result `_meta` is available in every supported protocol version. Resource Contents `_meta` is available since MCP 2025-06-18. Both are literal illustrative values governed by [Section 3.5](#35-mcp-_meta), not reusable metadata contracts. In MCP 2026-07-28, result `_meta` MAY use `io.modelcontextprotocol/serverInfo` with an MCP Implementation value. Request-only and notification-only reserved keys are invalid here.

<a id="req-resource-example-completed-form"></a>JSON-RPC envelope fields, errors, task state, input-required state, and other incomplete workflows MUST NOT appear. MCP Description 0.9.0 does not represent Resource read errors, which are JSON-RPC errors, as Resource examples.

<a id="req-resource-contents-fields"></a>Every `contents` entry MUST contain `uri` and exactly one of `text` or `blob`. <a id="req-resource-example-blob-base64"></a>A `blob` value MUST be valid base64. <a id="req-resource-example-order"></a>An example MAY contain multiple entries. Consumers MUST preserve their order and MUST NOT assume that every returned URI equals the requested URI.

<a id="req-resource-example-requested-uri"></a>In both static and template examples, at least one returned entry SHOULD identify the requested URI, unless documented collection or indirection semantics explain otherwise. Every returned `uri` MUST be a valid URI.

<a id="req-resource-example-mime-type"></a>When the declaration has `mimeType`, the corresponding returned entry SHOULD use the same type. A validator SHOULD report a difference as a warning, not an error, because an individual representation may legitimately be more specific. The entry's own `mimeType` is authoritative for rendering that entry.

For a static Resource with `size`, tooling MAY compare the declared raw byte count with the matching example content: text encoded as UTF-8, or decoded binary. <a id="req-resource-example-size"></a>Tooling SHOULD report a mismatch as a warning, because examples and mutable Resources can represent different observations.

#### 10.4.5 Use, Projection, and Security

Resource examples are illustrative, non-exhaustive snapshots. They do not assert live equality, freshness, immutability, cache validity, or complete coverage. Result metadata is part of the example, not a guarantee about a live server. In particular, `ttlMs` and `cacheScope` reproduce the illustrated MCP 2026-07-28 result. They do not govern caching of the MCP Description document, and they do not authorize sharing captured or live content across authorization contexts.

<a id="req-resource-example-tooling"></a>Documentation tooling SHOULD preserve names, concrete template URIs, result fields, and content order. Mock and contract-test tooling MAY select an exact named example. Tooling of any kind MUST NOT dereference example URIs or fetch a live Resource while loading or serving an inline or referenced example. This specification defines no default example, wildcard match, template fallback, dynamic behavior, or external value.

Resource examples are MCP Description metadata, not fields of the MCP Resource or Resource Template types. <a id="req-resource-example-projection-omitted"></a>Native MCP projection ([Section 4.14](#414-native-mcp-projection)) MUST omit `examples` unless an independently specified MCP extension defines a destination. <a id="req-resource-example-views"></a>MCP Description round-tripping and Effective Protocol View projection ([Section 4.12](#412-effective-protocol-views-and-projection)) MUST preserve the selected declaration's example names and values and MUST NOT combine maps from declarations with disjoint scopes.

Examples and their URIs are untrusted. <a id="req-resource-example-no-secrets"></a>Authors MUST NOT include secrets and SHOULD use conspicuously fictitious content. Authors SHOULD decode and inspect binary content before publication. <a id="req-resource-example-untrusted"></a>Consumers MUST NOT dereference URIs automatically, MUST render content safely, MUST treat MIME types as untrusted hints, and SHOULD impose encoded-size, decoded-size, and processing limits.

#### 10.4.6 Resource Template Completion Examples

A Resource Template Object MAY contain `completionExamples`, a non-empty map from a local example name to an inline Completion Example Object. Unlike Resource Template `examples`, `completionExamples` entries cannot be Reference Objects and have no component namespace. The containing Resource Template identifies the completion target.

<a id="req-template-completion-examples-map"></a>Each name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and scoped to the containing Resource Template declaration. Entry order is not semantically significant. A Completion Example Object MAY carry `x-*` specification extensions and contains these fields:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `argument` | object | **Yes** | The template variable being completed, with required string `name` and `value`. |
| `context` | object | No | Already-supplied template variable values, in an `arguments` map. |
| `result` | object | **Yes** | Completed `completion/complete` result payload for the applicable protocol versions, excluding the JSON-RPC envelope. |

<a id="req-template-completion-example-closed"></a>The Completion Example Object MUST NOT contain other unprefixed fields. The `argument` object MUST contain the string fields `name` and `value`.

<a id="req-template-completion-target"></a>`argument.name` MUST identify one RFC 6570 variable in the containing `uriTemplate`. Every `context.arguments` key MUST identify another variable from the same template, and the completed argument MUST NOT also appear in `context`. Variable identity comes from parsing RFC 6570 expressions. Operators and modifiers do not change the variable name: `{+path}` identifies `path`, `{id:3}` identifies `id`, and `{owner,repository}` identifies both `owner` and `repository`.

`context` MAY be omitted. <a id="req-template-completion-context-shape"></a>When present, it MUST contain a non-empty `arguments` map whose values are strings. An empty context MUST be omitted rather than represented as an empty object.

<a id="req-template-completion-context-protocol-version"></a>MCP 2025-03-26 does not define completion context. When a completion example needs `context` and the Resource Template's scope includes MCP 2025-03-26 and a later protocol version, the Resource Template MUST be split into disjoint protocol-scoped declarations.

<a id="req-template-completion-result"></a>`result` MUST contain `completion.values`, an ordered array of string candidates. It MAY include `completion.total`, `completion.hasMore`, and result `_meta` where the applicable protocol versions define them. For MCP 2026-07-28, it MUST contain `resultType: "complete"`. Fields that an applicable protocol version does not define follow [Section 3.6](#36-carried-mcp-values). JSON-RPC envelope fields, errors, and incomplete workflows are not completion examples. Resource Template completion examples are valid only in an effective protocol scope where MCP defines completion and every represented field. <a id="req-template-completion-protocol-versions"></a>MCP Description does not support completion examples for MCP 2024-11-05.

Completion examples are illustrative and non-exhaustive. They do not create enums, defaults, or authorization grants. They do not promise that a future request yields the same candidates, ordering, total, or pagination state.

<a id="req-template-completion-projection-omitted"></a>Native MCP projection ([Section 4.14](#414-native-mcp-projection)) MUST omit `completionExamples` unless an independently specified MCP extension defines a destination. <a id="req-template-completion-views"></a>MCP Description round-tripping and Effective Protocol View projection ([Section 4.12](#412-effective-protocol-views-and-projection)) MUST preserve the selected declaration's `completionExamples` map and MUST NOT merge maps from disjoint protocol variants.

### 10.5 Protocol Variants and Security

<a id="req-resource-scopes-disjoint"></a>Resources with the same `uri` MUST have pairwise-disjoint effective protocol scopes. Resource Templates with the same `uriTemplate` MUST likewise have pairwise-disjoint effective protocol scopes. Each Effective Protocol View therefore contains at most one Resource with a given `uri` and at most one Resource Template with a given `uriTemplate`.

Resource `security` describes statically known authorization required to access the Resource. Resource Template `security` describes authorization required to access Resources through the template. Each replaces inherited transport or root security in full.

Resource `clientRequirements` applies only to `resources/read` of its URI. Resource Template `clientRequirements` applies only to `resources/read` of a concrete URI produced from the template. Neither applies to `resources/list` or `resources/templates/list`.

### 10.6 Example

```yaml
mcpdesc: 0.9.0
info:
  name: chess-reference-server
  title: Chess Reference MCP Server
  version: 1.0.0
protocolVersions:
  - "2026-07-28"
resources:
  - uri: chess://leaderboard/classical
    name: classical_leaderboard
    title: Classical Leaderboard
    description: Current top-100 classical chess ratings leaderboard
    mimeType: application/json
    annotations:
      audience:
        - user
        - assistant
      priority: 0.9
      lastModified: "2026-08-24T10:00:00Z"
    examples:
      top-two:
        result:
          resultType: complete
          ttlMs: 60000
          cacheScope: public
          contents:
            - uri: chess://leaderboard/classical
              mimeType: application/json
              text: '{"players":[{"name":"Example A","rating":2810},{"name":"Example B","rating":2795}]}'
  - uri: chess://rules/fide-laws
    name: fide_rules
    title: FIDE Laws of Chess
    description: Official FIDE Laws of Chess
    mimeType: text/markdown
resourceTemplates:
  - uriTemplate: chess://games/{game_id}
    name: game_detail
    title: Game Detail
    description: Full details of a specific chess game including PGN, moves, and analysis
    mimeType: application/json
    annotations:
      audience:
        - assistant
      priority: 0.7
    examples:
      sample-game:
        uri: chess://games/example-1234
        result:
          resultType: complete
          ttlMs: 60000
          cacheScope: private
          contents:
            - uri: chess://games/example-1234
              mimeType: application/json
              text: '{"id":"example-1234","result":"1-0"}'
  - uriTemplate: chess://players/{player_id}/games{?from,to}
    name: player_game_history
    title: Player Game History
    description: Game history for a specific player within an optional date range
    mimeType: application/json
```

## 11. Prompts

The `prompts` array declares the prompt templates exposed by the MCP server. Each Prompt is a server-side template that clients can retrieve with arguments to generate messages.

### 11.1 Prompt Object

<a id="req-prompt-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP protocol versions to which this declaration applies. |
| `name` | string | **Yes** | Programmatic prompt name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Available since MCP 2025-06-18. |
| `description` | string | No | Human-readable Prompt description. |
| `arguments` | non-empty array\<[Prompt Argument](#112-prompt-argument-object)\> | No | Prompt arguments. |
| `examples` | map\<string, [Prompt Example Object](#113-named-prompt-examples)\> | No | Named completed Prompt retrieval examples. |
| `completionExamples` | map\<string, [Completion Example Object](#114-prompt-completion-examples)\> | No | Named `completion/complete` request-result observations for Prompt arguments. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Available since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. <a id="req-prompt-tags-references"></a>When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that may be needed while retrieving the Prompt (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the Prompt is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Prompt declaration, subject to [Section 3.5](#35-mcp-_meta). Available since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |
| `clientRequirements` | [Client Capability Requirements Object](#85-primitive-client-capability-requirements) | No | Unconditional minimum client capabilities required for `prompts/get`; does not apply to `prompts/list`. |

### 11.2 Prompt Argument Object

<a id="req-prompt-argument-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Programmatic argument name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Since MCP 2025-06-18. |
| `description` | string | No | Human-readable argument description. |
| `required` | boolean | No | Whether the argument is required. |

### 11.3 Named Prompt Examples

A Prompt Object MAY contain an `examples` map. Each value is either an inline Prompt Example Object or a Reference Object targeting `#/components/promptExamples/<name>` (see [Section 17](#17-reusable-components-and-local-references)).

<a id="req-prompt-examples-map"></a>When present, the map MUST contain at least one entry. Each name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and scoped to the containing Prompt declaration. They serve both as human-meaningful labels and as stable local selection names. Entry order is not semantically significant.

<a id="req-prompt-example-references-resolved"></a>A referenced example MUST be resolved before the requirements of the containing Prompt and its effective protocol scope are applied.

<a id="req-prompt-example-fields"></a>A Prompt Example Object contains these fields and MAY carry `x-*` specification extensions:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `arguments` | map\<string, string\> | No | Complete `prompts/get` `params.arguments` value. Omitting it and using `{}` both mean no arguments. |
| `result` | object | **Yes** | Completed `GetPromptResult` payload for the applicable protocol versions, excluding the JSON-RPC envelope. |

<a id="req-prompt-example-closed"></a>The Prompt Example Object MUST NOT contain other fields.

`arguments` MAY be omitted. <a id="req-prompt-example-arguments-shape"></a>When present, it MUST be an object whose values are strings. <a id="req-prompt-example-arguments"></a>Every key MUST identify an argument declared by the containing Prompt, and every declared argument with `required: true` MUST be present. Optional arguments MAY be omitted.

<a id="req-prompt-example-completed-form"></a>The example MUST NOT contain transport metadata, JSON-RPC IDs, method names, or request `_meta`.

<a id="req-prompt-example-result-shape"></a>`result` MUST contain the `messages` array. Message order is significant. `result` MUST have the completed Prompt result shape defined by every applicable protocol version. For MCP 2026-07-28, it MUST contain `resultType: "complete"`. Fields that an applicable protocol version does not define follow [Section 3.6](#36-carried-mcp-values). `result` MAY include the result `description`. Task, input-required, streaming, partial, and JSON-RPC error forms are not Prompt examples.

Result `_meta` and message content `_meta`, where the applicable protocol versions support them, are literal illustrative values governed by [Section 3.5](#35-mcp-_meta). They are not request metadata or schema declarations. <a id="req-prompt-example-content-protocol-version"></a>Message `content` MAY use any content-block form supported by every applicable protocol version.

Prompt examples are illustrative and non-exhaustive. They do not change Prompt arguments, capabilities, security, client requirements, or runtime behavior. They do not guarantee deterministic or current output.

<a id="req-prompt-example-tooling"></a>Documentation tooling SHOULD preserve example names and the pairing of arguments with results. Mock or contract-test tooling MAY let users select an example by name. It MUST NOT pick an example without an explicit name and present it as a prediction of live behavior.

Examples are untrusted descriptive content. <a id="req-prompt-example-no-secrets"></a>Authors MUST NOT include secrets and SHOULD use conspicuously fictitious values. <a id="req-prompt-example-untrusted"></a>Consumers MUST validate values, render content as data, and apply appropriate size and evaluation limits. They MUST NOT treat examples as authorization, proof of behavior, or safe executable instructions.

Prompt examples are MCP Description metadata, not fields of the MCP Prompt type. <a id="req-prompt-example-projection-omitted"></a>Native MCP projection ([Section 4.14](#414-native-mcp-projection)) MUST omit `examples` unless an independently specified MCP extension defines a destination. <a id="req-prompt-example-views"></a>MCP Description round-tripping and Effective Protocol View projection ([Section 4.12](#412-effective-protocol-views-and-projection)) MUST preserve each selected Prompt declaration's example map and MUST NOT merge maps from disjoint variants with the same Prompt name.

### 11.4 Prompt Completion Examples

A Prompt Object MAY contain `completionExamples`, a non-empty map from a local example name to an inline Completion Example Object. Unlike Prompt `examples`, `completionExamples` entries cannot be Reference Objects and have no component namespace. The containing Prompt declaration identifies the completion target.

<a id="req-prompt-completion-examples-map"></a>Each name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and scoped to the containing Prompt declaration. Entry order is not semantically significant. A Completion Example Object MAY carry `x-*` specification extensions and contains these fields:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `argument` | object | **Yes** | The Prompt argument being completed, with required string `name` and `value`. |
| `context` | object | No | Already-supplied Prompt argument values, in an `arguments` map. |
| `result` | object | **Yes** | Completed `completion/complete` result payload for the applicable protocol versions, excluding the JSON-RPC envelope. |

<a id="req-prompt-completion-example-closed"></a>The Completion Example Object MUST NOT contain other unprefixed fields. The `argument` object MUST contain the string fields `name` and `value`.

<a id="req-prompt-completion-target"></a>`argument.name` MUST identify one declared Prompt Argument. Every `context.arguments` key MUST identify another declared Prompt Argument, and the completed argument MUST NOT also appear in `context`. `context` MAY be partial. Omitting a required Prompt argument means only that the illustrated completion request did not provide it.

`context` MAY be omitted. <a id="req-prompt-completion-context-shape"></a>When present, it MUST contain a non-empty `arguments` map whose values are strings. An empty context MUST be omitted rather than represented as an empty object.

<a id="req-prompt-completion-context-protocol-version"></a>MCP 2025-03-26 does not define completion context. When a completion example needs `context` and the Prompt's scope includes MCP 2025-03-26 and a later protocol version, the Prompt MUST be split into disjoint protocol-scoped declarations.

<a id="req-prompt-completion-result"></a>`result` MUST contain `completion.values`, an ordered array of string candidates. It MAY include `completion.total`, `completion.hasMore`, and result `_meta` where the applicable protocol versions define them. For MCP 2026-07-28, it MUST contain `resultType: "complete"`. Fields that an applicable protocol version does not define follow [Section 3.6](#36-carried-mcp-values). JSON-RPC envelope fields, errors, and incomplete workflows are not Prompt completion examples. Prompt completion examples are valid only in an effective protocol scope where MCP defines completion and every represented field. <a id="req-prompt-completion-protocol-versions"></a>MCP Description does not support completion examples for MCP 2024-11-05.

Completion examples are illustrative and non-exhaustive. They do not change Prompt arguments, retrieval requirements, capabilities, security, or runtime behavior. They do not turn candidates into enums, defaults, or claims of future availability.

<a id="req-prompt-completion-projection-omitted"></a>Native MCP projection ([Section 4.14](#414-native-mcp-projection)) MUST omit `completionExamples` unless an independently specified MCP extension defines a destination. <a id="req-prompt-completion-views"></a>MCP Description round-tripping and Effective Protocol View projection ([Section 4.12](#412-effective-protocol-views-and-projection)) MUST preserve each selected Prompt declaration's `completionExamples` map and MUST NOT merge maps from disjoint variants with the same Prompt name.

### 11.5 Protocol Variants and Security

<a id="req-prompt-scopes-disjoint"></a>Prompts with the same `name` MUST have pairwise-disjoint effective protocol scopes. Each Effective Protocol View therefore contains at most one Prompt with a given `name`.

Prompt `security` describes statically known authorization required to retrieve the Prompt and replaces inherited transport or root security in full.

Prompt `clientRequirements` applies only to retrieval through `prompts/get`. It does not state that a client needs those capabilities to discover the Prompt through `prompts/list`.

### 11.6 Example

```yaml
mcpdesc: 0.9.0
info:
  name: city-briefing-server
  title: City Briefing MCP Server
  version: 1.0.0
protocolVersions:
  - "2025-11-25"
  - "2026-07-28"
prompts:
  - name: greeting
    protocolVersions:
      - "2025-11-25"
    examples:
      default:
        result:
          messages:
            - role: assistant
              content:
                type: text
                text: Hello MCP clients.
  - name: greeting
    protocolVersions:
      - "2026-07-28"
    examples:
      default:
        result:
          resultType: complete
          messages:
            - role: assistant
              content:
                type: text
                text: Hello modern MCP clients
                  - name: city_briefing
    title: City Briefing
    description: Generate a role-specific city briefing
    protocolVersions:
      - "2026-07-28"
    arguments:
      - name: city
        required: true
      - name: audience
    examples:
      paris-teenagers:
        arguments:
          city: Paris
          audience: teenagers
        result:
          resultType: complete
          description: Briefing for teenagers in Paris
          messages:
            - role: user
              content:
                type: text
                text: Summarize current considerations for teenagers in Paris
```

## 12. Elicitation Declarations

### 12.1 Purpose and Placement

An Elicitation Declaration documents that fulfilling a Tool, Resource, Resource Template, or Prompt may require additional interaction with the user through the MCP client.

Tool, Resource, Resource Template, and Prompt Objects MAY contain an `elicitations` array of Elicitation Declaration Objects. <a id="req-elicitations-non-empty"></a>When present, the array MUST contain at least one declaration.

A Resource Template declaration applies to `resources/read` operations on concrete Resource URIs produced from that template. It does not describe elicitation during template discovery.

An Elicitation Declaration describes stable server behavior, not the protocol-specific wire exchange. It does not assert that every request triggers the interaction or that every client can complete it. <a id="req-elicitation-not-capability"></a>Consumers MUST NOT treat an Elicitation Declaration by itself as an unconditional `clientRequirements.elicitation` requirement (see [Section 8.5](#85-primitive-client-capability-requirements)).

### 12.2 Elicitation Declaration Object

<a id="req-elicitation-declaration-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Stable local declaration name. |
| `mode` | `"form"` or `"url"` | **Yes** | Canonical elicitation mode. |
| `message` | string | **Yes** | Representative user-facing explanation of the interaction. |
| `when` | string | No | Human-readable description of when the interaction may occur. |
| `requestedSchema` | object or Reference Object | Conditional | Inline or reusable restricted MCP form-response schema. See [Section 12.3](#123-form-mode). |
| `url` | string (URI) | No | Static URL, when known at authoring time. See [Section 12.4](#124-url-mode). |
| `onDecline` | string | No | Human-readable expected behavior after the user explicitly declines. |
| `onCancel` | string | No | Human-readable expected behavior after the user cancels or dismisses the interaction. |
| `protocolVersions` | array\<string\> | No | MCP protocol versions to which this declaration applies. See [Section 12.5](#125-protocol-applicability). |

<a id="req-elicitation-name-format"></a>`name` MUST match `^[A-Za-z0-9._-]+$`. <a id="req-elicitation-name-unique"></a>Names are case-sensitive and MUST be unique within the containing primitive declaration.

<a id="req-elicitation-message"></a>`message` MUST be non-empty. It documents the explanation the user should receive. It MAY be representative or default wording when runtime context changes the exact text. <a id="req-elicitation-runtime-wording"></a>Runtime wording SHOULD NOT materially contradict the documented purpose, but MCP Description does not require an exact match.

<a id="req-elicitation-documentation-fields"></a>`when`, `onDecline`, and `onCancel`, when present, MUST be non-empty. They are descriptive documentation, not executable expressions, client instructions, or statically provable guarantees.

MCP permits omitting `mode` at runtime for form elicitation. MCP Description requires `mode` so that each declaration has one canonical static form.

### 12.3 Form Mode

For `mode: "form"`:

- <a id="req-elicitation-form-schema-required"></a>`requestedSchema` is REQUIRED;
- <a id="req-elicitation-form-no-url"></a>`url` MUST NOT appear; and
- <a id="req-elicitation-form-shape"></a>`requestedSchema` MUST describe an object with only the property schemas allowed by every applicable MCP protocol version.

`requestedSchema` MAY be a Reference Object targeting the `schemas` component namespace (see [Section 17](#17-reusable-components-and-local-references)). <a id="req-elicitation-schema-references-resolved"></a>A referenced schema MUST be resolved before the vocabulary and protocol-scope requirements of this section are applied.

The schema is a flat object whose properties use MCP elicitation primitive schemas. Nested objects are invalid, as are arrays other than the multi-select enum forms that MCP supports. Unsupported keywords and unsupported string formats are invalid.

The supported vocabulary depends on the protocol version:

- MCP 2025-06-18 supports string, number, integer, boolean, and legacy string-enum property schemas. It permits string length constraints, the `email`, `uri`, `date`, and `date-time` formats, numeric bounds, boolean defaults, and optional `enumNames` matching the enum values. It does not define `$schema`, defaults for strings, numbers, or enums, titled `oneOf` enums, or multi-select arrays.
- MCP 2025-11-25 and MCP 2026-07-28 also support defaults for all primitive types, standard titled single-select enums, titled and untitled multi-select enums, and the legacy `enumNames` form.

<a id="req-elicitation-form-vocabulary"></a>Validators MUST apply the vocabulary of every applicable protocol version.

<a id="req-elicitation-form-required"></a>A `required` entry MUST name a property declared in `properties`. <a id="req-elicitation-form-enum-names"></a>`enumNames`, when present, MUST contain one display name for every enum value. <a id="req-elicitation-form-defaults"></a>An enum default MUST be one of its declared values, and every multi-select default value MUST be one of its declared item choices. <a id="req-elicitation-form-ranges"></a>A minimum constraint MUST NOT exceed its corresponding maximum constraint.

### 12.4 URL Mode

For `mode: "url"`:

- <a id="req-elicitation-url-no-schema"></a>`requestedSchema` MUST NOT appear;
- <a id="req-elicitation-url-syntax"></a>`url`, when present, MUST be a syntactically valid URI; and
- omitting `url` means the concrete URL is generated or selected at runtime.

Omitting `url` does not make the URL optional at runtime. A runtime URL-mode elicitation still includes every field that the applicable MCP protocol version requires.

Validation of `url` checks syntax only. <a id="req-elicitation-url-no-fetch"></a>Validators and other consumers MUST NOT retrieve, prefetch, dereference, or otherwise access it while processing a description. A valid `url` does not assert that the target is available, trusted, immutable, controlled by the server, or suitable for automatic navigation.

### 12.5 Protocol Applicability

When `protocolVersions` is omitted, the declaration inherits the effective scope of its containing primitive (see [Section 4.10](#410-protocol-scopes-and-inheritance)). <a id="req-elicitation-scope"></a>An explicit scope MUST be non-empty and MUST be a subset of the containing primitive's effective scope.

Mode support by protocol version:

- MCP 2025-06-18 supports form mode.
- MCP 2025-11-25 supports form and URL modes.
- MCP 2026-07-28 supports form and URL modes.

<a id="req-elicitation-protocol-versions"></a>A declaration that applies to multiple protocol versions MUST satisfy every one of them. When no single declaration can do so, authors MUST describe the containing primitive as separate protocol-scoped variants (see Sections [9.5](#95-protocol-variants-and-security), [10.5](#105-protocol-variants-and-security), and [11.5](#115-protocol-variants-and-security)).

Complete protocol-version-specific validation begins with MCP 2025-06-18. <a id="req-elicitation-legacy-incomplete"></a>For MCP 2024-11-05 and MCP 2025-03-26, validators apply the legacy validation scope in [Section 16.2](#162-implementation-conformance) and MUST NOT report complete MCP semantic conformance.

### 12.6 Static-Description Boundary

The applicable MCP protocol version remains authoritative for execution. MCP Description does not model whether elicitation uses a server-initiated request or Multi Round-Trip Requests. It also does not model lifecycle messages, identifiers, request state, retries, correlation, capability negotiation, or transport behavior. Primitive `clientRequirements` may record an unconditional minimum elicitation capability without defining any of these exchanges (see [Section 8.5](#85-primitive-client-capability-requirements)).

A mock, gateway, documentation tool, or client MAY use a declaration to render its message, collect a form response matching `requestedSchema`, or present a known URL. The declaration alone does not define when a mock triggers the interaction, how it chooses among declarations, how responses change state, or which final primitive result follows.

Elicitation Declarations are distinct from named primitive examples:

- Tool Examples pair a complete invocation with a completed Tool Result.
- Tool `interactionExamples` add ordered client-input steps to one Tool invocation.
- Resource Examples contain completed read results.
- Prompt Examples contain completed `prompts/get` results.

None of these preserve JSON-RPC envelopes, Multi Round-Trip Request state, retries, or timing, and none is a general executable workflow language.

The applicable MCP elicitation specification remains authoritative for runtime security and privacy requirements. MCP Description validation does not inspect or certify runtime behavior, privacy compliance, or security conformance. It defines no sensitive-field diagnostic.

### 12.7 Example

```yaml
tools:
  - name: assign_issue
    description: Assign an issue to a teammate.
    inputSchema:
      type: object
      properties:
        issue:
          type: integer
        assignee:
          type: string
      required: [issue]
      additionalProperties: false
    elicitations:
      - name: choose_assignee
        mode: form
        when: No assignee was supplied.
        message: Who should own this issue?
        requestedSchema:
          type: object
          properties:
            assignee:
              type: string
              title: Assignee
          required: [assignee]
        onDecline: Leave the issue unassigned.
        onCancel: Abort without modifying the issue.
```

## 13. Tags

The root `tags` array is a flat, document-wide tag catalog for the MCP server. Tags are MCP Description metadata, not fields defined by the MCP protocol. <a id="req-tags-non-empty"></a>The array is OPTIONAL and MUST be non-empty when present. <a id="req-tags-omitted"></a>Producers MUST omit `tags` when they declare no catalog entries.

When present, `tags` lists the tag names that Tools, Resources, Resource Templates, and Prompts can reference. <a id="req-tags-display-order"></a>Array order sets display priority: user interfaces and documentation SHOULD present earlier tags first.

### 13.1 Tag Object

<a id="req-tag-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Tag name, unique within the root `tags` array (see [Section 13.2](#132-tag-uniqueness)). |
| `description` | string | No | Human-readable description of the tag's purpose. |

### 13.2 Tag Uniqueness

<a id="req-tags-unique"></a>Tag names MUST be unique within the root `tags` array. Validators MUST reject a document that contains duplicate tag names.

### 13.3 Tag References

A Tool, Resource, Resource Template, or Prompt can carry its own `tags` array of tag names. <a id="req-entity-tags-shape"></a>A primitive's `tags` array MUST be non-empty when present and MUST contain only strings. <a id="req-entity-tags-unique"></a>It MUST NOT contain duplicate values.

<a id="req-tags-references"></a>When the root `tags` array is present, every tag that a primitive references MUST be declared in it. When the root `tags` array is absent, primitive tags are unconstrained strings.

### 13.4 Protocol Scopes and Effective Protocol Views

The root tag catalog is not protocol-scoped. A tag categorizes primitives across the whole document; it does not describe protocol behavior. <a id="req-tags-views"></a>An Effective Protocol View MUST preserve the complete root tag catalog, including entries that no primitive in that view references.

Protocol-scoped variants of the same primitive MAY use different `tags` arrays. When the root catalog is present, every reference in every variant is validated against it.

<a id="req-tags-merge"></a>Merge inputs MUST agree on the root tag catalog under the merge rules for unscoped metadata (see [Section 4.13](#413-merge)). Merge tooling MUST NOT infer, discard, or synthesize catalog entries from the tags referenced in individual views.

Elicitation Declarations do not carry tags. Each one is nested within a Tool, Resource, Resource Template, or Prompt, which can already be tagged. Extending tags to nested declarations would need its own use case and compatibility review.

### 13.5 Example

A root tag catalog referenced by two Tools and a Resource:

```json
{
  "tags": [
    { "name": "analysis", "description": "Game analysis tools" },
    { "name": "rating", "description": "Player and game rating tools" },
    { "name": "history", "description": "Game history and records" },
    { "name": "leaderboard", "description": "Ranking leaderboards" },
    { "name": "player", "description": "Player-specific data" }
  ],
  "tools": [
    {
      "name": "analyze_game",
      "tags": ["analysis"]
    },
    {
      "name": "get_player_rating",
      "tags": ["rating", "player"]
    }
  ],
  "resources": [
    {
      "uri": "chess://leaderboards/classical",
      "name": "classical_leaderboard",
      "tags": ["leaderboard", "rating"]
    }
  ]
}
```

## 14. Specification Extensions

MCP Description documents can carry vendor-specific metadata in specification extensions. Extensions are allowed only on the eligible semantic objects listed in Section 14.2.

### 14.1 Extension Naming

<a id="req-extension-names"></a>Specification extension properties MUST match the pattern `^x-`. Names are case-sensitive. <a id="req-extension-naming-convention"></a>The RECOMMENDED naming convention is:

```
x-{organization}-{feature}
```

<a id="req-extension-lowercase-prefixes"></a>Authors SHOULD use lowercase organization prefixes. Examples include `x-acme-owner`, `x-example-runtime-observations`, and `x-example-cost-profile`.

### 14.2 Extension Placement

A specification extension MAY appear directly on the root MCP Description Object or another eligible MCP Description-defined semantic object. Eligible categories in 0.9.0 are:

- Info, Contact, License, Icon, and Tag Objects;
- Transport Objects and MCP Description-defined transport configuration objects;
- Security Scheme, OAuth Flows, and OAuth Flow Objects;
- the Capabilities Object, Client Capability Requirements Object, and MCP Description-defined capability declaration objects;
- Tool, Resource, Resource Template, Prompt, Prompt Argument, and Elicitation Declaration Objects;
- MCP Description-defined named Tool, Resource, and Resource Template Example wrapper objects; and
- the outer Components Object and semantic Tool, Resource, and Resource Template Example component values.

Eligibility depends on the object's role in this specification, not on whether its serialized value is a JSON object. An eligible object that appears as a map value MAY carry extensions. The map that contains it does not become eligible.

<a id="req-extension-ineligible-locations"></a>Specification extensions MUST NOT appear directly on:

- scalar values;
- domain-keyed maps;
- Security Requirement Objects;
- the `capabilities.extensions` or `clientRequirements.extensions` protocol-extension map;
- embedded JSON Schemas;
- carried MCP payload, result, annotation, or `_meta` objects;
- opaque example or extension values;
- arbitrary JSON payloads; or
- Reference Objects, unless the Reference Object specification explicitly defines adjacent-extension resolution behavior.

Those locations follow the rules of their owning format or object model.

<a id="req-extension-component-names"></a>An `x-*` key inside a component namespace map is an ordinary component name and its value MUST satisfy that namespace's component type.

### 14.3 Extension Values

An extension value MAY be any JSON-compatible value: object, array, string, number, boolean, or null. <a id="req-extension-object-values"></a>Authors SHOULD prefer an object when the value may evolve compatibly.

### 14.4 Processing Rules

<a id="req-extension-unknown-accepted"></a>An implementation that does not recognize a specification extension MUST NOT reject the document because of that extension. It MUST ignore the extension when interpreting core MCP Description semantics and SHOULD preserve it when processing and reserializing the document.

<a id="req-extension-no-core-override"></a>A specification extension MUST NOT redefine, contradict, or weaken a core requirement. It cannot make a required field optional, change `security` or protocol applicability, or make an invalid example conforming. Core fields remain authoritative.

A validator MAY validate a recognized extension using a configured trusted schema. <a id="req-extension-schema-unavailable"></a>Failure to obtain that schema MUST NOT invalidate an otherwise conforming document unless the validator is applying a separate profile that requires the extension.

### 14.5 Ownership, Projection, and Merge

An object-level extension belongs to its containing semantic object and follows that object's lifecycle and Effective Protocol View. A `protocolVersions` property nested inside an extension value does not scope anything.

<a id="req-extension-views"></a>A single-version projection MUST preserve every `x-*` property on a retained eligible object unless extension stripping was explicitly requested. Projection MUST NOT move an extension, combine it with `_meta`, or reinterpret it as an MCP protocol extension. Removing an out-of-scope object also removes its extensions. Native MCP projection (Section 4.14) produces MCP values rather than an MCP Description document. It omits all `x-*` properties except those inside embedded JSON Schemas.

Extension values are part of their containing object's semantic content. Merge tools MAY collapse objects with semantically equivalent extension values under the merge rules in Section 4.13. <a id="req-extension-merge"></a>For conflicting values on corresponding objects, a merge tool MUST retain distinct non-overlapping variants where representable or report a conflict. It MUST NOT guess, silently discard an extension, or move it to another object.

### 14.6 Extension Documentation

<a id="req-extension-documentation"></a>Extension authors SHOULD publish a JSON Schema for the value, purpose and semantic documentation, versioning information, and the eligible MCP Description object types on which the extension is valid.

### 14.7 Relationship to Other Extension Mechanisms

Object-level `x-*`, literal MCP `_meta`, formal MCP `capabilities.extensions`, and formal MCP `clientRequirements.extensions` are separate mechanisms. <a id="req-extension-mechanisms-separate"></a>Tooling MUST NOT automatically copy, project, or reinterpret data among them.

- `x-*` is MCP Description-specific vendor metadata.
- `_meta` represents literal MCP metadata in supported contexts.
- `capabilities.extensions` declares server extension support.
- `clientRequirements.extensions` declares an unconditional primitive-level client extension requirement.

### 14.8 Security and Privacy

<a id="req-extension-no-secrets"></a>Authors MUST NOT publish credentials, tokens, user identifiers, confidential topology, live trace identifiers, or other secrets in extensions. <a id="req-extension-untrusted"></a>Consumers MUST treat extension names and values as untrusted content and apply appropriate size, output-encoding, rendering, logging, and execution controls. Validators SHOULD avoid automatic network retrieval of extension schemas.

### 14.9 Example

```json
{
  "mcpdesc": "0.9.0",
  "info": {
    "name": "account-service",
    "version": "1.0.0",
    "x-acme-owner": { "team": "identity" }
  },
  "protocolVersions": ["2026-07-28"],
  "tools": [
    {
      "name": "delete_account",
      "inputSchema": { "type": "object" },
      "x-acme-governance": {
        "risk": "high",
        "reviewRequired": true
      }
    }
  ]
}
```

## 15. Serialization

### 15.1 Conforming Serializations

An MCP Description MAY be serialized as JSON or as restricted YAML. Both serializations decode to the same JSON-compatible data model (see [Section 3.1](#31-format)), and the same JSON Schema and semantic validation apply to both. Neither serialization is required or preferred.

<a id="req-serialization-support"></a>A conforming document consumer or producer MUST support at least one conforming serialization. It MUST declare, for each input or output it supports, whether it accepts or emits JSON, YAML, or both.

### 15.2 JSON Serialization

<a id="req-serialization-json"></a>JSON serialization MUST conform to [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) and MUST be encoded in UTF-8.

<a id="req-serialization-json-claims"></a>A consumer that claims JSON input support MUST accept conforming JSON MCP Description documents. A producer that claims JSON output support MUST emit conforming JSON MCP Description documents.

The recommended file extension is `.mcpdesc.json`. The recommended media type is `application/mcp-description+json`.

### 15.3 YAML Serialization

An MCP Description MAY be serialized as YAML 1.2.2 under the restricted profile defined in this section. The profile uses the JSON schema tag-resolution rules in Section 10.2.2 of the [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/), with the string fallback defined in Section 15.3.3 and the restrictions in Sections 15.3.1 to 15.3.6.

<a id="req-serialization-yaml-claims"></a>A consumer that claims YAML input support MUST accept YAML MCP Description documents that satisfy this profile and MUST reject documents that violate it. A producer that claims YAML output support MUST emit only documents that satisfy the profile.

<a id="req-serialization-yaml-single-document"></a>A YAML MCP Description MUST consist of exactly one YAML document and MUST decode to the JSON-compatible data model (see [Section 3.1](#31-format)). A YAML stream containing zero or multiple documents MUST be rejected.

The recommended file extensions are `.mcpdesc.yaml` and `.mcpdesc.yml`, with `.mcpdesc.yaml` preferred. The recommended media type is `application/mcp-description+yaml`.

[RFC 9512](https://www.rfc-editor.org/rfc/rfc9512) registers the `+yaml` structured syntax suffix and the generic `application/yaml` media type, but not `application/mcp-description+yaml`. <a id="req-serialization-media-type"></a>Generic tooling SHOULD use `application/yaml` when the project-specific media type is unavailable or inappropriate.

#### 15.3.1 String Mapping Keys

<a id="req-serialization-yaml-string-keys"></a>Every YAML mapping key MUST resolve to a string. Complex keys, sequence keys, numeric keys, boolean keys, null keys, and other non-string keys MUST be rejected.

#### 15.3.2 Duplicate Mapping Keys

<a id="req-serialization-yaml-duplicate-keys"></a>A YAML mapping MUST NOT contain duplicate keys after scalar resolution. Implementations MUST reject duplicate keys rather than silently keeping the first or last value.

#### 15.3.3 Scalar Resolution and Numeric Values

<a id="req-serialization-yaml-scalars"></a>A YAML processor MUST use the YAML 1.2.2 JSON schema rules to recognize null, booleans, and numbers. An untagged plain scalar that matches none of those rules MUST resolve to a string, except for the non-finite forms described below. This string fallback extends the YAML JSON schema, which would otherwise report unmatched plain scalars as errors. These rules apply to both mapping keys and values; mapping keys remain subject to Section 15.3.1. A scalar used as an MCP Description value MUST resolve to a string, finite number, boolean, or null. Non-finite numbers MUST be rejected, including numeric spellings that overflow, such as `1e400`. Untagged plain `.inf` and `.nan`, in any letter case and with an optional leading `+` or `-`, MUST also be rejected rather than resolved as strings. Quoted forms of these spellings remain strings.

For example, plain `null`, `true`, and `12` resolve to null, a boolean, and a number. Plain `ordinary`, `0o12`, `0x12`, `012`, `TRUE`, and `~` resolve to strings. In particular, `0o12` remains a string rather than the octal number `10`. These rules differ from YAML 1.2 Core and YAML 1.1 scalar resolution.

These rules do not resolve timestamps, so dates and date-times remain strings. <a id="req-serialization-yaml-quoted-dates"></a>Authors SHOULD still quote them for clarity and portability across authoring tools.

#### 15.3.4 Tags and Safe Parsing

<a id="req-serialization-yaml-tags"></a>Documents MUST NOT use application-specific, language-specific, or custom YAML tags. Implementations MUST use a safe parser mode that does not instantiate application objects or run constructors based on tags.

#### 15.3.5 Anchors and Aliases

<a id="req-serialization-yaml-aliases"></a>A conforming MCP Description YAML serialization MUST NOT use aliases, including alias-based recursive structures. Implementations MUST reject documents that contain aliases. Aliases introduce graph identity, recursion, and expansion, which the JSON-compatible data model cannot represent.

<a id="req-serialization-explicit-reuse"></a>Authors who need semantic reuse SHOULD repeat the value explicitly or use a specification-defined reuse mechanism, such as reusable components (see [Section 17](#17-reusable-components-and-local-references)).

#### 15.3.6 Merge Keys

<a id="req-serialization-yaml-merge-keys"></a>MCP Description tooling MUST NOT interpret YAML merge keys such as `<<` as merge operations, and MUST NOT apply merge semantics before validation. If a parser exposes `<<` as an ordinary string key, the document usually fails schema validation because `<<` is not a defined property.

### 15.4 Parsing and Validation Pipeline

<a id="req-serialization-yaml-validation"></a>A validator MUST NOT apply weaker semantic validation to YAML than to JSON. A conforming validator that accepts YAML MUST:

1. Parse YAML using the restrictions in Section 15.3 and reject unsupported YAML constructs.
2. Normalize the parsed result to the JSON-compatible data model.
3. Apply the same MCP Description JSON Schema used for JSON documents.
4. Apply the same cross-object and semantic validation used for JSON documents.

The MCP Description JSON Schema is authoritative for structural validation. It is published as JSON and applies to the decoded data model regardless of the source serialization.

### 15.5 Serialization Equivalence

A JSON document and a YAML document that decode to the same JSON-compatible data model are semantically equivalent. Source formatting, comments, quoting style, YAML block style, and object-key order do not affect semantic equivalence.

<a id="req-serialization-conversion"></a>Tools that convert between JSON and YAML MUST preserve the decoded data model. Only non-semantic source details, such as comments, scalar style, and mapping order, can differ.

### 15.6 Common Value Requirements

<a id="req-serialization-numbers"></a>Implementations MUST support finite IEEE 754 double-precision floating-point numbers.

MCP Description-defined properties do not accept `null`; a property without a value is omitted. A `null` inside a JSON-compatible value, such as an example value, an extension value, or `_meta`, is data and is preserved.

<a id="req-serialization-empty-collections"></a>An ordinary declaration collection with no entries MUST be omitted (see [Section 3.3](#33-optional-sections-and-ordinary-collections)); an explicit empty array or object is not conforming. <a id="req-serialization-empty-values-preserved"></a>Serialization MUST NOT convert omission into an explicit empty value. Implementations MUST preserve semantically significant empty values and MUST NOT convert them to omission. These forms are not interchangeable:

- `security: []` clears inherited security, while omitting `security` inherits it.
- `security: [{}]` allows anonymous access as an alternative.
- An empty scope array in a Security Requirement Object is significant.

<a id="req-serialization-value-formats"></a>String values MUST be valid JSON strings after decoding. URI values MUST conform to [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986). Email values SHOULD conform to [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322). Date values MUST conform to ISO 8601.

### 15.7 Schema Reference

<a id="req-serialization-schema-property"></a>MCP Description documents SHOULD include a `$schema` property that references the appropriate JSON Schema, for editor validation and tooling support. `$schema` has the same meaning in JSON and YAML. The referenced schema remains a JSON Schema when the document is serialized as YAML.

For the stable 0.9.0 release, the canonical `$schema` value is `https://mcpdesc.org/schema/mcp-description/0.9.0.json`. Earlier draft and release-candidate schema identifiers remain immutable. `$schema` does not replace the required `mcpdesc: 0.9.0` discriminator (see [Section 3.2](#32-root-object)).

```yaml
$schema: https://mcpdesc.org/schema/mcp-description/0.9.0.json
mcpdesc: 0.9.0
```

### 15.8 Producer and Consumer Guidance

<a id="req-serialization-negotiation"></a>Producers and consumers SHOULD explicitly communicate or negotiate the serialization when it cannot be determined from a file extension, media type, or other enclosing protocol metadata.

<a id="req-serialization-untrusted"></a>Implementations MUST treat JSON and YAML input as untrusted and impose reasonable document-size, nesting-depth, scalar-length, and collection-size limits.

### 15.9 Normalized YAML Presentation

Normalized MCP Description YAML is a presentation profile for YAML output. It gives each decoded MCP Description one predictable YAML spelling, so that generated documents, examples, and diffs stay consistent. It does not change YAML input requirements ([Section 15.3](#153-yaml-serialization)), document validity, or semantic equivalence ([Section 15.5](#155-serialization-equivalence)).

#### 15.9.1 Applicability

<a id="req-serialization-normalized-yaml-explicit"></a>A producer MUST apply this profile when it declares, or is explicitly asked, to emit normalized MCP Description YAML. <a id="req-serialization-normalized-yaml-examples-guidance"></a>Specification-authored MCP Description YAML examples SHOULD follow it.

<a id="req-serialization-normalized-yaml-consumer"></a>A consumer MUST NOT reject an otherwise conforming document because it does not use this presentation.

The profile applies to MCP Description documents only. Other YAML files, such as validation rule catalogs, fixture registries, and tool configuration, are outside its scope. Comments are not part of the data model, so a normalizer does not emit them; hand-authored examples can contain comments and still follow this profile.

#### 15.9.2 Data Model Preservation

<a id="req-serialization-normalized-yaml-model"></a>Normalization MUST operate on the parsed JSON-compatible data model. YAML input MUST still be parsed according to Section 15.3. Normalization MUST NOT use YAML 1.1 resolution or application-specific constructors to reinterpret parsed values. It MUST preserve every value and property, including significant empty values (see [Section 15.6](#156-common-value-requirements)). It MUST NOT coerce, add, remove, or repair data. Formatting MUST NOT substitute for validation.

For example, a parsed string `"true"` stays a string, and a parsed boolean `true` stays a boolean. An empty string stays an empty string; it does not become `null` and is not omitted.

#### 15.9.3 Layout

<a id="req-serialization-normalized-yaml-layout"></a>Normalized YAML MUST use UTF-8 without a byte-order mark, LF line endings, and exactly one final LF. It MUST NOT contain directives or document markers (`---` or `...`). It MUST use two spaces per indentation level and MUST NOT use tabs for indentation. Non-empty sequences and mappings MUST use block style; empty sequences and mappings MUST use `[]` and `{}`. Block sequences MUST be indented beneath their mapping keys. A non-empty mapping or sequence that is a sequence item MUST start on the same line as its `- ` indicator. Scalars MUST NOT be line-wrapped, regardless of length.

The following document illustrates the layout:

```yaml
mcpdesc: 0.9.0
info:
  name: chess-rating-server
  title: Chess Rating MCP Server
  version: 1.0.0
  description: "Ratings: FIDE standard"
protocolVersions:
  - "2025-11-25"
  - "2026-07-28"
tools:
  - name: get_player_rating
    description: Get the current FIDE standard rating for a chess player
    inputSchema:
      type: object
      properties:
        player_id:
          type: string
      required:
        - player_id
```

#### 15.9.4 Scalars

<a id="req-serialization-normalized-yaml-scalars"></a>JSON booleans, `null`, and numbers MUST be emitted as the unquoted scalars `true`, `false`, `null`, and numbers that decode to the same JSON value. Numbers MUST use the serialization defined by [RFC 8785, Section 3.2.2.3](https://www.rfc-editor.org/rfc/rfc8785#section-3.2.2.3). Each string value MUST be written using the first of the following rules that applies. Single-quoted scalars MUST NOT be used.

1. An empty string is written as `""`.
2. A string item of any `protocolVersions` array, at any level of the document, is written as a double-quoted scalar.
3. A string that contains a line feed is written as described in Section 15.9.5.
4. A plain-safe string, as defined below, is written as a plain scalar.
5. Any other string is written as a double-quoted scalar.

<a id="req-serialization-normalized-yaml-escaping"></a>The content of a double-quoted scalar MUST be the string serialization defined by [RFC 8785, Section 3.2.2.2](https://www.rfc-editor.org/rfc/rfc8785#section-3.2.2.2). That serialization escapes `"`, `\`, and control characters, and writes all other characters unescaped.

A string is plain-safe when all of the following hold:

- It contains no line break: line feed, carriage return, U+0085, U+2028, or U+2029.
- Written as a plain scalar at its position, it parses under Section 15.3, including the scalar resolution in Section 15.3.3, back to exactly the same string. This excludes strings that resolve to null, a boolean, or a number, such as `null`, `true`, `0.8`, and `123`; non-finite spellings such as `.inf`; strings with leading or trailing whitespace; strings that start with an indicator that cannot begin a plain scalar, such as `- a`, `[x`, `#x`, `&x`, `*x`, `!x`, `%x`, and `@x`; and strings that contain `: ` or ` #`.
- It does not match any of the YAML 1.1 patterns below.

YAML 1.1 processors resolve more plain scalars to non-string types than Section 15.3.3 does. To keep normalized output portable to them, a string is not plain-safe when the entire string matches one of the following case-sensitive regular expressions. They follow the YAML 1.1 type repository at <https://yaml.org/type/> as applied by common YAML 1.1 processors:

- Null: `~|null|Null|NULL`
- Boolean: `y|Y|yes|Yes|YES|n|N|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF`
- Integer: `[-+]?0b[01_]+`, `[-+]?0x[0-9a-fA-F_]+`, `[-+]?[0-9][0-9_]*`, and `[-+]?[0-9][0-9_]*(:[0-5]?[0-9])+`
- Floating point: `[-+]?([0-9][0-9_]*)?\.[0-9_]*`, `[-+]?([0-9][0-9_]*)?(\.[0-9_]*)?[eE][-+]?[0-9]+`, `[-+]?[0-9][0-9_]*(:[0-5]?[0-9])+\.[0-9_]*`, `[-+]?\.(inf|Inf|INF)`, and `\.(nan|NaN|NAN)`
- Timestamp: `[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}(([Tt]|[ \t]+)[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}(\.[0-9]+)?([ \t]*(Z|[-+][012]?[0-9](:[0-9]{2})?))?)?`
- Merge key: `<<`

YAML 1.1 defines these types individually; it has no "Core Schema". The YAML 1.2 Core Schema is not part of this test, so `0o12` remains plain. The float pattern published in the YAML 1.1 type repository also matches strings such as `1.0.0`; common processors do not apply that reading, and neither does this profile, so version strings such as `1.0.0` remain plain.

<a id="req-serialization-normalized-yaml-keys"></a>String mapping keys MUST follow the same rules as string values, except that a key is never written as a block scalar: a key that contains a line feed MUST be written as a double-quoted scalar. <a id="req-serialization-normalized-yaml-key-types"></a>Keys MUST remain strings after parsing.

#### 15.9.5 Multiline Strings

<a id="req-serialization-normalized-yaml-multiline"></a>A string value that contains a line feed SHOULD be written as a literal block scalar when that block scalar parses back to exactly the same string. The block header MUST use the chomping indicator that preserves the trailing line feeds: `|-` for none, `|` for exactly one, and `|+` for more than one. When the first non-empty line of the string begins with a space, the header MUST place the indentation indicator `2` before the chomping indicator, for example `|2-`. A multiline string that is not written as a literal block scalar MUST be written as a double-quoted scalar.

A literal block scalar cannot be used in the following cases, among others:

- The string contains a carriage return, U+0085, U+2028, U+2029, or another character that YAML requires to be escaped.
- The string consists only of spaces, tabs, and line feeds, and contains at least one space or tab.
- The string is the last scalar in the document and would need `|+`, because its trailing line feeds would conflict with the single final LF.

```yaml
description: |
  Searches documents.
  Returns ranked results.
summary: |-
  First line
  Second line
```

#### 15.9.6 Ordering

<a id="req-serialization-normalized-yaml-ordering"></a>This profile does not define a mapping-key order, and requesting normalized YAML does not by itself select the document-oriented ordering profile in [Section 18](#18-document-oriented-serialization-ordering). When that profile is also selected, by the caller or by the producer's declared behavior, it MUST be applied to recognized structures. Otherwise, mapping keys MUST keep their input order. Array order and named-map entry order MUST always be preserved. Arbitrary keys, arrays, and opaque values MUST NOT be sorted.

#### 15.9.7 Scalar Examples

<a id="req-serialization-normalized-yaml-examples"></a>The following spellings illustrate the rules in Section 15.9.4:

| JSON-compatible value | Normalized YAML | Reason |
| --- | --- | --- |
| string `2026-07-28` | `"2026-07-28"` | YAML 1.1 timestamp |
| string `0.8` | `"0.8"` | Number under Section 15.3.3 |
| string `123` | `"123"` | Number under Section 15.3.3 |
| string `true` | `"true"` | Boolean under Section 15.3.3 |
| string `TRUE` | `"TRUE"` | YAML 1.1 boolean |
| string `on` | `"on"` | YAML 1.1 boolean |
| string `null` | `"null"` | Null under Section 15.3.3 |
| string `~` | `"~"` | YAML 1.1 null |
| string `012` | `"012"` | YAML 1.1 integer |
| string `<<` | `"<<"` | YAML 1.1 merge key |
| empty string | `""` | Rule 1 |
| string `draft` in `protocolVersions` | `"draft"` | Rule 2 |
| string `Search: documents` | `"Search: documents"` | Contains `: ` |
| string `Hello # world` | `"Hello # world"` | Contains ` #` |
| string `ordinary` | `ordinary` | Plain-safe |
| string `0o12` | `0o12` | Plain-safe |
| string `1.0.0` | `1.0.0` | Plain-safe |
| boolean `true` | `true` | JSON boolean |
| number `0.8` | `0.8` | JSON number |
| null | `null` | JSON null |

These requirements govern output presentation only. Other YAML spellings remain conforming when they decode to the same valid MCP Description data model.

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

Validation rules identify the requirements that validators check (Section 2.3). The validation result format, published as [`validation/result.schema.json`](validation/result.schema.json), represents diagnostics and rule results; [`validation/README.md`](validation/README.md#rule-results) explains them.

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

## 17. Reusable Components and Local References

### 17.1 Components Object

The root MCP Description Object MAY contain a `components` property. <a id="req-components-fields"></a>A Components Object MUST contain at least one property. It MAY contain these namespace maps:

| Property | Type | Description |
|----------|------|-------------|
| `schemas` | non-empty map\<string, JSON Schema Object or Reference Object\> | Reusable schema values. |
| `toolExamples` | non-empty map\<string, Tool Example Object or Reference Object\> | Reusable Tool examples. |
| `resourceExamples` | non-empty map\<string, Resource Example Object or Reference Object\> | Reusable static Resource examples. |
| `resourceTemplateExamples` | non-empty map\<string, Resource Template Example Object or Reference Object\> | Reusable Resource Template examples. |
| `promptExamples` | non-empty map\<string, Prompt Example Object or Reference Object\> | Reusable Prompt examples. |

<a id="req-component-maps"></a>Every present namespace map MUST contain at least one entry. Each component name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and unique only within their namespace.

<a id="req-components-closed"></a>The outer Components Object MAY carry `x-*` specification extensions and MUST NOT contain other properties. Namespace maps are not extension locations: every key in a namespace map is a component name. Schema component values follow the JSON Schema rules for extension keywords. Tool, Resource, Resource Template, and Prompt Example component values are eligible semantic objects and MAY carry the same `x-*` specification extensions as their inline forms. Components and component values MUST NOT declare MCP Description `protocolVersions`. Protocol applicability comes only from each use site.

### 17.2 Reference Object

<a id="req-reference-object-fields"></a>A Reference Object contains exactly one required property:

| Property | Type | Description |
|----------|------|-------------|
| `$componentRef` | string | Local JSON Pointer to one named value in the compatible `#/components` namespace. |

No other property, including an `x-*` property, is permitted. <a id="req-component-reference-form"></a>The pointer MUST have the form `#/components/<namespace>/<name>`, where `<namespace>` is one of the five namespaces in Section 17.1 and `<name>` matches the component-name grammar. Remote URIs, relative-file references, pointers outside `#/components`, missing targets, and targets in an incompatible namespace are invalid.

A `$componentRef` is an MCP Description reference only at a use site that permits a Reference Object. JSON Schema `$ref` is governed only by the applicable JSON Schema dialect. <a id="req-component-ref-distinct"></a>Implementations MUST NOT accept `$ref` as an MCP Description component reference and MUST NOT reinterpret a `$componentRef` nested inside an embedded JSON Schema.

The separate keyword keeps two reference systems apart in one document. JSON Schema `$ref` is an applicator. It applies another schema at the current instance location, follows the dialect's base-URI and dynamic-scope rules, and can appear next to other schema keywords when the dialect allows it. A `$componentRef` instead replaces one complete MCP Description value before that value is validated at its use site. It can therefore reference values that are not schemas, but it does not compose, constrain, or annotate its target.

Local-only resolution is a separate design choice; it does not follow from using a separate keyword. For comparison, OpenAPI Reference Objects use `$ref` URI references for typed OpenAPI values and can address internal or external targets, while OpenAPI Schema Objects use the same keyword with JSON Schema semantics. MCP Description 0.9.0 deliberately does not define the base-URI, document-loading, trust, bundling, or identity rules that external MCP Description values would need.

The local-only rule does not restrict `$ref`, `$id`, `$anchor`, `$dynamicRef`, composition keywords, or externally identified schema resources inside an embedded JSON Schema. Those remain subject to Section 9.2 and the applicable schema dialect.

### 17.3 Use Sites and Contextual Validation

Each of these use sites MAY contain a Reference Object to a component in the listed namespace:

| Use site | Namespace |
|----------|-----------|
| Tool `inputSchema` | `schemas` |
| Tool `outputSchema` | `schemas` |
| Elicitation Declaration `requestedSchema` | `schemas` |
| Each value in Tool `examples` | `toolExamples` |
| Each value in Resource `examples` | `resourceExamples` |
| Each value in Resource Template `examples` | `resourceTemplateExamples` |
| Each value in Prompt `examples` | `promptExamples` |

Resolution substitutes the referenced JSON value before any structural or semantic rule for the use site applies. <a id="req-component-contextual-validation"></a>A reusable schema or example MUST therefore be valid on its own at every use site, under each containing primitive and effective protocol scope that references it. Defining a value as a component does not relax Tool input object-root rules, Tool output protocol version rules, restricted Elicitation schemas, example/schema compatibility, completed-result shapes, URI relationships, or any other inline requirement.

### 17.4 Resolution

<a id="req-component-reference-pointer"></a>A conforming implementation MUST resolve each Reference Object as a JSON Pointer into the same parsed MCP Description document. <a id="req-component-reference-resolution"></a>It MUST require the target to exist in the namespace that the use site permits and MUST preserve the target JSON value for validation. It MUST follow references between components transitively and MUST reject cycles. It MUST NOT access the network, filesystem, package registry, or another document while resolving `$componentRef`.

<a id="req-component-resolution-errors"></a>Resolution errors are document-conformance errors. A validator SHOULD report the path of the use site or component and distinguish a malformed pointer, a missing target, an incompatible namespace, and a cycle.

### 17.5 Projection

A projection that produces an Effective Protocol View MAY retain every component or prune components that no retained declaration uses. <a id="req-component-pruning"></a>A pruning projection MUST retain every component transitively reached through a retained Reference Object and MUST remove no target required by the projected document. It MUST validate all retained references after projection. It MUST omit each namespace map that pruning leaves empty. It MUST also omit the outer Components Object when neither a namespace map nor a retained `x-*` extension remains in it.

Components have no independent protocol scope. Their validity is determined only after use-site projection.

### 17.6 Merge

<a id="req-component-merge"></a>Merge tooling MUST preserve every referenced component and MUST NOT silently bind different component values to one name. It MAY deduplicate equivalent values. When inputs define different values for the same name in the same namespace, tooling MAY fail with a merge conflict or deterministically rename one value and rewrite every affected Reference Object. A generated name MUST satisfy the component-name grammar, and all rewritten references MUST validate in the merged result.

<a id="req-component-merge-extensions"></a>Outer Components Object extensions with the same name and different values are conflicts unless the merge operation has an independently defined lossless representation. Merge processing MUST remain local and MUST NOT retrieve component values from a network or another document.

### 17.7 Security and Processing Limits

Components and referenced examples are untrusted document content. <a id="req-component-limits"></a>Implementations SHOULD limit reference depth, component count, nesting, and the validation work that resolution creates. <a id="req-component-cycles"></a>They MUST detect cycles without unbounded recursion and MUST apply the same safe rendering, schema-evaluation, URI, content, and secret-handling rules as for inline values.

### 17.8 Example

This excerpt defines a reusable Tool input schema and references it from a permitted use site:

```yaml
components:
  schemas:
    SearchInput:
      type: object
      properties:
        query:
          type: string
      required: [query]
tools:
  - name: search
    inputSchema:
      $componentRef: '#/components/schemas/SearchInput'
```

See the [complete reusable-components example](examples/reusable-components.yaml) for reusable schemas and a referenced Tool Example Object.

## 18. Document-oriented Serialization Ordering

This section defines a recommended presentation order for MCP Description
fields in newly generated JSON and YAML documents. Its purpose is to make
documents easier to scan and more consistent across producers. It does not
change document meaning, validation, or conformance. Property order remains
insignificant, as specified in [Section 3.1](#31-format) and
[Section 3.7](#37-property-ordering). The same sequences apply to JSON and
YAML; neither format gives object member order semantic meaning.

<a id="req-document-ordering-default"></a>A producer that generates an MCP Description document SHOULD emit fields according to this section when it has neither a source property order to preserve nor an explicit caller-selected ordering policy. A source-preserving editor or converter SHOULD preserve the source property order unless the caller selects this ordering profile. Producers MAY expose other ordering policies.

The sequences in this section are the source of truth for this presentation
profile. JSON Schema property order, examples, and implementation-specific
constants do not define or override them. A sequence applies only to fields
defined at the stated location for the document version. It does not authorize
a field or change its validity.

### 18.1 Ordering Algorithm

<a id="req-document-ordering-algorithm"></a>An implementation applying this profile MUST emit the known fields present in a recognized fixed-field object in the listed left-to-right order, followed by any unlisted fields in their existing relative order. It MUST skip missing fields and MUST NOT create defaults or empty sections. It MUST apply a sequence to a child object only when that object's structure is recognized.

<a id="req-document-ordering-collections"></a>An implementation applying this profile MUST preserve the order of every array and the entry order of every named map, including when it organizes the elements or values within them.

<a id="req-document-ordering-recognition"></a>An implementation applying this profile MUST select a sequence using the document path, owning structure, and union discriminator together. It MUST NOT classify arbitrary objects by matching familiar field names such as `name`, `type`, `properties`, or `description`. For an unknown object, unknown variant, malformed container, or opaque subtree, it MUST preserve the existing order and MUST NOT guess a sequence or fall back to alphabetical sorting. It MUST NOT apply this profile recursively inside an opaque subtree.

<a id="req-document-ordering-preservation"></a>Applying this profile MUST NOT change any value or field presence. It MUST NOT resolve references, deduplicate values, expand aliases, or replace inline objects with references. Because unknown fields move after the known fields, their absolute positions can change even though their relative order is kept. Only a source-preserving policy avoids such moves.

This profile does not guarantee that comments, whitespace, quoting, YAML
anchors, source locations, or original property positions survive conversion.
It does not define canonical JSON or a source-aware editing API.

### 18.2 Root Document

| Structure | Field sequence |
| --- | --- |
| MCP Description root | `$schema`, `mcpdesc`, `info`, `instructions`, `protocolVersions`, `transports`, `securitySchemes`, `security`, `capabilities`, `tools`, `resources`, `resourceTemplates`, `prompts`, `tags`, `components` |

`$schema` and `mcpdesc` come first because they identify the format. Server
identity and instructions precede protocol versions and transports. Security
definitions precede their default requirements. Server capability declarations
precede primitive declarations. Tag definitions and reusable components follow
the primary server description. Unknown fields and `x-*` extensions follow
`components`, retaining their relative order.

This sequence applies only to root fields. It does not reorder tools,
resources, prompts, transports, tags, or capability entries within their arrays.

### 18.3 Identity and Shared Presentation Fields

| Structure | Field sequence |
| --- | --- |
| `info` | `name`, `title`, `version`, `id`, `description`, `icons`, `websiteUrl`, `contact`, `license` |
| `info.contact` | `name`, `url`, `email` |
| `info.license` | `name`, `url` |
| Icon entry wherever icons are declared | `src`, `mimeType`, `sizes`, `theme` |
| Root tag definition | `name`, `description` |

Icon and icon-size arrays keep their order. A declaration's `tags` array
contains names, not tag-definition objects, and keeps its exact order.

### 18.4 Transports and Security

| Structure | Field sequence |
| --- | --- |
| HTTP transport, including the schema's HTTP variants | `type`, `url`, `protocolVersions`, `security` |
| Stdio transport | `type`, `command`, `args`, `env`, `protocolVersions`, `security` |
| HTTP security scheme | `type`, `scheme`, `bearerFormat`, `description` |
| API-key security scheme | `type`, `in`, `name`, `description` |
| OAuth 2 security scheme | `type`, `description`, `flows` |
| OpenID Connect security scheme | `type`, `description`, `openIdConnectUrl` |
| OAuth `flows` | `authorizationCode`, `clientCredentials`, `implicit`, `password` |
| OAuth flow | `authorizationUrl`, `tokenUrl`, `refreshUrl`, `scopes` |

`securitySchemes` is a named map. Scheme names keep their order, and only
recognized scheme values are organized. Stdio `env` is an environment-variable
map and is opaque. OAuth `scopes` maps scope names to descriptions and keeps
its entry order.

Every `security` array keeps its exact order. Each requirement object maps
scheme names to scope arrays; both its entry order and each scope array's order
are kept. Ordering does not sort alternatives, merge requirements, expand an
empty requirement, or collapse an empty security array.

### 18.5 Server and Client Capabilities

| Structure | Field sequence |
| --- | --- |
| Entry in root `capabilities` | `protocolVersions`, `tools`, `resources`, `prompts`, `logging`, `completions`, `tasks`, `extensions`, `experimental` |
| Server tool capability | `listChanged` |
| Server resource capability | `subscribe`, `listChanged` |
| Server prompt capability | `listChanged` |
| Server task capability | `list`, `cancel`, `requests` |
| Task `requests` | `tools` |
| Task `requests.tools` | `call` |
| Declaration `clientRequirements` | `roots`, `sampling`, `elicitation`, `tasks`, `extensions`, `experimental` |

`logging`, `completions`, server `experimental`, task `list`, task `cancel`,
and task `requests.tools.call` have open payload objects, which are preserved
in full. An empty object remains empty; ordering does not add capability flags.

Client requirement values are open objects and are preserved recursively.
Their keys are not interpreted as server capability fields or converted to
flags. Client `experimental` is a named map of such values and is also
preserved. Server and client `extensions` map extension identifiers to opaque
values. Identifiers, their order, and all nested payload order are preserved.

### 18.6 Concrete Primitive Declarations

Fields follow a common progression: identity, documentation, protocol scope,
primary contract, behavior, dependencies, examples, and metadata. Each
primitive kind has its own sequence, so no sequence lists a field that the
kind does not support.

| Structure | Field sequence |
| --- | --- |
| Tool | `name`, `title`, `description`, `icons`, `tags`, `deprecated`, `protocolVersions`, `inputSchema`, `outputSchema`, `annotations`, `execution`, `security`, `clientRequirements`, `elicitations`, `examples`, `interactionExamples`, `_meta` |
| Resource | `uri`, `name`, `title`, `description`, `icons`, `tags`, `deprecated`, `protocolVersions`, `mimeType`, `size`, `annotations`, `security`, `clientRequirements`, `elicitations`, `examples`, `_meta` |
| Resource template | `uriTemplate`, `name`, `title`, `description`, `icons`, `tags`, `deprecated`, `protocolVersions`, `mimeType`, `annotations`, `security`, `clientRequirements`, `elicitations`, `examples`, `completionExamples`, `_meta` |
| Prompt | `name`, `title`, `description`, `icons`, `tags`, `deprecated`, `protocolVersions`, `arguments`, `security`, `clientRequirements`, `elicitations`, `examples`, `completionExamples`, `_meta` |
| Prompt argument | `name`, `title`, `description`, `required` |
| Tool annotations | `title`, `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` |
| Resource annotations, including content-block annotations | `audience`, `priority`, `lastModified` |
| Tool `execution` | `taskSupport` |

`inputSchema` and `outputSchema` are preserved completely, including their
property maps, keyword order, and nested arrays. `_meta` is also preserved
completely. Annotation sequences apply only at recognized annotation
locations, not to arbitrary objects named `annotations` inside schemas or
application payloads.

### 18.7 Elicitation Declarations

| Structure | Field sequence |
| --- | --- |
| Elicitation declaration | `name`, `mode`, `message`, `protocolVersions`, `when`, `requestedSchema`, `url`, `onDecline`, `onCancel` |

The declaration array keeps its order. `mode` selects the declaration shape;
ordering never changes `mode` or supplies a missing one.

`requestedSchema` is an opaque schema boundary, even though the specification
defines a restricted vocabulary for elicitation schemas. No ordering sequence
applies to any of its fields, including:

- form-schema fields `$schema`, `type`, `properties`, and `required`;
- property fields `type`, `title`, `description`, `default`, `format`,
  `minLength`, `maxLength`, `minimum`, `maximum`, `enum`, `enumNames`,
  `oneOf`, `items`, `minItems`, and `maxItems`;
- enum-option fields `const` and `title`;
- item `type`, `enum`, or `anyOf` structures; and
- `additionalProperties` and its nested property-schema structure.

Parallel arrays such as `enum` and `enumNames` keep their exact order.

### 18.8 Examples and Their Fixed Envelopes

Example names are authored identifiers, not fields with a preferred order.
The `examples`, `completionExamples`, and `interactionExamples` maps keep
their entry order. The following sequences apply only to recognized example
envelopes and the protocol-defined objects within them, never to arbitrary
application input or output.

| Structure | Field sequence |
| --- | --- |
| Tool example | `input`, `result` |
| Resource example | `result` |
| Resource-template example | `uri`, `result` |
| Prompt example | `arguments`, `result` |
| Completion example | `argument`, `context`, `result` |
| Completion argument | `name`, `value` |
| Completion context | `arguments` |
| Completion result | `values`, `total`, `hasMore` |
| Completed tool result | `resultType`, `isError`, `content`, `structuredContent`, `_meta` |
| Completed resource-read result | `resultType`, `contents`, `cacheScope`, `ttlMs`, `_meta` |
| Completed prompt result | `resultType`, `description`, `messages`, `_meta` |
| Completed completion result | `resultType`, `completion`, `_meta` |
| Prompt message | `role`, `content` |
| Resource text contents | `uri`, `mimeType`, `text`, `_meta` |
| Resource blob contents | `uri`, `mimeType`, `blob`, `_meta` |
| Text content block | `type`, `text`, `annotations`, `_meta` |
| Image or audio content block | `type`, `mimeType`, `data`, `annotations`, `_meta` |
| Embedded-resource content block | `type`, `resource`, `annotations`, `_meta` |
| Resource-link content block | `type`, `uri`, `name`, `title`, `description`, `icons`, `mimeType`, `size`, `annotations`, `_meta` |

Tool example `input`, result `structuredContent`, prompt example `arguments`,
and completion context `arguments` are application-owned payloads or argument
maps and are preserved recursively. Content, messages, resource contents,
completion values, and all other arrays keep their original order.

String payloads such as `text`, `blob`, and `data` are never parsed,
reformatted, decoded, or interpreted as nested documents. Unknown result or
content variants remain untouched, including their nested objects.

### 18.9 Interaction Examples

| Structure | Field sequence |
| --- | --- |
| Tool interaction example | `input`, `steps`, `result` |
| Elicitation step | `type`, `declaration`, `request`, `response` |
| Roots or sampling step | `type`, `request`, `response` |
| Form elicitation request | `mode`, `message`, `requestedSchema` |
| URL elicitation request | `mode`, `message`, `url` |
| Accepted elicitation response | `action`, `content`, `_meta` |
| Declined or cancelled elicitation response | `action`, `_meta` |
| Roots-list request | No declared fields; preserve the empty object |
| Roots-list result | `roots`, `_meta` |
| Root declaration | `uri`, `name`, `_meta` |
| Sampling create-message request | `messages`, `systemPrompt`, `includeContext`, `modelPreferences`, `maxTokens`, `temperature`, `stopSequences`, `tools`, `toolChoice`, `metadata` |
| Sampling create-message result | `role`, `content`, `model`, `stopReason`, `_meta` |
| Sampling message | `role`, `content` |
| Sampling model preferences | `hints`, `intelligencePriority`, `speedPriority`, `costPriority` |
| Sampling model hint | `name` |
| Sampling request tool | `name`, `title`, `description`, `inputSchema`, `annotations` |
| Sampling tool choice | `mode` |
| Sampling tool-use content | `type`, `id`, `name`, `input` |
| Sampling tool-result content | `type`, `toolUseId`, `isError`, `content` |

The `steps` array is an ordered interaction trace and keeps its order, like
every array (see [Section 18.1](#181-ordering-algorithm)). Tool inputs,
elicitation response `content`, sampling tool-use `input`, sampling
`metadata`, every `_meta` subtree, and schemas keep their existing internal
order.

Sampling message content uses the content-block sequences from
[Section 18.8](#188-examples-and-their-fixed-envelopes) when its variant is
recognized. Model hint, message, tool, stop-sequence, and roots arrays keep
their order. On open result envelopes, unknown fields follow the known fields
in their existing relative order. Their values are opaque: an open envelope
does not make them interpretable.

### 18.10 Reusable Components and References

| Structure | Field sequence |
| --- | --- |
| `components` | `schemas`, `toolExamples`, `resourceExamples`, `resourceTemplateExamples`, `promptExamples` |
| Component reference object | `$componentRef` |

Each component category is a named map whose component-name order is kept.
Entire `components.schemas` values are opaque, including schema objects and
component references. Boolean subschemas inside a schema remain untouched.
Other component values use the matching example envelope sequence from
[Section 18.8](#188-examples-and-their-fixed-envelopes), or remain reference
objects. Reference objects inside an opaque schema are part of that schema and
are not traversed.

Reference strings remain byte-for-byte unchanged. Ordering does not resolve
references, rename components, reorder component entries by dependencies,
inline values, or convert between relative and absolute references.

---

## Appendix A: Icon Object

<a id="req-icon-fields"></a>The Icon object describes an icon for UI display. Several objects in this specification use it.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `src` | string (URI) | **Yes** | URI of the icon: an HTTP or HTTPS URL, or a `data:` URI. |
| `mimeType` | string | No | MIME type override (e.g., `"image/png"`, `"image/svg+xml"`). |
| `sizes` | array\<string\> | No | Sizes at which the icon can be used (e.g., `"48x48"`, `"96x96"`, `"any"`). |
| `theme` | string | No | Theme the icon is designed for: `"light"` or `"dark"`. |

<a id="req-icon-client-formats"></a>Clients MUST support `image/png` and `image/jpeg`. Clients SHOULD also support `image/svg+xml` and `image/webp`.

---

## Appendix B: Complete Example

See [examples/full-featured.yaml](examples/full-featured.yaml) for a complete MCP Description document that shows many features of this specification.

---

## Appendix C: JSON Schema

The canonical schema resource for this stable release is `https://mcpdesc.org/schema/mcp-description/0.9.0.json`. This repository also contains the normative JSON Schema at [../../schemas/mcp-description/0.9.0.json](../../schemas/mcp-description/0.9.0.json).

Frozen copies of earlier schemas may also be available from archival URLs, such as the legacy Draft 3 short URI `https://mcpdesc.org/schema/0.8.0.json` and the stable 0.7.0 mirror `https://mcpdesc.org/schema/mcp-description/0.7.0.json`. These URLs are only retrieval locations. They do not change the `$id` values embedded in the frozen schemas they mirror.

---

## Appendix D: References

### Normative References

- **[RFC 2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", RFC 2119, March 1997.
- **[RFC 3986]** Berners-Lee, T., Fielding, R., and L. Masinter, "Uniform Resource Identifier (URI): Generic Syntax", RFC 3986, January 2005.
- **[RFC 6570]** Gregorio, J., Fielding, R., Hadley, M., Nottingham, M., and D. Orchard, "URI Template", RFC 6570, March 2012.
- **[RFC 8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", RFC 8174, May 2017.
- **[RFC 8259]** Bray, T., "The JavaScript Object Notation (JSON) Data Interchange Format", RFC 8259, December 2017.
- **[RFC 9512]** Bormann, C., et al., "YAML Media Type", RFC 9512, February 2024.
- **[YAML 1.2.2]** Ben-Kiki, O., Evans, C., and I. döt Net, "YAML Ain't Markup Language, Version 1.2.2", October 2021.
- **[JSON Schema]** Wright, A., Andrews, H., Hutton, B., "JSON Schema: A Media Type for Describing JSON Documents", draft-bhutton-json-schema-01, June 2022.

### Informative References

- **[MCP Protocol]** Agentic AI Foundation, "Model Context Protocol Specification", https://modelcontextprotocol.io
- **[OpenAPI 3.1]** OpenAPI Initiative, "OpenAPI Specification v3.1.0", https://spec.openapis.org/oas/v3.1.0
- **[Semantic Versioning]** Preston-Werner, T., "Semantic Versioning 2.0.0", https://semver.org
