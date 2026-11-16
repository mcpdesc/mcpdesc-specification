## 9. Tools

The `tools` array declares the tools exposed by the MCP server. Each tool represents a server-side function that clients can invoke.

### 9.1 Tool Object

<a id="req-tool-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `protocolVersions` | array\<string\> | No | MCP protocol versions to which this declaration applies. |
| `name` | string | **Yes** | Programmatic tool name (identifier). |
| `title` | string | No | Human-readable display name for UI contexts. Available since MCP 2025-06-18. |
| `description` | string | No | Human-readable tool description. |
| `inputSchema` | object or Reference Object | **Yes** | Inline or reusable JSON Schema whose root describes an object containing tool input parameters. |
| `outputSchema` | object or Reference Object | No | Inline or reusable JSON Schema for structured Tool output. Available since MCP 2025-06-18. |
| `annotations` | [Tool Annotations Object](#96-tool-annotations) | No | Behavioral hints. Available since MCP 2025-03-26. |
| `execution` | [Execution Object](#97-execution-object) | No | Task-augmented execution support. MCP 2025-11-25 only. |
| `examples` | map&lt;string, Tool Example Object&gt; | No | Named complete Tool invocation/result pairs. |
| `interactionExamples` | map&lt;string, Tool Interaction Example Object&gt; | No | Named ordered semantic client-input scenarios attached to one Tool invocation. |
| `icons` | non-empty array\<Icon\> | No | Icons for UI display. Available since MCP 2025-11-25. |
| `tags` | non-empty array\<string\> | No | Categorization tags. <a id="req-tool-tags-references"></a>When a root-level `tags` array is present, values MUST reference declared tag names (see [Section 13.3](#133-tag-references)). |
| `elicitations` | non-empty array\<Elicitation Declaration Object\> | No | Additional user interactions that may be needed while fulfilling the Tool (see [Section 12](#12-elicitation-declarations)). |
| `deprecated` | boolean | No | Whether the Tool is deprecated. |
| `_meta` | object | No | Literal MCP metadata on the Tool declaration, subject to [Section 3.5](#35-mcp-_meta). Available since MCP 2025-06-18. |
| `security` | Security Requirement Array | No | Primitive security override. |
| `clientRequirements` | [Client Capability Requirements Object](#85-primitive-client-capability-requirements) | No | Unconditional minimum client capabilities required for `tools/call`; does not apply to `tools/list`. |

### 9.2 Input and Output Schemas

<a id="req-tool-input-schema-required"></a>Every Tool MUST contain `inputSchema`. Repair or conversion tooling MUST NOT insert a no-argument `inputSchema` unless the author confirms it. <a id="req-tool-input-schema-object-root"></a>The schema root MUST describe an object, because Tool arguments are always a JSON object. If the root declares `type`, its value MUST be `"object"` or an array that contains `"object"`. Before MCP 2025-11-25, the root MUST declare `"type": "object"`.

`inputSchema` and `outputSchema` MAY be Reference Objects targeting the `schemas` component namespace (see [Section 17](#17-reusable-components-and-local-references)). <a id="req-tool-schema-references-resolved"></a>References MUST be resolved before any inline schema requirement in this section is applied, including root shape, dialect, protocol applicability, `x-mcp-header`, and example compatibility.

<a id="req-tool-schema-closed-recommended"></a>A Tool that takes no parameters SHOULD use `{ "type": "object", "additionalProperties": false }`. A Tool that accepts unspecified parameters can use `{ "type": "object" }`, but this is NOT RECOMMENDED because it offers little validation or guidance. A schema that declares parameters lists them in `properties` and adds `additionalProperties: false` when undeclared properties must be rejected.

<a id="req-tool-output-schema-valid"></a>When present, `outputSchema` MUST be a valid JSON Schema object describing the Tool's structured output. For MCP 2025-11-25 and MCP 2026-07-28, its dialect defaults to JSON Schema 2020-12 when no explicit `$schema` is provided.

<a id="req-tool-output-schema-object-root"></a>Before MCP 2026-07-28, `outputSchema` MUST describe an object, because structured output is an object in those protocol versions. For MCP 2025-06-18, it MUST declare `"type": "object"`. For MCP 2025-11-25, if the root declares `type`, its value MUST be `"object"` or an array that contains `"object"`. MCP 2026-07-28 permits any valid JSON Schema root for `outputSchema`.

For MCP 2025-11-25 and MCP 2026-07-28, both schemas MAY include an explicit `$schema` property to declare the JSON Schema dialect. <a id="req-tool-schema-dialect-keyword"></a>Earlier protocol versions do not define that property on Tool schemas. <a id="req-tool-schema-vocabulary"></a>For MCP 2026-07-28, validators MUST accept the applicable JSON Schema 2020-12 vocabulary, including references, composition, and conditionals, plus MCP-defined annotations where valid. For earlier protocol versions, validators MUST apply the applicable MCP schema rules.

<a id="req-tool-schema-dialect-valid"></a>For MCP 2025-11-25 and MCP 2026-07-28, every embedded Tool schema MUST be valid under its declared or default dialect. Both protocol versions default to JSON Schema 2020-12.

<a id="req-tool-schema-dialect-set"></a>A declared dialect MUST be JSON Schema 2020-12 (`https://json-schema.org/draft/2020-12/schema`) or JSON Schema draft-07 (`http://json-schema.org/draft-07/schema#`). Either URI can use `http` or `https`, with or without the empty fragment. A schema that declares any other dialect makes the MCP Description invalid. This specification fixes the set so that conformance does not depend on the validator. MCP requires implementations to support only JSON Schema 2020-12, so authors SHOULD prefer it.

For MCP 2025-11-25 and MCP 2026-07-28, the dialect, not the TypeScript type of the MCP `Tool`, decides whether an embedded schema is valid. However, the MCP `Tool` type of these protocol versions restricts some syntax that the dialect allows:

- In both protocol versions, it requires `"type": "object"` at the `inputSchema` root.
- In MCP 2025-11-25, it also requires `"type": "object"` at the `outputSchema` root, and an object as the value of every top-level `properties` entry of either schema.

<a id="req-tool-schema-native-shape"></a>A Tool schema that is valid under its dialect but does not meet such a restriction for an applicable protocol version MUST NOT make the MCP Description invalid. Validators MUST report a warning for each such location, naming the protocol versions concerned, because native projection fails for them ([Section 4.14](#414-native-mcp-projection)). Authors SHOULD meet these restrictions or SHOULD narrow the Tool's `protocolVersions`. For example, `{}` can replace `true`, `{ "not": {} }` can replace `false`, and `"type": "object"` can be added beside `$ref` or `allOf`.

The supported protocol versions before MCP 2025-11-25 define an object-rooted Tool schema shape but do not state an embedded-schema dialect default. <a id="req-tool-schema-legacy-no-dialect"></a>For those protocol versions, validators MUST enforce the applicable shape without inferring a dialect solely from the enclosing generated MCP schema. <a id="req-tool-schema-legacy-shape"></a>`properties`, when present, MUST be an object whose values are objects, and `required`, when present, MUST be an array of strings. <a id="req-tool-schema-keywords-preserved"></a>Other keywords MUST be preserved and MUST NOT be rejected solely by applying an inferred meta-schema.

<a id="req-tool-schema-no-fetch"></a>A validator MUST NOT automatically retrieve an external `$ref` target from a network. It MAY resolve external references from an explicitly supplied trusted local catalog or an explicitly enabled resolver that follows the applicable MCP security guidance. <a id="req-tool-schema-external-ref"></a>If a target remains unavailable, the `$ref` MUST be preserved, and its presence alone MUST NOT make the containing MCP Description invalid. The validator SHOULD warn that complete embedded-schema validation was not possible. It MUST NOT report a weakened or partial validation as complete. <a id="req-tool-schema-consumer-certainty"></a>Consumers that require executable schema certainty SHOULD require resolution or treat this warning as an error. <a id="req-tool-schema-self-contained"></a>Authors SHOULD prefer self-contained Tool schemas using local `$defs`.

For MCP 2026-07-28, `inputSchema` properties MAY use `x-mcp-header` to map an input to an HTTP header. <a id="req-tool-x-mcp-header"></a>The annotation value MUST be a non-empty HTTP field-name token and MUST be unique, case-insensitively, within that `inputSchema`. It is valid only on a `string`, `integer`, or `boolean` property that is statically reachable from the schema root through `properties` chains. It MUST NOT be used on a property reached through arrays, composition, conditionals, or `$ref`.

### 9.3 Named Tool Examples

A Tool Object MAY contain `examples`, a map from a local example name to an inline Tool Example Object or a Reference Object targeting `#/components/toolExamples/<name>`. <a id="req-tool-examples-map"></a>When present, the map MUST contain at least one entry. Each name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and scoped to the containing Tool declaration. They serve both as human-meaningful labels and as stable local selection names. Entry order is not semantically significant. <a id="req-tool-example-references-resolved"></a>A referenced example MUST be resolved before any requirement that depends on the containing Tool or its effective protocol scope is applied.

<a id="req-tool-example-fields"></a>A Tool Example Object contains these core properties and MAY carry `x-*` specification extensions:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `input` | object | **Yes** | Complete `params.arguments` value from a `tools/call` request. |
| `result` | object | **Yes** | Complete applicable completed Tool Result payload, excluding the JSON-RPC envelope. |

<a id="req-tool-example-closed"></a>The Tool Example Object MUST NOT contain other additional properties. In particular, MCP Description 0.9.0 does not define `summary`, `description`, or `externalValue`.

<a id="req-tool-example-input-valid"></a>`input` MUST be an object and MUST validate against the containing Tool's `inputSchema` under every applicable protocol version's schema rules. A no-argument invocation MUST use `input: {}`. Schema-invalid values belong in negative test material, not conforming Tool Examples.

<a id="req-tool-example-result-shape"></a>`result` MUST contain `content` and MUST have the completed Tool Result shape defined by every applicable protocol version. For MCP 2026-07-28 it MUST contain `resultType: "complete"`. Fields that an applicable protocol version does not define follow [Section 3.6](#36-carried-mcp-values). <a id="req-tool-example-completed-form"></a>Task, input-required, streaming, progress, JSON-RPC envelope, and JSON-RPC protocol-error forms are not Tool Examples. <a id="req-tool-example-content-protocol-version"></a>Content blocks MAY use any text, image, audio, embedded-resource, or resource-link form supported by every applicable protocol version.

Where an applicable protocol version supports `_meta` on the completed result, content blocks, or embedded Resource Contents, that `_meta` is literal illustrative metadata governed by [Section 3.5](#35-mcp-_meta). It is not a schema or a request-metadata declaration. In MCP 2026-07-28, a result example MAY use `io.modelcontextprotocol/serverInfo` with an MCP Implementation value. Request-only and notification-only reserved keys are invalid in these contexts.

<a id="req-tool-example-success"></a>A successful result MUST omit `isError` or set it to `false`. It MAY contain `structuredContent` only in protocol versions that support that field. <a id="req-tool-example-structured-content"></a>If the Tool declares `outputSchema`, a successful result MUST contain `structuredContent`, which MUST validate against that schema under the applicable schema rules. Unstructured `content` remains required when `structuredContent` is present. If the Tool has no `outputSchema`, a successful result MAY contain `structuredContent` where the protocol version supports it, but MCP Description makes no schema-compatibility claim for that value.

<a id="req-tool-example-error-result"></a>A Tool execution-error result MUST set `isError` to `true`, MUST contain unstructured `content`, and MUST NOT contain `structuredContent`. `outputSchema` does not validate error content. JSON-RPC protocol errors and transport or intermediary failures that prevent a Tool Result are outside this model.

Example compatibility is a semantic conformance requirement. <a id="req-tool-example-incomplete-validation"></a>For protocol versions before MCP 2025-11-25, validators MUST enforce the constraints they can interpret without inventing an embedded-schema dialect. They SHOULD warn when complete compatibility validation is impossible and MUST NOT report incomplete validation as complete. An unresolved external `$ref` follows the policy in [Section 9.2](#92-input-and-output-schemas): validators preserve the schema and example, do not retrieve the target automatically, and warn that compatibility validation is incomplete. A schema-incompatible example is an error whenever complete evaluation is possible.

Tool `examples` and JSON Schema `examples` annotations are independent. Schema annotations remain suitable for anonymous values at an instance location; Tool Examples pair named complete invocations with completed results. <a id="req-tool-example-not-inferred"></a>Producers MUST NOT infer an author-supplied Tool Example by combining unrelated schema annotations.

Tool Examples are illustrative and non-exhaustive. They do not alter schemas, annotations, security requirements, side effects, or runtime behavior, and they do not guarantee that a live server returns a shown result. <a id="req-tool-example-tooling"></a>Documentation tooling SHOULD preserve names and input/result pairing. Mock or contract-test tooling MAY permit explicit selection by name. Such tooling MUST NOT execute a live Tool or reproduce declared side effects merely because an example exists. Selection without an explicit name MUST use a deterministic, documented policy and MUST NOT be presented as a prediction of live behavior.

Examples are untrusted descriptive content. <a id="req-tool-example-no-secrets"></a>Authors MUST NOT include secrets and SHOULD use conspicuously fictitious values. <a id="req-tool-example-untrusted"></a>Consumers MUST validate values, render content as data, and apply appropriate size and evaluation limits. They MUST NOT treat examples as authorization, proof of behavior, or safe executable instructions.

Tool Examples are MCP Description metadata, not fields of the MCP Tool type. <a id="req-tool-example-projection-omitted"></a>Native MCP projection ([Section 4.14](#414-native-mcp-projection)) MUST omit `examples` unless an independently specified MCP extension defines a destination. <a id="req-tool-example-views-preserved"></a>MCP Description round-tripping and Effective Protocol View projection ([Section 4.12](#412-effective-protocol-views-and-projection)) MUST preserve each selected Tool declaration's example map and MUST NOT merge maps from disjoint variants with the same Tool name.

### 9.4 Tool Interaction Examples

A Tool Object MAY contain `interactionExamples`, a non-empty map from a local scenario name to a Tool Interaction Example Object. <a id="req-interaction-examples-map"></a>Each name MUST match `^[A-Za-z0-9._-]+$`, is case-sensitive, and is scoped to the containing Tool declaration. The map is declaration-local: MCP Description 0.9.0 defines no `components` namespace for interaction scenarios.

Tool `interactionExamples` are separate from completed Tool `examples`. <a id="req-tool-example-not-interaction"></a>A producer MUST NOT place an incomplete workflow, semantic interaction step, or non-terminal Tool result in the completed `examples` map.

<a id="req-interaction-example-fields"></a>A Tool Interaction Example Object contains these core properties and MAY carry `x-*` specification extensions:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `input` | object | **Yes** | Complete initial `params.arguments` value from a `tools/call` request. |
| `steps` | non-empty array\<Tool Interaction Step Object\> | **Yes** | Ordered semantic client-input exchanges for this illustrated invocation. |
| `result` | object | **Yes** | Terminal completed Tool Result payload, excluding the JSON-RPC envelope. |

`input` follows the same schema-compatibility rules as Tool Example `input`. `result` follows the same completed success and execution-error rules as Tool Example `result`.

The scenario is illustrative and non-exhaustive. It asserts only that the shown steps occur in the displayed order in this example. It does not define branching, retries, correlation IDs, task state, transport framing, timing, or behavior for responses not shown.

<a id="req-interaction-step-fields"></a>Every Tool Interaction Step Object MUST contain `type`, `request`, and `response`. MCP Description 0.9.0 defines three step kinds:

| `type` | Request payload | Response payload |
|--------|-----------------|------------------|
| `elicitation` | Canonical elicitation request fields | Canonical elicitation response action and optional form content |
| `sampling` | Native `sampling/createMessage` parameters | Native completed sampling result |
| `roots` | Empty object | Native ordered `roots` result object |

<a id="req-interaction-step-closed"></a>Steps MAY carry `x-*` specification extensions. They MUST NOT contain any other fields beyond those defined for their step kind. Step `response` values are carried MCP values governed by [Section 3.6](#36-carried-mcp-values). A step is semantic MCP Description metadata, not a native MCP wire object. <a id="req-interaction-step-not-wire"></a>An implementation MUST NOT serialize a Tool Interaction Step directly onto an MCP connection.

An `elicitation` step MAY contain `declaration`, naming an Elicitation Declaration on the same Tool. <a id="req-interaction-elicitation-declaration"></a>When present, the request mode and the request schema or known URL MUST be compatible with that declaration after local reference resolution. <a id="req-interaction-elicitation-response"></a>For `mode: "form"`, an accepted response MUST contain `content` conforming to the request schema; declined and cancelled responses MUST NOT contain `content`. For `mode: "url"`, the response MUST omit `content`.

<a id="req-interaction-response-closed"></a>The Elicitation Interaction Response Object is closed. It MUST NOT contain fields other than `action`, `content`, and `_meta`. The action rules above determine when `content` is permitted. This closure applies to the response value in a Tool Interaction Example, not to the native MCP response received at runtime.

<a id="req-interaction-sampling-protocol-version"></a>A `sampling` step request uses the native `sampling/createMessage` parameter field names and constraints of every MCP protocol version in the containing Tool's effective protocol scope, excluding JSON-RPC, transport, task, and Multi Round-Trip Request framing. The request includes the required `messages` and `maxTokens`. It MAY include model preferences, system prompt, context inclusion, stop sequences, temperature, metadata, and Tool-related fields where the applicable protocol versions support them. Its response uses the native completed sampling result field names and constraints of every applicable protocol version, excluding JSON-RPC and task framing.

A `roots` step request is an empty object. Its response contains the ordered native `roots` declarations returned by the client for this illustration. Roots are descriptive input only; they do not authorize filesystem access.

The containing Tool's effective protocol scope controls validation. <a id="req-interaction-protocol-version-valid"></a>Every represented semantic field MUST be valid in every applicable protocol version. A Tool that spans materially incompatible interaction shapes MUST be split into disjoint protocol-scoped variants. `interactionExamples` themselves do not carry `protocolVersions`.

Tool `interactionExamples` do not add server capabilities, `clientRequirements`, or Elicitation Declarations. <a id="req-interaction-client-requirements-warning"></a>Validators SHOULD warn when a scenario contradicts an explicit primitive `clientRequirements` declaration. They MUST NOT infer a requirement when the Tool declares none.

Tool Interaction Examples are MCP Description metadata, not fields of the MCP Tool type. <a id="req-interaction-projection-omitted"></a>Native MCP projection ([Section 4.14](#414-native-mcp-projection)) MUST omit `interactionExamples` unless an independently specified MCP extension defines a destination. <a id="req-interaction-views-preserved"></a>Effective Protocol View projection ([Section 4.12](#412-effective-protocol-views-and-projection)) MUST preserve the selected Tool declaration's scenario map without combining disjoint variants. Merge tooling MUST NOT concatenate step arrays or guess how to combine unequal same-name scenarios.

Interaction scenarios are untrusted descriptive content. <a id="req-interaction-no-secrets"></a>Authors MUST use fictitious or sanitized values and MUST NOT include secrets, credentials, opaque runtime request state, task handles, or live session identifiers. <a id="req-interaction-untrusted"></a>Consumers MUST treat URLs, prompts, roots, and generated content as data and MUST NOT navigate, execute, or trust them merely because a scenario exists.

### 9.5 Protocol Variants and Security

<a id="req-tool-names-disjoint"></a>Tools with the same `name` MUST have pairwise-disjoint effective protocol scopes. Each Effective Protocol View therefore contains at most one Tool with that name. An omitted scope covers all root protocol versions and overlaps every scoped Tool with the same name.

Tool `security` describes statically known authorization required to call the Tool and replaces inherited transport or root security in full.

Tool `clientRequirements` applies only to invocation through `tools/call`. It does not state that a client needs those capabilities to discover the Tool through `tools/list`.

### 9.6 Tool Annotations

Tool Annotations provide hints about Tool behavior. They are distinct from the Resource Annotations used by Resources, Resource Templates, and content blocks (see [Section 10.3](#103-resource-annotations)). <a id="req-tool-annotations-fields"></a>A Tool `annotations` object MUST use the fields and semantics defined in this section. Resource Annotation fields such as `audience`, `priority`, and `lastModified` are not Tool Annotation fields.

All Tool Annotation fields, including `title`, are advisory. They are not guaranteed to describe Tool behavior faithfully. <a id="req-tool-annotations-untrusted"></a>Clients MUST treat Tool Annotations from untrusted servers as untrusted and MUST NOT make Tool-use decisions based on them.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | string | — | Human-readable title for the Tool |
| `readOnlyHint` | boolean | `false` | If `true`, the Tool does not modify its environment |
| `destructiveHint` | boolean | `true` | If `true`, the Tool may perform destructive updates |
| `idempotentHint` | boolean | `false` | If `true`, repeated calls with the same arguments have no additional effect |
| `openWorldHint` | boolean | `true` | If `true`, the Tool may interact with external entities |

<a id="req-tool-annotations-closed"></a>The Tool Annotations object contains only the fields above. MCP defines `ToolAnnotations` as a closed type in every supported protocol version, so other fields, including `x-*` keys, MUST NOT appear. Resource Annotation fields MUST NOT be used here.

### 9.7 Execution Object

The Execution Object describes whether a Tool supports task-augmented execution. It applies only to MCP 2025-11-25.

<a id="req-execution-fields"></a>

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `taskSupport` | string | `"forbidden"` | Whether the tool supports task-augmented execution: `"forbidden"`, `"optional"`, or `"required"` |

### 9.8 Example

```yaml
mcpdesc: 0.9.0
info:
  name: chess-rating-server
  title: Chess Rating MCP Server
  version: 1.0.0
protocolVersions:
  - "2026-07-28"
tools:
  - name: get_player_rating
    description: Get the current FIDE standard rating for a chess player
    inputSchema:
      type: object
      properties:
        player_id:
          description: FIDE player identifier
          type: string
      required:
        - player_id
    outputSchema:
      type: integer
      description: Current FIDE standard rating
    examples:
      fide-rating:
        input:
          player_id: planchaman
        result:
          resultType: complete
          content:
            - type: text
              text: The player's FIDE rating is 1701
          structuredContent: 1701
```
