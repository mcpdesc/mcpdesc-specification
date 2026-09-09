# Proposal 0013: Optional Sections and Non-Empty Collections

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-26
- Last updated: 2026-08-26
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/31
- Related proposals: Proposal 0009, Proposal 0010
- Review period: 2026-08-26 through 2026-09-25

## Summary

Adopt one consistent rule for optional documentation sections and ordinary
declaration collections in MCP Description:

* `mcpdesc`, `info`, and `protocolVersions` remain required;
* optional sections, including `transports`, may be omitted when the document
  makes no declaration for that section;
* omission does not prove that the server lacks the corresponding runtime
  behavior;
* an ordinary declaration array or map must contain at least one entry when
  present; and
* an empty collection remains valid only where the specification assigns
  distinct semantics to emptiness.

The principal semantic exceptions are the Security Requirement Array forms
`security: []` and `security: [{}]`, and empty security scope arrays. Their empty
values are meaningful and must be preserved.

This model follows OpenAPI's support for partial description documents while
intentionally defining a stricter canonical representation for ordinary
collections. It allows authors to describe identity, protocol applicability, or
selected primitives without being required to publish connection details.

## Problem

MCP Description 0.8.0 Draft 1 applies inconsistent cardinality and omission
rules:

* root `transports` is required and must be non-empty;
* `capabilities` and named-example maps are optional but must be non-empty when
  present;
* root primitive arrays and `tags` are optional but may be empty;
* `securitySchemes` may be an empty map;
* serialization guidance allows an empty array or object to be omitted only
  when omission is semantically equivalent; and
* Proposal 0009 requires each component namespace to be non-empty when present
  but does not prohibit an empty outer `components` object.

These differences do not reflect a useful distinction among ordinary
declaration collections. They create multiple representations of the same
absence, complicate projection and merge output, and make it unclear whether an
omitted section describes runtime non-support or merely absent documentation.

The required `transports` field is particularly restrictive. A static
description may legitimately document a server's identity, supported MCP
revisions, or primitives while withholding environment-specific connection
details. Requiring a transport forces the author either to invent information
or not publish the partial description.

A universal prohibition on empty collections would also be incorrect. Security
uses empty arrays and objects to distinguish inheritance, explicit clearing,
and anonymous access. Canonical cardinality must therefore follow semantics,
not syntax alone.

## Goals

* Define which root fields establish the minimum identity of an MCP Description.
* Permit partial descriptions that omit transport and other optional sections.
* Define omission as no declaration rather than runtime non-support.
* Establish one non-empty-when-present rule for ordinary declaration
  collections.
* Preserve collection values whose emptiness has explicit semantics.
* Define transport protocol-coverage validation when `transports` is optional.
* Give projection, merge, and serialization tools a canonical representation
  for absent ordinary collections.
* Align Proposal 0009's outer Components Object with the same rule if that
  proposal is accepted.

## Non-goals

* Make `mcpdesc`, `info`, or `protocolVersions` optional.
* Allow an empty `protocolVersions` array.
* Claim that a partial description is a complete runtime inventory.
* Add a completeness flag or discovery snapshot model.
* Change MCP runtime initialization, capability negotiation, discovery, or
  transport behavior.
* Apply MCP Description collection cardinality to embedded JSON Schemas,
  specification-extension values, or arbitrary literal example payloads.
* Remove or normalize meaningful empty security values.
* Make OpenAPI a normative dependency.

## Background and primary references

* MCP Description 0.8.0 Draft 1 document structure and transport requirements:
  https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/mcp-description.md
* Proposal 0009, Reusable Components and Local References:
  https://github.com/mcpdesc/mcpdesc-specification/pull/27
* Proposal 0010, Support JSON and YAML Serializations:
  https://github.com/mcpdesc/mcpdesc-specification/issues/23
* OpenAPI 3.1.1 OpenAPI Object, Components Object, and Security Requirement
  Object: https://spec.openapis.org/oas/v3.1.1.html
* OpenAPI 3.2.0 OpenAPI Object, Components Object, and Security Requirement
  Object: https://spec.openapis.org/oas/v3.2.0.html

OpenAPI provides established prior art for useful partial API descriptions:
many top-level sections are optional, and omission does not generally assert
that the described API lacks the omitted behavior. OpenAPI also preserves
meaningful empty security forms. OpenAPI permits empty values in several other
structures, however, so this proposal adopts its optionality model without
copying all of its cardinality choices.

## Proposed normative behavior

### 1. Minimum root document

An MCP Description root object MUST contain:

* `mcpdesc`;
* `info`; and
* `protocolVersions`.

`protocolVersions` MUST contain at least one supported MCP protocol revision.

All other root sections are optional unless another accepted proposal
explicitly makes a new root property required. In particular, `transports` is
optional.

### 2. Omission semantics

Omission of an optional section means that the MCP Description makes no
declaration for that section.

Unless a property's definition explicitly states otherwise, omission MUST NOT
be interpreted as proof that the server does not support, expose, or use the
corresponding runtime behavior. This rule applies independently to transports,
security schemes, security requirements, capabilities, primitive collections,
tags, components, and future optional documentation sections.

For example, omission of `transports` means that the document declares no
connection mechanism. It does not mean that the server has no transport.
Omission of `tools` means that the document declares no Tools; it does not prove
that no authorization context or runtime discovery result exposes Tools.

An explicit empty value MUST NOT be used as a substitute for omission unless
the property's definition assigns meaning to that empty value.

### 3. Ordinary declaration collections

An ordinary declaration collection is an MCP Description-defined array or map
whose entries declare documented objects, values, registry members, or reusable
definitions and for which the specification assigns no distinct meaning to an
empty value.

An optional ordinary declaration collection MUST contain at least one entry
when present. If it would contain no entries, a producer MUST omit the property.
A consumer MUST reject a present empty ordinary declaration collection.

In 0.8.0 this rule applies at least to:

* root `transports`;
* root `securitySchemes`;
* root `capabilities`;
* root `tools`, `resources`, `resourceTemplates`, and `prompts`;
* root `tags`;
* named Tool, Resource, and Resource Template example maps; and
* any other collection already specified as non-empty when present.

If Proposal 0009 is accepted, the rule also applies to the outer `components`
object and each component namespace map. A present Components Object MUST
contain at least one present namespace, and every present namespace MUST contain
at least one component. Therefore `components: {}` and a namespace such as
`components: {"schemas": {}}` are invalid.

The rule does not by itself constrain collections inside:

* an embedded JSON Schema;
* a specification-extension value;
* an arbitrary literal input or structured-output example value; or
* protocol-native content represented by an example where the applicable MCP
  revision defines that collection's cardinality.

Those collections follow their own governing specifications and field-level
rules.

### 4. Semantically meaningful empty values

A collection MAY be empty when its property definition assigns a meaning to
emptiness that differs from omission or from a non-empty value.

The following security forms remain valid and distinct:

* omitted `security`: inherit at a nested level, or make no declaration at the
  root;
* `security: []`: explicitly clear inherited mcpdesc security requirements;
* `security: [{}]`: explicitly allow anonymous access as an alternative; and
* an empty scope array in a Security Requirement Object, including the required
  empty array for HTTP and API-key schemes.

Implementations MUST preserve these distinctions and MUST NOT omit, reject, or
normalize such values under the ordinary-collection rule.

Any future semantic-empty exception MUST be stated explicitly in the property's
normative definition. Merely permitting zero entries in JSON Schema is not
sufficient to establish distinct empty semantics.

### 5. Transport protocol coverage

When `transports` is present, it MUST contain at least one Transport Object and
the union of all effective transport protocol scopes MUST equal root
`protocolVersions`, as required by the existing transport coverage rule.

When `transports` is omitted, transport protocol-coverage validation does not
apply. A validator MUST NOT infer a transport, report uncovered root revisions,
or interpret omission as a zero-transport declaration.

If a later operation adds `transports`, the resulting non-empty array MUST cover
every root protocol revision before the resulting document is conforming.

### 6. Canonical authoring and serialization

For an ordinary declaration collection, omission is the only conforming
representation of no entries. JSON and YAML producers MUST omit the property
rather than emit an empty array or map.

Serialization conversion MUST preserve semantically meaningful empty values,
including all security exceptions. It MUST NOT convert omission to an explicit
empty value or convert a meaningful empty value to omission.

This rule applies equally to every conforming serialization defined by Proposal
0010 and does not otherwise change serialization equivalence.

### 7. Projection

A projection operation that removes the last entry from an ordinary declaration
collection MUST omit that collection in its output.

If projection removes the last component from a Proposal 0009 namespace, it
MUST omit that namespace. If no component namespaces remain, it MUST omit the
outer `components` property.

Projection MUST preserve meaningful empty security values and MUST NOT confuse
an omitted source declaration with an explicit security clearing operation.

Projection may produce a document without `transports`. Such a result remains
conforming when the required root fields remain present.

### 8. Merge

For an ordinary declaration collection, omission contributes no entries during
merge. A merge result with no entries MUST omit the collection.

For properties with meaningful empty semantics, merge MUST use that property's
defined precedence and replacement rules rather than the ordinary collection
rule. In particular, `security: []` is an explicit value and not an absent merge
input.

Merge output MUST satisfy transport protocol coverage whenever the output
contains `transports`.

### 9. Validation diagnostics

A validator SHOULD distinguish among:

* a missing required root property;
* a valid omitted optional section;
* an invalid empty ordinary declaration collection; and
* a valid semantically meaningful empty collection.

A diagnostic for an empty ordinary collection SHOULD recommend omitting the
property or adding an entry.

## Schema impact

The 0.8.0 JSON Schema must:

* remove `transports` from the root `required` array;
* retain `mcpdesc`, `info`, and `protocolVersions` as required;
* retain `minItems: 1` on `protocolVersions` and `transports`;
* add `minItems: 1` to optional ordinary root arrays that currently permit an
  empty value;
* add `minProperties: 1` to optional ordinary maps that currently permit an
  empty value, including `securitySchemes`;
* preserve the current Security Requirement Array and scope-array cardinalities;
  and
* if Proposal 0009 is accepted, add `minProperties: 1` to both the Components
  Object and each component namespace map.

Structural schema validation can enforce these cardinalities. Semantic
validation remains responsible for conditional transport protocol coverage and
for field-specific security interpretation.

The same changes must be reflected in `schemas/draft.json`. The stable
`schemas/latest.json` pointer must remain on 0.7.0 during 0.8.0 draft work.

## Examples

### Minimal partial description

This document is conforming and makes no transport or primitive declarations:

```json
{
  "mcpdesc": "0.8.0",
  "info": {
    "name": "chess-rating-server",
    "version": "1.0.0"
  },
  "protocolVersions": ["2026-07-28"]
}
```

The omitted `transports` and `tools` properties do not assert that the runtime
server lacks transports or Tools.

### Non-empty documented section

```json
{
  "mcpdesc": "0.8.0",
  "info": {
    "name": "chess-rating-server",
    "version": "1.0.0"
  },
  "protocolVersions": ["2026-07-28"],
  "tools": [
    {
      "name": "get_player_rating",
      "inputSchema": {"type": "object"}
    }
  ]
}
```

### Invalid empty ordinary collection

```json
{
  "mcpdesc": "0.8.0",
  "info": {
    "name": "chess-rating-server",
    "version": "1.0.0"
  },
  "protocolVersions": ["2026-07-28"],
  "tools": []
}
```

The author must omit `tools` or add at least one Tool Object.

### Valid meaningful security emptiness

```json
{
  "mcpdesc": "0.8.0",
  "info": {
    "name": "local-server",
    "version": "1.0.0"
  },
  "protocolVersions": ["2026-07-28"],
  "securitySchemes": {
    "api-key": {
      "type": "apiKey",
      "in": "header",
      "name": "X-API-Key"
    }
  },
  "security": [
    {"api-key": []}
  ],
  "tools": [
    {
      "name": "health",
      "inputSchema": {"type": "object"},
      "security": []
    }
  ]
}
```

Both empty arrays are semantically meaningful and remain conforming.

## Compatibility

Making `transports` optional is a compatible relaxation: every document valid
under the previous transport requirement remains valid under the new root
requirement, subject to the independent non-empty collection changes below.

Requiring currently permissive ordinary collections to be non-empty when
present is a tightening. A Draft 1 document containing `tools: []`,
`resources: []`, `resourceTemplates: []`, `prompts: []`, `tags: []`, or
`securitySchemes: {}` must omit the empty property. The document's declared
content does not otherwise change.

This proposal targets the unreleased 0.8.0 Community Working Draft. Before
acceptance, repository fixtures and available ecosystem examples should be
checked for affected empty values. Any 0.7.0 document invalidated by the
cardinality tightening must be identified explicitly and considered under the
project's compatibility policy.

Security behavior is compatible. Existing meaningful empty security values
remain valid and retain their current interpretation.

Proposal 0009 requires a small clarification: its outer Components Object must
be non-empty when present. This does not affect documents that do not implement
that review-stage proposal.

## Migration

Authors and producers should:

1. remove an empty ordinary declaration property rather than populate it with
   a placeholder;
2. retain every meaningful empty `security` or security-scope value;
3. omit `transports` when connection details are unknown, unavailable, or
   intentionally not declared; and
4. validate transport protocol coverage whenever `transports` is present.

Consumers that previously required `transports` must accept a document without
that property and represent its connection information as undeclared rather
than as an empty transport list.

Projection and merge implementations should normalize only ordinary empty
declaration collections to omission. They must not apply that normalization to
security or to opaque and externally governed values.

## Security and privacy considerations

Optional transports can reduce pressure to publish environment-specific URLs,
commands, arguments, or environment-variable declarations when those details
are sensitive or not portable. Omission does not itself provide confidentiality
for information published elsewhere in the document.

Consumers must not treat an omitted `security`, `securitySchemes`, transport, or
primitive section as evidence about runtime access control, reachability, or
authorization-filtered visibility.

Preserving `security: []`, `security: [{}]`, and empty scope arrays is essential
to avoid changing authentication semantics. Tooling that collapses these values
to omission could accidentally replace explicit clearing or anonymous access
with inherited requirements, or vice versa.

The proposal introduces no network retrieval, credential handling, or runtime
execution behavior.

## Alternatives considered

### Keep `transports` required

This guarantees connection information in every document but prevents valid
partial descriptions and encourages fabricated or environment-specific values.
It also treats transport documentation differently from every other optional
descriptive section without a compelling semantic reason.

### Permit empty ordinary collections

This follows the permissiveness of several OpenAPI structures and preserves all
Draft 1 inputs. It leaves two representations for no entries, complicates
canonical output, and provides no additional MCP Description meaning.

### Treat omission as runtime non-support

This would make a static description appear exhaustive and would conflict with
authorization-scoped discovery, partial authoring, and the existing
zero-primitive guidance.

### Prohibit every empty collection

This is syntactically uniform but semantically wrong. It would remove security
clearing, anonymous alternatives, and scheme forms that require empty scope
arrays, and could incorrectly constrain embedded or protocol-native values.

### Copy OpenAPI cardinalities exactly

OpenAPI is useful prior art for optional sections and security semantics, but it
permits meaningful or tolerated empty values in structures where MCP
Description does not need duplicate representations. Exact copying would favor
surface similarity over a canonical MCP Description model.

### Add a document completeness flag

A completeness declaration could distinguish exhaustive inventories from
partial descriptions, but it requires a broader definition across
authorization contexts, transports, protocol revisions, and primitive types.
This proposal only defines omission and cardinality and does not preclude a
future completeness proposal.

## Open questions

* Should a future proposal define an explicit completeness or observation-scope
  model for consumers that need to distinguish partial documentation from an
  asserted complete inventory?
* Are there any 0.7.0 documents in active use whose empty ordinary collections
  carry an unstated meaning that should become an explicit exception?

## Implementation and validation plan

After acceptance:

1. update the root table, zero-primitive guidance, transports, security, and
   serialization sections under `spec/draft/sections/`;
2. rebuild or synchronize `spec/draft/mcp-description.md`;
3. update `schemas/mcp-description/0.8.0.json` and `schemas/draft.json` without
   changing `schemas/latest.json`;
4. add valid fixtures for omitted transports and meaningful security emptiness;
5. add invalid fixtures for each newly prohibited empty ordinary collection;
6. update examples that contain prohibited empty collections;
7. update `spec/draft/CHANGELOG.md` and the 0.7-to-0.8 migration guide;
8. align Proposal 0009 and its implementation if it is accepted; and
9. run `npm test`, `git diff --check`, and frozen-release integrity checks.

Validation must cover at least:

* a minimal document with no `transports`;
* non-empty transport coverage of all root protocol revisions;
* rejection of an empty present `transports` array;
* rejection of every affected empty ordinary root collection;
* acceptance and preservation of `security: []` and `security: [{}]`;
* acceptance of required empty security scope arrays;
* projection that omits a collection after removing its last entry; and
* merge behavior that distinguishes omission from meaningful security
  emptiness.

## Decision record

Pending community review and maintainer decision.