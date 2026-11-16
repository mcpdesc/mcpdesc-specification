## 17. Reusable Components and Local References

### 17.1 Components Object

The root MCP Description Object MAY contain a `components` property. <a id="req-components-fields"></a>A Components Object MUST contain at least one property. It MAY contain these namespace maps:

| Property | Type | Description |
|----------|------|-------------|
| `schemas` | non-empty map\<string, JSON Schema Object or Reference Object\> | Reusable schema values. |
| `toolExamples` | non-empty map\<string, Tool Example Object or Reference Object\> | Reusable Tool examples. |
| `resourceExamples` | non-empty map\<string, Resource Example Object or Reference Object\> | Reusable static Resource examples. |
| `resourceTemplateExamples` | non-empty map\<string, Resource Template Example Object or Reference Object\> | Reusable Resource Template examples. |
| `promptExamples` | non-empty map\<string, Prompt Example Object or Reference Object\> | Reusable Prompt examples. |

<a id="req-component-maps"></a>Every present namespace map MUST contain at least one entry. Each component name MUST match `^[A-Za-z0-9._-]+$`. Names are case-sensitive and unique only within their namespace.

<a id="req-components-closed"></a>The outer Components Object MAY carry `x-*` specification extensions and MUST NOT contain other properties. Namespace maps are not extension locations: every key in a namespace map is a component name. Schema component values follow the JSON Schema rules for extension keywords. Tool, Resource, Resource Template, and Prompt Example component values are eligible semantic objects and MAY carry the same `x-*` specification extensions as their inline forms. Components and component values MUST NOT declare MCP Description `protocolVersions`. Protocol applicability comes only from each use site.

### 17.2 Reference Object

<a id="req-reference-object-fields"></a>A Reference Object contains exactly one required property:

| Property | Type | Description |
|----------|------|-------------|
| `$componentRef` | string | Local JSON Pointer to one named value in the compatible `#/components` namespace. |

No other property, including an `x-*` property, is permitted. <a id="req-component-reference-form"></a>The pointer MUST have the form `#/components/<namespace>/<name>`, where `<namespace>` is one of the five namespaces in Section 17.1 and `<name>` matches the component-name grammar. Remote URIs, relative-file references, pointers outside `#/components`, missing targets, and targets in an incompatible namespace are invalid.

A `$componentRef` is an MCP Description reference only at a use site that permits a Reference Object. JSON Schema `$ref` is governed only by the applicable JSON Schema dialect. <a id="req-component-ref-distinct"></a>Implementations MUST NOT accept `$ref` as an MCP Description component reference and MUST NOT reinterpret a `$componentRef` nested inside an embedded JSON Schema.

The separate keyword keeps two reference systems apart in one document. JSON Schema `$ref` is an applicator. It applies another schema at the current instance location, follows the dialect's base-URI and dynamic-scope rules, and can appear next to other schema keywords when the dialect allows it. A `$componentRef` instead replaces one complete MCP Description value before that value is validated at its use site. It can therefore reference values that are not schemas, but it does not compose, constrain, or annotate its target.

Local-only resolution is a separate design choice; it does not follow from using a separate keyword. For comparison, OpenAPI Reference Objects use `$ref` URI references for typed OpenAPI values and can address internal or external targets, while OpenAPI Schema Objects use the same keyword with JSON Schema semantics. MCP Description 0.9.0 deliberately does not define the base-URI, document-loading, trust, bundling, or identity rules that external MCP Description values would need.

The local-only rule does not restrict `$ref`, `$id`, `$anchor`, `$dynamicRef`, composition keywords, or externally identified schema resources inside an embedded JSON Schema. Those remain subject to Section 9.2 and the applicable schema dialect.

### 17.3 Use Sites and Contextual Validation

Each of these use sites MAY contain a Reference Object to a component in the listed namespace:

| Use site | Namespace |
|----------|-----------|
| Tool `inputSchema` | `schemas` |
| Tool `outputSchema` | `schemas` |
| Elicitation Declaration `requestedSchema` | `schemas` |
| Each value in Tool `examples` | `toolExamples` |
| Each value in Resource `examples` | `resourceExamples` |
| Each value in Resource Template `examples` | `resourceTemplateExamples` |
| Each value in Prompt `examples` | `promptExamples` |

Resolution substitutes the referenced JSON value before any structural or semantic rule for the use site applies. <a id="req-component-contextual-validation"></a>A reusable schema or example MUST therefore be valid on its own at every use site, under each containing primitive and effective protocol scope that references it. Defining a value as a component does not relax Tool input object-root rules, Tool output protocol version rules, restricted Elicitation schemas, example/schema compatibility, completed-result shapes, URI relationships, or any other inline requirement.

### 17.4 Resolution

<a id="req-component-reference-pointer"></a>A conforming implementation MUST resolve each Reference Object as a JSON Pointer into the same parsed MCP Description document. <a id="req-component-reference-resolution"></a>It MUST require the target to exist in the namespace that the use site permits and MUST preserve the target JSON value for validation. It MUST follow references between components transitively and MUST reject cycles. It MUST NOT access the network, filesystem, package registry, or another document while resolving `$componentRef`.

<a id="req-component-resolution-errors"></a>Resolution errors are document-conformance errors. A validator SHOULD report the path of the use site or component and distinguish a malformed pointer, a missing target, an incompatible namespace, and a cycle.

### 17.5 Projection

A projection that produces an Effective Protocol View MAY retain every component or prune components that no retained declaration uses. <a id="req-component-pruning"></a>A pruning projection MUST retain every component transitively reached through a retained Reference Object and MUST remove no target required by the projected document. It MUST validate all retained references after projection. It MUST omit each namespace map that pruning leaves empty. It MUST also omit the outer Components Object when neither a namespace map nor a retained `x-*` extension remains in it.

Components have no independent protocol scope. Their validity is determined only after use-site projection.

### 17.6 Merge

<a id="req-component-merge"></a>Merge tooling MUST preserve every referenced component and MUST NOT silently bind different component values to one name. It MAY deduplicate equivalent values. When inputs define different values for the same name in the same namespace, tooling MAY fail with a merge conflict or deterministically rename one value and rewrite every affected Reference Object. A generated name MUST satisfy the component-name grammar, and all rewritten references MUST validate in the merged result.

<a id="req-component-merge-extensions"></a>Outer Components Object extensions with the same name and different values are conflicts unless the merge operation has an independently defined lossless representation. Merge processing MUST remain local and MUST NOT retrieve component values from a network or another document.

### 17.7 Security and Processing Limits

Components and referenced examples are untrusted document content. <a id="req-component-limits"></a>Implementations SHOULD limit reference depth, component count, nesting, and the validation work that resolution creates. <a id="req-component-cycles"></a>They MUST detect cycles without unbounded recursion and MUST apply the same safe rendering, schema-evaluation, URI, content, and secret-handling rules as for inline values.

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