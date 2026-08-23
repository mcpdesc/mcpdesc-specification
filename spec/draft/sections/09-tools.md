## 9. Tools

The `tools` array declares the tools exposed by the MCP server. Each tool represents a server-side function that clients can invoke.

### 9.1 Tool Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP revisions to which this declaration applies. |
| `name` | string | **Yes** | Programmatic tool name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Since MCP 2025-06-18. |
| `description` | string | No | Human-readable tool description. |
| `inputSchema` | object | **Yes** | JSON Schema whose root describes an object containing tool input parameters. |
| `outputSchema` | object | No | JSON Schema for structured tool output. Since MCP 2025-06-18. |
| `annotations` | [Tool Annotations Object](#93-tool-annotations) | No | Behavioral hints. Since MCP 2025-03-26. |
| `execution` | [Execution Object](#94-execution-object) | No | Execution properties. MCP 2025-11-25 only. |
| `icons` | array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 12.3](#123-tag-references)). |
| `deprecated` | boolean | No | Whether the tool is deprecated. |
| `_meta` | object | No | Protocol-reserved metadata. Since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |

### 9.2 Input and Output Schemas

Every Tool MUST contain `inputSchema`. Absence MUST NOT be interpreted as evidence that the Tool accepts no arguments. The schema root MUST describe an object.

A closed no-parameter Tool SHOULD use `{ "type": "object", "additionalProperties": false }`. An open unspecified-parameter Tool may use `{ "type": "object" }`, but this is NOT RECOMMENDED because it gives little validation or guidance. A declared-parameter schema uses `properties` and, when undeclared properties must be rejected, `additionalProperties: false`.

The `outputSchema` property, when present, MUST be a valid JSON Schema object describing the tool's structured output. For MCP 2025-11-25 and MCP 2026-07-28, it defaults to JSON Schema 2020-12 when no explicit `$schema` is provided.

For MCP 2025-11-25 and MCP 2026-07-28, both schemas MAY include an explicit `$schema` property to declare the JSON Schema dialect. Earlier revisions do not define that property on Tool schemas. For MCP 2026-07-28, validators MUST accept the applicable JSON Schema 2020-12 vocabulary, including references, composition, and conditionals, plus MCP-defined annotations where valid. Earlier views MUST be checked according to their applicable MCP schema rules.

For MCP 2025-11-25 and MCP 2026-07-28, every embedded Tool schema MUST be valid under its declared or default dialect. Both revisions default to JSON Schema 2020-12. A validator MUST reject a schema whose declared dialect it does not support.

The supported revisions before MCP 2025-11-25 define an object-rooted Tool schema shape but do not state an embedded-schema dialect default. For those revisions, validators MUST enforce the applicable shape without inferring a dialect solely from the enclosing generated MCP schema. `properties`, when present, MUST be an object whose values are objects, and `required`, when present, MUST be an array of strings. Other keywords MUST be preserved and MUST NOT be rejected solely by applying an inferred meta-schema.

An mcpdesc validator MUST NOT automatically retrieve an external `$ref` target from a network. It MAY resolve external references from an explicitly supplied trusted local catalogue or an explicitly enabled resolver that follows the applicable MCP security guidance. If a target remains unavailable, the `$ref` MUST be preserved and its presence alone MUST NOT make the containing MCP Description invalid. The validator SHOULD warn that complete embedded-schema validation was not possible and MUST NOT report a weakened or partial validation as complete. Consumers that require executable schema certainty SHOULD require resolution or treat this warning as an error. Authors SHOULD prefer self-contained Tool schemas using local `$defs`.

Before MCP 2026-07-28, `outputSchema` MUST declare an object root. MCP 2026-07-28 permits any valid JSON Schema root for `outputSchema`.

MCP 2026-07-28 `inputSchema` properties MAY use `x-mcp-header` to map an input to an HTTP header. The annotation value MUST be a non-empty HTTP field-name token and MUST be unique case-insensitively within that `inputSchema`. It is valid only on a `string`, `integer`, or `boolean` property that is statically reachable from the schema root through `properties` chains. It MUST NOT be used on a property reached through arrays, composition, conditionals, or `$ref`.

### 9.3 Protocol Variants and Security

Tools with the same `name` MUST have pairwise-disjoint effective protocol scopes. Projection therefore yields at most one declaration for that name. An omitted scope covers all root revisions and overlaps every scoped Tool with the same name.

Tool `security` describes statically known authorization required to call the Tool and replaces inherited transport or root security in full.

### 9.4 Tool Annotations

Tool annotations provide hints about tool behavior. These are advisory — implementations MUST NOT rely on annotations being accurate.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | string | — | Human-readable title for the tool |
| `readOnlyHint` | boolean | `false` | Tool does not modify its environment |
| `destructiveHint` | boolean | `true` | Tool may perform destructive updates |
| `idempotentHint` | boolean | `false` | Repeated calls with same arguments have no additional effect |
| `openWorldHint` | boolean | `true` | Tool may interact with external entities |

The annotations object allows additional properties for forward compatibility.

### 9.5 Execution Object

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `taskSupport` | string | `"forbidden"` | Whether the tool supports task-augmented execution: `"forbidden"`, `"optional"`, or `"required"` |

### 9.6 Example

```json
{
  "tools": [
    {
      "name": "analyze_game",
      "title": "Analyze Chess Game",
      "description": "Analyze a chess game from PGN notation and return evaluation scores",
      "inputSchema": {
        "type": "object",
        "properties": {
          "pgn": {
            "type": "string",
            "description": "Game in Portable Game Notation (PGN) format"
          },
          "depth": {
            "type": "integer",
            "description": "Analysis depth in half-moves",
            "minimum": 1,
            "maximum": 40
          }
        },
        "required": ["pgn"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "evaluation": { "type": "number", "description": "Centipawn evaluation" },
          "best_move": { "type": "string", "description": "Best move in algebraic notation" },
          "blunders": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "move_number": { "type": "integer" },
                "move": { "type": "string" },
                "evaluation_loss": { "type": "number" }
              }
            }
          }
        }
      },
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true
      },
      "tags": ["analysis", "chess"]
    },
    {
      "name": "get_player_rating",
      "title": "Get Player Rating",
      "description": "Get the current Elo rating and rating history for a chess player",
      "inputSchema": {
        "type": "object",
        "properties": {
          "player_id": {
            "type": "string",
            "description": "Unique player identifier"
          },
          "rating_type": {
            "type": "string",
            "enum": ["classical", "rapid", "blitz", "bullet"],
            "description": "Type of rating to retrieve"
          }
        },
        "required": ["player_id"]
      },
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false
      },
      "tags": ["rating", "player"]
    },
    {
      "name": "record_game_result",
      "title": "Record Game Result",
      "description": "Record the result of a chess game and update player ratings",
      "inputSchema": {
        "type": "object",
        "properties": {
          "white_player_id": { "type": "string", "description": "White player identifier" },
          "black_player_id": { "type": "string", "description": "Black player identifier" },
          "result": {
            "type": "string",
            "enum": ["1-0", "0-1", "1/2-1/2"],
            "description": "Game result in standard notation"
          },
          "pgn": { "type": "string", "description": "Full game PGN (optional)" },
          "time_control": { "type": "string", "description": "Time control (e.g., '10+0', '3+2')" }
        },
        "required": ["white_player_id", "black_player_id", "result"]
      },
      "annotations": {
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false
      },
      "tags": ["rating", "game"]
    }
  ]
}
```

