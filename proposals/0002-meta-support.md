# Proposal 0002: Support MCP `_meta` in MCP Description

- Status: Draft
- Author(s): Stève Sfartz
- Created: 2026-07-28
- Target version: 0.8.0
- Historical input: https://github.com/mcpdesc/mcpdesc.org/issues/5

## Summary

Define whether and how MCP Description documents can describe MCP `_meta` values, conventions, or schemas without confusing static documentation with runtime metadata instances.

## Problem

MCP uses `_meta` as an extensibility and metadata mechanism. MCP Description v0.7.0 does not provide a documented model for it. Design-first work also identified a need to document domain-specific error information, for which `_meta` may be relevant, but this use case must be validated against the MCP specifications.

## Goals

- Identify every MCP object or interaction where `_meta` is defined or permitted in the MCP specifications
- Separate runtime `_meta` values from static declarations about supported metadata.
- Define namespace, collision, portability, and security expectations.
- Support useful documentation without turning MCP Description into an unrestricted duplicate payload.
- Address latest MCP specifications: June 2025, November 2025 and July 2026.

## Non-goals

- Invent a custom runtime error channel that conflicts with MCP.
- Treat `_meta` as a substitute for all missing first-class fields.
- Standardize third-party metadata namespaces without their owners.

## Design questions

1. Should MCP Description permit literal `_meta` examples, a JSON Schema describing expected `_meta`, or both?
2. At which description levels is `_meta` meaningful: document, server, tool, resource, resource template, prompt, transport, security scheme, extension, or operation/result documentation?
3. How are reverse-DNS or other namespaces represented and validated?
4. Which metadata is safe to publish in a static artifact?
5. Should unknown `_meta` entries be preserved by tools?
6. How should standard MCP metadata keys be documented relative to vendor-defined keys?
7. Is domain-error documentation better represented by a dedicated MCP Description construct rather than `_meta`?

## Compatibility

The preferred design should be additive for v0.7.0 documents. Any restriction on existing extension behavior must be identified explicitly.

## Security and privacy considerations

Static descriptions must not encourage publication of credentials, tokens, user identifiers, internal topology, trace identifiers, or runtime-sensitive data. The proposal should distinguish metadata schemas and examples from live values.

## Required outputs before acceptance

- Primary-source inventory of `_meta` positions and semantics in the MCP specifications
- At least two design alternatives with tradeoffs.
- Normative text draft.
- JSON Schema diff.
- Positive and negative examples.
- Interaction with `x-` specification extensions.
- Migration and tooling impact.
