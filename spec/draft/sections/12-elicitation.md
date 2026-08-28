## 12. Elicitation Declarations

### 12.1 Purpose and Placement

An Elicitation Declaration documents that fulfillment of a Tool, Resource, Resource Template, or Prompt may require additional interaction with the user through the MCP client.

Tool, Resource, Resource Template, and Prompt Objects MAY contain an `elicitations` array of Elicitation Declaration Objects. The array MUST contain at least one declaration when present. A Resource Template declaration applies to `resources/read` operations on concrete Resource URIs produced from that template; it does not describe elicitation during template discovery.

An Elicitation Declaration describes durable server behavior rather than the protocol-specific wire exchange. It does not assert that every fulfillment triggers the interaction or that every client can fulfill it. A conditional or optional Elicitation Declaration MUST NOT by itself be interpreted as an unconditional `clientRequirements.elicitation` capability requirement.

### 12.2 Elicitation Declaration Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Stable local declaration name. |
| `mode` | `"form"` or `"url"` | **Yes** | Canonical elicitation mode. |
| `message` | string | **Yes** | Representative user-facing explanation of the interaction. |
| `when` | string | No | Human-readable description of when the interaction may occur. |
| `requestedSchema` | object or Reference Object | Conditional | Inline or reusable restricted MCP form-response schema. |
| `url` | string (URI) | No | Static URL when known at description-authoring time. |
| `onDecline` | string | No | Human-readable expected behavior after explicit decline. |
| `onCancel` | string | No | Human-readable expected behavior after cancellation or dismissal. |
| `protocolVersions` | array\<string\> | No | MCP revisions to which this declaration applies. |

`name` MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and MUST be unique within the containing primitive declaration.

`message` MUST be non-empty. It documents the explanation a user should receive and MAY be representative or default wording when runtime context changes the exact text. Runtime wording SHOULD NOT materially contradict the documented purpose, but mcpdesc does not require byte-for-byte equality.

`when`, `onDecline`, and `onCancel`, when present, MUST be non-empty descriptive contract documentation. They are not executable expressions, client instructions, or statically provable guarantees.

Although applicable MCP revisions permit omission of runtime `mode` for form elicitation, mcpdesc requires explicit `mode` to provide one canonical static representation.

### 12.3 Form Mode

For `mode: "form"`:

- `requestedSchema` is REQUIRED;
- `url` MUST NOT appear; and
- `requestedSchema` MUST describe an object with only the property schemas allowed by every applicable MCP revision.

`requestedSchema` MAY be a Reference Object targeting the `schemas` component namespace. The referenced schema MUST be resolved before applying every restricted-vocabulary and effective-protocol-scope requirement in this section.

The schema is limited to a flat object whose properties use MCP elicitation primitive schemas. Nested objects and arrays other than MCP-supported multi-select enumeration forms are invalid. Unsupported keywords and unsupported string formats are invalid.

MCP 2025-06-18 supports string, number, integer, boolean, and legacy string-enum property schemas. It permits string length constraints and the `email`, `uri`, `date`, and `date-time` formats, numeric bounds, boolean defaults, and optional `enumNames` corresponding to enum values. It does not define `$schema`, defaults for strings, numbers, or enums, titled `oneOf` enums, or multi-select arrays.

MCP 2025-11-25 and MCP 2026-07-28 additionally support defaults for all primitive types, standard titled single-select enums, titled and untitled multi-select enums, and the legacy `enumNames` form. Validators MUST apply the vocabulary of every applicable protocol revision.

A `required` entry MUST name a property declared in `properties`. `enumNames`, when present, MUST contain one display name for every enum value. An enum default MUST be one of its declared values, and every multi-select default value MUST occur in its declared item choices. Minimum constraints MUST NOT exceed their corresponding maximum constraints.

### 12.4 URL Mode

For `mode: "url"`:

- `requestedSchema` MUST NOT appear;
- `url`, when present, MUST be a syntactically valid URI; and
- omission of `url` means the concrete URL is generated or selected at runtime.

A runtime URL-mode elicitation still supplies every field required by the applicable MCP revision. Omission in mcpdesc does not make the runtime URL optional.

Validation of `url` is syntax-only. Validators and other consumers MUST NOT retrieve, prefetch, dereference, or otherwise access it while processing a description. A conforming declaration does not assert that the target is currently available, trusted, immutable, controlled by the server, or suitable for automatic navigation.

### 12.5 Protocol Applicability

An omitted Elicitation Declaration `protocolVersions` inherits the effective scope of its containing primitive. An explicit scope MUST be non-empty and MUST be a subset of that containing scope.

Complete revision-specific validation begins with MCP 2025-06-18:

- MCP 2025-06-18 supports form mode;
- MCP 2025-11-25 supports form and URL modes; and
- MCP 2026-07-28 supports form and URL modes.

A declaration spanning multiple revisions MUST satisfy every applicable revision. Authors MUST split materially incompatible declarations into disjoint scopes.

MCP 2024-11-05 and MCP 2025-03-26 retain the legacy compatibility treatment in Section 3.5. Validators apply structural and selected sound checks, issue the existing incomplete-validation diagnostic, and MUST NOT report complete MCP semantic conformance.

### 12.6 Static-Description Boundary

The applicable MCP revision remains authoritative for execution. MCP Description does not model whether elicitation uses a server-initiated request or Multi Round-Trip Requests, nor lifecycle messages, identifiers, request state, retries, correlation, capability negotiation, or transport behavior. Static primitive `clientRequirements` may record an unconditional minimum elicitation capability without defining any of that choreography.

A mock, gateway, documentation tool, or client MAY use a declaration to render its message, collect a form response matching `requestedSchema`, or present a known URL. The declaration alone does not define when a mock triggers the interaction, how it selects among declarations, how responses modify state, or which final primitive result follows.

Elicitation Declarations are distinct from named primitive examples. Tool Examples pair a complete invocation with a completed Tool Result, Tool `interactionExamples` add ordered semantic client-input steps for one Tool invocation, and Resource Examples contain completed read results. None of these models preserve JSON-RPC envelopes, MRTR request state, retries, timing, or a general executable workflow language.

The applicable MCP elicitation specification remains authoritative for runtime security and privacy requirements. MCP Description validation does not inspect or certify runtime behavior, privacy compliance, or security conformance and defines no sensitive-field diagnostic.

### 12.7 Example

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
