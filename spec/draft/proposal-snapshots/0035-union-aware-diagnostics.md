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
findings by the failing schema keyword. Result format `1.4.0` adds factual
diagnostic detail, required for findings derived from the document schema.

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
- for a missing member, MUST identify the closest enclosing object. In format
  `1.4.0`, `detail.member` MUST name the missing member. A `message`, when
  present, SHOULD name it; message wording remains defined by the validator;
- for an unexpected or invalid member name, MUST identify that member;
- for a finding in content reached through `$componentRef`, MUST identify the
  reference object at the use site. In format `1.4.0`, the diagnostic MUST
  give the location within the component as a related location.

The use site is the primary location, because component content is validated
in the context where it is used (Proposal 0009). A component used in several
places can therefore produce one finding per use site.

**Mapping through references.** The resolver records one provenance entry
`{referencePath, targetPath}` for each substituted reference, where
`targetPath` is the final component after following chained references. For a
finding at resolved path `P`:

1. Select the entry whose `referencePath` is the longest prefix of `P`
   (including `P` itself). If there is none, `P` is already a source path.
2. The primary path is `referencePath`: the object containing `$componentRef`.
3. The related location is `targetPath` followed by the remainder of `P` after
   `referencePath`, with `relation: "component-definition"`.

The related location applies the location rules above within the component.
For example, a missing member is reported at its enclosing object in the
component.

### 2. Schema selection and generic diagnostic reduction

The document schema MUST express each union whose alternatives have a
deterministic, portable selector as guarded conditionals, following
Proposal 0034. A conditional is either:

- an `allOf` of `if`/`then` entries with disjoint guards, as in RC.2; or
- an `if`/`then`/`else` choice. `else` can itself be a conditional, forming an
  else-if chain, for example to choose among three alternatives.

The guards MUST select only the applicable alternative, and the rewrite MUST
preserve all acceptance constraints, including object closure, required
members, and specification extensions.

Every `if` MUST use one of these approved guard forms:

| Form | Guard |
| --- | --- |
| Discriminator | `{"type": "object", "required": [m], "properties": {m: {"const": v}}}`, or `enum` instead of `const` |
| Reference presence | `{"type": "object", "required": ["$componentRef"]}` |
| JSON type | `{"type": t}`, where `t` is a JSON type name |
| Defining members | `{"type": "object", "required": [m, ...]}` |

A guard MAY combine the discriminator form with the defining-members form,
for a staged selection such as `elicitationFormProperty`.

The schema MUST NOT add `oneOf` or `anyOf` outside the explicit allowlist in
the Schema impact section. Each allowlisted occurrence requires a documented
reason it cannot use a selector without changing its semantics. The CI check
MUST ensure that every conditional guard uses an approved selector form and
that every `oneOf`/`anyOf` occurrence is allowlisted. A schema change adding
an unreviewed union or guard fails validation.

Validators MUST handle conditional diagnostics generically:

1. A failure reported for an `if` keyword (the conditional summary) MUST NOT
   be emitted when at least one other finding exists at or below the same
   instance location. Otherwise it MUST be emitted as kind `constraint` with
   `keyword: "if"`. This ensures that an invalid document always has at least
   one diagnostic, including in first-error execution.
2. Findings from the selected `then` or `else` branch MUST be retained.
   Guarded conditionals do not evaluate unselected branches, so validators MUST
   NOT reconstruct or infer findings for them.
3. An `anyOf` failure that remains on the allowlist MUST produce one finding of
   kind `missing-alternative` at the union value. Failures of its individual
   alternatives MUST NOT be emitted. When the alternatives are simple `required`
   constraints, `detail.members` MUST list the members they require.
4. A `not` failure over `required` members MUST produce one finding of kind
   `conflicting-members` at the object. `detail.members` lists the members
   required by the enclosing `if` guard followed by the members the `not`
   forbids. When the guard selects by discriminator, `detail.selector` gives the
   discriminator member and value.
5. Two findings are duplicates when they share `path`, `rule`, `severity`,
   `detail.kind` and `detail.member`, or `detail.members` for kinds without a
   single member. Only one of them MUST be emitted: the one whose failing
   keyword has the longest absolute schema pointer, so a selected branch is
   preferred over its parent. Independent findings MUST be retained.

Diagnostic order is not part of the contract. Producers SHOULD order findings
by document position.

Selection is encoded in the schema and is not inferred by a "closest
alternative" heuristic. A selector typo does not authorize the validator to
guess which alternative the author intended.

### 3. Rule attribution

A finding is attributed to the rule whose catalog schema `pointer` is the
longest prefix of the **absolute schema pointer** of the subschema containing
the failing keyword. This is the pointer within the document schema at which
that subschema is defined, for example `#/$defs/toolExample/required`. It is
not the engine's evaluation path, which is relative to a `$ref` target in some
engines and depends on the route taken through references. A definition shared
through `$ref` is therefore always attributed to the same rule, whatever the
use site.

Validators MUST NOT attribute a finding to the owner of an enclosing union by
choosing a "best-matching" alternative. Findings removed by section 2 MUST NOT
cause any rule to be reported as `failed`. This follows from
`#req-rule-results-executed`: a rule fails only on checks that apply to the
document.

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
| `jsonValue` | Replace with `{"type": ["object", "array", "string", "number", "boolean", "null"]}`. It accepts every JSON value, so it needs no conditional and no exception. Equivalence: the RC.2 alternatives (object of `jsonValue`, array of `jsonValue`, string, number, boolean, null) are disjoint by JSON type and their nested values are themselves unrestricted, so both forms accept exactly every JSON value; integers are numbers. AJV consumers running in `strict` mode must set `allowUnionTypes: true`; the repository's document validators already use `strict: false`. |

Every guard MUST be checked for missing, conflicting, wrong-type and unknown
selector values. Guards for mutually exclusive alternatives MUST be disjoint;
their applicable cases MUST cover the original union's accepted instances.
Property sets, branch-local closure, `^x-` extension eligibility, and rule
pointers must remain equivalent. In particular, a naive
`if: {required: [text]}` rewrite of `resourceContents` would accept
`{"uri":"data://status"}`, which RC.2 rejects.

For discriminated object unions, the parent schema MUST declare the union of
member names accepted by its alternatives, set `additionalProperties` to
`false`, and preserve the existing specification-extension pattern. The parent
keeps the discriminator's `enum`. It declares every other member as `true`, so
the value constraints stay in the branches and are not duplicated. This
allows object closure at the parent to report a misspelled member even when no
discriminator alternative is selected. Alternative schemas retain their own
closure, so members allowed by another alternative remain invalid for the
selected alternative. If parent and branch constraints produce the same
finding, the generic duplicate-removal rule keeps the branch finding.

### Remaining allowlisted union

Keep `#/$defs/oauthFlows/anyOf` as the sole exception: its meaning is "at least
one flow" and valid objects may contain several alternatives simultaneously.
No alternative is selected, so conditionals would change its inclusive
semantics. The validator's generic `anyOf` handling reports one missing-
alternative finding when no flow is present.

The schema check MUST inspect schema applicator locations structurally, not
search text: embedded JSON Schemas and document properties can contain keywords
named `oneOf`, `anyOf`, or `if`. It MUST verify that `oauthFlows` is the only
allowlisted `anyOf`, that no `oneOf` remains, and that each `if` guard has one
of the approved forms in section 2. The check does not require a published
inventory file.

### Validation result format `1.4.0`

Add the members `detail` and `relatedLocations` to `#/$defs/diagnostic`. Both
are optional in the result schema structure; the rules below say when they
are required:

```jsonc
{
  "detail": {
    "kind": "unexpected-member",       // extensible, see below
    "member": "arg",
    "members": ["text", "blob"],       // conflicting-members, missing-alternative
    "allowedValues": ["streamable-http", "stdio", "sse"],
    "allowedMembers": ["args", "command", "env", "protocolVersions", "security", "type"],
    "allowedMemberPatterns": ["^x-"],
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

Schema-derived findings use this mapping. A producer of format `1.4.0` MUST
include `detail` in every finding derived from the document schema, with the
required fields below.

| Failing keyword | `kind` | `path` | Required `detail` fields | Optional `detail` fields |
| --- | --- | --- | --- | --- |
| `required` | `missing-member` | Enclosing object | `member` | `allowedValues` from `properties[member].enum` or `const` of the same subschema |
| `additionalProperties: false` | `unexpected-member` | The member | `member`, `allowedMembers`, and `allowedMemberPatterns` when the subschema has `patternProperties` | `selector` |
| `propertyNames` | `invalid-member-name` | The member | `member` | `keyword`, `limit` |
| `enum`, `const` | `invalid-value` | The value | `allowedValues` | `selector`, when the value is a discriminator |
| `type` | `invalid-type` | The value | `expectedTypes` | — |
| `not` over `required` | `conflicting-members` | Enclosing object | `members` | `selector` |
| Allowlisted `anyOf` | `missing-alternative` | Union value | `members` | — |
| `if` (fallback only, see section 2) | `constraint` | The value | `keyword` | — |
| Any other keyword (`pattern`, `format`, `minLength`, `maxItems`, `uniqueItems`, ...) | `constraint` | The value | `keyword` | `limit`: the keyword's value, when it is a number or string |

Field rules:

- `allowedMembers` lists the names in the failing subschema's `properties`,
  sorted by Unicode code point. `allowedMemberPatterns` lists the keys of its
  `patternProperties` in schema order.
- `members` for `conflicting-members` lists the guard's required members, then
  the members forbidden by the `not`, each group in schema order. For
  `missing-alternative`, it lists the required members of each `anyOf`
  alternative in schema order.
- `allowedValues` lists `enum` values in schema order, or the single `const`
  value.
- `allowedValues` and `allowedMembers` describe the subschema that reported
  the finding. Once a branch is selected, they describe that branch, not the
  union.
- `selector` is present when the finding comes from a branch selected by a
  discriminator guard. It gives the discriminator member and the value found
  in the document.

Format rules:

- `kind` is open. Consumers MUST fall back to `message` for kinds they do not
  recognize, so adding a kind is a minor format change.
- `detail` is OPTIONAL for findings not derived from the document schema, such
  as semantic and protocol checks. Such findings MAY use the kinds above when
  they fit.
- The result schema enforces the required fields per `kind` with `if`/`then`
  entries.
- `detail` states facts, not remedies.
- `1.3.0` remains published and unchanged.

## Examples

Each example lists the complete set of expected findings, as `path`, `rule`,
then `detail`. Messages are omitted.

**Transport with `typ`** (discriminator missing, no branch selected):

```yaml
transports:
  - typ: stdio
    command: chess-rating
```

```jsonc
// 1. From the parent's required "type"
{ "path": ["transports", 0], "rule": "mcpdesc.transport.members",
  "detail": { "kind": "missing-member", "member": "type",
              "allowedValues": ["streamable-http", "stdio", "sse"] } }
// 2. From the parent's closure (union of the alternatives' members)
{ "path": ["transports", 0, "typ"], "rule": "mcpdesc.transport.members",
  "detail": { "kind": "unexpected-member", "member": "typ",
              "allowedMembers": ["args", "command", "env", "protocolVersions", "security", "type", "url"],
              "allowedMemberPatterns": ["^x-"] } }
```

There is no finding for `command`, because an alternative permits it.

**Stdio transport with `arg`** (branch selected). The parent and the stdio
branch both reject `arg`. Duplicate removal keeps the branch finding, so
`allowedMembers` lists only the members of the stdio branch:

```jsonc
{ "path": ["transports", 0, "arg"], "rule": "mcpdesc.transport.members",
  "detail": { "kind": "unexpected-member", "member": "arg",
              "allowedMembers": ["args", "command", "env", "protocolVersions", "security", "type"],
              "allowedMemberPatterns": ["^x-"],
              "selector": { "member": "type", "value": "stdio" } } }
```

The `if` summary is dropped because a specific finding exists at the same
location.

**Inline component example with `inpt`** (`result` present; reference presence: no
`$componentRef`, so the inline branch is selected):

```jsonc
{ "path": ["components", "toolExamples", "basic"], "rule": "mcpdesc.example.members",
  "detail": { "kind": "missing-member", "member": "input" } }
{ "path": ["components", "toolExamples", "basic", "inpt"], "rule": "mcpdesc.example.members",
  "detail": { "kind": "unexpected-member", "member": "inpt",
              "allowedMembers": ["input", "result"], "allowedMemberPatterns": ["^x-"] } }
```

Both findings are attributed through `#/$defs/toolExample`.
`mcpdesc.components.members` is not `failed`.

**Resource contents with `text` and `blob`** (the guard requires `blob`; the
`then` forbids `text`):

```jsonc
{ "path": [..., "contents", 0], "rule": "mcp.content.members",
  "detail": { "kind": "conflicting-members", "members": ["blob", "text"] } }
```

**Form-mode elicitation declaration with `url`** (discriminator guard on
`mode`; the `then` forbids `url`):

```jsonc
{ "path": ["tools", 0, "elicitations", 0], "rule": "mcpdesc.elicitation.members",
  "detail": { "kind": "conflicting-members", "members": ["mode", "url"],
              "selector": { "member": "mode", "value": "form" } } }
```

**OAuth flows object with no flow** (the allowlisted `anyOf`):

```jsonc
{ "path": ["securitySchemes", "oauth", "flows"], "rule": "mcpdesc.security-scheme.members",
  "detail": { "kind": "missing-alternative",
              "members": ["implicit", "password", "clientCredentials", "authorizationCode"] } }
```

**Referenced form property with `type: strin`.** The parent of
`elicitationFormProperty` constrains `type`, so no branch is selected and only
one finding remains (16 in RC.2):

```jsonc
{ "path": ["tools", 0, "elicitations", 0, "requestedSchema"],
  "rule": "mcp.elicitation.form-schema.members",
  "detail": { "kind": "invalid-value",
              "allowedValues": ["string", "number", "integer", "boolean", "array"] },
  "relatedLocations": [
    { "path": ["components", "schemas", "Form", "properties", "approval", "type"],
      "relation": "component-definition" } ] }
```

All rule IDs are the catalog owners found by longest-prefix match and were
confirmed against the RC.2 catalog.

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
  it accepts every JSON value, so the type list
  `["object", "array", "string", "number", "boolean", "null"]` is equivalent,
  needs neither a conditional nor an allowlist exception, and has no
  diagnostic benefit as a union.
- **Rewrite `jsonValue` as an if/else chain by JSON type.** Rejected: a chain
  adds guards that can never fail, for no diagnostic benefit.
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
- **Editors.** How do downstream JSON/YAML editors behave for completion and
  hover under the additional conditionals?

## Implementation and validation plan

1. Implement on `feature/union-aware-diagnostics`, based on `main` (RC.2).
2. Rewrite all 16 `oneOf` occurrences as guarded conditionals; retain only the
   documented `oauthFlows` `anyOf`. Add a schema check to `npm test` that
   rejects new `oneOf` uses, new `anyOf` uses outside the allowlist, and
   conditional guards outside the approved forms.
3. Fix locations in `scripts/validate-document.mjs`:
   - `required` findings report the object, not object plus missing member;
   - map paths through reference provenance (longest `referencePath` prefix)
     and add the `component-definition` related location.
4. Replace the special cases with the generic rules of section 2:
   - remove `selectedAlternative` and the fallback to the owner of an enclosing
     `oneOf`/`anyOf`;
   - replace `redundantConditionalSummary` with the generic `if` rule;
   - attribute by the absolute schema pointer of the failing keyword;
   - emit `detail` per the keyword mapping table, and remove duplicates by key,
     keeping the longest schema pointer.
5. Add equivalence tests for every schema rewrite against the
   `v0.9.0-rc.2` schema, covering non-objects, closure, extensions, selector
   conflicts and nesting.
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
