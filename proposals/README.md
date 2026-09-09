# Specification proposals

Proposals are working documents that refine a non-trivial change — one involving
design choices, compatibility, or broad ecosystem impact — and record the decision
while its normative implementation is developed in the active draft.

Every proposal corresponds to a public GitHub issue. The proposal is authored on
a branch and opened as a pull request. Its implementation is developed first
under `spec/draft/`, with the reviewed proposal revision captured exactly under
`spec/draft/proposal-snapshots/` and recorded in `spec/draft/PROPOSALS.md`.
Once accepted, the proposal is merged here as the durable decision record;
rejected or withdrawn proposals remain as their closed pull request and issue on
GitHub, with the rationale recorded there. As a result this directory contains
only accepted or implemented proposals.

An active draft contains an exact snapshot of each implemented proposal revision
under `spec/draft/proposal-snapshots/`. Those copies are
versioned design inputs with commit and digest provenance, not accepted proposal
decision records. See [`../GOVERNANCE.md`](../GOVERNANCE.md) for the snapshot
requirements.

File names use a four-digit sequence and a short slug:

`0003-example-change.md`

Each proposal follows [`0000-template.md`](0000-template.md) and carries one of the
statuses defined in [`../GOVERNANCE.md`](../GOVERNANCE.md), which also describes the
full proposal workflow.
