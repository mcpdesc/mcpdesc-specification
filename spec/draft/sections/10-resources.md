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
| `icons` | array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 12.3](#123-tag-references)). |
| `deprecated` | boolean | No | Whether the resource is deprecated. |
| `_meta` | object | No | Protocol-reserved metadata. Since MCP 2025-06-18. |
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
| `icons` | array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 12.3](#123-tag-references)). |
| `deprecated` | boolean | No | Whether the template is deprecated. |
| `_meta` | object | No | Protocol-reserved metadata. Since MCP 2025-06-18. |
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

In MCP protocol values, the same Resource Annotations type also applies to supported content blocks, including text, image, audio, embedded-resource, and resource-link content where those block types are available in the applicable revision. MCP Description fields that embed such protocol content MUST retain the distinction between Resource Annotations and Tool Annotations.

### 10.4 Protocol Variants and Security

Resources with the same `uri` MUST have pairwise-disjoint effective protocol scopes. Resource Templates with the same `uriTemplate` MUST likewise have pairwise-disjoint effective protocol scopes.

Resource `security` describes statically known authorization required to access it. Resource Template `security` describes authorization required to use the template to access matching resources. Each replaces inherited transport or root security in full.

### 10.5 Examples

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
      "annotations": {
        "audience": ["user", "assistant"],
        "priority": 0.9,
        "lastModified": "2026-08-24T10:00:00Z"
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
      "annotations": {
        "audience": ["assistant"],
        "priority": 0.7
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

