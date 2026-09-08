# Proposal 0022: Protocol-Independent Info Metadata

- Status: Implemented
- Author(s): @ObjectIsAdvantag
- Created: 2026-09-07
- Target version: 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/60

## Summary

Define the root Info Object as document-wide MCP Description metadata whose
fields are valid independently of the MCP revisions in `protocolVersions`.
References from Info fields to the MCP `Implementation` type describe runtime
mapping and capture availability; they do not impose protocol-revision
applicability on the static description.

This permits a description for MCP `2025-06-18`, for example, to contain
`info.description`, even though that revision's `Implementation` type does not
provide a `description` field during initialization.

## Problem

MCP Description describes a durable server surface as a static, curated
document. The root Info Object combines fields that correspond to MCP
`Implementation` with MCP Description-specific metadata such as `contact` and
`license`.

The current 0.8.0 text annotates some Info fields with the MCP revision that
introduced the corresponding `Implementation` field. The candidate semantic
validator interprets those annotations as conformance restrictions. It rejects
this otherwise structurally valid document:

```yaml
mcpdesc: 0.8.0
info:
  name: chess-coach
  version: 2.1.0
  description: Cloud-hosted chess analysis, ratings, and game history service
protocolVersions:
  - '2025-06-18'
```

The validator reports that `info.description` requires MCP `2025-11-25` or
later. This conflates two independent questions:

1. whether an MCP Description document can describe a piece of server
   metadata; and
2. whether that metadata can be observed in the applicable revision's runtime
   `clientInfo` or `serverInfo` value.

MCP `2025-06-18` does not expose `Implementation.description` during
initialization. That limits runtime capture from initialization, but it does
not prevent an author, registry, build process, or other source from supplying
the same metadata in a static MCP Description.

The current behavior also blocks lossless migration from MCP Description
0.7.0, which permits `info.description`, when the source declares MCP
`2025-06-18`.

## Goals

- Make every Info field defined by MCP Description valid for every MCP protocol
  revision supported by that MCP Description version.
- Preserve the distinction between static description conformance and runtime
  capture availability.
- Preserve authored Info metadata during migration and protocol projection.
- Clarify the meaning of references from Info fields to MCP
  `Implementation`.
- Add conformance coverage that prevents future validators from restoring
  revision gates on root Info metadata.

## Non-goals

- Add `description`, `icons`, or `websiteUrl` to an earlier MCP protocol
  revision's `Implementation` type.
- Require an MCP server to return Info metadata that its negotiated protocol
  revision does not define.
- Define a capture protocol, provenance model, or source-precedence policy.
- Require every optional Info field to be present.
- Relax revision-applicability checks on protocol-scoped declarations or
  embedded MCP values.
- Change the MCP Description JSON Schema shape.

## Background and primary references

- MCP Description 0.8.0, Section 1.4, distinguishes the static description
  from MCP runtime communication and discovery.
- MCP Description 0.8.0, Section 4.10, lists the declarations that may carry
  protocol scope. The root Info Object is not one of them.
- MCP Description 0.8.0, Section 4.11, states that the MCP Description version
  and MCP protocol applicability are independent version dimensions.
- MCP Description 0.8.0, Section 5, defines Info as server metadata and maps
  selected fields to MCP `Implementation`.
- MCP `2025-06-18` schema:
  https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-06-18/schema.ts
- MCP `2025-11-25` schema:
  https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts
- MCP `2025-06-18` lifecycle:
  https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle
- MCP `2025-11-25` lifecycle:
  https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle

In MCP `2025-06-18`, `Implementation` contains `name`, optional `title`, and
`version`. MCP `2025-11-25` adds optional `description`, `icons`, and
`websiteUrl`. These differences govern values exchanged during initialization.
They do not define the complete metadata vocabulary of an MCP Description.

## Proposed normative behavior

The Info Object is unscoped, document-wide MCP Description metadata. Every Info
property defined by the selected MCP Description version MAY appear regardless
of the revisions listed in root `protocolVersions`.

An Info property's correspondence to a field of the MCP `Implementation` type
indicates that a producer MAY obtain or compare that value through runtime
initialization when the negotiated MCP revision defines the field. The
correspondence MUST NOT be interpreted as either of the following:

- a requirement that the Info value originate from runtime initialization; or
- a protocol-revision restriction on the Info property's presence in an MCP
  Description document.

A producer MAY obtain Info metadata from author input, configuration, package
metadata, a registry, runtime discovery, or another source. This proposal does
not assign trust or precedence among those sources. An unavailable runtime
field MUST NOT be treated as evidence that the corresponding Info property is
invalid or absent from the described server surface.

Validators MUST NOT emit a revision-applicability error or warning solely
because an Info property is unavailable on MCP `Implementation` in one or more
revisions listed by `protocolVersions`.

An Effective Protocol View MUST preserve the complete Info Object. Projection
MUST NOT remove Info properties based on the selected MCP revision. Merge
continues to treat conflicting Info values as conflicts under the existing
unscoped-metadata rules.

The Section 5 property table should retain the `Implementation` mappings but
label revision annotations as runtime mapping availability. Section 4.10 should
state explicitly that Info is not protocol-scoped, and Section 4.12 should state
that projection preserves it unchanged.

## Schema impact

No JSON Schema change is required. The current 0.8.0 schema already permits all
defined Info properties independently of `protocolVersions`.

Candidate semantic validation must remove the minimum-protocol-version checks
for root `info.title`, `info.description`, `info.icons`, and
`info.websiteUrl`. Structural validation of each field remains unchanged.

## Examples

The following document is conforming without a revision-applicability warning:

```yaml
mcpdesc: 0.8.0
info:
  name: chess-coach
  title: Chess Coach Cloud
  version: 2.1.0
  description: Cloud-hosted chess analysis, ratings, and game history service
  icons:
    - src: https://chess-coach.example.com/icon.png
      mimeType: image/png
      sizes: ['48x48']
  websiteUrl: https://chess-coach.example.com
protocolVersions:
  - '2025-06-18'
```

A capture tool connected through MCP `2025-06-18` cannot obtain
`description`, `icons`, or `websiteUrl` from `serverInfo`. It may omit values it
does not know or combine observed runtime identity with metadata from another
explicit source. Either behavior is independent of document conformance.

## Compatibility

Classification: **compatible relaxation and normative clarification**.

Existing conforming documents remain conforming. Documents rejected only
because an Info field is unavailable in an applicable MCP `Implementation`
revision become conforming. The correction restores lossless representation of
Info metadata accepted by MCP Description 0.7.0.

Consumers that currently assume every Info field was observed during MCP
initialization must stop making that inference. The specification already
defines MCP Description as a static, curated format and does not assign field
provenance, so such an assumption is not a portable conformance guarantee.

Published specification and validator snapshots remain immutable. The change
requires a new approved specification snapshot and a sibling validator
selector.

## Migration

Migration tools MUST preserve all conforming Info fields when migrating an MCP
Description 0.7.0 document, regardless of the selected MCP protocol revision.
They MUST NOT delete an Info field or silently select a newer protocol revision
to satisfy runtime `Implementation` availability.

No document rewrite is required for documents affected by the current
diagnostic. Revalidating the unchanged document against a corrected snapshot is
sufficient.

## Security and privacy considerations

This proposal does not add fields or change their value constraints. Existing
requirements for treating document metadata and URLs as untrusted remain
applicable.

Allowing metadata from sources other than runtime initialization means
consumers must not infer that an Info value was asserted by a live server. A
future provenance mechanism may express that distinction, but absence of
provenance does not make the metadata invalid.

## Alternatives considered

### Drop unavailable fields during migration

Rejected. Removing `description`, `icons`, or `websiteUrl` loses valid authored
metadata and makes migration unnecessarily destructive.

### Select a newer MCP protocol revision

Rejected. Migration must preserve the server's declared protocol support and
must not claim support for a revision merely to retain metadata.

### Retain the fields with a warning

Rejected as a baseline conformance rule. Runtime non-discoverability is not a
defect in a curated static description. Capture tooling may report source or
provenance limitations separately.

### Keep the current revision gates

Rejected. This treats Info as a serialized `Implementation` value, conflicts
with its document-wide role, and prevents lossless migration from 0.7.0.

## Open questions

None.

## Implementation and validation plan

1. Update `spec/draft/sections/05-info-object.md` to distinguish static Info
   validity from runtime `Implementation` mapping availability.
2. Update Sections 4.10 and 4.12 in
   `spec/draft/sections/04-versioning.md` to state that Info is unscoped and is
   preserved by projection.
3. Regenerate or synchronize `spec/draft/mcp-description.md`.
4. Add an `expected-valid` fixture scoped to MCP `2025-06-18` that contains
   `title`, `description`, `icons`, and `websiteUrl` in Info.
5. Remove candidate semantic minimum-version checks for those root Info fields.
6. Add a `spec/draft/CHANGELOG.md` entry and any required compatibility note.
7. Run the specification repository validation suite.
8. After an approved specification snapshot is published, import it as a new
   immutable selector in `@mcpdesc/validator`; do not modify RC.3.
9. Add converter coverage showing that a 0.7.0 document with Info metadata and
   MCP `2025-06-18` migrates successfully against the corrected selector.

The discriminating conformance test is the expected-valid fixture in step 4.
It fails under the current semantic rule and passes only when root Info metadata
is independent of protocol applicability.

## Decision record

Accepted and implemented in MCP Description 0.8.0 by maintainer release decision on 2026-09-08. The decision approves the documented bootstrap review-period exceptions based on public Draft 1-4 and RC.1-RC.4 review and interoperability testing.