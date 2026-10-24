# Validation

This folder collects the material MCP Description uses to validate documents
against the MCP protocol revisions they describe. It exists because MCP
Description 0.9.0 makes protocol alignment explicit: every MCP-related
validation behavior should state who owns it, which MCP revisions it applies to,
where it comes from, and how it is tested.

Status: skeleton for the 0.9.0 working draft. The content is non-normative until
a 0.9.0 proposal decides its normative role. Repository tooling does not consume
it yet. Design background is tracked in
[issue #72](https://github.com/mcpdesc/mcpdesc-specification/issues/72).

## Layout

| Path | Content | Status |
| --- | --- | --- |
| [`mcp-revisions.md`](mcp-revisions.md) | Introductory guide to how MCP structures used by MCP Description differ across supported protocol revisions | Initial version |
| `rules/` | Validation rule records in YAML, one file per surface (Tool, Result, Capabilities, MCP Description core) | Planned |
| `mcp-schemas/` | Byte-identical copies of the official MCP schemas for supported revisions, with a provenance manifest (repository, path, commit, SHA-256, license) | Planned |

The folder is part of the versioned specification: it is frozen with each
release, so the rules and pinned MCP schemas used by a release never change
after publication.

## Ownership model

Every validated structure has exactly one owner:

| Owner | Examples | Authority | Unknown fields |
| --- | --- | --- | --- |
| MCP Description | `info`, transports, security, tags, examples, protocol scoping, components | This specification | As defined by MCP Description |
| MCP | Tool, Resource, ResourceTemplate, Prompt, capabilities, results, annotations, `_meta` | The applicable MCP revision | As permitted by that revision |
| Embedded standard | Tool `inputSchema` and `outputSchema` (JSON Schema) | The declared or default dialect, plus semantics the MCP revision adds | As defined by the dialect |

Knowing a field is not the same as the field being defined for a revision. A
name that a later MCP revision standardizes is not invalid in an earlier
revision whose structure permits it; it is preserved without the later
semantics.

## Rule records

Each validation rule has a permanent identifier and a record:

| Field | Meaning |
| --- | --- |
| `id` | Permanent, owner-namespaced identifier, for example `mcp.tool.output-schema.object-root`. Never reused; retired identifiers stay reserved. Protocol revisions are not part of the identifier. |
| `owner` | `mcp`, `mcpdesc`, or the embedded standard |
| `surface`, `path` | Native type and field the rule applies to |
| `kind` | structural, semantic, projection, preservation, embedded-standard, mcpdesc-semantic, or interoperability |
| `applicability` | Behavior per supported MCP revision |
| `sources` | Normative MCP text, official schema, or other evidence, by authority tier |
| `diagnostics` | Diagnostic codes emitted |
| `enforcement` | Internal check, official schema, or external validator |
| `status` | internal, externally-verified, delegated, arbitrated, or retired |
| `fixtures` | Tests covering each revision boundary |

Rules are anchored to the MCP type, not to where MCP Description carries it.
For example, one rule covers `Annotations.lastModified` wherever annotations
appear. Rulesets such as `mcpdesc.mcp.2026-07-28` group rules for one Effective
Protocol View without redefining them.

When authoritative sources disagree, MCP Description records an explicit
arbitration: the conflicting sources, the chosen authority (normative MCP text
by default), the rationale, an upstream reference, and when to revisit it.
