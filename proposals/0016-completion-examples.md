# Proposal 0016: Prompt and Resource Template Completion Examples

- Status: Review
- Author: Stève Sfartz
- Created: 2026-08-28
- Target version: 0.8.0 Draft 4
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/40
- Review period: 2026-08-28 through 2026-09-27

## Summary

Add a `completionExamples` map to Prompt and Resource Template Objects. Each named example records the argument being completed, optional completion context, and one completed native MCP completion result.

The containing primitive supplies the completion target identity. This avoids copying MCP completion references into a root registry and makes target validation local and deterministic.

## Problem

Draft 3 can advertise the `completions` capability and describe Prompts and Resource Templates, but it cannot preserve behavior observed through `completion/complete`. Both supplied Inspector sessions lose completion requests, context, values, totals, and pagination indications when exporting MCP Description.

This matters because completion behavior can express relationships that declarations alone cannot: one Prompt argument may narrow another, and one Resource Template variable may constrain valid values for another.

## Goals

- Represent named completed completion examples for Prompts and Resource Templates.
- Preserve argument name/value, optional context, candidate values, and result metadata.
- Validate targets against Prompt arguments or RFC 6570 template variables.
- Preserve native MCP result semantics without JSON-RPC envelopes.
- Support protocol-scoped declarations and revision-aware validation.
- Keep examples illustrative rather than converting candidates into enums.

## Non-goals

- Define live completion discovery, ranking, filtering, or pagination algorithms.
- Declare an exhaustive value set or stable ordering guarantee.
- Add explicit Resource Template variable declarations.
- Define completion examples for Tools or Resources, which are not native completion targets.
- Infer server capabilities or client requirements from examples.
- Define multi-round interaction examples or raw protocol transcripts.
- Add reusable completion components in the first version.

## Background and primary references

- MCP completion utility: https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/completion
- Draft capabilities: `spec/draft/sections/08-capabilities.md`
- Draft Prompts: `spec/draft/sections/11-prompts.md`
- Draft Resource Templates: `spec/draft/sections/10-resources.md`
- Issue 40 Inspector evidence: https://github.com/mcpdesc/mcpdesc-specification/issues/40

MCP identifies a completion target with a Prompt or Resource Template reference. Within MCP Description, attachment to the corresponding declaration provides the same identity with fewer opportunities for disagreement.

## Proposed normative behavior

### 1. Eligible owners

A Prompt Object or Resource Template Object MAY contain `completionExamples`, a non-empty map of local names to Completion Example Objects.

Names MUST match `^[A-Za-z0-9._-]+$`, are case-sensitive, and are scoped to the containing declaration. Entry order has no semantic meaning. Completion Example Objects MAY carry `x-*` specification extensions.

Completion examples are valid only in an effective protocol scope where the native MCP completion operation and represented fields exist.

### 2. Completion Example Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `argument` | Completion Argument Object | Yes | Name and current partial value being completed. |
| `context` | Completion Context Object | No | Other arguments already supplied for contextual completion. |
| `result` | object | Yes | Completed applicable MCP completion result without a JSON-RPC envelope. |

The object MUST NOT contain other unprefixed properties.

The Completion Argument Object contains required string properties `name` and `value`. It MAY carry `x-*` extensions and MUST NOT contain other unprefixed properties.

This single selected argument intentionally differs from a Prompt Example's complete argument map. A completion request identifies one argument and current partial value; values for other arguments belong in completion context.

The Completion Context Object contains required `arguments`, a map of string values. It MAY carry `x-*` extensions and MUST NOT contain other unprefixed properties. An empty context MUST be omitted rather than represented as an empty object.

### 3. Prompt target validation

For a Prompt owner, `argument.name` MUST identify one declared Prompt Argument. Every `context.arguments` key MUST identify another declared Prompt Argument. The argument being completed MUST NOT also occur in context.

Context MAY be partial. Omission of a required Prompt argument means only that the illustrated completion request did not provide it; it does not change the Prompt's retrieval requirements.

### 4. Resource Template target validation

For a Resource Template owner, `argument.name` and every context key MUST identify a variable in the declaration's RFC 6570 `uriTemplate`. The completed argument MUST NOT also occur in context.

Variable comparison uses the variable names obtained by parsing the RFC 6570 template. Operators and modifiers are not part of the variable name: `{+path}` identifies `path`, `{id:3}` identifies `id`, and `{owner,repository}` identifies both `owner` and `repository`. Percent-encoding in an expanded URI does not create an alias for a template variable. A validator MUST parse RFC 6570 expressions and MUST NOT rely on ad hoc matching of text between braces.

### 5. Completed result

`result` MUST conform to the completed MCP completion result for every revision in the owner's effective protocol scope. It preserves the ordered `values` array and revision-supported `total`, `hasMore`, `_meta`, and completed-result discriminator through the native result's `completion` member.

Candidate values MUST be strings. Native limits and field relationships for every applicable revision remain authoritative. JSON-RPC errors, incomplete results, and transport envelopes are not completion examples.

An example with no candidates uses the native empty `values` array. It does not mean that no value can ever be completed.

### 6. Illustrative semantics

Completion examples are illustrative and non-exhaustive. Candidate values do not become schemas, enums, defaults, authorization grants, or claims of future availability. `total` and `hasMore` reproduce one illustrated result and do not promise stable collection size or pagination.

Producers MUST NOT merge unrelated requests and results into one example. Observed examples SHOULD preserve request/result pairing.

### 7. Projection, merge, and round-tripping

Completion examples are MCP Description metadata and MUST be omitted from native MCP list projection unless an independent MCP extension defines a destination.

Effective Protocol View projection preserves the selected owner's map and MUST NOT merge maps from disjoint variants. Merge tooling follows existing primitive collision rules and MUST NOT silently bind distinct examples to one name.

## Schema impact

The schema adds `completionExamples` to Prompt and Resource Template Objects and definitions for Completion Example, Completion Argument, Completion Context, and completed revision-compatible completion results.

Structural JSON Schema validates the container and result shape. Semantic validation checks Prompt argument or RFC 6570 variable membership, duplicate target/context use, effective protocol scope, and revision field compatibility.

No component namespace is added initially. Completion examples are highly contextual to the containing target, and implementation experience should precede a reusable form.

## Examples

Prompt completion:

```yaml
prompts:
  - name: team-lead
    arguments:
      - name: department
        required: true
      - name: name
        required: true
    completionExamples:
      engineering-a:
        argument:
          name: name
          value: a
        context:
          arguments:
            department: engineering
        result:
          resultType: complete
          completion:
            values: [Ada, Alan]
            total: 2
            hasMore: false
```

Resource Template completion:

```yaml
resourceTemplates:
  - uriTemplate: repo://{owner}/{repository}/issues/{issue}
    name: Repository issue
    completionExamples:
      issue-prefix:
        argument:
          name: issue
          value: '12'
        context:
          arguments:
            owner: example
            repository: widgets
        result:
          resultType: complete
          completion:
            values: ['120', '121', '129']
            hasMore: true
```

These excerpts use the MCP 2026-07-28 result shape.

## Compatibility

This is a compatible addition to the unreleased 0.8.0 draft. Existing documents remain valid. The field has no effect on server capabilities, client requirements, security inheritance, or native list projection.

## Migration

No existing document requires migration. Producer-specific completion extensions can migrate one paired request/result observation at a time after target and protocol validation.

## Security and privacy considerations

Completion candidates can reveal private identifiers, user names, repository names, filesystem paths, tenant data, or authorization-dependent resources. Authors MUST NOT publish secrets or sensitive production candidates. Session-derived producers SHOULD redact or omit sensitive values and record the omission separately.

Consumers MUST treat candidates as untrusted text and MUST NOT automatically request, dereference, or authorize any candidate. Examples do not establish access rights.

## Alternatives considered

- **Nested on Prompt Arguments:** precise for Prompts but requires a new Resource Template variable model and fragments request context.
- **Root native-reference registry:** handles both targets uniformly but duplicates target identity and permits dangling or contradictory references.
- **Reusable components immediately:** deferred because contextual validity sharply limits safe reuse.
- **Extension-only behavior:** rejected because two protocol-era sessions demonstrate portable representational loss.

## Open questions

- Should a future reusable form permit references only within declarations having structurally equivalent target variables?
- Should semantic validation warn when `total` is smaller than the illustrated `values` count even if a future MCP revision relaxes that relationship?

## Implementation and validation plan

After acceptance:

1. update Prompt, Resource Template, capability, and example guidance;
2. add structural and native result schemas;
3. add RFC 6570 and Prompt argument semantic validation;
4. add positive, negative, warning, projection, merge, and round-trip fixtures;
5. add focused and full-featured examples;
6. update changelog and migration notes; and
7. preserve all immutable Draft 1-3 snapshots.

## Decision record

- 2026-08-28: Initial Review proposal selects named completion examples on their Prompt or Resource Template owner, without reusable components.