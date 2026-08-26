## 17. Provenance Records and Primitive Attribution

Provenance records describe evidence that contributed to primitive declarations. They are portable descriptive assertions, not MCP runtime fields, cryptographic attestations, or declarations of completeness, confidence, precedence, trust, or consumer policy.

### 17.1 Provenance Registry Object

The root `provenance` property MAY contain a Provenance Registry Object:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `records` | non-empty map\<string, [Provenance Record Object](#172-provenance-record-object)\> | **Yes** | Document-local records available for attribution. |
| `defaultIds` | non-empty array\<string\> | No | Default attribution for primitives without `provenanceIds`. |

Each `records` key is an opaque, non-empty, document-local Provenance ID. IDs are case-sensitive and MUST NOT be interpreted as producer, time, ordering, trust, or MCP session identifiers. A producer SHOULD NOT use an MCP transport session ID as the sole provenance identity. An external dump or inspector session identifier MAY appear in an artifact URI or specification extension. `defaultIds`, when present, MUST be non-empty, contain unique IDs, and resolve to records in the same registry. A producer SHOULD use defaults only when those records apply systemically to primitives without explicit attribution.

The registry MAY carry `x-*` specification extensions. It MUST NOT contain other additional properties.

### 17.2 Provenance Record Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `kind` | string | **Yes** | Evidence origin: `curated`, `observed`, or `generated`. |
| `producer` | [Provenance Producer Object](#173-provenance-producer-object) | No | Tool or organization that produced the evidence. |
| `method` | string | No | Stable producer-defined method identifier. |
| `artifact` | [Provenance Artifact Object](#174-provenance-artifact-object) | No | External evidence supporting the record. |
| `recordedAt` | string | No | RFC 3339 date-time at which the evidence was recorded. |

`kind` MUST be `curated` for intentional contract authoring or review, `observed` for one or more runtime observations, or `generated` for mechanical production from source code, configuration, framework metadata, or another non-runtime source. Saving or committing generated or observed output does not make it curated. `method`, when present, MUST be non-empty. `recordedAt`, when present, MUST be a valid RFC 3339 date-time and MUST NOT serve as record identity.

A record MAY carry `x-*` specification extensions. Core records do not define completeness, confidence, trust, precedence, or policy fields; an unprefixed field for any such concept is invalid. Consumers select and apply interpretation policy outside the document.

### 17.3 Provenance Producer Object

A Provenance Producer Object MUST contain a non-empty string `name` and MAY contain a non-empty string `version`. It MAY carry `x-*` specification extensions and MUST NOT contain other additional properties. Producer identity is descriptive and is not proof of authorship.

### 17.4 Provenance Artifact Object

A Provenance Artifact Object MUST contain an absolute URI string `uri` and MAY contain a non-empty string `digest`. A present digest MUST identify both its algorithm and value. Consumers are not required to retrieve or verify the artifact.

The object MAY carry `x-*` specification extensions and MUST NOT contain other additional properties. An artifact reference is not an attestation and does not establish producer identity, correctness, completeness, or trustworthiness.

### 17.5 Primitive Attribution

A Tool, Resource, Resource Template, or Prompt Object MAY contain `provenanceIds` as a non-empty array of unique Provenance IDs. Every ID MUST resolve to the root registry. A present `provenanceIds` replaces, rather than extends, `defaultIds`; omission inherits `defaultIds` when present. Omission of both makes no portable provenance attribution for that primitive.

Multiple IDs mean that evidence from multiple records contributed to the declaration. Their order MUST NOT imply precedence, confidence, or merge order. Attribution inherits its primitive's protocol scope. Authors SHOULD use disjoint protocol-scoped primitive variants when attribution differs by protocol revision.

### 17.6 Projection, Merge, and Comparison

A single-version projection MUST preserve each retained primitive's effective attribution and every referenced record. It MAY prune unreferenced records, but MUST NOT synthesize records or change attribution.

Provenance is descriptive metadata rather than MCP runtime semantics. Compatibility analysis and runtime-contract comparison MUST ignore differences confined to provenance records or primitive attribution. Representation-preserving processing MUST nevertheless preserve those differences.

A merge tool SHOULD preserve records and attribution from every contributing document. It MUST deterministically remap a colliding document-local ID when the records differ, update every affected reference, and report a conflict only when the representation cannot preserve the inputs. When equivalent declarations in one Effective Protocol View receive contributions from multiple sources, the merged declaration SHOULD reference all contributing records. A merge MUST NOT infer completeness, confidence, precedence, or trust from record count, kind, producer, method, artifact, or time.

### 17.7 Consumer Policy, Security, and Privacy

Consumers MAY use provenance under externally selected policy for documentation, filtering, governance, comparison, or review. They MUST treat records and artifacts as untrusted assertions unless independently verified and MUST NOT infer collection completeness solely from attribution.

Provenance metadata MUST NOT contain credentials, tokens, personal user identifiers, person-specific roles, authorization claims, confidential topology, raw runtime session IDs, or other sensitive runtime context. Artifact URIs and recording times can expose infrastructure or operational information; authors SHOULD omit or redact optional data when publication creates risk. Artifact retrieval requires an explicit consumer-controlled network, authentication, tracking, and content-processing policy.