## 5. Info Object

The `info` object provides metadata about the MCP server. It is REQUIRED.

The `info` object combines OpenAPI-style metadata (`contact`, `license`) with fields from the MCP `Implementation` type used for server identity. The MCP-sourced fields — `name`, `title`, `description`, `version`, `icons`, and `websiteUrl` — allow an MCP Description document to represent server identity metadata that may also be advertised at runtime.

Info is unscoped, document-wide MCP Description metadata. Every property defined by this specification MAY appear regardless of the revisions listed in root `protocolVersions`. A mapping to MCP `Implementation` indicates that a producer MAY obtain or compare the value through runtime initialization when the negotiated revision defines that field. It MUST NOT be interpreted as requiring a runtime origin or restricting the property's presence to those revisions. Validators MUST NOT emit a revision-applicability diagnostic solely because an Info property is unavailable on `Implementation` in an applicable MCP revision.

A producer MAY obtain Info metadata from author input, configuration, package metadata, a registry, runtime discovery, or another source. This specification does not assign trust or precedence among those sources, and consumers MUST NOT infer that an Info value was asserted by a live server.

### 5.1 Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Programmatic server name (identifier). MUST be non-empty. Maps to `Implementation.name` (MCP `BaseMetadata`). |
| `version` | string | **Yes** | Server version. Semver RECOMMENDED. MUST be non-empty. Maps to `Implementation.version`. |
| `title` | string | No | Human-readable display name for UI contexts. Falls back to `name` if not provided. Runtime mapping: `Implementation.title` (MCP `BaseMetadata`, available since 2025-06-18). |
| `description` | string | No | Brief description of what the server does. Runtime mapping: `Implementation.description` (available since MCP 2025-11-25). |
| `id` | string | No | Unique server identifier (URI, DID, or URN). |
| `icons` | non-empty array\<[Icon](#appendix-a-icon-object)\> | No | Icons for UI display. Runtime mapping: `Implementation.icons` (available since MCP 2025-11-25). |
| `websiteUrl` | string (URI) | No | URL of the server's website. Runtime mapping: `Implementation.websiteUrl` (available since MCP 2025-11-25). |
| `contact` | [Contact Object](#52-contact-object) | No | Contact information (OpenAPI-style, not part of MCP `Implementation`). |
| `license` | [License Object](#53-license-object) | No | License information (OpenAPI-style, not part of MCP `Implementation`). |

### 5.2 Contact Object

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Organization or maintainer name |
| `url` | string (URI) | Contact URL |
| `email` | string (email) | Contact email address |

### 5.3 License Object

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

