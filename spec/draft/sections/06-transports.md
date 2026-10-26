## 6. Transports

The optional `transports` property declares one or more communication mechanisms for the MCP server. When present, it MUST contain at least one Transport Object. Omission means that the document declares no connection mechanism; it MUST NOT be interpreted as proof that the server has no transport.

### 6.1 Overview

MCP servers can be accessed through different transport mechanisms. The `transports` array allows a single MCP Description document to declare all supported transports, enabling clients to select the most appropriate one.

### 6.2 Transport Types

Each transport object MUST include a `type` property. The following transport types are defined:

Every Transport Object MAY contain `protocolVersions` and `security`. `protocolVersions` follows Section 4.5. A transport's `security` value is a Security Requirement Array and follows Sections 6.4 and 7.

#### 6.2.1 Streamable HTTP Transport

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"streamable-http"` | **Yes** | Transport type identifier |
| `url` | string (URI) | **Yes** | MCP endpoint URL |

The streamable HTTP transport connects to an MCP server over HTTP with streaming response support. It is defined for MCP 2025-03-26 and later and is the RECOMMENDED transport for remote MCP servers in those revisions.

```json
{
  "type": "streamable-http",
  "url": "https://chess-coach.example.com/mcp"
}
```

#### 6.2.2 stdio Transport

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"stdio"` | **Yes** | Transport type identifier |
| `command` | string | **Yes** | Command to launch the server |
| `args` | array\<string\> | No | Command arguments |
| `env` | object | No | Environment variables (string values) |

The stdio transport launches the MCP server as a subprocess and communicates over standard input/output.

```json
{
  "type": "stdio",
  "command": "chess-coach",
  "args": ["mcp", "--level", "advanced"],
  "env": {
    "CHESS_DB_PATH": "/data/games.db"
  }
}
```

#### 6.2.3 SSE Transport (Legacy)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"sse"` | **Yes** | Transport type identifier |
| `url` | string (URI) | **Yes** | SSE endpoint URL |

The Server-Sent Events transport is a legacy transport type retained for backward compatibility. It is the remote transport defined by MCP 2024-11-05. Validators SHOULD warn when it is associated with MCP 2025-03-26 or later, where Streamable HTTP is the standard remote transport. New implementations SHOULD use `streamable-http` instead.

```json
{
  "type": "sse",
  "url": "https://chess-coach.example.com/sse"
}
```

### 6.3 Multiple Transports

A server MAY support multiple transports. Clients SHOULD select the most appropriate transport based on their environment and capabilities.

```json
{
  "transports": [
    { "type": "streamable-http", "url": "https://chess-coach.example.com/mcp" },
    { "type": "stdio", "command": "chess-coach", "args": ["mcp"] }
  ]
}
```

### 6.4 Transport-Scoped Security

Each transport object MAY include a `security` property containing a Security Requirement Array (see Section 7). When present, transport security replaces root security for that transport.

| Scenario | Effective security |
|----------|-------------------|
| Root `security` defined, transport `security` omitted | Inherits root security |
| Root `security` defined, transport `security` is `[]` (empty) | Explicitly no authentication |
| Root `security` defined, transport `security` defined | Transport's own security |
| Root `security` omitted, transport `security` omitted | No authentication |

This mechanism allows a single MCP Description document to declare different security requirements for different transports. For example, an HTTP transport typically requires bearer authentication while a stdio transport relies on OS-level process isolation:

```json
{
  "transports": [
    {
      "type": "streamable-http",
      "url": "https://chess-coach.example.com/mcp",
      "security": [
        { "bearer": [] }
      ]
    },
    {
      "type": "stdio",
      "command": "chess-coach",
      "args": ["mcp"],
      "security": []
    }
  ]
}
```

The `bearer` name in this example MUST identify a root `securitySchemes` entry.

### 6.5 Protocol Coverage

When `transports` is present, the union of all effective transport protocol scopes MUST equal root `protocolVersions`. Transport scopes MAY overlap because a server can expose multiple transports for one revision.

A document with `transports` is invalid when any root revision has no applicable transport or when a transport scope contains a revision outside root coverage. When `transports` is omitted, transport coverage validation does not apply: validators MUST NOT infer a transport or report uncovered root revisions.

### 6.6 Extensibility

Transport Objects MAY carry `x-*` specification extensions. They MUST NOT contain other additional properties beyond those defined for their type plus the common optional `protocolVersions` and `security` properties.

