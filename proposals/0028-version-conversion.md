# Proposal 0028: Version Conversion

- Status: Draft
- Author(s): @ObjectIsAdvantag
- Created: 2026-10-27
- Target version: 0.9.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/82,
  https://github.com/mcpdesc/mcpdesc-specification/issues/72
- Depends on: [Proposal 0024](0024-validation-rule-identity-and-provenance.md)
  (rule identity and diagnostics),
  [Proposal 0025](0025-native-mcp-projection.md) (native MCP projection)
- AI assistance disclosure: Drafted with GitHub Copilot (Claude Opus 5.5) from
  a maintainer-led evaluation recorded on issue #82; requires normal maintainer
  and community review.

## Summary

Define a conversion from an MCP Description document of one version to an
equivalent document of the next version. A conversion either produces a
document with the same meaning or reports, rule by rule and path by path, what
prevents it. It never changes meaning on its own. Changes that alter meaning
are fixes the author requests explicitly.

Conversion lets native MCP projection (Proposal 0025) stay defined for one
version. A document of an earlier version is converted first, then projected.
The same operation gives the mcpcontract CLI and the mcpdesc live editor a
migration command that reports exact blockers instead of pointing at a guide.

This repository owns the conversion rules and conversion fixtures.
`@mcpdesc/core` contains the single implementation.

## Problem

Native MCP projection is defined for MCP Description 0.9.0. `@mcpdesc/core`
exposes it only for the explicit `0.9.0-draft.1` selector. Documents of the
current stable version, 0.8.0, cannot be projected natively.

A separate native projection for 0.8.0 would not work well:

- 0.8.0 accepts values that no MCP type can carry: additional properties in
  Tool Annotations and Resource Annotations, and unknown client capability
  requirements. MCP's corresponding types are closed (Proposal 0027). A 0.8.0
  projection would have to reject those documents or drop the values, and
  Proposal 0025 does not allow projection to rewrite a value.
- 0.8.0 is frozen. A second projection contract would need its own rules,
  fixtures, and code, and every later version would raise the same question.

Migration from 0.8.0 to 0.9.0 is described by a guide. Each tool interprets
the guide independently, and nothing checks that the guide lists every
incompatibility.

Issue #82 records a measurement at `v0.9.0-draft.1`: of the 45 valid 0.8.0
documents in this repository, 43 are valid 0.9.0 documents after changing only
`mcpdesc` and `$schema`. The two others fail on the closed types of Proposal
0027.

## Goals

- Define conversion between adjacent MCP Description versions, starting with
  0.8.0 to 0.9.0.
- Guarantee that an automatic conversion preserves meaning.
- Report every blocker with a conversion rule, a path, and the target
  diagnostic that caused it.
- Offer named, opt-in fixes for blockers that have an unambiguous remedy.
- Return a minimal edit set so editors keep YAML comments and key order.
- Define native projection of earlier-version documents as conversion followed
  by projection.
- Detect, through fixtures, any incompatibility between two versions that no
  conversion rule declares.

## Non-goals

- Conversion to an earlier version (downgrade).
- Conversion of invalid source documents or repair of source errors.
- Rewriting a document into a preferred style, for example merging variants
  that were split only because 0.8.0 required it. Such changes are optional
  author edits, not conversion.
- Conversion from 0.7.0 to 0.8.0 in this proposal. The chaining model admits
  it later (open question 3).
- Any change to the 0.9.0 schema or to document validity.

## Background and primary references

Changes between the 0.8.0 and 0.9.0-draft.1 schemas (`npm run schema:diff`),
besides `$id` and the `mcpdesc` constant:

| Definition | 0.8.0 | 0.9.0-draft.1 | Effect on valid 0.8.0 documents |
| --- | --- | --- | --- |
| `toolAnnotations` | open | closed | Blocker when unknown properties are present |
| `resourceAnnotations` | open | closed | Blocker when unknown properties are present |
| `clientCapabilityRequirements` | unknown members allowed | closed | Blocker when unknown members are present |
| `completionResult` | open | closed | Blocker when extra fields are present |
| Sampling, elicitation, and roots step responses | closed | open, with `_meta` | None (more permissive) |
| `rootDeclaration` | no `_meta` | `_meta` | None (more permissive) |

Semantic changes (Proposals 0024 and 0026, validator corrections in the 0.9.0
changelog):

| Change | Effect on valid 0.8.0 documents |
| --- | --- |
| Every Resource Template `uriTemplate` is checked against RFC 6570 | Blocker when a template without examples is malformed |
| Declared Tool-schema dialects fixed to 2020-12 and draft-07 | None under the reference validator, which already enforced this set |
| Fields an open result type allows but a revision does not define become warnings | None (errors became warnings) |
| Result `_meta` accepted in all revisions; root `_meta` from MCP 2025-06-18 | None (more permissive) |
| Diagnostics gain `rule`; numeric array indices in paths | None (validator output, not documents) |

## Proposed normative behavior

### 1. Definition

Conversion `C(D, S, T)` takes a document `D`, its source version `S`, and a
target version `T`, where `T` is the version that directly follows `S`. It
produces a result with a `status`, a list of diagnostics, and, when the status
is `converted`, the converted document and a patch.

A conforming implementation MUST:

1. validate `D` against `S`, and stop with status `invalid-source` and the
   diagnostic `conversion-source-invalid` if validation reports an error;
2. apply the automatic rewrites of the `S` to `T` conversion table;
3. apply the fixes the caller requested, and no others;
4. validate the rewritten document against `T`;
5. report each error of step 4 as a blocker (Section 4) or, if no conversion
   rule matches it, as `conversion-incompatibility-undeclared`;
6. return status `converted` with the document and patch only if step 4
   reports no error; otherwise return status `blocked` with no document.

Warnings of step 4 are returned unchanged, with their own codes and rules.

### 2. Automatic rewrites

An automatic rewrite MUST NOT change the meaning of the document under `T`
compared with its meaning under `S`. For 0.8.0 to 0.9.0 the automatic rewrites
are:

| Location | Rewrite |
| --- | --- |
| `/mcpdesc` | `"0.8.0"` becomes `"0.9.0"` |
| `/$schema`, when present | Becomes the schema identifier of `T`, for example `https://mcpdesc.org/schema/mcp-description/0.9.0-draft.1.json` |

Nothing else changes automatically. Key order and every other value are kept.

### 3. Conversion rules

Each incompatibility between `S` and `T` that can make a valid `S` document
invalid under `T` is a conversion rule. A conversion rule names the target
rules (Proposal 0024) whose errors it explains and the fixes that remedy them.
The 0.8.0 to 0.9.0 rules:

| Conversion rule | Target rules explained | Fixes |
| --- | --- | --- |
| `mcpdesc.conversion.0-8-to-0-9.tool-annotations-closed` | `mcp.tool-annotations.members` | `remove-property` |
| `mcpdesc.conversion.0-8-to-0-9.annotations-closed` | `mcp.annotations.members` | `remove-property` |
| `mcpdesc.conversion.0-8-to-0-9.client-requirements-closed` | `mcp.client-capabilities.members` | `remove-property`, `move-to-experimental` |
| `mcpdesc.conversion.0-8-to-0-9.completion-result-closed` | `mcp.completion.result-closed` | `remove-property` |
| `mcpdesc.conversion.0-8-to-0-9.uri-template-checked` | `mcp.resource-template.uri-template` | none |

The rule identifiers in the second column are those of the 0.9.0-draft.1 rule
registry and are revised with it.

### 4. Blockers

A blocker is an error diagnostic in the form of Proposal 0024, with:

- `code`: `conversion-blocked`;
- `rule`: the conversion rule;
- `path`: the path of the target diagnostic;
- `cause`: the target diagnostic (`code`, `rule`, `message`, `path`);
- `fixes`: the identifiers of the fixes available for this blocker, possibly
  empty.

### 5. Fixes

A fix is a named edit that remedies one blocker. An implementation MUST apply
a fix only when the caller requests it, by fix identifier and path, or by fix
identifier for every matching blocker. A fix changes meaning, so a request is
the author's decision.

| Fix | Edit |
| --- | --- |
| `remove-property` | Removes the member at the blocker path |
| `move-to-experimental` | Moves client requirement `<name>` to `experimental.<name>`; blocked if `experimental.<name>` exists |

A fix MUST NOT move a value into `_meta` or into an `x-*` property. Such
moves give a value a new meaning, and only the author can choose one.

### 6. Patch

A converted result includes an RFC 6902 JSON Patch that turns `D` into the
converted document. The patch contains the automatic rewrites and the
requested fixes, in that order, and nothing else. Applying it to `D` MUST give
the converted document. Editors apply the patch to their source text, which
keeps comments and key order in YAML documents.

### 7. Chaining

Conversion is defined between adjacent versions only. Conversion across
several versions is the composition of adjacent conversions; it stops at the
first conversion that does not return `converted`. Fixes are requested per
step.

### 8. Native projection of earlier versions

For a document `D` of an earlier version, native projection to MCP revision
`V` is `N_V(C*(D))`, where `C*` chains conversions to the version that defines
native projection. A projection is possible only if every conversion returns
`converted` without fixes. An implementation that offers this MUST report the
conversion (source version, target version, converter version) with the
projected value, and MUST report conversion blockers rather than projection
errors when conversion fails.

### 9. Diagnostics

| Code | Rule | Meaning |
| --- | --- | --- |
| `conversion-source-invalid` | `mcpdesc.conversion.source-valid` | `D` is not valid for `S` |
| `conversion-path-undefined` | `mcpdesc.conversion.path-defined` | No chain of conversions leads from `S` to `T` |
| `conversion-blocked` | the conversion rule | A declared incompatibility applies |
| `conversion-incompatibility-undeclared` | `mcpdesc.conversion.declared` | A target error no conversion rule explains; a defect in this specification |
| `conversion-fix-not-applicable` | `mcpdesc.conversion.fix-applicable` | A requested fix does not match a blocker, or its edit is blocked |

## Schema impact

None. Conversion does not change the 0.9.0 document schema. The conversion
fixture format (below) is published as a JSON Schema, as for projection.

## Examples

Source (0.8.0, abbreviated):

```json
{
  "mcpdesc": "0.8.0",
  "tools": [
    {
      "name": "inspect",
      "inputSchema": { "type": "object" },
      "annotations": { "readOnlyHint": true, "futureToolHint": "preserved" }
    }
  ]
}
```

Without fixes, the result is blocked:

```json
{
  "status": "blocked",
  "diagnostics": [
    {
      "code": "conversion-blocked",
      "severity": "error",
      "message": "Tool Annotations are closed in 0.9.0; property futureToolHint is not defined by MCP",
      "path": ["tools", 0, "annotations", "futureToolHint"],
      "rule": "mcpdesc.conversion.0-8-to-0-9.tool-annotations-closed",
      "cause": {
        "code": "schema-validation",
        "rule": "mcp.tool-annotations.members",
        "path": ["tools", 0, "annotations"]
      },
      "fixes": ["remove-property"]
    }
  ]
}
```

With `remove-property` requested at that path, the result is converted, with
this patch:

```json
[
  { "op": "replace", "path": "/mcpdesc", "value": "0.9.0" },
  { "op": "remove", "path": "/tools/0/annotations/futureToolHint" }
]
```

## Conversion fixtures

Conversion fixtures live in `spec/<version>/conversion-fixtures/`, in the
target version, one JSON file per case:

```json
{
  "description": "Unknown Tool Annotation property blocks conversion.",
  "document": "../../0.8.0/fixtures/expected-valid/distinct-tool-and-resource-annotations.json",
  "from": "0.8.0",
  "to": "0.9.0",
  "expectedBlockers": [
    {
      "rule": "mcpdesc.conversion.0-8-to-0-9.tool-annotations-closed",
      "path": ["tools", 0, "annotations", "futureToolHint"]
    },
    {
      "rule": "mcpdesc.conversion.0-8-to-0-9.annotations-closed",
      "path": ["resources", 0, "annotations", "futureResourceHint"]
    }
  ]
}
```

A case has either `expected`, the exact converted document, or
`expectedBlockers`; it may list `fixes` to request and then gives `expected`
and `expectedPatch`. Comparison is by canonical JSON.

The fixtures cover at least: every valid 0.8.0 example and fixture of this
repository; each conversion rule; each fix, including a blocked
`move-to-experimental`; each diagnostic code except
`conversion-incompatibility-undeclared`; and a YAML source.

## Validation of the fixtures in this repository

This repository contains no conversion code. A test script checks that:

- every case is valid against the case schema;
- every source document is valid for its version;
- every `expected` document is valid for its version and equals the source
  after the automatic rewrites and requested fixes, which the test computes
  from the tables above;
- for every `expectedBlockers` case, the target validator reports, on the
  source after the automatic rewrites, exactly the errors that the listed
  conversion rules explain.

The third check uses the target validator from this repository. A target
error that matches no conversion rule fails the test, so an undeclared
incompatibility cannot be released.

## Compatibility

Additive. No document changes validity. The migration guide remains and points
to conversion as the reference procedure.

## Migration

None required. The 0.8.0 to 0.9.0 migration guide gains a section that maps
each of its steps to a conversion rule or fix.

## Security and privacy considerations

Conversion processes untrusted documents. It MUST NOT dereference URIs or
fetch remote resources, and it is subject to the same size and depth limits as
validation. Fixes remove or move values; implementations SHOULD show the
author the patch before writing it, since removing an annotation can remove a
hint that the author relied on.

## Alternatives considered

- **A native projection for each version.** Rejected: 0.8.0 allows values MCP
  types cannot carry, and each version would need its own contract.
- **Validate as the target version and project if valid.** Works in practice
  for most documents, but validity does not prove equal meaning, and it gives
  authors no remedy when it fails. Conversion includes this check (step 4) and
  adds declared equivalence and fixes.
- **Lossy projection that drops values MCP types cannot carry.** Rejected:
  silent loss, and contrary to Proposal 0025.
- **Prose migration guide only.** Kept as documentation; insufficient as a
  contract for tools.

## Open questions

1. Which 0.8.0 validator selector does the precondition use: `0.8.0` or the
   current revision `0.8.0-rev.20261021`? The revision corrects defects, so
   documents valid only under `0.8.0` are rare but possible.
2. Is the target the version (`0.9.0`) or the pinned selector
   (`0.9.0-draft.1`)? During the draft, conversion rules change between
   snapshots.
3. Should 0.7.0 to 0.8.0 conversion be defined? 0.8.0 had larger structural
   changes (root `protocolVersions`, scoped capabilities, named security
   schemes), some of which need author input.
4. Should native projection of an earlier-version document (Section 8) be
   implicit in core, or require two explicit calls?
5. Are conversion rules normative text in the target version, or a
   non-normative tooling profile with fixtures?
6. Resource `size` is `number` in MCP Description 0.9.0 and MCP `schema.ts`,
   but `integer` in the pinned MCP `schema.json`. That affects projection, not
   conversion, and is tracked separately.

## Implementation and validation plan

1. Proposal pull request (this document); iterate with the implementation.
2. `spec/draft/conversion-fixtures/` with the case schema, seeded from the 45
   valid 0.8.0 documents (43 expected conversions, 2 expected blocker sets)
   and per-rule cases.
3. Conversion rule records in the validation rule registry, and a test script
   in `npm test`.
4. Normative section in the 0.9.0 draft, changelog entry, and migration guide
   update.
5. Implementation in `@mcpdesc/core` that passes the fixtures; then CLI and
   live-editor integration.

## Decision record

Pending.
