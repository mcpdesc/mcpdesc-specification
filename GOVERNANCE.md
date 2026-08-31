# MCP Description Specification governance

This repository is governed as part of the independent `{mcpdesc}` open source project. The organization-level governance remains applicable; this document defines the specification-specific process.

## Scope

This repository maintains:

- the normative MCP Description specification;
- versioned JSON Schemas;
- specification examples and conformance-oriented test fixtures;
- proposals and design records;
- release planning and migration guidance.

The MCP Toolkit and `mcpcontract` implementation remain in `cisco-open/mcptoolkit-contract` and follow that repository's governance.

## Current status

| Version | Status | Canonical source |
|---|---|---|
| 0.7.0 | Current stable release | `cisco-open/mcptoolkit-contract` |
| 0.8.0 | Release Candidate 1 (`v0.8.0-rc.1`; prerelease) | `mcpdesc/mcpdesc-specification` |

The v0.8.0 draft is not a stable specification release. Draft snapshot tags publish specific review and interoperability baselines without satisfying the stable-release approval requirements.

## Roles

### Contributors

Anyone may propose, discuss, review, document, test, or implement specification improvements.

### Maintainers and specification editors

Maintainers steward the repository, facilitate community review, preserve coherence and compatibility, approve changes, manage branches, and publish releases. Maintainers administer project assets but do not acquire contributor copyrights.

Additional maintainers may be appointed under the `{mcpdesc}` organization governance after sustained constructive participation and approval by existing maintainers.

## Decision process

The project uses a lightweight, consensus-oriented process.

### Editorial and non-normative changes

Typographical fixes, link corrections, and non-normative clarifications may be accepted through normal pull-request review when they do not change conformance requirements.

### Normative compatible changes

A compatible normative change should include:

1. a public issue describing the problem;
2. a proposal when the change is non-trivial;
3. normative text, schema changes, and examples where applicable;
4. compatibility and security analysis;
5. a changelog entry;
6. maintainer approval after reasonable community review.

### Breaking or potentially breaking changes

Breaking changes should be rare. A potentially breaking change must include clear justification, affected examples, migration guidance, and an explicit compatibility decision. It should normally remain open for public review for at least 30 days unless a security issue or release-blocking defect justifies a shorter period; the reason for shortening review must be documented.

MCP Description v0.8.0 is targeted to preserve v0.7.0 documents wherever reasonable. Any proposal that invalidates a conforming v0.7.0 document requires explicit maintainer approval and migration documentation.

## Proposal lifecycle

Proposals are working documents used to refine a major or otherwise non-trivial
change and agree on its scope before it is written into the specification.
Deliberation happens in a GitHub issue; the proposal document captures the design
and the decision.

Proposal statuses are:

- **Draft** — under active authoring;
- **Review** — complete enough for community review;
- **Accepted** — approved for normative implementation;
- **Rejected** — not adopted, with rationale;
- **Withdrawn** — withdrawn by its author;
- **Implemented** — incorporated into a draft or release;
- **Superseded** — replaced by a later proposal.

Proposal numbers are assigned sequentially. Acceptance of a proposal does not itself publish a specification release.

### How a proposal moves through the process

1. **Open an issue** describing the problem and use cases. Discussion and deliberation happen there.
2. **Author the proposal** on a `feature/<slug>-proposal` branch using [`proposals/0000-template.md`](proposals/0000-template.md), with status `Draft` then `Review`, and open a pull request.
3. **Review** happens on that pull request. Only an **Accepted** proposal is merged into the root `proposals/` directory on `main`, where it becomes the durable decision record. A **Rejected** or **Withdrawn** proposal stays as its closed pull request and issue on GitHub, with the rationale recorded there — it is not stored in the root `proposals/` directory.
4. **Implement** the accepted proposal on a separate `feature/<topic>` branch that changes `spec/draft/` and the affected schema, examples, and `spec/draft/CHANGELOG.md`.
5. When an accepted proposal's implementation merges, set the proposal status to **Implemented** and link it from the changelog entry.

The root `proposals/` directory therefore contains accepted or implemented proposals. Proposal-revision snapshots used by an unreleased public draft are separate historical inputs governed below; they are not accepted proposal decision records.

### Public draft snapshots and review-stage proposals

A maintainer may decide that an internally coherent draft is ready to share before every proposal it contains has completed review. This exception exists to obtain community implementation and interoperability feedback on concrete draft text and schemas; it does not shorten or replace proposal review. The canonical review-stage proposal remains in its pull request and is not merged into the root `proposals/` directory until accepted.

When publishing such a draft snapshot:

1. the maintainer decision MUST identify every proposal still in **Review** that the snapshot implements;
2. `spec/draft/PROPOSALS.md` MUST list every proposal covered, its status at capture, its implementation relationship, and the path to its captured revision under `spec/draft/proposal-snapshots/`;
3. each captured revision MUST reproduce the proposal file exactly as it exists at a specified full commit ID, without an inserted status banner or other modification;
4. the manifest MUST record the full commit ID, source repository, source path, review issue and pull request when applicable, and a SHA-256 digest of the captured file;
5. the commit ID MUST identify a publicly retrievable commit in the proposal's repository. It SHOULD be a commit included in the proposal pull request or, for an accepted proposal, the commit containing the proposal under the root `proposals/` directory on `main`. A branch name, tag name, pull-request head, or abbreviated commit ID alone is not sufficient provenance;
6. the captured file and recorded digest MUST be verified against the source path at that commit before publication;
7. the corresponding implementation MAY be merged to `spec/draft/`, but the changelog and snapshot notes MUST identify review-stage content as subject to review and possible incompatible change or removal;
8. the snapshot MUST be labeled as an unreleased community working draft and MUST NOT be represented as an accepted specification, stable release, or claim of community consensus; and
9. acceptance MUST still follow the normal review period, resolution of substantive feedback, and an explicit maintainer decision. Publishing, capturing, or implementing the proposal MUST NOT be used as evidence that acceptance is predetermined.

Proposal-revision snapshots are provenance records, not independently editable proposal documents. They are updated only by capturing another identified source revision and updating the manifest. A published draft tag preserves the proposal revisions used by that snapshot even when the active draft later captures newer revisions.

If a review-stage proposal included in a snapshot is later rejected or withdrawn, its normative implementation MUST be removed from the active draft. The proposal decision and rationale MUST be recorded in its issue and pull request. Previously published draft tags remain immutable historical records of what was shared; the active draft manifest records the removal or exclusion as appropriate.

## Branch and release model

- `main` is the integration branch and the default view of the project. Every released specification version lives in its own `spec/<version>/` folder, and the in-progress draft lives in `spec/draft/`, so all versions are readable without switching branches.
- Feature branches target `main` via pull request and change `spec/draft/`.
- Released versions are frozen into `spec/<version>/` and tagged; `spec/draft/` is then re-initialized from that snapshot.
- `schemas/latest.json` identifies the latest stable schema, not the active draft.
- Draft status may be represented separately in `schemas/draft.json` and `specification-status.json`.
- Maintainers may publish annotated draft snapshot tags named `v<version>-draft.<iteration>` for community feedback. A draft snapshot does not change the `mcpdesc` conformance version, freeze `spec/draft/`, update `schemas/latest.json`, or satisfy the approval requirements for a stable release.
- Maintainers may publish annotated release-candidate tags named `v<version>-rc.<iteration>` after selecting a draft baseline for final interoperability and release review. A release candidate remains a prerelease: it does not update `schemas/latest.json`, freeze a stable version folder, or imply acceptance of review-stage proposals. Each candidate uses its own immutable schema identity and must pass the same publication checks as Draft 4 and later snapshots before tagging.
- For Draft 4 and later, once the canonical schema URL is live, maintainers MUST run `npm run release:check -- draft-publication` before tagging a public draft snapshot so the canonical URI, immutable bytes, direct-serving policy, and required publication metadata are verified.
- Releases require passing validation, updated normative text and schemas, examples, changelog and migration guidance, an explicit maintainer decision, and an annotated version tag.

### Validator snapshot publication

The `@mcpdesc/validator` package uses implementation SemVer independently from immutable specification snapshot selectors. Each selector has sibling runtime and frozen test snapshot directories; publishing support for a later draft MUST NOT alter an earlier selector's schema, semantics, metadata, fixtures, or expected results.

The reviewed specification assembly records the chosen package version, exact selector metadata, schema digests, and intended npm dist-tag. A maintainer creates the specification snapshot tag first, then reviews `npm pack --dry-run --json` from that tag. Publishing an annotated `validator-v<semver>` tag explicitly authorizes the trusted-publishing workflow to publish that exact package version. A SemVer prerelease is published with the npm `next` dist-tag; a stable SemVer is published with `latest`. Repository scripts and other CI workflows MUST NOT create release tags, move npm dist-tags, select package versions, or publish packages.

Validator `0.4.0` cumulatively supports `0.8.0-draft.1` through `0.8.0-draft.4` and was published with npm `latest` on 2026-08-29. Later validator changes require a separately reviewed package version and publication tag.

Validator `0.5.0` adds the immutable `0.8.0-rc.1` selector, schema-identity resolution, and the strict-CSP standalone entry. It is prepared for npm `latest` after the RC.1 specification tag, tarball review, and explicit `validator-v0.5.0` publication tag.

## Intellectual property and contributions

Repository content is licensed under Apache License 2.0 unless explicitly stated otherwise.

By submitting a contribution, a contributor agrees that it may be distributed under Apache-2.0 and represents that they have the right to submit it under that license, including any authorization required from their employer.

Contributors or their employers retain copyright in their respective contributions. The project requires no CLA, copyright assignment, or DCO sign-off.

Existing copyright and attribution notices must be preserved. Third-party materials remain subject to their original terms.

## AI-assisted contributions

AI assistance is permitted, but its use and extent must be disclosed in the relevant issue or pull request. The human contributor remains responsible for correctness, originality, licensing, security, and review.

## Relationship to Cisco-originated work

The initial MCP Description specification and related tools originated at Cisco DevNet and were released through Cisco Open. The `{mcpdesc}` project builds on that open-licensed foundation as an independent initiative.

This repository does not represent a Cisco product, service, official standardization effort, endorsement, partnership, certification, sponsorship, or support commitment. Cisco employees may participate in the project, subject to Cisco's applicable contribution and approval policies.
