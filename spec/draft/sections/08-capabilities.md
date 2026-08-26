## 8. Capabilities

The optional `capabilities` array declares protocol-scoped, durable server features. When present, it MUST contain at least one Capabilities Object.

### 8.1 Overview

Capabilities represent externally relevant server behavior beyond primitive inventories. They describe semantics, not the RPC or notification mechanism used to expose them.

### 8.2 Properties

| Property | Type | Description |
|----------|------|-------------|
| `protocolVersions` | array\<string\> | MCP revisions to which this object applies; inherits root coverage when omitted |
| `tools` | object | Tool-related capabilities |
| `tools.listChanged` | boolean | Whether the server sends `notifications/tools/list_changed` |
| `resources` | object | Resource-related capabilities |
| `resources.subscribe` | boolean | Whether the server supports resource subscriptions |
| `resources.listChanged` | boolean | Whether the server sends `notifications/resources/list_changed` |
| `prompts` | object | Prompt-related capabilities |
| `prompts.listChanged` | boolean | Whether the server sends `notifications/prompts/list_changed` |
| `completions` | object | Present if the server supports argument autocompletion (MCP 2025-03-26+) |
| `logging` | object | Present if the server supports sending log messages to the client |
| `tasks` | object | Present if the server supports core task-augmented requests (MCP 2025-11-25 only) |
| `extensions` | non-empty map\<string, object\> | Formal MCP extension capabilities (MCP 2026-07-28) |
| `experimental` | object | Experimental, non-standard capabilities |

### 8.3 Tasks Capability

The `tasks` object, when present, indicates the server supports long-running task management:

| Property | Type | Description |
|----------|------|-------------|
| `tasks.list` | object | Server supports listing active tasks |
| `tasks.cancel` | object | Server supports cancelling tasks |
| `tasks.requests.tools.call` | object | Tool calls can be task-augmented |

### 8.4 Extensibility

`extensions` keys MUST use the MCP mandatory-prefix metadata form `prefix/name`. A prefix whose second label is `modelcontextprotocol` or `mcp` is reserved for MCP use. Unknown syntactically valid extension identifiers are accepted and MUST be preserved. A validator SHOULD warn about an unrecognized identifier under a reserved prefix and MUST NOT treat absence from its local catalogue alone as proof of namespace misuse. Use known to be unauthorized is a semantic error.

Core `tasks` in MCP 2025-11-25 and a Tasks extension in MCP 2026-07-28 are distinct declarations and MUST NOT be automatically reinterpreted as one another. `logging` remains representable for revisions that define it; validators SHOULD warn when it applies to MCP 2026-07-28, where it is deprecated.

Unknown capability properties SHOULD be preserved. Root `x-*` specification extensions and MCP capability `extensions` are distinct namespaces.

### 8.5 Scope Uniqueness

Effective Capabilities Object scopes MUST be pairwise disjoint. At most one Capabilities Object may apply to a protocol revision.

### 8.5 Example

```json
{
  "capabilities": [
    {
      "protocolVersions": ["2025-11-25"],
      "tools": { "listChanged": true },
      "resources": { "subscribe": true, "listChanged": true },
      "prompts": { "listChanged": false },
      "completions": {},
      "logging": {},
      "tasks": { "requests": { "tools": { "call": {} } } }
    },
    {
      "protocolVersions": ["2026-07-28"],
      "tools": { "listChanged": true },
      "extensions": { "io.example/tasks": {} }
    }
  ]
}
```

