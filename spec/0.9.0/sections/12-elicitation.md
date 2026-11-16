## 12. Elicitation Declarations

### 12.1 Purpose and Placement

An Elicitation Declaration documents that fulfilling a Tool, Resource, Resource Template, or Prompt may require additional interaction with the user through the MCP client.

Tool, Resource, Resource Template, and Prompt Objects MAY contain an `elicitations` array of Elicitation Declaration Objects. <a id="req-elicitations-non-empty"></a>When present, the array MUST contain at least one declaration.

A Resource Template declaration applies to `resources/read` operations on concrete Resource URIs produced from that template. It does not describe elicitation during template discovery.

An Elicitation Declaration describes stable server behavior, not the protocol-specific wire exchange. It does not assert that every request triggers the interaction or that every client can complete it. <a id="req-elicitation-not-capability"></a>Consumers MUST NOT treat an Elicitation Declaration by itself as an unconditional `clientRequirements.elicitation` requirement (see [Section 8.5](#85-primitive-client-capability-requirements)).

### 12.2 Elicitation Declaration Object

<a id="req-elicitation-declaration-fields"></a>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | **Yes** | Stable local declaration name. |
| `mode` | `"form"` or `"url"` | **Yes** | Canonical elicitation mode. |
| `message` | string | **Yes** | Representative user-facing explanation of the interaction. |
| `when` | string | No | Human-readable description of when the interaction may occur. |
| `requestedSchema` | object or Reference Object | Conditional | Inline or reusable restricted MCP form-response schema. See [Section 12.3](#123-form-mode). |
| `url` | string (URI) | No | Static URL, when known at authoring time. See [Section 12.4](#124-url-mode). |
| `onDecline` | string | No | Human-readable expected behavior after the user explicitly declines. |
| `onCancel` | string | No | Human-readable expected behavior after the user cancels or dismisses the interaction. |
| `protocolVersions` | array\<string\> | No | MCP protocol versions to which this declaration applies. See [Section 12.5](#125-protocol-applicability). |

<a id="req-elicitation-name-format"></a>`name` MUST match `^[A-Za-z0-9._-]+$`. <a id="req-elicitation-name-unique"></a>Names are case-sensitive and MUST be unique within the containing primitive declaration.

<a id="req-elicitation-message"></a>`message` MUST be non-empty. It documents the explanation the user should receive. It MAY be representative or default wording when runtime context changes the exact text. <a id="req-elicitation-runtime-wording"></a>Runtime wording SHOULD NOT materially contradict the documented purpose, but MCP Description does not require an exact match.

<a id="req-elicitation-documentation-fields"></a>`when`, `onDecline`, and `onCancel`, when present, MUST be non-empty. They are descriptive documentation, not executable expressions, client instructions, or statically provable guarantees.

MCP permits omitting `mode` at runtime for form elicitation. MCP Description requires `mode` so that each declaration has one canonical static form.

### 12.3 Form Mode

For `mode: "form"`:

- <a id="req-elicitation-form-schema-required"></a>`requestedSchema` is REQUIRED;
- <a id="req-elicitation-form-no-url"></a>`url` MUST NOT appear; and
- <a id="req-elicitation-form-shape"></a>`requestedSchema` MUST describe an object with only the property schemas allowed by every applicable MCP protocol version.

`requestedSchema` MAY be a Reference Object targeting the `schemas` component namespace (see [Section 17](#17-reusable-components-and-local-references)). <a id="req-elicitation-schema-references-resolved"></a>A referenced schema MUST be resolved before the vocabulary and protocol-scope requirements of this section are applied.

The schema is a flat object whose properties use MCP elicitation primitive schemas. Nested objects are invalid, as are arrays other than the multi-select enum forms that MCP supports. Unsupported keywords and unsupported string formats are invalid.

The supported vocabulary depends on the protocol version:

- MCP 2025-06-18 supports string, number, integer, boolean, and legacy string-enum property schemas. It permits string length constraints, the `email`, `uri`, `date`, and `date-time` formats, numeric bounds, boolean defaults, and optional `enumNames` matching the enum values. It does not define `$schema`, defaults for strings, numbers, or enums, titled `oneOf` enums, or multi-select arrays.
- MCP 2025-11-25 and MCP 2026-07-28 also support defaults for all primitive types, standard titled single-select enums, titled and untitled multi-select enums, and the legacy `enumNames` form.

<a id="req-elicitation-form-vocabulary"></a>Validators MUST apply the vocabulary of every applicable protocol version.

<a id="req-elicitation-form-required"></a>A `required` entry MUST name a property declared in `properties`. <a id="req-elicitation-form-enum-names"></a>`enumNames`, when present, MUST contain one display name for every enum value. <a id="req-elicitation-form-defaults"></a>An enum default MUST be one of its declared values, and every multi-select default value MUST be one of its declared item choices. <a id="req-elicitation-form-ranges"></a>A minimum constraint MUST NOT exceed its corresponding maximum constraint.

### 12.4 URL Mode

For `mode: "url"`:

- <a id="req-elicitation-url-no-schema"></a>`requestedSchema` MUST NOT appear;
- <a id="req-elicitation-url-syntax"></a>`url`, when present, MUST be a syntactically valid URI; and
- omitting `url` means the concrete URL is generated or selected at runtime.

Omitting `url` does not make the URL optional at runtime. A runtime URL-mode elicitation still includes every field that the applicable MCP protocol version requires.

Validation of `url` checks syntax only. <a id="req-elicitation-url-no-fetch"></a>Validators and other consumers MUST NOT retrieve, prefetch, dereference, or otherwise access it while processing a description. A valid `url` does not assert that the target is available, trusted, immutable, controlled by the server, or suitable for automatic navigation.

### 12.5 Protocol Applicability

When `protocolVersions` is omitted, the declaration inherits the effective scope of its containing primitive (see [Section 4.10](#410-protocol-scopes-and-inheritance)). <a id="req-elicitation-scope"></a>An explicit scope MUST be non-empty and MUST be a subset of the containing primitive's effective scope.

Mode support by protocol version:

- MCP 2025-06-18 supports form mode.
- MCP 2025-11-25 supports form and URL modes.
- MCP 2026-07-28 supports form and URL modes.

<a id="req-elicitation-protocol-versions"></a>A declaration that applies to multiple protocol versions MUST satisfy every one of them. When no single declaration can do so, authors MUST describe the containing primitive as separate protocol-scoped variants (see Sections [9.5](#95-protocol-variants-and-security), [10.5](#105-protocol-variants-and-security), and [11.5](#115-protocol-variants-and-security)).

Complete protocol-version-specific validation begins with MCP 2025-06-18. <a id="req-elicitation-legacy-incomplete"></a>For MCP 2024-11-05 and MCP 2025-03-26, validators apply the legacy validation scope in [Section 16.2](#162-implementation-conformance) and MUST NOT report complete MCP semantic conformance.

### 12.6 Static-Description Boundary

The applicable MCP protocol version remains authoritative for execution. MCP Description does not model whether elicitation uses a server-initiated request or Multi Round-Trip Requests. It also does not model lifecycle messages, identifiers, request state, retries, correlation, capability negotiation, or transport behavior. Primitive `clientRequirements` may record an unconditional minimum elicitation capability without defining any of these exchanges (see [Section 8.5](#85-primitive-client-capability-requirements)).

A mock, gateway, documentation tool, or client MAY use a declaration to render its message, collect a form response matching `requestedSchema`, or present a known URL. The declaration alone does not define when a mock triggers the interaction, how it chooses among declarations, how responses change state, or which final primitive result follows.

Elicitation Declarations are distinct from named primitive examples:

- Tool Examples pair a complete invocation with a completed Tool Result.
- Tool `interactionExamples` add ordered client-input steps to one Tool invocation.
- Resource Examples contain completed read results.
- Prompt Examples contain completed `prompts/get` results.

None of these preserve JSON-RPC envelopes, Multi Round-Trip Request state, retries, or timing, and none is a general executable workflow language.

The applicable MCP elicitation specification remains authoritative for runtime security and privacy requirements. MCP Description validation does not inspect or certify runtime behavior, privacy compliance, or security conformance. It defines no sensitive-field diagnostic.

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
