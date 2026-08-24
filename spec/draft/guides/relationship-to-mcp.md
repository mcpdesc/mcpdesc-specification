# Relationship to the MCP Protocol

## Complementary Roles

The [Model Context Protocol](https://modelcontextprotocol.io) defines runtime communication and behavior between clients and servers: discovery, tool invocation, resource access, prompt retrieval, notifications, authorization, and other protocol interactions.

MCP Description defines a static representation of a server surface: identity metadata, described protocol revisions, durable instructions, transports, security requirements, semantic capabilities, and primitive declarations. A description exists independently of a running server and does not reproduce MCP wire choreography.

For each declared protocol revision, that revision's normative MCP specification remains authoritative for MCP types and runtime behavior. MCP Description neither overrides nor amends those requirements. It defines the description document, adds supplemental static metadata, and provides protocol-scoped projection and merge rules for servers described across multiple MCP revisions.

| Aspect | MCP Protocol | MCP Description |
|--------|--------------|-----------------|
| Nature | Runtime protocol | Static document format |
| Server required | Yes | No |
| Protocol revisions | Selected and used at runtime | Declared and scoped statically |
| Capabilities | Advertised or discovered dynamically | Described as durable semantics |
| Tools | Invoked | Described with input and output schemas |
| Resources | Read or subscribed to | Catalogued |
| Prompts | Retrieved | Catalogued |
| Authorization | Enforced at runtime | Statically known requirements described |

## MCP Description Does Not Replace Runtime Behavior

A description does not execute Tools, contain Resource content, retrieve Prompts, enforce authorization, manage sessions, or define runtime error handling. Servers and clients continue to follow the applicable MCP revision.

Static security requirements do not predict whether an unauthorized primitive is visible during runtime discovery. Likewise, an observed description reflects only the protocol revision and authorization context actually observed unless authoritative design metadata supplies a broader surface.

## Protocol Revisions

The `mcpdesc` field and MCP protocol coverage are independent dimensions:

```json
{
  "mcpdesc": "0.8.0",
  "protocolVersions": ["2025-11-25", "2026-07-28"]
}
```

`mcpdesc` selects this document format. Root `protocolVersions` lists the MCP revisions described by the document. Applicable transports, Capabilities Objects, Tools, Resources, Resource Templates, and Prompts may narrow that root set with their own `protocolVersions`.

A single-version Effective Protocol View is produced by retaining declarations applicable to one root revision and removing their now-redundant scopes. The applicable MCP revision determines how the represented behavior is exercised on the wire.

## Durable Semantics Across Wire Changes

MCP Description retains fields such as `tools.listChanged`, `prompts.listChanged`, `resources.listChanged`, and `resources.subscribe` because they describe observable server behavior. It does not add message catalogues for the different notification or subscription mechanisms used by different MCP revisions.

Where semantics materially differ, declarations are split by protocol scope. For example, core Tasks in MCP 2025-11-25 and a formal Tasks extension in MCP 2026-07-28 are represented separately and are not automatically converted into one another.
