## 15. Serialization

### 15.1 Conforming Serializations

An MCP Description MAY be serialized as JSON or as restricted YAML. Both serializations decode to the same JSON-compatible data model (see [Section 3.1](#31-format)), and the same JSON Schema and semantic validation apply to both. Neither serialization is required or preferred.

<a id="req-serialization-support"></a>A conforming document consumer or producer MUST support at least one conforming serialization. It MUST declare, for each input or output it supports, whether it accepts or emits JSON, YAML, or both.

### 15.2 JSON Serialization

<a id="req-serialization-json"></a>JSON serialization MUST conform to [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) and MUST be encoded in UTF-8.

<a id="req-serialization-json-claims"></a>A consumer that claims JSON input support MUST accept conforming JSON MCP Description documents. A producer that claims JSON output support MUST emit conforming JSON MCP Description documents.

The recommended file extension is `.mcpdesc.json`. The recommended media type is `application/mcp-description+json`.

### 15.3 YAML Serialization

An MCP Description MAY be serialized as YAML 1.2.2 under the restricted profile defined in this section. The profile uses the JSON schema tag-resolution rules in Section 10.2.2 of the [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/), with the string fallback defined in Section 15.3.3 and the restrictions in Sections 15.3.1 to 15.3.6.

<a id="req-serialization-yaml-claims"></a>A consumer that claims YAML input support MUST accept YAML MCP Description documents that satisfy this profile and MUST reject documents that violate it. A producer that claims YAML output support MUST emit only documents that satisfy the profile.

<a id="req-serialization-yaml-single-document"></a>A YAML MCP Description MUST consist of exactly one YAML document and MUST decode to the JSON-compatible data model (see [Section 3.1](#31-format)). A YAML stream containing zero or multiple documents MUST be rejected.

The recommended file extensions are `.mcpdesc.yaml` and `.mcpdesc.yml`, with `.mcpdesc.yaml` preferred. The recommended media type is `application/mcp-description+yaml`.

[RFC 9512](https://www.rfc-editor.org/rfc/rfc9512) registers the `+yaml` structured syntax suffix and the generic `application/yaml` media type, but not `application/mcp-description+yaml`. <a id="req-serialization-media-type"></a>Generic tooling SHOULD use `application/yaml` when the project-specific media type is unavailable or inappropriate.

#### 15.3.1 String Mapping Keys

<a id="req-serialization-yaml-string-keys"></a>Every YAML mapping key MUST resolve to a string. Complex keys, sequence keys, numeric keys, boolean keys, null keys, and other non-string keys MUST be rejected.

#### 15.3.2 Duplicate Mapping Keys

<a id="req-serialization-yaml-duplicate-keys"></a>A YAML mapping MUST NOT contain duplicate keys after scalar resolution. Implementations MUST reject duplicate keys rather than silently keeping the first or last value.

#### 15.3.3 Scalar Resolution and Numeric Values

<a id="req-serialization-yaml-scalars"></a>A YAML processor MUST use the YAML 1.2.2 JSON schema rules to recognize null, booleans, and numbers. An untagged plain scalar that matches none of those rules MUST resolve to a string, except for the non-finite forms described below. This string fallback extends the YAML JSON schema, which would otherwise report unmatched plain scalars as errors. These rules apply to both mapping keys and values; mapping keys remain subject to Section 15.3.1. A scalar used as an MCP Description value MUST resolve to a string, finite number, boolean, or null. Non-finite numbers MUST be rejected, including numeric spellings that overflow, such as `1e400`. Untagged plain `.inf` and `.nan`, in any letter case and with an optional leading `+` or `-`, MUST also be rejected rather than resolved as strings. Quoted forms of these spellings remain strings.

For example, plain `null`, `true`, and `12` resolve to null, a boolean, and a number. Plain `ordinary`, `0o12`, `0x12`, `012`, `TRUE`, and `~` resolve to strings. In particular, `0o12` remains a string rather than the octal number `10`. These rules differ from YAML 1.2 Core and YAML 1.1 scalar resolution.

These rules do not resolve timestamps, so dates and date-times remain strings. <a id="req-serialization-yaml-quoted-dates"></a>Authors SHOULD still quote them for clarity and portability across authoring tools.

#### 15.3.4 Tags and Safe Parsing

<a id="req-serialization-yaml-tags"></a>Documents MUST NOT use application-specific, language-specific, or custom YAML tags. Implementations MUST use a safe parser mode that does not instantiate application objects or run constructors based on tags.

#### 15.3.5 Anchors and Aliases

<a id="req-serialization-yaml-aliases"></a>A conforming MCP Description YAML serialization MUST NOT use aliases, including alias-based recursive structures. Implementations MUST reject documents that contain aliases. Aliases introduce graph identity, recursion, and expansion, which the JSON-compatible data model cannot represent.

<a id="req-serialization-explicit-reuse"></a>Authors who need semantic reuse SHOULD repeat the value explicitly or use a specification-defined reuse mechanism, such as reusable components (see [Section 17](#17-reusable-components-and-local-references)).

#### 15.3.6 Merge Keys

<a id="req-serialization-yaml-merge-keys"></a>MCP Description tooling MUST NOT interpret YAML merge keys such as `<<` as merge operations, and MUST NOT apply merge semantics before validation. If a parser exposes `<<` as an ordinary string key, the document usually fails schema validation because `<<` is not a defined property.

### 15.4 Parsing and Validation Pipeline

<a id="req-serialization-yaml-validation"></a>A validator MUST NOT apply weaker semantic validation to YAML than to JSON. A conforming validator that accepts YAML MUST:

1. Parse YAML using the restrictions in Section 15.3 and reject unsupported YAML constructs.
2. Normalize the parsed result to the JSON-compatible data model.
3. Apply the same MCP Description JSON Schema used for JSON documents.
4. Apply the same cross-object and semantic validation used for JSON documents.

The MCP Description JSON Schema is authoritative for structural validation. It is published as JSON and applies to the decoded data model regardless of the source serialization.

### 15.5 Serialization Equivalence

A JSON document and a YAML document that decode to the same JSON-compatible data model are semantically equivalent. Source formatting, comments, quoting style, YAML block style, and object-key order do not affect semantic equivalence.

<a id="req-serialization-conversion"></a>Tools that convert between JSON and YAML MUST preserve the decoded data model. Only non-semantic source details, such as comments, scalar style, and mapping order, can differ.

### 15.6 Common Value Requirements

<a id="req-serialization-numbers"></a>Implementations MUST support finite IEEE 754 double-precision floating-point numbers.

MCP Description-defined properties do not accept `null`; a property without a value is omitted. A `null` inside a JSON-compatible value, such as an example value, an extension value, or `_meta`, is data and is preserved.

<a id="req-serialization-empty-collections"></a>An ordinary declaration collection with no entries MUST be omitted (see [Section 3.3](#33-optional-sections-and-ordinary-collections)); an explicit empty array or object is not conforming. <a id="req-serialization-empty-values-preserved"></a>Serialization MUST NOT convert omission into an explicit empty value. Implementations MUST preserve semantically significant empty values and MUST NOT convert them to omission. These forms are not interchangeable:

- `security: []` clears inherited security, while omitting `security` inherits it.
- `security: [{}]` allows anonymous access as an alternative.
- An empty scope array in a Security Requirement Object is significant.

<a id="req-serialization-value-formats"></a>String values MUST be valid JSON strings after decoding. URI values MUST conform to [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986). Email values SHOULD conform to [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322). Date values MUST conform to ISO 8601.

### 15.7 Schema Reference

<a id="req-serialization-schema-property"></a>MCP Description documents SHOULD include a `$schema` property that references the appropriate JSON Schema, for editor validation and tooling support. `$schema` has the same meaning in JSON and YAML. The referenced schema remains a JSON Schema when the document is serialized as YAML.

For the stable 0.9.0 release, the canonical `$schema` value is `https://mcpdesc.org/schema/mcp-description/0.9.0.json`. Earlier draft and release-candidate schema identifiers remain immutable. `$schema` does not replace the required `mcpdesc: 0.9.0` discriminator (see [Section 3.2](#32-root-object)).

```yaml
$schema: https://mcpdesc.org/schema/mcp-description/0.9.0.json
mcpdesc: 0.9.0
```

### 15.8 Producer and Consumer Guidance

<a id="req-serialization-negotiation"></a>Producers and consumers SHOULD explicitly communicate or negotiate the serialization when it cannot be determined from a file extension, media type, or other enclosing protocol metadata.

<a id="req-serialization-untrusted"></a>Implementations MUST treat JSON and YAML input as untrusted and impose reasonable document-size, nesting-depth, scalar-length, and collection-size limits.

### 15.9 Normalized YAML Presentation

Normalized MCP Description YAML is a presentation profile for YAML output. It gives each decoded MCP Description one predictable YAML spelling, so that generated documents, examples, and diffs stay consistent. It does not change YAML input requirements ([Section 15.3](#153-yaml-serialization)), document validity, or semantic equivalence ([Section 15.5](#155-serialization-equivalence)).

#### 15.9.1 Applicability

<a id="req-serialization-normalized-yaml-explicit"></a>A producer MUST apply this profile when it declares, or is explicitly asked, to emit normalized MCP Description YAML. <a id="req-serialization-normalized-yaml-examples-guidance"></a>Specification-authored MCP Description YAML examples SHOULD follow it.

<a id="req-serialization-normalized-yaml-consumer"></a>A consumer MUST NOT reject an otherwise conforming document because it does not use this presentation.

The profile applies to MCP Description documents only. Other YAML files, such as validation rule catalogs, fixture registries, and tool configuration, are outside its scope. Comments are not part of the data model, so a normalizer does not emit them; hand-authored examples can contain comments and still follow this profile.

#### 15.9.2 Data Model Preservation

<a id="req-serialization-normalized-yaml-model"></a>Normalization MUST operate on the parsed JSON-compatible data model. YAML input MUST still be parsed according to Section 15.3. Normalization MUST NOT use YAML 1.1 resolution or application-specific constructors to reinterpret parsed values. It MUST preserve every value and property, including significant empty values (see [Section 15.6](#156-common-value-requirements)). It MUST NOT coerce, add, remove, or repair data. Formatting MUST NOT substitute for validation.

For example, a parsed string `"true"` stays a string, and a parsed boolean `true` stays a boolean. An empty string stays an empty string; it does not become `null` and is not omitted.

#### 15.9.3 Layout

<a id="req-serialization-normalized-yaml-layout"></a>Normalized YAML MUST use UTF-8 without a byte-order mark, LF line endings, and exactly one final LF. It MUST NOT contain directives or document markers (`---` or `...`). It MUST use two spaces per indentation level and MUST NOT use tabs for indentation. Non-empty sequences and mappings MUST use block style; empty sequences and mappings MUST use `[]` and `{}`. Block sequences MUST be indented beneath their mapping keys. A non-empty mapping or sequence that is a sequence item MUST start on the same line as its `- ` indicator. Scalars MUST NOT be line-wrapped, regardless of length.

The following document illustrates the layout:

```yaml
mcpdesc: 0.9.0
info:
  name: chess-rating-server
  title: Chess Rating MCP Server
  version: 1.0.0
  description: "Ratings: FIDE standard"
protocolVersions:
  - "2025-11-25"
  - "2026-07-28"
tools:
  - name: get_player_rating
    description: Get the current FIDE standard rating for a chess player
    inputSchema:
      type: object
      properties:
        player_id:
          type: string
      required:
        - player_id
```

#### 15.9.4 Scalars

<a id="req-serialization-normalized-yaml-scalars"></a>JSON booleans, `null`, and numbers MUST be emitted as the unquoted scalars `true`, `false`, `null`, and numbers that decode to the same JSON value. Numbers MUST use the serialization defined by [RFC 8785, Section 3.2.2.3](https://www.rfc-editor.org/rfc/rfc8785#section-3.2.2.3). Each string value MUST be written using the first of the following rules that applies. Single-quoted scalars MUST NOT be used.

1. An empty string is written as `""`.
2. A string item of any `protocolVersions` array, at any level of the document, is written as a double-quoted scalar.
3. A string that contains a line feed is written as described in Section 15.9.5.
4. A plain-safe string, as defined below, is written as a plain scalar.
5. Any other string is written as a double-quoted scalar.

<a id="req-serialization-normalized-yaml-escaping"></a>The content of a double-quoted scalar MUST be the string serialization defined by [RFC 8785, Section 3.2.2.2](https://www.rfc-editor.org/rfc/rfc8785#section-3.2.2.2). That serialization escapes `"`, `\`, and control characters, and writes all other characters unescaped.

A string is plain-safe when all of the following hold:

- It contains no line break: line feed, carriage return, U+0085, U+2028, or U+2029.
- Written as a plain scalar at its position, it parses under Section 15.3, including the scalar resolution in Section 15.3.3, back to exactly the same string. This excludes strings that resolve to null, a boolean, or a number, such as `null`, `true`, `0.8`, and `123`; non-finite spellings such as `.inf`; strings with leading or trailing whitespace; strings that start with an indicator that cannot begin a plain scalar, such as `- a`, `[x`, `#x`, `&x`, `*x`, `!x`, `%x`, and `@x`; and strings that contain `: ` or ` #`.
- It does not match any of the YAML 1.1 patterns below.

YAML 1.1 processors resolve more plain scalars to non-string types than Section 15.3.3 does. To keep normalized output portable to them, a string is not plain-safe when the entire string matches one of the following case-sensitive regular expressions. They follow the YAML 1.1 type repository at <https://yaml.org/type/> as applied by common YAML 1.1 processors:

- Null: `~|null|Null|NULL`
- Boolean: `y|Y|yes|Yes|YES|n|N|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF`
- Integer: `[-+]?0b[01_]+`, `[-+]?0x[0-9a-fA-F_]+`, `[-+]?[0-9][0-9_]*`, and `[-+]?[0-9][0-9_]*(:[0-5]?[0-9])+`
- Floating point: `[-+]?([0-9][0-9_]*)?\.[0-9_]*`, `[-+]?([0-9][0-9_]*)?(\.[0-9_]*)?[eE][-+]?[0-9]+`, `[-+]?[0-9][0-9_]*(:[0-5]?[0-9])+\.[0-9_]*`, `[-+]?\.(inf|Inf|INF)`, and `\.(nan|NaN|NAN)`
- Timestamp: `[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}(([Tt]|[ \t]+)[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}(\.[0-9]+)?([ \t]*(Z|[-+][012]?[0-9](:[0-9]{2})?))?)?`
- Merge key: `<<`

YAML 1.1 defines these types individually; it has no "Core Schema". The YAML 1.2 Core Schema is not part of this test, so `0o12` remains plain. The float pattern published in the YAML 1.1 type repository also matches strings such as `1.0.0`; common processors do not apply that reading, and neither does this profile, so version strings such as `1.0.0` remain plain.

<a id="req-serialization-normalized-yaml-keys"></a>String mapping keys MUST follow the same rules as string values, except that a key is never written as a block scalar: a key that contains a line feed MUST be written as a double-quoted scalar. <a id="req-serialization-normalized-yaml-key-types"></a>Keys MUST remain strings after parsing.

#### 15.9.5 Multiline Strings

<a id="req-serialization-normalized-yaml-multiline"></a>A string value that contains a line feed SHOULD be written as a literal block scalar when that block scalar parses back to exactly the same string. The block header MUST use the chomping indicator that preserves the trailing line feeds: `|-` for none, `|` for exactly one, and `|+` for more than one. When the first non-empty line of the string begins with a space, the header MUST place the indentation indicator `2` before the chomping indicator, for example `|2-`. A multiline string that is not written as a literal block scalar MUST be written as a double-quoted scalar.

A literal block scalar cannot be used in the following cases, among others:

- The string contains a carriage return, U+0085, U+2028, U+2029, or another character that YAML requires to be escaped.
- The string consists only of spaces, tabs, and line feeds, and contains at least one space or tab.
- The string is the last scalar in the document and would need `|+`, because its trailing line feeds would conflict with the single final LF.

```yaml
description: |
  Searches documents.
  Returns ranked results.
summary: |-
  First line
  Second line
```

#### 15.9.6 Ordering

<a id="req-serialization-normalized-yaml-ordering"></a>This profile does not define a mapping-key order, and requesting normalized YAML does not by itself select the document-oriented ordering profile in [Section 18](#18-document-oriented-serialization-ordering). When that profile is also selected, by the caller or by the producer's declared behavior, it MUST be applied to recognized structures. Otherwise, mapping keys MUST keep their input order. Array order and named-map entry order MUST always be preserved. Arbitrary keys, arrays, and opaque values MUST NOT be sorted.

#### 15.9.7 Scalar Examples

<a id="req-serialization-normalized-yaml-examples"></a>The following spellings illustrate the rules in Section 15.9.4:

| JSON-compatible value | Normalized YAML | Reason |
| --- | --- | --- |
| string `2026-07-28` | `"2026-07-28"` | YAML 1.1 timestamp |
| string `0.8` | `"0.8"` | Number under Section 15.3.3 |
| string `123` | `"123"` | Number under Section 15.3.3 |
| string `true` | `"true"` | Boolean under Section 15.3.3 |
| string `TRUE` | `"TRUE"` | YAML 1.1 boolean |
| string `on` | `"on"` | YAML 1.1 boolean |
| string `null` | `"null"` | Null under Section 15.3.3 |
| string `~` | `"~"` | YAML 1.1 null |
| string `012` | `"012"` | YAML 1.1 integer |
| string `<<` | `"<<"` | YAML 1.1 merge key |
| empty string | `""` | Rule 1 |
| string `draft` in `protocolVersions` | `"draft"` | Rule 2 |
| string `Search: documents` | `"Search: documents"` | Contains `: ` |
| string `Hello # world` | `"Hello # world"` | Contains ` #` |
| string `ordinary` | `ordinary` | Plain-safe |
| string `0o12` | `0o12` | Plain-safe |
| string `1.0.0` | `1.0.0` | Plain-safe |
| boolean `true` | `true` | JSON boolean |
| number `0.8` | `0.8` | JSON number |
| null | `null` | JSON null |

These requirements govern output presentation only. Other YAML spellings remain conforming when they decode to the same valid MCP Description data model.
