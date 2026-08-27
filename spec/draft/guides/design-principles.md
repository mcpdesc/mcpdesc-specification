# Design Principles

The MCP Description Specification follows several core design principles that guide its structure and evolution.

## 1. Alignment with Existing API Ecosystem Standards

The specification adopts structures familiar to API developers, drawing from [OpenAPI](https://www.openapis.org/):

- **`info` object** with `name`, `version`, `contact`, and `license` — directly modeled after OpenAPI's Info Object
- **Named `securitySchemes` and requirement arrays** aligned with familiar OpenAPI 3.1 concepts
- **Declarative capability descriptions** — the document describes *what* the server offers, not *how* it works internally

This reduces the learning curve for developers already familiar with the API ecosystem.

## 2. MCP-Native Structures

While borrowing patterns from OpenAPI, the specification uses **MCP protocol structures directly** for capabilities:

- Tools use MCP's `inputSchema` / `outputSchema` format (not OpenAPI's Operation Object)
- Resources use MCP's `uri` / `mimeType` pattern
- Prompts use MCP's `arguments` array format
- Capabilities preserve durable MCP server semantics across supported protocol revisions

Runtime observations can populate MCP-native declarations, but generators must not infer unobserved revisions, primitives, or authorization policy.

## 3. Explicit Capability Declarations

The document explicitly describes server capabilities:

| Capability | What's Declared |
|-----------|----------------|
| Tools | Names, input/output schemas, behavioral annotations |
| Resources | URIs, content types, descriptions |
| Resource Templates | URI templates, parameters |
| Prompts | Names, arguments, descriptions |
| Capabilities | Feature flags (subscriptions, notifications) |
| Transports | Connection methods and endpoints |

Clients can understand server functionality without executing protocol calls.

## 4. Vendor Extensions

The specification allows vendor-specific metadata using the `x-` prefix convention (borrowed from OpenAPI and HTTP headers). This enables:

- Runtime observation metadata
- Platform-specific annotations
- Governance and compliance attributes
- Generation and observation metadata

The core specification remains vendor-neutral while extensions evolve independently.

## 5. Strict Core, Flexible Extensions

The core specification defines a strict schema ensuring:

- Predictable document structure
- Strong validation
- Consistent tooling behavior

Extensions remain unrestricted in their value structure — they can be objects, arrays, strings, or any JSON value.

## 6. Separation of Description and Observation

The specification distinguishes between:

| Layer | Purpose | Example |
|-------|---------|---------|
| **Described surface** | Durable, externally relevant server semantics | Tools, resources, prompts |
| **Metadata** | Who built it and how | Authors, generation metadata |
| **Observation** | What was discovered at runtime | Latency, CORS support, session behavior |

Server-surface declarations live in the core specification. Source-specific generation metadata and runtime diagnostics belong in extensions such as `x-cisco-metadata`. An observed view need not claim a server's exhaustive surface.

## 7. Offline-First

An MCP Description document is a **static artifact** that can be:

- Stored in a git repository
- Published to a registry
- Indexed by a search engine
- Validated in a CI pipeline
- Displayed in a documentation portal

No running server is needed to read, validate, or process the document.

## 8. Minimal Required Fields

The specification minimizes required fields:

- `mcpdesc` — which specification version
- `info.name` + `info.version` — identity
- `protocolVersions` — which MCP revisions are described
- `transports` — how to connect (at least one)

Everything else is optional. Zero-primitive descriptions are valid, including descriptions of servers under development or authorization-scoped observations.
