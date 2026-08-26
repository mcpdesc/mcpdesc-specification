# Proposal 0008: Primitive Provenance and Description Completeness

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-25
- Last updated: 2026-08-26
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/21
- Review period: 2026-08-26 through 2026-09-25

## Summary

Add an optional `provenance` object to MCP Description primitive declarations: Tool, Resource, Resource Template, and Prompt. The object records how the declaration was produced (`curated`, `observed`, or `generated`) and whether the producer asserts that the declaration is `complete`, `partial`, or of `unknown` completeness.

The proposal deliberately places provenance on each primitive rather than at the document root. This permits a single MCP Description to combine carefully curated contract declarations with runtime-observed or generated declarations without assigning one provenance claim to the entire document. The metadata is descriptive evidence about the declaration; it does not alter MCP runtime behavior or introduce a new protocol-variant axis.

## Problem

MCP Description 0.8.0 Draft 1 defines a **Described Server Surface** as the surface represented by a document and explicitly states that it is not necessarily exhaustive of everything implemented or available in every runtime context. It also states that omission of a primitive collection does not prove that no other runtime context exposes primitives of that kind.

Those caveats are important, but they are currently only available as specification-wide interpretation rules. A machine cannot determine how an individual primitive declaration was obtained or how strongly its author claims that the declaration reflects the primitive's durable contract.

This matters because MCP Description is intended to support offline discovery, documentation generation, testing, governance, and change analysis. A declaration obtained by design-time authoring has different evidentiary value from a declaration captured from one authenticated runtime observation, and both differ from a declaration generated mechanically from source code or framework metadata.

For example, a contract-diff tool may see a Tool declaration with no `description`, no examples, and a minimal `inputSchema`. Without provenance metadata, the tool cannot distinguish among:

* an intentionally minimal curated contract;
* a partial runtime observation where descriptive metadata was unavailable;
* a generated declaration produced by a framework that does not expose all available metadata.

The current format therefore supports the data itself but not the provenance needed to interpret the confidence and completeness of that data.

## Goals

* Allow every Tool, Resource, Resource Template, and Prompt declaration to state how it was produced.
* Allow a producer to state whether the individual declaration is believed to be complete, partial, or of unknown completeness.
* Support mixed-origin documents in which different primitives have different provenance.
* Help diff, governance, documentation, and review tooling distinguish authoritative curated declarations from observed or generated evidence.
* Keep provenance separate from MCP protocol semantics and runtime wire behavior.
* Preserve the existing rule that an MCP Description does not necessarily enumerate every primitive available in every runtime context.
* Keep the feature optional and backward compatible for existing 0.8.0 documents.

## Non-goals

* Assert that a primitive collection is exhaustive. Primitive-level provenance cannot prove that an omitted Tool, Resource, Resource Template, or Prompt does not exist.
* Model authorization contexts, tenants, users, roles, credentials, feature flags, or client capabilities.
* Record request/response transcripts or runtime session state.
* Standardize source-control provenance, build attestations, signatures, SBOMs, or software supply-chain metadata.
* Require timestamps or source identifiers for every generated or observed declaration.
* Define merge policy for semantically different primitive declarations beyond the existing protocol-scope and merge rules.
* Treat provenance as evidence that a live server currently behaves exactly as described.

## Background and primary references

* MCP Description 0.8.0 Draft 1, definitions of `Described Server Surface` and protocol coverage: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/mcp-description.md
* MCP Description 0.8.0 Draft 1, zero-primitive descriptions: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/mcp-description.md#33-zero-primitive-descriptions
* Proposal 0001, which explicitly aims to keep runtime dumps honest about what was observed: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/proposal-snapshots/0001-mcp-2026-07-28-alignment.md
* Cisco DevNet, “Beyond the Protocol: Applying API Engineering Practices to MCP Servers”: https://blogs.cisco.com/developer/beyond-the-protocol-applying-api-engineering-practices-to-mcp-servers

The existing draft already makes the correct semantic distinction between a server's implementation and the **described** surface. This proposal makes part of that distinction machine-readable at the primitive level.

## Proposed normative behavior

### 1. Primitive `provenance` property

A Tool Object, Resource Object, Resource Template Object, or Prompt Object MAY contain a `provenance` property whose value is a Primitive Provenance Object.

`provenance` MUST NOT appear on objects other than those primitive declarations unless another proposal explicitly permits it.

The Primitive Provenance Object has the following fields:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | string enum | Yes | How the primitive declaration was produced: `curated`, `observed`, or `generated`. |
| `completeness` | string enum | Yes | Producer assertion about the completeness of this primitive declaration: `complete`, `partial`, or `unknown`. |
| `observedAt` | string (`date-time`) | No | Time at which the represented primitive was observed. Intended for `kind: "observed"`. |

No additional properties are allowed in the Primitive Provenance Object in 0.8.0.

### 2. `kind` semantics

`kind` MUST have one of these values:

* `curated` — the primitive declaration was intentionally authored or reviewed as a design-time or release-time contract.
* `observed` — the primitive declaration was derived from one or more runtime observations of an MCP server.
* `generated` — the primitive declaration was produced mechanically from source code, configuration, framework metadata, or another non-runtime source.

These values describe the origin of the MCP Description declaration. They do not describe how the underlying MCP server implementation was created.

A producer MUST NOT use `curated` solely because a generated or observed document was manually saved or committed to source control. `curated` implies an intentional contract-authoring or review step.

### 3. `completeness` semantics

`completeness` MUST have one of these values:

* `complete` — the producer asserts that, to the best of its knowledge, the declaration captures all externally relevant properties of this primitive that are representable by the applicable MCP Description version and known to the producer.
* `partial` — the producer knows that one or more externally relevant properties of the primitive may be omitted, generalized, redacted, or unavailable.
* `unknown` — the producer makes no completeness assertion for the declaration.

`complete` applies only to the declaration itself. It MUST NOT be interpreted as an assertion that the containing primitive collection is exhaustive or that no additional primitive exists in another runtime context.

A consumer MUST NOT infer collection completeness from every present primitive having `completeness: "complete"`.

### 4. `observedAt`

When present, `observedAt` MUST be an RFC 3339 date-time string.

`observedAt` SHOULD be used only when `kind` is `observed`. A validator SHOULD warn when `observedAt` appears with another `kind` value.

`observedAt` records when the primitive declaration was observed, not when the MCP Description file was created or last modified.

### 5. Protocol scoping

Primitive provenance inherits the effective protocol scope of its containing primitive declaration. It does not define an independent `protocolVersions` property.

If materially different provenance applies to protocol-specific variants of the same logical primitive, the author SHOULD express those variants using the existing primitive `protocolVersions` mechanism and attach the appropriate provenance to each variant.

### 6. Projection

A conforming single-version projection tool MUST preserve the `provenance` object on every retained primitive.

Projection MUST NOT synthesize, upgrade, or downgrade a provenance assertion.

### 7. Merge and semantic comparison

Primitive provenance is descriptive metadata about the declaration rather than MCP runtime semantics.

A semantic compatibility or breaking-change analysis MUST NOT treat a change only to `provenance` as a change to the MCP primitive's runtime contract.

A merge tool SHOULD preserve provenance when equivalent declarations are combined. If the merge implementation cannot preserve materially different provenance claims without inventing a new claim, it SHOULD retain separate source evidence out of band or report a provenance-preservation warning rather than silently choosing one claim.

This proposal does not require a canonical algorithm for aggregating multiple provenance records in 0.8.0.

### 8. Consumer behavior

Consumers MAY use provenance when presenting confidence, filtering runtime observations, or deciding whether an automated compatibility conclusion requires human review.

Consumers MUST NOT treat `kind: "observed"` or `completeness: "partial"` as making the containing MCP Description invalid.

Consumers MUST NOT interpret `kind: "curated"` or `completeness: "complete"` as cryptographic proof, remote attestation, or a guarantee of live runtime behavior.

## Schema impact

The JSON Schema should add a reusable `primitiveProvenance` definition and permit an optional `provenance` property in the schemas for:

* Tool Object;
* Resource Object;
* Resource Template Object; and
* Prompt Object.

Illustrative structural schema:

```json
{
  "$defs": {
    "primitiveProvenance": {
      "type": "object",
      "required": ["kind", "completeness"],
      "properties": {
        "kind": {
          "enum": ["curated", "observed", "generated"]
        },
        "completeness": {
          "enum": ["complete", "partial", "unknown"]
        },
        "observedAt": {
          "type": "string",
          "format": "date-time"
        }
      },
      "additionalProperties": false
    }
  }
}
```

The schema can enforce the value sets and date-time shape. The recommendation that `observedAt` be used only for observed provenance may remain a semantic warning rather than a structural validation error.

## Examples

### Curated Tool contract

```json
{
  "name": "delete_account",
  "description": "Delete an account and its retained data.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "accountId": { "type": "string" }
    },
    "required": ["accountId"],
    "additionalProperties": false
  },
  "provenance": {
    "kind": "curated",
    "completeness": "complete"
  }
}
```

### Partially observed Resource

```json
{
  "uri": "inventory://current",
  "name": "current_inventory",
  "provenance": {
    "kind": "observed",
    "completeness": "partial",
    "observedAt": "2026-08-25T12:30:00Z"
  }
}
```

The second example states that the Resource declaration was captured at runtime and that the producer knows the declaration may omit relevant details. It does **not** claim that other Resources were absent at that time.

### Mixed-origin document

```json
{
  "mcpdesc": "0.8.0",
  "info": {
    "name": "example-server",
    "version": "2.0.0"
  },
  "protocolVersions": ["2026-07-28"],
  "transports": [
    { "type": "streamable-http", "url": "https://example.com/mcp" }
  ],
  "tools": [
    {
      "name": "search",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        },
        "required": ["query"]
      },
      "provenance": {
        "kind": "curated",
        "completeness": "complete"
      }
    },
    {
      "name": "experimental_lookup",
      "inputSchema": { "type": "object" },
      "provenance": {
        "kind": "observed",
        "completeness": "unknown",
        "observedAt": "2026-08-25T12:30:00Z"
      }
    }
  ]
}
```

## Compatibility

This is an additive, backward-compatible change to MCP Description 0.8.0 Draft 1.

Existing conforming documents remain valid because `provenance` is optional.

Existing implementations that reject unknown properties inside primitive objects will need a schema update before accepting documents that use this proposal, which is expected for any new 0.8.0 feature.

The proposal does not change MCP protocol behavior and does not change the meaning of existing primitive fields.

## Migration

No migration is required for existing descriptions.

Tools that generate descriptions MAY initially omit provenance. Generators that can distinguish runtime introspection from static code generation are encouraged to emit the corresponding `kind` and use `completeness: "unknown"` until they can make a stronger assertion.

Runtime dump tools SHOULD prefer:

```json
{
  "kind": "observed",
  "completeness": "unknown"
}
```

unless they have evidence that the represented primitive declaration is partial or complete.

Curated contract repositories MAY progressively add:

```json
{
  "kind": "curated",
  "completeness": "complete"
}
```

after review.

## Security and privacy considerations

Provenance metadata MUST NOT contain credentials, tokens, user identifiers, role names tied to individuals, authorization claims, internal topology, or other sensitive runtime context.

This proposal intentionally does not define fields such as `principal`, `tenant`, `credential`, or raw observation source because static publication of such values can expose sensitive information.

`observedAt` may reveal operational timing. Authors publishing sensitive infrastructure descriptions SHOULD omit it when unnecessary.

Consumers MUST treat provenance claims as untrusted assertions supplied by the document author or generator. They are not cryptographic attestations.

## Alternatives considered

### Root-level `coverage`

A root-level object could label an entire document as `curated`, `observed`, or `generated`. This is simpler and can express document-wide enumeration intent, but it cannot represent mixed-origin descriptions. A single document may contain curated Tools and runtime-observed Resources, or generated declarations subsequently reviewed individually.

This proposal therefore places provenance on primitives as requested. Document- or collection-level enumeration completeness may be proposed separately if implementation experience demonstrates a need.

### Collection-level completeness

A `toolsCoverage`, `resourcesCoverage`, or equivalent collection wrapper could state whether each collection is exhaustive. That addresses omission semantics more directly but would change the current simple array shape and introduce a larger structural change.

This proposal does not introduce collection wrappers in 0.8.0.

### Root `x-*` metadata

A vendor extension can encode provenance today, but every tool would need a parallel map keyed by primitive identity. That creates rename, protocol-scope, and referential-integrity problems and prevents portable consumers from understanding the semantics.

### Infer provenance from tooling

A consumer could infer that a file produced by a dump command is observed. The inference is lost when files are copied, merged, transformed, or checked into source control, and it is not portable across producers.

## Open questions

* Should a later proposal add collection-level enumeration completeness so that an empty observed collection can be distinguished from an authoritative empty collection?
* Should `observedAt` be omitted from the core object and left to primitive-level specification extensions to reduce diff churn?
* Should a future version permit multiple provenance records when equivalent declarations are merged from several sources?
* Should `generated` be split into more specific origins such as source-code generation and imported-contract generation, or is one generic value sufficient?

## Implementation and validation plan

1. Add `primitiveProvenance` to the draft JSON Schema.
2. Add optional `provenance` properties to Tool, Resource, Resource Template, and Prompt schemas.
3. Add semantic validation for the `observedAt` recommendation and protocol projection preservation.
4. Add positive fixtures for all three `kind` values and all three `completeness` values.
5. Add negative fixtures for unknown enum values, malformed timestamps, and unknown properties.
6. Add a projection fixture proving provenance is preserved on retained protocol-scoped variants.
7. Add documentation guidance stating explicitly that primitive completeness does not imply collection exhaustiveness.
8. Add a changelog entry and update the full-featured example with at least one curated and one observed primitive.

## Decision record

Pending community review.
