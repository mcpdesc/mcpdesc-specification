# Bootstrap acceptance criteria

The bootstrap is complete only when all applicable checks below pass.

## Provenance

- [ ] The relevant v0.7.0 specification and schema history was imported from `cisco-open/mcptoolkit-contract`.
- [ ] `ORIGIN.md` contains the exact source commit and no placeholders.
- [ ] The upstream Apache-2.0 license is present.
- [ ] The upstream Cisco notice is retained verbatim within the repository notice.
- [ ] The repository does not state or imply a Cisco copyright donation or assignment.
- [ ] The historical Cisco governance file is preserved and clearly marked as historical.

## Status and branching

- [ ] `main` documents v0.7.0 as the current stable release whose canonical source remains Cisco Open.
- [ ] `draft/0.8.0` exists as the v0.8.0 integration branch.
- [ ] v0.8.0 is labeled a community working draft and not a released specification.
- [ ] `schemas/latest.json` still points to v0.7.0.
- [ ] No duplicate GitHub Release claims to publish v0.7.0 from the community repository.

## Governance and contribution policy

- [ ] The repository is described as an independent `{mcpdesc}` community project.
- [ ] Apache-2.0 inbound and outbound licensing is explicit.
- [ ] Contributors retain copyright in their contributions.
- [ ] The right-to-submit and employer-authorization representation is explicit.
- [ ] No CLA, copyright assignment, or DCO is required.
- [ ] AI-assisted contribution disclosure is documented.
- [ ] Cisco employee participation is described using the approved safe formulation.

## Scope

- [ ] Only specification-related assets are imported.
- [ ] No MCP Toolkit or `mcpcontract` implementation source is imported.
- [ ] The relationship between the specification repository and toolkit repository is explained.

## Quality controls

- [ ] CI parses and meta-validates all versioned schemas.
- [ ] CI validates specification examples against their declared schema version.
- [ ] CI checks the machine-readable release status.
- [ ] CI fails when provenance placeholders remain.
- [ ] CI passes on `main` and `draft/0.8.0`.

## v0.8.0 start

- [ ] The MCP 2026-07-28 impact matrix exists and cites primary MCP sources.
- [ ] Proposal 0001 tracks MCP 2026-07-28 alignment.
- [ ] Proposal 0002 tracks `_meta` support.
- [ ] Each proposal discusses compatibility, normative text, schema, examples, security, and migration impact.
- [ ] No unresolved design choice has been silently converted into normative schema text.
