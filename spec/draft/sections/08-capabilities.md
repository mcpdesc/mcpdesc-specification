## 8. Capabilities

The optional `capabilities` array declares protocol-scoped, durable server features. When present, it MUST contain at least one Capabilities Object.

### 8.1 Overview

Capabilities represent externally relevant server behavior beyond primitive inventories. They describe semantics, not the RPC or notification mechanism used to expose them.

Completion examples on Prompt and Resource Template declarations are descriptive metadata about observed `completion/complete` behavior. They do not themselves assert that the server advertises the `completions` capability in every deployment or Effective Protocol View.

### 8.2 Properties

| Property | Type | Description |
|----------|------|-------------|
| `protocolVersions` | array\<string\> | MCP revisions to which this object applies; inherits root coverage when omitted |
| `tools` | object | Tool-related capabilities |
| `tools.listChanged` | boolean | Whether the server sends `notifications/tools/list_changed` |
| `resources` | object | Resource-related capabilities |
| `resources.subscribe` | boolean | Whether the server supports resource subscriptions |
| `resources.listChanged` | boolean | Whether the server sends `notifications/resources/list_changed` |
| `prompts` | object | Prompt-related capabilities |
| `prompts.listChanged` | boolean | Whether the server sends `notifications/prompts/list_changed` |
| `completions` | object | Present if the server supports argument autocompletion (MCP 2025-03-26+) |
| `logging` | object | Present if the server supports sending log messages to the client |
| `tasks` | object | Present if the server supports core task-augmented requests (MCP 2025-11-25 only) |
| `extensions` | non-empty map\<string, object\> | Formal MCP extension capabilities (MCP 2026-07-28) |
| `experimental` | object | Experimental, non-standard capabilities |

### 8.3 Tasks Capability

The `tasks` object, when present, indicates the server supports long-running task management:

| Property | Type | Description |
|----------|------|-------------|
| `tasks.list` | object | Server supports listing active tasks |
| `tasks.cancel` | object | Server supports cancelling tasks |
| `tasks.requests.tools.call` | object | Tool calls can be task-augmented |

### 8.4 Extensibility

`extensions` keys MUST use the MCP mandatory-prefix metadata form `prefix/name`. A prefix whose second label is `modelcontextprotocol` or `mcp` is reserved for MCP use. Unknown syntactically valid extension identifiers are accepted and MUST be preserved. A validator SHOULD warn about an unrecognized identifier under a reserved prefix and MUST NOT treat absence from its local catalogue alone as proof of namespace misuse. Use known to be unauthorized is a semantic error.

For this purpose, an official MCP extension is recognized when the validator's extension catalogue identifies it from an authoritative MCP extension source. A validator SHOULD NOT emit an unknown-reserved-identifier warning for a catalogued official extension. It SHOULD identify a catalogued experimental extension as experimental rather than unknown and SHOULD warn that its maturity must be reviewed. Recognition establishes identifier authority and maturity only; it does not establish that an extension value satisfies extension-specific settings or semantics.

An extension catalogue is validator metadata rather than part of the MCP Description document or its core conformance result. A validator that uses one MUST disclose its authoritative source, effective date, and identifier maturity assignments. A frozen validator snapshot MUST pin that metadata. Catalogue updates MAY change authority or maturity diagnostics without changing whether an otherwise conforming document satisfies this specification.

A validator MAY apply deeper extension-specific validation only through an explicitly selected profile or other configured trusted mechanism. Such validation SHOULD identify an immutable or otherwise pinned extension specification version and MUST distinguish profile diagnostics from core MCP Description conformance. Failure to retrieve mutable extension material MUST NOT invalidate an otherwise conforming document.

Core `tasks` in MCP 2025-11-25 and a Tasks extension in MCP 2026-07-28 are distinct declarations and MUST NOT be automatically reinterpreted as one another. `logging` remains representable for revisions that define it; validators SHOULD warn when it applies to MCP 2026-07-28, where it is deprecated.

The Capabilities Object and the MCP Description-defined `tools`, `resources`, and `prompts` capability declaration objects MAY carry `x-*` specification extensions. Other unknown properties on those objects are invalid. MCP-native capability payloads retain their own forward-compatibility rules. The `capabilities.extensions` map is a formal MCP protocol-extension namespace, not an MCP Description specification-extension location; tooling MUST NOT reinterpret or move values between these mechanisms.

### 8.5 Primitive Client Capability Requirements

Tool, Resource, Resource Template, and Prompt Objects MAY contain a `clientRequirements` Client Capability Requirements Object. It describes an unconditional static precondition on the minimum MCP client capabilities required to use that primitive through `tools/call`, `resources/read`, or `prompts/get`. A Resource Template requirement applies to reading a concrete URI produced from the template. Requirements do not apply to listing or discovery, and this specification neither requires nor prohibits runtime filtering based on them.

The object uses the `ClientCapabilities` structure of every MCP revision in the containing primitive's effective protocol scope. It MUST be non-empty, MUST NOT contain `protocolVersions`, and inherits no value from the root, a Transport Object, server `capabilities`, an Elicitation Declaration, or another primitive. Every declared capability and nested capability member MUST be valid for every effective revision. When requirements differ materially between revisions, the primitive MUST be split into pairwise-disjoint protocol-scoped variants.

All requirements are conjunctive. Satisfying them does not guarantee success or authorization. Authors MUST NOT declare a capability that is optional, opportunistic, input-dependent, or used only on some runtime paths as an unconditional requirement.

The recognized core structure is revision-specific:

| Revision | Core client capability shape |
|----------|------------------------------|
| MCP 2024-11-05 and MCP 2025-03-26 | `roots.listChanged`, `sampling`, and `experimental` |
| MCP 2025-06-18 | The earlier shape plus `elicitation` |
| MCP 2025-11-25 | `roots.listChanged`; `sampling.context` and `sampling.tools`; `elicitation.form` and `elicitation.url`; core `tasks.list`, `tasks.cancel`, `tasks.requests.sampling.createMessage`, and `tasks.requests.elicitation.create`; and `experimental` |
| MCP 2026-07-28 | Deprecated empty `roots`; deprecated `sampling.context` and `sampling.tools`; `elicitation.form` and `elicitation.url`; formal `extensions`; and `experimental` |

Capability marker and settings values MUST be objects. MCP 2026-07-28 `roots` MUST be empty. Validators SHOULD warn when a requirement uses a capability or nested member deprecated in its applicable revision. MCP 2024-11-05 and MCP 2025-03-26 retain the legacy incomplete-validation treatment in Section 3.5: validators apply structural and selected sound checks and MUST NOT report complete MCP semantic conformance.

Where the applicable MCP `ClientCapabilities` type is open, unknown and experimental capability entries are accepted and MUST be preserved. Validators MUST NOT invent matching semantics for them. This Client Capability Requirements Object is an MCP Description-defined semantic object and MAY carry `x-*` specification extensions; those properties are MCP Description metadata, not client capabilities.

For MCP 2026-07-28, `extensions` MUST be a non-empty map whose keys satisfy the same mandatory-prefix identifier grammar and reserved-prefix rules as `capabilities.extensions`, and whose values are objects. Unknown syntactically valid identifiers MUST be preserved. Validators SHOULD warn about an unrecognized identifier under an MCP-reserved prefix. A generic compatibility checker MAY treat an empty extension requirement value as satisfied by presence of that identifier in the client's extension map. It MUST NOT claim a non-empty extension requirement is satisfied without understanding the extension-specific settings semantics.

A compatibility tool comparing `clientRequirements` with a client capability profile for one revision SHOULD report `satisfied` when every requirement is known to be satisfied, `unsatisfied` when any requirement is known not to be satisfied, and `indeterminate` when none is known to fail but at least one cannot be evaluated. An omitted property means that the description makes no primitive-level hard-requirement claim; it does not prove that no runtime path can optionally use a capability.

Server `capabilities`, primitive `clientRequirements`, Elicitation Declarations, Tool `interactionExamples`, and `security` are independent. Tooling MUST NOT infer or copy one from another. In particular, a conditional elicitation or an illustrative interaction scenario does not imply an unconditional client-capability requirement, and capability compatibility is not an authorization decision.

A single-version projection MUST preserve `clientRequirements` on every retained primitive and MUST NOT synthesize requirements. Merge tooling MAY collapse otherwise equivalent declarations with equivalent requirements. It MUST NOT select or union materially different requirements over overlapping protocol scope; it MUST preserve distinct non-overlapping variants where representable or report a conflict.

### 8.6 Scope Uniqueness

Effective Capabilities Object scopes MUST be pairwise disjoint. At most one Capabilities Object may apply to a protocol revision.

### 8.7 Example

```json
{
  "capabilities": [
    {
      "protocolVersions": ["2025-11-25"],
      "tools": { "listChanged": true },
      "resources": { "subscribe": true, "listChanged": true },
      "prompts": { "listChanged": false },
      "completions": {},
      "logging": {},
      "tasks": { "requests": { "tools": { "call": {} } } }
    },
    {
      "protocolVersions": ["2026-07-28"],
      "tools": { "listChanged": true },
      "extensions": { "io.example/tasks": {} }
    }
  ]
}
```

