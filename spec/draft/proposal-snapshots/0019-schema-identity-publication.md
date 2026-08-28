# Proposal 0019: Versioned Schema Identity and Publication

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-28
- Target version: 0.8.0 Draft 4
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/47
- Review period: 2026-08-28 through 2026-09-27

## Summary

Define format-qualified, immutable, and publicly retrievable JSON Schema identities for MCP Description and related formats. MCP Description 0.8.0 Draft 4 becomes the first draft snapshot whose schema `$id` uniquely identifies its exact schema resource:

`https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json`

The eventual stable 0.8.0 schema uses:

`https://mcpdesc.org/schema/mcp-description/0.8.0.json`

An independent format uses its own schema family. If Proposal 0018 is accepted, MCP Description Derivation 0.1.0 uses:

`https://mcpdesc.org/schema/mcpdesc-derivation/0.1.0.json`

Canonical schema resources are immutable and self-identifying. Mutable convenience aliases may redirect to canonical resources but are not canonical schema identities.

## Problem

The current 0.8.0 draft schema uses `https://mcpdesc.org/schema/0.8.0.json` as its `$id`. As of 2026-08-28, that URL returns the mcpdesc.org HTML application with HTTP 200 rather than JSON Schema. Generic editors and schema tools therefore cannot retrieve the schema named by MCP Description examples.

Draft 1, Draft 2, and Draft 3 also contain different schema bytes while sharing that `$id`. A JSON Schema `$id` identifies a schema resource, so one URI cannot unambiguously identify all three snapshots. Reusing it for stable 0.8.0 would create a fourth incompatible meaning.

Stable 0.7.0 retains its original Cisco `$id`, `https://developer.cisco.com/mcp-description/schema/0.7.0`, which currently returns 404. Published 0.7.0 and Draft 1-3 artifacts are immutable and cannot be repaired by editing their embedded identifiers.

The project also needs room for independent formats. A path containing only `0.8.0.json` makes MCP Description an implicit default and does not establish a coherent namespace for MCP Description Derivation or future formats.

## Goals

- Give every stable format version one immutable canonical schema URI.
- Give every public draft snapshot from Draft 4 onward one immutable canonical schema URI.
- Make each canonical URI return the exact schema that declares that URI as `$id`.
- Separate MCP Description and independent companion-format schema families.
- Distinguish document format versions, schema resource identities, and JSON Schema dialects.
- Permit convenient `latest` and active-draft aliases without treating them as immutable identities.
- Preserve frozen 0.7.0 and Draft 1-3 artifacts byte for byte.
- Define honest archival publication for schema artifacts with historical identifier limitations.
- Keep network retrieval optional for conformance validators.

## Non-goals

- Change MCP Description 0.8.0 conformance semantics other than its optional `$schema` authoring value.
- Change the `mcpdesc: 0.8.0` document discriminator for Draft 4.
- Rewrite stable 0.7.0 or published Draft 1-3 schemas, examples, validator snapshots, or tags.
- Make `mcpdesc.org` availability a prerequisite for offline validation.
- Define MCP Description Derivation structure; Proposal 0018 owns that format.
- Establish schema signing, transparency logs, or a general schema registry protocol.
- Require consumers to follow arbitrary schema URLs found in untrusted documents.

## Background and primary references

- JSON Schema Core 2020-12, identifiers and references: https://json-schema.org/draft/2020-12/json-schema-core
- JSON Schema media type: https://www.iana.org/assignments/media-types/application/schema+json
- OpenAPI 3.1 schema publication: https://spec.openapis.org/oas/3.1/schema/2025-09-15
- MCP Server Card schema source: https://github.com/modelcontextprotocol/ext-server-card
- MCP Description serialization proposal: https://github.com/mcpdesc/mcpdesc-specification/pull/30
- MCP Description release and snapshot governance: `GOVERNANCE.md`
- Related deliberation: https://github.com/mcpdesc/mcpdesc-specification/issues/47

OpenAPI separates the root `openapi` version from the canonical URI of a particular published schema. The MCP Server Card draft similarly requires a format-specific, versioned `$schema` URL. The exact path grammar differs, but both precedents avoid a reverse-DNS format object and use explicit schema resources.

## Proposed normative behavior

### 1. Identifier roles

An instance document's `$schema` property identifies the JSON Schema against which its normalized JSON-compatible data model can be structurally validated. It does not replace the instance format discriminator.

The instance `$schema` property remains optional. When present, it SHOULD identify the exact stable version or public draft snapshot used to produce or validate the document. Its omission does not make an otherwise conforming document invalid; a validator selects an applicable bundled schema through its API, surrounding metadata, or explicit user configuration.

The schema document's `$id` identifies that schema resource and establishes its base URI for JSON Schema reference resolution.

The schema document's own `$schema` property identifies the JSON Schema dialect used to interpret the schema. MCP Description 0.8.0 schemas use `https://json-schema.org/draft/2020-12/schema`.

For example:

```yaml
$schema: https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json
mcpdesc: 0.8.0
```

The snapshot label in `$schema` does not change the MCP Description conformance version. Draft 4 documents remain `mcpdesc: 0.8.0`.

### 2. Canonical schema URI families

The project controls canonical schema URIs under:

`https://mcpdesc.org/schema/<format-family>/<version-or-snapshot>.json`

This proposal assigns `mcp-description` as the MCP Description format family.

A stable MCP Description release uses its semantic version:

`https://mcpdesc.org/schema/mcp-description/0.8.0.json`

A public draft snapshot uses the unchanged target version followed by its draft iteration:

`https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json`

If Proposal 0018 is accepted with the `mcpdesc-derivation` discriminator, its schema family is `mcpdesc-derivation`:

`https://mcpdesc.org/schema/mcpdesc-derivation/0.1.0.json`

Assigning a new schema family requires an accepted specification decision. Similar names, redirects, or repository directories do not create format authority.

### 3. Unique and immutable resources

Every canonical URI MUST identify exactly one immutable sequence of schema bytes. A schema published at a canonical URI MUST declare that exact URI as its root `$id`.

Once publicly published, a canonical resource MUST NOT be replaced with different bytes, even to correct an error or non-normative description. Every byte change requires a new format version, draft snapshot, or explicitly versioned errata resource according to the governing format's compatibility policy.

Draft 4 and every later public draft snapshot MUST use a snapshot-specific `$id`. The eventual stable 0.8.0 schema MUST use the stable URI and MUST NOT reuse the legacy short URI or any draft URI.

The repository path need not equal the public URL path. Release tooling MUST nevertheless verify that the intended repository artifact, embedded `$id`, publication URL, and recorded digest agree.

### 4. Live publication

A canonical mcpdesc.org schema URI MUST:

- use HTTPS;
- return HTTP 200 for `GET`;
- return a syntactically valid JSON Schema document, not an HTML fallback;
- return the exact immutable bytes recorded by the corresponding repository snapshot or release;
- return `Content-Type: application/schema+json`; publication tooling MAY accept `application/json` only as a documented temporary hosting limitation;
- declare its request URI as root `$id`;
- permit cross-origin `GET` access for browser-hosted editors and tools; and
- return `Cache-Control: public, max-age=31536000, immutable`.

Canonical resources MUST be served directly at their canonical URI. Redirects are reserved for convenience aliases. This avoids disagreement between retrieval URI, redirect target, and the root `$id` used as the JSON Schema base URI.

Canonical responses SHOULD include a strong `ETag`. Publication validation MUST check status, absence of redirects, media type, JSON parsing, JSON Schema dialect, root `$id`, response-body byte digest, cache policy, cross-origin access, and absence of an HTML fallback. Response headers are publication metadata and do not participate in schema byte identity.

### 5. Convenience aliases

The project MAY publish mutable convenience aliases such as:

- `https://mcpdesc.org/schema/mcp-description/latest.json` for the latest stable release; and
- `https://mcpdesc.org/schema/mcp-description/draft.json` for the active community draft.

An alias SHOULD redirect to the selected immutable canonical resource. It MUST NOT be declared as a schema `$id`, and normative examples and generated documents SHOULD use immutable canonical URIs instead. Changing an alias target does not change the bytes or identity of any canonical resource.

The repository metadata files `schemas/latest.json` and `schemas/draft.json` remain version-status manifests. They are not MCP Description JSON Schemas and are not public schema identities. During Draft 4 implementation, the current `schemas/draft.json` metadata property named `$id` MUST be renamed to `schemaId` so generic JSON Schema tooling does not mistake the manifest for the identified MCP Description schema. The active draft remains selected by reviewed repository and release metadata, not by a mutable public schema identity.

### 6. Legacy Draft 1-3 treatment

Stable 0.7.0 and published Draft 1-3 artifacts MUST remain byte-for-byte unchanged.

The project SHOULD publish the exact Draft 3 schema permanently at `https://mcpdesc.org/schema/0.8.0.json`. Draft 3 is selected because it is the final snapshot whose examples use that legacy URI. The URI MUST NOT later be repointed to stable 0.8.0.

The project MAY publish exact Draft 1-3 bytes at archival retrieval URLs:

- `https://mcpdesc.org/schema/mcp-description/0.8.0-draft.1.json`;
- `https://mcpdesc.org/schema/mcp-description/0.8.0-draft.2.json`; and
- `https://mcpdesc.org/schema/mcp-description/0.8.0-draft.3.json`.

Those archival copies retain the shared legacy `$id` embedded in their frozen bytes. They are retrieval mirrors, not corrected self-identifying canonical schema resources. Documentation MUST disclose that Draft 1 and Draft 2 cannot have both frozen bytes and unique embedded `$id` values. Bundled validator selectors remain the authoritative byte-exact validation mechanism for those snapshots.

Because the embedded `$id` establishes the JSON Schema base URI, generic tooling loading one of these archival URLs still registers the resource under the shared legacy `$id`. Consumers MUST NOT treat the archival request URL as a corrected schema identity or combine multiple Draft 1-3 archives in one schema registry under their embedded `$id`. Use explicit `0.8.0-draft.1`, `0.8.0-draft.2`, or `0.8.0-draft.3` validator selectors for byte-exact historical validation.

The legacy short URI resolves to Draft 3 as the latest and final snapshot that embedded it, not because it can identify Draft 1-3 unambiguously. Tooling MUST NOT infer a Draft 1 or Draft 2 selector solely from that URI and MUST NOT rewrite it to Draft 4 or stable 0.8.0 without explicit user intent.

### 7. Stable 0.7.0 treatment

The stable 0.7.0 schema retains `https://developer.cisco.com/mcp-description/schema/0.7.0` as its embedded historical `$id` and retains Cisco Open as its canonical source.

The project MAY publish its exact bytes at `https://mcpdesc.org/schema/mcp-description/0.7.0.json` as an archival mirror. Because the frozen schema's embedded `$id` remains the Cisco URI, the mcpdesc.org URL is a retrieval location and MUST NOT be described as a corrected canonical identity.

The mirror MUST NOT alter attribution, licensing, schema content, or origin records.

### 8. Retrieval and security boundary

MCP Description conformance MUST NOT require network retrieval. A validator MAY bundle known schema resources and resolve their canonical URIs locally.

Consumers MUST NOT automatically retrieve an arbitrary `$schema` URI from an untrusted document without an explicit network policy. Implementations that allow retrieval SHOULD restrict schemes and destinations, bound response size and redirects, validate media type and schema structure, and mitigate SSRF and cache-poisoning risks.

The `$schema` property assists schema selection and editor integration. It does not make a structurally valid document semantically conforming and does not supersede protocol-revision or cross-object validation.

## Schema impact

Draft 4 changes the active MCP Description schema root `$id` to:

`https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json`

Draft 4 examples and fixtures that include `$schema` use the same URI. The root `mcpdesc` constant remains `0.8.0`.

The eventual stable release process changes the active schema `$id` and instance `$schema` examples to:

`https://mcpdesc.org/schema/mcp-description/0.8.0.json`

Proposal 0018 independently defines whether MCP Description Derivation is accepted. If accepted, its schema uses its own format-family URI and does not modify the MCP Description core schema.

## Examples

### Draft 4 MCP Description

```yaml
$schema: https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json
mcpdesc: 0.8.0
info:
  name: example-server
  version: 1.0.0
protocolVersions:
  - '2026-07-28'
```

The referenced schema begins:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json",
  "title": "MCP Description"
}
```

### Stable MCP Description 0.8.0

```yaml
$schema: https://mcpdesc.org/schema/mcp-description/0.8.0.json
mcpdesc: 0.8.0
```

### Independent derivation format

If Proposal 0018 is accepted:

```yaml
$schema: https://mcpdesc.org/schema/mcpdesc-derivation/0.1.0.json
mcpdesc-derivation: 0.1.0
```

The two root fields identify different things: `$schema` identifies one structural schema resource, while `mcpdesc-derivation` identifies the instance format and conformance version.

## Compatibility

The change is compatible within the unreleased 0.8.0 draft series. Draft 4 documents continue to use `mcpdesc: 0.8.0`, but their recommended `$schema` value changes. Schema-aware tools must register the new canonical URI for Draft 4.

Stable 0.7.0 and Draft 1-3 remain unchanged. Existing documents that omit `$schema` remain valid. Existing Draft 1-3 documents that use the legacy URI continue to identify their historical schema family, subject to the disclosed ambiguity among those frozen snapshots.

No consumer may infer format conformance solely from URL shape. Consumers validate the root discriminator and the selected schema or bundled snapshot.

## Migration

Draft 4 producers replace:

`https://mcpdesc.org/schema/0.8.0.json`

with:

`https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json`

when emitting `$schema`. They do not change `mcpdesc: 0.8.0`.

Validator implementations add the new URI as an exact alias for their Draft 4 bundled schema. The `@mcpdesc/validator` public API remains selector-based; an integration MAY map a recognized canonical URI to its exact bundled selector. Implementations MUST NOT map the Draft 4 URI to Draft 1-3 bytes or map the stable 0.8.0 URI before that release exists.

At stable 0.8.0 release, producers replace the Draft 4 URI with the stable URI. Published draft resources remain available and immutable.

Documents targeting stable 0.7.0 require no migration. Tooling MAY recognize the mcpdesc.org 0.7.0 mirror as a retrieval location while preserving the frozen schema's Cisco `$id` and provenance.

## Security and privacy considerations

Fetching schemas from document-controlled URLs can expose client network location and create SSRF, redirect, oversized-response, and cache-poisoning risks. Network retrieval remains optional and policy-controlled. Bundled schemas are preferred for validators operating on untrusted documents.

The mcpdesc.org publisher MUST prevent generic application fallback routes from returning HTML with successful status at schema paths. Immutable cache headers MUST be applied only after byte identity is verified; otherwise a bad publication can be retained by intermediaries for a long period.

Cross-origin access permits browser tooling to read public schemas but does not authorize credentials. Schema endpoints MUST support unauthenticated `GET` and `HEAD`, SHOULD use `Access-Control-Allow-Origin: *`, and MUST serve no user-specific or cookie-dependent variants.

Schema publication proves neither authorship nor integrity by itself. Repository release records and published digests provide the reviewable binding between source and hosted bytes.

## Alternatives considered

- **Retain `https://mcpdesc.org/schema/0.8.0.json`:** rejected for future schemas because it omits the format family and already ambiguously identifies three different draft snapshots.
- **Use the short path for MCP Description and qualified paths only for companion formats:** rejected because it makes one format an implicit default and prevents a uniform registry layout.
- **Publish only stable schema identities:** rejected because public draft snapshots are interoperability baselines and need exact schema selection.
- **Use one mutable draft schema URI:** retained only as an optional convenience alias; rejected as a schema `$id` because its bytes and meaning change over time.
- **Use raw repository or release-asset URLs as `$id`:** rejected because public format identity should remain under the project-controlled domain and independent of repository hosting.
- **Rewrite Draft 1-3 `$id` values:** rejected because published snapshots and validator selectors are immutable.
- **Repurpose the legacy URI for stable 0.8.0:** rejected because doing so would silently change the schema resource already named by Draft 1-3 documents.
- **Use reverse-DNS format identifiers in addition to root version fields:** rejected because controlled schema families and explicit root discriminators provide identity without redundant nested metadata or implied ownership by another project.

## Open questions

- Should immutable schema resources additionally publish detached digest files, and if so, which digest-manifest format should govern them?
- What URI suffix and release process should govern an explicitly versioned errata resource?

Neither question weakens the rule that one published canonical URI always identifies one byte sequence.

## Implementation and validation plan

After acceptance:

1. update Draft 4 normative text and serialization guidance;
2. change the active 0.8.0 schema `$id` to the Draft 4 canonical URI;
3. update all active draft examples and fixtures containing `$schema`;
4. update schema registries, validator URI resolution, declarations, and Draft 4 snapshots;
5. update changelog, migration guidance, proposal manifest, release scripts, and repository validation;
6. rename the schema identity metadata field in `schemas/draft.json` from `$id` to `schemaId`;
7. add publication checks for HTTP status, redirects, media type, parsing, dialect, `$id`, digest, CORS, caching, and HTML fallbacks;
8. publish and verify the Draft 4 canonical schema before or atomically with the Draft 4 snapshot announcement;
9. publish documented legacy mirrors without modifying frozen artifacts; and
10. preserve `schemas/latest.json` at stable 0.7.0 until the explicit stable 0.8.0 release decision.

Validation runs `npm test`, publication endpoint checks, byte-digest comparisons, and explicit frozen-artifact digest checks for stable 0.7.0 and Draft 1-3.

## Decision record

- 2026-08-28: Initial Review proposal selects format-qualified immutable schema families, unique public draft identities beginning with Draft 4, optional mutable aliases, and byte-preserving archival treatment for 0.7.0 and Draft 1-3.