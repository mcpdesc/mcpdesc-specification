# Issues to create in `mcpdesc/mcpdesc-specification`

Do not create these issues automatically without maintainer authorization. Use this text as a reviewed migration aid.

## Issue: Align MCP Description v0.8 with MCP 2026-07-28

Historical input: https://github.com/mcpdesc/mcpdesc.org/issues/8, opened on 2026-07-28.

### Goal

Assess the final MCP 2026-07-28 specification and identify the changes required in MCP Description v0.8.0.

### Deliverables

- Complete the protocol-impact matrix.
- Classify every relevant protocol change.
- Produce proposal 0001.
- Identify normative, documentation-only, extension, toolkit-only, and no-impact items.
- Preserve v0.7.0 compatibility wherever reasonable.

### Important constraint

MCP Description is a static description format. Do not mirror runtime protocol changes unless they affect what a server needs to declare statically.

## Issue: Define MCP `_meta` support

Historical input: https://github.com/mcpdesc/mcpdesc.org/issues/5, opened on 2026-07-27.

### Goal

Define whether and how MCP Description should document `_meta`, including schemas, examples, namespaces, permitted locations, and security guidance.

### Deliverables

- Inventory `_meta` semantics in the final MCP 2026-07-28 specification.
- Evaluate at least two design alternatives.
- Determine whether domain-error documentation belongs in `_meta` or a dedicated construct.
- Produce proposal 0002, normative text, schema changes, and examples before acceptance.
