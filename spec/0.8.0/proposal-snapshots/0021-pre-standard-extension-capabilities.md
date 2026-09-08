# Proposal 0021: Preserve Pre-Standard Extension Capabilities

- Status: Review
- Author(s): @ObjectIsAdvantag
- Created: 2026-09-04
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/57

## Summary

Allow a server Capabilities Object to preserve a syntactically valid
`extensions` map when its effective protocol scope includes an MCP revision
before `2026-07-28`. A validator warns that the field is not defined by that
revision's core MCP schema instead of rejecting the MCP Description document.

This accommodates deployed pre-standard extension negotiation without
backporting formal extensions into an earlier MCP revision. Identifier
authority and maturity diagnostics remain independent, and revision-specific
`clientRequirements.extensions` remain strict.

## Problem

MCP `2025-11-25` defines `experimental` capability maps but does not define the
first-class `ClientCapabilities.extensions` or `ServerCapabilities.extensions`
fields. MCP `2026-07-28` adds those fields as part of the formal Extensions
framework.

Some implementations adopted the proposed `extensions` shape before the 2026
core revision. In one observed interoperability case, Miro MCP Server 3.4.6
negotiated MCP `2025-11-25` and returned this portion of its successful
`initialize` result:

```json
{
  "protocolVersion": "2025-11-25",
  "capabilities": {
    "experimental": {},
    "logging": {},
    "resources": {
      "subscribe": false,
      "listChanged": true
    },
    "tools": {
      "listChanged": true
    },
    "extensions": {
      "io.modelcontextprotocol/ui": {}
    }
  }
}
```

`io.modelcontextprotocol/ui` is the official MCP Apps extension identifier.
The MCP Apps project deliberately retained the proposed `extensions`
capability shape while the core Extensions proposal was pending. The response
therefore records a real pre-standard deployment convention, although the field
is not part of the MCP 2025-11-25 core schema.

MCP Description 0.8.0 currently accepts the shape structurally and then emits a
fatal `extensions-not-supported-by-version` semantic diagnostic. A capture tool
that requires core MCP Description validity can consequently fail the entire
dump rather than preserve the observed server surface.

MCP Description 0.7.0 did not define first-class extension capability
semantics, but its Capabilities Object allowed additional properties. Its
frozen JSON Schema accepts both the observed `extensions` property and the
MCP-2025-native `experimental` property. The 0.8.0 semantic error is therefore
a compatibility regression for this capture case.

## Goals

- Preserve faithfully observed server capability declarations.
- Distinguish deployed pre-standard usage from fields defined by the applicable
  MCP core revision.
- Prevent one forward-looking capability field from invalidating an otherwise
  representable runtime capture.
- Keep protocol-version, identifier-authority, and identifier-maturity
  diagnostics independent.
- Preserve the more permissive representation behavior available in MCP
  Description 0.7.0.

## Non-goals

- Define `capabilities.extensions` as part of MCP 2025-11-25 or an earlier MCP
  core revision.
- Infer that a server supports MCP 2026-07-28.
- Rewrite `extensions` into `experimental`, `_meta`, an `x-*` property, or a
  different protocol-scoped declaration.
- Define extension-specific settings or negotiation semantics.
- Relax revision applicability for primitive `clientRequirements.extensions`.
- Treat recognition of an extension identifier as proof that its settings,
  implementation, or behavior are valid or safe.

## Background and primary references

- MCP 2025-11-25 schema:
  https://modelcontextprotocol.io/specification/2025-11-25/schema
- MCP 2026-07-28 changelog:
  https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/changelog.mdx
- SEP-2133, Extensions:
  https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2133-extensions.md
- Official MCP Apps identifier:
  https://github.com/modelcontextprotocol/ext-apps/blob/main/src/server/index.ts
- Historical MCP Apps capability discussion:
  https://github.com/modelcontextprotocol/ext-apps/issues/231

The 2026 changelog identifies `extensions` on `ClientCapabilities` and
`ServerCapabilities` as a change from MCP `2025-11-25`. The earlier schema
instead exposes `experimental` for non-standard capabilities. The MCP Apps
history demonstrates why an implementation can nevertheless advertise the
future shape while negotiating the earlier protocol revision.

## Proposed normative behavior

The `extensions` property remains the representation of an MCP formal extension
capability map. Formal support begins with MCP `2026-07-28`.

When a server Capabilities Object containing `extensions` has an effective
protocol scope that includes an earlier revision:

1. The extension map MUST satisfy the existing non-empty-map, identifier
   grammar, and object-value requirements.
2. A conforming implementation MUST accept and preserve the map.
3. A validator SHOULD warn for each applicable earlier revision that the field
   is not defined by that revision's core MCP schema and is being preserved as
   a pre-standard extension negotiation convention.
4. The warning MUST NOT state or imply that the earlier MCP core revision
   defines the field or that the server supports MCP `2026-07-28`.
5. Extension identifier authority and maturity diagnostics MUST be evaluated
   independently. A catalogued official identifier does not receive an
   unknown-reserved-identifier warning solely because of the earlier protocol
   scope.
6. Tooling MUST NOT move, copy, or reinterpret the map as `experimental`,
   `_meta`, an MCP Description `x-*` property, or a declaration for another
   protocol revision.

The warning is part of core validation diagnostics but does not make the
document non-conforming. Implementations MAY escalate warnings under an
explicit local policy.

Revision applicability for `clientRequirements.extensions` does not change.
That object asserts an unconditional client compatibility requirement under
every revision in a primitive's effective scope rather than recording a server
advertisement. An `extensions` requirement remains invalid where the applicable
MCP `ClientCapabilities` type does not define it.

The existing distinction between core Tasks in MCP `2025-11-25` and the formal
Tasks extension in MCP `2026-07-28` also remains unchanged. This proposal
preserves the declared namespace; it does not translate between those models.

## Schema impact

No JSON Schema shape change is required. The 0.8.0 schema already permits
`extensions` on a Capabilities Object and enforces the extension map's
structural constraints.

The semantic diagnostic currently named
`extensions-not-supported-by-version` changes from an error to a warning for
server Capabilities Objects. Retaining the diagnostic code avoids unnecessary
consumer churn; its message should distinguish core-schema applicability from
MCP Description preservation.

## Examples

This single-revision description is conforming with a warning:

```yaml
mcpdesc: 0.8.0
info:
  name: miro-mcp
  version: 3.4.6
protocolVersions:
  - '2025-11-25'
transports:
  - type: streamable-http
    url: https://mcp.miro.com
capabilities:
  - extensions:
      io.modelcontextprotocol/ui: {}
```

A suitable diagnostic is:

```text
capabilities[0].extensions is not defined by the MCP 2025-11-25 core schema;
this description preserves a deployed pre-standard extension negotiation
convention. Formal extensions capability negotiation was introduced in MCP
2026-07-28.
```

Because `io.modelcontextprotocol/ui` is catalogued as official, no separate
unknown-reserved-identifier warning is produced. An uncatalogued identifier
under an MCP-reserved prefix still produces the existing authority warning in
addition to the protocol-version warning.

For a mixed effective scope, the map is retained in every applicable Effective
Protocol View. Projection MUST NOT silently remove it from an earlier view or
synthesize a separate 2026 declaration.

## Compatibility

Classification: **compatible relaxation**.

Existing conforming 0.8.0 documents remain conforming. Documents previously
rejected only because a server Capabilities Object used `extensions` before MCP
`2026-07-28` become conforming with a warning. The JSON Schema does not change.

The relaxation restores the ability to represent a class of capability data
accepted structurally by MCP Description 0.7.0. Consumers that require strict
MCP core-schema alignment can escalate the warning through local policy without
making that policy part of MCP Description core conformance.

The proposal does not relax primitive client requirements, extension identifier
grammar, reserved namespace authority, extension-map value shapes, or
extension-specific validation profiles.

## Migration

Existing documents need no changes.

Generators and capture tools should stop dropping, rewriting, or treating the
entire capture as invalid when they observe this case. They should preserve the
map under the observed protocol scope and surface the warning.

Implementations that previously special-cased this diagnostic as fatal should
consume its severity rather than assuming the diagnostic code always denotes an
error. A strict deployment policy may continue to reject warning-bearing
documents explicitly.

Authors targeting only MCP 2025-11-25 should prefer the capability mechanisms
defined by that MCP revision for new implementations. This preservation rule is
not a recommendation to introduce new pre-standard extension negotiation.

## Security and privacy considerations

Capability data is untrusted input. Preserving a declaration does not establish
that an extension is safe, implemented correctly, supported by a client, or
valid under an extension-specific specification.

The existing identifier grammar and reserved-prefix checks continue to apply.
Unknown MCP-reserved identifiers continue to warn, and use known to be
unauthorized remains an error. Extension-specific validation remains opt-in and
version-pinned.

Capture tools must continue to avoid placing credentials, tokens, private user
data, or unrelated runtime payloads in extension settings. This proposal does
not broaden the permitted value type beyond JSON objects or authorize network
retrieval based on an extension declaration.

## Alternatives considered

### Retain the fatal semantic error

This aligns strictly with each MCP revision's core schema, but it can make an
otherwise useful runtime capture fail because of one deployed forward-looking
field. It is also less permissive than MCP Description 0.7.0 for this case.

### Rewrite `extensions` as `experimental`

This would produce a shape defined by MCP 2025-11-25, but it would not faithfully
record what appeared on the wire and could change negotiation semantics.
Automatic reinterpretation is rejected.

### Remove `extensions` during capture

Dropping the field makes the document validate at the cost of losing relevant
server behavior. It also prevents consumers from recognizing official MCP Apps
support. This is rejected.

### Add a separate permissive capture mode

A non-core mode could preserve the value while strict validation continues to
reject it. This fragments interoperability across generators and prevents an
ordinary MCP Description document from carrying the observed surface. Explicit
local warning escalation provides strict deployments with a simpler policy
boundary.

### Permit revision-mismatched client requirements as well

Client requirements express a stronger compatibility contract than observed
server capabilities. Permitting an undefined requirement would leave generic
compatibility checkers without a revision-defined matching model. This is out of
scope and rejected.

## Open questions

- Should the diagnostic wording use "pre-standard" or the more neutral
  "not defined by the applicable MCP core revision" as its short summary?
- Should one diagnostic cover all earlier revisions in a mixed scope, or should
  validators retain the current one-diagnostic-per-revision behavior?
- Should future MCP Description versions generalize this policy to other
  observed forward-compatible capability properties, or keep the exception
  specific to the documented Extensions rollout?

## Implementation and validation plan

1. Update Section 8 to distinguish formal revision applicability from
   preservation of pre-standard server advertisements.
2. Update the assembled specification and migration guidance.
3. Change `extensions-not-supported-by-version` to warning severity for server
   Capabilities Objects and revise its message.
4. Keep revision validation for `clientRequirements.extensions` unchanged.
5. Add an expected-warning fixture based on the minimal observed Miro
   capability shape.
6. Assert that `io.modelcontextprotocol/ui` produces the version warning but no
   unknown-reserved-identifier warning.
7. Assert that an uncatalogued MCP-reserved identifier produces both independent
   warnings.
8. Test projection and merge preservation for pre-2026 and mixed scopes.
9. Update the 0.8.0 changelog and classify the change as a compatible
   relaxation included for RC.2 interoperability.
10. Run repository validation, serialization tests, projection and merge tests,
    release-candidate checks, and whitespace validation.

Implementation should occur in a separate feature branch after proposal review,
as required by the repository proposal lifecycle.

## Decision record

Pending review.
