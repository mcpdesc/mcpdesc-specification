# Proposal 0004: Named Tool Invocation and Result Examples

- Status: Accepted
- Author: Stève Sfartz
- Created: 2026-08-23
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/9

## Summary

Add an optional `examples` map to the Tool Object. Each named Tool Example Object pairs one complete Tool input with one completed MCP Tool Result. Results can illustrate successful structured and unstructured content or Tool execution errors with unstructured content.

The model supplements, rather than replaces, the JSON Schema `examples` annotation inside `inputSchema` and `outputSchema`. It provides the operation-level correlation required by documentation, contract-test, and deterministic mock-server tooling without defining complete JSON-RPC exchanges or a mock behavior language.

## Problem

The 0.8.0 draft defines Tool `inputSchema` and `outputSchema`, but it does not define a portable way to associate concrete Tool call arguments with the Tool Result produced for that invocation.

JSON Schema Draft 2020-12 already defines an `examples` annotation. Authors can place anonymous sample values inside schemas for MCP revisions whose Tool schemas use that dialect. This is useful but incomplete:

- schema examples have no stable local name;
- an input cannot be paired explicitly with its corresponding Tool Result;
- a nested example illustrates one instance location, not necessarily a complete invocation;
- schema examples cannot represent unstructured Tool Result `content`;
- Tools without `outputSchema` cannot document their result through an output schema;
- Tool execution errors are Tool Results rather than instances of `outputSchema`; and
- revisions before MCP 2025-11-25 do not have an embedded-schema dialect assigned by the current draft policy.

The repository examples demonstrate Tool schemas but no concrete invocation/result scenarios. Documentation generators must invent values, while mock tools such as `mcptoolkit-mock` cannot reproduce author-supplied results portably.

## Goals

- Represent multiple named invocation/result examples for a Tool.
- Require complete `tools/call` argument objects, including `{}` for no-argument Tools.
- Represent completed successful Tool Results, including required unstructured `content` and optional `structuredContent`.
- Represent Tool execution errors using `isError: true` and unstructured `content`.
- Make input and successful structured-result compatibility testable against Tool schemas.
- Support portable documentation, contract tests, and deterministic mock fixtures.
- Preserve JSON Schema `examples` for property-level and anonymous schema examples.
- Apply consistently to protocol-scoped Tool variants.
- Avoid implying that examples define exhaustive or live runtime behavior.

## Non-goals

- Define examples for Resources, Resource Templates, Prompts, or transport messages. Resource examples are addressed separately by Proposal 0005.
- Define complete JSON-RPC request or response envelopes.
- Define JSON-RPC protocol-error examples.
- Define a structured Tool execution-error format or schema. MCP currently provides no structured error-result contract; a future MCP proposal may address that gap.
- Define task, input-required, multi-round-trip, streaming, or progress-notification transcripts.
- Define request matching, template expressions, state transitions, side effects, delays, or a mock-server behavior language.
- Add reusable root components or cross-document Example Object references.
- Retrieve external example values.
- Replace JSON Schema `examples` or `default` annotations.
- Make OpenAPI a normative dependency.

## Background and primary references

- MCP 2026-07-28 Tools, including Tool Results, `arguments`, `content`, `structuredContent`, `outputSchema`, and Tool execution errors: https://modelcontextprotocol.io/specification/2026-07-28/server/tools
- OpenAPI 3.1.1 Example Object: https://spec.openapis.org/oas/v3.1.1.html#example-object
- OpenAPI 3.1.1 Working with Examples: https://spec.openapis.org/oas/v3.1.1.html#working-with-examples
- JSON Schema Draft 2020-12 `examples` annotation: https://json-schema.org/draft/2020-12/json-schema-validation#name-examples
- MCP Description draft Tool rules: `spec/draft/sections/09-tools.md`

OpenAPI distinguishes schema-level sample values from named examples associated with an operation representation. MCP Tools do not have HTTP media-type maps or status-code response maps. The reusable concept is a named example; its value should remain native to MCP Tool invocation and result semantics.

MCP distinguishes JSON-RPC protocol errors from Tool execution errors. Unknown Tools, malformed requests, and server failures can produce JSON-RPC errors. Actionable API, validation, and business failures are completed Tool Results with `isError: true`.

## Proposed normative behavior

### 1. Tool `examples` map

A Tool Object MAY contain `examples`, a map from a local example name to a Tool Example Object.

The map MUST contain at least one entry when present. Each local name MUST match:

```text
^[A-Za-z0-9._-]+$
```

Names are case-sensitive and scoped to the containing Tool declaration. Tools with the same `name` in disjoint protocol scopes have independent example maps. Entry order is not semantically significant.

The map key is the example's human-meaningful label and stable local selection name. Tool Example Objects do not add separate `summary` or `description` fields in 0.8.0. Additional prose metadata can be considered after implementation experience demonstrates a need.

### 2. Tool Example Object

A Tool Example Object has these fields:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `input` | object | **Yes** | Complete Tool call `arguments` value. |
| `result` | object | **Yes** | Complete applicable completed Tool Result payload, excluding the JSON-RPC envelope. |

The object does not allow additional properties in 0.8.0.

`input` represents `params.arguments` in a `tools/call` request. It does not represent the complete request or a serialized JSON string. It MUST be an object. A no-argument Tool example MUST use `input: {}`; omission does not mean an empty argument object.

`result` represents the value inside the JSON-RPC response's `result` member. It MUST conform structurally to a completed Tool Result in the example's effective MCP protocol revision, including fields required by that revision. It is not a JSON-RPC envelope.

The result MUST contain `content`. Content blocks MAY include any type permitted by the applicable MCP revision, including text, image, audio, embedded-resource, and resource-link content where supported.

Task, input-required, and other non-completed result variants are not Tool Examples in 0.8.0.

### 3. Successful results

A successful example result MUST omit `isError` or set it to `false`, according to the applicable MCP Tool Result rules.

A successful result MAY contain `structuredContent` only where supported by its effective MCP revision.

If the Tool declares `outputSchema`, a successful result MUST contain `structuredContent`, and that value MUST validate against `outputSchema` under the applicable schema dialect and protocol-revision rules.

If the Tool does not declare `outputSchema`, a successful result MAY contain `structuredContent` where the applicable MCP revision permits it. No mcpdesc schema-compatibility claim is made for such a value because no associated output schema exists.

Unstructured `content` is part of the example even when `structuredContent` is present. This lets documentation and mock tooling preserve the actual model-facing representation rather than synthesize it.

### 4. Tool execution-error results

A Tool execution-error example result MUST set `isError` to `true`, MUST contain unstructured `content`, and MUST NOT contain `structuredContent`.

This restriction reflects the current MCP contract: `outputSchema` describes successful structured output and MCP does not define a structured Tool execution-error schema. Error examples therefore document actionable feedback through unstructured content only.

`outputSchema` does not validate Tool execution-error `content`. A future MCP structured-error proposal may define new semantics; mcpdesc can align after such semantics exist rather than inventing them here.

Tool execution-error examples include business-rule failures, rejected but structurally valid values, missing domain entities, invalid state transitions, exhausted quotas, and Tool-level rate limits returned as `isError: true`. A transport or intermediary rejection that prevents an MCP Tool Result from being produced is outside this model.

JSON-RPC protocol errors remain outside Tool `examples`.

### 5. Schema compatibility

Every Tool Example `input` MUST validate against the containing Tool's `inputSchema` under the schema dialect and protocol-revision rules applicable to that Tool declaration. This applies to successful and Tool execution-error examples alike.

Execution-error examples are intended for inputs that are structurally valid but fail runtime or business constraints. Inputs intentionally violating `inputSchema` belong in schema-negative test fixtures, not conforming Tool Examples.

Every successful `structuredContent` value associated with an `outputSchema` MUST validate against that schema. Error `content` is not validated against `outputSchema`.

Example compatibility is a semantic conformance requirement. The mcpdesc JSON Schema can enforce the container and result shape, but a conforming semantic validator must evaluate inline values against associated embedded schemas when complete validation is possible.

For an applicable revision before MCP 2025-11-25, a validator MUST enforce the MCP-defined object-rooted Tool schema shape and constraints it can interpret without inventing an unspecified embedded-schema dialect. It MUST preserve examples and unrecognized schema keywords. If the missing dialect prevents complete compatibility validation, it SHOULD warn and MUST NOT report validation as complete.

If validation depends on an unresolved external `$ref`, a validator MUST follow the existing Tool-schema resolution policy: it MUST NOT retrieve the target automatically from a network, MUST preserve the reference and example, SHOULD warn that complete validation was not possible, and MUST NOT report partial validation as complete.

An incompatible example is an error when the associated schema can be evaluated completely.

### 6. Relationship to JSON Schema annotations

The JSON Schema `examples` keyword remains the preferred mechanism for anonymous sample values associated with a schema or subschema. Tool `examples` is the preferred mechanism for named complete invocations paired with Tool Results.

The mechanisms are independent:

- a Tool Example does not override, merge with, or suppress schema-level `examples`;
- schema-level `examples` do not create an invocation/result pair;
- a schema `default` does not become a Tool Example automatically; and
- tooling MAY display or use both if it preserves their distinct scopes.

A producer MUST NOT infer a complete Tool Example by combining unrelated property-level schema examples unless it labels the result as generated rather than author-supplied.

### 7. Documentation and mock use

Tool examples are illustrative and non-exhaustive. They do not alter schemas, annotations, security requirements, or runtime behavior.

The presence of an example does not guarantee that:

- a live server returns the example result for the example input;
- an invocation is safe, idempotent, deterministic, or free of side effects;
- values omitted from examples are unsupported; or
- every successful or failing outcome is documented.

Documentation tooling SHOULD preserve example names and input/result pairing.

Mock and contract-test tooling MAY expose explicit selection by example name. This specification does not define implicit request matching or a default example. Tooling selecting examples without an explicit name MUST use a deterministic, documented policy and MUST NOT claim that the selected result predicts live behavior for arbitrary input.

A mock implementation MUST NOT execute the described Tool or reproduce declared side effects merely because a Tool Example exists.

### 8. Protocol projection and round-tripping

Tool examples are MCP Description metadata and are not fields of the MCP Tool type.

Projection to an MCP `tools/list` Tool value MUST omit mcpdesc Tool `examples` unless an independently specified MCP extension defines an equivalent destination. MCP Description round-tripping MUST preserve examples and names.

Protocol-version projection selects the applicable Tool declaration and preserves its example map. It MUST NOT merge maps from Tool declarations with the same `name` but disjoint protocol scopes.

### 9. No external values in 0.8.0

Unlike the OpenAPI Example Object, the 0.8.0 Tool Example Object has no `externalValue` field.

OpenAPI `externalValue` is a URI identifying the literal example stored outside the description and is mutually exclusive with an inline value. It is useful for large or non-JSON representations but introduces retrieval, base-URI, media-type, mutability, integrity, credential, SSRF, offline-validation, and deterministic-build concerns.

Inline MCP argument and Tool Result values are sufficient to establish interoperable behavior in 0.8.0. External example corpora may be explored later with explicit resolution, integrity, and media-type rules.

## Schema impact

The 0.8.0 schema will add definitions equivalent in intent to:

```json
{
  "toolExample": {
    "type": "object",
    "required": ["input", "result"],
    "properties": {
      "input": {
        "type": "object",
        "additionalProperties": { "$ref": "#/$defs/jsonValue" }
      },
      "result": { "$ref": "#/$defs/completedToolResultExample" }
    },
    "additionalProperties": false
  },
  "toolExamples": {
    "type": "object",
    "minProperties": 1,
    "propertyNames": { "pattern": "^[A-Za-z0-9._-]+$" },
    "additionalProperties": { "$ref": "#/$defs/toolExample" }
  }
}
```

`completedToolResultExample` will structurally represent the completed Tool Result fields and content blocks supported by the draft's described MCP revisions. Protocol-revision applicability, success/error constraints, and schema compatibility may require semantic validation where the structural schema cannot express them precisely.

Semantic validation is required for:

- `input` against `inputSchema`;
- completed Tool Result compatibility with the effective MCP revision;
- successful `structuredContent` against `outputSchema`;
- required successful `structuredContent` when `outputSchema` is declared;
- rejection of `structuredContent` in an `isError: true` result; and
- complete/incomplete diagnostics for dialect and reference resolution.

`schemas/latest.json` remains pinned to stable 0.7.0. No frozen schema changes.

## Examples

### Successful structured and unstructured result

```json
{
  "protocolVersions": ["2026-07-28"],
  "name": "get_weather_data",
  "inputSchema": {
    "type": "object",
    "properties": {
      "location": { "type": "string" },
      "units": { "type": "string", "enum": ["celsius", "fahrenheit"] }
    },
    "required": ["location"],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "temperature": { "type": "number" },
      "conditions": { "type": "string" }
    },
    "required": ["temperature", "conditions"],
    "additionalProperties": false
  },
  "examples": {
    "paris-celsius": {
      "input": {
        "location": "Paris, FR",
        "units": "celsius"
      },
      "result": {
        "resultType": "complete",
        "content": [
          {
            "type": "text",
            "text": "Paris: 21.5°C, partly cloudy"
          }
        ],
        "structuredContent": {
          "temperature": 21.5,
          "conditions": "Partly cloudy"
        },
        "isError": false
      }
    }
  }
}
```

### No-argument Tool with unstructured result

```json
{
  "protocolVersions": ["2026-07-28"],
  "name": "get_current_time",
  "inputSchema": {
    "type": "object",
    "additionalProperties": false
  },
  "examples": {
    "utc": {
      "input": {},
      "result": {
        "resultType": "complete",
        "content": [
          {
            "type": "text",
            "text": "2026-08-23T10:15:00Z"
          }
        ],
        "isError": false
      }
    }
  }
}
```

`input: {}` is the complete argument object. It is not equivalent to omitting `input`.

### Tool execution error

```json
{
  "protocolVersions": ["2026-07-28"],
  "name": "book_flight",
  "inputSchema": {
    "type": "object",
    "properties": {
      "departureDate": { "type": "string", "format": "date" }
    },
    "required": ["departureDate"],
    "additionalProperties": false
  },
  "examples": {
    "departure-date-in-past": {
      "input": {
        "departureDate": "2025-01-01"
      },
      "result": {
        "resultType": "complete",
        "content": [
          {
            "type": "text",
            "text": "Departure date must be in the future."
          }
        ],
        "isError": true
      }
    }
  }
}
```

The input is structurally valid. The failure is a business rule. The result has no `structuredContent` and is not validated against `outputSchema`.

## Compatibility

Classification: **compatible addition** within the 0.8.0 Community Working Draft.

The field is optional. Existing 0.7.0 and 0.8.0 documents remain valid, and stable 0.7.0 artifacts do not change. Consumers that do not use examples can ignore the field after validating or preserving the containing MCP Description.

Tool Examples must not be copied into MCP `tools/list` values. Projection omits them unless a separate MCP extension defines a destination.

The proposal adds checks only when an author opts into examples. A mismatch affects the example-bearing description, not the validity of the underlying server behavior.

## Migration

No migration is required for existing documents.

Authors may migrate existing material as follows:

1. retain JSON Schema `examples` used for property-level or anonymous schema illustration;
2. create a named Tool Example for each complete invocation scenario;
3. copy the exact `tools/call` `arguments` object into `input`, using `{}` for no-argument Tools;
4. copy the completed Tool Result payload into `result`, omitting only the JSON-RPC envelope;
5. for successful results, preserve `content` and any `structuredContent`;
6. for Tool execution errors, preserve unstructured `content` and `isError: true`, but do not add `structuredContent`;
7. verify inputs and successful structured content against associated schemas; and
8. redact credentials, tokens, personal data, internal hostnames, and production identifiers.

A capture tool MUST NOT pair independently observed inputs and results without authoritative evidence that they belong to the same invocation. Synthesized examples should be identified as generated in surrounding tooling and reviewed before publication.

## Security and privacy considerations

- Examples can publish credentials, personal data, customer data, internal hostnames, resource identifiers, or proprietary content. Authors MUST NOT include secrets and SHOULD use conspicuously fictitious values.
- Examples are untrusted descriptive content. Consumers MUST validate values and MUST NOT treat examples as authorization, proof of server behavior, or safe executable instructions.
- Mock tooling MUST NOT invoke a live Tool while loading or serving an example.
- Documentation UIs should render content as data and prevent active-content injection.
- Image, audio, and embedded-resource examples may be large. Implementations SHOULD apply documented size and evaluation limits.
- Example strings can resemble prompt instructions. Clients MUST NOT grant them greater trust than other untrusted server metadata.
- Automatic external retrieval is excluded to avoid SSRF, mutable content, integrity ambiguity, and credential leakage.
- Real observed captures require consent, minimization, and redaction outside this specification.

## Alternatives considered

### Use only JSON Schema `examples`

Rejected as the complete solution, but retained for schema-level use. It cannot name complete scenarios, correlate invocation and result, represent unstructured content, or cover Tool execution errors.

### Keep `output` as only `structuredContent`

Rejected. It excludes Tools without `outputSchema`, omits mandatory unstructured result content, cannot represent Tool execution errors, and forces deterministic mocks to invent part of the Tool Result.

### Add separate `output`, `content`, and `isError` fields

Rejected. Flattening selected Tool Result fields creates an mcpdesc-specific result model and becomes fragile as MCP evolves. A revision-scoped MCP `result` preserves native semantics.

### Add independent input and result example maps

Rejected. Matching entries by coincidental names is implicit and fragile. A paired object makes correlation explicit.

### Make `input` optional for no-argument Tools

Rejected. No-argument Tools still receive a complete empty argument object. Required `input: {}` distinguishes an explicit invocation from missing data.

### Add `summary` and `description`

Deferred. The map key already supplies a stable, meaningful label. Additional metadata has no demonstrated v0.8 consumer requirement and can be added compatibly later.

### Permit structured Tool execution errors

Rejected for 0.8. MCP currently does not define a structured error-result schema. Error examples use unstructured `content`; mcpdesc should not preempt a future MCP design.

### Copy OpenAPI `externalValue`

Deferred. External values are useful for large or non-JSON examples but need retrieval, base-URI, media-type, integrity, security, and offline behavior beyond this proposal.

### Add reusable root example components

Deferred. Reuse adds reference-resolution, naming, override, and cross-document concerns. Inline examples are adequate for 0.8.0.

### Define mock matching and dynamic templates

Rejected for core 0.8.0. Matching priority, wildcards, state, generated values, delays, and side effects constitute a mock behavior language.

### Permit schema-incompatible examples as warnings

Rejected when complete validation is possible. An example contradicting its schema is not portable documentation. Warnings are appropriate only when dialect or reference-resolution limits make validation incomplete.

## Open questions

1. Should a future version add one prose metadata field after documentation-tool experience?
2. Should Tool Example Objects permit specification extensions in a future version?
3. Should reusable or external examples be added with explicit resolution and integrity rules?
4. Should conformance define stable diagnostic codes for incomplete and failed example validation?
5. How should mcpdesc evolve if MCP standardizes structured Tool execution errors?

None blocks review of the 0.8.0 inline completed-result model.

## Implementation and validation plan

After acceptance, implement on a feature branch. Proposal 0005 may share the branch if both proposals are accepted, while retaining separate commits and independently reviewable changes.

1. add Tool `examples` and Tool Example Object rules to `spec/draft/sections/09-tools.md`;
2. add structural definitions to `schemas/mcp-description/0.8.0.json` and synchronize `schemas/draft.json`;
3. regenerate `spec/draft/mcp-description.md` through the repository view workflow;
4. implement semantic validation for applicable completed Tool Results, input schemas, output schemas, success/error constraints, dialects, and references;
5. add valid fixtures for named examples, no-argument input, unstructured-only success, structured success, multiple content types, business errors, and Tool-level rate limits;
6. add invalid fixtures for empty maps, invalid names, missing input/result, non-object input, revision-incompatible results, schema mismatches, missing successful structured content, and structured error content;
7. add warning fixtures for validation blocked by unresolved `$ref` or unspecified pre-dialect semantics;
8. update at least one complete YAML example and relevant authoring guidance;
9. add compatibility, migration, and draft changelog entries;
10. verify projection omits examples from MCP Tool values; and
11. run `npm test` and `git diff --check` without bypassing failures.

Acceptance criteria:

- Tool Examples pair exact MCP `arguments` objects with applicable completed Tool Result payloads;
- no-argument examples explicitly use `input: {}`;
- successful examples preserve unstructured content and validate structured content where applicable;
- execution-error examples use `isError: true`, unstructured content, and no `structuredContent`;
- JSON-RPC protocol errors and incomplete result workflows remain out of scope;
- static and semantic validation enforce all specified constraints;
- examples support documentation and deterministic mocks without defining live behavior;
- stable 0.7.0 artifacts and `schemas/latest.json` remain unchanged; and
- all affected draft artifacts remain synchronized.

## Decision record

Accepted for implementation in MCP Description 0.8.0.

Review decisions recorded in this draft:

- represent the completed Tool Result rather than only `structuredContent`;
- require explicit empty input for no-argument Tools;
- support unstructured success and Tool execution-error examples;
- exclude structured execution errors until MCP defines them;
- omit `summary`, `description`, and `externalValue` in 0.8.0; and
- address Resource and Resource Template examples in a separate proposal.

AI assistance disclosure: GitHub Copilot assisted with repository analysis, primary-source comparison, design evaluation, issue drafting, and proposal drafting. The human author remains responsible for review and acceptance.
