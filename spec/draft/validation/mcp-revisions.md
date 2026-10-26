# MCP Revision Differences

This guide introduces how the MCP structures that MCP Description carries
change across the MCP protocol revisions it supports. It is written for
newcomers and reviewers; it is non-normative and does not replace the MCP
specification.

Source: the official MCP schemas for each revision. The copies used to prepare
this guide are not yet pinned to an upstream commit; the pinned copies and
their provenance will live in `mcp-schemas/`. Where the schema and normative MCP
text differ, normative text takes precedence.

Supported revisions: `2024-11-05`, `2025-03-26`, `2025-06-18`, `2025-11-25`,
`2026-07-28`.

## How to read this guide

- A field marked "required" must be present in that revision.
- "Open" means the official schema accepts properties it does not list.
  Openness is either **explicit** (the schema declares additional properties, or
  MCP text says the set is not closed) or **schema default** (the schema simply
  does not restrict additional properties). The difference matters for how MCP
  Description treats unknown fields; see the [README](README.md).
- A field missing from a revision is not defined by that revision. It is not
  necessarily invalid there if the containing structure is open.

## Summary by revision

| Revision | Notable changes for MCP Description |
| --- | --- |
| `2024-11-05` | Baseline: Tool `name`, `description`, `inputSchema`. Schemas use JSON Schema draft-07. |
| `2025-03-26` | Tool `annotations` (behavior hints); a shared `Annotations` type with `audience` and `priority`; `completions` server capability. |
| `2025-06-18` | `title` on Tool, Resource, ResourceTemplate, Prompt; `_meta` on declarations; Tool `outputSchema` and `structuredContent` in results; `Annotations.lastModified`; `elicitation` client capability. |
| `2025-11-25` | `icons`; Tool `execution.taskSupport`; `tasks` capabilities; `$schema` allowed on Tool `inputSchema`/`outputSchema`; MCP schemas move to JSON Schema 2020-12. |
| `2026-07-28` | Tool `execution` removed from the core Tool; `tasks` capabilities replaced by `extensions`; `resultType` required on results; Tool `outputSchema` may have any root type; `x-mcp-header` gains meaning in Tool input schemas. |

## Tool

| Field | 2024-11-05 | 2025-03-26 | 2025-06-18 | 2025-11-25 | 2026-07-28 |
| --- | --- | --- | --- | --- | --- |
| `name` | required | required | required | required | required |
| `title` | — | — | yes | yes | yes |
| `description` | yes | yes | yes | yes | yes |
| `inputSchema` | required | required | required | required | required |
| `outputSchema` | — | — | yes | yes | yes |
| `annotations` | — | yes | yes | yes | yes |
| `icons` | — | — | — | yes | yes |
| `execution` | — | — | — | yes | — |
| `_meta` | — | — | yes | yes | yes |

Tool is open by schema default in every revision.

### Embedded schemas

| Aspect | 2024-11-05 to 2025-06-18 | 2025-11-25 | 2026-07-28 |
| --- | --- | --- | --- |
| `inputSchema` root | `type: object` required | `type: object` required | `type: object` required; other keywords explicitly allowed |
| `outputSchema` root | `type: object` required (from 2025-06-18) | `type: object` required | Any JSON Schema |
| `$schema` on embedded schemas | not listed | allowed | allowed |
| Default dialect | not specified | JSON Schema 2020-12 (stated for `outputSchema`) | JSON Schema 2020-12 (stated for both) |
| `x-mcp-header` | no MCP meaning | no MCP meaning | MCP-defined header mirroring for Streamable HTTP |

Unknown keywords inside embedded schemas follow the JSON Schema dialect, not
MCP Description: a keyword without MCP meaning in a revision is preserved, not
rejected.

### Tool annotations

`ToolAnnotations` (from `2025-03-26`) contains the hints `title`,
`readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`. The set
is unchanged through `2026-07-28` and is open by schema default. These are
hints, not guarantees.

## Results

| Field | 2024-11-05 | 2025-03-26 | 2025-06-18 | 2025-11-25 | 2026-07-28 |
| --- | --- | --- | --- | --- | --- |
| `Result._meta` | yes | yes | yes | yes | yes |
| `Result.resultType` | — | — | — | — | required |
| `CallToolResult.content` | required | required | required | required | required |
| `CallToolResult.isError` | yes | yes | yes | yes | yes |
| `CallToolResult.structuredContent` | — | — | yes (object) | yes (object) | yes (any JSON value) |

`Result` is explicitly open in every revision. `2026-07-28` also adds caching
fields such as `ttlMs` and `cacheScope` to specific results, for example
resource reads.

## Resources, resource templates, and prompts

| Field | 2024-11-05 | 2025-03-26 | 2025-06-18 | 2025-11-25 | 2026-07-28 |
| --- | --- | --- | --- | --- | --- |
| `title` | — | — | yes | yes | yes |
| `annotations` (Resource, ResourceTemplate) | yes | yes | yes | yes | yes |
| `icons` | — | — | — | yes | yes |
| `_meta` | — | — | yes | yes | yes |

Resource requires `uri` and `name`; ResourceTemplate requires `uriTemplate` and
`name`; Prompt requires `name`. All three are open by schema default.

### Common annotations

| Field | 2024-11-05 | 2025-03-26 | 2025-06-18 and later |
| --- | --- | --- | --- |
| `audience` | yes | yes | yes |
| `priority` | yes | yes | yes |
| `lastModified` | — | — | yes |

In `2024-11-05`, resource annotations are defined inline on each structure;
from `2025-03-26` they use the shared `Annotations` type.

## Capabilities

| Server capability | 2024-11-05 | 2025-03-26 | 2025-06-18 | 2025-11-25 | 2026-07-28 |
| --- | --- | --- | --- | --- | --- |
| `tools`, `resources`, `prompts`, `logging`, `experimental` | yes | yes | yes | yes | yes |
| `completions` | — | yes | yes | yes | yes |
| `tasks` | — | — | — | yes | — |
| `extensions` | — | — | — | — | yes |

| Client capability | 2024-11-05 | 2025-03-26 | 2025-06-18 | 2025-11-25 | 2026-07-28 |
| --- | --- | --- | --- | --- | --- |
| `roots`, `sampling`, `experimental` | yes | yes | yes | yes | yes |
| `elicitation` | — | — | yes | yes | yes |
| `tasks` | — | — | — | yes | — |
| `extensions` | — | — | — | — | yes |

MCP text describes both capability sets as not closed: implementations may
define additional capabilities. In `2026-07-28`, clients opt in to log messages
per request instead of through `logging/setLevel`; MCP Description treats the
`logging` server capability as deprecated for that revision and warns about it.

## Icons

`Icon` (from `2025-11-25`) requires `src` and may include `mimeType`, `sizes`,
and `theme`.
