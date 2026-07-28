# MCP Description Specification

A portable, machine-readable contract format for describing Model Context Protocol servers.

> This repository is the development home for the next version of the MCP Description Specification. Version 0.7.0 remains the current stable release, and its canonical source remains the Cisco Open repository. Material developed here for v0.8.0 is not a released specification until explicitly tagged and published.

## Status

| Version | Status | Canonical source |
|---|---|---|
| 0.7.0 | Current stable release | [`cisco-open/mcptoolkit-contract`](https://github.com/cisco-open/mcptoolkit-contract/tree/main/spec) |
| 0.8.0 | Community working draft | [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification) |

The machine-readable form of this status is in [`specification-status.json`](specification-status.json).

## Repository roles

- `main` contains the imported v0.7.0 reference baseline, current repository governance, licensing, and provenance information.
- `draft/0.8.0` is the integration branch for the v0.8.0 community working draft.
- Feature branches for v0.8.0 should target `draft/0.8.0`.
- `schemas/latest.json` continues to identify v0.7.0 until v0.8.0 is explicitly released.

## Project identity

The `{mcpdesc}` project is an independent open source community project. The initial MCP Description specification and related tools originated at Cisco DevNet and were released through Cisco Open. This repository does not represent a Cisco product, service, official standardization effort, endorsement, partnership, or support commitment.

Cisco employees may participate in the project, subject to Cisco's applicable contribution and approval policies.

## Repository structure

```text
spec/                         Normative specification and non-normative guides
schemas/mcp-description/      Versioned MCP Description JSON Schemas
proposals/                    Specification change proposals
planning/                     Release planning and protocol-impact analyses
scripts/                      Repository validation and maintenance scripts
ORIGIN.md                     Imported-source provenance
MODIFICATIONS.md              Record of changes to imported material
GOVERNANCE.md                 Current community governance
CONTRIBUTING.md               Contribution process and licensing terms
```

## Contributing

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`GOVERNANCE.md`](GOVERNANCE.md). Non-trivial normative changes should begin with an issue and a proposal.

There is no CLA, copyright assignment, or DCO sign-off requirement. By contributing, you represent that you have the right to submit the contribution under Apache-2.0, including any authorization required from your employer.

## License and attribution

Repository content is licensed under Apache License 2.0 unless explicitly stated otherwise. Cisco retains copyright in Cisco-originated contributions where applicable. Subsequent contributors or their employers retain copyright in their respective contributions.

See [`LICENSE`](LICENSE), [`NOTICE`](NOTICE), [`ORIGIN.md`](ORIGIN.md), and [`MODIFICATIONS.md`](MODIFICATIONS.md).
