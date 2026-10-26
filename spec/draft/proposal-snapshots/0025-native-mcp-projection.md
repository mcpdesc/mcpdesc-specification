# Proposal 0025: Native MCP Projection

- Status: Draft
- Author(s): @ObjectIsAdvantag
- Created: 2026-10-26
- Target version: 0.9.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/72
- Depends on: [Proposal 0024](0024-validation-rule-identity-and-provenance.md)
  (sources of truth, pinned MCP schemas),
  [Proposal 0027](0027-closed-mcp-types.md) (closed MCP types)
- AI assistance disclosure: Drafted with GitHub Copilot from maintainer
  decisions recorded on issue #72; requires normal maintainer and community
  review.

## Summary

Define how an MCP Description Tool declaration becomes the MCP `Tool` value a
server returns from `tools/list` for one MCP revision.

Native projection selects the declaration that applies to the revision,
resolves local references, keeps exactly the fields that the revision's MCP
`Tool` type defines, and drops MCP Description metadata. It never adds a
field, never fills in a protocol default, and never rewrites a value. The
result MUST validate against the revision's pinned MCP schema.

The specification repository owns the normative rules and a set of
conformance fixtures. The implementation lives in `@mcpdesc/core` and runs the
fixtures. There is one implementation; this repository contains no projection
code.

## Problem

Section 4.12 defines the Effective Protocol View: a projection from an MCP
Description document to another MCP Description document. Nothing defines the
step that tools such as mock servers, SDK generators, and catalog exporters
need: producing the native MCP value itself.

Fragments of that step are scattered. Sections 9.3 and 9.4 say that projection
to a `tools/list` Tool value omits `examples` and `interactionExamples`.
Section 17.5 covers components in views only. Implementations therefore decide
on their own which fields to keep, whether to resolve `$componentRef`, and
whether to materialize defaults such as `readOnlyHint: false`. Each of those
choices changes what a client receives.

MCP Description 0.8.0 also allowed values that no MCP `Tool` could carry, such
as extra annotation properties. Proposal 0027 closed those gaps. Native
projection makes the remaining guarantee explicit and testable: a valid
description projects to a schema-valid MCP value.

## Goals

- Define native projection of Tool declarations for each supported revision.
- Guarantee that every projected value validates against the pinned MCP schema
  of its revision.
- Provide conformance fixtures that any implementation can run.
- Keep one implementation, in core, with the specification as its contract.

## Non-goals

- Resources, Resource Templates, and Prompts. The same mechanics apply; they
  follow in a later proposal once Tool projection is implemented.
- Server capabilities, `initialize` results, and transports.
- Runtime behavior: pagination, caching, list-change notifications, or the
  JSON-RPC envelope.
- Materializing protocol defaults, repairing invalid values, or converting a
  value that a revision cannot carry.
- SDK-specific output. Optional SDK interoperability profiles may follow; they
  never redefine conformance.

## Background and primary references

- MCP `schema.ts` per revision, vendored in
  [`validation/mcp-schemas/`](../validation/mcp-schemas/) at
  `modelcontextprotocol/modelcontextprotocol@dae694f61a31f7a3ec2af3aff709e11f70f61e48`,
  defines the `Tool` type. Its fields per revision:

  | Field | 2024-11-05 | 2025-03-26 | 2025-06-18 | 2025-11-25 | 2026-07-28 |
  | --- | --- | --- | --- | --- | --- |
  | `name`, `description`, `inputSchema` | yes | yes | yes | yes | yes |
  | `annotations` | — | yes | yes | yes | yes |
  | `title`, `outputSchema`, `_meta` | — | — | yes | yes | yes |
  | `icons` | — | — | — | yes | yes |
  | `execution` | — | — | — | yes | — |

- The generated `schema.json` of each revision is the postcondition check
  (Proposal 0024, Section 7: it is evidence, generated from `schema.ts`).
- MCP Description Sections 4.12, 9, and 17.

## Proposed normative behavior

### 1. Definition

Native Tool projection `N_V(D, n)` takes a document `D`, an MCP revision `V`,
and a Tool name `n`, and produces one MCP `Tool` value or an error.

A conforming implementation MUST:

1. validate `D` and stop with `projection-source-invalid` if it has errors;
2. require `V` to occur in root `protocolVersions`, otherwise stop with
   `projection-revision-not-declared`;
3. select the Tool named `n` in the Effective Protocol View `P_V(D)`
   (Section 4.12); if there is none, stop with
   `projection-tool-not-applicable`;
4. resolve every Reference Object in `inputSchema` and `outputSchema`
   (Section 17);
5. build the value from the fields that both the declaration contains and the
   MCP `Tool` type of `V` defines, copying each value unchanged;
6. check the value against the `Tool` definition of the pinned `schema.json`
   of `V`; a failure is reported as `projection-postcondition-failed` and the
   value is not returned.

Step 5 is a filter, not a transformation. Validation (step 1) already rejects
fields that `V` does not define, so a valid declaration loses only MCP
Description fields.

### 2. Fields

| Declaration field | Result |
| --- | --- |
| MCP `Tool` fields defined by `V` | Copied unchanged |
| `inputSchema`, `outputSchema` | Copied after reference resolution; embedded keywords, including `x-*` and `x-mcp-header`, are kept |
| `annotations`, `_meta`, `icons`, `execution` | Copied unchanged when `V` defines them |
| `protocolVersions`, `examples`, `interactionExamples`, `tags`, `elicitations`, `deprecated`, `security`, `clientRequirements` | Omitted |
| Tool-level `x-*` specification extensions | Omitted |

`deprecated` has no MCP `Tool` field; it is omitted rather than moved to
`_meta` or `description`.

### 3. What projection never does

- It never adds a field that the declaration does not contain. An absent
  annotation hint stays absent; `execution.taskSupport` is not set to
  `"forbidden"`; no `$schema` is inserted into an embedded schema.
- It never copies a value into another field, for example `annotations.title`
  into `title`.
- It never rewrites a value, for example wrapping an array `outputSchema` in an
  object for a revision that requires an object root. Such a declaration is
  invalid for that revision (rule `mcp.tool.output-schema.object-root`), so
  step 1 fails.

### 4. Tool lists

`tools/list` projection for `V` is the sequence of `N_V(D, n)` for every Tool
in `P_V(D)`, in document order. An error for any Tool fails the whole list.

### 5. Diagnostics

Projection diagnostics use the diagnostic form of Proposal 0024, including the
`rule` property. New rules, owner `mcpdesc`:

| Rule | Codes |
| --- | --- |
| `mcpdesc.projection.source-valid` | `projection-source-invalid`, `projection-revision-not-declared` |
| `mcpdesc.projection.tool-applicable` | `projection-tool-not-applicable` |
| `mcpdesc.projection.native-schema` | `projection-postcondition-failed` |

A postcondition failure indicates a defect in the specification, the
validator, or the implementation. It is never repaired.

## Conformance fixtures

Projection fixtures live in `spec/<version>/projection-fixtures/`, one JSON
file per case:

```json
{
  "description": "Examples are dropped; both schemas are kept unchanged.",
  "document": "../fixtures/expected-valid/named-tool-examples.json",
  "revision": "2026-07-28",
  "tool": "weather",
  "expected": {
    "name": "weather",
    "inputSchema": {
      "type": "object",
      "properties": { "city": { "type": "string" } },
      "required": ["city"],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": { "temperature": { "type": "number" } },
      "required": ["temperature"],
      "additionalProperties": false
    }
  }
}
```

`document` is a path to a fixture or an inline document. A case has either
`expected`, the exact MCP `Tool` value, or `expectedError`, a diagnostic code.
Comparison is by canonical JSON (`scripts/canonical-json.mjs`), so key order
does not matter.

The fixtures cover at least: each revision boundary in the field table;
component references in both schemas; every omitted MCP Description field;
absent defaults staying absent; `execution` kept for 2025-11-25 only; an array
`outputSchema` for 2026-07-28; and each error code.

## Validation of the fixtures in this repository

This repository contains no projection code. It checks the fixtures with what
it already has:

- every `document` validates without errors with the candidate validator,
  except cases expecting `projection-source-invalid`;
- every `expected` value validates against `$defs/Tool` of the pinned
  `schema.json` of its revision;
- no `expected` value contains an MCP Description field from Section 2;
- every `tool` exists in `P_V(document)` unless the case expects
  `projection-tool-not-applicable`.

The fixtures are exported with the validator snapshot bundle.

## Implementation in core

`@mcpdesc/core` implements `N_V` and the list projection, and runs the
exported fixtures in its test suite. A draft, release candidate, or stable
release of this specification records the core version that passes its
projection fixtures; the release checklist in `GOVERNANCE.md` gains that item.
Until a core version passes, the release check reports projection as
unimplemented.

## Schema impact

None. Projection does not change the MCP Description schema.

## Examples

Declaration, scoped to MCP 2025-11-25 and 2026-07-28:

```json
{
  "name": "inspect",
  "title": "Inspect",
  "inputSchema": { "$componentRef": "#/components/schemas/InspectInput" },
  "annotations": { "readOnlyHint": true },
  "execution": { "taskSupport": "optional" },
  "tags": ["diagnostics"],
  "deprecated": true
}
```

Projection for 2025-11-25:

```json
{
  "name": "inspect",
  "title": "Inspect",
  "inputSchema": { "type": "object", "properties": { "target": { "type": "string" } } },
  "annotations": { "readOnlyHint": true },
  "execution": { "taskSupport": "optional" }
}
```

For 2026-07-28 the declaration is invalid, because `execution` is defined for
MCP 2025-11-25 only; the author splits it into two protocol-scoped variants.

## Compatibility

Additive. No document changes validity. Sections 9.3 and 9.4 already require
omitting examples; this proposal states the full rule. Implementations that
materialize defaults or keep MCP Description fields change their output.

## Migration

None for documents. Projection implementations align with Section 2 and run
the fixtures.

## Security and privacy considerations

Projection exposes only what the author declared for MCP. `security`,
`clientRequirements`, and examples stay out of the native value, so internal
authorization notes and example data do not leak into `tools/list`.
Annotations remain untrusted hints (Section 9.6).

## Alternatives considered

### Reference implementation in this repository

Rejected. Validation needs code here, because this repository validates its
own examples and fixtures while the draft changes. Projection does not: no
specification artifact needs projecting, and fixture correctness is checked
against MCP's own schemas. Two implementations would drift.

### Move deprecated into `_meta`

Rejected: it is a silent transformation, and `_meta` keys carry MCP metadata
the server chooses, not MCP Description structure.

### Materialize protocol defaults

Rejected: MCP distinguishes an absent hint from an explicit value, and clients
apply the defaults themselves.

## Open questions

1. Should 0.9.0 also cover Resources, Resource Templates, and Prompts, or
   leave them to a later proposal as proposed?
2. How should a core release that passes the fixtures be recorded: a
   field in `specification-status.json`, or the release notes only?

## Implementation and validation plan

- This repository: Section 4.14 "Native MCP Projection", the three rule
  records, `projection-fixtures/`, the fixture self-checks in `npm test`,
  export of the fixtures in the snapshot bundle, the governance release item,
  and the changelog.
- Core: `projectNativeTool` and `projectNativeTools`, fixture runner, and a
  release that passes them.

## Decision record

Implementation location: core, with fixtures and self-checks in this
repository; maintainer decision on issue #72, 2026-10-26.
