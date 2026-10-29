# How MCP protocol versions are managed

An MCP server can support several MCP protocol versions. Their requirements
differ: a field may be available in one protocol version but absent or
constrained differently in another.

MCP Description records these differences so validators can check each
declaration against the protocol versions it applies to.

This guide explains that model, then compares the MCP surfaces across the
supported 2024, 2025, and 2026 protocol versions.

## Use protocolVersions scopes to describe variations

In MCP 2025-11-25, a Tool's `outputSchema` must have an object root. MCP
2026-07-28 permits other roots, such as an array or a string.

A Tool with an array output schema therefore cannot apply unchanged to both
protocol versions.

If the server returns different shapes for each protocol version, the author
can describe them as separate variants. If it returns an object-shaped result
for both, one declaration can cover both protocol versions.

An omitted declaration scope inherits the complete scope of its parent. An
explicit scope must be a non-empty subset of that parent scope. These rules
apply to transports, capabilities, primitives, and nested scoped declarations;
root `info` remains document-wide metadata.

Here is a complete description of a server whose `lookup` Tool returns an
object containing records for MCP 2025-11-25, and an array of records for
2026-07-28. The two Tools share a name but have disjoint scopes, so each
protocol version has exactly one `lookup` declaration:

```json
{
  "mcpdesc": "0.9.0",
  "info": { "name": "lookup-server", "version": "1.0.0" },
  "protocolVersions": ["2025-11-25", "2026-07-28"],
  "transports": [{ "type": "stdio", "command": "lookup-server" }],
  "tools": [
    {
      "name": "lookup",
      "protocolVersions": ["2025-11-25"],
      "inputSchema": { "type": "object" },
      "outputSchema": {
        "type": "object",
        "properties": {
          "records": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["records"]
      }
    },
    {
      "name": "lookup",
      "protocolVersions": ["2026-07-28"],
      "inputSchema": { "type": "object" },
      "outputSchema": { "type": "array", "items": { "type": "string" } }
    }
  ]
}
```

Removing `protocolVersions` from the second Tool would make it apply to both
root protocol versions. Its array `outputSchema` would then be invalid for
2025-11-25, and its name would overlap the first Tool's scope. Scope
inheritance is convenient, but it does not exempt a declaration from any
protocol version it inherits.

See [Section 4.10](../sections/04-versioning.md#410-protocol-scopes-and-inheritance)
for scope inheritance and [Section 9.5](../sections/09-tools.md#95-protocol-variants-and-security)
for Tool variants.

## What validation checks

Validation has two layers:

1. **Structural checks** validate the document against the MCP Description
   JSON Schema: required properties, value types, allowed members, and shapes.
  The optional root `$schema` identifies that structural schema, including
  the particular draft snapshot when one is declared.
2. **Semantic checks** validate relationships and protocol-version-dependent
  meaning:
   scopes, declaration uniqueness, transport coverage, component references,
  field availability, and examples under every applicable protocol version.
  Embedded Tool schemas also follow their applicable JSON Schema rules.

The validator does not simply use the newest MCP schema for the whole document.
It checks each declaration against its effective scope. A declaration shared
by several protocol versions has to meet the requirements of all of them. Component
references do not bypass these checks: referenced values are checked in their
use-site context.

Errors make a document invalid; warnings do not. For example, a completed Tool
result in an example needs `resultType: "complete"` for MCP 2026-07-28;
omitting it is an error. For MCP 2025-11-25, the open result type permits that
field without defining its meaning: including it produces a warning, not an
error. These checks concern example results, not the native Tool declaration
returned by `tools/list`.

Validity is a statement about the static description, not a live-server test.
Validation also has documented limits: MCP 2024-11-05 and 2025-03-26 receive
structural and selected checks,
not a claim of complete MCP semantic conformance. See
[Section 16](../sections/16-conformance.md) and the
[validation catalog overview](../validation/README.md).

## Select one protocol version with an Effective Protocol View

An Effective Protocol View selects a protocol version declared at the root and keeps
only declarations whose effective scope includes it. It returns another MCP
Description document: the root `protocolVersions` contains only the selected version,
retained declarations no longer need scopes, and description metadata is
preserved. The result is validated again for the selected protocol version.

For the example above, the 2025-11-25 view keeps the object-output `lookup`;
the 2026-07-28 view keeps the array-output `lookup`. The `info` object is
preserved in both. Neither view merges the Tools or rewrites their schemas.
See [Section 4.12](../sections/04-versioning.md#412-effective-protocol-views-and-projection).

## Produce native MCP values

Native projection is a different, explicit operation. For one declared MCP
protocol version, it produces a Tool, Resource, Resource Template, or Prompt value, or
an ordered list of those values. These correspond to the declarations carried
by MCP list results; projection does not add a JSON-RPC envelope, pagination,
or runtime behavior.

Native projection validates the source, selects the applicable declaration,
resolves component references in Tool schemas, removes description-only
fields, and checks the result against the selected protocol version's pinned
MCP schema. For `lookup` in 2026-07-28, the native value is:

```json
{
  "name": "lookup",
  "inputSchema": { "type": "object" },
  "outputSchema": { "type": "array", "items": { "type": "string" } }
}
```

`protocolVersions` is description metadata and is omitted. Other
description-only fields, such as examples, are also omitted. MCP fields are
preserved without inventing defaults or repairing values; embedded schema
keywords and `_meta` entries are retained.

A projection postcondition failure is reported rather than silently repaired.
It indicates an inconsistency in the specification, validator, or projection
implementation, not a guarantee that every validation success will produce a
native value despite such defects. See
[Section 4.14](../sections/04-versioning.md#414-native-mcp-projection).

Native projection is defined for MCP Description 0.9.0. An older-format
document is converted and validated for the target format first; selecting an
MCP protocol version alone does not perform that conversion. See the
[0.8.0 to 0.9.0 migration guide](migration-0.8-to-0.9.md).

## Reference baseline

Source: the official MCP schemas at upstream commit
`dae694f61a31f7a3ec2af3aff709e11f70f61e48` of
`modelcontextprotocol/modelcontextprotocol` (2026-10-23), vendored unmodified in
[`mcp-schemas/`](../validation/mcp-schemas/). MCP defines its
schema in TypeScript (`schema/<revision>/schema.ts`), which is the basis of its
authoritative requirements, and generates `schema.json` from it. Where the two
differ, the TypeScript schema and normative MCP text take precedence.

Supported protocol versions: `2024-11-05`, `2025-03-26`, `2025-06-18`, `2025-11-25`,
`2026-07-28`.

## How to read the comparison tables

- A field marked "required" must be present in that protocol version.
- An **open** type accepts properties it does not list. A type is open only if
  its TypeScript definition declares or inherits an index signature, such as
  `[key: string]: unknown`. Every other type is **closed**: its listed fields are
  the complete set for that protocol version.
- The generated JSON Schema does not mark closed types with
  `additionalProperties: false`, so it accepts unlisted properties even for
  closed types. That is a generation artifact, not openness.
- A field missing from a protocol version is not defined by that version. In a closed
  type it is not allowed; in an open type it is preserved without MCP meaning.

## Summary by protocol version

| Protocol version | Notable changes for MCP Description |
| --- | --- |
| `2024-11-05` | Baseline: Tool `name`, `description`, `inputSchema`. The generated MCP schema uses JSON Schema draft-07; this does not establish a default dialect for embedded Tool schemas. |
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

Tool is closed in every protocol version. Its extension point is `_meta`, from
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
MCP Description: a keyword without MCP meaning in a protocol version is preserved, not
rejected. Before `2026-07-28`, the TypeScript type of these schemas lists only
`type`, `properties`, `required`, and from `2025-11-25` `$schema`, while its
documentation calls the value a JSON Schema object. MCP Description follows the
documentation, as `2026-07-28` does explicitly; see the arbitration in
[`rules/tool.yaml`](../validation/rules/tool.yaml).

The `inputSchema` root requirement, `type: "object"`, is written in JSON Schema
syntax even though `$schema` may select another dialect from `2025-11-25`. MCP
issue [#3238](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/3238)
discusses this tension. MCP Description follows `schema.ts` and requires a
literal `type: "object"` root; see `mcp.tool.input-schema.object-root`.

### Tool annotations

`ToolAnnotations` (from `2025-03-26`) contains the hints `title`,
`readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`. The set
is unchanged through `2026-07-28` and the type is closed. These are hints, not
guarantees, and clients must treat them as untrusted unless the server is
trusted. When a hint is absent, MCP defines its meaning:

| Hint | Meaning when absent |
| --- | --- |
| `readOnlyHint` | `false` |
| `destructiveHint` | `true`; meaningful only when `readOnlyHint` is `false` |
| `idempotentHint` | `false`; meaningful only when `readOnlyHint` is `false` |
| `openWorldHint` | `true` |

An absent hint and an explicit value with the same meaning are different
documents. MCP Description 0.9.0 accepts only these properties, as MCP does;
0.8.0 allowed additional properties.

## Results

| Field | 2024-11-05 | 2025-03-26 | 2025-06-18 | 2025-11-25 | 2026-07-28 |
| --- | --- | --- | --- | --- | --- |
| `Result._meta` | yes | yes | yes | yes | yes |
| `Result.resultType` | — | — | — | — | required |
| `CallToolResult.content` | required | required | required | required | required |
| `CallToolResult.isError` | yes | yes | yes | yes | yes |
| `CallToolResult.structuredContent` | — | — | yes (object) | yes (object) | yes (any JSON value) |

`Result` declares `[key: string]: unknown` in every protocol version, so every result
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
from `2025-03-26` they use the shared `Annotations` type. Both are closed, and
MCP Description 0.9.0 closes them too; 0.8.0 allowed additional properties.

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
`extensions`, are open maps for that purpose. MCP Description follows the types:
unknown top-level members are rejected in server capabilities and in client
capability requirements (Proposal 0027). In `2026-07-28`, clients opt in to
log messages per request instead of through `logging/setLevel`; MCP Description
treats the `logging` server capability as deprecated for that protocol version and
warns about it.

## Icons

`Icon` (from `2025-11-25`) requires `src` and may include `mimeType`, `sizes`,
and `theme`.

## Known defects not fixed

MCP Description deliberately leaves these differences from MCP uncorrected.
Each is recorded as a `not-fixed` gap in [`rules/`](../validation/rules/).

| MCP protocol version | Difference | Rule |
| --- | --- | --- |
| `2024-11-05` | Completion examples are rejected, although MCP defines `completion/complete` and `CompleteResult`; only the `completions` capability is new in `2025-03-26`. Not supported because this protocol version is old and the use case is narrow. | `mcp.completion.revision-availability` |


## Server version versus protocol version

Two different meanings of "version" matter here:

- **MCP protocol versions:** root `protocolVersions` of an MCP Description
  document, such as `["2025-11-25", "2026-07-28"]`, lists the MCP protocol
  versions documented for the server. It need not list every protocol version
  the live server supports.

- **Server version:** `info.version`, such as `"1.0.0"`, identifies the MCP
  server implementation described by the document. It is independent of the
  MCP protocol versions supported by that server.

At runtime, the server name and version are advertised in `serverInfo.name`
and `serverInfo.version` in the initialization result for MCP 2025-11-25.

In the discovery workflow of **MCP 2026-07-28**, the `server/discover` result
can contain the server name and version in its
`_meta["io.modelcontextprotocol/serverInfo"]` field, as `name` and `version`.
This information is self-reported, not proof of an authenticated identity.
Discovery lists supported MCP protocol versions separately in
`supportedVersions`.

The optional Server Card extension makes the same distinction: `card.version`
is the server version, while `card.remotes[].supportedProtocolVersions`
advertises MCP protocol support per endpoint. See the
[Server Card schema snapshot referenced by SEP-2127](https://github.com/modelcontextprotocol/experimental-ext-server-card/blob/526201bbc80231daa40ffcdecfc9da4e54e5dc93/schema.ts).

These are mappings, not proof of a runtime origin: `info.version` in an MCP
Description document can come from its author's input. It could also have been
obtained from a live server through MCP initialization or discovery. See
[Section 5](../sections/05-info-object.md).

