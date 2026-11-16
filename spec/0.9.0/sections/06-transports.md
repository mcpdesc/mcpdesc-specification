## 6. Transports

The optional `transports` property declares one or more communication mechanisms for the MCP server. <a id="req-transports-non-empty"></a>When present, it MUST contain at least one Transport Object.

Omission means that the document declares no connection mechanism. <a id="req-transports-omission"></a>It MUST NOT be interpreted as proof that the server has no transport.

### 6.1 Overview

MCP servers can be accessed through different transport mechanisms. The `transports` array lets one MCP Description document declare several supported transports, so clients can select the most appropriate one.

### 6.2 Transport Types

Every Transport Object MAY contain `protocolVersions` and `security`. `protocolVersions` follows [Section 4.10](#410-protocol-scopes-and-inheritance). A transport's `security` value is a Security Requirement Array and follows Sections 6.4 and 7.

<a id="req-transport-type"></a>Each Transport Object MUST include a `type` property. The following transport types are defined.

#### 6.2.1 Streamable HTTP Transport

<a id="req-transport-streamable-http-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"streamable-http"` | **Yes** | Transport type identifier |
| `url` | string (URI) | **Yes** | MCP endpoint URL |

The streamable HTTP transport connects to an MCP server over HTTP with streaming response support. <a id="req-transport-streamable-http-protocol-versions"></a>It is defined for MCP 2025-03-26 and later. It is the RECOMMENDED transport for remote MCP servers in those protocol versions.

```json
{
  "type": "streamable-http",
  "url": "https://chess-coach.example.com/mcp"
}
```

#### 6.2.2 stdio Transport

<a id="req-transport-stdio-fields"></a>

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

<a id="req-transport-sse-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"sse"` | **Yes** | Transport type identifier |
| `url` | string (URI) | **Yes** | SSE endpoint URL |

The Server-Sent Events transport is a legacy transport type retained for backward compatibility. It is the remote transport defined by MCP 2024-11-05. <a id="req-transport-legacy-sse-warning"></a>Validators SHOULD warn when its effective scope includes MCP 2025-03-26 or later, where Streamable HTTP is the standard remote transport. New implementations SHOULD use `streamable-http` instead.

```json
{
  "type": "sse",
  "url": "https://chess-coach.example.com/sse"
}
```

### 6.3 Multiple Transports

A server MAY support multiple transports. <a id="req-transport-selection"></a>Clients SHOULD select the most appropriate transport based on their environment and capabilities.

```json
{
  "transports": [
    { "type": "streamable-http", "url": "https://chess-coach.example.com/mcp" },
    { "type": "stdio", "command": "chess-coach", "args": ["mcp"] }
  ]
}
```

### 6.4 Transport-Scoped Security

Each Transport Object MAY include a `security` property containing a Security Requirement Array (see Section 7). When present, transport security replaces root security for that transport.

| Transport `security` | Effective transport security |
|----------------------|------------------------------|
| Omitted | Root `security` when present; otherwise no mcpdesc-declared requirement |
| `[]` (empty) | Clears any inherited requirement |
| Non-empty | The transport's own requirements |

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

<a id="req-transport-security-example"></a>The `bearer` name in this example MUST identify a root `securitySchemes` entry.

### 6.5 Protocol Coverage

<a id="req-transport-coverage"></a>When `transports` is present, the union of all effective transport protocol scopes MUST equal root `protocolVersions`. Transport scopes MAY overlap because a server can expose multiple transports for one protocol version.

A document with `transports` is invalid when any root protocol version has no applicable transport or when a transport scope contains a protocol version outside root coverage. <a id="req-transport-coverage-omitted"></a>When `transports` is omitted, transport coverage validation does not apply: validators MUST NOT infer a transport or report uncovered root protocol versions.

### 6.6 Extensibility

Transport Objects MAY carry `x-*` specification extensions. <a id="req-transport-closed"></a>They MUST NOT contain properties other than those defined for their type and the common optional `protocolVersions` and `security` properties.

