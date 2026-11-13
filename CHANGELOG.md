# Changelog

This changelog records repository governance, release-process, and project-tooling changes. Changes to the MCP Description format are recorded in the versioned specification changelog, currently [0.9.0](spec/0.9.0/CHANGELOG.md).

## 0.9.0 preparation — 2026-11-12

- Prepared the stable 0.9.0 artifact tree and promoted Proposals 0024–0036 as durable decision records. Publication and downstream default adoption remain separate coordination steps.
- Simplified proposal tracking: inclusion in the versioned snapshot list means implemented in that specification version; Git history is the source of truth for changes, without separate capture-status or digest bookkeeping.

## 2026-10-24 — Stable maintenance policy

- Established dated validator revisions and `release/<major>.<minor>.x` maintenance branches for correcting stable validation defects without changing frozen schemas or normative text.

## 2026-10-21 — Validator maintenance

- Published the first dated validator revision for 0.8.0 and added regression coverage for the corrected protocol-scoped Tool-schema behavior.

## 2026-10-20 — Repository validation

- Separated expected fixture warnings from repository warnings and required exact diagnostic-code counts for warning fixtures.

## 2026-09-09 — Release governance

- Formalized stable artifact freezing and immutable editorial corrections, added release-date safeguards, and adopted the pre-1.0 policy allowing breaking changes in `0.x` minor releases.