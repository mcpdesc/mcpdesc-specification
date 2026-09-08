# Proposal 0008: Provenance Records and Primitive Attribution

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-25
- Last updated: 2026-08-26
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/21
- Review period: 2026-08-26 through 2026-09-25

## Summary

Add an optional document-level provenance registry and provenance references for Tool, Resource, Resource Template, and Prompt declarations. A provenance record identifies how source evidence was produced (`curated`, `observed`, or `generated`) and may identify the producer, method, external artifact, and recording time.

A document whose primitives share one source can declare default provenance once. Mixed-origin and merged documents can attribute individual primitives to one or more records. Provenance records contain descriptive facts only: they do not declare completeness, confidence, trust, or the consumer policy that interprets them.

## Problem

MCP Description 0.8.0 Draft 1 defines a **Described Server Surface** as the surface represented by a document and explicitly states that it is not necessarily exhaustive of everything implemented or available in every runtime context.

A machine still cannot determine how a declaration was obtained or which capture, inspection, generation, or curation event supports it. A timestamp alone cannot identify the evidence, and an assertion that a declaration is `complete` is difficult to establish independently of the producer's method and observation scope.

This matters for offline discovery, documentation, testing, governance, merging, and change analysis. When descriptions are merged, downstream tools need to retain source distinctions rather than flatten them into one undocumented claim. The current format supports declaration data but not portable attribution to its source evidence.

## Goals

* Identify reusable provenance records within an MCP Description document.
* Distinguish curated, runtime-observed, and mechanically generated evidence.
* Avoid repeating systemic provenance on every primitive in a single-source document.
* Support fine-grained and multi-source attribution in merged documents.
* Allow records to reference external dumps, inspection results, or generator artifacts.
* Give consumers stable facts with which to select and apply their own interpretation policies.
* Keep provenance separate from MCP protocol semantics and runtime wire behavior.
* Keep the feature optional and backward compatible for existing 0.8.0 documents.

## Non-goals

* Assert primitive, collection, or document completeness.
* Define confidence scores, trust levels, or consumer interpretation policies.
* Prove producer identity or artifact authenticity.
* Model authorization contexts, tenants, users, roles, credentials, feature flags, or client capabilities.
* Embed request/response transcripts, dump payloads, or runtime session state.
* Standardize build attestations, signatures, SBOMs, or software supply-chain metadata.
* Define merge policy for semantically different primitive declarations.
* Treat provenance as evidence that a live server currently behaves exactly as described.

## Background and primary references

* MCP Description 0.8.0 Draft 1, definitions of `Described Server Surface` and protocol coverage: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/mcp-description.md
* MCP Description 0.8.0 Draft 1, zero-primitive descriptions: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/mcp-description.md#33-zero-primitive-descriptions
* Proposal 0001, which aims to keep runtime dumps honest about what was observed: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/proposal-snapshots/0001-mcp-2026-07-28-alignment.md
* Cisco DevNet, “Beyond the Protocol: Applying API Engineering Practices to MCP Servers”: https://blogs.cisco.com/developer/beyond-the-protocol-applying-api-engineering-practices-to-mcp-servers

The existing draft distinguishes a server's implementation from its described surface. This proposal adds machine-readable attribution without asking the producer to determine how much evidentiary weight a consumer should assign.

## Proposed normative behavior

### 1. Document-level `provenance`

The root MCP Description Object MAY contain a `provenance` property whose value is a Provenance Registry Object.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `records` | map of Provenance Record Objects | Yes | Locally identified provenance records available for attribution. |
| `defaultIds` | array of unique strings | No | Record identifiers that apply to primitives without explicit `provenanceIds`. |

`records` MUST contain at least one entry. Each key is a document-local Provenance ID and MUST be unique within the registry. Every value in `defaultIds` MUST match a key in `records`.

A producer SHOULD use `defaultIds` only when the referenced records apply systemically to primitive declarations that do not carry explicit attribution.

### 2. Provenance IDs

A Provenance ID is an opaque, non-empty string whose meaning is local to the containing document. Consumers MUST compare Provenance IDs as case-sensitive strings and MUST NOT infer producer, time, ordering, or trust from their lexical form.

Provenance IDs identify records, not MCP runtime sessions. Producers SHOULD NOT use an MCP transport session ID as the sole provenance identity because runtime session IDs may be absent, transient, sensitive, or ambiguous across captures.

An external dump or inspector session identifier MAY appear in an artifact URI or in an extension associated with the provenance record.

### 3. Provenance records

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | string enum | Yes | How the evidence was produced: `curated`, `observed`, or `generated`. |
| `producer` | Producer Object | No | Tool or organization that produced the evidence. |
| `method` | string | No | Stable producer-defined method identifier, such as `dump`. |
| `artifact` | Artifact Reference Object | No | Reference to external evidence supporting the record. |
| `recordedAt` | string (`date-time`) | No | Time at which the evidence was recorded. |

`kind` MUST have one of these values:

* `curated` — evidence from intentional contract authoring or review;
* `observed` — evidence from one or more runtime observations of an MCP server;
* `generated` — evidence produced mechanically from source code, configuration, framework metadata, or another non-runtime source.

These values describe the origin of the evidence, not how the server implementation was created. A producer MUST NOT use `curated` solely because generated or observed output was saved or committed.

A Producer Object MUST contain a non-empty `name` and MAY contain a non-empty `version`. Producer identity is a descriptive assertion, not proof of authorship.

An Artifact Reference Object MUST contain an absolute `uri` and MAY contain a `digest`. When present, `digest` MUST identify both the digest algorithm and value. This proposal does not require consumers to retrieve or verify an artifact.

When present, `recordedAt` MUST be an RFC 3339 date-time string. It is supporting metadata and MUST NOT be used as the identity of the record.

Records do not contain completeness, confidence, trust, or policy fields. Producers MAY expose additional evidence through the referenced artifact or specification extensions. Consumers determine whether and how to use that evidence under policy external to the document.

### 4. Default attribution

When a primitive omits `provenanceIds`, its effective provenance is the registry's `defaultIds`, if present. Omission of both means the document makes no portable provenance attribution for that primitive.

Defaults reduce repetition for descriptions produced by one tool or method. They MUST NOT be interpreted as an assertion that every declaration is complete, every primitive was enumerated, or the referenced evidence is trustworthy.

### 5. Primitive attribution

A Tool Object, Resource Object, Resource Template Object, or Prompt Object MAY contain `provenanceIds` as a non-empty array of unique Provenance IDs.

When present, `provenanceIds` replaces, rather than extends, `defaultIds` for that primitive. Every referenced ID MUST match a key in the root registry.

Multiple IDs mean that evidence from multiple records contributed to the declaration. Their order MUST NOT imply precedence, confidence, or merge order.

### 6. Protocol scoping and projection

Primitive attribution inherits the protocol scope of its containing declaration. If different attribution applies to protocol-specific variants, the author SHOULD use the existing primitive `protocolVersions` mechanism and attach appropriate `provenanceIds` to each variant.

A conforming single-version projection tool MUST retain records referenced by retained primitives' effective provenance and MUST preserve corresponding attribution. It MAY remove unreferenced records. Projection MUST NOT synthesize records or change attribution.

### 7. Merge and semantic comparison

Provenance is descriptive metadata rather than MCP runtime semantics. Compatibility analysis MUST NOT treat a change only to provenance records or attribution as a change to a primitive's runtime contract.

A merge tool SHOULD preserve records and attribution from every contributing document. It MUST remap colliding document-local IDs when their records differ. When equivalent declarations are combined from multiple sources, the merged declaration SHOULD reference all contributing records.

A merge tool MUST NOT infer completeness, confidence, precedence, or trust merely from the number, kind, producer, or recording time of contributing records.

### 8. Consumer behavior and policy

Consumers MAY use provenance attributes and referenced artifacts to select an external policy for documentation, filtering, governance, comparison, or human review.

The applicable policy is owned by the consuming toolset and is not selected or defined by the provenance producer inside the document. Different consumers MAY reach different conclusions from the same record.

Consumers MUST treat records as untrusted descriptive assertions unless independently verified. A producer name, method, artifact URI, digest, or timestamp alone is not a cryptographic attestation or guarantee of live behavior.

Consumers MUST NOT infer collection completeness solely from provenance attribution. A disappearance between descriptions is conclusive only under a consumer policy that establishes sufficient and comparable evidence outside this proposal's semantics.

## Schema impact

The JSON Schema should add definitions for a provenance registry, record, producer, artifact reference, and ID array. It should permit root `provenance` and primitive `provenanceIds` properties.

Illustrative structural schema:

```json
{
  "$defs": {
    "provenanceRecord": {
      "type": "object",
      "required": ["kind"],
      "properties": {
        "kind": { "enum": ["curated", "observed", "generated"] },
        "producer": {
          "type": "object",
          "required": ["name"],
          "properties": {
            "name": { "type": "string", "minLength": 1 },
            "version": { "type": "string", "minLength": 1 }
          },
          "additionalProperties": false
        },
        "method": { "type": "string", "minLength": 1 },
        "artifact": {
          "type": "object",
          "required": ["uri"],
          "properties": {
            "uri": { "type": "string", "format": "uri" },
            "digest": { "type": "string", "minLength": 1 }
          },
          "additionalProperties": false
        },
        "recordedAt": { "type": "string", "format": "date-time" }
      },
      "additionalProperties": false
    },
    "provenanceRegistry": {
      "type": "object",
      "required": ["records"],
      "properties": {
        "records": {
          "type": "object",
          "minProperties": 1,
          "propertyNames": { "minLength": 1 },
          "additionalProperties": { "$ref": "#/$defs/provenanceRecord" }
        },
        "defaultIds": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": { "type": "string", "minLength": 1 }
        }
      },
      "additionalProperties": false
    },
    "provenanceIds": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": { "type": "string", "minLength": 1 }
    }
  }
}
```

JSON Schema cannot enforce that IDs resolve to keys in `records`; the validator should perform that referential-integrity check.

## Examples

### Single-source generated document

```json
{
  "mcpdesc": "0.8.0",
  "info": { "name": "example-server", "version": "2.0.0" },
  "protocolVersions": ["2026-07-28"],
  "transports": [{ "type": "streamable-http", "url": "https://example.com/mcp" }],
  "provenance": {
    "records": {
      "generation-01": {
        "kind": "generated",
        "producer": { "name": "example-generator", "version": "3.1.0" },
        "method": "source-generation",
        "artifact": {
          "uri": "https://example.com/builds/42/generation.json",
          "digest": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfa13514e"
        }
      }
    },
    "defaultIds": ["generation-01"]
  },
  "tools": [{ "name": "search", "inputSchema": { "type": "object" } }]
}
```

The default applies to `search` without repeating provenance on the Tool Object. It does not assert that the declaration or Tools collection is complete.

### Merged document with fine-grained attribution

```json
{
  "mcpdesc": "0.8.0",
  "info": { "name": "merged-server", "version": "2.0.0" },
  "protocolVersions": ["2026-07-28"],
  "transports": [{ "type": "streamable-http", "url": "https://example.com/mcp" }],
  "provenance": {
    "records": {
      "contract-review": {
        "kind": "curated",
        "producer": { "name": "contract-repository" },
        "method": "review"
      },
      "inspection-42": {
        "kind": "observed",
        "producer": { "name": "mcpcontract", "version": "0.8.0" },
        "method": "dump",
        "artifact": { "uri": "urn:mcpcontract:dump:42" },
        "recordedAt": "2026-08-25T12:30:00Z"
      }
    }
  },
  "tools": [
    {
      "name": "search",
      "inputSchema": { "type": "object" },
      "provenanceIds": ["contract-review", "inspection-42"]
    },
    {
      "name": "experimental_lookup",
      "inputSchema": { "type": "object" },
      "provenanceIds": ["inspection-42"]
    }
  ]
}
```

The records retain distinct evidence for downstream policy evaluation. The document does not prescribe whether either source is authoritative or sufficient to establish completeness.

## Compatibility

This is an additive, backward-compatible change to MCP Description 0.8.0 Draft 1. Existing documents remain valid because provenance is optional. Implementations that reject unknown root or primitive properties will need the 0.8.0 schema update.

The proposal does not change MCP protocol behavior or the meaning of existing primitive fields.

## Migration

No migration is required. A tool that generates a homogeneous description SHOULD emit one record and apply it through `defaultIds`. A merge tool SHOULD omit defaults when no record applies systemically and SHOULD use primitive `provenanceIds` where attribution differs.

Experiments based on the original proposal draft should replace inline primitive `provenance` objects with root records and references. The original `completeness` field has no replacement because completeness is now consumer-derived. An original `observedAt` value may become optional `recordedAt` metadata, but it is no longer provenance identity.

## Security and privacy considerations

Provenance metadata MUST NOT contain credentials, tokens, user identifiers, role names tied to individuals, authorization claims, internal topology, raw runtime session IDs, or other sensitive runtime context.

Artifact URIs and recording times may reveal infrastructure, repository, build, or operational information. Authors SHOULD use non-sensitive identifiers and omit optional fields when publication creates risk.

Consumers MUST treat provenance and referenced artifacts as untrusted input. Resolving an artifact URI can create network, authentication, tracking, and content-processing risks; consumers SHOULD apply their own retrieval and verification policy.

A digest can establish artifact integrity relative to an expected value, but does not establish producer identity, correctness, completeness, or trustworthiness.

## Alternatives considered

### Inline provenance on every primitive

Inline records duplicate systemic metadata in descriptions produced by one tool or method and make merged records harder to preserve. The registry provides defaults for homogeneous documents and references for mixed-origin documents.

### Producer-declared completeness

The original draft proposed `complete`, `partial`, and `unknown`. Review concluded that completeness is difficult to establish without interpreting the producer's method, observation scope, evidence, and consumer requirements. This revision carries provenance facts and leaves completeness as a consumer-derived conclusion.

### Embedded interpretation policy

A record could identify or define the policy under which it should be trusted. That would couple a portable description to a consumer policy and let the producer influence interpretation of its own evidence. This proposal gives the consuming toolset ownership of policy selection and evaluation.

### Runtime session IDs as provenance IDs

An MCP runtime session ID identifies protocol session state, not necessarily a durable capture artifact. It may be absent, transient, reused, or sensitive. Document-local Provenance IDs may refer to external dump or inspector artifacts without overloading MCP session semantics.

### Collection completeness

Collection status can describe whether enumeration was attempted, failed, filtered, or exhausted under an observation method. Those facts may be useful in referenced artifacts or a future proposal, but they do not establish universal completeness. This proposal adds no collection completeness claim.

## Open questions

* Should Provenance IDs remain document-local or support globally unique identifiers directly?
* Should a future proposal standardize capture outcomes such as collection request success and pagination exhaustion?
* Should producer and artifact objects permit specification extensions after Proposal 0011 is resolved?
* Should `generated` be split into more specific origins, or is producer-defined `method` sufficient?

## Implementation and validation plan

1. Add provenance registry, record, producer, artifact reference, and ID-array definitions to the draft JSON Schema.
2. Add optional root `provenance` and primitive `provenanceIds` properties.
3. Validate that every default and primitive ID resolves to a registry record.
4. Add positive fixtures for default attribution, primitive overrides, and multiple contributing records.
5. Add negative fixtures for unresolved or duplicate IDs, malformed records, and malformed artifact URIs or timestamps.
6. Add merge tests for ID collisions and preservation of multi-source attribution.
7. Add projection tests proving that effective attribution and referenced records are preserved.
8. Document that provenance is untrusted evidence interpreted under consumer-owned policy and does not assert completeness.
9. Add a changelog entry and update the full-featured example.

## Decision record

Pending community review.