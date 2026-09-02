## 17. Reusable Components and Local References

### 17.1 Components Object

The root MCP Description Object MAY contain a `components` property. A Components Object MUST contain at least one property when present and MAY contain these typed namespace maps:

| Property | Type | Description |
|----------|------|-------------|
| `schemas` | non-empty map\<string, JSON Schema Object or Reference Object\> | Reusable schema values. |
| `toolExamples` | non-empty map\<string, Tool Example Object or Reference Object\> | Reusable Tool examples. |
| `resourceExamples` | non-empty map\<string, Resource Example Object or Reference Object\> | Reusable static Resource examples. |
| `resourceTemplateExamples` | non-empty map\<string, Resource Template Example Object or Reference Object\> | Reusable Resource Template examples. |
| `promptExamples` | non-empty map\<string, Prompt Example Object or Reference Object\> | Reusable Prompt examples. |

Every present namespace map MUST contain at least one entry. Each component name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and unique only within their namespace.

The outer Components Object MAY carry `x-*` specification extensions and MUST NOT contain other properties. Namespace maps are closed component-name maps rather than extension locations. Schema component values follow JSON Schema, including its extension-keyword rules. Tool, Resource, Resource Template, and Prompt Example component values are eligible semantic objects and MAY carry the same `x-*` specification extensions as their inline forms. Components and component values MUST NOT declare MCP Description `protocolVersions`; protocol applicability is inherited exclusively from each use site.

### 17.2 Reference Object

A Reference Object contains exactly one required property:

| Property | Type | Description |
|----------|------|-------------|
| `$componentRef` | string | Local JSON Pointer to one named value in the compatible `#/components` namespace. |

No sibling property, including an `x-*` property, is permitted. The pointer MUST have the form `#/components/<namespace>/<name>`, where `<namespace>` is one of the five namespaces in Section 17.1 and `<name>` follows the component-name grammar. Remote URIs, relative-file references, pointers outside `#/components`, missing targets, and targets in an incompatible namespace are invalid.

A `$componentRef` is an MCP Description reference only at a use site that permits a Reference Object. JSON Schema `$ref` remains governed exclusively by the applicable embedded JSON Schema dialect. Implementations MUST NOT accept `$ref` as an MCP Description component reference and MUST NOT reinterpret a `$componentRef` nested inside an embedded JSON Schema.

The distinct keyword separates two reference systems embedded in the same document. A JSON Schema `$ref` is an applicator: it applies another schema to the current instance location, participates in the schema dialect's URI-base and dynamic-scope rules, and may have adjacent schema keywords when the dialect permits them. A `$componentRef` instead replaces one complete MCP Description value before that value is checked in its use-site context. It can therefore reference non-schema values, but it does not compose, constrain, or annotate its target.

Local-only resolution is a separate design constraint, not a consequence of using a distinct keyword. OpenAPI Reference Objects use `$ref` URI references for typed OpenAPI values and can address internal or external targets; OpenAPI Schema Objects use the same spelling with JSON Schema semantics. MCP Description 0.8.0 deliberately does not define the base-URI, document loading, trust, bundling, or identity rules needed for external MCP Description values. This does not restrict `$ref`, `$id`, `$anchor`, `$dynamicRef`, composition keywords, or externally identified schema resources inside an embedded JSON Schema; those remain subject to Section 9.2 and the applicable schema dialect.

### 17.3 Use Sites and Contextual Validation

Tool `inputSchema`, Tool `outputSchema`, and Elicitation Declaration `requestedSchema` MAY reference `#/components/schemas/<name>`. Tool `examples` values MAY reference `toolExamples`; Resource `examples` values MAY reference `resourceExamples`; Resource Template `examples` values MAY reference `resourceTemplateExamples`; and Prompt `examples` values MAY reference `promptExamples`.

Resolution substitutes the referenced JSON value before every contextual structural and semantic rule at the use site. A reusable schema or example MUST therefore conform independently under every containing primitive and effective protocol scope that references it. Component storage does not weaken Tool input object-root rules, Tool output revision rules, restricted Elicitation schemas, example/schema compatibility, completed-result shapes, URI relationships, or any other inline requirement.

### 17.4 Resolution

A conforming implementation MUST resolve Reference Objects as JSON Pointers into the same parsed MCP Description document. It MUST require the target to exist in the namespace appropriate to the use site, preserve the target JSON value for validation, follow component-to-component references transitively, and reject cycles. It MUST NOT access the network, filesystem, package registry, or another document while resolving `$componentRef`.

Resolution errors are document-conformance errors. A validator SHOULD report the use-site or component path and distinguish a malformed pointer, missing target, incompatible namespace, and cycle.

### 17.5 Projection

An Effective Protocol View MAY retain every component or prune components unused by retained declarations. A pruning projection MUST retain every component transitively reached through a retained Reference Object and MUST remove no target required by the projected document. It MUST validate all retained references after projection. The outer Components Object and namespace maps MUST be omitted if pruning would otherwise leave them empty, except that retained outer specification extensions keep the Components Object non-empty.

Components have no independent protocol scope. Their validity is determined only after use-site projection.

### 17.6 Merge

Merge tooling MUST preserve every referenced component and MUST NOT silently bind different component values to one name. It MAY deduplicate equivalent values. When different values collide at one namespace and name, tooling MAY fail with a merge conflict or deterministically rename one value and rewrite every affected Reference Object. A generated name MUST satisfy the component-name grammar, and all rewritten references MUST validate in the merged result.

Outer Components Object extensions with the same name and different values are conflicts unless the merge operation has an independently defined lossless representation. Merge processing MUST remain local and MUST NOT retrieve component values from a network or another document.

### 17.7 Security and Processing Limits

Components and referenced examples are untrusted document content. Implementations SHOULD bound reference depth, component count, nesting, and resolved validation work. They MUST detect cycles without unbounded recursion and MUST apply the same safe rendering, schema-evaluation, URI, content, and secret-handling rules as for inline values.

### 17.8 Example

This excerpt defines a reusable Tool input schema and references it from a permitted use site:

```yaml
components:
	schemas:
		SearchInput:
			type: object
			properties:
				query:
					type: string
			required: [query]
tools:
	- name: search
		inputSchema:
			$componentRef: '#/components/schemas/SearchInput'
```

See the [complete reusable-components example](../examples/reusable-components.yaml) for reusable schemas and a referenced Tool Example Object.