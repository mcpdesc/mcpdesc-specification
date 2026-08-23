# Frequently Asked Questions

## General

### What is an MCP Description?

An MCP Description is a JSON document that describes what an MCP server offers — its tools, resources, prompts, transports, and security requirements — without requiring a connection to the server.

### How is this different from the MCP protocol?

The MCP protocol defines runtime communication (connecting, calling tools, fetching resources). An MCP Description is a static document that describes the server's capabilities. They're complementary — see [Relationship to MCP](relationship-to-mcp.md).

### Why not just use OpenAPI?

OpenAPI is designed for HTTP REST APIs. MCP servers have different concepts (tools instead of operations, multiple transport types, prompts, resources). The MCP Description borrows OpenAPI patterns where they fit (info, security) but uses MCP-native structures for capabilities. See [Comparison with OpenAPI](comparison-with-openapi.md).

## Creating Documents

### What's the minimum valid document?

A document needs `mcpdesc`, `info` (with `name` and `version`), non-empty `protocolVersions`, and `transports` (at least one, collectively covering every root revision). Primitive collections are optional. See [examples/minimal.yaml](../examples/minimal.yaml).

### Do I have to write it by hand?

No. MCP Description documents can be:
- Generated from a running server using tools like the [mcpcontract CLI](https://github.com/cisco-open/mcptoolkit-contract)
- Hand-authored in any JSON or YAML editor (with validation via the `$schema` property or an IDE such as [mcpeditor](https://www.npmjs.com/package/@cisco_open/mcptoolkit-editor))
- Generated from code annotations or configuration files

### What file extension should I use?

The recommended extension is `.mcpdesc.json`. 
You may also use `.mcp-description.json`.

### How do I validate my document?

Use the 0.8.0 JSON Schema with a JSON Schema 2020-12 validator and run semantic validation for cross-object rules. Add `"$schema": "https://mcpdesc.org/schema/0.8.0.json"` for IDE validation.

## Technical

### Can a server have multiple transports?

Yes. The `transports` array can contain multiple entries (e.g., both `streamable-http` and `stdio`). Clients choose the most appropriate one.

### What about SSE transport?

SSE (`"type": "sse"`) is supported for backward compatibility but is considered legacy. New implementations should use `streamable-http`.

### Are tool annotations reliable?

Annotations are advisory hints, not guarantees. A tool marked `readOnlyHint: true` **should** be read-only, but implementations must not assume it is. Annotations help with UI display and safety decisions.

### How does versioning work?

The `mcpdesc` field declares which version of this description specification the document conforms to. Root `protocolVersions` declares the MCP revisions described by the document; scoped declarations can narrow their applicability. These version dimensions are independent.

### How does security inheritance work?

Reusable schemes are declared under root `securitySchemes`. A primitive `security` value replaces a selected transport's value, which replaces root `security`. Omission inherits, `security: []` clears inherited requirements, and `security: [{}]` declares an explicit anonymous alternative.

## Extensions

### Can I add custom fields?

Yes, using specification extensions. Any root-level property starting with `x-` is an extension. See [Vendor Extensions Guide](vendor-extensions-guide.md).

### Will my extension break other tools?

No. Conforming implementations must ignore unknown extensions. Your custom metadata passes through safely.
