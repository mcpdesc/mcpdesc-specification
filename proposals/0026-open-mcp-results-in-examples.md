# Proposal 0026: Open MCP Results in Examples

- Status: Draft
- Author(s): @ObjectIsAdvantag
- Created: 2026-10-25
- Target version: 0.9.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/72
- Depends on: [Proposal 0024](0024-validation-rule-identity-and-provenance.md)
  (rule identifiers, validation outcomes)
- AI assistance disclosure: Drafted with GitHub Copilot from maintainer
  decisions recorded on issue #72; requires normal maintainer and community
  review.

## Summary

Examples fail fast, and "incorrect" is measured against MCP's own types.

An example `result` carries an MCP result value. MCP defines `Result` as an open
type in every supported revision. For each revision that applies to an example,
the validator classifies every field of the carried result:

| Field | Outcome |
| --- | --- |
| Defined by the revision, valid | Accepted |
| Defined by the revision, missing when required or invalid | Error |
| Not defined by the revision, on an open type | Accepted, preserved without meaning, warning |
| Not defined by the revision, on a closed type | Error |

As a result, `resultType` in a result for MCP 2025-11-25 becomes a warning
instead of an error. A declaration whose examples span MCP 2026-07-28 and an
earlier revision no longer has to be split: it may keep one example map and
accept the warning, or split to clear it. Unknown field names that currently
pass silently produce the same warning. Extra fields in closed nested objects,
such as `completion` in a completion result, become errors.

## Problem

MCP Description 0.8.0 and the initial 0.9.0 draft treat example results
inconsistently with MCP and with themselves.

1. **Stricter than MCP for later-defined names.** In every supported revision,
   MCP's TypeScript `Result` declares `[key: string]: unknown`, and every result
   type carried by examples extends it. MCP Description still rejects:
   - `resultType` before MCP 2026-07-28 in Tool, Resource, Prompt, and
     completion examples (Sections 9.3, 10.4.4, 10.4.6, 11.3, and 11.4);
   - `ttlMs` and `cacheScope` before MCP 2026-07-28 in Resource examples
     (Section 10.4.4);
   - `structuredContent` before MCP 2025-06-18 in Tool examples.

2. **Forced duplication.** Because MCP 2026-07-28 requires `resultType` and
   earlier revisions reject it, a declaration covering both cannot carry an
   example. Section 10.4.4 requires such declarations to be split. The draft's
   own fixtures show the cost: `named-prompt-examples.json`,
   `named-completion-examples.json`, `named-resource-examples.json`, and
   `open-result-unknown-properties.json` repeat whole declarations that differ
   only by `resultType`.

3. **Silent acceptance of unknown names.** `acmeTrace` on any result, or `ttlMs`
   on a Tool result, passes without a diagnostic. Authors get no signal that the
   field has no MCP meaning, while a later-defined name such as `resultType` is
   rejected outright. The two cases are the same from MCP's point of view.

4. **Closed nested types not enforced.** `CompleteResult.completion` declares
   only `values`, `total`, and `hasMore`, with no index signature, in every
   revision. An extra field inside `completion` passes silently today. Content
   blocks, which are also closed, are already enforced by the document schema.

Observed behavior of the candidate validator on 2026-10-25:

| Example result | Revisions | Today |
| --- | --- | --- |
| Tool, `resultType: "complete"` | 2025-11-25 | Error `tool-example-result-version-mismatch` |
| Tool, `resultType: "complete"` | 2025-11-25 and 2026-07-28 | Error for 2025-11-25 |
| Tool, without `resultType` | 2025-11-25 and 2026-07-28 | Error for 2026-07-28 |
| Tool, `structuredContent` | 2025-03-26 | Error |
| Tool, `acmeTrace` or `ttlMs` | 2025-11-25 | No diagnostic |
| Resource, `ttlMs` | 2025-11-25 | Error `resource-example-cache-fields-version-mismatch` |
| Resource or Prompt, `acmeTrace` | 2025-11-25 | No diagnostic |
| Completion, `completion.acme` | 2025-11-25 | No diagnostic |
| Tool, unknown field in a text content block | 2025-11-25 | Error `schema-validation` |
| Interaction step response (sampling, elicitation, roots), `acmeTrace` or `_meta` | 2025-11-25 | Error `schema-validation` |

The last row is stricter than MCP: up to MCP 2025-11-25, these responses extend
the open `Result`, which also defines `_meta`.

A related inconsistency, result `_meta` rejected before MCP 2025-06-18 in
Resource, Prompt, and completion examples but accepted in Tool examples, was
corrected separately in the draft because MCP's `Result` defines `_meta` in
every supported revision.

## Goals

- Measure example correctness against the MCP types of each applicable
  revision, so errors always reflect a real violation.
- Accept and preserve fields that an open MCP type allows, without assigning
  them meaning, and make them visible through warnings.
- Let one example serve several revisions when its fields allow it.
- Keep validation results consistent between a document and its per-revision
  Effective Protocol Views.

## Non-goals

- Changing whether MCP Tool, Resource, Resource Template, or Prompt declarations
  accept unknown fields. Their MCP types are closed and stay closed.
- Changing Tool Annotations or Resource Annotations, which MCP Description
  currently keeps more permissive than MCP. That is a separate decision.
- Resolving the conflict between MCP's closed capability types and their
  "not a closed set" documentation. That is a separate decision.
- Delegating example checks to a linter or to per-organization severities. This
  was considered and rejected; see [Alternatives considered](#alternatives-considered).
- Native MCP projection, which omits examples and is covered by a separate
  proposal.

## Background and primary references

- MCP TypeScript schemas `schema/<revision>/schema.ts` at
  `modelcontextprotocol/modelcontextprotocol@dae694f61a31f7a3ec2af3aff709e11f70f61e48`,
  the authoritative definition of MCP types. A type is open only if it declares
  or inherits an index signature (Proposal 0024, Section 7).
- `spec/draft/validation/README.md`, section "Examples fail fast", which records
  the maintainer decision of 2026-10-25 and its rationale.
- `spec/draft/validation/mcp-revisions.md`, which summarizes result fields per
  revision.

Top-level fields of the result types carried by examples, besides `_meta`, which
`Result` defines in every revision:

| Result type | 2024-11-05, 2025-03-26 | 2025-06-18, 2025-11-25 | 2026-07-28 |
| --- | --- | --- | --- |
| `Result` | open | open | open; `resultType` required |
| `CallToolResult` | `content`, `isError` | adds `structuredContent` | same, plus `resultType` |
| `ReadResourceResult` | `contents` | `contents` | extends `CacheableResult`: adds required `ttlMs`, `cacheScope`, plus `resultType` |
| `GetPromptResult` | `description`, `messages` | same | same, plus `resultType` |
| `CompleteResult` | `completion` (closed: `values`, `total`, `hasMore`) | same | same, plus `resultType` |

Responses carried by Tool Interaction steps change openness in MCP 2026-07-28,
where they become input responses (`InputResponse`) embedded in the next request
instead of results:

| Response type | 2024-11-05 to 2025-11-25 | 2026-07-28 |
| --- | --- | --- |
| `CreateMessageResult` (sampling) | extends `Result`: open, `_meta` defined | extends `SamplingMessage` only: closed, `_meta` defined |
| `ElicitResult` (from 2025-06-18) | extends `Result`: open, `_meta` defined | closed, no `_meta` |
| `ListRootsResult` | extends `Result`: open, `_meta` defined | closed, no `_meta` |

Nested types such as `Root`, `SamplingMessage`, and content blocks are closed in
every revision.

Section 14 already states that `x-*` keys are not MCP Description
specification extensions inside carried MCP results; such keys follow the MCP
type, so they are classified like any other field name.

## Proposed normative behavior

### 1. Field classification

The rules below apply to every MCP value carried by an example whose type is
derived from MCP's `Result` in at least one supported revision: Tool Example
`result`, Tool Interaction Example terminal `result`, Tool Interaction step
`response` values for sampling, elicitation, and roots, Resource and Resource
Template Example `result`, Prompt Example `result`, and completion example
`result`, including values reached through component references. They apply to
each MCP revision in the containing declaration's effective protocol scope,
using that revision's type for the value.

For each revision:

1. A field that the revision defines for the result type, or for a nested type,
   MUST satisfy that type. A field the revision requires MUST be present.
2. A field that the revision does not define, on a type that is open in that
   revision, MUST be accepted and preserved. Implementations MUST NOT apply the
   meaning a different revision gives the same name. A validator MUST emit a
   warning for it (Section 3).
3. A field that the revision does not define, on a type that is closed in that
   revision, MUST be rejected.

JSON-RPC envelope fields and non-completed workflow fields remain errors under
the existing example-form rules of Sections 9.3, 10.4.4, 10.4.6, 11.3, and
11.4. They do not also produce the warning.

### 2. MCP Description value constraints

Examples are completed results. When present, regardless of revision:

- `resultType` MUST be `"complete"`;
- `ttlMs` MUST be a non-negative number;
- `cacheScope` MUST be `"public"` or `"private"`.

These constraints already exist in the document schema and are retained. They
keep a recognizable name from carrying a misleading value in any revision.

### 3. Diagnostic

The warning uses code `result-field-not-defined-by-version`, severity
`warning`, and rule `mcp.result.additional-properties.preserve`. Its path
identifies the field and its message names the revision, for example:

```text
tools[0].examples["paris"].result.resultType is not defined for MCP 2025-11-25;
it is preserved without meaning
```

A validator emits one warning per field and revision. A document with only such
warnings has outcome `valid-with-warnings` (Proposal 0024, Section 8).

### 4. Shared examples and splitting

The requirement that declarations whose examples span MCP 2026-07-28 and an
earlier revision MUST be split is removed. A declaration covering several
revisions MAY keep one example map. Authors MAY split it into protocol-scoped
variants with separate example maps to avoid the warnings. Rules requiring
same-name declarations to have disjoint scopes are unchanged.

### 5. Consistency with Effective Protocol Views

Effective Protocol View projection preserves example maps unchanged. Because
each warning is attributed to one revision, the warnings of this rule for a
document MUST equal the union of the warnings of this rule for its per-revision
Effective Protocol Views.

### 6. Revision tiers

This behavior applies to every supported revision, including the historical
revisions `2024-11-05` and `2025-03-26`. Correcting historical revisions is an
ordinary normative change in 0.9.0 (Proposal 0024, Section 4.1), and one rule
with one code path keeps behavior symmetric across revisions.

### 7. Specification text

- Sections 9.3, 11.3, 11.4, and 10.4.6: replace "earlier revisions MUST NOT
  contain `resultType`" with a reference to the classification rules.
- Section 10.4.4: replace "For earlier supported revisions it MUST NOT contain
  `resultType`, `ttlMs`, or `cacheScope`" and the split requirement with a
  reference to the classification rules.
- A new subsection, for example in Section 3 next to Section 3.5, defines the
  classification, value constraints, diagnostic, and projection consistency
  once for all example kinds.
- Section 16 lists the new warning.

## Schema impact

The 0.9.0 schema already accepts additional properties on example result
objects and enforces the value constraints in Section 2 regardless of revision.
Two changes:

- the `completion` object in completion example results becomes closed
  (`additionalProperties: false`), matching `CompleteResult` in every revision;
- Tool Interaction step responses for sampling, elicitation, and roots accept
  additional properties in the schema; the validator rejects them for MCP
  2026-07-28, where those types are closed, and applies the classification for
  earlier revisions.

## Examples

One example serving two revisions:

```yaml
tools:
  - name: get_weather
    protocolVersions: ["2025-11-25", "2026-07-28"]
    inputSchema:
      type: object
      properties:
        city: { type: string }
    examples:
      paris:
        input: { city: Paris }
        result:
          resultType: complete
          content:
            - type: text
              text: "Paris: 18 C"
```

Outcome: `valid-with-warnings`, with one warning:

```text
warning result-field-not-defined-by-version
tools[0].examples["paris"].result.resultType is not defined for MCP 2025-11-25;
it is preserved without meaning
```

The 2026-07-28 Effective Protocol View produces no warning. The 2025-11-25 view
produces the same warning.

Other cases, for a result in MCP 2025-11-25:

| Result content | Outcome |
| --- | --- |
| `acmeTrace: {id: a1}` | Warning; MCP's extension point for such data is `_meta` |
| `resultType: partial` | Error: value constraint |
| `isError: "no"` | Error: defined field with an invalid value |
| `completion: {values: [a], acme: 1}` | Error: `completion` is closed |
| `jsonrpc: "2.0"` | Error: JSON-RPC envelope, unchanged |

For an elicitation step response in a Tool scoped to MCP 2025-11-25 and
2026-07-28, `_meta` is accepted for 2025-11-25, where `ElicitResult` extends
`Result`, and is an error for 2026-07-28, where `ElicitResult` is closed and has
no `_meta`. An unknown field produces a warning for 2025-11-25 and an error for
2026-07-28.

## Compatibility

For documents:

- Documents rejected only because an example result carries a field its
  revision does not define, such as `resultType` before MCP 2026-07-28, become
  valid with warnings.
- Documents that are valid today and carry unknown fields in example results
  become valid with warnings. Tools that fail on warnings will now fail on them.
- Documents with extra fields inside a completion result's `completion` object
  become invalid. This is a breaking change, consistent with fail fast, because
  `completion` is closed in every MCP revision.
- Tool Interaction step responses for revisions up to MCP 2025-11-25 accept
  `_meta` and, with warnings, unknown fields. Responses for MCP 2026-07-28 keep
  rejecting unknown fields; `_meta` becomes accepted on sampling responses only,
  where `SamplingMessage` defines it.

For implementations:

- `@mcpdesc/validator` 0.9.0 selectors emit the new warning code and no longer
  emit the affected errors. Frozen 0.8.0 selectors are unchanged.
- The CLI, editor, and other consumers that display or count warnings will see
  new warnings; none of their contracts change.
- Effective Protocol View projection and merge already preserve example maps;
  their behavior is unchanged. Native MCP projection omits examples.
- Producers that capture live results, such as `mcpdesc-ts`, will see warnings
  for vendor fields in captured results.

## Migration

No migration is required for documents that remain valid. Authors MAY merge
protocol-scoped variants that were split only because of `resultType`, `ttlMs`,
or `cacheScope`. Authors with extra fields inside `completion` objects must move
them, for example to result `_meta`.

## Security and privacy considerations

Preserved fields carry no MCP meaning in revisions that do not define them. In
particular, `ttlMs` and `cacheScope` in an example for an earlier revision MUST
NOT influence caching, and Section 10.4.5 continues to apply. Warning messages
name fields and revisions but do not echo example values.

## Alternatives considered

### Reject fields that a later revision defines

This is today's behavior. It keeps examples for earlier revisions free of
later names, but is stricter than MCP, forces duplicated declarations, and
treats later-defined names differently from unknown names that MCP allows in the
same way.

### Suppress the warning when another applicable revision defines the field

This would avoid warnings on shared examples. It was rejected so that a
document's warnings stay equal to the union of its per-revision views' warnings,
and so that authors see every revision in which a field has no meaning.

### Delegate example consistency to a linter

Considered on 2026-10-25 and rejected. Experience with OpenAPI shows that
documents which validate while their examples do not lead to misleading
documentation that rarely gets fixed. Example correctness therefore stays part
of conformance. Linters may add style rules but do not relax it.

### Accept undefined fields silently

This matches MCP's acceptance but gives authors no signal that a field has no
meaning in a revision, which is the main source of misleading examples.

### Allow `protocolVersions` on individual examples

This would let authors scope examples without splitting declarations. It adds a
new scoping level to every example kind and is not needed once shared examples
are valid. It can be proposed separately if demand appears.

## Open questions

1. One shared warning code, as proposed, or one code per example kind, matching
   existing codes such as `tool-example-result-version-mismatch`?

## Implementation and validation plan

1. Specification: apply Section 7 in `spec/draft/sections/`, reassemble
   `spec/draft/mcp-description.md`, and add a draft changelog entry labeled as
   review-stage content.
2. Validator: derive per-revision defined fields for each carried result type
   from the pinned TypeScript schemas; replace the affected "not defined" errors
   with the warning; add the warning for unknown names; close `completion`;
   classify step responses per revision.
3. Schema: close the `completion` object in completion example results, and
   open step response objects (Schema impact).
4. Registry: give `mcp.result.additional-properties.preserve` the new diagnostic
   and fixtures, and remove the planned gaps from it and from
   `mcpdesc.example.result.revision-fidelity`.
5. Fixtures:
   - add an `expected-warning` fixture with one example serving MCP 2025-11-25
     and 2026-07-28;
   - move `open-result-unknown-properties.json` to `expected-warning`;
   - add an `expected-invalid` fixture for an extra field in `completion`;
   - update `revision-incompatible-tool-example.json`,
     `resource-example-result-semantics.json`,
     `invalid-prompt-example-semantics.json`, and
     `invalid-completion-example-semantics.json`;
   - register warning codes in `expectedWarningCodesByFixture`.
6. Tests: assert the projection consistency of Section 5 in
   `scripts/test-views.mjs`.
7. Downstream: core intake of the next 0.9.0 draft snapshot; check CLI, editor,
   and `mcpdesc-ts` against the new warnings.

## Decision record

- 2026-10-25: Example correctness stays part of conformance ("examples fail
  fast"); delegating it to a linter was considered and rejected.
- 2026-10-25: "Incorrect" is measured against MCP types. Fields allowed but not
  defined by a revision are accepted with a warning, including in examples
  shared with a revision that defines them.
- 2026-10-25: Result `_meta` in examples accepted in every supported revision,
  implemented separately as a correction.
- 2026-10-25: Accepted: closing `completion` (breaking) and keeping the value
  constraints of Section 2 revision-independent.
- 2026-10-25: Tool Interaction step responses are in scope, classified with
  each revision's TypeScript type, including their closure in MCP 2026-07-28.
