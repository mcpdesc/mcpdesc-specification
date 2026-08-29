# MCP Description Specification

A portable, machine-readable contract format for describing Model Context Protocol servers.

> This repository is the development home for the next version of the MCP Description Specification. Draft material here is not a released specification until it is explicitly tagged and published — see the status table below.

## Status

| Version | Status | Canonical source |
|---|---|---|
| 0.7.0 | Current stable release | [`cisco-open/mcptoolkit-contract`](https://github.com/cisco-open/mcptoolkit-contract/tree/main/spec) |
| 0.8.0 | Community Working Draft 4 (`v0.8.0-draft.4`; unreleased) | [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification) |

The machine-readable form of this status is in [`specification-status.json`](specification-status.json).

Draft 4 is the current in-review interoperability snapshot of v0.8.0. It remains subject to further review and incompatible change; its [proposal manifest](spec/draft/PROPOSALS.md) records the exact design-input revisions represented and excluded after review. The cumulative `@mcpdesc/validator` 0.4.0 package supports the immutable Draft 1 through Draft 4 snapshots and is intended for npm `latest` after the Draft 4 specification tag and tarball are reviewed.

## Repository roles

- `main` is the integration branch and the default view of the project. It carries every released specification version as a folder under `spec/`, plus the in-progress `spec/draft/`, so work in progress is visible without switching branches.
- Feature branches (for example `feature/support-meta` or `feature/support-mcp-2026-07-28`) target `main` via pull request and change `spec/draft/`.
- Released versions are frozen into their own version folder under `spec/` (for example `spec/0.8.0/`) and tagged (for example `v0.8.0`); `spec/draft/` is then re-initialized from that snapshot.
- `schemas/latest.json` continues to identify v0.7.0 until v0.8.0 is explicitly released.

## Project identity

The `{mcpdesc}` project is an independent open source community project. The initial MCP Description specification and related tools originated at Cisco DevNet and were released through Cisco Open. This repository does not represent a Cisco product, service, official standardization effort, endorsement, partnership, or support commitment.

Cisco employees may participate in the project, subject to Cisco's applicable contribution and approval policies.

## Repository structure

```text
spec/                         Per-version specification folders (draft/ + frozen releases)
packages/validator/           Reusable structural and semantic validator package
schemas/mcp-description/      Versioned MCP Description JSON Schemas
proposals/                    Specification change proposals
scripts/                      Repository validation and maintenance scripts
ORIGIN.md                     Imported-source provenance
GOVERNANCE.md                 Current community governance
CONTRIBUTING.md               Contribution process and licensing terms
```

See [`scripts/README.md`](scripts/README.md) for the script execution map and links to the authoritative workflow documentation.

## Contributing

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`GOVERNANCE.md`](GOVERNANCE.md). Non-trivial normative changes should begin with an issue and a proposal.

There is no CLA, copyright assignment, or DCO sign-off requirement. By contributing, you represent that you have the right to submit the contribution under Apache-2.0, including any authorization required from your employer.

## License and attribution

Repository content is licensed under Apache License 2.0 unless explicitly stated otherwise.

See [`LICENSE`](LICENSE) (terms), [`NOTICE`](NOTICE) (copyright and attribution), [`ORIGIN.md`](ORIGIN.md) (import provenance), and [`MODIFICATIONS.md`](MODIFICATIONS.md) (changes to imported material).
