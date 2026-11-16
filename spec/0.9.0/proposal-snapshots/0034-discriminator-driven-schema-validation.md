# Proposal 0034: Discriminator-Driven Schema Validation

- Status: Review
- Author(s): @ObjectIsAdvantag, with AI assistance using Copilot SDK in VS Code
- Created: 2026-11-06
- Target version: 0.9.0, candidate for RC.2
- Related issues: [#112](https://github.com/mcpdesc/mcpdesc-specification/issues/112)

## Summary

Replace selected `oneOf` object unions with standard JSON Schema 2020-12
discriminator-driven conditionals. Preserve document acceptance while avoiding
validation failures from alternatives that do not apply. This is a review-stage
proposal, not an accepted decision or authorization to publish RC.2.

## Problem

The downstream mcptoolkit-editor v2.3.0 report in issue #112 shows ten schema
findings for a stdio transport that spells `args` as `arg`. Most findings explain
why unrelated HTTP and SSE alternatives do not match. Deduplication cannot
remove those distinct but unhelpful failures. Consumers should not have to infer
which transport shape the author selected when `type` already says `stdio`.

## Goals

- Preserve the accepted and rejected instances of every affected union.
- Encode unambiguous alternative selection in the canonical schema.
- Preserve independent failures, document locations, rule identities, and
  rule-result accounting.
- Support AJV runtime and generated standalone/browser validation without
  runtime compilation in CSP-restricted consumers.

## Non-goals

- Rewrite nondiscriminated or ambiguous unions.
- Change runtime MCP behavior, document ordering, or extension policy.
- Standardize error counts, messages, or actionable/supporting diagnostic fields.
- Modify published RC.1 or stable artifacts, or publish a validator package here.

## Background and primary references

- [JSON Schema 2020-12 Core, conditional applicators](https://json-schema.org/draft/2020-12/json-schema-core#section-10.2.2).
- [JSON Schema 2020-12 Validation, object constraints](https://json-schema.org/draft/2020-12/json-schema-validation#section-6.5).
- MCP Description Sections 6, 7, 9.4, 12, and 16.5.
- The downstream validator uses AJV 8 with ajv-formats for document validation,
  and AJV-generated validators for browser/standalone entry points. Its
  cfworker adapter handles embedded schemas, not transport selection.

## Proposed normative behavior

Document conformance is unchanged: each affected value remains an object with
the already-required discriminator and exactly its existing type-specific
constraints. Recognized discriminator values select one alternative; a missing,
unknown, null, or incorrectly typed discriminator is invalid.

Section 16.5 explains the schema design and distinguishes specific failures
from redundant conditional summaries without adding a diagnostic-format
requirement. Schema-only implementations may expose raw engine errors.
Candidate repository validation omits an AJV `if` summary only when a specific
failure is demonstrably reachable from that conditional's `then` at the same
instance or below. It retains all independent specific failures. This is a
producer policy, not a new cross-validator reporting contract.

## Schema impact

The scope is limited to these definitions:

| Definition | Discriminator | Alternatives |
|---|---|---|
| `transport` | `type` | `streamable-http`, `stdio`, `sse` |
| `securityScheme` | `type` | `http`, `apiKey`, `oauth2`, `openIdConnect` |
| `toolInteractionStep` | `type` | elicitation, sampling, roots |
| `elicitationInteractionRequest` | `mode` | form, URL |
| `elicitationInteractionResponse` | `action` | accept, decline/cancel |
| `elicitationDeclaration` | `mode` | form, URL |
| `toolResultContent` | `type` | text, image/audio, resource, resource_link |
| `samplingContentBlock` | `type` | existing result content, tool_use, tool_result |

Each union explicitly declares `type: "object"`, requires its discriminator,
and constrains it by `enum`. Each `allOf` entry has an `if` that checks object
type, discriminator presence, and its `const` or `enum`, followed by the
unchanged alternative in `then`. Existing parent constraints are retained.
The `samplingContentBlock` condition for existing result content uses that
nested union's complete discriminator set and references its definition;
flattening or duplicating the content schemas is unnecessary.

The union-level object constraint is essential: `properties` and `required`
alone do not reject non-objects. The object guard inside each `if` avoids
running every `then` for a non-object. Discriminator sets must be disjoint and
their union must equal the parent enum.

Keep branch-local closure, extension patterns, required properties, references,
and value constraints unchanged. In `elicitationDeclaration`, closure remains
on its existing parent, not on the partial alternatives. Update the Resource
`size` rule's pointer to the relocated resource-link alternative without
changing its rule ID.

Leave `elicitationFormProperty`, reference-versus-inline unions,
JSON-value-type unions, and `resourceContents` unchanged. The `oauthFlows`
`anyOf` is an at-least-one rule and is also unchanged.

## Examples

```yaml
transports:
  - type: stdio
    command: chess-rating
    arg: [serve]
```

The selected stdio alternative reports the unexpected `arg`. AJV may also
report a generic failed-`then` summary; the candidate producer omits that
redundant summary. With `command: 5` and `arg`, both specific defects remain.
Missing or unsupported `type` fails the parent constraint. A valid stdio
transport with an `x-vendor` extension remains valid; a content block that
previously rejected such extensions still rejects them.

## Compatibility

Intended document compatibility is exact equivalence with RC.1 for these
unions, including non-objects, unknown discriminators, extension values,
nested errors, and multiple entries. Existing constraints elsewhere remain.

Classification: potentially breaking for diagnostic consumers. Keyword paths,
counts, union summaries, and rule-catalog locations change. Rule IDs, result
format, and document fields do not change. Editor completion quality for
conditionals needs downstream testing; this proposal makes no claim of
identical JSON/YAML language-server behavior.

## Migration

No document rewrite is intended. Consumers should not bind to raw schema
paths, diagnostic ordering, or counts across selectors. Published RC.1 remains
immutable; an approved new candidate gets its own schema identity and exact
validator selector through normal release preparation. Core adopts that
selector and verifies selector-sensitive operations instead of reimplementing
branch selection. No RC.2 identity is assigned by this implementation.

## Security and privacy considerations

The design uses only standard local schema applicators, with no network
resolution or new document data. Preserving closure and extension policies
avoids accidentally accepting unsupported fields. Retaining independent
failures avoids hiding defects behind diagnostic cleanup. Standalone
execution must not depend on dynamic code generation under strict CSP.

## Alternatives considered

- Editor deduplication: does not remove unrelated, distinct failures.
- Editor branch prioritization: duplicates schema semantics in every consumer.
- Validator branch inference: adds heuristic selection despite explicit tags.
- Nested `if`/`else`: creates chained summaries and poorer unknown-tag errors.
- AJV/OpenAPI `discriminator`: nonstandard and ignored by other schema engines.
- Validation-result schema evolution: unnecessary; interoperability vocabulary
  for actionable/supporting findings belongs in a separate proposal.

## Open questions

- Downstream JSON/YAML editor completion and hover behavior under conditionals.
- Final maintainer decision on inclusion in RC.2 after community review and
  selector-specific downstream integration tests.

## Implementation and validation plan

1. Implement on a feature branch based on the document-ordering work.
2. Compare candidate schemas against an inverse reconstruction of the original
   unions, checking that the reconstructed baseline equals the pinned RC.1
   schema. Keep generated schema transformations out of production validation.
3. Generate valid instances for every alternative and test field deletion,
   mutation, discriminator errors, closure, extensions, nested values, and
   combinatorial transport cases; include non-object values at every union.
4. Compare runtime and generated standalone validators, both all-errors and
   first-error execution, and execute standalone code with dynamic compilation
   disabled. Check raw wrapper behavior and candidate normalized diagnostics.
5. Add persistent valid/invalid fixtures and rule citations, verify rule
   results, and compare the entire draft document corpus for schema acceptance.
6. Synchronize prose, schema, catalog pointers, fixtures, changelog, migration
   guidance, and repository test/validator-export checks. Run `npm test`.
7. Publish the proposal PR only if the evidence supports the design, then
   capture its exact public commit and digest in the active draft manifest.
   Publication of a prerelease remains a separate maintainer decision.

## Decision record

No acceptance decision yet. The maintainer authorized implementation for
evaluation in issue #112. Review-stage implementation remains subject to
incompatible change or removal. AI assistance: Copilot SDK in VS Code assisted
with issue/proposal drafting, implementation, and validation; human maintainers
remain accountable for review and acceptance.
