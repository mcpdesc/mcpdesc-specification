# Proposal 0012: Primitive-Level Client Capability Requirements

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-25
- Last updated: 2026-08-26
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/25
- Review period: 2026-08-26 through 2026-09-25

## Summary

Add an optional `clientRequirements` property to Tool, Resource, Resource Template, and Prompt declarations so an MCP Description can state an unconditional static precondition, for each applicable MCP revision, on the minimum client capabilities required for that primitive.

The value uses the applicable MCP `ClientCapabilities` shape rather than inventing a second capability vocabulary. Requirements are interpreted as an AND-set of minimum capabilities: every declared requirement must be satisfied by the client for the selected MCP revision. The property describes one static compatibility dimension, not the runtime negotiation mechanism or a guarantee that a request will succeed.

This closes a gap between MCP Description's existing server-side `capabilities` declarations and modern MCP's client-side capability model. In MCP 2026-07-28, every request carries client capabilities and the protocol defines `MissingRequiredClientCapability` for requests that cannot be fulfilled without capabilities the client did not declare. A static MCP Description can currently say what the server supports, but cannot say that a particular Tool, Resource, Resource Template, or Prompt requires a corresponding client capability.

## Problem

MCP Description Draft 1 has a protocol-scoped `capabilities` array describing durable features supported by the server. It also describes primitives and, for those primitives, security requirements, examples, `_meta`, tags, and possible elicitations.

It does not provide a standard way to describe the opposite direction of the MCP capability contract: capabilities the client must support for a particular primitive to be usable.

This distinction matters because MCP has capabilities in both directions:

* server capabilities describe behavior offered by the MCP server;
* client capabilities describe behavior the MCP client can provide to the server.

For MCP 2026-07-28, the client supplies `io.modelcontextprotocol/clientCapabilities` on each request. The protocol defines a `MissingRequiredClientCapability` error whose `requiredCapabilities` data is expressed using the MCP `ClientCapabilities` shape when a server cannot process a request without a capability the client did not declare.

Examples include:

* a Tool that can only complete by using form elicitation;
* a Prompt whose generation requires client sampling in a protocol revision where sampling is supported;
* a Resource read that requires roots in a protocol revision where roots is supported; or
* a Tool whose implementation requires a formal MCP extension capability such as `io.modelcontextprotocol/tasks`.

Today an MCP Description can declare:

```json
{
  "capabilities": [
    {
      "protocolVersions": ["2026-07-28"],
      "extensions": {
        "io.modelcontextprotocol/tasks": {}
      }
    }
  ]
}
```

This says that the server supports the Tasks extension. It does not say that a specific tool cannot be fulfilled for a client that does not advertise Tasks support.

Likewise, an `elicitations` declaration says that additional user interaction may occur while fulfilling a primitive. It intentionally does not state that every invocation requires elicitation or that a particular client is capable of fulfilling that interaction.

Without an explicit client-requirement declaration, offline tooling cannot reliably answer questions such as:

* Can this client use this Tool?
* Which primitives require elicitation support?
* Which primitives require a formal MCP client extension?
* Would a client lacking `sampling.tools` be incompatible with a primitive?
* Which primitive would cause a missing-required-client-capability failure for a given client profile?

These are static compatibility questions and fit MCP Description's purpose without requiring it to reproduce MCP runtime negotiation choreography.

## Goals

* Add primitive-level client capability requirements to Tool, Resource, Resource Template, and Prompt declarations.
* Reuse the applicable MCP `ClientCapabilities` vocabulary and semantics.
* Express revision-specific, unconditional minimum client capabilities as a static primitive-use precondition.
* Support formal MCP client extension requirements, including MCP 2026-07-28 `extensions`.
* Preserve MCP Description's protocol-version scoping model.
* Enable offline compatibility analysis between a primitive description and a known client capability profile.
* Keep server `capabilities` and client `clientRequirements` directionally distinct.
* Keep capability requirements independent from security requirements.
* Avoid describing the runtime negotiation, retry, MRTR, initialization, or discovery choreography.

## Non-goals

* Describe optional client capabilities that merely enhance a primitive when available.
* Describe conditional capability requirements based on input arguments, authorization state, data values, runtime state, or branch-specific execution paths.
* Define OR-expressions between alternative client capability sets.
* Define a general workflow or dependency-expression language.
* Define how MCP clients advertise capabilities on the wire.
* Replace or redefine the MCP `ClientCapabilities` type.
* Describe server-side capabilities; the existing root `capabilities` declarations continue to serve that purpose.
* Infer requirements automatically from `elicitations`, examples, annotations, `_meta`, or server capabilities.
* Require servers to filter primitive-list responses based on client capability requirements.
* Add root-level or transport-level client capability defaults in this proposal.
* Guarantee successful primitive completion merely because declared capability requirements are satisfied; authorization, input validity, runtime state, and other failures remain independent.

## Background and primary references

* MCP Description 0.8.0 Draft 1, especially Sections 4, 8, 9–12: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/mcp-description.md
* MCP 2026-07-28 changelog, including stateless per-request client capabilities and formal client/server extension capabilities: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/changelog.mdx
* MCP 2026-07-28 schema, `ClientCapabilities` and `MissingRequiredClientCapabilityError`: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts
* MCP 2026-07-28 architecture, describing clients attaching capabilities to every request and servers respecting declared capabilities: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/architecture/index.mdx
* SEP-2663 Tasks extension, including `MissingRequiredClientCapability` and required `extensions.io.modelcontextprotocol/tasks`: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2663-tasks-extension.md
* MCP 2026-07-28 Sampling capability requirements: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/client/sampling.mdx
* MCP 2026-07-28 Roots capability requirements: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/client/roots.mdx

## Proposed normative behavior

### 1. Primitive `clientRequirements` property

Tool, Resource, Resource Template, and Prompt Objects MAY contain a `clientRequirements` property.

`clientRequirements` is a Client Capability Requirements Object describing an unconditional static precondition on the minimum MCP client capabilities for the primitive operation represented by that declaration under each revision in its effective protocol scope.

The property applies to the following operation:

* Tool — invocation of the Tool through `tools/call`;
* Resource — retrieval of that Resource through `resources/read`;
* Resource Template — `resources/read` of a concrete URI produced from that template; and
* Prompt — retrieval of that Prompt through `prompts/get`.

`clientRequirements` does not describe requirements for listing or discovering the primitive.

For example, a Tool MAY remain visible in `tools/list` even when the current client does not satisfy the Tool's declared `clientRequirements`. MCP Description does not require or prohibit runtime filtering based on client capabilities.

### 2. Client Capability Requirements Object

A Client Capability Requirements Object uses the `ClientCapabilities` structure defined by every MCP protocol revision in the containing primitive's effective protocol scope.

Example:

```json
{
  "clientRequirements": {
    "elicitation": {
      "form": {}
    }
  }
}
```

For MCP 2026-07-28, the recognized core shape includes the applicable members of `ClientCapabilities`, including:

* `roots`;
* `sampling`;
* `elicitation`;
* `extensions`; and
* `experimental`.

Revision-specific deprecation and availability rules remain authoritative.

A Client Capability Requirements Object MUST be a non-empty object. An empty object provides no information and SHOULD be omitted.

### 3. Minimum requirement semantics

Every capability expressed by `clientRequirements` is an unconditional static minimum requirement for the primitive declaration on which it appears and for every MCP revision in that declaration's effective protocol scope.

All declared requirements are conjunctive: the client must satisfy every declared requirement to be compatible on the client-capability dimension. Satisfaction does not guarantee successful runtime completion.

For example:

```json
{
  "clientRequirements": {
    "elicitation": {
      "form": {}
    },
    "extensions": {
      "io.modelcontextprotocol/tasks": {}
    }
  }
}
```

means that successful fulfillment of the primitive, as described, requires both form elicitation support and the Tasks extension capability.

This proposal does not define OR semantics between alternative requirement sets.

A server author MUST NOT use `clientRequirements` to represent a capability that is merely optional, opportunistic, or needed only for some invocations unless the primitive is split into declarations whose static contract makes the requirement unconditional.

### 4. Relationship to MCP capability advertisement

`clientRequirements` describes the capability precondition but does not define how that capability is negotiated or transmitted.

The applicable MCP protocol revision remains authoritative.

For protocol revisions that establish client capabilities during initialization, satisfying a requirement means the client declared the capability through that revision's capability mechanism.

For MCP 2026-07-28 and later revisions using per-request client capabilities, satisfying a requirement means the capability is declared for the request according to the applicable MCP `_meta` rules.

MCP Description MUST NOT require a particular runtime handshake, `server/discover` call, retry sequence, MRTR exchange, transport, or error flow merely because `clientRequirements` is present.

### 5. Relationship to `MissingRequiredClientCapability`

For an MCP revision that defines `MissingRequiredClientCapability`, a primitive-level `clientRequirements` declaration documents the same class of durable precondition represented by the protocol's `requiredCapabilities` error data.

It does not require the server to produce that error in every failure case, and it does not replace the MCP protocol's runtime error rules.

When a server is unable to fulfill the primitive specifically because the client does not satisfy an unconditional declared requirement, its runtime behavior MUST remain conformant with the applicable MCP revision.

### 6. Protocol applicability

`clientRequirements` inherits the effective protocol scope of its containing primitive.

The requirements object does not carry its own `protocolVersions` property.

Every capability and nested capability member used by `clientRequirements` MUST be valid for every MCP revision in the primitive's effective scope.

If the required client capability set differs materially by protocol revision, the author MUST split the primitive into pairwise-disjoint protocol-scoped variants using the existing primitive `protocolVersions` mechanism.

For example:

```json
{
  "tools": [
    {
      "name": "long_running_build",
      "protocolVersions": ["2025-11-25"],
      "inputSchema": {
        "type": "object",
        "additionalProperties": false
      },
      "clientRequirements": {
        "elicitation": {}
      }
    },
    {
      "name": "long_running_build",
      "protocolVersions": ["2026-07-28"],
      "inputSchema": {
        "type": "object",
        "additionalProperties": false
      },
      "clientRequirements": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  ]
}
```

The example is illustrative of version-specific requirements; authors remain responsible for using capability declarations that are semantically correct for the actual server behavior and applicable MCP revision.

### 7. Core capability satisfaction

For core MCP client capabilities, satisfaction follows the semantics of the applicable MCP revision.

At minimum:

* a required capability property must be declared by the client;
* a required nested core capability property must also be declared when the applicable MCP revision gives that nested property capability semantics; and
* deprecation does not make an otherwise valid requirement invalid during the revision's supported deprecation window, although validators SHOULD surface the applicable deprecation diagnostic.

For example, under MCP 2026-07-28:

```json
{
  "clientRequirements": {
    "sampling": {
      "tools": {}
    }
  }
}
```

requires a client declaration that satisfies both the `sampling` capability and its `tools` sub-capability according to the MCP Sampling specification.

A generic MCP Description consumer MUST NOT invent capability semantics that contradict the applicable MCP revision.

### 8. Formal MCP extension requirements

For MCP revisions that define `ClientCapabilities.extensions`, `clientRequirements.extensions` MAY declare formal MCP extension capabilities required from the client.

Example:

```json
{
  "clientRequirements": {
    "extensions": {
      "io.modelcontextprotocol/tasks": {}
    }
  }
}
```

Extension identifiers MUST satisfy the applicable MCP extension key-name rules.

If the required extension value is an empty object, a generic compatibility checker MAY treat presence of that extension identifier in the client's advertised `extensions` map as satisfying the mcpdesc requirement, unless the extension specification defines stricter semantics.

If the requirement contains non-empty extension settings, those settings are interpreted according to the extension's specification. A consumer that does not understand those extension-specific semantics MUST NOT claim that the requirement is satisfied solely because the extension identifier is present.

Unknown syntactically valid extension identifiers MUST be preserved. A validator SHOULD warn about an unrecognized identifier under a reserved prefix and MUST NOT reject solely because the identifier is absent from its local catalogue, consistent with the existing server capability-extension rules.

### 9. Experimental and unknown capabilities

Where the applicable MCP `ClientCapabilities` type permits experimental or additional capability properties, MCP Description MAY preserve those declarations.

A generic validator MAY validate their structural JSON compatibility but MUST NOT invent semantic matching rules for an unknown capability.

A compatibility checker that cannot determine whether an unknown or experimental requirement is satisfied SHOULD report the result as indeterminate rather than satisfied.

### 10. Compatibility evaluation

A tool comparing a primitive's `clientRequirements` with a known client capability profile for a selected MCP revision SHOULD distinguish at least:

* **satisfied** — every requirement is known to be satisfied;
* **unsatisfied** — at least one requirement is known not to be satisfied; and
* **indeterminate** — no requirement is known to be unsatisfied, but at least one requirement cannot be evaluated with the tool's available MCP or extension semantics.

An omitted `clientRequirements` means that the MCP Description makes no primitive-level client capability requirement claim. It MUST NOT be interpreted as proof that no runtime path can ever make optional use of a client capability.

### 11. Relationship to server `capabilities`

Root `capabilities` and primitive `clientRequirements` describe opposite directions of the MCP contract.

* `capabilities` describes durable behavior supported by the server.
* `clientRequirements` describes durable minimum behavior required from the client to use one primitive.

Tooling MUST NOT infer one from the other.

A server may support an extension without requiring that extension for every primitive.

For example:

```json
{
  "capabilities": [
    {
      "protocolVersions": ["2026-07-28"],
      "extensions": {
        "io.modelcontextprotocol/tasks": {}
      }
    }
  ],
  "tools": [
    {
      "name": "status",
      "protocolVersions": ["2026-07-28"],
      "inputSchema": {
        "type": "object",
        "additionalProperties": false
      }
    },
    {
      "name": "full_rebuild",
      "protocolVersions": ["2026-07-28"],
      "inputSchema": {
        "type": "object",
        "additionalProperties": false
      },
      "clientRequirements": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  ]
}
```

The server supports Tasks, but only `full_rebuild` declares it as an unconditional client requirement.

### 12. Relationship to Elicitation Declarations

`elicitations` and `clientRequirements` have different semantics.

An Elicitation Declaration documents an additional user interaction that MAY occur while fulfilling a primitive and may include a human-readable `when` condition.

`clientRequirements.elicitation` states that the applicable client elicitation capability is an unconditional minimum requirement for successful fulfillment of the primitive declaration.

A primitive with a conditional elicitation MUST NOT declare elicitation as a hard `clientRequirements` capability solely because the conditional interaction exists.

For example:

```json
{
  "name": "assign_issue",
  "inputSchema": {
    "type": "object",
    "properties": {
      "assignee": {
        "type": "string"
      }
    }
  },
  "elicitations": [
    {
      "name": "choose_assignee",
      "mode": "form",
      "when": "No assignee was supplied.",
      "message": "Who should own this issue?",
      "requestedSchema": {
        "type": "object",
        "properties": {
          "assignee": {
            "type": "string"
          }
        },
        "required": ["assignee"]
      }
    }
  ]
}
```

does not by itself imply:

```json
{
  "clientRequirements": {
    "elicitation": {
      "form": {}
    }
  }
}
```

because an invocation supplying `assignee` may not require elicitation.

### 13. Relationship to security

`clientRequirements` and `security` are independent.

Satisfying a client capability requirement does not satisfy authorization, and satisfying authorization does not imply that the client supports a required capability.

A consumer evaluating primitive usability SHOULD evaluate both dimensions independently.

No inheritance is defined for `clientRequirements` in this proposal. Requirements are declared only on the primitive to which they apply.

### 14. Projection

A conforming single-version projection MUST preserve `clientRequirements` on every retained primitive.

The projected requirements MUST be semantically valid for the selected MCP revision.

Projection MUST NOT copy server `capabilities` into `clientRequirements`, infer requirements from `elicitations`, or materialize requirements that were not declared by the source primitive.

### 15. Merge

`clientRequirements` is semantically significant primitive contract data.

When otherwise mergeable primitive declarations have equivalent `clientRequirements`, merge tooling MAY merge them according to the existing protocol-scope rules.

When the same primitive would have materially different `clientRequirements` for overlapping protocol scope, a merge tool MUST NOT silently select one or union the requirements. It MUST retain distinct non-overlapping variants where representable or report a merge conflict.

A merge tool MUST NOT infer that the union of two requirement objects is correct, because doing so could turn optional or version-specific capabilities into unconditional requirements.

## Schema impact

The JSON Schema definitions for Tool, Resource, Resource Template, and Prompt should gain an optional `clientRequirements` property referencing a new Client Capability Requirements Object definition.

Conceptually:

```json
{
  "$defs": {
    "ClientCapabilityRequirements": {
      "type": "object",
      "minProperties": 1
    }
  }
}
```

The production schema should provide known MCP client capability properties where practical while retaining the extensibility required by the applicable MCP `ClientCapabilities` model.

Because capability availability and semantics depend on the primitive's effective `protocolVersions`, complete validation is partly semantic rather than purely structural.

Semantic validation MUST:

1. determine the primitive's effective protocol scope;
2. validate `clientRequirements` against every applicable MCP revision;
3. reject a capability or nested capability member that is invalid for any applicable revision where mcpdesc provides complete revision-specific validation;
4. apply the existing legacy incomplete-validation treatment to older revisions for which complete MCP semantic validation is not available;
5. validate formal extension identifiers according to the applicable MCP revision; and
6. preserve unknown capability members where the applicable MCP capability model is open.

Tool, Resource, Resource Template, and Prompt property tables should add:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `clientRequirements` | Client Capability Requirements Object | No | Revision-specific, unconditional static precondition on minimum MCP client capabilities for this primitive. |

The conformance section should add client-requirement revision applicability and semantic validation to the list of cross-object semantic requirements.

Section 12.6 should be clarified so that MCP Description still does not model capability-negotiation choreography, while allowing this proposal's static client capability preconditions.

## Examples

### Tool that unconditionally requires form elicitation

```json
{
  "name": "approve_purchase",
  "description": "Submit a purchase after collecting mandatory user approval details.",
  "protocolVersions": ["2026-07-28"],
  "inputSchema": {
    "type": "object",
    "properties": {
      "itemId": {
        "type": "string"
      }
    },
    "required": ["itemId"],
    "additionalProperties": false
  },
  "clientRequirements": {
    "elicitation": {
      "form": {}
    }
  },
  "elicitations": [
    {
      "name": "approval",
      "mode": "form",
      "message": "Confirm the purchase details.",
      "requestedSchema": {
        "type": "object",
        "properties": {
          "approved": {
            "type": "boolean"
          }
        },
        "required": ["approved"]
      },
      "onDecline": "Do not submit the purchase.",
      "onCancel": "Abort the operation."
    }
  ]
}
```

Here the elicitation is part of every successful fulfillment, so a hard client requirement is appropriate.

### Tool requiring the MCP Tasks extension

```json
{
  "name": "full_rebuild",
  "description": "Run a long-running rebuild operation.",
  "protocolVersions": ["2026-07-28"],
  "inputSchema": {
    "type": "object",
    "properties": {
      "target": {
        "type": "string"
      }
    },
    "required": ["target"],
    "additionalProperties": false
  },
  "clientRequirements": {
    "extensions": {
      "io.modelcontextprotocol/tasks": {}
    }
  }
}
```

A generic compatibility checker can determine that a client which does not advertise `io.modelcontextprotocol/tasks` cannot satisfy the declared requirement.

### Prompt requiring a client sampling capability

```json
{
  "name": "review_with_model",
  "protocolVersions": ["2025-11-25"],
  "description": "Generate a review using client-provided model sampling.",
  "clientRequirements": {
    "sampling": {}
  }
}
```

This example applies only to a protocol revision in which the declared capability is valid. A validator applies the revision-specific MCP lifecycle and capability rules.

### Resource Template requirement applies to concrete reads

```json
{
  "uriTemplate": "workspace://{path}",
  "name": "workspace_file",
  "protocolVersions": ["2025-11-25"],
  "clientRequirements": {
    "roots": {}
  }
}
```

The requirement applies when reading a concrete URI produced by the template. It does not mean the client needs `roots` support merely to discover the template.

### Conditional elicitation is not a hard client requirement

```json
{
  "name": "assign_issue",
  "protocolVersions": ["2026-07-28"],
  "inputSchema": {
    "type": "object",
    "properties": {
      "assignee": {
        "type": "string"
      }
    }
  },
  "elicitations": [
    {
      "name": "choose_assignee",
      "mode": "form",
      "when": "No assignee was supplied.",
      "message": "Who should own this issue?",
      "requestedSchema": {
        "type": "object",
        "properties": {
          "assignee": {
            "type": "string"
          }
        },
        "required": ["assignee"]
      }
    }
  ]
}
```

Because elicitation is conditional, this example intentionally omits `clientRequirements`.

## Compatibility

This is an additive change to MCP Description 0.8.0.

Every document valid before this proposal remains valid.

Existing consumers that do not recognize the new property will need to update their MCP Description schema implementation because primitive objects are otherwise closed to unknown core properties.

No MCP protocol behavior changes.

The proposal reuses MCP's existing client capability vocabulary and does not introduce new runtime capability names.

Older protocol revisions remain describable. Their capability requirements are validated using the semantics of those revisions and the existing MCP Description legacy-validation policy.

## Migration

No migration is required for existing descriptions.

Authors MAY progressively add `clientRequirements` to primitives whose successful fulfillment has an unconditional dependency on client capabilities.

Authors SHOULD NOT mechanically derive requirements from all runtime capability usage. In particular:

* a capability used only on some code paths is not necessarily a hard requirement;
* a declared `elicitations` entry does not automatically imply a hard elicitation requirement;
* server support for an MCP extension does not imply that every primitive requires the corresponding client extension; and
* a runtime `MissingRequiredClientCapability` observed for one invocation may reflect an input-dependent path rather than an unconditional primitive contract.

Migration or generation tooling SHOULD require explicit author confirmation before converting conditional runtime observations into unconditional `clientRequirements`.

## Security and privacy considerations

`clientRequirements` is static compatibility metadata and MUST NOT contain credentials, tokens, user identifiers, device identifiers, session state, authorization grants, or other runtime-sensitive information.

Capability names and extension configuration may reveal implementation assumptions about a server. Authors should publish only information appropriate for the intended description audience.

Consumers MUST treat unknown capability and extension values as untrusted data and apply appropriate size, rendering, and parsing limits.

A compatibility result MUST NOT be treated as an authorization decision. A client satisfying every declared `clientRequirements` may still lack permission to use the primitive, and a client capability declaration itself is not proof of trustworthiness, identity, or authorization.

Tooling MUST NOT automatically enable sensitive client features solely because a server description declares them as required. The client and host remain responsible for policy, user consent, and MCP security requirements.

## Alternatives considered

### Rely only on root server `capabilities`

Server capabilities describe the opposite direction of the protocol contract. Knowing that a server supports Tasks, elicitation-related behavior, or another feature does not tell a client which individual primitive requires the client-side capability.

### Infer requirements from Elicitation Declarations

Elicitation Declarations intentionally represent interactions that MAY occur and can include a `when` condition. They do not cover sampling, roots, formal MCP extensions, or future client capabilities, and inference would incorrectly turn conditional interactions into hard compatibility requirements.

### Add requirements at the document root

A root requirement would imply that every primitive requires the same client capabilities. That is unnecessarily broad and cannot describe common cases where one long-running Tool requires Tasks while other Tools do not.

A future proposal could add defaults if repeated primitive requirements become a significant authoring burden, but primitive-level semantics should be established first.

### Add requirements at the transport level

Client capabilities are MCP semantic capabilities, not transport capabilities. The same primitive requirement normally applies regardless of whether the server is reached through stdio or Streamable HTTP.

### Define `requiredClientCapabilities` instead of `clientRequirements`

The longer name is explicit and directly resembles MCP's `requiredCapabilities` terminology. `clientRequirements` is proposed because it reads naturally beside `security`, leaves room for future structured client preconditions if needed, and avoids confusing the property with a literal runtime `clientCapabilities` advertisement.

The final field name is an editorial choice and does not alter the proposal's semantics.

### Allow an array of alternative requirement sets

For example:

```json
{
  "clientRequirements": [
    {
      "extensions": {
        "io.example/a": {}
      }
    },
    {
      "extensions": {
        "io.example/b": {}
      }
    }
  ]
}
```

This could express OR semantics, but MCP's core `requiredCapabilities` error shape does not define alternative sets, and alternative capability paths frequently depend on runtime state or invocation inputs. This proposal deliberately starts with conjunctive unconditional minimum requirements.

### Add conditional expressions

A condition language could express requirements such as "elicitation is required when `assignee` is absent." That would turn MCP Description toward an executable workflow or policy language and substantially increase validation and interoperability complexity.

Existing Elicitation Declarations already provide human-readable `when` documentation for one important conditional interaction. Conditional capability expressions should be considered separately if concrete interoperability use cases justify them.

### Put the requirement in primitive `x-*` metadata

Primitive specification extensions can carry vendor-specific compatibility metadata, but client capability requirements are a protocol-level interoperability concern with direct MCP semantics. Keeping them in a vendor extension would prevent generic MCP Description tooling from evaluating compatibility.

### Document requirements only through examples or runtime errors

Examples are illustrative and runtime errors require executing the server. Neither provides a reliable offline contract for registries, documentation, governance, or client compatibility analysis.

## Open questions

* Should the final property name be `clientRequirements` or `requiredClientCapabilities`?
* Should a future proposal define optional or "enhanced by" client capabilities separately from hard requirements?
* For non-empty formal extension settings, should MCP Description eventually standardize a generic structural satisfaction rule, or should matching remain entirely extension-defined?
* Should future root-level client requirement defaults be supported if real descriptions show substantial repetition?
* Should compatibility tooling expose the recommended `satisfied` / `unsatisfied` / `indeterminate` tri-state as a normative conformance feature or leave the exact API/UI to implementations?
* When a primitive declares an unconditional form elicitation requirement, should validators optionally warn if no compatible Elicitation Declaration is present, or should those two features remain completely independent?
* Should the specification define a lint rule when `clientRequirements` uses a client feature deprecated by every applicable MCP revision, while still allowing it during the MCP deprecation window?

## Implementation and validation plan

1. Add a `clientRequirements` property to Tool, Resource, Resource Template, and Prompt JSON Schema definitions.
2. Add a reusable Client Capability Requirements Object schema definition containing the known MCP client capability shape supported by mcpdesc.
3. Add semantic validation against each primitive's effective MCP protocol scope.
4. Add positive fixtures for:
   * form elicitation;
   * `sampling.tools`;
   * roots on an applicable legacy/current revision;
   * MCP 2026-07-28 formal extension requirements; and
   * requirements on each of Tool, Resource, Resource Template, and Prompt.
5. Add negative fixtures for:
   * a capability unavailable in an applicable protocol revision;
   * invalid extension identifiers;
   * an empty `clientRequirements` object if `minProperties: 1` is adopted; and
   * a multi-revision primitive whose requirement is not valid in every effective revision.
6. Add projection fixtures proving that requirements are retained and revision-validated.
7. Add merge fixtures proving that conflicting requirement sets are not silently unioned.
8. Add compatibility-checker tests for satisfied, unsatisfied, and indeterminate results.
9. Update the primitive property tables in Sections 9, 10, and 11.
10. Update Section 8 to explicitly distinguish server `capabilities` from primitive client requirements.
11. Clarify Section 12.6 so that the specification excludes capability-negotiation choreography rather than excluding static capability preconditions.
12. Update conformance requirements and the full-featured example.
13. Add a changelog entry.

## Decision record

Pending community review.
