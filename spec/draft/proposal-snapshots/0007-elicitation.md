# Proposal 0007: Elicitation Declarations

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-24
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/1
- Related proposals: Proposal 0001
- Review period: 2026-08-24 through 2026-09-23

## Summary

Add optional Elicitation Declarations to Tools, Resources, Resource Templates, and Prompts. A declaration documents durable behavior in which fulfilling the primitive may require additional interaction with the user through the MCP client.

The model supports form and URL modes, protocol-version applicability, a restricted form-response schema, a user-facing explanation, and descriptive behavior for the condition, decline, and cancellation cases. It deliberately describes the interaction without reproducing the protocol-specific execution mechanism.

MCP 2025-06-18 uses a dedicated server-to-client elicitation request, MCP 2025-11-25 adds URL mode and related lifecycle behavior, and MCP 2026-07-28 carries elicitation through Multi Round-Trip Requests (MRTR). These wire differences do not require different mcpdesc declarations where the durable described behavior is equivalent.

## Review process

This compatible normative proposal is open for public review for 30 calendar days. A maintainer acceptance decision may be recorded after the review period and resolution of substantive feedback. Acceptance authorizes separate implementation in the 0.8.0 Community Working Draft; it does not publish 0.8.0 as stable.

## Problem

MCP Description cannot currently document that fulfilling a Tool call, Resource read, Resource Template expansion, or Prompt retrieval may require additional user input. Consequently, design-first review cannot answer questions such as:

- whether an operation may interrupt fulfillment to ask the user for information;
- what structured information a form may request;
- whether an out-of-band URL interaction may be required;
- under what described condition the interaction occurs; or
- what behavior is expected when the user declines or cancels.

Elicitation is a client capability used by a server while fulfilling an operation. It is not a server capability flag. A server-wide `capabilities.elicitation` field would therefore misrepresent the MCP model and would not identify which primitive can exhibit the behavior.

## Goals

- Document possible elicitation as behavior of a Tool, Resource, Resource Template, or Prompt.
- Support MCP form and URL elicitation modes.
- Validate form declarations against the restricted MCP elicitation-schema vocabulary.
- Support protocol-scoped declarations using Proposal 0001's Effective Protocol View model.
- Preserve a stable declaration name for documentation, selection, and downstream tooling.
- Document the condition and expected decline or cancellation behavior without defining an executable policy language.
- Keep the declaration stable across protocol revisions when only the MCP wire mechanism changes.
- Enable downstream documentation and Live Editor tooling to render elicitation contracts.

## Non-goals

- Reproduce `elicitation/create` JSON-RPC envelopes, MRTR `InputRequiredResult`, `inputRequests`, `inputResponses`, `requestState`, URL elicitation identifiers, completion notifications, errors, tasks, retries, or other runtime choreography.
- Define how a mock server, gateway, client, or runtime executes elicitation.
- Define an expression language for `when`, response-dependent branching, state transitions, or repeated interactions.
- Define or validate the availability, ownership, safety, or returned content of a URL.
- Assess runtime behavior, privacy, or security conformance with the MCP elicitation specification.
- Add input-required or multi-round transcripts to named Tool or Resource examples.
- Guarantee that descriptive prose or a representative message is byte-for-byte equal to every runtime interaction.
- Add exhaustive elicitation semantic validation for MCP revisions before 2025-06-18.

## Background and primary references

- MCP 2025-06-18 Elicitation: https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation
- MCP 2025-06-18 schema: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-06-18/schema.ts
- MCP 2025-11-25 Elicitation: https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation
- MCP 2025-11-25 schema: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts
- MCP 2026-07-28 Elicitation: https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation
- MCP 2026-07-28 Multi Round-Trip Requests: https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr
- MCP 2026-07-28 schema: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts
- MCP Description Proposal 0001: protocol scopes and Effective Protocol Views

Elicitation first appears in MCP 2025-06-18 as form-based structured user input. MCP 2025-11-25 adds URL mode, including protocol-specific identifiers, completion notification behavior, and an elicitation-required error. MCP 2026-07-28 retains form and URL behavior but replaces server-initiated requests with MRTR and removes the URL-mode completion notification and protocol-defined elicitation identifier.

For MCP 2026-07-28, `InputRequiredResult` is permitted for `tools/call`, `resources/read`, and `prompts/get`. These request surfaces correspond to mcpdesc Tools, Resources, Resource Templates whose expansions are read as Resources, and Prompts.

The active v0.8 draft already defines MCP 2025-06-18 as the floor for complete revision-specific semantic conformance. MCP 2024-11-05 and MCP 2025-03-26 remain recognized legacy compatibility revisions with structural and selected checks plus an incomplete-validation diagnostic. This proposal follows that established boundary and does not add elicitation-specific semantic work for those superseded revisions.

## Proposed normative behavior

### 1. Primitive placement

Tool, Resource, Resource Template, and Prompt Objects MAY contain an `elicitations` array of Elicitation Declaration Objects.

An Elicitation Declaration documents that fulfillment of the containing primitive may require the described user interaction. It does not assert that every invocation or read triggers the interaction, and it does not assert that every client can fulfill it.

A Resource Template declaration applies to `resources/read` operations on concrete Resource URIs produced from that template. It does not describe elicitation during template discovery.

### 2. Elicitation Declaration Object

An Elicitation Declaration Object contains:

| Property | Type | Required | Description |
|---|---|---:|---|
| `name` | string | Yes | Stable local declaration name |
| `mode` | `"form"` or `"url"` | Yes | Canonical elicitation mode |
| `message` | string | Yes | Representative user-facing explanation of the interaction |
| `when` | string | No | Human-readable description of when the interaction may occur |
| `requestedSchema` | object | Conditional | Restricted MCP form-response schema |
| `url` | string (URI) | No | Static URL when known at description-authoring time |
| `onDecline` | string | No | Human-readable description of expected behavior after explicit decline |
| `onCancel` | string | No | Human-readable description of expected behavior after cancellation or dismissal |
| `protocolVersions` | array<string> | No | MCP revisions to which this declaration applies |

`name` MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and MUST be unique within the containing primitive declaration.

`message` MUST be non-empty. It documents the explanation a user should receive and MAY be a representative or default message when runtime context changes exact wording. A runtime implementation ought not materially contradict the documented purpose, but mcpdesc conformance does not require byte-for-byte equality between this field and every runtime message.

`when`, `onDecline`, and `onCancel` are descriptive contract documentation. They are not executable expressions, client instructions, or statically provable guarantees. Validators validate their type and non-empty form but do not attempt to execute or prove the described behavior.

Although applicable MCP revisions permit omission of runtime `mode` for form elicitation, mcpdesc requires explicit `mode` to provide one canonical static representation.

### 3. Form mode

For `mode: "form"`:

- `requestedSchema` is REQUIRED;
- `url` MUST NOT appear;
- `requestedSchema` MUST describe an object with only the property schemas allowed by every applicable MCP revision.

The structural schema SHOULD model the common supported form-schema vocabulary. Semantic validation MUST apply revision-specific differences from MCP 2025-06-18 onward, including supported primitive property forms, string formats, defaults, and single-select or multi-select enumeration forms.

Nested objects and arrays other than MCP-supported multi-select enumeration forms are invalid. Unsupported schema keywords and unsupported string formats are invalid when the applicable revision defines a closed elicitation-schema vocabulary.

### 4. URL mode

For `mode: "url"`:

- `requestedSchema` MUST NOT appear;
- `url`, when present, MUST be a syntactically valid URI; and
- omission of `url` means the concrete URL is generated or selected at runtime.

A runtime MCP URL-mode elicitation still supplies every field required by the applicable MCP revision. Omission in mcpdesc does not make the runtime URL optional.

Validation of `url` is syntax-only and MUST NOT retrieve, prefetch, dereference, or otherwise access it. A conforming document does not assert that the target is currently available, safe, immutable, controlled by the described server, or suitable for automatic navigation.

### 5. Protocol applicability

An omitted Elicitation Declaration `protocolVersions` inherits the effective scope of its containing primitive. An explicit scope MUST be non-empty and MUST be a subset of the containing primitive's effective scope, following Proposal 0001.

For complete semantic validation from MCP 2025-06-18 onward:

- MCP 2025-06-18 supports form mode;
- MCP 2025-11-25 supports form and URL modes; and
- MCP 2026-07-28 supports form and URL modes.

A declaration that applies to more than one of these revisions MUST satisfy every applicable revision. Authors MUST split materially incompatible declarations into disjoint protocol scopes.

MCP 2024-11-05 and MCP 2025-03-26 retain the draft's existing legacy compatibility treatment. Validators perform structural and selected sound checks, issue the existing incomplete-validation diagnostic, and MUST NOT report complete MCP semantic conformance. This proposal adds no dedicated elicitation compatibility matrix or exhaustive semantic checks for those revisions.

### 6. Static-description boundary

The declaration describes the durable interaction: its mode, purpose, possible condition, form shape or statically known URL, and expected decline or cancellation behavior.

The applicable MCP revision remains authoritative for execution. In particular, mcpdesc does not model whether the interaction uses a server-initiated request or MRTR, nor any lifecycle message, identifier, state, retry, correlation, capability-negotiation, or transport behavior.

A mock server, gateway, conformance tool, or client MAY use Elicitation Declarations as descriptive input. The declaration contains enough structured information to render the documented message, collect a form response that matches `requestedSchema`, or present a known URL. It therefore supports a manual or tool-configured mock interaction.

The declaration alone is not enough for a deterministic autonomous mock to decide when to trigger an elicitation, select among multiple applicable declarations, map a user response into subsequent state, or choose the final primitive result. `when`, `onDecline`, and `onCancel` are prose rather than executable rules. This specification does not define selection, sequencing, state transitions, response matching, or execution behavior for those tools.

### 7. Relationship to named examples

Elicitation Declarations and named primitive examples have different purposes:

- an Elicitation Declaration documents a possible intermediate interaction during fulfillment;
- a named Tool Example pairs one complete invocation input with one completed Tool Result; and
- a named Resource Example contains one completed Resource read result.

This proposal does not allow `InputRequiredResult`, `elicitation/create`, MRTR rounds, retries, or other incomplete workflows inside existing named examples. Allowing them would change examples from completed input/result pairs into ordered stateful transcripts and would require additional rules for round identity, user responses, decline/cancel paths, retries, correlation, and final outcomes.

No additional example object is needed to document or manually exercise the elicitation itself: the declaration already supplies its mode, message, form schema or known URL, and documented outcomes. Downstream mock tooling may combine a primitive's Elicitation Declarations with its completed examples according to explicit tool configuration, but mcpdesc 0.8.0 does not standardize that combination. A future proposal may define interaction or workflow examples only if portable deterministic automation requires a transcript or behavior model.

## Schema impact

The 0.8.0 JSON Schema will:

- add `$defs.elicitationDeclaration` with mutually exclusive form and URL branches;
- add a reusable restricted form-schema definition or definitions;
- add optional `elicitations` arrays to Tool, Resource, Resource Template, and Prompt Objects;
- require `name`, `mode`, and non-empty `message`;
- require `requestedSchema` and forbid `url` for form mode;
- forbid `requestedSchema` for URL mode;
- validate a present `url` as a URI;
- permit optional nested `protocolVersions`; and
- keep all Elicitation Declaration Objects closed to unknown properties.

Protocol-scope containment, per-revision mode support, per-revision form-schema differences, and local name uniqueness require semantic validation where JSON Schema cannot express them reliably.

## Examples

### Form elicitation

```yaml
tools:
  - name: assign_issue
    description: Assign an issue to a teammate.
    inputSchema:
      type: object
      properties:
        issue:
          type: integer
        assignee:
          type: string
      required: [issue]
      additionalProperties: false
    elicitations:
      - name: choose_assignee
        mode: form
        when: No assignee was supplied.
        message: Who should own this issue?
        requestedSchema:
          type: object
          properties:
            assignee:
              type: string
              title: Assignee
          required: [assignee]
        onDecline: Leave the issue unassigned.
        onCancel: Abort without modifying the issue.
```

### Runtime-generated URL

```yaml
tools:
  - name: import_private_repository
    description: Import a repository after the user grants the server access to the external provider.
    inputSchema:
      type: object
      properties:
        repository:
          type: string
      required: [repository]
      additionalProperties: false
    elicitations:
      - name: authorize_external_provider
        mode: url
        when: The server has no valid authorization for the external provider.
        message: Authorize access to the external provider to continue.
        onDecline: Do not import the repository.
        onCancel: Leave the import pending without changing repository data.
        protocolVersions: [2025-11-25, 2026-07-28]
```

The omitted `url` documents that the server creates a concrete, user-specific URL at runtime.

## Compatibility

This is a compatible addition to the unreleased 0.8.0 Community Working Draft. Every new property is optional, and documents without Elicitation Declarations retain their current meaning.

The change does not modify the frozen 0.7.0 specification or schema. `schemas/latest.json` remains pinned to 0.7.0 until an explicit stable release decision.

A declaration spanning MCP 2025-06-18 and later may require scoped variants where mode or form-schema features differ by revision.

## Migration

No automatic migration is required. Existing documents continue to omit `elicitations`.

Authors adding declarations should use authoritative design knowledge rather than infer elicitation from logs, errors, UI text, or independently observed requests. Runtime capture tooling MUST NOT infer a durable Elicitation Declaration without reliable correlation to the containing primitive and evidence that the behavior is part of the described server surface.

## Security and privacy considerations

The applicable MCP elicitation specification remains authoritative for runtime security and privacy requirements, including its rules for form and URL mode and sensitive information. An Elicitation Declaration documents intended server behavior; mcpdesc validation does not inspect or certify runtime behavior, privacy compliance, or security conformance.

No sensitive-field-name heuristic or related diagnostic is defined by this proposal. Description content remains untrusted input to renderers and other consumers.

URL validation is syntax-only. Consumers MUST NOT dereference a URL while loading, validating, rendering, projecting, merging, or otherwise processing a description. A present URL does not establish availability, trust, authorization, or compliance with the applicable MCP runtime requirements.

## Alternatives considered

### Server-level elicitation capability

Rejected. Elicitation is a client capability and possible behavior while a server fulfills a particular primitive. A server-level flag would neither match MCP capability direction nor identify the affected operation.

### Tool-only declarations

Rejected. MCP 2026-07-28 permits input-required results for `tools/call`, `resources/read`, and `prompts/get`. Resources, Resource Template expansions, and Prompts therefore have equivalent durable use cases.

### Exact runtime message contract

Rejected. Exact wording may include safe runtime context, localization, or implementation-specific formatting. Requiring byte equality would turn ordinary presentation changes into document non-conformance without improving the durable interaction contract. The proposal instead documents a representative explanation whose purpose should not be materially contradicted at runtime.

### Require a static URL

Rejected. URL-mode interactions commonly require a short-lived, user-bound, or request-bound URL generated at runtime. Requiring it in a static description would encourage unsafe examples or make legitimate behavior impossible to describe.

### Add elicitation transcripts to named examples

Deferred. A transcript model would need to define rounds, request and response correlation, branching, retries, cancellation, final results, and revision-specific choreography. Existing named examples intentionally represent completed outcomes. The Elicitation Declaration supplies the durable design-time contract without introducing a workflow language.

### Model protocol-specific lifecycle fields

Rejected. Fields such as `elicitationId`, completion notifications, MRTR `requestState`, and input-response maps are wire and execution mechanics that change across MCP revisions without necessarily changing the durable described behavior.

## Open questions

No architectural questions remain in this Draft. Public review may identify necessary corrections to the exact restricted form-schema vocabulary or revision-specific validation matrix.

## Implementation and validation plan

Implementation begins only after this proposal is accepted and will be performed separately from the proposal change.

1. Add normative Elicitation text and `elicitations` properties to the relevant source sections.
2. Regenerate the assembled draft specification.
3. Add structural definitions and primitive properties to the 0.8.0 schema.
4. Add semantic checks for nested scope containment, declaration-name uniqueness, MCP 2025-06-18-and-later mode support, and revision-specific form schemas.
5. Add valid fixtures for form, static URL, and runtime-generated URL declarations.
6. Add invalid fixtures for branch mixing, malformed form schemas, malformed URLs, duplicate names, scope violations, and post-2025-06-18 revision incompatibility.
7. Add projection and merge tests proving that nested declarations are filtered by protocol scope and otherwise preserved exactly.
8. Update the changelog, migration guidance, relationship-to-MCP guidance, and at least one draft example.
9. Keep frozen 0.7.0 artifacts and `schemas/latest.json` unchanged.
10. Run `npm test` and verify assembled-spec synchronization and stable-artifact immutability.

Live Editor rendering and runtime mock or gateway behavior are downstream work and are not implementation requirements for this specification repository.

## Decision record

- 2026-08-24: Use operation-level declarations on Tools, Resources, Resource Templates, and Prompts rather than a server capability.
- 2026-08-24: Treat `message`, `when`, `onDecline`, and `onCancel` as descriptive contract documentation, not executable policy or byte-exact runtime assertions.
- 2026-08-24: Validate a present URL syntactically without network access; permit omission for runtime-generated URLs.
- 2026-08-24: Define no sensitive-data diagnostics; the applicable MCP specification remains authoritative and mcpdesc does not assess runtime behavior, privacy, or security conformance.
- 2026-08-24: Describe durable elicitation behavior without MCP wire choreography or runtime execution rules.
- 2026-08-24: Treat declarations as sufficient for rendering and manual or explicitly configured mock interactions; keep existing named examples limited to completed outcomes and defer deterministic stateful interaction models.
- 2026-08-24: Follow the existing v0.8 semantic-conformance floor and add no exhaustive elicitation validation before MCP 2025-06-18.
