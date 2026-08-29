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

Only `mcpdesc`, `info`, and non-empty `protocolVersions` are required at the document root. Omission of any optional section means that the document makes no declaration for that section. Unless a property's definition explicitly states otherwise, omission MUST NOT be interpreted as proof that the server does not support, expose, or use the corresponding runtime behavior.

An optional ordinary declaration collection MUST contain at least one entry when present. A producer MUST omit such a property when it has no entries, and a consumer MUST reject a present empty collection. This rule applies to root `transports`, `securitySchemes`, `capabilities`, `tools`, `resources`, `resourceTemplates`, `prompts`, and `tags`; the outer `components` object and each present component namespace map; icon, primitive tag-reference, Elicitation Declaration, Prompt Argument, and extension-capability collections; named Tool, Resource, Resource Template, and Prompt example maps; and Prompt and Resource Template `completionExamples` maps. It does not constrain embedded JSON Schemas, specification-extension values, arbitrary literal example values, transport invocation values, or protocol-native content and annotation collections, which follow their own rules.

An empty collection remains valid when its property definition assigns distinct semantics to emptiness. In particular, implementations MUST preserve `security: []`, `security: [{}]`, and empty scope arrays in Security Requirement Objects.

### 3.4 Zero-Primitive Descriptions

A document MAY omit all of `tools`, `resources`, `resourceTemplates`, and `prompts`. Such a document can describe a server under development, a legitimately empty server, or an authorization-scoped observation.

Absence of a primitive collection MUST NOT be interpreted as proof that no other runtime context exposes primitives of that kind.

### 3.5 MCP `_meta`

MCP-derived declaration and example objects identified by this specification MAY carry a literal `_meta` object when every revision in their Effective Protocol View defines `_meta` on the corresponding MCP object. A declaration `_meta` is the literal metadata on that Tool, Resource, Resource Template, or Prompt declaration. An example `_meta` is one illustrative literal value on the represented completed result or content object. Neither form declares a reusable metadata schema or requires a live server to emit the shown value.

Each `_meta` key, reserved namespace, permitted context, and reserved value shape MUST satisfy every applicable MCP protocol revision. Recognized violations are document-conformance errors. An otherwise valid but unrecognized key under an MCP-reserved prefix MUST be preserved and SHOULD produce a warning rather than be treated as unauthorized solely because it is unknown to the validator. Valid unprefixed and third-party-prefixed keys MUST be accepted and preserved.

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
  "$schema": "https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json",
  "mcpdesc": "0.8.0",
  "info": {
    "name": "chess-rating-server",
    "version": "1.0.0"
  },
  "protocolVersions": ["2026-07-28"]
}
```

This document makes no transport or primitive declaration. Those omissions do not assert runtime non-support.

