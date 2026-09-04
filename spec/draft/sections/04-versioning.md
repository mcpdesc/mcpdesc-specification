## 4. Versioning

### 4.1 The `mcpdesc` Field

Every MCP Description document MUST include a `mcpdesc` property at the root level. This property declares which version of this specification the document conforms to.

```json
{
  "mcpdesc": "0.8.0"
}
```

### 4.2 Version Format

The `mcpdesc` value MUST identify the specification version against which conformance is assessed. This release candidate uses `"0.8.0"` and is not a stable release.

The specification uses [Semantic Versioning](https://semver.org/) for its own version numbers. Before 1.0.0, a minor release MAY contain breaking changes; after 1.0.0, ordinary Semantic Versioning compatibility rules apply.

- **Major** version changes indicate breaking changes to the document structure
- **Minor** version changes add features and, before 1.0.0, MAY include breaking changes
- **Patch** version changes address errata or clarifications without structural changes

### 4.3 Identifier Roles

The root `$schema` property, when present, identifies the JSON Schema resource against which the document's normalized JSON-compatible data model can be structurally validated. It does not replace the instance format discriminator.

The root `$schema` property remains optional. When present, it SHOULD identify the exact stable version or public draft snapshot used to produce or validate the document. Omitting `$schema` does not make an otherwise conforming document invalid; a validator MAY select an applicable bundled schema through its API, surrounding metadata, or explicit user configuration.

The schema document's root `$id` identifies that schema resource and establishes its base URI for JSON Schema reference resolution. The schema document's own `$schema` property identifies the JSON Schema dialect used to interpret the schema. MCP Description 0.8.0 schemas use `https://json-schema.org/draft/2020-12/schema`.

```yaml
$schema: https://mcpdesc.org/schema/mcp-description/0.8.0-rc.2.json
mcpdesc: 0.8.0
```

The prerelease label in `$schema` does not change the MCP Description conformance version. Release Candidate 2 documents remain `mcpdesc: 0.8.0`.

### 4.4 Canonical Schema URI Families

The project controls canonical schema URIs under:

```text
https://mcpdesc.org/schema/<format-family>/<version-or-snapshot>.json
```

This specification assigns `mcp-description` as the MCP Description format family. A stable release uses its semantic version, for example `https://mcpdesc.org/schema/mcp-description/0.8.0.json`. A public prerelease uses the target version followed by its prerelease identifier, for example `https://mcpdesc.org/schema/mcp-description/0.8.0-rc.2.json`.

Assigning a new format family requires an accepted specification decision. Similar repository paths, redirects, or aliases do not create canonical format authority.

### 4.5 Unique and Immutable Schema Resources

Every canonical schema URI MUST identify exactly one immutable sequence of schema bytes. A schema published at a canonical URI MUST declare that exact URI as its root `$id`.

Once publicly published, a canonical schema resource MUST NOT be replaced with different bytes, even to correct an error or non-normative description. Every byte change requires a new stable version, draft snapshot, or separately versioned errata resource according to the governing format's compatibility policy.

Draft 4 and every later public prerelease MUST use a prerelease-specific root `$id`. The stable 0.8.0 schema MUST use `https://mcpdesc.org/schema/mcp-description/0.8.0.json` and MUST NOT reuse a prerelease URI or the legacy short URI.

### 4.6 Live Publication and Aliases

A canonical mcpdesc.org schema URI MUST use HTTPS, return HTTP 200 for `GET`, serve the exact immutable schema bytes directly without redirect, and return a syntactically valid JSON Schema document rather than an HTML fallback. The response MUST declare the request URI as the root `$id` and MUST be retrievable cross-origin for browser-hosted editors and tools.

Canonical responses MUST return a JSON-compatible media type and SHOULD use `application/schema+json`. They MUST return `Cache-Control` including `public`, `max-age=31536000`, and `immutable`, and SHOULD include a strong `ETag`.

The project MAY also publish mutable convenience aliases such as `https://mcpdesc.org/schema/mcp-description/latest.json` for the latest stable release and `https://mcpdesc.org/schema/mcp-description/draft.json` for the active community draft. An alias SHOULD redirect to its selected immutable canonical resource. An alias MUST NOT be declared as a schema `$id`, and normative examples SHOULD use immutable canonical URIs instead.

The repository files `schemas/latest.json` and `schemas/draft.json` remain version-status manifests rather than MCP Description JSON Schemas. They identify released or active-draft status for repository workflows and MUST NOT be treated as public schema identities.

### 4.7 Legacy Draft 1-3 and Stable 0.7.0 Treatment

Stable 0.7.0 and published Draft 1, Draft 2, and Draft 3 artifacts MUST remain byte-for-byte unchanged.

The project SHOULD publish the exact Draft 3 schema at `https://mcpdesc.org/schema/0.8.0.json` because Draft 3 is the final snapshot whose embedded `$id` used that legacy short URI. The project MAY also publish exact Draft 1 and Draft 2 bytes at `https://mcpdesc.org/schema/mcp-description/0.8.0-draft.1.json` and `https://mcpdesc.org/schema/mcp-description/0.8.0-draft.2.json`, and Draft 3 bytes at `https://mcpdesc.org/schema/mcp-description/0.8.0-draft.3.json`, as archival retrieval mirrors.

Those archival copies retain their frozen embedded `$id` values. They are retrieval mirrors, not corrected self-identifying canonical schema resources, and consumers MUST NOT treat their request URLs as corrected schema identities. Exact historical validation of Draft 1, Draft 2, and Draft 3 remains anchored on the corresponding bundled validator selectors.

Stable 0.7.0 likewise retains the historical Cisco root `$id`, `https://developer.cisco.com/mcp-description/schema/0.7.0`, and Cisco Open as its canonical source. The project MAY publish the exact stable 0.7.0 bytes at `https://mcpdesc.org/schema/mcp-description/0.7.0.json` as an archival mirror only. That mirror MUST preserve attribution, licensing, schema content, and origin records.

### 4.8 Retrieval and Security Boundary

MCP Description conformance MUST NOT require network retrieval. A validator MAY bundle known schema resources and resolve their canonical URIs locally.

Consumers MUST NOT automatically retrieve an arbitrary `$schema` URI from an untrusted document without an explicit network policy. Implementations that permit retrieval SHOULD restrict schemes and destinations, bound redirects and response sizes, validate media type and schema structure, and mitigate SSRF and cache-poisoning risks.

The `$schema` property assists structural schema selection and editor integration. It does not make a structurally valid document semantically conforming and does not supersede protocol-revision or cross-object validation.

### 4.9 Version Compatibility

Implementations SHOULD support the latest specification version. Implementations MAY support multiple versions.

When processing a document, implementations MUST check the `mcpdesc` value and:

- Accept documents with a recognized `mcpdesc` version
- Reject documents with an unrecognized `mcpdesc` version or provide a clear warning

### 4.10 MCP Protocol Coverage

The root `protocolVersions` array identifies the MCP protocol revisions described by the document. It MUST be non-empty, MUST contain unique values, and every value MUST be one of:

- `2024-11-05`
- `2025-03-26`
- `2025-06-18`
- `2025-11-25`
- `2026-07-28`

An unknown or later MCP revision is invalid under mcpdesc 0.8.0 because this specification cannot validate its semantics. Supporting a later revision requires a later mcpdesc specification version.

Root coverage states which revisions the document describes. It does not prove that the server supports no other revisions.

### 4.11 Protocol Scopes and Inheritance

Transports, Capabilities Objects, Tools, Resources, Resource Templates, and Prompts MAY declare `protocolVersions`.

For root version set `R`, a top-level declaration's effective scope is its explicit `protocolVersions` when present and `R` otherwise. An explicit scope MUST be a non-empty subset of `R`.

For a nested scoped declaration, the effective scope is its explicit `protocolVersions` when present and its parent's effective scope otherwise. An explicit child scope MUST be a non-empty subset of its parent's effective scope.

Omission therefore means the complete effective parent scope; it does not mean unknown applicability.

### 4.12 Relationship Between Version Fields

The `mcpdesc` version identifies this description format. Root and declaration-level `protocolVersions` identify MCP protocol applicability. The optional root `$schema` identifies a structural validation schema resource. These version dimensions are independent.

### 4.13 Effective Protocol Views and Projection

For protocol revision `V`, the Effective Protocol View `P_V(D)` of document `D` contains each scoped declaration whose effective scope includes `V` and excludes every other scoped declaration.

A conforming single-version projection tool MUST:

1. validate the source document;
2. require `V` to occur in root `protocolVersions`;
3. set root `protocolVersions` to `[V]`;
4. retain applicable transports, capabilities, primitives, and nested declarations;
5. remove `protocolVersions` from retained declarations because applicability is unambiguous;
6. preserve semantically significant empty values and inheritance, including security declarations;
7. omit every ordinary declaration collection from which projection removes the last entry; and
8. validate the projected document structurally and semantically for `V`.

Projection produces an ordinary conforming MCP Description document, not a second format. It MUST NOT materialize transport-dependent inherited values onto a primitive unless the operation also selects a transport and defines that resolution.

### 4.14 Merge

A merge tool MAY construct an aggregate from single-version or multi-version descriptions. It MUST validate every input and MUST report a conflict rather than guess when inputs cannot be represented faithfully.

A conforming merge algorithm SHOULD project inputs into individual protocol views, require compatible logical server identity and unscoped metadata, union root protocol sets, collapse equivalent declarations by unioning their scopes, retain differing declarations as disjoint scoped variants, and validate the aggregate result.

When inputs cover the same revision, their Effective Protocol Views MUST be semantically equivalent or merge MUST fail. Conflicting `info`, `instructions`, root extension values, security declarations, or other unscoped values also cause failure.

For every merged source view `D_V`, this round-trip invariant applies:

```text
P_V(merge(D_1, ..., D_n)) is semantically equivalent to D_V
```

Semantic equivalence need not preserve property order, redundant scopes, array order where semantically insignificant, or the original choice between an omitted scope and an explicit full-parent scope. Merge tools MUST preserve the distinction among omitted `security`, `security: []`, and `security: [{}]`.

Omission contributes no entries to an ordinary declaration collection during merge. A merge result MUST omit an ordinary declaration collection when it has no entries. Merge output MUST satisfy transport protocol coverage whenever it contains `transports`.

