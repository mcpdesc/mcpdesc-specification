---
name: mcpdesc-release
description: 'Prepare, validate, and coordinate MCP Description draft snapshots, validator snapshot exports, and stable specification releases. Use when asked to release, tag, export, freeze, or perform release readiness checks.'
argument-hint: 'draft.<iteration> <date> | rc.<iteration> <date> | validator <selector> <output> | stable <version> | check'
---

# MCP Description Release

Use repository scripts as the source of deterministic release behavior. Do not reproduce their transformations manually.

## Procedure

1. Read `GOVERNANCE.md`, `AGENTS.md`, and `scripts/README.md`.
2. Confirm the worktree and branch. Release preparation belongs on a dedicated branch targeting `main`.
3. Choose exactly one preparation target:
   - Draft: `npm run release:prepare -- draft.<iteration> <YYYY-MM-DD>`
   - Release candidate: `npm run release:prepare -- rc.<iteration> <YYYY-MM-DD>`
   - Validator snapshot export: `npm run release:prepare -- validator <x.y.z-draft.n|x.y.z-rc.n> <output-directory>`
   - Stable: `npm run release:prepare -- stable <x.y.z>`
4. Complete the review-required prose, proposal provenance, schema pointers, tests, or status changes printed by the script. Snapshot exports require an exact approved tag at a clean `HEAD`.
5. Run the matching check:
   - `npm run release:check -- draft`
   - `npm run release:check -- rc`
   - `npm run release:check -- stable <x.y.z>`
6. Run `npm test` and `git diff --check`. For a validator snapshot export, review its manifest, schema digest, semantic source, and fixture corpus before intake in `mcpdesc/core`.
7. Open a pull request with compatibility classification, validation results, and AI-assistance disclosure. Wait for CI and maintainer approval.
8. Treat annotated specification tags as exact snapshot identities, not authorization to publish tooling packages. Validator package release authority belongs to `mcpdesc/core`.
9. After specification publication, verify GitHub release state and schema provenance. Verify validator intake and publication in `mcpdesc/core` separately.

## Boundaries

- Draft tags do not update `schemas/latest.json` or make v0.8.0 stable.
- Stable releases use `freeze-version.mjs`; draft snapshots do not.
- This repository exports approved snapshot inputs and does not publish `@mcpdesc/validator`.
- Never rewrite or move an existing release tag.