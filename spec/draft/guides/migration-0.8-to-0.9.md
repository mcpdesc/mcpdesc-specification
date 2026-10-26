# Migrating from MCP Description 0.8.0 to 0.9.0

MCP Description 0.9.0 is a community working draft. This guide follows the
draft and changes with it; see the [changelog](../CHANGELOG.md) for the status
of each change and the proposal that introduced it.

Version 0.9.0 measures carried MCP values against each revision's TypeScript
schema. Most 0.8.0 documents need only a version change. Documents that put
extra properties on closed MCP types must move them.

## Version and schema identity

Set `mcpdesc` to `0.9.0`. When emitting `$schema` during the draft, use
`https://mcpdesc.org/schema/mcp-description/0.9.0-draft.1.json`; the stable
identifier is assigned at release.

## Annotations

Tool Annotations and Resource Annotations, including annotations on content
blocks, accept only the properties MCP defines (Sections 9.6 and 10.3):

| Object | Allowed properties |
| --- | --- |
| Tool `annotations` | `title`, `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` |
| Resource Annotations | `audience`, `priority`, `lastModified` (from MCP 2025-06-18) |

Remove other properties, including `x-*` keys. Server-defined metadata belongs
in the declaration's `_meta` where the revision defines it (from MCP
2025-06-18). MCP Description metadata belongs in `x-*` properties on the
declaration itself.

```json
{
  "name": "inspect",
  "inputSchema": { "type": "object" },
  "annotations": { "readOnlyHint": true },
  "_meta": { "com.example/tier": "gold" }
}
```

## Client capability requirements

A `clientRequirements` object names only client capabilities that the
applicable MCP revisions define (Section 8.5). Move custom requirements into
`experimental` or, for MCP 2026-07-28, into `extensions`:

```json
{ "clientRequirements": { "experimental": { "com.example/replay": {} } } }
```

Server capabilities were already closed in 0.8.0.

## Tool schema dialects

For MCP 2025-11-25 and later, a Tool `inputSchema` or `outputSchema` that
declares `$schema` must declare JSON Schema 2020-12 or draft-07 (Section 9.2).
In 0.8.0 the accepted set depended on the validator; the reference validator
already accepted only these two, so its results do not change. Replace any
other declared dialect, preferably by removing `$schema` to use the 2020-12
default.

## Example results

Example results and Tool Interaction step responses are checked against each
applicable revision's MCP type (Section 3.6):

- A field that an open MCP result type allows but the revision does not define
  is accepted and preserved with the warning
  `result-field-not-defined-by-version`. For example, `resultType` in a result
  shared by MCP 2025-11-25 and MCP 2026-07-28 no longer requires splitting the
  declaration. Variants that were split only for `resultType`, `ttlMs`, or
  `cacheScope` may be merged; splitting still clears the warning.
- The `completion` object of a completion example result accepts only
  `values`, `total`, and `hasMore`. Move other fields, for example to result
  `_meta`.
- For MCP 2026-07-28, sampling, elicitation, and roots step responses are
  closed: remove unknown fields, and keep `_meta` only on sampling responses.
- Result `_meta` is accepted in every revision. Root `_meta` in roots responses
  is accepted from MCP 2025-06-18.
- Reserved `_meta` keys are checked in example results, their content, step
  responses, and roots.

MCP Description does not support completion examples for MCP 2024-11-05.

## Validator output

Every diagnostic carries a `rule` property naming the validation rule it
reports, next to `code`, `severity`, `message`, and `path`:

```json
{
  "code": "schema-validation",
  "severity": "error",
  "message": "does not validate against 0.9.0: /tools/0/annotations must NOT have additional properties",
  "path": ["tools", 0, "annotations", "audience"],
  "rule": "mcp.tool-annotations.members"
}
```

Tools, CI checks, and snapshot tests that compare whole diagnostic objects, or
reject unknown properties, must accept `rule` or compare the other four
properties only. `@mcpdesc/core` updates its frozen diagnostic expectations at
the next validator snapshot intake.

Other output changes:

- Array indices in `schema-validation` paths are numbers, as in semantic
  diagnostics. Previously they were strings below the document root.
- New codes include `result-field-not-defined-by-version` (warning). Some
  conditions that were errors in 0.8.0 are now warnings with that code.
- `invalid-resource-template-uri-template` replaces
  `resource-template-example-invalid-template` and
  `resource-template-completion-example-invalid-template`. It reports a
  malformed `uriTemplate` once, also on Resource Templates without examples,
  which 0.8.0 accepted.
- The `completion-example-version-mismatch` message for MCP 2024-11-05 says the
  revision is not supported by MCP Description.

## Recommended algorithm

1. Validate the 0.8.0 source.
2. Set `mcpdesc` to `0.9.0` and update `$schema` when emitted.
3. Remove unknown annotation properties, moving server-defined metadata to
   `_meta` only where the revision defines it.
4. Move unknown client capability requirements into `experimental` or
   `extensions`.
5. Move extra fields out of completion `completion` objects and out of MCP
   2026-07-28 step responses.
6. Validate against the 0.9.0 JSON Schema and semantic rules, and review the
   new warnings.

A migration tool MUST report unresolved ambiguity instead of guessing, and
MUST NOT move a value into `_meta` or `x-*` without author review.
