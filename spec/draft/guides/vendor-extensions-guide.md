# Vendor Extensions Guide

This guide explains how to create and use specification extensions in MCP Description documents.

## What Are Specification Extensions?

Specification extensions allow vendors, platforms, and organizations to attach custom metadata to MCP Description documents without modifying the core specification.

## Naming Convention

Extension properties MUST start with `x-`. The recommended format is:

```
x-{organization}-{feature}
```

Examples:
- `x-cisco-metadata` — Cisco runtime observations
- `x-acme-deployment` — deployment metadata
- `x-myorg-compliance` — governance tags

## Where Extensions Go

Extensions may appear at the root or directly on an eligible MCP Description-defined semantic object, such as Info, Transport, Security Scheme, Capabilities, Client Capability Requirements, Tool, Resource, Resource Template, Prompt, Prompt Argument, Tag, Elicitation Declaration, or named example wrapper objects:

```json
{
  "mcpdesc": "0.8.0",
  "info": { "name": "my-server", "version": "1.0.0" },
  "protocolVersions": ["2026-07-28"],
  "tools": [{
    "name": "my_tool",
    "inputSchema": { "type": "object" },
    "x-myorg-compliance": {
      "approved": true,
      "owner": "platform-team"
    }
  }]
}
```

Object eligibility is explicit. Domain-keyed maps, Security Requirement Objects, `capabilities.extensions`, `clientRequirements.extensions`, embedded JSON Schemas, MCP-native payload/result/annotation/`_meta` objects, arbitrary values, and Reference Objects do not gain extension slots. Extensions on eligible map values belong to those values, not to the containing map.

Use `x-*` on the outer Components Object and eligible semantic Tool, Resource, and Resource Template Example component values. Component namespace maps, schema component values, and Reference Objects are not specification-extension locations. An `x-*` key inside a namespace map is an ordinary component name and its value must satisfy that namespace's type.

## Do Not Confuse Extension Mechanisms

Root and object-level `x-*` properties extend the MCP Description document format. Literal `_meta` belongs to a particular MCP declaration, result, or content object and follows the applicable MCP revision's key and context rules. `capabilities.extensions` advertises server protocol extensions, while `clientRequirements.extensions` declares required client protocol extensions for one primitive. Root provenance records and primitive `provenanceIds` attribute descriptive evidence. These mechanisms are independent: tooling must preserve each one and must not automatically copy, project, or reinterpret data between them.

Use `x-*` for static description-format metadata that is not part of MCP, placing object-specific data on its eligible owner. Use `_meta` only where MCP defines it on the represented object. Use `capabilities.extensions` only to advertise an MCP protocol extension supported by the server in that Effective Protocol View, and `clientRequirements.extensions` only for an unconditional extension capability required from the client by one primitive.

## Creating Your Own Extension

### Step 1: Define the Schema

Create a JSON Schema for your extension:

```json
{
  "$id": "https://example.com/mcp/extensions/x-myorg-deployment/0.1.0",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "My Org Deployment Extension",
  "type": "object",
  "properties": {
    "environment": {
      "type": "string",
      "enum": ["development", "staging", "production"]
    },
    "region": {
      "type": "string",
      "description": "Deployment region"
    },
    "healthCheckUrl": {
      "type": "string",
      "format": "uri"
    }
  },
  "required": ["environment"]
}
```

### Step 2: Document It

Write clear documentation covering:
- **Purpose** — What problem does this extension solve?
- **Properties** — What fields are available and what do they mean?
- **Examples** — Show realistic usage
- **Versioning** — How the extension evolves

### Step 3: Publish

Make the schema and documentation available at a stable URL. Include the `$id` in the schema so tools can reference it.

## Processing Rules

Implementations that encounter extensions they don't recognize:

- **MUST** ignore unknown extensions (no errors)
- **SHOULD** preserve them when re-serializing
- **MUST NOT** infer core semantics from or modify values they don't understand
- **MUST** preserve them on retained owners during projection and must not silently discard conflicting values during merge

## Known Extensions

| Extension | Maintainer | Purpose |
|-----------|-----------|---------|
| `x-cisco-metadata` | Cisco DevNet | Runtime observations, CORS detection, dump provenance |

See [extensions/](../extensions/) for full specifications of registered extensions.

## Best Practices

1. **Version your extension schema** — use `$id` with version in the URL
2. **Keep it focused** — one extension per concern (don't combine deployment + governance)
3. **Document thoroughly** — other implementations may want to support your extension
4. **Use standard formats** — ISO 8601 for dates, URIs for URLs, etc.
5. **Don't duplicate core fields** — if it's in the spec, don't also put it in an extension
