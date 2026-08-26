## 15. Serialization

### 15.1 JSON Format

An MCP Description document MUST be serialized as a JSON document conforming to [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259).

### 15.2 Character Encoding

MCP Description documents MUST be encoded in UTF-8.

### 15.3 Numeric Values

JSON numbers SHOULD be used for numeric values. Implementations MUST support IEEE 754 double-precision floating-point numbers.

### 15.4 Null Values

Properties with `null` values SHOULD be omitted from the document rather than included with a `null` value, unless the property explicitly permits `null`.

### 15.5 Empty Arrays and Objects

An ordinary declaration collection with no entries MUST be omitted; an explicit empty array or object is not conforming. Serialization MUST NOT convert omission into an explicit empty value. Implementations MUST preserve semantically significant empty values and MUST NOT convert them to omission. In particular, `security: []` clears inherited security while omission inherits it, `security: [{}]` declares an anonymous alternative, and empty Security Requirement scope arrays remain significant; these forms are not interchangeable.

### 15.6 String Values

String values MUST be valid JSON strings. URI values MUST conform to [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986). Email values SHOULD conform to [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322). Date values MUST conform to ISO 8601.

### 15.7 Schema Reference

MCP Description documents SHOULD include a `$schema` property referencing the appropriate JSON Schema for IDE validation and tooling support:

```json
{
  "$schema": "https://mcpdesc.org/schema/0.8.0.json",
  "mcpdesc": "0.8.0"
}
```
