# Proposal 0017: Semantic Tool Interaction Examples

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-28
- Target version: 0.8.0 Draft 4
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/41
- Review period: 2026-08-28 through 2026-09-27

## Summary

Add an optional `interactionExamples` map to Tool Objects. Each named scenario records initial Tool input, an ordered sequence of semantic client-input steps, and one terminal completed Tool Result.

The first version supports elicitation, sampling, and roots steps. It intentionally abstracts over legacy server-initiated requests and MCP 2026-07-28 Multi Round-Trip Requests, documenting durable interaction semantics without embedding JSON-RPC envelopes, transport events, request state, or a general workflow language.

## Problem

Draft 3 can describe durable elicitation declarations and completed Tool examples, but it excludes intermediate interaction choreography. In the supplied sessions:

- MCP 2025-11-25 server-to-client elicitation, sampling, and roots requests disappear from the generated description; and
- MCP 2026-07-28 `input_required` results, supplied input responses, and Tool re-entry disappear.

Both reduce to a final completed Tool Result. That result does not explain which client input was required, in what order, or how a multi-round Tool reaches completion. Elicitation Declarations alone cannot represent sampling, roots, repeated rounds, or the relationship to one illustrated Tool invocation.

## Goals

- Represent named, ordered, multi-step Tool interaction scenarios.
- Cover form and URL elicitation, sampling, and roots client input.
- Preserve an initial Tool input and terminal completed Tool Result.
- Compare durable behavior across legacy and 2026 protocol eras.
- Link an elicitation step to an existing Elicitation Declaration when applicable.
- Keep scenarios illustrative and narrower than executable workflows.
- Permit example-level evidence attribution and sanitization metadata through `x-*`.

## Non-goals

- Preserve raw JSON-RPC envelopes, IDs, transport framing, notifications, or timing.
- Preserve opaque MCP request state, runtime session IDs, task handles, or retry tokens.
- Define arbitrary branches, loops, expressions, parallelism, delays, or side effects.
- Replace Elicitation Declarations or Client Capability Requirements.
- Define progress, logging, subscription, or list-change transcripts.
- Guarantee that a scenario occurs, succeeds, or is available to every client.
- Provide a general mock-server behavior language.

## Background and primary references

- MCP 2026-07-28 Multi Round-Trip Requests: https://modelcontextprotocol.io/specification/2026-07-28/basic/utilities/multi-round-trip
- MCP elicitation: https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation
- MCP sampling: https://modelcontextprotocol.io/specification/2026-07-28/client/sampling
- MCP roots: https://modelcontextprotocol.io/specification/2026-07-28/client/roots
- Draft Elicitation Declarations: `spec/draft/sections/12-elicitation.md`
- Issue 41 Inspector evidence: https://github.com/mcpdesc/mcpdesc-specification/issues/41

The same server behavior can have different wire choreography by revision. A semantic scenario provides one portable authoring model while leaving the applicable MCP specification authoritative for execution.

## Proposed normative behavior

### 1. Tool `interactionExamples`

A Tool Object MAY contain `interactionExamples`, a non-empty map from a local name to a Tool Interaction Example Object.

Names MUST match `^[A-Za-z0-9._-]+$`, are case-sensitive, and are scoped to the containing Tool declaration. Scenarios MAY carry `x-*` specification extensions and MUST NOT contain other undefined unprefixed fields.

Interaction examples are separate from completed Tool `examples`. A producer MUST NOT place an incomplete result or interaction step in the completed example map.

### 2. Tool Interaction Example Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `input` | object | Yes | Complete initial Tool arguments. |
| `steps` | non-empty array | Yes | Ordered semantic client-input exchanges. |
| `result` | object | Yes | Terminal completed Tool Result. |

`input` follows the same schema-compatibility rules as a completed Tool Example input. `result` follows the same completed success or Tool execution-error rules as a Tool Example result.

The scenario asserts only that the shown steps occur in the displayed order in this illustration. It does not define branches, retries, or behavior for other responses.

### 3. Common interaction step

Every step contains:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `elicitation`, `sampling`, or `roots` | Yes | Semantic interaction kind. |
| `request` | object | Yes | Client input requested by the server. |
| `response` | object | Yes | Representative client outcome. |

Steps MAY carry `x-*` extensions and MUST NOT contain other fields except those defined for their type.

The step is not a native MCP request, response, or `InputRequiredResult`. It omits protocol correlation and transport framing. An implementation MUST NOT serialize it directly onto an MCP connection.

### 4. Elicitation step

An elicitation step MAY contain `declaration`, naming an Elicitation Declaration on the same Tool. When present, the request's mode, message purpose, schema, and known URL MUST be compatible with that declaration.

The request uses the canonical elicitation fields `mode`, `message`, and mode-dependent `requestedSchema` or `url`. The response uses `action: accept`, `decline`, or `cancel`; an accepted form response contains `content` conforming to the request schema, while decline and cancel contain no content.

Runtime-generated URLs MAY be replaced with a conspicuously fictitious representative URL. The scenario remains illustrative rather than an instruction to navigate.

### 5. Sampling step

A sampling request contains the native CreateMessage parameters defined by every revision in the Tool's effective protocol scope, excluding JSON-RPC, transport, task, and correlation framing. This includes required `messages` and `maxTokens` and MAY include revision-supported model preferences, system prompt, context inclusion, stop sequences, temperature, metadata, and Tool-related fields. A field that is not valid in every applicable revision requires a disjoint Tool variant.

Its response preserves one completed native sampling result for every applicable revision, including the native model, role, content, and stop reason fields where defined, while excluding JSON-RPC and task framing. The structural schema and semantic validator use the exact field names and constraints of each applicable MCP revision rather than a new mcpdesc sampling vocabulary.

Model preferences and generated content remain illustrative. A scenario MUST NOT imply that the named model is available or that output is deterministic.

### 6. Roots step

A roots request is an empty object. Its response contains the ordered native root declarations returned by the client for the illustration. Roots do not authorize access, and a client using the Tool may provide different or no roots.

### 7. Protocol applicability

The containing Tool's effective protocol scope controls validation. Every represented semantic field MUST be supported in every applicable revision. A Tool spanning materially incompatible interaction shapes MUST be split into disjoint protocol-scoped variants.

Each Tool variant has its own `interactionExamples` map. Scenarios do not carry an independent `protocolVersions` property and MUST NOT be shared across variants by implication.

For legacy revisions, a runtime may realize a step as a server-to-client request. For MCP 2026-07-28, a runtime may realize it through an input-required result and subsequent input responses. This proposal defines no mechanical wire projection in either direction.

### 8. Capability and declaration independence

An interaction example does not add server capabilities, Client Capability Requirements, or Elicitation Declarations. Those remain independent contract statements.

Validators SHOULD warn when a scenario illustrates client input that contradicts an explicit unconditional `clientRequirements` declaration, but MUST NOT infer a requirement when none is declared.

### 9. Projection, merge, and round-tripping

Interaction examples are MCP Description metadata and are omitted from native MCP Tool projection. Effective Protocol View projection preserves the selected Tool's scenarios without combining disjoint variants.

Merge tooling MUST NOT concatenate steps, combine scenarios, or resolve name collisions by guessing. Equal scenarios may be deduplicated; unequal collisions require deterministic renaming or a conflict.

## Schema impact

The schema adds Tool `interactionExamples`, the Tool Interaction Example Object, a discriminated semantic step union, and request/response shapes for elicitation, sampling, and roots.

Semantic validation covers Tool input/output schemas, declaration linkage, elicitation response schemas, protocol scope, accepted/declined/cancelled response relationships, and revision-specific sampling and roots fields.

No reusable component namespace is added initially. Scenarios are tightly coupled to one Tool's input schema, output schema, declarations, and scope.

## Examples

```yaml
tools:
  - name: prepare-release
    inputSchema:
      type: object
      properties:
        version:
          type: string
      required: [version]
    elicitations:
      - name: confirm
        mode: form
        message: Confirm the release.
        requestedSchema:
          type: object
          properties:
            approved:
              type: boolean
          required: [approved]
    interactionExamples:
      approved-release:
        input:
          version: 2.0.0
        steps:
          - type: roots
            request: {}
            response:
              roots:
                - uri: file:///workspace/example
                  name: Example workspace
          - type: elicitation
            declaration: confirm
            request:
              mode: form
              message: Confirm the release.
              requestedSchema:
                type: object
                properties:
                  approved:
                    type: boolean
                required: [approved]
            response:
              action: accept
              content:
                approved: true
        result:
          resultType: complete
          content:
            - type: text
              text: Release preparation completed.
```

The excerpt illustrates semantics applicable to MCP 2026-07-28. It is not a wire transcript and does not authorize filesystem or release operations.

## Compatibility

This is an additive but substantial feature in the unreleased draft. Documents without interaction examples are unchanged. Consumers may ignore scenarios without changing the described runtime contract.

Because the model intentionally abstracts protocol choreography, it cannot serve as a lossless session archive. The companion derivation report in Proposal 0018 can reference source events for audit.

## Migration

No existing document requires migration. Producers must not mechanically copy raw sessions into scenarios. They must select, normalize, sanitize, and validate representative semantic steps.

## Security and privacy considerations

Interaction examples have high disclosure risk. Elicitation content, roots, sampling messages, generated content, URLs, and Tool results can contain credentials, personal data, local paths, confidential prompts, or private resources.

Authors MUST use fictitious or sanitized values. Producers SHOULD omit unsafe scenarios by default, record redaction separately, and never include opaque request state, authentication material, or runtime session identifiers. Consumers MUST treat all content as untrusted and MUST NOT execute Tools, navigate URLs, access roots, or invoke sampling because a scenario exists.

## Alternatives considered

- **Native revision-specific transcripts:** more faithful, but duplicate wire specifications, fragment cross-era behavior, and invite publication of IDs and transport state.
- **Extend Elicitation Declarations only:** cannot represent sampling, roots, ordering, multiple rounds, or the final result relationship.
- **Companion artifact only:** safer for raw evidence, but leaves portable contract documentation unable to illustrate material interaction behavior.
- **General workflow language:** rejected as far beyond MCP Description's static contract purpose.

## Open questions

- Should the first version include only elicitation, allowing sampling and roots after more implementation evidence?
- Should decline and cancel scenarios permit a terminal Tool execution-error result, a successful result, or both according to the containing Tool example rules?
- Is a warning sufficient for mismatch with explicit client requirements, or should contradiction be an error?

## Implementation and validation plan

After acceptance:

1. update Tool, Elicitation, capability, and examples sections;
2. add structural and semantic schemas;
3. add cross-revision fixtures for legacy and 2026 behavior;
4. add sensitive-data, invalid-linkage, and incomplete-workflow fixtures;
5. add projection, merge, and round-trip tests;
6. update guides, changelog, and migration notes; and
7. preserve immutable Draft 1-3 snapshots.

## Decision record

- 2026-08-28: Initial Review proposal selects ordered protocol-neutral semantic scenarios attached to Tools and excludes raw wire transcripts.