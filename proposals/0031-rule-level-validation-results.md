# Proposal 0031: Rule-Level Validation Results

- Status: Draft
- Author(s): @ObjectIsAdvantag
- Created: 2026-10-29
- Target version: 0.9.0 (Community Working Draft 4)
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/93,
  https://github.com/mcpdesc/mcpdesc-specification/issues/95
- Depends on: [Proposal 0024](0024-validation-rule-identity-and-provenance.md)
  (rule identity; amends its Section 5) and
  [Proposal 0030](0030-readable-and-complete-rule-records.md) (fixture
  outcomes in rule records)
- AI assistance disclosure: Drafted with GitHub Copilot (Claude Opus 5.5) from
  a maintainer-led review of the Draft 3 working tree; requires normal
  maintainer and community review.

## Summary

Make validation results interoperable at the level of rules, not producer
diagnostic codes:

1. A diagnostic MUST identify the registered `rule` it reports. Its `code`
   becomes optional producer output, amending Proposal 0024, Section 5.
2. A validator can report a result for every rule and MCP protocol version:
   `passed`, `failed`, `warning`, `not-applicable`, `not-evaluated`, or
   `delegated`. Each result comes from a check that actually ran; silence is
   never reported as `passed`.
3. Failures are attributed to the most specific registered rule. The catch-all
   `mcpdesc.document.schema` covers only document-schema conformance that no
   more specific rule describes, and fixtures enforce precise attribution.

Finer results, such as per declaration or per path, remain each
implementation's choice, for example in a linter. Producers that keep
diagnostic codes may publish their own code-to-rule mappings.

## Problem

**Codes are producer output.** Through Draft 2, rule records listed the codes
of one producer, this repository's candidate validator, as if every validator,
`@mcpdesc/validator`, and `@mcpdesc/core` emitted them. Draft 3 removed them
(Proposal 0030) because the mapping had drifted:

- `mcpdesc.projection.native-schema` declared `projection-postcondition-failed`,
  but no fixture expected it and `@mcpdesc/core@0.13.0-rc.2` did not perform the
  postcondition check.
- Core's Effective Protocol View reports `projection-version-not-declared`,
  which native projection renames to `projection-revision-not-declared`, and
  core adds a `phase` (`source`, `result`, `operation`) that the specification
  does not define.
- Five of the candidate validator's 87 codes are exercised by no fixture (see
  the appendix).

Yet Proposal 0024, Section 5, still requires a validator to report `code`
alongside `rule`.

**Only failures are visible.** Validators return errors and warnings.
Neither the candidate validator nor `@mcpdesc/validator` reports which rules
were checked and passed, so a consumer cannot tell "checked and passed" from
"never checked". The candidate validator skips all semantic checks when the
document schema fails. Draft 3 therefore accepts a `passes` fixture outcome
only in a fixture without errors.

**Attribution is coarse.** In the Draft 3 fixtures, 221 of 245 document-schema
diagnostics (90%) are attributed to the catch-all rule, and 22 invalid
fixtures are explained only by it. These diagnostics mix three kinds:

- specific requirements without their own rule, such as non-empty
  collections, `x-*` extension placement, security-scheme shapes, example
  result shapes, and the required Tool `inputSchema`;
- requirements deliberately assigned to the catch-all, which cites
  `req-closed-objects` and `req-tool-input-schema-required`;
- consequences of another failure, such as 29 "must match exactly one schema
  in oneOf" messages that explain why other branches did not match.

## Goals

- Make rule identifiers, not codes, the interoperable contract between
  validators and the specification's fixtures.
- Let consumers see the complete set of checks: what passed, failed, warned,
  did not apply, was not evaluated, or was delegated.
- Prevent results that overstate conformance.
- Attribute each failure to the requirement it violates.

## Non-goals

- Requiring per-declaration or per-path results; implementations decide that
  granularity.
- Standardizing diagnostic codes or messages across implementations.
- Changing document validity, rule meanings, or Section 4.14's projection
  failure identifiers.

## Background and primary references

- [Proposal 0024](0024-validation-rule-identity-and-provenance.md), Section 5:
  diagnostics carry a `rule` property next to `code`.
- [Proposal 0030](0030-readable-and-complete-rule-records.md), Section 9:
  fixture citations with checked outcomes replace `diagnostics` in records.
- MCP Description 0.9.0, Section 16.1, item 7 (`req-document-schema`), and
  the legacy validation scope (`req-legacy-validation-scope`).
- `spec/draft/validation/rules/*.yaml` at tag `v0.9.0-draft.2`: the last
  published records listing producer codes.

## Proposed normative behavior

### 1. Diagnostics

A diagnostic reported by a validator MUST identify the registered rule it
reports in `rule`, and MUST include its `severity` and the location it
concerns. When the finding depends on an MCP protocol version, the diagnostic
SHOULD identify that version. A `message` is informative. A `code` MAY be
included; its values belong to the producer and are not defined by this
specification. This replaces the `code` requirement of Proposal 0024,
Section 5.

### 2. Rule results

A validator MAY report rule results; a validator that claims conformance with
the specification's fixtures MUST. A result has one status per rule and MCP
protocol version declared by the document, or a single status for a rule whose
applicability is `independent`:

| Status | Meaning |
| --- | --- |
| `passed` | The check ran on the document for that version and found nothing |
| `failed` | The check ran and reported at least one error |
| `warning` | The check ran and reported warnings but no error |
| `not-applicable` | The rule does not apply to that version, or the document contains nothing it checks |
| `not-evaluated` | The check applies but did not run, for example because an earlier stage failed or the validator does not implement it |
| `delegated` | Another operation performs the check, such as native projection; document validation does not |

For example:

```json
{
  "rule": "mcp.tool.output-schema.object-root",
  "results": { "2025-11-25": "failed", "2026-07-28": "not-applicable" }
}
```

A status MUST come from what the validator executed. `passed` MUST NOT be
inferred from applicability and the absence of diagnostics. Document
validity is still determined by errors alone.

The status vocabulary prevents three misreadings:

- **Legacy protocol versions.** For MCP 2024-11-05 and 2025-03-26, validators
  apply structural and selected checks only and MUST NOT report complete MCP
  semantic conformance. A rule not checked for such a version is
  `not-applicable` or `not-evaluated`, never `passed`.
- **Preservation rules.** A rule such as `mcp.tool.schema-keywords.preserve`
  concerns what software does with a document later. A document validator
  reports it as `not-evaluated`; an implementation of projection or merge may
  report its own result.
- **Known gaps.** A result MAY reference a recorded gap of its rule, for
  example issue #95, where validation passes for MCP 2025-11-25 but native
  projection fails.

### 3. Fixtures as conformance tests

Each fixture citation in a rule record becomes a test of rule results for
the cited fixture: `error` and `warning` require the cited rule to fail or
warn within the cited fragment; `passes` requires it to be `passed` there.
Because the citation names a specific rule, a validator that attributes the
failure to the catch-all instead does not conform.

### 4. Precise attribution

`mcpdesc.document.schema` covers document-schema conformance that no more
specific registered rule describes; it MUST NOT be used for a requirement that
has its own rule. A failure that only explains another failure, such as an
unmatched `oneOf` branch, is not reported as a separate rule failure. The
registry adds specific rules for the recurring requirements listed in the
appendix, and the specification's tests report attribution coverage: the
share of errors attributed to a specific rule.

### 5. Producer code mappings

A producer that keeps diagnostic codes MAY publish a mapping from its codes to
rules, severities, and phases, and SHOULD test it against the fixtures:
every emitted code mapped, and every mapped code exercised or explained. The
specification does not define those codes.

## Schema impact

None for MCP Description documents. Rule records are unchanged unless new
rules are added. An optional JSON Schema for rule results, if adopted, is a
separate versioned artifact.

## Compatibility

No document changes validity. Dropping the `code` requirement relaxes
Proposal 0024. Rule results are additive for producers; existing diagnostics
remain valid. Validators that claim fixture conformance must add rule results
and precise attribution.

## Migration

- Producers: keep `rule` on every diagnostic, treat `code` as optional, add
  rule results before claiming fixture conformance, and attribute schema
  failures to specific rules as they are registered.
- Consumers: key on `rule` and rule results, not codes; read `not-evaluated`
  and `not-applicable` as "not confirmed", never as passed.

## Security and privacy considerations

Rule results are metadata about a document already being validated. They
introduce no network access or execution.

## Alternatives considered

- **Infer `passed` from the absence of diagnostics.** Rejected: skipped stages,
  unimplemented checks, and legacy versions would appear to pass.
- **A generic "unknown" rule for unattributed failures.** Rejected: it is not a
  requirement, cannot cite fixtures, and would be filled differently by each
  validator.
- **Keep producer codes in rule records.** Rejected in Draft 3: the
  specification would version another project's API, and the records drifted.
- **Require per-path results.** Rejected: implementations and linters choose
  finer granularity.
- **Standardize one code per rule.** Rejected: producers report at different
  granularities, and a code adds nothing that `rule` does not.

## Open questions

1. Should the specification publish a JSON Schema for rule results, and where?
2. Should `not-evaluated` carry a reason, such as `earlier-stage-failed` or
   `not-implemented`?
3. Which specific rules replace the catch-all's current uses (see the
   appendix), and in which draft?
4. Should attribution coverage have a threshold, or be reported only?
5. How should a delegated operation, such as native projection, report its own
   rule results?

## Implementation and validation plan

1. Discuss this proposal with issues #93 and #95.
2. In Draft 4: amend Proposal 0024, Section 5; add rule results to the
   candidate validator by recording each check it executes; extend the
   registry test so every fixture citation checks rule results.
3. Register specific rules for the recurring catch-all areas and narrow
   `mcpdesc.document.schema`; report attribution coverage.
4. Coordinate adoption in `@mcpdesc/validator` and `@mcpdesc/core`, including
   the projection postcondition required by Draft 3's fixtures.

## Decision record

On 2026-10-29, the maintainer decided to remove diagnostic codes from 0.9.0
rule records and make fixture outcomes the navigable evidence (Draft 3). The
maintainer then agreed that `rule`, not `code`, is the interoperable
contract; that validators should be able to report passing as well as failing
rules; that finer granularity belongs to implementations; and that this work
targets Draft 4. Acceptance pending.

## Appendix A: catch-all attribution in Draft 3

Measured on the Draft 3 fixtures: 245 document-schema diagnostics, 221
attributed to `mcpdesc.document.schema`.

| Area | Diagnostics | Likely specific requirement |
| --- | --- | --- |
| Tool, Resource, Resource Template, and Prompt example results | 114 | Completed result and content shapes for each kind |
| Security schemes and requirements | 30 | Scheme shapes, names, and `x-*` placement |
| Elicitation declarations and form schemas | 26 | Declaration and form schema shapes |
| Tool fields and schemas | 20 | Required `inputSchema` and schema value shape |
| Root collections, tags, and other | 12 | Non-empty collections and `x-*` placement |
| Completion and interaction examples | 8 | Example shapes |
| Capabilities and client requirements | 7 | Extension identifier format |
| Components | 4 | Component map shapes |

By JSON Schema keyword: 64 "must NOT have additional properties", 58
"must have required property", 29 "must match exactly one schema in oneOf"
(consequences), 21 "must be equal to constant", and 49 others.

The 22 invalid fixtures explained only by the catch-all are:
`closed-protocol-enum`, `component-extension-boundaries`,
`elicitation-branch-mixing`, `empty-client-capability-requirements`,
`empty-ordinary-nested-collections`, `empty-ordinary-root-collections`,
`empty-tag-catalog-reference`, `invalid-security-scheme-name`,
`malformed-completion-examples`, `malformed-extension-identifier`,
`malformed-prompt-examples`, `malformed-resource-examples`,
`malformed-tool-examples`, `malformed-tool-interaction-examples`,
`missing-tool-input-schema`, `oauth-flow-missing-required-url`,
`object-level-extension-cannot-weaken-core`,
`object-level-extension-in-capability-map`,
`object-level-extension-in-domain-map`,
`object-level-extension-in-native-content`,
`object-level-extension-in-security-requirement`, and
`object-level-unknown-property`.

## Appendix B: removed code mapping (historical record)

The Draft 3 working tree listed 91 code entries across 63 rules before removal
on 2026-10-29. That mapping is identical to the published one in
`spec/draft/validation/rules/*.yaml` at tag `v0.9.0-draft.2`, which remains
the complete historical record. Representative entries:

| Code | Severity | Rules | Observation |
| --- | --- | --- | --- |
| `schema-validation` | error | 11 rules, including `mcp.tool-annotations.members`, `mcp.resource.size`, and `mcpdesc.document.schema` | One code, attributed by schema location |
| `field-not-supported-by-version` | error | `mcp.capabilities.tasks.revision-availability`, `mcp.declaration.field.revision-availability`, `mcp.tool.output-schema.revision-availability`, `mcp.tool.output-schema.object-root` | One code, four requirements |
| `result-field-not-defined-by-version` | warning | `mcp.result.additional-properties.preserve` | Single-rule code |
| `projection-source-invalid`, `projection-revision-not-declared` | error | `mcpdesc.projection.source-valid` | Core reports the second as `projection-version-not-declared` in Effective Protocol Views |
| `projection-declaration-not-applicable` | error | `mcpdesc.projection.declaration-applicable` | Tested by projection fixtures |
| `projection-postcondition-failed` | error | `mcpdesc.projection.native-schema` | No fixture until Draft 3; not implemented by `@mcpdesc/core@0.13.0-rc.2` |
| `tool-example-result-version-mismatch` | error | `mcpdesc.example.result.revision-fidelity` | Reachable, exercised by no fixture |
| `resource-example-result-version-mismatch` | error | `mcpdesc.example.result.revision-fidelity` | Exercised by no fixture |
| `duplicate-security-scope` | error | `mcpdesc.security.requirements` | Unreachable in document validation: the schema rejects duplicates first |
| `meta-key-invalid` | error | `mcp.meta.key-format` | Unreachable in document validation: the schema rejects malformed keys first |
| `experimental-reserved-extension-identifier` | warning | `mcpdesc.extensions.catalogue-maturity` | Unreachable: the pinned catalogue has no experimental identifiers |
