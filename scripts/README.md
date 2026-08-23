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
| [`validate-0.8.mjs`](validate-0.8.mjs) | Library module imported by repository validation and Effective Protocol View tooling; it is not an independent workflow entry point. | See its exported API and module header. |
| [`mcpdesc-views.mjs`](mcpdesc-views.mjs) | Library module exercised by `test-views.mjs`; it is not independently triggered by CI. | See its exported API and module header. |
| [`freeze-version.mjs`](freeze-version.mjs) | Maintainer-invoked during an explicitly approved release; it is not part of `npm test` or CI. | See the script header for usage and its printed post-freeze checklist; release authority and prerequisites remain in [`GOVERNANCE.md`](../GOVERNANCE.md#branch-and-release-model). |

The validation scripts report failures but do not modify specification artifacts. The freeze script performs only the mechanical snapshot step and deliberately leaves release-status and schema-pointer decisions to maintainers.
