# Proposal 0035: Located, Union-Aware Diagnostics

- Status: Draft
- Author(s): @ObjectIsAdvantag, with AI assistance using Copilot SDK in VS Code
- Created: 2026-11-07
- Target version: 0.9.0, candidate for RC.3
- Related issues: [#115](https://github.com/mcpdesc/mcpdesc-specification/issues/115),
  [#112](https://github.com/mcpdesc/mcpdesc-specification/issues/112),
  Proposal 0034 ([#113](https://github.com/mcpdesc/mcpdesc-specification/pull/113))

## Summary

Make diagnostics for every schema union point to locations that exist in the
document as written, and report only findings from the alternative that
applies. A published **union inventory** gives each union a selection policy.
A CI check keeps the inventory synchronized with the schema. Validators reduce
engine errors according to the inventory, map paths back through component
references, and attribute findings to rules by the schema location that failed.
Result format `1.4.0` adds optional, factual diagnostic detail.

Document acceptance does not change. The proposal builds on RC.2 and
Proposal 0034, and extends their principle to all unions.

## Problem

RC.2 removed findings from unrelated alternatives in discriminated objects.
Other unions, component references and absent members still produce wrong
locations, misleading rule results and long lists that hide the actionable
finding. Measured on `main` at 450df01 with the candidate validator:

| Mutation of an `expected-valid` fixture | Findings | Problem |
| --- | --- | --- |
| Transport `type` → `typ` | 1 | Path `/transports/0/type` does not exist; `typ` is not reported. |
| Tool example `input` → `inpt` | 6 | Findings from the reference alternative, plus a `oneOf` summary. |
| `components.toolExamples` entry `input` → `inpt` | 7 | `mcpdesc.components.members` is `failed`, although the author wrote an inline example. |
| Referenced `components.schemas.Form` property `type` → `strin` | 16 | No finding at the component. All paths are below a `requestedSchema` that contains only `$componentRef`. 11 findings come from `elicitationFormProperty` alternatives. |

The root causes are:

1. **Missing-member paths.** The missing member's name is appended to the path.
2. **Unmapped references.** Validation runs on the document after references
   are replaced. The resolver records provenance, but diagnostic paths do not
   use it.
3. **Unselected alternatives.** 16 `oneOf` and 1 `anyOf` remain. Engines report
   failures from every alternative. Rules are attributed by instance location,
   so a rule the author did not exercise can be reported as `failed`.
4. **No shared contract.** Section 16.5 states that diagnostic behavior beyond
   rule, severity and location is not specified, and that nested unions are not
   normalized. Each producer reinvents handling for each union.

## Goals

- Every diagnostic location exists in the authored document.
- Findings come only from alternatives that apply, and only exercised rules
  fail.
- One policy-driven mechanism covers all current and future unions, with no
  producer code specific to a union.
- Schema changes that add or change a union cannot be merged without a policy.
- Consumers can explain findings from structured facts, without parsing
  messages.
- Document acceptance is exactly preserved.

## Non-goals

- Changing accepted or rejected documents.
- Fix suggestions, typo detection or automatic corrections.
- Standardizing producer `code`, `message`, ordering or counts.
- A normative diagnostic conformance profile with diagnostic fixtures. This is
  deferred to a later version; see [Open questions](#open-questions).
- Changes to 0.8 and earlier formats, or to published snapshots.

## Background and primary references

- [JSON Schema 2020-12 Core, applicators](https://json-schema.org/draft/2020-12/json-schema-core#section-10.2)
  and [output formatting](https://json-schema.org/draft/2020-12/json-schema-core#section-12).
  The `keywordLocation` and `instanceLocation` pair is the model for attribution
  by schema location.
- Proposal 0034: discriminator-driven conditionals and producer omission of
  redundant conditional summaries.
- Proposal 0031: rule-level validation results and `#req-rule-results-executed`.
- Proposal 0009: reusable components, `$componentRef`, and validation of
  components in the context where they are used.
- MCP Description Sections 9, 16.5 and the validation result format.

## Proposed normative behavior

The principle: **the schema defines acceptance; the union inventory defines
explanation; presentation belongs to tools.**

### 1. Locations

Amend `#req-diagnostic-rule`. The location of a diagnostic:

- MUST identify a value or member name present in the document as written,
  before component references are replaced;
- for a missing member, MUST identify the closest enclosing object, and the
  diagnostic MUST name the missing member in its message and, in format
  `1.4.0`, in `detail.member`;
- for an unexpected or invalid member name, MUST identify that member;
- for a finding in content reached through `$componentRef`, MUST identify the
  reference object at the use site. In format `1.4.0`, the diagnostic SHOULD
  give the location within the component as a related location.

The use site is the primary location, because component content is validated
in the context where it is used (Proposal 0009). A component used in several
places can therefore produce one finding per use site.

### 2. Union selection and reduction

A **union** is any `oneOf`, `anyOf`, `not`, or discriminated `allOf`
containing `if`/`then` entries, in the document schema. Each union has exactly
one selection policy in the union inventory:

| Policy | Selection |
| --- | --- |
| `discriminator` | Value of a required member. Can be staged: a second selector applies within the selected alternative. |
| `reference-or-inline` | Presence of `$componentRef`. |
| `json-type` | JSON type of the value. |
| `defining-members` | Which defining members are present, with cardinality `exactly-one`, `at-most-one` or `at-least-one`. |
| `forbidden-members` | Members that MUST NOT appear together. |
| `total` | The union accepts every value it can receive; no finding can arise. |
| `ambiguous` | No deterministic selector. Requires a written justification in the inventory. |

For each union value in the validated document, a validator that claims
conformance with the validation fixtures MUST apply the following rules. Other
validators SHOULD.

1. **Selected alternative.** Report only findings from the selected
   alternatives and findings outside the union. Do not report the union
   summary.
2. **No alternative selected** (the selector is missing, has a disallowed
   value, or the wrong type):
   - report one finding on the selector at the union value, listing allowed
     values when they are enumerable;
   - also report members that no alternative permits, when the alternatives
     are closed;
   - report nothing else from the alternatives.
3. **Conflict.** For `exactly-one` or `at-most-one` with several defining
   members present, or
   for `forbidden-members`, report one finding at the object naming the
   conflicting members.
4. **At least one.** For `at-least-one` with no defining member, report one
   finding listing the defining members.
5. **Ambiguous.** Report one union-level finding at the value. Specific findings
   from individual alternatives are not reported.

Selection is deterministic and comes from the inventory. It is not a heuristic
such as "closest alternative".

### 3. Rule attribution

A finding is attributed to the rule whose schema `pointer` most specifically
contains the schema location of the failing keyword, not the rule for the
instance location. Findings removed by rule 2 MUST NOT cause any rule to be
reported as `failed`. This follows from `#req-rule-results-executed`: a rule
fails only on checks that apply to the document.

### 4. Section 16.5

Replace the paragraph describing producer summary omission and the two
sentences that disclaim diagnostic behavior with the behavior above. State
that raw engine error counts, schema paths, `code` and `message` remain outside
the contract. Location, rule, severity and union reduction are inside it.

## Schema impact

### Union inventory

Add `spec/draft/validation/unions.json` and `unions.schema.json`. Each entry
has:

- `pointer` to the union in the document schema;
- `policy`, with its selector (member, values, defining members, cardinality);
- `alternatives`: each alternative's pointer and selector value, and, for closed
  objects, its permitted members;
- `justification` for `ambiguous`.

The inventory is published with the validation snapshot. A repository check
walks the schema structurally, not by text search, because the schema contains
JSON Schema keywords as member names inside embedded schemas. The check fails
on any union with no entry, any entry with no union, or any selector that
disagrees with the schema.

Initial classification of the RC.2 unions:

| Location | Policy |
| --- | --- |
| 8 RC.2 discriminated unions (Proposal 0034) | `discriminator` |
| `toolExamples`, `promptExamples`, `resourceExamples`, `resourceTemplateExamples` values, inline and in `components` (8) | `reference-or-inline` |
| `schemaComponentValue`, `elicitationDeclaration.requestedSchema` | `reference-or-inline` |
| `samplingMessageContent`, `samplingToolResultContent.content` | `json-type` (object or array) |
| `jsonValue` | `total` |
| `resourceContents` | `defining-members`, `exactly-one` of `text`, `blob` |
| `oauthFlows` | `defining-members`, `at-least-one` of the four flows |
| `elicitationFormProperty` | `discriminator` on `type`, then, for `string`, `defining-members` `at-most-one` of `enum`, `oneOf` |
| `elicitationFormProperty` array `items` | `defining-members`, `exactly-one` of `enum`, `anyOf` |
| `elicitationDeclaration` mode branches (`not`) | `forbidden-members` (`url` with form, `requestedSchema` with URL) |

The `not` in the inline alternative of `schemaComponentValue` belongs to its
enclosing `reference-or-inline` union rather than being a separate entry.

### Acceptance-equivalent rewrites (SHOULD)

Where an equivalence proof and tests hold, express the selector in the schema
so that schema-only engines also follow it:

- **`reference-or-inline`:**
  `if: {type: object, required: [$componentRef]}`, `then` the reference object,
  `else` the inline alternative. This is equivalent because every inline
  alternative either has `additionalProperties: false` without a
  `$componentRef` property, or explicitly forbids `$componentRef`, and the
  reference object requires it. Non-objects fail both forms.
- **`json-type`:** `if: {type: array}`, `then` the array alternative, `else`
  the object alternative, provided the object alternative requires
  `type: object`.
- **`defining-members`, `discriminator` with stages:** rewrite only if the proof
  covers absence, conflict and closure. A naive guard such as
  `if: {required: [text]}` would accept `{"uri": "data://status"}`, which RC.2
  rejects.
- **`total`:** no rewrite needed.

Each rewrite keeps object closure, `^x-` extension eligibility and the
existing rule pointers. Rule pointers move with relocated alternatives without
changing rule IDs.

### Validation result format `1.4.0`

Add optional members to `#/$defs/diagnostic`:

```jsonc
{
  "detail": {
    "kind": "missing-member",       // extensible, see below
    "member": "type",
    "members": ["text", "blob"],    // conflicting-members, at-least-one
    "allowedValues": ["stdio", "streamable-http", "sse"],
    "allowedMembers": ["type", "command", "args", "env", "cwd"],
    "expectedTypes": ["object", "array"],
    "keyword": "minLength",
    "limit": 1,
    "selector": { "member": "type", "value": "stdio" }
  },
  "relatedLocations": [
    { "path": ["components", "schemas", "Form", "properties", "approval", "type"],
      "relation": "component-definition" }
  ]
}
```

- Initial `kind` values: `missing-member`, `unexpected-member`,
  `invalid-member-name`, `invalid-value`, `invalid-type`,
  `conflicting-members`, `missing-alternative`, `constraint`.
- `kind` is open. Consumers MUST fall back to `message` for kinds they do not
  recognize, so adding a kind is a minor format change.
- `detail` states facts, not remedies.
- `1.3.0` remains published and unchanged.

## Examples

**Transport with `typ`** (`discriminator`, nothing selected):

```yaml
transports:
  - typ: stdio
    command: chess-rating
```

Findings:

- `/transports/0`, `mcpdesc.transport.members`, missing member `type`, allowed
  `stdio`, `streamable-http`, `sse`;
- `/transports/0/typ`, unexpected member `typ`.

No finding for `command` (it is permitted by an alternative).

**Inline component example with `inpt`** (`reference-or-inline`, inline
selected). One missing-member `input` at `/components/toolExamples/basic`, and
one unexpected-member at `.../inpt`, both under `mcpdesc.example.members`.
`mcpdesc.components.members` is not `failed`.

**Resource contents with `text` and `blob`** (`exactly-one`). One
`conflicting-members` finding at the contents object naming `text` and `blob`.

**Referenced form property with `type: strin`.** Findings under
`mcp.elicitation.form-schema.members`:

- location `/tools/0/elicitations/0/requestedSchema` (the reference);
- invalid value `strin` for selector `type`, allowed `string`, `number`,
  `integer`, `boolean`, `array`;
- related location
  `/components/schemas/Form/properties/approval/type`.

## Compatibility

Classification: **potentially breaking for diagnostic consumers**.

- **Documents:** acceptance is identical to RC.2. The inventory and reduction do
  not change validity. Schema rewrites require equivalence tests, as for
  Proposal 0034.
- **Diagnostics:** paths, counts and rule attribution change for invalid
  documents. Consumers that rely on absent-member paths, raw counts, or rule
  failures from unselected alternatives must adapt.
- **Result format:** `1.4.0` is a compatible minor addition.
- **Rule IDs** do not change. Rule pointers move only with rewritten
  alternatives.

## Migration

No document rewrite is needed. Diagnostic consumers should:

- anchor findings with `path`. After this change it always resolves in the
  source, so text-search fallbacks become unnecessary;
- render from `detail.kind` when present, and otherwise from `message`;
- select the exact `0.9.0-rc.3` validator selector. Published RC.1 and RC.2
  remain unchanged; a new candidate receives its own identity through normal
  release preparation.

## Security and privacy considerations

The inventory and reduction use only local data and add no network resolution.
Reduction removes only findings from alternatives that do not apply; it never
removes a finding that independently explains the document's rejection.
Equivalence tests ensure that rewrites cannot accept documents that were
rejected. Related locations expose only paths in the same document.

## Alternatives considered

- **Revert to RC.1 `oneOf` unions and rely on producer reduction only.** This
  is possible, but schema-only engines would lose RC.2's transport improvement,
  and every third-party validator would depend on the inventory.
- **Mandatory six-pattern taxonomy with no other unions allowed.** Rejected.
  The downstream draft's patterns mix selection, prohibition (`not`) and
  member-name constraints. They also do not fit inclusive (`oauthFlows`) or
  staged (`elicitationFormProperty`) unions. Explicit policies with an
  `ambiguous` escape are more durable.
- **Custom schema keywords for selectors.** Rejected: strict engines reject
  unknown keywords. A separate inventory file keeps the schema portable.
- **AJV/OpenAPI `discriminator`.** Non-standard, covers only discriminators,
  and is ignored by other engines.
- **Closest-alternative heuristics.** Not deterministic and not portable across
  producers.
- **Component location as the primary location.** Rejected because validity
  depends on the context of use. The component location is kept as a related
  location.

## Open questions

- **Generated inventory.** Should a later version generate the schema and the
  inventory from one source definition, rather than checking a hand-maintained
  inventory against the schema?
- **Diagnostic conformance profile.** A later version could define one, with
  fixtures generated by systematic mutation. These would assert required and
  forbidden facts, not exact counts. Until then, the same mutation tests run as
  repository tests.
- **`allowedMembers`.** Should it be required for closed objects, or stay
  optional to limit result size?
- **Editors.** How do downstream JSON/YAML editors behave for completion and
  hover under the additional conditionals?

## Implementation and validation plan

1. Implement on `feature/union-aware-diagnostics`, based on `main` (RC.2).
2. Add `unions.json`, its schema, and the structural inventory check to
   `npm test`.
3. Map paths for missing members and through reference provenance. Report
   related locations.
4. Implement inventory-driven reduction and attribution by keyword location.
   Remove the transport-specific summary omission it supersedes.
5. Add the SHOULD rewrites one union at a time, each with an equivalence test
   against a reconstruction of RC.2, covering non-objects, closure, extensions
   and nesting.
6. Publish `result.schema.json` `1.4.0` with its changelog entry.
7. Add mutation tests over the `expected-valid` corpus:
   - rename and delete members;
   - break and remove selectors;
   - add sibling-alternative members, and combine exclusive members;
   - swap object and array.

   Assert that every path resolves in the source, that no finding comes from an
   unselected alternative, that no union summary accompanies a specific
   finding, and that only exercised rules fail.
8. Check AJV runtime and standalone parity, as for Proposal 0034.
9. Synchronize Section 16.5 prose, the assembled specification, rule
   pointers, fixtures, the changelog and the migration guide. Capture this
   proposal's reviewed revision under `spec/draft/proposal-snapshots/`.
   Release as RC.3 through the normal gates.

## Decision record

No acceptance decision yet. The maintainer authorized implementation for
evaluation in issue #115. The scope covers the required and recommended items
for 0.9.0; the diagnostic conformance profile is deferred. AI assistance:
Copilot SDK in VS Code evaluated the downstream proposal, reproduced the cases
against the repository validator, and drafted this proposal. Human maintainers
remain accountable for review and acceptance.
