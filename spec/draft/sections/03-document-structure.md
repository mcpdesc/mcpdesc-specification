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
| `components` | [Components Object](#171-components-object) | No | Reusable schemas and named primitive examples |
| `capabilities` | non-empty array\<[Capabilities Object](#8-capabilities)\> | No | Protocol-scoped server capability declarations |
| `tools` | non-empty array\<[Tool Object](#9-tools)\> | No | Tools declared by the document |
| `resources` | non-empty array\<[Resource Object](#1011-resource-object)\> | No | Resources declared by the document |
| `resourceTemplates` | non-empty array\<[Resource Template Object](#1021-resource-template-object)\> | No | Resource templates declared by the document |
| `prompts` | non-empty array\<[Prompt Object](#11-prompts)\> | No | Prompts declared by the document |
| `tags` | non-empty array\<[Tag Object](#13-tags)\> | No | Document-wide flat tag catalogue for primitive categorization |

The optional `$schema` property selects a JSON Schema resource for structural validation and editor tooling. It does not replace the required `mcpdesc` format discriminator or the document's declared MCP protocol coverage.

### 3.3 Optional Sections and Ordinary Collections

Only `mcpdesc`, `info`, and non-empty `protocolVersions` are required at the document root. Omission of any optional section means that the document makes no declaration for that section.

Unless a property's definition explicitly states otherwise, omission MUST NOT be interpreted as proof that the server does not support, expose, or use the corresponding runtime behavior.

An optional ordinary declaration collection MUST contain at least one entry when present.

A producer MUST omit such a property when it has no entries, and a consumer MUST reject a present empty collection.

This rule applies to root `transports`, `securitySchemes`, `capabilities`, `tools`, `resources`, `resourceTemplates`, `prompts`, and `tags`; the outer `components` object and each present component namespace map; icon, primitive tag-reference, Elicitation Declaration, Prompt Argument, and extension-capability collections; named Tool, Resource, Resource Template, and Prompt example maps; and Prompt and Resource Template `completionExamples` maps.

It does not constrain embedded JSON Schemas, specification-extension values, arbitrary literal example values, transport invocation values, or protocol-native content and annotation collections, which follow their own rules.

An empty collection remains valid when its property definition assigns distinct semantics to emptiness. In particular, implementations MUST preserve `security: []`, `security: [{}]`, and empty scope arrays in Security Requirement Objects.

### 3.4 Zero-Primitive Descriptions

A document MAY omit all of `tools`, `resources`, `resourceTemplates`, and `prompts`. Such a document can describe a server under development, a legitimately empty server, or an authorization-scoped observation.

Absence of a primitive collection MUST NOT be interpreted as proof that no other runtime context exposes primitives of that kind.

### 3.5 MCP `_meta`

The `_meta` property allows additional metadata to be attached to a Tool, Resource, Resource Template, or Prompt declaration, and to supported result or content objects in named examples. It MAY appear only when every revision in the object's Effective Protocol View defines `_meta` for the corresponding MCP object.

Metadata in a named example describes only that example. It does not define a reusable metadata schema or require a server to send the same metadata.

Each key name, its use, and the value of any reserved key MUST follow the rules of every applicable MCP protocol revision. A recognized violation is a document-conformance error. A valid but unrecognized key under an MCP-reserved prefix MUST be preserved and SHOULD produce a warning. Other valid keys MUST be accepted and preserved. A protocol-version projection MUST preserve `_meta` and MUST NOT combine metadata from variants that cover different protocol revisions.


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
  "$schema": "https://mcpdesc.org/schema/mcp-description/0.8.0-rc.2.json",
  "mcpdesc": "0.8.0",
  "info": {
    "name": "chess-rating-server",
    "version": "1.0.0"
  },
  "protocolVersions": ["2026-07-28"]
}
```

This document makes no transport or primitive declaration. Those omissions do not assert runtime non-support.

