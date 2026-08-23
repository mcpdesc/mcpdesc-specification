## 14. Serialization

### 14.1 JSON Format

An MCP Description document MUST be serialized as a JSON document conforming to [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259).

### 14.2 Character Encoding

MCP Description documents MUST be encoded in UTF-8.

### 14.3 Numeric Values

JSON numbers SHOULD be used for numeric values. Implementations MUST support IEEE 754 double-precision floating-point numbers.

### 14.4 Null Values

Properties with `null` values SHOULD be omitted from the document rather than included with a `null` value, unless the property explicitly permits `null`.

### 14.5 Empty Arrays and Objects

Empty arrays and objects MAY be omitted only when the property's semantics explicitly make omission equivalent. Implementations MUST preserve semantically significant empty values. In particular, `security: []` clears inherited security while omission inherits it, and `security: [{}]` declares an anonymous alternative; these forms are not interchangeable.

### 14.6 String Values

String values MUST be valid JSON strings. URI values MUST conform to [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986). Email values SHOULD conform to [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322). Date values MUST conform to ISO 8601.

### 14.7 Schema Reference

MCP Description documents SHOULD include a `$schema` property referencing the appropriate JSON Schema for IDE validation and tooling support:

```json
{
  "$schema": "https://mcpdesc.org/schema/0.8.0.json",
  "mcpdesc": "0.8.0"
}
```

