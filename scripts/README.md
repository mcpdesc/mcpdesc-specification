# Repository scripts

This directory contains repository validation, Effective Protocol View, and release-maintenance tooling. This page is an index to the authoritative process and trigger documentation; it does not replace those documents or the module-level comments in each script.

## Where execution is defined

- [`package.json`](../package.json) defines the local npm entry points and their command composition.
- [`.github/workflows/validate.yml`](../.github/workflows/validate.yml) defines when CI invokes the test suite.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md#local-validation) defines the contributor validation requirement.
- [`AGENTS.md`](../AGENTS.md#validation) defines the validation requirement for automated contributors.
- [`GOVERNANCE.md`](../GOVERNANCE.md#branch-and-release-model) defines the branch and release process, including the conditions that must be satisfied before a release.

When those sources disagree, the workflow controls CI triggering, `package.json` controls npm command composition, and the governance and contribution documents control project process.

## Execution map

| Script | How it enters the process | Further detail |
|---|---|---|
| [`validate-repository.mjs`](validate-repository.mjs) | Invoked by both `npm test` and `npm run validate`; therefore also runs in repository CI. | See its module header for validation scope and [`package.json`](../package.json) for command composition. |
| [`test-schema-publication.mjs`](test-schema-publication.mjs) | Invoked by `npm test` and `npm run test:publication`; therefore also runs in repository CI. | Exercises the schema-publication verifier with in-process HTTP responses and pure checks only; it never depends on the live mcpdesc.org endpoint. |
| [`test-views.mjs`](test-views.mjs) | Invoked by `npm test`; therefore also runs in repository CI. | See its module header for the behaviors covered. |
| [`validate-0.8.mjs`](validate-0.8.mjs) | Current 0.8.0 working-tree facade used by repository and Effective Protocol View tooling. It extends the shared Draft 1 semantic base without modifying immutable validator snapshots. | See the package README for the cumulative public Draft 1, Draft 2, and Draft 3 API. |
| [`mcpdesc-views.mjs`](mcpdesc-views.mjs) | Library module exercised by `test-views.mjs`; it is not independently triggered by CI. | See its exported API and module header. |
| [`assemble-draft.mjs`](assemble-draft.mjs) | Invoked by `npm run assemble:draft` and draft release preparation. | Regenerates the assembled draft from ordered section sources and rewrites companion-document links. |
| [`check-release.mjs`](check-release.mjs) | Invoked by `npm run release:check -- <mode>` and `npm run release:check:draft-publication`. | Checks draft, draft-publication, validator, or stable-release metadata and immutable artifacts without tagging or publishing. |
| [`prepare-release.mjs`](prepare-release.mjs) | Invoked by `npm run release:prepare -- <target>`. | Dispatches mechanical draft metadata preparation, validator snapshot freezing, or stable-version freezing. |
| [`freeze-version.mjs`](freeze-version.mjs) | Maintainer-invoked during an explicitly approved release; it is not part of `npm test` or CI. | See the script header for usage and its printed post-freeze checklist; release authority and prerequisites remain in [`GOVERNANCE.md`](../GOVERNANCE.md#branch-and-release-model). |

The validation scripts report failures but do not modify specification artifacts. The freeze script performs only the mechanical snapshot step and deliberately leaves release-status and schema-pointer decisions to maintainers.

Application consumers should use the independently versioned `@mcpdesc/validator` package rather than importing repository scripts. Repository-integrity checks, filesystem traversal, YAML parsing, projection, and merge behavior remain under `scripts/`.

## Draft snapshot publication

Public draft snapshots use annotated tags named `v<version>-draft.<iteration>`, such as `v0.8.0-draft.1`. They identify an immutable review and interoperability baseline but do not create a new `mcpdesc` conformance version or a stable release.

Before tagging, maintainers update the draft status metadata, front matter, changelog, public status pages, and `spec/draft/PROPOSALS.md`; capture and verify every proposal revision required by governance; run `npm test`; and confirm that `schemas/latest.json` and frozen specification versions are unchanged. For Draft 4 and later, once the canonical schema URL is live, maintainers also run `npm run release:check -- draft-publication` to verify direct publication, media type, immutable bytes, schema identity, CORS, cache policy, ETag, and HTML-fallback absence before tagging. Draft snapshots are tagged directly from the reviewed integration commit. Do not run `freeze-version.mjs` for a draft snapshot.

## Validator snapshot publication boundary

The validator's package version is independent from specification snapshot selectors. Repository work may add an immutable implementation and test snapshot, register an exact selector, calculate provenance, and validate package contents. Those mechanical changes do not select a package version or authorize publication.

During release review, a maintainer explicitly chooses the validator SemVer and intended npm dist-tag before creating the corresponding immutable specification snapshot tag, so the tag records the approved package metadata. npm publication begins only after that tag exists: the maintainer reruns `npm test`, reviews `npm pack --dry-run --json` from the tag, and pushes an annotated `validator-v<semver>` tag. The trusted-publishing workflow verifies that the tag exactly matches the package version, reruns the package checks, and publishes SemVer prereleases with npm `next` or stable versions with `latest`. The scripts in this directory do not create or move Git tags, update npm dist-tags, select versions, or publish packages.

Existing validator snapshot implementations and frozen package-test fixtures must not be rewritten for a later draft. A later approved selector receives sibling runtime and test snapshot directories, and the public registry, declarations, provenance, and package-content expectations are updated additively. See [`packages/validator/README.md`](../packages/validator/README.md#snapshot-lifecycle) for the package-level checklist.

## Release helper commands

The helpers automate only reproducible file generation and consistency checks:

```bash
npm run release:prepare -- draft.4 2026-09-15
npm run release:prepare -- validator 0.8.0-draft.4
npm run release:prepare -- stable 0.8.0

npm run release:check -- draft
npm run release:check -- draft-publication
npm run release:check -- validator
npm run release:check -- stable 0.8.0
```

Draft preparation updates structured status, front matter, and assembled output. Validator preparation creates new sibling runtime and frozen fixture directories but deliberately leaves registry, declarations, tests, package SemVer, and release prose for review. Stable preparation freezes `spec/draft/` and prints the pointer and status updates that remain.

The commands do not create branches or pull requests, merge changes, create or move tags, publish GitHub releases, alter npm dist-tags, or publish packages. `draft-publication` is intentionally opt-in and networked; ordinary `npm test` remains deterministic and offline. Run the release checks on a release branch, review every generated change, run `npm test`, and use annotated tags only after explicit maintainer approval.
