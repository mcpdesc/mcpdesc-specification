# Proposal 0027: Closed MCP Types

- Status: Draft
- Author(s): @ObjectIsAdvantag
- Created: 2026-10-26
- Target version: 0.9.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/72
- Depends on: [Proposal 0024](0024-validation-rule-identity-and-provenance.md)
  (sources of truth, arbitrations)
- AI assistance disclosure: Drafted with GitHub Copilot from maintainer
  decisions recorded on issue #72; requires normal maintainer and community
  review.

## Summary

When an MCP type is closed, MCP Description closes it too.

Part A, which is implemented in the working draft, closes Tool Annotations and
Resource Annotations. MCP defines both types without an index signature in
every revision where they exist. MCP Description 0.8.0 allowed additional
properties on them. Native projection therefore produced MCP values that did
not match MCP's types. This is a breaking change.

Part B records an arbitration for server and client capabilities. MCP's
TypeScript types for capabilities are closed, but their doc comments say that
the set "is not a closed set". MCP Description follows the types and closes
both. Server capabilities were already closed; closing client capability
requirements is a breaking change.

## Problem

MCP Description carries MCP values. Proposal 0024 makes the revision's
`schema.ts` the source of truth for their structure. Proposal 0026 applied this
to example results, which are open. Some other carried values are still more
permissive than MCP, and one is inconsistent within MCP Description itself.

| MCP type | MCP (`schema.ts`) | MCP Description 0.8.0 |
| --- | --- | --- |
| `ToolAnnotations` | Closed, from 2025-03-26 | Additional properties allowed |
| `Annotations` (Resource Annotations, inline in 2024-11-05) | Closed | Additional properties allowed |
| `ServerCapabilities` | Closed type; doc comment says "not a closed set" | Closed (Section 8.4) |
| `ClientCapabilities` | Closed type; doc comment says "not a closed set" | Open "where the applicable type is open" (Section 8.5) |

For annotations, a document that MCP Description accepted could be projected
into a Tool or Resource that fails MCP's own schema. MCP has no ambiguity
there: both types are closed and their doc comments do not say otherwise.

For capabilities, Section 8.5 accepts unknown client capability requirements
"where the applicable MCP `ClientCapabilities` type is open". No revision's
type is open, so the condition never holds as written, yet the validator
accepts unknown requirements. Section 8.4 rejects unknown server capabilities.
One document therefore reads the two capability types in opposite ways.

## Goals

- Make carried annotation values match MCP's closed types in every revision.
- Record the capabilities conflict as an arbitration, with a recommendation.
- Read server and client capabilities the same way.

## Non-goals

- Changing which annotation fields exist, their defaults, or their revision
  availability.
- Changing `experimental`, `extensions`, or the nested capability objects that
  MCP defines as `object`.
- Changing `x-*` specification extensions on MCP Description-defined objects.
- Filing an upstream MCP issue without maintainer approval.

## Background and primary references

Pinned sources are vendored in
[`validation/mcp-schemas/`](../validation/mcp-schemas/) at
`modelcontextprotocol/modelcontextprotocol@dae694f61a31f7a3ec2af3aff709e11f70f61e48`.

| Revision | `ToolAnnotations` | `Annotations` | Capabilities doc comments (client, server) | `ClientCapabilities` | `ServerCapabilities` |
| --- | --- | --- | --- | --- | --- |
| 2024-11-05 | not defined | inline, closed | lines 183, 206 | lines 185-203 | lines 208-248 |
| 2025-03-26 | closed | closed | lines 203, 226 | lines 205-223 | lines 228-272 |
| 2025-06-18 | closed | closed | lines 225, 254 | lines 229-251 | lines 258-302 |
| 2025-11-25 | closed | closed | lines 306, 382 | lines 310-379 | lines 386-457 |
| 2026-07-28 | closed | closed | lines 712, 789 | lines 716-786 | lines 793-883 |

Each capabilities doc comment reads: "Known capabilities are defined here, in
this schema, but this is not a closed set: any client [server] can define its
own, additional capabilities."

No MCP issue on the capabilities doc comment was found on 2026-10-26.
[MCP issue 1898](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1898)
(open) asks the broader question: which MCP types are closed, and should the
generated JSON Schema say so with `additionalProperties: false`? It uses
`ToolAnnotations` as its example. Its discussion is not normative, but it
records two positions:

- receivers should not fail on fields they do not recognize, so that
  revisions stay interoperable;
- a comment by the original author on the pull request that introduced
  annotations says that MCP objects are "intentionally open-ended".

The nearest other issues are
[MCP issue 2919](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/2919),
which asks about a different closed enumeration, and
[MCP issue 3238](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/3238),
which is about the `inputSchema` dialect.

Official SDK behavior (tier 5 evidence, checked on 2026-10-26) neither rejects
nor preserves unknown annotation properties:

- TypeScript SDK (`modelcontextprotocol/typescript-sdk@951fe5603a7ec0b2dcb6a0b95d92cd86f93ad9e5`):
  `AnnotationsSchema` and `ToolAnnotationsSchema` are zod v4 `z.object`
  schemas, which strip unknown keys on parse.
- Python SDK (`modelcontextprotocol/python-sdk@a525a3d9bece967d91534b746a6c842931b7b4ec`):
  `Annotations` and `ToolAnnotations` are pydantic models with
  `extra="ignore"`, which drop unknown keys on parse.

An `x-*` or other unknown annotation property therefore does not survive a
round trip through either SDK. The MCP specification text lists only the
defined annotation fields and names `_meta` as the place "to attach
additional metadata".

## Proposed normative behavior

### Part A. Annotations (implemented)

1. A Tool `annotations` object contains only `title`, `readOnlyHint`,
   `destructiveHint`, `idempotentHint`, and `openWorldHint` (Section 9.6).
2. A Resource Annotations object on a Resource, a Resource Template, or a
   content block contains only `audience`, `priority`, and `lastModified`
   (Section 10.3).
3. Other properties, including `x-*` keys and fields of the other annotation
   type, MUST NOT appear. They are rejected with `schema-validation`.

Rules: `mcp.tool-annotations.members` and `mcp.annotations.members`.

### Part B. Capabilities (arbitration decided: option A)

Conflict: the TypeScript types are closed and the doc comments say the set is
open. The comments do not say where additional capabilities go. `experimental`
is the defined container in every revision, and so is `extensions` from MCP
2026-07-28.

| Option | Server capabilities | Client capability requirements | Change from today |
| --- | --- | --- | --- |
| A. Follow the types (decided) | Unknown members rejected | Unknown members rejected | Breaking for client requirements |
| B. Follow the doc comments | Unknown members accepted, preserved, warning | Unknown members accepted, preserved, warning | Relaxes server capabilities |
| C. Keep today's split | Rejected | Accepted silently | None; Section 8.5 wording fixed only |

Decision: option A.

- Capabilities are exchanged during initialization, so Proposal 0024 makes
  `schema.ts` the authority for their structure.
- `experimental` and `extensions` already give custom capabilities a defined
  place, so no use case is lost.
- Closing is the reversible choice. If MCP later confirms that capabilities are
  open, relaxing MCP Description invalidates no document. Starting open and
  closing later would invalidate documents.
- One reading for both capability types removes the inconsistency between
  Sections 8.4 and 8.5.
- Rejecting unknown members in a static description does not conflict with
  the robustness position in MCP issue 1898: that position concerns receivers
  of protocol messages, while MCP Description constrains what a server
  declares.

The arbitration is active on rules `mcp.server-capabilities.members` and
`mcp.client-capabilities.members`, with MCP issue 1898 as its upstream
reference. Section 8.5 now states that a Client Capability Requirements Object
names only client capabilities that the applicable MCP revisions define, with
custom requirements in `experimental` and, for MCP 2026-07-28, in
`extensions`.

## Schema impact

- Part A: `toolAnnotations` and `resourceAnnotations` change to
  `additionalProperties: false`.
- Part B: `clientCapabilityRequirements` changes its `additionalProperties` to
  `false`, keeping `^x-` pattern properties.

## Examples

Rejected by Part A:

```json
{ "annotations": { "readOnlyHint": true, "audience": ["user"] } }
```

Rejected before and after this proposal:

```json
{ "capabilities": [{ "tools": {}, "acmeReplay": {} }] }
```

Accepted by MCP Description 0.8.0, rejected now:

```json
{ "clientRequirements": { "acmeReplay": {} } }
```

Valid before and after:

```json
{ "clientRequirements": { "experimental": { "acmeReplay": {} } } }
```

## Compatibility

Part A is breaking. Documents conforming to MCP Description 0.8.0 that carry
unknown annotation properties become invalid. None of the published examples
do. One fixture, `expected-valid/distinct-tool-and-resource-annotations.json`,
did and has been updated.

Part B is breaking for client capability requirements with unknown top-level
members. One fixture, `expected-valid/client-capability-requirements.json`,
had one and has been updated.

## Migration

- Remove unknown annotation properties. Server-defined metadata belongs in the
  declaration's `_meta` where the revision defines it (from MCP 2025-06-18),
  and MCP Description metadata belongs in `x-*` properties on the declaration
  rather than inside `annotations`.
- Move unknown client capability requirements into `experimental` or, for MCP
  2026-07-28, into `extensions`.

## Security and privacy considerations

Annotation hints remain untrusted (Section 9.6). Closing the types removes
fields that a client might have misread as behavioral hints.

## Alternatives considered

### Keep annotations open and warn

MCP's normative sources have no ambiguity here: the types are closed and the
specification text names `_meta` for additional metadata. Proposal 0026 warns
only for open types. A warning would accept values that MCP's types reject and
that both official SDKs drop. The opposite view in MCP issue 1898 is recorded
under Background; it is not normative.

### Decide capabilities without an arbitration

The doc comment is tier 1 text, so silently choosing the type would hide a
real conflict. Proposal 0024 requires an arbitration with a review trigger.

## Open questions

1. Does Part A stand, given MCP issue 1898 and the SDK behavior recorded under
   Background?
2. Upstream: MCP issue 1898 already asks which types are closed. Add the
   capabilities doc comment to that discussion rather than opening a separate
   issue? A draft comment follows.

> The capabilities types are a concrete case of the question in this issue.
> In every revision from 2024-11-05 to 2026-07-28, `schema.ts` documents
> `ClientCapabilities` and `ServerCapabilities` as "not a closed set: any
> client/server can define its own, additional capabilities", but neither
> interface declares an index signature, unlike `Result` and `_meta`.
> Validators that follow the type reject an unknown top-level capability;
> validators that follow the comment accept it. Should additional capabilities
> go only under `experimental` (and `extensions` from 2026-07-28), or should the
> interfaces gain `[key: string]: unknown`?

## Implementation and validation plan

- Part A: schema, Sections 9.6 and 10.3, fixtures
  `expected-invalid/tool-annotations-unknown-property.json`,
  `expected-invalid/resource-annotations-unknown-property.json`, and
  `expected-invalid/content-annotations-unknown-property.json`, rule records,
  changelog.
- Part B: schema, Section 8.5, rule records with active arbitrations, fixtures
  `expected-invalid/unknown-server-capability.json` and
  `expected-invalid/unknown-client-capability-requirement.json`, changelog.

## Decision record

Part A: maintainer approval of the breaking change on issue #72, 2026-10-26;
reconfirmation requested after MCP issue 1898 was found.
Part B: option A, maintainer decision on issue #72, 2026-10-26.
