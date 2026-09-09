# Proposal 0011: Object-Level Specification Extensions

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-25
- Last updated: 2026-08-26
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/24
- Review period: 2026-08-26 through 2026-09-25

## Summary

Permit MCP Description specification extensions (`x-*`) directly on MCP Description-defined semantic objects, including primitive declarations, deployment metadata, examples, and provenance records.

Draft 1 currently permits specification extensions only at the root unless an object independently allows additional properties. This forces object-specific governance, evidence, or vendor metadata into root-level parallel maps keyed by paths or identities. Allowing `x-*` directly on semantic objects makes extensions local to what they describe, preserves object ownership and protocol scoping naturally, and avoids fragile out-of-band references.

The proposal keeps the existing extension naming, preservation, ignore, documentation, and security rules. Unknown non-`x-*` properties remain invalid, and extensions are not allowed to redefine or weaken core MCP Description semantics.

## Problem

MCP Description Draft 1 defines specification extensions as properties whose names match `^x-`, but Section 14 limits their placement to the root of the document unless another object explicitly permits additional properties.

This is intentionally strict, but it makes common governance and tooling use cases awkward. A platform may need to attach vendor-specific metadata to a primitive, transport, security scheme, example, tag, or provenance record, for example:

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
* generic tooling cannot reliably determine which nested object an extension entry describes.

The same problem applies beyond primitives. For example, Proposal 0008 allows a Provenance Record Object to identify an external dump and anticipates producer-specific evidence in an extension associated with that record. A root extension would separate those details from the record that owns them and would require another document-local identifier lookup.

Specification extensions should therefore attach at semantic object boundaries. This follows OpenAPI's broad but explicit object-level model without treating every JSON object, scalar field, map entry, embedded schema, or opaque value as an extension point.

## Goals

* Permit `x-*` specification extensions directly on MCP Description-defined semantic objects.
* Reuse the existing root extension naming and processing rules.
* Keep unknown non-extension properties invalid.
* Make object-specific vendor metadata naturally follow object ownership, protocol scoping, projection, and merge behavior.
* Cover provenance-record-local evidence without requiring a parallel root map.
* Define explicit exceptions where object-level extensions would be ambiguous or would intrude on an embedded format.
* Avoid root-level parallel maps and implicit path or identity foreign keys.
* Preserve forward compatibility by requiring consumers to ignore unknown `x-*` properties while preserving them when reserializing.
* Keep extension semantics separate from MCP `_meta` and `capabilities.extensions`.

## Non-goals

* Permit `x-*` on every syntactic JSON object, scalar value, or array item in an MCP Description document.
* Change the extensibility rules of embedded JSON Schema, carried MCP payload/result/annotation/metadata values, opaque example values, or other embedded formats.
* Permit arbitrary unknown properties that do not begin with `x-`.
* Allow an extension to redefine, override, contradict, or weaken a core MCP Description requirement.
* Standardize any particular vendor governance extension.
* Treat primitive `x-*` properties as MCP protocol extensions or MCP `_meta`.
* Define protocol negotiation for specification extensions.

## Background and primary references

* MCP Description Draft 1, Section 3.6 Specification Extensions and Section 14: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/mcp-description.md
* Draft 1 currently states that root `x-*`, MCP `_meta`, and `capabilities.extensions` are independent mechanisms: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/mcp-description.md
* Cisco DevNet, “Beyond the Protocol: Applying API Engineering Practices to MCP Servers,” which motivates governance-oriented MCP server contracts: https://blogs.cisco.com/developer/beyond-the-protocol-applying-api-engineering-practices-to-mcp-servers
* OpenAPI 3.2.0 Specification Extensions as prior art for broad but explicitly object-scoped `x-*` metadata: https://spec.openapis.org/oas/v3.2.0.html#specification-extensions
* OpenAPI 3.2.0 Reference Object and Schema Object rules as prior art for deliberate exceptions: https://spec.openapis.org/oas/v3.2.0.html#reference-object
* MCP 2025-11-25 `_meta` rules, whose availability remains limited to MCP schema locations that define `_meta`: https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta
* Proposal 0008, whose Provenance Record Object requires a local extension point for producer-specific evidence: https://github.com/mcpdesc/mcpdesc-specification/pull/26

## Proposed normative behavior

### 1. Allowed object locations

A property whose name matches `^x-` MAY appear directly on an MCP Description-defined semantic object unless that object is excluded below.

Current semantic object categories include:

* the root MCP Description Object;
* document metadata objects such as Info, Contact, License, Icon, and Tag Objects;
* transport objects and MCP Description-defined transport configuration objects;
* Security Scheme, OAuth Flows, and OAuth Flow Objects;
* MCP Description-defined capability declaration objects, except the capability map described below;
* Tool, Resource, Resource Template, Prompt, Prompt Argument, and Elicitation Declaration Objects;
* MCP Description-defined named example and example-result wrapper objects; and
* if Proposal 0008 is accepted, Provenance Registry, Provenance Record, Producer, and Artifact Reference Objects.

The existing root-level extension mechanism remains unchanged.

Object eligibility is determined by the object's specification-defined role, not merely because its serialized representation is a JSON object.

### 2. Excluded and delegated locations

Specification extensions defined by this proposal MUST NOT appear directly in these locations:

* scalar values or array entries that are not themselves eligible objects;
* domain-keyed maps, where every property name represents a map entry rather than an object field;
* Security Requirement Objects, where every property name identifies a security scheme;
* the `capabilities` protocol-extension map, where `x-*` keys already identify formal MCP protocol-extension capabilities;
* embedded JSON Schema objects, whose keywords and extensibility follow their declared or default JSON Schema dialect;
* embedded MCP payload, result, annotation, or metadata objects that MCP Description carries without defining an independent object model for them;
* opaque example values, `_meta` values, extension values, and other arbitrary JSON payloads; and
* a future Reference Object, unless the specification for that object explicitly permits adjacent extensions and defines their resolution behavior.

A map value that is itself an eligible semantic object MAY carry specification extensions. The containing map does not thereby gain an extension slot.

### 3. Naming

Object-level specification extension property names MUST match:

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

### 4. Values

An object-level specification extension value MAY be any JSON-compatible value allowed by the MCP Description serialization: object, array, string, number, boolean, or null.

Extension authors SHOULD prefer an object value when the extension may evolve, so new optional fields can be added compatibly.

### 5. Processing rules

An implementation that does not recognize an object-level specification extension:

* MUST NOT reject the MCP Description because of that extension;
* MUST ignore the extension when interpreting core MCP Description semantics; and
* SHOULD preserve the extension when processing and reserializing the document.

A consumer MUST NOT infer core semantics from an unrecognized extension.

A validator MAY validate a recognized extension using an extension-specific schema supplied by configuration or another trusted mechanism, but failure to obtain such a schema MUST NOT invalidate an otherwise conforming document unless the validator is explicitly operating in a profile that requires that extension.

### 6. Core-semantics boundary

A specification extension MUST NOT redefine or weaken a core MCP Description requirement.

For example, an extension cannot make a required Tool `inputSchema` optional, alter the meaning of `security`, redefine protocol applicability, or make an invalid MCP example valid.

If an extension's documented semantics contradict a core MCP Description field, the core specification remains authoritative for MCP Description conformance.

### 7. Ownership and protocol scope

An object-level specification extension is part of the eligible semantic object on which it appears. It follows that object's ownership, lifecycle, and effective protocol scope.

The extension does not independently declare `protocolVersions` unless the extension's own private schema defines a nested field with that name for its own purposes. Such a nested field has no MCP Description protocol-scope semantics.

When an author needs different extension values for different MCP protocol revisions, the author SHOULD use the existing disjoint primitive-variant mechanism where applicable and attach the appropriate extension value to each variant.

### 8. Projection

A conforming single-version projection tool MUST preserve every `x-*` property on a retained eligible object unless the user explicitly requests extension stripping.

Projection MUST NOT move an object-level extension to the root or another object, combine it with `_meta`, or reinterpret it as an MCP protocol extension.

If an object is removed because it is outside the selected protocol scope or no longer referenced, its object-level specification extensions are removed with it.

### 9. Merge

Object-level specification extensions participate in the representation of their containing object.

When otherwise equivalent eligible objects carry byte-equivalent or semantically equivalent extension values, merge tools MAY collapse them according to the ordinary merge rules for those objects.

When corresponding objects contain conflicting values for the same `x-*` property, a merge tool MUST NOT guess which value is correct. It MUST retain distinct non-overlapping variants where representable or report a merge conflict.

A merge tool MUST NOT silently discard an unknown object-level extension.

### 10. Extension documentation

The existing extension-author guidance applies equally to root and nested object-level extensions.

Extension authors SHOULD publish:

* a JSON Schema defining the extension value;
* documentation of purpose and semantics;
* versioning information; and
* the MCP Description object locations on which the extension is valid.

An extension SHOULD state the eligible object types on which it is valid.

### 11. Relationship to other extension mechanisms

Object-level `x-*` specification extensions, MCP `_meta`, and formal MCP protocol-extension capabilities remain separate mechanisms.

Tooling MUST NOT automatically copy, project, or reinterpret data among them.

In particular:

* `x-*` describes MCP Description-specific vendor metadata;
* `_meta` represents literal MCP metadata where the applicable MCP revision defines it; and
* `capabilities.extensions` describes formal MCP protocol-extension capability support.

## Schema impact

The JSON Schema definitions for eligible MCP Description-defined objects should permit properties matching `^x-` while continuing to reject all other unknown properties.

Conceptually, each closed eligible object schema changes from strict `additionalProperties: false` behavior to an equivalent pattern that allows only defined core properties and `^x-` extension properties. Map schemas, embedded schemas, MCP-derived objects, and the other excluded locations retain their existing rules.

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

The actual schema should retain all existing object properties and constraints.

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

### Provenance-record-specific evidence

If Proposal 0008 is accepted, producer-specific evidence can be attached directly to the Provenance Record Object that owns it:

```json
{
  "provenance": {
    "records": {
      "inspection-42": {
        "kind": "observed",
        "producer": { "name": "mcpcontract", "version": "0.8.0" },
        "method": "dump",
        "artifact": { "uri": "urn:mcpcontract:dump:42" },
        "recordedAt": "2026-08-25T12:30:00Z",
        "x-cisco-mcpcontract-dump": {
          "sessionId": "inspection-42",
          "discoveryMode": "runtime"
        }
      }
    }
  }
}
```

The `x-cisco-mcpcontract-dump` property describes only `inspection-42`. It is not a core provenance field, does not alter the record's `observed` kind, and does not imply completeness or trust.

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

Implementations that currently use `additionalProperties: false` on eligible object schemas will require an update to accept `x-*` properties. Implementations already preserving root extensions should be able to reuse most of their extension-handling logic.

No MCP protocol behavior changes.

## Migration

No migration is required.

Organizations that currently store object-specific metadata in a root extension MAY progressively move that metadata onto the affected eligible object.

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

Migration tooling SHOULD validate that root-map entries resolve unambiguously to one eligible object before moving them.

## Security and privacy considerations

Object-level extensions may encourage organizations to publish internal governance or evidence metadata. Authors MUST NOT include credentials, tokens, user identifiers, confidential topology, live trace identifiers, or other secrets in static MCP Description documents.

Consumers MUST treat extension names and values as untrusted content. Rendering systems should apply size limits and output encoding and should avoid executing extension-supplied markup or code.

Unknown extensions MUST NOT be allowed to bypass security checks or core conformance rules.

Validators that load extension schemas from external locations SHOULD follow the same secure-resolution principles used for other external schema resources and SHOULD avoid automatic network retrieval by default.

## Alternatives considered

### Keep extensions root-only

This preserves the strictest object model but forces object-specific metadata into parallel maps with implicit foreign keys, awkward protocol scoping, and extension-specific projection logic.

### Restrict extensions to primitive declarations

This addresses governance metadata on Tool, Resource, Resource Template, and Prompt declarations but leaves the same locality problem on transports, security schemes, examples, tags, and provenance records. The object-level model uses explicit exclusions rather than an arbitrary depth boundary.

### Add a generic `extensions` object to each semantic object

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

* Should the specification define an optional root registry of extension schemas, or leave extension validation entirely external as Draft 1 does today?
* Should recognized extension conflicts affect semantic-equivalence comparison, or should extensions be excluded from core semantic-equivalence calculations by default?
* Should any additional MCP-derived object types be promoted to MCP Description-defined extension points when the description format adds semantics beyond their literal MCP representation?

## Implementation and validation plan

1. Inventory every MCP Description-defined object and classify it as eligible, excluded, or governed by an embedded format.
2. Update eligible JSON Schema definitions to permit `^x-` properties.
3. Add positive fixtures covering metadata, transport, security, primitive, example, and provenance object categories.
4. Add an explicit positive fixture for an `x-*` property on a Provenance Record Object if Proposal 0008 is accepted.
5. Add negative fixtures proving that unknown non-`x-*` properties remain invalid and `x-*` remains disallowed in excluded locations.
6. Add projection fixtures proving that object extensions are preserved with retained owners.
7. Add merge fixtures for equal and conflicting extension values.
8. Update Section 3.6 and Section 14.2 with the object eligibility and exclusion rules.
9. Update implementation-conformance requirements to preserve unknown object-level extensions when reserializing.
10. Add full-featured examples showing primitive governance and provenance-record evidence extensions.
11. Add a changelog entry.

## Decision record

Pending community review.
