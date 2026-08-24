# Proposal 0002: Support MCP `_meta` in MCP Description

- Status: Review
- Author(s): Stève Sfartz
- Created: 2026-07-28
- Last updated: 2026-08-24
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/2
- Related proposals: Proposal 0001; Proposal 0006
- Historical input: https://github.com/mcpdesc/mcpdesc.org/issues/5
- Review period: 2026-08-24 through 2026-09-23

## Summary

Define how MCP Description documents represent literal MCP `_meta` values without confusing static declaration metadata, illustrative runtime examples, and schemas for possible future metadata.

This proposal completes `_meta` alignment and adopts a literal-values-and-examples boundary for 0.8.0. Schema declarations for expected `_meta` are evaluated separately by Proposal 0006.

## Review process

This proposal is open for public review for 30 calendar days because enforcing MCP `_meta` key and reserved-namespace rules in 0.8.0 may reject metadata that the current draft schema accepts structurally. A maintainer decision may be recorded after the review period and resolution of substantive feedback. Acceptance authorizes normative implementation in the 0.8.0 Community Working Draft; it does not publish 0.8.0 as stable.

## Problem

MCP uses `_meta` as an extensibility and metadata mechanism. MCP Description v0.7.0 structurally permits literal `_meta` on Tools, Resources, Resource Templates, and Prompts, but does not provide a complete documented model or semantic validation for it. Version 0.7.0 is frozen and remains unchanged.

The 0.8.0 draft retains those declaration locations and permits literal `_meta` in named Tool and Resource result examples. It still needs explicit key, namespace, context, preservation, security, and static-versus-runtime rules. Design-first work also identified a need to document domain-specific error metadata, but examples remain illustrative and do not define a reusable metadata contract.

## Goals

- Identify every MCP object or interaction where `_meta` is defined or permitted in the MCP specifications
- Separate runtime `_meta` values from static declarations about supported metadata.
- Define namespace, collision, portability, and security expectations.
- Support useful documentation without turning MCP Description into an unrestricted duplicate payload.
- Address latest MCP specifications: June 2025, November 2025 and July 2026.
- Preserve literal `_meta` on MCP-derived declarations and in applicable named result examples.
- Define MCP 2025-06-18 as the floor for complete revision-specific semantic conformance while retaining earlier MCP revisions as recognized legacy compatibility revisions.
- Distinguish `_meta` from MCP Description `x-*` extensions and MCP `capabilities.extensions`.

## Non-goals

- Invent a custom runtime error channel that conflicts with MCP.
- Treat `_meta` as a substitute for all missing first-class fields.
- Standardize third-party metadata namespaces without their owners.
- Change the frozen 0.7.0 specification or schema.
- Add a JSON Schema vocabulary for expected `_meta` values; Proposal 0006 evaluates that separate feature.
- Define a reusable Tool error catalogue.

## Relationship to Proposal 0001 and protocol-version support

Proposal 0001 recognizes MCP revisions from 2024-11-05 through 2026-07-28 and introduces protocol-scoped validation and projection. It intentionally defers `_meta` naming and semantics to separate work. This proposal does not modify Proposal 0001.

MCP Description 0.8.0 continues to recognize all of those MCP revisions. Complete revision-specific semantic conformance for `_meta` and other MCP-derived shapes is defined from MCP 2025-06-18 onward. MCP 2024-11-05 and MCP 2025-03-26 are legacy compatibility revisions: structural and selected compatibility checks remain available, but validators MUST NOT report them as complete MCP semantic conformance and SHOULD emit an incomplete-validation warning.

This boundary reflects current implementation relevance and avoids expanding exhaustive semantic work for superseded revisions. Validators still preserve supported legacy documents and apply checks they can perform without inventing semantics.

## Proposed feature boundary for 0.8.0

Version 0.8.0 supports literal `_meta` values:

- on MCP-derived Tool, Resource, Resource Template, and Prompt declarations where the applicable MCP revision permits `_meta`;
- on completed result and content objects embedded by named Tool and Resource examples where the applicable MCP revision permits `_meta`; and
- in future 0.8.0 constructs only when their normative definition explicitly identifies the corresponding MCP object and `_meta` context.

A declaration-level `_meta` is the literal metadata carried by that MCP declaration. It is not request metadata, result metadata, an error catalogue, or a schema for future values.

An example-level `_meta` is one illustrative literal value in that named example. It does not require a live server to emit the same keys or values and is not a reusable metadata contract.

Tool execution errors remain completed Tool Results with `isError: true` and actionable information in `content`. Literal `_meta` MAY supplement such an example but is not the primary MCP error channel.

## Validation and preservation policy

For MCP 2025-06-18 and later:

- an `_meta` key that violates the applicable MCP key-name grammar is an error;
- a recognized MCP-reserved key used with an invalid value shape or in an invalid represented context is an error;
- an unrecognized key under an MCP-reserved prefix produces a warning and MUST be preserved, because absence from a validator's local catalogue is not proof of unauthorized use;
- valid third-party-prefixed and valid unprefixed keys are accepted and preserved; and
- validators MUST apply revision-specific rules only to contexts represented by MCP Description.

For legacy compatibility revisions, validators apply sound checks they implement, preserve structurally valid content, warn that complete semantic validation was not performed, and MUST NOT describe a partial result as complete conformance.

MCP Description root `x-*` properties extend the static description format. Declaration or example `_meta` carries MCP metadata on the corresponding MCP object. `capabilities.extensions` advertises MCP protocol extensions. Tooling MUST preserve these mechanisms independently and MUST NOT automatically project or reinterpret one as another.

## Primary-source `_meta` inventory (MCP 2026-07-28)

From the [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
and [release notes](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/),
the stateless rework makes `_meta` central. Standard keys now include:

- `io.modelcontextprotocol/protocolVersion`, `io.modelcontextprotocol/clientCapabilities`,
  `io.modelcontextprotocol/clientInfo` (per-request), and
  `io.modelcontextprotocol/serverInfo` (per-result) ([SEP-2575](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2575)).
- `io.modelcontextprotocol/logLevel` (per-request log level, replacing `logging/setLevel`) ([SEP-2575](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2575)).
- `io.modelcontextprotocol/subscriptionId` (tags subscription notifications) ([SEP-2575](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2575)).
- W3C Trace Context keys `traceparent`, `tracestate`, `baggage` ([SEP-414](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/414)).

The key observation for a **static** description: almost all of these are
*runtime* values exchanged per request/result. A static MCP Description should
carry only curated literal values appropriate to the represented declaration or
named example. Reverse-DNS namespacing (`io.modelcontextprotocol/…`, vendor
`com.example/…`) is the MCP convention to represent and validate. Proposal 0006
separately evaluates schemas for metadata that a server defines or expects.

## Design questions

1. Which MCP-reserved keys have semantics in each declaration and example context represented by 0.8.0?
2. Which metadata is safe to publish as a literal value in a static artifact?
3. Should diagnostics for recognized but deprecated MCP-reserved keys be warnings independent of their value validity?
4. Which legacy-revision checks are both useful and sound without implying complete conformance?

The question of declaring JSON Schemas for expected `_meta` values is transferred to Proposal 0006. This proposal does not decide that feature.

## Compatibility

Version 0.7.0 remains frozen. The 0.8.0 changes are additive for valid literal metadata but may newly reject malformed `_meta` key names or known reserved keys used contrary to their applicable MCP revision and context. Unknown valid keys remain forward-compatible and are preserved.

## Security and privacy considerations

Static descriptions must not encourage publication of credentials, tokens, user identifiers, internal topology, trace identifiers, or runtime-sensitive data. Authors MUST use fictitious or redacted literal values where disclosure could create privacy or security risk. Consumers MUST treat `_meta` values as untrusted data and apply appropriate size, rendering, and processing limits.

## Required outputs before acceptance

- Primary-source inventory of `_meta` positions and semantics in the MCP specifications
- At least two design alternatives with tradeoffs.
- Normative text draft.
- JSON Schema diff.
- Positive and negative examples.
- Interaction with `x-` specification extensions.
- Migration and tooling impact.
- Dedicated coverage for malformed keys, known reserved-key misuse, unknown reserved keys, third-party keys, literal declaration values, literal result/content examples, and legacy incomplete-validation diagnostics.

## Decision record

Pending review.

Current draft direction:

- change only the 0.8.0 draft; keep 0.7.0 frozen;
- support literal declaration and named-example `_meta` values, not metadata schemas;
- use MCP 2025-06-18 as the complete semantic-conformance floor while retaining earlier recognized revisions for legacy compatibility;
- reject malformed keys and known context or value violations;
- warn and preserve unrecognized keys in MCP-reserved namespaces; and
- evaluate reusable `_meta` schema declarations separately in Proposal 0006 and, where appropriate, seek an upstream MCP facility before claiming protocol-level interoperability.
