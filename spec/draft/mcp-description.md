---
title: MCP Description Specification
version: 0.8.0
status: Community working draft 1
draft-iteration: 1
snapshot-tag: v0.8.0-draft.1
released: false
baseline: 0.7.0
date: 2026-08-24
editors:
  - name: Cisco DevNet (v0.7.0 baseline)
    url: https://developer.cisco.com
  - name: Stève Sfartz (v0.8.0 draft)
    url: https://github.com/stsfartz
  - name: "{mcpdesc} community"
    url: https://github.com/mcpdesc/mcpdesc-specification
---

# MCP Description Specification

**Version**: 0.8.0 (community working draft 1; `v0.8.0-draft.1`)

**Status**: Community working draft 1 — not released

**Baseline**: v0.7.0

**Date**: 2026-08-24

## Abstract

This specification defines the **MCP Description** format — a portable, machine-readable document that describes the durable, externally relevant surface of a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server.

An MCP Description declares supported MCP protocol revisions, instructions, transports, security requirements, capabilities, tools, resources, resource templates, prompts, and metadata in a static, machine-readable document. It enables offline discovery, documentation generation, description validation, change analysis, testing, governance, and [interoperable tooling](../implementations.md) across the MCP ecosystem.

## Status of This Document

This document is **Community Working Draft 1** for MCP Description v0.8.0, identified by snapshot tag `v0.8.0-draft.1`. The snapshot label does not change the `mcpdesc` conformance version from `0.8.0`. This is **not** a released specification and may change during proposal review, implementation, and interoperability testing. The current stable release is v0.7.0, whose canonical source remains the Cisco Open `mcptoolkit-contract` repository. The exact review-stage proposal revisions represented by this draft are recorded in the [proposal revision manifest](../PROPOSALS.md).

## 1. Introduction

### 1.1 Purpose

The MCP Description Specification defines a standard format for describing the capabilities of a Model Context Protocol (MCP) server as a static, curated document.

The MCP ecosystem supports runtime discovery and capability inspection. While effective for dynamic interactions, runtime discovery alone limits offline tooling, cross-platform interoperability, design review, and governance workflows.

This specification addresses these limitations by providing a portable description format for MCP servers, analogous to the descriptive role OpenAPI plays for HTTP APIs.

### 1.2 Goals

An MCP Description document enables:

- **Standardized server descriptions** — a consistent structure for declaring server metadata, transports, tools, resources, prompts, and capabilities.
- **Offline discoverability** — platforms can index and display server capabilities without establishing a runtime connection.
- **Tooling interoperability** — documentation generators, testing frameworks, agent discovery tools, IDE integrations, and governance platforms can operate on a common format.
- **Description-driven development** — teams can define, review, and validate MCP server surfaces before deployment.

### 1.3 Audience

This specification is intended for:

- MCP server developers who publish capability descriptions
- MCP client and agent developers who consume server descriptions
- Platform developers building registries, documentation portals, and governance tools
- Tool authors creating validators, generators, and IDE integrations

### 1.4 Relationship to the MCP Protocol

The MCP Description Specification does **not** replace the MCP protocol. It complements the protocol by providing a static description format for server capabilities.

| MCP Protocol | MCP Description |
|---|---|
| Runtime communication | Static declaration |
| Discovery and runtime metadata | Server metadata and declared protocol coverage |
| Tool invocation | Tool definitions |
| Resource fetching | Resource definitions |

The MCP protocol defines runtime communication and behavior. An MCP Description statically represents durable, externally relevant server semantics without reproducing MCP wire choreography.

### 1.5 Scope

This specification defines:

- The structure and semantics of an MCP Description document
- JSON Schema validation rules for MCP Description documents
- The specification extension mechanism for vendor-specific metadata

This specification does NOT define:

- The MCP protocol itself
- Runtime behavior of MCP servers or clients
- The content or structure of vendor extensions (these are defined independently by extension authors)

## 2. Terminology

### 2.1 Key Words

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

### 2.2 Definitions

**MCP Description Document**
A document conforming to this specification that describes an MCP server surface as the JSON-compatible data model defined in Section 3.1, serialized as conforming JSON or YAML.

**Server Surface**
The durable, externally relevant characteristics and behavior of an MCP server that MCP Description can represent, including transports, instructions, security requirements, capabilities, primitives, schemas, and applicable extensions.

**Described Server Surface**
The server surface represented by an MCP Description Document. It is not necessarily exhaustive of everything implemented or available in every runtime context.

**Effective Protocol View**
The projection of an MCP Description Document containing the declarations applicable to one MCP protocol revision.

**MCP Server**
A server implementing the Model Context Protocol, exposing tools, resources, and/or prompts to MCP clients.

**MCP Client**
An application that connects to an MCP server using the MCP protocol.

**Tool**
A server-side function that an MCP client can invoke with structured input parameters and receive structured output.

**Resource**
A server-side data source identified by a URI that an MCP client can read.

**Resource Template**
A parameterized resource definition using a URI template (RFC 6570) that can produce resource URIs when template variables are provided.

**Prompt**
A server-side prompt template that an MCP client can invoke with arguments to generate messages.

**Transport**
The communication mechanism used to connect to an MCP server (e.g., stdio, streamable-http, SSE).

**Specification Extension**
A property in an MCP Description document whose name begins with `x-` that provides vendor-specific metadata outside the core specification.

**Capability**
A feature or behavior supported by an MCP server, declared in a Capabilities Object.

**Protocol Applicability**
The MCP protocol revisions to which a declaration applies, determined from its effective protocol scope.

**Security Requirement**
A declaration of one or more named security schemes and, where applicable, authorization scopes that must be satisfied to access a transport or primitive.

## 3. Document Structure

### 3.1 Format

An MCP Description document is a JSON-compatible data model composed only of objects whose property names are strings, arrays, strings, finite JSON numbers, booleans, and null. Its semantic meaning is defined by this data model independently of whether it is serialized as JSON or YAML.

An MCP Description document MUST use one of the conforming serializations defined in Section 15. JSON and restricted YAML are equally conforming serializations; neither has greater semantic or conformance status.

Property ordering is not significant unless an individual field explicitly defines array ordering semantics. Mapping serialization order MUST NOT affect conformance.

### 3.2 Root Object

The root of an MCP Description document is an object with the following structure:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$schema` | string | No | JSON Schema reference for IDE validation |
| `mcpdesc` | string | **Yes** | Specification version (`"0.8.0"`) |
| `info` | [Info Object](#5-info-object) | **Yes** | Server metadata |
| `protocolVersions` | array\<string\> | **Yes** | MCP protocol revisions described by the document |
| `instructions` | string | No | Durable natural-language guidance for using the server |
| `transports` | non-empty array\<[Transport Object](#6-transports)\> | No | Declared transports |
| `securitySchemes` | non-empty map\<string, [Security Scheme Object](#72-security-scheme-object)\> | No | Reusable named security schemes |
| `security` | [Security Requirement Array](#73-security-requirement-array) | No | Default security requirements |
| `provenance` | [Provenance Registry Object](#171-provenance-registry-object) | No | Reusable evidence records and default primitive attribution |
| `components` | [Components Object](#181-components-object) | No | Reusable schemas and named primitive examples |
| `capabilities` | non-empty array\<[Capabilities Object](#8-capabilities)\> | No | Protocol-scoped server capability declarations |
| `tools` | non-empty array\<[Tool Object](#9-tools)\> | No | Tools declared by the document |
| `resources` | non-empty array\<[Resource Object](#1011-resource-object)\> | No | Resources declared by the document |
| `resourceTemplates` | non-empty array\<[Resource Template Object](#1021-resource-template-object)\> | No | Resource templates declared by the document |
| `prompts` | non-empty array\<[Prompt Object](#11-prompts)\> | No | Prompts declared by the document |
| `tags` | non-empty array\<[Tag Object](#13-tags)\> | No | Document-wide flat tag catalogue for primitive categorization |

### 3.3 Optional Sections and Ordinary Collections

Only `mcpdesc`, `info`, and non-empty `protocolVersions` are required at the document root. Omission of any optional section means that the document makes no declaration for that section. Unless a property's definition explicitly states otherwise, omission MUST NOT be interpreted as proof that the server does not support, expose, or use the corresponding runtime behavior.

An optional ordinary declaration collection MUST contain at least one entry when present. A producer MUST omit such a property when it has no entries, and a consumer MUST reject a present empty collection. This rule applies to root `transports`, `securitySchemes`, `capabilities`, `tools`, `resources`, `resourceTemplates`, `prompts`, and `tags`; the outer `components` object and each present component namespace map; provenance `records`, `defaultIds`, and primitive `provenanceIds`; icon, primitive tag-reference, Elicitation Declaration, Prompt Argument, and extension-capability collections; and named Tool, Resource, and Resource Template example maps. It does not constrain embedded JSON Schemas, specification-extension values, arbitrary literal example values, transport invocation values, or protocol-native content and annotation collections, which follow their own rules.

An empty collection remains valid when its property definition assigns distinct semantics to emptiness. In particular, implementations MUST preserve `security: []`, `security: [{}]`, and empty scope arrays in Security Requirement Objects.

### 3.4 Zero-Primitive Descriptions

A document MAY omit all of `tools`, `resources`, `resourceTemplates`, and `prompts`. Such a document can describe a server under development, a legitimately empty server, or an authorization-scoped observation.

Absence of a primitive collection MUST NOT be interpreted as proof that no other runtime context exposes primitives of that kind.

### 3.5 MCP `_meta`

MCP-derived declaration and example objects identified by this specification MAY carry a literal `_meta` object when every revision in their Effective Protocol View defines `_meta` on the corresponding MCP object. A declaration `_meta` is the literal metadata on that Tool, Resource, Resource Template, or Prompt declaration. An example `_meta` is one illustrative literal value on the represented completed result or content object. Neither form declares a reusable metadata schema or requires a live server to emit the shown value.

For MCP 2025-06-18 and later, each `_meta` key MUST follow the applicable MCP key-name grammar. A key consists of an optional prefix and a possibly empty name. A prefix is one or more dot-separated labels followed by `/`; each label starts with a letter, ends with a letter or digit, and otherwise contains only letters, digits, or hyphens. A non-empty name starts and ends with an alphanumeric character and otherwise contains only alphanumerics, hyphens, underscores, or dots. Reverse-DNS prefix order is RECOMMENDED. Validators MUST reject malformed keys.

Reserved-prefix recognition is revision-specific. MCP 2025-06-18 reserves the prefix forms defined by that revision; MCP 2025-11-25 and MCP 2026-07-28 reserve a prefix whose second label is `modelcontextprotocol` or `mcp`. A validator MUST reject a recognized reserved key used with an invalid value shape or in a represented context where the applicable MCP revision does not define it. A validator that encounters an otherwise valid but unrecognized key under an MCP-reserved prefix MUST preserve it and SHOULD warn rather than infer that it is unauthorized. Valid unprefixed and third-party-prefixed keys MUST be accepted and preserved.

In contexts represented by 0.8.0, MCP 2026-07-28 `io.modelcontextprotocol/serverInfo` is valid on a completed result `_meta` and its value MUST have at least string `name` and `version` properties. MCP 2025-11-25 `io.modelcontextprotocol/related-task` is valid on a represented result and MUST contain a string `taskId`. Request-only keys such as `progressToken` and the MCP 2026 per-request protocol fields, and notification-only keys such as `io.modelcontextprotocol/subscriptionId`, MUST NOT be placed on declarations, ordinary result examples, or content objects. MCP 2026 trace-context keys are reserved wherever `_meta` is represented and MUST have non-empty string values. These rules do not authorize metadata in an object that the applicable MCP revision does not define as carrying `_meta`.

Complete revision-specific semantic validation begins with MCP 2025-06-18. MCP 2024-11-05 and MCP 2025-03-26 remain recognized legacy compatibility revisions: validators MUST apply sound structural and selected checks, SHOULD warn that validation is incomplete, and MUST NOT report partial validation as complete MCP semantic conformance.

MCP `_meta`, `x-*` specification extensions, and `capabilities.extensions` are independent mechanisms. Tooling MUST preserve them independently and MUST NOT automatically project or reinterpret one as another. Projection MUST preserve `_meta` and object-level specification extensions on each selected declaration and named example without merging values from disjoint protocol variants.

Authors MUST NOT publish credentials, tokens, user identifiers, internal topology, live trace identifiers, or other runtime-sensitive data in static `_meta`; fictitious or redacted values MUST be used where disclosure creates risk. Consumers MUST treat keys and values as untrusted data and apply appropriate size, rendering, logging, and processing limits.

### 3.6 Property Ordering

Property ordering within objects is not significant. Implementations MUST NOT depend on property or mapping serialization order.

### 3.7 Specification Extensions

Any property whose name matches the pattern `^x-` on the root or another eligible MCP Description-defined semantic object is a specification extension. See [Section 14: Specification Extensions](#14-specification-extensions) for eligibility and exclusion rules.

### 3.8 Additional Properties

Properties not defined in this specification and not matching the `x-` extension pattern MUST NOT appear on the root or another closed eligible semantic object. Implementations MUST reject such unknown properties. An `x-*` property does not make an otherwise ineligible object extensible.

### 3.9 Example

A minimal valid MCP Description document:

```json
{
  "$schema": "https://mcpdesc.org/schema/0.8.0.json",
  "mcpdesc": "0.8.0",
  "info": {
    "name": "chess-rating-server",
    "version": "1.0.0"
  },
  "protocolVersions": ["2026-07-28"]
}
```

This document makes no transport or primitive declaration. Those omissions do not assert runtime non-support.

## 4. Versioning

### 4.1 The `mcpdesc` Field

Every MCP Description document MUST include a `mcpdesc` property at the root level. This property declares which version of this specification the document conforms to.

```json
{
  "mcpdesc": "0.8.0"
}
```

### 4.2 Version Format

The `mcpdesc` value MUST identify the specification version against which conformance is assessed. This Community Working Draft uses `"0.8.0"` and is not a stable release.

The specification uses [Semantic Versioning](https://semver.org/) for its own version numbers. Before 1.0.0, a minor release MAY contain breaking changes; after 1.0.0, ordinary Semantic Versioning compatibility rules apply.

- **Major** version changes indicate breaking changes to the document structure
- **Minor** version changes add features and, before 1.0.0, MAY include breaking changes
- **Patch** version changes address errata or clarifications without structural changes

### 4.3 Version Compatibility

Implementations SHOULD support the latest specification version. Implementations MAY support multiple versions.

When processing a document, implementations MUST check the `mcpdesc` value and:

- Accept documents with a recognized `mcpdesc` version
- Reject documents with an unrecognized `mcpdesc` version or provide a clear warning

### 4.4 MCP Protocol Coverage

The root `protocolVersions` array identifies the MCP protocol revisions described by the document. It MUST be non-empty, MUST contain unique values, and every value MUST be one of:

- `2024-11-05`
- `2025-03-26`
- `2025-06-18`
- `2025-11-25`
- `2026-07-28`

An unknown or later MCP revision is invalid under mcpdesc 0.8.0 because this specification cannot validate its semantics. Supporting a later revision requires a later mcpdesc specification version.

Root coverage states which revisions the document describes. It does not prove that the server supports no other revisions.

### 4.5 Protocol Scopes and Inheritance

Transports, Capabilities Objects, Tools, Resources, Resource Templates, and Prompts MAY declare `protocolVersions`.

For root version set `R`, a top-level declaration's effective scope is its explicit `protocolVersions` when present and `R` otherwise. An explicit scope MUST be a non-empty subset of `R`.

For a nested scoped declaration, the effective scope is its explicit `protocolVersions` when present and its parent's effective scope otherwise. An explicit child scope MUST be a non-empty subset of its parent's effective scope.

Omission therefore means the complete effective parent scope; it does not mean unknown applicability.

### 4.6 Relationship Between Version Fields

The `mcpdesc` version identifies this description format. Root and declaration-level `protocolVersions` identify MCP protocol applicability. These version dimensions are independent.

### 4.7 Effective Protocol Views and Projection

For protocol revision `V`, the Effective Protocol View `P_V(D)` of document `D` contains each scoped declaration whose effective scope includes `V` and excludes every other scoped declaration.

A conforming single-version projection tool MUST:

1. validate the source document;
2. require `V` to occur in root `protocolVersions`;
3. set root `protocolVersions` to `[V]`;
4. retain applicable transports, capabilities, primitives, and nested declarations;
5. remove `protocolVersions` from retained declarations because applicability is unambiguous;
6. preserve semantically significant empty values and inheritance, including security declarations;
7. omit every ordinary declaration collection from which projection removes the last entry; and
8. validate the projected document structurally and semantically for `V`.

Projection produces an ordinary conforming MCP Description document, not a second format. It MUST NOT materialize transport-dependent inherited values onto a primitive unless the operation also selects a transport and defines that resolution.

### 4.8 Merge

A merge tool MAY construct an aggregate from single-version or multi-version descriptions. It MUST validate every input and MUST report a conflict rather than guess when inputs cannot be represented faithfully.

A conforming merge algorithm SHOULD project inputs into individual protocol views, require compatible logical server identity and unscoped metadata, union root protocol sets, collapse equivalent declarations by unioning their scopes, retain differing declarations as disjoint scoped variants, and validate the aggregate result.

When inputs cover the same revision, their Effective Protocol Views MUST be semantically equivalent or merge MUST fail. Conflicting `info`, `instructions`, root extension values, security declarations, or other unscoped values also cause failure.

For every merged source view `D_V`, this round-trip invariant applies:

```text
P_V(merge(D_1, ..., D_n)) is semantically equivalent to D_V
```

Semantic equivalence need not preserve property order, redundant scopes, array order where semantically insignificant, or the original choice between an omitted scope and an explicit full-parent scope. Merge tools MUST preserve the distinction among omitted `security`, `security: []`, and `security: [{}]`.

Omission contributes no entries to an ordinary declaration collection during merge. A merge result MUST omit an ordinary declaration collection when it has no entries. Merge output MUST satisfy transport protocol coverage whenever it contains `transports`.

## 5. Info Object

The `info` object provides metadata about the MCP server. It is REQUIRED.

The `info` object combines OpenAPI-style metadata (`contact`, `license`) with fields from the MCP `Implementation` type used for server identity. The MCP-sourced fields — `name`, `title`, `description`, `version`, `icons`, and `websiteUrl` — allow an MCP Description document to represent server identity metadata that may also be advertised at runtime.

### 5.1 Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Programmatic server name (identifier). MUST be non-empty. Maps to `Implementation.name` (MCP `BaseMetadata`). |
| `version` | string | **Yes** | Server version. Semver RECOMMENDED. MUST be non-empty. Maps to `Implementation.version`. |
| `title` | string | No | Human-readable display name for UI contexts. Falls back to `name` if not provided. Maps to `Implementation.title` (MCP `BaseMetadata`, since 2025-06-18). |
| `description` | string | No | Brief description of what the server does. Maps to `Implementation.description` (MCP, since 2025-11-25). |
| `id` | string | No | Unique server identifier (URI, DID, or URN). |
| `icons` | non-empty array\<[Icon](#appendix-a-icon-object)\> | No | Icons for UI display. Maps to `Implementation.icons` (MCP, since 2025-11-25). |
| `websiteUrl` | string (URI) | No | URL of the server's website. Maps to `Implementation.websiteUrl` (MCP, since 2025-11-25). |
| `contact` | [Contact Object](#52-contact-object) | No | Contact information (OpenAPI-style, not part of MCP `Implementation`). |
| `license` | [License Object](#53-license-object) | No | License information (OpenAPI-style, not part of MCP `Implementation`). |

### 5.2 Contact Object

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Organization or maintainer name |
| `url` | string (URI) | Contact URL |
| `email` | string (email) | Contact email address |

### 5.3 License Object

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

The optional `transports` property declares one or more communication mechanisms for the MCP server. When present, it MUST contain at least one Transport Object. Omission means that the document declares no connection mechanism; it MUST NOT be interpreted as proof that the server has no transport.

### 6.1 Overview

MCP servers can be accessed through different transport mechanisms. The `transports` array allows a single MCP Description document to declare all supported transports, enabling clients to select the most appropriate one.

### 6.2 Transport Types

Each transport object MUST include a `type` property. The following transport types are defined:

Every Transport Object MAY contain `protocolVersions` and `security`. `protocolVersions` follows Section 4.5. A transport's `security` value is a Security Requirement Array and follows Sections 6.4 and 7.

#### 6.2.1 Streamable HTTP Transport

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"streamable-http"` | **Yes** | Transport type identifier |
| `url` | string (URI) | **Yes** | MCP endpoint URL |

The streamable HTTP transport connects to an MCP server over HTTP with streaming response support. It is defined for MCP 2025-03-26 and later and is the RECOMMENDED transport for remote MCP servers in those revisions.

```json
{
  "type": "streamable-http",
  "url": "https://chess-coach.example.com/mcp"
}
```

#### 6.2.2 stdio Transport

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

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"sse"` | **Yes** | Transport type identifier |
| `url` | string (URI) | **Yes** | SSE endpoint URL |

The Server-Sent Events transport is a legacy transport type retained for backward compatibility. It is the remote transport defined by MCP 2024-11-05. Validators SHOULD warn when it is associated with MCP 2025-03-26 or later, where Streamable HTTP is the standard remote transport. New implementations SHOULD use `streamable-http` instead.

```json
{
  "type": "sse",
  "url": "https://chess-coach.example.com/sse"
}
```

### 6.3 Multiple Transports

A server MAY support multiple transports. Clients SHOULD select the most appropriate transport based on their environment and capabilities.

```json
{
  "transports": [
    { "type": "streamable-http", "url": "https://chess-coach.example.com/mcp" },
    { "type": "stdio", "command": "chess-coach", "args": ["mcp"] }
  ]
}
```

### 6.4 Transport-Scoped Security

Each transport object MAY include a `security` property containing a Security Requirement Array (see Section 7). When present, transport security replaces root security for that transport.

| Scenario | Effective security |
|----------|-------------------|
| Root `security` defined, transport `security` omitted | Inherits root security |
| Root `security` defined, transport `security` is `[]` (empty) | Explicitly no authentication |
| Root `security` defined, transport `security` defined | Transport's own security |
| Root `security` omitted, transport `security` omitted | No authentication |

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

The `bearer` name in this example MUST identify a root `securitySchemes` entry.

### 6.5 Protocol Coverage

When `transports` is present, the union of all effective transport protocol scopes MUST equal root `protocolVersions`. Transport scopes MAY overlap because a server can expose multiple transports for one revision.

A document with `transports` is invalid when any root revision has no applicable transport or when a transport scope contains a revision outside root coverage. When `transports` is omitted, transport coverage validation does not apply: validators MUST NOT infer a transport or report uncovered root revisions.

### 6.6 Extensibility

Transport Objects MAY carry `x-*` specification extensions. They MUST NOT contain other additional properties beyond those defined for their type plus the common optional `protocolVersions` and `security` properties.

## 7. Security

MCP Description represents statically known authentication and authorization through reusable named Security Scheme Objects and Security Requirement Arrays. Both `securitySchemes` and `security` are OPTIONAL.

These declarations describe access requirements. They do not define token acquisition, authorization-server discovery, runtime access-control policy, or authorization-filtered discovery behavior.

### 7.1 Named Security Schemes

Root `securitySchemes` is a map from a local name to a Security Scheme Object. When present, it MUST contain at least one entry. Every local name MUST match `^[A-Za-z0-9._-]+$`. Omission makes no security-scheme declaration and MUST NOT be interpreted as proof that the runtime uses no authentication or authorization mechanism.

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

Each Security Scheme Object MUST include `type`.

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

An OAuth Flows Object MAY contain `implicit`, `password`, `clientCredentials`, and `authorizationCode`. At least one flow MUST be present. Every flow MUST contain a `scopes` map and MAY contain `refreshUrl`. An implicit flow MUST contain `authorizationUrl`; password and client-credentials flows MUST contain `tokenUrl`; an authorization-code flow MUST contain both `authorizationUrl` and `tokenUrl`.

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

Every referenced name MUST exist in root `securitySchemes`. Scope arrays MUST contain unique strings. HTTP and API-key schemes MUST use an empty scope array. An OAuth2 or OpenID Connect requirement MAY use a scope absent from a static scope catalogue; validators MAY warn but MUST NOT reject solely for that reason.

Array order, scheme-key order, and scope order are not semantically significant.

### 7.4 Omission, Clearing, and Anonymous Access

The following forms are distinct:

- omitted `security`: inherit at a nested level, or make no declaration at root;
- `security: []`: explicitly clear any inherited mcpdesc security requirement;
- `security: [{}]`: explicitly allow anonymous access as an alternative;
- `security: [{}, {"oauth": ["games:read"]}]`: allow anonymous access or the named OAuth requirement.

Implementations MUST preserve the distinction between `[]` and `[{}]` and MUST NOT normalize one into the other.

### 7.5 Placement and Precedence

`security` MAY appear at the document root, a Transport Object, or any Tool, Resource, Resource Template, or Prompt Object.

For a primitive used through a selected transport, the effective requirement is the first present value in this order:

1. primitive `security`;
2. selected transport `security`;
3. root `security`;
4. no mcpdesc-declared requirement.

This is replacement, not merging. Protocol projection MUST preserve security declarations and MUST NOT copy one transport's inherited security onto a primitive unless a separate operation also selects that transport.

### 7.6 Interpretation Limits

Primitive requirements describe access conditions, not identities, roles, ownership, or exact discovery visibility. A requirement neither guarantees that a primitive is hidden before authorization nor guarantees that it is visible.

A primitive-level override applies regardless of selected transport. If transport inheritance cannot faithfully represent materially different per-transport primitive requirements, authors SHOULD publish separate descriptions or use a specification extension. Tools MUST NOT invent a combined requirement.

## 8. Capabilities

The optional `capabilities` array declares protocol-scoped, durable server features. When present, it MUST contain at least one Capabilities Object.

### 8.1 Overview

Capabilities represent externally relevant server behavior beyond primitive inventories. They describe semantics, not the RPC or notification mechanism used to expose them.

### 8.2 Properties

| Property | Type | Description |
|----------|------|-------------|
| `protocolVersions` | array\<string\> | MCP revisions to which this object applies; inherits root coverage when omitted |
| `tools` | object | Tool-related capabilities |
| `tools.listChanged` | boolean | Whether the server sends `notifications/tools/list_changed` |
| `resources` | object | Resource-related capabilities |
| `resources.subscribe` | boolean | Whether the server supports resource subscriptions |
| `resources.listChanged` | boolean | Whether the server sends `notifications/resources/list_changed` |
| `prompts` | object | Prompt-related capabilities |
| `prompts.listChanged` | boolean | Whether the server sends `notifications/prompts/list_changed` |
| `completions` | object | Present if the server supports argument autocompletion (MCP 2025-03-26+) |
| `logging` | object | Present if the server supports sending log messages to the client |
| `tasks` | object | Present if the server supports core task-augmented requests (MCP 2025-11-25 only) |
| `extensions` | non-empty map\<string, object\> | Formal MCP extension capabilities (MCP 2026-07-28) |
| `experimental` | object | Experimental, non-standard capabilities |

### 8.3 Tasks Capability

The `tasks` object, when present, indicates the server supports long-running task management:

| Property | Type | Description |
|----------|------|-------------|
| `tasks.list` | object | Server supports listing active tasks |
| `tasks.cancel` | object | Server supports cancelling tasks |
| `tasks.requests.tools.call` | object | Tool calls can be task-augmented |

### 8.4 Extensibility

`extensions` keys MUST use the MCP mandatory-prefix metadata form `prefix/name`. A prefix whose second label is `modelcontextprotocol` or `mcp` is reserved for MCP use. Unknown syntactically valid extension identifiers are accepted and MUST be preserved. A validator SHOULD warn about an unrecognized identifier under a reserved prefix and MUST NOT treat absence from its local catalogue alone as proof of namespace misuse. Use known to be unauthorized is a semantic error.

Core `tasks` in MCP 2025-11-25 and a Tasks extension in MCP 2026-07-28 are distinct declarations and MUST NOT be automatically reinterpreted as one another. `logging` remains representable for revisions that define it; validators SHOULD warn when it applies to MCP 2026-07-28, where it is deprecated.

The Capabilities Object and the MCP Description-defined `tools`, `resources`, and `prompts` capability declaration objects MAY carry `x-*` specification extensions. Other unknown properties on those objects are invalid. MCP-native capability payloads retain their own forward-compatibility rules. The `capabilities.extensions` map is a formal MCP protocol-extension namespace, not an MCP Description specification-extension location; tooling MUST NOT reinterpret or move values between these mechanisms.

### 8.5 Primitive Client Capability Requirements

Tool, Resource, Resource Template, and Prompt Objects MAY contain a `clientRequirements` Client Capability Requirements Object. It describes an unconditional static precondition on the minimum MCP client capabilities required to use that primitive through `tools/call`, `resources/read`, or `prompts/get`. A Resource Template requirement applies to reading a concrete URI produced from the template. Requirements do not apply to listing or discovery, and this specification neither requires nor prohibits runtime filtering based on them.

The object uses the `ClientCapabilities` structure of every MCP revision in the containing primitive's effective protocol scope. It MUST be non-empty, MUST NOT contain `protocolVersions`, and inherits no value from the root, a Transport Object, server `capabilities`, an Elicitation Declaration, or another primitive. Every declared capability and nested capability member MUST be valid for every effective revision. When requirements differ materially between revisions, the primitive MUST be split into pairwise-disjoint protocol-scoped variants.

All requirements are conjunctive. Satisfying them does not guarantee success or authorization. Authors MUST NOT declare a capability that is optional, opportunistic, input-dependent, or used only on some runtime paths as an unconditional requirement.

The recognized core structure is revision-specific:

| Revision | Core client capability shape |
|----------|------------------------------|
| MCP 2024-11-05 and MCP 2025-03-26 | `roots.listChanged`, `sampling`, and `experimental` |
| MCP 2025-06-18 | The earlier shape plus `elicitation` |
| MCP 2025-11-25 | `roots.listChanged`; `sampling.context` and `sampling.tools`; `elicitation.form` and `elicitation.url`; core `tasks.list`, `tasks.cancel`, `tasks.requests.sampling.createMessage`, and `tasks.requests.elicitation.create`; and `experimental` |
| MCP 2026-07-28 | Deprecated empty `roots`; deprecated `sampling.context` and `sampling.tools`; `elicitation.form` and `elicitation.url`; formal `extensions`; and `experimental` |

Capability marker and settings values MUST be objects. MCP 2026-07-28 `roots` MUST be empty. Validators SHOULD warn when a requirement uses a capability or nested member deprecated in its applicable revision. MCP 2024-11-05 and MCP 2025-03-26 retain the legacy incomplete-validation treatment in Section 3.5: validators apply structural and selected sound checks and MUST NOT report complete MCP semantic conformance.

Where the applicable MCP `ClientCapabilities` type is open, unknown and experimental capability entries are accepted and MUST be preserved. Validators MUST NOT invent matching semantics for them. This Client Capability Requirements Object is an MCP Description-defined semantic object and MAY carry `x-*` specification extensions; those properties are MCP Description metadata, not client capabilities.

For MCP 2026-07-28, `extensions` MUST be a non-empty map whose keys satisfy the same mandatory-prefix identifier grammar and reserved-prefix rules as `capabilities.extensions`, and whose values are objects. Unknown syntactically valid identifiers MUST be preserved. Validators SHOULD warn about an unrecognized identifier under an MCP-reserved prefix. A generic compatibility checker MAY treat an empty extension requirement value as satisfied by presence of that identifier in the client's extension map. It MUST NOT claim a non-empty extension requirement is satisfied without understanding the extension-specific settings semantics.

A compatibility tool comparing `clientRequirements` with a client capability profile for one revision SHOULD report `satisfied` when every requirement is known to be satisfied, `unsatisfied` when any requirement is known not to be satisfied, and `indeterminate` when none is known to fail but at least one cannot be evaluated. An omitted property means that the description makes no primitive-level hard-requirement claim; it does not prove that no runtime path can optionally use a capability.

Server `capabilities`, primitive `clientRequirements`, Elicitation Declarations, and `security` are independent. Tooling MUST NOT infer or copy one from another. In particular, a conditional elicitation does not imply an unconditional elicitation requirement, and capability compatibility is not an authorization decision.

A single-version projection MUST preserve `clientRequirements` on every retained primitive and MUST NOT synthesize requirements. Merge tooling MAY collapse otherwise equivalent declarations with equivalent requirements. It MUST NOT select or union materially different requirements over overlapping protocol scope; it MUST preserve distinct non-overlapping variants where representable or report a conflict.

### 8.6 Scope Uniqueness

Effective Capabilities Object scopes MUST be pairwise disjoint. At most one Capabilities Object may apply to a protocol revision.

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

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP revisions to which this declaration applies. |
| `name` | string | **Yes** | Programmatic tool name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Since MCP 2025-06-18. |
| `description` | string | No | Human-readable tool description. |
| `inputSchema` | object or Reference Object | **Yes** | Inline or reusable JSON Schema whose root describes an object containing tool input parameters. |
| `outputSchema` | object or Reference Object | No | Inline or reusable JSON Schema for structured tool output. Since MCP 2025-06-18. |
| `annotations` | [Tool Annotations Object](#95-tool-annotations) | No | Behavioral hints. Since MCP 2025-03-26. |
| `execution` | [Execution Object](#96-execution-object) | No | Execution properties. MCP 2025-11-25 only. |
| `examples` | map&lt;string, Tool Example Object&gt; | No | Named complete Tool invocation/result pairs. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that MAY be required while fulfilling the Tool (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the tool is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Tool declaration, subject to [Section 3.5](#35-mcp-_meta). Since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |
| `clientRequirements` | [Client Capability Requirements Object](#85-primitive-client-capability-requirements) | No | Unconditional minimum client capabilities required for `tools/call`; does not apply to `tools/list`. |
| `provenanceIds` | non-empty array\<string\> | No | Provenance records replacing root defaults for this Tool (see [Section 17](#17-provenance-records-and-primitive-attribution)). |

### 9.2 Input and Output Schemas

Every Tool MUST contain `inputSchema`. Absence MUST NOT be interpreted as evidence that the Tool accepts no arguments. The schema root MUST describe an object.

`inputSchema` and `outputSchema` MAY be Reference Objects targeting the `schemas` component namespace. Resolution MUST occur before applying every inline schema rule in this section, including root shape, dialect, protocol applicability, `x-mcp-header`, and example compatibility. See [Section 18](#18-reusable-components-and-local-references).

A closed no-parameter Tool SHOULD use `{ "type": "object", "additionalProperties": false }`. An open unspecified-parameter Tool may use `{ "type": "object" }`, but this is NOT RECOMMENDED because it gives little validation or guidance. A declared-parameter schema uses `properties` and, when undeclared properties must be rejected, `additionalProperties: false`.

The `outputSchema` property, when present, MUST be a valid JSON Schema object describing the tool's structured output. For MCP 2025-11-25 and MCP 2026-07-28, it defaults to JSON Schema 2020-12 when no explicit `$schema` is provided.

For MCP 2025-11-25 and MCP 2026-07-28, both schemas MAY include an explicit `$schema` property to declare the JSON Schema dialect. Earlier revisions do not define that property on Tool schemas. For MCP 2026-07-28, validators MUST accept the applicable JSON Schema 2020-12 vocabulary, including references, composition, and conditionals, plus MCP-defined annotations where valid. Earlier views MUST be checked according to their applicable MCP schema rules.

For MCP 2025-11-25 and MCP 2026-07-28, every embedded Tool schema MUST be valid under its declared or default dialect. Both revisions default to JSON Schema 2020-12. A validator MUST reject a schema whose declared dialect it does not support.

The supported revisions before MCP 2025-11-25 define an object-rooted Tool schema shape but do not state an embedded-schema dialect default. For those revisions, validators MUST enforce the applicable shape without inferring a dialect solely from the enclosing generated MCP schema. `properties`, when present, MUST be an object whose values are objects, and `required`, when present, MUST be an array of strings. Other keywords MUST be preserved and MUST NOT be rejected solely by applying an inferred meta-schema.

An mcpdesc validator MUST NOT automatically retrieve an external `$ref` target from a network. It MAY resolve external references from an explicitly supplied trusted local catalogue or an explicitly enabled resolver that follows the applicable MCP security guidance. If a target remains unavailable, the `$ref` MUST be preserved and its presence alone MUST NOT make the containing MCP Description invalid. The validator SHOULD warn that complete embedded-schema validation was not possible and MUST NOT report a weakened or partial validation as complete. Consumers that require executable schema certainty SHOULD require resolution or treat this warning as an error. Authors SHOULD prefer self-contained Tool schemas using local `$defs`.

Before MCP 2026-07-28, `outputSchema` MUST declare an object root. MCP 2026-07-28 permits any valid JSON Schema root for `outputSchema`.

MCP 2026-07-28 `inputSchema` properties MAY use `x-mcp-header` to map an input to an HTTP header. The annotation value MUST be a non-empty HTTP field-name token and MUST be unique case-insensitively within that `inputSchema`. It is valid only on a `string`, `integer`, or `boolean` property that is statically reachable from the schema root through `properties` chains. It MUST NOT be used on a property reached through arrays, composition, conditionals, or `$ref`.

### 9.3 Named Tool Examples

A Tool Object MAY contain `examples`, a map from a local example name to an inline Tool Example Object or a Reference Object targeting `#/components/toolExamples/<name>`. When present, the map MUST contain at least one entry. Each name MUST match `^[A-Za-z0-9._-]+$`; names are case-sensitive, scoped to the containing Tool declaration, and serve as both human-meaningful labels and stable local selection names. Entry order is not semantically significant. A referenced example MUST be resolved before applying every contextual requirement of the containing Tool and effective protocol scope.

A Tool Example Object contains these core properties and MAY carry `x-*` specification extensions:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `input` | object | **Yes** | Complete `params.arguments` value from a `tools/call` request. |
| `result` | object | **Yes** | Complete applicable completed Tool Result payload, excluding the JSON-RPC envelope. |

The Tool Example Object MUST NOT contain other additional properties. In particular, 0.8.0 does not define `summary`, `description`, or `externalValue`.

`input` MUST be an object and MUST validate against the containing Tool's `inputSchema` under every applicable protocol revision's schema rules. A no-argument invocation MUST use `input: {}`. Schema-invalid values belong in negative test material, not conforming Tool Examples.

`result` MUST contain `content` and MUST have the completed Tool Result shape defined by every applicable protocol revision. For MCP 2026-07-28 it MUST contain `resultType: "complete"`; earlier revisions MUST NOT contain `resultType`. Task, input-required, streaming, progress, JSON-RPC envelope, and JSON-RPC protocol-error forms are not Tool Examples. Content blocks MAY use any text, image, audio, embedded-resource, or resource-link form supported by every applicable revision.

Revision-supported `_meta` on the completed result, content blocks, and embedded Resource Contents is literal illustrative metadata governed by [Section 3.5](#35-mcp-_meta). It is not a schema or a request-metadata declaration. In MCP 2026-07-28, a result example MAY use `io.modelcontextprotocol/serverInfo` with an MCP Implementation value; request-only and notification-only reserved keys are invalid in these represented contexts.

A successful result MUST omit `isError` or set it to `false`. It MAY contain `structuredContent` only in revisions that support that field. If the Tool declares `outputSchema`, a successful result MUST contain `structuredContent`, which MUST validate against that schema under the applicable schema rules. Unstructured `content` remains required when `structuredContent` is present. If the Tool has no `outputSchema`, a successful result MAY contain revision-supported `structuredContent`, but mcpdesc makes no schema-compatibility claim for that value.

A Tool execution-error result MUST set `isError` to `true`, MUST contain unstructured `content`, and MUST NOT contain `structuredContent`. `outputSchema` does not validate error content. JSON-RPC protocol errors and transport or intermediary failures that prevent a Tool Result are outside this model.

Example compatibility is a semantic conformance requirement. For revisions before MCP 2025-11-25, validators MUST enforce constraints they can interpret without inventing an embedded-schema dialect, SHOULD warn when complete compatibility validation is impossible, and MUST NOT report incomplete validation as complete. An unresolved external `$ref` follows the policy in Section 9.2: validators preserve the schema and example, do not retrieve the target automatically, and warn that compatibility validation is incomplete. A schema-incompatible example is an error whenever complete evaluation is possible.

Tool `examples` and JSON Schema `examples` annotations are independent. Schema annotations remain suitable for anonymous values at an instance location; Tool Examples pair named complete invocations with completed results. Producers MUST NOT infer an author-supplied Tool Example by combining unrelated schema annotations.

Tool Examples are illustrative and non-exhaustive. They do not alter schemas, annotations, security requirements, side effects, or runtime behavior, and they do not guarantee that a live server returns a shown result. Documentation tooling SHOULD preserve names and input/result pairing. Mock or contract-test tooling MAY permit explicit selection by name but MUST NOT execute a live Tool or reproduce declared side effects merely because an example exists. Selection without an explicit name MUST use a deterministic documented policy and MUST NOT be presented as a prediction of live behavior.

Examples are untrusted descriptive content. Authors MUST NOT include secrets and SHOULD use conspicuously fictitious values. Consumers MUST validate values, render content as data, and apply appropriate size and evaluation limits. They MUST NOT treat examples as authorization, proof of behavior, or safe executable instructions.

Tool Examples are MCP Description metadata, not fields of the MCP Tool type. Projection to an MCP `tools/list` Tool value MUST omit `examples` unless an independently specified MCP extension defines a destination. MCP Description round-tripping and protocol-version projection MUST preserve each selected Tool declaration's example map and MUST NOT merge maps from disjoint variants with the same Tool name.

### 9.4 Protocol Variants and Security

Tools with the same `name` MUST have pairwise-disjoint effective protocol scopes. Projection therefore yields at most one declaration for that name. An omitted scope covers all root revisions and overlaps every scoped Tool with the same name.

Tool `security` describes statically known authorization required to call the Tool and replaces inherited transport or root security in full.

Tool `clientRequirements` applies only to invocation through `tools/call`. It does not state that a client needs those capabilities to discover the Tool through `tools/list`.

### 9.5 Tool Annotations

Tool Annotations provide hints about Tool behavior. They are distinct from the Resource Annotations used by Resources, Resource Templates, and content blocks (see [Section 10.3](#103-resource-annotations)). A Tool `annotations` object MUST use the fields and semantics in this section; Resource Annotation fields such as `audience`, `priority`, and `lastModified` do not acquire those semantics when placed on a Tool.

All Tool Annotation properties are advisory. They are not guaranteed to describe Tool behavior faithfully, including `title`. Clients MUST treat Tool Annotations from untrusted servers as untrusted and MUST NOT make Tool-use decisions based on them.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | string | — | Human-readable title for the tool |
| `readOnlyHint` | boolean | `false` | Tool does not modify its environment |
| `destructiveHint` | boolean | `true` | Tool may perform destructive updates |
| `idempotentHint` | boolean | `false` | Repeated calls with same arguments have no additional effect |
| `openWorldHint` | boolean | `true` | Tool may interact with external entities |

The Tool Annotations object allows additional properties for forward compatibility. Consumers MUST preserve unrecognized properties where round-tripping is required and MUST NOT assign them the semantics of Resource Annotations.

### 9.6 Execution Object

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `taskSupport` | string | `"forbidden"` | Whether the tool supports task-augmented execution: `"forbidden"`, `"optional"`, or `"required"` |

### 9.7 Example

```json
{
  "tools": [
    {
      "name": "analyze_game",
      "title": "Analyze Chess Game",
      "description": "Analyze a chess game from PGN notation and return evaluation scores",
      "inputSchema": {
        "type": "object",
        "properties": {
          "pgn": {
            "type": "string",
            "description": "Game in Portable Game Notation (PGN) format"
          },
          "depth": {
            "type": "integer",
            "description": "Analysis depth in half-moves",
            "minimum": 1,
            "maximum": 40
          }
        },
        "required": ["pgn"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "evaluation": { "type": "number", "description": "Centipawn evaluation" },
          "best_move": { "type": "string", "description": "Best move in algebraic notation" },
          "blunders": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "move_number": { "type": "integer" },
                "move": { "type": "string" },
                "evaluation_loss": { "type": "number" }
              }
            }
          }
        }
      },
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true
      },
      "tags": ["analysis", "chess"]
    },
    {
      "name": "get_player_rating",
      "title": "Get Player Rating",
      "description": "Get the current Elo rating and rating history for a chess player",
      "inputSchema": {
        "type": "object",
        "properties": {
          "player_id": {
            "type": "string",
            "description": "Unique player identifier"
          },
          "rating_type": {
            "type": "string",
            "enum": ["classical", "rapid", "blitz", "bullet"],
            "description": "Type of rating to retrieve"
          }
        },
        "required": ["player_id"]
      },
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false
      },
      "tags": ["rating", "player"]
    },
    {
      "name": "record_game_result",
      "title": "Record Game Result",
      "description": "Record the result of a chess game and update player ratings",
      "inputSchema": {
        "type": "object",
        "properties": {
          "white_player_id": { "type": "string", "description": "White player identifier" },
          "black_player_id": { "type": "string", "description": "Black player identifier" },
          "result": {
            "type": "string",
            "enum": ["1-0", "0-1", "1/2-1/2"],
            "description": "Game result in standard notation"
          },
          "pgn": { "type": "string", "description": "Full game PGN (optional)" },
          "time_control": { "type": "string", "description": "Time control (e.g., '10+0', '3+2')" }
        },
        "required": ["white_player_id", "black_player_id", "result"]
      },
      "annotations": {
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false
      },
      "tags": ["rating", "game"]
    }
  ]
}
```

## 10. Resources and Resource Templates

### 10.1 Resources

The `resources` array declares the static resources exposed by the MCP server. Each resource represents a data source identified by a URI.

#### 10.1.1 Resource Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP revisions to which this declaration applies. |
| `uri` | string | **Yes** | Resource URI. |
| `name` | string | **Yes** | Programmatic resource name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Since MCP 2025-06-18. |
| `description` | string | No | Human-readable resource description. |
| `mimeType` | string | No | MIME type of the resource content. |
| `size` | number | No | Size of the raw resource content in bytes. |
| `annotations` | [Resource Annotations Object](#103-resource-annotations) | No | Audience, priority, and modification-time hints. |
| `examples` | map\<string, [Resource Example Object](#1042-static-resource-example-object)\> | No | Named completed Resource read examples. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that MAY be required while reading the Resource (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the resource is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Resource declaration, subject to [Section 3.5](#35-mcp-_meta). Since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |
| `clientRequirements` | [Client Capability Requirements Object](#85-primitive-client-capability-requirements) | No | Unconditional minimum client capabilities required for `resources/read`; does not apply to resource listing. |
| `provenanceIds` | non-empty array\<string\> | No | Provenance records replacing root defaults for this Resource (see [Section 17](#17-provenance-records-and-primitive-attribution)). |

#### 10.1.2 Resource URI

The `uri` property identifies the resource. It SHOULD be a valid URI. The URI scheme is not constrained — servers MAY use custom URI schemes appropriate to their domain.

### 10.2 Resource Templates

The `resourceTemplates` array declares parameterized resource definitions using URI templates ([RFC 6570](https://www.rfc-editor.org/rfc/rfc6570)).

#### 10.2.1 Resource Template Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP revisions to which this declaration applies. |
| `uriTemplate` | string | **Yes** | URI template (RFC 6570). |
| `name` | string | **Yes** | Programmatic template name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Since MCP 2025-06-18. |
| `description` | string | No | Human-readable template description. |
| `mimeType` | string | No | MIME type of the resource content. |
| `annotations` | [Resource Annotations Object](#103-resource-annotations) | No | Audience, priority, and modification-time hints. |
| `examples` | map\<string, [Resource Template Example Object](#1043-resource-template-example-object)\> | No | Named concrete URI and completed read-result examples. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that MAY be required while reading an expanded Resource (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the template is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Resource Template declaration, subject to [Section 3.5](#35-mcp-_meta). Since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |
| `clientRequirements` | [Client Capability Requirements Object](#85-primitive-client-capability-requirements) | No | Unconditional minimum client capabilities required to read a concrete URI produced from the template; does not apply to template listing. |
| `provenanceIds` | non-empty array\<string\> | No | Provenance records replacing root defaults for this Resource Template (see [Section 17](#17-provenance-records-and-primitive-attribution)). |

### 10.3 Resource Annotations

Resource Annotations provide optional client hints about how a Resource, Resource Template, or content block may be used or displayed. They are distinct from the behavioral [Tool Annotations](#95-tool-annotations) on a Tool Object.

| Property | Type | Description |
|----------|------|-------------|
| `audience` | array\<string\> | Intended audiences. Each value is `"user"` or `"assistant"`. |
| `priority` | number | Relative importance from `0` (least important) through `1` (most important). |
| `lastModified` | string | Resource modification time in ISO 8601 form. Since MCP 2025-06-18. |

Resource Annotations have been available throughout the MCP revisions supported by this specification. MCP 2024-11-05 and MCP 2025-03-26 define `audience` and `priority`; `lastModified` MUST NOT be used in an Effective Protocol View before MCP 2025-06-18.

Resource Annotations are hints rather than access controls or integrity claims. Consumers MUST NOT treat `audience` as authorization, `priority` as a mandatory processing order, or `lastModified` as proof of freshness. The object allows additional properties for forward compatibility. Consumers MUST preserve unrecognized properties where round-tripping is required and MUST NOT interpret Tool Annotation field names as Tool behavior when they occur here.

Annotations on a Resource describe the concrete Resource declaration returned by resource discovery. Annotations on a Resource Template describe the template declaration as a whole; they are not observations about one particular URI expansion. Named Resource examples instead represent completed `resources/read` results. Their Resource Contents entries follow the applicable MCP Resource Contents type, which does not define `annotations`, so declaration annotations MUST NOT be moved into an example result. MCP Description 0.8.0 does not define per-example Resource Annotations.

In MCP protocol values, the same Resource Annotations type also applies to supported content blocks, including text, image, audio, embedded-resource, and resource-link content where those block types are available in the applicable revision. MCP Description fields that embed such protocol content MUST retain the distinction between Resource Annotations and Tool Annotations.

### 10.4 Named Resource Examples

#### 10.4.1 Shared Named-Map Rules

A Resource or Resource Template Object MAY contain an `examples` map. Each value MAY be the applicable inline example object or a Reference Object targeting `resourceExamples` for a Resource or `resourceTemplateExamples` for a Resource Template. When present, the map MUST contain at least one entry. Each case-sensitive local example name MUST match `^[A-Za-z0-9._-]+$` and is scoped to its containing declaration. Entry order is not semantically significant. The map key is both a human-meaningful label and a stable local selection name; 0.8.0 does not define separate example prose fields. A referenced example MUST be resolved before applying URI, result-shape, content, and protocol-scope requirements at its use site.

Declarations for the same `uri` or `uriTemplate` in disjoint effective protocol scopes have independent example maps.

#### 10.4.2 Static Resource Example Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `result` | [Completed Resource Read Result](#1044-completed-resource-read-result) | **Yes** | Completed `resources/read` result payload for the containing Resource's `uri`, excluding the JSON-RPC envelope. |

The object MAY carry `x-*` specification extensions; no other additional properties are allowed. The requested URI is implicit in the containing Resource and MUST NOT be duplicated at the example level.

#### 10.4.3 Resource Template Example Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `uri` | string | **Yes** | Concrete Resource URI used as `resources/read.params.uri`. |
| `result` | [Completed Resource Read Result](#1044-completed-resource-read-result) | **Yes** | Completed `resources/read` result payload for `uri`, excluding the JSON-RPC envelope. |

The object MAY carry `x-*` specification extensions; no other additional properties are allowed. `uri` MUST be a valid RFC 6570 expansion of the containing `uriTemplate`. It records the exact request value rather than reverse-inferred template variables.

#### 10.4.4 Completed Resource Read Result

The `result` value represents the value inside a successful JSON-RPC response's `result` member. It MUST contain a non-empty `contents` array. For MCP 2026-07-28 it MUST contain `resultType: "complete"`, non-negative numeric `ttlMs`, and `cacheScope` equal to `"public"` or `"private"`; these are required fields of the MCP `CacheableResult` extended by `ReadResourceResult`. For earlier supported revisions it MUST NOT contain `resultType`, `ttlMs`, or `cacheScope`. A declaration whose examples would span MCP 2026-07-28 and an earlier revision therefore MUST be split into disjoint protocol-scoped variants with revision-compatible example maps. Result `_meta` and Resource Contents `_meta` are available from MCP 2025-06-18 and are literal illustrative values governed by [Section 3.5](#35-mcp-_meta), not reusable metadata contracts. In MCP 2026-07-28, result `_meta` MAY use `io.modelcontextprotocol/serverInfo` with an MCP Implementation value; request-only and notification-only reserved keys are invalid here. JSON-RPC envelope fields, errors, task state, input-required state, and other non-completed workflows MUST NOT appear.

Every `contents` entry MUST contain `uri` and exactly one of `text` or `blob`. A `blob` value MUST be valid base64. An example MAY contain multiple entries; consumers MUST preserve their order and MUST NOT assume every returned URI equals the requested URI.

For both static and template examples, at least one returned entry SHOULD identify the requested URI unless documented collection or indirection semantics explain otherwise. Every returned URI MUST be valid. When the declaration has `mimeType`, the corresponding returned entry SHOULD use the same type; a validator SHOULD warn rather than fail when they differ because an individual representation may legitimately be more specific. The entry's own `mimeType` is authoritative for rendering it.

For a static Resource with `size`, tooling MAY compare the declared raw byte count with matching example text encoded as UTF-8 or decoded binary. A mismatch SHOULD be reported as a warning because examples and mutable Resources can represent different observations.

Resource read errors are JSON-RPC errors and are not Resource Examples in 0.8.0.

#### 10.4.5 Use, Projection, and Security

Resource examples are illustrative, non-exhaustive snapshots. They do not assert live equality, freshness, immutability, cache validity, or complete coverage. Revision-supported metadata is part of the example and is not a guarantee about a live server. In particular, `ttlMs` and `cacheScope` reproduce the illustrated MCP 2026-07-28 result; they do not govern caching of the MCP Description document or authorize sharing captured or live content across authorization contexts.

Documentation tooling SHOULD preserve names, concrete template URIs, result fields, and content order. Mock and contract-test tooling MAY select an exact named example. It MUST NOT dereference example URIs or fetch a live Resource while loading or serving an inline or referenced example. This specification defines no default example, wildcard match, template fallback, dynamic behavior, or external value.

Resource examples are MCP Description metadata, not fields of MCP Resource or Resource Template list values. Projection to MCP list values MUST omit `examples` unless an independent MCP extension defines a destination. Effective Protocol View projection preserves the selected declaration's map and MUST NOT combine maps from declarations with disjoint scopes. MCP Description round-tripping MUST preserve example names and values.

Examples and their URIs are untrusted. Authors MUST NOT include secrets and SHOULD use conspicuously fictitious content. Consumers MUST NOT dereference URIs automatically, MUST render content safely, MUST treat MIME types as untrusted hints, and SHOULD impose encoded-size, decoded-size, and processing limits. Binary fixtures SHOULD be decoded and inspected before publication.

### 10.5 Protocol Variants and Security

Resources with the same `uri` MUST have pairwise-disjoint effective protocol scopes. Resource Templates with the same `uriTemplate` MUST likewise have pairwise-disjoint effective protocol scopes.

Resource `security` describes statically known authorization required to access it. Resource Template `security` describes authorization required to use the template to access matching resources. Each replaces inherited transport or root security in full.

Resource `clientRequirements` applies only to `resources/read` of its URI. Resource Template `clientRequirements` applies only to `resources/read` of a concrete URI produced from the template. Neither applies to `resources/list` or `resources/templates/list`.

### 10.6 Examples

**Static resources for chess game history:**

```json
{
  "resources": [
    {
      "uri": "chess://leaderboard/classical",
      "name": "classical_leaderboard",
      "title": "Classical Leaderboard",
      "description": "Current top-100 classical chess ratings leaderboard",
      "mimeType": "application/json",
      "protocolVersions": ["2026-07-28"],
      "annotations": {
        "audience": ["user", "assistant"],
        "priority": 0.9,
        "lastModified": "2026-08-24T10:00:00Z"
      },
      "examples": {
        "top-two": {
          "result": {
            "resultType": "complete",
            "ttlMs": 60000,
            "cacheScope": "public",
            "contents": [
              {
                "uri": "chess://leaderboard/classical",
                "mimeType": "application/json",
                "text": "{\"players\":[{\"name\":\"Example A\",\"rating\":2810},{\"name\":\"Example B\",\"rating\":2795}]}"
              }
            ]
          }
        }
      },
      "tags": ["leaderboard", "rating"]
    },
    {
      "uri": "chess://leaderboard/rapid",
      "name": "rapid_leaderboard",
      "title": "Rapid Leaderboard",
      "description": "Current top-100 rapid chess ratings leaderboard",
      "mimeType": "application/json",
      "tags": ["leaderboard", "rating"]
    },
    {
      "uri": "chess://rules/fide-2024",
      "name": "fide_rules",
      "title": "FIDE Rules 2024",
      "description": "Official FIDE Laws of Chess (2024 edition)",
      "mimeType": "text/markdown",
      "tags": ["rules", "reference"]
    }
  ]
}
```

**Resource templates for parameterized access:**

```json
{
  "resourceTemplates": [
    {
      "uriTemplate": "chess://games/{game_id}",
      "name": "game_detail",
      "title": "Game Detail",
      "description": "Full details of a specific chess game including PGN, moves, and analysis",
      "mimeType": "application/json",
      "protocolVersions": ["2026-07-28"],
      "annotations": {
        "audience": ["assistant"],
        "priority": 0.7
      },
      "examples": {
        "sample-game": {
          "uri": "chess://games/example-1234",
          "result": {
            "resultType": "complete",
            "ttlMs": 60000,
            "cacheScope": "private",
            "contents": [
              {
                "uri": "chess://games/example-1234",
                "mimeType": "application/json",
                "text": "{\"id\":\"example-1234\",\"result\":\"1-0\"}"
              }
            ]
          }
        }
      },
      "tags": ["game", "history"]
    },
    {
      "uriTemplate": "chess://players/{player_id}/games?from={start_date}&to={end_date}",
      "name": "player_game_history",
      "title": "Player Game History",
      "description": "Game history for a specific player within an optional date range",
      "mimeType": "application/json",
      "tags": ["game", "history", "player"]
    },
    {
      "uriTemplate": "chess://players/{player_id}/rating-history",
      "name": "player_rating_history",
      "title": "Player Rating History",
      "description": "Historical rating progression for a player",
      "mimeType": "application/json",
      "tags": ["rating", "history", "player"]
    }
  ]
}
```

## 11. Prompts

The `prompts` array declares the prompt templates exposed by the MCP server. Each prompt is a server-side template that clients can invoke with arguments to generate messages.

### 11.1 Prompt Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP revisions to which this declaration applies. |
| `name` | string | **Yes** | Programmatic prompt name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Since MCP 2025-06-18. |
| `description` | string | No | Human-readable prompt description. |
| `arguments` | non-empty array\<[Prompt Argument](#112-prompt-argument-object)\> | No | Prompt arguments. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that MAY be required while retrieving the Prompt (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the prompt is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Prompt declaration, subject to [Section 3.5](#35-mcp-_meta). Since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |
| `clientRequirements` | [Client Capability Requirements Object](#85-primitive-client-capability-requirements) | No | Unconditional minimum client capabilities required for `prompts/get`; does not apply to `prompts/list`. |
| `provenanceIds` | non-empty array\<string\> | No | Provenance records replacing root defaults for this Prompt (see [Section 17](#17-provenance-records-and-primitive-attribution)). |

Prompt declarations with the same `name` MUST have pairwise-disjoint effective protocol scopes. Prompt `security` describes statically known authorization required to retrieve the Prompt and replaces inherited transport or root security in full.

Prompt `clientRequirements` applies only to retrieval through `prompts/get`. It does not state that a client needs those capabilities to discover the Prompt through `prompts/list`.

### 11.2 Prompt Argument Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Programmatic argument name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Since MCP 2025-06-18. |
| `description` | string | No | Argument description. |
| `required` | boolean | No | Whether the argument is required. |

### 11.3 Example

```json
{
  "prompts": [
    {
      "name": "analyze_position",
      "title": "Analyze Position",
      "description": "Generate a detailed positional analysis for a chess position",
      "arguments": [
        {
          "name": "fen",
          "title": "FEN String",
          "description": "Position in Forsyth-Edwards Notation",
          "required": true
        },
        {
          "name": "perspective",
          "title": "Analysis Perspective",
          "description": "Analyze from white or black perspective",
          "required": false
        }
      ],
      "tags": ["analysis", "position"]
    },
    {
      "name": "game_summary",
      "title": "Game Summary",
      "description": "Generate a narrative summary of a completed chess game",
      "arguments": [
        {
          "name": "game_id",
          "title": "Game ID",
          "description": "Identifier of the game to summarize",
          "required": true
        },
        {
          "name": "detail_level",
          "title": "Detail Level",
          "description": "Level of detail: 'brief', 'standard', or 'comprehensive'",
          "required": false
        }
      ],
      "tags": ["game", "summary"]
    },
    {
      "name": "opening_guide",
      "title": "Opening Repertoire Guide",
      "description": "Generate a study guide for a specific chess opening",
      "arguments": [
        {
          "name": "opening_name",
          "title": "Opening Name",
          "description": "Name of the chess opening (e.g., 'Sicilian Defense', 'Queen's Gambit')",
          "required": true
        },
        {
          "name": "player_rating",
          "title": "Player Rating",
          "description": "Player's approximate rating to tailor complexity",
          "required": false
        }
      ],
      "tags": ["opening", "study"]
    }
  ]
}
```

## 12. Elicitation Declarations

### 12.1 Purpose and Placement

An Elicitation Declaration documents that fulfillment of a Tool, Resource, Resource Template, or Prompt may require additional interaction with the user through the MCP client.

Tool, Resource, Resource Template, and Prompt Objects MAY contain an `elicitations` array of Elicitation Declaration Objects. The array MUST contain at least one declaration when present. A Resource Template declaration applies to `resources/read` operations on concrete Resource URIs produced from that template; it does not describe elicitation during template discovery.

An Elicitation Declaration describes durable server behavior rather than the protocol-specific wire exchange. It does not assert that every fulfillment triggers the interaction or that every client can fulfill it. A conditional or optional Elicitation Declaration MUST NOT by itself be interpreted as an unconditional `clientRequirements.elicitation` capability requirement.

### 12.2 Elicitation Declaration Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Stable local declaration name. |
| `mode` | `"form"` or `"url"` | **Yes** | Canonical elicitation mode. |
| `message` | string | **Yes** | Representative user-facing explanation of the interaction. |
| `when` | string | No | Human-readable description of when the interaction may occur. |
| `requestedSchema` | object or Reference Object | Conditional | Inline or reusable restricted MCP form-response schema. |
| `url` | string (URI) | No | Static URL when known at description-authoring time. |
| `onDecline` | string | No | Human-readable expected behavior after explicit decline. |
| `onCancel` | string | No | Human-readable expected behavior after cancellation or dismissal. |
| `protocolVersions` | array\<string\> | No | MCP revisions to which this declaration applies. |

`name` MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and MUST be unique within the containing primitive declaration.

`message` MUST be non-empty. It documents the explanation a user should receive and MAY be representative or default wording when runtime context changes the exact text. Runtime wording SHOULD NOT materially contradict the documented purpose, but mcpdesc does not require byte-for-byte equality.

`when`, `onDecline`, and `onCancel`, when present, MUST be non-empty descriptive contract documentation. They are not executable expressions, client instructions, or statically provable guarantees.

Although applicable MCP revisions permit omission of runtime `mode` for form elicitation, mcpdesc requires explicit `mode` to provide one canonical static representation.

### 12.3 Form Mode

For `mode: "form"`:

- `requestedSchema` is REQUIRED;
- `url` MUST NOT appear; and
- `requestedSchema` MUST describe an object with only the property schemas allowed by every applicable MCP revision.

`requestedSchema` MAY be a Reference Object targeting the `schemas` component namespace. The referenced schema MUST be resolved before applying every restricted-vocabulary and effective-protocol-scope requirement in this section.

The schema is limited to a flat object whose properties use MCP elicitation primitive schemas. Nested objects and arrays other than MCP-supported multi-select enumeration forms are invalid. Unsupported keywords and unsupported string formats are invalid.

MCP 2025-06-18 supports string, number, integer, boolean, and legacy string-enum property schemas. It permits string length constraints and the `email`, `uri`, `date`, and `date-time` formats, numeric bounds, boolean defaults, and optional `enumNames` corresponding to enum values. It does not define `$schema`, defaults for strings, numbers, or enums, titled `oneOf` enums, or multi-select arrays.

MCP 2025-11-25 and MCP 2026-07-28 additionally support defaults for all primitive types, standard titled single-select enums, titled and untitled multi-select enums, and the legacy `enumNames` form. Validators MUST apply the vocabulary of every applicable protocol revision.

A `required` entry MUST name a property declared in `properties`. `enumNames`, when present, MUST contain one display name for every enum value. An enum default MUST be one of its declared values, and every multi-select default value MUST occur in its declared item choices. Minimum constraints MUST NOT exceed their corresponding maximum constraints.

### 12.4 URL Mode

For `mode: "url"`:

- `requestedSchema` MUST NOT appear;
- `url`, when present, MUST be a syntactically valid URI; and
- omission of `url` means the concrete URL is generated or selected at runtime.

A runtime URL-mode elicitation still supplies every field required by the applicable MCP revision. Omission in mcpdesc does not make the runtime URL optional.

Validation of `url` is syntax-only. Validators and other consumers MUST NOT retrieve, prefetch, dereference, or otherwise access it while processing a description. A conforming declaration does not assert that the target is currently available, trusted, immutable, controlled by the server, or suitable for automatic navigation.

### 12.5 Protocol Applicability

An omitted Elicitation Declaration `protocolVersions` inherits the effective scope of its containing primitive. An explicit scope MUST be non-empty and MUST be a subset of that containing scope.

Complete revision-specific validation begins with MCP 2025-06-18:

- MCP 2025-06-18 supports form mode;
- MCP 2025-11-25 supports form and URL modes; and
- MCP 2026-07-28 supports form and URL modes.

A declaration spanning multiple revisions MUST satisfy every applicable revision. Authors MUST split materially incompatible declarations into disjoint scopes.

MCP 2024-11-05 and MCP 2025-03-26 retain the legacy compatibility treatment in Section 3.5. Validators apply structural and selected sound checks, issue the existing incomplete-validation diagnostic, and MUST NOT report complete MCP semantic conformance.

### 12.6 Static-Description Boundary

The applicable MCP revision remains authoritative for execution. MCP Description does not model whether elicitation uses a server-initiated request or Multi Round-Trip Requests, nor lifecycle messages, identifiers, request state, retries, correlation, capability negotiation, or transport behavior. Static primitive `clientRequirements` may record an unconditional minimum elicitation capability without defining any of that choreography.

A mock, gateway, documentation tool, or client MAY use a declaration to render its message, collect a form response matching `requestedSchema`, or present a known URL. The declaration alone does not define when a mock triggers the interaction, how it selects among declarations, how responses modify state, or which final primitive result follows.

Elicitation Declarations are distinct from named primitive examples. Tool Examples pair a complete invocation with a completed Tool Result, and Resource Examples contain completed read results. They MUST NOT contain `InputRequiredResult`, `elicitation/create`, MRTR rounds, retries, or other incomplete workflows. MCP Description 0.8.0 does not define an elicitation transcript or workflow language.

The applicable MCP elicitation specification remains authoritative for runtime security and privacy requirements. MCP Description validation does not inspect or certify runtime behavior, privacy compliance, or security conformance and defines no sensitive-field diagnostic.

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

The root-level `tags` array defines a flat, document-wide tag catalogue for the MCP server. It is OPTIONAL and MUST be non-empty when present. Tags are supplemental MCP Description metadata; they are not fields defined by the MCP protocol.

When present, `tags` declares all valid tags that MAY be referenced by tools, resources, resource templates, and prompts. The array order determines display priority — tags appearing earlier in the array SHOULD be presented first in UIs and documentation.

### 13.1 Tag Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Tag identifier. MUST be unique across all tags. |
| `description` | string | No | Human-readable description of the tag's purpose. |

### 13.2 Tag Uniqueness

Tag names MUST be unique across all tags in the array. Implementations MUST reject documents containing duplicate tag names.

### 13.3 Tag References

Per-entity `tags` arrays (on tools, resources, resource templates, and prompts) MUST be non-empty when present and contain plain strings referencing tag names. When a root-level `tags` array is present:

- Every tag referenced by an entity MUST be declared in the root `tags` array.
- Implementations MUST treat a reference to an undeclared tag as a validation error.
- Per-entity tag arrays MUST NOT contain duplicate values.

When the root-level `tags` array is absent, per-entity tags are unconstrained strings (backward-compatible behavior). An empty root tag catalogue is invalid; producers MUST omit `tags` when no catalogue entries are declared.

### 13.4 Protocol Scopes and Effective Protocol Views

The root tag catalogue is not protocol-scoped. A tag describes a categorization concept across the MCP Description document rather than protocol behavior. An Effective Protocol View MUST preserve the complete root tag catalogue, including entries not referenced by a primitive retained in that view.

Protocol-scoped variants of the same primitive MAY use different `tags` arrays. Every reference in every variant is still validated against the document-wide root catalogue when that catalogue is present.

Merge inputs MUST therefore agree on the root tag catalogue under the general unscoped-metadata merge rules. Merge tooling MUST NOT infer, discard, or synthesize catalogue entries from the tags referenced in individual views.

Elicitation Declarations do not carry tags. They are named behaviors nested within an already categorizable Tool, Resource, Resource Template, or Prompt. A future extension of tags to nested behaviors requires a separate use case and compatibility decision.

### 13.5 Example

Flat tag list with entity references:

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

MCP Description documents support vendor-specific metadata through specification extensions on explicitly eligible semantic objects.

### 14.1 Extension Naming

Specification extension properties MUST match the pattern `^x-`. Names are case-sensitive. The RECOMMENDED naming convention is:

```
x-{organization}-{feature}
```

Authors SHOULD use lowercase organization prefixes. Examples include `x-cisco-metadata`, `x-acme-owner`, and `x-example-cost-profile`.

### 14.2 Extension Placement

A specification extension MAY appear directly on the root MCP Description Object or another eligible MCP Description-defined semantic object. Eligible categories in 0.8.0 are:

- Info, Contact, License, Icon, and Tag Objects;
- Transport Objects and MCP Description-defined transport configuration objects;
- Security Scheme, OAuth Flows, and OAuth Flow Objects;
- the Capabilities Object, Client Capability Requirements Object, and MCP Description-defined capability declaration objects;
- Tool, Resource, Resource Template, Prompt, Prompt Argument, and Elicitation Declaration Objects; and
- MCP Description-defined named Tool, Resource, and Resource Template Example wrapper objects; and
- Provenance Registry, Provenance Record, Provenance Producer, and Provenance Artifact Objects; and
- the outer Components Object and semantic Tool, Resource, and Resource Template Example component values.

Eligibility follows the object's specification-defined role, not the fact that a serialized value is a JSON object. A map value that is an eligible object MAY carry extensions, but the containing map does not thereby gain an extension slot.

Specification extensions MUST NOT appear directly on scalar values; domain-keyed maps; Security Requirement Objects; the `capabilities.extensions` or `clientRequirements.extensions` protocol-extension map; embedded JSON Schemas; carried MCP payload, result, annotation, or `_meta` objects; opaque example or extension values; arbitrary JSON payloads; or Reference Objects unless the Reference Object specification explicitly defines adjacent-extension resolution behavior. Those locations retain the rules of their owning format or object model.

The outer Components Object and eligible semantic example component values MAY carry `x-*` properties. Component namespace maps, embedded schemas, and Reference Objects remain ineligible. An `x-*` key inside a component namespace map is an ordinary component name and its value MUST satisfy that namespace's component type.

### 14.3 Extension Values

An extension value MAY be any JSON-compatible value: object, array, string, number, boolean, or null. Authors SHOULD prefer an object when the value may evolve compatibly.

### 14.4 Processing Rules

An implementation that does not recognize a specification extension MUST NOT reject the document because of that extension, MUST ignore it when interpreting core MCP Description semantics, and SHOULD preserve it when processing and reserializing the document. A consumer MUST NOT infer core semantics from an unrecognized extension.

A specification extension MUST NOT redefine, contradict, or weaken a core requirement. It cannot make a required field optional, change `security` or protocol applicability, or make an invalid example conforming. Core fields remain authoritative.

A validator MAY validate a recognized extension using a configured trusted schema. Failure to obtain that schema MUST NOT invalidate an otherwise conforming document unless the validator identifies a separate profile that requires the extension.

### 14.5 Ownership, Projection, and Merge

An object-level extension belongs to its containing semantic object and follows that object's lifecycle and Effective Protocol View. A nested `protocolVersions` member inside an extension value has no MCP Description scoping meaning.

A single-version projection MUST preserve every `x-*` property on a retained eligible object unless extension stripping was explicitly requested. Projection MUST NOT move it, combine it with `_meta`, or reinterpret it as an MCP protocol extension. Removing an out-of-scope owner removes its extensions with it.

Extensions participate in the semantic representation of their containing object. Merge tools MAY collapse objects with semantically equivalent extension values under the ordinary merge rules. For conflicting values on corresponding objects, a merge tool MUST retain distinct non-overlapping variants where representable or report a conflict. It MUST NOT guess, silently discard an extension, or move it to another object.

### 14.6 Extension Documentation

Extension authors SHOULD publish a JSON Schema for the value, purpose and semantic documentation, versioning information, and the eligible MCP Description object types on which the extension is valid.

### 14.7 Relationship to Other Extension Mechanisms

Object-level `x-*`, literal MCP `_meta`, formal MCP `capabilities.extensions`, and formal MCP `clientRequirements.extensions` are separate mechanisms. Tooling MUST NOT automatically copy, project, or reinterpret data among them. `x-*` is MCP Description-specific vendor metadata; `_meta` represents literal MCP metadata in supported contexts; `capabilities.extensions` declares server extension support; and `clientRequirements.extensions` declares an unconditional primitive-level client extension requirement.

### 14.8 Security and Privacy

Authors MUST NOT publish credentials, tokens, user identifiers, confidential topology, live trace identifiers, or other secrets in extensions. Consumers MUST treat extension names and values as untrusted content and apply appropriate size, output-encoding, rendering, logging, and execution controls. Unknown extensions MUST NOT bypass core conformance or security checks. Validators SHOULD avoid automatic network retrieval of extension schemas.

### 14.9 Example

```json
{
  "mcpdesc": "0.8.0",
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

An MCP Description MAY be serialized as JSON or as restricted YAML. Both serializations decode to the single JSON-compatible MCP Description data model defined in Section 3.1 and use the same JSON Schema and semantic-validation requirements.

A conforming document consumer or producer MUST support at least one conforming serialization and MUST declare whether it supports JSON, YAML, or both for each applicable input or output capability.

### 15.2 JSON Serialization

An MCP Description MAY be serialized as JSON. JSON serialization MUST conform to [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) and MUST be encoded in UTF-8.

A consumer that claims JSON input support MUST accept conforming JSON MCP Description documents. A producer that claims JSON output support MUST emit conforming JSON MCP Description documents. General MCP Description conformance does not make JSON support mandatory or preferred over YAML support.

The recommended JSON file extension remains:

```text
.mcpdesc.json
```

The recommended JSON media type remains:

```text
application/mcp-description+json
```

### 15.3 YAML Serialization

An MCP Description MAY be serialized as YAML 1.2.2 using the JSON schema defined by Section 10.2.1.3 of the [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) for scalar resolution.

A consumer that claims YAML input support MUST accept YAML MCP Description documents that satisfy this restricted profile and MUST reject documents that violate it. A producer that claims YAML output support MUST emit only documents that satisfy the restricted profile. General MCP Description conformance does not make YAML support mandatory or preferred over JSON support.

A YAML MCP Description MUST consist of exactly one YAML document and MUST decode to the JSON-compatible MCP Description data model defined in Section 3.1. A YAML stream containing zero or multiple documents MUST be rejected.

The recommended YAML file extensions are:

```text
.mcpdesc.yaml
.mcpdesc.yml
```

with `.mcpdesc.yaml` preferred.

The recommended YAML media type is:

```text
application/mcp-description+yaml
```

The project-specific `application/mcp-description+yaml` media type is not registered by RFC 9512. Its `+yaml` structured syntax suffix and the generic `application/yaml` media type are registered by [RFC 9512](https://www.rfc-editor.org/rfc/rfc9512). Generic tooling SHOULD use `application/yaml` when the project-specific media type is unavailable or inappropriate.

#### 15.3.1 String Mapping Keys

Every YAML mapping key MUST resolve to a string. Complex keys, sequence keys, numeric keys, boolean keys, null keys, and other non-string keys MUST be rejected.

#### 15.3.2 Duplicate Mapping Keys

A YAML mapping MUST NOT contain duplicate keys after scalar resolution. Implementations MUST reject duplicate keys rather than silently keeping the first or last value.

#### 15.3.3 Scalar Resolution and Numeric Values

A YAML processor MUST use the YAML 1.2.2 JSON schema for scalar resolution. A YAML scalar used as an MCP Description value MUST resolve to a string, finite number, boolean, or null. Non-finite numeric values such as positive infinity, negative infinity, and NaN MUST be rejected.

The YAML 1.2.2 JSON schema does not implicitly resolve timestamps. Date-time and date values therefore remain strings; authors SHOULD still quote them for clarity and portability across authoring tools.

#### 15.3.4 Tags and Safe Parsing

Application-specific, language-specific, or custom YAML tags MUST NOT be used. Implementations MUST use a safe parser mode that does not instantiate application objects or execute constructors based on tags.

#### 15.3.5 Anchors and Aliases

YAML aliases and alias-based recursive structures MUST NOT be used in a conforming MCP Description YAML serialization. Implementations SHOULD reject documents containing aliases. This restriction avoids graph identity, recursion, and expansion semantics that have no representation in the JSON-compatible data model.

Authors who need semantic reuse SHOULD duplicate the value explicitly or use a specification-defined reuse mechanism when one is available.

#### 15.3.6 Merge Keys

YAML merge-key conventions such as `<<` MUST NOT be interpreted as structural merge operations by MCP Description tooling. If a parser exposes `<<` as an ordinary string key, the resulting MCP Description will normally fail the MCP Description schema because `<<` is not a defined property. Implementations MUST NOT apply YAML merge semantics before MCP Description validation.

### 15.4 Parsing and Validation Pipeline

A conforming validator that accepts YAML MUST parse YAML using the restrictions above, reject unsupported YAML constructs, normalize the parsed representation to the JSON-compatible MCP Description data model, apply the same MCP Description JSON Schema used for JSON documents, and apply the same cross-object and semantic validation used for JSON documents. A validator MUST NOT have weaker semantic validation for YAML than for JSON.

The MCP Description JSON Schema remains authoritative for structural instance validation. It is published as JSON and applies to the decoded data model regardless of the source serialization.

### 15.5 Serialization Equivalence

If a JSON document and a YAML document decode to the same JSON-compatible data model, they are semantically equivalent MCP Description documents, subject to the ordinary MCP Description semantic-equivalence rules. Source formatting, comments, quoting style, YAML block style, and object-key order do not participate in semantic equivalence.

Tools that convert between JSON and YAML MUST preserve the decoded MCP Description data model, subject only to non-semantic source details such as comments, scalar style, and mapping order.

### 15.6 Common Value Requirements

Implementations MUST support finite IEEE 754 double-precision floating-point numbers. Properties with `null` values SHOULD be omitted rather than included with a `null` value unless the property explicitly permits `null`.

An ordinary declaration collection with no entries MUST be omitted; an explicit empty array or object is not conforming. Serialization MUST NOT convert omission into an explicit empty value. Implementations MUST preserve semantically significant empty values and MUST NOT convert them to omission. In particular, `security: []` clears inherited security while omission inherits it, `security: [{}]` declares an anonymous alternative, and empty Security Requirement scope arrays remain significant; these forms are not interchangeable.

String values MUST be valid JSON strings after decoding. URI values MUST conform to [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986). Email values SHOULD conform to [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322). Date values MUST conform to ISO 8601.

### 15.7 Schema Reference

MCP Description documents SHOULD include a `$schema` property referencing the appropriate JSON Schema for IDE validation and tooling support. The property has the same meaning in JSON and YAML, and the referenced schema remains a JSON Schema when the instance is serialized as YAML.

```yaml
$schema: https://mcpdesc.org/schema/0.8.0.json
mcpdesc: 0.8.0
```

### 15.8 Producer and Consumer Guidance

Producers and consumers SHOULD explicitly communicate or negotiate the serialization when it cannot be determined from a file extension, media type, or other enclosing protocol metadata. Implementations MAY support JSON, YAML, or both according to their use case and declared capabilities.

Implementations MUST treat JSON and YAML input as untrusted and impose reasonable document-size, nesting-depth, scalar-length, and collection-size limits.

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
8. Satisfy semantic scope, identifier, Elicitation Declaration, client-requirement, security-reference, tag-reference, provenance-reference, component-reference, revision-applicability, embedded Tool schema and example, and `x-mcp-header` constraints.
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

A conforming implementation SHOULD:

1. Support at least the current specification version.
2. Provide clear error messages when rejecting non-conforming documents.
3. Support JSON Schema validation against the published schema.

### 16.3 Partial Conformance

Implementations that support only a subset of the specification (e.g., only tools, or only a specific transport type) SHOULD document their limitations clearly.

### 16.4 Versioned Conformance

Conformance is assessed against a specific specification version. An implementation claiming conformance MUST state which `mcpdesc` version(s) it supports.

---

## Appendix A: Icon Object

The Icon object is used throughout the specification for UI display.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `src` | string (URI) | **Yes** | URI pointing to an icon resource (HTTP/HTTPS URL or `data:` URI). |
| `mimeType` | string | No | MIME type override (e.g., `"image/png"`, `"image/svg+xml"`). |
| `sizes` | array\<string\> | No | Sizes at which the icon can be used (e.g., `"48x48"`, `"96x96"`, `"any"`). |
| `theme` | string | No | Theme this icon is designed for: `"light"` or `"dark"`. |

Clients MUST support `image/png` and `image/jpeg`. Clients SHOULD also support `image/svg+xml` and `image/webp`.

---

## Appendix B: Complete Example

See [examples/full-featured.yaml](../examples/full-featured.yaml) for a complete MCP Description document demonstrating all features of this specification.

---

## Appendix C: JSON Schema

The normative JSON Schema for this specification version is available at:

- [../../../schemas/mcp-description/0.8.0.json](../../../schemas/mcp-description/0.8.0.json)
- `https://mcpdesc.org/schema/0.8.0.json`

---

## Appendix D: References

### Normative References

- **[RFC 2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", RFC 2119, March 1997.
- **[RFC 3986]** Berners-Lee, T., Fielding, R., and L. Masinter, "Uniform Resource Identifier (URI): Generic Syntax", RFC 3986, January 2005.
- **[RFC 6570]** Gregorio, J., Fielding, R., Hadley, M., Nottingham, M., and D. Orchard, "URI Template", RFC 6570, March 2012.
- **[RFC 8259]** Bray, T., "The JavaScript Object Notation (JSON) Data Interchange Format", RFC 8259, December 2017.
- **[RFC 9512]** Bormann, C., et al., "YAML Media Type", RFC 9512, February 2024.
- **[YAML 1.2.2]** Ben-Kiki, O., Evans, C., and I. döt Net, "YAML Ain't Markup Language, Version 1.2.2", October 2021.
- **[JSON Schema]** Wright, A., Andrews, H., Hutton, B., "JSON Schema: A Media Type for Describing JSON Documents", draft-bhutton-json-schema-01, June 2022.

### Informative References

- **[MCP Protocol]** Anthropic, "Model Context Protocol Specification", https://modelcontextprotocol.io
- **[OpenAPI 3.1]** OpenAPI Initiative, "OpenAPI Specification v3.1.0", https://spec.openapis.org/oas/v3.1.0
- **[Semantic Versioning]** Preston-Werner, T., "Semantic Versioning 2.0.0", https://semver.org

## 17. Provenance Records and Primitive Attribution

Provenance records describe evidence that contributed to primitive declarations. They are portable descriptive assertions, not MCP runtime fields, cryptographic attestations, or declarations of completeness, confidence, precedence, trust, or consumer policy.

### 17.1 Provenance Registry Object

The root `provenance` property MAY contain a Provenance Registry Object:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `records` | non-empty map\<string, [Provenance Record Object](#172-provenance-record-object)\> | **Yes** | Document-local records available for attribution. |
| `defaultIds` | non-empty array\<string\> | No | Default attribution for primitives without `provenanceIds`. |

Each `records` key is an opaque, non-empty, document-local Provenance ID. IDs are case-sensitive and MUST NOT be interpreted as producer, time, ordering, trust, or MCP session identifiers. A producer SHOULD NOT use an MCP transport session ID as the sole provenance identity. An external dump or inspector session identifier MAY appear in an artifact URI or specification extension. `defaultIds`, when present, MUST be non-empty, contain unique IDs, and resolve to records in the same registry. A producer SHOULD use defaults only when those records apply systemically to primitives without explicit attribution.

The registry MAY carry `x-*` specification extensions. It MUST NOT contain other additional properties.

### 17.2 Provenance Record Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `kind` | string | **Yes** | Evidence origin: `curated`, `observed`, or `generated`. |
| `producer` | [Provenance Producer Object](#173-provenance-producer-object) | No | Tool or organization that produced the evidence. |
| `method` | string | No | Stable producer-defined method identifier. |
| `artifact` | [Provenance Artifact Object](#174-provenance-artifact-object) | No | External evidence supporting the record. |
| `recordedAt` | string | No | RFC 3339 date-time at which the evidence was recorded. |

`kind` MUST be `curated` for intentional contract authoring or review, `observed` for one or more runtime observations, or `generated` for mechanical production from source code, configuration, framework metadata, or another non-runtime source. Saving or committing generated or observed output does not make it curated. `method`, when present, MUST be non-empty. `recordedAt`, when present, MUST be a valid RFC 3339 date-time and MUST NOT serve as record identity.

A record MAY carry `x-*` specification extensions. Core records do not define completeness, confidence, trust, precedence, or policy fields; an unprefixed field for any such concept is invalid. Consumers select and apply interpretation policy outside the document.

### 17.3 Provenance Producer Object

A Provenance Producer Object MUST contain a non-empty string `name` and MAY contain a non-empty string `version`. It MAY carry `x-*` specification extensions and MUST NOT contain other additional properties. Producer identity is descriptive and is not proof of authorship.

### 17.4 Provenance Artifact Object

A Provenance Artifact Object MUST contain an absolute URI string `uri` and MAY contain a non-empty string `digest`. A present digest MUST identify both its algorithm and value. Consumers are not required to retrieve or verify the artifact.

The object MAY carry `x-*` specification extensions and MUST NOT contain other additional properties. An artifact reference is not an attestation and does not establish producer identity, correctness, completeness, or trustworthiness.

### 17.5 Primitive Attribution

A Tool, Resource, Resource Template, or Prompt Object MAY contain `provenanceIds` as a non-empty array of unique Provenance IDs. Every ID MUST resolve to the root registry. A present `provenanceIds` replaces, rather than extends, `defaultIds`; omission inherits `defaultIds` when present. Omission of both makes no portable provenance attribution for that primitive.

Multiple IDs mean that evidence from multiple records contributed to the declaration. Their order MUST NOT imply precedence, confidence, or merge order. Attribution inherits its primitive's protocol scope. Authors SHOULD use disjoint protocol-scoped primitive variants when attribution differs by protocol revision.

### 17.6 Projection, Merge, and Comparison

A single-version projection MUST preserve each retained primitive's effective attribution and every referenced record. It MAY prune unreferenced records, but MUST NOT synthesize records or change attribution.

Provenance is descriptive metadata rather than MCP runtime semantics. Compatibility analysis and runtime-contract comparison MUST ignore differences confined to provenance records or primitive attribution. Representation-preserving processing MUST nevertheless preserve those differences.

A merge tool SHOULD preserve records and attribution from every contributing document. It MUST deterministically remap a colliding document-local ID when the records differ, update every affected reference, and report a conflict only when the representation cannot preserve the inputs. When equivalent declarations in one Effective Protocol View receive contributions from multiple sources, the merged declaration SHOULD reference all contributing records. A merge MUST NOT infer completeness, confidence, precedence, or trust from record count, kind, producer, method, artifact, or time.

### 17.7 Consumer Policy, Security, and Privacy

Consumers MAY use provenance under externally selected policy for documentation, filtering, governance, comparison, or review. They MUST treat records and artifacts as untrusted assertions unless independently verified and MUST NOT infer collection completeness solely from attribution.

Provenance metadata MUST NOT contain credentials, tokens, personal user identifiers, person-specific roles, authorization claims, confidential topology, raw runtime session IDs, or other sensitive runtime context. Artifact URIs and recording times can expose infrastructure or operational information; authors SHOULD omit or redact optional data when publication creates risk. Artifact retrieval requires an explicit consumer-controlled network, authentication, tracking, and content-processing policy.

## 18. Reusable Components and Local References

### 18.1 Components Object

The root MCP Description Object MAY contain a `components` property. A Components Object MUST contain at least one property when present and MAY contain these typed namespace maps:

| Property | Type | Description |
|----------|------|-------------|
| `schemas` | non-empty map\<string, JSON Schema Object or Reference Object\> | Reusable schema values. |
| `toolExamples` | non-empty map\<string, Tool Example Object or Reference Object\> | Reusable Tool examples. |
| `resourceExamples` | non-empty map\<string, Resource Example Object or Reference Object\> | Reusable static Resource examples. |
| `resourceTemplateExamples` | non-empty map\<string, Resource Template Example Object or Reference Object\> | Reusable Resource Template examples. |

Every present namespace map MUST contain at least one entry. Each component name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and unique only within their namespace.

The outer Components Object MAY carry `x-*` specification extensions and MUST NOT contain other properties. Namespace maps are closed component-name maps rather than extension locations. Schema component values follow JSON Schema, including its extension-keyword rules. Tool, Resource, and Resource Template Example component values are eligible semantic objects and MAY carry the same `x-*` specification extensions as their inline forms. Components and component values MUST NOT declare MCP Description `protocolVersions`; protocol applicability is inherited exclusively from each use site.

### 18.2 Reference Object

A Reference Object contains exactly one required property:

| Property | Type | Description |
|----------|------|-------------|
| `$componentRef` | string | Local JSON Pointer to one named value in the compatible `#/components` namespace. |

No sibling property, including an `x-*` property, is permitted. The pointer MUST have the form `#/components/<namespace>/<name>`, where `<namespace>` is one of the four namespaces in Section 18.1 and `<name>` follows the component-name grammar. Remote URIs, relative-file references, pointers outside `#/components`, missing targets, and targets in an incompatible namespace are invalid.

A `$componentRef` is an MCP Description reference only at a use site that permits a Reference Object. JSON Schema `$ref` remains governed exclusively by the applicable embedded JSON Schema dialect. Implementations MUST NOT accept `$ref` as an MCP Description component reference and MUST NOT reinterpret a `$componentRef` nested inside an embedded JSON Schema.

### 18.3 Use Sites and Contextual Validation

Tool `inputSchema`, Tool `outputSchema`, and Elicitation Declaration `requestedSchema` MAY reference `#/components/schemas/<name>`. Tool `examples` values MAY reference `toolExamples`; Resource `examples` values MAY reference `resourceExamples`; and Resource Template `examples` values MAY reference `resourceTemplateExamples`.

Resolution substitutes the referenced JSON value before every contextual structural and semantic rule at the use site. A reusable schema or example MUST therefore conform independently under every containing primitive and effective protocol scope that references it. Component storage does not weaken Tool input object-root rules, Tool output revision rules, restricted Elicitation schemas, example/schema compatibility, completed-result shapes, URI relationships, or any other inline requirement.

### 18.4 Resolution

A conforming implementation MUST resolve Reference Objects as JSON Pointers into the same parsed MCP Description document. It MUST require the target to exist in the namespace appropriate to the use site, preserve the target JSON value for validation, follow component-to-component references transitively, and reject cycles. It MUST NOT access the network, filesystem, package registry, or another document while resolving `$componentRef`.

Resolution errors are document-conformance errors. A validator SHOULD report the use-site or component path and distinguish a malformed pointer, missing target, incompatible namespace, and cycle.

### 18.5 Projection

An Effective Protocol View MAY retain every component or prune components unused by retained declarations. A pruning projection MUST retain every component transitively reached through a retained Reference Object and MUST remove no target required by the projected document. It MUST validate all retained references after projection. The outer Components Object and namespace maps MUST be omitted if pruning would otherwise leave them empty, except that retained outer specification extensions keep the Components Object non-empty.

Components have no independent protocol scope. Their validity is determined only after use-site projection.

### 18.6 Merge

Merge tooling MUST preserve every referenced component and MUST NOT silently bind different component values to one name. It MAY deduplicate equivalent values. When different values collide at one namespace and name, tooling MAY fail with a merge conflict or deterministically rename one value and rewrite every affected Reference Object. A generated name MUST satisfy the component-name grammar, and all rewritten references MUST validate in the merged result.

Outer Components Object extensions with the same name and different values are conflicts unless the merge operation has an independently defined lossless representation. Merge processing MUST remain local and MUST NOT retrieve component values from a network or another document.

### 18.7 Security and Processing Limits

Components and referenced examples are untrusted document content. Implementations SHOULD bound reference depth, component count, nesting, and resolved validation work. They MUST detect cycles without unbounded recursion and MUST apply the same safe rendering, schema-evaluation, URI, content, and secret-handling rules as for inline values.
