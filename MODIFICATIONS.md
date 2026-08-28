# Modifications to imported material

This file records material imported from `cisco-open/mcptoolkit-contract` and subsequently modified in this repository.

The exact source repository and commit are recorded in [`ORIGIN.md`](ORIGIN.md).

## Repository bootstrap — 2026-07-28

| File or path | Change | Reason |
|---|---|---|
| `README.md` | Created for the independent specification repository | Explain repository status and scope |
| `GOVERNANCE.md` | Created | Establish current community governance |
| `CONTRIBUTING.md` | Created | Establish repository contribution rules |
| `NOTICE` | Extended while retaining upstream notice verbatim | Preserve attribution and explain project relationship |
| `spec/GOVERNANCE.md` | Replaced with pointer; upstream file preserved as `spec/GOVERNANCE-0.7.0.md` | Separate historical v0.7.0 governance from current governance |
| `spec/README.md` | Repository-status wording updated | Reflect v0.7.0 canonical source and v0.8.0 development home |

Add an entry whenever imported material from `cisco-open/mcptoolkit-contract` — specification text, schemas, or examples — is modified, relocated, or re-imported. This file is **not** a release changelog: ongoing v0.8.0 development and released-version history are tracked in [`spec/draft/CHANGELOG.md`](spec/draft/CHANGELOG.md) and Git tags. Where the file format permits, modified derivative files should also contain a prominent origin/modification notice.

## Preserved verbatim

- `schemas/mcp-description/0.1.0.json` … `0.7.0.json` — imported unchanged (JSON Schema draft-07). The stable v0.7.0 schema must remain byte-for-byte identical to upstream.
- `schemas/latest.json` — imported unchanged; still identifies `mcp-description` `0.7.0`.
- `LICENSE` — imported Apache-2.0 license, unchanged.
- Normative `spec/draft/sections/**`, `spec/draft/guides/**`, `spec/draft/examples/**`, and `spec/draft/mcp-description.md` — the imported v0.7.0 body is preserved apart from the draft front matter/status noted below; relocated into `spec/draft/` by the 2026-07-29 restructure.

## Bootstrap tooling notes

- `scripts/validate-repository.mjs` — supplied validation scaffold; corrected to meta-validate and compile each versioned schema against the JSON Schema dialect it declares (draft-07 for the current stable schemas, 2020-12 for future draft schemas) rather than assuming a single dialect.
- The original bootstrap pack (master prompt, project decisions, plan, acceptance criteria, reference sources, and import helper) lived under `bootstrap/` and was removed from the working tree on 2026-07-29; it remains recoverable in Git history.

## Draft branch (`draft/0.8.0`) — 2026-07-28

| File or path | Change | Reason |
|---|---|---|
| `spec/draft/mcp-description.md`, `spec/draft/sections/00-front-matter.md` | Front matter and status marked as the v0.8.0 community working draft (unreleased); the normative body still tracks the v0.7.0 baseline | Label the working draft without representing it as a release |
| `spec/draft/CHANGELOG.md` | Added an unreleased `[0.8.0]` section | Track v0.8.0 changes |
| `schemas/draft.json` | Added, identifying `0.8.0` as the unreleased draft | Distinguish the draft from the released `schemas/latest.json` (`0.7.0`) |
| `scripts/validate-repository.mjs` | Added a guarded check that `schemas/draft.json` remains an unreleased `0.8.0` | Enforce the draft invariant |

## Repository restructure — 2026-07-29

Adopted a folder-versioned layout (each specification version is a folder under `spec/`) with `main` as the integration branch.

| File or path | Change | Reason |
|---|---|---|
| `spec/draft/**` | Imported v0.7.0 normative material (`mcp-description.md`, `sections/`, `guides/`, `examples/`, `extensions/`, `CHANGELOG.md`) relocated from `spec/` into `spec/draft/`; root-relative links adjusted for the new depth | In-progress work lives in `spec/draft/`; released versions freeze into `spec/<version>/` |
| `spec/0.7.0/README.md` | Added a pointer to the canonical Cisco Open source for v0.7.0; no specification text copied | Keep the stable release discoverable without forking its canonical source |
| `bootstrap/` | Removed from the working tree (recoverable in Git history) | Completed one-time bootstrap material |
| `planning/` | Removed; transient tracking moved to GitHub issues and the impact matrix folded into Proposal 0001 in [PR #5](https://github.com/mcpdesc/mcpdesc-specification/pull/5) | Avoid duplicating issue-tracker content |
| `scripts/freeze-version.mjs` | Added | Automate freezing `spec/draft/` into a versioned folder at release |
| `scripts/validate-repository.mjs` | Requires `spec/draft/mcp-description.md`; validates examples under any `spec/**/examples/` | Match the folder-versioned layout |
| `GOVERNANCE.md`, `CONTRIBUTING.md`, `AGENTS.md`, `README.md`, `spec/README.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `specification-status.json`, `schemas/draft.json` | Updated to the `main`-integration, folder-versioned layout and the merge-on-accept proposal workflow | Reflect the current repository model |
| `spec/GOVERNANCE.md`, `spec/GOVERNANCE-0.7.0.md` | Removed | The repository has a single governance document (`GOVERNANCE.md`); the v0.7.0 specification and its historical governance remain at the canonical Cisco Open source |

## MCP Description v0.8.0 Community Working Draft 1 implementation — frozen 2026-08-24

This work began as an unreleased experiment on `experiment/0.8.0-draft-implementation` and was frozen on 2026-08-24 for publication on `main` as MCP Description v0.8.0 Community Working Draft 1 (`v0.8.0-draft.1`). It does not modify or supersede the stable v0.7.0 artifacts. It contains candidate implementations based on exact snapshots of proposals that remain under review; publication of this draft does not accept a proposal or alter its authoritative design and decision record. Proposal changes belong on the corresponding `feature/<slug>-proposal` branch and are captured under `spec/draft/proposal-snapshots/` with commit and digest provenance when used by a public draft.

| File or path | Change | Reason |
|---|---|---|
| `spec/draft/sections/**`, `spec/draft/mcp-description.md` | Revised the imported v0.7.0 baseline into the experimental v0.8.0 normative draft | Implement protocol-revision scoping, named security requirements, revision-aware Tool schemas, Effective Protocol Views, and related conformance rules for interoperability testing |
| `spec/draft/guides/**`, `spec/draft/examples/**`, `spec/draft/extensions/**`, `spec/draft/CHANGELOG.md` | Updated supporting material and examples for the experimental draft | Keep non-normative guidance and examples synchronized with the normative changes while preserving origin attribution |
| `schemas/mcp-description/0.8.0.json`, `schemas/draft.json` | Added the unreleased v0.8.0 schema and pointed the draft metadata at it | Provide a testable draft without changing the stable `schemas/latest.json` pointer |
| `scripts/validate-0.8.mjs`, `scripts/mcpdesc-views.mjs`, `scripts/test-views.mjs`, `scripts/validate-repository.mjs`, `spec/draft/fixtures/**`, `package.json` | Added semantic validation, projection/merge behavior, fixtures, and dependencies | Exercise cross-object requirements that the structural JSON Schema cannot express |
| `spec/README.md` | Linked the experimental v0.8.0 schema and retained its unreleased status | Keep the specification index synchronized with the available draft artifacts |

## MCP Description v0.8.0 Community Working Draft 2 implementation — frozen 2026-08-26

Draft 2 continued from the immutable Draft 1 baseline and experimentally implemented exact review-stage snapshots of Proposals 0008, 0009, 0010, 0011, 0012, and 0013 in addition to the six proposal revisions already represented by Draft 1. Proposal 0006 remained excluded. The snapshot did not accept any proposal, supersede stable v0.7.0, or change `schemas/latest.json`.

| File or path | Change | Reason |
|---|---|---|
| `spec/draft/sections/**`, `spec/draft/mcp-description.md` | Added native provenance records and primitive attribution, reusable components and local references, JSON and restricted YAML serializations, object-level `x-*` extensions, primitive client capability requirements, and optional-section/non-empty-collection rules | Implement Proposals 0008–0013 experimentally for interoperability review while retaining Draft 1 behavior |
| `spec/draft/guides/**`, `spec/draft/examples/**`, `spec/draft/extensions/**`, `spec/draft/CHANGELOG.md` | Updated supporting guidance, examples, extension documentation, migration material, and Draft 2 history | Keep informative material synchronized with the expanded normative draft |
| `schemas/mcp-description/0.8.0.json`, `schemas/draft.json` | Expanded the active structural schema and advanced draft metadata to `v0.8.0-draft.2` dated 2026-08-26 | Provide a structurally testable Draft 2 without changing the stable schema pointer |
| `spec/draft/proposal-snapshots/0008-*.md` through `0013-*.md`, `spec/draft/PROPOSALS.md` | Captured six additional proposal revisions with immutable source commits and SHA-256 digests and retained Draft 1 proposal provenance | Make all 12 experimental Draft 2 design inputs independently reviewable and reproducible |
| `scripts/validate-0.8.mjs`, `scripts/mcpdesc-views.mjs`, `scripts/test-views.mjs`, `scripts/test-serializations.mjs`, `scripts/validate-repository.mjs`, `spec/draft/fixtures/**`, `spec/draft/serialization-fixtures/**` | Added semantic, serialization, component-resolution, projection, merge, and repository coverage for Draft 2 | Exercise cross-object and source-serialization requirements beyond structural JSON Schema validation |
| `packages/validator/src/snapshots/0.8.0-draft.2/**`, `packages/validator/test/snapshots/0.8.0-draft.2/**`, validator registry, declarations, tests, package metadata, and documentation | Added the immutable `0.8.0-draft.2` selector with embedded schema digest `ab692c1a5a0f7e5f29be1940aa8c64a56d4620be0a19d00cf0a64680b7e517fa` and released cumulative validator `0.2.0` while preserving Draft 1 | Make Draft 2 validation reproducible and keep earlier selector behavior immutable |
| `README.md`, `spec/README.md`, `GOVERNANCE.md`, `specification-status.json` | Advanced repository status from Draft 1 to Draft 2 | Keep public and machine-readable status aligned with the frozen snapshot |

## MCP Description v0.8.0 Community Working Draft 3 implementation — frozen 2026-08-27

Draft 3 continued from the immutable Draft 2 baseline as an editorial and review-response snapshot. It retained Proposals 0001–0005, 0007, and 0009–0013 as experimental inputs, retained the exact Proposal 0008 snapshot as provenance, but removed Proposal 0008's native provenance implementation after review. Proposal 0006 and the competing project-defined provenance extension remained outside the implementation. The snapshot did not accept any proposal, supersede stable v0.7.0, or change `schemas/latest.json`.

| File or path | Change | Reason |
|---|---|---|
| `spec/draft/sections/**`, `spec/draft/mcp-description.md` | Simplified normative `_meta` text by delegating revision-specific key and value rules to MCP, removed native provenance structures, moved reusable components before the appendices, restored a concise Reference Object example, and clarified the relationship among normative text, schemas, examples, and fixtures | Incorporate Draft 2 review feedback without expanding the intended feature surface |
| `spec/draft/guides/**`, `spec/draft/examples/**`, `spec/draft/CHANGELOG.md` | Removed native-provenance guidance and examples and synchronized companion material with the editorial corrections | Prevent informative material from describing behavior excluded from Draft 3 |
| `schemas/mcp-description/0.8.0.json`, `schemas/draft.json` | Removed native provenance structures and advanced draft metadata to `v0.8.0-draft.3` dated 2026-08-27 | Keep structural validation and status aligned with the reviewed Draft 3 text |
| `spec/draft/proposal-snapshots/**`, `spec/draft/PROPOSALS.md` | Preserved all exact Draft 2 proposal captures but changed Proposal 0008's relationship to explicitly excluded from Draft 3 | Preserve design-input provenance without implying that the removed model remained implemented |
| `scripts/validate-0.8.mjs`, `scripts/mcpdesc-views.mjs`, `scripts/test-views.mjs`, `scripts/validate-repository.mjs`, `spec/draft/fixtures/**` | Removed native-provenance validation and fixtures and synchronized semantic, projection, merge, and repository checks with the corrected draft | Ensure tests exercise Draft 3 rather than the superseded Draft 2 experiment |
| `packages/validator/src/snapshots/0.8.0-draft.3/**`, `packages/validator/test/snapshots/0.8.0-draft.3/**`, validator registry, declarations, tests, package metadata, and documentation | Added the immutable `0.8.0-draft.3` selector with embedded schema digest `8823c1f1946360b2a44d00920e2092e5e4acd139a1964befad4eb0bf3ce96002` and released cumulative validator `0.3.0` while preserving Draft 1 and Draft 2 | Make the reviewed Draft 3 behavior reproducible without rewriting prior selectors |
| `.github/workflows/**`, validator package provenance files and documentation | Added trusted npm publishing controls and package-release checks used for validator `0.3.0` | Bind validator publication to reviewed tags and package metadata |
| `README.md`, `spec/README.md`, `GOVERNANCE.md`, `specification-status.json` | Advanced repository status from Draft 2 to Draft 3 | Keep public and machine-readable status aligned with the frozen snapshot |

## MCP Description v0.8.0 Community Working Draft 4 implementation — prepared 2026-08-28

Draft 4 continues from the immutable Draft 3 baseline and implements exact review-stage snapshots of Proposals 0015, 0016, 0017, and 0019 experimentally. Proposals 0006, 0014, and 0018 remain excluded. The draft remains unreleased, does not accept any proposal, does not supersede stable v0.7.0, and does not change `schemas/latest.json`.

| File or path | Change | Reason |
|---|---|---|
| `spec/draft/sections/**`, `spec/draft/mcp-description.md` | Added named Prompt invocation/result examples, Prompt example components, Prompt and Resource Template completion examples, Tool interaction examples, and immutable schema identity/publication rules; folded Prompt component changes into Section 17 and removed an accidentally duplicated components section | Keep normative text synchronized with the four experimentally implemented proposal revisions and preserve one canonical components section before the appendices |
| `spec/draft/guides/**`, `spec/draft/examples/**`, `spec/draft/extensions/**`, `spec/draft/CHANGELOG.md` | Updated active guidance, examples, extension documentation, migration notes, and Draft 4 history | Demonstrate and explain Draft 4 behavior without changing frozen prior snapshots |
| `schemas/mcp-description/0.8.0.json`, `schemas/draft.json` | Added the Draft 4 structures, changed the active schema `$id` to `https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json`, and renamed the draft-manifest `$id` field to `schemaId` | Give Draft 4 an exact format-qualified schema identity while keeping the manifest distinct from a JSON Schema |
| `spec/draft/proposal-snapshots/0015-*.md`, `0016-*.md`, `0017-*.md`, `0019-*.md`, `spec/draft/PROPOSALS.md` | Captured exact proposal revisions with source commits and SHA-256 digests and recorded included and excluded relationships | Make experimental Draft 4 design inputs independently reviewable and reproducible |
| `scripts/validate-0.8.mjs`, `scripts/mcpdesc-views.mjs`, `scripts/test-views.mjs`, `scripts/validate-repository.mjs`, `spec/draft/fixtures/**` | Added structural and semantic coverage, component resolution, protocol-view preservation, merge behavior, and positive, negative, and warning fixtures for the Draft 4 features | Exercise contextual and revision-aware requirements that JSON Schema alone cannot express |
| `scripts/schema-publication.mjs`, `scripts/test-schema-publication.mjs`, `scripts/check-release.mjs`, `scripts/prepare-draft-snapshot.mjs`, `scripts/README.md`, `package.json` | Added tested live-schema publication verification and integrated it as an explicit pre-tag release gate | Prevent publishing a Draft 4 tag while its canonical URI serves redirects, HTML, incorrect bytes, or unsuitable response metadata |
| `packages/validator/src/snapshots/0.8.0-draft.4/**`, `packages/validator/test/snapshots/0.8.0-draft.4/**`, validator registry, declarations, tests, and documentation | Added an immutable Draft 4 validator selector with embedded schema digest `93ed03f74059b5b3ce7509a96b59161bdab2c3cf7734397a9bec5a7588d0b03b` while preserving Draft 1–3 selectors | Make Draft 4 validation reproducible; package version selection and npm publication remain a separate approval step |
| `README.md`, `spec/README.md`, `GOVERNANCE.md`, `specification-status.json` | Advanced repository status metadata from Draft 3 to unreleased Draft 4 dated 2026-08-28 | Keep public and machine-readable status aligned with the prepared snapshot |
