# Proposal revisions represented in MCP Description 0.9.0

This manifest records the exact proposal revisions used as design inputs for MCP Description 0.9.0.

Captured revisions are stored under `proposal-snapshots/` according to [`GOVERNANCE.md`](../../GOVERNANCE.md). All snapshots below had status **Draft** when captured and are not accepted decision records. Their source commits are on the local `feature/mcp-native-alignment` branch and become public when that branch is published; a rewritten history requires recapturing the provenance.

| Proposal | Implementation relationship | Source revision | Review record | Captured file | SHA-256 |
|---|---|---|---|---|---|
| 0024 — Validation Rule Identity, Provenance, and Outcomes | Pilot registry in [`validation/`](validation/); no document acceptance change | `75ab964c9a3799d3f39b5ee433e45d38e4fabe58`, `spec/draft/proposal-snapshots/0024-validation-rule-identity-and-provenance.md` | [Issue #72](https://github.com/mcpdesc/mcpdesc-specification/issues/72) | [`0024-validation-rule-identity-and-provenance.md`](proposal-snapshots/0024-validation-rule-identity-and-provenance.md) | `55cac58454794345d3e9a1b6409b8ae9e8a4892b5d9ded16d59bb10fccf287d1` |
| 0026 — Open MCP Results in Examples | Implemented in the working draft (Section 3.6, validator, schema, fixtures) | `dea2f100e654e4d0c765f3d2687e3e977bc0f2a0`, `proposals/0026-open-mcp-results-in-examples.md` | [Issue #72](https://github.com/mcpdesc/mcpdesc-specification/issues/72) | [`0026-open-mcp-results-in-examples.md`](proposal-snapshots/0026-open-mcp-results-in-examples.md) | `2a22ddc3c25749c188ccb08a94a76e1045545483e920ef23fc432b534235736c` |
| 0027 — Closed MCP Types | Part A implemented in the working draft (Sections 9.6 and 10.3, schema, fixtures); Part B recorded as a proposed arbitration, no behavior change | `d3efa3d6cf0ca11970ecb565a7f5a0f25e60120c`, `spec/draft/proposal-snapshots/0027-closed-mcp-types.md` | [Issue #72](https://github.com/mcpdesc/mcpdesc-specification/issues/72) | [`0027-closed-mcp-types.md`](proposal-snapshots/0027-closed-mcp-types.md) | `29bf4ffb610c9bf2519e83950153aa5a3d4a761aa3c340fe93cb39c43bfefd88` |

The proposal revisions represented by the stable 0.8.0 release remain recorded in [`../0.8.0/PROPOSALS.md`](../0.8.0/PROPOSALS.md).
