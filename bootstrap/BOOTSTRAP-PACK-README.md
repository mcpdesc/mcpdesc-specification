# MCP Description Specification repository bootstrap pack

Prepared for `mcpdesc/mcpdesc-specification` on 2026-07-28.

This pack bootstraps the independent community development repository for MCP Description v0.8 while preserving MCP Description v0.7.0 as the current stable specification whose canonical source remains the Cisco Open repository.

## What is included

- `MASTER_PROMPT.md` — the prompt to give an AI coding assistant.
- `PROJECT_DECISIONS.md` — decisions that the assistant must treat as fixed.
- `IMPLEMENTATION_PLAN.md` — milestones and sequencing.
- `ACCEPTANCE_CRITERIA.md` — the definition of done for the bootstrap.
- `REFERENCE_SOURCES.md` — authoritative inputs and source issues.
- `bootstrap-tools/` — a safe history-preserving import helper.
- `repo-template/` — governance, provenance, workflow, proposal, and CI files to overlay on the imported specification.

## Recommended use

1. Clone the empty or newly created `mcpdesc/mcpdesc-specification` repository.
2. Extract this archive next to the clone.
3. Give `MASTER_PROMPT.md` to the AI assistant and provide both directories in its workspace.
4. Review the assistant's commits before pushing.

The assistant should import the specification and schema history from `cisco-open/mcptoolkit-contract`, overlay the repository template, establish `main` as the imported v0.7.0 reference baseline, and create `draft/0.8.0` for the community working draft.

## Important boundaries

- The pack does not copy or fork the MCP Toolkit implementation.
- It does not claim a Cisco copyright donation, assignment, endorsement, partnership, or support commitment.
- It does not require a CLA, copyright assignment, or DCO sign-off.
- It does not promote v0.8.0 to a stable release.
- The exact upstream commit must be captured at import time and written into `ORIGIN.md`; no placeholder may remain.
