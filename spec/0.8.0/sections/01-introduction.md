## 1. Introduction

### 1.1 Purpose

The MCP Description Specification defines a standard format for describing the capabilities of a Model Context Protocol (MCP) server as a static, curated document.

The MCP ecosystem supports runtime discovery and capability inspection. While effective for dynamic interactions, runtime discovery alone limits offline tooling, cross-platform interoperability, design review, and governance workflows.

This specification addresses these limitations by providing a portable description format for MCP servers, analogous to the descriptive role OpenAPI plays for HTTP APIs.

### 1.2 Goals

An MCP Description document enables:

- **Standardized server descriptions** — a consistent structure for declaring server metadata, transports, tools, resources, prompts, and capabilities.
- **Offline discoverability** — platforms can index and display server capabilities without establishing a runtime connection.
- **Tooling interoperability** — documentation generators, testing frameworks, agent discovery tools, IDE integrations, and governance platforms can operate on a common format.
- **Description-driven development** — teams can define, review, and validate MCP server surfaces before deployment.

### 1.3 Audience

This specification is intended for:

- MCP server developers who publish capability descriptions
- MCP client and agent developers who consume server descriptions
- Platform developers building registries, documentation portals, and governance tools
- Tool authors creating validators, generators, and IDE integrations

### 1.4 Relationship to the MCP Protocol

The MCP Description Specification does **not** replace the MCP protocol. It complements the protocol by providing a static description format for server capabilities.

| MCP Protocol | MCP Description |
|---|---|
| Runtime communication | Static declaration |
| Discovery and runtime metadata | Server metadata and declared protocol coverage |
| Tool invocation | Tool definitions |
| Resource fetching | Resource definitions |

The MCP protocol defines runtime communication and behavior. An MCP Description statically represents durable, externally relevant server semantics without reproducing MCP wire choreography.

### 1.5 Scope

This specification defines:

- The structure and semantics of an MCP Description document
- JSON Schema validation rules for MCP Description documents
- The specification extension mechanism for vendor-specific metadata

This specification does NOT define:

- The MCP protocol itself
- Runtime behavior of MCP servers or clients
- The content or structure of vendor extensions (these are defined independently by extension authors)

