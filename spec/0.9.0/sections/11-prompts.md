## 11. Prompts

The `prompts` array declares the prompt templates exposed by the MCP server. Each Prompt is a server-side template that clients can retrieve with arguments to generate messages.

### 11.1 Prompt Object

<a id="req-prompt-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP protocol versions to which this declaration applies. |
| `name` | string | **Yes** | Programmatic prompt name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Available since MCP 2025-06-18. |
| `description` | string | No | Human-readable Prompt description. |
| `arguments` | non-empty array\<[Prompt Argument](#112-prompt-argument-object)\> | No | Prompt arguments. |
| `examples` | map\<string, [Prompt Example Object](#113-named-prompt-examples)\> | No | Named completed Prompt retrieval examples. |
| `completionExamples` | map\<string, [Completion Example Object](#114-prompt-completion-examples)\> | No | Named `completion/complete` request-result observations for Prompt arguments. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Available since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. <a id="req-prompt-tags-references"></a>When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that may be needed while retrieving the Prompt (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the Prompt is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Prompt declaration, subject to [Section 3.5](#35-mcp-_meta). Available since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |
| `clientRequirements` | [Client Capability Requirements Object](#85-primitive-client-capability-requirements) | No | Unconditional minimum client capabilities required for `prompts/get`; does not apply to `prompts/list`. |

### 11.2 Prompt Argument Object

<a id="req-prompt-argument-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Programmatic argument name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Since MCP 2025-06-18. |
| `description` | string | No | Human-readable argument description. |
| `required` | boolean | No | Whether the argument is required. |

### 11.3 Named Prompt Examples

A Prompt Object MAY contain an `examples` map. Each value is either an inline Prompt Example Object or a Reference Object targeting `#/components/promptExamples/<name>` (see [Section 17](#17-reusable-components-and-local-references)).

<a id="req-prompt-examples-map"></a>When present, the map MUST contain at least one entry. Each name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and scoped to the containing Prompt declaration. They serve both as human-meaningful labels and as stable local selection names. Entry order is not semantically significant.

<a id="req-prompt-example-references-resolved"></a>A referenced example MUST be resolved before the requirements of the containing Prompt and its effective protocol scope are applied.

<a id="req-prompt-example-fields"></a>A Prompt Example Object contains these fields and MAY carry `x-*` specification extensions:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `arguments` | map\<string, string\> | No | Complete `prompts/get` `params.arguments` value. Omitting it and using `{}` both mean no arguments. |
| `result` | object | **Yes** | Completed `GetPromptResult` payload for the applicable protocol versions, excluding the JSON-RPC envelope. |

<a id="req-prompt-example-closed"></a>The Prompt Example Object MUST NOT contain other fields.

`arguments` MAY be omitted. <a id="req-prompt-example-arguments-shape"></a>When present, it MUST be an object whose values are strings. <a id="req-prompt-example-arguments"></a>Every key MUST identify an argument declared by the containing Prompt, and every declared argument with `required: true` MUST be present. Optional arguments MAY be omitted.

<a id="req-prompt-example-completed-form"></a>The example MUST NOT contain transport metadata, JSON-RPC IDs, method names, or request `_meta`.

<a id="req-prompt-example-result-shape"></a>`result` MUST contain the `messages` array. Message order is significant. `result` MUST have the completed Prompt result shape defined by every applicable protocol version. For MCP 2026-07-28, it MUST contain `resultType: "complete"`. Fields that an applicable protocol version does not define follow [Section 3.6](#36-carried-mcp-values). `result` MAY include the result `description`. Task, input-required, streaming, partial, and JSON-RPC error forms are not Prompt examples.

Result `_meta` and message content `_meta`, where the applicable protocol versions support them, are literal illustrative values governed by [Section 3.5](#35-mcp-_meta). They are not request metadata or schema declarations. <a id="req-prompt-example-content-protocol-version"></a>Message `content` MAY use any content-block form supported by every applicable protocol version.

Prompt examples are illustrative and non-exhaustive. They do not change Prompt arguments, capabilities, security, client requirements, or runtime behavior. They do not guarantee deterministic or current output.

<a id="req-prompt-example-tooling"></a>Documentation tooling SHOULD preserve example names and the pairing of arguments with results. Mock or contract-test tooling MAY let users select an example by name. It MUST NOT pick an example without an explicit name and present it as a prediction of live behavior.

Examples are untrusted descriptive content. <a id="req-prompt-example-no-secrets"></a>Authors MUST NOT include secrets and SHOULD use conspicuously fictitious values. <a id="req-prompt-example-untrusted"></a>Consumers MUST validate values, render content as data, and apply appropriate size and evaluation limits. They MUST NOT treat examples as authorization, proof of behavior, or safe executable instructions.

Prompt examples are MCP Description metadata, not fields of the MCP Prompt type. <a id="req-prompt-example-projection-omitted"></a>Native MCP projection ([Section 4.14](#414-native-mcp-projection)) MUST omit `examples` unless an independently specified MCP extension defines a destination. <a id="req-prompt-example-views"></a>MCP Description round-tripping and Effective Protocol View projection ([Section 4.12](#412-effective-protocol-views-and-projection)) MUST preserve each selected Prompt declaration's example map and MUST NOT merge maps from disjoint variants with the same Prompt name.

### 11.4 Prompt Completion Examples

A Prompt Object MAY contain `completionExamples`, a non-empty map from a local example name to an inline Completion Example Object. Unlike Prompt `examples`, `completionExamples` entries cannot be Reference Objects and have no component namespace. The containing Prompt declaration identifies the completion target.

<a id="req-prompt-completion-examples-map"></a>Each name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and scoped to the containing Prompt declaration. Entry order is not semantically significant. A Completion Example Object MAY carry `x-*` specification extensions and contains these fields:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `argument` | object | **Yes** | The Prompt argument being completed, with required string `name` and `value`. |
| `context` | object | No | Already-supplied Prompt argument values, in an `arguments` map. |
| `result` | object | **Yes** | Completed `completion/complete` result payload for the applicable protocol versions, excluding the JSON-RPC envelope. |

<a id="req-prompt-completion-example-closed"></a>The Completion Example Object MUST NOT contain other unprefixed fields. The `argument` object MUST contain the string fields `name` and `value`.

<a id="req-prompt-completion-target"></a>`argument.name` MUST identify one declared Prompt Argument. Every `context.arguments` key MUST identify another declared Prompt Argument, and the completed argument MUST NOT also appear in `context`. `context` MAY be partial. Omitting a required Prompt argument means only that the illustrated completion request did not provide it.

`context` MAY be omitted. <a id="req-prompt-completion-context-shape"></a>When present, it MUST contain a non-empty `arguments` map whose values are strings. An empty context MUST be omitted rather than represented as an empty object.

<a id="req-prompt-completion-context-protocol-version"></a>MCP 2025-03-26 does not define completion context. When a completion example needs `context` and the Prompt's scope includes MCP 2025-03-26 and a later protocol version, the Prompt MUST be split into disjoint protocol-scoped declarations.

<a id="req-prompt-completion-result"></a>`result` MUST contain `completion.values`, an ordered array of string candidates. It MAY include `completion.total`, `completion.hasMore`, and result `_meta` where the applicable protocol versions define them. For MCP 2026-07-28, it MUST contain `resultType: "complete"`. Fields that an applicable protocol version does not define follow [Section 3.6](#36-carried-mcp-values). JSON-RPC envelope fields, errors, and incomplete workflows are not Prompt completion examples. Prompt completion examples are valid only in an effective protocol scope where MCP defines completion and every represented field. <a id="req-prompt-completion-protocol-versions"></a>MCP Description does not support completion examples for MCP 2024-11-05.

Completion examples are illustrative and non-exhaustive. They do not change Prompt arguments, retrieval requirements, capabilities, security, or runtime behavior. They do not turn candidates into enums, defaults, or claims of future availability.

<a id="req-prompt-completion-projection-omitted"></a>Native MCP projection ([Section 4.14](#414-native-mcp-projection)) MUST omit `completionExamples` unless an independently specified MCP extension defines a destination. <a id="req-prompt-completion-views"></a>MCP Description round-tripping and Effective Protocol View projection ([Section 4.12](#412-effective-protocol-views-and-projection)) MUST preserve each selected Prompt declaration's `completionExamples` map and MUST NOT merge maps from disjoint variants with the same Prompt name.

### 11.5 Protocol Variants and Security

<a id="req-prompt-scopes-disjoint"></a>Prompts with the same `name` MUST have pairwise-disjoint effective protocol scopes. Each Effective Protocol View therefore contains at most one Prompt with a given `name`.

Prompt `security` describes statically known authorization required to retrieve the Prompt and replaces inherited transport or root security in full.

Prompt `clientRequirements` applies only to retrieval through `prompts/get`. It does not state that a client needs those capabilities to discover the Prompt through `prompts/list`.

### 11.6 Example

```yaml
mcpdesc: 0.9.0
info:
  name: city-briefing-server
  title: City Briefing MCP Server
  version: 1.0.0
protocolVersions:
  - "2025-11-25"
  - "2026-07-28"
prompts:
  - name: greeting
    protocolVersions:
      - "2025-11-25"
    examples:
      default:
        result:
          messages:
            - role: assistant
              content:
                type: text
                text: Hello MCP clients.
  - name: greeting
    protocolVersions:
      - "2026-07-28"
    examples:
      default:
        result:
          resultType: complete
          messages:
            - role: assistant
              content:
                type: text
                text: Hello modern MCP clients
                  - name: city_briefing
    title: City Briefing
    description: Generate a role-specific city briefing
    protocolVersions:
      - "2026-07-28"
    arguments:
      - name: city
        required: true
      - name: audience
    examples:
      paris-teenagers:
        arguments:
          city: Paris
          audience: teenagers
        result:
          resultType: complete
          description: Briefing for teenagers in Paris
          messages:
            - role: user
              content:
                type: text
                text: Summarize current considerations for teenagers in Paris
```

