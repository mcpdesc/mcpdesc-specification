## 10. Resources and Resource Templates

### 10.1 Resources

The `resources` array declares the static resources exposed by the MCP server. Each resource represents a data source identified by a URI.

#### 10.1.1 Resource Object

<a id="req-resource-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP protocol versions to which this declaration applies. |
| `uri` | string (URI) | **Yes** | Resource URI. |
| `name` | string | **Yes** | Programmatic resource name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Available since MCP 2025-06-18. |
| `description` | string | No | Human-readable Resource description. |
| `mimeType` | string | No | MIME type of the Resource content. |
| `size` | integer | No | Size of the raw Resource content in bytes. |
| `annotations` | [Resource Annotations Object](#103-resource-annotations) | No | Audience, priority, and modification-time hints. |
| `examples` | map\<string, [Resource Example Object](#1042-static-resource-example-object)\> | No | Named completed Resource read examples. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Available since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. <a id="req-resource-tags-references"></a>When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that may be needed while reading the Resource (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the Resource is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Resource declaration, subject to [Section 3.5](#35-mcp-_meta). Available since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |
| `clientRequirements` | [Client Capability Requirements Object](#85-primitive-client-capability-requirements) | No | Unconditional minimum client capabilities required for `resources/read`; does not apply to `resources/list`. |

<a id="req-resource-size-integer"></a>When present, `size` MUST be an integer. This applies to Resource declarations and to resource link content blocks. MCP declares `size` as an unannotated `number`, which denotes an integer (see [Section 3.6](#36-carried-mcp-values)). MCP defines no minimum.

#### 10.1.2 Resource URI

The `uri` field identifies the Resource. <a id="req-resource-uri-syntax"></a>It MUST be an absolute URI with a scheme as defined by [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986), not a relative reference. This specification does not restrict the scheme. Servers MAY use custom URI schemes appropriate to their domain.

### 10.2 Resource Templates

The `resourceTemplates` array declares parameterized resource definitions using URI templates ([RFC 6570](https://www.rfc-editor.org/rfc/rfc6570)).

#### 10.2.1 Resource Template Object

<a id="req-resource-template-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP protocol versions to which this declaration applies. |
| `uriTemplate` | string | **Yes** | URI template (RFC 6570). |
| `name` | string | **Yes** | Programmatic template name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Available since MCP 2025-06-18. |
| `description` | string | No | Human-readable Resource Template description. |
| `mimeType` | string | No | MIME type of the Resource content. |
| `annotations` | [Resource Annotations Object](#103-resource-annotations) | No | Audience, priority, and modification-time hints. |
| `examples` | map\<string, [Resource Template Example Object](#1043-resource-template-example-object)\> | No | Named concrete URI and completed read-result examples. |
| `completionExamples` | map\<string, [Completion Example Object](#1046-resource-template-completion-examples)\> | No | Named `completion/complete` request-result observations for template variables. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Available since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. <a id="req-resource-template-tags-references"></a>When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that may be needed while reading an expanded Resource (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the Resource Template is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Resource Template declaration, subject to [Section 3.5](#35-mcp-_meta). Available since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |
| `clientRequirements` | [Client Capability Requirements Object](#85-primitive-client-capability-requirements) | No | Unconditional minimum client capabilities required to read a concrete URI produced from the template; does not apply to `resources/templates/list`. |

<a id="req-resource-template-uri-template"></a>`uriTemplate` MUST be a valid RFC 6570 URI template, whether or not the Resource Template has examples.

### 10.3 Resource Annotations

Resource Annotations provide optional client hints about how a Resource, Resource Template, or content block may be used or displayed. They are distinct from the behavioral [Tool Annotations](#96-tool-annotations) on a Tool Object.

| Property | Type | Description |
|----------|------|-------------|
| `audience` | array\<string\> | Intended audiences. Each value is `"user"` or `"assistant"`. |
| `priority` | number | Relative importance from `0` (least important) through `1` (most important). |
| `lastModified` | string | Resource modification time in ISO 8601 form. Available since MCP 2025-06-18. |

Every MCP protocol version supported by this specification defines Resource Annotations. MCP 2024-11-05 and MCP 2025-03-26 define only `audience` and `priority`. <a id="req-resource-annotations-last-modified"></a>`lastModified` MUST NOT appear where an applicable protocol version is MCP 2024-11-05 or MCP 2025-03-26.

Resource Annotations are hints, not access controls or integrity claims. <a id="req-resource-annotations-hints"></a>Consumers MUST NOT treat `audience` as authorization, `priority` as a mandatory processing order, or `lastModified` as proof of freshness.

<a id="req-resource-annotations-closed"></a>The object contains only the fields above. MCP defines `Annotations` as a closed type in every supported protocol version, so other fields, including `x-*` keys and Tool Annotation fields, MUST NOT appear.

Annotations on a Resource describe the Resource declaration returned by `resources/list`. Annotations on a Resource Template describe the template as a whole, not one particular URI expansion.

Named Resource examples represent completed `resources/read` results. Their entries follow the applicable MCP Resource Contents type, which does not define `annotations`. <a id="req-resource-annotations-not-in-examples"></a>Declaration annotations MUST NOT be copied into an example result. MCP Description 0.9.0 does not define per-example Resource Annotations.

MCP also uses the Resource Annotations type for content blocks: text, image, audio, embedded-resource, and resource-link content, where the applicable protocol version defines that block type. <a id="req-content-annotations-distinct"></a>When an MCP Description field embeds such content, its `annotations` MUST be treated as Resource Annotations, not Tool Annotations.

### 10.4 Named Resource Examples

#### 10.4.1 Shared Named-Map Rules

A Resource or Resource Template Object MAY contain an `examples` map. Each value is either an inline example object or a Reference Object (see [Section 17](#17-reusable-components-and-local-references)). A Resource references the `resourceExamples` component namespace, and a Resource Template references `resourceTemplateExamples`.

<a id="req-resource-examples-map"></a>When present, the map MUST contain at least one entry. Each name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and scoped to the containing declaration. They serve both as human-meaningful labels and as stable local selection names. Entry order is not semantically significant. MCP Description 0.9.0 does not define separate example prose fields.

<a id="req-resource-example-references-resolved"></a>A referenced example MUST be resolved before the URI, result-shape, content, and protocol-scope requirements of its use site are applied.

Declarations for the same `uri` or `uriTemplate` in disjoint effective protocol scopes have independent example maps.

#### 10.4.2 Static Resource Example Object

<a id="req-resource-example-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `result` | [Completed Resource Read Result](#1044-completed-resource-read-result) | **Yes** | Completed `resources/read` result payload for the containing Resource's `uri`, excluding the JSON-RPC envelope. |

The object MAY carry `x-*` specification extensions. No other fields are allowed. <a id="req-resource-example-closed"></a>The requested URI is the containing Resource's `uri`, so the example MUST NOT repeat it.

#### 10.4.3 Resource Template Example Object

<a id="req-resource-template-example-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `uri` | string | **Yes** | Concrete Resource URI sent as `params.uri` in the `resources/read` request. |
| `result` | [Completed Resource Read Result](#1044-completed-resource-read-result) | **Yes** | Completed `resources/read` result payload for `uri`, excluding the JSON-RPC envelope. |

The object MAY carry `x-*` specification extensions. No other fields are allowed.

<a id="req-resource-template-example-expansion"></a>`uri` MUST be a valid RFC 6570 expansion of the containing `uriTemplate`. It records the exact request value, not template variables inferred from it.

#### 10.4.4 Completed Resource Read Result

The `result` value is the `result` member of a successful JSON-RPC response. <a id="req-resource-example-contents"></a>It MUST contain a non-empty `contents` array.

<a id="req-resource-example-result-shape"></a>For MCP 2026-07-28, `result` MUST contain `resultType: "complete"`, a non-negative integer `ttlMs`, and `cacheScope` equal to `"public"` or `"private"`. These are required fields of the MCP `CacheableResult` type, which `ReadResourceResult` extends. Earlier protocol versions do not define these fields. When they appear for an earlier protocol version, [Section 3.6](#36-carried-mcp-values) governs them. A declaration whose scope includes MCP 2026-07-28 and an earlier protocol version MAY therefore use one example map for all of them.

<a id="req-resource-contents-meta"></a>Result `_meta` is available in every supported protocol version. Resource Contents `_meta` is available since MCP 2025-06-18. Both are literal illustrative values governed by [Section 3.5](#35-mcp-_meta), not reusable metadata contracts. In MCP 2026-07-28, result `_meta` MAY use `io.modelcontextprotocol/serverInfo` with an MCP Implementation value. Request-only and notification-only reserved keys are invalid here.

<a id="req-resource-example-completed-form"></a>JSON-RPC envelope fields, errors, task state, input-required state, and other incomplete workflows MUST NOT appear. MCP Description 0.9.0 does not represent Resource read errors, which are JSON-RPC errors, as Resource examples.

<a id="req-resource-contents-fields"></a>Every `contents` entry MUST contain `uri` and exactly one of `text` or `blob`. <a id="req-resource-example-blob-base64"></a>A `blob` value MUST be valid base64. <a id="req-resource-example-order"></a>An example MAY contain multiple entries. Consumers MUST preserve their order and MUST NOT assume that every returned URI equals the requested URI.

<a id="req-resource-example-requested-uri"></a>In both static and template examples, at least one returned entry SHOULD identify the requested URI, unless documented collection or indirection semantics explain otherwise. Every returned `uri` MUST be a valid URI.

<a id="req-resource-example-mime-type"></a>When the declaration has `mimeType`, the corresponding returned entry SHOULD use the same type. A validator SHOULD report a difference as a warning, not an error, because an individual representation may legitimately be more specific. The entry's own `mimeType` is authoritative for rendering that entry.

For a static Resource with `size`, tooling MAY compare the declared raw byte count with the matching example content: text encoded as UTF-8, or decoded binary. <a id="req-resource-example-size"></a>Tooling SHOULD report a mismatch as a warning, because examples and mutable Resources can represent different observations.

#### 10.4.5 Use, Projection, and Security

Resource examples are illustrative, non-exhaustive snapshots. They do not assert live equality, freshness, immutability, cache validity, or complete coverage. Result metadata is part of the example, not a guarantee about a live server. In particular, `ttlMs` and `cacheScope` reproduce the illustrated MCP 2026-07-28 result. They do not govern caching of the MCP Description document, and they do not authorize sharing captured or live content across authorization contexts.

<a id="req-resource-example-tooling"></a>Documentation tooling SHOULD preserve names, concrete template URIs, result fields, and content order. Mock and contract-test tooling MAY select an exact named example. Tooling of any kind MUST NOT dereference example URIs or fetch a live Resource while loading or serving an inline or referenced example. This specification defines no default example, wildcard match, template fallback, dynamic behavior, or external value.

Resource examples are MCP Description metadata, not fields of the MCP Resource or Resource Template types. <a id="req-resource-example-projection-omitted"></a>Native MCP projection ([Section 4.14](#414-native-mcp-projection)) MUST omit `examples` unless an independently specified MCP extension defines a destination. <a id="req-resource-example-views"></a>MCP Description round-tripping and Effective Protocol View projection ([Section 4.12](#412-effective-protocol-views-and-projection)) MUST preserve the selected declaration's example names and values and MUST NOT combine maps from declarations with disjoint scopes.

Examples and their URIs are untrusted. <a id="req-resource-example-no-secrets"></a>Authors MUST NOT include secrets and SHOULD use conspicuously fictitious content. Authors SHOULD decode and inspect binary content before publication. <a id="req-resource-example-untrusted"></a>Consumers MUST NOT dereference URIs automatically, MUST render content safely, MUST treat MIME types as untrusted hints, and SHOULD impose encoded-size, decoded-size, and processing limits.

#### 10.4.6 Resource Template Completion Examples

A Resource Template Object MAY contain `completionExamples`, a non-empty map from a local example name to an inline Completion Example Object. Unlike Resource Template `examples`, `completionExamples` entries cannot be Reference Objects and have no component namespace. The containing Resource Template identifies the completion target.

<a id="req-template-completion-examples-map"></a>Each name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and scoped to the containing Resource Template declaration. Entry order is not semantically significant. A Completion Example Object MAY carry `x-*` specification extensions and contains these fields:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `argument` | object | **Yes** | The template variable being completed, with required string `name` and `value`. |
| `context` | object | No | Already-supplied template variable values, in an `arguments` map. |
| `result` | object | **Yes** | Completed `completion/complete` result payload for the applicable protocol versions, excluding the JSON-RPC envelope. |

<a id="req-template-completion-example-closed"></a>The Completion Example Object MUST NOT contain other unprefixed fields. The `argument` object MUST contain the string fields `name` and `value`.

<a id="req-template-completion-target"></a>`argument.name` MUST identify one RFC 6570 variable in the containing `uriTemplate`. Every `context.arguments` key MUST identify another variable from the same template, and the completed argument MUST NOT also appear in `context`. Variable identity comes from parsing RFC 6570 expressions. Operators and modifiers do not change the variable name: `{+path}` identifies `path`, `{id:3}` identifies `id`, and `{owner,repository}` identifies both `owner` and `repository`.

`context` MAY be omitted. <a id="req-template-completion-context-shape"></a>When present, it MUST contain a non-empty `arguments` map whose values are strings. An empty context MUST be omitted rather than represented as an empty object.

<a id="req-template-completion-context-protocol-version"></a>MCP 2025-03-26 does not define completion context. When a completion example needs `context` and the Resource Template's scope includes MCP 2025-03-26 and a later protocol version, the Resource Template MUST be split into disjoint protocol-scoped declarations.

<a id="req-template-completion-result"></a>`result` MUST contain `completion.values`, an ordered array of string candidates. It MAY include `completion.total`, `completion.hasMore`, and result `_meta` where the applicable protocol versions define them. For MCP 2026-07-28, it MUST contain `resultType: "complete"`. Fields that an applicable protocol version does not define follow [Section 3.6](#36-carried-mcp-values). JSON-RPC envelope fields, errors, and incomplete workflows are not completion examples. Resource Template completion examples are valid only in an effective protocol scope where MCP defines completion and every represented field. <a id="req-template-completion-protocol-versions"></a>MCP Description does not support completion examples for MCP 2024-11-05.

Completion examples are illustrative and non-exhaustive. They do not create enums, defaults, or authorization grants. They do not promise that a future request yields the same candidates, ordering, total, or pagination state.

<a id="req-template-completion-projection-omitted"></a>Native MCP projection ([Section 4.14](#414-native-mcp-projection)) MUST omit `completionExamples` unless an independently specified MCP extension defines a destination. <a id="req-template-completion-views"></a>MCP Description round-tripping and Effective Protocol View projection ([Section 4.12](#412-effective-protocol-views-and-projection)) MUST preserve the selected declaration's `completionExamples` map and MUST NOT merge maps from disjoint protocol variants.

### 10.5 Protocol Variants and Security

<a id="req-resource-scopes-disjoint"></a>Resources with the same `uri` MUST have pairwise-disjoint effective protocol scopes. Resource Templates with the same `uriTemplate` MUST likewise have pairwise-disjoint effective protocol scopes. Each Effective Protocol View therefore contains at most one Resource with a given `uri` and at most one Resource Template with a given `uriTemplate`.

Resource `security` describes statically known authorization required to access the Resource. Resource Template `security` describes authorization required to access Resources through the template. Each replaces inherited transport or root security in full.

Resource `clientRequirements` applies only to `resources/read` of its URI. Resource Template `clientRequirements` applies only to `resources/read` of a concrete URI produced from the template. Neither applies to `resources/list` or `resources/templates/list`.

### 10.6 Example

```yaml
mcpdesc: 0.9.0
info:
  name: chess-reference-server
  title: Chess Reference MCP Server
  version: 1.0.0
protocolVersions:
  - "2026-07-28"
resources:
  - uri: chess://leaderboard/classical
    name: classical_leaderboard
    title: Classical Leaderboard
    description: Current top-100 classical chess ratings leaderboard
    mimeType: application/json
    annotations:
      audience:
        - user
        - assistant
      priority: 0.9
      lastModified: "2026-08-24T10:00:00Z"
    examples:
      top-two:
        result:
          resultType: complete
          ttlMs: 60000
          cacheScope: public
          contents:
            - uri: chess://leaderboard/classical
              mimeType: application/json
              text: '{"players":[{"name":"Example A","rating":2810},{"name":"Example B","rating":2795}]}'
  - uri: chess://rules/fide-laws
    name: fide_rules
    title: FIDE Laws of Chess
    description: Official FIDE Laws of Chess
    mimeType: text/markdown
resourceTemplates:
  - uriTemplate: chess://games/{game_id}
    name: game_detail
    title: Game Detail
    description: Full details of a specific chess game including PGN, moves, and analysis
    mimeType: application/json
    annotations:
      audience:
        - assistant
      priority: 0.7
    examples:
      sample-game:
        uri: chess://games/example-1234
        result:
          resultType: complete
          ttlMs: 60000
          cacheScope: private
          contents:
            - uri: chess://games/example-1234
              mimeType: application/json
              text: '{"id":"example-1234","result":"1-0"}'
  - uriTemplate: chess://players/{player_id}/games{?from,to}
    name: player_game_history
    title: Player Game History
    description: Game history for a specific player within an optional date range
    mimeType: application/json
```

