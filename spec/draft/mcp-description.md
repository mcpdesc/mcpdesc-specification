---
title: MCP Description Specification
version: 0.8.0
status: Community working draft
released: false
baseline: 0.7.0
date: 2026-07-28
editors:
  - name: Cisco DevNet (v0.7.0 baseline)
    url: https://developer.cisco.com
  - name: Stève Sfartz (v0.8.0 draft)
    url: https://github.com/stsfartz
  - name: "{mcpdesc} community"
    url: https://github.com/mcpdesc/mcpdesc-specification
---

# MCP Description Specification

**Version**: 0.8.0 (community working draft)

**Status**: Community working draft — not released

**Baseline**: v0.7.0

**Date**: 2026-07-28

## Abstract

This specification defines the **MCP Description** format — a portable, machine-readable document that describes the durable, externally relevant surface of a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server.

An MCP Description declares supported MCP protocol revisions, instructions, transports, security requirements, capabilities, tools, resources, resource templates, prompts, and metadata in a static JSON document. It enables offline discovery, documentation generation, description validation, change analysis, testing, governance, and [interoperable tooling](../implementations.md) across the MCP ecosystem.

## Status of This Document

This document is the **community working draft** for MCP Description v0.8.0. It is **not** a released specification and may change during implementation and interoperability testing. The current stable release is v0.7.0, whose canonical source remains the Cisco Open `mcptoolkit-contract` repository.

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
A JSON document conforming to this specification that describes an MCP server surface.

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

An MCP Description document MUST be a JSON document encoded in UTF-8.

The RECOMMENDED file extension is `.mcpdesc.json`. Implementations MAY also accept `.mcp-description.json`.

The RECOMMENDED media type is `application/mcp-description+json`.

### 3.2 Root Object

The root of an MCP Description document is a JSON object with the following structure:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$schema` | string | No | JSON Schema reference for IDE validation |
| `mcpdesc` | string | **Yes** | Specification version (`"0.8.0"`) |
| `info` | [Info Object](#5-info-object) | **Yes** | Server metadata |
| `protocolVersions` | array\<string\> | **Yes** | MCP protocol revisions described by the document |
| `instructions` | string | No | Durable natural-language guidance for using the server |
| `transports` | array\<[Transport Object](#6-transports)\> | **Yes** | Supported transports (at least one) |
| `securitySchemes` | map\<string, [Security Scheme Object](#72-security-scheme-object)\> | No | Reusable named security schemes |
| `security` | [Security Requirement Array](#73-security-requirement-array) | No | Default security requirements |
| `capabilities` | non-empty array\<[Capabilities Object](#8-capabilities)\> | No | Protocol-scoped server capability declarations |
| `tools` | array\<[Tool Object](#9-tools)\> | No | Tools exposed by the server |
| `resources` | array\<[Resource Object](#10-resources)\> | No | Resources exposed by the server |
| `resourceTemplates` | array\<[Resource Template Object](#10-resources)\> | No | Resource templates |
| `prompts` | array\<[Prompt Object](#11-prompts)\> | No | Prompts exposed by the server |
| `tags` | array\<[Tag Object](#13-tags)\> | No | Document-wide flat tag catalogue for primitive categorization |

### 3.3 Zero-Primitive Descriptions

A document MAY omit all of `tools`, `resources`, `resourceTemplates`, and `prompts`. Such a document can describe a server under development, a legitimately empty server, or an authorization-scoped observation.

Absence of a primitive collection MUST NOT be interpreted as proof that no other runtime context exposes primitives of that kind.

### 3.4 MCP `_meta`

MCP-derived declaration and example objects identified by this specification MAY carry a literal `_meta` object when every revision in their Effective Protocol View defines `_meta` on the corresponding MCP object. A declaration `_meta` is the literal metadata on that Tool, Resource, Resource Template, or Prompt declaration. An example `_meta` is one illustrative literal value on the represented completed result or content object. Neither form declares a reusable metadata schema or requires a live server to emit the shown value.

For MCP 2025-06-18 and later, each `_meta` key MUST follow the applicable MCP key-name grammar. A key consists of an optional prefix and a possibly empty name. A prefix is one or more dot-separated labels followed by `/`; each label starts with a letter, ends with a letter or digit, and otherwise contains only letters, digits, or hyphens. A non-empty name starts and ends with an alphanumeric character and otherwise contains only alphanumerics, hyphens, underscores, or dots. Reverse-DNS prefix order is RECOMMENDED. Validators MUST reject malformed keys.

Reserved-prefix recognition is revision-specific. MCP 2025-06-18 reserves the prefix forms defined by that revision; MCP 2025-11-25 and MCP 2026-07-28 reserve a prefix whose second label is `modelcontextprotocol` or `mcp`. A validator MUST reject a recognized reserved key used with an invalid value shape or in a represented context where the applicable MCP revision does not define it. A validator that encounters an otherwise valid but unrecognized key under an MCP-reserved prefix MUST preserve it and SHOULD warn rather than infer that it is unauthorized. Valid unprefixed and third-party-prefixed keys MUST be accepted and preserved.

In contexts represented by 0.8.0, MCP 2026-07-28 `io.modelcontextprotocol/serverInfo` is valid on a completed result `_meta` and its value MUST have at least string `name` and `version` properties. MCP 2025-11-25 `io.modelcontextprotocol/related-task` is valid on a represented result and MUST contain a string `taskId`. Request-only keys such as `progressToken` and the MCP 2026 per-request protocol fields, and notification-only keys such as `io.modelcontextprotocol/subscriptionId`, MUST NOT be placed on declarations, ordinary result examples, or content objects. MCP 2026 trace-context keys are reserved wherever `_meta` is represented and MUST have non-empty string values. These rules do not authorize metadata in an object that the applicable MCP revision does not define as carrying `_meta`.

Complete revision-specific semantic validation begins with MCP 2025-06-18. MCP 2024-11-05 and MCP 2025-03-26 remain recognized legacy compatibility revisions: validators MUST apply sound structural and selected checks, SHOULD warn that validation is incomplete, and MUST NOT report partial validation as complete MCP semantic conformance.

MCP `_meta`, root `x-*` specification extensions, and `capabilities.extensions` are independent mechanisms. Tooling MUST preserve them independently and MUST NOT automatically project or reinterpret one as another. Projection MUST preserve `_meta` on each selected declaration and named example without merging metadata from disjoint protocol variants.

Authors MUST NOT publish credentials, tokens, user identifiers, internal topology, live trace identifiers, or other runtime-sensitive data in static `_meta`; fictitious or redacted values MUST be used where disclosure creates risk. Consumers MUST treat keys and values as untrusted data and apply appropriate size, rendering, logging, and processing limits.

### 3.5 Property Ordering

Property ordering within JSON objects is not significant. Implementations MUST NOT depend on property order.

### 3.6 Specification Extensions

Any property at the root level whose name matches the pattern `^x-` is a specification extension. See [Section 14: Specification Extensions](#14-specification-extensions) for details.

### 3.7 Additional Properties

Properties not defined in this specification and not matching the `x-` extension pattern MUST NOT appear at the root level. Implementations SHOULD reject documents containing unknown root-level properties.

### 3.8 Example

A minimal valid MCP Description document:

```json
{
  "$schema": "https://mcpdesc.org/schema/0.8.0.json",
  "mcpdesc": "0.8.0",
  "info": {
    "name": "chess-rating-server",
    "version": "1.0.0"
  },
  "protocolVersions": ["2025-11-25"],
  "transports": [
    { "type": "stdio", "command": "chess-rating", "args": ["serve"] }
  ],
  "tools": [
    {
      "name": "get_player_rating",
      "description": "Get the current Elo rating for a chess player",
      "inputSchema": {
        "type": "object",
        "properties": {
          "player_id": { "type": "string", "description": "Player identifier" }
        },
        "required": ["player_id"]
      }
    }
  ]
}
```

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
7. optionally omit empty primitive collections; and
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
| `icons` | array\<[Icon](#icon-object)\> | No | Icons for UI display. Maps to `Implementation.icons` (MCP, since 2025-11-25). |
| `websiteUrl` | string (URI) | No | URL of the server's website. Maps to `Implementation.websiteUrl` (MCP, since 2025-11-25). |
| `contact` | [Contact Object](#53-contact-object) | No | Contact information (OpenAPI-style, not part of MCP `Implementation`). |
| `license` | [License Object](#54-license-object) | No | License information (OpenAPI-style, not part of MCP `Implementation`). |

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

The `transports` property declares one or more communication mechanisms supported by the MCP server. It is REQUIRED and MUST contain at least one transport object.

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

The union of all effective transport protocol scopes MUST equal root `protocolVersions`. Transport scopes MAY overlap because a server can expose multiple transports for one revision.

A document is invalid when any root revision has no applicable transport or when a transport scope contains a revision outside root coverage.

### 6.6 Extensibility

Transport objects MUST NOT contain additional properties beyond those defined for their type plus the common optional `protocolVersions` and `security` properties. Vendor-specific transport metadata SHOULD be placed in specification extensions at the root level.

## 7. Security

MCP Description represents statically known authentication and authorization through reusable named Security Scheme Objects and Security Requirement Arrays. Both `securitySchemes` and `security` are OPTIONAL.

These declarations describe access requirements. They do not define token acquisition, authorization-server discovery, runtime access-control policy, or authorization-filtered discovery behavior.

### 7.1 Named Security Schemes

Root `securitySchemes` is a map from a local name to a Security Scheme Object. Every local name MUST match `^[A-Za-z0-9._-]+$`.

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
| `extensions` | map\<string, object\> | Formal MCP extension capabilities (MCP 2026-07-28) |
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

Unknown capability properties SHOULD be preserved. Root `x-*` specification extensions and MCP capability `extensions` are distinct namespaces.

### 8.5 Scope Uniqueness

Effective Capabilities Object scopes MUST be pairwise disjoint. At most one Capabilities Object may apply to a protocol revision.

### 8.5 Example

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
| `inputSchema` | object | **Yes** | JSON Schema whose root describes an object containing tool input parameters. |
| `outputSchema` | object | No | JSON Schema for structured tool output. Since MCP 2025-06-18. |
| `annotations` | [Tool Annotations Object](#95-tool-annotations) | No | Behavioral hints. Since MCP 2025-03-26. |
| `execution` | [Execution Object](#96-execution-object) | No | Execution properties. MCP 2025-11-25 only. |
| `examples` | map&lt;string, Tool Example Object&gt; | No | Named complete Tool invocation/result pairs. |
| `icons` | array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | array\<Elicitation Declaration Object\> | No | Additional user interactions that MAY be required while fulfilling the Tool (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the tool is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Tool declaration, subject to [Section 3.4](#34-mcp-_meta). Since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |

### 9.2 Input and Output Schemas

Every Tool MUST contain `inputSchema`. Absence MUST NOT be interpreted as evidence that the Tool accepts no arguments. The schema root MUST describe an object.

A closed no-parameter Tool SHOULD use `{ "type": "object", "additionalProperties": false }`. An open unspecified-parameter Tool may use `{ "type": "object" }`, but this is NOT RECOMMENDED because it gives little validation or guidance. A declared-parameter schema uses `properties` and, when undeclared properties must be rejected, `additionalProperties: false`.

The `outputSchema` property, when present, MUST be a valid JSON Schema object describing the tool's structured output. For MCP 2025-11-25 and MCP 2026-07-28, it defaults to JSON Schema 2020-12 when no explicit `$schema` is provided.

For MCP 2025-11-25 and MCP 2026-07-28, both schemas MAY include an explicit `$schema` property to declare the JSON Schema dialect. Earlier revisions do not define that property on Tool schemas. For MCP 2026-07-28, validators MUST accept the applicable JSON Schema 2020-12 vocabulary, including references, composition, and conditionals, plus MCP-defined annotations where valid. Earlier views MUST be checked according to their applicable MCP schema rules.

For MCP 2025-11-25 and MCP 2026-07-28, every embedded Tool schema MUST be valid under its declared or default dialect. Both revisions default to JSON Schema 2020-12. A validator MUST reject a schema whose declared dialect it does not support.

The supported revisions before MCP 2025-11-25 define an object-rooted Tool schema shape but do not state an embedded-schema dialect default. For those revisions, validators MUST enforce the applicable shape without inferring a dialect solely from the enclosing generated MCP schema. `properties`, when present, MUST be an object whose values are objects, and `required`, when present, MUST be an array of strings. Other keywords MUST be preserved and MUST NOT be rejected solely by applying an inferred meta-schema.

An mcpdesc validator MUST NOT automatically retrieve an external `$ref` target from a network. It MAY resolve external references from an explicitly supplied trusted local catalogue or an explicitly enabled resolver that follows the applicable MCP security guidance. If a target remains unavailable, the `$ref` MUST be preserved and its presence alone MUST NOT make the containing MCP Description invalid. The validator SHOULD warn that complete embedded-schema validation was not possible and MUST NOT report a weakened or partial validation as complete. Consumers that require executable schema certainty SHOULD require resolution or treat this warning as an error. Authors SHOULD prefer self-contained Tool schemas using local `$defs`.

Before MCP 2026-07-28, `outputSchema` MUST declare an object root. MCP 2026-07-28 permits any valid JSON Schema root for `outputSchema`.

MCP 2026-07-28 `inputSchema` properties MAY use `x-mcp-header` to map an input to an HTTP header. The annotation value MUST be a non-empty HTTP field-name token and MUST be unique case-insensitively within that `inputSchema`. It is valid only on a `string`, `integer`, or `boolean` property that is statically reachable from the schema root through `properties` chains. It MUST NOT be used on a property reached through arrays, composition, conditionals, or `$ref`.

### 9.3 Named Tool Examples

A Tool Object MAY contain `examples`, a map from a local example name to a Tool Example Object. When present, the map MUST contain at least one entry. Each name MUST match `^[A-Za-z0-9._-]+$`; names are case-sensitive, scoped to the containing Tool declaration, and serve as both human-meaningful labels and stable local selection names. Entry order is not semantically significant.

A Tool Example Object contains exactly these properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `input` | object | **Yes** | Complete `params.arguments` value from a `tools/call` request. |
| `result` | object | **Yes** | Complete applicable completed Tool Result payload, excluding the JSON-RPC envelope. |

The Tool Example Object MUST NOT contain additional properties. In particular, 0.8.0 does not define `summary`, `description`, `externalValue`, or references to reusable examples.

`input` MUST be an object and MUST validate against the containing Tool's `inputSchema` under every applicable protocol revision's schema rules. A no-argument invocation MUST use `input: {}`. Schema-invalid values belong in negative test material, not conforming Tool Examples.

`result` MUST contain `content` and MUST have the completed Tool Result shape defined by every applicable protocol revision. For MCP 2026-07-28 it MUST contain `resultType: "complete"`; earlier revisions MUST NOT contain `resultType`. Task, input-required, streaming, progress, JSON-RPC envelope, and JSON-RPC protocol-error forms are not Tool Examples. Content blocks MAY use any text, image, audio, embedded-resource, or resource-link form supported by every applicable revision.

Revision-supported `_meta` on the completed result, content blocks, and embedded Resource Contents is literal illustrative metadata governed by [Section 3.4](#34-mcp-_meta). It is not a schema or a request-metadata declaration. In MCP 2026-07-28, a result example MAY use `io.modelcontextprotocol/serverInfo` with an MCP Implementation value; request-only and notification-only reserved keys are invalid in these represented contexts.

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
| `icons` | array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | array\<Elicitation Declaration Object\> | No | Additional user interactions that MAY be required while reading the Resource (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the resource is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Resource declaration, subject to [Section 3.4](#34-mcp-_meta). Since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |

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
| `icons` | array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | array\<Elicitation Declaration Object\> | No | Additional user interactions that MAY be required while reading an expanded Resource (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the template is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Resource Template declaration, subject to [Section 3.4](#34-mcp-_meta). Since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |

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

A Resource or Resource Template Object MAY contain an `examples` map. When present, it MUST contain at least one entry. Each case-sensitive local example name MUST match `^[A-Za-z0-9._-]+$` and is scoped to its containing declaration. Entry order is not semantically significant. The map key is both a human-meaningful label and a stable local selection name; 0.8.0 does not define separate example prose fields.

Declarations for the same `uri` or `uriTemplate` in disjoint effective protocol scopes have independent example maps.

#### 10.4.2 Static Resource Example Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `result` | [Completed Resource Read Result](#1044-completed-resource-read-result) | **Yes** | Completed `resources/read` result payload for the containing Resource's `uri`, excluding the JSON-RPC envelope. |

No additional properties are allowed. The requested URI is implicit in the containing Resource and MUST NOT be duplicated at the example level.

#### 10.4.3 Resource Template Example Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `uri` | string | **Yes** | Concrete Resource URI used as `resources/read.params.uri`. |
| `result` | [Completed Resource Read Result](#1044-completed-resource-read-result) | **Yes** | Completed `resources/read` result payload for `uri`, excluding the JSON-RPC envelope. |

No additional properties are allowed. `uri` MUST be a valid RFC 6570 expansion of the containing `uriTemplate`. It records the exact request value rather than reverse-inferred template variables.

#### 10.4.4 Completed Resource Read Result

The `result` value represents the value inside a successful JSON-RPC response's `result` member. It MUST contain a non-empty `contents` array. For MCP 2026-07-28 it MUST contain `resultType: "complete"`; for earlier supported revisions it MUST NOT contain `resultType`. Result `_meta` and Resource Contents `_meta` are available from MCP 2025-06-18 and are literal illustrative values governed by [Section 3.4](#34-mcp-_meta), not reusable metadata contracts. In MCP 2026-07-28, result `_meta` MAY use `io.modelcontextprotocol/serverInfo` with an MCP Implementation value; request-only and notification-only reserved keys are invalid here. JSON-RPC envelope fields, errors, task state, input-required state, and other non-completed workflows MUST NOT appear.

Every `contents` entry MUST contain `uri` and exactly one of `text` or `blob`. A `blob` value MUST be valid base64. An example MAY contain multiple entries; consumers MUST preserve their order and MUST NOT assume every returned URI equals the requested URI.

For both static and template examples, at least one returned entry SHOULD identify the requested URI unless documented collection or indirection semantics explain otherwise. Every returned URI MUST be valid. When the declaration has `mimeType`, the corresponding returned entry SHOULD use the same type; a validator SHOULD warn rather than fail when they differ because an individual representation may legitimately be more specific. The entry's own `mimeType` is authoritative for rendering it.

For a static Resource with `size`, tooling MAY compare the declared raw byte count with matching example text encoded as UTF-8 or decoded binary. A mismatch SHOULD be reported as a warning because examples and mutable Resources can represent different observations.

Resource read errors are JSON-RPC errors and are not Resource Examples in 0.8.0.

#### 10.4.5 Use, Projection, and Security

Resource examples are illustrative, non-exhaustive snapshots. They do not assert live equality, freshness, immutability, cache validity, or complete coverage. Revision-supported metadata is part of the example and is not a guarantee about a live server.

Documentation tooling SHOULD preserve names, concrete template URIs, result fields, and content order. Mock and contract-test tooling MAY select an exact named example. It MUST NOT dereference example URIs or fetch a live Resource while loading or serving an inline example. This specification defines no default example, wildcard match, template fallback, dynamic behavior, external value, or reusable root component.

Resource examples are MCP Description metadata, not fields of MCP Resource or Resource Template list values. Projection to MCP list values MUST omit `examples` unless an independent MCP extension defines a destination. Effective Protocol View projection preserves the selected declaration's map and MUST NOT combine maps from declarations with disjoint scopes. MCP Description round-tripping MUST preserve example names and values.

Examples and their URIs are untrusted. Authors MUST NOT include secrets and SHOULD use conspicuously fictitious content. Consumers MUST NOT dereference URIs automatically, MUST render content safely, MUST treat MIME types as untrusted hints, and SHOULD impose encoded-size, decoded-size, and processing limits. Binary fixtures SHOULD be decoded and inspected before publication.

### 10.5 Protocol Variants and Security

Resources with the same `uri` MUST have pairwise-disjoint effective protocol scopes. Resource Templates with the same `uriTemplate` MUST likewise have pairwise-disjoint effective protocol scopes.

Resource `security` describes statically known authorization required to access it. Resource Template `security` describes authorization required to use the template to access matching resources. Each replaces inherited transport or root security in full.

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
| `arguments` | array\<[Prompt Argument](#112-prompt-argument-object)\> | No | Prompt arguments. |
| `icons` | array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | array\<Elicitation Declaration Object\> | No | Additional user interactions that MAY be required while retrieving the Prompt (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the prompt is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Prompt declaration, subject to [Section 3.4](#34-mcp-_meta). Since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |

Prompt declarations with the same `name` MUST have pairwise-disjoint effective protocol scopes. Prompt `security` describes statically known authorization required to retrieve the Prompt and replaces inherited transport or root security in full.

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

Tool, Resource, Resource Template, and Prompt Objects MAY contain an `elicitations` array of Elicitation Declaration Objects. A Resource Template declaration applies to `resources/read` operations on concrete Resource URIs produced from that template; it does not describe elicitation during template discovery.

An Elicitation Declaration describes durable server behavior rather than the protocol-specific wire exchange. It does not assert that every fulfillment triggers the interaction or that every client can fulfill it.

### 12.2 Elicitation Declaration Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Stable local declaration name. |
| `mode` | `"form"` or `"url"` | **Yes** | Canonical elicitation mode. |
| `message` | string | **Yes** | Representative user-facing explanation of the interaction. |
| `when` | string | No | Human-readable description of when the interaction may occur. |
| `requestedSchema` | object | Conditional | Restricted MCP form-response schema. |
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

MCP 2024-11-05 and MCP 2025-03-26 retain the legacy compatibility treatment in Section 3.4. Validators apply structural and selected sound checks, issue the existing incomplete-validation diagnostic, and MUST NOT report complete MCP semantic conformance.

### 12.6 Static-Description Boundary

The applicable MCP revision remains authoritative for execution. MCP Description does not model whether elicitation uses a server-initiated request or Multi Round-Trip Requests, nor lifecycle messages, identifiers, request state, retries, correlation, capability negotiation, or transport behavior.

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

The root-level `tags` array defines a flat, document-wide tag catalogue for the MCP server. It is OPTIONAL. Tags are supplemental MCP Description metadata; they are not fields defined by the MCP protocol.

When present, `tags` declares all valid tags that MAY be referenced by tools, resources, resource templates, and prompts. The array order determines display priority — tags appearing earlier in the array SHOULD be presented first in UIs and documentation.

### 13.1 Tag Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Tag identifier. MUST be unique across all tags. |
| `description` | string | No | Human-readable description of the tag's purpose. |

### 13.2 Tag Uniqueness

Tag names MUST be unique across all tags in the array. Implementations MUST reject documents containing duplicate tag names.

### 13.3 Tag References

Per-entity `tags` arrays (on tools, resources, resource templates, and prompts) contain plain strings referencing tag names. When a root-level `tags` array is present:

- Every tag referenced by an entity MUST be declared in the root `tags` array.
- Implementations MUST treat a reference to an undeclared tag as a validation error.
- Per-entity tag arrays MUST NOT contain duplicate values.

When the root-level `tags` array is absent, per-entity tags are unconstrained strings (backward-compatible behavior). When it is present but empty, no per-entity tag reference is valid.

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

MCP Description documents support vendor-specific metadata through specification extensions.

### 14.1 Extension Naming

Specification extension properties MUST match the pattern `^x-`. The RECOMMENDED naming convention is:

```
x-{organization}-{feature}
```

Examples:

- `x-cisco-metadata`
- `x-acme-deployment`
- `x-myorg-governance`

### 14.2 Extension Placement

Specification extensions MAY appear at the root level of an MCP Description document. Extensions MUST NOT appear within objects defined by this specification (e.g., within `info`, `transports` items, or tool objects) unless the object explicitly allows additional properties.

### 14.3 Extension Values

Extension values MAY be of any JSON type: object, array, string, number, boolean, or null.

### 14.4 Processing Rules

Implementations that do not recognize a specification extension MUST ignore it and MUST NOT reject the document.

Implementations SHOULD preserve unrecognized extensions when processing and re-serializing MCP Description documents.

### 14.5 Extension Documentation

Extension authors SHOULD publish a specification for their extension, including:

- A JSON Schema defining the extension's structure
- Documentation of the extension's purpose and semantics
- Versioning information

### 14.6 Example

```json
{
  "$schema": "https://mcpdesc.org/schema/0.8.0.json",
  "mcpdesc": "0.8.0",
  "info": {
    "name": "chess-coach",
    "version": "2.1.0"
  },
  "protocolVersions": ["2025-11-25"],
  "transports": [
    { "type": "stdio", "command": "chess-coach", "args": ["mcp"] }
  ],
  "tools": [
    {
      "name": "analyze_game",
      "description": "Analyze a chess game from PGN notation",
      "inputSchema": {
        "type": "object",
        "properties": { "pgn": { "type": "string" } },
        "required": ["pgn"],
        "additionalProperties": false
      }
    }
  ],
  "x-cisco-metadata": {
    "version": "0.2.0",
    "dump": {
      "toolName": "mcpcontract",
      "toolVersion": "0.8.0",
      "createdAt": "2026-03-15T14:30:00Z"
    }
  },
  "x-acme-deployment": {
    "region": "us-west-2",
    "tier": "production"
  }
}
```

## 15. Serialization

### 15.1 JSON Format

An MCP Description document MUST be serialized as a JSON document conforming to [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259).

### 15.2 Character Encoding

MCP Description documents MUST be encoded in UTF-8.

### 15.3 Numeric Values

JSON numbers SHOULD be used for numeric values. Implementations MUST support IEEE 754 double-precision floating-point numbers.

### 15.4 Null Values

Properties with `null` values SHOULD be omitted from the document rather than included with a `null` value, unless the property explicitly permits `null`.

### 15.5 Empty Arrays and Objects

Empty arrays and objects MAY be omitted only when the property's semantics explicitly make omission equivalent. Implementations MUST preserve semantically significant empty values. In particular, `security: []` clears inherited security while omission inherits it, and `security: [{}]` declares an anonymous alternative; these forms are not interchangeable.

### 15.6 String Values

String values MUST be valid JSON strings. URI values MUST conform to [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986). Email values SHOULD conform to [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322). Date values MUST conform to ISO 8601.

### 15.7 Schema Reference

MCP Description documents SHOULD include a `$schema` property referencing the appropriate JSON Schema for IDE validation and tooling support:

```json
{
  "$schema": "https://mcpdesc.org/schema/0.8.0.json",
  "mcpdesc": "0.8.0"
}
```

## 16. Conformance

### 16.1 Document Conformance

A conforming MCP Description document MUST:

1. Be a valid JSON document (Section 15).
2. Include the `mcpdesc` property with a recognized specification version (Section 4).
3. Include the `info` object with at least `name` and `version` (Section 5).
4. Include non-empty root `protocolVersions` containing only revisions supported by mcpdesc 0.8.0 (Section 4).
5. Include the `transports` array with at least one transport object and complete root protocol coverage (Section 6).
6. Validate against the JSON Schema for the declared `mcpdesc` version.
7. Satisfy semantic scope, identifier, Elicitation Declaration, security-reference, tag-reference, revision-applicability, embedded Tool schema and example, and `x-mcp-header` constraints.
8. Not contain unknown properties at the root level except specification extensions matching `^x-`.

### 16.2 Implementation Conformance

A conforming implementation (tool, validator, or platform) MUST:

1. Accept and correctly parse documents conforming to this specification.
2. Reject documents that fail the requirements in Section 16.1.
3. Ignore unrecognized specification extensions without error (Section 14.4).
4. Preserve specification extensions when processing and re-serializing documents (Section 14.4).
5. Apply structural JSON Schema validation and the cross-object semantic requirements of this specification.

The published JSON Schema expresses structural constraints only. JSON-Schema-only acceptance is insufficient for document conformance because protocol scope, revision applicability, Elicitation Declarations, security references, embedded Tool schemas and examples, extension namespace diagnostics, and other cross-object rules require semantic validation.

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
- **[JSON Schema]** Wright, A., Andrews, H., Hutton, B., "JSON Schema: A Media Type for Describing JSON Documents", draft-bhutton-json-schema-01, June 2022.

### Informative References

- **[MCP Protocol]** Anthropic, "Model Context Protocol Specification", https://modelcontextprotocol.io
- **[OpenAPI 3.1]** OpenAPI Initiative, "OpenAPI Specification v3.1.0", https://spec.openapis.org/oas/v3.1.0
- **[Semantic Versioning]** Preston-Werner, T., "Semantic Versioning 2.0.0", https://semver.org
