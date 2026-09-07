# Modifications to imported material

This file records material imported from `cisco-open/mcptoolkit-contract` and
the material ways it was subsequently changed in this repository. The exact
source repository, commit, import date, method, and imported paths are recorded
in [`ORIGIN.md`](ORIGIN.md).

This is a provenance record, not a release changelog. Specification changes and
release history are recorded in
[`spec/draft/CHANGELOG.md`](spec/draft/CHANGELOG.md), proposals, release notes,
Git tags, and Git history. This aggregate record complements prominent
file-local modification notices where the file format permits them.

## Preserved upstream material

- `schemas/mcp-description/0.1.0.json` through `0.7.0.json` remain unchanged
  from the imported JSON Schema files. The stable v0.7.0 schema is preserved
  byte for byte.
- `schemas/latest.json` remains the imported stable-version pointer until a
  later stable specification is explicitly released.
- `LICENSE` remains the imported Apache License 2.0 text.
- The upstream attribution in `NOTICE` is preserved verbatim within the
  repository notice.
- The v0.7.0 specification text is not maintained as a derivative here;
  `spec/0.7.0/README.md` points to its canonical Cisco Open source.

## Material changes after import

- Imported specification material was relocated to `spec/draft/` for ongoing
  community development. Links and repository-relative paths were adjusted for
  the folder-versioned layout.
- The imported v0.7.0 specification baseline, schema, guides, and examples were
  substantially revised to develop the v0.8.0 specification. The specification
  changelog and proposal records describe those changes.
- Repository-specific governance, contribution guidance, status metadata,
  validation scripts, fixtures, release tooling, and documentation were added
  or replaced to support independent community development.
- Historical imported governance was removed from the active tree. Current
  governance is defined by [`GOVERNANCE.md`](GOVERNANCE.md); the historical
  v0.7.0 governance remains available from the canonical upstream source.
- `NOTICE` was extended with repository and attribution context while retaining
  the upstream notice verbatim.

## Repository ownership boundary

The published `@mcpdesc/validator` package, immutable runtime snapshots, frozen
validator fixtures, package checks, and trusted-publishing workflow moved to
`mcpdesc/core` on 2026-09-02. This repository retains the specification source,
canonical schemas, candidate semantic validation, conformance fixtures, and
artifact-export tooling.
