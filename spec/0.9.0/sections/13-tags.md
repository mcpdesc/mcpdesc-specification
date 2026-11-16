## 13. Tags

The root `tags` array is a flat, document-wide tag catalog for the MCP server. Tags are MCP Description metadata, not fields defined by the MCP protocol. <a id="req-tags-non-empty"></a>The array is OPTIONAL and MUST be non-empty when present. <a id="req-tags-omitted"></a>Producers MUST omit `tags` when they declare no catalog entries.

When present, `tags` lists the tag names that Tools, Resources, Resource Templates, and Prompts can reference. <a id="req-tags-display-order"></a>Array order sets display priority: user interfaces and documentation SHOULD present earlier tags first.

### 13.1 Tag Object

<a id="req-tag-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Tag name, unique within the root `tags` array (see [Section 13.2](#132-tag-uniqueness)). |
| `description` | string | No | Human-readable description of the tag's purpose. |

### 13.2 Tag Uniqueness

<a id="req-tags-unique"></a>Tag names MUST be unique within the root `tags` array. Validators MUST reject a document that contains duplicate tag names.

### 13.3 Tag References

A Tool, Resource, Resource Template, or Prompt can carry its own `tags` array of tag names. <a id="req-entity-tags-shape"></a>A primitive's `tags` array MUST be non-empty when present and MUST contain only strings. <a id="req-entity-tags-unique"></a>It MUST NOT contain duplicate values.

<a id="req-tags-references"></a>When the root `tags` array is present, every tag that a primitive references MUST be declared in it. When the root `tags` array is absent, primitive tags are unconstrained strings.

### 13.4 Protocol Scopes and Effective Protocol Views

The root tag catalog is not protocol-scoped. A tag categorizes primitives across the whole document; it does not describe protocol behavior. <a id="req-tags-views"></a>An Effective Protocol View MUST preserve the complete root tag catalog, including entries that no primitive in that view references.

Protocol-scoped variants of the same primitive MAY use different `tags` arrays. When the root catalog is present, every reference in every variant is validated against it.

<a id="req-tags-merge"></a>Merge inputs MUST agree on the root tag catalog under the merge rules for unscoped metadata (see [Section 4.13](#413-merge)). Merge tooling MUST NOT infer, discard, or synthesize catalog entries from the tags referenced in individual views.

Elicitation Declarations do not carry tags. Each one is nested within a Tool, Resource, Resource Template, or Prompt, which can already be tagged. Extending tags to nested declarations would need its own use case and compatibility review.

### 13.5 Example

A root tag catalog referenced by two Tools and a Resource:

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
