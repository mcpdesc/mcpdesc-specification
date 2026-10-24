## 11. Prompts

The `prompts` array declares the prompt templates exposed by the MCP server. Each prompt is a server-side template that clients can invoke with arguments to generate messages.

### 11.1 Prompt Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP revisions to which this declaration applies. |
| `name` | string | **Yes** | Programmatic prompt name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Since MCP 2025-06-18. |
| `description` | string | No | Human-readable prompt description. |
| `arguments` | non-empty array\<[Prompt Argument](#112-prompt-argument-object)\> | No | Prompt arguments. |
| `examples` | map<string, Prompt Example Object> | No | Named complete Prompt invocation/result pairs. |
| `completionExamples` | map<string, Completion Example Object> | No | Named `completion/complete` request-result observations for Prompt arguments. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that MAY be required while retrieving the Prompt (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the prompt is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Prompt declaration, subject to [Section 3.5](#35-mcp-_meta). Since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |
| `clientRequirements` | [Client Capability Requirements Object](#85-primitive-client-capability-requirements) | No | Unconditional minimum client capabilities required for `prompts/get`; does not apply to `prompts/list`. |

Prompt declarations with the same `name` MUST have pairwise-disjoint effective protocol scopes. Prompt `security` describes statically known authorization required to retrieve the Prompt and replaces inherited transport or root security in full.

Prompt `clientRequirements` applies only to retrieval through `prompts/get`. It does not state that a client needs those capabilities to discover the Prompt through `prompts/list`.

### 11.2 Prompt Argument Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Programmatic argument name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Since MCP 2025-06-18. |
| `description` | string | No | Argument description. |
| `required` | boolean | No | Whether the argument is required. |

### 11.3 Named Prompt Examples

A Prompt Object MAY contain `examples`, a map from a local example name to an inline Prompt Example Object or a Reference Object targeting `#/components/promptExamples/<name>`. When present, the map MUST contain at least one entry. Each name MUST match `^[A-Za-z0-9._-]+$`; names are case-sensitive, scoped to the containing Prompt declaration, and serve as both human-meaningful labels and stable local selection names. Entry order is not semantically significant. A referenced example MUST be resolved before applying every contextual requirement of the containing Prompt and effective protocol scope.

A Prompt Example Object contains these core properties and MAY carry `x-*` specification extensions:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `arguments` | map<string, string> | No | Complete `prompts/get.params.arguments` value; omission and `{}` both mean no arguments. |
| `result` | object | **Yes** | Complete applicable completed `GetPromptResult` payload, excluding the JSON-RPC envelope. |

The Prompt Example Object MUST NOT contain other additional properties.

`arguments` MAY be omitted. When present, it MUST be an object whose values are strings. Every key MUST identify an argument declared by the containing Prompt, and every declared argument with `required: true` MUST be present. Optional arguments MAY be omitted. The example MUST NOT contain transport metadata, JSON-RPC IDs, method names, or request `_meta`.

`result` MUST preserve the ordered `messages` array and MUST have the completed Prompt result shape defined by every applicable protocol revision. For MCP 2026-07-28 it MUST contain `resultType: "complete"`; earlier revisions MUST NOT contain `resultType`. It MAY preserve the native result `description`. Task, input-required, streaming, partial, and JSON-RPC error forms are not Prompt Examples.

Revision-supported `_meta` on the completed result and message content is literal illustrative metadata governed by [Section 3.5](#35-mcp-_meta). It is not request metadata or a schema declaration. Message `content` MAY use any content-block form supported by every applicable revision.

Prompt examples are illustrative and non-exhaustive. They do not change Prompt arguments, capabilities, security, client requirements, or runtime behavior, and they do not guarantee deterministic or current output. Documentation tooling SHOULD preserve example names and argument/result pairing. Mock or contract-test tooling MAY permit explicit selection by name but MUST NOT present an unnamed selection as a prediction of live behavior.

Examples are untrusted descriptive content. Authors MUST NOT include secrets and SHOULD use conspicuously fictitious values. Consumers MUST validate values, render content as data, and apply appropriate size and evaluation limits. They MUST NOT treat examples as authorization, proof of behavior, or safe executable instructions.

Prompt Examples are MCP Description metadata, not fields of the MCP Prompt type. Projection to an MCP `prompts/list` Prompt value MUST omit `examples` unless an independently specified MCP extension defines a destination. MCP Description round-tripping and protocol-version projection MUST preserve each selected Prompt declaration's example map and MUST NOT merge maps from disjoint variants with the same Prompt name.

### 11.4 Prompt Completion Examples

A Prompt Object MAY contain `completionExamples`, a local non-empty map from an example name to an inline Completion Example Object. Completion examples do not use `#/components/promptExamples` or any other component namespace; the containing Prompt declaration supplies the completion target identity.

Each name MUST match `^[A-Za-z0-9._-]+$`, is case-sensitive, and is scoped to the containing Prompt declaration. Entry order is not semantically significant. A Completion Example Object MAY carry `x-*` specification extensions and contains these properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `argument` | object | **Yes** | The selected Prompt argument being completed, with required string `name` and `value`. |
| `context` | object | No | Optional contextual `arguments` map of already-supplied Prompt argument values. |
| `result` | object | **Yes** | Completed applicable MCP `completion/complete` result payload, excluding the JSON-RPC envelope. |

The Completion Example Object MUST NOT contain other unprefixed properties. The `argument` object MUST contain required string properties `name` and `value`. `argument.name` MUST identify one declared Prompt Argument. Every `context.arguments` key MUST identify another declared Prompt Argument, and the completed argument MUST NOT also occur in context. Context MAY be partial: omission of a required Prompt argument means only that the illustrated completion request did not provide it.

`context` MAY be omitted. When present, it MUST contain a non-empty `arguments` map whose values are strings. An empty context MUST be omitted rather than represented as an empty object. MCP 2025-03-26 does not define completion context, so a Prompt completion example spanning that revision and a later revision MUST be split into disjoint protocol-scoped Prompt declarations when context is needed.

`result` MUST contain `completion.values`, an ordered array of string candidates. It MAY preserve native `completion.total`, `completion.hasMore`, and revision-supported result `_meta`. For MCP 2026-07-28 it MUST contain `resultType: "complete"`; earlier revisions MUST NOT contain `resultType`. JSON-RPC envelope fields, errors, and incomplete workflows are not Prompt completion examples. Prompt completion examples are valid only in an effective protocol scope where MCP defines completion and every represented field.

Completion examples are illustrative and non-exhaustive. They do not change Prompt arguments, retrieval requirements, capabilities, security, or runtime behavior, and they do not convert candidates into enums, defaults, or claims of future availability. Projection to an MCP Prompt list value MUST omit `completionExamples` unless an independently specified MCP extension defines a destination. MCP Description round-tripping and protocol-version projection MUST preserve each selected Prompt declaration's `completionExamples` map and MUST NOT merge maps from disjoint variants with the same Prompt name.

### 11.5 Protocol Variants and Security

```json
{
  "prompts": [
    {
      "name": "city_briefing",
      "title": "City Briefing",
      "description": "Generate a role-specific city briefing",
      "protocolVersions": ["2026-07-28"],
      "arguments": [
        {
          "name": "city",
          "required": true
        },
        {
          "name": "audience"
        }
      ],
      "examples": {
        "paris-engineering": {
          "arguments": {
            "city": "Paris",
            "audience": "engineering"
          },
          "result": {
            "resultType": "complete",
            "description": "Engineering briefing for Paris",
            "messages": [
              {
                "role": "user",
                "content": {
                  "type": "text",
                  "text": "Summarize current engineering considerations for Paris."
                }
              }
            ]
          }
        }
      }
    },
    {
      "name": "greeting",
      "protocolVersions": ["2025-11-25"],
      "examples": {
        "default": {
          "result": {
            "messages": [
              {
                "role": "assistant",
                "content": {
                  "type": "text",
                  "text": "Hello."
                }
              }
            ]
          }
        }
      }
    }
  ]
}
```

Prompt declarations with the same `name` MUST have pairwise-disjoint effective protocol scopes. Prompt `security` describes statically known authorization required to retrieve the Prompt and replaces inherited transport or root security in full.

Prompt `clientRequirements` applies only to retrieval through `prompts/get`. It does not state that a client needs those capabilities to discover the Prompt through `prompts/list`.

