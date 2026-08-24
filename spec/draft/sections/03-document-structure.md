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

### 3.4 MCP `_meta`

MCP-derived declaration and example objects identified by this specification MAY carry a literal `_meta` object when every revision in their Effective Protocol View defines `_meta` on the corresponding MCP object. A declaration `_meta` is the literal metadata on that Tool, Resource, Resource Template, or Prompt declaration. An example `_meta` is one illustrative literal value on the represented completed result or content object. Neither form declares a reusable metadata schema or requires a live server to emit the shown value.

For MCP 2025-06-18 and later, each `_meta` key MUST follow the applicable MCP key-name grammar. A key consists of an optional prefix and a possibly empty name. A prefix is one or more dot-separated labels followed by `/`; each label starts with a letter, ends with a letter or digit, and otherwise contains only letters, digits, or hyphens. A non-empty name starts and ends with an alphanumeric character and otherwise contains only alphanumerics, hyphens, underscores, or dots. Reverse-DNS prefix order is RECOMMENDED. Validators MUST reject malformed keys.

Reserved-prefix recognition is revision-specific. MCP 2025-06-18 reserves the prefix forms defined by that revision; MCP 2025-11-25 and MCP 2026-07-28 reserve a prefix whose second label is `modelcontextprotocol` or `mcp`. A validator MUST reject a recognized reserved key used with an invalid value shape or in a represented context where the applicable MCP revision does not define it. A validator that encounters an otherwise valid but unrecognized key under an MCP-reserved prefix MUST preserve it and SHOULD warn rather than infer that it is unauthorized. Valid unprefixed and third-party-prefixed keys MUST be accepted and preserved.

In contexts represented by 0.8.0, MCP 2026-07-28 `io.modelcontextprotocol/serverInfo` is valid on a completed result `_meta` and its value MUST have at least string `name` and `version` properties. MCP 2025-11-25 `io.modelcontextprotocol/related-task` is valid on a represented result and MUST contain a string `taskId`. Request-only keys such as `progressToken` and the MCP 2026 per-request protocol fields, and notification-only keys such as `io.modelcontextprotocol/subscriptionId`, MUST NOT be placed on declarations, ordinary result examples, or content objects. MCP 2026 trace-context keys are reserved wherever `_meta` is represented and MUST have non-empty string values. These rules do not authorize metadata in an object that the applicable MCP revision does not define as carrying `_meta`.

Complete revision-specific semantic validation begins with MCP 2025-06-18. MCP 2024-11-05 and MCP 2025-03-26 remain recognized legacy compatibility revisions: validators MUST apply sound structural and selected checks, SHOULD warn that validation is incomplete, and MUST NOT report partial validation as complete MCP semantic conformance.

MCP `_meta`, root `x-*` specification extensions, and `capabilities.extensions` are independent mechanisms. Tooling MUST preserve them independently and MUST NOT automatically project or reinterpret one as another. Projection MUST preserve `_meta` on each selected declaration and named example without merging metadata from disjoint protocol variants.

Authors MUST NOT publish credentials, tokens, user identifiers, internal topology, live trace identifiers, or other runtime-sensitive data in static `_meta`; fictitious or redacted values MUST be used where disclosure creates risk. Consumers MUST treat keys and values as untrusted data and apply appropriate size, rendering, logging, and processing limits.

### 3.5 Property Ordering

Property ordering within JSON objects is not significant. Implementations MUST NOT depend on property order.

### 3.6 Specification Extensions

Any property at the root level whose name matches the pattern `^x-` is a specification extension. See [Section 13: Specification Extensions](#13-specification-extensions) for details.

### 3.7 Additional Properties

Properties not defined in this specification and not matching the `x-` extension pattern MUST NOT appear at the root level. Implementations SHOULD reject documents containing unknown root-level properties.

### 3.8 Example

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

