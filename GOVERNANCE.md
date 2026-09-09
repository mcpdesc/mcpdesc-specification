# MCP Description Specification governance

This repository is governed as part of the independent `{mcpdesc}` open source project. The [organization-level governance](https://github.com/mcpdesc/.github/blob/main/GOVERNANCE.md) remains applicable; this document defines the specification-specific process.

## Scope

This repository maintains:

- the normative MCP Description specification;
- versioned JSON Schemas;
- specification examples and conformance-oriented test fixtures;
- proposals and design records;
- release planning and migration guidance.

## Specification status

Current stable and prerelease status is recorded in
[`specification-status.json`](specification-status.json) and summarized in the
repository [`README.md`](README.md). Public draft and release-candidate tags
identify review and interoperability baselines without satisfying the approval
requirements for a stable specification release.

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

A proposed release should preserve documents conforming to the current stable specification wherever reasonable. Any proposal that invalidates a document conforming to the current stable specification requires explicit maintainer approval and migration documentation.

## Proposal lifecycle

Proposals are working documents used to refine a major or otherwise non-trivial
change while its normative implementation is developed in the active draft.
Deliberation happens in a GitHub issue; the proposal document captures the design
and the decision.

Proposal statuses are:

- **Draft** — under active authoring;
- **Review** — complete enough for community review;
- **Accepted** — approved for inclusion in the specification;
- **Rejected** — not adopted, with rationale;
- **Withdrawn** — withdrawn by its author;
- **Implemented** — incorporated into a draft or release;
- **Superseded** — replaced by a later proposal.

Proposal numbers are assigned sequentially. Acceptance of a proposal does not itself publish a specification release.

### How a proposal moves through the process

1. **Open an issue** describing the problem and use cases. Discussion and deliberation happen there.
2. **Author the proposal** on a `feature/<slug>-proposal` branch using [`proposals/0000-template.md`](proposals/0000-template.md), with status `Draft` then `Review`, and open a pull request.
3. **Implement and review** the proposal on a `feature/<topic>` branch that changes `spec/draft/` and the affected schema, examples, fixtures, and `spec/draft/CHANGELOG.md`. Review and deliberation continue in the corresponding issue and proposal pull request.
4. **Capture the reviewed revision** exactly under `spec/draft/proposal-snapshots/` and record its source commit, digest, review links, status, and implementation relationship in `spec/draft/PROPOSALS.md`.
5. **Decide** the proposal after its implementation and review are complete. An **Accepted** proposal is merged into the root `proposals/` directory on `main`, where it becomes the durable decision record, and is marked **Implemented** when its normative changes are present in the active draft. A **Rejected** or **Withdrawn** proposal stays as its closed pull request and issue on GitHub, with the rationale recorded there; its normative implementation is removed from the active draft and it is not stored in the root `proposals/` directory.

The root `proposals/` directory therefore contains accepted or implemented proposals. Proposal-revision snapshots in the active draft are separate implementation inputs governed below; they are not accepted proposal decision records.

### Draft snapshots and review-stage proposals

Implementing a review-stage proposal in the active draft enables community implementation and interoperability feedback on concrete text and schemas; it does not shorten or replace proposal review. The canonical review-stage proposal remains in its pull request and is not merged into the root `proposals/` directory until accepted.

For each proposal implemented in the active draft:

1. the corresponding public issue and proposal pull request MUST be identified;
2. `spec/draft/PROPOSALS.md` MUST list every proposal covered, its status at capture, its implementation relationship, and the path to its captured revision under `spec/draft/proposal-snapshots/`;
3. each captured revision MUST reproduce the proposal file exactly as it exists at a specified full commit ID, without an inserted status banner or other modification;
4. the manifest MUST record the full commit ID, source repository, source path, review issue and pull request when applicable, and a SHA-256 digest of the captured file;
5. the commit ID MUST identify a publicly retrievable commit in the proposal's repository. It SHOULD be a commit included in the proposal pull request or, for an accepted proposal, the commit containing the proposal under the root `proposals/` directory on `main`. A branch name, tag name, pull-request head, or abbreviated commit ID alone is not sufficient provenance;
6. the captured file and recorded digest MUST be verified against the source path at that commit before publication;
7. the corresponding implementation MAY be merged to `spec/draft/`, but the changelog and snapshot notes MUST identify review-stage content as subject to review and possible incompatible change or removal;
8. when the active draft is published as a specification snapshot, that snapshot MUST be labeled as a prerelease and MUST NOT be represented as an accepted specification, stable release, or claim of community consensus; and
9. acceptance MUST still follow the normal review period, resolution of substantive feedback, and an explicit maintainer decision. Publishing, capturing, or implementing the proposal MUST NOT be used as evidence that acceptance is predetermined.

Proposal-revision snapshots are provenance records, not independently editable proposal documents. They are updated only by capturing another identified source revision and updating the manifest. A published prerelease tag preserves the proposal revisions used by that snapshot even when the active draft later captures newer revisions.

If a review-stage proposal included in a snapshot is later rejected or withdrawn, its normative implementation MUST be removed from the active draft. The proposal decision and rationale MUST be recorded in its issue and pull request. Previously published prerelease tags remain immutable historical records of what was shared; the active draft manifest records the removal or exclusion as appropriate.

## Branch and release model

- `main` is the integration branch and the default view of the project. Community-released specification versions live in `spec/<version>/`, historical releases may use pointers to their canonical source, and the in-progress specification lives in `spec/draft/`.
- All contribution branches target `main` via pull request. Normative feature branches change `spec/draft/` and all corresponding artifacts.
- Community stable releases are frozen into `spec/<version>/` and tagged; `spec/draft/` is then re-initialized for subsequent work.
- `schemas/latest.json` identifies the latest stable schema, not the active draft.
- Draft status may be represented separately in `schemas/draft.json` and `specification-status.json`.
- Maintainers may publish annotated draft snapshot tags named `v<version>-draft.<iteration>` for community feedback. A draft snapshot does not change the `mcpdesc` conformance version, freeze `spec/draft/`, update `schemas/latest.json`, or satisfy the approval requirements for a stable release.
- Maintainers may publish annotated release-candidate tags named `v<version>-rc.<iteration>` after selecting a draft baseline for final interoperability and release review. A release candidate remains a prerelease: it does not update `schemas/latest.json`, freeze a stable version folder, or imply acceptance of review-stage proposals. Each candidate uses its own immutable schema identity and must pass the same publication checks as other snapshots before tagging.
- Before tagging, maintainers MUST run the preparation and local release checks documented in [`scripts/README.md`](scripts/README.md) for the applicable release type. Drafts and release candidates MUST also pass their corresponding publication check after the canonical schema URL is live. A stable release review MUST verify that its canonical schema satisfies the publication requirements in the specification.
- Publishing a specification snapshot requires passing validation, synchronized normative text and schemas, examples, changelog and migration guidance, an explicit maintainer decision, and an annotated version tag.

### Published snapshot maintenance

The **published conformance artifacts** for a snapshot are its normative requirements, canonical schema bytes and `$id`, semantic validation behavior, examples, conformance fixtures, serialization fixtures, and proposal-revision provenance. Changing any of those artifacts requires a new public draft snapshot, release candidate, or stable specification release, as applicable. Existing specification tags remain immutable.

Changelogs, FAQs, guides, governance documents, and release-page prose are maintainable companion documentation. They may be corrected on `main` without publishing a new specification snapshot when the correction does not alter a frozen artifact. Such corrections must not be presented as changing the meaning or behavior of an existing snapshot.

Strictly editorial corrections to specification prose MAY be published as an immutable **editorial edition** of an existing release candidate or stable release. An editorial edition:

- MUST NOT change document-conformance requirements, canonical schema bytes or identity, semantic validation behavior, examples, conformance fixtures, serialization fixtures, or proposal-revision provenance;
- MUST retain the base snapshot's `mcpdesc` value, `$schema` URI, and validator selector;
- MUST identify its immutable base snapshot and use an annotated tag formed by appending SemVer build metadata `+editorial.<iteration>` to the base tag, for example `v0.8.0-rc.4+editorial.1` or `v0.8.0+editorial.1`;
- MUST use a positive, monotonically increasing editorial iteration for a given base snapshot;
- MUST pass the repository editorial-edition check against the base tag before tagging; and
- MUST be reviewed as editorial and must link to a public issue or pull request explaining why meaning is unchanged.

SemVer build metadata distinguishes immutable editorial editions but does not establish version precedence. Repository status metadata records the current editorial iteration for consumers that need ordering. A change to an RFC 2119/8174 requirement keyword, a conformance condition, or text whose effect is reasonably ambiguous is normative unless review establishes otherwise, and normally requires a new conformance snapshot instead of an editorial edition. Editorial-edition tags never move or replace their base tags.

### Specification artifact export

After an approved specification tag identifies an exact clean commit,
maintainers MAY export a reviewable copy of the [published specification
artifacts](#published-snapshot-maintenance) for use by downstream consumers.
An export records the specification snapshot, schema digest, semantic validation
implementation, and conformance fixtures included in the handoff.

The specification tag and source commit provide informational provenance.
Consumers are responsible for reviewing the exported artifacts, preserving the
behavior of versions they publish, and defining their own package versions and
release process. Export does not authorize publication by a consumer.

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
