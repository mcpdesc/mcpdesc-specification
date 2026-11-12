# Proposal 0014: Project-Defined Provenance Extension

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-27
- Target version: Extension for MCP Description 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/21
- Review period: 2026-08-27 through 2026-09-26

## Summary

Define provenance as the project-defined `x-mcpdesc-provenance` specification extension instead of adding native `provenance` and `provenanceIds` fields to the MCP Description 0.8.0 core.

The extension retains reusable evidence records, document defaults, primitive-specific attribution, and named-example attribution. Example-level ownership lets a discovered declaration and an observed invocation or read identify their actual evidence independently. Extension-aware tooling can validate references and provide specialized projection, merge, and comparison behavior. Generic MCP Description tooling treats the value as an ordinary `x-*` extension: it preserves the extension on retained owners but does not infer provenance semantics.

Proposal 0014 and Proposal 0008 are competing designs. Acceptance of one rejects or supersedes the other for MCP Description 0.8.0.

## Problem

Proposal 0008 addresses a real need: generated, observed, curated, and merged descriptions benefit from portable information about the evidence that contributed to primitive declarations. Its native design gives every conforming implementation structural and semantic responsibilities for provenance, even when that implementation only validates, renders, or projects the server's runtime-facing surface.

Work on MCP Description 0.8.0 subsequently added object-level `x-*` specification extensions. That mechanism now provides a lower-commitment way to incubate descriptive metadata that is independent of MCP runtime semantics. Provenance can evolve through implementation experience without making its record model, identifiers, merge policy, and consumer-policy boundaries part of every core implementation.

Draft 2 experimentally implemented Proposal 0008. Draft 3 review found that the feature adds disproportionate core specification, schema, fixture, validation, projection, merge, migration, and security surface for optional descriptive metadata. The active Draft 3 therefore removes the native experiment while the project evaluates this extension alternative.

## Goals

- Preserve a portable project-defined vocabulary for curated, observed, and generated evidence.
- Support reusable document-level records, systemic defaults, primitive overrides, and multiple contributing records.
- Attribute a named primitive example independently from its containing declaration.
- Keep provenance separate from MCP protocol fields and runtime semantics.
- Allow provenance to evolve without changing the MCP Description core schema.
- Let implementations that do not use provenance remain conforming without provenance-specific behavior.
- Define an extension-aware profile for reference validation and specialized projection, merge, and comparison.
- Preserve a clear migration path to a future native feature if interoperability experience justifies promotion.

## Non-goals

- Require baseline MCP Description implementations to understand provenance.
- Assert completeness, confidence, precedence, trust, authority, or consumer policy.
- Prove producer identity, artifact authenticity, or current server behavior.
- Model authorization context, users, roles, credentials, runtime sessions, or request transcripts.
- Standardize supply-chain attestations, signatures, SBOMs, or artifact retrieval.
- Make generic extension processors perform provenance-aware ID remapping or record pruning.
- Add native `provenance` or `provenanceIds` properties to MCP Description 0.8.0.

## Background and primary references

- Proposal 0008, Provenance Records and Primitive Attribution: https://github.com/mcpdesc/mcpdesc-specification/pull/26
- Proposal 0011, Object-Level Specification Extensions: https://github.com/mcpdesc/mcpdesc-specification/pull/29
- MCP Description Draft 2 native provenance experiment: https://github.com/mcpdesc/mcpdesc-specification/releases/tag/v0.8.0-draft.2
- MCP Description specification-extension rules: `spec/draft/sections/14-specification-extensions.md`
- Cisco `x-cisco-metadata` extension: `spec/draft/extensions/x-cisco-metadata/README.md`

Proposal 0008 was designed before the object-level extension model was available in the draft. Proposal 0011 permits `x-*` values at the document root and directly on Tool, Resource, Resource Template, and Prompt Objects, which are the ownership locations needed for reusable records and primitive attribution.

`x-mcpdesc-provenance` is a project-defined extension. The name does not place the fields in the core specification and does not make the extension part of MCP protocol `_meta` or `capabilities.extensions`.

## Proposed normative behavior

This section is normative only for implementations and documents claiming conformance to the `x-mcpdesc-provenance` extension. It does not add requirements to baseline MCP Description conformance.

### 1. Extension identity and eligible locations

The extension property name is `x-mcpdesc-provenance`.

It MAY appear on:

- the root MCP Description Object, as a Provenance Registry Extension Object; and
- a Tool, Resource, Resource Template, or Prompt Object, as a Provenance Attribution Extension Object; and
- a named Tool, Resource, Resource Template, or Prompt Example Object defined by the containing MCP Description version, as a Provenance Attribution Extension Object.

It MUST NOT appear at another location unless a later extension version explicitly adds that location. The extension MUST NOT appear inside MCP `_meta`, MCP protocol payloads, embedded JSON Schemas, Reference Objects, or component namespace maps.

A document using primitive or example provenance MUST contain a root registry using the same extension version.

### 2. Provenance Registry Extension Object

The root extension value is an object with these properties:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `version` | string | Yes | Extension version. This proposal defines `0.1.0`. |
| `records` | non-empty map of Provenance Record Objects | Yes | Document-local evidence records. |
| `defaultIds` | non-empty array of unique strings | No | Attribution for primitives without a primitive extension. |

The object MUST NOT contain other unprefixed properties. It MAY contain nested project- or vendor-defined `x-*` properties.

Each record key is an opaque, non-empty, case-sensitive document-local Provenance ID. Every `defaultIds` value MUST resolve to a key in `records`.

### 3. Provenance Record Object

A Provenance Record Object has the model defined by Proposal 0008:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | `curated`, `observed`, or `generated` | Yes | How the evidence was produced. |
| `producer` | Producer Object | No | Tool or organization that produced the evidence. |
| `method` | non-empty string | No | Stable producer-defined method identifier. |
| `artifact` | Artifact Object | No | External evidence supporting the record. |
| `recordedAt` | RFC 3339 date-time string | No | Time at which the evidence was recorded. |

A Producer Object MUST contain a non-empty `name` and MAY contain a non-empty `version`. An Artifact Object MUST contain an absolute URI `uri` and MAY contain a non-empty `digest` identifying both its algorithm and value.

Records, producers, and artifacts MAY contain nested `x-*` properties and MUST NOT contain other undefined properties. They do not define completeness, confidence, trust, precedence, or consumer policy.

### 4. Provenance Attribution Extension Object

A primitive or named-example extension value contains exactly one property:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `ids` | non-empty array of unique strings | Yes | Records replacing root defaults for this primitive. |

Every ID MUST resolve to the root extension registry. A present primitive extension replaces, rather than extends, `defaultIds`. Omission inherits `defaultIds` when present. Omission of both makes no portable provenance attribution.

Primitive attribution applies to the primitive declaration and its ordinary declaration fields, but not to a nested named Example Object. A named example is an independently attributable object. A present example extension identifies evidence for that example and replaces any systemic default; omission means that the extension makes no example-specific attribution. Primitive IDs and `defaultIds` MUST NOT be interpreted as evidence for a nested example merely because it is stored within that primitive.

This boundary prevents over-attribution when discovery establishes a Tool declaration and a later invocation establishes only one named Tool Example. The Tool can identify discovery evidence while the example identifies invocation evidence, without claiming that the invocation established the Tool's name, schemas, annotations, or other declaration fields.

Multiple IDs mean that evidence from multiple records contributed to the declaration. Their order MUST NOT imply precedence, confidence, trust, or merge order.

### 5. Core processing boundary

A baseline MCP Description implementation treats `x-mcpdesc-provenance` according to the ordinary specification-extension rules:

- an unrecognized value does not affect core document conformance;
- the value is ignored for core semantic interpretation;
- projection preserves it on retained owners unless extension stripping was explicitly requested;
- merge preserves equal values and reports conflicts it cannot represent without guessing; and
- compatibility and semantic comparison do not receive provenance-specific behavior.

Failure to load or understand this extension MUST NOT invalidate an otherwise conforming MCP Description document unless the implementation explicitly applies an extension-aware profile.

### 6. Extension-aware validation

An implementation claiming `x-mcpdesc-provenance` support MUST validate:

- the extension version and location-specific object shape;
- non-empty records and ID arrays;
- record kinds, producer and artifact shapes, date-time values, and digest syntax;
- uniqueness of ID arrays; and
- resolution of every default, primitive, and example ID to the root registry.

It MUST distinguish extension-profile conformance from baseline MCP Description conformance in its API or diagnostics.

### 7. Extension-aware projection

An extension-aware single-version projection MUST preserve the effective attribution of every retained primitive, every retained named example, and every referenced record. It MAY prune records unused by retained attributable objects. It MUST NOT synthesize records or change attribution.

Generic projection remains conforming when it preserves the complete root extension and each retained primitive extension without interpreting them.

### 8. Extension-aware merge

An extension-aware merge SHOULD preserve records and effective attribution from every contributing document. When different records use the same document-local ID, it MUST either deterministically remap one ID and every affected reference or report a conflict. It MUST NOT silently bind one ID to different records.

When equivalent declarations or named examples receive evidence from multiple inputs, extension-aware tooling SHOULD retain all contributing records at the corresponding ownership location. It MUST NOT move example evidence to the containing primitive merely to simplify merge, and MUST NOT infer completeness, confidence, precedence, or trust from record count or metadata.

Generic merge tooling is not required to perform ID remapping or attribution combination. It follows the ordinary extension conflict rules and MAY report a conflict when distinct extension values cannot be represented losslessly.

### 9. Comparison and consumer policy

Extension-aware runtime-contract comparison SHOULD ignore differences confined to `x-mcpdesc-provenance`. Representation-preserving comparison MAY report those differences.

Consumers MAY use provenance under externally selected policy for documentation, filtering, governance, or review. They MUST treat records and artifacts as untrusted assertions unless independently verified and MUST NOT infer collection completeness solely from attribution.

## Schema impact

This proposal makes no change to the MCP Description core JSON Schema because eligible objects already accept `x-*` values.

The project SHOULD publish a versioned extension JSON Schema with a stable `$id`, for example:

`https://mcpdesc.org/extensions/x-mcpdesc-provenance/0.1.0/schema.json`

The schema SHOULD define the root registry value, attribution value, records, producers, and artifacts. Because the same extension name has location-specific shapes, extension-aware validators must select the applicable definition from the containing MCP Description object type. Cross-object ID resolution remains semantic validation.

## Examples

### Systemic generated provenance

```yaml
mcpdesc: 0.8.0
info:
  name: example-server
  version: 2.0.0
protocolVersions: [2026-07-28]
x-mcpdesc-provenance:
  version: 0.1.0
  records:
    generation-01:
      kind: generated
      producer:
        name: example-generator
        version: 3.1.0
      method: source-generation
      artifact:
        uri: https://example.com/builds/42/generation.json
        digest: sha256:7f83b1657ff1fc53
  defaultIds: [generation-01]
tools:
  - name: search
    inputSchema:
      type: object
```

### Primitive-specific attribution

```yaml
x-mcpdesc-provenance:
  version: 0.1.0
  records:
    contract-review:
      kind: curated
      producer:
        name: contract-repository
    inspection-42:
      kind: observed
      producer:
        name: example-inspector
      recordedAt: '2026-08-27T12:30:00Z'
tools:
  - name: search
    inputSchema:
      type: object
    x-mcpdesc-provenance:
      ids: [contract-review, inspection-42]
```

The second excerpt omits unrelated required root fields for brevity.

### Declaration and example attribution

```yaml
x-mcpdesc-provenance:
  version: 0.1.0
  records:
    discovery:
      kind: observed
      producer:
        name: example-inspector
      method: session.discovery
    invocation:
      kind: observed
      producer:
        name: example-inspector
      method: session.tool-example
tools:
  - name: echo
    inputSchema:
      type: object
      properties:
        message:
          type: string
      required: [message]
    examples:
      observed-001:
        input:
          message: hello
        result:
          content:
            - type: text
              text: 'Echo: hello'
        x-mcpdesc-provenance:
          ids: [invocation]
    x-mcpdesc-provenance:
      ids: [discovery]
```

The Tool attribution describes evidence for the declaration. The nested attribution describes evidence for only `observed-001`; neither is implicitly copied to the other owner.

## Compatibility

The extension is additive to MCP Description 0.8.0. Documents without it are unchanged. Baseline implementations accept it through existing `x-*` rules and need not implement provenance semantics.

The design deliberately trades universal core behavior for optional extension awareness. Generic validators cannot guarantee ID resolution, generic projection does not prune records, generic merge does not remap IDs, and generic comparison may treat extension differences as semantically significant. These are extension-profile capabilities rather than baseline requirements.

The immutable Draft 2 snapshot remains unchanged and continues to represent the experimental native Proposal 0008 model.

## Migration

A document using Draft 2 native provenance can migrate mechanically:

- rename root `provenance` to `x-mcpdesc-provenance`;
- add `version: 0.1.0` to the root extension value;
- replace each primitive `provenanceIds: [...]` with `x-mcpdesc-provenance: { ids: [...] }`; and
- validate the result with an extension-aware validator.

When migrating a generated document that combined discovery and traffic evidence at primitive level, producers SHOULD move invocation- or read-specific IDs onto the named examples they actually support. They MUST NOT retain broader attribution merely to avoid distinguishing declaration and example evidence.

A consumer that requires Proposal 0008's specialized merge, projection, or comparison guarantees must enable an extension-aware profile. Baseline validation alone is insufficient.

If a future MCP Description version promotes provenance into core, migration tooling can reverse this mapping for the extension version whose semantics were adopted.

## Security and privacy considerations

Provenance metadata MUST NOT contain credentials, tokens, personal user identifiers, person-specific roles, authorization claims, confidential topology, raw runtime session IDs, or other sensitive runtime context.

Artifact URIs and recording times can expose infrastructure, repository, build, or operational information. Authors SHOULD omit or redact optional values when publication creates risk.

Consumers MUST treat extension values and referenced artifacts as untrusted input. Artifact retrieval requires explicit consumer-controlled network, authentication, tracking, integrity, size, and content-processing policy. Validators SHOULD NOT automatically retrieve the extension schema or referenced artifacts.

A digest can establish artifact integrity relative to an expected value but does not establish producer identity, correctness, completeness, or trustworthiness.

## Alternatives considered

### Native core provenance

Proposal 0008 provides uniform validation and specialized behavior from every conforming implementation. This is preferable if provenance is considered part of the minimum interoperable MCP Description model and generic merge, projection, and comparison guarantees are essential.

This proposal instead prioritizes a smaller core and independent evolution. It accepts that generic tools preserve provenance opaquely and may report merge conflicts that an extension-aware tool can resolve.

### Vendor-specific provenance extensions

Individual vendors can define unrelated provenance vocabularies. That minimizes project commitments but fragments portable evidence attribution. A project-defined extension provides one interoperable experiment without making it core.

### Root-only attribution map

A root extension could map JSON Pointers or primitive identifiers to records. Such references are brittle under array reordering, protocol projection, merge renaming, and duplicate primitive names across disjoint scopes. Object-level extensions keep attribution with its semantic owner.

### Inline records on every primitive

Inline records avoid document-local references but duplicate systemic metadata and make merged evidence harder to deduplicate. The registry/default/override model remains more suitable for generated and mixed-origin documents.

## Open questions

- Is `x-mcpdesc-provenance` the appropriate project namespace, or should project-defined extensions use a different naming convention?
- Should the extension publish one location-aware schema or separate root and primitive schemas?
- Should nested record objects permit arbitrary `x-*` properties in the first extension version?
- Which extension-aware projection and merge behaviors must be implemented before moving the proposal from Review?
- What interoperability evidence would justify later promotion into the core specification?

## Implementation and validation plan

1. Publish extension documentation under `spec/draft/extensions/x-mcpdesc-provenance/` only after acceptance.
2. Publish a versioned extension JSON Schema with root and attribution definitions.
3. Add conforming root-default, primitive-override, and named-example examples.
4. Add extension-profile fixtures for malformed values and unresolved IDs.
5. Add extension-aware projection tests for primitive and named-example attribution and optional record pruning.
6. Add extension-aware merge tests for ID collisions, remapping, ownership-preserving multi-source attribution, and generic-tool conflict behavior.
7. Add migration coverage from immutable Draft 2 native provenance documents.
8. Document separate baseline and extension-profile conformance claims.
9. Gather implementation experience before considering native promotion.

## Decision record

Pending community review. Reviewers should compare this proposal directly with Proposal 0008 and select at most one provenance model for MCP Description 0.8.0.

- 2026-08-28: Added independent named-example attribution after Inspector sessions demonstrated that primitive-only IDs over-attribute invocation and read evidence.
