# Changelog

All notable changes to the MCP Description Specification will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses specification versioning aligned with its `mcpdesc` field.

<!-- update with `markdown-toc -i CHANGELOG.md --maxdepth 2 -->
<!-- toc -->

- [[0.9.0] — Unreleased (community working draft)](#090--unreleased-community-working-draft)
- [[0.8.0+editorial.1] — 2026-10-19](#080editorial1--2026-10-19)
- [[0.8.0] — 2026-09-09](#080--2026-09-09)
- [[0.7.0] — 2026-03-23](#070--2026-03-23)
- [[0.6.0] — 2026-03-20](#060--2026-03-20)
- [[0.5.2] — 2026-03-18](#052--2026-03-18)
- [[0.5.1] — 2026-03-17](#051--2026-03-17)
- [[0.5.0] — 2026-03-17](#050--2026-03-17)
- [[0.4.0] — 2026-03-16](#040--2026-03-16)
- [[0.3.0] — 2026-01-15](#030--2026-01-15)
- [[0.1.0] — 2025-11-01](#010--2025-11-01)

<!-- tocstop -->

## [0.9.0] — Unreleased (community working draft)

### Community Working Draft 4 — Unreleased

#### Rule-level validation results — 2026-10-31

- Implemented review-stage [Proposal 0031](proposal-snapshots/0031-rule-level-validation-results.md), captured in [the proposal manifest](PROPOSALS.md) and tracked in [issue #93](https://github.com/mcpdesc/mcpdesc-specification/issues/93). Document validity is unchanged. Review-stage content may still change incompatibly or be removed.
- New Section 16.5, Validation Results: a diagnostic MUST identify its rule, severity, and location, and SHOULD identify the protocol versions it concerns; `code` and `message` are optional producer output, amending Proposal 0024, Section 5. A validator that claims conformance with the validation fixtures MUST report rule results, one status per rule and declared protocol version (`passed`, `failed`, `warning`, `not-applicable`, `not-evaluated`, or `delegated`), and MUST NOT report `passed` for a check it did not run. The three new anchors are listed as unchecked (`processing`).
- New [validation result format](validation/result.schema.json) `1.0.0` (`https://mcpdesc.org/schema/validation-result/1.0.0.json`), with its own [changelog](validation/result-format-changelog.md); catalog manifests list it as `resultSchema`.
- The candidate validator reports rule results: every JSON Schema location a rule owns and every semantic check records the subjects and versions it examines, and a rule is `passed` only where such an evaluation exists. Diagnostics list `protocolVersions` when the finding depends on them. The exported validator's `validate()` returns `results`.
- Fixture citations are checked against rule results: `passes` requires that the rule ran within the fragment. New outcome `not-applicable` for fragments where a rule does not run, used for `mcp.tool.output-schema.object-root` and `mcp.tool.input-schema.x-mcp-header`. The `passes` citations of `mcp.resource.size` and `mcp.cacheable-result.ttl-ms` now point at fragments with the checked field. `mcp.tool.schema-keywords.preserve` cites the new view case `view-tool-schema-keywords-2025-11-25.json` instead of validation fixtures.
- `mcpdesc.serialization.conforming` is now delegated (`enforcement: external`): decoding checks it before document validation.

#### View and merge cases — 2026-10-31

- Added [`view-fixtures/`](view-fixtures/): 23 Effective Protocol View and merge cases giving the exact expected document or the requirement anchor of the expected failure, with authored inputs under `view-fixtures/inputs/`, expected documents under `view-fixtures/expected/`, and the case format in `view-fixtures/schema/view-case.schema.json`. They cover protocol-scoped primitives, security forms and empty values, tool, interaction, resource, completion, and prompt examples, client requirements, tags, specification extensions, component pruning and renaming, and every merge failure. Tracked in [issue #102](https://github.com/mcpdesc/mcpdesc-specification/issues/102); no normative wording changes.
- New delegated rules `mcpdesc.view.projection` and `mcpdesc.view.merge` cite the cases and the 25 projection, merge, and preservation anchors previously listed as unchecked; 79 of the 341 anchors remain unchecked. Rule fixtures may now cite `view-fixtures/` cases.
- `@mcpdesc/core` must pass the cases with its view and merge operations; exported validator snapshots include `view-fixtures/`.

#### Resource URIs — 2026-10-31

- Section 10.1.2: a Resource `uri` MUST be an RFC 3986 URI with a scheme; custom schemes remain allowed. The previous SHOULD contradicted Section 15, which requires URI values to conform to RFC 3986, and MCP, whose `schema.ts` annotates `Resource.uri` with `@format uri`. Documents with a relative or free-text Resource `uri` become invalid; previously their native projection failed the postcondition.
- Canonical schema: `format: "uri"` on Resource `uri`, as on every other URI field. New rule `mcp.resource.uri` owns that location; fixture `expected-invalid/invalid-resource-uri.json`.
- Version conversion: new rule `mcpdesc.conversion.0-8-to-0-9.resource-uri-checked` blocks such values without a fix; case `relative-resource-uri.json`.

#### Complete validation catalog — 2026-10-30

- Implemented review-stage [Proposal 0033](proposal-snapshots/0033-complete-validation-catalog.md), captured in [the proposal manifest](PROPOSALS.md) and tracked in [issue #96](https://github.com/mcpdesc/mcpdesc-specification/issues/96). Document validity and diagnostics are unchanged except for the `rule` of document-schema failures. Review-stage content may still change incompatibly or be removed.
- Schema ownership: rule records list the canonical schema locations they own in `documentSchema`; every definition and the document root have exactly one owner. 17 new object-level rules own the remaining definitions, for example `mcpdesc.tool.members`, `mcpdesc.example.members`, `mcp.content.members`, and `mcp.interaction-message.members`; existing rules own the locations they already covered. In the fixtures, 251 of 259 document-schema failures are now attributed below the document root, against 24 of 245 in Draft 3. Failures of a `oneOf` or `anyOf` alternative other than the best-matching one belong to the owner of the alternatives.
- Requirement classification: every obligation sentence of the specification is covered by a requirement anchor, and every anchor is cited by a rule or listed in the new [`validation/unchecked-requirements.yaml`](validation/unchecked-requirements.yaml) with a reason (`runtime`, `processing`, or `guidance`). 240 anchors were added, without changing normative wording; 105 of the 341 anchors are listed as unchecked. Key words quoted as words, as in the RFC 2119 boilerplate, state no obligation.
- New rule `mcpdesc.serialization.conforming` cites the serialization fixtures for the JSON and restricted YAML requirements of Section 15; rule fixtures may now cite `serialization-fixtures/` files, whose outcome is whether decoding accepts them.
- Rule format `1.2.0`: `documentSchema` on rule records, `uncheckedRequirements` in the catalog, and serialization and view fixture citations; see the [rule-format changelog](validation/CHANGELOG.md).
- New fixtures for rules without failure evidence: `expected-invalid/malformed-info-transport-tag-resource.json` and `expected-invalid/malformed-sampling-step.json`.
- Version conversion profile: any target error at or next to a blocker location is a consequence of that blocker, whatever its rule.
- `@mcpdesc/core` must attribute document-schema failures from the ownership map at its intake of the next draft; exported validator snapshots carry the map in their runtime.

#### Dialect-governed Tool schemas — 2026-10-30

- Implemented review-stage [Proposal 0032](proposal-snapshots/0032-dialect-governed-tool-schemas.md), captured in [the proposal manifest](PROPOSALS.md) and tracked in [issue #95](https://github.com/mcpdesc/mcpdesc-specification/issues/95). For MCP 2025-11-25 and MCP 2026-07-28, the declared or default JSON Schema dialect decides whether an embedded Tool schema is valid; restrictions of schema syntax that only the TypeScript MCP `Tool` type imposes are reported, not enforced. Review-stage content may still change incompatibly or be removed.
- Section 9.2: the `inputSchema` root, and before MCP 2026-07-28 the `outputSchema` root, must describe an object. Before MCP 2025-11-25 (MCP 2025-06-18 for `outputSchema`) that still means a literal `"type": "object"`; from MCP 2025-11-25 a declared root `type` must give or contain `"object"`, and a root in `$ref` or `allOf` is valid. New requirement `req-tool-schema-native-shape`: a dialect-valid schema that misses a restriction of the MCP `Tool` type (a literal `"type": "object"` root; for MCP 2025-11-25 also on `outputSchema`, and an object for each top-level `properties` value) stays valid, and validators must warn for each location, naming the revisions concerned.
- Section 4.14: a `projection-postcondition-failed` failure for a Tool and revision that received that warning reflects the recorded MCP restriction rather than a defect; values are still never repaired.
- Canonical schema: an inline Tool `inputSchema` no longer requires `type: "object"`; the root rules moved to semantic validation, where the protocol scope is known. Documents valid under Draft 3 stay valid.
- Rules: revised the arbitrations of `mcp.tool.input-schema.object-root` (now per revision instead of protocol-independent) and `mcp.tool.output-schema.object-root` to follow MCP's dialect text, with MCP issue [#3238](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/3238) as upstream reference; added the `should`-level rule `mcp.tool.schema.native-shape` (warning `tool-schema-mcp-type-mismatch`); resolved the Draft 3 planned gap on `mcpdesc.projection.native-schema`. The candidate validator reports a non-object `inputSchema` root with `tool-input-schema-not-object` instead of `schema-validation`.
- Fixtures: new `expected-warning/tool-schema-mcp-type-mismatch.json`, `expected-valid/tool-schema-mcp-type-shapes.json`, and `expected-invalid/non-literal-object-input-schema-before-2025-11-25.json`; `expected-invalid/non-object-input-schema.json` replaces its `$ref` root, now valid with a warning, with an array root and a referenced string component. New projection cases show a `$ref`-rooted `inputSchema` failing the postcondition for both MCP 2025-11-25 and MCP 2026-07-28.
- `@mcpdesc/core` must implement the relaxed root checks, the warning, and the postcondition cases at its intake of the next draft.

### Community Working Draft 3 — 2026-10-29 (`v0.9.0-draft.3`)

Third 0.9.0 snapshot, implementing review-stage Proposal 0030 and editorial
documentation changes since `v0.9.0-draft.2`. Document validation behavior is
unchanged. The document schema has a new snapshot `$id` but unchanged
validation constraints. The separate rule-record format gains required reader
fields, complete applicability, checked fixture outcomes in place of diagnostic
codes, and publication artifacts. Native projection fixtures gain
postcondition failure cases. Earlier drafts'
breaking changes relative to 0.8.0 remain; see the
[migration guide](guides/migration-0.8-to-0.9.md).

#### Readable and published rule catalogs — 2026-10-28

- Implemented review-stage [Proposal 0030](proposal-snapshots/0030-readable-and-complete-rule-records.md), captured in [the proposal manifest](PROPOSALS.md). All 63 rules now have a unique short `title` and an informative author-oriented `description`, keeping their requirement summaries, sources, diagnostics, and identifiers unchanged.
- Required explicit applicability for active rules, independent of owner. `applicability.protocolVersions` is `independent` for 23 checks or a complete protocol map for 40 checks; the embedded JSON Schema rule also lists its canonical `schemaDialects`. `applies` means checked, not field allowed. The former universal-map approach was superseded during review on 2026-10-29.
- Assigned the first rule-format schema identity, `https://mcpdesc.org/schema/validation-rule/1.0.0.json`, later superseded by `1.1.0` (see below). Its root validates registry files and the aggregate catalog; `$defs/catalog-manifest` and `$defs/catalog-index` define publication and discovery. This does not retroactively version earlier draft schemas.
- Added deterministic catalog generation and a clean-commit, annotated-tag export command (`npm run rules:export`), including all records and preserving every field. The manifest pins the specification tag/commit, rule-format version, rule count, content digests, and an immutable evidence-link base.
- Added `npm run rules:check-publication` for pre-tag schema-only checks, immutable catalog verification, and verified discovery-index updates. Catalogs live under `/validation/catalogs/<snapshot>/`; the mutable `index.json` has separate stable and draft pointers. The stable pointer remains null while no stable specification has a registry. These are deployment contracts and tools, not a claim that the endpoints are live.
- Added `scripts/test-validation-catalog.mjs` to `npm test`, covering format failures, deterministic complete exports, digests and provenance, applicability and title controls, discovery separation, HTTP/header failures, source containment, and tag/clean-tree boundaries. Website hosting and renderer integration remain downstream work; the validator snapshot export format is unchanged.
- Registry consumers must adopt the new required fields and pinned format schema; no MCP Description document, diagnostic, projection, or conversion behavior changes.

#### Catalog applicability and lifecycle review — 2026-10-29

- Retitled the guide [How validation works](guides/understanding-mcp-protocol-versions.md), introducing structural and semantic checks before the protocol-scope example. Linked it reciprocally with the catalog overview, aligned the overview's worked example with the guide's `lookup` output schemas and its warning example with `resultType`, removed the custom-keyword detour, and moved delegated checks to the technical reference. Editorial; no validation behavior, rule records, schemas, or fixtures changed.
- Simplified the catalog's custom-keyword explanation: document-processing software such as editors must retain that information, and silently deleting it is a software defect rather than an author error. Replaced the ambiguous "tools" heading without changing the underlying preservation requirement.
- Removed named rulesets, including the proposed per-version groups and `mcpdesc.core`. Consumer filters are views of a complete catalog, not independently selectable validation profiles or permission to skip required checks.
- Made protocol independence explicit rather than inferring it from owner or omitted metadata. Separate dialect metadata does not suppress errors for unsupported declared dialects. Reclassified each current rule without changing requirements, permanent IDs, summaries, sources, or diagnostics.
- Defined catalog-local retirement using existing `status: retired`: historical records stay discoverable, may omit active applicability, and cannot be identified by current validation diagnostics. A later catalog does not automatically inherit earlier rules; materially changed requirements receive new IDs, and earlier snapshots remain unchanged.
- Added positive and negative tests for independent and protocol-sensitive records, dialect metadata, incomplete applicability, and retained retirement records. Schema and catalogs are still unpublished pending review and deployment.
- Added a separate [validation rule-format changelog](validation/CHANGELOG.md), now recording `1.1.0 — Unreleased` and the superseded `1.0.0`, for record structure, publication contracts, compatibility, and consumer migration. Individual rule-content changes remain in this per-draft specification changelog.

#### Fixture evidence and projection postcondition — 2026-10-29

- Removed `diagnostics` from rule records, implementing the revised [Proposal 0030](proposal-snapshots/0030-readable-and-complete-rule-records.md), Section 9. Diagnostic codes categorize a producer's output and are not specification requirements; one declared code, `projection-postcondition-failed`, was expected by no fixture and emitted by no producer. Validator output is unchanged: candidate-validator diagnostics keep their `code` and `rule`.
- Every fixture citation now has a required, checked `outcome`: 137 citations, 30 `passes`, 87 `error`, and 20 `warning`. `scripts/test-validation-rules.mjs` checks each outcome against the candidate validator or the projection case, requires a cited fixture for every severity a rule reports in the fixtures, traces projection failures to the requirement that defines them, keeps `should`- and `may`-level MCP rules free of errors, and resolves every rule identifier the candidate validator references. A `passes` outcome is accepted only in a fixture without errors, where no check was skipped; for preservation rules it shows acceptance, not preservation by software. Each check was confirmed with a negative control.
- Draft 4 work is tracked in draft [Proposal 0031](https://github.com/mcpdesc/mcpdesc-specification/pull/94) and [issue #93](https://github.com/mcpdesc/mcpdesc-specification/issues/93): `rule` rather than `code` as the interoperable diagnostic contract, a result for every rule including passing ones, and precise attribution instead of the catch-all `mcpdesc.document.schema`, which receives 221 of 245 document-schema diagnostics in the Draft 3 fixtures. [Issue #96](https://github.com/mcpdesc/mcpdesc-specification/issues/96) tracks identifying the MCP Description and MCP requirements those schemas already enforce as rules. The removed code mapping remains in the rule records of tag `v0.9.0-draft.2`, which are identical in that respect.
- Published the change as rule format `1.1.0` at `https://mcpdesc.org/schema/validation-rule/1.1.0.json`; manifests and the index declare `1.1.0`. The deployed `1.0.0` schema, which still requires `diagnostics`, stays unchanged and is used by no catalog. By maintainer decision `1.1.0` is a minor number despite the incompatible change, and its first deployed bytes, whose envelope constants still named `1.0.0`, are replaced once; see the [rule-format changelog](validation/CHANGELOG.md).
- Added native projection cases for `projection-postcondition-failed` from a recorded defect: [`documents/boolean-property-schema.json`](projection-fixtures/documents/boolean-property-schema.json) is valid, but a Tool property declared as the boolean subschema `true` fails the pinned MCP 2025-11-25 `Tool` type, so a single projection and its Tool list fail for MCP 2025-11-25, while MCP 2026-07-28 projects it unchanged. The case schema accepts the failure, and `scripts/test-projection-fixtures.mjs` checks that each such value really fails its pinned type. Section 4.14 is unchanged; the gap is recorded as `planned` on `mcpdesc.projection.native-schema` and tracked in [issue #95](https://github.com/mcpdesc/mcpdesc-specification/issues/95). `@mcpdesc/core@0.13.0-rc.2` does not perform this check; its Draft 3 intake must. [Proposal 0025](proposal-snapshots/0025-native-mcp-projection.md) is recaptured with this coverage.
- Updated the validation overview: rules are explained through severities and fixture outcomes rather than codes, the worked example follows its two cited fixtures, delegated checks state that the candidate validator neither performs nor reports them, and implementation status names the published `0.14.0-rc.2` and `0.13.0-rc.2` prereleases.

#### Documentation — 2026-10-28

- Simplified the validation catalog overview with linked error and warning examples, a separate explanation of preservation guarantees and their conformance tests, and a distinction between document validation and delegated projection checks. Editorial; no validation behavior, rule records, schemas, or fixtures changed.
- Moved the MCP protocol version comparison from `validation/mcp-revisions.md` to [How validation works](guides/understanding-mcp-protocol-versions.md), initially titled "How MCP protocol versions are managed". Added an introduction explaining inherited and disjoint protocol scopes, structural and semantic validation, Effective Protocol Views, and explicit native projection. The complete Tool example compares object and array output schemas for MCP 2025-11-25 and 2026-07-28, with its native value; the validation section uses example-result `resultType` to explain errors versus warnings. Condensed the format-versus-protocol-version distinction and adopted "protocol version" terminology. Retained the per-surface comparison tables and documented limitations, and updated the live documentation links. Captured proposal snapshots retain their historical paths and exact bytes.
- Grouped the original Draft 1 implementation entries beneath its dated heading. Draft 1 and Draft 2 entries remain detailed historical records; subsequent editorial changes are recorded under Draft 3.
- Clarified the distinction between the server implementation version (`info.version`), described MCP protocol versions (`protocolVersions`), and the description format (`mcpdesc`). Documented the corresponding initialization, discovery metadata, and optional Server Card fields, checking the card mapping against the schema snapshot referenced by SEP-2127. Static Info metadata does not imply a live-server origin.

### Community Working Draft 2 — 2026-10-28 (`v0.9.0-draft.2`)

Second 0.9.0 snapshot, implementing review-stage Proposals 0028 and 0029 recorded in [`PROPOSALS.md`](PROPOSALS.md), from [issue #82](https://github.com/mcpdesc/mcpdesc-specification/issues/82) and [issue #84](https://github.com/mcpdesc/mcpdesc-specification/issues/84). It contains a breaking change; see the [0.8.0 to 0.9.0 migration guide](guides/migration-0.8-to-0.9.md).

#### Integer MCP numbers (review-stage Proposal 0029; subject to review and possible incompatible change or removal)

- **Breaking:** Resource `size`, the `size` of resource link content blocks, and Resource example result `ttlMs` are integers (Sections 3.6, 10.1.1, and 10.4.4). MCP declares them as `number` in `schema.ts` and generates `schema.json` with `--defaultNumberType integer`, so they are integers in the schema MCP tooling validates against; 0.9.0-draft.1 accepted fractions, which made native projection fail its postcondition for valid documents. No minimum is added to `size`, as MCP defines none.
- Section 3.6 states how MCP numbers are read: an unannotated `number` in `schema.ts` is an integer, and `@TJS-type number` marks a number. The sources-of-truth table in [`validation/README.md`](validation/README.md) records this as an arbitration rather than a generator defect.
- Added rule records `mcp.resource.size` and `mcp.cacheable-result.ttl-ms` with active arbitrations, and fixtures `expected-invalid/fractional-resource-size.json`, `fractional-resource-link-size.json`, and `fractional-ttl-ms.json`.
- Migration: replace a fractional value with the intended integer.

#### Version conversion (review-stage Proposal 0028; subject to review and possible incompatible change or removal)

- Added [`conversion/`](conversion/README.md), a non-normative tooling profile for converting 0.8.0 documents to 0.9.0: automatic rewrites that preserve meaning (`mcpdesc`, and `$schema` when present), six conversion rules that explain every 0.8.0 to 0.9.0 incompatibility (closed Tool and Resource Annotations, closed client capability requirements, closed completion results, `uriTemplate` checking, and integer numbers), opt-in fixes (`remove-property`, `move-to-experimental`), and an RFC 6902 patch for editors.
- Added 55 conversion cases covering every released 0.8.0 example and valid or warning fixture (43 converted by the version rewrite alone, 2 blocked), every conversion rule, fix, and diagnostic code, and a YAML source. `scripts/test-conversion-fixtures.mjs` recomputes each case and fails on any 0.9.0 error that no conversion rule explains. Validator snapshots bundle the directory, including the released source documents.
- Native projection stays explicit: it never converts implicitly. Documents of 0.8.0 are converted, then projected.
- Implementation: conversion belongs in `@mcpdesc/core`. No document changes validity.

#### Documentation

- Rewrote the introduction of [`validation/README.md`](validation/README.md) for readers: what validation rules cover (MCP, JSON Schema, and MCP Description owners), why rules are explicit, how to act on a diagnostic, a worked example based on an existing fixture, and the status of the pilot registry. The technical reference follows under "Reference". The introduction is delimited by `mcpdesc:validation-overview` comment markers so mcpdesc.org can import it unchanged. Editorial; no rule, behavior, schema, or fixture changes.
- Implementation state since Draft 1: the prereleases `@mcpdesc/validator@0.14.0-rc.1` (rule identifiers in diagnostics) and `@mcpdesc/core@0.13.0-rc.1` (native MCP projection, tested against the projection fixtures) support the explicit `0.9.0-draft.1` selector. The Draft 1 entries below describe the state when Draft 1 was published.
- Added [`validation/rule-history-0.8.md`](validation/rule-history-0.8.md), an informative investigation of how rules relate to MCP Description versions and MCP protocol revisions, with a matrix comparing each registered rule with the 0.8.0 requirements (45 unchanged, 13 changed, 3 new, 2 uncertain). The validation README now states that an omitted `applicability` means behavior per revision is not recorded. Editorial; no rule, behavior, schema, or fixture changes.

### Community Working Draft 1 — 2026-10-26 (`v0.9.0-draft.1`)

First 0.9.0 snapshot: MCP-native alignment from [issue #72](https://github.com/mcpdesc/mcpdesc-specification/issues/72), implementing review-stage Proposals 0024, 0025, 0026, and 0027 recorded in [`PROPOSALS.md`](PROPOSALS.md). It is a prerelease, not an accepted specification, and contains breaking changes; see the [0.8.0 to 0.9.0 migration guide](guides/migration-0.8-to-0.9.md). The changes since initialization from 0.8.0 are listed in the sections below.

Initialization from the stable 0.8.0 release:

- Copied the 0.8.0 sections, examples, fixtures, serialization fixtures, and guides into `spec/draft/`.
- Draft documents use `mcpdesc: 0.9.0`, and the draft schema [`schemas/mcp-description/0.9.0.json`](../../schemas/mcp-description/0.9.0.json) uses the prerelease identity `https://mcpdesc.org/schema/mcp-description/0.9.0-draft.1.json`. At initialization its validation rules were otherwise identical to 0.8.0.
- Updated version-identity statements to 0.9.0; historical references to earlier versions are unchanged.
- Removed the 0.7.0 to 0.8.0 migration guide from the draft; it belongs to the 0.8.0 release and remains in [`spec/0.8.0/guides/`](../0.8.0/guides/migration-0.7-to-0.8.md). Added the [0.8.0 to 0.9.0 migration guide](guides/migration-0.8-to-0.9.md).

#### Validation rules (review-stage Proposal 0024; subject to review and possible incompatible change or removal)

- Added a pilot validation rule registry: [`validation/rule.schema.json`](validation/rule.schema.json) and rule records under [`validation/rules/`](validation/rules/), initially covering Tool `outputSchema` availability and object root, Tool `inputSchema` object root, Tool schema keyword preservation, `x-mcp-header`, open Result properties, example result revision fidelity, completion example availability, and document schema validation. The registry is non-normative until the proposal is accepted and does not change document conformance.
- Documented MCP's sources of truth in [`validation/README.md`](validation/README.md): the revision's `schema.ts` for structures, its specification text for semantics, and generated JSON Schema, SEPs, and SDKs as evidence only. Rule records gain an optional `requirement` level; MCP rules at `should` or `may` level do not emit errors.
- Recorded the tension between dialect selection and the literal `type: "object"` root of `inputSchema` (MCP issue #3238) as an arbitration on `mcp.tool.input-schema.object-root`; validation is unchanged. Added fixture `expected-invalid/non-object-input-schema.json`.
- Recorded the "examples fail fast" principle in [`validation/README.md`](validation/README.md): incorrect examples are conformance errors rather than an optional linter concern, measured against MCP's own types. Fields an applicable revision allows but does not define are planned to be accepted with a warning; until then, the differences are recorded as rule gaps.
- Added fixtures `expected-invalid/output-schema-before-2025-06-18.json` and `expected-warning/open-result-unknown-properties.json` for revision boundaries not covered before.
- Diagnostics carry a `rule` property with the rule identifier, next to `code` (Proposal 0024, Section 5). A `schema-validation` diagnostic identifies a specific rule where the failing schema location does, otherwise `mcpdesc.document.schema`.
- Migration for diagnostic consumers: validator output gains the `rule` property. Tools, CI checks, and snapshot tests that compare whole diagnostic objects, or reject unknown diagnostic properties, must accept it or compare `code`, `severity`, `message`, and `path` only. In `@mcpdesc/core`, frozen diagnostic expectations change at the next validator snapshot intake. See the [0.8.0 to 0.9.0 migration guide](guides/migration-0.8-to-0.9.md).
- Rule inventory, first batch: registered Tool schema validity and legacy shape, `structuredContent` for Tools with `outputSchema`, Tool example schema conformance and error results, the completed-result form of examples, content-block, Resource Contents `_meta`, and Annotations `lastModified` revision availability. Added fixtures `expected-invalid/unsupported-tool-schema-dialect.json` and `expected-invalid/annotations-last-modified-before-2025-06-18.json`.
- Rule inventory completed: 58 rules declare all 88 diagnostic codes of the candidate validator, and every diagnostic identifies its rule. The registry test now fails on an undeclared code or an unattributed fixture diagnostic. Added fixtures `expected-invalid/duplicate-root-tag.json`, `meta-key-invalid.json`, `tasks-capability-2026.json`, `invalid-client-requirement-value.json`, `elicitation-form-schema-2025-06-18.json`, and `elicitation-form-invalid-range.json` for codes no fixture exercised.
- Rule records carry precise, immutable `locations`: line ranges in the vendored MCP `schema.ts`, permalinks to the MCP specification text at the pinned commit, section URLs for referenced standards, and requirement anchors in this specification. Every rule cites the MCP Description requirement it checks through an `<a id="req-<topic>">` anchor placed before the requirement sentence; 89 anchors were added across the sections. The validation README now lists the seven source tiers of Proposal 0024. Rule records separate the requirement from the evidence: the required `specification` field cites the MCP Description requirements and decisions a rule checks, and `sources` holds external evidence only, ranked in tiers 1 to 7, and may be omitted for `mcpdesc` rules. MCP Description is no longer ranked as a source tier. Fixture entries become `{ path, pointer }`, where the JSON Pointer selects the fragment that illustrates the rule. The registry test resolves every location, anchor, and pointer. These prerequisites let the rule documentation link each rule to its requirement and show focused examples.
- Two normative statements the validator already enforced are now explicit: Section 4.10 states, as a consequence of effective scopes, that a field marked as available since, or only in, an MCP revision must not appear in a declaration whose scope includes another revision; Section 10.4.6 states that Resource Template completion `context` is not defined for MCP 2025-03-26, as Section 11.4 already did for Prompts.
- Two rule references were truncated by an unquoted `#` in YAML and are now quoted.
- **Breaking for other validators:** Section 9.2 fixes the declared Tool-schema dialects to JSON Schema 2020-12 and draft-07 for MCP 2025-11-25 and later; any other declared dialect is an error (`unsupported-tool-schema-dialect`). In 0.8.0 the accepted set depended on the validator. The reference validator's results are unchanged. An unsupported dialect stays an error rather than a warning: MCP guarantees only 2020-12 support and requires peers to return an error for unsupported dialects, and Tool examples cannot be checked against such a schema.
- Inventory findings recorded in the registry: the pre-standard server `extensions` map for revisions before MCP 2026-07-28 is an explicit exception to closed server capabilities (arbitration on `mcp.capabilities.extensions.revision-availability`, Proposal 0021); no document currently produces `experimental-reserved-extension-identifier`, because the pinned extension catalogue lists no experimental identifiers.

#### Open MCP results in examples (review-stage Proposal 0026; subject to review and possible incompatible change or removal)

- Added [Section 3.6](sections/03-document-structure.md), Carried MCP Values. Example results and Tool Interaction step responses are validated for each applicable MCP revision against the type that revision's TypeScript schema defines. Former Sections 3.6 to 3.9 are renumbered 3.7 to 3.10.
- A field that an open MCP type allows but the revision does not define is now accepted, preserved without meaning, and reported with the warning `result-field-not-defined-by-version`. This replaces errors for `resultType` before MCP 2026-07-28 (Tool, Resource, Prompt, and completion examples), `ttlMs` and `cacheScope` before MCP 2026-07-28 (Resource examples), and `structuredContent` before MCP 2025-06-18 (Tool examples). Unknown field names that previously passed silently now produce the same warning.
- Declarations whose examples span MCP 2026-07-28 and an earlier revision no longer have to be split; splitting remains available to avoid the warnings (Sections 9.3, 10.4.4, 10.4.6, 11.3, and 11.4).
- Tool Interaction step responses for sampling, elicitation, and roots accept `_meta` and, with warnings, unknown fields through MCP 2025-11-25, where they extend MCP `Result`. For MCP 2026-07-28, where they are closed input responses, unknown fields are rejected with `interaction-example-version-mismatch`; `_meta` is accepted only on sampling responses. The schema now accepts additional properties on these responses and the validator enforces each revision's type.
- **Breaking:** the `completion` object of a completion example result is closed, as `CompleteResult.completion` is in every MCP revision; extra fields are rejected.
- Value constraints are unchanged and apply in every revision: when present, `resultType` is `"complete"`, `ttlMs` is non-negative, and `cacheScope` is `"public"` or `"private"`.
- Fixtures: added `expected-warning/open-results-shared-across-revisions.json`, `expected-warning/open-step-responses-before-2026.json`, `expected-invalid/closed-step-responses-2026.json`, and `expected-invalid/completion-result-extra-field.json`; moved `open-result-unknown-properties.json` and `component-protocol-scope.json` to `expected-warning`.
- Migration: no change is required for documents that remain valid. Variants split only because of `resultType`, `ttlMs`, or `cacheScope` MAY be merged. Extra fields inside `completion` objects must be removed or moved, for example to result `_meta`.

#### Closed MCP types (review-stage Proposal 0027; subject to review and possible incompatible change or removal)

- **Breaking:** Tool Annotations (Section 9.6) and Resource Annotations (Section 10.3), including annotations on content blocks, accept only the properties MCP defines. MCP's `ToolAnnotations` and `Annotations` types are closed in every revision; MCP Description 0.8.0 allowed additional properties, so projected values could fail MCP's schema. Unknown properties, including `x-*` keys, are now rejected with `schema-validation`.
- **Breaking:** client capability requirements (Section 8.5) accept only the client capabilities the applicable MCP revisions define, `experimental`, and from MCP 2026-07-28 `extensions`, plus `x-*` specification extensions. Unknown top-level members are rejected with `schema-validation`. MCP's `ClientCapabilities` and `ServerCapabilities` types are closed, while their doc comments say the set is "not a closed set"; the arbitration follows the types for both, with [MCP issue 1898](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1898) as the upstream reference. Server capabilities were already closed (Section 8.4). Rule records gain the arbitration status `proposed` for arbitrations awaiting a decision.
- Fixtures: added `expected-invalid/tool-annotations-unknown-property.json`, `expected-invalid/resource-annotations-unknown-property.json`, `expected-invalid/content-annotations-unknown-property.json`, `expected-invalid/unknown-server-capability.json`, and `expected-invalid/unknown-client-capability-requirement.json`; removed unknown properties from `expected-valid/distinct-tool-and-resource-annotations.json` and `expected-valid/client-capability-requirements.json`.
- Migration: remove unknown annotation properties. Server-defined metadata belongs in the declaration's `_meta` where the revision defines it, and MCP Description metadata in `x-*` properties on the declaration. Move unknown client capability requirements into `experimental` or, for MCP 2026-07-28, into `extensions`.

#### Native MCP projection (review-stage Proposal 0025; subject to review and possible incompatible change or removal)

- Added [Section 4.14](sections/04-versioning.md), Native MCP Projection: how a Tool, Resource, Resource Template, or Prompt declaration becomes the MCP value of `tools/list`, `resources/list`, `resources/templates/list`, or `prompts/list` for one revision. Projection keeps the fields the MCP type defines, unchanged after reference resolution, omits MCP Description metadata including `x-*` extensions on the declaration, its Prompt arguments, and its icons, never adds or rewrites a value, and checks the result against the pinned MCP schema. Sections 14.5 and 16.2 note that native projection omits specification extensions, unlike the Effective Protocol View.
- Added `projection-fixtures/`: 49 cases giving the exact expected value or failure for every kind, supported revision, and projection error, plus a list per kind, with source documents under `projection-fixtures/documents/` and the case format in `projection-fixtures/schema/projection-case.schema.json`. `scripts/test-projection-fixtures.mjs` checks them in `npm test` without implementing projection. The validator snapshot bundle now includes them.
- Added rule records `mcpdesc.projection.source-valid`, `mcpdesc.projection.declaration-applicable`, and `mcpdesc.projection.native-schema` (enforcement `external`, status `delegated`); rule fixtures may now name projection cases.
- Implementation: native projection belongs in `@mcpdesc/core`. No released version of `@mcpdesc/core` passes the projection fixtures yet.
- No document changes validity.

#### Validator corrections

- Every Resource Template `uriTemplate` is checked against RFC 6570, as Section 10.2.1 now states explicitly. Previously a malformed template was reported only when the template had examples or completion examples, once per example kind. The new error code `invalid-resource-template-uri-template` replaces `resource-template-example-invalid-template` and `resource-template-completion-example-invalid-template` and is reported once per template. Added fixture `expected-invalid/malformed-uri-template-without-examples.json`.
- Roots in Tool Interaction roots responses accept `_meta` from MCP 2025-06-18, where MCP `Root` defines it; earlier revisions reject it with `interaction-example-version-mismatch`. Previously `_meta` was rejected on roots in every revision. Added fixture `expected-invalid/root-meta-before-2025-06-18.json`.
- Reserved `_meta` key checks (Section 3.5) now also apply to Prompt example results and their message content, completion example results, Tool Interaction step responses, and roots. In MCP 2026-07-28, step responses are checked as client responses rather than results, so result-only keys such as `io.modelcontextprotocol/serverInfo` are rejected there. Added fixture `expected-invalid/meta-reserved-keys-in-carried-values.json`.
- Result `_meta` in Resource, Prompt, and completion examples is accepted for MCP 2024-11-05 and 2025-03-26, as it already was in Tool examples. MCP's `Result` defines `_meta` in every supported revision, and Section 3.5 already permitted it; Section 10.4.4 and the validator wrongly limited it to MCP 2025-06-18 and later. Resource Contents `_meta` remains limited to MCP 2025-06-18 and later. Added fixture `expected-warning/legacy-result-meta.json`.
- Sections 10.4.6 and 11.4 now state that MCP Description does not support completion examples for MCP 2024-11-05, matching existing validator behavior. MCP 2024-11-05 defines `completion/complete`, so the `completion-example-version-mismatch` message now says "not supported by MCP Description" instead of "not defined for MCP". The limitation was recorded in `validation/mcp-revisions.md`, now available in [How validation works](guides/understanding-mcp-protocol-versions.md#known-defects-not-fixed).
- Structural (`schema-validation`) diagnostic paths report array indices as numbers, consistent with semantic diagnostic paths. Previously, indices below the document root were reported as strings, for example `["tools", "0", "inputSchema"]`.

## [0.8.0+editorial.1] — 2026-10-19

### Documentation

- Addressed feedback about why MCP Description does not directly inherit the MCP `Tool`, `Resource`, and `Prompt` schemas with a concise [FAQ answer](guides/faq.md#why-not-inherit-and-extend-tool-resource-and-prompt-definitions-from-the-mcp-schema).
- Added a detailed [comparison with the MCP primitive schemas](guides/relationship-to-mcp-schemas.md), including shared fields, intentional differences, tradeoffs, and potential improvements for stronger machine-verifiable alignment.

### Security

- Updated the transitive development dependency `fast-uri` from 3.1.6 to 3.1.8, resolving the authority-bracket host-confusion vulnerability and all other advisories reported by `npm audit` for the dependency tree.

## [0.8.0] — 2026-09-09

Version 0.8 adds protocol-version-scoped declarations and deterministic views for each supported MCP protocol version.

It also introduces reusable components, richer examples and interaction scenarios, client capability requirements, elicitation declarations, extension support, and stronger validation across JSON and YAML documents.

The accepted proposals represented by this release are listed in the [0.8.0 proposal revision manifest](PROPOSALS.md).

### Breaking

- Removed `info.protocolVersion` and added required root `protocolVersions` using the closed set of MCP revisions whose semantics 0.8.0 validates (Proposal 0001).
- Changed root `capabilities` from one object to an array of protocol-scoped Capabilities Objects (Proposal 0001).
- Replaced inline security definitions with named root `securitySchemes` and Security Requirement Arrays (Proposal 0003).
- Required every Tool to contain an object-rooted `inputSchema` (Proposal 0001).

### Added

- MCP `2026-07-28` support and protocol applicability across transports, capabilities, and primitive declarations (Proposal 0001).
- Deterministic Effective Protocol Views with projection and conflict-detecting merge behavior (Proposal 0001).
- Root `instructions`, formal MCP extension declarations, and primitive `clientRequirements` (Proposals 0001, 0012).
- Named Tool, Resource, Resource Template, and Prompt examples, plus Tool interaction and completion examples (Proposals 0004, 0005, 0015, 0016, 0017).
- Reusable typed `components` referenced through local `$componentRef` objects (Proposal 0009).
- Operation-level elicitation declarations and object-level `x-*` specification extensions (Proposals 0007, 0011).
- JSON and restricted YAML serializations, canonical versioned schema URIs, and expanded semantic validation (Proposals 0010, 0019).

### Changed

- Defined the root Info Object as document-wide metadata independent of MCP protocol revisions, preserving all Info properties during migration and projection and removing runtime `Implementation` availability gates (Proposal 0022).
- Made `transports` optional and defined omission of an optional section as no declaration rather than evidence of runtime non-support (Proposal 0013).
- Required ordinary declaration collections to be non-empty when present and projection or merge to omit collections that become empty (Proposal 0013).
- Defined MCP 2025-06-18 as the floor for complete revision-specific semantic validation; older recognized revisions produce incomplete-validation diagnostics (Proposals 0001, 0002).
- Aligned Tool, Resource, Resource Template, Prompt, annotation, `_meta`, and extension validation with their applicable MCP revisions (Proposals 0001, 0002).
- Treated pre-standard or unrecognized MCP extension declarations and unresolved external Tool schema references as warning-and-preserve conditions (Proposals 0001, 0021).
- Distinguished MCP 2025-11-25 core Tasks from MCP 2026-07-28 Tasks extensions (Proposal 0001).
- Made active specification examples vendor-neutral and removed bundled vendor-specific extension metadata (editorial).

## [0.7.0] — 2026-03-23

### Changed
- **Simplified tags to flat structure** — removed hierarchical nesting. The Tag Object no longer includes a recursive `tags` property. All tags are now declared in a flat array at the root level.
- **Tag uniqueness requirement simplified** — tag names MUST be unique across all tags (previously "across the entire tag tree").
- **Tag reference validation simplified** — per-entity tags must reference tag names declared in the root `tags` array (no nesting levels to traverse).
- **Added `uniqueItems: true` constraint** to per-entity `tags` arrays on tools, resources, resource templates, and prompts to prevent duplicate tag references.

### Removed
- **Removed hierarchical tag support** — Tag Objects no longer support nested `tags` arrays. The tag taxonomy is now a simple flat list.

### Updated
- **Section 12 (Tags)** — completely rewritten to reflect flat tag structure. Removed hierarchical examples and references to "tag tree" and "nesting levels".
- **All examples** — converted from hierarchical tags to flat tag lists (stdio-server, http-server, full-featured examples in both JSON and YAML formats).

## [0.6.0] — 2026-03-20

### Removed
- **Removed the `metadata` object** from the root document structure. The `authors`, `documentation`, and `repository` fields are redundant with `info.contact` and `info.websiteUrl`, or belong in vendor extensions.
- **Removed the `lifecycle` object** from the root document structure. Server lifecycle management belongs in a server manifest or registry, not in a static capability description.

### Added
- **Root-level `tags` array** with structured Tag Objects (`name`, `description`, `tags`) replacing `metadata.tags`. Tags support hierarchical nesting via nested `tags` arrays (Option C). Tag names MUST be globally unique across the entire tree.
- **Tag reference validation requirement** — per-entity `tags` on tools, resources, resource templates, and prompts MUST reference tag names declared in the root `tags` array when present. Undeclared tag references are a validation error.

### Changed
- **Section 12** rewritten from "Metadata" to "Tags" — defines the Tag Object, uniqueness constraints, and tag reference semantics.
- **Sections 9, 10, 11** — per-entity `tags` description updated with normative cross-reference to Section 12.3 tag declaration requirement.
- **Section 3** root object table — `metadata` and `lifecycle` rows removed; `tags` row added.
- **Sections renumbered** — removal of lifecycle (formerly Section 12) shifts Tags to 12, Specification Extensions to 13, Serialization to 14, Conformance to 15.

## [0.5.2] — 2026-03-18

### Changed
- **Documented MCP `Implementation` type provenance in the Info Object** — `name`, `title`, `description`, `version`, `icons`, and `websiteUrl` are now explicitly traced to the MCP `Implementation` type returned in the `initialize` response (`serverInfo`), with protocol version annotations:
  - `title` — MCP `BaseMetadata`, since 2025-06-18
  - `description` — MCP `Implementation`, since 2025-11-25
  - `websiteUrl` — MCP `Implementation`, since 2025-11-25
  - `icons` — MCP `Implementation` (via `Icons` mixin), since 2025-11-25
- **Updated Info Object example** to include `icons` and `websiteUrl` fields
- **Clarified `contact` and `license`** as OpenAPI-style additions not present in the MCP `Implementation` type

## [0.5.1] — 2026-03-17

### Changed
- **Removed `_generated` from the core MCP Description specification** (`mcpdesc: "0.5.1"`), including the root object definition and current schema.
- **Updated Cisco extension to `x-cisco-metadata` v0.2.0 shape** with extension-level `version` and nested `dump` payload
- **Removed `_generated` from Cisco extension examples**, with provenance retained in `x-cisco-metadata.dump` (`toolName`, `toolVersion`, `createdAt`)

## [0.5.0] — 2026-03-17

### Changed
- **Renamed `transport` field to `transports`** (plural) for consistency with `tools`, `resources`, `prompts` and OpenAPI's `servers` — see [DECISION-001](../../docs/maintainers/design/mcp-description/DECISION-001-transports-array.md)
- **Added transport-scoped `security`** — each transport MAY include its own `security` array that overrides the root-level default (see Section 6.4)
- Root-level `security` is now the default; transport-level `security` overrides it (OpenAPI-style inheritance)

## [0.4.0] — 2026-03-16

### Added
- MCP 2025-11-25 support: icons, websiteUrl, task capabilities, tool execution properties
- Tool `outputSchema` with explicit `$schema` dialect support (MCP 2025-06-18+)
- Tool `execution.taskSupport` property for task-augmented execution (MCP 2025-11-25 only)
- `icons` definition for server, tools, resources, resource templates, and prompts
- `capabilities.tasks` for task-augmented request support
- `capabilities.completions` and `capabilities.logging` declarations

### Changed
- **Renamed `mcpspec` field to `mcpdesc`** to clearly distinguish the description format version from the MCP protocol specification version
- `protocolVersion` enum now includes `2025-11-25`
- Tool `annotations` now supports `additionalProperties` for forward compatibility

## [0.3.0] — 2026-01-15

### Added
- `title` field on all MCP entities (BaseMetadata, since MCP 2025-06-18)
- Tool `outputSchema` for structured tool output
- `_meta` protocol-reserved metadata on tools, resources, resource templates, and prompts
- `tags` for categorization on tools, resources, resource templates, and prompts
- `deprecated` flag on tools, resources, resource templates, and prompts

### Changed
- Aligned more closely with MCP 2025-06-18 protocol structures

## [0.1.0] — 2025-11-01

### Added
- Initial specification draft
- Core document structure: `mcpspec`, `info`, `transport`, `tools`, `resources`, `resourceTemplates`, `prompts`
- Transport definitions: `streamable-http`, `stdio`, `sse`
- Security schemes aligned with OpenAPI 3.1
- `capabilities` object from MCP InitializeResult
- `metadata` for authors, documentation, repository, tags
- `_generated` provenance tracking
- Specification extension mechanism (`x-` prefix)
- `anyOf` constraint requiring at least one of tools, resources, resourceTemplates, or prompts
