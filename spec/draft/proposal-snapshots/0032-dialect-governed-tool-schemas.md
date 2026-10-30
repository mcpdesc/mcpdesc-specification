# Proposal 0032: Dialect-Governed Tool Schemas

- Status: Review
- Author(s): @ObjectIsAdvantag
- Created: 2026-10-30
- Target version: 0.9.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/95,
  https://github.com/modelcontextprotocol/modelcontextprotocol/issues/3238
- Depends on: [Proposal 0024](0024-validation-rule-identity-and-provenance.md)
  (sources of truth, arbitrations),
  [Proposal 0025](0025-native-mcp-projection.md) (native projection)
- AI assistance disclosure: Drafted with GitHub Copilot (Claude Opus 5.5) from
  the maintainer decision on issue #95; requires normal maintainer and
  community review.

## Summary

For MCP 2025-11-25 and MCP 2026-07-28, judge an embedded Tool schema by its
declared or default JSON Schema dialect, as MCP's specification text requires,
and keep enforcing what MCP requires of the data: tool arguments are objects.
Where the TypeScript `Tool` type of those revisions restricts schema syntax
that the dialect allows, accept the schema, report a warning, and let native
projection fail its postcondition for the revisions concerned. Apply this one
position to the two conflicts known today: boolean subschemas under
`properties` (issue #95) and Tool schema roots without a literal
`"type": "object"` (MCP issue #3238).

## Problem

MCP 2025-11-25 and MCP 2026-07-28 say that embedded schemas default to JSON
Schema 2020-12, may declare another dialect with `$schema`, and must be
validated under that dialect. Their TypeScript `Tool` types also restrict the
schema syntax:

| Restriction in `schema.ts` | 2025-11-25 | 2026-07-28 | Allowed by JSON Schema 2020-12 |
| --- | --- | --- | --- |
| `inputSchema` root has `type: "object"` | yes | yes | a root may use `$ref`, `allOf`, or `type: ["object", "null"]` |
| `outputSchema` root has `type: "object"` | yes | no (any root) | same |
| each top-level `properties` value is an `object` | yes | no (open index signature) | `true` and `false` are subschemas |

MCP Description 0.9.0-draft.3 resolves these conflicts in two opposite ways:

- `mcp.tool.input-schema.object-root` sides with `schema.ts` and rejects any
  `inputSchema` root without a literal `type: "object"`, in every revision;
- `json-schema.tool-schema.valid` sides with the dialect and accepts
  `"properties": { "enabled": true }` for MCP 2025-11-25, so the document is
  valid, yet its native projection fails the pinned MCP 2025-11-25 `Tool`
  schema. Section 4.14 calls such a failure a defect, and Draft 3 records it
  as a planned gap on `mcpdesc.projection.native-schema`;
- `mcp.tool.schema-keywords.preserve` already sides with the documentation
  against the closed TypeScript types for unknown keywords.

The two outcomes cannot both be explained by one rule, and neither tells the
author, at validation time, that a valid Tool cannot be projected to a
revision.

## Goals

- One stated position for conflicts between MCP's dialect text and the
  schema syntax its TypeScript types impose.
- No MCP Description verdict on MCP's internal inconsistency: the conflict is
  reported, not resolved by rejecting or repairing the Tool.
- Early, precise notice to authors, before projection.
- No change for revisions before MCP 2025-11-25, which state no dialect.

## Non-goals

- Changes to MCP. MCP issue #3238 discusses the `inputSchema` root; MCP
  2026-07-28 already removed the restriction on `properties` values.
- Repairing values during native projection, for example replacing `true`
  with `{}` or adding `"type": "object"`.
- Analyzing composition to prove that a root admits objects. Only a declared
  root `type` is checked.
- Other MCP types or fields.

## Background and primary references

At the pinned commit
`modelcontextprotocol/modelcontextprotocol@dae694f61a31f7a3ec2af3aff709e11f70f61e48`:

- MCP 2025-11-25 and 2026-07-28, Basic, JSON Schema Usage: schemas without
  `$schema` default to JSON Schema 2020-12, and implementations must validate
  schemas according to their declared or default dialect
  (`docs/specification/2025-11-25/basic/index.mdx` L140-L186,
  `docs/specification/2026-07-28/basic/index.mdx` L251-L297).
- MCP 2025-11-25 `schema.ts`, `Tool` (L1257-L1284): `inputSchema` and
  `outputSchema` are `{ $schema?: string; type: "object"; properties?: {
  [key: string]: object }; required?: string[] }`.
- MCP 2026-07-28 `schema.ts`, `Tool` (L1981-L2005): `inputSchema` keeps
  `type: "object"` and adds an open index signature; `outputSchema` is any
  JSON Schema object.
- The generated `schema.json` files, used by the projection postcondition,
  mirror these types.
- MCP SEP-2106 (Final) keeps `type: "object"` at the `inputSchema` root on
  purpose; MCP issue #3238 (open) argues that the requirement belongs on the
  argument instance rather than on schema syntax.

Interoperability evidence (tier 5, `main` on 2026-10-27): the official
TypeScript SDK accepts any JSON value under `properties` but requires
`type: z.literal('object')` at the `inputSchema` root; the Python SDK types
both schemas as `dict[str, Any]`.

## Proposed normative behavior

### Position

For MCP 2025-11-25 and MCP 2026-07-28, the declared or default dialect
decides whether an embedded Tool schema is valid. MCP's requirement on the
data stays enforced: the `inputSchema` root, and before MCP 2026-07-28 the
`outputSchema` root, must describe an object. A restriction of schema syntax
that appears only in the TypeScript `Tool` type does not make the MCP
Description invalid; validators report it as a warning, and native projection
reports it, per revision, as `projection-postcondition-failed`. Revisions
before MCP 2025-11-25 state no dialect, so their `schema.ts` shape stays the
only source and is enforced as today.

### Section 9.2

1. **Object root.** The `inputSchema` root MUST describe an object. A root
   that declares `type` MUST give `"object"` or an array containing
   `"object"`. Before MCP 2025-11-25, the root MUST declare
   `"type": "object"`.
2. **Output root.** Before MCP 2026-07-28, the `outputSchema` root MUST
   describe an object: for MCP 2025-06-18 it MUST declare `"type": "object"`;
   for MCP 2025-11-25 a root that declares `type` MUST include `"object"`.
3. **MCP type restrictions.** For MCP 2025-11-25 and MCP 2026-07-28, a Tool
   schema that is valid under its dialect but does not meet a restriction of
   the MCP `Tool` type for an applicable revision MUST NOT make the MCP
   Description invalid. The restrictions are a literal `"type": "object"` at
   the `inputSchema` root (both revisions), at the `outputSchema` root (MCP
   2025-11-25), and an object for each value of a top-level `properties` of
   either schema (MCP 2025-11-25). Validators MUST report a warning for each
   such location, naming the revisions concerned. Authors SHOULD meet the
   restrictions, for example with `{}` instead of `true`, `{ "not": {} }`
   instead of `false`, or `"type": "object"` beside `$ref` or `allOf`, or
   SHOULD limit the Tool's `protocolVersions`.

### Section 4.14

A `projection-postcondition-failed` failure still indicates a defect, except
for a declaration and revision for which validation reports the warning of
Section 9.2: there it reflects a recorded MCP restriction that MCP
Description does not enforce. In both cases implementations MUST NOT repair
the value.

### Validation rules

| Rule | Change |
| --- | --- |
| `mcp.tool.input-schema.object-root` | Per-revision check: literal `type: "object"` before 2025-11-25; from 2025-11-25 only a declared root `type` that excludes `"object"` is an error. The arbitration's authority becomes MCP's dialect text plus the object-argument requirement; MCP issue #3238 stays the upstream reference. |
| `mcp.tool.output-schema.object-root` | Same split for MCP 2025-06-18 (literal) and 2025-11-25 (declared `type` includes `"object"`), with an arbitration for 2025-11-25. |
| `mcp.tool.schema.native-shape` (new, `should`) | Warning `tool-schema-mcp-type-mismatch` for each location that misses a restriction listed in Section 9.2, item 3, naming the revisions concerned. Arbitrated; applies to 2025-11-25 and 2026-07-28. |
| `mcpdesc.projection.native-schema` | The planned gap of Draft 3 is resolved: postcondition failures for warned declarations are expected, recorded behavior. |

## Schema impact

The canonical document schema stops requiring `type: "object"` on an inline
`inputSchema`; the root rules move to semantic validation, where the
effective protocol scope is known. A Tool schema remains a JSON object or a
Reference Object.

## Examples

| Tool schema | Scope | Validation | Native projection |
| --- | --- | --- | --- |
| `{"type": "object", "properties": {"enabled": true}}` | 2025-11-25 | valid, warning | 2025-11-25 fails the postcondition |
| same | 2026-07-28 | valid | succeeds |
| same | 2025-11-25 and 2026-07-28 | valid, warning naming 2025-11-25 | 2025-11-25 fails; 2026-07-28 succeeds |
| `{"type": "object", "properties": {"enabled": {}}}` | any | valid | succeeds |
| `{"$ref": "#/$defs/Arguments", "$defs": {...}}` | 2025-11-25 or 2026-07-28 | valid, warning | fails the postcondition |
| `{"type": "object", "$ref": "#/$defs/Arguments", "$defs": {...}}` | any | valid | succeeds |
| `{"type": "string"}` | any | error | `projection-source-invalid` |
| `{"$ref": "#/$defs/Arguments", ...}` | 2025-06-18 | error | `projection-source-invalid` |
| nested `true`, `items: true`, `additionalProperties: false` | any | valid | succeeds |

## Compatibility

Compatible for documents: every document valid under 0.9.0-draft.3 stays
valid. Documents whose only errors were a non-literal object root in MCP
2025-11-25 or 2026-07-28 become valid with a warning. Documents that use a
boolean `properties` value for MCP 2025-11-25 gain a warning.

Consumers that assumed a literal `type: "object"` at every `inputSchema` root
of a valid document, for example to pass the schema to a model API, should
honor the warning or use native projection, which refuses such Tools for the
revisions concerned.

## Migration

No change is required. To clear the warning, follow the SHOULD in Section
9.2, item 3.

## Security and privacy considerations

None. Validation remains offline and does not fetch references.

## Alternatives considered

1. **Follow `schema.ts` everywhere.** Extend the legacy shape to MCP
   2025-11-25 and keep the strict root. Keeps "valid implies projectable",
   but rejects Tools that the dialect, the SDKs for `properties`, and MCP
   2026-07-28 accept, and turns MCP's inconsistency into an MCP Description
   verdict.
2. **Follow the dialect only for `properties`.** Keep the strict root. Leaves
   two opposite arbitrations of the same conflict.
3. **Accept silently.** Matches this proposal without the warning, so authors
   learn about the conflict only at projection.

## Open questions

None.

## Implementation and validation plan

- Section 9.2 and Section 4.14 text, canonical schema, candidate validator,
  rule records, fixtures, projection fixtures, changelog, and migration guide
  in the 0.9.0 draft.
- New fixtures: an expected-warning document covering every restriction, an
  expected-valid document with the author fixes and a scoped Tool, an
  expected-invalid document for a non-literal root before MCP 2025-11-25, and
  projection postcondition cases for a `$ref` root in both revisions.
- `@mcpdesc/core` implements the validator change and the projection
  postcondition at its intake of the draft that includes this proposal.

## Decision record

- 2026-10-30: Maintainer chose this position over following `schema.ts`
  (issue #95), including the revision of the `inputSchema` root arbitration
  and the early warning.
