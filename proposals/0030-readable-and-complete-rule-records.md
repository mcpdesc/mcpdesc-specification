# Proposal 0030: Readable and Complete Rule Records

- Status: Draft
- Author(s): @ObjectIsAdvantag
- Created: 2026-10-28
- Target version: 0.9.0 (Community Working Draft 3)
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/89
- Depends on: [Proposal 0024](0024-validation-rule-identity-and-provenance.md)
  (rule records)
- AI assistance disclosure: Drafted with GitHub Copilot (Claude Opus 5.5) from
  a maintainer-led review and the investigation in
  `spec/draft/validation/rule-history-0.8.md`; requires normal maintainer and
  community review.

## Summary

Make every validation rule record readable at three levels, and complete across
MCP protocol revisions:

- a short `title` that names the rule;
- the existing `summary`, which states the precise requirement;
- a `description` that explains why the rule exists, what it means for
  authors, the usual mistake, and its fix;
- an `applicability` entry for every rule, with documented values.

Specification-version membership stays at the snapshot level. No per-rule
version field is added.

## Problem

**Readability.** A rule record has one prose field for readers, `summary`.
It is precise but long: the median is 116 characters, 31 of 63 summaries
exceed 120, and the longest is 269. It works as a requirement statement, not
as a heading, and it does not explain why the rule exists or how to fix a
document that breaks it. `notes`, present on 27 rules, is aimed at maintainers.
Catalogs such as mcpdesc.org therefore make up their own short labels.

**Applicability.** 19 of 63 records, all owned by MCP Description, omit
`applicability`, and Proposal 0024 does not define what the omission means. At
least 4 of these rules depend on the protocol revision, and the 3 delegated
projection rules are parameterized by it. Proposal 0024, Section 4, says that
rules owned by MCP Description form the ruleset `mcpdesc.core`, which suggests
they do not depend on the revision. The meaning of `applies` is also
undocumented: it means that a rule is checked for a revision, not that a field
is allowed there.

## Goals

- Give every rule a short title and a reader-oriented explanation from the
  specification itself, so catalogs and tools do not make up their own.
- Record the behavior of every rule for every supported MCP revision.
- Keep the precise requirement statement unchanged.
- Check the new fields in `scripts/test-validation-rules.mjs`.

## Non-goals

- Changing rule identifiers, summaries, diagnostics, or validator behavior.
- Per-rule specification-version ranges, lifecycle, or historical provenance
  (see `spec/draft/validation/rule-history-0.8.md`).
- Website presentation, such as navigation or grouping by surface.

## Background and primary references

- [Proposal 0024](0024-validation-rule-identity-and-provenance.md), Sections
  3 and 4: rule record fields, normative and informative fields, and revision
  applicability.
- `spec/draft/validation/rule-history-0.8.md`: the investigation behind this
  proposal, including the preliminary classification of the 19 records.

## Proposed behavior

### 1. Reader fields

| Field | Required | Role | Constraints |
| --- | --- | --- | --- |
| `title` | yes | Names the rule in lists, search results, and tools | Plain text, 1 to 60 characters, sentence case, no trailing period, unique in the registry |
| `summary` | yes (unchanged) | States the precise requirement in one sentence | Unchanged |
| `description` | yes | Explains, for document authors, why the rule exists, what it means in practice, the usual mistake, and its fix | Markdown, 1 to 3 short paragraphs, at most 800 characters; relative links resolve from the specification folder |
| `notes` | no (unchanged) | Remarks for maintainers, such as tests or implementation details | Unchanged |

A `description`:

- MUST NOT state a requirement that the specification does not state;
- SHOULD NOT repeat the rule's fixtures, which already provide examples;
- SHOULD name the fix in terms of the document an author edits.

`title` and `description` are informative, like `summary`. If they disagree
with the specification text, the specification prevails and the record is
corrected. Under `GOVERNANCE.md`, corrections to informative fields are
supporting material and do not require a proposal.

### 2. Complete applicability

`applicability` becomes required for every rule, with the same form as today:
every supported MCP revision maps to a value.

| Value | Meaning |
| --- | --- |
| `applies` | The rule is checked for documents, declarations, or values in that revision. It does not mean that a field is allowed: a rule that rejects a field before a revision applies to the earlier revisions. |
| `opaque` | The field or keyword may appear and is preserved, but the rule's MCP semantics are not checked. |
| `not-applicable` | The rule is not checked for that revision. |
| other value | Rule-specific behavior, which the rule's `description` MUST explain. |

A rule that performs the same check in every revision records `applies` for
every revision. A delegated rule records the revisions for which its
implementation must perform the check.

### 3. Rulesets

Proposal 0024, Section 4, is amended. The ruleset for a revision,
`mcpdesc.mcp.<revision>`, contains every rule whose applicability for that
revision is not `not-applicable`, whatever its owner. The ruleset
`mcpdesc.core` is removed, because ownership does not determine protocol
dependence.

## Schema impact

In `spec/draft/validation/rule.schema.json`:

- add `title` (string, 1 to 60 characters, no trailing period) and
  `description` (string, 1 to 800 characters), both required;
- make `applicability` required for every rule;
- describe the meaning of `applies`, `opaque`, and `not-applicable`.

`scripts/test-validation-rules.mjs` checks title uniqueness and that every
rule lists every supported revision; the condition that exempts `mcpdesc` rules
is removed.

## Examples

```yaml
- id: mcp.tool.input-schema.x-mcp-header
  title: Valid HTTP header mappings in Tool input
  summary: >-
    An x-mcp-header annotation is a non-empty HTTP field-name token on a
    boolean, integer, or string property reachable from the input schema root
    through properties only, and is unique case-insensitively within the Tool.
  description: >-
    MCP 2026-07-28 lets a Tool input property be sent as an HTTP header by
    annotating it with `x-mcp-header`. The property must be statically
    reachable from the schema root through `properties` alone and hold a
    string, integer, or boolean value. A common mistake is placing the
    annotation inside `allOf`, an array item, or a `$ref` target; move the
    property under the root `properties` instead. In earlier revisions the
    annotation is preserved but not checked.
  applicability:
    "2024-11-05": opaque
    "2025-03-26": opaque
    "2025-06-18": opaque
    "2025-11-25": opaque
    "2026-07-28": applies
```

```yaml
- id: mcp.tool-annotations.members
  title: Tool annotations contain only MCP hints
  summary: >-
    A Tool annotations object contains only title, readOnlyHint,
    destructiveHint, idempotentHint, and openWorldHint.
  description: >-
    MCP defines Tool annotations as a closed set of behavior hints. A common
    mistake is using Resource annotation fields such as `audience` or
    `priority` on a Tool, or adding vendor keys. Remove them; put
    server-defined metadata in the Tool's `_meta` where the revision defines
    it.
```

```yaml
- id: mcpdesc.legacy-revisions.validation-scope
  title: Limited validation for early MCP revisions
  summary: >-
    A document applying to MCP 2024-11-05 or 2025-03-26 is reported as
    receiving structural and selected checks only, not complete MCP semantic
    conformance.
  description: >-
    MCP Description validates the two earliest supported MCP revisions only
    structurally and with selected checks; complete revision-specific
    validation, such as for `_meta`, begins with MCP 2025-06-18. The warning
    tells you that a valid result is not a claim of complete MCP conformance
    for those revisions. Nothing needs fixing.
  applicability:
    "2024-11-05": applies
    "2025-03-26": applies
    "2025-06-18": not-applicable
    "2025-11-25": not-applicable
    "2026-07-28": not-applicable
```

## Compatibility

No document changes validity, and no diagnostic changes. The rule schema gains
required fields, so registry consumers that reject unknown fields must accept
`title` and `description`. `@mcpdesc/core` and `@mcpdesc/validator` do not
read the registry. mcpdesc.org can show the new fields once a snapshot that
contains them is published.

## Migration

Registry consumers:

- show `title` where they show a rule name, and `description` with the rule;
- treat `applicability` as present for every rule, and drop the "not recorded
  per revision" label;
- replace `mcpdesc.core` with the per-revision rulesets.

## Security and privacy considerations

None. Descriptions are documentation and are rendered as Markdown by catalogs,
which must render them safely, as for other specification text.

## Alternatives considered

- **Shorten `summary`.** Rejected: the summary is the precise requirement, and
  shortening it loses conditions that readers and implementers need.
- **Titles defined by the website only.** Rejected: every catalog and tool
  would invent different names, and they would drift from the records.
- **A new value for rules that do not depend on the revision**, such as
  `independent`. Not proposed: `applies` for every revision states the same
  thing without a new value. Open question 2.
- **Per-rule specification-version fields.** Rejected: snapshot membership
  already establishes them (`rule-history-0.8.md`, Options).

## Open questions

1. Is 60 characters the right maximum for `title`, and 800 for `description`?
2. Should a rule whose check does not depend on the revision be marked
   explicitly, rather than by `applies` for every revision?
3. Should the per-revision rulesets be renamed now that they include rules of
   every owner, for example `mcpdesc.revision.<revision>`?

## Implementation and validation plan

1. Proposal pull request (this document).
2. In Community Working Draft 3: rule schema and registry test changes; a
   `title` and `description` for every rule; `applicability` for the 19
   records, starting from the preliminary classification in
   `rule-history-0.8.md`; README update; changelog entry; snapshot of this
   proposal.
3. mcpdesc.org imports the fields from the Draft 3 snapshot.

## Decision record

Pending.
