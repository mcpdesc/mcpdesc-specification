# Validation Rule Format Changelog

This changelog records changes to the machine-readable rule-record format and
its catalog publication contract. Format versions are independent of MCP
Description versions, catalog snapshot identities, and validator package
versions.

New or retired rules, requirement changes, and corrected reader explanations
belong in the specification's [per-draft changelog](../CHANGELOG.md). Those
content changes do not by themselves require a new rule-format version.

## Compatibility policy

Incompatible structure changes require a major rule-format version, including
new fields that a previous closed schema rejects. Compatible additions are
minor only when the previous schema permitted them. Editorial schema
documentation corrections use a new patch-version URL. Published versioned
URLs retain their exact bytes; older catalogs and specification snapshots are
not rewritten. The `1.1.0` entry records the only exceptions so far.

## [1.1.0] — Unreleased

Rule format of the first catalogs, implemented for the MCP Description 0.9.0
Draft 3 working tree under review-stage
[Proposal 0030](../proposal-snapshots/0030-readable-and-complete-rule-records.md).
The schema is published at
`https://mcpdesc.org/schema/validation-rule/1.1.0.json`; catalog endpoints
remain publication targets until deployment is verified.

### Record Format

- Removed the `diagnostics` list of producer codes and severities. Each
  `fixtures[]` entry has a required `outcome` (`passes`, `error`, or
  `warning`) that the specification's tests check, so fixtures are the
  evidence for a rule. Producers own their code mappings
  ([Proposal 0031](https://github.com/mcpdesc/mcpdesc-specification/pull/94),
  [issue #93](https://github.com/mcpdesc/mcpdesc-specification/issues/93)).

### Publication Contract

- The schema identity is
  `https://mcpdesc.org/schema/validation-rule/1.1.0.json`. Manifest and index
  envelopes declare `$schema` with that URL and its `#/$defs/catalog-manifest`
  or `#/$defs/catalog-index` fragment, and manifests declare
  `ruleFormatVersion` `1.1.0`.

### Versioning Exceptions

- **Minor number for an incompatible change.** Removing a required field and
  requiring `outcome` in closed fixture entries would need `2.0.0` under the
  compatibility policy. Because no manifest, catalog, or index uses `1.0.0`,
  the maintainer chose `1.1.0` and left the `1.0.0` URL unchanged. Later
  incompatible changes require a major version.
- **One-time byte replacement.** The `1.1.0` URL was first deployed on
  2026-10-29 with envelope constants that still named `1.0.0` (SHA-256
  `2ac139db06c832777b6209b2d2c758992d3144c1800dc9f0a27ef57af62d80c8`). Before
  any manifest or index used them, the maintainer approved replacing those
  bytes once with the corrected constants. Consumers that cached the earlier
  bytes must fetch the schema again.

### Consumer Migration

- Pin `1.1.0`. Do not validate Draft 3 records or envelopes with `1.0.0`.
- Stop reading `diagnostics`. Show fixture citations with their `outcome`, and
  take diagnostic codes from the producer that emits them.

## [1.0.0] — 2026-10-29 (published, superseded before use)

First numbered rule format, defined by review-stage
[Proposal 0030](../proposal-snapshots/0030-readable-and-complete-rule-records.md)
before its fixture-outcome revision. The schema was deployed at
`https://mcpdesc.org/schema/validation-rule/1.0.0.json` (SHA-256
`c790a0137e5bd35fee7b8f874e7dedc7340505d6d46616eddd79d1b1975096b7`) and
remains unchanged there. No manifest, catalog, or index references it; it was
superseded by `1.1.0` before any catalog publication.

### Record Format

- Assigned the schema identity
  `https://mcpdesc.org/schema/validation-rule/1.0.0.json`. The root validates
  registry files and aggregate catalogs as `{ "rules": [...] }`.
- Required informative `title` and `description` fields, alongside the
  existing precise requirement `summary`. Titles are unique, at most 60
  characters, and have no trailing period; explanations contain at most 800
  characters and three short paragraphs.
- Required rule-specific applicability for active records.
  `applicability.protocolVersions` is either `independent` or a map covering
  every supported MCP protocol version. Optional `schemaDialects` provides
  separate dialect information without suppressing unsupported-dialect errors.
- Retained `status: retired` for catalog-local retirement. Retired records
  remain discoverable, may omit active applicability, and are excluded from
  active checking. Permanent identifiers cannot be reused for a different
  requirement.
- Removed named rulesets. Consumer filters are views of a catalog, not
  independently selectable validation profiles.
- Kept the required `diagnostics` list of candidate-validator codes and
  severities.

### Publication Contract

- Added `$defs/catalog-manifest` and `$defs/catalog-index` to the format
  schema. The manifest separates `ruleFormatVersion`, `mcpdescVersion`, and
  `snapshot`, and records source tag/commit, rule count, exact-byte digests,
  artifact URLs, and an immutable `specificationBaseUrl` for relative links.
- Defined immutable schema and per-snapshot catalog URLs. The mutable
  discovery index has separate `currentStable` and `currentDraft` pointers;
  no catalog is assigned retroactively to MCP Description 0.8.0.
- Defined deterministic aggregation from authoritative YAML records, complete
  exports including retired records, and publication checks before updating
  discovery. Website hosting and rendering remain separate from generation.

### Consumer Migration

- Adopt a numbered schema rather than treating an earlier draft's unversioned
  schema as a numbered format.
- Read the explicit applicability object instead of a bare protocol-version
  map, owner-based defaults, or an unexplained omission.
- Distinguish active applicability from retired-record lookup. Do not treat
  catalog filters as permission to skip required validation checks.
- Discover catalogs through the index, then pin an immutable manifest and
  verify its schema/catalog digests. Resolve relative references from the
  manifest's specification base, not from a moving branch or website route.

See the [catalog reference](README.md#catalog-publication-and-discovery) and
[publication procedure](../../../scripts/README.md#validation-catalog-publication).
