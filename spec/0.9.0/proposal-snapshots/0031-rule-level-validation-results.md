# Proposal 0031: Rule-Level Validation Results

- Status: Review
- Author(s): @ObjectIsAdvantag
- Created: 2026-10-29
- Target version: 0.9.0 (Community Working Draft 4)
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/93,
  https://github.com/mcpdesc/mcpdesc-specification/issues/95,
  https://github.com/mcpdesc/mcpdesc-specification/issues/96
- Depends on: [Proposal 0024](0024-validation-rule-identity-and-provenance.md)
  (rule identity; amends its Section 5),
  [Proposal 0030](0030-readable-and-complete-rule-records.md) (fixture
  outcomes in rule records), and
  [Proposal 0033](0033-complete-validation-catalog.md) (schema ownership and
  precise attribution)
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
3. Fixture citations become conformance tests of rule results, and a new
   validation result format describes diagnostics and rule results.

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
  Appendix B).

Yet Proposal 0024, Section 5, still requires a validator to report `code`
alongside `rule`.

**Only failures are visible.** Validators return errors and warnings.
Neither the candidate validator nor `@mcpdesc/validator` reports which rules
were checked and passed, so a consumer cannot tell "checked and passed" from
"never checked". The candidate validator skips all semantic checks when the
document schema fails. Draft 3 therefore accepts a `passes` fixture outcome
only in a fixture without errors, and even there a `passes` citation shows
only silence: it does not show that the rule examined the cited fragment.

**Attribution was coarse.** In the Draft 3 fixtures, 221 of 245
document-schema diagnostics (90%) were attributed to the catch-all rule
(Appendix A). [Proposal 0033](0033-complete-validation-catalog.md) resolves
this in Draft 4: every schema location has an owning rule.

## Goals

- Make rule identifiers, not codes, the interoperable contract between
  validators and the specification's fixtures.
- Let consumers see the complete set of checks: what passed, failed, warned,
  did not apply, was not evaluated, or was delegated.
- Prevent results that overstate conformance.
- Make fixture citations test what a rule actually checked.

## Non-goals

- Requiring per-declaration or per-path results; implementations decide that
  granularity.
- Standardizing diagnostic codes or messages across implementations.
- Changing document validity, rule meanings, or Section 4.14's projection
  failure identifiers.
- Defining rule results for operations other than document validation, such
  as projection, merge, or decoding (see Decision record).

## Background and primary references

- [Proposal 0024](0024-validation-rule-identity-and-provenance.md), Section 5:
  diagnostics carry a `rule` property next to `code`.
- [Proposal 0030](0030-readable-and-complete-rule-records.md), Section 9:
  fixture citations with checked outcomes replace `diagnostics` in records.
- [Proposal 0033](0033-complete-validation-catalog.md): `documentSchema`
  ownership, attribution of failed alternatives, and catalog coverage.
- MCP Description 0.9.0, Section 16.1, item 7 (`req-document-schema`), and
  the legacy validation scope (`req-legacy-validation-scope`).
- `spec/draft/validation/rules/*.yaml` at tag `v0.9.0-draft.2`: the last
  published records listing producer codes.

## Proposed normative behavior

The requirements below become Section 16.5, Validation Results. Their anchors
concern validator output, which document fixtures cannot show, so they are
listed as unchecked with reason `processing`; the repository's tests check
them for the candidate validator.

### 1. Diagnostics

Each diagnostic that a validator reports MUST identify the registered
validation rule it reports, its severity, and the location it concerns in the
document. When the finding depends on an MCP protocol version, the diagnostic
SHOULD identify that version. A diagnostic MAY carry a code and a message;
their values belong to the validator and are not defined by this
specification. This replaces the `code` requirement of Proposal 0024,
Section 5.

In the validation result format, a diagnostic has `rule`, `severity`, `path`,
and optionally `protocolVersions` (a list, because one finding can concern
several versions), `code`, and `message`.

### 2. Rule results

A validator MAY report rule results; a validator that claims conformance with
the specification's validation fixtures MUST. Rule results have one status per
rule and MCP protocol version declared by the document, or a single status for
a rule whose applicability is `independent`:

| Status | Meaning |
| --- | --- |
| `passed` | The check ran on the document for that version and found nothing |
| `failed` | The check ran and reported at least one error |
| `warning` | The check ran and reported warnings but no error |
| `not-applicable` | The rule does not apply to that version, or the document contains nothing it checks |
| `not-evaluated` | The check applies but did not run |
| `delegated` | Another operation performs the check, such as decoding or native projection; document validation does not |

A `not-evaluated` status MAY carry a `reason`: `earlier-stage-failed`,
`not-implemented`, or `operation` (another operation, such as projection or
merge, checks the requirement, as for preservation rules).

For example:

```json
[
  { "rule": "mcp.tool.output-schema.object-root", "protocolVersion": "2025-11-25", "status": "failed" },
  { "rule": "mcp.tool.output-schema.object-root", "protocolVersion": "2026-07-28", "status": "not-applicable" },
  { "rule": "mcpdesc.tags.references", "status": "passed" },
  { "rule": "mcp.tool.schema-keywords.preserve", "protocolVersion": "2025-11-25", "status": "not-evaluated", "reason": "operation" }
]
```

A rule result MUST come from the checks the validator executed. A validator
MUST NOT report `passed` for a rule that it did not check for that protocol
version, including when an earlier validation stage failed, when it does not
implement the check, or when the check is not applied to a legacy
compatibility revision. Document validity is still determined by errors
alone.

The status vocabulary prevents three misreadings:

- **Legacy protocol versions.** For MCP 2024-11-05 and 2025-03-26, validators
  apply structural and selected checks only and MUST NOT report complete MCP
  semantic conformance. A rule not checked for such a version is
  `not-applicable` or `not-evaluated`, never `passed`.
- **Preservation rules.** A rule such as `mcp.tool.schema-keywords.preserve`
  concerns what software does with a document later. A document validator
  reports it as `not-evaluated` with reason `operation`.
- **Known gaps.** A consumer can read a rule's recorded gaps next to its
  result, for example issue #95, where validation passes for MCP 2025-11-25
  but native projection fails.

### 3. Validation result format

A new, separately versioned JSON Schema describes a validation result:
`https://mcpdesc.org/schema/validation-result/1.0.0.json`, authored as
`validation/result.schema.json`. A result has `valid`, `diagnostics`, and
optional `results`. Producers may add properties to the result and to
diagnostics; rule results are closed. The schema is published with the rule
catalog: catalog manifests list it as `resultSchema` with its digest, and the
publication checks verify it with the rule schema. Its versions are recorded
in their own changelog, independent of the rule format.

### 4. Fixtures as conformance tests

Each fixture citation in a rule record becomes a test of rule results for the
cited fixture:

- `error` and `warning` require the cited rule to report that severity within
  the cited fragment and the document's results to show it.
- `passes` requires the rule to have run within the cited fragment, or on a
  subject containing it, for a protocol version it applies to, without
  reporting anything there, and the document's results to show `passed`.
- A new outcome, `not-applicable`, records a fragment where the rule does not
  run for any protocol version it applies to, for example a Tool scoped only
  to versions outside the rule's applicability.

`passes` and `not-applicable` are cited only in fixtures without errors,
because a failed stage can skip later checks. Preservation rules cite view or
merge cases rather than validation fixtures. Because a citation names a
specific rule, a validator that attributes a failure to another rule, or that
reports `passed` without running the check, does not conform.

To show where a rule ran, the candidate validator records an evaluation each
time a check examines a subject: JSON Schema validation records the instances
evaluated at every location a rule owns, and each semantic check records the
subject and versions it examined. This mechanism belongs to the candidate
validator; other validators may establish the same results differently.

### 5. Precise attribution

Failures are attributed to the most specific registered rule.
[Proposal 0033](0033-complete-validation-catalog.md) implements this for
Draft 4 through `documentSchema` ownership of every canonical schema location
and reports attribution coverage; the citations of Section 4 enforce it.

### 6. Producer code mappings

A producer that keeps diagnostic codes MAY publish a mapping from its codes to
rules, severities, and phases, and SHOULD test it against the fixtures:
every emitted code mapped, and every mapped code exercised or explained. The
specification does not define those codes.

## Schema impact

None for MCP Description documents. New validation result format `1.0.0`.
Rule format `1.2.0` (unreleased, Proposal 0033) adds the fixture outcome
`not-applicable` and the optional manifest property `resultSchema`.

## Compatibility

No document changes validity. Dropping the `code` requirement relaxes
Proposal 0024. Rule results and diagnostic `protocolVersions` are additive for
producers; existing diagnostics remain valid. Validators that claim fixture
conformance must add rule results. Rule-catalog consumers must accept the new
outcome value. The rule `mcpdesc.serialization.conforming` becomes
`enforcement: external`, since decoding checks it before document validation.

## Migration

- Producers: keep `rule` on every diagnostic, treat `code` as optional, add
  `protocolVersions` where findings depend on versions, and add rule results
  before claiming fixture conformance.
- Consumers: key on `rule` and rule results, not codes; read `not-evaluated`
  and `not-applicable` as "not confirmed", never as passed.

## Security and privacy considerations

Rule results are metadata about a document already being validated. They
introduce no network access or execution.

## Alternatives considered

- **Infer `passed` from the absence of diagnostics.** Rejected: skipped stages,
  unimplemented checks, and legacy versions would appear to pass.
- **Infer `passed` from the stage that ran.** Simpler, but a rule would pass
  for versions and fragments it never examined, and `passes` citations could
  not be verified.
- **Per-document statuses only.** Rejected: legacy versions and declarations
  shared by several versions need per-version statuses.
- **Rule results in the rule format.** Rejected: results are validator output
  and change at a different pace from the catalog format.
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

None.

## Implementation and validation plan

1. In Draft 4: Section 16.5, the validation result format and its changelog,
   rule format `1.2.0` additions, and the catalog publication of the result
   schema.
2. The candidate validator records evaluations, reports rule results, and adds
   `protocolVersions` to version-dependent diagnostics; its exported snapshot
   returns `results` from `validate()`.
3. `scripts/test-validation-rules.mjs` validates every fixture result against
   the result schema and checks every citation against rule results and
   evaluations, that `passed` always has an evaluation, that checks in skipped
   stages are never `passed`, and that diagnostic versions are within each
   rule's applicability.
4. `@mcpdesc/validator` and `@mcpdesc/core` adopt the result format at their
   intake of the draft that includes this proposal.

## Decision record

On 2026-10-29, the maintainer decided to remove diagnostic codes from 0.9.0
rule records and make fixture outcomes the navigable evidence (Draft 3). The
maintainer then agreed that `rule`, not `code`, is the interoperable
contract; that validators should be able to report passing as well as failing
rules; that finer granularity belongs to implementations; and that this work
targets Draft 4.

On 2026-10-31, the maintainer answered the open questions:

1. Rule results have a JSON Schema, separate from the rule format:
   `validation-result/1.0.0`.
2. `not-evaluated` carries an optional reason.
3. Proposal 0033 provides the specific rules that replace the catch-all.
4. Attribution coverage is reported, not thresholded; citations enforce it.
5. Rule results for delegated operations are deferred; document validation
   reports their rules as `delegated`.

The maintainer also chose evaluation records over stage-level inference,
per-version results, and Section 16 as the location of the normative text.
Acceptance pending.

## Appendix A: catch-all attribution in Draft 3

Measured on the Draft 3 fixtures: 245 document-schema diagnostics, 221
attributed to `mcpdesc.document.schema`. Proposal 0033 reduces this in Draft 4
to failures of the document root.

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
