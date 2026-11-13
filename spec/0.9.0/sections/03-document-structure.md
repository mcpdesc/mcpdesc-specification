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

<a id="req-meta-reserved-prefix"></a>A valid but unrecognized key under an MCP-reserved prefix MUST be preserved and SHOULD produce a warning. Other valid keys MUST be accepted and preserved.

A single-version projection MUST preserve `_meta`. It MUST NOT combine metadata from variants that cover different protocol versions.

### 3.6 Carried MCP Values

Named examples carry MCP values in these places:

- `result` in Tool Examples and Tool Interaction Examples;
- `response` in Tool Interaction steps for sampling, elicitation, and roots; and
- `result` in Resource, Resource Template, Prompt, and completion examples.

This includes values reached through component references.

A conforming validator MUST validate each carried value against the type defined by every MCP protocol version in the containing declaration's effective scope. A type accepts fields it does not list only if its protocol version's TypeScript schema declares or inherits an index signature. Such a type is open; every other type is closed.

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
