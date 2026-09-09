# MCP Description Specification

A portable, machine-readable description format for [Model Context Protocol (MCP)](https://modelcontextprotocol.io) servers.

> This directory contains the MCP Description (`mcpdesc`) specification. Version
> **0.8.0** is the current stable release, maintained in this repository.
> Implementations vendor a single schema version from [`../schemas/mcp-description/`](../schemas/mcp-description/)
> and upgrade when the format advances.

## Overview

The **MCP Description Specification** defines a standard description format that describes the capabilities of an MCP server — its tools, resources, prompts, transports, and security requirements — without requiring a runtime connection.

Think of it as **OpenAPI for MCP servers**: a static description that enables discovery, documentation, validation, and governance across the MCP ecosystem.

## Status

| Version | Status | Canonical source | Schema |
|---------|--------|------------------|--------|
| 0.8.0 | Current stable release | [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification/tree/v0.8.0/spec/0.8.0) | [`../schemas/mcp-description/0.8.0.json`](../schemas/mcp-description/0.8.0.json) |
| 0.7.0 | Previous stable release | [`cisco-open/mcptoolkit-contract`](https://github.com/cisco-open/mcptoolkit-contract/tree/main/spec) | [`../schemas/mcp-description/0.7.0.json`](../schemas/mcp-description/0.7.0.json) |

The machine-readable form of this status is in [`../specification-status.json`](../specification-status.json).
The exact proposal revisions represented by 0.8.0 are recorded in its [`0.8.0/PROPOSALS.md`](0.8.0/PROPOSALS.md) manifest.

## Quick Example

```yaml
$schema: https://mcpdesc.org/schema/mcp-description/0.8.0.json
mcpdesc: 0.8.0
info:
  name: chess-rating-server
  title: Chess Rating MCP Server
  version: 1.0.0
protocolVersions:
- '2026-07-28'
```

## Directory Structure

Each specification version lives in its own folder so earlier versions can be
read directly, without consulting git history. An in-progress working draft lives in `draft/` when development is active; when released, it is frozen into a version folder.

```
spec/
  0.8.0/               Frozen current stable release
  0.7.0/               Frozen release pointer (canonical source: Cisco Open)
  README.md            Version index and status (this file)
  implementations.md   Known implementations and tooling
```

Versioned JSON Schemas live at the repository root under
[`../schemas/mcp-description/`](../schemas/mcp-description/), shared with the
`mcpcontract` tooling.

## Getting Started

- **Read the spec**: [0.8.0/mcp-description.md](0.8.0/mcp-description.md)
- **Explore examples**: [0.8.0/examples/](0.8.0/examples/)
- **Try the schema**: [../schemas/mcp-description/0.8.0.json](../schemas/mcp-description/0.8.0.json) (latest — see [../schemas/latest.json](../schemas/latest.json))
- **Write your first description**: [0.8.0/guides/getting-started.md](0.8.0/guides/getting-started.md)

## Key Features

- **MCP-native** — tools, resources, and prompts use MCP protocol structures directly
- **OpenAPI-aligned** — familiar `info`, `security`, and metadata patterns
- **Multi-revision** — one document can describe deterministic views for multiple MCP revisions
- **Client-aware** — primitives can declare required client capabilities and elicitation behavior
- **Reusable** — typed local components reduce duplication across schemas and examples
- **Example-rich** — named results, completions, and Tool interaction scenarios document behavior
- **Multi-transport** — declare stdio, streamable-http, and SSE endpoints
- **JSON + YAML** — conforming serializations share one JSON-compatible data model
- **Extensible** — vendor-specific metadata via the `x-` extension mechanism
- **Versioned** — schema evolution with backward compatibility tracking
- **Offline-first** — no server connection needed to understand capabilities

## Specification Extensions

Vendors can attach additional metadata using the `x-{vendor}-{feature}` convention. The core specification does not register or endorse particular extensions.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to propose changes, and
[GOVERNANCE.md](../GOVERNANCE.md) for how the specification evolves.

## License

This specification is licensed under [Apache License 2.0](../LICENSE).
