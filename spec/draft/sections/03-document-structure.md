## 3. Document Structure

### 3.1 Format

An MCP Description document is a JSON-compatible data model composed only of objects whose property names are strings, arrays, strings, finite JSON numbers, booleans, and null. Its semantic meaning is defined by this data model independently of whether it is serialized as JSON or YAML.

<a id="req-conforming-serialization"></a>An MCP Description document MUST use one of the conforming serializations defined in Section 15. JSON and restricted YAML are equally conforming serializations; neither has greater semantic or conformance status.

Property ordering is not significant unless an individual field explicitly defines array ordering semantics. <a id="req-serialization-order"></a>Mapping serialization order MUST NOT affect conformance.

### 3.2 Root Object

<a id="req-root-fields"></a>The root of an MCP Description document is an object with the following structure:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$schema` | string | No | JSON Schema reference for IDE validation |
| `mcpdesc` | string | **Yes** | Specification version (`"0.9.0"`) |
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

<a id="req-omission-not-absence"></a>Unless a property's definition explicitly states otherwise, omission MUST NOT be interpreted as proof that the server does not support, expose, or use the corresponding runtime behavior.

<a id="req-ordinary-collections-non-empty"></a>An optional ordinary declaration collection MUST contain at least one entry when present.

<a id="req-ordinary-collections-omitted"></a>A producer MUST omit such a property when it has no entries, and a consumer MUST reject a present empty collection.

This rule applies to root `transports`, `securitySchemes`, `capabilities`, `tools`, `resources`, `resourceTemplates`, `prompts`, and `tags`; the outer `components` object and each present component namespace map; icon, primitive tag-reference, Elicitation Declaration, Prompt Argument, and extension-capability collections; named Tool, Resource, Resource Template, and Prompt example maps; and Prompt and Resource Template `completionExamples` maps.

It does not constrain embedded JSON Schemas, specification-extension values, arbitrary literal example values, transport invocation values, or protocol-native content and annotation collections, which follow their own rules.

An empty collection remains valid when its property definition assigns distinct semantics to emptiness. <a id="req-security-empties-preserved"></a>In particular, implementations MUST preserve `security: []`, `security: [{}]`, and empty scope arrays in Security Requirement Objects.

### 3.4 Zero-Primitive Descriptions

A document MAY omit all of `tools`, `resources`, `resourceTemplates`, and `prompts`. Such a document can describe a server under development, a legitimately empty server, or an authorization-scoped observation.

<a id="req-primitive-absence"></a>Absence of a primitive collection MUST NOT be interpreted as proof that no other runtime context exposes primitives of that kind.

### 3.5 MCP `_meta`

The `_meta` property allows additional metadata to be attached to a Tool, Resource, Resource Template, or Prompt declaration, and to supported result, content, Tool Interaction step response, and root objects in named examples. <a id="req-meta-revision-availability"></a>It MAY appear only when every revision in the object's Effective Protocol View defines `_meta` for the corresponding MCP object.

Metadata in a named example describes only that example. It does not define a reusable metadata schema or require a server to send the same metadata.

<a id="req-meta-keys"></a>Each key name, its use, and the value of any reserved key MUST follow the rules of every applicable MCP protocol revision. A recognized violation is a document-conformance error. <a id="req-meta-reserved-prefix"></a>A valid but unrecognized key under an MCP-reserved prefix MUST be preserved and SHOULD produce a warning. Other valid keys MUST be accepted and preserved. A protocol-version projection MUST preserve `_meta` and MUST NOT combine metadata from variants that cover different protocol revisions.


### 3.6 Carried MCP Values

Named examples carry MCP values: Tool Example and Tool Interaction Example `result`, Tool Interaction step `response` values for sampling, elicitation, and roots, Resource and Resource Template Example `result`, Prompt Example `result`, and completion example `result`, including values reached through component references. A carried value is validated for every MCP revision in the containing declaration's effective protocol scope, using the type that revision defines for it. A type accepts fields it does not list only if its definition in the revision's TypeScript schema declares or inherits an index signature; such a type is open, and every other type is closed. <a id="req-mcp-integer-numbers"></a>A field that the revision's TypeScript schema declares as `number` is an integer unless the schema annotates it `@TJS-type number`, as in the JSON Schema that MCP generates from it.

For each applicable revision and each field of a carried value:

1. <a id="req-carried-defined-fields"></a>A field that the revision defines MUST satisfy its type, and a field that the revision requires MUST be present.
2. <a id="req-carried-open-preserve"></a>A field that the revision does not define, on a type that is open in that revision, MUST be accepted and preserved. Implementations MUST NOT apply the meaning that another revision gives the same name. Validators MUST report the warning `result-field-not-defined-by-version`, identifying the field and the revision.
3. <a id="req-carried-closed-reject"></a>A field that the revision does not define, on a type that is closed in that revision, MUST be rejected.

JSON-RPC envelope fields and non-completed workflow fields are governed by the example rules of Sections 9.3, 9.4, 10.4, and 11 instead.

Every result type carried by examples extends the open MCP `Result` in every supported revision. Sampling, elicitation, and roots responses extend `Result` through MCP 2025-11-25; in MCP 2026-07-28 they are closed input responses, and only the sampling response defines `_meta`. <a id="req-carried-nested-closed"></a>Nested objects such as content blocks, resource contents, roots, and the `completion` object of a completion result are closed.

Example `result` values are completed results. <a id="req-completed-result-fields"></a>When present, in every revision, `resultType` MUST be `"complete"`, `ttlMs` MUST be a non-negative integer, and `cacheScope` MUST be `"public"` or `"private"`.

A declaration covering several revisions MAY use one example map even when a field is defined by only some of them; authors MAY instead split the declaration into protocol-scoped variants to avoid the warnings. Because each warning is attributed to one revision, the warnings defined here for a document equal the union of those for its per-revision Effective Protocol Views.

### 3.7 Property Ordering

Property ordering within objects is not significant. <a id="req-property-order"></a>Implementations MUST NOT depend on property or mapping serialization order.

### 3.8 Specification Extensions

Any property whose name matches the pattern `^x-` on the root or another eligible MCP Description-defined semantic object is a specification extension. See [Section 14: Specification Extensions](#14-specification-extensions) for eligibility and exclusion rules.

### 3.9 Additional Properties

<a id="req-closed-objects"></a>Properties not defined in this specification and not matching the `x-` extension pattern MUST NOT appear on the root or another closed eligible semantic object. Implementations MUST reject such unknown properties. An `x-*` property does not make an otherwise ineligible object extensible.

### 3.10 Example

A minimal valid MCP Description document:

```json
{
  "$schema": "https://mcpdesc.org/schema/mcp-description/0.9.0-draft.4.json",
  "mcpdesc": "0.9.0",
  "info": {
    "name": "chess-rating-server",
    "version": "1.0.0"
  },
  "protocolVersions": ["2026-07-28"]
}
```

This document makes no transport or primitive declaration. Those omissions do not assert runtime non-support.

