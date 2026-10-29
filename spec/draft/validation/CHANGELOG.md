# Validation Rule Format Changelog

This changelog records changes to the machine-readable rule-record format and
its catalog publication contract. Format versions are independent of MCP
Description versions, catalog snapshot identities, and validator package
versions.

New or retired rules, requirement changes, and corrected reader explanations
belong in the specification's [per-draft changelog](../CHANGELOG.md). Those
content changes do not by themselves require a new rule-format version.

## [1.0.0] — Unreleased

First numbered rule format, implemented for the MCP Description 0.9.0 Draft 3
working tree under review-stage
[Proposal 0030](../proposal-snapshots/0030-readable-and-complete-rule-records.md).
The format schema and catalog endpoints remain publication targets until
deployment is verified; this entry is not a release announcement.

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

- Adopt the numbered schema rather than treating an earlier draft's
  unversioned schema as format `1.0.0`.
- Read the explicit applicability object instead of a bare protocol-version
  map, owner-based defaults, or an unexplained omission.
- Distinguish active applicability from retired-record lookup. Do not treat
  catalog filters as permission to skip required validation checks.
- Discover catalogs through the index, then pin an immutable manifest and
  verify its schema/catalog digests. Resolve relative references from the
  manifest's specification base, not from a moving branch or website route.

### Future Compatibility

Incompatible structure changes require a major rule-format version, including
new fields that a previous closed schema rejects. Compatible additions are
minor only when the previous schema permitted them. Editorial schema
documentation corrections use a new patch-version URL. Published versioned
URLs retain their exact bytes; older catalogs and specification snapshots are
not rewritten.

See the [catalog reference](README.md#catalog-publication-and-discovery) and
[publication procedure](../../../scripts/README.md#validation-catalog-publication).