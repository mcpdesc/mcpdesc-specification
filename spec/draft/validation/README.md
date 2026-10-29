# Validation

<!-- mcpdesc:validation-overview:start -->

Validation rules explain the checks used to determine whether an MCP
Description document is valid and identify issues that need attention.

## What validation rules cover

A document is checked as valid in three areas:

- **MCP:** the described tools, resources, prompts, capabilities, or carried
  MCP values do meet the requirements of the applicable protocol
  version.
- **JSON Schema:** an embedded Tool input or output schema is valid under
  its applicable JSON Schema structure.
- **MCP Description:** complementary description fields, protocol scoping,
  references, or examples do meet the requirements of the the MCP Description specifications.

The catalog groups rules by these three owners, recorded as
`mcp`, `json-schema`, and `mcpdesc`.

A single Tool declaration may involve
rules from all three groups:
- its MCP fields and annotations follow MCP rules,
- its `inputSchema` must be valid JSON Schema,
- and its documentation follows the MCP
Description rules for each protocol version scope.
- also, its examples are checked against MCP's result types and
against MCP Description's example rules.

## Why explicit validation rules?

MCP Description provides static descriptions of MCP servers across the MCP protocol revisions that a specification version supports: for mcpdesc 0.9.0, MCP protocol versions
2024-11-05 through 2026-07-28 are supported.

The same field can be required in one protocol version,
undefined in another, and governed by a JSON Schema dialect rather than by MCP.

A validation failure without that context does not tell an author what to fix.

For more information on MCP protocol versions, variations across versions and how MCP Description has organized with this complexity, we recommend to check the guide: [How MCP protocol versions are managed](../guides/understanding-mcp-protocol-versions.md).

## How to use the catalog

Each rule records which specification owns the requirement, which protocol
revisions it applies to, and where the requirement comes from.

The catalog
helps users and tools identify whether a problem concerns MCP structures,
embedded JSON Schema, or MCP Description semantics.

Each rule has a permanent identifier, such as `mcp.tool-annotations.members`.
Utility tools can use this identifier to refer to a particular rule and trace provenance in a diagnostic.

Each record also has a short `title`, a precise requirement `summary`, and a
reader-oriented `description`. Titles help you scan the catalog; descriptions
explain what a check means and how to address it. They do not replace the
specification requirements.

A diagnostic carries both a `rule` and a `code`. The `rule` identifies the
requirement. The `code` names the kind of failure and can be shared by several
rules: every JSON Schema failure of the document, for example, has the code
`schema-validation`, whichever rule it belongs to.

To act on a diagnostic:

1. Find the diagnostic's `rule` identifier in the catalog.
2. Check the diagnostic's severity and the rule's protocol-revision
   applicability.
3. Read the requirement, its source references, and the rule's examples.
4. Correct the document and validate it again.

Errors make a document invalid; warnings do not:

- **Error:** a Tool annotation contains `audience`, which Tool Annotations do
  not define. See the [worked example](#worked-example) below.
- **Warning:** an example result contains `vendorTrace`, which its MCP
  revision does not define but the open result type permits. The document
  remains valid, and the field is preserved without assigning it protocol
  meaning. See the complete
  [warning fixture](../fixtures/expected-warning/open-result-unknown-properties.json)
  and rule `mcp.result.additional-properties.preserve` in
  [`rules/result.yaml`](rules/result.yaml).

### Guarantees that tools must uphold

Not every rule reports a problem with your document. Some describe guarantees
that tools must uphold, such as retaining custom keywords in embedded schemas.
These are checked by conformance tests rather than reported as document errors
or warnings.

For example, `mcp.tool.schema-keywords.preserve` in
[`rules/tool.yaml`](rules/tool.yaml) requires tools to retain custom keywords
such as `x-example-field-id` in an embedded Tool schema:

```json
{
  "type": "object",
  "properties": {
    "account": { "type": "string", "x-example-field-id": 123 }
  }
}
```

This is a schema fragment, not a complete MCP Description document. The custom
keyword does not itself cause an error or warning. If a tool silently discards
it, that is an implementation defect, not a mistake by the document author.
Recognized JSON Schema keywords such as `type` still have their normal meaning.
The complete
[custom-keywords fixture](../fixtures/expected-valid/custom-tool-schema-keywords.json)
illustrates this guarantee.

### Checks performed by other operations

Some rules are checked outside document validation. For example, native MCP
projection checks that the projected value validates against the MCP schema for
the requested revision. A failure is reported by the projection operation,
not by the document validator. The catalog calls these checks *delegated*;
see [`rules/projection.yaml`](rules/projection.yaml).

### Worked example

The fixture
[`expected-invalid/tool-annotations-unknown-property.json`](../fixtures/expected-invalid/tool-annotations-unknown-property.json)
is a complete document declaring a Tool for MCP 2025-11-25. Its Tool
annotations are:

```json
{ "readOnlyHint": true, "audience": ["user"] }
```

The candidate validator reports:

```json
{
  "code": "schema-validation",
  "severity": "error",
  "message": "does not validate against 0.9.0: /tools/0/annotations must NOT have additional properties",
  "path": ["tools", 0, "annotations", "audience"],
  "rule": "mcp.tool-annotations.members"
}
```

1. The rule is recorded in [`rules/annotations.yaml`](rules/annotations.yaml):
   a Tool annotations object contains only `title`, `readOnlyHint`,
   `destructiveHint`, `idempotentHint`, and `openWorldHint`.
2. The severity is `error`, so the document is invalid. The rule applies from
   MCP 2025-03-26, the first revision with Tool annotations, so it applies to
   this Tool.
3. The requirement is in [Section 9.6](../sections/09-tools.md#req-tool-annotations-closed),
   and the source is MCP's `ToolAnnotations` type, which is closed in every
   revision. `audience` belongs to Resource Annotations (Section 10.3); the
   fixture
   [`expected-valid/distinct-tool-and-resource-annotations.json`](../fixtures/expected-valid/distinct-tool-and-resource-annotations.json)
   shows both kinds side by side.
4. Removing `audience` from the Tool annotations makes the document valid;
   validating it again reports no diagnostics.

## Status and scope

The normative requirements are those of the specification sections. The rule
catalog is a pilot registry implementing review-stage
[Proposal 0024](../proposal-snapshots/0024-validation-rule-identity-and-provenance.md),
extended by review-stage
[Proposal 0030](../proposal-snapshots/0030-readable-and-complete-rule-records.md).
Neither proposal is accepted. The pilot registry documents and tests the
requirements; its reader fields are informative and it is not a separate
document-conformance specification.

Catalogs belong to exact MCP Description snapshots, not validator package
versions. Once deployed, the [catalog discovery index](https://mcpdesc.org/validation/catalogs/index.json)
lists the published manifests, with separate stable and draft pointers. The
Draft 3 catalog and rule-format `1.0.0` endpoints are publication targets until
deployment is verified; this working tree does not imply they are live. See
[catalog publication and discovery](#catalog-publication-and-discovery).

Every diagnostic of this repository's candidate validator identifies a
registered rule. Published prereleases implement the registry and native MCP
projection for Community Working Draft 1 (`0.9.0-draft.1`), when that selector
is passed explicitly:

- [`@mcpdesc/validator@0.14.0-rc.1`](https://www.npmjs.com/package/@mcpdesc/validator/v/0.14.0-rc.1)
  reports the `rule` of each diagnostic.
- [`@mcpdesc/core@0.13.0-rc.1`](https://www.npmjs.com/package/@mcpdesc/core/v/0.13.0-rc.1)
  implements native MCP projection, tested against the specification's
  projection fixtures.

Both are prereleases, not stable releases. Install them by exact version: the
npm `next` dist-tag moves to later prereleases. Support for later drafts
follows in later releases.

<!-- mcpdesc:validation-overview:end -->

## Reference

The rest of this document is the technical reference for rule authors and tool
implementers. This folder collects the material MCP Description uses to
validate documents against the MCP protocol revisions they describe: every
MCP-related validation behavior states who owns it, which MCP revisions it
applies to, where it comes from, and how it is tested. Design background is
tracked in [issue #72](https://github.com/mcpdesc/mcpdesc-specification/issues/72).

### Layout

| Path | Content | Status |
| --- | --- | --- |
| [How MCP protocol versions are managed](../guides/understanding-mcp-protocol-versions.md) | Protocol scopes, validation across protocol versions, Effective Protocol Views, native projection, and field comparisons | Informative guide |
| [`rule-history-0.8.md`](rule-history-0.8.md) | How rules relate to MCP Description versions and protocol revisions, and how each rule compares with the 0.8.0 requirements | Informative investigation |
| [`rule.schema.json`](rule.schema.json) | Rule-format `1.0.0`: registry files, aggregate catalog, manifest, and discovery index schemas | Pilot; versioned publication is verified separately |
| [`rules/`](rules/) | Validation rule records in YAML, one file per surface | Pilot: the records declare every candidate diagnostic code; `scripts/test-validation-rules.mjs` checks them and reports the counts |
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
[How MCP protocol versions are managed](../guides/understanding-mcp-protocol-versions.md#reference-baseline)).

When sources disagree:

| Conflict | Outcome |
| --- | --- |
| Prose example versus `schema.ts` structure | `schema.ts` |
| `schema.json` versus `schema.ts` | `schema.ts`; probable generator defect, reported upstream |
| `number` in `schema.ts` versus `integer` in `schema.json` | Integer: MCP generates `schema.json` with `--defaultNumberType integer`, so an unannotated `number` denotes an integer and `@TJS-type number` a number (Proposal 0029); not a generator defect |
| Prose requirement that `schema.ts` cannot express | Prose |
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
| `kind` | structural, semantic, preservation, embedded-standard, mcpdesc-semantic, completeness, or interoperability |
| `requirement` | Requirement level of the source: must, should, or may |
| `applicability` | Required for active rules, not inferred from owner. `protocolVersions` is either `independent` or a complete protocol-version map (`applies`, `opaque`, `not-applicable`, or an explained custom behavior). Optional `schemaDialects` lists canonical dialect URIs separately. A check can depend on both dimensions. Retired records may omit applicability. |
| `specification` | MCP Description requirements the rule checks and the decisions behind it, each with precise `locations` (see below) |
| `sources` | External evidence, such as MCP's schema and specification text, by authority tier, each with precise `locations`; optional for `mcpdesc` rules |
| `diagnostics` | Diagnostic codes emitted |
| `enforcement` | Internal check, official schema, or external implementation, such as native projection in `@mcpdesc/core` |
| `status` | internal, externally-verified, delegated, arbitrated, or retired |
| `fixtures` | Tests covering each revision boundary: a fixture `path` and a JSON `pointer` to the fragment that illustrates the rule (`""` for the whole document). The path is relative to `fixtures/`, or names a native projection case under `projection-fixtures/` |
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

### Catalog publication and discovery

The rule-format version describes the data structure; the catalog snapshot
identifies the specification requirements and documentation published together.
Format `1.0.0` is the first numbered format, not a retroactive name for the
schemas in earlier drafts. No 0.8.0 catalog is published by this work.

| Resource | Publication target |
| --- | --- |
| Rule-format schema | `https://mcpdesc.org/schema/validation-rule/1.0.0.json` |
| Draft 3 manifest | `https://mcpdesc.org/validation/catalogs/0.9.0-draft.3/manifest.json` |
| Draft 3 aggregate | `https://mcpdesc.org/validation/catalogs/0.9.0-draft.3/rules.json` |
| Mutable discovery index | `https://mcpdesc.org/validation/catalogs/index.json` |

The schema's root validates `{ "rules": [...] }`, both in authored YAML files
and in the generated JSON aggregate. The fragments `#/$defs/catalog-manifest`
and `#/$defs/catalog-index` validate the other two resources. The exporter
sorts all records by permanent ID, preserving every field, including
preservation, delegated, and retired records if any are present.

The manifest records `ruleFormatVersion`, `mcpdescVersion`, `snapshot`,
publication `status`, source repository/tag/commit/specification path,
`ruleCount`, and schema/catalog URLs and SHA-256 digests. Its
`specificationBaseUrl` points at the immutable tagged specification folder.
The manifest's publication status is separate from individual rule statuses
such as `delegated` or `arbitrated`.

Resolve relative specification and source locations and Markdown description
links from that base. Ordinary fixture paths resolve under its `fixtures/`;
`projection-fixtures/` paths resolve directly from the base. JSON Pointers
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

See the [catalog publication procedure](../../../scripts/README.md#validation-catalog-publication)
for preparation, immutable deployment, and index updates. Live verification is
opt-in; ordinary `npm test` does not fetch these endpoints.
