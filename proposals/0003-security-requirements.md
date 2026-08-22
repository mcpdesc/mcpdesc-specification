# Proposal 0003: Named Security Schemes and Scoped Requirements

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-22
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/6
- Review period: 2026-08-22 through 2026-08-29 (seven calendar days)

## Summary

Replace the inline security-scheme array inherited from mcpdesc 0.7.0 with reusable root `securitySchemes` and Security Requirement Arrays at root, transport, and primitive levels.

The model is aligned with the familiar OpenAPI 3.1 Security Scheme and Security Requirement concepts, but OpenAPI is informative rather than a normative dependency. The proposal describes statically known authentication and authorization requirements without attempting to encode runtime OAuth choreography, access-control policy, or authorization-filtered discovery behavior.

## Review process

This breaking proposal uses a seven-calendar-day public review before a maintainer acceptance decision. The shortened period is a bootstrap exception: the project has one maintainer, no established contributor base, and needs an implementable Community Working Draft to attract interoperability feedback. Acceptance authorizes draft implementation only; it is not a stable release or a claim of community consensus.

The project should retain 30 days of public visibility before stable 0.8.0 release unless a separate release decision documents an exception.

## Problem

mcpdesc 0.7.0 represents security as inline scheme definitions. That shape cannot efficiently reference the same mechanism at multiple levels, cannot express standard OR/AND alternatives, and cannot attach operation-specific OAuth or OpenID Connect scopes to individual Tools, Resources, Resource Templates, or Prompts.

MCP authorization can vary by operation and can determine the runtime surface visible to a caller. A static description should represent known access requirements while remaining explicit about what it cannot predict.

## Goals

- Separate reusable security-scheme definitions from requirements.
- Express alternative and combined authentication requirements.
- Attach requirements at root, transport, and primitive levels.
- Represent statically known OAuth and OpenID Connect scopes.
- Define omission, inheritance, explicit clearing, and anonymous access unambiguously.
- Detect invalid scheme references and scheme-type/scope combinations.
- State the limits of static descriptions for discovery visibility and runtime policy.

## Non-goals

- Define OAuth authorization-server discovery, protected-resource metadata, client registration, token acquisition, challenges, refresh, or retry behavior.
- Define runtime ACL evaluation.
- Define users, groups, roles, tenants, RBAC, ABAC, or policy expressions.
- Predict exact authorization-filtered list/discovery results.
- Add discovery-specific or subscription-specific security metadata.
- Define transport-specific primitive inventories.
- Make OpenAPI a normative dependency.

## Background and primary references

- MCP authorization specification by applicable protocol revision: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- MCP `2026-07-28` specification index: https://modelcontextprotocol.io/specification/2026-07-28
- OpenAPI 3.1 Security Scheme Object, informative alignment reference: https://spec.openapis.org/oas/v3.1.1.html#security-scheme-object
- OpenAPI 3.1 Security Requirement Object, informative alignment reference: https://spec.openapis.org/oas/v3.1.1.html#security-requirement-object
- mcpdesc 0.7.0 schema: `schemas/mcp-description/0.7.0.json`

## Proposed normative behavior

### 1. Security Scheme definitions

Root `securitySchemes` is an optional map from a local name to a Security Scheme Object.

Local scheme names MUST match:

```text
^[A-Za-z0-9._-]+$
```

Each Security Scheme Object MUST contain `type`. The 0.8.0 core retains these 0.7.0 scheme families:

- `http`;
- `apiKey`;
- `oauth2`;
- `openIdConnect`.

Their type-specific fields remain aligned with the corresponding existing mcpdesc shapes, subject to schema corrections and migration guidance.

Example:

```json
{
  "securitySchemes": {
    "oauth": {
      "type": "oauth2",
      "flows": {
        "authorizationCode": {
          "authorizationUrl": "https://auth.example.com/authorize",
          "tokenUrl": "https://auth.example.com/token",
          "scopes": {
            "issues:read": "Read issues",
            "issues:write": "Modify issues"
          }
        }
      }
    },
    "api-key": {
      "type": "apiKey",
      "in": "header",
      "name": "X-API-Key"
    }
  }
}
```

### 2. Security Requirement Arrays

A `security` value is an array of Security Requirement Objects. Each Security Requirement Object maps local scheme names to arrays of scope strings.

```json
{
  "security": [
    { "oauth": ["issues:read"] },
    { "api-key": [] }
  ]
}
```

Semantics are:

- entries in the outer array are alternatives (**OR**);
- multiple scheme names in one object are jointly required (**AND**);
- every scope listed for an OAuth2 or OpenID Connect scheme is required;
- HTTP and API key schemes MUST use an empty scope array;
- every referenced local name MUST exist in root `securitySchemes`;
- scope arrays MUST contain unique strings.

The order of alternatives, scheme keys, and scopes is not semantically significant.

### 3. Anonymous access and explicit clearing

These forms are intentionally distinct:

- omitted `security`: inherit the applicable requirement, or make no declaration when omitted at root;
- `security: []`: explicitly declare no mcpdesc security requirement at that level and clear any inherited requirement;
- `security: [{}]`: explicitly allow anonymous access as one alternative;
- `security: [{}, {"oauth": ["issues:read"]}]`: allow either anonymous access or the named OAuth requirement.

An empty Security Requirement Object is valid only as an anonymous alternative inside a non-empty Security Requirement Array.

Although both `[]` and `[{}]` permit access without satisfying a named scheme, they preserve different authorial intent: explicit absence of a declared requirement versus an explicit anonymous alternative. Implementations MUST preserve that distinction when round-tripping and MUST NOT normalize either form into the other.

### 4. Placement and override precedence

`security` MAY appear at:

- document root;
- Transport Object;
- Tool Object;
- Resource Object;
- Resource Template Object;
- Prompt Object.

The effective requirement for a primitive used through a selected transport is determined by the first present value in this order:

1. primitive `security`;
2. selected transport `security`;
3. root `security`;
4. no mcpdesc-declared requirement.

This is an override model, not a merge model. A more specific requirement replaces the inherited array in full.

Because transport selection participates in inheritance, a tool that resolves effective requirements MUST know the selected transport. Protocol-version projection alone MUST preserve security declarations rather than materializing one transport's inherited value onto primitives.

### 5. Primitive meaning

For a Tool, `security` describes statically known authorization required to call it.

For a Resource, it describes statically known authorization required to access it.

For a Resource Template, it describes statically known authorization required to use the template to access matching resources.

For a Prompt, it describes statically known authorization required to retrieve it.

A primitive requirement describes access conditions, not identities, roles, ownership, or exact discovery visibility.

### 6. Scope catalogue validation

For OAuth2 and OpenID Connect requirements, a scope MAY be used even when it does not appear in a statically declared scope catalogue. MCP authorization can determine operation-specific scopes dynamically.

A validator MAY warn about an uncatalogued OAuth or OpenID Connect scope, but MUST NOT reject the document solely for that reason.

An unknown security-scheme reference, a duplicate scope, or a non-empty scope array for HTTP/API key security is a semantic error.

### 7. Authorization-filtered discovery

A primitive's effective `security` requirement MUST NOT be interpreted as either:

- a guarantee that the primitive is hidden from discovery until the requirement is satisfied; or
- a guarantee that the primitive is visible before the requirement is satisfied.

Runtime list/discovery filtering remains server policy governed by MCP and the implementation. Two servers with the same primitive access requirements but different unauthorized-discovery behavior cannot be distinguished by core mcpdesc 0.8.0.

Generators and mock servers that attempt to reproduce authorization-filtered discovery SHOULD disclose this fidelity limitation.

### 8. Multi-transport limitation

mcpdesc 0.8.0 does not allow one primitive to declare a different direct security override for each transport. Transport inheritance can represent different transport defaults, but a primitive-level override applies regardless of selected transport.

When one logical primitive has materially different requirements per transport and inheritance cannot represent them faithfully, authors SHOULD publish separate descriptions or use a specification extension. A merge or projection tool MUST NOT invent a combined requirement.

## Schema impact

The 0.8.0 schema will:

- replace the root inline `security` scheme array with optional `securitySchemes` plus optional Security Requirement Array `security`;
- define the local-name pattern;
- allow an empty Security Requirement Object;
- allow `security: []`;
- add Security Requirement Arrays to transports and all primitive kinds;
- structurally require requirement values to be arrays of unique strings; and
- retain the four supported scheme families.

Cross-object reference resolution, scheme-type/scope compatibility, and optional catalogue warnings require semantic validation.

The immutable 0.7.0 schema will not change. `schemas/latest.json` remains 0.7.0 until stable release.

## Examples

### Alternative schemes

```json
{
  "securitySchemes": {
    "oauth": {
      "type": "oauth2",
      "flows": {
        "authorizationCode": {
          "authorizationUrl": "https://auth.example.com/authorize",
          "tokenUrl": "https://auth.example.com/token",
          "scopes": {
            "issues:read": "Read issues"
          }
        }
      }
    },
    "api-key": {
      "type": "apiKey",
      "in": "header",
      "name": "X-API-Key"
    }
  },
  "security": [
    { "oauth": ["issues:read"] },
    { "api-key": [] }
  ]
}
```

Either OAuth with `issues:read` or the API key satisfies this requirement.

### Combined schemes

```json
{
  "security": [
    {
      "oauth": ["issues:write"],
      "api-key": []
    }
  ]
}
```

Both schemes are required.

### Primitive override and explicit clearing

```json
{
  "security": [
    { "oauth": ["issues:read"] }
  ],
  "tools": [
    {
      "name": "update_issue",
      "inputSchema": {
        "type": "object",
        "properties": {
          "number": { "type": "integer" }
        },
        "required": ["number"],
        "additionalProperties": false
      },
      "security": [
        { "oauth": ["issues:write"] }
      ]
    },
    {
      "name": "health",
      "inputSchema": {
        "type": "object",
        "additionalProperties": false
      },
      "security": []
    }
  ]
}
```

`update_issue` replaces the root read requirement with a write requirement. `health` explicitly clears the inherited requirement.

### Anonymous alternative

```json
{
  "security": [
    {},
    { "oauth": ["profile:read"] }
  ]
}
```

Anonymous access is an explicit alternative to OAuth access.

## Compatibility

Classification: **breaking**.

A conforming 0.7.0 document using inline security definitions will not satisfy the 0.8.0 shape. The change is justified because named definitions are required for reusable references, standard OR/AND composition, and per-primitive scope declarations. Retaining the old shape as an alias would create two security models with different expressive power and ambiguous precedence.

## Migration

A migration tool should:

1. assign a stable local name to every distinct inline 0.7.0 security scheme;
2. move each definition into root `securitySchemes`;
3. replace each prior occurrence with a Security Requirement Object referencing its local name;
4. preserve prior root and transport override behavior;
5. avoid adding primitive requirements without authoritative input;
6. report generated names and any deduplication for author review; and
7. validate all references and scheme-type/scope combinations.

Generated local names should be deterministic and should prefer author-provided identifiers where available. Name collisions or semantically ambiguous duplicate definitions require author review.

Migration MUST NOT infer minimum OAuth scopes from the scopes attached to an observing credential or from primitive visibility differences.

## Security and privacy considerations

- Static security metadata can disclose authentication architecture, scope names, endpoint locations, and potentially sensitive operational intent. Authors should publish only information appropriate for the description's audience.
- Scheme declarations and requirements are descriptive. Servers MUST continue to enforce authorization at runtime.
- Consumers MUST NOT treat mcpdesc metadata as proof that a caller is authorized.
- Tool annotations and descriptions are not security controls.
- Anonymous alternatives and explicit clearing must not be normalized away, because doing so can conceal changes in declared access posture.
- Merge tools must reject incompatible requirements rather than weakening them by union, intersection, or arbitrary selection.
- Observed primitive visibility is insufficient evidence for inferring minimum authorization scopes.

## Alternatives considered

### Retain inline scheme definitions

Rejected. Repetition prevents stable references and makes operation-specific requirements cumbersome and error-prone.

### Merge requirements across levels

Rejected. Implicit merging is difficult to reason about and can accidentally require too much or too little. Full override semantics are deterministic and familiar.

### Treat omitted security as public access

Rejected. Omission means no declaration at root or inheritance at a nested level. It is not proof that runtime policy permits anonymous access.

### Use only `security: []` for anonymous access

Rejected as the sole representation. An empty requirement object is useful as an explicit anonymous alternative alongside named alternatives, while an empty array explicitly clears declared requirements.

### Reject uncatalogued OAuth scopes

Rejected. MCP authorization may use dynamically determined, operation-specific scopes that a static catalogue does not enumerate.

### Add `discoverySecurity`

Deferred. Exact authorization-dependent discovery policy is useful but requires a separate interoperable model and is not equivalent to primitive use authorization.

### Add roles or policy expressions

Rejected for 0.8.0. Such models introduce deployment-specific semantics and significantly expand conformance and privacy concerns.

## Open questions

No architectural question blocks review. Exact schema factoring, deterministic migration-name generation, and diagnostic codes are implementation details that must preserve the normative behavior above.

## Implementation and validation plan

After acceptance, implement on a separate feature branch together with the accepted 0.8.0 core where artifacts overlap:

1. update normative security sections and object tables;
2. add the schema definitions and placements;
3. implement semantic reference and scheme-type validation;
4. add positive fixtures for OR, AND, anonymous alternatives, omission/inheritance, explicit clearing, and primitive override;
5. add negative fixtures for unknown references, invalid local names, duplicate scopes, and non-OAuth non-empty scopes;
6. add warning fixtures for uncatalogued OAuth/OpenID Connect scopes;
7. update examples, migration guidance, and the draft changelog;
8. document discovery and multi-transport fidelity limits; and
9. run `npm test` without bypassing failures.

## Decision record

Pending review. A maintainer decision may be recorded no earlier than 2026-08-29. Acceptance authorizes implementation into the 0.8.0 Community Working Draft but does not release the specification.

AI assistance disclosure: GitHub Copilot assisted with repository analysis, primary-source comparison, design refinement, and proposal drafting. The human author remains responsible for review and acceptance.
