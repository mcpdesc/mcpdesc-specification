## 15. Serialization

### 15.1 Conforming Serializations

An MCP Description MAY be serialized as JSON or as restricted YAML. Both serializations decode to the single JSON-compatible MCP Description data model defined in Section 3.1 and use the same JSON Schema and semantic-validation requirements.

A conforming document consumer or producer MUST support at least one conforming serialization and MUST declare whether it supports JSON, YAML, or both for each applicable input or output capability.

### 15.2 JSON Serialization

An MCP Description MAY be serialized as JSON. JSON serialization MUST conform to [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) and MUST be encoded in UTF-8.

A consumer that claims JSON input support MUST accept conforming JSON MCP Description documents. A producer that claims JSON output support MUST emit conforming JSON MCP Description documents. General MCP Description conformance does not make JSON support mandatory or preferred over YAML support.

The recommended JSON file extension remains:

```text
.mcpdesc.json
```

The recommended JSON media type remains:

```text
application/mcp-description+json
```

### 15.3 YAML Serialization

An MCP Description MAY be serialized as YAML 1.2.2 using the JSON schema defined by Section 10.2.1.3 of the [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) for scalar resolution.

A consumer that claims YAML input support MUST accept YAML MCP Description documents that satisfy this restricted profile and MUST reject documents that violate it. A producer that claims YAML output support MUST emit only documents that satisfy the restricted profile. General MCP Description conformance does not make YAML support mandatory or preferred over JSON support.

A YAML MCP Description MUST consist of exactly one YAML document and MUST decode to the JSON-compatible MCP Description data model defined in Section 3.1. A YAML stream containing zero or multiple documents MUST be rejected.

The recommended YAML file extensions are:

```text
.mcpdesc.yaml
.mcpdesc.yml
```

with `.mcpdesc.yaml` preferred.

The recommended YAML media type is:

```text
application/mcp-description+yaml
```

The project-specific `application/mcp-description+yaml` media type is not registered by RFC 9512. Its `+yaml` structured syntax suffix and the generic `application/yaml` media type are registered by [RFC 9512](https://www.rfc-editor.org/rfc/rfc9512). Generic tooling SHOULD use `application/yaml` when the project-specific media type is unavailable or inappropriate.

#### 15.3.1 String Mapping Keys

Every YAML mapping key MUST resolve to a string. Complex keys, sequence keys, numeric keys, boolean keys, null keys, and other non-string keys MUST be rejected.

#### 15.3.2 Duplicate Mapping Keys

A YAML mapping MUST NOT contain duplicate keys after scalar resolution. Implementations MUST reject duplicate keys rather than silently keeping the first or last value.

#### 15.3.3 Scalar Resolution and Numeric Values

A YAML processor MUST use the YAML 1.2.2 JSON schema for scalar resolution. A YAML scalar used as an MCP Description value MUST resolve to a string, finite number, boolean, or null. Non-finite numeric values such as positive infinity, negative infinity, and NaN MUST be rejected.

The YAML 1.2.2 JSON schema does not implicitly resolve timestamps. Date-time and date values therefore remain strings; authors SHOULD still quote them for clarity and portability across authoring tools.

#### 15.3.4 Tags and Safe Parsing

Application-specific, language-specific, or custom YAML tags MUST NOT be used. Implementations MUST use a safe parser mode that does not instantiate application objects or execute constructors based on tags.

#### 15.3.5 Anchors and Aliases

YAML aliases and alias-based recursive structures MUST NOT be used in a conforming MCP Description YAML serialization. Implementations SHOULD reject documents containing aliases. This restriction avoids graph identity, recursion, and expansion semantics that have no representation in the JSON-compatible data model.

Authors who need semantic reuse SHOULD duplicate the value explicitly or use a specification-defined reuse mechanism when one is available.

#### 15.3.6 Merge Keys

YAML merge-key conventions such as `<<` MUST NOT be interpreted as structural merge operations by MCP Description tooling. If a parser exposes `<<` as an ordinary string key, the resulting MCP Description will normally fail the MCP Description schema because `<<` is not a defined property. Implementations MUST NOT apply YAML merge semantics before MCP Description validation.

### 15.4 Parsing and Validation Pipeline

A conforming validator that accepts YAML MUST parse YAML using the restrictions above, reject unsupported YAML constructs, normalize the parsed representation to the JSON-compatible MCP Description data model, apply the same MCP Description JSON Schema used for JSON documents, and apply the same cross-object and semantic validation used for JSON documents. A validator MUST NOT have weaker semantic validation for YAML than for JSON.

The MCP Description JSON Schema remains authoritative for structural instance validation. It is published as JSON and applies to the decoded data model regardless of the source serialization.

### 15.5 Serialization Equivalence

If a JSON document and a YAML document decode to the same JSON-compatible data model, they are semantically equivalent MCP Description documents, subject to the ordinary MCP Description semantic-equivalence rules. Source formatting, comments, quoting style, YAML block style, and object-key order do not participate in semantic equivalence.

Tools that convert between JSON and YAML MUST preserve the decoded MCP Description data model, subject only to non-semantic source details such as comments, scalar style, and mapping order.

### 15.6 Common Value Requirements

Implementations MUST support finite IEEE 754 double-precision floating-point numbers. Properties with `null` values SHOULD be omitted rather than included with a `null` value unless the property explicitly permits `null`.

An ordinary declaration collection with no entries MUST be omitted; an explicit empty array or object is not conforming. Serialization MUST NOT convert omission into an explicit empty value. Implementations MUST preserve semantically significant empty values and MUST NOT convert them to omission. In particular, `security: []` clears inherited security while omission inherits it, `security: [{}]` declares an anonymous alternative, and empty Security Requirement scope arrays remain significant; these forms are not interchangeable.

String values MUST be valid JSON strings after decoding. URI values MUST conform to [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986). Email values SHOULD conform to [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322). Date values MUST conform to ISO 8601.

### 15.7 Schema Reference

MCP Description documents SHOULD include a `$schema` property referencing the appropriate JSON Schema for IDE validation and tooling support. The property has the same meaning in JSON and YAML, and the referenced schema remains a JSON Schema when the instance is serialized as YAML.

For the current unreleased 0.8.0 Draft 4 working schema, the canonical value is `https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json`. A future stable 0.8.0 release will instead use `https://mcpdesc.org/schema/mcp-description/0.8.0.json`. In both cases, the `$schema` value does not change the required `mcpdesc: 0.8.0` discriminator.

```yaml
$schema: https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json
mcpdesc: 0.8.0
```

### 15.8 Producer and Consumer Guidance

Producers and consumers SHOULD explicitly communicate or negotiate the serialization when it cannot be determined from a file extension, media type, or other enclosing protocol metadata. Implementations MAY support JSON, YAML, or both according to their use case and declared capabilities.

Implementations MUST treat JSON and YAML input as untrusted and impose reasonable document-size, nesting-depth, scalar-length, and collection-size limits.
