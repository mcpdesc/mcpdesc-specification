# Proposal 0024: Validation Rule Identity, Provenance, and Outcomes

- Status: Review
- Author(s): @ObjectIsAdvantag
- Created: 2026-10-24
- Target version: 0.9.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/72
- AI assistance disclosure: Drafted with GitHub Copilot from maintainer-approved
  design inputs on issue #72; requires normal maintainer and community review.

## Summary

Make validation rules explicit, traceable units of the specification. Each rule
gets a permanent, owner-namespaced identifier and a record that states who owns
the requirement, which MCP revisions it applies to, where it comes from, which
diagnostics it emits, and which fixtures test it. Records are published with
each specification version in a rule registry under `validation/rules/`.

Validators identify the rule behind each diagnostic. Conflicts between
authoritative sources are recorded as explicit arbitrations. Validation results
distinguish an incomplete validation from an invalid document.

This proposal changes no document acceptance. It defines the vocabulary and
artifacts that later 0.9.0 proposals use to change behavior traceably.

## Problem

MCP Description validates documents against several authorities at once: its
own rules, the MCP revisions a document claims, and JSON Schema for embedded
Tool schemas. Today that knowledge is implicit in validator code.

1. **No traceability.** The candidate validator emits 83 distinct diagnostic
   codes. Nothing records which normative source each one enforces, which MCP
   revisions it applies to, or which fixtures prove it.
2. **Codes are not requirements.** One broad code, such as
   `field-not-supported-by-version`, covers many unrelated requirements. One
   requirement, such as the availability of `Annotations.lastModified`, is
   reported under several codes depending on where the annotations appear.
3. **Revision drift.** Revision-sensitive behavior is implemented as ad hoc
   version gates. The `x-mcp-header` defect corrected by
   `v0.8.0-rev.20261021` treated a keyword "not defined by MCP 2025-11-25" as
   "invalid for MCP 2025-11-25". Nothing in the rule model prevented that
   confusion.
4. **Unclear ownership.** Users cannot tell whether a diagnostic reflects an
   MCP requirement, a deliberate MCP Description restriction, or a JSON Schema
   rule. The same ambiguity blocks future delegation of MCP rules to
   authoritative external validators.
5. **Incomplete versus invalid.** Section 16.2 already requires a warning when
   legacy `_meta` validation is incomplete, and unresolved external Tool-schema
   references produce a warning. Other cases where a validator cannot finish a
   check report errors. There is no general outcome that separates "could not be
   fully validated" from "violates a rule".

## Goals

- Give every validation requirement a permanent identifier that survives
  changes to code, diagnostic wording, severity, and enforcement mechanism.
- Record ownership, per-revision applicability, sources, diagnostics, and
  fixtures for each rule, in a machine-readable form published with each
  version.
- Identify the rule behind every validator diagnostic.
- Define explicit, retireable arbitration records for conflicting sources.
- Define validation outcomes that distinguish incomplete validation from
  invalidity.
- Keep the mechanism lightweight: data records plus ordinary validator code.

## Non-goals

- Changing which documents are conforming. Later proposals do that, citing the
  rules defined here.
- Native projection and validation against official MCP schemas; see the
  planned native projection proposal under issue #72.
- Changing how unknown or later-standardized fields in open MCP structures are
  treated; see the planned openness proposal under issue #72.
- Delegating rules to external validators.
- A declarative rule language, rule engine, or code generation.

## Background and primary references

- Issue #72 and its design inputs: the incremental MCP validation alignment
  strategy (revision 3) and the validation rule provenance and arbitration
  methodology (revision 2), attached to the issue.
- MCP Description 0.8.0 Section 16 (conformance), including the existing
  warning and incomplete-validation provisions.
- Validator diagnostics: `code`, `severity`, `message`, and root-relative
  `path`, as published by `@mcpdesc/validator`.
- `spec/draft/validation/README.md`, which introduces the ownership model and
  folder layout this proposal makes normative.

## Proposed normative behavior

### 1. Validation rules

A **validation rule** is a single requirement that a conforming validator
checks. Every requirement in Sections 16.1 and 16.2 that a validator enforces,
and every warning condition defined by this specification, is expressed as one
or more validation rules.

Structural JSON Schema constraints on closed MCP Description objects MAY be
covered by one rule per object. A structural constraint that reproduces an MCP
requirement, or that varies by MCP revision, MUST have its own rule.

A rule is anchored to the type it constrains, not to where MCP Description
carries that type. For example, one rule covers `Annotations.lastModified`
wherever MCP annotations appear.

### 2. Rule identifiers

A rule identifier:

- MUST match `^(mcp|mcpdesc|json-schema)(\.[a-z0-9]+(-[a-z0-9]+)*)+$`;
- MUST start with the namespace of the rule's owner: `mcp` for requirements
  defined by MCP, `mcpdesc` for requirements defined by this specification, and
  `json-schema` for requirements defined by JSON Schema;
- MUST NOT encode an MCP protocol revision, an implementation mechanism, a
  diagnostic code, or a severity;
- once published in a specification snapshot, MUST NOT change meaning and MUST
  NOT be reused for a different requirement, including after retirement.

When a requirement changes materially between MCP revisions, rather than
changing applicability, it MUST be defined as a separate rule.

### 3. Rule registry

Each specification version publishes its rule registry as YAML files under
`validation/rules/` in its specification folder, validated by
`validation/rule.schema.json`. The registry is frozen with the release.

Each rule record contains:

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Rule identifier (Section 2) |
| `owner` | yes | `mcp`, `mcpdesc`, or `json-schema`; MUST match the identifier namespace |
| `summary` | yes | One-sentence statement of the requirement |
| `surface` | yes | Constrained type, such as `Tool` or `Result` |
| `path` | no | Field or keyword within the surface |
| `kind` | yes | `structural`, `semantic`, `preservation`, `embedded-standard`, `mcpdesc-semantic`, `completeness`, or `interoperability` |
| `requirement` | no | Requirement level of the source: `must`, `should`, or `may`. An `mcp` rule whose level is `should` or `may` MUST NOT emit `error` diagnostics |
| `applicability` | `mcp` and `json-schema` rules | Behavior for every MCP revision supported by the specification version (Section 4) |
| `specification` | yes | MCP Description requirements the rule checks, at least one at a requirement anchor in a section, and the decisions behind the rule |
| `sources` | `mcp` and `json-schema` rules | External evidence, each with an authority tier (Section 7) and a section anchor or schema pointer |
| `diagnostics` | yes | Diagnostic codes the rule emits, with their severity |
| `enforcement` | yes | How validators check the rule: `internal`, `official-schema`, or `external` |
| `status` | yes | `internal`, `externally-verified`, `delegated`, `arbitrated`, or `retired` |
| `fixtures` | yes | Repository fixtures that demonstrate the rule, including each revision boundary |
| `arbitrations` | no | Arbitration records (Section 6) |
| `gaps` | no | Known differences between the rule and current validator behavior that are deliberately not corrected, each with the affected revisions (Section 4.1) |

`id`, `owner`, `kind`, `applicability`, and diagnostic severities are
normative. The remaining fields are informative. If a rule record and the
specification text disagree, the specification text prevails and the record is
corrected in the next snapshot.

### 4. Revision applicability

For each supported MCP revision, `applicability` records one of:

- `applies`: the requirement is checked;
- `opaque`: the field or keyword may appear and is preserved, but the MCP
  semantics checked by the rule do not apply;
- `not-applicable`: the rule does not apply to that revision;
- a rule-specific named behavior, described in the rule's `summary` or
  `sources`.

A name that a later MCP revision standardizes MUST NOT be reported as invalid in
an earlier revision solely because the validator knows the later meaning.
Whether such a name is accepted in the earlier revision is decided by the rules
of the structure that contains it.

The rules applicable to one Effective Protocol View form the ruleset
`mcpdesc.mcp.<revision>`, for example `mcpdesc.mcp.2026-07-28`. Rules owned by
MCP Description form `mcpdesc.core`. Rulesets are derived from applicability and
are not separately maintained.

### 4.1 Revision support tiers

Rules are inventoried for every supported MCP revision. A revision's tier sets
the validation approach and whether a known defect may be left uncorrected:

| Tier | MCP revisions | Inventory | Uncorrected defects | Validation approach |
| --- | --- | --- | --- | --- |
| Active | `2025-11-25`, `2026-07-28` | Complete | Not allowed | Rule-driven validation, extended by later 0.9.0 proposals |
| Maintained | `2025-06-18` | Complete | Not allowed | Existing validator logic |
| Historical | `2024-11-05`, `2025-03-26` | Complete | Allowed; recorded as `not-fixed` gaps | Existing validator logic |

Tiers limit effort, not corrections. MCP Description 0.9.0 is a new version, so
a defect found in any revision is corrected like any other normative change; for
example, result `_meta` in examples was corrected for the historical revisions.
A `not-fixed` gap records a historical defect deliberately left uncorrected,
for example because correcting it in the existing logic would cost more than it
is worth. Recording a gap does not change validator behavior. If keeping the
existing logic for historical revisions becomes too costly, those revisions
move to the rule-driven approach after the active tier is complete.

### 5. Diagnostics

A diagnostic emitted by a conforming validator for a registered rule MUST
identify that rule. Validators that expose structured diagnostics MUST include
the rule identifier in a `rule` property alongside `code`, `severity`,
`message`, and `path`.

`code` continues to identify the specific condition and MAY be shared by several
rules. `rule` identifies the requirement. A structural JSON Schema failure that
cannot be attributed to a more specific rule uses the rule
`mcpdesc.document.schema`.

### 6. Arbitrations

An arbitration records how MCP Description validates a rule when authoritative
sources disagree, or when an official schema cannot express a normative
requirement. An arbitration MUST record the affected MCP revisions, the
conflicting sources, the chosen authority, the resulting validator behavior, the
rationale, an upstream reference when one exists, and a review trigger.

Normative MCP sources are the default authority, split by concern: the TypeScript
schema of the revision for message and structure shapes, and the normative
specification text of the revision for semantics and behavior it cannot
express. When the two genuinely contradict, the arbitration records an upstream
ambiguity and references the upstream issue; it is never resolved from SDK
behavior alone. A rule with an active arbitration has status `arbitrated`. An
arbitration is retired, not deleted, when upstream sources converge. MCP
Description policy choices about objects it owns are not arbitrations.

### 7. Source authority

MCP defines each protocol revision with two normative artifacts. Its
specification states that it "defines the authoritative protocol requirements,
based on the TypeScript schema", and that the TypeScript schema "is the source
of truth for all protocol messages and structures". Sources are therefore
always those of a specific released revision, pinned to an upstream commit, and
ranked as follows, highest first:

1. the MCP TypeScript schema (`schema.ts`) of the revision, for message and
   structure shapes, and the normative MCP specification text of the revision,
   for semantics and behavior;
2. normative referenced standards, such as JSON Schema for embedded schemas;
3. the MCP JSON Schema generated from `schema.ts` for the revision;
4. official MCP clarifications and final MCP proposals (SEPs), which record
   design rationale but defer to the current specification;
5. official SDKs and reference implementations;
6. MCP Inspector and the official conformance framework;
7. other ecosystem tooling.

MCP Description itself is not a ranked source. A rule cites the MCP Description
requirements and decisions it implements in `specification`, separately from
its `sources`: for an `mcpdesc` rule MCP Description is the authority, and for
an `mcp` rule it only adopts or arbitrates what the sources say.

An `mcp` rule MUST cite at least one tier 1 to 3 source. Lower tiers can reveal
ambiguity or defects but do not override a higher tier without an arbitration.
SDK behavior is interoperability evidence; it does not define MCP conformance.
Draft MCP revisions are not sources unless a rule explicitly targets them.

Whether an MCP type accepts properties it does not list is determined by its
TypeScript definition: the type is open only if it declares or inherits an
index signature. The generated JSON Schema omits `additionalProperties: false`
for closed types and is not evidence of openness. Unlisted fields of an open
type are preserved and not interpreted beyond their presence.

### 8. Validation outcomes

A validator reports one of four outcomes for a document:

| Outcome | Condition |
| --- | --- |
| `invalid` | At least one error diagnostic |
| `incomplete` | No error, and at least one diagnostic from a rule of kind `completeness` |
| `valid-with-warnings` | No error and no completeness diagnostic, but at least one warning |
| `valid` | No diagnostics |

An `incomplete` document is not invalid, but a validator MUST NOT report it as
fully validated. This generalizes the existing incomplete-validation provisions
in Section 16.2; for example, the existing `legacy-protocol-validation-incomplete`
warning belongs to a rule of kind `completeness`. A stricter profile MAY treat
`incomplete` as failure and MUST be identified separately from baseline
conformance.

## Schema impact

None for MCP Description documents. The 0.9.0 document schema is unchanged by
this proposal.

New supporting artifacts:

- `validation/rule.schema.json`: JSON Schema for rule registry files.
- `validation/rules/*.yaml`: the rule registry, one file per surface.

Validator results gain a `rule` property on each diagnostic. This changes the
published validator diagnostic contract and applies only to new validator
selectors.

## Examples

### Rule record

```yaml
id: mcp.tool.output-schema.object-root
owner: mcp
summary: A Tool outputSchema has an object-typed root.
surface: Tool
path: outputSchema
kind: structural
applicability:
  2024-11-05: not-applicable
  2025-03-26: not-applicable
  2025-06-18: applies
  2025-11-25: applies
  2026-07-28: not-applicable
sources:
  - tier: 1
    reference: MCP 2025-06-18 and 2025-11-25 schema.ts, interface Tool, outputSchema (type "object")
  - tier: 1
    reference: MCP 2026-07-28 schema.ts, interface Tool, outputSchema (no root type)
diagnostics:
  - code: field-not-supported-by-version
    severity: error
enforcement: internal
status: internal
fixtures:
  - expected-invalid/non-object-output-schema-before-2026.json
```

`outputSchema` does not exist before MCP 2025-06-18; that absence is a separate
availability rule, which also emits `field-not-supported-by-version`. The shared
code is why diagnostics need the `rule` property.

The record states the intended applicability. The current candidate validator
also applies the object-root check to MCP 2024-11-05 and 2025-03-26, so a
non-object `outputSchema` in those revisions produces both the availability
error and a redundant object-root error. Both are historical revisions, so this
is recorded as a gap rather than corrected:

```yaml
gaps:
  - revisions: [2024-11-05, 2025-03-26]
    behavior: The object-root error is also reported, in addition to the availability error.
```

### Revision-sensitive semantics

```yaml
id: mcp.tool.input-schema.x-mcp-header
owner: mcp
summary: x-mcp-header annotates a statically reachable primitive property with a unique HTTP field name.
surface: Tool
path: inputSchema properties x-mcp-header
kind: semantic
applicability:
  2024-11-05: opaque
  2025-03-26: opaque
  2025-06-18: opaque
  2025-11-25: opaque
  2026-07-28: applies
sources:
  - tier: 1
    reference: MCP 2026-07-28 Streamable HTTP transport, header mirroring
diagnostics:
  - code: invalid-x-mcp-header
    severity: error
  - code: duplicate-x-mcp-header
    severity: error
enforcement: internal
status: internal
fixtures:
  - expected-valid/revision-inapplicable-mcp-header.json
  - expected-invalid/invalid-mcp-header-value.json
  - expected-invalid/invalid-mcp-header-placement.json
  - expected-invalid/duplicate-mcp-header.json
```

### Diagnostic

```json
{
  "code": "field-not-supported-by-version",
  "rule": "mcp.tool.output-schema.object-root",
  "severity": "error",
  "message": "tools[0].outputSchema must have type \"object\" when it applies to MCP 2025-11-25",
  "path": ["tools", 0, "outputSchema", "type"]
}
```

## Compatibility

Classification: **no change to document conformance; breaking change to the
validator diagnostic contract for new selectors**.

- Every document conforming to the 0.9.0 draft before this proposal remains
  conforming, and every diagnostic code is unchanged.
- Diagnostics gain a `rule` property. Consumers that compare complete diagnostic
  objects, or that reject unknown properties, must be updated. Consumers that
  read only `code`, `severity`, `message`, and `path` are unaffected.
- Published validator selectors remain immutable and do not emit `rule`.
- Reporting an `incomplete` outcome does not change which documents conform; it
  changes how a result is labeled.

## Migration

No document migration is required.

Tooling that groups, filters, or suppresses diagnostics SHOULD key on `rule`
rather than `code`, because codes may be shared between rules. Consumers that
report validation success SHOULD distinguish `incomplete` from `valid`.

## Security and privacy considerations

Rule records are static data published with the specification. Validators MUST
NOT retrieve rule records, sources, or arbitrations over the network during
validation. Source references are informative and are not dereferenced
automatically.

## Alternatives considered

### Use diagnostic codes as rule identifiers

Rejected. Codes describe conditions, are shared across requirements, and are
already depended on by consumers. Splitting them would break existing tooling
without making requirements traceable.

### Encode the MCP revision in rule identifiers

Rejected. Most requirements apply across several revisions. Applicability
metadata expresses that without duplicating rules or changing identifiers when a
new revision is added.

### A declarative rule language or rule engine

Deferred. The immediate need is traceability. A rule language is worth
considering only if repeated implementation experience shows that it reduces
complexity.

### Keep the registry in the validator package

Rejected. Rules derive from normative text, which this repository owns. The
validator package imports the registry with each snapshot.

### Look up rules from codes without a diagnostic property

Rejected as the only mechanism. Shared codes make the lookup ambiguous without
the diagnostic's path and context.

## Open questions

The following questions are deferred to implementation, where the pilot and
inventory will provide the evidence to answer them:

1. **Which record fields are part of the specification.** This proposal makes
   `id`, `owner`, `kind`, `applicability`, and severities binding; `sources`,
   `enforcement`, `status`, and `fixtures` are maintained notes that can be
   corrected at any time. Should some of the notes also become binding?
2. **Who computes the outcome.** Either the validator returns the outcome
   (`valid`, `valid-with-warnings`, `incomplete`, or `invalid`) with its
   diagnostics, or each consumer computes it from the diagnostics and the
   registry. To be decided with the validator package.

Resolved: rules are inventoried for all supported revisions; tiers limit
effort, not corrections, and only defects in historical revisions may be left
as `not-fixed` gaps (Section 4.1). JSON Schema failures are attributed, by the
failing schema location, to the rule that owns it; only failures that no rule
owns use `mcpdesc.document.schema` (Section 5).

## Implementation and validation plan

1. Add `validation/rule.schema.json` and a repository test that validates every
   registry file against it.
2. Pilot five records: `mcp.tool.output-schema.object-root`,
   `mcp.tool.input-schema.x-mcp-header`, the Result additional-properties rule,
   one availability rule behind `field-not-supported-by-version`, and
   `mcpdesc.document.schema`. Confirm the record format before continuing.
3. Inventory the remaining Tool rules and the rules for Results carried in Tool,
   Prompt, and Resource examples, then the other surfaces, for all supported
   revisions. Correct defects in any revision; defects in historical revisions
   may instead be recorded as `not-fixed` gaps.
4. Add a registry consistency test: every code the candidate validator can emit
   belongs to at least one rule, every listed fixture exists, every `mcp` rule
   cites a tier 1 to 3 source, and identifiers are unique and well formed.
5. Emit `rule` from the candidate validator and derive the validation outcome.
6. Update Section 2 (terminology), Section 16 (rule identity, diagnostics, and
   outcomes), and `validation/README.md`; synchronize the assembled
   specification and `spec/draft/CHANGELOG.md`.
7. Export the registry with validator snapshots and coordinate the diagnostic
   contract change with `@mcpdesc/validator` and core consumers.

The discriminating test is a document that triggers
`field-not-supported-by-version` for two different requirements, for example
`outputSchema` before MCP 2025-06-18 and a non-object `outputSchema` in MCP
2025-11-25. The two diagnostics share a code and must carry different `rule`
identifiers.

## Decision record

Pending.
