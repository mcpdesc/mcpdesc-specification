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

Add an entry whenever imported specification text, schemas, or examples are modified. Where the file format permits, modified derivative files should also contain a prominent origin/modification notice.

## Preserved verbatim

- `schemas/mcp-description/0.1.0.json` … `0.7.0.json` — imported unchanged (JSON Schema draft-07). The stable v0.7.0 schema must remain byte-for-byte identical to upstream.
- `schemas/latest.json` — imported unchanged; still identifies `mcp-description` `0.7.0`.
- `LICENSE` — imported Apache-2.0 license, unchanged.
- Normative `spec/sections/**`, `spec/guides/**`, `spec/examples/**`, and `spec/mcp-description.md` — imported unchanged.

## Bootstrap tooling notes

- `scripts/validate-repository.mjs` — supplied validation scaffold; corrected to meta-validate and compile each versioned schema against the JSON Schema dialect it declares (draft-07 for the current stable schemas, 2020-12 for future draft schemas) rather than assuming a single dialect.
- The original bootstrap pack (master prompt, project decisions, plan, acceptance criteria, reference sources, and import helper) is retained for provenance under `bootstrap/`.
