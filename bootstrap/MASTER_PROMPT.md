# Master prompt for the repository bootstrap assistant

You are working in the newly created GitHub repository `mcpdesc/mcpdesc-specification` and have access to the adjacent `mcpdesc-specification-bootstrap` pack.

Your task is to bootstrap the independent community repository for the MCP Description specification and start the v0.8.0 working draft. Execute the work now in the local repository. Do not merely provide instructions.

## Read first

Read these pack files in full before changing anything:

1. `PROJECT_DECISIONS.md`
2. `IMPLEMENTATION_PLAN.md`
3. `ACCEPTANCE_CRITERIA.md`
4. `REFERENCE_SOURCES.md`
5. every file under `repo-template/`

Treat `PROJECT_DECISIONS.md` as authoritative. Do not reinterpret or relax its legal, governance, branching, attribution, or scope decisions.

## Non-negotiable outcomes

- Import the relevant MCP Description specification and schema history from `cisco-open/mcptoolkit-contract` using a history-preserving filtered import.
- Keep `main` as the imported v0.7.0 reference baseline plus current community governance and provenance.
- State clearly that the canonical source for the stable v0.7.0 release remains `cisco-open/mcptoolkit-contract`.
- Create `draft/0.8.0` as the integration branch for the community working draft.
- Do not import or fork the MCP Toolkit implementation.
- Do not claim a Cisco donation, copyright assignment, endorsement, partnership, certification, sponsorship, or support commitment.
- Preserve the Apache-2.0 license, the applicable Cisco notice, Git authorship, and source provenance.
- Use no CLA, no copyright assignment, and no DCO.
- Include the contributor right-to-submit representation, including employer authorization where required.
- Keep `schemas/latest.json` on v0.7.0 until an explicit v0.8.0 release.
- Do not release or publish v0.8.0.

## Git safety and identity

- Inspect the current repository before modifying it.
- Do not alter global Git configuration.
- Before making commits, show the configured author name and email in your execution log.
- If the intended author is Stève Sfartz and commits are being made during his Cisco employment for this specification work, verify that the commit email is `stsfartz@cisco.com`. If it is not, stop before committing and report the mismatch.
- Do not push, force-push, delete remote branches, or create GitHub Releases unless explicitly instructed.
- Make focused local commits with clear messages. DCO sign-off is not required and should not be added as a repository requirement.

## Import method

Use `bootstrap-tools/import-upstream-history.sh` as a starting point. Inspect and adapt it safely to the actual state of the target repository.

Import only:

- `spec/**`
- `schemas/mcp-description/**`
- `schemas/latest.json`
- `LICENSE`
- `NOTICE`

Capture the exact source commit before filtering and write it into `ORIGIN.md`.

If the target repository already contains commits, preserve them and merge the filtered history without discarding work. Never overwrite remote history.

## Overlay and reconciliation

Overlay `repo-template/` after the import, then reconcile rather than blindly overwrite:

- Root `GOVERNANCE.md` becomes the current governance.
- Preserve the imported `spec/GOVERNANCE.md` as `spec/GOVERNANCE-0.7.0.md`.
- Replace `spec/GOVERNANCE.md` with a short current pointer.
- Update `spec/README.md` to show the agreed two-version status and repository roles.
- Preserve normative v0.7.0 specification text and the exact v0.7.0 schema unless a change is strictly needed for repository navigation or attribution. Do not modernize the stable normative content.
- Use the combined `NOTICE` from the template and retain the upstream notice verbatim.
- Replace every `<...>` placeholder with verified data or remove the field if genuinely inapplicable. CI must fail if placeholders remain.

## Validation setup

Use the supplied Node validation scaffold. Generate `package-lock.json`, run all checks, and correct genuine bootstrap defects.

The validation workflow must check:

- schema JSON syntax and JSON Schema 2020-12 meta-validity;
- JSON and YAML examples against the schema selected by `mcpdesc`;
- `specification-status.json` consistency;
- `schemas/latest.json` remains at v0.7.0 while v0.8.0 is a draft;
- required governance, license, notice, and origin files;
- absence of unresolved provenance placeholders.

## Start the v0.8.0 draft

After `main` is bootstrapped and validated:

1. Create `draft/0.8.0`.
2. Add a v0.8.0 unreleased section to the specification changelog.
3. Update draft front matter to say “Community working draft”; do not call it a release.
4. Add `schemas/draft.json` identifying v0.8.0 as the draft while leaving `schemas/latest.json` unchanged.
5. Do not create the final v0.8.0 schema until the canonical community `$id` URI is explicitly selected and recorded.
6. Refine the supplied proposal documents.
7. Produce the MCP 2026-07-28 impact matrix from primary MCP sources.

The impact matrix must distinguish changes to runtime MCP from changes that actually belong in a static MCP Description. Do not automatically mirror all protocol fields.

## Initial issues and proposals

Carry forward these historical inputs:

- https://github.com/mcpdesc/mcpdesc.org/issues/5 — `_meta` support
- https://github.com/mcpdesc/mcpdesc.org/issues/8 — MCP July 2026 support

Prepare issue-ready text in `planning/issues-to-create.md` for corresponding issues in the new repository, preserving links to the original issues and their authorship/date context. Do not use an API to create public issues unless explicitly authorized.

## Stop point

Complete Milestones 0 through 5 from `IMPLEMENTATION_PLAN.md`, then stop before final normative schema implementation.

At the end, provide:

- a concise repository tree;
- local branches and commits created;
- the exact upstream commit imported;
- validation commands and results;
- files whose content or location changed from upstream;
- open design decisions;
- a suggested sequence of small pull requests for the actual v0.8.0 specification work.

Do not ask questions unless a missing fact makes safe execution impossible. Prefer verified repository data and clearly documented assumptions.
