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
| 0.8.0 | Community working draft | `mcpdesc/mcpdesc-specification` |

The v0.8.0 draft is not a released specification until explicitly approved, tagged, and published.

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
3. **Review** happens on that pull request. Only **Accepted** proposals are merged to `main`; the merged document is the durable decision record. A **Rejected** or **Withdrawn** proposal stays as its closed pull request and issue on GitHub, with the rationale recorded there — it is not stored in the repository.
4. **Implement** the accepted proposal on a separate `feature/<topic>` branch that changes `spec/draft/` and the affected schema, examples, and `spec/draft/CHANGELOG.md`.
5. When the implementation merges, set the proposal status to **Implemented** and link it from the changelog entry.

Because only accepted proposals are merged, the `proposals/` directory holds only the changes that are approved for, or already in, the specification.

## Branch and release model

- `main` is the integration branch and the default view of the project. Every released specification version lives in its own `spec/<version>/` folder, and the in-progress draft lives in `spec/draft/`, so all versions are readable without switching branches.
- Feature branches target `main` via pull request and change `spec/draft/`.
- Released versions are frozen into `spec/<version>/` and tagged; `spec/draft/` is then re-initialized from that snapshot.
- `schemas/latest.json` identifies the latest stable schema, not the active draft.
- Draft status may be represented separately in `schemas/draft.json` and `specification-status.json`.
- Releases require passing validation, updated normative text and schemas, examples, changelog and migration guidance, an explicit maintainer decision, and an annotated version tag.

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
