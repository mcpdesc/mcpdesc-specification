# MCP Revision Differences

This guide introduces how the MCP structures that MCP Description carries
change across the MCP protocol revisions it supports. It is written for
newcomers and reviewers; it is non-normative and does not replace the MCP
specification.

Source: the official MCP schemas at upstream commit
`dae694f61a31f7a3ec2af3aff709e11f70f61e48` of
`modelcontextprotocol/modelcontextprotocol` (2026-10-23). MCP defines its
schema in TypeScript (`schema/<revision>/schema.ts`), which is the basis of its
authoritative requirements, and generates `schema.json` from it. Where the two
differ, the TypeScript schema and normative MCP text take precedence.

Supported revisions: `2024-11-05`, `2025-03-26`, `2025-06-18`, `2025-11-25`,
`2026-07-28`.

## How to read this guide

- A field marked "required" must be present in that revision.
- An **open** type accepts properties it does not list. A type is open only if
  its TypeScript definition declares or inherits an index signature, such as
  `[key: string]: unknown`. Every other type is **closed**: its listed fields are
  the complete set for that revision.
- The generated JSON Schema does not mark closed types with
  `additionalProperties: false`, so it accepts unlisted properties even for
  closed types. That is a generation artifact, not openness.
- A field missing from a revision is not defined by that revision. In a closed
  type it is not allowed; in an open type it is preserved without MCP meaning.

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

Tool is closed in every revision. Its extension point is `_meta`, from
`2025-06-18`.

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
rejected. Before `2026-07-28`, the TypeScript type of these schemas lists only
`type`, `properties`, `required`, and from `2025-11-25` `$schema`, while its
documentation calls the value a JSON Schema object. MCP Description follows the
documentation, as `2026-07-28` does explicitly; see the arbitration in
[`rules/tool.yaml`](rules/tool.yaml).

### Tool annotations

`ToolAnnotations` (from `2025-03-26`) contains the hints `title`,
`readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`. The set
is unchanged through `2026-07-28` and the type is closed. These are hints, not
guarantees. MCP Description 0.8.0 allows additional Tool Annotation properties,
which is more permissive than MCP.

## Results

| Field | 2024-11-05 | 2025-03-26 | 2025-06-18 | 2025-11-25 | 2026-07-28 |
| --- | --- | --- | --- | --- | --- |
| `Result._meta` | yes | yes | yes | yes | yes |
| `Result.resultType` | — | — | — | — | required |
| `CallToolResult.content` | required | required | required | required | required |
| `CallToolResult.isError` | yes | yes | yes | yes | yes |
| `CallToolResult.structuredContent` | — | — | yes (object) | yes (object) | yes (any JSON value) |

`Result` declares `[key: string]: unknown` in every revision, so every result
type is open. `2026-07-28` also adds caching fields such as `ttlMs` and
`cacheScope` to specific results, for example resource reads.

Client responses to server requests (`CreateMessageResult`, `ElicitResult`,
`ListRootsResult`) extend `Result`, and are therefore open, up to `2025-11-25`.
In `2026-07-28` they become input responses (`InputResponse`) carried in the
next request; they no longer extend `Result` and are closed. Only
`CreateMessageResult` keeps `_meta`, through `SamplingMessage`.

## Resources, resource templates, and prompts

| Field | 2024-11-05 | 2025-03-26 | 2025-06-18 | 2025-11-25 | 2026-07-28 |
| --- | --- | --- | --- | --- | --- |
| `title` | — | — | yes | yes | yes |
| `annotations` (Resource, ResourceTemplate) | yes | yes | yes | yes | yes |
| `icons` | — | — | — | yes | yes |
| `_meta` | — | — | yes | yes | yes |

Resource requires `uri` and `name`; ResourceTemplate requires `uriTemplate` and
`name`; Prompt requires `name`. All three are closed.

### Common annotations

| Field | 2024-11-05 | 2025-03-26 | 2025-06-18 and later |
| --- | --- | --- | --- |
| `audience` | yes | yes | yes |
| `priority` | yes | yes | yes |
| `lastModified` | — | — | yes |

In `2024-11-05`, resource annotations are defined inline on each structure;
from `2025-03-26` they use the shared `Annotations` type. Both are closed. MCP
Description 0.8.0 allows additional annotation properties, which is more
permissive than MCP.

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

The TypeScript capability types declare no index signature, but their
documentation states that the set "is not a closed set: any server can define
its own, additional capabilities". `experimental`, and from `2026-07-28`
`extensions`, are open maps for that purpose. In `2026-07-28`, clients opt in to
log messages per request instead of through `logging/setLevel`; MCP Description
treats the `logging` server capability as deprecated for that revision and
warns about it.

## Icons

`Icon` (from `2025-11-25`) requires `src` and may include `mimeType`, `sizes`,
and `theme`.

## Known defects not fixed

MCP Description deliberately leaves these differences from MCP uncorrected.
Each is recorded as a `not-fixed` gap in [`rules/`](rules/).

| MCP revision | Difference | Rule |
| --- | --- | --- |
| `2024-11-05` | Completion examples are rejected, although MCP defines `completion/complete` and `CompleteResult`; only the `completions` capability is new in `2025-03-26`. Not supported because the revision is old and the use case is narrow. | `mcp.completion.revision-availability` |
