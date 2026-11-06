# MCP Description Specification

A portable, machine-readable contract format for describing Model Context Protocol servers.

> This repository is the canonical home of the MCP Description Specification.

## Status

| Version | Status | Canonical source |
|---|---|---|
| 0.9.0 | Release Candidate 2 (`v0.9.0-rc.2`; prerelease) — in preparation | [`spec/draft/`](spec/draft/) |
| 0.8.0 | Current stable release | [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification/tree/v0.8.0/spec/0.8.0) |
| 0.7.0 | Previous stable release | [`cisco-open/mcptoolkit-contract`](https://github.com/cisco-open/mcptoolkit-contract/tree/main/spec) |

The machine-readable form of this status is in [`specification-status.json`](specification-status.json).

MCP Description 0.8.0 adds MCP `2026-07-28` support, multi-protocol version server descriptions, and deterministic Effective Protocol Views. It also introduces reusable components, richer examples and interactions, primitive client capability requirements, elicitation declarations, formal MCP extension support, reusable security schemes, and conforming JSON and YAML serializations. See the [changelog](CHANGELOG.md) for details. Executable validation is maintained as `@mcpdesc/validator` in the [`mcpdesc/core`](https://github.com/mcpdesc/core) tooling repository.

The 0.9.0 RC.2 preparation builds on RC.1 with the document ordering profile in Section 18 and discriminator-driven schema validation from review-stage Proposal 0034. The schema identity and intended downstream selector are `0.9.0-rc.2`; `mcpdesc` remains `0.9.0`. Document acceptance is unchanged by these enhancements, but raw schema paths, diagnostic counts, and enclosing-rule results can change. Rule and validation-result formats remain at `1.3.0`. RC.1 and earlier published snapshots remain immutable. RC.2 has not yet been tagged or published, and downstream selector support is not implied. The draft still includes the changes from Proposals 0031–0033, dialect-governed Tool schemas, the complete validation catalog, Effective Protocol View and merge cases, and the Resource `uri` requirement. The 0.9.0 draft includes breaking changes relative to 0.8.0 and remains subject to review; its [proposal manifest](spec/draft/PROPOSALS.md), [changelog](spec/draft/CHANGELOG.md), and [migration guide](spec/draft/guides/migration-0.8-to-0.9.md) describe the changes.

## Repository roles

- `main` is the integration branch and the default view of the project. It carries every released specification version and, when development is active, the in-progress `spec/draft/`.
- Feature branches target `main` via pull request. When an active development version has been initialized, normative feature branches change `spec/draft/`.
- Released versions are frozen into their own version folder under `spec/` (for example `spec/0.8.0/`) and tagged (for example `v0.8.0`).
- `schemas/latest.json` identifies the current stable schema. The active 0.9.0 working draft is described by `schemas/draft.json` and `specification-status.json`.

## Project identity

The `{mcpdesc}` project is an independent open source community project. The initial MCP Description specification and related tools originated at Cisco DevNet and were released through Cisco Open. This repository does not represent a Cisco product, service, official standardization effort, endorsement, partnership, or support commitment.

Cisco employees may participate in the project, subject to Cisco's applicable contribution and approval policies.

## Repository structure

```text
spec/                         Per-version specification folders and optional active draft
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
