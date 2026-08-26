## 10. Resources and Resource Templates

### 10.1 Resources

The `resources` array declares the static resources exposed by the MCP server. Each resource represents a data source identified by a URI.

#### 10.1.1 Resource Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP revisions to which this declaration applies. |
| `uri` | string | **Yes** | Resource URI. |
| `name` | string | **Yes** | Programmatic resource name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Since MCP 2025-06-18. |
| `description` | string | No | Human-readable resource description. |
| `mimeType` | string | No | MIME type of the resource content. |
| `size` | number | No | Size of the raw resource content in bytes. |
| `annotations` | [Resource Annotations Object](#103-resource-annotations) | No | Audience, priority, and modification-time hints. |
| `examples` | map\<string, [Resource Example Object](#1042-static-resource-example-object)\> | No | Named completed Resource read examples. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that MAY be required while reading the Resource (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the resource is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Resource declaration, subject to [Section 3.5](#35-mcp-_meta). Since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |

#### 10.1.2 Resource URI

The `uri` property identifies the resource. It SHOULD be a valid URI. The URI scheme is not constrained — servers MAY use custom URI schemes appropriate to their domain.

### 10.2 Resource Templates

The `resourceTemplates` array declares parameterized resource definitions using URI templates ([RFC 6570](https://www.rfc-editor.org/rfc/rfc6570)).

#### 10.2.1 Resource Template Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP revisions to which this declaration applies. |
| `uriTemplate` | string | **Yes** | URI template (RFC 6570). |
| `name` | string | **Yes** | Programmatic template name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Since MCP 2025-06-18. |
| `description` | string | No | Human-readable template description. |
| `mimeType` | string | No | MIME type of the resource content. |
| `annotations` | [Resource Annotations Object](#103-resource-annotations) | No | Audience, priority, and modification-time hints. |
| `examples` | map\<string, [Resource Template Example Object](#1043-resource-template-example-object)\> | No | Named concrete URI and completed read-result examples. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that MAY be required while reading an expanded Resource (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the template is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Resource Template declaration, subject to [Section 3.5](#35-mcp-_meta). Since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |

### 10.3 Resource Annotations

Resource Annotations provide optional client hints about how a Resource, Resource Template, or content block may be used or displayed. They are distinct from the behavioral [Tool Annotations](#95-tool-annotations) on a Tool Object.

| Property | Type | Description |
|----------|------|-------------|
| `audience` | array\<string\> | Intended audiences. Each value is `"user"` or `"assistant"`. |
| `priority` | number | Relative importance from `0` (least important) through `1` (most important). |
| `lastModified` | string | Resource modification time in ISO 8601 form. Since MCP 2025-06-18. |

Resource Annotations have been available throughout the MCP revisions supported by this specification. MCP 2024-11-05 and MCP 2025-03-26 define `audience` and `priority`; `lastModified` MUST NOT be used in an Effective Protocol View before MCP 2025-06-18.

Resource Annotations are hints rather than access controls or integrity claims. Consumers MUST NOT treat `audience` as authorization, `priority` as a mandatory processing order, or `lastModified` as proof of freshness. The object allows additional properties for forward compatibility. Consumers MUST preserve unrecognized properties where round-tripping is required and MUST NOT interpret Tool Annotation field names as Tool behavior when they occur here.

Annotations on a Resource describe the concrete Resource declaration returned by resource discovery. Annotations on a Resource Template describe the template declaration as a whole; they are not observations about one particular URI expansion. Named Resource examples instead represent completed `resources/read` results. Their Resource Contents entries follow the applicable MCP Resource Contents type, which does not define `annotations`, so declaration annotations MUST NOT be moved into an example result. MCP Description 0.8.0 does not define per-example Resource Annotations.

In MCP protocol values, the same Resource Annotations type also applies to supported content blocks, including text, image, audio, embedded-resource, and resource-link content where those block types are available in the applicable revision. MCP Description fields that embed such protocol content MUST retain the distinction between Resource Annotations and Tool Annotations.

### 10.4 Named Resource Examples

#### 10.4.1 Shared Named-Map Rules

A Resource or Resource Template Object MAY contain an `examples` map. When present, it MUST contain at least one entry. Each case-sensitive local example name MUST match `^[A-Za-z0-9._-]+$` and is scoped to its containing declaration. Entry order is not semantically significant. The map key is both a human-meaningful label and a stable local selection name; 0.8.0 does not define separate example prose fields.

Declarations for the same `uri` or `uriTemplate` in disjoint effective protocol scopes have independent example maps.

#### 10.4.2 Static Resource Example Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `result` | [Completed Resource Read Result](#1044-completed-resource-read-result) | **Yes** | Completed `resources/read` result payload for the containing Resource's `uri`, excluding the JSON-RPC envelope. |

The object MAY carry `x-*` specification extensions; no other additional properties are allowed. The requested URI is implicit in the containing Resource and MUST NOT be duplicated at the example level.

#### 10.4.3 Resource Template Example Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `uri` | string | **Yes** | Concrete Resource URI used as `resources/read.params.uri`. |
| `result` | [Completed Resource Read Result](#1044-completed-resource-read-result) | **Yes** | Completed `resources/read` result payload for `uri`, excluding the JSON-RPC envelope. |

The object MAY carry `x-*` specification extensions; no other additional properties are allowed. `uri` MUST be a valid RFC 6570 expansion of the containing `uriTemplate`. It records the exact request value rather than reverse-inferred template variables.

#### 10.4.4 Completed Resource Read Result

The `result` value represents the value inside a successful JSON-RPC response's `result` member. It MUST contain a non-empty `contents` array. For MCP 2026-07-28 it MUST contain `resultType: "complete"`, non-negative numeric `ttlMs`, and `cacheScope` equal to `"public"` or `"private"`; these are required fields of the MCP `CacheableResult` extended by `ReadResourceResult`. For earlier supported revisions it MUST NOT contain `resultType`, `ttlMs`, or `cacheScope`. A declaration whose examples would span MCP 2026-07-28 and an earlier revision therefore MUST be split into disjoint protocol-scoped variants with revision-compatible example maps. Result `_meta` and Resource Contents `_meta` are available from MCP 2025-06-18 and are literal illustrative values governed by [Section 3.5](#35-mcp-_meta), not reusable metadata contracts. In MCP 2026-07-28, result `_meta` MAY use `io.modelcontextprotocol/serverInfo` with an MCP Implementation value; request-only and notification-only reserved keys are invalid here. JSON-RPC envelope fields, errors, task state, input-required state, and other non-completed workflows MUST NOT appear.

Every `contents` entry MUST contain `uri` and exactly one of `text` or `blob`. A `blob` value MUST be valid base64. An example MAY contain multiple entries; consumers MUST preserve their order and MUST NOT assume every returned URI equals the requested URI.

For both static and template examples, at least one returned entry SHOULD identify the requested URI unless documented collection or indirection semantics explain otherwise. Every returned URI MUST be valid. When the declaration has `mimeType`, the corresponding returned entry SHOULD use the same type; a validator SHOULD warn rather than fail when they differ because an individual representation may legitimately be more specific. The entry's own `mimeType` is authoritative for rendering it.

For a static Resource with `size`, tooling MAY compare the declared raw byte count with matching example text encoded as UTF-8 or decoded binary. A mismatch SHOULD be reported as a warning because examples and mutable Resources can represent different observations.

Resource read errors are JSON-RPC errors and are not Resource Examples in 0.8.0.

#### 10.4.5 Use, Projection, and Security

Resource examples are illustrative, non-exhaustive snapshots. They do not assert live equality, freshness, immutability, cache validity, or complete coverage. Revision-supported metadata is part of the example and is not a guarantee about a live server. In particular, `ttlMs` and `cacheScope` reproduce the illustrated MCP 2026-07-28 result; they do not govern caching of the MCP Description document or authorize sharing captured or live content across authorization contexts.

Documentation tooling SHOULD preserve names, concrete template URIs, result fields, and content order. Mock and contract-test tooling MAY select an exact named example. It MUST NOT dereference example URIs or fetch a live Resource while loading or serving an inline example. This specification defines no default example, wildcard match, template fallback, dynamic behavior, external value, or reusable root component.

Resource examples are MCP Description metadata, not fields of MCP Resource or Resource Template list values. Projection to MCP list values MUST omit `examples` unless an independent MCP extension defines a destination. Effective Protocol View projection preserves the selected declaration's map and MUST NOT combine maps from declarations with disjoint scopes. MCP Description round-tripping MUST preserve example names and values.

Examples and their URIs are untrusted. Authors MUST NOT include secrets and SHOULD use conspicuously fictitious content. Consumers MUST NOT dereference URIs automatically, MUST render content safely, MUST treat MIME types as untrusted hints, and SHOULD impose encoded-size, decoded-size, and processing limits. Binary fixtures SHOULD be decoded and inspected before publication.

### 10.5 Protocol Variants and Security

Resources with the same `uri` MUST have pairwise-disjoint effective protocol scopes. Resource Templates with the same `uriTemplate` MUST likewise have pairwise-disjoint effective protocol scopes.

Resource `security` describes statically known authorization required to access it. Resource Template `security` describes authorization required to use the template to access matching resources. Each replaces inherited transport or root security in full.

### 10.6 Examples

**Static resources for chess game history:**

```json
{
  "resources": [
    {
      "uri": "chess://leaderboard/classical",
      "name": "classical_leaderboard",
      "title": "Classical Leaderboard",
      "description": "Current top-100 classical chess ratings leaderboard",
      "mimeType": "application/json",
      "protocolVersions": ["2026-07-28"],
      "annotations": {
        "audience": ["user", "assistant"],
        "priority": 0.9,
        "lastModified": "2026-08-24T10:00:00Z"
      },
      "examples": {
        "top-two": {
          "result": {
            "resultType": "complete",
            "ttlMs": 60000,
            "cacheScope": "public",
            "contents": [
              {
                "uri": "chess://leaderboard/classical",
                "mimeType": "application/json",
                "text": "{\"players\":[{\"name\":\"Example A\",\"rating\":2810},{\"name\":\"Example B\",\"rating\":2795}]}"
              }
            ]
          }
        }
      },
      "tags": ["leaderboard", "rating"]
    },
    {
      "uri": "chess://leaderboard/rapid",
      "name": "rapid_leaderboard",
      "title": "Rapid Leaderboard",
      "description": "Current top-100 rapid chess ratings leaderboard",
      "mimeType": "application/json",
      "tags": ["leaderboard", "rating"]
    },
    {
      "uri": "chess://rules/fide-2024",
      "name": "fide_rules",
      "title": "FIDE Rules 2024",
      "description": "Official FIDE Laws of Chess (2024 edition)",
      "mimeType": "text/markdown",
      "tags": ["rules", "reference"]
    }
  ]
}
```

**Resource templates for parameterized access:**

```json
{
  "resourceTemplates": [
    {
      "uriTemplate": "chess://games/{game_id}",
      "name": "game_detail",
      "title": "Game Detail",
      "description": "Full details of a specific chess game including PGN, moves, and analysis",
      "mimeType": "application/json",
      "protocolVersions": ["2026-07-28"],
      "annotations": {
        "audience": ["assistant"],
        "priority": 0.7
      },
      "examples": {
        "sample-game": {
          "uri": "chess://games/example-1234",
          "result": {
            "resultType": "complete",
            "ttlMs": 60000,
            "cacheScope": "private",
            "contents": [
              {
                "uri": "chess://games/example-1234",
                "mimeType": "application/json",
                "text": "{\"id\":\"example-1234\",\"result\":\"1-0\"}"
              }
            ]
          }
        }
      },
      "tags": ["game", "history"]
    },
    {
      "uriTemplate": "chess://players/{player_id}/games?from={start_date}&to={end_date}",
      "name": "player_game_history",
      "title": "Player Game History",
      "description": "Game history for a specific player within an optional date range",
      "mimeType": "application/json",
      "tags": ["game", "history", "player"]
    },
    {
      "uriTemplate": "chess://players/{player_id}/rating-history",
      "name": "player_rating_history",
      "title": "Player Rating History",
      "description": "Historical rating progression for a player",
      "mimeType": "application/json",
      "tags": ["rating", "history", "player"]
    }
  ]
}
```

