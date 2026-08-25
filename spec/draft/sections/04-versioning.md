## 4. Versioning

### 4.1 The `mcpdesc` Field

Every MCP Description document MUST include a `mcpdesc` property at the root level. This property declares which version of this specification the document conforms to.

```json
{
  "mcpdesc": "0.8.0"
}
```

### 4.2 Version Format

The `mcpdesc` value MUST identify the specification version against which conformance is assessed. This Community Working Draft uses `"0.8.0"` and is not a stable release.

The specification uses [Semantic Versioning](https://semver.org/) for its own version numbers. Before 1.0.0, a minor release MAY contain breaking changes; after 1.0.0, ordinary Semantic Versioning compatibility rules apply.

- **Major** version changes indicate breaking changes to the document structure
- **Minor** version changes add features and, before 1.0.0, MAY include breaking changes
- **Patch** version changes address errata or clarifications without structural changes

### 4.3 Version Compatibility

Implementations SHOULD support the latest specification version. Implementations MAY support multiple versions.

When processing a document, implementations MUST check the `mcpdesc` value and:

- Accept documents with a recognized `mcpdesc` version
- Reject documents with an unrecognized `mcpdesc` version or provide a clear warning

### 4.4 MCP Protocol Coverage

The root `protocolVersions` array identifies the MCP protocol revisions described by the document. It MUST be non-empty, MUST contain unique values, and every value MUST be one of:

- `2024-11-05`
- `2025-03-26`
- `2025-06-18`
- `2025-11-25`
- `2026-07-28`

An unknown or later MCP revision is invalid under mcpdesc 0.8.0 because this specification cannot validate its semantics. Supporting a later revision requires a later mcpdesc specification version.

Root coverage states which revisions the document describes. It does not prove that the server supports no other revisions.

### 4.5 Protocol Scopes and Inheritance

Transports, Capabilities Objects, Tools, Resources, Resource Templates, and Prompts MAY declare `protocolVersions`.

For root version set `R`, a top-level declaration's effective scope is its explicit `protocolVersions` when present and `R` otherwise. An explicit scope MUST be a non-empty subset of `R`.

For a nested scoped declaration, the effective scope is its explicit `protocolVersions` when present and its parent's effective scope otherwise. An explicit child scope MUST be a non-empty subset of its parent's effective scope.

Omission therefore means the complete effective parent scope; it does not mean unknown applicability.

### 4.6 Relationship Between Version Fields

The `mcpdesc` version identifies this description format. Root and declaration-level `protocolVersions` identify MCP protocol applicability. These version dimensions are independent.

### 4.7 Effective Protocol Views and Projection

For protocol revision `V`, the Effective Protocol View `P_V(D)` of document `D` contains each scoped declaration whose effective scope includes `V` and excludes every other scoped declaration.

A conforming single-version projection tool MUST:

1. validate the source document;
2. require `V` to occur in root `protocolVersions`;
3. set root `protocolVersions` to `[V]`;
4. retain applicable transports, capabilities, primitives, and nested declarations;
5. remove `protocolVersions` from retained declarations because applicability is unambiguous;
6. preserve semantically significant empty values and inheritance, including security declarations;
7. optionally omit empty primitive collections; and
8. validate the projected document structurally and semantically for `V`.

Projection produces an ordinary conforming MCP Description document, not a second format. It MUST NOT materialize transport-dependent inherited values onto a primitive unless the operation also selects a transport and defines that resolution.

### 4.8 Merge

A merge tool MAY construct an aggregate from single-version or multi-version descriptions. It MUST validate every input and MUST report a conflict rather than guess when inputs cannot be represented faithfully.

A conforming merge algorithm SHOULD project inputs into individual protocol views, require compatible logical server identity and unscoped metadata, union root protocol sets, collapse equivalent declarations by unioning their scopes, retain differing declarations as disjoint scoped variants, and validate the aggregate result.

When inputs cover the same revision, their Effective Protocol Views MUST be semantically equivalent or merge MUST fail. Conflicting `info`, `instructions`, root extension values, security declarations, or other unscoped values also cause failure.

For every merged source view `D_V`, this round-trip invariant applies:

```text
P_V(merge(D_1, ..., D_n)) is semantically equivalent to D_V
```

Semantic equivalence need not preserve property order, redundant scopes, array order where semantically insignificant, or the original choice between an omitted scope and an explicit full-parent scope. Merge tools MUST preserve the distinction among omitted `security`, `security: []`, and `security: [{}]`.

