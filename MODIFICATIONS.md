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
