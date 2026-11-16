# Migrating from MCP Description 0.8.0 to 0.9.0

This guide helps you update an MCP Description document from 0.8.0 to 0.9.0,
either with migration tools or by hand. For the full list of changes and the
proposals behind them, see the [0.9.0 changelog](../CHANGELOG.md) and the
[proposal manifest](../PROPOSALS.md).

## What to expect

Most 0.8.0 documents need only a version change. 0.9.0 checks the MCP values a
document carries against the MCP types of each applicable protocol version, so
a document needs edits only when it:

- adds properties to Tool or Resource annotations;
- requires client capabilities that MCP does not define;
- adds fields to the `completion` object of a completion example result;
- has a malformed Resource Template `uriTemplate`, a Resource `uri` without a
  scheme, or a fractional `size` or `ttlMs`.

Other changes relax earlier restrictions or add warnings. They do not make a
valid 0.8.0 document invalid, but they are worth reviewing.

| Change | Automatic | Fix offered by tools |
| --- | --- | --- |
| [Version and schema identity](#version-and-schema-identity) | Yes | — |
| [Annotations](#annotations) | No | Remove the property |
| [Client capability requirements](#client-capability-requirements) | No | Remove, or move to `experimental` |
| [Completion example results](#completion-example-results) | No | Remove the property |
| [Resource Template URI templates](#resource-template-uri-templates) | No | None |
| [Resource URIs](#resource-uris) | No | None |
| [Integer numbers](#integer-numbers) | No | None |

## Migrate with tools

The `migrate` command of the `mcpcontract` CLI and the migration tools in the
MCP Description Editor automate the migration. Both implement the
[0.8.0 to 0.9.0 conversion profile](../conversion/README.md), using the
reference implementation in [`@mcpdesc/core`](https://github.com/mcpdesc/core).
See [Known Implementations](../../implementations.md) for where to get them.

A conversion:

1. validates the document against 0.8.0, and stops if it is invalid, so fix
   0.8.0 errors first;
2. sets `mcpdesc` to `0.9.0` and, when present, updates `$schema`;
3. validates the result against 0.9.0 and reports each remaining
   incompatibility as a blocker, with the path of the value and the conversion
   rule that applies.

Some blockers offer a fix, such as removing a property. A tool applies a fix
only when you request it. A tool never moves a value into `_meta` or an `x-*`
property, never guesses a URI, and never rounds a number: those decisions are
yours. Blockers found by semantic validation, such as a malformed
`uriTemplate`, appear only once structural blockers are resolved, so run the
conversion again after each round of fixes.

The result includes a JSON Patch of the changes. Editors apply it to your
source text, so YAML comments and key order are preserved.

## Find remaining gaps with validation

Whether you migrate with tools or by hand, finish by validating the document
against 0.9.0. Validation confirms the document is valid and reports warnings
worth reviewing:

```bash
mcpcontract validate my-server.mcpdesc.yaml --schema mcpdesc --strict
```

Each diagnostic names the validation rule it reports and the path of the
value concerned. See [Validation](../validation/README.md) for how rules and


## Migrate by hand

1. Validate the document against 0.8.0 and fix any errors.
2. Set `mcpdesc` to `0.9.0`, and update `$schema` when present.
3. Remove unknown properties from Tool and Resource annotations.
4. Move custom client capability requirements into `experimental` or
   `extensions`.
5. Remove extra fields from the `completion` object of completion example
   results.
6. Fix malformed `uriTemplate` values, Resource `uri` values without a scheme,
   and fractional `size` or `ttlMs` values.
7. Validate against 0.9.0 and review the warnings.

The sections below explain each step.

## Required changes

### Version and schema identity

Set `mcpdesc` to `0.9.0`. When the document declares `$schema`, use the stable
identifier `https://mcpdesc.org/schema/mcp-description/0.9.0.json`.

Tools apply this change automatically.

### Annotations

Tool annotations and Resource annotations, including annotations on content
blocks, accept only the properties MCP defines
([Sections 9.6](../sections/09-tools.md) and
[10.3](../sections/10-resources.md)):

| Object | Allowed properties |
| --- | --- |
| Tool `annotations` | `title`, `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` |
| Resource annotations | `audience`, `priority`, `lastModified` (from MCP 2025-06-18) |

Remove other properties, including `x-*` keys. Decide where each removed value
belongs:

- server-defined metadata belongs in the declaration's `_meta`, for protocol
  versions that define it (from MCP 2025-06-18);
- MCP Description metadata belongs in `x-*` properties on the declaration
  itself.

Before:

```json
{
  "name": "inspect",
  "inputSchema": { "type": "object" },
  "annotations": {
    "readOnlyHint": true,
    "com.example/tier": "gold",
    "x-owner": "platform-team"
  }
}
```

After:

```json
{
  "name": "inspect",
  "inputSchema": { "type": "object" },
  "annotations": { "readOnlyHint": true },
  "_meta": { "com.example/tier": "gold" },
  "x-owner": "platform-team"
}
```

Tools report these as blockers
(`mcpdesc.conversion.0-8-to-0-9.tool-annotations-closed` and
`mcpdesc.conversion.0-8-to-0-9.annotations-closed`) and offer to remove the
property. Moving the value is up to you. See
[Proposal 0027](../proposal-snapshots/0027-closed-mcp-types.md).

### Client capability requirements

A `clientRequirements` object names only client capabilities that the
applicable MCP protocol versions define
([Section 8.5](../sections/08-capabilities.md)). Move custom requirements into
`experimental` or, for MCP 2026-07-28, into `extensions`:

```json
{ "clientRequirements": { "experimental": { "com.example/replay": {} } } }
```

Server capabilities were already closed in 0.8.0.

Tools report this as a blocker
(`mcpdesc.conversion.0-8-to-0-9.client-requirements-closed`) and offer to
remove the requirement or move it to `experimental`. See
[Proposal 0027](../proposal-snapshots/0027-closed-mcp-types.md).

### Completion example results

The `completion` object of a completion example result accepts only `values`,
`total`, and `hasMore`. Move other fields elsewhere, for example to the
result's `_meta`.

MCP Description does not support completion examples for MCP 2024-11-05.

Tools report this as a blocker
(`mcpdesc.conversion.0-8-to-0-9.completion-result-closed`) and offer to remove
the field. See
[Proposal 0026](../proposal-snapshots/0026-open-mcp-results-in-examples.md).

### Resource Template URI templates

Every Resource Template `uriTemplate` must be a valid RFC 6570 URI template
([Section 10.2.1](../sections/10-resources.md)). 0.8.0 checked it only when the
Resource Template had examples. Correct the template to the one the server
uses.

Tools report this as a blocker
(`mcpdesc.conversion.0-8-to-0-9.uri-template-checked`) without a fix.

### Resource URIs

A Resource `uri` must be an RFC 3986 URI with a scheme
([Section 10.1.2](../sections/10-resources.md)); 0.8.0 accepted any string.
Custom schemes remain valid. Replace a relative reference or free text with the
absolute URI the server uses, for example `file:///docs/readme.md` instead of
`docs/readme.md`.

Tools report this as a blocker
(`mcpdesc.conversion.0-8-to-0-9.resource-uri-checked`) without a fix, because
only you know the intended URI.

### Integer numbers

Resource `size`, the `size` of resource link content blocks, and Resource
example result `ttlMs` are integers
([Sections 3.6](../sections/03-document-structure.md),
[10.1.1, and 10.4.4](../sections/10-resources.md)), as in the JSON Schema MCP
generates. Replace a fractional value with the intended integer; `1024.0` is
already an integer.

Tools report this as a blocker
(`mcpdesc.conversion.0-8-to-0-9.integer-numbers`) without a fix, because
rounding would change the value. See
[Proposal 0029](../proposal-snapshots/0029-integer-mcp-numbers.md).

## Changes to review

These changes do not make a valid 0.8.0 document invalid. Some add warnings,
and some let you simplify a document.

### Example results

Example results and Tool Interaction step responses are checked against the
MCP type of each applicable protocol version
([Section 3.6](../sections/03-document-structure.md)):

- A field that an open MCP result type allows, but the protocol version does
  not define, is accepted with the warning
  `result-field-not-defined-by-version`. For example, a result shared by MCP
  2025-11-25 and MCP 2026-07-28 can include `resultType`. Declarations split
  only because of `resultType`, `ttlMs`, or `cacheScope` can be merged;
  keeping them split avoids the warning.
- Sampling, elicitation, and roots step responses accept `_meta` and, with
  warnings, unknown fields through MCP 2025-11-25. For MCP 2026-07-28 they are
  closed, and only sampling responses accept `_meta`.
- Roots in roots responses accept `_meta` from MCP 2025-06-18.
- Reserved `_meta` keys are also checked in example results, their content,
  step responses, and roots.

See
[Proposal 0026](../proposal-snapshots/0026-open-mcp-results-in-examples.md).

### Tool schema dialects

For MCP 2025-11-25 and MCP 2026-07-28, a Tool `inputSchema` or `outputSchema`
that declares `$schema` must declare JSON Schema 2020-12 or draft-07
([Section 9.2](../sections/09-tools.md)). The reference validator already
accepted only these two. Prefer removing `$schema` to use the 2020-12 default.

For these protocol versions the dialect, not a literal `"type": "object"`,
decides whether a schema is valid. A schema the dialect accepts but the native
MCP `Tool` type rejects, such as a root `$ref` or a boolean `properties` value
for MCP 2025-11-25, stays valid with the warning
`tool-schema-mcp-type-mismatch`, because the Tool cannot be projected to MCP
for that protocol version. To clear the warning, write `{}` instead of `true`,
`{ "not": {} }` instead of `false`, or `"type": "object"` beside `$ref` or
`allOf`, or narrow the Tool's `protocolVersions`.

See
[Proposal 0032](../proposal-snapshots/0032-dialect-governed-tool-schemas.md).

### YAML scalars

0.9.0 clarifies how YAML plain scalars are read
([Section 15.3.3](../sections/15-serialization.md)): null, booleans, and
numbers follow the YAML JSON-schema rules, and every other unquoted value is a
string. Values such as `0o12`, `0x12`, `012`, `TRUE`, and `~` are therefore
strings, although a YAML 1.2 Core reader would convert them. Write numbers in
JSON spelling, and quote strings that could be misread.

## If you maintain tooling

Validator output changed in 0.9.0. Diagnostics carry a `rule` property, some
codes were renamed or replaced, and paths can differ. CI checks or snapshot
tests that compare whole diagnostics may need updating; compare diagnostics by
`rule`, `severity`, and `path`. See [Validation](../validation/README.md) and
the [0.9.0 changelog](../CHANGELOG.md) for details.

For example, the 0.8.0 warning `uncatalogued-oauth-scope` is reported as
`uncataloged-oauth-scope` under rule `mcpdesc.security.requirements`.
