# Proposal 0006: Describe Expected MCP `_meta` with JSON Schema

- Status: Draft
- Author: Stève Sfartz
- Created: 2026-08-24
- Target version: Post-0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/13
- Related proposals: Proposal 0002; Proposal 0004; Proposal 0005
- Historical input: https://github.com/mcpdesc/mcpdesc-specification/issues/2

## Summary

Evaluate an optional MCP Description facility for documenting the expected shape of MCP `_meta` objects with JSON Schema at explicitly identified protocol contexts.

The facility would complement, not replace, literal `_meta` values and named examples. Its primary use cases are API and MCP gateways, validators, generated documentation, contract tests, and deterministic mocks that need a machine-readable metadata contract unavailable in the current MCP protocol.

This proposal is intentionally separate from Proposal 0002. Proposal 0002 aligns literal `_meta` values in the 0.8.0 draft. This proposal considers a new MCP Description abstraction only after the literal-value semantics and MCP context inventory are stable.

## Problem

MCP defines where `_meta` may occur, its key grammar, reserved namespaces, and selected reserved keys. It does not currently provide a protocol field through which a server can publish a JSON Schema for additional `_meta` values it may accept or emit.

Literal values do not close that gap:

- declaration `_meta` is metadata on that declaration, not a schema for future interactions;
- named Tool and Resource examples can illustrate result `_meta`, but examples are non-exhaustive and non-normative;
- an example cannot state that a key is required, constrain its value, or describe alternatives;
- gateways cannot reliably validate or transform undocumented metadata;
- mock generators cannot distinguish stable metadata contracts from incidental example values; and
- documentation generators cannot describe metadata fields that are valid but absent from the selected examples.

For example, a Tool may return an execution error with actionable text and supplemental machine-readable metadata:

```json
{
  "resultType": "complete",
  "content": [
    {
      "type": "text",
      "text": "Tool quota exhausted; retry later."
    }
  ],
  "isError": true,
  "_meta": {
    "com.example/error-code": "quota_exhausted",
    "com.example/retry-after-seconds": 60
  }
}
```

A named example can show those values, but it cannot declare whether the keys are optional, which error codes exist, or that the retry delay is a non-negative integer.

## Goals

- Allow MCP Description authors to document expected `_meta` object shapes using standard JSON Schema.
- Identify the exact MCP protocol context to which each schema applies.
- Support declaration, request, result, notification, and nested content contexts only where the applicable MCP revision defines `_meta`.
- Support protocol-version scoping and deterministic Effective Protocol Views.
- Enable gateways and validators to check metadata without treating examples as contracts.
- Enable documentation, contract-test, and mock tooling to discover metadata fields and generate representative values.
- Reuse the embedded JSON Schema dialect and offline `$ref` safety policies already established by MCP Description where practical.
- Keep literal `_meta`, metadata schemas, MCP extensions, and MCP Description `x-*` extensions semantically distinct.
- Provide a design that can be proposed upstream to MCP if ecosystem experience demonstrates protocol-level value.

## Non-goals

- Claim that MCP itself advertises `_meta` schemas today.
- Change MCP wire messages or require an MCP server to emit schema declarations.
- Replace literal `_meta` values or named examples.
- Define an mcpdesc-specific runtime error channel or universal error-code catalogue.
- Assign semantics to third-party metadata keys without authority from their owners.
- Permit schemas to override the shape or meaning of MCP-reserved keys.
- Describe arbitrary request or result payloads unrelated to `_meta`.
- Make gateways trust metadata merely because it validates structurally.
- Add this feature to the frozen 0.7.0 specification.
- Include this feature in Proposal 0002 or block completion of literal `_meta` alignment for 0.8.0.

## Background and primary references

- MCP 2025-06-18 general `_meta` fields: https://modelcontextprotocol.io/specification/2025-06-18/basic/index#meta
- MCP 2025-11-25 general `_meta` fields: https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta
- MCP 2026-07-28 general `_meta` fields: https://modelcontextprotocol.io/specification/2026-07-28/basic/index#meta
- MCP 2026-07-28 Tool errors: https://modelcontextprotocol.io/specification/2026-07-28/server/tools#error-handling
- MCP Description Proposal 0002: literal `_meta` alignment
- MCP Description Proposal 0004: named Tool examples
- MCP Description Proposal 0005: named Resource and Resource Template examples
- JSON Schema 2020-12: https://json-schema.org/draft/2020-12

Proposal 0002 establishes MCP 2025-06-18 as the floor for complete revision-specific semantic conformance. This proposal should initially target that revision and later revisions. Supporting schema declarations for older legacy compatibility revisions is not required.

## Terminology

- **literal metadata** is an actual `_meta` object written on an MCP-derived declaration or inside a named example;
- **metadata schema** is a JSON Schema that describes allowed `_meta` objects at a specified protocol context;
- **context** identifies the MCP object or interaction position whose `_meta` is described; and
- **effective metadata schema** is the metadata schema selected for one context in one Effective Protocol View.

A metadata schema is MCP Description contract metadata. It is not itself copied into an MCP `_meta` object and is not evidence that a live MCP peer advertised or agreed to that schema.

## Candidate contexts

The primary-source inventory must determine the final closed context vocabulary. Candidate contexts include:

| Context family | Candidate contexts |
|----------------|--------------------|
| General interactions | request, result, notification |
| Tool | declaration, call request, call result, call result content |
| Resource | declaration, template declaration, read request, read result, Resource Contents |
| Prompt | declaration, get request, get result, result content |
| Other MCP surfaces | only contexts explicitly modeled by MCP Description and permitted by the applicable MCP revision |

"Any level" does not mean arbitrary JSON paths. Every schema must target a named, specification-defined MCP context. This prevents fragile selectors and prevents metadata schemas from becoming a general-purpose payload overlay language.

Request and notification contexts need special scrutiny because MCP Description currently focuses on a static server surface rather than complete operation transcripts. A context should be added only when it has clear gateway or contract value and can be defined without importing unrelated wire choreography.

## Design requirements

Any accepted design MUST satisfy these requirements:

1. **Explicit context:** every metadata schema identifies one unambiguous MCP `_meta` location.
2. **Revision applicability:** every context and reserved key is legal in every effective protocol revision to which the declaration applies.
3. **Object instance:** the schema describes the complete `_meta` object, whose instance type is an object.
4. **Reserved-key integrity:** a schema MUST NOT redefine an MCP-reserved key incompatibly with the applicable MCP specification or authorized extension.
5. **Forward compatibility:** schemas SHOULD allow unknown valid metadata keys unless the author intentionally declares a closed third-party contract and closure does not reject required MCP keys.
6. **No implicit projection:** metadata schemas are omitted when projecting to native MCP protocol values unless a separately negotiated MCP extension defines a wire destination.
7. **No example inference:** tooling MUST NOT infer a metadata schema from literal examples.
8. **No value synthesis claim:** generated mock values are illustrative and do not prove server behavior.
9. **Offline safety:** external `$ref` values are preserved but are not retrieved automatically; incomplete resolution is reported honestly.
10. **Security:** schemas and examples must not disclose secrets or normalize unsafe publication of runtime-sensitive values.

## Design alternatives

### Alternative A: Adjacent per-object `metaSchemas` map

Add an optional `metaSchemas` map to MCP-derived declarations. Each supported key is a named context relative to the containing declaration.

Illustrative Tool syntax:

```json
{
  "name": "quota_limited_search",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    },
    "required": ["query"]
  },
  "metaSchemas": {
    "declaration": {
      "type": "object",
      "properties": {
        "com.example/category": { "const": "search" }
      }
    },
    "result": {
      "type": "object",
      "properties": {
        "com.example/error-code": {
          "type": "string",
          "enum": ["quota_exhausted", "upstream_unavailable"]
        },
        "com.example/retry-after-seconds": {
          "type": "integer",
          "minimum": 0
        }
      },
      "additionalProperties": true
    }
  }
}
```

The `result` schema describes the complete `_meta` object of completed Tool Results. It does not mean the shown keys are present only when `isError` is true; expressing such a parent-dependent condition would require a broader result schema or a predicate language and is outside this alternative.

**Advantages:** discoverable beside the primitive; easy for documentation and mocks; context names can be validated; naturally inherits primitive protocol scope.

**Disadvantages:** context vocabularies differ by primitive; common schemas may be duplicated; general request/result/notification defaults do not have an obvious owner; adding every possible context could make declarations large.

### Alternative B: Root registry plus explicit bindings

Add reusable root metadata-schema definitions and bind them to named contexts from declarations.

Illustrative syntax:

```json
{
  "metaSchemas": {
    "tool-error-details": {
      "type": "object",
      "properties": {
        "com.example/error-code": { "type": "string" },
        "com.example/retry-after-seconds": {
          "type": "integer",
          "minimum": 0
        }
      },
      "additionalProperties": true
    }
  },
  "tools": [
    {
      "name": "quota_limited_search",
      "inputSchema": { "type": "object" },
      "metaSchemaBindings": {
        "result": "tool-error-details"
      }
    }
  ]
}
```

**Advantages:** reuse across declarations; compact bindings; gateways can index one registry; named schemas can have stable documentation identities.

**Disadvantages:** introduces a component/reference system; names and conflict behavior need definition; bindings still require a context vocabulary; cross-file reuse remains unsolved; a root registry can be mistaken for metadata that applies globally.

### Alternative C: Root context declarations with structured selectors

Declare metadata schemas centrally with a closed selector object identifying primitive kind, identifier, interaction, and nested context.

**Advantages:** can represent global and operation-specific contexts uniformly; avoids adding fields to every declaration; suitable for gateway compilation.

**Disadvantages:** selector complexity; identifiers and protocol variants create conflict rules; resembles a parallel operation model; easy to become an arbitrary JSON-path mechanism; less readable beside the primitive.

### Alternative D: No mcpdesc schema facility

Keep Proposal 0002's literal-values-and-examples boundary. Require metadata contracts to be documented by an MCP extension or future MCP protocol feature.

**Advantages:** no new mcpdesc abstraction; strongest protocol alignment; no risk of implying wire negotiation.

**Disadvantages:** leaves gateways, validators, documentation, tests, and mocks without a portable contract while upstream standardization is pending.

## Preliminary direction

Alternative A is the simplest starting point for experimentation because it keeps schemas close to the declaration and reuses protocol scoping. Alternative B may be added only if demonstrated duplication justifies a reusable registry. Alternative C should be avoided unless gateway use cases prove that per-declaration contexts are insufficient.

No syntax in this draft is accepted. Before normative design, the proposal must test at least Tool declaration/result, Resource declaration/read result/contents, and Prompt declaration/result contexts against realistic gateway and mock-generation workflows.

## Proposed normative behavior

Normative behavior is intentionally pending evaluation. A future revision should define at minimum:

1. the field names and closed context vocabulary;
2. whether schemas are inline, reusable, or both;
3. protocol-scope inheritance and overlap rules;
4. JSON Schema dialect defaults and supported dialects;
5. composition with MCP core and extension-reserved keys;
6. validation of literal `_meta` in named examples against applicable metadata schemas;
7. whether conformance requires schemas to accept every literal declaration value in their context;
8. projection, merge, and round-trip behavior; and
9. diagnostics when complete schema evaluation is impossible.

The eventual normative text MUST say that a metadata schema documents an MCP Description contract and has no native MCP wire representation unless an applicable MCP extension defines one.

## Schema impact

The eventual JSON Schema change would add one or more mcpdesc-specific fields such as `metaSchemas`, `metaSchema`, or `metaSchemaBindings`. Each embedded schema would use the same structural JSON Schema representation used for Tool schemas, but its root would be required to describe an object because MCP `_meta` is an object.

A structural schema alone cannot enforce all requirements. Semantic validation would be needed for:

- context legality by MCP revision;
- declaration identity and scope binding;
- reserved-key compatibility;
- duplicate or overlapping bindings;
- example compatibility;
- schema dialect support; and
- unresolved external references.

## Examples

### Gateway validation

A gateway selects the effective Tool result metadata schema for the request's MCP revision, validates `result._meta`, preserves unknown valid keys when allowed, and reports metadata violations separately from Tool `outputSchema` violations.

### Documentation

A documentation generator lists known metadata keys, descriptions, types, and examples without claiming that optional keys appear in every result.

### Contract tests and mocks

A contract test validates literal named-example `_meta` against the applicable schema. A mock generator may synthesize a conforming illustrative object, but it must not present generated values as observed server behavior and must not synthesize secrets or reserved identifiers.

### Tool execution errors

Tool execution errors remain completed Tool Results with `isError: true` and actionable `content`. A Tool result metadata schema may document supplemental machine-readable keys, but does not define a new error channel or make those keys exclusive to errors.

## Compatibility

The feature would be additive for 0.8.0 documents but should target a later specification version because it introduces a new contract abstraction. Existing literal `_meta` remains valid independently of metadata schemas unless an author opts into a schema and the final design explicitly requires consistency.

The frozen 0.7.0 schema and stable artifacts remain unchanged.

Downstream tools that do not understand metadata-schema declarations must follow the normal compatibility policy of the target MCP Description version. If the fields are core rather than `x-*`, older validators may reject them; this is one reason to target a later version instead of inserting the feature into 0.8.0 late in its draft cycle.

## Migration

No migration is required for documents that use only literal `_meta` or examples.

Authors adopting metadata schemas should:

1. identify each actual MCP context rather than generalizing from one example;
2. remove credentials, identifiers, traces, and incidental runtime values;
3. define optionality deliberately;
4. preserve room for applicable MCP-reserved keys and forward-compatible metadata;
5. validate existing literal examples against the candidate schema; and
6. scope schemas by protocol version where MCP context or reserved-key semantics differ.

Tooling MUST NOT generate a schema by treating one example as exhaustive.

## Security and privacy considerations

Metadata schemas can reveal internal taxonomies, provider names, infrastructure details, correlation identifiers, and error classifications even when no live values are present. Authors must review schemas as publishable API surface.

Schemas and examples MUST NOT contain credentials, bearer tokens, private keys, live user identifiers, internal hostnames, or reusable trace identifiers. `default`, `const`, `examples`, and descriptive annotations require the same review as literal `_meta`.

Gateways MUST treat validated metadata as untrusted. JSON Schema validation does not establish authenticity, authorization, integrity, or safe rendering. Implementations should impose schema depth, evaluation, input-size, and output-size limits and must follow the repository's no-automatic-network-retrieval policy for `$ref`.

Mock generators must avoid producing values that resemble working credentials or routable internal identifiers. Documentation renderers must escape metadata and schema annotations as untrusted text.

## Alternatives considered

The four design alternatives above remain under evaluation. An MCP extension could also carry schema advertisement at runtime. That approach may ultimately provide stronger interoperability than an mcpdesc-only declaration, but it requires upstream or extension-level design and does not remove the near-term static documentation use case.

## Open questions

1. Should the first version support only declaration and completed-result contexts, leaving request and notification contexts for later?
2. Is an adjacent map sufficient, or is a reusable registry necessary for gateway-scale descriptions?
3. Should metadata schemas be allowed to close the object with `additionalProperties: false`, given future MCP-reserved keys?
4. How should a schema express known metadata that is present only when a parent result has `isError: true` without defining a general parent-object predicate language?
5. Should literal declaration and named-example `_meta` be required to validate against an applicable schema?
6. May multiple schemas compose at one context, for example a core server schema plus schemas contributed by advertised MCP extensions?
7. How are conflicts between core, extension-owned, and server-owned schema fragments diagnosed?
8. Should an extension identifier in `capabilities.extensions` be required before its reserved metadata schema can apply?
9. Should the facility target only MCP 2025-06-18 and later?
10. What subset of this design should be proposed to MCP as a runtime discovery or extension feature?

## Implementation and validation plan

Before acceptance:

1. complete Proposal 0002's primary-source context and reserved-key inventory;
2. collect at least three gateway, documentation, contract-test, or mock use cases from independent implementations;
3. prototype Alternatives A and B without changing the normative draft;
4. test Tool result-error, Resource result/content, and Prompt result scenarios;
5. determine whether request and notification schemas fit MCP Description's static scope;
6. draft exact normative text and JSON Schema changes;
7. define projection, merge, and round-trip behavior;
8. define reserved-key composition and conflict diagnostics;
9. add positive, invalid, and warning fixtures, including unresolved `$ref` behavior;
10. evaluate an MCP issue or extension proposal for protocol-level schema advertisement; and
11. conduct a separate acceptance review for a post-0.8.0 target.

Implementation must not modify frozen released specifications. It must update the target version's section sources, assembled specification, schema, examples, fixtures, changelog, migration guidance, and projection/merge tests together.

## Decision record

Pending evaluation. No syntax or target release has been accepted.

AI assistance disclosure: GitHub Copilot assisted with repository and MCP-source analysis, alternative design exploration, and proposal drafting. The human author remains responsible for review and acceptance.