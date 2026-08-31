# Migrating from MCP Description 0.7.0 to 0.8.0

MCP Description 0.8.0 is intentionally breaking. Migration must preserve author intent and must not infer protocol revisions, Tool parameters, OAuth scopes, or hidden runtime surfaces from insufficient evidence.

## Serialization

JSON documents require no serialization migration and remain conforming as `.mcpdesc.json` with media type `application/mcp-description+json`.

Version 0.8.0 also defines restricted YAML as an equally conforming serialization of the same JSON-compatible data model. Rename YAML descriptions to `.mcpdesc.yaml` or `.mcpdesc.yml`, with `.mcpdesc.yaml` preferred. Use `application/mcp-description+yaml`; generic tooling should use the RFC 9512 `application/yaml` media type when the project-specific type is unavailable or inappropriate.

Before treating an existing YAML file as conforming, verify YAML 1.2.2 JSON-schema scalar resolution, exactly one document, string and unique mapping keys, no custom tags or aliases, no merge semantics, and finite JSON-compatible numbers. Apply the same 0.8.0 JSON Schema and semantic validation after decoding as for JSON. Conversion between JSON and YAML must preserve the decoded data model; comments, scalar style, and mapping order are not semantic.

## Schema identity and publication

Draft 4 introduces a new canonical MCP Description schema family under `https://mcpdesc.org/schema/mcp-description/`. When a migrated 0.8.0 draft document emits `$schema`, use `https://mcpdesc.org/schema/mcp-description/0.8.0-rc.1.json` and keep `mcpdesc: 0.8.0` unchanged.

Do not rewrite frozen stable 0.7.0 or published Draft 1-3 documents merely to change their embedded schema identifiers. Stable 0.7.0 retains the historical Cisco root `$id`, and Draft 1-3 retain the historical short URI family. Exact historical validation of those snapshots should use the corresponding bundled validator selector rather than guessing from a rewritten URL.

Network retrieval remains optional. Offline validators may bundle known schema resources and resolve their canonical URIs locally.

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

## Optional sections and collection cardinality

Version 0.8.0 requires only `mcpdesc`, `info`, and non-empty `protocolVersions` at the root. A migrated document MAY omit `transports` when connection details are unavailable, environment-specific, or intentionally undeclared. Omission makes no transport declaration and does not assert that the runtime has no transport. When `transports` is present, it MUST be non-empty and its effective scopes must still cover every root protocol revision.

Remove any empty ordinary declaration property rather than inserting a placeholder. This applies to root `transports`, `securitySchemes`, `capabilities`, `tools`, `resources`, `resourceTemplates`, `prompts`, and `tags`; icon, primitive tag-reference, Elicitation Declaration, Prompt Argument, and extension-capability collections; named Tool, Resource, Resource Template, and Prompt example maps; and Prompt and Resource Template `completionExamples` maps. Projection and merge output must likewise omit an ordinary collection after its last entry is removed.

Do not apply that normalization to security values. Preserve omitted `security`, `security: []`, `security: [{}]`, and empty scope arrays as distinct forms. Do not infer runtime non-support from an omitted security, capability, primitive, or tag section.

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

## Primitive client requirements

No automatic migration is required because `clientRequirements` is optional and 0.7.0 has no equivalent. Add it only when authoritative design information confirms that successful Tool invocation, Resource read, concrete Resource Template read, or Prompt retrieval has an unconditional minimum dependency on client capabilities. Do not infer it from root server `capabilities`, every Elicitation Declaration, optional runtime feature use, security requirements, or one input-dependent failure observation.

The object must be non-empty and valid under every revision in the primitive's effective scope. Split the primitive into disjoint protocol variants when the required shape changes, including core Tasks in MCP 2025-11-25 versus a formal Tasks extension in MCP 2026-07-28. Preserve unknown and experimental capabilities without inventing matching semantics. Treat non-empty formal extension settings as indeterminate unless the evaluator understands the extension specification.

Migration tooling SHOULD require explicit author confirmation before converting runtime observations into unconditional requirements. Capability compatibility and authorization remain separate decisions, and requirements apply to call, read, or get rather than primitive listing.

## Object-level specification extensions

No migration is required for existing root `x-*` properties. Version 0.8.0 also permits `x-*` directly on eligible MCP Description-defined semantic objects. Organizations MAY move object-specific metadata from a root parallel map to the object it describes, but migration tooling SHOULD do so only when each source entry resolves unambiguously to one object and protocol-scoped variant.

Preserve unknown object-level extensions without assigning them core semantics. Do not move extensions into domain maps, Security Requirement Objects, `capabilities.extensions`, embedded JSON Schemas, carried MCP payload/result/annotation/`_meta` objects, arbitrary values, or Reference Objects. A nested `protocolVersions` field inside an extension value belongs to that extension and does not scope the containing MCP Description object.

Apply object-level extensions to the outer Components Object and eligible semantic example component values only. Component namespace maps, schemas, and Reference Objects remain closed to this mechanism. An `x-*` key inside a namespace map is a component name and its value must satisfy the namespace type.

## Reusable components

No migration is required because root `components` and `$componentRef` are optional. To deduplicate repeated complete schemas or named example objects, move the value into the matching `schemas`, `toolExamples`, `resourceExamples`, or `resourceTemplateExamples` namespace and replace each complete use-site value with a local Reference Object such as `{ "$componentRef": "#/components/schemas/SearchInput" }`.

Do not replace JSON Schema `$ref` or `$defs`; those remain scoped to an embedded JSON Schema resource. Do not convert remote or relative-file references into `$componentRef`, add sibling properties to a Reference Object, add `protocolVersions` to a component, or use a component to bypass an inline use-site rule. Validate each referenced value under every Tool, Elicitation Declaration, Resource, Resource Template, Prompt, and protocol scope where it is used.

Migration and merge tooling must keep resolution within one document, reject missing or cyclic targets, and never retrieve component values from a network. When combining descriptions, deduplicate equivalent components or deterministically rename collisions and rewrite all affected `$componentRef` values. Projection may remove unused values only after retaining every transitive target.

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

## Tool interaction examples

No migration is required because Tool `interactionExamples` is optional. Use a named interaction scenario only when one authoritative Tool invocation needs ordered semantic elicitation, sampling, or roots steps in addition to a terminal completed Tool Result.

Copy the exact initial `tools/call` arguments object to `input`, preserve each semantic client-input exchange in `steps`, and copy only the terminal completed Tool Result payload to `result`. Do not copy JSON-RPC envelopes, `InputRequiredResult`, `inputRequests`, `inputResponses`, `requestState`, task state, retries, timing, or session identifiers. Interaction scenarios are not wire transcripts.

If a step names an Elicitation Declaration, keep it declaration-local to the same Tool and ensure the request mode and schema or known URL remain compatible. A form acceptance response must match the shown request schema. For sampling, keep the native `sampling/createMessage` request and completed response field names for the applicable MCP revisions. For roots, keep the native ordered `roots` response object and use `file://` URIs.

Interaction scenarios do not create `clientRequirements`. When a Tool already declares explicit unconditional `clientRequirements`, review the scenario for contradiction instead of silently broadening the requirement set. Sanitize prompts, URLs, roots, generated content, and results before publication; use conspicuously fictitious values and remove credentials, opaque state, and live identifiers.

## Resource examples

No migration is required because Resource and Resource Template `examples` are optional. For a static Resource, create a named example and copy the completed payload inside a correlated `resources/read` response's `result` member to `result`; the declaration's `uri` is the implicit request URI. For a Resource Template, also copy the exact concrete `resources/read.params.uri` to the example's `uri` and verify that it is an RFC 6570 expansion of `uriTemplate`.

Preserve content order, URIs, text, base64 binary data, MIME types, and applicable result metadata. MCP 2026-07-28 Resource read results require non-negative `ttlMs` and `cacheScope` equal to `public` or `private`; retain both in an example for that revision. Earlier revisions do not define these fields. Do not copy the JSON-RPC envelope or errors. Verify each content entry has exactly one of `text` or `blob`, and redact credentials, personal data, internal paths, and proprietary content. Examples are illustrative snapshots, not statements of freshness or live equality.

A capture tool MUST NOT associate independently observed Resource requests and results without authoritative correlation. Protocol-scoped Resource variants need different example maps when they span MCP 2026-07-28 and an earlier revision: 2026 completed read results require `resultType: "complete"`, `ttlMs`, and `cacheScope`, while earlier revisions do not define those fields.

## Prompt examples

No migration is required because Prompt `examples` is optional. Use a named Prompt Example when a complete `prompts/get` argument map must be paired with one completed Prompt result. Copy the exact `params.arguments` object to `arguments`; for a no-argument invocation, either omit `arguments` or use `arguments: {}`. Every key must match a declared Prompt argument, every required argument must be present, and every value must remain a string.

Copy only the completed payload inside the JSON-RPC response's `result` member to `result`; do not copy JSON-RPC envelope fields, request metadata, or incomplete workflow states. Preserve the ordered `messages` array and any native `description`. MCP 2026-07-28 Prompt results require `resultType: "complete"`; earlier revisions do not define that field. Split protocol-scoped Prompt variants when one logical Prompt needs revision-incompatible example shapes.

## Completion examples

No migration is required because Prompt and Resource Template `completionExamples` are optional. Use a named completion example when one observed `completion/complete` request-result pair should be preserved without copying the MCP reference object into a separate registry.

Copy the selected request argument to `argument.name` and `argument.value`. Put any already-supplied other Prompt arguments or RFC 6570 template variables in `context.arguments`; omit `context` entirely when none were supplied. Do not repeat the completed target in context, and do not represent an empty context as `{}`.

Copy only the completed payload inside the JSON-RPC response's `result` member to `result`. Preserve `completion.values` order and any native `total`, `hasMore`, and revision-supported `_meta`. MCP 2026-07-28 completion results require `resultType: "complete"`; earlier revisions do not define that field. MCP 2025-03-26 does not define completion context, so split protocol-scoped variants when context is needed. Validate Prompt target names against declared Prompt arguments and Resource Template target names against RFC 6570 variable names parsed from `uriTemplate`.

## MCP `_meta`

Preserve literal `_meta` already present on Tool, Resource, Resource Template, and Prompt declarations, but validate it against every revision in the declaration's Effective Protocol View. Version 0.8.0 enforces the applicable MCP key grammar from MCP 2025-06-18 onward. Malformed keys and known reserved keys in the wrong context or with the wrong value shape require author review; they MUST NOT be silently renamed or moved.

Literal `_meta` may also be retained on revision-supported completed Tool and Resource result examples and their supported content objects. It remains an illustrative value, not a declaration of metadata that a live server accepts or emits. Do not derive a metadata schema from observed values, and do not translate `_meta` into a root `x-*` property or `capabilities.extensions` entry.

Preserve valid third-party and unprefixed keys. Preserve and warn about an unrecognized key under an MCP-reserved prefix rather than deleting it. For MCP 2024-11-05 and MCP 2025-03-26, retain structurally valid data, report that complete semantic validation was not performed, and do not claim complete MCP conformance.

Before publishing migrated literal values, remove credentials, tokens, user identifiers, internal topology, live trace identifiers, and other sensitive runtime data. Use conspicuously fictitious or redacted values in examples.

## Elicitation declarations

No automatic migration is required because 0.7.0 has no Elicitation Declaration model. Add `elicitations` to a Tool, Resource, Resource Template, or Prompt only from authoritative design information about additional user interaction that may occur while fulfilling that primitive.

Use `mode: "form"` with a flat restricted `requestedSchema`, or `mode: "url"` for an out-of-band interaction. A form spanning MCP 2025-06-18 and later revisions must use only the 2025-06-18 vocabulary; split declarations by protocol scope when defaults, titled enums, multi-select enums, or URL mode apply only to MCP 2025-11-25 or later. A nested `protocolVersions` value must remain within its containing primitive's effective scope.

Do not infer an elicitation from an optional input property, a Tool error, or a captured runtime exchange without authoritative correlation. Do not move incomplete workflows into Tool or Resource examples: named examples remain completed results. A migration tool must not retrieve a declared URL, infer runtime MRTR choreography, or claim privacy and security conformance from the static declaration.

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
3. Set `mcpdesc` to `0.8.0` and, when emitting it, set `$schema` to `https://mcpdesc.org/schema/mcp-description/0.8.0-rc.1.json`.
4. Move `info.protocolVersion` to root `protocolVersions`; require input if absent or unsupported.
5. Wrap a present Capabilities Object in a one-item array.
6. Resolve every missing Tool `inputSchema` through author review.
7. Generate and deduplicate named security schemes, preserving override placement.
8. Add only authoritatively known instructions, scopes, revisions, and protocol variants.
9. Validate against the 0.8.0 JSON Schema.
10. Run semantic validation for protocol scopes, transport coverage, primitive and Elicitation Declaration uniqueness, security and component references, tags, revision applicability, elicitation modes and form schemas, literal `_meta`, embedded Tool schemas and examples, unresolved external-reference warnings, and extension namespace warnings.

A migration tool MUST report unresolved ambiguity instead of guessing.

Preserve every syntactically valid `capabilities.extensions` identifier. If an identifier uses an MCP-reserved prefix but is absent from the tool's local official-extension catalogue, emit a review warning rather than rejecting or rewriting it solely on that basis.
