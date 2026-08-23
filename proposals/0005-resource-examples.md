# Proposal 0005: Named Resource and Resource Template Examples

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-23
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/10
- Related proposals: Proposal 0004

## Summary

Add optional named `examples` maps to Resource and Resource Template Objects. A static Resource example supplies a completed MCP `resources/read` result for the declared URI. A Resource Template example pairs one concrete expanded URI with its completed read result.

The design uses native MCP Resource Contents for text and binary examples. It supports documentation, contract testing, and deterministic mocks without defining JSON-RPC envelopes, Resource error catalogues, external fixture retrieval, or dynamic mock behavior.

## Problem

The 0.8.0 draft declares static Resources and parameterized Resource Templates but does not provide portable concrete content examples.

A Resource declaration identifies a URI and optional MIME type but cannot show representative contents. A Resource Template identifies an RFC 6570 URI template but cannot show a concrete expansion and the contents returned when that URI is read.

This causes several gaps:

- documentation cannot display realistic Resource contents from the description alone;
- mock generators must synthesize text or binary values or use private extensions;
- template authors cannot demonstrate valid concrete expansions;
- tools cannot statically check example result shape, URI relationships, or MIME-type consistency; and
- examples cannot show that one `resources/read` operation may return multiple Resource Contents entries.

Proposal 0004 addresses the related but distinct Tool invocation/result contract. Resource examples warrant separate review because Resource reads have URI inputs, text/blob content choices, template expansion, multiple returned entries, freshness, and JSON-RPC-only error behavior.

## Goals

- Represent multiple named examples for static Resources and Resource Templates.
- Use completed native MCP `resources/read` result payloads.
- Support text and base64-encoded binary Resource Contents.
- Support multiple content entries returned by one read.
- Pair Resource Template examples with concrete expanded URIs.
- Make result shape, protocol applicability, URI-template expansion, URI relationships, and MIME-type consistency testable.
- Support generated documentation, contract tests, and deterministic mock fixtures.
- Reuse the simple named-map convention established by Proposal 0004 without forcing Tool and Resource examples into one object shape.
- Avoid implying that examples guarantee live contents or freshness.

## Non-goals

- Define Tool or Prompt examples.
- Define complete JSON-RPC request or response envelopes.
- Define Resource read-error examples or an error catalogue. MCP Resource read failures are JSON-RPC protocol errors.
- Define task, input-required, subscription, update-notification, or multi-round-trip transcripts.
- Define dynamic content generation, request matching, state transitions, delays, or a mock-server behavior language.
- Assert that example contents are current, immutable, exhaustive, or safe to load into model context.
- Add reusable root components or cross-document example references.
- Retrieve external example values.
- Make OpenAPI a normative dependency.

## Background and primary references

- MCP 2026-07-28 Resources, including Resource Contents, `resources/read`, URI templates, and error handling: https://modelcontextprotocol.io/specification/2026-07-28/server/resources
- RFC 6570 URI Templates: https://www.rfc-editor.org/rfc/rfc6570
- OpenAPI 3.1.1 Example Object: https://spec.openapis.org/oas/v3.1.1.html#example-object
- MCP Description draft Resource rules: `spec/draft/sections/10-resources.md`
- Proposal 0004: named Tool invocation and result examples

MCP Resource Contents contain either text in `text` or base64-encoded binary data in `blob`, along with a URI and optional MIME type. A read may return multiple contents entries, including when a directory-like Resource resolves to several files.

MCP reports missing Resources and read failures through JSON-RPC errors rather than a Resource-result equivalent of Tool `isError`. Error examples are therefore not part of the Resource Example Object.

## Proposed normative behavior

### 1. Shared named-map convention

A Resource or Resource Template Object MAY contain `examples`, a map from a local example name to the example object appropriate to the containing declaration.

The map MUST contain at least one entry when present. Each local name MUST match:

```text
^[A-Za-z0-9._-]+$
```

Names are case-sensitive and scoped to the containing declaration. Declarations for the same `uri` or `uriTemplate` in disjoint protocol scopes have independent example maps. Entry order is not semantically significant.

The map key is the example's human-meaningful label and stable local selection name. Resource Example Objects do not add separate `summary` or `description` fields in 0.8.0.

### 2. Static Resource Example Object

A static Resource Example Object has one field:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `result` | object | **Yes** | Complete applicable completed `resources/read` result payload for the declared Resource URI, excluding the JSON-RPC envelope. |

The object does not allow additional properties in 0.8.0.

The input URI is implicit from the containing Resource's `uri`; duplicating it at the example level would permit contradictory values without adding information.

`result` represents the value inside the JSON-RPC response's `result` member. It MUST conform structurally to a completed Resource read result in the effective MCP protocol revision, including fields required by that revision. It is not a JSON-RPC envelope.

### 3. Resource Template Example Object

A Resource Template Example Object has these fields:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `uri` | string | **Yes** | Concrete Resource URI used for the example read. |
| `result` | object | **Yes** | Complete applicable completed `resources/read` result payload for that URI, excluding the JSON-RPC envelope. |

The object does not allow additional properties in 0.8.0.

`uri` represents `resources/read.params.uri`, not an object of template variables. It MUST be a valid expansion of the containing `uriTemplate` under RFC 6570.

Using the concrete URI avoids inventing a reverse template-binding algorithm and shows the exact wire-level value needed by documentation and mock tooling.

### 4. Resource Contents

Each example `result` MUST contain the Resource Contents array required by the applicable MCP revision. Every entry MUST conform to a Resource Contents type supported by that revision.

Each content entry MUST contain exactly one of:

- `text`, containing Resource text; or
- `blob`, containing base64-encoded binary data.

An example MAY contain multiple content entries. Consumers MUST preserve their order and MUST NOT assume that every returned content URI equals the requested URI. A directory, collection, or compound Resource can legitimately return contents for several related URIs.

Binary example data MUST be valid base64. `size`, when declared on a static Resource, describes raw content bytes rather than base64 string length.

Task, input-required, and other non-completed result variants are outside the 0.8.0 Resource example model.

### 5. URI and MIME-type consistency

For a static Resource example:

- the requested URI is the containing Resource's `uri`;
- at least one returned content entry SHOULD identify that URI unless the Resource's documented semantics explain a collection or indirection; and
- every returned content URI MUST be valid under the applicable MCP revision.

For a Resource Template example:

- the example `uri` MUST be a valid RFC 6570 expansion of the containing `uriTemplate`;
- at least one returned content entry SHOULD identify the concrete example URI unless the template's documented semantics explain a collection or indirection; and
- every returned content URI MUST be valid under the applicable MCP revision.

When the containing Resource or Resource Template declares `mimeType`, a returned content entry corresponding to the requested URI SHOULD use the same MIME type. A differing or more specific type is permitted only when it does not contradict the declaration's documented representation. Validators SHOULD warn about unexplained mismatches rather than treating every mismatch as a structural error because template and collection declarations can describe a broader type than individual returned contents.

A content entry's own `mimeType` is authoritative for rendering that entry.

For a static Resource with `size`, tooling MAY verify the example's raw text or decoded binary size. A mismatch SHOULD be reported as a warning because the declaration and example can represent different observations of mutable content.

### 6. Errors and freshness

Resource read errors are JSON-RPC errors under MCP and are not Resource Examples in 0.8.0. This includes missing Resources, invalid concrete template URIs, authorization failures expressed as protocol errors, and internal read failures.

Examples are illustrative snapshots. They do not assert that:

- live Resource contents equal the example;
- the example is current at description-consumption time;
- cache metadata applies to every read;
- a Resource is immutable; or
- every possible template expansion or returned content entry is documented.

Revision-supported cache or result metadata MAY appear in a completed example result. Consumers MUST interpret it as part of the example, not as a guarantee about a live server.

### 7. Documentation and mock use

Documentation tooling SHOULD preserve example names, concrete template URIs, result fields, and content order.

Mock and contract-test tooling MAY expose explicit selection by example name. For a static Resource, the declared URI supplies the mock request key. For a Resource Template, the example's concrete `uri` supplies it.

This specification does not define wildcard matching, template-wide fallback behavior, or a default example. Tooling selecting an example without an explicit name or exact URI match MUST use a deterministic, documented policy.

A mock implementation MUST NOT fetch the live Resource or dereference URIs while loading or serving an inline example.

### 8. Protocol projection and round-tripping

Resource examples are MCP Description metadata and are not fields of MCP Resource or Resource Template list values.

Projection to MCP `resources/list` or `resources/templates/list` values MUST omit mcpdesc `examples` unless an independently specified MCP extension defines an equivalent destination. MCP Description round-tripping MUST preserve examples and names.

Protocol-version projection selects the applicable declaration and preserves its example map. It MUST NOT merge maps from declarations with the same `uri` or `uriTemplate` but disjoint protocol scopes.

### 9. No external values in 0.8.0

The 0.8.0 Resource Example Objects have no OpenAPI-style `externalValue` field.

External values are especially tempting for large text and binary Resources, but they introduce unresolved questions about base URIs, retrieval requirements, media types, encodings, mutability, integrity, credentials, SSRF, offline validation, and deterministic builds.

Inline text and base64 content establish interoperable semantics. Large external fixtures may be considered later with explicit resolution, integrity, size, and media-type rules.

## Schema impact

The 0.8.0 schema will add definitions equivalent in intent to:

```json
{
  "resourceExample": {
    "type": "object",
    "required": ["result"],
    "properties": {
      "result": { "$ref": "#/$defs/completedReadResourceResultExample" }
    },
    "additionalProperties": false
  },
  "resourceTemplateExample": {
    "type": "object",
    "required": ["uri", "result"],
    "properties": {
      "uri": { "type": "string", "format": "uri" },
      "result": { "$ref": "#/$defs/completedReadResourceResultExample" }
    },
    "additionalProperties": false
  }
}
```

Separate named-map definitions will constrain keys and map values for Resources and Resource Templates. `completedReadResourceResultExample` and Resource Contents definitions will represent result fields supported by the draft's described MCP revisions.

Semantic validation is required for:

- completed result compatibility with the effective MCP revision;
- Resource Template URI expansion under RFC 6570;
- content URI relationships;
- text/blob exclusivity and binary base64 validity where not structurally asserted;
- declared and returned MIME-type consistency diagnostics; and
- optional raw-size diagnostics.

`schemas/latest.json` remains pinned to stable 0.7.0. No frozen schema changes.

## Examples

### Static text Resource

```json
{
  "protocolVersions": ["2026-07-28"],
  "uri": "file:///project/src/main.rs",
  "name": "main_rs",
  "mimeType": "text/x-rust",
  "examples": {
    "hello-world": {
      "result": {
        "resultType": "complete",
        "contents": [
          {
            "uri": "file:///project/src/main.rs",
            "mimeType": "text/x-rust",
            "text": "fn main() {\n    println!(\"Hello world!\");\n}\n"
          }
        ]
      }
    }
  }
}
```

### Static binary Resource

```json
{
  "protocolVersions": ["2026-07-28"],
  "uri": "asset:///logo.png",
  "name": "logo",
  "mimeType": "image/png",
  "examples": {
    "small-logo": {
      "result": {
        "resultType": "complete",
        "contents": [
          {
            "uri": "asset:///logo.png",
            "mimeType": "image/png",
            "blob": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"
          }
        ]
      }
    }
  }
}
```

The shortened base64 value is illustrative; normative fixtures must use complete valid encoded data.

### Resource Template expansion

```json
{
  "protocolVersions": ["2026-07-28"],
  "uriTemplate": "chess://games/{game_id}",
  "name": "game_detail",
  "mimeType": "application/json",
  "examples": {
    "example-game": {
      "uri": "chess://games/1234",
      "result": {
        "resultType": "complete",
        "contents": [
          {
            "uri": "chess://games/1234",
            "mimeType": "application/json",
            "text": "{\"id\":\"1234\",\"result\":\"1-0\"}"
          }
        ]
      }
    }
  }
}
```

### Resource returning multiple contents

```json
{
  "protocolVersions": ["2026-07-28"],
  "uri": "file:///project/src/",
  "name": "source_directory",
  "mimeType": "inode/directory",
  "examples": {
    "two-files": {
      "result": {
        "resultType": "complete",
        "contents": [
          {
            "uri": "file:///project/src/main.rs",
            "mimeType": "text/x-rust",
            "text": "fn main() {}\n"
          },
          {
            "uri": "file:///project/src/lib.rs",
            "mimeType": "text/x-rust",
            "text": "pub fn answer() -> u8 { 42 }\n"
          }
        ]
      }
    }
  }
}
```

The returned content URIs differ from the requested directory URI by design.

## Compatibility

Classification: **compatible addition** within the 0.8.0 Community Working Draft.

The fields are optional. Existing 0.7.0 and 0.8.0 documents remain valid, and stable 0.7.0 artifacts do not change. Consumers not using examples can ignore them after validating or preserving their containing declarations.

Examples must not be copied into MCP list results. Projection omits them unless a separate MCP extension defines a destination.

## Migration

No migration is required for existing documents.

Authors may migrate existing documentation or captures as follows:

1. create a named example under the static Resource or Resource Template declaration;
2. for a static Resource, use the declaration's `uri` as the implicit read input;
3. for a Resource Template, copy the exact concrete `resources/read.params.uri` into `uri`;
4. copy the completed `resources/read` result payload into `result`, omitting only the JSON-RPC envelope;
5. preserve text, base64 binary data, MIME types, content URIs, order, and applicable result metadata;
6. verify the concrete template URI is a valid expansion;
7. redact secrets, personal data, internal paths, and proprietary content; and
8. avoid presenting mutable observed content as current or canonical.

A capture tool MUST NOT associate independently observed requests and results without authoritative correlation. Synthesized examples should be identified as generated in surrounding tooling and reviewed before publication.

## Security and privacy considerations

- Resource examples can expose source code, credentials, personal data, customer documents, internal paths, proprietary assets, or infrastructure identifiers. Authors MUST NOT include secrets and SHOULD use conspicuously fictitious content.
- Binary examples may conceal sensitive data not visible in source review. Authors SHOULD decode and inspect binary fixtures before publication.
- Example URIs are untrusted data. Consumers MUST NOT dereference them automatically.
- Documentation UIs must render text and media safely and prevent active-content injection.
- Resource contents can be large or adversarial. Implementations SHOULD impose documented encoded-size, decoded-size, and processing limits.
- MIME types are untrusted hints and MUST NOT override safe content handling.
- Examples can contain prompt-like instructions. Clients MUST NOT grant them greater trust than live untrusted Resource content.
- Automatic external retrieval is excluded to avoid SSRF, mutable content, integrity ambiguity, and credential leakage.
- Real observed captures require consent, minimization, retention controls, and redaction outside this specification.

## Alternatives considered

### Put example text or blob directly on the Resource declaration

Rejected. It supports only one representation, cannot preserve the native `resources/read` result, and does not support multiple returned contents or revision-specific metadata.

### Use one generic Example Object for Tools and Resources

Rejected. Tool examples pair object arguments with success or execution-error results. Resource examples use URI inputs, content arrays, template expansion, and JSON-RPC error behavior. Shared map conventions do not require identical payload objects.

### Require one returned content entry matching the requested URI

Rejected. MCP explicitly allows one read to return multiple contents, including directory-like Resources. URI consistency is contextual rather than universally one-to-one.

### Store Resource Template variables instead of a concrete URI

Rejected. RFC 6570 expansion is directional, variable typing is not defined by the Resource Template Object, and the actual MCP request uses a concrete URI. Storing that URI is simpler and wire-accurate.

### Include Resource read-error examples

Deferred. MCP represents these as JSON-RPC errors, which would require a separate protocol-error example model rather than a Resource Result example.

### Add `summary` and `description`

Deferred. The map key supplies a stable meaningful label. Prose metadata can be added compatibly after a demonstrated tooling requirement.

### Copy OpenAPI `externalValue`

Deferred. Large Resources make it attractive, but portable support requires explicit retrieval, integrity, media-type, encoding, offline, and security rules.

### Add reusable root example components

Deferred. Inline examples are sufficient to establish initial interoperable semantics without reference-resolution complexity.

### Define template-wide mock matching

Rejected for core 0.8.0. Matching arbitrary expansions, fallback responses, dynamic values, and state belongs to a mock behavior language.

## Open questions

1. Should unexplained declared/returned MIME-type mismatch be a warning or an error after implementation experience?
2. Should static Resource `size` mismatches remain warnings for mutable examples?
3. Should future Resource examples support JSON-RPC errors through a general protocol-error example model?
4. Should large external fixtures be supported with integrity and media-type metadata?
5. Should one prose metadata field be added after documentation-tool experience?

None blocks review of the inline completed-result model.

## Implementation and validation plan

After acceptance, implement on a feature branch. Proposal 0004 may share the branch if both proposals are accepted, while retaining separate commits and independently reviewable changes.

1. add Resource and Resource Template `examples` rules to `spec/draft/sections/10-resources.md`;
2. add structural definitions to `schemas/mcp-description/0.8.0.json` and synchronize `schemas/draft.json`;
3. regenerate `spec/draft/mcp-description.md` through the repository view workflow;
4. implement semantic validation for result revisions, URI-template expansion, content URIs, MIME types, base64 data, and optional size diagnostics;
5. add valid fixtures for static text, static binary, template expansion, multiple contents, and applicable result metadata;
6. add invalid fixtures for empty maps, invalid names, missing fields, invalid template expansions, malformed results, text/blob conflicts, invalid base64, and revision-incompatible fields;
7. add warning fixtures for explainable MIME-type and mutable-size inconsistencies where specified;
8. update at least one complete YAML example and relevant Resource guidance;
9. add compatibility, migration, and draft changelog entries;
10. verify projection omits examples from MCP Resource and Resource Template list values; and
11. run `npm test` and `git diff --check` without bypassing failures.

Acceptance criteria:

- static Resource examples represent applicable completed read results for the declared URI;
- Resource Template examples pair a valid concrete expansion with an applicable completed read result;
- native MCP text and binary Resource Contents are supported;
- one read can return multiple content entries;
- URI, template, MIME-type, base64, size, and protocol-revision behavior is specified and testable;
- JSON-RPC errors and incomplete workflows remain out of scope;
- examples support documentation and deterministic mocks without claiming freshness or live behavior;
- stable 0.7.0 artifacts and `schemas/latest.json` remain unchanged; and
- all affected draft artifacts remain synchronized.

## Decision record

Pending review.

This proposal is intentionally independent from Proposal 0004. If both are accepted, their implementations may share a feature branch and infrastructure but should remain separated into reviewable commits so either change can progress independently.

AI assistance disclosure: GitHub Copilot assisted with repository analysis, primary-source comparison, design evaluation, issue drafting, and proposal drafting. The human author remains responsible for review and acceptance.
