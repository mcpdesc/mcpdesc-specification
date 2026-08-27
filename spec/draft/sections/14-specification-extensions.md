## 14. Specification Extensions

MCP Description documents support vendor-specific metadata through specification extensions on explicitly eligible semantic objects.

### 14.1 Extension Naming

Specification extension properties MUST match the pattern `^x-`. Names are case-sensitive. The RECOMMENDED naming convention is:

```
x-{organization}-{feature}
```

Authors SHOULD use lowercase organization prefixes. Examples include `x-cisco-metadata`, `x-acme-owner`, and `x-example-cost-profile`.

### 14.2 Extension Placement

A specification extension MAY appear directly on the root MCP Description Object or another eligible MCP Description-defined semantic object. Eligible categories in 0.8.0 are:

- Info, Contact, License, Icon, and Tag Objects;
- Transport Objects and MCP Description-defined transport configuration objects;
- Security Scheme, OAuth Flows, and OAuth Flow Objects;
- the Capabilities Object, Client Capability Requirements Object, and MCP Description-defined capability declaration objects;
- Tool, Resource, Resource Template, Prompt, Prompt Argument, and Elicitation Declaration Objects; and
- MCP Description-defined named Tool, Resource, and Resource Template Example wrapper objects; and
- the outer Components Object and semantic Tool, Resource, and Resource Template Example component values.

Eligibility follows the object's specification-defined role, not the fact that a serialized value is a JSON object. A map value that is an eligible object MAY carry extensions, but the containing map does not thereby gain an extension slot.

Specification extensions MUST NOT appear directly on scalar values; domain-keyed maps; Security Requirement Objects; the `capabilities.extensions` or `clientRequirements.extensions` protocol-extension map; embedded JSON Schemas; carried MCP payload, result, annotation, or `_meta` objects; opaque example or extension values; arbitrary JSON payloads; or Reference Objects unless the Reference Object specification explicitly defines adjacent-extension resolution behavior. Those locations retain the rules of their owning format or object model.

The outer Components Object and eligible semantic example component values MAY carry `x-*` properties. Component namespace maps, embedded schemas, and Reference Objects remain ineligible. An `x-*` key inside a component namespace map is an ordinary component name and its value MUST satisfy that namespace's component type.

### 14.3 Extension Values

An extension value MAY be any JSON-compatible value: object, array, string, number, boolean, or null. Authors SHOULD prefer an object when the value may evolve compatibly.

### 14.4 Processing Rules

An implementation that does not recognize a specification extension MUST NOT reject the document because of that extension, MUST ignore it when interpreting core MCP Description semantics, and SHOULD preserve it when processing and reserializing the document. A consumer MUST NOT infer core semantics from an unrecognized extension.

A specification extension MUST NOT redefine, contradict, or weaken a core requirement. It cannot make a required field optional, change `security` or protocol applicability, or make an invalid example conforming. Core fields remain authoritative.

A validator MAY validate a recognized extension using a configured trusted schema. Failure to obtain that schema MUST NOT invalidate an otherwise conforming document unless the validator identifies a separate profile that requires the extension.

### 14.5 Ownership, Projection, and Merge

An object-level extension belongs to its containing semantic object and follows that object's lifecycle and Effective Protocol View. A nested `protocolVersions` member inside an extension value has no MCP Description scoping meaning.

A single-version projection MUST preserve every `x-*` property on a retained eligible object unless extension stripping was explicitly requested. Projection MUST NOT move it, combine it with `_meta`, or reinterpret it as an MCP protocol extension. Removing an out-of-scope owner removes its extensions with it.

Extensions participate in the semantic representation of their containing object. Merge tools MAY collapse objects with semantically equivalent extension values under the ordinary merge rules. For conflicting values on corresponding objects, a merge tool MUST retain distinct non-overlapping variants where representable or report a conflict. It MUST NOT guess, silently discard an extension, or move it to another object.

### 14.6 Extension Documentation

Extension authors SHOULD publish a JSON Schema for the value, purpose and semantic documentation, versioning information, and the eligible MCP Description object types on which the extension is valid.

### 14.7 Relationship to Other Extension Mechanisms

Object-level `x-*`, literal MCP `_meta`, formal MCP `capabilities.extensions`, and formal MCP `clientRequirements.extensions` are separate mechanisms. Tooling MUST NOT automatically copy, project, or reinterpret data among them. `x-*` is MCP Description-specific vendor metadata; `_meta` represents literal MCP metadata in supported contexts; `capabilities.extensions` declares server extension support; and `clientRequirements.extensions` declares an unconditional primitive-level client extension requirement.

### 14.8 Security and Privacy

Authors MUST NOT publish credentials, tokens, user identifiers, confidential topology, live trace identifiers, or other secrets in extensions. Consumers MUST treat extension names and values as untrusted content and apply appropriate size, output-encoding, rendering, logging, and execution controls. Unknown extensions MUST NOT bypass core conformance or security checks. Validators SHOULD avoid automatic network retrieval of extension schemas.

### 14.9 Example

```json
{
  "mcpdesc": "0.8.0",
  "info": {
    "name": "account-service",
    "version": "1.0.0",
    "x-acme-owner": { "team": "identity" }
  },
  "protocolVersions": ["2026-07-28"],
  "tools": [
    {
      "name": "delete_account",
      "inputSchema": { "type": "object" },
      "x-acme-governance": {
        "risk": "high",
        "reviewRequired": true
      }
    }
  ]
}
```
