# Rule Versioning and History from 0.8.0

Historical investigation completed before Proposal 0030 was implemented. The
omitted-applicability counts and preliminary classifications below describe
Draft 2, not the current Draft 3 records. Draft 3 supplies explicit applicability and
reader fields without changing the historical requirement comparisons.

Informative investigation for MCP Description 0.9.0 (Community Working Draft 2).
It explains how validation rules relate to MCP Description versions and to MCP
protocol revisions, and compares each registered rule with the requirements of
the released 0.8.0 specification. It is not normative, does not define a 0.8.0
rule registry, and attributes no diagnostics to 0.8.0 retroactively.

## Summary

- **Specification version is already established by snapshot membership.** A
  rule registry belongs to the specification snapshot that contains it, and a
  per-rule version field would duplicate that. No schema change is needed for
  this dimension.
- **Protocol applicability is incomplete.** 19 of 63 records, all owned by MCP
  Description, omit `applicability`, and nothing defines what the omission
  means. At least 4 of them depend on the protocol revision.
- **History:** of the 63 rules, 45 model a requirement unchanged from 0.8.0,
  13 a changed requirement, and 3 a requirement new in 0.9.0; 2 are
  uncertain. 0.8.0 published no registry, so these are statements about
  requirements, not about published rules.
- **Recommendation:** keep version membership at the snapshot level. Address
  applicability, together with reader-oriented titles and explanations, in a
  proposal for Community Working Draft 3.

## Two version dimensions

| Dimension | Answers | Established by |
| --- | --- | --- |
| MCP Description version | Which registry applies to a document | The specification snapshot: `spec/<version>/validation/rules/` for a release, `spec/draft/validation/rules/` at a draft tag |
| MCP protocol revision | How a rule applies to each revision a document declares | The rule's `applicability` |

Three identities must not be confused:

| Identity | Example | Meaning |
| --- | --- | --- |
| Specification version | `0.9.0` | The `mcpdesc` value; the format against which conformance is assessed |
| Snapshot | `v0.9.0-draft.1` | An immutable tag of the specification, including its registry |
| Implementation release | `@mcpdesc/validator@0.14.0-rc.1` | A tool version, with its own selectors such as `0.9.0-draft.1` |

Findings:

- [Proposal 0024](../proposal-snapshots/0024-validation-rule-identity-and-provenance.md),
  Section 3: "Each specification version publishes its rule registry … The
  registry is frozen with the release." Section 2: an identifier, once
  published in a snapshot, "MUST NOT change meaning", and a material change
  becomes a separate rule.
- No 0.8.0 edition (`v0.8.0`, `v0.8.0+editorial.1`, `v0.8.0-rev.20261021`)
  contains a `validation/` folder. The registry first appears in
  `v0.9.0-draft.1`.
- Between `v0.9.0-draft.1` and Draft 2, two rules were added
  (`mcp.resource.size`, `mcp.cacheable-result.ttl-ms`), none was removed, and
  `rule.schema.json` did not change.
- Validator snapshot exports bundle the runtime, fixtures, projection
  fixtures, and conversion fixtures, but not `validation/rules/`. The registry
  is published only as part of the tagged specification.
- `owner` names the authority, not a version dimension. An `mcp` rule belongs
  to the registry of a specific MCP Description version even though MCP is its
  authority, and an `mcpdesc` rule can depend on the protocol revision.

## Applicability today

`applicability` maps every supported MCP revision to a value. Proposal 0024,
Section 4, defines `applies`, `opaque` (the field may appear and is preserved,
but the rule's MCP semantics do not apply), `not-applicable`, and rule-specific
names. The registry uses `applies` 181 times, `not-applicable` 35 times, and
`opaque` 4 times (`mcp.tool.input-schema.x-mcp-header`).

Observations:

- `applicability` is required for `mcp` and `json-schema` rules and, when
  present, must list every supported revision (checked by
  `scripts/test-validation-rules.mjs`). It is optional for `mcpdesc` rules,
  and its absence has no documented meaning.
- `applies` means that the rule is checked for that revision, not that a
  field is allowed. For `mcp.tool.output-schema.revision-availability`, which
  rejects `outputSchema` before MCP 2025-06-18, the value is `applies` for
  2024-11-05 and 2025-03-26 and `not-applicable` afterwards.
- Proposal 0024 says that rules owned by MCP Description form the ruleset
  `mcpdesc.core`, which suggests that they do not depend on the revision.
  Several do.

Preliminary classification of the 19 records without `applicability`, to be
settled by the proposal:

| Behavior | Rules |
| --- | --- |
| Same check in every revision (11) | `mcpdesc.document.schema`, `mcpdesc.protocol-scope.consistency`, `mcpdesc.tags.references`, `mcpdesc.security.requirements`, `mcpdesc.components.references`, `mcpdesc.elicitation.name-unique`, `mcpdesc.elicitation.form-schema.consistency`, `mcpdesc.prompt.example.arguments`, `mcpdesc.resource.example.consistency`, `mcpdesc.resource-template.example.expansion`, `mcpdesc.transports.coverage` |
| Depends on the revision (4) | `mcpdesc.legacy-revisions.validation-scope` (MCP 2024-11-05 and 2025-03-26 only), `mcpdesc.completion-example.target` (completion context), `mcpdesc.tool.interaction.elicitation-consistency` (elicitation from MCP 2025-06-18), `mcpdesc.tool.interaction.client-requirements-consistency` (capabilities differ by revision) |
| Delegated, parameterized by the requested revision (3) | `mcpdesc.projection.source-valid`, `mcpdesc.projection.declaration-applicable`, `mcpdesc.projection.native-schema` |
| Uncertain (1) | `mcpdesc.extensions.catalogue-maturity` (the catalogue is pinned, but extension declarations are revision-scoped) |

Until applicability is complete, a catalog should label an absent value "Not
recorded per revision" and should not present it as "applies to all
revisions".

## Options

| Option | Assessment |
| --- | --- |
| Keep specification-version membership at the snapshot level, and make per-rule protocol applicability complete and explicit | Answers both reader questions with the smallest change. **Recommended.** |
| Add per-rule version ranges (`since`, `until`) | Duplicates snapshot membership and can drift from it. Rejected. |
| Add lifecycle or provenance metadata, such as "existed in 0.8.0" | No consumer needs it today; this report records the history once. Revisit if a tool needs to show history per rule. |

The recommended change, for Community Working Draft 3:

1. require `applicability` on every rule, and correct the `mcpdesc.core`
   statement of Proposal 0024;
2. add a short `title` and a reader-oriented `description` to every rule,
   keeping `summary` as the precise requirement.

Both are informative except `applicability`, which Proposal 0024 already lists
among the normative fields. Any such change updates the rule schema, all
records, the registry test, the overview, and the changelog together, and is
coordinated with `@mcpdesc/core`, the validator, and mcpdesc.org.

## Rule identity across versions

A permanent identifier keeps its meaning within the snapshots that publish it.
A later specification version does not inherit rules automatically: its
registry is published anew, and a rule that keeps its identifier there keeps
its meaning. A requirement that changes materially gets a new identifier, and
the old one is retired, never reused. Nothing guarantees that a rule present
in 0.9.0 is unchanged or present in 0.10.0.

## Historical evaluation

### Method

- **Requirements:** the text following each 0.9.0 requirement anchor was
  compared with the `v0.8.0` section of the same name. 81 anchored sentences
  are identical in `v0.8.0`; 28 are not, and were reviewed by hand against the
  0.9.0 changelog and Proposals 0024 to 0029. `v0.8.0+editorial.1` and
  `v0.8.0-rev.20261021` do not change normative text.
- **Enforcement:** each `expected-invalid` fixture a rule cites was back-ported
  to 0.8.0 (`mcpdesc` and `$schema` only) and validated with the
  `@mcpdesc/validator` selectors `0.8.0` and `0.8.0-rev.20261021`. "Rejected"
  means the selector reported an error; the reported codes were checked against
  the rule's codes, and differences are noted.
- **Classification:** unchanged (0.8.0 states the same requirement), changed
  (0.8.0 states a different requirement), new (no 0.8.0 counterpart), or
  uncertain (0.8.0 text is silent or ambiguous while 0.8.0 behavior matched).

The following claims are kept separate. A requirement existed in 0.8.0; the
current rule models it accurately; a 0.8.0 validator enforced it; a catalog was
published with 0.8.0. The matrix supports only the first and, where a fixture
exists, the third. No catalog was published with 0.8.0.

### Limitations

- Back-ported fixtures were written for 0.9.0. A rejection can come from
  another 0.9.0 feature of the fixture; where the 0.8.0 codes differ from the
  rule's codes, the row says so.
- Rules without an `expected-invalid` fixture (warnings, preservation,
  delegated rules) have no enforcement evidence here.
- A rule classified as unchanged can still differ in diagnostic code,
  severity, or path; diagnostics gained the `rule` property in 0.9.0.
- `mcpdesc.document.schema` is unchanged as a requirement, but the 0.9.0
  schema it refers to differs from the 0.8.0 schema (see the changed rows).

### Matrix

0.8.0 citations are lines of `spec/0.8.0/sections/<file>` at tag `v0.8.0`.
0.9.0 citations are requirement anchors in this draft.

| Rule | Owner | Classification | 0.8.0 (`v0.8.0`, `spec/0.8.0/sections/`) | 0.9.0 requirement | MCP revisions (0.9.0 record) | Back-ported invalid fixtures (selectors `0.8.0` and `0.8.0-rev.20261021`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mcp.tool-annotations.members` | mcp | changed | 09-tools.md:144 | [req-tool-annotations-closed](../sections/09-tools.md#req-tool-annotations-closed) | not-applicable: 2024-11-05; applies: 2025-03-26, 2025-06-18, 2025-11-25, 2026-07-28 | `tool-annotations-unknown-property.json`: accepted by both | Open in 0.8.0 ("allows additional properties"); closed in 0.9.0 (Proposal 0027). |
| `mcp.annotations.members` | mcp | changed | 10-resources.md:69 | [req-resource-annotations-closed](../sections/10-resources.md#req-resource-annotations-closed) | applies: all | `resource-annotations-unknown-property.json`: accepted by both; `content-annotations-unknown-property.json`: accepted by both | Open in 0.8.0; closed in 0.9.0, including content-block annotations (Proposal 0027). |
| `mcp.annotations.last-modified.revision-availability` | mcp | unchanged | 10-resources.md:67 | [req-resource-annotations-last-modified](../sections/10-resources.md#req-resource-annotations-last-modified) | applies: all | `annotations-last-modified-before-2025-06-18.json`: rejected by both |  |
| `mcp.server-capabilities.members` | mcp | unchanged | 08-capabilities.md:55 | [req-capabilities-closed](../sections/08-capabilities.md#req-capabilities-closed) | applies: all | `unknown-server-capability.json`: rejected by both |  |
| `mcp.client-capabilities.members` | mcp | changed | 08-capabilities.md:76 | [req-client-requirements-closed](../sections/08-capabilities.md#req-client-requirements-closed) | applies: all | `unknown-client-capability-requirement.json`: accepted by both | Unknown client requirements accepted in 0.8.0; rejected in 0.9.0 (Proposal 0027). |
| `mcp.client-capabilities.revision-shape` | mcp | unchanged | 08-capabilities.md:61, 08-capabilities.md:74 | [req-client-requirements-revision-valid](../sections/08-capabilities.md#req-client-requirements-revision-valid), [req-client-requirements-values](../sections/08-capabilities.md#req-client-requirements-values) | applies: all | `revision-incompatible-client-capability-requirements.json`: rejected by both; `invalid-client-requirement-value.json`: rejected by both |  |
| `mcp.client-capabilities.deprecated` | mcp | unchanged | 08-capabilities.md:74 | [req-client-requirements-deprecated](../sections/08-capabilities.md#req-client-requirements-deprecated) | not-applicable: 2024-11-05, 2025-03-26, 2025-06-18; applies: 2025-11-25, 2026-07-28 | no invalid fixture |  |
| `mcp.capabilities.extensions.revision-availability` | mcp | unchanged | 08-capabilities.md:41 | [req-capabilities-extensions-pre-standard](../sections/08-capabilities.md#req-capabilities-extensions-pre-standard) | applies: all | no invalid fixture |  |
| `mcpdesc.extensions.catalogue-maturity` | mcpdesc | unchanged | 08-capabilities.md:43, 08-capabilities.md:47 | [req-extensions-reserved-identifiers](../sections/08-capabilities.md#req-extensions-reserved-identifiers), [req-extensions-catalogue-maturity](../sections/08-capabilities.md#req-extensions-catalogue-maturity) | not recorded | no invalid fixture |  |
| `mcp.capabilities.tasks.revision-availability` | mcp | unchanged | 08-capabilities.md:53 | [req-capabilities-tasks-distinct](../sections/08-capabilities.md#req-capabilities-tasks-distinct), [req-field-revision-availability](../sections/04-versioning.md#req-field-revision-availability) | applies: all | `tasks-capability-2026.json`: rejected by both | Second citation is the Section 4.10 consequence sentence. |
| `mcp.capabilities.logging.deprecated` | mcp | unchanged | 08-capabilities.md:53 | [req-capabilities-logging-deprecated](../sections/08-capabilities.md#req-capabilities-logging-deprecated) | not-applicable: 2024-11-05, 2025-03-26, 2025-06-18, 2025-11-25; applies: 2026-07-28 | no invalid fixture |  |
| `mcp.content-block.revision-availability` | mcp | unchanged | 09-tools.md:64, 11-prompts.md:54 | [req-tool-example-content-revision](../sections/09-tools.md#req-tool-example-content-revision), [req-prompt-example-content-revision](../sections/11-prompts.md#req-prompt-example-content-revision) | applies: all | `revision-incompatible-tool-example.json`: rejected by both; `invalid-prompt-example-semantics.json`: rejected by both |  |
| `mcp.resource-contents.meta.revision-availability` | mcp | unchanged | 10-resources.md:102 | [req-resource-contents-meta](../sections/10-resources.md#req-resource-contents-meta) | applies: all | `resource-example-result-semantics.json`: rejected by both | Resource Contents `_meta` from MCP 2025-06-18 in both; the 0.9.0 sentence was reworded because result `_meta` is now accepted in every revision. |
| `mcpdesc.document.schema` | mcpdesc | unchanged | 16-conformance.md:13, 03-document-structure.md:76, 09-tools.md:29 | [req-document-schema](../sections/16-conformance.md#req-document-schema), [req-closed-objects](../sections/03-document-structure.md#req-closed-objects), [req-tool-input-schema-required](../sections/09-tools.md#req-tool-input-schema-required) | not recorded | `missing-tool-input-schema.json`: rejected by both; `object-level-unknown-property.json`: rejected by both | The requirement is unchanged; the schema it refers to differs (see the changed rows). |
| `mcp.declaration.field.revision-availability` | mcp | unchanged | 04-versioning.md:106, 09-tools.md:37 | [req-field-revision-availability](../sections/04-versioning.md#req-field-revision-availability), [req-tool-schema-dialect-keyword](../sections/09-tools.md#req-tool-schema-dialect-keyword) | applies: all | `revision-inapplicable-execution.json`: rejected by both; `revision-inapplicable-tool-schema-dialect.json`: rejected by both | The 0.9.0 sentence in Section 4.10 states a consequence of the 0.8.0 per-field "Since MCP …" markers. |
| `mcpdesc.protocol-scope.consistency` | mcpdesc | unchanged | 04-versioning.md:114, 08-capabilities.md:88, 09-tools.md:124, 12-elicitation.md:65 | [req-scope-subset](../sections/04-versioning.md#req-scope-subset), [req-capability-scopes-disjoint](../sections/08-capabilities.md#req-capability-scopes-disjoint), [req-tool-names-disjoint](../sections/09-tools.md#req-tool-names-disjoint), [req-elicitation-scope](../sections/12-elicitation.md#req-elicitation-scope) | not recorded | `elicitation-scope-outside-parent.json`: rejected by both; `scoped-version-not-in-root.json`: rejected by both; `overlapping-tool-scope.json`: rejected by both; `overlapping-capabilities.json`: rejected by both |  |
| `mcpdesc.tags.references` | mcpdesc | unchanged | 13-tags.md:16, 13-tags.md:22 | [req-tags-unique](../sections/13-tags.md#req-tags-unique), [req-tags-references](../sections/13-tags.md#req-tags-references) | not recorded | `duplicate-root-tag.json`: rejected by both; `duplicate-tag-reference.json`: rejected by both |  |
| `mcpdesc.security.requirements` | mcpdesc | unchanged | 07-security.md:65 | [req-security-scheme-references](../sections/07-security.md#req-security-scheme-references), [req-security-scopes-unique](../sections/07-security.md#req-security-scopes-unique), [req-security-scopes-oauth-only](../sections/07-security.md#req-security-scopes-oauth-only), [req-security-uncatalogued-scope](../sections/07-security.md#req-security-uncatalogued-scope) | not recorded | `unknown-security-reference.json`: rejected by both; `non-oauth-scopes.json`: rejected by both; `duplicate-security-scope.json`: rejected by both |  |
| `mcpdesc.components.references` | mcpdesc | unchanged | 17-components.md:27, 17-components.md:43, 09-tools.md:31 | [req-component-reference-form](../sections/17-components.md#req-component-reference-form), [req-component-reference-resolution](../sections/17-components.md#req-component-reference-resolution), [req-tool-schema-references-resolved](../sections/09-tools.md#req-tool-schema-references-resolved) | not recorded | `component-reference-resolution.json`: rejected by both |  |
| `mcpdesc.legacy-revisions.validation-scope` | mcpdesc | unchanged | 16-conformance.md:36 | [req-legacy-validation-scope](../sections/16-conformance.md#req-legacy-validation-scope) | not recorded | no invalid fixture |  |
| `mcp.elicitation.revision-availability` | mcp | unchanged | 12-elicitation.md:73, 09-tools.md:114 | [req-elicitation-revisions](../sections/12-elicitation.md#req-elicitation-revisions), [req-interaction-revision-valid](../sections/09-tools.md#req-interaction-revision-valid) | applies: all | `elicitation-version-mismatch.json`: rejected by both; `invalid-tool-interaction-example-semantics.json`: rejected by both |  |
| `mcp.elicitation.form-schema.revision-shape` | mcp | unchanged | 12-elicitation.md:47 | [req-elicitation-form-vocabulary](../sections/12-elicitation.md#req-elicitation-form-vocabulary) | not-applicable: 2024-11-05, 2025-03-26, 2025-11-25, 2026-07-28; applies: 2025-06-18 | `elicitation-form-schema-2025-06-18.json`: rejected by both |  |
| `mcpdesc.elicitation.form-schema.consistency` | mcpdesc | unchanged | 12-elicitation.md:49 | [req-elicitation-form-required](../sections/12-elicitation.md#req-elicitation-form-required), [req-elicitation-form-enum-names](../sections/12-elicitation.md#req-elicitation-form-enum-names), [req-elicitation-form-defaults](../sections/12-elicitation.md#req-elicitation-form-defaults), [req-elicitation-form-ranges](../sections/12-elicitation.md#req-elicitation-form-ranges) | not recorded | `elicitation-form-semantics.json`: rejected by both; `elicitation-form-invalid-range.json`: rejected by both |  |
| `mcpdesc.elicitation.name-unique` | mcpdesc | unchanged | 12-elicitation.md:25 | [req-elicitation-name-unique](../sections/12-elicitation.md#req-elicitation-name-unique) | not recorded | `elicitation-form-semantics.json`: rejected by both |  |
| `mcpdesc.example.result.revision-fidelity` | mcpdesc | changed | 09-tools.md:64, 10-resources.md:102, 11-prompts.md:52 | [req-carried-defined-fields](../sections/03-document-structure.md#req-carried-defined-fields), [req-tool-example-result-shape](../sections/09-tools.md#req-tool-example-result-shape), [req-resource-example-result-shape](../sections/10-resources.md#req-resource-example-result-shape), [req-prompt-example-result-shape](../sections/11-prompts.md#req-prompt-example-result-shape) | applies: all | `invalid-prompt-example-semantics.json`: rejected by both; `invalid-completion-example-semantics.json`: rejected by both | Examples measured against each revision's MCP types, with open-type fields as warnings (Proposal 0026). |
| `mcpdesc.example.completed-result-form` | mcpdesc | unchanged | 09-tools.md:64, 10-resources.md:102, 11-prompts.md:50 | [req-tool-example-completed-form](../sections/09-tools.md#req-tool-example-completed-form), [req-resource-example-completed-form](../sections/10-resources.md#req-resource-example-completed-form), [req-prompt-example-completed-form](../sections/11-prompts.md#req-prompt-example-completed-form) | applies: all | `invalid-tool-example-result-semantics.json`: rejected by both; `invalid-prompt-example-semantics.json`: rejected by both; `resource-example-result-semantics.json`: rejected by both; `invalid-completion-example-semantics.json`: rejected by both |  |
| `mcp.completion.context.revision-availability` | mcp | uncertain | 11-prompts.md:76 | [req-template-completion-context-revision](../sections/10-resources.md#req-template-completion-context-revision), [req-prompt-completion-context-revision](../sections/11-prompts.md#req-prompt-completion-context-revision) | not-applicable: 2024-11-05; applies: 2025-03-26, 2025-06-18, 2025-11-25, 2026-07-28 | `invalid-completion-example-semantics.json`: rejected by both | 0.8.0 stated it for Prompts only; 0.9.0 also states it for Resource Templates (Section 10.4.6). The 0.8.0 validator already rejected both. |
| `mcpdesc.completion-example.target` | mcpdesc | unchanged | 10-resources.md:134, 11-prompts.md:74 | [req-template-completion-target](../sections/10-resources.md#req-template-completion-target), [req-prompt-completion-target](../sections/11-prompts.md#req-prompt-completion-target) | not recorded | `invalid-completion-example-semantics.json`: rejected by both |  |
| `mcpdesc.tool.interaction.elicitation-consistency` | mcpdesc | unchanged | 09-tools.md:108 | [req-interaction-elicitation-declaration](../sections/09-tools.md#req-interaction-elicitation-declaration), [req-interaction-elicitation-response](../sections/09-tools.md#req-interaction-elicitation-response) | not recorded | `invalid-tool-interaction-example-semantics.json`: rejected by both |  |
| `mcpdesc.tool.interaction.client-requirements-consistency` | mcpdesc | unchanged | 09-tools.md:116 | [req-interaction-client-requirements-warning](../sections/09-tools.md#req-interaction-client-requirements-warning) | not recorded | no invalid fixture |  |
| `mcp.sampling.tools.revision-availability` | mcp | unchanged | 09-tools.md:110 | [req-interaction-sampling-revision](../sections/09-tools.md#req-interaction-sampling-revision) | applies: all | `invalid-tool-interaction-example-semantics.json`: rejected by both |  |
| `mcp.root.uri.file-scheme` | mcp | unchanged | 09-tools.md:114 | [req-interaction-revision-valid](../sections/09-tools.md#req-interaction-revision-valid) | applies: all | `invalid-tool-interaction-example-semantics.json`: rejected by both |  |
| `mcp.meta.key-format` | mcp | unchanged | 03-document-structure.md:63 | [req-meta-keys](../sections/03-document-structure.md#req-meta-keys) | applies: all | `meta-key-invalid.json`: rejected by both |  |
| `mcp.meta.reserved-prefix` | mcp | unchanged | 03-document-structure.md:63 | [req-meta-reserved-prefix](../sections/03-document-structure.md#req-meta-reserved-prefix) | not-applicable: 2024-11-05, 2025-03-26; applies: 2025-06-18, 2025-11-25, 2026-07-28 | no invalid fixture |  |
| `mcpdesc.projection.source-valid` | mcpdesc | new | — | [req-native-projection-source-valid](../sections/04-versioning.md#req-native-projection-source-valid), [req-native-projection-revision-declared](../sections/04-versioning.md#req-native-projection-revision-declared) | not recorded | no invalid fixture | Native projection is defined in 0.9.0 (Proposal 0025). |
| `mcpdesc.projection.declaration-applicable` | mcpdesc | new | — | [req-native-projection-declaration-applicable](../sections/04-versioning.md#req-native-projection-declaration-applicable) | not recorded | no invalid fixture | Native projection is defined in 0.9.0 (Proposal 0025). |
| `mcpdesc.projection.native-schema` | mcpdesc | new | — | [req-native-projection-references-resolved](../sections/04-versioning.md#req-native-projection-references-resolved), [req-native-projection-fields](../sections/04-versioning.md#req-native-projection-fields), [req-native-projection-postcondition](../sections/04-versioning.md#req-native-projection-postcondition), [req-native-projection-no-synthesis](../sections/04-versioning.md#req-native-projection-no-synthesis), [req-native-projection-lists](../sections/04-versioning.md#req-native-projection-lists) | not recorded | no invalid fixture | Native projection is defined in 0.9.0 (Proposal 0025). |
| `mcpdesc.prompt.example.arguments` | mcpdesc | unchanged | 11-prompts.md:50 | [req-prompt-example-arguments](../sections/11-prompts.md#req-prompt-example-arguments) | not recorded | `invalid-prompt-example-semantics.json`: rejected by both; `component-contextual-examples.json`: rejected by both |  |
| `mcp.resource-template.uri-template` | mcp | changed | 10-resources.md:41, 10-resources.md:98 | [req-resource-template-uri-template](../sections/10-resources.md#req-resource-template-uri-template) | applies: all | `malformed-uri-template-without-examples.json`: accepted by both; `malformed-resource-template-example.json`: rejected by both; `invalid-completion-example-semantics.json`: rejected by both | 0.8.0 checked RFC 6570 validity only through examples, with example-specific codes; 0.9.0 checks every template. |
| `mcp.resource-contents.blob.base64` | mcp | unchanged | 10-resources.md:104 | [req-resource-example-blob-base64](../sections/10-resources.md#req-resource-example-blob-base64) | applies: all | `resource-example-result-semantics.json`: rejected by both |  |
| `mcpdesc.resource.example.consistency` | mcpdesc | unchanged | 10-resources.md:106, 10-resources.md:108 | [req-resource-example-requested-uri](../sections/10-resources.md#req-resource-example-requested-uri), [req-resource-example-mime-type](../sections/10-resources.md#req-resource-example-mime-type), [req-resource-example-size](../sections/10-resources.md#req-resource-example-size) | not recorded | no invalid fixture |  |
| `mcpdesc.resource-template.example.expansion` | mcpdesc | unchanged | 10-resources.md:98 | [req-resource-template-example-expansion](../sections/10-resources.md#req-resource-template-example-expansion) | not recorded | `resource-example-result-semantics.json`: rejected by both; `component-contextual-examples.json`: rejected by both |  |
| `mcp.resource.size` | mcp | changed | 10-resources.md:17 | [req-resource-size-integer](../sections/10-resources.md#req-resource-size-integer), [req-mcp-integer-numbers](../sections/03-document-structure.md#req-mcp-integer-numbers) | applies: all | `fractional-resource-size.json`: accepted by both; `fractional-resource-link-size.json`: accepted by both | `number` in 0.8.0; integer in 0.9.0 (Proposal 0029). Rule ID new in 0.9.0. |
| `mcp.completion.revision-availability` | mcp | uncertain | 10-resources.md:138, 11-prompts.md:78 | [req-template-completion-revisions](../sections/10-resources.md#req-template-completion-revisions), [req-prompt-completion-revisions](../sections/11-prompts.md#req-prompt-completion-revisions) | applies: all | `invalid-completion-example-semantics.json`: rejected by both | 0.8.0 text is silent on MCP 2024-11-05; 0.9.0 states that completion examples are not supported there. The 0.8.0 validator already rejected them. |
| `mcp.result.additional-properties.preserve` | mcp | changed | 09-tools.md:64, 10-resources.md:102 | [req-carried-open-preserve](../sections/03-document-structure.md#req-carried-open-preserve) | applies: all | no invalid fixture | Some undefined result fields were errors in 0.8.0 and others silently accepted; 0.9.0 accepts them with a warning (Proposal 0026). |
| `mcp.input-response.closed` | mcp | changed | 09-tools.md:114 | [req-carried-closed-reject](../sections/03-document-structure.md#req-carried-closed-reject), [req-interaction-revision-valid](../sections/09-tools.md#req-interaction-revision-valid) | not-applicable: 2024-11-05, 2025-03-26, 2025-06-18, 2025-11-25; applies: 2026-07-28 | `closed-step-responses-2026.json`: rejected by both | Step responses closed in every revision in 0.8.0; open through MCP 2025-11-25 in 0.9.0 (Proposal 0026). MCP 2026-07-28 unchanged; 0.8.0 rejected structurally, not with this rule's code. |
| `mcp.root.meta.revision-availability` | mcp | changed | 03-document-structure.md:59, 09-tools.md:114 | [req-meta-revision-availability](../sections/03-document-structure.md#req-meta-revision-availability), [req-interaction-revision-valid](../sections/09-tools.md#req-interaction-revision-valid) | applies: all | `root-meta-before-2025-06-18.json`: rejected by both | Root `_meta` rejected in every revision in 0.8.0; accepted from MCP 2025-06-18 in 0.9.0. 0.8.0 rejected structurally. |
| `mcp.meta.reserved-key-context` | mcp | changed | 03-document-structure.md:63 | [req-meta-keys](../sections/03-document-structure.md#req-meta-keys) | not-applicable: 2024-11-05, 2025-03-26; applies: 2025-06-18, 2025-11-25, 2026-07-28 | `meta-reserved-key-misuse.json`: rejected by both; `meta-reserved-keys-in-carried-values.json`: rejected by both | Same requirement; 0.9.0 also checks results, step responses, and roots. 0.8.0 rejected the carried-values fixture structurally, not with this rule's codes. |
| `mcp.completion.result-closed` | mcp | changed | 10-resources.md:138, 11-prompts.md:78 | [req-carried-nested-closed](../sections/03-document-structure.md#req-carried-nested-closed), [req-carried-closed-reject](../sections/03-document-structure.md#req-carried-closed-reject) | applies: all | `completion-result-extra-field.json`: accepted by both | `completion` open in the 0.8.0 schema; closed in 0.9.0 (Proposal 0026). |
| `mcp.cacheable-result.ttl-ms` | mcp | changed | 10-resources.md:102 | [req-mcp-integer-numbers](../sections/03-document-structure.md#req-mcp-integer-numbers), [req-resource-example-result-shape](../sections/10-resources.md#req-resource-example-result-shape) | applies: all | `fractional-ttl-ms.json`: accepted by both; `resource-example-cache-fields.json`: rejected by both | Non-negative number in 0.8.0; non-negative integer in 0.9.0 (Proposal 0029). Rule ID new in 0.9.0. |
| `mcp.tool.output-schema.revision-availability` | mcp | unchanged | 09-tools.md:14 | [req-field-revision-availability](../sections/04-versioning.md#req-field-revision-availability) | applies: 2024-11-05, 2025-03-26; not-applicable: 2025-06-18, 2025-11-25, 2026-07-28 | `output-schema-before-2025-06-18.json`: rejected by both | "Since MCP 2025-06-18" field marker in 0.8.0. |
| `mcp.tool.output-schema.object-root` | mcp | unchanged | 09-tools.md:45 | [req-tool-output-schema-object-root](../sections/09-tools.md#req-tool-output-schema-object-root) | not-applicable: 2024-11-05, 2025-03-26, 2026-07-28; applies: 2025-06-18, 2025-11-25 | `non-object-output-schema-before-2026.json`: rejected by both |  |
| `mcp.tool.schema-keywords.preserve` | mcp | unchanged | 09-tools.md:37, 09-tools.md:41 | [req-tool-schema-vocabulary](../sections/09-tools.md#req-tool-schema-vocabulary), [req-tool-schema-keywords-preserved](../sections/09-tools.md#req-tool-schema-keywords-preserved) | applies: all | no invalid fixture |  |
| `mcp.tool.input-schema.object-root` | mcp | unchanged | 09-tools.md:29 | [req-tool-input-schema-object-root](../sections/09-tools.md#req-tool-input-schema-object-root) | applies: all | `non-object-input-schema.json`: rejected by both |  |
| `mcp.tool.input-schema.x-mcp-header` | mcp | unchanged | 09-tools.md:47 | [req-tool-x-mcp-header](../sections/09-tools.md#req-tool-x-mcp-header) | opaque: 2024-11-05, 2025-03-26, 2025-06-18, 2025-11-25; applies: 2026-07-28 | `invalid-mcp-header-value.json`: rejected by both; `invalid-mcp-header-placement.json`: rejected by both; `duplicate-mcp-header.json`: rejected by both | Same text. Selector `0.8.0` also rejected the annotation in earlier revisions; `0.8.0-rev.20261021` corrected that. |
| `json-schema.tool-schema.valid` | json-schema | changed | 09-tools.md:39 | [req-tool-output-schema-valid](../sections/09-tools.md#req-tool-output-schema-valid), [req-tool-schema-dialect-valid](../sections/09-tools.md#req-tool-schema-dialect-valid), [req-tool-schema-dialect-set](../sections/09-tools.md#req-tool-schema-dialect-set), [req-tool-schema-external-ref](../sections/09-tools.md#req-tool-schema-external-ref) | not-applicable: 2024-11-05, 2025-03-26, 2025-06-18; applies: 2025-11-25, 2026-07-28 | `malformed-tool-schema.json`: rejected by both; `unresolved-local-tool-ref.json`: rejected by both; `unsupported-tool-schema-dialect.json`: rejected by both | The accepted declared dialects depended on the validator in 0.8.0; 0.9.0 fixes 2020-12 and draft-07. Reference validator behavior unchanged. |
| `mcp.tool.schema.legacy-shape` | mcp | unchanged | 09-tools.md:41 | [req-tool-schema-legacy-shape](../sections/09-tools.md#req-tool-schema-legacy-shape) | applies: 2024-11-05, 2025-03-26, 2025-06-18; not-applicable: 2025-11-25, 2026-07-28 | `malformed-pre-dialect-tool-schema-shape.json`: rejected by both |  |
| `mcp.tool.structured-content.output-schema` | mcp | unchanged | 09-tools.md:68 | [req-tool-example-structured-content](../sections/09-tools.md#req-tool-example-structured-content) | not-applicable: 2024-11-05, 2025-03-26; applies: 2025-06-18, 2025-11-25, 2026-07-28 | `invalid-tool-example-result-semantics.json`: rejected by both; `invalid-tool-interaction-example-semantics.json`: rejected by both |  |
| `mcpdesc.tool.example.schema-conformance` | mcpdesc | unchanged | 09-tools.md:62, 09-tools.md:72 | [req-tool-example-input-valid](../sections/09-tools.md#req-tool-example-input-valid), [req-tool-example-incomplete-validation](../sections/09-tools.md#req-tool-example-incomplete-validation) | applies: all | `tool-example-schema-mismatches.json`: rejected by both; `component-contextual-examples.json`: rejected by both |  |
| `mcpdesc.tool.example.error-result` | mcpdesc | unchanged | 09-tools.md:70 | [req-tool-example-error-result](../sections/09-tools.md#req-tool-example-error-result) | applies: all | `invalid-tool-example-result-semantics.json`: rejected by both |  |
| `mcp.transport.streamable-http.revision-availability` | mcp | unchanged | 06-transports.md:22 | [req-transport-streamable-http-revisions](../sections/06-transports.md#req-transport-streamable-http-revisions) | applies: all | `revision-inapplicable-streamable-http.json`: rejected by both |  |
| `mcp.transport.legacy-sse.deprecated` | mcp | unchanged | 06-transports.md:60 | [req-transport-legacy-sse-warning](../sections/06-transports.md#req-transport-legacy-sse-warning) | not-applicable: 2024-11-05; applies: 2025-03-26, 2025-06-18, 2025-11-25, 2026-07-28 | no invalid fixture |  |
| `mcpdesc.transports.coverage` | mcpdesc | unchanged | 06-transports.md:119 | [req-transport-coverage](../sections/06-transports.md#req-transport-coverage) | not recorded | `root-version-without-transport.json`: rejected by both; `scoped-version-not-in-root.json`: rejected by both |  |

## A retrospective 0.8.0 catalog

A catalog of 0.8.0 rules is not needed for current consumers. If one is
wanted, it would need:

- its own identity, distinct from the 0.8.0 release, for example a
  documentation page labelled as retrospective, never a `v0.8.0` artifact;
- rule records written against the `v0.8.0` text, with their own identifiers
  where the requirement differs from the 0.9.0 rule;
- no diagnostics attributed to 0.8.0 validators, whose output carries no
  `rule` property.

## Open questions

1. Should `mcpdesc.extensions.catalogue-maturity` record revision-specific
   behavior?
2. Should rules classified as uncertain (`mcp.completion.revision-availability`,
   `mcp.completion.context.revision-availability`) be described as clarified
   requirements in the 0.8.0 to 0.9.0 migration guide?
3. Should the meaning of `applies` (the rule is checked, not that a field is
   allowed) be stated in the rule schema descriptions?

## Website handoff

- Read rule records from the immutable specification snapshot the site
  documents, never from `main`.
- Show `applicability` per revision with these labels: `applies` "Checked",
  `opaque` "Preserved, not checked", `not-applicable` "Not applicable", an
  absent value "Not recorded per revision", and rule-specific values verbatim.
- Present this history as describing requirements, not as a published 0.8.0
  catalog.
- Use the Draft 2 snapshot (`v0.9.0-draft.2`) once tagged; labels for complete
  applicability, titles, and descriptions follow the snapshot that implements
  the Draft 3 proposal.
