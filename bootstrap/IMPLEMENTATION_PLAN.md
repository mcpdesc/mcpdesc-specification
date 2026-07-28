# Implementation plan

## Milestone 0 — Inspect and protect the workspace

- Verify the target repository URL and current branch state.
- Verify the configured Git author. Commits made by Stève while still acting in his Cisco role should use `stsfartz@cisco.com`.
- Do not change global Git configuration automatically.
- Do not push, force-push, delete branches, or create public releases without explicit instruction.
- Read all files in this pack before making changes.

## Milestone 1 — Import the v0.7.0 baseline with provenance

Use a history-preserving filtered import from `cisco-open/mcptoolkit-contract`.

Include:

- `spec/**`
- `schemas/mcp-description/**`
- `schemas/latest.json`
- root `LICENSE`
- root `NOTICE`

Exclude:

- CLI and toolkit implementation code
- npm publishing configuration for `mcpcontract`
- toolkit-specific schemas and rules
- toolkit tests, templates, and documentation not needed to understand the specification

Record:

- upstream repository URL
- exact imported commit SHA
- import date
- imported paths
- import method
- whether commit hashes were rewritten

Create an annotated `baseline-0.7.0` tag only if it can be clearly described as a reference import rather than a community release.

## Milestone 2 — Apply community governance and repository identity

Overlay the files from `repo-template/`.

- Replace the upstream root `NOTICE` with the combined notice supplied by this pack, retaining the upstream notice verbatim.
- Fill every placeholder in `ORIGIN.md` with verified data.
- Preserve the historical Cisco specification governance document as `spec/GOVERNANCE-0.7.0.md`.
- Replace `spec/GOVERNANCE.md` with a short pointer to the repository-level `GOVERNANCE.md` and the historical file.
- Update `spec/README.md` so it accurately states:
  - v0.7.0 is the current stable release.
  - its canonical source remains Cisco Open.
  - this repository is the development home for v0.8.0.
- Do not alter normative v0.7.0 text or the v0.7.0 JSON Schema merely to modernize wording.

## Milestone 3 — Establish validation and contribution workflows

- Add the issue templates, pull-request template, AI agent guide, and CI workflow.
- Create a minimal Node development setup from the supplied `package.json`.
- Generate and commit `package-lock.json` using the active supported Node version.
- Ensure validation can:
  - parse and meta-validate versioned JSON Schemas;
  - validate JSON and YAML examples against the schema selected by their `mcpdesc` field;
  - verify the repository status file;
  - verify that `schemas/latest.json` remains at v0.7.0 while v0.8.0 is a draft;
  - verify that no provenance placeholders remain.

## Milestone 4 — Create the v0.8.0 integration branch

Create `draft/0.8.0` from the bootstrapped `main` branch.

On that branch:

- Add an unreleased v0.8.0 section to `spec/CHANGELOG.md`.
- Mark the specification front matter as a community working draft without representing it as a release.
- Add `schemas/draft.json` pointing to `0.8.0`, but leave `schemas/latest.json` at `0.7.0`.
- Do not create `schemas/mcp-description/0.8.0.json` until the canonical community schema `$id` URI has been explicitly selected or documented as a maintainer decision.

## Milestone 5 — Start the v0.8.0 design work

Create or refine the two initial proposal documents:

- `proposals/0001-mcp-2026-07-28-alignment.md`
- `proposals/0002-meta-support.md`

Produce `planning/mcp-2026-07-28-impact-matrix.md` by comparing the final MCP 2026-07-28 specification with the MCP Description v0.7.0 specification and schema.

For every MCP change, classify its MCP Description impact as one of:

- normative schema/spec change required;
- compatible documentation clarification;
- extension or future-work candidate;
- toolkit-only impact;
- no MCP Description impact.

At minimum, assess:

- stateless protocol and removal of initialization/session assumptions;
- `server/discover` and capability discovery;
- expanded `_meta` use and standard metadata keys;
- the formal MCP extensions framework;
- Tasks and MCP Apps as extensions;
- deprecation of roots, sampling, and logging;
- full JSON Schema 2020-12 for tool input and output schemas;
- transport routing/cache metadata where relevant to a static description;
- authorization changes;
- relevant error and result-shape changes.

Do not assume every MCP protocol change belongs in MCP Description.

## Milestone 6 — Report and stop before normative implementation

The first execution should stop after the repository is bootstrapped and the initial research/proposal artifacts exist.

Report:

- branches and commits created;
- exact upstream commit imported;
- files moved or replaced;
- validation results;
- unresolved decisions;
- proposed next PRs for actual v0.8.0 normative changes.

Do not implement the final `_meta` model or other normative v0.8.0 schema changes during the bootstrap unless the maintainer explicitly requests that additional milestone.
