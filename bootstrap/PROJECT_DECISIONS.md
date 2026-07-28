# Locked project decisions

The implementation assistant must preserve these decisions unless the project maintainer explicitly changes them.

## Repository and release status

| Version | Status | Canonical source |
|---|---|---|
| 0.7.0 | Current stable release | `cisco-open/mcptoolkit-contract` |
| 0.8.0 | Community working draft | `mcpdesc/mcpdesc-specification` |

- `main` represents the imported v0.7.0 reference baseline plus current community governance and provenance documents.
- Normative v0.8.0 work occurs on the long-lived integration branch `draft/0.8.0`.
- Feature branches for v0.8.0 target `draft/0.8.0`, not `main`.
- `schemas/latest.json` must continue pointing to `0.7.0` until v0.8.0 is explicitly released.
- Do not publish a GitHub Release for the imported v0.7.0 baseline. An annotated tag such as `baseline-0.7.0` may be used, provided its message states that the canonical v0.7.0 release remains in Cisco Open.
- v0.8.0 becomes stable only after an explicit release decision, final validation, tagging, publication, and documentation updates.

## Project identity

- The specification repository is part of the independent `{mcpdesc}` community project.
- The initial MCP Description specification and related tools originated at Cisco DevNet and were published through Cisco Open.
- This transition is a transition of future development and governance, not a copyright donation or assignment.
- Do not imply Cisco endorsement, partnership, certification, sponsorship, or support commitment.
- Cisco employees may participate in the project, subject to Cisco's applicable contribution and approval policies.

## Copyright and licensing

- The repository uses Apache License 2.0 for the specification, schemas, examples, tests, scripts, and repository documentation unless a file explicitly states otherwise.
- Cisco retains copyright in Cisco-originated contributions where applicable.
- Subsequent contributors or their employers retain copyright in their respective contributions.
- Copyright is not centralized in the `{mcpdesc}` project or its maintainers.
- Preserve the upstream Apache-2.0 license, applicable notices, Git authorship, and project provenance.
- Maintain a clear record of modified imported files.

## Contribution model

- No Contributor License Agreement.
- No copyright assignment.
- No Developer Certificate of Origin sign-off.
- Contributors represent that they have the right to submit their contribution under Apache-2.0, including any authorization required from their employer.
- AI-assisted contributions are allowed but must be disclosed in the issue or pull request, consistent with the `{mcpdesc}` organization policy.

## Scope separation

- This repository owns future MCP Description specification development, versioned schemas, specification examples, proposals, and conformance-oriented specification checks.
- The MCP Toolkit and `mcpcontract` remain in `cisco-open/mcptoolkit-contract`.
- Do not import CLI source code, package publishing configuration, vendor-specific toolkit rules, or implementation-only tests into this repository.
- The toolkit may later consume released schemas from this repository, but toolkit implementation changes are a separate project.

## Initial v0.8.0 inputs

The first two tracked inputs are:

1. Alignment with the MCP protocol release dated `2026-07-28`.
2. Support for documenting MCP `_meta`, including a careful analysis of where `_meta` belongs in a static MCP Description and how it should be represented.

These inputs require research and proposals before normative schema changes.
