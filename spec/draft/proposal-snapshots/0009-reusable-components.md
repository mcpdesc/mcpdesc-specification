# Proposal 0009: Reusable Components and Local References

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-25
- Last updated: 2026-08-26
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/22
- Related proposals: Proposal 0004, Proposal 0005, Proposal 0006, Proposal 0007
- Review period: 2026-08-26 through 2026-09-25

## Summary

Add an optional root `components` object containing reusable MCP Description objects, together with a typed local Reference Object using `$componentRef`. The initial component namespaces cover reusable schemas and the named example object types already defined by MCP Description Draft 1.

The proposal reduces duplication in large descriptions while preserving context-specific MCP validation. Component objects do not create new runtime semantics: a reference is resolved to the same object that could otherwise have been written inline.

The initial design intentionally keeps references local to one MCP Description document. It does not define cross-document bundling, network retrieval, or a general-purpose composition language.

## Problem

MCP Description Draft 1 supports increasingly rich repeated structures:

* Tool `inputSchema` and `outputSchema`;
* named Tool invocation/result examples;
* named Resource examples;
* named Resource Template examples; and
* elicitation `requestedSchema` declarations.

Large MCP servers commonly reuse domain shapes and representative examples across multiple primitives. Today authors must duplicate those structures or rely on JSON Schema-specific `$defs` inside each individual embedded schema.

That leaves several gaps:

* an entire Tool input or output schema cannot be reused as a named MCP Description component;
* a Tool example cannot be shared by multiple protocol-scoped variants without duplication;
* Resource and Resource Template examples cannot be centralized;
* an elicitation `requestedSchema` cannot reuse a named description-level schema;
* JSON Schema `$defs` solve only reuse *inside one schema resource* and do not provide a description-level namespace for non-schema MCP Description objects.

Proposal 0004 explicitly left reusable root components and cross-document example references as a non-goal. Proposal 0006 is evaluating reusable `_meta` schema declarations separately. A general component mechanism provides a common foundation without requiring every future feature to invent its own root-level registry and reference syntax.

## Goals

* Define one reusable root `components` namespace for MCP Description.
* Reuse complete schema-valued declarations across Tools and Elicitation Declarations.
* Reuse Tool, Resource, and Resource Template example objects.
* Keep references local, deterministic, and resolvable without network access.
* Preserve the existing validation rules of the location in which a component is used.
* Keep JSON Schema `$ref` semantics inside embedded JSON Schemas unambiguous by using `$componentRef` for MCP Description Reference Objects.
* Allow future proposals to add new typed component namespaces without redesigning the reference mechanism.
* Remain additive for existing 0.8.0 documents.

## Non-goals

* Define external or remote MCP Description references.
* Define package resolution, registries, imports, overlays, inheritance, templates, macros, or parameterized components.
* Replace JSON Schema `$defs`, `$id`, or `$ref` inside embedded JSON Schemas.
* Allow one component to bypass protocol-revision constraints at a use site.
* Add Prompt examples; Prompt example semantics require a separate proposal.
* Resolve the semantics of reusable `_meta` schemas being considered by Proposal 0006. This proposal only provides a reusable component framework that Proposal 0006 may choose to use.
* Make OpenAPI a normative dependency.
* Permit arbitrary component namespaces in 0.8.0 without a specification-defined schema.

## Background and primary references

* MCP Description proposal template and governance: https://github.com/mcpdesc/mcpdesc-specification/tree/main/proposals
* MCP Description Draft 1 Tool schemas and examples: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/mcp-description.md
* Proposal 0004, Named Tool Invocation and Result Examples: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/proposal-snapshots/0004-tool-input-output-examples.md
* Proposal 0005, Named Resource and Resource Template Examples: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/proposal-snapshots/0005-resource-examples.md
* Proposal 0006, reusable `_meta` schema work, currently not represented in Draft 1: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/PROPOSALS.md
* Proposal 0007, Elicitation Declarations: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/proposal-snapshots/0007-elicitation.md
* OpenAPI 3.1.1 Components Object and Reference Object, as prior art only: https://spec.openapis.org/oas/v3.1.1.html

OpenAPI demonstrates the value of a document-wide typed component namespace, but MCP Description should keep only the concepts that fit MCP's own object model and static-description boundary.

## Proposed normative behavior

### 1. Root `components` object

The MCP Description root object MAY contain `components`.

`components` is a Components Object. In 0.8.0 it MAY contain the following properties:

| Property | Type | Description |
| --- | --- | --- |
| `schemas` | map<string, JSON Schema Object> | Reusable schema values for schema-valued MCP Description fields. |
| `toolExamples` | map<string, Tool Example Object> | Reusable Tool invocation/result examples. |
| `resourceExamples` | map<string, Resource Example Object> | Reusable Resource examples. |
| `resourceTemplateExamples` | map<string, Resource Template Example Object> | Reusable Resource Template examples. |

The Components Object MUST NOT contain additional properties in 0.8.0 unless they are specification extensions explicitly permitted there by a future proposal.

Each component map MUST contain at least one entry when present.

Component names MUST match:

```text
^[A-Za-z0-9._-]+$
```

Names are case-sensitive and unique only within their component namespace.

### 2. MCP Description Reference Object

A Reference Object has exactly one property:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `$componentRef` | string | Yes | Local JSON Pointer identifying a compatible object under `#/components`. |

No sibling properties are allowed.

A Reference Object MUST use a local reference beginning with `#/components/`. Remote URIs, relative-file references, and non-component document pointers MUST be rejected as MCP Description Reference Objects in 0.8.0.

Valid examples include:

```json
{ "$componentRef": "#/components/schemas/SearchRequest" }
```

and:

```json
{ "$componentRef": "#/components/toolExamples/search-basic" }
```

### 3. Distinction from JSON Schema `$ref`

An MCP Description Reference Object uses `$componentRef`. The `$componentRef` property is not a JSON Schema keyword and MUST resolve according to this proposal only at an MCP Description use site that permits a Reference Object.

The `$ref` keyword remains exclusively a JSON Schema keyword inside a JSON Schema Object and MUST be processed according to the applicable JSON Schema dialect and the existing MCP Description schema-resolution rules.

An implementation MUST NOT accept `$ref` as an MCP Description component reference or reinterpret `$componentRef` inside an embedded JSON Schema as a JSON Schema reference.

### 4. Schema component use sites

The following schema-valued properties MAY contain either an inline schema object or a Reference Object targeting `#/components/schemas/<name>`:

* Tool `inputSchema`;
* Tool `outputSchema`; and
* Elicitation Declaration `requestedSchema`.

After resolution, the referenced schema MUST satisfy every rule that would apply if the schema were written inline at that exact use site.

Examples:

* a schema referenced by Tool `inputSchema` MUST have an object root;
* a schema referenced by Tool `outputSchema` must satisfy the applicable MCP revision's output-schema rules;
* a schema referenced by Elicitation `requestedSchema` must satisfy the restricted elicitation schema vocabulary for every applicable protocol revision.

A component being structurally valid as JSON Schema does not imply that it is valid in every possible use site.

### 5. Example component use sites

A Tool `examples` map value MAY be either an inline Tool Example Object or a Reference Object targeting `#/components/toolExamples/<name>`.

A Resource `examples` map value MAY be either an inline Resource Example Object or a Reference Object targeting `#/components/resourceExamples/<name>`.

A Resource Template `examples` map value MAY be either an inline Resource Template Example Object or a Reference Object targeting `#/components/resourceTemplateExamples/<name>`.

After resolution, the example MUST satisfy every semantic requirement of its containing primitive declaration and effective protocol scope.

A reusable example therefore remains contextual. For example, a Tool Example referenced by two Tools must validate against both Tools' input schemas and applicable result rules.

### 6. Resolution rules

A conforming implementation MUST resolve MCP Description Reference Objects before performing semantic validation that depends on the referenced value.

Resolution MUST:

1. treat the reference as a JSON Pointer into the same parsed MCP Description document;
2. require the target to exist;
3. require the target to occur in the component namespace appropriate for the use site;
4. reject a target of the wrong component type;
5. reject reference cycles among MCP Description Reference Objects; and
6. preserve the referenced value's JSON data exactly for semantic validation.

Implementations MUST NOT access the network to resolve an MCP Description Reference Object.

### 7. Protocol applicability

Components do not declare `protocolVersions` in 0.8.0.

The effective protocol scope is always inherited from each **use site**, not from the component definition.

If one component is referenced from several protocol scopes, it MUST be valid in every use site independently. If it is not, the author MUST define separate components and reference the appropriate one from each scoped declaration.

This avoids introducing a second protocol-scoping system inside `components`.

### 8. Projection

Projection tools MAY retain all component definitions or MAY remove unreferenced components.

If projection removes unused components, it MUST preserve every component transitively referenced by a retained declaration.

Projection MUST validate every retained reference after projection.

### 9. Merge

A merge implementation MAY deduplicate byte-equivalent or semantically equivalent components, but it MUST update all affected references consistently.

A merge implementation MUST NOT silently bind two different component values to the same component name.

If component-name collisions cannot be resolved without renaming, the implementation MAY deterministically rename one component and rewrite its local references, or it MAY fail with a merge conflict.

### 10. Reference stability

Component names are local identifiers within one MCP Description document. They are not globally unique identifiers and do not establish stable cross-document identity.

Consumers MUST NOT construct external URIs from component names unless another specification defines such a convention.

## Schema impact

The root schema should add optional `components`.

The schema should define:

* `components`;
* `referenceObject`;
* reusable component-name validation; and
* unions at supported use sites between inline object shapes and the typed Reference Object.

Illustrative shape:

```json
{
  "components": {
    "schemas": {
      "SearchRequest": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        },
        "required": ["query"]
      }
    },
    "toolExamples": {
      "search-basic": {
        "input": { "query": "mcp" },
        "result": {
          "resultType": "complete",
          "content": [
            { "type": "text", "text": "Example result" }
          ]
        }
      }
    }
  }
}
```

Structural JSON Schema can validate the reference shape and known component namespaces, but semantic validation is still required to verify target existence, target type, reference cycles, protocol applicability, and compatibility with each use site.

## Examples

### Reusing a Tool input schema

```json
{
  "mcpdesc": "0.8.0",
  "info": {
    "name": "search-server",
    "version": "1.0.0"
  },
  "protocolVersions": ["2026-07-28"],
  "transports": [
    { "type": "stdio", "command": "search-server" }
  ],
  "components": {
    "schemas": {
      "SearchRequest": {
        "type": "object",
        "properties": {
          "query": { "type": "string" },
          "limit": { "type": "integer", "minimum": 1 }
        },
        "required": ["query"],
        "additionalProperties": false
      }
    }
  },
  "tools": [
    {
      "name": "search_docs",
      "inputSchema": {
        "$componentRef": "#/components/schemas/SearchRequest"
      }
    },
    {
      "name": "search_tickets",
      "inputSchema": {
        "$componentRef": "#/components/schemas/SearchRequest"
      }
    }
  ]
}
```

The `$componentRef` objects above are MCP Description Reference Objects. A `$ref` occurring *inside* the `SearchRequest` JSON Schema uses JSON Schema semantics.

### Reusing a named Tool example

```json
{
  "components": {
    "toolExamples": {
      "health-ok": {
        "input": {},
        "result": {
          "resultType": "complete",
          "content": [
            { "type": "text", "text": "ok" }
          ]
        }
      }
    }
  },
  "tools": [
    {
      "name": "health",
      "inputSchema": {
        "type": "object",
        "additionalProperties": false
      },
      "examples": {
        "ok": {
          "$componentRef": "#/components/toolExamples/health-ok"
        }
      }
    }
  ]
}
```

### Reusing an elicitation schema

```json
{
  "components": {
    "schemas": {
      "Confirmation": {
        "type": "object",
        "properties": {
          "confirm": { "type": "boolean" }
        },
        "required": ["confirm"]
      }
    }
  },
  "tools": [
    {
      "name": "delete_project",
      "inputSchema": {
        "type": "object",
        "properties": {
          "projectId": { "type": "string" }
        },
        "required": ["projectId"]
      },
      "elicitations": [
        {
          "name": "confirm-delete",
          "mode": "form",
          "message": "Confirm project deletion",
          "requestedSchema": {
            "$componentRef": "#/components/schemas/Confirmation"
          }
        }
      ]
    }
  ]
}
```

The referenced schema remains subject to Elicitation Declaration schema restrictions.

## Compatibility

This is an additive change for MCP Description documents: descriptions that do not use `components` remain valid.

Implementations must be updated to understand Reference Objects before accepting documents that use them. A 0.8.0 implementation that does not implement this proposal should reject such a document rather than accidentally interpreting an MCP Description Reference Object as an ordinary embedded JSON Schema.

No MCP runtime behavior changes.

## Migration

No existing document requires migration.

Authors may incrementally extract repeated inline values into `components` and replace those values with local references.

A safe migration tool should:

1. identify structurally identical candidate values;
2. create a typed component with a unique component name;
3. replace each eligible use site with a Reference Object;
4. run full structural and semantic validation; and
5. compare projected Effective Protocol Views before and after extraction to ensure semantic equivalence.

Tools should not automatically extract merely similar objects whose contextual validation differs.

## Security and privacy considerations

Local-only references intentionally avoid network retrieval and associated SSRF, credential-leak, and untrusted-content risks.

Implementations MUST apply recursion and expansion limits when resolving components to prevent resource-exhaustion attacks. Reference cycles MUST be rejected.

A referenced component is untrusted input to the same degree as an inline object. Resolution MUST NOT weaken existing validation, schema-resolution security guidance, `_meta` restrictions, or specification-extension handling.

Components can make sensitive examples easier to reuse. Authors MUST continue to avoid credentials, tokens, personal identifiers, live trace identifiers, and other runtime-sensitive values in static examples or schemas.

## Alternatives considered

### Use JSON Schema `$defs` everywhere

`$defs` is excellent for reuse inside a JSON Schema resource, but it cannot represent Tool Example Objects, Resource Example Objects, or other MCP Description structures. It also does not provide a document-level typed namespace for complete schema-valued fields.

### Add only `components.schemas`

This is smaller, but examples are already a major source of repeated data and Proposal 0004 explicitly deferred reusable examples. Defining the Reference Object once while covering the currently standardized reusable object types avoids several incompatible mini-registries later.

### Use root `x-*` extensions

A vendor extension could implement a private component registry, but core fields would have no portable reference semantics and validators could not enforce target type or use-site compatibility.

### Permit arbitrary local JSON Pointers

Allowing `$componentRef` to target any location in the document is flexible but makes type checking, lifecycle, and refactoring harder. Restricting targets to `#/components/<typed-namespace>/...` keeps references predictable.

### Permit external references immediately

Cross-file composition is useful but raises packaging, retrieval, base-URI, offline reproducibility, trust, and security questions. Local components should be proven first.

### Reuse OpenAPI Components wholesale

MCP Description has different primitive, example, protocol-scope, and schema semantics. OpenAPI is useful prior art but should not become a normative dependency or import unrelated HTTP concepts.

## Open questions

* Should 0.8.0 start with only `components.schemas` and add reusable examples after implementation experience?
* Should Proposal 0006 use `components.schemas`, add a dedicated `metaSchemas` component namespace, or remain independent?
* Should component names share the same grammar as named examples, as proposed here?
* Should projection retain all components for source stability or prune unused components by default?
* Should future versions permit a Reference Object at additional locations such as security schemes or Elicitation Declaration objects?
* Should cross-document references be a separate proposal after local references are implemented and tested?

## Implementation and validation plan

1. Add `components` and typed component maps to the draft JSON Schema.
2. Add a strict `referenceObject` definition with one `$componentRef` property and no siblings.
3. Update supported schema-valued and example-valued locations to accept either inline values or Reference Objects.
4. Implement semantic resolution with local-only JSON Pointer targets, type checking, and cycle detection.
5. Add positive fixtures for each component namespace.
6. Add negative fixtures for missing targets, wrong namespaces, wrong target types, remote references, sibling properties, and cycles.
7. Add fixtures proving that referenced schemas remain subject to Tool and Elicitation context rules.
8. Add projection and merge fixtures covering retained and renamed components.
9. Update the full-featured example to demonstrate at least one reusable schema and one reusable example.
10. Add a changelog entry and document the distinction between MCP Description `$componentRef` Reference Objects and JSON Schema `$ref`.

## Decision record

Pending community review.
