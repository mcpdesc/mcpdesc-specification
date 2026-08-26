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
| Primitive client requirements | Declared through the revision's client capability mechanism | Unconditional minimum capabilities described per Tool, Resource, Resource Template, or Prompt |
| Tools | Invoked | Described with input and output schemas |
| Resources | Read or subscribed to | Catalogued |
| Prompts | Retrieved | Catalogued |
| Elicitation | Executed through revision-specific form, URL, or MRTR behavior | Expected operation-level interactions described statically |
| Authorization | Enforced at runtime | Statically known requirements described |

## MCP Description Does Not Replace Runtime Behavior

A description does not execute Tools, contain Resource content, retrieve Prompts, enforce authorization, manage sessions, or define runtime error handling. Servers and clients continue to follow the applicable MCP revision.

Elicitation Declarations document that fulfilling a primitive may require additional user interaction. They do not reproduce `elicitation/create`, Multi Round-Trip Request state, retries, correlation, capability negotiation, or lifecycle messages. The applicable MCP revision determines how a declared form or URL interaction is executed. Named Tool and Resource examples remain completed results rather than elicitation transcripts.

Primitive `clientRequirements` describes the opposite direction from root server `capabilities`: it records unconditional minimum client capabilities for call, read, or get of one primitive. It does not apply to listing, inherit from another object, imply authorization, or turn a conditional Elicitation Declaration into a hard requirement. MCP remains authoritative for how the client advertises those capabilities at runtime.

Static security requirements do not predict whether an unauthorized primitive is visible during runtime discovery. Likewise, an observed description reflects only the protocol revision and authorization context actually observed unless authoritative design metadata supplies a broader surface.

## Protocol Revisions

The `mcpdesc` field and MCP protocol coverage are independent dimensions:

```json
{
  "mcpdesc": "0.8.0",
  "protocolVersions": ["2025-11-25", "2026-07-28"]
}
```

`mcpdesc` selects this document format. Root `protocolVersions` lists the MCP revisions described by the document. Applicable transports, Capabilities Objects, Tools, Resources, Resource Templates, and Prompts may narrow that root set with their own `protocolVersions`. An Elicitation Declaration may narrow its containing primitive's effective scope further.

A single-version Effective Protocol View is produced by retaining declarations applicable to one root revision and removing their now-redundant scopes. The applicable MCP revision determines how the represented behavior is exercised on the wire.

## Durable Semantics Across Wire Changes

MCP Description retains fields such as `tools.listChanged`, `prompts.listChanged`, `resources.listChanged`, and `resources.subscribe` because they describe observable server behavior. It does not add message catalogues for the different notification or subscription mechanisms used by different MCP revisions.

Where semantics materially differ, declarations are split by protocol scope. For example, core Tasks in MCP 2025-11-25 and a formal Tasks extension in MCP 2026-07-28 are represented separately and are not automatically converted into one another.
