# Proposal 0011: Primitive-Level Specification Extensions

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-25
- Last updated: 2026-08-26
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/24
- Review period: 2026-08-26 through 2026-09-25

## Summary

Permit MCP Description specification extensions (`x-*`) directly on primitive declarations: Tool, Resource, Resource Template, and Prompt.

Draft 1 currently permits specification extensions only at the root unless an object independently allows additional properties. This forces primitive-specific governance or vendor metadata into root-level parallel maps keyed by primitive identity. Allowing `x-*` directly on primitives makes extensions local to the object they describe, preserves protocol scoping naturally, and avoids fragile out-of-band references.

The proposal keeps the existing extension naming, preservation, ignore, documentation, and security rules. Unknown non-`x-*` properties remain invalid, and extensions are not allowed to redefine or weaken core MCP Description semantics.

## Problem

MCP Description Draft 1 defines specification extensions as properties whose names match `^x-`, but Section 14 limits their placement to the root of the document unless another object explicitly permits additional properties.

This is intentionally strict, but it makes several common governance and tooling use cases awkward. A platform may need to attach vendor-specific metadata to one Tool, Resource, Resource Template, or Prompt, for example:

* ownership or internal catalog identifiers;
* risk classification;
* documentation hints;
* product taxonomy;
* policy-review metadata;
* cost-center or operational classification;
* source-generation information; or
* organization-specific lifecycle annotations not standardized by MCP Description.

With root-only extensions, authors must create a parallel structure such as:

```json
{
  "x-acme-governance": {
    "tools": {
      "delete_account": {
        "risk": "high"
      }
    }
  }
}
```

That approach creates avoidable problems:

* primitive names become implicit foreign keys;
* protocol-scoped variants with the same primitive name are difficult to distinguish;
* renaming a primitive requires synchronizing a distant map;
* projection and merge tools need extension-specific knowledge to preserve referential integrity;
* generic tooling cannot know whether an extension entry refers to a Tool, Resource, Resource Template, or Prompt variant.

The core format already treats primitives as the natural unit for tags, security overrides, `_meta`, protocol scope, examples, and elicitation declarations. Specification extensions that describe one primitive should be colocated with that primitive as well.

## Goals

* Permit `x-*` specification extensions directly on Tool, Resource, Resource Template, and Prompt declarations.
* Reuse the existing root extension naming and processing rules.
* Keep unknown non-extension properties invalid.
* Make primitive-specific vendor metadata naturally follow protocol scoping, projection, and merge behavior.
* Avoid root-level parallel maps and implicit primitive-name foreign keys.
* Preserve forward compatibility by requiring consumers to ignore unknown `x-*` properties while preserving them when reserializing.
* Keep extension semantics separate from MCP `_meta` and `capabilities.extensions`.

## Non-goals

* Permit `x-*` on every object in MCP Description.
* Permit primitive extensions on `info`, transport objects, security schemes, capabilities, tags, examples, or nested MCP-derived content objects in this proposal.
* Permit arbitrary unknown properties that do not begin with `x-`.
* Allow an extension to redefine, override, contradict, or weaken a core MCP Description requirement.
* Standardize any particular vendor governance extension.
* Treat primitive `x-*` properties as MCP protocol extensions or MCP `_meta`.
* Define protocol negotiation for specification extensions.

## Background and primary references

* MCP Description Draft 1, Section 3.6 Specification Extensions and Section 14: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/mcp-description.md
* Draft 1 currently states that root `x-*`, MCP `_meta`, and `capabilities.extensions` are independent mechanisms: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/mcp-description.md
* Cisco DevNet, “Beyond the Protocol: Applying API Engineering Practices to MCP Servers,” which motivates governance-oriented MCP server contracts: https://blogs.cisco.com/developer/beyond-the-protocol-applying-api-engineering-practices-to-mcp-servers
* OpenAPI Specification Extensions as prior art for colocated `x-*` metadata: https://spec.openapis.org/oas/v3.1.1.html#specification-extensions

## Proposed normative behavior

### 1. Allowed primitive locations

A property whose name matches `^x-` MAY appear directly on any of the following MCP Description primitive declarations:

* Tool Object;
* Resource Object;
* Resource Template Object; and
* Prompt Object.

The existing root-level extension mechanism remains unchanged.

This proposal does not authorize specification extensions on other MCP Description objects.

### 2. Naming

Primitive-level specification extension property names MUST match:

```text
^x-
```

The existing recommended naming convention remains:

```text
x-{organization}-{feature}
```

Examples:

* `x-cisco-governance`
* `x-acme-owner`
* `x-example-cost-profile`

Extension names are case-sensitive JSON property names. Authors SHOULD use lowercase organization prefixes for consistency.

### 3. Values

A primitive-level specification extension value MAY be any JSON-compatible value allowed by the MCP Description serialization: object, array, string, number, boolean, or null.

Extension authors SHOULD prefer an object value when the extension may evolve, so new optional fields can be added compatibly.

### 4. Processing rules

An implementation that does not recognize a primitive-level specification extension:

* MUST NOT reject the MCP Description because of that extension;
* MUST ignore the extension when interpreting core MCP Description semantics; and
* SHOULD preserve the extension when processing and reserializing the document.

A consumer MUST NOT infer core semantics from an unrecognized extension.

A validator MAY validate a recognized extension using an extension-specific schema supplied by configuration or another trusted mechanism, but failure to obtain such a schema MUST NOT invalidate an otherwise conforming document unless the validator is explicitly operating in a profile that requires that extension.

### 5. Core-semantics boundary

A specification extension MUST NOT redefine or weaken a core MCP Description requirement.

For example, an extension cannot make a required Tool `inputSchema` optional, alter the meaning of `security`, redefine protocol applicability, or make an invalid MCP example valid.

If an extension's documented semantics contradict a core MCP Description field, the core specification remains authoritative for MCP Description conformance.

### 6. Relationship to protocol scope

A primitive-level specification extension is part of the primitive declaration on which it appears and therefore inherits that primitive's effective `protocolVersions` scope.

The extension does not independently declare `protocolVersions` unless the extension's own private schema defines a nested field with that name for its own purposes. Such a nested field has no MCP Description protocol-scope semantics.

When an author needs different extension values for different MCP protocol revisions, the author SHOULD use the existing disjoint primitive-variant mechanism and attach the appropriate extension value to each variant.

### 7. Projection

A conforming single-version projection tool MUST preserve every `x-*` property on a retained primitive unless the user explicitly requests extension stripping.

Projection MUST NOT move a primitive-level extension to the root, combine it with `_meta`, or reinterpret it as an MCP protocol extension.

If a primitive is removed because it is outside the selected protocol scope, its primitive-level specification extensions are removed with it.

### 8. Merge

Primitive-level specification extensions participate in the representation of their containing primitive.

When otherwise equivalent primitive declarations carry byte-equivalent or semantically equivalent extension values, merge tools MAY collapse the declarations according to ordinary protocol-scope merge rules.

When the same primitive and protocol revision contain conflicting values for the same `x-*` property, a merge tool MUST NOT guess which value is correct. It MUST retain distinct non-overlapping variants where representable or report a merge conflict.

A merge tool MUST NOT silently discard an unknown primitive-level extension.

### 9. Extension documentation

The existing extension-author guidance applies equally to root and primitive-level extensions.

Extension authors SHOULD publish:

* a JSON Schema defining the extension value;
* documentation of purpose and semantics;
* versioning information; and
* the MCP Description object locations on which the extension is valid.

An extension intended only for primitive declarations SHOULD state whether it is valid on all primitive types or only a subset.

### 10. Relationship to other extension mechanisms

Primitive-level `x-*` specification extensions, MCP `_meta`, and MCP `capabilities.extensions` remain separate mechanisms.

Tooling MUST NOT automatically copy, project, or reinterpret data among them.

In particular:

* `x-*` describes MCP Description-specific vendor metadata;
* `_meta` represents literal MCP metadata where the applicable MCP revision defines it; and
* `capabilities.extensions` describes formal MCP protocol-extension capability support.

## Schema impact

The JSON Schema definitions for Tool, Resource, Resource Template, and Prompt should permit properties matching `^x-` while continuing to reject all other unknown properties.

Conceptually, each primitive schema changes from strict `additionalProperties: false` behavior to an equivalent pattern that allows only defined core properties and `^x-` extension properties.

Illustrative JSON Schema pattern:

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" }
  },
  "patternProperties": {
    "^x-": {}
  },
  "additionalProperties": false
}
```

The actual schema should retain all existing primitive properties and constraints.

Semantic validation should continue to reject unknown non-`x-*` fields.

## Examples

### Tool governance metadata

```json
{
  "name": "delete_account",
  "description": "Delete an account and its retained data.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "accountId": { "type": "string" }
    },
    "required": ["accountId"]
  },
  "x-acme-governance": {
    "risk": "high",
    "reviewRequired": true
  }
}
```

A consumer that does not understand `x-acme-governance` still has a fully usable Tool declaration.

### Protocol-scoped vendor metadata

```json
{
  "tools": [
    {
      "name": "search",
      "protocolVersions": ["2025-11-25"],
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        },
        "required": ["query"]
      },
      "x-acme-lifecycle": {
        "status": "legacy"
      }
    },
    {
      "name": "search",
      "protocolVersions": ["2026-07-28"],
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        },
        "required": ["query"]
      },
      "x-acme-lifecycle": {
        "status": "current"
      }
    }
  ]
}
```

The extension follows the same primitive variant that owns the core declaration, so no separate root map needs to encode protocol applicability.

### Unknown non-extension property remains invalid

```json
{
  "name": "search",
  "inputSchema": { "type": "object" },
  "acmeRisk": "high"
}
```

`acmeRisk` does not begin with `x-` and remains invalid unless standardized as a core property.

## Compatibility

This is an additive change to MCP Description 0.8.0.

Every document valid before this proposal remains valid.

Implementations that currently use `additionalProperties: false` on primitive schemas will require an update to accept `x-*` properties. Implementations already preserving root extensions should be able to reuse most of their extension-handling logic.

No MCP protocol behavior changes.

## Migration

No migration is required.

Organizations that currently store primitive-specific metadata in a root extension MAY progressively move that metadata onto the affected primitive.

For example:

```json
{
  "x-acme-governance": {
    "tools": {
      "delete_account": {
        "risk": "high"
      }
    }
  }
}
```

may become:

```json
{
  "tools": [
    {
      "name": "delete_account",
      "inputSchema": { "type": "object" },
      "x-acme-governance": {
        "risk": "high"
      }
    }
  ]
}
```

Migration tooling SHOULD validate that root-map entries resolve unambiguously to one primitive variant before moving them.

## Security and privacy considerations

Primitive-level extensions may encourage organizations to publish internal governance metadata. Authors MUST NOT include credentials, tokens, user identifiers, confidential topology, live trace identifiers, or other secrets in static MCP Description documents.

Consumers MUST treat extension names and values as untrusted content. Rendering systems should apply size limits and output encoding and should avoid executing extension-supplied markup or code.

Unknown extensions MUST NOT be allowed to bypass security checks or core conformance rules.

Validators that load extension schemas from external locations SHOULD follow the same secure-resolution principles used for other external schema resources and SHOULD avoid automatic network retrieval by default.

## Alternatives considered

### Keep extensions root-only

This preserves the strictest object model but forces primitive-specific metadata into parallel maps with implicit foreign keys, awkward protocol scoping, and extension-specific projection logic.

### Allow `x-*` on every MCP Description object

This maximizes extensibility and matches some OpenAPI usage, but it expands the extension surface substantially before there is evidence that every nested object needs vendor metadata. This proposal deliberately starts with the four top-level primitive declarations.

### Add a generic `extensions` object to each primitive

For example:

```json
{
  "extensions": {
    "acme": { "risk": "high" }
  }
}
```

This avoids dynamic property names but creates a new extension namespace inconsistent with the root `x-*` mechanism and makes migration and tooling more complicated.

### Add standardized governance fields instead

Some metadata may eventually deserve core fields, but organization-specific policy, ownership, risk, and catalog metadata will continue to vary. Standardized core fields and `x-*` extensions serve different purposes.

### Use MCP `_meta`

`_meta` belongs to MCP protocol objects and has MCP-defined revision-specific semantics. It should not become a generic MCP Description governance-extension container.

## Open questions

* Should primitive-level extensions be allowed on Elicitation Declarations in the same proposal or deferred until a use case emerges?
* Should the specification define an optional root registry of extension schemas, or leave extension validation entirely external as Draft 1 does today?
* Should recognized extension conflicts affect semantic-equivalence comparison, or should extensions be excluded from core semantic-equivalence calculations by default?
* Should a future proposal permit `x-*` on transports and security schemes, where deployment-specific vendor metadata may also be useful?

## Implementation and validation plan

1. Update Tool, Resource, Resource Template, and Prompt JSON Schema definitions to permit `^x-` properties.
2. Add positive fixtures with one primitive extension on each primitive type.
3. Add negative fixtures proving that unknown non-`x-*` properties remain invalid.
4. Add projection fixtures proving that primitive extensions are preserved with retained scoped variants.
5. Add merge fixtures for equal and conflicting extension values.
6. Update Section 3.6 and Section 14.2 to list primitive placement explicitly.
7. Update implementation-conformance requirements to preserve unknown primitive-level extensions when reserializing.
8. Add a full-featured example showing at least one primitive-level governance extension.
9. Add a changelog entry.

## Decision record

Pending community review.
