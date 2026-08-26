# Proposal 0010: Support JSON and YAML Serializations

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-25
- Last updated: 2026-08-26
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/23
- Review period: 2026-08-26 through 2026-09-25

## Summary

Define MCP Description as a JSON-compatible data model with two equally conforming textual serializations: JSON and YAML. JSON follows RFC 8259; YAML follows YAML 1.2.2's JSON schema plus strict restrictions that guarantee a deterministic mapping to the same JSON-compatible data model. Neither serialization has greater semantic or conformance status.

The proposal resolves the current inconsistency in Draft 1, where normative text requires JSON while repository examples and ecosystem usage include YAML. Both serializations use the same JSON Schema and semantic-validation pipeline after decoding.

## Problem

MCP Description 0.8.0 Draft 1 currently states:

* an MCP Description document **MUST** be JSON encoded in UTF-8;
* the recommended extension is `.mcpdesc.json`; and
* the recommended media type is `application/mcp-description+json`.

However, the same project and its historical tooling use YAML examples, including a `full-featured.yaml` example. MCP Description is also positioned as an OpenAPI-like design-time and governance artifact, where YAML is a common authoring format.

The present state creates ambiguity:

* Is YAML a conforming MCP Description or only an informal example notation?
* May validators accept YAML without violating the specification?
* If YAML is accepted, which YAML version and scalar-resolution rules apply?
* Are YAML aliases, custom tags, merge keys, duplicate keys, non-string mapping keys, or multiple documents allowed?
* What file extensions and media types should tools use?

Simply saying “YAML is allowed” is insufficient because unrestricted YAML can represent values and graph structures that are not JSON-compatible and can introduce parser-dependent behavior and security risks.

## Goals

* Define one serialization-independent MCP Description data model using JSON-compatible types.
* Give JSON and restricted YAML equal status as conforming serializations.
* Define JSON serialization using RFC 8259 and YAML serialization using YAML 1.2.2 with JSON-schema scalar resolution.
* Define a deterministic YAML-to-MCP-Description mapping.
* Restrict YAML features that cannot be represented faithfully in the JSON data model.
* Define recommended YAML file extensions and media type.
* Preserve the existing JSON Schema as the normative structural validation schema.
* Avoid changing the semantics of any MCP Description field.
* Preserve all existing conforming JSON documents.

## Non-goals

* Support arbitrary YAML object graphs or YAML-specific semantic types.
* Preserve YAML comments, anchors, aliases, scalar style, key order, or formatting through round trips.
* Define TOML, XML, JSON5, HJSON, or other serializations.
* Require every MCP Description implementation to parse or emit both serializations.
* Replace JSON Schema with a YAML-specific schema language.
* Define a canonical byte serialization for signing or hashing.
* Require a producer to emit a serialization it does not claim to support.

## Background and primary references

* MCP Description 0.8.0 Draft 1, Format and Serialization sections: https://github.com/mcpdesc/mcpdesc-specification/blob/main/spec/draft/mcp-description.md
* MCP Description repository examples: https://github.com/mcpdesc/mcpdesc-specification/tree/main/spec/draft
* RFC 8259, The JavaScript Object Notation (JSON) Data Interchange Format: https://www.rfc-editor.org/rfc/rfc8259
* YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/
* RFC 9512, YAML Media Type, which registers `application/yaml` and the `+yaml` structured syntax suffix: https://www.rfc-editor.org/rfc/rfc9512
* OpenAPI 3.1 as established prior art for a JSON-compatible model commonly serialized as JSON or YAML: https://spec.openapis.org/oas/v3.1.1.html

## Proposed normative behavior

### 1. MCP Description data model

An MCP Description document is a JSON-compatible data model composed only of:

* objects whose property names are strings;
* arrays;
* strings;
* finite JSON numbers;
* booleans; and
* null.

The semantic meaning of an MCP Description is defined by this data model, independent of whether it was parsed from JSON or YAML.

Property ordering is not significant unless an individual field explicitly defines array ordering semantics. Mapping serialization order MUST NOT affect conformance.

A conforming document consumer or producer MUST support at least one conforming serialization and MUST declare whether it supports JSON, YAML, or both for each applicable input or output capability.

### 2. JSON serialization

An MCP Description MAY be serialized as JSON.

A consumer that claims JSON input support MUST accept conforming JSON MCP Description documents. A producer that claims JSON output support MUST emit conforming JSON MCP Description documents. General MCP Description conformance does not make JSON support mandatory or preferred over YAML support.

JSON serialization MUST conform to RFC 8259 and MUST be encoded in UTF-8.

The recommended JSON file extension remains:

```text
.mcpdesc.json
```

The recommended JSON media type remains:

```text
application/mcp-description+json
```

### 3. YAML serialization

An MCP Description MAY be serialized as YAML 1.2.2 using the JSON schema defined by Section 10.2.1.3 of the YAML 1.2.2 specification for scalar resolution.

A consumer that claims YAML input support MUST accept YAML MCP Description documents that satisfy this proposal's restricted profile and MUST reject documents that violate it. A producer that claims YAML output support MUST emit only documents that satisfy the restricted profile. General MCP Description conformance does not make YAML support mandatory or preferred over JSON support.

A YAML MCP Description MUST consist of exactly one YAML document and MUST decode to the JSON-compatible MCP Description data model defined above.

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

The project-specific `application/mcp-description+yaml` media type is not registered by RFC 9512. Its `+yaml` structured syntax suffix and the generic `application/yaml` media type are registered by RFC 9512. Generic tooling SHOULD use `application/yaml` when the project-specific media type is unavailable or inappropriate.

### 4. YAML compatibility restrictions

To guarantee deterministic interoperability with the JSON data model, YAML MCP Description documents MUST follow these restrictions.

#### 4.1 One document only

A YAML stream MUST contain exactly one document. Multi-document YAML streams MUST be rejected.

#### 4.2 String mapping keys only

Every YAML mapping key MUST resolve to a string.

Complex keys, sequence keys, numeric keys, boolean keys, null keys, and other non-string keys MUST be rejected.

#### 4.3 Duplicate mapping keys

A YAML mapping MUST NOT contain duplicate keys after scalar resolution.

Implementations MUST reject duplicate keys rather than silently keeping the first or last value.

#### 4.4 YAML JSON-schema scalar resolution

A YAML processor MUST use the YAML 1.2.2 JSON schema for scalar resolution. A YAML scalar used as an MCP Description value MUST resolve to one of the JSON-compatible scalar types: string, finite number, boolean, or null.

The YAML 1.2.2 JSON schema does not implicitly resolve timestamps. Date-time and date values therefore remain strings; authors SHOULD still quote them for clarity and portability across authoring tools.

Non-finite numeric values such as positive infinity, negative infinity, and NaN MUST be rejected.

#### 4.5 Custom tags

Application-specific, language-specific, or custom YAML tags MUST NOT be used.

Implementations MUST use a safe parser mode that does not instantiate application objects or execute constructors based on tags.

#### 4.6 Anchors, aliases, and graph identity

YAML aliases and alias-based recursive structures MUST NOT be used in a conforming MCP Description YAML serialization.

Implementations SHOULD reject documents containing aliases. This restriction avoids graph identity, recursion, and expansion semantics that have no representation in the JSON data model.

Authors who need semantic reuse should use MCP Description's own reusable-component mechanism if standardized, or duplicate the value explicitly.

#### 4.7 Merge keys

YAML merge-key conventions such as `<<` MUST NOT be interpreted as structural merge operations by MCP Description tooling.

If a parser exposes `<<` as an ordinary string key, the resulting MCP Description will normally fail the MCP Description schema because `<<` is not a defined property. Implementations MUST NOT apply YAML merge semantics before MCP Description validation.

### 5. Parsing and validation pipeline

A conforming validator that accepts YAML MUST:

1. parse the YAML using the restrictions above;
2. reject unsupported YAML constructs;
3. normalize the parsed representation to the JSON-compatible MCP Description data model;
4. apply the same MCP Description JSON Schema used for JSON documents; and
5. apply the same cross-object and semantic validation used for JSON documents.

A validator MUST NOT have weaker semantic validation for YAML than for JSON.

### 6. Serialization equivalence

If a JSON document and a YAML document decode to the same JSON-compatible data model, they are semantically equivalent MCP Description documents, subject to the ordinary MCP Description semantic-equivalence rules.

Source formatting, comments, quoting style, YAML block style, and object-key order do not participate in semantic equivalence.

### 7. `$schema`

The `$schema` property remains a JSON Schema URI and has the same meaning in JSON and YAML serializations.

A YAML document MAY contain:

```yaml
$schema: https://mcpdesc.org/schema/0.8.0.json
mcpdesc: 0.8.0
```

The referenced schema remains a JSON Schema even though the instance document is serialized as YAML.

### 8. Producer guidance

Producers and consumers SHOULD explicitly communicate or negotiate the serialization when it cannot be determined from a file extension, media type, or other enclosing protocol metadata.

Implementations MAY support JSON, YAML, or both according to their use case and declared capabilities.

Tools that convert between JSON and YAML MUST preserve the decoded MCP Description data model, subject only to non-semantic source details such as comments, scalar style, and mapping order.

## Schema impact

The MCP Description JSON Schema does not require structural changes solely to support YAML because validation occurs against the normalized JSON-compatible data model.

Normative specification text must change in:

* Section 2 terminology, so an MCP Description Document is not defined only as a JSON document;
* Section 3.1 Format;
* Section 15 Serialization;
* Section 16 conformance requirements; and
* example and file-extension guidance.

The JSON Schema remains published as JSON and remains authoritative for structural instance validation.

## Examples

### Equivalent JSON

```json
{
  "$schema": "https://mcpdesc.org/schema/0.8.0.json",
  "mcpdesc": "0.8.0",
  "info": {
    "name": "chess-rating-server",
    "version": "1.0.0"
  },
  "protocolVersions": ["2026-07-28"],
  "transports": [
    {
      "type": "stdio",
      "command": "chess-rating",
      "args": ["serve"]
    }
  ]
}
```

### Equivalent YAML

```yaml
$schema: https://mcpdesc.org/schema/0.8.0.json
mcpdesc: 0.8.0
info:
  name: chess-rating-server
  version: 1.0.0
protocolVersions:
  - "2026-07-28"
transports:
  - type: stdio
    command: chess-rating
    args:
      - serve
```

Both documents decode to the same MCP Description data model and are semantically equivalent.

### Quoted date-time guidance

Preferred for authoring clarity:

```yaml
observedAt: "2026-08-25T12:30:00Z"
```

The YAML 1.2.2 JSON schema already resolves this value as a string. The quotes make that intent explicit to authors and tools.

### Invalid YAML alias use

```yaml
shared: &shared
  type: object

tools:
  - name: one
    inputSchema: *shared
```

This is not a conforming YAML MCP Description serialization under this proposal. Semantic reuse should use a specification-defined component/reference mechanism rather than YAML graph aliases.

## Compatibility

All existing conforming JSON MCP Description documents remain conforming without modification.

The data model and field semantics do not change.

Existing JSON-only consumers remain conforming if they claim only JSON serialization support. Existing YAML-only consumers can conform if they implement the complete restricted YAML profile. Implementations that claim support for both serializations must apply the same structural and semantic validation to both.

Existing tools that already accept YAML may need to tighten parser behavior to reject aliases, duplicate keys, custom tags, multi-document streams, non-string mapping keys, and non-finite numeric values.

## Migration

No migration is required for JSON documents.

Existing YAML examples should be reviewed against the restrictions in this proposal and renamed using `.mcpdesc.yaml` where appropriate.

The specification's current statement that every MCP Description **MUST be a JSON document** should be replaced with a data-model definition plus separate JSON and YAML serialization subsections.

Documentation should make clear that:

* JSON and restricted YAML are equally conforming serializations;
* both decode to the same JSON-compatible MCP Description data model; and
* the authoritative structural schema remains JSON Schema and applies after either serialization is decoded.

## Security and privacy considerations

YAML parsers have historically exposed risks that are not present in simple JSON parsers, including unsafe object construction, alias expansion, and inconsistent duplicate-key handling.

Implementations that support YAML MUST use a safe loading mode and MUST NOT instantiate application objects from YAML tags.

Implementations MUST impose reasonable document size, nesting depth, scalar length, and collection-size limits for both JSON and YAML.

YAML aliases are disallowed to reduce expansion and recursive-graph risks.

Duplicate mapping keys are rejected to avoid parser-dependent interpretation and security-sensitive key shadowing.

Supporting YAML does not change the existing requirement to treat MCP Description content as untrusted input.

## Alternatives considered

### JSON only

This is the current normative position and provides the smallest implementation surface. It conflicts with repository practice, reduces authoring ergonomics, and leaves YAML-supporting tools without a shared interoperability contract.

### YAML as fully equivalent with unrestricted YAML 1.2.2 features

This is simple to state but allows graph structures, custom tags, parser-specific scalar resolution, duplicate-key ambiguity, and other values that cannot map cleanly to the JSON data model. It also creates unnecessary security risk.

### YAML as non-conforming convenience syntax

Tools could be allowed informally to preprocess YAML into JSON while the specification remains JSON-only. That preserves ambiguity around interoperability, file naming, parser behavior, and conformance and does not resolve the current contradiction.

### Require both serializations from every consumer

This maximizes document portability but imposes two parsers and YAML's additional security surface on every consumer. The proposed capability-based conformance model lets an implementation support JSON, restricted YAML, or both without giving either serialization greater semantic status.

### Use JSON5 instead of YAML

JSON5 improves comments and trailing-comma ergonomics but has substantially less adoption than YAML in API-description workflows and would not resolve the repository's existing YAML usage.

## Open questions

* Should YAML anchors without aliases be allowed, since they have no effect on the resulting JSON data model, or rejected uniformly for simpler tooling?
* Should the repository publish every normative example in both JSON and YAML, or only selected paired examples?

## Implementation and validation plan

1. Rewrite the Format and Serialization sections around a JSON-compatible data model.
2. Define JSON and restricted YAML as equally conforming serializations with capability-based implementation claims.
3. Add the restricted YAML 1.2.2 JSON-schema serialization rules and file-extension guidance.
4. Add YAML parser conformance fixtures for valid mappings, arrays, strings, booleans, nulls, and finite numbers.
5. Add negative fixtures for duplicate keys, aliases, custom tags, multiple documents, non-string keys, NaN, and infinity.
6. Add paired JSON/YAML fixtures that normalize to the same data model and produce identical semantic-validation results.
7. Rename or supplement the repository's YAML examples using the recommended `.mcpdesc.yaml` naming convention.
8. Add media-type guidance that distinguishes RFC 9512's registered `application/yaml` media type and `+yaml` structured syntax suffix from the project-specific, unregistered media type.
9. Update conformance documentation and the changelog.

## Decision record

Pending community review.
