# Changelog

This changelog records repository governance, release-process, and project-tooling changes. Changes to the MCP Description format are recorded in the [versioned specification changelog](spec/0.8.0/CHANGELOG.md).

## 2026-09-09

- Allowed reviewed editorial corrections to non-normative examples, conformance fixtures, and serialization fixtures when their purpose and conformance semantics remain unchanged and the repository test suite passes.
- Kept normative requirements, canonical schemas, semantic validation behavior, and proposal provenance protected from editorial-edition changes, with regression coverage for stable and prerelease layouts.
- Required stable-release preparation to receive an explicit release date and added review safeguards to the version-freezing workflow.
- Documented the immutable editorial-edition and stable-release workflows in repository governance and maintainer guidance.
- Adopted the pre-1.0 release policy used for MCP Description 0.8.0, permitting breaking changes in `0.x` minor releases.

Detailed release history is available in the [GitHub prereleases](https://github.com/mcpdesc/mcpdesc-specification/releases) and [tags](https://github.com/mcpdesc/mcpdesc-specification/tags).