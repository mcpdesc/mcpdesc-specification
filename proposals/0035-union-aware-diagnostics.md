# Proposal 0035: Located, Union-Aware Diagnostics

- Status: Draft
- Author(s): @ObjectIsAdvantag, with AI assistance using Copilot SDK in VS Code
- Created: 2026-11-07
- Target version: 0.9.0, candidate for RC.3
- Related issues: [#115](https://github.com/mcpdesc/mcpdesc-specification/issues/115),
  [#112](https://github.com/mcpdesc/mcpdesc-specification/issues/112),
  Proposal 0034 ([#113](https://github.com/mcpdesc/mcpdesc-specification/pull/113))

## Summary

Make schema alternatives explicit wherever their selector can be expressed
portably with JSON Schema 2020-12 conditionals. This extends RC.2's
discriminator-driven transport design to every applicable `oneOf`, so schema
engines validate the selected alternative without validator-specific union
logic. Keep the remaining diagnostic handling generic: report locations in the
document as written, map findings through component references, and attribute
findings by the failing schema keyword. Result format `1.4.0` adds optional,
factual diagnostic detail.

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
3. **Unselected alternatives.** The 16 `oneOf` occurrences and the one
   `anyOf` remain outside the RC.2 discriminator rewrite. Engines can report
   failures from every `oneOf` alternative. Rules are attributed by instance
   location, so a rule the author did not exercise can be reported as `failed`.
4. **No shared contract.** Section 16.5 states that diagnostic behavior beyond
   rule, severity and location is not specified, and that nested unions are not
   normalized. Each producer reinvents handling for each union.

## Goals

- Every diagnostic location exists in the authored document.
- Findings come only from alternatives that apply, and only exercised rules
  fail.
- Schema conditionals select alternatives for every disjoint union that has a
  portable selector; validators do not need a hand-maintained union inventory.
- A schema check prevents unreviewed `oneOf`/`anyOf` uses and unsupported
  conditional guards from being added.
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

The principle: **the schema defines acceptance and alternative selection;
generic validation-result rules define explanation; presentation belongs to
tools.**

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

### 2. Schema selection and generic diagnostic reduction

The document schema MUST express each union whose alternatives have a
deterministic, portable selector as guarded `if`/`then` entries in `allOf`,
following Proposal 0034. The guards MUST select only the applicable
alternative, and the rewrite MUST preserve all acceptance constraints,
including object closure, required members, and specification extensions.

The schema MUST NOT add `oneOf` or `anyOf` outside the explicit allowlist in
the Schema impact section. Each allowlisted occurrence requires a documented
reason it cannot use a selector without changing its semantics. The CI check
MUST ensure that every conditional guard uses an approved selector form and
that every `oneOf`/`anyOf` occurrence is allowlisted. A schema change adding
an unreviewed union or guard fails validation.

Validators MUST handle conditional diagnostics generically:

1. A failure reported for an `if` keyword is control flow, not a document
   finding, and MUST NOT be emitted as a diagnostic.
2. Findings from the selected `then` branch MUST be retained. Findings from
   branches not selected by their guards MUST NOT be emitted or attributed to
   their rules.
3. An `anyOf` failure that remains on the allowlist MUST produce one finding
   at the union value. When its alternatives are simple `required` constraints,
   the finding SHOULD identify the permitted members that are absent.
4. A `not` failure over `required` members MUST produce one finding at the
   object naming the conflicting members.
5. Exact duplicate findings at the same instance location with the same rule,
   keyword and detail MUST be emitted once. Independent findings MUST be
   retained.

Selection is encoded in the schema and is not inferred by a "closest
alternative" heuristic. A selector typo does not authorize the validator to
guess which alternative the author intended.

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
the contract. Location, rule, severity, conditional reduction, and the
generic handling of remaining `anyOf`/`not` findings are inside it.

## Schema impact

### Conditional rewrites

All 16 current `oneOf` occurrences have a portable selector and MUST be
rewritten as guarded conditionals, with acceptance-equivalence tests for each
rewrite:

| Location | Policy |
| --- | --- |
| 8 discriminated unions already rewritten by Proposal 0034 | Keep guarded `if`/`then` selection. |
| 10 reference-or-inline unions (example maps, `schemaComponentValue`, and `requestedSchema`) | Select on the presence of `$componentRef`. Preserve inline closure and the reference object's required member. |
| `samplingMessageContent` and `samplingToolResultContent.content` | Select array versus object by JSON type. |
| `resourceContents` | Select on `blob`: when present, forbid `text`; otherwise require `text`. Preserve required `uri` and closure. |
| `elicitationFormProperty` | Select first by `type`, then by the applicable defining member (`enum`, `oneOf`, or `items`). The plain string case has neither `enum` nor `oneOf`; the array case requires `items`. |
| The nested `elicitationFormProperty` `items` alternatives | Select between `enum` and `anyOf` by member presence. |
| `jsonValue` | Select by JSON type (object, array, string, number, boolean, or null). This is a total union but can still be expressed without `oneOf`. |

Every guard MUST be checked for missing, conflicting, wrong-type and unknown
selector values. Guards for mutually exclusive alternatives MUST be disjoint;
their applicable cases MUST cover the original union's accepted instances.
Property sets, branch-local closure, `^x-` extension eligibility, and rule
pointers must remain equivalent. In particular, a naive
`if: {required: [text]}` rewrite of `resourceContents` would accept
`{"uri":"data://status"}`, which RC.2 rejects.

For discriminated object unions, the parent schema MUST declare the union of
member names accepted by its alternatives, set `additionalProperties` to
`false`, and preserve the existing specification-extension pattern. This
allows object closure at the parent to report a misspelled member even when no
discriminator alternative is selected. Alternative schemas retain their own
closure, so members allowed by another alternative remain invalid for the
selected alternative. If parent and branch constraints produce the same
finding, the generic duplicate-removal rule emits it once.

### Remaining allowlisted union

Keep `#/$defs/oauthFlows/anyOf` as the sole exception: its meaning is "at least
one flow" and valid objects may contain several alternatives simultaneously.
No alternative is selected, so conditionals would change its inclusive
semantics. The validator's generic `anyOf` handling reports one missing-
alternative finding when no flow is present.

The schema check MUST inspect schema applicator locations structurally, not
search text: embedded JSON Schemas and document properties can contain keywords
named `oneOf`, `anyOf`, or `if`. It MUST verify that `oauthFlows` is the only
allowlisted `anyOf`, that no `oneOf` remains, and that each `if` guard is one
of the approved discriminator, reference-presence, JSON-type, or defining-
member forms. The check does not require a published inventory file.

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

- **Documents:** acceptance is identical to RC.2. Diagnostic reduction does
  not change validity. Every schema rewrite requires equivalence tests, as for
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

Conditional selection and diagnostic reduction use only local data and add no
network resolution. Reduction removes only failures from unselected branches;
it never removes a failure from the selected branch or an independent
constraint. Equivalence tests ensure that rewrites cannot accept documents
that were rejected. Related locations expose only paths in the same document.

## Alternatives considered

- **Keep `oneOf` and infer the closest alternative in each validator.** Rejected:
  the heuristic is not deterministic, portable, or guaranteed to preserve
  errors from the intended alternative.
- **Use an external union inventory to drive every producer.** Rejected for
  this version: the canonical schema can express all but the inclusive
  `oauthFlows` constraint directly, so a second source of selection semantics
  would duplicate information and risk drift.
- **Leave all unions as `oneOf` and normalize errors in validators.** Rejected:
  schema-only tools would retain noisy diagnostics and every producer would
  need schema-specific branch selection.
- **Keep an unconditional `jsonValue` `oneOf` because it is total.** Rejected:
  its JSON-type alternatives are disjoint and can also be expressed as
  conditionals, avoiding an exception with no diagnostic benefit.
- **Custom schema keywords for selectors.** Rejected: strict engines reject
  unknown keywords. Standard conditional applicators remain portable.
- **AJV/OpenAPI `discriminator`.** Non-standard, covers only discriminators,
  and is ignored by other engines.
- **Closest-alternative heuristics.** Not deterministic and not portable across
  producers.
- **Component location as the primary location.** Rejected because validity
  depends on the context of use. The component location is kept as a related
  location.

## Open questions

- **Diagnostic conformance profile.** A later version could define one, with
  fixtures generated by systematic mutation. These would assert required and
  forbidden facts, not exact counts. Until then, the same mutation tests run as
  repository tests.
- **Schema generation.** Would generating the schema from a higher-level
  alternative definition reduce conditional-schema maintenance without
  compromising direct usability of the published JSON Schema?
- **`allowedMembers`.** Should it be required for closed objects, or stay
  optional to limit result size?
- **Editors.** How do downstream JSON/YAML editors behave for completion and
  hover under the additional conditionals?

## Implementation and validation plan

1. Implement on `feature/union-aware-diagnostics`, based on `main` (RC.2).
2. Rewrite all 16 `oneOf` occurrences as guarded conditionals; retain only the
   documented `oauthFlows` `anyOf`. Add a schema check to `npm test` that
   rejects new `oneOf` uses, new `anyOf` uses outside the allowlist, and
   conditional guards outside the approved forms.
3. Map paths for missing members and through reference provenance. Report
   related locations.
4. Implement generic conditional-branch reduction, duplicate removal and
   attribution by keyword location. Remove transport-specific summary
   suppression once the generic behavior covers it.
5. Add equivalence tests for every schema rewrite against RC.2, covering
   non-objects, closure, extensions, selector conflicts and nesting.
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
