## 13. Tags

The root-level `tags` array defines a flat, document-wide tag catalogue for the MCP server. It is OPTIONAL. Tags are supplemental MCP Description metadata; they are not fields defined by the MCP protocol.

When present, `tags` declares all valid tags that MAY be referenced by tools, resources, resource templates, and prompts. The array order determines display priority — tags appearing earlier in the array SHOULD be presented first in UIs and documentation.

### 13.1 Tag Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Tag identifier. MUST be unique across all tags. |
| `description` | string | No | Human-readable description of the tag's purpose. |

### 13.2 Tag Uniqueness

Tag names MUST be unique across all tags in the array. Implementations MUST reject documents containing duplicate tag names.

### 13.3 Tag References

Per-entity `tags` arrays (on tools, resources, resource templates, and prompts) contain plain strings referencing tag names. When a root-level `tags` array is present:

- Every tag referenced by an entity MUST be declared in the root `tags` array.
- Implementations MUST treat a reference to an undeclared tag as a validation error.
- Per-entity tag arrays MUST NOT contain duplicate values.

When the root-level `tags` array is absent, per-entity tags are unconstrained strings (backward-compatible behavior). When it is present but empty, no per-entity tag reference is valid.

### 13.4 Protocol Scopes and Effective Protocol Views

The root tag catalogue is not protocol-scoped. A tag describes a categorization concept across the MCP Description document rather than protocol behavior. An Effective Protocol View MUST preserve the complete root tag catalogue, including entries not referenced by a primitive retained in that view.

Protocol-scoped variants of the same primitive MAY use different `tags` arrays. Every reference in every variant is still validated against the document-wide root catalogue when that catalogue is present.

Merge inputs MUST therefore agree on the root tag catalogue under the general unscoped-metadata merge rules. Merge tooling MUST NOT infer, discard, or synthesize catalogue entries from the tags referenced in individual views.

Elicitation Declarations do not carry tags. They are named behaviors nested within an already categorizable Tool, Resource, Resource Template, or Prompt. A future extension of tags to nested behaviors requires a separate use case and compatibility decision.

### 13.5 Example

Flat tag list with entity references:

```json
{
  "tags": [
    { "name": "analysis", "description": "Game analysis tools" },
    { "name": "rating", "description": "Player and game rating tools" },
    { "name": "history", "description": "Game history and records" },
    { "name": "leaderboard", "description": "Ranking leaderboards" },
    { "name": "player", "description": "Player-specific data" }
  ],
  "tools": [
    {
      "name": "analyze_game",
      "tags": ["analysis"]
    },
    {
      "name": "get_player_rating",
      "tags": ["rating", "player"]
    }
  ],
  "resources": [
    {
      "uri": "chess://leaderboards/classical",
      "name": "classical_leaderboard",
      "tags": ["leaderboard", "rating"]
    }
  ]
}
```
