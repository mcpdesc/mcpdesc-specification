# AGENTS.md — MCP Description Specification

Guidance for AI coding assistants and human contributors.

## Mission

Maintain a precise, portable, machine-readable description format for MCP servers while keeping normative text, JSON Schemas, examples, and release notes synchronized.

## Locked constraints

- v0.7.0 is the current stable release; its canonical source remains Cisco Open.
- v0.8.0 is a community working draft in this repository.
- Do not promote v0.8.0 to stable without an explicit release decision.
- Do not change `schemas/latest.json` from 0.7.0 during draft work.
- Do not import or modify MCP Toolkit implementation code here.
- Do not imply a Cisco donation, assignment, endorsement, partnership, or support commitment.
- No CLA, copyright assignment, or DCO is required.
- Preserve copyright, licensing, attribution, origin, and modification records.

## Specification discipline

For every normative change, update all affected artifacts:

1. section source under `spec/sections/`;
2. assembled `spec/mcp-description.md`;
3. versioned JSON Schema;
4. examples and fixtures;
5. `spec/CHANGELOG.md`;
6. migration or compatibility notes;
7. proposal status, when applicable.

Do not silently make the schema more or less permissive than the normative text.

Use RFC 2119/8174 key words only for genuine normative requirements and keep capitalization consistent.

## Draft workflow

- Base v0.8.0 feature branches on `draft/0.8.0`.
- Link each normative pull request to an issue and, when applicable, a proposal.
- Keep changes focused; separate research/proposals from normative implementation when practical.
- Prefer primary MCP specification sources for protocol claims.
- Distinguish runtime MCP behavior from static description concerns.

## Validation

Run:

```bash
npm test
```

Do not bypass failing checks. Explain any test limitation honestly.

## AI disclosure

Any pull request containing AI-assisted content must disclose the tool and extent of assistance. The human author remains accountable for the result.
