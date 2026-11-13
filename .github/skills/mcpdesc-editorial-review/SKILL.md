---
name: mcpdesc-editorial-review
description: 'Review and edit MCP Description specification prose for readability, consistency, and tone. Use when asked to review, proofread, simplify, or improve wording in specification sections.'
argument-hint: 'Section path or section number'
---

# MCP Description Editorial Review

Review specification prose for clarity without changing its technical meaning or conformance semantics. The user may treat protocol and specification content as technically settled for an editorial pass. If a wording change could affect meaning, actor responsibility, or conformance, explain the ambiguity and ask before editing.

## Workflow

1. Read the complete target section and enough adjacent material to understand its terms, cross-references, and normative context.
2. Review for plain language, short sentences, one main idea per paragraph, useful paragraph breaks, and consistent tone.
3. Identify ambiguous or meaning-sensitive wording. Discuss options and ask the user before making uncertain changes.
4. Make focused edits to the section source only. Preserve requirement anchors, links, examples, and technical distinctions unless the user approves a change.
5. Follow the user's incremental review process. Do not assemble or regenerate `mcp-description.md` until the user says the section reviews are complete and asks for final assembly.
6. If an edit adds, deletes, or changes the meaning of a requirement (including removing or renaming a `req-*` anchor, or changing a keyword such as SHOULD to MUST), list it separately in the summary so the responsible user can decide whether to keep or revert it. For each removed or renamed anchor, search the repository (for example `validation/rules/`, `validation/unchecked-requirements.yaml`, and fixtures) and report any references.
7. Run `git diff --check`. Do not run broad tests for prose-only edits unless requested or needed to check a specific concern. Report validation limits accurately.

## Style

- Prefer familiar, direct words over abstract or elaborate phrasing.
- Prefer shorter sentences. Split sentences that carry several assumptions or consequences.
- Give each paragraph one main idea. Use a list when it makes distinct items easier to scan.
- Keep terminology and tone consistent across sections.
- Remove repetition when nearby text already states the same point.
- Do not turn a descriptive statement into an instruction to the reader or an implementation unless that actor and obligation are intended.

## Normative Keywords

Section 2.1 incorporates RFC 2119 for the uppercase key words. Treat capitalization as a conformance signal:

- Use **MUST** or **MUST NOT** for a necessary conformance obligation or prohibition on an identified actor.
- Use **SHOULD** or **SHOULD NOT** for a recommendation that permits justified exceptions.
- Use **MAY** for an explicitly permitted option.
- Use ordinary declarative prose for definitions, explanations, and descriptions of how the data model works.

Do not use an uppercase keyword merely to emphasize importance. First ask:

1. Is this sentence imposing an obligation, prohibition, recommendation, or permission?
2. Who is the actor: a document author, validator, producer, consumer, or another implementation?
3. Is that obligation part of MCP Description conformance, or is the sentence only explaining behavior or semantics?

If the sentence describes how a value is interpreted or what a format means, prefer declarative prose. If it imposes a normative obligation, use the appropriate keyword and make the actor clear. For new requirement sentences, preserve or add the appropriate `req-*` anchor and consider whether the validation catalog must cite it. Do not create a new obligation while editing for style.

## Terminology

Use these terms consistently when they fit the context. This is a guide to preferred usage, not a ban on words that have a distinct meaning elsewhere.

| Concept | Prefer | Use or avoid |
| --- | --- | --- |
| Named entry in an MCP object | **field** | Consistent with MCP usage. |
| JSON Schema `properties` keyword or JSON object structure | **property** | Keep when discussing the schema or JSON structure specifically. |
| Data held by a field or property | **value** | Do not use “attribute” as a synonym. |
| Conformance obligation | **requirement** | Use “constraint” for a structural or semantic limit. |
| Advice that allows justified deviation | **recommendation** | Reserve RFC 2119 **SHOULD** and **SHOULD NOT** for normative recommendations. |
| Explicitly allowed choice | **option** or **permission** | Use RFC 2119 **MAY** when the permission is normative. |
| Named validation catalog entry or mechanical procedure | **rule** | Avoid vague references such as “this rule” when the requirement or constraint can be named. |
| Tool, Resource, Resource Template, or Prompt declaration | **primitive** | Do not use “capability” as a synonym. |
| Protocol feature or behavior supported by a server or client | **capability** | Server capabilities and primitive-level client requirements are distinct. |

Ordinary grammatical uses remain valid: for example, a finding can be “attributed to” a validation rule. Do not treat this thesaurus as a global replacement list.

## Interaction

- Review one requested section or bounded group at a time.
- Share substantive findings and proposed wording when user feedback would affect the editorial direction.
- Ask through the available question tool when there are multiple reasonable interpretations; do not guess at changes that could shift conformance or responsibility.
- After editing, report requirement changes and deletions first, then summarize what changed, identify the source file with a workspace link, state that assembly was deferred when applicable, and report checks run.
