## 3. Document Structure

### 3.1 Format

An MCP Description document MUST be a JSON document encoded in UTF-8.

The RECOMMENDED file extension is `.mcpdesc.json`. Implementations MAY also accept `.mcp-description.json`.

The RECOMMENDED media type is `application/mcp-description+json`.

### 3.2 Root Object

The root of an MCP Description document is a JSON object with the following structure:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$schema` | string | No | JSON Schema reference for IDE validation |
| `mcpdesc` | string | **Yes** | Specification version (`"0.8.0"`) |
| `info` | [Info Object](#5-info-object) | **Yes** | Server metadata |
| `protocolVersions` | array\<string\> | **Yes** | MCP protocol revisions described by the document |
| `instructions` | string | No | Durable natural-language guidance for using the server |
| `transports` | array\<[Transport Object](#6-transports)\> | **Yes** | Supported transports (at least one) |
| `securitySchemes` | map\<string, [Security Scheme Object](#72-security-scheme-object)\> | No | Reusable named security schemes |
| `security` | [Security Requirement Array](#73-security-requirement-array) | No | Default security requirements |
| `capabilities` | non-empty array\<[Capabilities Object](#8-capabilities)\> | No | Protocol-scoped server capability declarations |
| `tools` | array\<[Tool Object](#9-tools)\> | No | Tools exposed by the server |
| `resources` | array\<[Resource Object](#10-resources)\> | No | Resources exposed by the server |
| `resourceTemplates` | array\<[Resource Template Object](#10-resources)\> | No | Resource templates |
| `prompts` | array\<[Prompt Object](#11-prompts)\> | No | Prompts exposed by the server |
| `tags` | array\<[Tag Object](#12-tags)\> | No | Flat tag list for categorization |

### 3.3 Zero-Primitive Descriptions

A document MAY omit all of `tools`, `resources`, `resourceTemplates`, and `prompts`. Such a document can describe a server under development, a legitimately empty server, or an authorization-scoped observation.

Absence of a primitive collection MUST NOT be interpreted as proof that no other runtime context exposes primitives of that kind.

### 3.4 Property Ordering

Property ordering within JSON objects is not significant. Implementations MUST NOT depend on property order.

### 3.5 Specification Extensions

Any property at the root level whose name matches the pattern `^x-` is a specification extension. See [Section 13: Specification Extensions](#13-specification-extensions) for details.

### 3.6 Additional Properties

Properties not defined in this specification and not matching the `x-` extension pattern MUST NOT appear at the root level. Implementations SHOULD reject documents containing unknown root-level properties.

### 3.7 Example

A minimal valid MCP Description document:

```json
{
  "$schema": "https://mcpdesc.org/schema/0.8.0.json",
  "mcpdesc": "0.8.0",
  "info": {
    "name": "chess-rating-server",
    "version": "1.0.0"
  },
  "protocolVersions": ["2025-11-25"],
  "transports": [
    { "type": "stdio", "command": "chess-rating", "args": ["serve"] }
  ],
  "tools": [
    {
      "name": "get_player_rating",
      "description": "Get the current Elo rating for a chess player",
      "inputSchema": {
        "type": "object",
        "properties": {
          "player_id": { "type": "string", "description": "Player identifier" }
        },
        "required": ["player_id"]
      }
    }
  ]
}
```

