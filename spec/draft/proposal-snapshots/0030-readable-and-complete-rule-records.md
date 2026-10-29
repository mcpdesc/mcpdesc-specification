# Proposal 0030: Readable and Complete Rule Records

- Status: Review
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

Make every validation rule record readable at three levels, with explicit
applicability and catalog-local lifecycle:

- a short `title` that names the rule;
- the existing `summary`, which states the precise requirement;
- a `description` that explains why the rule exists, what it means for
  authors, the usual mistake, and its fix;
- rule-specific protocol applicability, including explicit protocol independence,
  and separate JSON Schema dialect information where relevant;
- retirement recorded within each catalog, without changing older snapshots;
- a publicly discoverable, immutable JSON catalog and rule-record schema.

Specification-version membership stays at the snapshot level. No per-rule
version field is added. A separate rule-format version identifies the schema
for records; the catalog snapshot identifies the exact MCP Description
requirements and documentation published together.

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

**Publication.** The rule schema and YAML records are public in GitHub, but
the schema has no `$id` and there is no machine-readable discovery endpoint
for catalogs. Third parties must traverse repository files, while the website
maintains its own import logic. A human-facing catalog alone is not a stable
interface for validators, editors, or other catalogs.

## Goals

- Give every rule a short title and a reader-oriented explanation from the
  specification itself, so catalogs and tools do not make up their own.
- Distinguish specification membership, lifecycle, protocol applicability, and
  JSON Schema dialect information without overloading ownership.
- Keep the precise requirement statement unchanged.
- Check the new fields in `scripts/test-validation-rules.mjs`.
- Publish a versioned schema and a complete catalog for each authorized
  specification snapshot, with provenance, digests, and explicit link bases.
- Let third parties discover available catalogs without scraping the website.

## Non-goals

- Changing rule identifiers, summaries, diagnostics, or validator behavior.
- Per-rule specification-version ranges or a global lifecycle timeline
  (see `spec/draft/validation/rule-history-0.8.md`).
- Website presentation, such as navigation or grouping by surface.
- Publishing a retrospective 0.8.0 registry, rewriting existing snapshot tags,
  or silently adding publication artifacts to Draft 1 or Draft 2.

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

### 2. Rule-specific applicability

Ownership identifies the authority behind a requirement, not the dimensions
that make its check applicable. An MCP Description-owned check can depend on
the MCP protocol version; a JSON Schema-owned check can depend on both the
protocol version and the embedded dialect. Applicability therefore MUST NOT
change meaning solely according to `owner`.

Three questions are kept separate:

| Question | Representation principle |
| --- | --- |
| Which MCP Description specification snapshot defines this record? | Catalog membership and the manifest, not a repeated selector in each rule |
| Does the check depend on MCP protocol versions? | Explicit protocol applicability, or an explicit statement of protocol independence |
| Which embedded JSON Schema dialects are relevant? | Separate dialect information where needed, not a substitution for protocol applicability |

Protocol independence MUST NOT be inferred from an omitted field or from the
rule's owner. Repeating `applies` for every protocol version is not a substitute
for distinguishing a genuinely independent check from a version-sensitive one.
A dialect support list must not cause an unsupported dialect to escape the
check that reports it as unsupported.

For version-dependent checks, the existing behavior meanings remain:

| Value | Meaning |
| --- | --- |
| `applies` | The rule is checked for documents, declarations, or values in that revision. It does not mean that a field is allowed: a rule that rejects a field before a revision applies to the earlier revisions. |
| `opaque` | The field or keyword may appear and is preserved, but the rule's MCP semantics are not checked. |
| `not-applicable` | The rule is not checked for that revision. |
| other value | Rule-specific behavior, which the rule's `description` MUST explain. |

An `applies` entry describes a conditional check, not an assertion that the
same internal branches or failures occur in every protocol version. Delegated
checks follow the same distinction; delegation describes who performs a check,
not whether it is protocol-independent.

The representation is an `applicability` object, required for active rules:

| Field | Meaning |
| --- | --- |
| `protocolVersions` | Required: either the literal `independent` or a map listing every supported MCP protocol version with the behaviors above |
| `schemaDialects` | Optional non-empty list of canonical dialect URIs relevant to the check; support information, not an execution filter |

An independent check still runs only where its input occurs; its containing
MCP type need not be available in every protocol version. The embedded-schema
rule records both its protocol map and JSON Schema 2020-12/draft-07 dialects.
It still rejects unsupported declared dialects rather than filtering them out.
The first implementation classifies 23 checks as independent and 40 as
protocol-dependent. Existing IDs and requirement meanings are preserved.

### 3. Catalog views, not named rulesets

Named rulesets from Proposal 0024, Section 4, are removed: neither
`mcpdesc.core` nor `mcpdesc.mcp.<version>` is defined by this proposal.
The catalog is the complete set of records published with a snapshot.
Consumers may filter it by owner, protocol applicability, dialect, surface, or
lifecycle for browsing and analysis, without separately authored group lists.

A filtered view is not a validation profile. It MUST NOT be presented as
permission to skip other required checks or as evidence that a tool provides
complete document validation. Retired records remain discoverable but are
excluded from active applicability filtering. A standardized validation profile
would require its own explicit membership and conformance contract.

### 4. Rule-format version and catalog snapshot

Two identities are published independently:

| Identity | Example | Meaning |
| --- | --- | --- |
| Rule-format version | `1.0.0` | The machine-readable structure of rule records and the publication envelopes defined here |
| Catalog snapshot | `0.9.0-draft.3` | The exact registry belonging to an immutable MCP Description specification tag |

The catalog also records `mcpdescVersion`, for example `0.9.0`. A catalog
snapshot is not a validator implementation release. Its existence neither
selects a validator package version nor proves implementation coverage.

The first published rule-format version is `1.0.0`, incorporating this
proposal's fields. Earlier unversioned schemas are not retroactively called
`1.0.0`. A later catalog can reuse the same format version when only rule
content changes. A different format version does not itself change document
validity or rule meanings.

Rule-format versions use SemVer. Removing or renaming fields, adding required
fields, or adding fields rejected by a previous schema's
`additionalProperties: false` requires a major version. An additive field is
minor only when the previous format explicitly permits it. Editorial schema
documentation corrections are patch versions, published at a new URL; no
versioned schema URL is overwritten. Permanent rule identifiers keep their
meaning across catalogs as required by Proposal 0024.

### 5. Catalog membership and retirement

Each specification snapshot explicitly publishes its own catalog. A catalog
for 0.10.0 or a later version does not automatically inherit every record from
0.9.0, and a rule's presence in one catalog promises nothing about future
membership.

| Change in a later specification | Treatment |
| --- | --- |
| Requirement retained with the same meaning | Retain its permanent ID |
| Informative explanation corrected without changing meaning | Retain its ID and publish the revised wording only under a new authorized catalog identity |
| Requirement materially changed | Introduce a new ID and retain the old record as retired |
| Requirement removed | Retain a retired record as a historical marker |
| Implementation coverage improved | Retain its ID and update enforcement information; this is not requirement retirement |

Use the existing `status: retired` representation initially. Retirement is
local to that catalog: it does not change older catalogs or their validation
requirements. It MUST follow an explicit specification decision, never be
inferred from a validator no longer emitting a diagnostic.

A retired record retains its permanent ID and an explanation of retirement,
is discoverable in the full catalog, and is excluded from active checks and
applicability filtering. Its ID MUST NOT be reused for a different requirement.
Replacement links may be added when a concrete retirement requires them; no
`replacedBy` field is introduced by this decision alone. Reader fields and
historical references remain useful on a retired record, but active-rule
applicability requirements must not force invented execution conditions onto it.

A catalog renderer may derive a timeline by comparing immutable catalogs.
It MUST distinguish first publication of a rule record from first existence of
the underlying requirement. No speculative `since`/`until` specification range
or independently maintained global history database is required.

### 6. Immutable publication artifacts

Publish these HTTPS resources on mcpdesc.org:

```text
/schema/validation-rule/1.0.0.json
/validation/catalogs/0.9.0-draft.3/manifest.json
/validation/catalogs/0.9.0-draft.3/rules.json
```

The schema has the first URL as its absolute `$id`. Its root validates the
existing `{ "rules": [...] }` shape of registry files and the aggregate
`rules.json`. Its `$defs/catalog-manifest` and `$defs/catalog-index` validate
the publication manifest and discovery index respectively. Those envelopes
declare `$schema` using the corresponding fragment URI. They use the same
rule-format version, avoiding a separate envelope version counter.

The manifest has these required fields and no unspecified defaults:

| Field | Meaning |
| --- | --- |
| `$schema` | Absolute rule-schema URL ending in `#/$defs/catalog-manifest` |
| `ruleFormatVersion` | The exact rule-format version, such as `1.0.0` |
| `mcpdescVersion` | The specification's `mcpdesc` value, such as `0.9.0` |
| `snapshot` | Exact catalog selector, such as `0.9.0-draft.3` |
| `status` | `draft`, `release-candidate`, or `stable`; never inferred from format version |
| `source` | Repository URL, immutable tag, full commit ID, and specification-folder path at that commit |
| `ruleSchema` | Absolute schema URL and lowercase hexadecimal SHA-256 digest of its exact bytes |
| `catalog` | Absolute `rules.json` URL and lowercase hexadecimal SHA-256 digest of its exact bytes |
| `specificationBaseUrl` | Absolute immutable URL of the specification folder, with trailing slash |
| `ruleCount` | Number of records in `rules.json` |

The aggregate contains every rule record of the snapshot, including
preservation, delegated, and retired records if present; owner and protocol
filters are consumer views, not separate authored catalogs. YAML remains the
authoritative authoring format. The exporter parses it using the repository's
YAML parser, retains every record field, sorts records by permanent `id`, and
serializes deterministic JSON using the repository's canonical JSON utility.
Duplicate identifiers or invalid records fail generation.

Relative links are resolved against `specificationBaseUrl`, not the website
page or individual YAML file:

- `specification[].locations` and relative `sources[].locations` resolve from
  that base; absolute source URLs are unchanged;
- ordinary `fixtures[].path` values resolve under `fixtures/` at that base;
  paths starting with `projection-fixtures/` resolve directly from the base;
- relative Markdown links in `description` resolve from that base;
- fixture pointers select fragments within the referenced JSON document;
  they are not browser heading anchors. A renderer must interpret them or
  link to the source rather than invent a fragment URL.

For a draft snapshot the immutable base includes the tag and `spec/draft/`,
even though that folder moves on `main`. Consumers MUST NOT resolve evidence
against `main` or reinterpret an earlier snapshot using newer records.

Every versioned schema, manifest, and catalog URL MUST retain its exact
published bytes. Even an informative wording correction requires a new
authorized catalog identity; it cannot overwrite an existing snapshot URL.
This proposal adds no independently numbered documentation edition. If such
an edition is needed, its identity requires a separate explicit decision.

### 7. Catalog discovery

Publish a mutable index at:

```text
/validation/catalogs/index.json
```

It declares `$schema` with `#/$defs/catalog-index` and contains `catalogs`,
`currentStable`, and `currentDraft`. Each catalog entry contains its
`mcpdescVersion`, `snapshot`, `status`, and immutable manifest URL. The two
current pointers are manifest URLs or explicit `null`; neither is inferred
from ordering, npm dist-tags, or a redirect named `latest`.

The index lists only catalogs actually published, and the pointers refer to
entries in that list. Before publication succeeds, a pending catalog is not
discoverable there. Since 0.8.0 has no registry, `currentStable` is `null`
until a stable specification with a catalog is published. A draft catalog
MUST NOT be assigned to 0.8.0 or described as the stable catalog.

Consumers use the index for discovery, then pin an immutable manifest for
reproducibility. `currentDraft` identifies the maintained published draft,
not an unreleased working tree. A new draft leaves earlier catalogs available.

### 8. Generation, hosting, and publication checks

This repository owns deterministic generation and schemas. mcpdesc.org hosts
those artifacts unchanged and renders its human-facing catalog from the same
records. The site may add navigation, generated indexes/counts, and rendering;
it must not maintain a second authored set of rule descriptions or summaries.

An exporter generates a self-contained publication bundle from an exact clean
commit, an explicit snapshot identity, and a rule-format version. It verifies
the specification metadata, record schema, supported protocol versions, and
all relative locations. Final publication verifies that the annotated tag
resolves to that commit; an untagged preparation bundle is not a publication.
Generation must not require embedding its own future commit hash in tracked
source files.

`npm run rules:export -- <snapshot> <new-output> --prepare` allows a clean
untagged commit for review and schema deployment; the default export requires
an annotated tag at HEAD. `npm run rules:check-publication -- <snapshot>
<bundle> --schema-only` verifies only the format schema before tagging, not
catalog publication. Full publication verification requires the annotated tag
to resolve to the manifest's source commit.

Before a new format's schema is used, publish its exact bytes and verify its
`$id`, digest, JSON media type, CORS, and immutable caching. After the approved
specification tag exists, publish the corresponding catalog and manifest,
verify their identities, schema validity, record count, source commit, and
digests, then update the discovery index last. A failed immutable deployment
is not fixed by silently replacing a previously published catalog.

Publication checks cover direct HTTP responses rather than an HTML fallback.
Mutable index caching must allow consumers to discover updates, unlike the
immutable artifact policy: the index must revalidate or have a cache lifetime
of at most 300 seconds. `--index-out <new-file>` prepares an index update only
after immutable publication and any existing index targets are verified;
`--check-index` verifies the deployed index. These commands do not deploy
anything. Catalog publication is distinct from validator
snapshot intake: runtime bundles need not include the catalog unless a
downstream consumer explicitly adopts that contract.

## Schema impact

In `spec/draft/validation/rule.schema.json`:

- add `title` (string, 1 to 60 characters, no trailing period) and
  `description` (string, 1 to 800 characters), both required;
- require `applicability.protocolVersions` as `independent` or a full protocol
  map for active rules, with optional URI-array `schemaDialects` metadata;
- distinguish active applicability checks from retained retirement records;
- describe the meaning of `applies`, `opaque`, and `not-applicable`.
- add the absolute versioned `$id`, plus schemas for the publication manifest
  and discovery index under `$defs`;
- keep the root `{ "rules": [...] }` shape so authored YAML files and the
  generated aggregate validate against the same schema.

`scripts/test-validation-rules.mjs` checks title uniqueness, explicit protocol
applicability or independence, applicable dialect metadata, and the exclusion
of retired records from active checks, without owner-based defaults.
Dedicated generation and publication tests cover deterministic
aggregation, manifest/index validity, digests, link bases, complete membership,
and the stable/draft separation. The MCP Description document schema is not
changed by this proposal.

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
    protocolVersions:
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
    protocolVersions:
      "2024-11-05": applies
      "2025-03-26": applies
      "2025-06-18": not-applicable
      "2025-11-25": not-applicable
      "2026-07-28": not-applicable
```

## Compatibility

No document changes validity, and no diagnostic changes. The rule schema gains
required fields, so registry consumers must select the published rule-format
schema and accept `title` and `description`. There is no previously published
numbered rule format to upgrade retroactively. Future incompatible formats
require a major rule-format version; old catalogs remain unchanged.

`@mcpdesc/core` and `@mcpdesc/validator` do not currently read the registry.
Their releases and diagnostic coverage remain independent. mcpdesc.org can
show the new fields once a snapshot containing them and its catalog are
published. Existing draft tags are not rewritten.

## Migration

Registry consumers:

- show `title` where they show a rule name, and `description` with the rule;
- adopt the finalized applicability representation without inferring protocol
  independence from owner or omission;
- retain retired records for lookup but exclude them from active checking;
- replace named rulesets with catalog filters used for browsing, not for
  disabling required checks;
- discover snapshots through the index and pin the selected manifest;
- resolve evidence and description links using the manifest's immutable base;
- use the catalog's specification snapshot and rule-format version, not a
  validator package version, to identify its contents.

## Security and privacy considerations

Descriptions are documentation and are rendered as Markdown by catalogs,
which must render them safely, as for other specification text. Consumers
validate downloaded data against the pinned format schema and verify exact
digests. Digests provide integrity relative to a trusted manifest; they do not
authenticate its publisher. Fetching linked evidence or fixtures is separate
from document validation and must not happen implicitly. Importers must prevent
relative-path traversal outside their authorized source tree.

## Alternatives considered

- **Shorten `summary`.** Rejected: the summary is the precise requirement, and
  shortening it loses conditions that readers and implementers need.
- **Titles defined by the website only.** Rejected: every catalog and tool
  would invent different names, and they would drift from the records.
- **An applicability dimension chosen solely by owner.** Rejected: some
  MCP Description-owned checks depend on protocol versions, and embedded
  JSON Schema checks can depend on both a dialect and a protocol version.
- **Universal five-version maps.** Superseded: explicit protocol independence
  conveys information that repeated `applies` entries do not.
- **Named rulesets.** Removed: catalog metadata already supports filtered
  views. Names and stored memberships add no information and can be mistaken
  for independently selectable validation profiles.
- **Per-rule specification-version fields.** Rejected: snapshot membership
  already establishes them (`rule-history-0.8.md`, Options).
- **A website-only catalog.** Rejected: third parties need machine-readable
  discovery and exact provenance, not HTML scraping.
- **A single catalog URL that changes in place.** Rejected: consumers cannot
  reproduce historical behavior; only the discovery index is mutable.
- **Separate authored JSON and YAML catalogs.** Rejected: JSON is generated
  from the YAML source, avoiding divergence.

## Open questions

None for the source contract. Acceptance remains pending review.

Website deployment and importer integration remain downstream handoff work.
The specification tooling prepares and verifies the artifacts; maintainers
authorize deployment and the discovery-index update using the website's
existing review process. This proposal does not introduce automatic hosting
or publication authority.

## Implementation and validation plan

1. Proposal pull request (this document).
2. In Community Working Draft 3: rule schema and registry test changes; a
   `title` and `description` for every rule; `applicability` for the 19
   records, starting from the preliminary classification in
   `rule-history-0.8.md`; README update; changelog entry; snapshot of this
   proposal.
3. Implement the schema identity and publication-envelope schemas, deterministic
  catalog exporter, and focused tests. Add the publication checks to release
  guidance, preserving the existing validator snapshot export contract.
4. Coordinate mcpdesc.org hosting, index discovery, link rewriting, and catalog
  rendering. Coordinate any adoption by core or the validator separately;
  those consumers are not implemented in this repository.
5. After review and implementation, prepare Draft 3, publish the format schema,
  tag the authorized specification snapshot, publish and verify its immutable
  catalog bundle, then update the index. Do not publish the currently prepared
  documentation-only Draft 3 in the meantime.

## Decision record

On 2026-10-28, the maintainer requested this publication contract as part of
Proposal 0030 and deferred Draft 3 publication until the expanded work is
addressed, then authorized implementation in Draft 3.

Reader and publication choices for review: 60-character unique titles,
800-character explanations, and schema/catalog format 1.0.0, with manual
verified deployment and explicit discovery updates. No live endpoint is
implied by the implementation. The prepared release branch remains unpublished.

On 2026-10-29, the maintainer agreed to rule-specific applicability rather
than an axis selected by owner: snapshot membership supplies the MCP
Description context, protocol dependence or independence is explicit, and
dialect information is separate where needed. Catalog-local retirement and
permanent-ID evolution follow Section 5, initially using `status: retired`.
The original universal-map implementation and ruleset recommendation are
superseded design inputs. The maintainer then approved removal of named
rulesets and completion of the catalog, tests, and implementation commit.
The finalized applicability representation is specified in Section 2; catalog
views and retirement handling follow Sections 3 and 5.

Acceptance pending.
