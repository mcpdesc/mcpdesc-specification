# Proposal 0020: Completion Applicability Declarations

- Status: Review
- Author: Stève Sfartz
- Created: 2026-09-02
- Target version: 0.8.0 or a subsequent compatible revision
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/52
- Related proposals: Proposal 0016, https://github.com/mcpdesc/mcpdesc-specification/pull/44
- Review period: 2026-09-02 through 2026-10-02

## Summary

Add a `completions` map to Prompt and Resource Template Objects. Each entry is a Completion Declaration Object describing the durable applicability of MCP `completion/complete` to one Prompt argument or RFC 6570 URI-template variable.

The declaration distinguishes supported, conditionally supported, explicitly unsupported, and undescribed targets. It complements the server-level MCP completion capability and the observational `completionExamples` introduced by Proposal 0016 without changing either concept or MCP runtime behavior.

## Problem

MCP Description 0.8.0 Release Candidate 1 can advertise the server-level `completions` capability and preserve successful completion observations as `completionExamples`. It cannot declare which Prompt arguments or Resource Template variables actually support completion.

A server may advertise completion while implementing it for only a subset of its targets. Static consumers therefore cannot determine whether completion is supported for a particular target, is conditionally available, or is explicitly unsupported.

Examples cannot safely fill this gap. Their absence means only that no example was supplied, and their presence records an illustrative observation rather than a durable support contract.

An empty completion result creates a related distinction:

```json
{
  "completion": {
    "values": []
  }
}
```

This represents an applicable completion request with no matching candidates. It is not evidence that completion is unsupported for the target. MCP does not currently define a separate standard wire result for target-level inapplicability, but MCP Description can still describe that durable semantic distinction statically.

## Goals

- Declare completion applicability for individual Prompt arguments and Resource Template variables.
- Distinguish supported, conditional, unsupported, and undescribed applicability.
- Preserve the observational and non-exhaustive semantics of `completionExamples`.
- Validate declarations against their containing primitive and Effective Protocol View.
- Keep server-level capability discovery distinct from target-level applicability.
- Preserve declarations through Effective Protocol View projection and MCP Description round-tripping.

## Non-goals

- Define a new MCP capability or modify `completion/complete`.
- Define a JSON-RPC error or other wire representation for an unsupported target.
- Infer completion support from `completionExamples`.
- Turn completion candidates into enums or guarantee deterministic results.
- Describe or encode the conditions governing `conditional` applicability.
- Express dependencies on sibling arguments or URI-template variables.
- Require every Prompt argument or Resource Template variable to have a declaration.
- Change Prompt argument requirements, URI-template expansion, authorization, or user-interface ordering.

## Background and primary references

- MCP completion utility: https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/completion
- Draft capabilities: `spec/draft/sections/08-capabilities.md`
- Draft resources: `spec/draft/sections/10-resources.md`
- Draft prompts: `spec/draft/sections/11-prompts.md`
- Completion examples issue: https://github.com/mcpdesc/mcpdesc-specification/issues/40
- Completion examples proposal: https://github.com/mcpdesc/mcpdesc-specification/pull/44
- Completion applicability issue: https://github.com/mcpdesc/mcpdesc-specification/issues/52

MCP advertises completion as a server capability. A completion request then identifies a Prompt or Resource Template reference and one argument.

Server capability, target applicability, and observed examples answer different questions:

```text
capabilities.completions
    Does the server implement the MCP completion mechanism?

Prompt/ResourceTemplate.completions
    For which targets is that mechanism durably applicable?

completionExamples
    What completed request/result interactions are illustrated?
```

## Proposed normative behavior

### 1. Eligible owners and declaration map

A Prompt Object or Resource Template Object MAY contain `completions`, a non-empty map from target names to Completion Declaration Objects.

For a Prompt Object, each key MUST exactly match the `name` of one Prompt Argument declared by the containing Prompt.

For a Resource Template Object, each key MUST identify one RFC 6570 variable in the containing `uriTemplate`. Variable identity follows the same parsing rules as Resource Template completion examples. Operators and modifiers do not alter identity: `{+path}` identifies `path`, `{id:3}` identifies `id`, and `{owner,repository}` identifies `owner` and `repository`.

Omission of the map or a target entry means that the description makes no completion-applicability declaration for that target. Omission MUST NOT be interpreted as `unsupported`.

### 2. Completion Declaration Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `availability` | string enum | Yes | One of `supported`, `conditional`, or `unsupported`. |
| `x-*` | any JSON-compatible value | No | Specification extensions. |

The object MUST NOT contain other unprefixed properties.

### 3. Availability

`availability` MUST be one of `supported`, `conditional`, or `unsupported`.

`supported` declares that the server supports completion for this target for valid completion requests in the described protocol scope. It does not guarantee that a particular request returns candidates. An empty native `completion.values` array is compatible with `supported`.

`conditional` declares that completion is supported only under conditions that are not represented by this proposal. Consumers MUST NOT infer a particular condition, dependency, or authorization rule from this value.

`unsupported` explicitly declares that completion is not supported for the target. It is distinct from omission.

The resulting descriptive states are:

```text
omitted       no declaration
supported     completion is expected to be applicable
conditional   applicability depends on conditions not represented here
unsupported   completion is explicitly not supported
```

### 4. Relationship to server capabilities

Presence of `capabilities.completions` declares that the server implements the MCP completion mechanism. It MUST NOT imply that every Prompt argument or Resource Template variable supports completion.

When an applicable Capabilities Object is present in the same Effective Protocol View and a Prompt or Resource Template declares at least one target as `supported` or `conditional`, that Capabilities Object MUST declare the MCP `completions` capability.

If no applicable Capabilities Object is present, the primitive declaration remains valid because omission of the root `capabilities` section means that MCP Description makes no server-capability declaration.

An `unsupported` target MAY coexist with an advertised server-level completion capability.

### 5. Relationship to completion examples

Completion declarations and completion examples have independent semantics. A Completion Example MUST NOT implicitly create a Completion Declaration, and a declaration does not require an example.

A Prompt or Resource Template MAY contain `completionExamples` without `completions`. An example targeting a target for which no declaration exists remains valid and MUST NOT cause tooling to synthesize a declaration.

A successful Completion Example MUST NOT target an argument or variable declared `unsupported` in the same Effective Protocol View. Examples targeting `supported` or `conditional` declarations are valid.

Consumers MUST NOT infer `unsupported` from an empty `completion.values` array. A Completion Example with no candidates MAY illustrate a supported request for which no values matched the supplied value and context.

### 6. Protocol applicability and variants

Completion declarations MUST appear only in an Effective Protocol View where MCP defines completion for the corresponding Prompt or Resource Template reference type.

When declarations differ materially between MCP revisions, the containing Prompt or Resource Template MUST use pairwise-disjoint protocol-scoped variants under the existing protocol-variant rules.

### 7. Projection, merge, and round-tripping

`completions` is MCP Description metadata. Projection to MCP `prompts/list` or `resources/templates/list` values MUST omit it unless an independently specified MCP extension defines a destination.

Effective Protocol View projection and MCP Description round-tripping MUST preserve the selected declaration's `completions` map. Maps from declarations with disjoint protocol scopes MUST NOT be merged.

## Schema impact

The schema adds a `completions` property to Prompt and Resource Template Objects and a Completion Declaration Object definition.

Structural JSON Schema validates non-empty maps, the closed declaration shape, and availability values.

Semantic validation checks Prompt argument or parsed RFC 6570 variable membership, Effective Protocol View applicability, capability consistency, and conflicts with `completionExamples`.

No reusable component namespace is added initially because declaration validity depends on sibling targets in the containing primitive.

## Examples

Prompt declarations:

```yaml
prompts:
  - name: code_review
    protocolVersions: ["2026-07-28"]
    arguments:
      - name: language
        required: true
      - name: framework
      - name: tone
    completions:
      language:
        availability: supported
      framework:
        availability: supported
      tone:
        availability: unsupported
```

Resource Template declarations:

```yaml
resourceTemplates:
  - name: repository_file
    uriTemplate: "repo://{owner}/{repository}/{path}"
    protocolVersions: ["2026-07-28"]
    completions:
      owner:
        availability: supported
      repository:
        availability: supported
      path:
        availability: conditional
```

A complete document may combine declarations and examples without making the examples contractual:

```yaml
mcpdesc: "0.8.0"

info:
  name: repository-server
  version: "1.0.0"

protocolVersions: ["2026-07-28"]

capabilities:
  - protocolVersions: ["2026-07-28"]
    prompts: {}
    resources: {}
    completions: {}

prompts:
  - name: code_review
    arguments:
      - name: language
        required: true
      - name: framework
      - name: tone
    completions:
      language:
        availability: supported
      framework:
        availability: supported
      tone:
        availability: unsupported
    completionExamples:
      python-framework:
        argument:
          name: framework
          value: fla
        context:
          arguments:
            language: python
        result:
          resultType: complete
          completion:
            values: [flask]
            total: 1
            hasMore: false
```

## Compatibility

This is a compatible addition. Existing documents remain valid, including documents with `completionExamples` and no `completions` declaration.

Consumers that do not recognize the new property may reject documents under the existing closed-object rules until updated, so deployment still requires a specification and validator version that includes this proposal. The addition does not change the meaning of existing server capabilities, examples, or empty completion results.

If included before the stable 0.8.0 release, it extends the release candidate without invalidating RC.1 documents. If deferred, the same model can be introduced in a subsequent compatible revision.

## Migration

No existing document requires migration.

Producers may add declarations incrementally. They MUST NOT translate absence of a `completionExample` into `unsupported`, and they SHOULD emit `unsupported` only when they have an explicit negative applicability contract.

Existing producer-specific completion metadata can migrate target by target after validating local target identity, protocol scope, and capability consistency.

## Security and privacy considerations

Completion applicability can reveal that private namespaces, repositories, identities, or other resources are enumerable under some conditions. Consumers MUST NOT treat a declaration as granting access, proving that a caller is authorized, or guaranteeing that candidates are safe to request or dereference. Security requirements remain represented through MCP Description security declarations.

Completion examples retain Proposal 0016's separate guidance concerning sensitive candidate data.

## Alternatives considered

### Infer support from completion examples

Treat targets with completion examples as completion-capable. Rejected because examples are intentionally observational and non-exhaustive. This would make absence ambiguous and silently change existing semantics.

### Boolean completion flag

Add a simple `supported: true` property. Rejected because it cannot distinguish conditional applicability from unconditional support.

### Dependency and condition properties

Add `dependsOn` for sibling target dependencies and `when` for human-readable conditions. Deferred until implementation experience demonstrates demand from users or tooling. The initial model records conditional applicability without standardizing its cause or expression.

### Put declarations on Prompt Arguments

This is locally precise for Prompts but would require a new explicit Resource Template variable model or a second representation for URI-template variables. A map on each eligible primitive gives both target kinds the same shape and reuses the local validation model established for completion examples.

### Define unsupported completion on the MCP wire

Deferred outside this proposal. Runtime interoperability guidance or a future MCP protocol extension may define such a representation, but MCP Description can describe durable applicability independently.

### Extension-only metadata

Possible for individual producers, but it would not provide portable semantics, validation, documentation behavior, or governance diffs across the ecosystem.

## Open questions

- What implementation experience would justify a future machine-readable dependency or human-readable condition property?
- Should 0.8.0 include this compatible addition before stable release, or should implementation target the next compatible revision?

## Implementation and validation plan

After acceptance:

1. update the Prompt, Resource Template, capability, completion-example, projection, and Effective Protocol View normative text;
2. add structural schemas for completion maps and declarations;
3. add semantic validation for target membership, protocol scope, capabilities, and example consistency;
4. add positive, negative, warning, projection, merge, and round-trip fixtures;
5. update focused and full-featured examples;
6. update the changelog, migration guide, and authoring guidance;
7. preserve all immutable released schemas and validator snapshots; and
8. run `npm test`, `git diff --check`, and the applicable release checks before publication.

## Decision record

- 2026-09-02: Initial Review revision included declaration-local `completions` maps with four descriptive states and sibling dependency metadata, with no MCP wire-level changes.
- 2026-09-02: Deferred `dependsOn` and `when` until implementation experience demonstrates demand from users or tooling; `conditional` remains an explicit applicability state without a standardized condition representation.