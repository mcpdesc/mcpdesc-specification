# Validation

This folder collects the material MCP Description uses to validate documents
against the MCP protocol revisions they describe. It exists because MCP
Description 0.9.0 makes protocol alignment explicit: every MCP-related
validation behavior should state who owns it, which MCP revisions it applies to,
where it comes from, and how it is tested.

Status: 0.9.0 working draft, implementing review-stage
[Proposal 0024](../proposal-snapshots/0024-validation-rule-identity-and-provenance.md)
([PR #76](https://github.com/mcpdesc/mcpdesc-specification/pull/76)).
The content is non-normative until that proposal is accepted. The candidate
validator does not consume the registry yet. Design background is tracked in
[issue #72](https://github.com/mcpdesc/mcpdesc-specification/issues/72).

## Layout

| Path | Content | Status |
| --- | --- | --- |
| [`mcp-revisions.md`](mcp-revisions.md) | Introductory guide to how MCP structures used by MCP Description differ across supported protocol revisions | Initial version |
| [`rule.schema.json`](rule.schema.json) | JSON Schema for rule registry files | Pilot |
| [`rules/`](rules/) | Validation rule records in YAML, one file per surface | Pilot: 58 rules declaring every candidate diagnostic code; checked by `scripts/test-validation-rules.mjs` |
| `mcp-schemas/` | Byte-identical copies of the official MCP schemas, one folder per supported revision (`<revision>/schema.ts`, `<revision>/schema.json`), the upstream `LICENSE`, and `manifest.json` recording repository, commit, source paths, and SHA-256 digests | Pinned at upstream commit `dae694f61a31f7a3ec2af3aff709e11f70f61e48`; digests checked by `scripts/test-validation-rules.mjs` |

The folder is part of the versioned specification: it is frozen with each
release, so the rules and pinned MCP schemas used by a release never change
after publication.

## MCP sources of truth

MCP defines each protocol revision with two normative artifacts:

| Concern | Authoritative source | Example |
| --- | --- | --- |
| Message and structure shapes: fields, required or optional, unions, inheritance, openness | The revision's TypeScript schema, `schema/<revision>/schema.ts`, which MCP calls "the source of truth for all protocol messages and structures" | `Tool.name` exists, is required, and is a string |
| Semantics and behavior that types cannot express | The revision's normative specification text | Tool names SHOULD be 1 to 128 characters from `A-Z`, `a-z`, `0-9`, `_`, `-`, and `.` |

Other artifacts are evidence, not authority:

| Artifact | Role for MCP Description |
| --- | --- |
| Generated `schema.json` | Machine-readable derivative of `schema.ts`; useful to check projected MCP values, never to override `schema.ts` |
| Final SEPs | Design rationale; each states that the current specification and changelog are authoritative |
| SDKs, Inspector, conformance tools | Implementations; interoperability evidence only. SDK models may cover several revisions at once and do not define conformance |
| Draft revisions | Not used unless a rule explicitly targets a draft |

Rules always name a specific released revision, never "MCP in general": a Tool
in MCP 2025-11-25 and a Tool in MCP 2026-07-28 are different types. Sources are
pinned to an upstream commit (see [`mcp-revisions.md`](mcp-revisions.md)).

When sources disagree:

| Conflict | Outcome |
| --- | --- |
| Prose example versus `schema.ts` structure | `schema.ts` |
| `schema.json` versus `schema.ts` | `schema.ts`; probable generator defect, reported upstream |
| Prose requirement that `schema.ts` cannot express | Prose |
| Prose and `schema.ts` genuinely contradict | Recorded as an arbitration with the upstream issue; never resolved from SDK behavior alone |
| SEP versus current specification | Current specification |
| SDK versus released specification | Released specification |

The requirement level of the source matters: a `SHOULD` in MCP is a
recommendation, so an MCP rule at that level produces warnings, not errors.

### Source tiers

A rule record separates the requirement from the evidence. Its
`specification` field cites the MCP Description requirements the rule checks
and the decisions behind it. Its `sources` field cites external evidence, each
source with a tier. Tiers rank how much a source can decide about MCP
behavior, highest first (Proposal 0024, Section 7):

| Tier | Source |
| --- | --- |
| 1 | The revision's `schema.ts`, for structures, and its normative specification text, for semantics |
| 2 | Normative referenced standards, such as JSON Schema for embedded schemas or RFC 6570 |
| 3 | The `schema.json` generated from `schema.ts` |
| 4 | Official MCP clarifications and final SEPs |
| 5 | Official SDKs and reference implementations |
| 6 | MCP Inspector and the official conformance framework |
| 7 | Other ecosystem tooling |

MCP Description is not ranked among these sources. For an `mcpdesc` rule it
is the authority, and the rule may have no external source. For an `mcp` rule
it cannot decide what MCP means: it adopts or arbitrates what tiers 1 to 3
say, and the rule must cite one of them. A lower tier can reveal ambiguity or
a defect in a higher one but does not override it without an arbitration.

## Ownership model

Every validated structure has exactly one owner:

| Owner | Examples | Authority | Unknown fields |
| --- | --- | --- | --- |
| MCP Description | `info`, transports, security, tags, examples, protocol scoping, components | This specification | As defined by MCP Description |
| MCP | Tool, Resource, ResourceTemplate, Prompt, capabilities, results, annotations, `_meta` | The applicable MCP revision | As permitted by that revision |
| Embedded standard | Tool `inputSchema` and `outputSchema` (JSON Schema) | The declared or default dialect, plus semantics the MCP revision adds | As defined by the dialect |

A Tool therefore involves two schema layers, validated separately:

```text
MCP Tool (MCP type, from schema.ts)
 ├─ name, title, description, icons, annotations, _meta
 ├─ inputSchema  ──► a JSON Schema document, in its declared or default dialect
 └─ outputSchema ──► a JSON Schema document, in its declared or default dialect
```

The outer object follows the MCP Tool type of the revision. Each embedded
schema must be valid in its own dialect (JSON Schema 2020-12 when `$schema` is
absent, in revisions that define a default dialect), plus the root constraints the MCP revision adds,
such as `type: "object"` for `inputSchema`. Validating the Tool against the
generated MCP JSON Schema alone does not validate the embedded schemas.

Knowing a field is not the same as the field being defined for a revision. A
name that a later MCP revision standardizes is not invalid in an earlier
revision whose structure permits it; it is preserved without the later
semantics. See also [Examples fail fast](#examples-fail-fast).

Whether an MCP structure permits unknown fields is read from MCP's TypeScript
schema: a type is open only if it declares or inherits an index signature, such
as `Result`. Fields of an open type that a revision does not define are
preserved and are not interpreted beyond their presence. The generated MCP JSON
Schema accepts unlisted properties for every type and is not evidence of
openness.

## Examples fail fast

Examples are validated as part of conformance. An example that does not match
the declaration it illustrates, or the completed result of every applicable MCP
revision, makes the document invalid. Example correctness is not delegated to an
optional linter or to severities chosen per organization.

Rationale: in the OpenAPI ecosystem, documents commonly validate while their
examples do not. The resulting misleading documentation rarely gets fixed,
and consumers build workarounds around it. Failing when an example is
introduced or its declaration changes forces the fix at the source.

"Incorrect" is measured against MCP's own types. For each applicable revision,
the validator classifies every field of an example result:

| Field | Outcome |
| --- | --- |
| Defined by the revision, valid | Accepted |
| Defined by the revision, missing when required or invalid | Error |
| Not defined by the revision, on an open type such as `Result` | Accepted, preserved without meaning, warning |
| Not defined by the revision, on a closed type | Error |

For example, `resultType` in a result for MCP 2025-11-25 is allowed by the open
`Result` but has no meaning there, so it produces a warning. The warning applies
even when the same example also serves MCP 2026-07-28, where `resultType` is
required. Authors may accept the warning or split the declaration into
protocol-scoped variants with separate examples. Unknown names such as a vendor
field are treated the same way; MCP's extension point for such data is `_meta`.

Warnings are attributed to a revision, so the warnings for a document equal the
union of the warnings for its per-revision Effective Protocol Views. Linters
may add style and quality rules, but they do not relax example validity.

Decided 2026-10-25 under
[issue #72](https://github.com/mcpdesc/mcpdesc-specification/issues/72),
replacing a short-lived direction that would have moved example consistency to
a linter. Implemented in the draft by Proposal 0026 for every supported
revision; see Section 3.6 of the specification.

## Rule records

Each validation rule has a permanent identifier and a record:

| Field | Meaning |
| --- | --- |
| `id` | Permanent, owner-namespaced identifier, for example `mcp.tool.output-schema.object-root`. Never reused; retired identifiers stay reserved. Protocol revisions are not part of the identifier. |
| `owner` | `mcp`, `mcpdesc`, or the embedded standard |
| `surface`, `path` | Native type and field the rule applies to |
| `kind` | structural, semantic, preservation, embedded-standard, mcpdesc-semantic, completeness, or interoperability |
| `requirement` | Requirement level of the source: must, should, or may |
| `applicability` | Behavior per supported MCP revision |
| `specification` | MCP Description requirements the rule checks and the decisions behind it, each with precise `locations` (see below) |
| `sources` | External evidence, such as MCP's schema and specification text, by authority tier, each with precise `locations`; optional for `mcpdesc` rules |
| `diagnostics` | Diagnostic codes emitted |
| `enforcement` | Internal check, official schema, or external implementation, such as native projection in `@mcpdesc/core` |
| `status` | internal, externally-verified, delegated, arbitrated, or retired |
| `fixtures` | Tests covering each revision boundary: a fixture `path` and a JSON `pointer` to the fragment that illustrates the rule (`""` for the whole document). The path is relative to `fixtures/`, or names a native projection case under `projection-fixtures/` |
| `gaps` | Known differences from current validator behavior: `planned` for correction, or `not-fixed` for historical revisions |

Locations are immutable and relative to the specification folder:

| Field | Cited text | Location form |
| --- | --- | --- |
| `sources` | MCP `schema.ts` (tier 1) | `validation/mcp-schemas/<revision>/schema.ts#L<from>-L<to>` in the vendored copy |
| `sources` | MCP specification text (tier 1) | GitHub permalink at the pinned MCP commit, with a line range |
| `sources` | Referenced standards (tier 2), SEPs (tier 4) | HTTPS URL to the section |
| `specification` | MCP Description requirement | `sections/<file>.md#req-<topic>` |
| `specification` | MCP Description decision | `validation/<file>.md#<heading>`, a proposal snapshot, or a released proposal |

Every rule cites at least one MCP Description requirement: a `specification`
location at a requirement anchor. A requirement anchor is an
`<a id="req-<topic>"></a>` element placed in the section source immediately
before the requirement sentence. Its identifier names the requirement, not a
rule, and is permanent: one sentence can be checked by several rules, and one
rule can check several sentences.

Fixture pointers select the fragment of the fixture document that a reader
needs. For an invalid or warning fixture, the pointer contains a diagnostic
of the rule. When the fragment is a reusable component, the pointer selects
the component value under `/components/`, because diagnostics are reported
at use sites.

`scripts/test-validation-rules.mjs` resolves every location, anchor, and
pointer, and reports how many requirement anchors rules cite.

Rules are anchored to the MCP type, not to where MCP Description carries it.
For example, one rule covers `Annotations.lastModified` wherever annotations
appear. Rulesets such as `mcpdesc.mcp.2026-07-28` group rules for one Effective
Protocol View without redefining them.

When authoritative sources disagree, MCP Description records an explicit
arbitration: the conflicting sources, the chosen authority (normative MCP text
by default), the rationale, an upstream reference, and when to revisit it.
An arbitration is `active` when decided, `proposed` while it awaits a
maintainer decision (validator behavior is then unchanged, and any difference
is recorded as a gap), or `retired`.

## Rules in diagnostics

A diagnostic for a registered rule carries the rule identifier in a `rule`
property next to `code`, `severity`, `message`, and `path`:

```json
{
  "code": "schema-validation",
  "severity": "error",
  "message": "does not validate against 0.9.0: /tools/0/annotations must NOT have additional properties",
  "path": ["tools", 0, "annotations", "audience"],
  "rule": "mcp.tool-annotations.members"
}
```

`code` names the condition and can be shared by several rules; `rule` names
the requirement. Every diagnostic of the candidate validator identifies a
registered rule. A `schema-validation` diagnostic identifies a specific rule
where the failing schema location does, otherwise `mcpdesc.document.schema`.

`scripts/test-validation-rules.mjs` checks that every diagnostic code the
candidate validator emits is declared by a rule, that every fixture diagnostic
identifies a registered rule declaring that code and severity, and that each
`expected-invalid` fixture a rule cites has a diagnostic identifying it.
