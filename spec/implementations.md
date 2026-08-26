# Known Implementations

Tools and libraries that support the MCP Description format.

## Generators

| Tool | Description | Link |
|------|-------------|------|
| **mcpcontract** | CLI toolkit — extracts capabilities from live MCP servers, generates MCP Description documents, analyzes backward compatibility | [cisco-open/mcptoolkit-contract](https://github.com/cisco-open/mcptoolkit-contract) |

## Tools

The following companion tools are published under the [`@cisco_open`](https://www.npmjs.com/org/cisco_open) npm scope. Each CLI command (`mcp*`) ships from a `mcptoolkit-*` package, matching `mcpcontract` → `mcptoolkit-contract`. If you've built a tool that supports MCP Description documents, please submit a PR adding it to this list.

| Tool | Description | Link |
|------|-------------|------|
| **mcpeditor** | A web-based editor for MCP Description documents | [@cisco_open/mcptoolkit-editor](https://www.npmjs.com/package/@cisco_open/mcptoolkit-editor) |
| **mcpmock** | Run mock servers from MCP Description documents | [@cisco_open/mcptoolkit-mock](https://www.npmjs.com/package/@cisco_open/mcptoolkit-mock) |
| **mcptest** | Automated testing framework for Model Context Protocol (MCP) servers | [@cisco_open/mcptoolkit-test](https://www.npmjs.com/package/@cisco_open/mcptoolkit-test) |

## Validators

| Validator | Description | Link |
|---|---|---|
| **@mcpdesc/validator** | Isomorphic structural and semantic validation for the immutable `0.8.0-draft.1` and `0.8.0-draft.2` snapshots. The cumulative `0.2.0` package is intended for the npm `latest` dist-tag after release review. Diagnostics include stable codes, severities, and structured document paths. | [`packages/validator`](../packages/validator/) |

Any JSON Schema validator can perform structural validation using a versioned schema such as [`../schemas/mcp-description/0.7.0.json`](../schemas/mcp-description/0.7.0.json). Draft conformance also includes semantic rules that JSON Schema alone cannot express; consumers should use `@mcpdesc/validator` with an exact snapshot selector for the combined result. External Tool-schema references are never fetched automatically and produce warnings when complete offline validation is unavailable.

