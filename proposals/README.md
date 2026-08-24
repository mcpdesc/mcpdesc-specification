# Specification proposals

Proposals are working documents that refine a non-trivial change — one involving
design choices, compatibility, or broad ecosystem impact — and record the decision
before it is written into the specification.

Deliberation starts in a GitHub issue. The proposal is authored on a branch,
opened as a pull request, and **merged to `main` only once its status is
`Accepted`**; rejected or withdrawn proposals remain as their closed pull request
and issue on GitHub, with the rationale recorded there. As a result this
directory contains only accepted proposals.

An unreleased public draft may contain an exact snapshot of a review-stage
proposal revision under `spec/draft/proposal-snapshots/`. Those copies are
versioned design inputs with commit and digest provenance, not accepted proposal
decision records. See [`../GOVERNANCE.md`](../GOVERNANCE.md) for the snapshot
requirements.

File names use a four-digit sequence and a short slug:

`0003-example-change.md`

Each proposal follows [`0000-template.md`](0000-template.md) and carries one of the
statuses defined in [`../GOVERNANCE.md`](../GOVERNANCE.md), which also describes the
full proposal workflow.
