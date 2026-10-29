# Proposal 0031: Producer-Owned Diagnostic Code Mappings

- Status: Draft
- Author(s): @ObjectIsAdvantag
- Created: 2026-10-29
- Target version: after 0.9.0 (not part of the 0.9.0 drafts)
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/93
- Depends on: [Proposal 0024](0024-validation-rule-identity-and-provenance.md)
  (rule identity) and
  [Proposal 0030](0030-readable-and-complete-rule-records.md) (fixture
  outcomes in rule records)
- AI assistance disclosure: Drafted with GitHub Copilot (Claude Opus 5.5) from
  a maintainer-led review of the Draft 3 working tree; requires normal
  maintainer and community review.

## Summary

Let each diagnostic producer, such as `@mcpdesc/validator` or
`@mcpdesc/core`, publish and test its own mapping from the diagnostic codes it
emits to the specification's permanent rule identifiers, severities, phases,
and fixture evidence. The specification's rule catalog identifies
requirements and their checked fixture outcomes; it does not list any
producer's codes.

This proposal records the gap left by removing `diagnostics` from rule
records in Draft 3 and frames the design questions. It proposes no normative
change for 0.9.0.

## Problem

Through Draft 2, each rule record listed `diagnostics`: the codes and
severities that this repository's candidate validator emitted for the rule.
Draft 3 removes the field (Proposal 0030) because the mapping could not be
traced reliably from requirement to producer output:

- **A specification cannot guarantee producer output.** The records described
  one producer, the candidate validator, yet read as a contract for every
  validator, `@mcpdesc/validator`, and `@mcpdesc/core`.
- **Declared outcomes could be unimplemented.** `mcpdesc.projection.native-schema`
  declared `projection-postcondition-failed`, but no fixture expected it and
  `@mcpdesc/core@0.13.0-rc.2` does not perform the projection postcondition
  check.
- **Producers already differ.** Core's Effective Protocol View reports
  `projection-version-not-declared`, and native projection renames it to
  `projection-revision-not-declared`. Core adds a `phase` (`source`,
  `result`, `operation`) that the specification does not define.
- **Coverage was invisible.** Five of the candidate validator's 87 codes are
  exercised by no fixture (see the appendix). Some are reachable but untested;
  others are unreachable through document validation.

Users still need stable codes: CI filters, suppressions, editor quick fixes,
and translations key on them. A rule identifier names the requirement; it does
not replace a producer's output contract.

## Goals

- Give consumers a machine-readable, versioned mapping from each producer's
  codes to rule identifiers, severities, and, where applicable, phases.
- Make every mapping testable against the specification's fixtures, so drift
  between producer output and rules is detected.
- Keep producer codes, package versions, and API guarantees out of the
  specification's rule records.

## Non-goals

- Standardizing one set of diagnostic codes for every implementation.
- Changing rule identifiers, rule meanings, fixture outcomes, or Section 4.14's
  projection failure identifiers.
- Adding diagnostic codes back to rule records.

## Background and primary references

- [Proposal 0024](0024-validation-rule-identity-and-provenance.md), Section 5:
  diagnostics carry a `rule` property next to `code`.
- [Proposal 0030](0030-readable-and-complete-rule-records.md), Section 9:
  fixture citations with checked outcomes replace `diagnostics` in records.
- `spec/draft/validation/rules/*.yaml` at tag `v0.9.0-draft.2`: the last
  published records containing the removed mapping.
- MCP Description 0.9.0, Section 4.14: normative projection failure
  identifiers, which remain specification-defined operation outcomes.

## Proposed direction

Each producer owns, publishes, and tests a mapping file that it ships with
the producer release, for example:

```yaml
producer: "@mcpdesc/validator"
selector: 0.9.0-draft.3
catalog: https://mcpdesc.org/validation/catalogs/0.9.0-draft.3/manifest.json
codes:
  - code: schema-validation
    severity: error
    rules: [mcp.tool-annotations.members, mcpdesc.document.schema]
  - code: result-field-not-defined-by-version
    severity: warning
    rules: [mcp.result.additional-properties.preserve]
```

A producer's tests run the specification fixtures and check that:

- every emitted diagnostic's code and rule appear in its mapping;
- every mapped code is exercised by a fixture, or explains why not, for
  example because the document schema rejects the condition first;
- every mapped severity agrees with the cited fixture outcomes of its rules.

The specification may later define an optional shared schema for such files,
without requiring any producer to adopt particular codes.

## Schema impact

None for MCP Description documents or the 0.9.0 rule format. A shared
mapping schema, if adopted, would be a separate, independently versioned
artifact.

## Compatibility

No document validity, rule, or fixture change. Producers keep their current
codes; a mapping documents them.

## Migration

Consumers that read `diagnostics` from Draft 1 or Draft 2 rule records should
read the producer's mapping instead, once published, and use a rule's fixture
citations and outcomes for specification evidence.

## Security and privacy considerations

Mappings are static metadata. Consumers must not fetch or execute anything
because of a mapping entry.

## Alternatives considered

- **Keep producer-scoped codes in rule records.** Rejected for 0.9.0: the
  specification would publish and version another project's API, and the
  records went stale (see Problem).
- **Standardize one code per rule.** Rejected: shared codes such as
  `schema-validation` legitimately span many rules, and producers report at
  different granularities.
- **No mapping at all.** Rejected: tooling needs a stable, documented way to
  relate codes to requirements.

## Open questions

1. Should the specification define a shared mapping schema, or leave the
   format to each producer?
2. Where is a mapping published: in the npm package, beside the catalog on
   mcpdesc.org, or both?
3. How is a mapping versioned against selectors and catalog snapshots?
4. Should phases be part of a shared format, or remain producer metadata?
5. Should codes that are unreachable through document validation be removed
   from producers, or kept for direct semantic-validator callers?

## Implementation and validation plan

1. Discuss this proposal and issue #93.
2. Prototype a mapping in `mcpdesc/core` for `@mcpdesc/validator` and
   `@mcpdesc/core`, with tests against the frozen fixtures of a selector.
3. Decide whether a shared schema belongs in the specification.

## Decision record

On 2026-10-29, the maintainer decided to remove diagnostic codes from 0.9.0
rule records, to make fixture outcomes the navigable evidence, and to track
producer-owned code mappings in this future proposal. Acceptance pending.

## Appendix: removed mapping (historical record)

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
