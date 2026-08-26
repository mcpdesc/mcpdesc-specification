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
| [`test-views.mjs`](test-views.mjs) | Invoked by `npm test`; therefore also runs in repository CI. | See its module header for the behaviors covered. |
| [`validate-0.8.mjs`](validate-0.8.mjs) | Compatibility facade used by Effective Protocol View tooling. Canonical Draft 1 validation lives in [`packages/validator`](../packages/validator/). | See the package README for the supported public API. |
| [`mcpdesc-views.mjs`](mcpdesc-views.mjs) | Library module exercised by `test-views.mjs`; it is not independently triggered by CI. | See its exported API and module header. |
| [`freeze-version.mjs`](freeze-version.mjs) | Maintainer-invoked during an explicitly approved release; it is not part of `npm test` or CI. | See the script header for usage and its printed post-freeze checklist; release authority and prerequisites remain in [`GOVERNANCE.md`](../GOVERNANCE.md#branch-and-release-model). |

The validation scripts report failures but do not modify specification artifacts. The freeze script performs only the mechanical snapshot step and deliberately leaves release-status and schema-pointer decisions to maintainers.

Application consumers should use the independently versioned `@mcpdesc/validator` package rather than importing repository scripts. Repository-integrity checks, filesystem traversal, YAML parsing, projection, and merge behavior remain under `scripts/`.

## Draft snapshot publication

Public draft snapshots use annotated tags named `v<version>-draft.<iteration>`, such as `v0.8.0-draft.1`. They identify an immutable review and interoperability baseline but do not create a new `mcpdesc` conformance version or a stable release.

Before tagging, maintainers update the draft status metadata, front matter, changelog, public status pages, and `spec/draft/PROPOSALS.md`; capture and verify every proposal revision required by governance; run `npm test`; and confirm that `schemas/latest.json` and frozen specification versions are unchanged. Draft snapshots are tagged directly from the reviewed integration commit. Do not run `freeze-version.mjs` for a draft snapshot.

## Validator snapshot publication boundary

The validator's package version is independent from specification snapshot selectors. Repository work may add an immutable implementation and test snapshot, register an exact selector, calculate provenance, and validate package contents. Those mechanical changes do not select a package version or authorize publication.

During release review, a maintainer explicitly chooses the validator SemVer and intended npm dist-tag before creating the corresponding immutable specification snapshot tag, so the tag records the approved package metadata. npm publication begins only after that tag exists: the maintainer reruns `npm test`, reviews `npm pack --dry-run --json` from the tag, and invokes `npm publish`. CI and the scripts in this directory must stop at validation: they do not create or move Git tags, update npm dist-tags, select versions, or publish packages.

Existing validator snapshot implementations and frozen package-test fixtures must not be rewritten for a later draft. A later approved selector receives sibling runtime and test snapshot directories, and the public registry, declarations, provenance, and package-content expectations are updated additively. See [`packages/validator/README.md`](../packages/validator/README.md#snapshot-lifecycle) for the package-level checklist.
