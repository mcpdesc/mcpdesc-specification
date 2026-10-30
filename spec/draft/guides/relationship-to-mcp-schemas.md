# Relationship to the MCP Primitive Schemas

## Summary

MCP Description aligns its Tool, Resource, and Prompt Objects with the corresponding MCP protocol types, but does not inherit those types through external JSON Schema references.

This is a deliberate separation of contracts. The MCP schema defines values exchanged for one protocol revision. MCP Description defines a static document that can describe several protocol revisions, add description-only metadata, use local reusable components, and remain independently versioned and usable offline.

MCP remains authoritative for the meaning and revision applicability of every MCP-derived field. MCP Description does not redefine the protocol merely because it represents those fields in its own schema.

## Comparison Baseline

The tables below compare MCP Description 0.9.0 with the MCP 2026-07-28 JSON Schema. They compare declaration fields, not JSON-RPC request, result, pagination, caching, or notification envelopes.

MCP Description 0.9.0 also supports MCP revisions 2024-11-05, 2025-03-26, 2025-06-18, and 2025-11-25. A field shown in the 2026-07-28 MCP column may therefore be restricted or unavailable in an earlier Effective Protocol View. Conversely, `execution` represents a Tool field from MCP 2025-11-25 that is not part of the MCP 2026-07-28 core Tool type.

### Tool fields

| Field | MCP 2026-07-28 | mcpdesc 0.9.0 | Explanation and tradeoffs |
|-------|----------------|---------------|---------------------------|
| `name` | Required string | Required non-empty string | Shared identity. Requiring a non-empty value gives static tooling a usable identifier but is stricter than the MCP schema's structural constraint. |
| `title` | Optional string | Optional string | Shared display title. mcpdesc additionally validates protocol-revision applicability. |
| `description` | Optional string | Optional string | Shared human-readable description. |
| `inputSchema` | Required inline JSON Schema object with an object root | Required inline JSON Schema or local `$componentRef` whose root describes an object after resolution; from MCP 2025-11-25 a root without a literal `type: "object"` is valid with a warning | Local reuse avoids duplicating schemas. A Reference Object is not itself valid against MCP's inline `inputSchema`, so this is not a purely additive extension. Native MCP projection must resolve the component, and fails for a revision whose `Tool` type rejects the resolved schema. |
| `outputSchema` | Optional inline JSON Schema object; any schema root is allowed | Optional inline JSON Schema or local `$componentRef`; root rules depend on the effective MCP revision | Reuse and multi-revision validation are benefits. Consumers must resolve a component before producing a native MCP Tool. |
| `annotations` | Optional Tool Annotations | Optional Tool Annotations | Shared MCP hints. Closed, as in MCP; MCP Description 0.8.0 allowed additional properties. |
| `icons` | Optional array of Icon values | Optional non-empty array of Icon values | Shared MCP field. mcpdesc excludes an explicitly empty collection because omission has the same static meaning. This is more canonical but stricter. |
| `_meta` | Optional MCP metadata object | Optional MCP metadata object | Shared literal MCP metadata. mcpdesc adds revision-aware key and reserved-namespace validation. |
| `protocolVersions` | Not a Tool field | Optional non-empty revision scope | Allows one document to carry disjoint Tool variants for several MCP revisions. It is removed when projecting a native MCP value. |
| `execution` | Not in the 2026-07-28 core Tool type | Optional; applicable only to MCP 2025-11-25 | Preserves an earlier revision's Tool semantics. It demonstrates why one latest-version base schema cannot describe every supported view. |
| `examples` | Not a Tool field | Optional named invocation/result examples | Supports documentation, contract testing, and deterministic mocks. Examples are illustrative and are omitted from native MCP Tool projection. |
| `interactionExamples` | Not a Tool field | Optional named multi-step examples | Describes elicitation, sampling, and roots interactions without encoding JSON-RPC choreography. It adds documentation value but requires mcpdesc-aware tooling. |
| `tags` | Not a Tool field | Optional non-empty tag-name array | Provides document-wide categorization for grouping or filtering documentation purpose. It has no native MCP projection. |
| `elicitations` | Not a Tool field | Optional non-empty declaration array | Statically documents possible user interactions. It does not execute or replace MCP elicitation. |
| `deprecated` | Not a Tool field | Optional boolean | Records lifecycle status for documentation and governance. It has no native MCP projection. |
| `security` | Not a Tool field | Optional Security Requirement Array | Describes statically known authorization requirements. It does not enforce authorization or override MCP security rules. |
| `clientRequirements` | Not a Tool field | Optional client-capability requirements | Describes unconditional minimum client capabilities for calling the Tool. MCP still controls runtime capability advertisement and enforcement. |

### Resource fields

| Field | MCP 2026-07-28 | mcpdesc 0.9.0 | Explanation and tradeoffs |
|-------|----------------|---------------|---------------------------|
| `uri` | Required string with `uri` format | Required string; the specification says it should be a valid URI | Shared resource identity. The weaker structural constraint of mcpdesc accommodates custom URI schemes and permissive tooling, but reduces schema-only validation. |
| `name` | Required string | Required string | Shared programmatic name. |
| `title` | Optional string | Optional string | Shared display title with revision-aware applicability in mcpdesc. |
| `description` | Optional string | Optional string | Shared human-readable description. |
| `mimeType` | Optional string | Optional string | Shared media-type hint. |
| `size` | Optional integer | Optional number | Shared raw-content size concept. The mcpdesc type is unnecessarily broader than the current MCP type and is a candidate for future alignment. |
| `annotations` | Optional Resource Annotations | Optional Resource Annotations | Shared audience, priority, and modification-time hints. mcpdesc validates their revision applicability. |
| `icons` | Optional array of Icon values | Optional non-empty array of Icon values | Shared MCP field. Rejecting an empty array gives mcpdesc one canonical static representation but is stricter. |
| `_meta` | Optional MCP metadata object | Optional MCP metadata object | Shared literal MCP metadata with revision-aware mcpdesc validation. |
| `protocolVersions` | Not a Resource field | Optional non-empty revision scope | Supports disjoint Resource variants across MCP revisions; omitted from native projection. |
| `examples` | Not a Resource field | Optional named completed read examples | Supports documentation, tests, and mocks while preserving native Resource Contents. It does not guarantee live content or freshness. |
| `tags` | Not a Resource field | Optional non-empty tag-name array | Adds static categorization for grouping or filtering documentation purpose with no native MCP projection. |
| `elicitations` | Not a Resource field | Optional non-empty declaration array | Documents possible user interaction needed to read the Resource without defining runtime flow. |
| `deprecated` | Not a Resource field | Optional boolean | Adds lifecycle metadata with no native MCP projection. |
| `security` | Not a Resource field | Optional Security Requirement Array | Describes statically known read authorization; runtime enforcement remains authoritative. |
| `clientRequirements` | Not a Resource field | Optional client-capability requirements | Describes unconditional minimum client capabilities for reading the Resource. |

Resource Template Objects follow the same design. Their MCP-derived fields are `uriTemplate`, `name`, `title`, `description`, `mimeType`, `annotations`, `icons`, and `_meta`; MCP Description adds protocol scope and supplemental static metadata such as examples, completion examples, security, tags, and client requirements.

### Prompt fields

| Field | MCP 2026-07-28 | mcpdesc 0.9.0 | Explanation and tradeoffs |
|-------|----------------|---------------|---------------------------|
| `name` | Required string | Required string | Shared programmatic identity. |
| `title` | Optional string | Optional string | Shared display title with revision-aware applicability in mcpdesc. |
| `description` | Optional string | Optional string | Shared human-readable description. |
| `arguments` | Optional array of Prompt Argument values, including an empty array | Optional non-empty array of Prompt Argument values | Prompt Argument fields (`name`, `title`, `description`, and `required`) are shared. mcpdesc uses omission instead of an empty array as the canonical no-argument form. |
| `icons` | Optional array of Icon values | Optional non-empty array of Icon values | Shared MCP field. The mcpdesc non-empty rule is canonical but stricter. |
| `_meta` | Optional MCP metadata object | Optional MCP metadata object | Shared literal MCP metadata with revision-aware mcpdesc validation. |
| `protocolVersions` | Not a Prompt field | Optional non-empty revision scope | Supports disjoint Prompt variants across revisions; omitted from native projection. |
| `examples` | Not a Prompt field | Optional named invocation/result examples | Supports documentation, contract tests, and mocks. It has no native MCP Prompt field. |
| `completionExamples` | Not a Prompt field | Optional named completion examples | Documents observed completion behavior without asserting capability advertisement or future availability. |
| `tags` | Not a Prompt field | Optional non-empty tag-name array | Adds static categorization for grouping or filtering documentation purpose with no native MCP projection. |
| `elicitations` | Not a Prompt field | Optional non-empty declaration array | Documents possible user interaction needed to retrieve the Prompt. |
| `deprecated` | Not a Prompt field | Optional boolean | Adds lifecycle metadata with no native MCP projection. |
| `security` | Not a Prompt field | Optional Security Requirement Array | Describes statically known retrieval authorization; runtime enforcement remains authoritative. |
| `clientRequirements` | Not a Prompt field | Optional client-capability requirements | Describes unconditional minimum client capabilities for retrieving the Prompt. |

### Object-level constraints

| Constraint | MCP 2026-07-28 | mcpdesc 0.9.0 | Explanation and tradeoffs |
|------------|----------------|---------------|---------------------------|
| Unknown declaration fields | Core Tool, Resource, and Prompt schemas are open | Objects are closed except for eligible `x-*` properties | MCP favors runtime forward compatibility. mcpdesc favors deterministic static interpretation and an explicit extension mechanism. |
| Empty optional collections | Generally structurally accepted | Most optional collections must be non-empty when present | Omission provides a canonical representation, simplifying comparison and merge behavior at the cost of accepting fewer wire-valid shapes. |
| Protocol applicability | Fixed by the selected MCP schema revision | Selected from each declaration's Effective Protocol View | mcpdesc can describe multiple revisions but requires semantic validation beyond one structural schema. |
| Native projection | The value is already an MCP value | Supplemental fields are omitted and component references are resolved | Projection enables protocol interoperability, but it is an explicit transformation rather than identity. |

## Why External Schema Inheritance Is Not Used

### One document can describe several MCP revisions

An external reference such as `.../2026-07-28/schema.json#/$defs/Tool` selects one protocol revision. An MCP Description can describe five revisions and can contain separate declarations of the same primitive with disjoint revision scopes. The applicable MCP constraints therefore depend on the Effective Protocol View, not only on the document's structural location.

No single latest MCP schema is a correct base for every declaration. Referencing all supported revisions conditionally would also leave cross-declaration scope, uniqueness, projection, and merge rules to semantic validation.

### The mcpdesc shape is not always a strict extension

JSON Schema `allOf` intersects constraints; it cannot weaken or replace a constraint from a referenced schema. The clearest example is Tool `inputSchema`: MCP 2026-07-28 requires an inline object-rooted JSON Schema, while mcpdesc also permits a whole-value `$componentRef`. A reference object cannot satisfy that MCP branch merely because another `allOf` branch permits it.

The formats also differ in object closure and canonical empty-collection rules. These are contract choices, not additional properties that can always be layered onto an unchanged base.

### Stable mcpdesc schemas must be immutable and offline-usable

A stable mcpdesc schema has an immutable identity and exact published bytes. A normative external dependency would additionally require immutable MCP schema URLs, availability guarantees, resolver behavior, caching and security policy, and consistent support across JSON Schema implementations.

Vendoring pinned MCP schemas could address availability, but it would still require provenance, license preservation, update review, and a larger canonical package. It would not eliminate the need for a new mcpdesc release when a new MCP revision introduces relevant semantics.

### New MCP fields require classification, not automatic adoption

Automatic inheritance would accept new upstream properties without defining their static meaning, revision applicability, projection behavior, merge behavior, or interaction with mcpdesc metadata. Instead, each MCP revision is reviewed and changes are classified as:

- durable declaration semantics that should be represented;
- runtime request, result, notification, caching, or routing details that belong only in examples or not in mcpdesc core;
- extension-specific behavior that should remain in an MCP extension namespace; or
- behavior requiring a new mcpdesc proposal and compatibility analysis.

This review costs maintenance effort, but it keeps acceptance deliberate and testable.

## Potential Improvements

The independent-schema design does not prevent stronger, machine-verifiable alignment with MCP. The following improvements could be considered for a future mcpdesc version or tooling release.

| Improvement | Benefit | Cost or open question |
|-------------|---------|-----------------------|
| Maintain a manifest of supported MCP schema sources and cryptographic digests | Makes the exact comparison baseline reproducible and auditable | Requires a policy for upstream corrections, mirrors, licensing, and unavailable sources. |
| Add an automated upstream schema-diff report for Tool, Resource, Resource Template, Prompt, annotations, icons, and related embedded types | Detects added, removed, and changed MCP fields early without accepting them automatically | Generated diffs still require semantic review and may be noisy when upstream schemas are refactored without changing behavior. |
| Add conformance tests that project mcpdesc declarations to native MCP values and validate them against bundled, pinned MCP schemas | Provides the interoperability benefit requested by MCP tooling while retaining mcpdesc's source model | Requires a normative or well-specified native projection, component resolution, and one pinned schema per supported revision. |
| Publish optional per-revision interoperability schemas or overlays | Lets generic JSON Schema tooling check the MCP-derived portion of one Effective Protocol View | Must not be confused with the canonical mcpdesc schema and may depend on uneven support for external references and `unevaluatedProperties`. |
| Define a machine-readable field-origin map | Allows documentation and tooling to identify MCP-derived, mcpdesc-only, and revision-specific fields | Adds another synchronized artifact and needs stable identifiers for upstream definitions. |
| Align Resource `size` with MCP's integer constraint | Removes an unnecessary type difference and improves native projection confidence | Tightening the type is a compatibility change and belongs in a future specification version. |
| Evaluate applying `format: "uri"` to Resource `uri` | Improves schema-only alignment and diagnostics | URI format assertion behavior varies by validator; the project must confirm that intended custom schemes remain valid and decide whether format is assertion or annotation. |
| Document intentional constraint differences in schema descriptions | Makes generated schema documentation more self-explanatory | Increases synchronization work and does not replace the detailed rationale in this guide. |

The most practical first step is a drift report plus projection-based conformance tests. Together they detect upstream changes and prove that an applicable mcpdesc declaration can become a valid native MCP value, without making a mutable external schema part of the canonical mcpdesc validation contract.

## Further Reading

- [Relationship to the MCP Protocol](relationship-to-mcp.md)
- [Frequently Asked Questions](faq.md)
- [MCP Description 0.9.0 Tools](../mcp-description.md#9-tools)
- [MCP Description 0.9.0 Resources and Resource Templates](../mcp-description.md#10-resources-and-resource-templates)
- [MCP Description 0.9.0 Prompts](../mcp-description.md#11-prompts)
- [MCP 2026-07-28 JSON Schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.json)