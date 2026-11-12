# Proposal 0036: Normalized YAML Presentation

- Status: Draft
- Author(s): @ObjectIsAdvantag
- Created: 2026-11-09
- Target version: 0.9.0 RC.4 candidate
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/119

## Summary

Define a precise YAML presentation profile for MCP Description documents and
first-party examples. The profile will make normalized output consistent
across specification examples, documentation, fixtures, and tooling without
changing YAML input conformance, document validity, or the decoded data model.
It will make the existing recommendation to quote dates actionable and address
sequence indentation, scalar quoting, multiline values, ordering, and stable
serialization details. Implementations and content claiming to follow the
profile will have explicit, testable output requirements.

## Problem

MCP Description 0.9.0 defines restricted YAML input and producer conformance in
Section 15, and a document-oriented property-ordering profile in Section 18.
Section 15 recommends quoting date-like strings for portability, but neither
section defines a complete YAML formatting profile. Consequently, examples and
generated output vary in sequence indentation, quoting style, and ordering.
Tooling that parses and serializes the same logical document can introduce
inconsistent diffs or emit scalar spellings that older YAML 1.1 tools interpret
as dates, booleans, numbers, or nulls.

The distinction between input semantics and output style also needs to be
clear. A value that has already been coerced to another type by an incorrect
parser cannot be made lossless by quoting it during serialization. Conversely,
different valid YAML spellings of the same string do not make a document
non-conforming.

The inconsistency affects more than the eight primary examples. Inline YAML
examples, repository fixtures, tests, validation registries, generated
documents, and documentation maintained by companion repositories all need
consistent guidance, while preserving their own data and schema semantics.

## Goals

- Define one clear, deterministic YAML output style for MCP Description
  documents.
- Keep that style separate from input parsing, conformance, and validation.
- Make generated output portable across YAML 1.2 implementations and common
  YAML 1.1 consumers.
- Ensure serialization preserves the exact JSON-compatible value, including
  scalar types, empty strings, significant empty values, and trailing
  newlines.
- Give specification authors a single reference for YAML examples in
  documentation, tests, fixtures, and tooling.
- Enable conformance tests for format stability, semantic round-tripping, and
  normalization idempotence.

## Non-goals

- Changing the required YAML 1.2.2 JSON-schema scalar-resolution contract.
- Making YAML formatting, quoting, or object-key order affect document
  validity or semantic equivalence.
- Defining cryptographic canonical YAML suitable for signing or hashing.
- Changing JSON serialization, document acceptance, JSON Schema, or semantic
  validation.
- Requiring source-preserving editors to discard comments, anchors, or source
  formatting when the caller did not request normalization.
- Publishing the profile or its implementation in another repository; those
  repositories can adopt the upstream profile independently.

## Background and primary references

- [Section 15: Serialization](../spec/draft/sections/15-serialization.md)
  defines JSON and restricted YAML input/output, including the YAML 1.2.2
  JSON-schema scalar-resolution requirement and the recommendation to quote
  date-like strings.
- [Section 18: Document-oriented Serialization Ordering](../spec/draft/sections/18-document-ordering.md)
  defines a recommended ordering for recognized MCP Description objects and
  requires preservation of array and named-map entry order.
- [Issue #23: Support JSON and YAML serializations](https://github.com/mcpdesc/mcpdesc-specification/issues/23)
  and [Proposal 0010: JSON and YAML Serialization](../proposals/0010-json-yaml-serialization.md)
  established the current shared data model and restricted YAML profile.
- [YAML 1.2.2](https://yaml.org/spec/1.2.2/) defines the JSON schema used by
  the current MCP Description YAML profile.
- The proposal is informed by user-provided analyses of YAML scalar
  portability and observed output from `@mcpdesc/core` and `mcpcontract`.

## Proposed normative behavior

Add a named normalized-presentation profile to the serialization guidance,
alongside the existing document-ordering profile. Applying the profile is
explicit: it does not change whether an otherwise conforming YAML document is
accepted. A producer that declares or is explicitly asked to emit normalized
MCP Description YAML MUST follow the profile. Specification-authored MCP
Description YAML examples SHOULD follow it.

The profile should define the following rules:

1. **Indentation:** use two spaces per indentation level and indent block
   sequences beneath their mapping keys. Do not use tabs for indentation.
2. **Scalar values:** emit actual JSON numbers, booleans, and `null` as
   unquoted YAML scalars. Emit ordinary strings as plain scalars when
   unambiguous. When a string could resolve as another scalar type in YAML
   1.2.2 JSON-schema resolution or a common YAML 1.1 implementation, emit it
   with double quotes. This includes timestamp-like strings and strings
   resembling booleans, nulls, or numbers. The `protocolVersions` values MUST
   always be double-quoted strings.
3. **Quoting style:** when quoting a string is required, use double quotes,
   with escaping that preserves the original string. Do not use single-quoted
   strings in normalized output. Empty strings MUST be written as `""`.
4. **Mapping keys:** apply the same safe-string and double-quote rules to
   string mapping keys; do not allow YAML resolution to change their type.
5. **Multiline strings:** use literal block scalars when they preserve the
   exact string value, selecting chomping indicators to preserve whether and
   how many trailing newlines are present. Use double-quoted escaped scalars
   where a block scalar cannot represent the value losslessly.
6. **Ordering and collection preservation:** apply Section 18 to recognized
   MCP Description objects when its profile is selected. Preserve array order
   and named-map entry order; do not alphabetically sort arbitrary keys,
   arrays, or opaque values.
7. **Stable output details:** define UTF-8 output, LF line endings, a final
   newline, and a scalar line-wrapping policy. Normalization MUST preserve the
   decoded value exactly and MUST NOT add, remove, or coerce properties or
   empty values.

Normalization MUST operate on the parsed JSON-compatible data model. YAML
input MUST still be parsed according to Section 15.3 and MUST NOT be coerced
through YAML 1.1 resolution or application-specific constructors. Formatting
MUST NOT be used as a substitute for validation, and normalization MUST NOT
silently repair invalid documents.

The exact scalar-ambiguity set and line-wrapping policy should be agreed during
review and expressed in test vectors rather than left to a serializer's
unexamined defaults. The profile should include examples for strings such as
`2026-07-28`, `0.8`, `123`, `true`, `on`, `null`, `""`, `Search: documents`,
and `Hello # world`, alongside actual booleans, numbers, and nulls.

## Schema impact

None. The profile governs presentation only and does not change the decoded
data model or JSON Schema acceptance.

## Examples

Normalized MCP Description YAML would use indented sequences and quoted
protocol versions:

```yaml
mcpdesc: 0.9.0
info:
  name: com.example.server
  title: Example MCP Server
  description: "Tools: search and retrieval"
protocolVersions:
  - "2025-11-25"
  - "2026-07-28"
tools:
  - name: search
    description: Search documents
    enabled: true
```

The example's formatting is not a validity requirement for other YAML
spellings. In particular, normalization must not turn a quoted `"true"` string
into the boolean `true`, or convert an empty string into null or omission.

## Compatibility

This is a compatible, presentation-only addition. It does not change parsing
requirements, document acceptance, semantic meaning, array order, or
validation. Normalized output may have different bytes and object-key order
than existing output. Consumers must continue to accept every conforming YAML
spelling allowed by Section 15.

Double-quoting protocol-version strings and YAML 1.1-ambiguous strings improves
portability. The serializer must nevertheless preserve the typed input value;
it must not infer that an already-parsed timestamp or number was intended to
be a string.

## Migration

No document migration is required. Producers may adopt normalized output
without changing their input acceptance. A rollout can reformat first-party
MCP Description examples, inline YAML, and fixtures as a separate mechanical
change after the profile and serializer are agreed. Companion documentation
and website repositories can adopt the same profile by reference.

## Security and privacy considerations

No security behavior changes. The profile retains the safe parsing and
restricted YAML requirements in Section 15. Normalizers must not instantiate
tagged objects, resolve aliases, execute constructors, or silently change
values. Examples and tests should ensure scalar quoting does not turn strings
into executable or application-specific YAML types.

## Alternatives considered

- **Rely on serializer defaults:** rejected because defaults vary across
  implementations and have already produced inconsistent quoting and
  indentation.
- **Quote every string:** rejected as needlessly verbose and less readable
  than quoting only when needed for type safety and portability.
- **Use YAML Core schema for input parsing:** rejected for this proposal
  because it would change the established YAML 1.2.2 JSON-schema resolution
  contract rather than merely define output presentation.
- **Treat formatting as document validity:** rejected because YAML presentation
  does not alter the decoded MCP Description data model.
- **Define cryptographic canonical YAML:** deferred; it would require a
  stronger byte-level contract than is needed for readable, consistent
  examples and normalized output.

## Open questions

- Which exact YAML 1.1-compatible scalar spellings must be quoted, and should
  the profile enumerate them or define a resolution-based test?
- Should scalar wrapping be disabled, or should the profile specify a
  deterministic line width and wrapping algorithm?
- Which multiline strings should use literal blocks, and which edge cases
  require double-quoted escapes?
- Should normalized document ordering be required whenever normalization is
  requested, or should it remain an independently selectable Section 18
  profile?
- Which first-party repository files beyond MCP Description examples should
  follow the same quoting and indentation rules, given that validation
  registries and tool configuration may have their own ordering semantics?

## Implementation and validation plan

1. Review and resolve the open questions in this issue and proposal.
2. Extend Section 15 and, if appropriate, Section 18 with the agreed profile,
   leaving input parsing and validity unchanged.
3. Implement the profile once in `@mcpdesc/core`; keep `mcpcontract` and other
   consumers as thin callers of that serializer.
4. Add fixtures and tests covering:
   - value-preserving YAML parse/serialize round trips;
   - YAML 1.1-ambiguous values and keys, including protocol versions;
   - actual non-string scalar types, empty strings, and significant empty
     collections;
   - multiline values with zero, one, and multiple trailing newlines;
   - ordering and preservation of arrays, named maps, and opaque values;
   - deterministic output and normalization idempotence.
5. Reformat first-party YAML examples, inline examples, fixtures, and tests in
   a separate reviewable pass, verifying that their parsed values and expected
   validation outcomes do not change.
6. Update documentation maintained outside this repository by referencing
   the agreed upstream profile rather than duplicating divergent rules.

## Decision record

Pending review.
