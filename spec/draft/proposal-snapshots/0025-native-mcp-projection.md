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

Define how MCP Description primitive declarations become the MCP values a
server returns from `tools/list`, `resources/list`, `resources/templates/list`,
and `prompts/list` for one MCP revision.

Native projection selects the declaration that applies to the revision,
resolves local references, keeps exactly the fields that the revision's MCP
type defines, and drops MCP Description metadata. It never adds a field, never
fills in a protocol default, and never rewrites a value. The result MUST
validate against the revision's pinned MCP schema.

The specification repository owns the normative rules and a set of
conformance fixtures. The implementation lives in `@mcpdesc/core` and runs the
fixtures. There is one implementation; this repository contains no projection
code.

## Problem

Section 4.12 defines the Effective Protocol View: a projection from an MCP
Description document to another MCP Description document. Nothing defines the
step that tools such as mock servers, SDK generators, and catalog exporters
need: producing the native MCP values themselves.

Fragments of that step are scattered. Sections 9.3, 9.4, 10.4.5, 10.4.6, 11.3,
and 11.4 say that projection to MCP list values omits examples. Section 17.5
covers components in views only. Implementations therefore decide on their own
which fields to keep, whether to resolve `$componentRef`, and whether to
materialize defaults such as `readOnlyHint: false`. Each of those choices
changes what a client receives.

MCP Description 0.8.0 also allowed values that no MCP type could carry, such
as extra annotation properties. Proposal 0027 closed those gaps. Native
projection makes the remaining guarantee explicit and testable: a valid
description projects to schema-valid MCP values.

## Goals

- Define native projection of Tools, Resources, Resource Templates, and
  Prompts for each supported revision.
- Guarantee that every projected value validates against the pinned MCP schema
  of its revision.
- Provide conformance fixtures that any implementation can run.
- Keep one implementation, in core, with the specification as its contract.

## Non-goals

- Server capabilities, the `initialize` result, and transports.
- Runtime behavior: pagination, caching, list-change notifications, or the
  JSON-RPC envelope.
- Materializing protocol defaults, repairing invalid values, or converting a
  value that a revision cannot carry.
- SDK-specific output. Optional SDK interoperability profiles may follow; they
  never redefine conformance.

## Background and primary references

MCP `schema.ts` per revision, vendored in
[`validation/mcp-schemas/`](../validation/mcp-schemas/) at
`modelcontextprotocol/modelcontextprotocol@dae694f61a31f7a3ec2af3aff709e11f70f61e48`,
defines the four types. Their fields per revision:

| Type | Field | 2024-11-05 | 2025-03-26 | 2025-06-18 | 2025-11-25 | 2026-07-28 |
| --- | --- | --- | --- | --- | --- | --- |
| `Tool` | `name`, `description`, `inputSchema` | yes | yes | yes | yes | yes |
| | `annotations` | — | yes | yes | yes | yes |
| | `title`, `outputSchema`, `_meta` | — | — | yes | yes | yes |
| | `icons` | — | — | — | yes | yes |
| | `execution` | — | — | — | yes | — |
| `Resource` | `uri`, `name`, `description`, `mimeType`, `size`, `annotations` | yes | yes | yes | yes | yes |
| | `title`, `_meta` | — | — | yes | yes | yes |
| | `icons` | — | — | — | yes | yes |
| `ResourceTemplate` | `uriTemplate`, `name`, `description`, `mimeType`, `annotations` | yes | yes | yes | yes | yes |
| | `title`, `_meta` | — | — | yes | yes | yes |
| | `icons` | — | — | — | yes | yes |
| `Prompt` | `name`, `description`, `arguments` | yes | yes | yes | yes | yes |
| | `title`, `_meta` | — | — | yes | yes | yes |
| | `icons` | — | — | — | yes | yes |
| `PromptArgument` | `name`, `description`, `required` | yes | yes | yes | yes | yes |
| | `title` | — | — | yes | yes | yes |

In MCP 2024-11-05, Resource and Resource Template `annotations` come from the
`Annotated` interface. Every MCP field above has a matching MCP Description
field, so projection only removes fields.

The generated `schema.json` of each revision is the postcondition check
(Proposal 0024, Section 7: it is evidence, generated from `schema.ts`). It
places definitions under `definitions` up to MCP 2025-06-18 and under `$defs`
from MCP 2025-11-25.

## Proposed normative behavior

### 1. Definition

Native projection `N_V(D, k, i)` takes a document `D`, an MCP revision `V`, a
primitive kind `k` (Tool, Resource, Resource Template, or Prompt), and an
identifier `i`, and produces one MCP value or an error. The identifier is the
one that Sections 9.5, 10.5, and 11.1 require to be unique per revision: the
Tool `name`, the Resource `uri`, the Resource Template `uriTemplate`, or the
Prompt `name`.

A conforming implementation MUST:

1. validate `D` and stop with `projection-source-invalid` if it has errors;
2. require `V` to occur in root `protocolVersions`, otherwise stop with
   `projection-revision-not-declared`;
3. select the declaration of kind `k` with identifier `i` in the Effective
   Protocol View `P_V(D)` (Section 4.12); if there is none, stop with
   `projection-declaration-not-applicable`;
4. resolve every Reference Object that the projected value contains (Tool
   `inputSchema` and `outputSchema`; Section 17);
5. build the value from the fields that both the declaration contains and the
   MCP type of `k` in `V` defines, copying each value unchanged; Prompt
   `arguments` entries keep the fields that `PromptArgument` defines;
6. check the value against the definition of that type in the pinned
   `schema.json` of `V`; a failure is reported as
   `projection-postcondition-failed` and the value is not returned.

Step 5 is a filter, not a transformation. Validation (step 1) already rejects
fields that `V` does not define, so a valid declaration loses only MCP
Description fields.

### 2. Fields

| Declaration field | Result |
| --- | --- |
| MCP fields that `V` defines for the type (Background table) | Copied unchanged |
| Tool `inputSchema`, `outputSchema` | Copied after reference resolution; embedded keywords, including `x-*` and `x-mcp-header`, are kept |
| `annotations`, `_meta`, `icons`, Tool `execution` | Copied unchanged when `V` defines them |
| `protocolVersions`, `examples`, `interactionExamples`, `completionExamples`, `tags`, `elicitations`, `deprecated`, `security`, `clientRequirements` | Omitted |
| Declaration-level `x-*` specification extensions | Omitted |

`deprecated` has no field in any of the four MCP types; it is omitted rather
than moved to `_meta` or `description`.

### 3. What projection never does

- It never adds a field that the declaration does not contain. An absent
  annotation hint stays absent; `execution.taskSupport` is not set to
  `"forbidden"`; no `$schema` is inserted into an embedded schema; a Prompt
  argument without `required` stays without it.
- It never copies a value into another field, for example `annotations.title`
  into `title`.
- It never rewrites a value, for example wrapping an array `outputSchema` in an
  object for a revision that requires an object root. Such a declaration is
  invalid for that revision (rule `mcp.tool.output-schema.object-root`), so
  step 1 fails.

### 4. Lists

The list projection of kind `k` for `V` is the sequence of `N_V(D, k, i)` for
every declaration of kind `k` in `P_V(D)`, in document order. An error for any
declaration fails the whole list. The four lists correspond to `tools/list`,
`resources/list`, `resources/templates/list`, and `prompts/list`.

### 5. Diagnostics

Projection diagnostics use the diagnostic form of Proposal 0024, including the
`rule` property. New rules, owner `mcpdesc`:

| Rule | Codes |
| --- | --- |
| `mcpdesc.projection.source-valid` | `projection-source-invalid`, `projection-revision-not-declared` |
| `mcpdesc.projection.declaration-applicable` | `projection-declaration-not-applicable` |
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
  "kind": "tool",
  "identifier": "weather",
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

`document` is a path to a fixture or an inline document. `kind` is `tool`,
`resource`, `resourceTemplate`, or `prompt`. A case has either `expected`, the
exact MCP value, or `expectedError`, a diagnostic code. A list case omits
`identifier` and has an `expected` array. Comparison is by canonical JSON
(`scripts/canonical-json.mjs`), so key order does not matter.

The fixtures cover at least, for each kind: each revision boundary in the
Background table; every omitted MCP Description field; absent defaults staying
absent; one list case; and each error code. They also cover Tool component
references in both schemas, `execution` kept for MCP 2025-11-25 only, and an
array `outputSchema` for MCP 2026-07-28.

## Validation of the fixtures in this repository

This repository contains no projection code. It checks the fixtures with what
it already has:

- every `document` validates without errors with the candidate validator,
  except cases expecting `projection-source-invalid`;
- every `expected` value validates against the definition of its type in the
  pinned `schema.json` of its revision;
- no `expected` value contains an MCP Description field from Section 2;
- every `identifier` exists in `P_V(document)` for its kind, unless the case
  expects `projection-declaration-not-applicable`.

The fixtures are exported with the validator snapshot bundle.

## Implementation in core

`@mcpdesc/core` implements `N_V` and the list projections, and runs the
exported fixtures in its test suite. The release notes of each draft, release
candidate, or stable release of this specification name the core version that
passes its projection fixtures, or state that none does yet.

## Schema impact

None. Projection does not change the MCP Description schema.

## Examples

Tool declaration, scoped to MCP 2025-11-25:

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

For 2026-07-28 the same declaration is invalid, because `execution` is defined
for MCP 2025-11-25 only; the author splits it into two protocol-scoped
variants.

Prompt declaration for MCP 2025-06-18:

```json
{
  "name": "summarize",
  "title": "Summarize",
  "arguments": [{ "name": "topic", "required": true }],
  "examples": { "basic": { "arguments": { "topic": "MCP" }, "result": { "messages": [] } } },
  "tags": ["writing"]
}
```

Projection:

```json
{
  "name": "summarize",
  "title": "Summarize",
  "arguments": [{ "name": "topic", "required": true }]
}
```

## Compatibility

Additive. No document changes validity. Sections 9.3, 9.4, 10.4.5, 10.4.6,
11.3, and 11.4 already require omitting examples; this proposal states the full
rule. Implementations that materialize defaults or keep MCP Description fields
change their output.

## Migration

None for documents. Projection implementations align with Section 2 and run
the fixtures.

## Security and privacy considerations

Projection exposes only what the author declared for MCP. `security`,
`clientRequirements`, Elicitation Declarations, and examples stay out of the
native values, so internal authorization notes and example data do not leak
into list results. Annotations remain untrusted hints (Sections 9.6 and 10.3).

## Alternatives considered

### Reference implementation in this repository

Rejected. Validation needs code here, because this repository validates its
own examples and fixtures while the draft changes. Projection does not: no
specification artifact needs projecting, and fixture correctness is checked
against MCP's own schemas. Two implementations would drift.

### Tools only

Rejected. The other three types use the same mechanics, the same field
filter, and the same postcondition, and validation already covers their
revision boundaries. Projecting only Tools would leave consumers to invent the
rest.

### Move deprecated into `_meta`

Rejected: it is a silent transformation, and `_meta` keys carry MCP metadata
the server chooses, not MCP Description structure.

### Materialize protocol defaults

Rejected: MCP distinguishes an absent hint from an explicit value, and clients
apply the defaults themselves.

## Open questions

None.

## Implementation and validation plan

- This repository: Section 4.14 "Native MCP Projection", the three rule
  records, `projection-fixtures/`, the fixture self-checks in `npm test`,
  export of the fixtures in the snapshot bundle, the release-notes item, and
  the changelog.
- Core: native projection of the four kinds and their lists, a fixture runner,
  and a release that passes the fixtures.

## Decision record

Implementation location: core, with fixtures and self-checks in this
repository; maintainer decision on issue #72, 2026-10-26.
Scope: Tools, Resources, Resource Templates, and Prompts; maintainer decision
on issue #72, 2026-10-26.
Core version passing the fixtures: recorded in release notes only; maintainer
decision on issue #72, 2026-10-26.
