## 4. Versioning

### 4.1 The `mcpdesc` Field

<a id="req-mcpdesc-required"></a>Every MCP Description document MUST include a `mcpdesc` property at the root level. This property declares which version of this specification the document conforms to.

```json
{
  "mcpdesc": "0.9.0"
}
```

### 4.2 Version Format

<a id="req-mcpdesc-version"></a>The `mcpdesc` value MUST identify the specification version against which conformance is assessed.

The specification uses [Semantic Versioning](https://semver.org/) for its version numbers. Before 1.0.0, a minor version can include breaking changes.

### 4.3 Identifier Roles

The root `$schema` property, when present, identifies a JSON Schema resource for structurally validating the document's data model. It does not replace the `mcpdesc` format discriminator.

```yaml
$schema: https://mcpdesc.org/schema/mcp-description/0.9.0.json
mcpdesc: 0.9.0
```

The root `$schema` property is optional. <a id="req-schema-identifier-exact"></a>When present, it SHOULD identify the exact schema resource used to produce or validate the document. Omitting `$schema` does not make an otherwise conforming document invalid; a validator MAY select an applicable bundled schema through its API, surrounding metadata, or explicit user configuration.

The `$schema` value does not change the MCP Description conformance version identified by `mcpdesc`.

The schema document's root `$id` identifies that schema resource and establishes its base URI for JSON Schema reference resolution.

The schema document's own `$schema` property identifies the JSON Schema dialect used to interpret the schema. Schemas defined by this specification use `https://json-schema.org/draft/2020-12/schema`.

### 4.4 Canonical Schema URI Families

Canonical MCP Description schema URIs use this form:

```text
https://mcpdesc.org/schema/<format-family>/<version>.json
```

This specification assigns `mcp-description` as the MCP Description format family.

### 4.5 Unique and Immutable Schema Resources

<a id="req-schema-uri-immutable"></a>Every canonical schema URI MUST identify exactly one immutable sequence of schema bytes. A schema published at a canonical URI MUST declare that exact URI as its root `$id`.

<a id="req-schema-bytes-immutable"></a>A canonical schema resource MUST NOT be replaced with different bytes, even to correct an error or non-normative description. A changed schema MUST use a different canonical URI.

### 4.6 Live Publication and Aliases

<a id="req-schema-publication-http"></a>A canonical mcpdesc.org schema URI MUST use HTTPS and return HTTP 200 for `GET`. It MUST serve the exact immutable schema bytes directly, without redirect, as a syntactically valid JSON Schema document rather than an HTML fallback. The response MUST declare the request URI as the root `$id` and MUST be retrievable cross-origin for browser-hosted editors and tools.

<a id="req-schema-publication-headers"></a>Canonical responses MUST return a JSON-compatible media type. They SHOULD use `application/schema+json`. They MUST return `Cache-Control` including `public`, `max-age=31536000`, and `immutable`. They SHOULD include a strong `ETag`.

Mutable convenience aliases MAY point to canonical schema resources. <a id="req-schema-aliases"></a>An alias SHOULD redirect to its selected immutable canonical resource. An alias MUST NOT be declared as a schema `$id`. Examples SHOULD use immutable canonical URIs instead.

### 4.7 Retrieval and Security Boundary

<a id="req-no-network-conformance"></a>MCP Description conformance MUST NOT require network retrieval. A validator MAY bundle known schema resources and resolve their canonical URIs locally.

<a id="req-schema-retrieval-policy"></a>Consumers MUST NOT automatically retrieve an arbitrary `$schema` URI from an untrusted document without an explicit network policy. Implementations that permit retrieval SHOULD restrict schemes and destinations, bound redirects and response sizes, validate media type and schema structure, and mitigate SSRF and cache-poisoning risks.

The `$schema` property assists structural schema selection and editor integration. It does not make a structurally valid document semantically conforming and does not supersede protocol-version or cross-object validation.

### 4.8 Version Compatibility

Implementations MAY support multiple MCP Description versions. <a id="req-version-support"></a>An implementation claiming support for a version MUST process its `mcpdesc` discriminator according to that version's requirements.

<a id="req-version-check"></a>When processing a document, implementations MUST check the `mcpdesc` value and:

- accept documents with a recognized `mcpdesc` version; and
- reject documents with an unrecognized `mcpdesc` version.

Implementations MAY also report a clear diagnostic when rejecting a document.

### 4.9 MCP Protocol Coverage

The root `protocolVersions` array identifies the MCP protocol versions described by the document. <a id="req-protocol-versions-values"></a>It MUST be non-empty, MUST contain unique values, and every value MUST be one of:

- `2024-11-05`
- `2025-03-26`
- `2025-06-18`
- `2025-11-25`
- `2026-07-28`

This specification cannot validate the semantics of an unknown or later MCP protocol version, so such a value is invalid. Supporting a later protocol version requires a later specification version.

Root coverage states which protocol versions the document describes. It does not prove that the server supports no other protocol versions.

### 4.10 Protocol Scopes and Inheritance

Transports, Capabilities Objects, Tools, Resources, Resource Templates, and Prompts MAY declare `protocolVersions`.

The root Info Object is unscoped, document-wide MCP Description metadata. <a id="req-info-unscoped"></a>Its properties are valid independently of root `protocolVersions` and MUST NOT be treated as protocol-scoped declarations.

For root version set `R`, a top-level declaration's effective scope is its explicit `protocolVersions` when present. If omitted, its effective scope is `R`. <a id="req-scope-root-subset"></a>An explicit scope MUST be a non-empty subset of `R`.

For a nested scoped declaration, the effective scope is its explicit `protocolVersions` when present. If omitted, its effective scope is its parent's effective scope. <a id="req-scope-subset"></a>An explicit child scope MUST be a non-empty subset of its parent's effective scope.

Omission therefore means the complete effective parent scope; it does not mean unknown applicability.

<a id="req-field-protocol-version-availability"></a>A field that this specification marks as available since an MCP protocol version, or for one MCP protocol version only, MUST NOT appear in a declaration whose effective scope includes a protocol version outside that range.

### 4.11 Relationship Between Version Fields

The `mcpdesc` version identifies this description format. Root and declaration-level `protocolVersions` identify MCP protocol applicability. The optional root `$schema` identifies a structural validation schema resource. These version dimensions are independent.

### 4.12 Effective Protocol Views and Projection

For protocol version `V`, the Effective Protocol View `P_V(D)` of document `D` contains each scoped declaration whose effective scope includes `V` and excludes every other scoped declaration. It preserves the complete Info Object unchanged.

<a id="req-view-projection"></a>A conforming single-version projection tool MUST:

1. validate the source document;
2. require `V` to occur in root `protocolVersions`;
3. set root `protocolVersions` to `[V]`;
4. retain applicable transports, capabilities, primitives, and nested declarations;
5. remove `protocolVersions` from retained declarations because applicability is unambiguous;
6. preserve semantically significant empty values and inheritance, including security declarations;
7. omit every ordinary declaration collection from which projection removes the last entry; and
8. validate the projected document structurally and semantically for `V`.

Projection produces an ordinary conforming MCP Description document, not a second format. <a id="req-view-projection-transports"></a>It MUST NOT materialize transport-dependent inherited values onto a primitive unless the operation also selects a transport and defines that resolution.

### 4.13 Merge

A merge tool MAY combine single-version or multi-version descriptions into one aggregate description. <a id="req-merge-inputs"></a>It MUST validate every input and MUST report a conflict rather than guess when inputs cannot be represented faithfully.

<a id="req-merge-algorithm"></a>A conforming merge algorithm SHOULD project inputs into individual protocol views, require compatible logical server identity and unscoped metadata, union root protocol sets, collapse equivalent declarations by unioning their scopes, retain differing declarations as disjoint scoped variants, and validate the aggregate result.

<a id="req-merge-equivalence"></a>When inputs cover the same protocol version, their Effective Protocol Views MUST be semantically equivalent or merge MUST fail. Conflicting `info`, `instructions`, root extension values, security declarations, or other unscoped values also cause failure.

For every merged source view `D_V`, this round-trip invariant applies:

```text
P_V(merge(D_1, ..., D_n)) is semantically equivalent to D_V
```

Semantic equivalence need not preserve property order, redundant scopes, array order where semantically insignificant, or the original choice between an omitted scope and an explicit full-parent scope. <a id="req-merge-security"></a>Merge tools MUST preserve the distinction among omitted `security`, `security: []`, and `security: [{}]`.

Omission contributes no entries to an ordinary declaration collection during merge. <a id="req-merge-collections"></a>A merge result MUST omit an ordinary declaration collection when it has no entries. Merge output MUST satisfy transport protocol coverage whenever it contains `transports`.

### 4.14 Native MCP Projection

Native projection produces the MCP values that a server returns from `tools/list`, `resources/list`, `resources/templates/list`, and `prompts/list` for one MCP protocol version. Unlike the Effective Protocol View (Section 4.12), its result is not an MCP Description document.

Native projection `N_V(D, k, i)` takes a document `D`, an MCP protocol version `V`, a primitive kind `k` (Tool, Resource, Resource Template, or Prompt), and an identifier `i`. The identifier is the Tool `name`, Resource `uri`, Resource Template `uriTemplate`, or Prompt `name`, and is unique within `P_V(D)` (Sections 9.5, 10.5, and 11.5). <a id="req-native-projection-steps"></a>A conforming native projection implementation MUST:

1. <a id="req-native-projection-source-valid"></a>validate `D` and fail with `projection-source-invalid` when validation reports an error;
2. <a id="req-native-projection-protocol-version-declared"></a>require `V` to occur in root `protocolVersions`, otherwise fail with `projection-protocol-version-not-declared`;
3. <a id="req-native-projection-declaration-applicable"></a>select the declaration of kind `k` with identifier `i` in `P_V(D)`, otherwise fail with `projection-declaration-not-applicable`;
4. <a id="req-native-projection-references-resolved"></a>resolve every Reference Object in Tool `inputSchema` and `outputSchema` (Section 17);
5. <a id="req-native-projection-fields"></a>build the value from the declaration fields that the MCP type of `k` defines in `V`, copying each value unchanged, where Prompt `arguments` entries and `icons` entries keep only the fields that MCP `PromptArgument` and `Icon` define in `V`; and
6. <a id="req-native-projection-postcondition"></a>validate the value against the definition of that MCP type in the pinned MCP `schema.json` of `V`, and fail with `projection-postcondition-failed`, without returning the value, when it does not validate.

Because validation already rejects fields that `V` does not define, step 5 removes only MCP Description metadata: `protocolVersions`, `examples`, `interactionExamples`, `completionExamples`, `tags`, `elicitations`, `deprecated`, `security`, `clientRequirements`, and the `x-*` specification extensions of the declaration, its Prompt arguments, and its icons. Embedded JSON Schema keywords in `inputSchema` and `outputSchema`, including `x-*` keywords and `x-mcp-header`, and `_meta` entries are copied unchanged.

<a id="req-native-projection-no-synthesis"></a>Native projection MUST NOT add a field that the declaration does not contain, materialize a protocol default, copy a value into another field, or rewrite a value. An absent annotation hint stays absent, `execution.taskSupport` is not set to `"forbidden"`, no `$schema` is inserted into an embedded schema, and a Prompt argument without `required` stays without it. `deprecated` has no MCP counterpart and is omitted rather than moved into `_meta` or `description`.

<a id="req-native-projection-lists"></a>The list projection of kind `k` for `V` is the sequence of `N_V(D, k, i)` for every declaration of kind `k` in `P_V(D)`, in document order. A failure for any declaration fails the whole list.

<a id="req-native-projection-no-repair"></a>A `projection-postcondition-failed` failure indicates a defect in this specification, its validator, or the implementation. The exception is a Tool and protocol version for which validation reports the warning of [Section 9.2](#req-tool-schema-native-shape). There, the failure reflects a restriction of the MCP `Tool` type that this specification reports but does not enforce. In either case, implementations MUST NOT repair the value.

The `projection-fixtures/` folder of this specification gives, for each kind and supported protocol version, the exact expected MCP value or failure, in the case format of `projection-fixtures/schema/projection-case.schema.json`. Values are compared as canonical JSON.
