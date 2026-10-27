# Proposal 0029: Integer MCP Numbers

- Status: Draft
- Author(s): @ObjectIsAdvantag
- Created: 2026-10-27
- Target version: 0.9.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/84,
  https://github.com/mcpdesc/mcpdesc-specification/issues/82
- Depends on: [Proposal 0024](0024-validation-rule-identity-and-provenance.md)
  (sources of truth, arbitrations)
- AI assistance disclosure: Drafted with GitHub Copilot (Claude Opus 5.5) from
  the maintainer decision on issue #84; requires normal maintainer and
  community review.

## Summary

Read an unannotated `number` in MCP's `schema.ts` as an integer, following the
configuration MCP uses to generate its JSON Schema, and type the three MCP
Description fields that disagree today as integers: Resource `size`, resource
link `size` in content blocks, and `ttlMs` in example results.

## Problem

MCP Description 0.9.0-draft.1 accepts fractions for three fields that MCP's
generated `schema.json` types as `integer` in every revision that defines
them:

| MCP Description field | 0.9.0-draft.1 | MCP `schema.ts` | MCP `schema.json` | Revisions |
| --- | --- | --- | --- | --- |
| Resource `size` | `number` | `size?: number` | `integer` | all five |
| Resource link `size` in content blocks | `number` | `size?: number` (inherited from `Resource`) | `integer` | 2025-06-18 and later |
| Example result `ttlMs` | `number`, minimum 0 | `ttlMs: number` | `integer` | 2026-07-28 |

The validator does not check for integers either. As a result:

- a valid declaration with `"size": 1.5` projects to a Resource that fails the
  native projection postcondition (Section 4.14), which the specification
  treats as a defect;
- an example result with `"ttlMs": 0.5` is accepted, although examples are
  measured against MCP's types (Section 3.6);
- MCP Description and the schema that MCP tooling validates against disagree
  on a value's validity.

The sources-of-truth rules (`validation/README.md`, Proposal 0024 Section 7)
say that when `schema.json` and `schema.ts` disagree, `schema.ts` wins and the
difference is a probable generator defect. Applied literally, the fields stay
`number`. That reading is wrong here, because the difference is not a defect.

## Goals

- Resolve how MCP Description reads numeric types from `schema.ts`, once, for
  every MCP type it carries.
- Make the three fields agree with MCP.
- Keep native projection free of postcondition failures for valid documents.

## Non-goals

- Changes to MCP. A clarification of the convention in MCP's schema
  documentation may be suggested upstream separately.
- A minimum for `size` (open question 1).
- A correction of 0.8.0. This change makes valid documents invalid, so it
  cannot be a validator revision of a stable release.

## Background and primary references

At the pinned commit
`modelcontextprotocol/modelcontextprotocol@dae694f61a31f7a3ec2af3aff709e11f70f61e48`,
`scripts/generate-schemas.ts` generates every revision's `schema.json` with:

```text
typescript-json-schema --defaultNumberType integer --required --skipLibCheck
```

TypeScript has a single `number` type. With `--defaultNumberType integer`, the
generator emits `integer` for every `number` unless the field carries the
annotation `@TJS-type number`. MCP's authors use that annotation on fields that
take fractions, for example `Annotations.priority` and the sampling
`ModelPreferences` priorities, both with `@minimum 0`. `size` and `ttlMs` carry
no annotation.

MCP fields typed `integer` in the generated schemas, and how MCP Description
carries them:

| MCP field | Revisions | MCP Description 0.9.0-draft.1 |
| --- | --- | --- |
| `Resource.size`, `ResourceLink.size` | all; `ResourceLink` from 2025-06-18 | `number` (this proposal) |
| `CacheableResult.ttlMs` and derived results | 2026-07-28 | `number` (this proposal) |
| `CompleteResult.completion.total` | all | `integer` |
| `CreateMessageRequest(Params).maxTokens` | all | `integer` |
| `StringSchema.minLength`, `maxLength` | 2025-06-18 and later | `integer` |
| Multi-select enum `minItems`, `maxItems` | 2025-11-25 and later | `integer` |
| JSON-RPC error `code`, task `ttl` and `pollInterval` | various | not carried |

Every carried field that MCP types as an integer is already an integer in MCP
Description, except the three this proposal changes.

## Proposed normative behavior

### 1. Reading numeric types from `schema.ts`

Add to the sources-of-truth rules (`validation/README.md`, conflict table):

| Conflict | Outcome |
| --- | --- |
| `number` in `schema.ts` versus `integer` in `schema.json` | Integer. MCP generates `schema.json` with `--defaultNumberType integer`, so an unannotated `number` denotes an integer and `@TJS-type number` denotes a number. Not a generator defect. |

The existing row "`schema.json` versus `schema.ts` → `schema.ts`" continues to
apply to every other difference.

### 2. Field types

| Location | Change |
| --- | --- |
| Section 10.1, Resource Object, `size` | `number` → `integer` |
| Content blocks, resource link `size` | `number` → `integer` |
| Section 3.6, value constraints | "`ttlMs` MUST be a non-negative number" → "a non-negative integer" |
| Section 10.4.4, MCP 2026-07-28 Resource example results | "non-negative numeric `ttlMs`" → "non-negative integer `ttlMs`" |

The `ttlMs` constraint keeps applying in every revision where an example
result carries the field, as Section 3.6 states today.

### 3. Rules

Two rule records, owner `mcp`, kind structural, diagnostic
`schema-validation`:

| Rule | Covers | Applicability |
| --- | --- | --- |
| `mcp.resource.size` | `Resource.size` and `ResourceLink.size`, wherever MCP Description carries them | every revision that defines the type |
| `mcp.cacheable-result.ttl-ms` | `ttlMs` in example results | defined in MCP 2026-07-28; value constraint in every revision (Section 3.6) |

Both carry an `active` arbitration recording the `schema.ts` and `schema.json`
sources, the generator configuration as evidence, and this proposal as the
decision. No new diagnostic code is needed.

## Schema impact

In `schemas/mcp-description/0.9.0.json`, `type` becomes `integer` at:

- `$defs/resource/properties/size`;
- the resource link `size` in `$defs/toolResultContent`;
- every `ttlMs` that the schema constrains, including
  `$defs/completedReadResourceResultExample/properties/ttlMs` (minimum 0 is
  kept).

## Examples

Invalid in 0.9.0:

```json
{
  "uri": "file:///reports/q3.pdf",
  "name": "q3-report",
  "size": 1048576.5
}
```

```text
schema-validation  /resources/0/size must be integer  (rule mcp.resource.size)
```

Valid, unchanged: `"size": 1048576`, and `"ttlMs": 60000`.

## Compatibility

Breaking: documents with a fractional `size` or `ttlMs` become invalid.
No document in this repository uses one. A byte count or a millisecond
duration is rarely fractional in practice.

JSON values such as `1024.0` are integers under JSON Schema 2020-12 (a number
with a zero fractional part), so they stay valid.

## Migration

Replace a fractional value with the intended integer. Version conversion from
0.8.0 (Proposal 0028) reports such values with the conversion rule
`mcpdesc.conversion.0-8-to-0-9.integer-numbers` and offers no automatic fix,
because rounding would change the value. The 0.8.0 to 0.9.0 migration guide
gains a section.

## Security and privacy considerations

None. An integer `size` or `ttlMs` remains a hint and is not a limit that
consumers can rely on; existing guidance on size and processing limits is
unchanged.

## Alternatives considered

- **Follow the TypeScript type literally (`number`).** Rejected: valid
  documents can fail native projection, and MCP Description would disagree
  with the schema MCP tooling validates against.
- **Keep `number` and warn on fractions.** Rejected: projection can still
  fail, and a warning does not fit "examples fail fast" for a typed MCP field.
- **Fix only `size`.** Rejected: the same reading applies to every MCP
  `number`; deciding it once prevents the next divergence.

## Open questions

1. Should `size` gain `minimum: 0`? MCP defines no minimum; "size … in bytes"
   implies a non-negative value. Adding it would make MCP Description stricter
   than MCP.
2. Should the convention be raised upstream as a documentation clarification
   for MCP schema contributors?

## Implementation and validation plan

1. Proposal pull request (this document).
2. On the 0.9.0 draft.2 implementation branch, together with Proposal 0028:
   sources-of-truth row in `validation/README.md`; Sections 3.6, 10.1, 10.4.4
   and the content-block text; schema changes; rule records with
   arbitrations.
3. Fixtures `expected-invalid/fractional-resource-size.json`,
   `fractional-resource-link-size.json`, and `fractional-ttl-ms.json`, each
   cited by its rule.
4. Changelog entry (breaking), migration guide section, and the conversion
   rule of Proposal 0028 with a conversion fixture.

## Decision record

Option A of issue #84 (adopt MCP's generator convention) chosen by the
maintainer on 2026-10-27, for inclusion in 0.9.0 draft.2 with Proposal 0028.

Acceptance pending.
