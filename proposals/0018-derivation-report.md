# Proposal 0018: MCP Description Derivation

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-28
- Target version: MCP Description Derivation 0.1.0 companion format
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/42
- Review period: 2026-08-28 through 2026-09-27

## Summary

Define MCP Description Derivation as an independent, versioned JSON/YAML companion format. A conforming MCP Description derivation report binds source artifacts and one generated MCP Description by digest, then records contributions, derivation decisions, omissions, conflicts, redactions, and diagnostics for that exact output.

The report is not part of MCP Description conformance and is not embedded in the reusable server contract. `x-mcpdesc-provenance` may summarize durable evidence on retained description objects; the report explains one production run in auditable detail.

## Problem

Discovery-plus-traffic producers make decisions that cannot be expressed safely or accurately in MCP Description core:

- source sessions and discovery snapshots contribute different values;
- sensitive and oversized values are redacted or omitted;
- target-version gaps prevent some observed behavior from being represented;
- repeated observations may conflict because servers are nondeterministic;
- producers synthesize declarations from exchanges;
- one nested example may be observed while its containing primitive came from discovery; and
- diagnostics and confidence belong to the producer, not the server.

The supplied Inspector artifacts contain useful session metadata and redaction diagnostics, but the generated description does not bind those facts to exact source and output bytes. Primitive-level provenance then over-attributes some declarations.

## Goals

- Bind reports to exact source and output artifacts using digests.
- Attribute output locations to discovery, invocation, curation, or derivation evidence.
- Explain decisions, conflicts, omissions, and redactions without embedding removed values.
- Reference source events while keeping raw sessions external.
- Carry producer-local diagnostics and bounded confidence assessments.
- Detect stale reports after output editing.
- Keep derivation metadata separate from MCP Description and MCP runtime metadata.

## Non-goals

- Change MCP Description document conformance.
- Prove producer identity, artifact authenticity, server correctness, or evidence completeness.
- Standardize raw Inspector session or packet-capture formats.
- Embed credentials, removed sensitive values, or full runtime transcripts.
- Define signatures, attestations, SBOMs, or a general audit-log transport.
- Make reports merge automatically across independently generated descriptions.
- Replace concise durable provenance in `x-mcpdesc-provenance`.

## Background and primary references

- Proposal 0014, project-defined provenance extension: https://github.com/mcpdesc/mcpdesc-specification/pull/37
- Proposal 0019, versioned schema identity and publication: https://github.com/mcpdesc/mcpdesc-specification/pull/48
- RFC 6901, JSON Pointer: https://www.rfc-editor.org/rfc/rfc6901
- RFC 8785, JSON Canonicalization Scheme: https://www.rfc-editor.org/rfc/rfc8785
- W3C PROV overview: https://www.w3.org/TR/prov-overview/
- Issue 42 Inspector evidence: https://github.com/mcpdesc/mcpdesc-specification/issues/42

JSON Pointer is appropriate only because each pointer is interpreted against one digest-bound parsed output. It is not a durable identifier across later edits, projection, or merge.

## Proposed normative behavior

This proposal is normative for implementations claiming support for MCP Description Derivation `0.1.0`. It adds no requirements to baseline MCP Description implementations.

### 1. Format identity

The root contains the required format and conformance-version discriminator:

```yaml
mcpdesc-derivation: 0.1.0
```

`mcpdesc-derivation` MUST equal `0.1.0`. The root object has required `mcpdesc-derivation`, `producer`, `createdAt`, `sources`, `output`, and `contributions`. Optional collections are `decisions`, `omissions`, `conflicts`, `redactions`, and `diagnostics`.

An optional `$schema` identifies the structural schema resource but does not replace `mcpdesc-derivation`. Under Proposal 0019, a 0.1.0 report SHOULD use:

`https://mcpdesc.org/schema/mcpdesc-derivation/0.1.0.json`

Unknown unprefixed fields are invalid. Eligible objects MAY carry `x-*` extensions.

### 2. Producer and time

`producer` contains required non-empty `name` and optional non-empty `version`. `createdAt` is an RFC 3339 date-time identifying report creation, not server observation time.

Producer identity is an unverified assertion unless protected by an independent integrity mechanism.

### 3. Artifact references

`sources` is a non-empty map from document-local source IDs to Artifact Objects. `output` is one Artifact Object for the generated MCP Description.

An Artifact Object contains:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `uri` | absolute URI | No | Location or stable identifier for the artifact. |
| `mediaType` | string | No | Serialized media type. |
| `digest` | string | Yes | Algorithm and digest of the exact serialized bytes. |
| `capturedAt` | RFC 3339 date-time | No | Source capture time. |

At least one of a resolvable `uri` or producer-defined identifying extension SHOULD accompany each digest. Consumers MUST NOT retrieve `uri` automatically during validation.

Version 0.1.0 requires `sha256:<lowercase-hex>` support. The digest applies to exact artifact bytes; the format does not silently canonicalize JSON or YAML. A producer choosing RFC 8785 canonical JSON records that method explicitly in an `x-*` field and digests those bytes.

### 4. Contributions

`contributions` is a non-empty array. Each Contribution contains:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `outputPointers` | non-empty unique array of JSON Pointers | Yes | Locations in the digest-bound output. |
| `sourceIds` | non-empty unique array of source IDs | Yes | Contributing artifacts. |
| `kind` | `observed`, `generated`, or `curated` | Yes | Nature of the contribution. |
| `method` | non-empty string | No | Stable producer-defined derivation method. |
| `eventRefs` | non-empty unique array of strings | No | Producer-defined event identifiers within sources. |
| `confidence` | number from 0 through 1 | No | Producer-local confidence in this derivation decision. |

Every source ID MUST resolve. Every output pointer MUST resolve against the parsed artifact whose bytes match `output.digest`.

`confidence` is neither probability of server correctness nor trust in the producer. A producer using it MUST document calibration or interpretation through `method` or an extension. Consumers MUST NOT compare confidence values from different methods as though they were calibrated identically.

### 5. Decisions

A Decision explains a generated value or structural choice. It contains required `outputPointer`, `kind`, and `rationale`; optional `sourceIds`, `eventRefs`, and `alternatives` record the evidence and rejected representations.

Decision `kind` is one of `selected`, `merged`, `normalized`, `inferred`, or `defaulted`. Alternatives contain a non-sensitive description and MAY contain a digest of a candidate value; they SHOULD NOT duplicate large or sensitive values.

### 6. Omissions

An Omission records source evidence intentionally absent from the output. It contains required `reason` and `message`, plus optional source IDs, event references, and the nearest relevant output pointer.

`reason` is one of `target-unsupported`, `policy`, `redacted`, `invalid`, `duplicate`, `size-limit`, or `other`. An omission MUST NOT embed the omitted sensitive value.

### 7. Conflicts

A Conflict identifies incompatible candidate observations or source declarations. It contains required `outputPointer`, non-empty `candidates`, `resolution`, and `message`.

Each candidate identifies source IDs and MAY provide a non-sensitive value or value digest. `resolution` is `selected`, `merged`, `omitted`, or `unresolved`. An unresolved conflict means the producer could not represent one authoritative value; it does not automatically make the MCP Description invalid.

### 8. Redactions

A Redaction records a source location or event whose value was removed, replaced, or truncated. It contains required `reason` and `action`, optional source IDs and event references, and optional output pointer when a sanitized replacement appears in the output.

`action` is `removed`, `replaced`, or `truncated`. The report MUST NOT carry the original value or a reversible encoding of it. A digest of low-entropy sensitive data SHOULD NOT be included because it can enable guessing.

### 9. Diagnostics

A Diagnostic contains required stable `code`, `severity`, and `message`; optional output pointer, source IDs, and event references provide location. Severity is `info`, `warning`, or `error`.

Report diagnostics describe derivation quality or processing. They do not replace MCP Description conformance diagnostics and cannot make an invalid output valid.

### 10. Staleness, projection, and merge

A report is applicable only when the candidate output bytes match `output.digest`. A mismatch makes every output pointer stale; consumers MUST NOT silently apply the report to the edited artifact.

On a mismatch, a consumer MUST refuse to resolve or apply contributions, decisions, conflicts, redactions, diagnostics, or other output-pointer claims against that candidate artifact and SHOULD report a stale-report diagnostic. It MAY retain or display the report as historical audit material if it clearly identifies the digest mismatch. It MUST NOT automatically rebase pointers or rewrite the report onto different output bytes.

Projection or merge of the MCP Description invalidates the report unless a tool emits a new report with a new output digest and rewritten contributions. Reports are not automatically merged.

## Schema impact

This proposal does not modify the MCP Description core schema. Following Proposal 0019, the project publishes the independent MCP Description Derivation 0.1.0 schema at:

`https://mcpdesc.org/schema/mcpdesc-derivation/0.1.0.json`

The schema uses that URI as its root `$id` and validates report structure. Semantic validation verifies source ID resolution, pointer resolution against the digest-matched parsed output, uniqueness, digest syntax, and cross-field relationships. Schema identity, live publication, immutability, and alias behavior follow Proposal 0019.

## Examples

```yaml
$schema: https://mcpdesc.org/schema/mcpdesc-derivation/0.1.0.json
mcpdesc-derivation: 0.1.0
producer:
  name: MCP Inspector
  version: 2.3.0
createdAt: '2026-08-28T08:46:15Z'
sources:
  session:
    uri: urn:uuid:c19aa021-e397-422e-8099-022977fbd5b9
    mediaType: application/vnd.modelcontextprotocol.inspector-session+json
    digest: sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
output:
  uri: urn:example:mcpdesc:everything:2026-session
  mediaType: application/yaml
  digest: sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
contributions:
  - outputPointers: [/tools/0]
    sourceIds: [session]
    kind: observed
    method: inspector.native-session.discovery.v1
  - outputPointers: [/tools/0/examples/observed-001]
    sourceIds: [session]
    kind: observed
    method: inspector.native-session.tool-example.v1
    eventRefs: [protocol:echo-call-1]
    confidence: 1
omissions:
  - reason: target-unsupported
    message: Prompt retrieval results cannot be represented by Draft 3.
    sourceIds: [session]
    eventRefs: [protocol:prompt-get-1]
redactions:
  - reason: personal-data
    action: replaced
    sourceIds: [session]
    eventRefs: [protocol:elicitation-1]
diagnostics:
  - code: derivation.nondeterministic-observations
    severity: warning
    message: Repeated reads produced different timestamped content.
    outputPointer: /resourceTemplates/0/examples
```

The digest values are illustrative. A conforming report uses digests of the actual serialized artifacts.

## Compatibility

MCP Description Derivation is additive and independent. Existing MCP Description documents and implementations remain unchanged. A report can accompany Draft 3, Draft 4, stable 0.7.0, or another explicitly identified output version.

## Migration

Inspector-specific diagnostics can migrate by assigning stable source IDs, digesting the exact source and output bytes, grouping output-location contributions, and mapping existing redaction and omission codes to the report vocabulary.

Embedding the report under an MCP Description `x-*` field is not the recommended migration because it changes the output digest recursively and couples one derivation run to the reusable contract.

## Security and privacy considerations

Reports can reveal artifact locations, local paths, event identifiers, producer infrastructure, observation times, and reasons for redaction. Producers MUST minimize this metadata, use non-resolvable URNs where public retrieval is unnecessary, and avoid credentials, personal identifiers, authorization context, or removed values.

Consumers MUST NOT automatically retrieve artifact URIs, MUST treat report text as untrusted, and SHOULD bound report size, pointer count, reference depth, digest work, and candidate values. Reports do not authorize source retrieval or prove artifact authenticity.

## Alternatives considered

- **Expand `x-mcpdesc-provenance`:** rejected because run diagnostics and output pointers should not become durable server contract metadata.
- **Inspector-specific reports:** insufficient for portable review and common auditing tools.
- **Nested `format.id` and `format.version`:** rejected because `mcpdesc-derivation` directly identifies the independent format and its conformance version, matching the root-version pattern used by MCP Description and OpenAPI. The former reverse-DNS identifier also implied ownership by the Model Context Protocol project.
- **OpenTelemetry or logs:** useful transport mechanisms, but they do not define binding and output-location semantics.
- **Canonicalize every artifact before digesting:** rejected for 0.1.0 because YAML canonicalization and round-trip expectations are not uniform; exact bytes are unambiguous.

## Open questions

- Should future versions permit content-addressed artifacts without a URI?
- Is `confidence` sufficiently interoperable with method-local semantics, or should 0.1.0 defer it until producers publish calibration profiles?
- Should candidate non-sensitive values be inline, digest-only, or both in Conflict Objects?

## Implementation and validation plan

After acceptance:

1. publish the versioned companion JSON Schema and format documentation;
2. add valid and invalid JSON/YAML serialization fixtures;
3. implement source resolution and digest-bound pointer validation;
4. add stale-output, redaction, conflict, omission, and processing-limit tests;
5. document Inspector and `x-mcpdesc-provenance` integration;
6. add a complete sanitized Everything Server example; and
7. publish and verify the immutable 0.1.0 schema according to Proposal 0019 while keeping all MCP Description Draft 1-3 artifacts unchanged.

## Decision record

- 2026-08-28: Initial Review proposal selects an independent exact-byte digest-bound companion report with output pointers valid only for that artifact.
- 2026-08-28: Review revision names the independent format MCP Description Derivation, replaces nested reverse-DNS format metadata with `mcpdesc-derivation: 0.1.0`, and adopts Proposal 0019's format-qualified schema URI.