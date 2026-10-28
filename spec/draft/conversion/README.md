# Version Conversion

This directory defines the conversion of MCP Description documents from the
previous version to this one ([Proposal 0028](../proposal-snapshots/0028-version-conversion.md)).
Conversion is a **non-normative tooling profile**: document validity,
validator conformance, and native projection do not depend on it, and a
converted document is judged only by validating it against this version.
`@mcpdesc/core` contains the reference implementation.

## Guarantees

A tool that claims the profile for a version pair, such as "MCP Description
conversion 0.8.0 to 0.9.0", guarantees that:

- an automatic rewrite never changes meaning;
- an incompatibility is reported as a blocker, never resolved silently;
- a fix is applied only when the author requests it, and never moves a value
  into `_meta` or an `x-*` property.

A tool that does not claim the profile is responsible for its own output.

## Operation

Conversion takes a document, its source version, and the target version:

1. If no conversion is defined for the pair, stop with status `unsupported`
   and `conversion-path-undefined`.
2. Validate the source with the source selector (`sourceSelector`). On any
   error, stop with status `invalid-source` and `conversion-source-invalid`.
3. Apply the automatic `rewrites`.
4. Apply the fixes the author requested, in order. A request that matches no
   blocker at its path, or whose edit is not possible, produces
   `conversion-fix-not-applicable`.
5. Validate the result against the target version. Each error whose rule a
   conversion rule lists in `targetRules` becomes a `conversion-blocked`
   diagnostic with that conversion rule and the error's path. A generic schema
   error (`mcpdesc.document.schema`) reported at or next to a blocker location,
   such as the other alternatives of a `oneOf`, is a consequence of that
   blocker. Any other error is an undeclared incompatibility: a defect in
   this profile.
6. Return status `converted` with the converted document and an RFC 6902
   patch when no error remains; otherwise return status `blocked` with the
   diagnostics and no document. Target warnings are returned unchanged.

Semantic validation runs only when the document is structurally valid, so
semantic blockers such as a malformed `uriTemplate` appear once structural
blockers are fixed.

The patch contains the rewrites, then the requested fixes, and nothing else.
Applying it to the source gives the converted document; editors apply it to
their source text to keep YAML comments and key order.

Native projection never converts implicitly. To project a document of an
earlier version, convert it, then project the converted document.

## Files

| Path | Content |
| --- | --- |
| [`0.8.0-to-0.9.0.json`](0.8.0-to-0.9.0.json) | Rewrites, conversion rules, and fixes from 0.8.0 |
| [`schema/conversion-rules.schema.json`](schema/conversion-rules.schema.json) | Format of a conversion rules file |
| [`schema/conversion-case.schema.json`](schema/conversion-case.schema.json) | Format of a conversion case |
| `fixtures/*.json` | Conversion cases |
| `fixtures/documents/` | Source documents written for conversion cases |

A case names its source `document` by a path relative to the case file, or
inline. Cases that convert released documents point at them under
`spec/<version>/`; validator snapshots bundle those documents under
`fixtures/released/<version>/` and rewrite the paths. A converted case pins the
exact `expectedPatch`; any other case pins the exact set of error
`expectedDiagnostics` (`code`, `rule`, `path`).

`scripts/test-conversion-fixtures.mjs` recomputes every case, fails on an
undeclared incompatibility, and requires a case for every released example
and valid or warning fixture of the source version, every conversion rule,
fix, and diagnostic code, and a YAML source.

## Diagnostics

| Code | Rule | Meaning |
| --- | --- | --- |
| `conversion-path-undefined` | `mcpdesc.conversion.path-defined` | No conversion is defined for the pair |
| `conversion-source-invalid` | `mcpdesc.conversion.source-valid` | The source is not valid for its version |
| `conversion-blocked` | the conversion rule | A declared incompatibility applies |
| `conversion-fix-not-applicable` | `mcpdesc.conversion.fix-applicable` | A requested fix matches no blocker, or its edit is not possible |
