# Migrating from MCP Description 0.8.0 to 0.9.0

MCP Description 0.9.0 is a community working draft. This guide follows the
draft and changes with it; see the [changelog](../CHANGELOG.md) for the status
of each change and the proposal that introduced it.

Version 0.9.0 measures carried MCP values against each protocol version's TypeScript
schema. Most 0.8.0 documents need only a version change. Documents that put
extra properties on closed MCP types must move them.

## Version and schema identity

Set `mcpdesc` to `0.9.0`. When emitting `$schema` during the draft, use
`https://mcpdesc.org/schema/mcp-description/0.9.0-rc.1.json`; the stable
identifier is assigned at release.

## Discriminator-driven diagnostics after RC.1

The working draft implements review-stage [Proposal 0034](../proposal-snapshots/0034-discriminator-driven-schema-validation.md)
([issue #112](https://github.com/mcpdesc/mcpdesc-specification/issues/112)) for
possible RC.2 inclusion. Transport and seven other unambiguously discriminated
object unions use standard JSON Schema `if`/`then` conditionals. No document
rewrite is intended: required fields, discriminator values, closure, and
specification-extension eligibility are unchanged.

Diagnostic counts, ordering, and raw schema paths can change. For example,
`#/$defs/transport/oneOf/1` becomes
`#/$defs/transport/allOf/1/then`; the Resource `size` rule's content-block
location moves similarly. Registered rule IDs and the validation-result format
are unchanged. Consumers should use rule IDs and document locations rather than
pinning error counts or schema paths across selectors.
With redundant union or conditional summaries removed, an enclosing shape rule
can now pass while a more specific nested rule fails (for example, Resource
`size`). Rule citations track the specific failures rather than those summaries.

AJV can report an `if` summary alongside specific selected-branch failures. The
candidate validator omits only a summary whose selected `then` already supplies
a specific failure; independent defects remain. Raw schema engines can retain
summaries. No actionable/supporting diagnostic fields are standardized.
Unchanged nested unions, such as a sampling content value that can be an
object or an array, can still report alternative failures and `oneOf` summaries.

Published RC.1 remains immutable. This working-tree implementation does not
assign an RC.2 schema identity or validator selector. An approved new candidate
needs normal release preparation, a new exact downstream validator selector,
and runtime/generated standalone/browser parity checks. Core should adopt that
selector, verify each selector-sensitive operation, and update its support
matrix and validator pin rather than reproducing branch-selection semantics.
JSON/YAML editor completion and hover behavior still need downstream review.

## Annotations

Tool Annotations and Resource Annotations, including annotations on content
blocks, accept only the properties MCP defines (Sections 9.6 and 10.3):

| Object | Allowed properties |
| --- | --- |
| Tool `annotations` | `title`, `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` |
| Resource Annotations | `audience`, `priority`, `lastModified` (from MCP 2025-06-18) |

Remove other properties, including `x-*` keys. Server-defined metadata belongs
in the declaration's `_meta` where the protocol version defines it (from MCP
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
applicable MCP protocol versions define (Section 8.5). Move custom requirements into
`experimental` or, for MCP 2026-07-28, into `extensions`:

```json
{ "clientRequirements": { "experimental": { "com.example/replay": {} } } }
```

Server capabilities were already closed in 0.8.0.

## Integer numbers

Resource `size`, the `size` of resource link content blocks, and Resource
example result `ttlMs` are integers (Sections 3.6, 10.1.1, and 10.4.4), as in
the JSON Schema MCP generates. Replace a fractional value with the intended
integer; `1024.0` is already an integer.

## Resource URIs

A Resource `uri` must be an RFC 3986 URI with a scheme (Section 10.1.2), as
MCP types it and as Section 15 already required of URI values; 0.8.0 accepted
any string. Custom schemes remain valid. Replace a relative reference or free
text with the absolute URI the server uses, for example `file:///docs/readme.md`
instead of `docs/readme.md`. Version conversion reports such a value as
blocked rather than guessing the URI.

## Tool schema dialects

For MCP 2025-11-25 and later, a Tool `inputSchema` or `outputSchema` that
declares `$schema` must declare JSON Schema 2020-12 or draft-07 (Section 9.2).
In 0.8.0 the accepted set depended on the validator; the reference validator
already accepted only these two, so its results do not change. Replace any
other declared dialect, preferably by removing `$schema` to use the 2020-12
default.

For MCP 2025-11-25 and later, the dialect also decides the schema's shape
(Section 9.2). 0.8.0 required a literal `"type": "object"` at every
`inputSchema` root; 0.9.0 requires it only before MCP 2025-11-25 and otherwise
rejects only a declared root `type` that excludes `"object"`. No 0.8.0 document
becomes invalid. A schema that the MCP `Tool` type of an applicable protocol version
rejects, such as a root in `$ref` or a boolean `properties` value for MCP
2025-11-25, stays valid with the new warning `tool-schema-mcp-type-mismatch`,
because native projection fails for that protocol version. Write `{}` instead of
`true`, `{ "not": {} }` instead of `false`, or `"type": "object"` beside
`$ref` or `allOf`, or narrow the Tool's `protocolVersions`.

## Example results

Example results and Tool Interaction step responses are checked against each
applicable protocol version's MCP type (Section 3.6):

- A field that an open MCP result type allows but the protocol version does not define
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
- Result `_meta` is accepted in every protocol version. Root `_meta` in roots responses
  is accepted from MCP 2025-06-18.
- Reserved `_meta` keys are checked in example results, their content, step
  responses, and roots.

MCP Description does not support completion examples for MCP 2024-11-05.

## Validator output

### Rule catalog consumers

0.9.0 introduces validation rule catalogs and rule-linked diagnostics; these
are new to 0.9.0, not formats that 0.8.0 validators emitted. For changes to the
catalog and validation result formats in RC.1, see the Release Candidate 1
entry in the [0.9.0 changelog](../CHANGELOG.md).

Discover catalogs through the publication index, then pin an immutable
manifest. Resolve evidence and description links from its
`specificationBaseUrl`, not a moving branch. See the
[catalog publication contract](../validation/README.md#catalog-publication-and-discovery).
Existing 0.8.0 validators do not gain retroactive rule diagnostics or a catalog.

### Document diagnostics

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
  protocol version is not supported by MCP Description.
- `schema-validation` diagnostics name the rule that owns the failing schema
  location, for example `mcpdesc.tool.members` or `mcp.content.members`,
  instead of `mcpdesc.document.schema`, which reports only failures of the
  document root.
- A diagnostic whose finding depends on MCP protocol versions lists them in
  `protocolVersions`. `rule`, `severity`, and `path` are the interoperable
  contract; `code` and `message` are optional producer output
  ([Section 16.5](../sections/16-conformance.md#req-diagnostic-rule)). Compare
  diagnostics by `rule`, not by `code`.
- The exported validator's `validate()` also returns `results`:
  one status per rule and declared protocol version, in the
  [validation result format](../validation/result.schema.json). Treat
  `not-applicable` and `not-evaluated` as not confirmed, never as passed.
  Validity is unchanged.

## Recommended algorithm

1. Validate the 0.8.0 source.
2. Set `mcpdesc` to `0.9.0` and update `$schema` when emitted.
3. Remove unknown annotation properties, moving server-defined metadata to
   `_meta` only where the protocol version defines it.
4. Move unknown client capability requirements into `experimental` or
   `extensions`.
5. Move extra fields out of completion `completion` objects.
6. Fix malformed `uriTemplate` values and fractional `size` or `ttlMs`
   values.
7. Validate against the 0.9.0 JSON Schema and semantic rules, and review the
   new warnings.

A migration tool MUST report unresolved ambiguity instead of guessing, and
MUST NOT move a value into `_meta` or `x-*` without author review.

## Conversion

The [conversion profile](../conversion/README.md) implements this algorithm
for tools such as the mcpcontract CLI and the mcpdesc live editor. Steps 1, 2,
and 7 are automatic. Steps 3 to 6 are blockers, each reported with a
conversion rule and a path:

| Step | Conversion rule | Fixes offered |
| --- | --- | --- |
| 3 | `mcpdesc.conversion.0-8-to-0-9.tool-annotations-closed`, `annotations-closed` | `remove-property` |
| 4 | `mcpdesc.conversion.0-8-to-0-9.client-requirements-closed` | `remove-property`, `move-to-experimental` |
| 5 | `mcpdesc.conversion.0-8-to-0-9.completion-result-closed` | `remove-property` |
| 6 | `mcpdesc.conversion.0-8-to-0-9.uri-template-checked`, `integer-numbers` | none |

A fix is applied only when the author requests it. Moving a value into
`_meta` or `x-*` is never offered as a fix.
