# Proposal 0033: Complete Validation Catalog

- Status: Review
- Author(s): @ObjectIsAdvantag
- Created: 2026-10-30
- Target version: 0.9.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/96,
  https://github.com/mcpdesc/mcpdesc-specification/issues/93
- Depends on: [Proposal 0024](0024-validation-rule-identity-and-provenance.md)
  (rule identity), [Proposal 0030](0030-readable-and-complete-rule-records.md)
  (rule records and catalogs); related to
  [Proposal 0031](https://github.com/mcpdesc/mcpdesc-specification/pull/94)
  (rule-level results)
- AI assistance disclosure: Drafted with GitHub Copilot (Claude Opus 5.5) from
  the maintainer decisions on issue #96; requires normal maintainer and
  community review.

## Summary

Make the validation catalog account for every requirement it can check and
say which requirements it cannot. Rules declare the locations of the canonical
MCP Description schema they own, so every document-schema failure is reported
under a specific rule instead of a catch-all. Every normative obligation in the
specification carries a requirement anchor that a rule cites or that a new
registry of unchecked requirements lists with a reason. The repository tests
report the resulting coverage.

## Problem

Draft 3 reports "100 of 100 requirement anchors cited by a rule", but that
counts only anchors someone placed. About 400 obligation sentences use MUST,
SHALL, SHOULD, REQUIRED, or RECOMMENDED, and about 80 carry an anchor. Most of
the others are enforced silently by the canonical document schema: of 245
document-schema failures in the Draft 3 fixtures, 221 fall back to the
catch-all `mcpdesc.document.schema`, so a reader learns that the document is
invalid but not which requirement it breaks. Requirements that validation
cannot check, such as how a client treats untrusted annotations, are not
distinguished from requirements nobody has mapped yet.

## Goals

- Every document-schema location belongs to exactly one rule, published in
  the catalog, so any validator can attribute failures the same way.
- Every normative obligation is either checked by a rule or recorded as
  unchecked with a reason.
- Coverage is measured by the tests, not asserted.
- Rules stay at the level of requirements: a few dozen object-level rules,
  not one per schema keyword. Finer reporting remains implementation detail.

## Non-goals

- Changing which documents are valid.
- Changing normative wording beyond adding requirement anchors.
- New semantic checks.
- Rule-level results and producer diagnostic codes, which Proposal 0031
  covers.

## Proposed normative behavior

### 1. Schema ownership

A rule record MAY contain `documentSchema`, a non-empty list of JSON Pointer
fragments into the canonical MCP Description schema of the catalog's version,
for example `#/$defs/tool` or `#/$defs/resource/properties/size`. A
document-schema failure belongs to the rule owning the longest listed pointer
that contains the failing schema location. The catalog lists each pointer at
most once, and the root `#` and every `$defs` entry are owned.

The rule-format schema of the rule records is closed, so the new field would
require a major rule-format version under the compatibility policy. Because
no later format has shipped and Draft 4 catalogs are the first to use the new
fields, the format becomes `1.2.0`, recorded as a versioning exception in the
rule-format changelog.

### 2. Failed alternatives

When a value fails a `oneOf` or `anyOf`, schema validators usually report the
failures of every alternative. A validator SHOULD attribute failures in the
alternative that best matches the value to the owners of their own locations,
and failures in the other alternatives to the owner of the location offering
the alternatives. Which alternative matches best is implementation-defined.
The candidate validator chooses the alternative whose failures reach deepest
into the value, then the one with the fewest failures, then the first.

For example, a Tool example whose content block has an unknown annotation
fails both the Reference Object alternative and the inline example
alternative. The annotation failure is reported under
`mcp.annotations.members`; the Reference Object failures are reported under
`mcpdesc.example.members`, which owns the example map.

### 3. Requirement classification

Every sentence stating an obligation (MUST, MUST NOT, SHALL, SHALL NOT,
SHOULD, SHOULD NOT, REQUIRED, RECOMMENDED, NOT RECOMMENDED) starts with a
requirement anchor `<a id="req-…"></a>` or follows one in the same paragraph,
list item, or table row; an anchor therefore covers the sentences after it up
to the next anchor. Key words quoted as words, as in the RFC 2119
boilerplate, state no obligation. Every anchor is either:

- cited by a rule's `specification` locations; or
- listed in `validation/unchecked-requirements.yaml` with a `reason` and a
  `note`:
  - `runtime`: behavior of MCP clients, servers, or consumers;
  - `processing`: behavior of MCP Description tools that document fixtures
    cannot show, such as preservation, merge, or network access;
  - `guidance`: an authoring choice the document cannot decide.

An anchor is never both. The catalog publishes the list as
`uncheckedRequirements`, so consumers see what validation does not cover.

Operation requirements are cited by rules when operation fixtures show them.
Besides native projection cases, a rule may cite a file under
`serialization-fixtures/`, whole and with the empty pointer: its outcome is
`passes` when decoding accepts the file and `error` when decoding rejects it.
The new rule `mcpdesc.serialization.conforming` cites them for the JSON and
restricted YAML requirements of Section 15.

### 4. Coverage reporting

`scripts/test-validation-rules.mjs` fails when a canonical schema definition
has no owner, a pointer is owned twice or does not resolve, an anchor is
neither cited nor listed, or an obligation sentence has no anchor. It reports the owned schema locations, the share of document-schema
failures attributed below the document root, the rules with error or warning
evidence, and the anchored obligations.

### 5. Ownership groups

Existing rules keep their identifiers and gain the locations they already
covered by special cases, for example annotations, capabilities, `_meta`
keys, `size`, and `ttlMs`. New rules own the remaining definitions:

| Rule | Owns |
| --- | --- |
| `mcpdesc.info.members` | Info, Contact, License |
| `mcpdesc.protocol-versions.values` | protocol version scopes |
| `mcpdesc.transport.members` | Transport |
| `mcpdesc.security-scheme.members` | security scheme map, schemes, OAuth flows |
| `mcpdesc.tool.members` | Tool, Execution |
| `mcpdesc.resource.members` | Resource, Resource Template |
| `mcpdesc.prompt.members` | Prompt, Prompt Argument |
| `mcpdesc.tag.members` | Tag |
| `mcpdesc.components.members` | Components, Reference Object, inline-or-reference values |
| `mcpdesc.example.members` | example maps and example objects of every primitive and completion |
| `mcpdesc.tool.interaction.members` | interaction examples and steps |
| `mcpdesc.elicitation.members` | Elicitation Declaration |
| `mcp.icon.members` | Icon |
| `mcp.example-result.members` | completed example results |
| `mcp.content.members` | content blocks and resource contents |
| `mcp.interaction-message.members` | elicitation, sampling, and roots messages |
| `mcp.elicitation.form-schema.members` | form-mode `requestedSchema` |

`mcpdesc.document.schema` keeps its identifier and now owns the document root
and generic JSON values only.

### 6. Phasing

The 0.9.0 working draft owns every schema location and classifies every
section in one draft. Sections 3, 7, 9, and 12, which hold the example
results and content, security, Tool, and elicitation requirements that
produced most catch-all failures, were classified first.

## Schema impact

None for MCP Description documents. The rule format becomes `1.2.0`: rule
records gain `documentSchema`, the catalog gains `uncheckedRequirements`,
fixture citations may name serialization fixtures, and
`$defs/unchecked-requirements` validates the new registry file.

## Compatibility

- Documents: no change in validity or diagnostics other than the `rule` of
  document-schema failures, which now names a specific rule.
- Rule-catalog consumers: adopt rule format `1.2.0`; `documentSchema` and
  `uncheckedRequirements` are new.
- Validators: attribute document-schema failures from the catalog's
  ownership. The exported validator snapshot carries the ownership map in its
  runtime, so `@mcpdesc/core` needs no registry access.
- Version conversion profile: any target error at or next to a blocker
  location is a consequence of that blocker, whatever its rule; before, only
  `mcpdesc.document.schema` errors were.

## Security and privacy considerations

None.

## Alternatives considered

1. **Attribution in validator code.** No format change, but other validators
   could not reproduce it.
2. **Annotations in the canonical schema.** Changes schema bytes, couples the
   schema to the catalog, and needs strict validators to allow the keyword.
3. **One rule per schema keyword.** Hundreds of rules that restate the schema
   without adding information for authors.
4. **A sentence inventory file.** Hard to keep in step with edited sections;
   anchors move with the text.
5. **Attributing every failure inside alternatives to the owner of the
   alternatives.** Simple, but hides specific rules, for example a content
   block failure inside a Tool example.

## Open questions

None.

## Implementation and validation plan

- Rule format `1.2.0`, ownership on every rule record, the new rules, the
  unchecked registry, anchors in the classified sections, coverage checks,
  and fixtures for rules without failure evidence.
- `@mcpdesc/core` attributes document-schema failures from the ownership map
  at its intake of the draft that includes this proposal.
- The website imports rule format `1.2.0` and shows unchecked requirements.

## Decision record

- 2026-10-30: Maintainer approved schema ownership in rule records, object-level
  rules, attribution of failed alternatives to their container, the anchor
  plus unchecked-registry classification, and this proposal (issue #96).
- 2026-10-31: Maintainer chose rule format `1.2.0` over `2.0.0` and the
  classification of every section in the same draft.
