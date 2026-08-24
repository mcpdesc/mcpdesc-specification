# Migrating from MCP Description 0.7.0 to 0.8.0

MCP Description 0.8.0 is intentionally breaking. Migration must preserve author intent and must not infer protocol revisions, Tool parameters, OAuth scopes, or hidden runtime surfaces from insufficient evidence.

## Protocol coverage

Move `info.protocolVersion` to required root `protocolVersions` and remove the old field.

```json
{
  "info": { "name": "example", "version": "1.0.0" },
  "protocolVersions": ["2025-11-25"]
}
```

The value must be one of the MCP revisions supported by 0.8.0. If the 0.7.0 document omits `info.protocolVersion`, migration tooling MUST obtain the revision from authoritative input rather than inventing one.

For a multi-revision description, declarations that apply to all root revisions omit their scope. Materially different declarations use disjoint `protocolVersions` variants. Transports must collectively cover every root revision; Capabilities Objects and same-identifier primitive variants must not overlap.

## Capabilities

Wrap a present root Capabilities Object in an array:

```json
{
  "capabilities": [
    { "tools": { "listChanged": true } }
  ]
}
```

Do not translate durable notification semantics into wire-message catalogues. Keep fields such as `resources.subscribe`. Do not copy 2025 core Tasks declarations into a 2026 view; represent a 2026 Tasks extension separately when authoritative metadata supports it.

## Tool input schemas

Every 0.8.0 Tool requires `inputSchema`. A migration tool MUST require author intervention for a Tool that omitted it in 0.7.0.

Use a closed no-parameter schema only when the author confirms that the Tool accepts no parameters:

```json
{ "type": "object", "additionalProperties": false }
```

Do not silently replace a missing schema with `{ "type": "object" }` or a closed schema. The omission does not reveal whether parameters are unknown or absent. Repair modes SHOULD record the source and nature of any author-approved insertion.

Tool schema details are revision-sensitive. Explicit `$schema` declarations require MCP 2025-11-25 or later. MCP 2025-11-25 and MCP 2026-07-28 default to JSON Schema 2020-12. Earlier supported revisions do not state an embedded-schema dialect default, so migration tooling must preserve their additional schema keywords and validate the object-rooted Tool schema shape without inventing a dialect. `outputSchema` must remain object-rooted before MCP 2026-07-28, while MCP 2026-07-28 permits any valid JSON Schema root. `x-mcp-header` is specific to MCP 2026-07-28. Tool `execution` applies only to MCP 2025-11-25. Split a Tool into disjoint protocol variants when one declaration cannot satisfy every applicable revision; do not silently discard fields.

Preserve external `$ref` values without automatically retrieving network targets. Prefer converting author-controlled schemas to self-contained local `$defs` where practical. If a target is unavailable to offline validation, retain the reference and emit a warning that complete Tool schema validation was not possible. Consumers that require executable schema certainty should resolve it through an explicitly trusted catalogue or treat the warning as an error.

Likewise, `info.description` requires MCP 2025-11-25 or later, and Streamable HTTP requires MCP 2025-03-26 or later. Associate legacy SSE with modern revisions only when that compatibility surface is intentional; validators warn about that association.

## Tool examples

No migration is required because Tool `examples` is optional. Keep JSON Schema `examples` annotations for anonymous schema-level values. Use a named Tool Example when complete invocation arguments must be paired with a completed Tool Result.

Copy the exact `tools/call` `arguments` object to `input`, using `{}` explicitly for a no-argument Tool. Copy the completed payload inside the JSON-RPC response's `result` member to `result`; do not copy the JSON-RPC envelope. Preserve unstructured `content` for every result. Successful results with an `outputSchema` require matching `structuredContent`. Tool execution-error examples use `isError: true` and unstructured content only.

Do not pair independently observed inputs and results without authoritative evidence that they came from the same invocation. Do not infer complete Tool Examples by combining unrelated schema annotations. Redact credentials, tokens, personal or customer data, internal hostnames, and production identifiers. Protocol-scoped Tool variants may need different example maps because their completed-result and content-block shapes differ.

## Resource examples

No migration is required because Resource and Resource Template `examples` are optional. For a static Resource, create a named example and copy the completed payload inside a correlated `resources/read` response's `result` member to `result`; the declaration's `uri` is the implicit request URI. For a Resource Template, also copy the exact concrete `resources/read.params.uri` to the example's `uri` and verify that it is an RFC 6570 expansion of `uriTemplate`.

Preserve content order, URIs, text, base64 binary data, MIME types, and applicable result metadata. Do not copy the JSON-RPC envelope or errors. Verify each content entry has exactly one of `text` or `blob`, and redact credentials, personal data, internal paths, and proprietary content. Examples are illustrative snapshots, not statements of freshness or live equality.

A capture tool MUST NOT associate independently observed Resource requests and results without authoritative correlation. Protocol-scoped Resource variants may need different example maps because MCP 2026-07-28 completed results require `resultType: "complete"`, while earlier revisions do not define that field.

## Security

Move each distinct inline Security Scheme Object to a deterministic local name under root `securitySchemes`. Replace each former root or transport occurrence with a Security Requirement Object referencing that name.

```json
{
  "securitySchemes": {
    "oauth": {
      "type": "oauth2",
      "flows": {
        "authorizationCode": {
          "authorizationUrl": "https://auth.example.com/authorize",
          "tokenUrl": "https://auth.example.com/token",
          "scopes": { "issues:read": "Read issues" }
        }
      }
    }
  },
  "security": [
    { "oauth": [] }
  ]
}
```

Generated names SHOULD be stable and prefer author-provided identifiers where available. Name collisions and ambiguous duplicate definitions require review. Preserve root and transport override behavior. Do not add primitive requirements or infer minimum OAuth scopes from observing credentials or visibility differences.

Validate OAuth flow endpoint fields while migrating. Implicit flows require `authorizationUrl`; password and client-credentials flows require `tokenUrl`; authorization-code flows require both. Every flow requires `scopes`. Missing authoritative endpoint metadata requires author intervention.

In 0.8.0, omission inherits at nested levels, `security: []` clears an inherited requirement, and `security: [{}]` records an explicit anonymous alternative. Migration and round trips MUST preserve these distinctions.

## Instructions and zero-primitive descriptions

Add root `instructions` when durable server guidance is authoritatively available. It is not protocol-scoped. A description may omit every primitive collection, so migration need not invent a placeholder Tool, Resource, Resource Template, or Prompt.

## Recommended algorithm

1. Parse and validate the 0.7.0 source.
2. Copy unchanged identity, transport, primitive, tag, and extension fields.
3. Set `mcpdesc` and `$schema` to the 0.8.0 values.
4. Move `info.protocolVersion` to root `protocolVersions`; require input if absent or unsupported.
5. Wrap a present Capabilities Object in a one-item array.
6. Resolve every missing Tool `inputSchema` through author review.
7. Generate and deduplicate named security schemes, preserving override placement.
8. Add only authoritatively known instructions, scopes, revisions, and protocol variants.
9. Validate against the 0.8.0 JSON Schema.
10. Run semantic validation for protocol scopes, transport coverage, primitive uniqueness, security references, tags, revision applicability, embedded Tool schemas and examples, unresolved external-reference warnings, and extension namespace warnings.

A migration tool MUST report unresolved ambiguity instead of guessing.

Preserve every syntactically valid `capabilities.extensions` identifier. If an identifier uses an MCP-reserved prefix but is absent from the tool's local official-extension catalogue, emit a review warning rather than rejecting or rewriting it solely on that basis.
