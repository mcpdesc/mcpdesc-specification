## 5. Info Object

The `info` object provides metadata about the MCP server. <a id="req-info-required"></a>It is REQUIRED.

The `info` object combines OpenAPI-style metadata (`contact`, `license`) with server identity fields from MCP.

During initialization, an MCP server identifies itself by returning an `Implementation` value as `serverInfo` in its `initialize` result. The Info fields `name`, `title`, `description`, `version`, `icons`, and `websiteUrl` correspond to fields of that type. The "Runtime mapping" entries in Section 5.1 name the corresponding field and the MCP protocol version that introduced it, so tools can compare a description with what a running server reports.

Info is unscoped, document-wide MCP Description metadata (Section 4.10). Every property defined in this section MAY appear regardless of the protocol versions listed in root `protocolVersions`. <a id="req-info-protocol-version-independent"></a>A runtime mapping MUST NOT be interpreted as requiring the value to come from a running server, or as limiting the property to protocol versions whose `Implementation` type defines the field. MCP 2025-11-25 and MCP 2026-07-28 define every mapped field, so this requirement matters only for documents that cover earlier protocol versions. For example, `description` is valid in a document that covers MCP 2025-06-18, although `Implementation.description` is available only since MCP 2025-11-25. Validators MUST NOT emit a protocol-version applicability diagnostic solely because an Info property is unavailable on `Implementation` in an applicable MCP protocol version.

A producer MAY obtain Info metadata from author input, configuration, package metadata, a registry, runtime discovery, or another source. <a id="req-info-trust"></a>This specification does not assign trust or precedence among those sources, and consumers MUST NOT infer that an Info value was asserted by a live server.

### 5.1 Properties

<a id="req-info-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Programmatic server name (identifier). <a id="req-info-name-non-empty"></a>MUST be non-empty. Runtime mapping: `Implementation.name` (MCP `BaseMetadata`). |
| `version` | string | **Yes** | Server version. <a id="req-info-version-semver"></a>Semantic Versioning RECOMMENDED. <a id="req-info-version-non-empty"></a>MUST be non-empty. Runtime mapping: `Implementation.version`. |
| `title` | string | No | Human-readable display name for UI contexts. Falls back to `name` if not provided. Runtime mapping: `Implementation.title` (MCP `BaseMetadata`, available since MCP 2025-06-18). |
| `description` | string | No | Brief description of what the server does. Runtime mapping: `Implementation.description` (available since MCP 2025-11-25). |
| `id` | string | No | Unique server identifier (URI, DID, or URN). |
| `icons` | non-empty array\<[Icon](#appendix-a-icon-object)\> | No | Icons for UI display. Runtime mapping: `Implementation.icons` (available since MCP 2025-11-25). |
| `websiteUrl` | string (URI) | No | URL of the server's website. Runtime mapping: `Implementation.websiteUrl` (available since MCP 2025-11-25). |
| `contact` | [Contact Object](#52-contact-object) | No | Contact information (OpenAPI-style, not part of MCP `Implementation`). |
| `license` | [License Object](#53-license-object) | No | License information (OpenAPI-style, not part of MCP `Implementation`). |

### 5.2 Contact Object

<a id="req-contact-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | No | Organization or maintainer name |
| `url` | string (URI) | No | Contact URL |
| `email` | string (email) | No | Contact email address |

### 5.3 License Object

<a id="req-license-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | License name (e.g., `"Apache-2.0"`, `"MIT"`) |
| `url` | string (URI) | No | URL to the license text |

### 5.4 Example

```json
{
  "info": {
    "name": "chess-coach",
    "title": "Chess Coach MCP Server",
    "version": "2.1.0",
    "description": "Analyze chess games, track player ratings, and review game history",
    "id": "urn:mcp:chess-coach",
    "icons": [
      {
        "src": "https://chess-coach.example.com/icons/icon-48.png",
        "mimeType": "image/png",
        "sizes": ["48x48"]
      },
      {
        "src": "https://chess-coach.example.com/icons/icon.svg",
        "mimeType": "image/svg+xml",
        "sizes": ["any"],
        "theme": "light"
      }
    ],
    "websiteUrl": "https://chess-coach.example.com",
    "contact": {
      "name": "Chess Coach Team",
      "url": "https://example.com/chess-coach",
      "email": "chess@example.com"
    },
    "license": {
      "name": "MIT",
      "url": "https://opensource.org/licenses/MIT"
    }
  }
}
```

