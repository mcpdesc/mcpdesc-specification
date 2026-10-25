# Validation

This folder collects the material MCP Description uses to validate documents
against the MCP protocol revisions they describe. It exists because MCP
Description 0.9.0 makes protocol alignment explicit: every MCP-related
validation behavior should state who owns it, which MCP revisions it applies to,
where it comes from, and how it is tested.

Status: pilot for the 0.9.0 working draft, implementing draft
[Proposal 0024](../../../proposals/0024-validation-rule-identity-and-provenance.md).
The content is non-normative until that proposal is accepted. The candidate
validator does not consume the registry yet. Design background is tracked in
[issue #72](https://github.com/mcpdesc/mcpdesc-specification/issues/72).

## Layout

| Path | Content | Status |
| --- | --- | --- |
| [`mcp-revisions.md`](mcp-revisions.md) | Introductory guide to how MCP structures used by MCP Description differ across supported protocol revisions | Initial version |
| [`rule.schema.json`](rule.schema.json) | JSON Schema for rule registry files | Pilot |
| [`rules/`](rules/) | Validation rule records in YAML, one file per surface (Tool, Result, Capabilities, MCP Description core) | Pilot: seven rules; checked by `scripts/test-validation-rules.mjs` |
| `mcp-schemas/` | Byte-identical copies of the official MCP schemas for supported revisions, with a provenance manifest (repository, path, commit, SHA-256, license) | Planned |

The folder is part of the versioned specification: it is frozen with each
release, so the rules and pinned MCP schemas used by a release never change
after publication.

## Ownership model

Every validated structure has exactly one owner:

| Owner | Examples | Authority | Unknown fields |
| --- | --- | --- | --- |
| MCP Description | `info`, transports, security, tags, examples, protocol scoping, components | This specification | As defined by MCP Description |
| MCP | Tool, Resource, ResourceTemplate, Prompt, capabilities, results, annotations, `_meta` | The applicable MCP revision | As permitted by that revision |
| Embedded standard | Tool `inputSchema` and `outputSchema` (JSON Schema) | The declared or default dialect, plus semantics the MCP revision adds | As defined by the dialect |

Knowing a field is not the same as the field being defined for a revision. A
name that a later MCP revision standardizes is not invalid in an earlier
revision whose structure permits it; it is preserved without the later
semantics. See also [Examples fail fast](#examples-fail-fast).

Whether an MCP structure permits unknown fields is read from MCP's TypeScript
schema: a type is open only if it declares or inherits an index signature, such
as `Result`. Fields of an open type that a revision does not define are
preserved and are not interpreted beyond their presence. The generated MCP JSON
Schema accepts unlisted properties for every type and is not evidence of
openness.

## Examples fail fast

Examples are validated as part of conformance. An example that does not match
the declaration it illustrates, or the completed result of every applicable MCP
revision, makes the document invalid. Example correctness is not delegated to an
optional linter or to severities chosen per organization.

Rationale: in the OpenAPI ecosystem, documents commonly validate while their
examples do not. The resulting misleading documentation rarely gets fixed,
and consumers build workarounds around it. Failing when an example is
introduced or its declaration changes forces the fix at the source.

"Incorrect" is measured against MCP's own types. For each applicable revision,
the validator classifies every field of an example result:

| Field | Outcome |
| --- | --- |
| Defined by the revision, valid | Accepted |
| Defined by the revision, missing when required or invalid | Error |
| Not defined by the revision, on an open type such as `Result` | Accepted, preserved without meaning, warning |
| Not defined by the revision, on a closed type | Error |

For example, `resultType` in a result for MCP 2025-11-25 is allowed by the open
`Result` but has no meaning there, so it produces a warning. The warning applies
even when the same example also serves MCP 2026-07-28, where `resultType` is
required. Authors may accept the warning or split the declaration into
protocol-scoped variants with separate examples. Unknown names such as a vendor
field are treated the same way; MCP's extension point for such data is `_meta`.

Warnings are attributed to a revision, so the warnings for a document equal the
union of the warnings for its per-revision Effective Protocol Views. Linters
may add style and quality rules, but they do not relax example validity.

Decided 2026-10-25 under
[issue #72](https://github.com/mcpdesc/mcpdesc-specification/issues/72),
replacing a short-lived direction that would have moved example consistency to
a linter. The warning outcome is not implemented yet; it is planned for the
openness proposal, and current differences are recorded as rule gaps. Historical
revisions keep current behavior.

## Rule records

Each validation rule has a permanent identifier and a record:

| Field | Meaning |
| --- | --- |
| `id` | Permanent, owner-namespaced identifier, for example `mcp.tool.output-schema.object-root`. Never reused; retired identifiers stay reserved. Protocol revisions are not part of the identifier. |
| `owner` | `mcp`, `mcpdesc`, or the embedded standard |
| `surface`, `path` | Native type and field the rule applies to |
| `kind` | structural, semantic, projection, preservation, embedded-standard, mcpdesc-semantic, or interoperability |
| `applicability` | Behavior per supported MCP revision |
| `sources` | Normative MCP text, official schema, or other evidence, by authority tier |
| `diagnostics` | Diagnostic codes emitted |
| `enforcement` | Internal check, official schema, or external validator |
| `status` | internal, externally-verified, delegated, arbitrated, or retired |
| `fixtures` | Tests covering each revision boundary |
| `gaps` | Known differences from current validator behavior: `planned` for correction, or `not-fixed` for historical revisions |

Rules are anchored to the MCP type, not to where MCP Description carries it.
For example, one rule covers `Annotations.lastModified` wherever annotations
appear. Rulesets such as `mcpdesc.mcp.2026-07-28` group rules for one Effective
Protocol View without redefining them.

When authoritative sources disagree, MCP Description records an explicit
arbitration: the conflicting sources, the chosen authority (normative MCP text
by default), the rationale, an upstream reference, and when to revisit it.
