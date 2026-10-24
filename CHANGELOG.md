# Changelog

This changelog records repository governance, release-process, and project-tooling changes. Changes to the MCP Description format are recorded in the [versioned specification changelog](spec/0.8.0/CHANGELOG.md).

## Unreleased

- Codified dated validator revisions as the correction path for stable-release semantic validation defects, and `release/<major>.<minor>.x` maintenance branches for stable-release corrections while a later version is in development.
- Made repository tooling version-neutral: the candidate validator is `scripts/validate-document.mjs` (exporting `validateDocument`), and tests and repository validation derive the candidate version and paths from `specification-status.json`. Diagnostics for 0.8.0 documents are unchanged.
- Initialized the MCP Description 0.9.0 community working draft in `spec/draft/` from the stable 0.8.0 release, with `schemas/mcp-description/0.9.0.json` and `schemas/draft.json` targeting the upcoming `v0.9.0-draft.1` snapshot. The candidate validator now validates 0.9.0 documents; frozen 0.7.0 and 0.8.0 artifacts are unchanged.
- Added `scripts/test-validation-rules.mjs` to `npm test`: it checks the candidate validation rule registry against its schema, identifier and ownership rules, revision applicability, source tiers, the support-tier policy for gaps, fixtures, and candidate diagnostic codes, and reports diagnostic-code coverage.

## 2026-10-21

- Corrected candidate validator semantics so MCP-specific JSON Schema annotations apply only to protocol revisions that define them, while unknown Tool-schema keywords remain preserved and governed by their JSON Schema dialect.
- Added dated stable-revision validator snapshot selectors and manifest-verified export regression coverage.

## 2026-10-20

- Distinguished deliberate `expected-warning` fixture diagnostics from other repository warnings in test output, and required exact diagnostic-code multiplicities for every warning fixture.

## 2026-09-09

- Allowed reviewed editorial corrections to non-normative examples, conformance fixtures, and serialization fixtures when their purpose and conformance semantics remain unchanged and the repository test suite passes.
- Kept normative requirements, canonical schemas, semantic validation behavior, and proposal provenance protected from editorial-edition changes, with regression coverage for stable and prerelease layouts.
- Required stable-release preparation to receive an explicit release date and added review safeguards to the version-freezing workflow.
- Documented the immutable editorial-edition and stable-release workflows in repository governance and maintainer guidance.
- Adopted the pre-1.0 release policy used for MCP Description 0.8.0, permitting breaking changes in `0.x` minor releases.

Detailed release history is available in the [GitHub prereleases](https://github.com/mcpdesc/mcpdesc-specification/releases) and [tags](https://github.com/mcpdesc/mcpdesc-specification/tags).