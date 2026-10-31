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
| [`test-export-validator-snapshot.mjs`](test-export-validator-snapshot.mjs) | Invoked by `npm test`; therefore also runs in repository CI. | Exports the candidate selector (the active draft snapshot, otherwise a dated stable revision) from a temporary tagged repository and verifies manifest digests, schema identity, runtime behavior, and fixtures, including that exported projection cases resolve their source documents and exported view cases their inputs and expected documents in the bundle. It also guards the frozen 0.8.0 schema bytes. |
| [`test-projection-fixtures.mjs`](test-projection-fixtures.mjs) | Invoked by `npm test`; therefore also runs in repository CI. | Checks the native projection cases in `projection-fixtures/` (Section 4.14) without implementing projection: source validity, revision and declaration selection, each expected value against the pinned MCP `schema.json` type, exactly the declaration's fields without MCP Description fields, unchanged after reference resolution, document order in lists, that each postcondition failure case selects a value failing its pinned type, and coverage of every kind, supported revision, projection error, and at least one postcondition failure. |
| [`test-view-fixtures.mjs`](test-view-fixtures.mjs) | Invoked by `npm test`; therefore also runs in repository CI. | Recomputes the Effective Protocol View and merge cases in `view-fixtures/` (Sections 4.12 and 4.13) with `mcpdesc-views.mjs`: each expected document is valid and semantically equivalent to the result, each expected failure is thrown and names an existing requirement anchor, every merge result satisfies the round-trip invariant, every input and expected file is used, and each operation has result and failure cases. |
| [`test-conversion-fixtures.mjs`](test-conversion-fixtures.mjs) | Invoked by `npm test`; therefore also runs in repository CI. | Checks the version conversion profile in `conversion/` (Proposal 0028) without implementing conversion for users: recomputes each case from the conversion rules (automatic rewrites, requested fixes, then the candidate validator), fails on any target error that no conversion rule explains, and requires coverage of every released source document, conversion rule, fix, and diagnostic code. Source documents are checked against the frozen source schema; their semantic validity is checked in `@mcpdesc/core`. |
| [`test-views.mjs`](test-views.mjs) | Invoked by `npm test`; therefore also runs in repository CI. | See its module header for the behaviors covered. |
| [`test-validation-rules.mjs`](test-validation-rules.mjs) | Invoked by `npm test`; therefore also runs in repository CI. | Checks the candidate specification's validation rule registry (`validation/rules/`) against `validation/rule.schema.json`, identifier ownership, revision applicability, source tiers, the support-tier policy for gaps, and fixture evidence. Fails when a fixture citation's outcome differs from what the candidate validator or projection case shows, a fixture diagnostic identifies no active rule or a severity without cited evidence, a projection failure is cited by a rule whose requirements do not define it, the validator references an unregistered rule, a location, requirement anchor, or fixture pointer does not resolve, or a rule cites no requirement anchor. Also fails when a canonical schema definition has no `documentSchema` owner or a location is owned twice, a requirement anchor is neither cited by a rule nor listed in `validation/unchecked-requirements.yaml`, or an obligation sentence has no anchor (Proposal 0033). Also checks the candidate validator's rule results (Proposal 0031): every fixture result matches `validation/result.schema.json` with one result per rule and declared version, every `passed` result has a recorded evaluation, no check in a skipped stage is `passed` or `not-applicable`, diagnostic protocol versions are within the rule's applicability, every declared semantic check is evaluated by some fixture, and each citation's outcome matches the evaluations within its fragment and the document's rule results. Reports the catalog coverage: owned schema locations, document-schema failures attributed below the root, rules with failure evidence, and anchored obligations, and the rule-result status counts. |
| [`normalize-schema.mjs`](normalize-schema.mjs) | Invoked explicitly with `npm run schema:normalize -- <schema.json> [...]`; release-candidate preparation uses the same formatter internally. | Recursively sorts object keys and writes two-space JSON with one trailing newline. Array order is preserved. |
| [`schema-diff.mjs`](schema-diff.mjs) | Invoked explicitly with `npm run schema:diff -- <old-schema.json> <new-schema.json>`. | Separates root `$id`, `title`, and `description` annotation changes from validation-relevant changes and reports changed JSON Pointers. |
| [`validate-document.mjs`](validate-document.mjs) | Candidate working-tree facade used by repository and Effective Protocol View tooling. It validates documents for the candidate specification version identified by its imported schema and extends the candidate semantic base without modifying published validator snapshots. | Published executable validation is maintained in `mcpdesc/core`. |
| [`candidate-specification.mjs`](candidate-specification.mjs) | Library module used by repository validation and tests. | Resolves the candidate version (active draft, otherwise current stable release) and its specification and schema paths from `specification-status.json`. |
| [`document-schema-owners.mjs`](document-schema-owners.mjs) | Library module imported by `validate-document.mjs`; the validator snapshot export inlines its result. | Reads the `documentSchema` locations of the candidate rule registry, which attribute document-schema failures to rules. |
| [`rule-summaries.mjs`](rule-summaries.mjs) | Library module imported by `validate-document.mjs`; the validator snapshot export inlines its result. | Reads each active rule's applicability, kind, enforcement, and schema ownership, which rule results need (Proposal 0031). |
| [`normative-sentences.mjs`](normative-sentences.mjs) | Library module used by `test-validation-rules.mjs`. | Finds obligation sentences in section Markdown and the requirement anchor covering each. |
| [`mcpdesc-views.mjs`](mcpdesc-views.mjs) | Library module exercised by `test-views.mjs`; it is not independently triggered by CI. | See its exported API and module header. |
| [`assemble-draft.mjs`](assemble-draft.mjs) | Invoked by `npm run assemble:draft` and draft release preparation. | Regenerates the assembled draft from ordered section sources and rewrites companion-document links. |
| [`check-release.mjs`](check-release.mjs) | Invoked by `npm run release:check -- <mode>` and `npm run release:check:draft-publication`. | Checks draft, publication, or stable-release metadata without tagging or publishing. |
| [`prepare-release.mjs`](prepare-release.mjs) | Invoked by `npm run release:prepare -- <target>`. | Dispatches mechanical draft metadata preparation, validator snapshot export, or stable-version freezing. |
| [`export-validator-snapshot.mjs`](export-validator-snapshot.mjs) | Invoked by validator release preparation after an approved specification tag identifies a clean `HEAD`. | Emits a manifest-verified runtime, fixture, and projection-fixture bundle for intake in `mcpdesc/core`; it does not publish a package. |
| [`freeze-version.mjs`](freeze-version.mjs) | Reserved for a future explicitly approved stable release; it is not part of `npm test` or CI. The generic implementation has not been exercised end to end and was not used to finalize v0.8.0. | It MUST be tested during the next active draft and release-candidate cycle before release use. See the script header for its safety boundary; release authority and prerequisites remain in [`GOVERNANCE.md`](../GOVERNANCE.md#branch-and-release-model). |

Repository validation asserts the exact diagnostic-code multiplicities emitted
by every `expected-warning` fixture. Passing output reports those expected
diagnostics separately from warnings found in ordinary repository content. Set
`MCPDESC_VERBOSE_EXPECTED_WARNINGS=1` to print each expected fixture diagnostic.

The validation scripts report failures but do not modify specification artifacts. The freeze script performs only the mechanical snapshot step and deliberately leaves release-status and schema-pointer decisions to maintainers.

Application consumers should use the independently versioned `@mcpdesc/validator` package rather than importing repository scripts. Repository-integrity checks, filesystem traversal, YAML parsing, projection, and merge behavior remain under `scripts/`.

## Validation catalog publication

Proposal 0030 adds these scripts and npm entry points:

| Script | Invocation and scope |
| --- | --- |
| [`validation-catalog.mjs`](validation-catalog.mjs) | Shared deterministic generation, record and envelope validation, safe source resolution, discovery updates, and publication checks |
| [`test-validation-catalog.mjs`](test-validation-catalog.mjs) | `npm test`; offline tests with temporary Git repositories and mocked HTTP responses |
| [`export-rule-catalog.mjs`](export-rule-catalog.mjs) | `npm run rules:export -- <snapshot> <new-output> [--prepare]`; requires a clean commit, and by default an annotated tag at HEAD |
| [`check-rule-catalog-publication.mjs`](check-rule-catalog-publication.mjs) | `npm run rules:check-publication -- <snapshot> <bundle> [--schema-only \| --check-index \| --index-out <new-file>]`; opt-in networked checks, never deployment |

The bundle contains deployment-relative paths for the versioned rule schema,
catalog aggregate, and manifest. The schema validates the existing YAML
registry-file shape and the aggregate; its manifest and index schemas are
under `$defs`. The generator does not alter source records or publish anything.
It checks complete membership, source references, fixture pointers, full
protocol applicability, and unique reader titles.

For a new rule format, prepare a bundle from the exact clean reviewed commit:

```bash
npm run rules:export -- 0.9.0-draft.3 /tmp/mcpdesc-catalog-preview --prepare
```

`--prepare` permits an untagged commit for schema deployment and review. It is
explicitly not a catalog publication. Deploy only the rule-format schema bytes
and check them before tagging:

```bash
npm run rules:check-publication -- 0.9.0-draft.3 /tmp/mcpdesc-catalog-preview --schema-only
```

After the MCP Description schema-publication gate passes and the approved
specification tag is published, export again at that annotated tag to a new
directory. A merge commit can differ from the preview commit; the final
manifest must record the tagged commit:

```bash
npm run rules:export -- 0.9.0-draft.3 /tmp/mcpdesc-catalog-final
```

Deploy `rules.json` and `manifest.json` to their versioned paths, without
changing any previously published bytes. Verify all immutable artifacts, then
prepare the index update:

```bash
npm run rules:check-publication -- 0.9.0-draft.3 /tmp/mcpdesc-catalog-final
npm run rules:check-publication -- 0.9.0-draft.3 /tmp/mcpdesc-catalog-final --index-out /tmp/mcpdesc-catalog-index.json
```

Index preparation fetches and verifies the existing index and its referenced
catalogs, or starts with empty pointers if the endpoint returns 404. It adds
the verified catalog and updates only the appropriate current pointer; the
stable pointer remains null when only drafts exist. It refuses to overwrite a
local output file or redefine an existing catalog entry. Publish that reviewed
index at `/validation/catalogs/index.json` last, then verify it:

```bash
npm run rules:check-publication -- 0.9.0-draft.3 /tmp/mcpdesc-catalog-final --check-index
```

Immutable artifacts require direct JSON-compatible responses, matching bytes,
CORS, a strong ETag, and `public, max-age=31536000, immutable` caching. The
mutable index must not be immutable: use a cache lifetime at most 300 seconds
or require revalidation. Verification does not upload files, create tags,
publish packages, or modify the website repository. Deployment and approval
remain maintainer actions.

## Draft snapshot publication

Public draft snapshots use annotated tags named `v<version>-draft.<iteration>`, such as `v0.8.0-draft.1`. They identify an immutable review and interoperability baseline but do not create a new `mcpdesc` conformance version or a stable release.

Before tagging, maintainers update the draft status metadata, front matter, changelog, public status pages, and `spec/draft/PROPOSALS.md`; capture and verify every proposal revision required by governance; run `npm test`; and confirm that `schemas/latest.json` and frozen specification versions are unchanged. Once the canonical schema URL is live, maintainers also run `npm run release:check -- draft-publication` to verify direct publication, media type, immutable bytes, schema identity, CORS, cache policy, ETag, and HTML-fallback absence before tagging. Draft snapshots are tagged directly from the reviewed integration commit. Do not run `freeze-version.mjs` for a draft snapshot.

## Validator snapshot export boundary

The validator package and its SemVer releases are maintained in `mcpdesc/core`.
After this repository approves and tags an exact specification snapshot,
`export-validator-snapshot.mjs` emits a reviewable artifact copy containing
snapshot-local runtime inputs, frozen fixtures, source provenance, a file
manifest, and SHA-256 digests. A consuming repository reviews and imports that
copy additively. Source tag and commit fields are informational provenance; the
consumer-owned schema, runtime, fixtures, and schema digest are its integrity
inputs. Specification approval does not choose a consumer package version or
authorize publication.

## Release helper commands

The helpers automate only reproducible file generation and consistency checks:

```bash
npm run release:prepare -- draft.4 2026-09-15
npm run release:prepare -- rc.1 2026-09-30
npm run release:prepare -- editorial v0.8.0-rc.4 1 2026-10-02
npm run release:prepare -- validator 0.8.0-rc.4 /tmp/mcpdesc-0.8.0-rc.4
npm run release:prepare -- validator 0.8.0 /tmp/mcpdesc-0.8.0
npm run release:prepare -- validator 0.8.0-rev.20261021 /tmp/mcpdesc-0.8.0-rev.20261021
npm run release:prepare -- stable 0.9.0 2027-01-15

npm run release:check -- draft
npm run release:check -- rc
npm run release:check -- editorial
npm run release:check -- rc-publication
npm run release:check -- draft-publication
npm run release:check -- stable 0.8.0
npm run release:check -- stable-publication 0.8.0
```

Draft and release-candidate preparation update structured status, front matter, schema identity, active example and fixture schema references, and assembled output. Validator preparation exports a reviewable artifact copy from an exact tagged commit; a dated `x.y.z-rev.YYYYMMDD` selector reuses the stable version's schema identity and fixture location while recording distinct immutable runtime semantics. Consumer intake and release remain outside this repository. The currently untested stable preparation helper freezes `spec/draft/`, converts mechanical stable identities, updates status pointers, and retires the active draft. It deliberately does not write release prose, changelog content, proposal decisions, or public status pages. The stable publication check verifies the deployed canonical schema before tagging.

Editorial-edition preparation records a positive edition iteration and immutable tag over an existing release-candidate or stable base tag. It does not change the conformance version, schema identity, schema pointers, validator selector, semantic validation behavior, or proposal provenance. Non-normative examples and fixtures may be corrected when they retain their declared purpose and remain consistent with the unchanged conformance rules. The editorial check compares protected conformance artifacts with the base tag and fails on any difference; `npm test` validates the corrected supporting material. Specification prose and supporting-artifact changes still require human review to establish that an edit is strictly editorial; automation cannot prove semantic equivalence.

The commands do not create branches or pull requests, merge changes, create or move tags, publish GitHub releases, alter npm dist-tags, or publish packages. Publication checks are intentionally opt-in and networked; ordinary `npm test` remains deterministic and offline. Run the release checks on a release branch, review every generated change, run `npm test`, and use annotated tags only after explicit maintainer approval.

## Schema normalization and comparison

Generated mutable schemas use a deterministic textual representation. Root keys follow `$schema`, `$id`, `title`, `description`, `type`, `required`, `additionalProperties`, `properties`, `patternProperties`, and `$defs`; other object keys are sorted alphabetically. Arrays retain their source order, indentation is two spaces, and the file ends with one newline. Release-candidate preparation applies this format automatically, and repository validation rejects a non-canonical `schemas/mcp-description/0.8.0.json`. Published and frozen schemas are not rewritten.

Normalize a generated schema explicitly with:

```bash
npm run schema:normalize -- schemas/mcp-description/0.8.0.json
```

Compare two schema snapshots with:

```bash
npm run schema:diff -- old-schema.json new-schema.json
```

The comparison reports root `$id` and `description` changes as release metadata. All other added, removed, or changed JSON Pointers are reported under validation changes. The command exits with status 0 when there are no validation changes, status 1 when validation changes exist, and status 2 for usage or input errors.
