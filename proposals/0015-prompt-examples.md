# Proposal 0015: Named Prompt Invocation and Result Examples

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-28
- Target version: 0.8.0 Draft 4
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/39
- Review period: 2026-08-28 through 2026-09-27

## Summary

Add an optional `examples` map to each Prompt Object. Every named Prompt Example pairs one complete Prompt argument object with one completed MCP `GetPromptResult`, excluding the JSON-RPC envelope.

The design extends the named-example model already used by Tools, Resources, and Resource Templates. It also adds a `components.promptExamples` namespace so Prompt examples can participate in the existing local-reference model.

## Problem

Draft 3 describes Prompt declarations returned by `prompts/list`, but it has no portable representation for a concrete `prompts/get` invocation and result. Prompt retrieval observed in both the 2025-11-25 and 2026-07-28 Everything Server Inspector sessions was therefore absent from the enriched MCP Description exports.

The missing request/result pair prevents documentation, contract review, deterministic examples, and session-derived descriptions from preserving the messages produced for particular arguments. JSON Schema annotations do not solve this problem because MCP Prompt arguments are named strings rather than an embedded JSON Schema.

## Goals

- Represent multiple named argument/result examples for a Prompt.
- Give no-argument Prompts one explicit canonical example shape.
- Validate argument names, required arguments, string values, and completed results.
- Preserve every Prompt message and supported content type in order.
- Apply protocol-revision rules through the containing Prompt's effective scope.
- Support reusable local Prompt examples consistently with existing components.
- Allow example-level specification extensions, including evidence attribution.

## Non-goals

- Define completion examples; Proposal 0016 addresses that operation.
- Define elicitation, sampling, roots, task, or multi-round interaction transcripts.
- Define JSON-RPC envelopes, protocol errors, request matching, or mock behavior.
- Assert that Prompt output is deterministic, exhaustive, safe, or current.
- Infer examples by combining unrelated observed calls or documentation fragments.
- Retrieve external example values.

## Background and primary references

- MCP Prompts: https://modelcontextprotocol.io/specification/2026-07-28/server/prompts
- Draft Prompt Objects: `spec/draft/sections/11-prompts.md`
- Proposal 0004, named Tool examples: https://github.com/mcpdesc/mcpdesc-specification/pull/11
- Proposal 0009, reusable components: https://github.com/mcpdesc/mcpdesc-specification/pull/27
- Issue 39 Inspector evidence: https://github.com/mcpdesc/mcpdesc-specification/issues/39

Prompt examples are operation examples, not Prompt declarations returned by `prompts/list`. Their closest existing analogue is a Tool Example: both pair complete invocation parameters with one completed native MCP result.

## Proposed normative behavior

### 1. Prompt `examples`

A Prompt Object MAY contain `examples`, a non-empty map from a local name to an inline Prompt Example Object or a Reference Object targeting `#/components/promptExamples/<name>`.

Example names MUST match `^[A-Za-z0-9._-]+$`, are case-sensitive, and are scoped to the containing Prompt declaration. Entry order has no semantic meaning.

Prompt declarations with the same `name` in disjoint protocol scopes have independent example maps. A referenced example inherits all validation context from its use site.

### 2. Prompt Example Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `arguments` | map of string values | Yes | Complete `params.arguments` value for `prompts/get`. |
| `result` | object | Yes | Completed applicable `GetPromptResult`, without a JSON-RPC envelope. |

The object MAY contain `x-*` specification extensions and MUST NOT contain other properties.

`arguments` MUST be present even when empty. A no-argument example uses `arguments: {}`. Every key MUST identify an argument declared by the containing Prompt, every declared argument with `required: true` MUST be present, and every value MUST be a string. Optional arguments MAY be omitted.

The map intentionally differs from the single `{ name, value }` argument selected by a completion request: Prompt retrieval supplies the complete set of arguments at once, while completion identifies one current argument and carries other values separately as context.

The example MUST NOT contain transport metadata, JSON-RPC IDs, method names, or request `_meta`.

### 3. Completed result

`result` MUST conform to the completed MCP `GetPromptResult` shape for every revision in the containing Prompt's effective protocol scope.

It MUST preserve the ordered `messages` array and MAY preserve the native result `description` and revision-supported `_meta`. Message roles and content MUST be valid for every applicable revision. For MCP 2026-07-28, the result MUST use the applicable completed-result discriminator; earlier revisions MUST NOT receive fields introduced only by that revision.

Task, input-required, streaming, partial, and JSON-RPC error forms are not Prompt Examples.

### 4. Illustrative semantics

Prompt examples are illustrative and non-exhaustive. They do not change Prompt arguments, capabilities, security, client requirements, or runtime behavior. They do not guarantee byte-for-byte output, availability, freshness, or deterministic model behavior.

Documentation and mock tooling MAY select an example explicitly by name. Selection without an explicit name MUST use a deterministic documented policy and MUST NOT be presented as prediction of a live server.

### 5. Components and references

The Components Object gains `promptExamples`, a non-empty map of Prompt Example Objects or same-namespace Reference Objects. The Reference Object namespace grammar and resolution rules gain `promptExamples`.

Resolution substitutes the component value before validating argument names, required arguments, string values, result shape, content types, and protocol scope. Components have no independent protocol scope.

### 6. Projection, merge, and round-tripping

Prompt examples are MCP Description metadata, not fields of the MCP Prompt type. Native MCP projection MUST omit them unless an independent MCP extension defines a destination.

Effective Protocol View projection preserves examples on the selected Prompt declaration and MUST NOT merge example maps from disjoint Prompt variants. Component pruning retains every transitively referenced Prompt example.

Merge follows the existing declaration and component collision rules. Tooling MUST NOT silently bind different examples to one name.

## Schema impact

The core schema adds:

- `promptExample` and `promptExamples` definitions;
- Prompt Object `examples` using inline values or compatible references;
- `components.promptExamples`; and
- `promptExamples` in the Reference Object namespace grammar.

`promptExamples` follows the existing component namespace shape: it has at least one property, component names use the common component-name grammar, and each value is either a Prompt Example Object or a same-namespace Reference Object. Prompt `examples` uses the same inline-or-reference union.

The published JSON Schema validates structure. A semantic validator resolves references and validates arguments and protocol-specific result content against the containing Prompt.

## Examples

```yaml
prompts:
  - name: city-briefing
    title: City Briefing
    arguments:
      - name: city
        required: true
      - name: audience
    examples:
      paris-engineering:
        arguments:
          city: Paris
          audience: engineering
        result:
          resultType: complete
          description: Engineering briefing for Paris
          messages:
            - role: user
              content:
                type: text
                text: Summarize current engineering considerations for Paris.
```

A reusable no-argument example:

```yaml
components:
  promptExamples:
    default-greeting:
      arguments: {}
      result:
        resultType: complete
        messages:
          - role: user
            content:
              type: text
              text: Say hello.
prompts:
  - name: greeting
    examples:
      default:
        $componentRef: '#/components/promptExamples/default-greeting'
```

The excerpts use MCP 2026-07-28. A Prompt scoped to an earlier revision uses that revision's completed result shape.

## Compatibility

This is a compatible addition to the unreleased 0.8.0 draft. Existing documents remain valid. Consumers that ignore the new field lose only illustrative metadata.

The additional component namespace expands the closed Components and Reference Object grammars, so schema-only consumers generated from Draft 3 must update before accepting documents that use reusable Prompt examples.

## Migration

No existing document requires migration. Producers currently storing Prompt invocation/results in an `x-*` extension may map each pair to one named `examples` entry after verifying arguments and result scope.

## Security and privacy considerations

Arguments and results are untrusted content. Authors MUST NOT include credentials, tokens, personal data, private resource contents, or production prompts that reveal confidential instructions. Producers deriving examples from traffic SHOULD redact or omit sensitive values before publication and SHOULD record that action in a companion derivation report.

Consumers MUST render content as data, apply size and media-processing limits, and avoid automatically dereferencing embedded resources. Examples do not authorize invocation or resource access.

## Alternatives considered

- **Root operation-example registry:** rejected because the containing Prompt already supplies identity and scope; root ownership adds dangling-target and merge complexity.
- **Result-only examples:** rejected because they cannot preserve or validate the observed argument/result relationship.
- **No reusable components:** simpler, but inconsistent with other named primitive examples and needlessly duplicates large message results.
- **Omit empty `arguments`:** rejected because explicit `{}` distinguishes a complete no-argument invocation from missing data.

## Open questions

- Should the first implementation impose an encoded-size warning threshold for large image, audio, or embedded-resource content?
- Should authoring guidance recommend names that distinguish curated and observed examples, while keeping provenance semantics extension-defined?

## Implementation and validation plan

After acceptance:

1. update Prompt and Components normative sections and assembled text;
2. update the versioned and draft schemas;
3. add semantic argument, result, reference, and protocol-scope validation;
4. add valid, invalid, warning, projection, merge, and round-trip fixtures;
5. add full-featured and focused examples;
6. update changelog, migration guidance, and proposal manifest; and
7. preserve all immutable Draft 1-3 and validator snapshots.

## Decision record

- 2026-08-28: Initial Review proposal selects named contextual argument/result examples with explicit empty arguments and reusable local components.