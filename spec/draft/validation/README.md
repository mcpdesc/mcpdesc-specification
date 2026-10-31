# Validation

<!-- mcpdesc:validation-overview:start -->

Validation rules explain the checks used to determine whether an MCP
Description document is valid and identify issues that need attention.

## What validation rules cover

A document is checked in three areas:

- **MCP:** the described tools, resources, prompts, capabilities, or carried
  MCP values meet the requirements of the applicable protocol
  version.
- **JSON Schema:** an embedded Tool input or output schema is valid under
  its applicable JSON Schema dialect.
- **MCP Description:** complementary description fields, protocol scoping,
  references, and examples meet MCP Description's requirements.

The catalog groups rules by these three owners, recorded as
`mcp`, `json-schema`, and `mcpdesc`.

A single Tool declaration may involve rules from all three groups:

- Its MCP fields and annotations follow MCP rules.
- Its `inputSchema` and `outputSchema` must be valid JSON Schemas.
- Its scopes and examples follow MCP Description rules; its example results
  also follow MCP's result types for every applicable protocol version.

## Why explicit validation rules?

MCP Description provides static descriptions of MCP servers across the MCP
protocol versions a specification version supports. MCP Description 0.9.0
supports MCP protocol versions 2024-11-05 through 2026-07-28.

The same field can be required in one protocol version,
undefined in another, and governed by a JSON Schema dialect rather than by MCP.

A validation failure without that context does not tell an author what to fix.

For structural checks, semantic checks, and protocol scopes, read
[How validation works](../guides/understanding-mcp-protocol-versions.md).
This overview explains how to use the catalog to understand and act on the
resulting diagnostics.

## How to use the catalog

Each rule records which specification owns the requirement, which protocol
versions it applies to, and where the requirement comes from.

The catalog
helps users and tools identify whether a problem concerns MCP structures,
embedded JSON Schema, or MCP Description semantics.

Each rule has a permanent identifier, such as `mcp.tool.output-schema.object-root`.
Utility tools can use this identifier to refer to a particular rule and trace provenance in a diagnostic.

Each record also has a short `title`, a precise requirement `summary`, and a
reader-oriented `description`. Titles help you scan the catalog; descriptions
explain what a check means and how to address it. They do not replace the
specification requirements.

A validator reports each issue with a severity, a location, and the `rule` it
breaks. It may also report its own diagnostic codes and messages; those belong
to the validator, can differ between tools, and are not part of the catalog.
A validator can also report a result for every rule, so you can tell a check
that ran and passed from one that never ran; see [Rule results](#rule-results).

Each rule cites fixtures: complete example documents in the specification,
with a pointer to the relevant fragment and its outcome. The outcome is
`passes` when the rule ran there and reported nothing, `error` or `warning`
for what the rule reports, or `not-applicable` when the rule does not run
there for the protocol versions the fragment applies to. The specification's
tests check every outcome, so the fixtures show how a rule behaves.

To act on a diagnostic:

1. Find the diagnostic's `rule` identifier in the catalog.
2. Check the diagnostic's severity and the rule's protocol-version
   applicability.
3. Read the requirement, its source references, and the rule's fixtures,
   comparing a fragment that passes with one that fails.
4. Correct the document and validate it again.

Errors make a document invalid; warnings do not:

- **Error:** a Tool has an array-rooted `outputSchema` but applies to MCP
  2025-11-25, which requires an object root. See the
  [worked example](#worked-example) below.
- **Warning:** an example result contains `resultType: "complete"` for MCP
  2025-11-25. The open result type permits the field without defining its
  meaning. The document remains valid, and the field is preserved. The
  [guide explains the contrast with MCP 2026-07-28](../guides/understanding-mcp-protocol-versions.md#what-validation-checks),
  where the field is required. See rule
  `mcp.result.additional-properties.preserve` in
  [`rules/result.yaml`](rules/result.yaml).

### Worked example

The [guide's complete server description](../guides/understanding-mcp-protocol-versions.md#use-protocolversions-scopes-to-describe-variations)
declares two `lookup` variants with different output schemas. To isolate one
error, consider a document with the same root protocol versions,
`["2025-11-25", "2026-07-28"]`, but only this Tool:

```json
{
  "name": "lookup",
  "inputSchema": { "type": "object" },
  "outputSchema": { "type": "array", "items": { "type": "string" } }
}
```

This is a Tool fragment, not a complete document. Without its own
`protocolVersions`, it inherits both root versions. The candidate validator
reports this error (its own diagnostic `code` is omitted here):

```json
{
  "severity": "error",
  "message": "tools[0].outputSchema must have type \"object\" when it applies to MCP 2025-11-25",
  "path": ["tools", 0, "outputSchema", "type"],
  "rule": "mcp.tool.output-schema.object-root",
  "protocolVersions": ["2025-11-25"]
}
```

1. Find `mcp.tool.output-schema.object-root` in
   [`rules/tool.yaml`](rules/tool.yaml). Its title is "Use object output schemas
   before MCP 2026"; its description explains the version boundary.
2. The severity is `error`, so the document is invalid. The rule applies to
   MCP 2025-06-18 and 2025-11-25, but not 2026-07-28. This Tool inherits
   2025-11-25, so the check applies.
3. Read the requirement in
   [Section 9.2](../sections/09-tools.md#req-tool-output-schema-object-root)
   and the rule's pinned MCP sources. The rule cites two fixtures: an
   [invalid fixture](../fixtures/expected-invalid/non-object-output-schema-before-2026.json)
   whose `/tools/0/outputSchema` has outcome `error` for MCP 2025-11-25, and a
   [valid fixture](../fixtures/expected-valid/protocol-coverage-and-tool-schemas.json)
   whose `/tools/3/outputSchema` has outcome `not-applicable` because that
   Tool is scoped to MCP 2026-07-28 only. The rule results of the invalid
   fixture show `failed` for 2025-11-25.
4. Correct the description to match the server. If only MCP 2026-07-28 returns
   an array, scope that variant to `["2026-07-28"]` and retain the object-output
   variant for 2025-11-25, as in the guide. If both versions return an object,
   describe that actual object shape instead. Do not change declared protocol
   support merely to silence an error. Validate again; the guide's complete
   two-variant document produces no diagnostics.

## Status and scope

The normative requirements are those of the specification sections. The rule
catalog is a pilot registry implementing review-stage
[Proposal 0024](../proposal-snapshots/0024-validation-rule-identity-and-provenance.md),
extended by review-stage
[Proposal 0030](../proposal-snapshots/0030-readable-and-complete-rule-records.md),
[Proposal 0033](../proposal-snapshots/0033-complete-validation-catalog.md),
and [Proposal 0031](../proposal-snapshots/0031-rule-level-validation-results.md).
None of these proposals is accepted. The pilot registry documents and tests the
requirements; its reader fields are informative and it is not a separate
document-conformance specification.

Catalogs belong to exact MCP Description snapshots, not validator package
versions. Once deployed, the [catalog discovery index](https://mcpdesc.org/validation/catalogs/index.json)
lists the published manifests, with separate stable and draft pointers. The
Draft 3 catalog and rule-format `1.1.0` are published. The Draft 4 catalog,
rule-format `1.2.0`, and validation result format `1.0.0` endpoints are
publication targets until deployment is verified; this working tree does not
imply they are live. See
[catalog publication and discovery](#catalog-publication-and-discovery).

Every diagnostic of this repository's candidate validator identifies a
registered rule. Published prereleases implement the registry and native MCP
projection for Community Working Drafts 1 and 2 (`0.9.0-draft.1` and
`0.9.0-draft.2`), when a selector is passed explicitly:

- [`@mcpdesc/validator@0.14.0-rc.2`](https://www.npmjs.com/package/@mcpdesc/validator/v/0.14.0-rc.2)
  reports the `rule` of each diagnostic.
- [`@mcpdesc/core@0.13.0-rc.2`](https://www.npmjs.com/package/@mcpdesc/core/v/0.13.0-rc.2)
  implements native MCP projection, tested against those drafts' projection
  fixtures, and 0.8.0 to 0.9.0 conversion. It does not yet check the
  projection postcondition of Section 4.14, which Draft 3's postcondition
  cases expect.

Both are prereleases, not stable releases. Install them by exact version: the
npm `next` dist-tag moves to later prereleases. Support for Drafts 3 and 4
follows in later releases.

<!-- mcpdesc:validation-overview:end -->

## Reference

The rest of this document is the technical reference for rule authors and tool
implementers. This folder collects the material MCP Description uses to
validate documents against the MCP protocol revisions they describe: every
MCP-related validation behavior states who owns it, which MCP revisions it
applies to, where it comes from, and how it is tested. Design background is
tracked in [issue #72](https://github.com/mcpdesc/mcpdesc-specification/issues/72).

### Checks performed by other operations

Some rules are checked outside document validation. For example, native MCP
projection checks that the projected value validates against the MCP schema for
the requested protocol version. A failure is reported by the projection
operation, not by the document validator. The catalog calls these checks
*delegated* and records `enforcement: external`; see
[`rules/projection.yaml`](rules/projection.yaml). The candidate validator does
not perform them, and its rule results report them as `delegated`. This
repository checks only that their
projection cases are consistent, with `scripts/test-projection-fixtures.mjs`;
implementations such as `@mcpdesc/core` must pass those cases.

Effective Protocol View projection and merge are checked the same way by
`mcpdesc.view.projection` and `mcpdesc.view.merge`. Their cases in
[`../view-fixtures/`](../view-fixtures/) give the exact expected document or
the requirement anchor of the expected failure, and
`scripts/test-view-fixtures.mjs` recomputes them with the reference operations
of `scripts/mcpdesc-views.mjs`.

### Layout

| Path | Content | Status |
| --- | --- | --- |
| [How validation works](../guides/understanding-mcp-protocol-versions.md) | Structural and semantic checks, protocol scopes, Effective Protocol Views, native projection, and field comparisons | Informative guide |
| [`rule-history-0.8.md`](rule-history-0.8.md) | How rules relate to MCP Description versions and protocol revisions, and how each rule compares with the 0.8.0 requirements | Informative investigation |
| [`rule.schema.json`](rule.schema.json) | Rule-format `1.2.0`: registry files, aggregate catalog, unchecked requirements, manifest, and discovery index schemas | Pilot; versioned publication is verified separately |
| [`result.schema.json`](result.schema.json) | Validation result format `1.0.0`: validity, diagnostics, and rule results (Proposal 0031) | Pilot; published with the catalog, verified separately |
| [`result-format-changelog.md`](result-format-changelog.md) | Validation result format versions and consumer migration | `1.0.0` for Draft 4 |
| [`CHANGELOG.md`](CHANGELOG.md) | Rule-format versions, publication-contract compatibility, and consumer migration | `1.2.0` for Draft 4, `1.1.0` published for Draft 3, `1.0.0` superseded before use; catalog content history stays in the specification changelog |
| [`rules/`](rules/) | Validation rule records in YAML, one file per surface | Pilot: the records cite fixtures with checked outcomes; `scripts/test-validation-rules.mjs` checks them and reports the counts |
| [`unchecked-requirements.yaml`](unchecked-requirements.yaml) | Requirement anchors that no rule checks, each with a reason (`runtime`, `processing`, or `guidance`) and a note | Pilot: published in the catalog as `uncheckedRequirements` |
| `mcp-schemas/` | Byte-identical copies of the official MCP schemas, one folder per supported revision (`<revision>/schema.ts`, `<revision>/schema.json`), the upstream `LICENSE`, and `manifest.json` recording repository, commit, source paths, and SHA-256 digests | Pinned at upstream commit `dae694f61a31f7a3ec2af3aff709e11f70f61e48`; digests checked by `scripts/test-validation-rules.mjs` |

The folder is part of the versioned specification: it is frozen with each
release, so the rules and pinned MCP schemas used by a release never change
after publication.

### MCP sources of truth

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
pinned to an upstream commit (see
[How validation works](../guides/understanding-mcp-protocol-versions.md#reference-baseline)).

When sources disagree:

| Conflict | Outcome |
| --- | --- |
| Prose example versus `schema.ts` structure | `schema.ts` |
| `schema.json` versus `schema.ts` | `schema.ts`; probable generator defect, reported upstream |
| `number` in `schema.ts` versus `integer` in `schema.json` | Integer: MCP generates `schema.json` with `--defaultNumberType integer`, so an unannotated `number` denotes an integer and `@TJS-type number` a number (Proposal 0029); not a generator defect |
| Prose requirement that `schema.ts` cannot express | Prose |
| Embedded-schema dialect versus schema syntax that the `Tool` type in `schema.ts` restricts, from MCP 2025-11-25 | The dialect decides validity; the restriction is reported as a warning, and native projection fails for the revisions concerned (Proposal 0032) |
| Prose and `schema.ts` genuinely contradict | Recorded as an arbitration with the upstream issue; never resolved from SDK behavior alone |
| SEP versus current specification | Current specification |
| SDK versus released specification | Released specification |

The requirement level of the source matters: a `SHOULD` in MCP is a
recommendation, so an MCP rule at that level produces warnings, not errors.

#### Source tiers

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

### Ownership model

Every requirement has exactly one owner, recorded as the rule's `owner`. A
structure can involve requirements of several owners:

| Owner | Examples | Authority | Unknown fields |
| --- | --- | --- | --- |
| MCP Description (`mcpdesc`) | `info`, transports, security, tags, examples, protocol scoping, components | This specification | As defined by MCP Description |
| MCP (`mcp`) | Tool, Resource, ResourceTemplate, Prompt, capabilities, results, annotations, `_meta` | The applicable MCP revision | As permitted by that revision |
| Embedded standard (`json-schema`) | Tool `inputSchema` and `outputSchema` (JSON Schema) | The declared or default dialect, plus semantics the MCP revision adds | As defined by the dialect |

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

### Examples fail fast

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

### Rule records

Each validation rule has a permanent identifier and a record:

| Field | Meaning |
| --- | --- |
| `id` | Permanent, owner-namespaced identifier, for example `mcp.tool.output-schema.object-root`. Never reused; retired identifiers stay reserved. Protocol revisions are not part of the identifier. |
| `owner` | `mcp`, `mcpdesc`, or `json-schema` |
| `title` | Required informative plain-text name, at most 60 characters; unique in the registry, sentence case, no trailing period |
| `summary` | Required informative statement of the precise requirement; not shortened to fit navigation |
| `description` | Required informative Markdown explanation for authors, at most 800 characters and three short paragraphs; relative links resolve from the specification folder |
| `surface`, `path` | Native type and field the rule applies to |
| `documentSchema` | Optional locations in the canonical MCP Description schema whose failures the rule reports, as JSON Pointer fragments such as `#/$defs/tool`; see [Rules in diagnostics](#rules-in-diagnostics) |
| `kind` | structural, semantic, preservation, embedded-standard, mcpdesc-semantic, completeness, or interoperability |
| `requirement` | Requirement level of the source: must, should, or may |
| `applicability` | Required for active rules, not inferred from owner. `protocolVersions` is either `independent` or a complete protocol-version map (`applies`, `opaque`, `not-applicable`, or an explained custom behavior). Optional `schemaDialects` lists canonical dialect URIs separately. A check can depend on both dimensions. Retired records may omit applicability. |
| `specification` | MCP Description requirements the rule checks and the decisions behind it, each with precise `locations` (see below) |
| `sources` | External evidence, such as MCP's schema and specification text, by authority tier, each with precise `locations`; optional for `mcpdesc` rules |
| `enforcement` | `internal` for a check of the candidate validator, `official-schema`, or `external` for a check that another operation performs, such as native projection in `@mcpdesc/core`; the candidate validator neither performs nor reports external checks |
| `status` | internal, externally-verified, delegated, arbitrated, or retired |
| `fixtures` | Evidence for each revision boundary: a fixture `path`, a JSON `pointer` to the fragment that illustrates the rule (`""` for the whole document), and its checked `outcome`: `passes`, `error`, `warning`, or `not-applicable`. The path is relative to `fixtures/`, names a native projection case under `projection-fixtures/`, names a view or merge case under `view-fixtures/`, or names a file under `serialization-fixtures/`, cited whole with the pointer `""`: `passes` when decoding accepts it and `error` when decoding rejects it |
| `gaps` | Known differences from current validator behavior: `planned` for correction, or `not-fixed` for historical revisions |
| `notes` | Optional maintainer information, such as implementation and testing remarks |

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
before the requirement sentence. It covers that sentence and the following
sentences of the same paragraph, list item, or table row, up to the next
anchor. Its identifier names the requirement, not a rule, and is permanent:
one requirement can be checked by several rules, and one rule can check
several requirements.

Every anchor is either cited by a rule or listed in
[`unchecked-requirements.yaml`](unchecked-requirements.yaml), never both. An
unchecked requirement has a `reason`: `runtime` for behavior of MCP clients,
servers, or consumers; `processing` for behavior of MCP Description tools that
document fixtures cannot show, such as preservation or network access; or
`guidance` for an authoring choice the document cannot decide. Every
obligation sentence (MUST, SHALL, SHOULD, REQUIRED, RECOMMENDED, and their
negations) is covered by an anchor (Proposal 0033); key words quoted as words,
as in the RFC 2119 boilerplate, state no obligation.

Fixture pointers select the fragment of the fixture document that a reader
needs. When the fragment is a reusable component, the pointer selects the
component value under `/components/`, because diagnostics are reported at use
sites. The outcome states what the rule reports within the fragment:

| Outcome | Validation fixture | Projection, view, or merge case |
| --- | --- | --- |
| `passes` | The rule runs there and reports nothing | The case expects a value or document |
| `error` | The rule reports an error there | The case expects a failure |
| `warning` | The rule reports a warning there | Not used |
| `not-applicable` | The rule does not run there for a protocol version it applies to, for example because the fragment is scoped to other versions | Not used |

A fragment showing both severities is cited as narrower fragments. A cited
`expected-invalid` fixture shows what the rule reports. A projection, view, or
merge case that expects a failure is cited by the rule whose requirement
defines that failure.

Outcomes are checked against the candidate validator's
[rule results](#rule-results) and the evaluations behind them. `passes` needs
an evaluation of the rule within the fragment, or containing it, for a
protocol version the rule applies to, and a `passed` result for the document;
`error` and `warning` need a matching result. A `passes` or `not-applicable`
outcome is cited only in a fixture without errors: the candidate validator
skips semantic checks when the document schema fails, so silence there would
not show what a rule checks. A preservation rule, such as
`mcp.tool.schema-keywords.preserve`, concerns what software does with a
document later, so it cites the view and merge cases in
[`../view-fixtures/`](../view-fixtures/) instead of validation fixtures.

`scripts/test-validation-rules.mjs` resolves every location, anchor, and
pointer, checks every outcome against the candidate validator or the
projection case, checks that every anchor is cited or listed as unchecked, that
every obligation sentence is anchored, and that every canonical
schema definition has exactly one owner, and reports the catalog coverage. It
also validates the candidate validator's result for every fixture against
[`result.schema.json`](result.schema.json) and checks the rule results: one
per rule and declared version, `passed` only with a recorded evaluation, no
`passed` or `not-applicable` for a check in a skipped stage, and diagnostic
protocol versions within the rule's applicability.

Rules are anchored to the MCP type, not to where MCP Description carries it.
For example, one rule covers `Annotations.lastModified` wherever annotations
appear. Applicability describes the check, not ownership or type availability.
`applies` means checked, not that a field is allowed. `independent` means the
check does not vary by MCP protocol version; another rule may still limit
where its input type is available. Dialect information does not permit a
validator to skip unsupported-dialect errors.

There are no named rulesets. A catalog contains the records for one
specification snapshot. A website may filter that catalog by owner, protocol
version, dialect, surface, or lifecycle, but such a view is not a validation
profile and must not imply that omitted checks are optional.

A later specification explicitly publishes its own catalog. Retained
requirements keep their permanent IDs; materially changed requirements receive
new IDs. Retired records remain in the full catalog with `status: retired`
and an explanation in `description`, but are excluded from active checking
and applicability filtering. Retirement is local to that catalog and changes
neither earlier snapshots nor the reserved meaning of the ID. Improved
implementation coverage is not retirement. No replacement-link field is added
until a concrete case needs it.

The catalog can support a derived history across snapshots without per-rule
specification-version ranges. First publication of a record is not proof that
its underlying requirement first appeared in that specification version.
Draft 2's historical investigation is in
[`rule-history-0.8.md`](rule-history-0.8.md).

When authoritative sources disagree, MCP Description records an explicit
arbitration: the conflicting sources, the chosen authority (normative MCP text
by default), the rationale, an upstream reference, and when to revisit it.
An arbitration is `active` when decided, `proposed` while it awaits a
maintainer decision (validator behavior is then unchanged, and any difference
is recorded as a gap), or `retired`.

### Rules in diagnostics

A diagnostic identifies the rule it reports in a `rule` property, with its
`severity` and `path` ([Section 16.5](../sections/16-conformance.md#req-diagnostic-rule)).
When the finding depends on MCP protocol versions, `protocolVersions` lists
them. The candidate validator also reports its own `code` and a `message`:

```json
{
  "code": "schema-validation",
  "severity": "error",
  "message": "does not validate against 0.9.0: /tools/0/annotations must NOT have additional properties",
  "path": ["tools", 0, "annotations", "audience"],
  "rule": "mcp.tool-annotations.members"
}
```

`rule` names the requirement and is the interoperable contract. `code` belongs
to the producer: it is optional, categorizes that validator's output, can be
shared by several rules, and can differ in another implementation, so rule
records do not list codes. A producer that keeps codes may publish its own
mapping from codes to rules and test it against the fixtures
([Proposal 0031](../proposal-snapshots/0031-rule-level-validation-results.md)).
Every candidate-validator diagnostic identifies a registered rule.

A document-schema failure belongs to the rule whose `documentSchema` lists the
longest JSON Pointer containing the failing schema location (Proposal 0033).
Every canonical schema definition and the document root have exactly one
owner; `mcpdesc.document.schema` owns only the root and generic JSON values.
When a value fails a `oneOf` or `anyOf`, failures in the alternative that best
matches the value belong to the owners of their own locations, and failures in
the other alternatives to the owner of the location offering the
alternatives. Which alternative matches best is implementation-defined; the
candidate validator chooses the one whose failures reach deepest into the
value, then the one with the fewest failures, then the first.

`scripts/test-validation-rules.mjs` checks that every fixture diagnostic
identifies a registered, active rule, that every severity a rule reports in
the fixtures is backed by a citation with that outcome, that `should`- and
`may`-level MCP rules report no errors, and that every rule identifier the
candidate validator references is registered.

### Rule results

Diagnostics show only what failed. Rule results also show what was checked
([Section 16.5](../sections/16-conformance.md#req-rule-results)): one entry per
rule and protocol version declared by the document, or one entry for a rule
whose applicability is `independent`. The
[validation result format](result.schema.json)
(`https://mcpdesc.org/schema/validation-result/1.0.0.json`) defines the shape:

```json
{
  "valid": false,
  "diagnostics": [],
  "results": [
    { "rule": "mcp.tool.output-schema.object-root", "protocolVersion": "2025-11-25", "status": "failed" },
    { "rule": "mcp.tool.output-schema.object-root", "protocolVersion": "2026-07-28", "status": "not-applicable" },
    { "rule": "mcpdesc.tags.references", "status": "passed" },
    { "rule": "mcp.tool.schema-keywords.preserve", "protocolVersion": "2025-11-25", "status": "not-evaluated", "reason": "operation" },
    { "rule": "mcpdesc.projection.native-schema", "protocolVersion": "2025-11-25", "status": "delegated" }
  ]
}
```

| Status | Meaning |
| --- | --- |
| `passed` | The check ran for that version and found nothing |
| `failed` | The check reported at least one error |
| `warning` | The check reported warnings but no error |
| `not-applicable` | The rule does not apply to that version, or the document contains nothing it checks |
| `not-evaluated` | The check applies but did not run; the optional `reason` is `earlier-stage-failed`, `not-implemented`, or `operation` (another operation, such as projection or merge, checks it) |
| `delegated` | Another operation, such as decoding or native projection, performs the check |

A status comes from the checks that ran, never from silence. Read
`not-applicable` and `not-evaluated` as "not confirmed", never as passed. For
legacy compatibility revisions, checks the validator does not apply are never
`passed`. Rule results do not change validity, which errors alone determine.
Finer results, such as per declaration or path, are each implementation's
choice.

The candidate validator records an evaluation each time a check examines a
subject: JSON Schema validation records the instances evaluated at every
location a rule owns, and each semantic check records the subject and
versions it examined. A rule is `passed` for a version only when an evaluation
concerns that version, so a `passes` fixture citation shows that the rule ran
within the cited fragment. Its exported validator snapshot returns the
result with `results` from `validate()`.

### Catalog publication and discovery

The rule-format version describes the data structure; the catalog snapshot
identifies the specification requirements and documentation published together.
The [rule-format changelog](CHANGELOG.md) records format and publication-contract
changes; the [specification changelog](../CHANGELOG.md) records rule-content
changes by draft.
Format `1.1.0` is the format of the Draft 3 catalog. Format `1.0.0` was
published first but is used by no catalog; neither is a retroactive name for
the schemas in earlier drafts. Format `1.2.0`, for Draft 4, adds
`documentSchema` and `uncheckedRequirements`, and Draft 4 manifests list the
validation result schema as `resultSchema`; the
[result-format changelog](result-format-changelog.md) records its versions.
No 0.8.0 catalog is published by
this work.

| Resource | Publication target |
| --- | --- |
| Rule-format schema | `https://mcpdesc.org/schema/validation-rule/1.2.0.json` (Draft 3: `1.1.0.json`) |
| Validation result schema | `https://mcpdesc.org/schema/validation-result/1.0.0.json` (from Draft 4) |
| Draft 3 manifest | `https://mcpdesc.org/validation/catalogs/0.9.0-draft.3/manifest.json` |
| Draft 3 aggregate | `https://mcpdesc.org/validation/catalogs/0.9.0-draft.3/rules.json` |
| Draft 4 manifest | `https://mcpdesc.org/validation/catalogs/0.9.0-draft.4/manifest.json` |
| Draft 4 aggregate | `https://mcpdesc.org/validation/catalogs/0.9.0-draft.4/rules.json` |
| Mutable discovery index | `https://mcpdesc.org/validation/catalogs/index.json` |

The schema's root validates `{ "rules": [...] }` in authored YAML files and
the generated JSON aggregate, which also carries `uncheckedRequirements`. The
fragments `#/$defs/catalog-manifest`, `#/$defs/catalog-index`, and
`#/$defs/unchecked-requirements` validate the manifest, the index, and
`unchecked-requirements.yaml`. The exporter
sorts all records by permanent ID, preserving every field, including
preservation, delegated, and retired records if any are present.

The manifest records `ruleFormatVersion`, `mcpdescVersion`, `snapshot`,
publication `status`, source repository/tag/commit/specification path,
`ruleCount`, and schema/catalog URLs and SHA-256 digests, including the
validation result schema when the snapshot defines one. Its
`specificationBaseUrl` points at the immutable tagged specification folder.
The manifest's publication status is separate from individual rule statuses
such as `delegated` or `arbitrated`.

Resolve relative specification and source locations and Markdown description
links from that base. Ordinary fixture paths resolve under its `fixtures/`;
`projection-fixtures/`, `view-fixtures/`, and `serialization-fixtures/` paths
resolve directly from the base. JSON Pointers
select fixture data, not Markdown headings, and must not be used as invented
browser anchors. Existing vendored schema line references and requirement
anchors retain their own meanings.

The index contains `catalogs`, `currentStable`, and `currentDraft`. Pointers
are manifest URLs or `null`, never npm dist-tags. Since 0.8.0 has no registry,
the initial stable pointer is `null`; it must not point to a 0.9.0 draft.
Consumers discover through the index, then pin an immutable manifest.

The source repository generates the artifacts; mcpdesc.org hosts those bytes
unchanged and renders the same records. The website owns presentation, not a
second set of authored rule summaries. Publishing a specification tag alone
does not prove catalog deployment or downstream validator coverage.

Versioned schema and catalog URLs never change bytes. A wording correction
still needs a new authorized catalog identity. Required-field changes or fields
rejected by a prior format's closed schema need a major rule-format version;
compatible additions are minor only where the previous schema permitted them.
Schema documentation corrections use a new patch-version URL. No per-rule
specification-version range is added: snapshot membership supplies that scope.
Two recorded exceptions predate every catalog: `1.1.0` uses a minor number for
changes incompatible with `1.0.0`, and its first deployed bytes, whose envelope
constants still named `1.0.0`, are replaced once. `1.2.0` likewise uses a minor
number for fields that the closed `1.1.0` record schema rejects; see the
[rule-format changelog](CHANGELOG.md).

See the [catalog publication procedure](../../../scripts/README.md#validation-catalog-publication)
for preparation, immutable deployment, and index updates. Live verification is
opt-in; ordinary `npm test` does not fetch these endpoints.
