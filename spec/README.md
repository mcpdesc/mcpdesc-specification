# MCP Description Specification

A portable, machine-readable contract format for [Model Context Protocol (MCP)](https://modelcontextprotocol.io) servers.

> This directory contains the MCP Description (`mcpdesc`) specification. Version
> **0.7.0** is the current stable release; its canonical source remains the Cisco
> Open [`mcptoolkit-contract`](https://github.com/cisco-open/mcptoolkit-contract/tree/main/spec)
> repository, which also provides the reference tooling (`mcpcontract`). This
> repository, [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification),
> is the development home for the **0.8.0 Release Candidate 2**
> (`v0.8.0-rc.2`). Implementations
> vendor a single schema version from [`../schemas/mcp-description/`](../schemas/mcp-description/)
> and upgrade when the format advances.

## Overview

The **MCP Description Specification** defines a standard document format that describes the capabilities of an MCP server — its tools, resources, prompts, transports, and security requirements — without requiring a runtime connection.

Think of it as **OpenAPI for MCP servers**: a static contract that enables discovery, documentation, validation, and governance across the MCP ecosystem.

## Status

| Version | Status | Canonical source | Schema |
|---------|--------|------------------|--------|
| 0.7.0 | Current stable release | [`cisco-open/mcptoolkit-contract`](https://github.com/cisco-open/mcptoolkit-contract/tree/main/spec) | [`../schemas/mcp-description/0.7.0.json`](../schemas/mcp-description/0.7.0.json) |
| 0.8.0 | Release Candidate 2 (`v0.8.0-rc.2`; prerelease) | [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification) | [`../schemas/mcp-description/0.8.0.json`](../schemas/mcp-description/0.8.0.json) (prerelease) |

The machine-readable form of this status is in [`../specification-status.json`](../specification-status.json).
The exact proposal revisions represented by Draft 4 are recorded in its [`draft/PROPOSALS.md`](draft/PROPOSALS.md) manifest.

## Quick Example

```yaml
mcpdesc: 0.7.0
info:
  name: chess-rating-server
  title: Chess Rating MCP Server
  version: 1.0.0
transports:
- type: stdio
  command: chess-rating
  args:
  - serve
tools:
- name: get_player_rating
  description: Get the current Elo rating for a chess player
  inputSchema:
    type: object
    properties:
      player_id:
        type: string
        description: Player identifier
    required:
    - player_id
```

## Directory Structure

Each specification version lives in its own folder so earlier versions can be
read directly, without consulting git history. The in-progress working draft
lives in `draft/`; when it is released it is frozen into a version folder
(e.g. `0.8.0/`) and `draft/` is re-initialized from that snapshot.

```
spec/
  draft/               Active prerelease (currently 0.8.0-rc.2)
    mcp-description.md  Assembled normative specification text
    sections/          Normative specification, section by section
    guides/            Rationale, tutorials, and comparisons (non-normative)
    examples/          Example MCP Description documents
    extensions/        Vendor extension specifications
    CHANGELOG.md       Format version history
  0.7.0/               Frozen release pointer (canonical source: Cisco Open)
  README.md            Version index and status (this file)
  implementations.md   Known implementations and tooling
```

Versioned JSON Schemas live at the repository root under
[`../schemas/mcp-description/`](../schemas/mcp-description/), shared with the
`mcpcontract` tooling.

## Getting Started

- **Read the spec**: [draft/mcp-description.md](draft/mcp-description.md)
- **Explore examples**: [draft/examples/](draft/examples/)
- **Try the schema**: [../schemas/mcp-description/0.7.0.json](../schemas/mcp-description/0.7.0.json) (latest — see [../schemas/latest.json](../schemas/latest.json))
- **Write your first description**: [draft/guides/getting-started.md](draft/guides/getting-started.md)

## Key Features

- **MCP-native** — tools, resources, and prompts use MCP protocol structures directly
- **OpenAPI-aligned** — familiar `info`, `security`, and metadata patterns
- **Multi-transport** — declare stdio, streamable-http, and SSE endpoints
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
