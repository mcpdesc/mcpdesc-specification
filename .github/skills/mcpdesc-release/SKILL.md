---
name: mcpdesc-release
description: 'Prepare, validate, and coordinate MCP Description draft snapshots, validator releases, and stable specification releases. Use when asked to release, tag, publish, freeze, or perform release readiness checks.'
argument-hint: 'draft.<iteration> <date> | rc.<iteration> <date> | validator <selector> | stable <version> | check'
---

# MCP Description Release

Use repository scripts as the source of deterministic release behavior. Do not reproduce their transformations manually.

## Procedure

1. Read `GOVERNANCE.md`, `AGENTS.md`, and `scripts/README.md`.
2. Confirm the worktree and branch. Release preparation belongs on a dedicated branch targeting `main`.
3. Choose exactly one preparation target:
   - Draft: `npm run release:prepare -- draft.<iteration> <YYYY-MM-DD>`
   - Release candidate: `npm run release:prepare -- rc.<iteration> <YYYY-MM-DD>`
   - Validator: `npm run release:prepare -- validator <x.y.z-draft.n|x.y.z-rc.n>`
   - Stable: `npm run release:prepare -- stable <x.y.z>`
4. Complete the review-required prose, proposal provenance, schema pointers, declarations, registry, tests, or status changes printed by the script. Preserve frozen versions and prior validator selectors.
5. Run the matching check:
   - `npm run release:check -- draft`
   - `npm run release:check -- rc`
   - `npm run release:check -- validator`
   - `npm run release:check -- stable <x.y.z>`
6. Run `npm test` and `git diff --check`. For validator work, review `npm pack --dry-run --json` and confirm prior runtime and fixture snapshots have no diff.
7. Open a pull request with compatibility classification, validation results, and AI-assistance disclosure. Wait for CI and maintainer approval.
8. Treat annotated specification and validator tags as explicit publication authorization. Never create a tag, GitHub release, npm dist-tag, or npm publication before approval.
9. After publication, verify GitHub release state, npm version and dist-tags, package integrity, clean installation, selectors, and schema provenance.

## Boundaries

- Draft tags do not update `schemas/latest.json` or make v0.8.0 stable.
- Stable releases use `freeze-version.mjs`; draft snapshots do not.
- A validator selector is immutable and receives sibling runtime and fixture directories.
- The `validator-v<semver>` workflow publishes stable SemVer to npm `latest` and prerelease SemVer to `next`.
- Never rewrite or move an existing release tag.