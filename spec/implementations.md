# Known Implementations

Tools and libraries that support the MCP Description format. This is a non-normative catalogue; inclusion does not imply endorsement or conformance certification.

## CLI and Generators

| Tool | Description | Link |
|------|-------------|------|
| **mcpcontract** | CLI toolkit — validates MCP Description documents, extracts capabilities from live MCP servers, generates descriptions, and analyzes backward compatibility | [cisco-open/mcptoolkit-contract](https://github.com/cisco-open/mcptoolkit-contract) |

## Tools

The following companion tools are published under the [`@cisco_open`](https://www.npmjs.com/org/cisco_open) npm scope. Each CLI command (`mcp*`) ships from a `mcptoolkit-*` package, matching `mcpcontract` → `mcptoolkit-contract`. If you've built a tool that supports MCP Description documents, please submit a PR adding it to this list.

| Tool | Description | Link |
|------|-------------|------|
| **mcpeditor** | A web-based editor for MCP Description documents | [@cisco_open/mcptoolkit-editor](https://www.npmjs.com/package/@cisco_open/mcptoolkit-editor) |
| **mcpmock** | Run mock servers from MCP Description documents | [@cisco_open/mcptoolkit-mock](https://www.npmjs.com/package/@cisco_open/mcptoolkit-mock) |
| **mcptest** | Automated testing framework for Model Context Protocol (MCP) servers | [@cisco_open/mcptoolkit-test](https://www.npmjs.com/package/@cisco_open/mcptoolkit-test) |

## Validator Libraries

| Validator | Description | Link |
|---|---|---|
| **@mcpdesc/validator** | Isomorphic structural and semantic validation for exact immutable MCP Description snapshots. Diagnostics include stable codes, severities, and structured document paths. | [`mcpdesc/core`](https://github.com/mcpdesc/core/tree/main/packages/validator) |

Any JSON Schema Draft 2020-12 implementation can perform structural validation using a versioned schema such as [`../schemas/mcp-description/0.8.0.json`](../schemas/mcp-description/0.8.0.json). Structural validation checks document shape but is not sufficient for MCP Description conformance.

Semantic validation applies the cross-object and revision-sensitive rules that JSON Schema alone cannot express. Applications can use `@mcpdesc/validator` with an exact version or snapshot selector for combined structural and semantic validation; command-line users can use `mcpcontract validate`. External Tool-schema references are never fetched automatically by `@mcpdesc/validator` and produce warnings when complete offline validation is unavailable.

