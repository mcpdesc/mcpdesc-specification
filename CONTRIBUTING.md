# Contributing to the MCP Description Specification

Thank you for helping evolve the MCP Description specification.

## Before contributing

- Read [`GOVERNANCE.md`](GOVERNANCE.md).
- Search existing issues and proposals.
- Open an issue before making a non-trivial normative change.
- Target the active draft branch for draft specification work.

## Licensing of contributions

Repository content is licensed under Apache License 2.0 unless explicitly stated otherwise.

By submitting a contribution, you agree that it may be distributed under Apache-2.0 and represent that you have the right to submit it under that license, including any authorization required from your employer.

You or your employer retain copyright in your contribution. Copyright is not assigned to the project or its maintainers.

This repository requires:

- no Contributor License Agreement;
- no copyright assignment;
- no Developer Certificate of Origin sign-off.

Do not remove existing copyright, license, origin, or attribution notices.

## Specification change workflow

A non-trivial specification change should include:

1. an issue explaining the problem and use cases;
2. a proposal under `proposals/` when design choices or compatibility are involved;
3. normative text updates;
4. corresponding JSON Schema changes;
5. positive and negative examples or fixtures;
6. compatibility, migration, and security considerations;
7. a `spec/draft/CHANGELOG.md` entry.

A schema change without corresponding specification text and examples is incomplete.

Proposals are merged to `main` only once accepted, then implemented as a separate `spec/draft/` change; see the proposal workflow in [`GOVERNANCE.md`](GOVERNANCE.md).

## Compatibility classification

Every normative pull request must classify itself as:

- editorial/non-normative;
- compatible clarification;
- compatible addition;
- potentially breaking;
- breaking.

Potentially breaking and breaking changes require explicit migration guidance and the review process described in `GOVERNANCE.md`.

## AI-assisted contributions

AI tools may be used, but disclose the tool and the extent of assistance in the issue or pull request. You remain responsible for reviewing generated material and ensuring that it is correct, secure, original, and properly licensed.

## Local validation

```bash
npm install
npm test
```

The repository CI must pass before merge.
See [`scripts/README.md`](scripts/README.md) for the command, CI-trigger, internal-module, and release-tool execution map.
