# Proposal 0023: MCP Apps Support

- Status: Draft
- Author(s): @ObjectIsAdvantag
- Created: 2026-10-20
- Target version: Next development version after 0.8.0
- Related issues: https://github.com/mcpdesc/mcpdesc-specification/issues/68

## Summary

Add first-class semantic support for the official MCP Apps extension to MCP
Description. The initial implementation targets the stable MCP Apps
specification dated `2026-01-26`, identified by:

```text
io.modelcontextprotocol/ui
```

MCP Apps represents interactive applications through ordinary MCP structures:

- UI Resources using the `ui://` URI scheme;
- HTML application content using `text/html;profile=mcp-app`;
- Tool-to-UI association through `_meta.ui.resourceUri`;
- model and App visibility through `_meta.ui.visibility`;
- UI Resource metadata for content security policy, browser permissions,
  sandbox domains, and presentation preferences; and
- extension capability negotiation using `io.modelcontextprotocol/ui`.

MCP Description already carries the required structures: native MCP `_meta`,
Tool and Resource declarations, Resource examples, formal MCP extension maps,
and primitive client requirements. This proposal therefore adds a pinned MCP
Apps semantic profile rather than a parallel MCP Description-specific App
model.

The compatibility classification is **compatible addition**.

## Problem

MCP Description 0.8.0 preserves native MCP metadata and recognizes official
extension identifiers, but it deliberately does not infer extension-specific
semantics from arbitrary `_meta` or opaque extension values. A document can
therefore preserve this Tool and Resource:

```yaml
tools:
  - name: get_weather
    inputSchema:
      type: object
    _meta:
      ui:
        resourceUri: ui://weather/dashboard

resources:
  - uri: ui://weather/dashboard
    name: dashboard
    mimeType: text/html;profile=mcp-app
```

Tooling cannot currently determine from MCP Description conformance rules that:

- `_meta.ui.resourceUri` associates the Tool with an MCP App;
- the URI must use the `ui` scheme;
- the referenced Resource must use the MCP Apps media type;
- `_meta.ui.visibility` controls model and App access;
- `visibility: [app]` denotes an app-only Tool;
- MCP Apps Resource metadata has defined structural semantics; or
- the Tool-to-Resource relationship is internally consistent.

This prevents catalogues, documentation generators, contract diff tools,
design tools, and security analysis from understanding an MCP Apps surface
without executing the server or App.

The stable Apps specification also predates MCP `2026-07-28` and illustrates
client capability negotiation using an older initialization shape. Upstream
issue https://github.com/modelcontextprotocol/ext-apps/issues/742 tracks
alignment of that text with the later MCP capability model. MCP Description
must not resolve that upstream mismatch by inventing server capability
semantics or by coupling the Apps revision to an MCP core revision.

## Goals

- Recognize `io.modelcontextprotocol/ui` as the official MCP Apps identifier.
- Define a version-pinned semantic profile for stable MCP Apps `2026-01-26`.
- Preserve MCP Apps through native MCP `_meta`, Resources, Resource Contents,
  and extension capability structures.
- Validate stable Tool `_meta.ui` fields, UI Resource identity, Resource
  metadata, and Tool-to-Resource relationships.
- Preserve app-only Tools as part of the described callable surface.
- Keep MCP Apps specification versioning independent from MCP core protocol
  versioning.
- Keep extension discovery, server capability advertisements, and hard client
  requirements distinct.
- Provide positive, negative, and warning fixtures derived where practical
  from official MCP Apps implementations.
- Enable static documentation, diffing, governance, and security review
  without fetching or executing App content.

## Non-goals

- Add a root `apps` collection or an MCP Description-specific `ui` property.
- Render or execute MCP App HTML or JavaScript.
- Model the iframe-host runtime protocol or `postMessage` transport.
- Reproduce the complete MCP Apps specification.
- Validate HTML syntax as part of core MCP Description conformance.
- Standardize Copilot Canvas, legacy MCP-UI formats, OpenAI-specific fields,
  host-specific extensions, or vendor-specific rendering behavior.
- Adopt or track the current MCP Apps development draft.
- Make MCP Apps part of MCP core.
- Infer a hard client requirement merely because a Tool has an associated App.
- Treat a declared CSP, permission, or domain as trusted or enforced.

## Background and primary references

Primary references are:

- MCP Apps stable `2026-01-26`:
  https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx
- MCP Apps repository and reference SDK:
  https://github.com/modelcontextprotocol/ext-apps
- SEP-1865, MCP Apps: Interactive User Interfaces for MCP.
- MCP Description 0.8.0 Sections 3, 8, 10, 12, and 17.
- MCP Apps capability-alignment issue:
  https://github.com/modelcontextprotocol/ext-apps/issues/742

The stable Apps specification defines four contract concepts relevant to MCP
Description:

1. UI Resources and Resource Contents;
2. Tool-to-UI linkage;
3. model and App Tool visibility; and
4. UI Resource security and presentation metadata.

The stable specification uses `ui://` for UI Resource identifiers and
`text/html;profile=mcp-app` for HTML App content. Tools link to Resources with
`_meta.ui.resourceUri` and optionally restrict visibility with
`_meta.ui.visibility`.

MCP Description 0.8.0 distinguishes four extension mechanisms:

- MCP Description `x-*` specification extensions;
- literal native MCP `_meta`;
- server `capabilities.extensions`; and
- primitive `clientRequirements.extensions`.

This proposal preserves those boundaries. In particular, recognition of Apps
metadata is not itself a server capability advertisement, and a server-side
App declaration is not automatically an unconditional client requirement.

MCP Description 0.8.0 also permits deeper extension-specific validation only
through an explicitly selected profile or other configured trusted mechanism.
The proposed Apps profile follows that model. Catalogue recognition establishes
identifier authority and maturity; the pinned profile establishes
extension-specific semantics.

## Proposed normative behavior

### Profile identity and baseline

MCP Description tooling implementing this proposal MUST provide a semantic
profile for the stable MCP Apps specification revision `2026-01-26`.

The profile MUST identify the authoritative source and exact Apps revision it
implements. A frozen validator snapshot MUST pin that profile metadata. The
MCP Apps development draft MUST NOT silently change stable-profile validation.

Selecting the profile enables the requirements in this section. Merely
recognizing the identifier in the extension catalogue MUST NOT turn
extension-profile diagnostics into core MCP Description conformance results.
Tooling MUST distinguish core diagnostics from Apps-profile diagnostics.

Future stable Apps revisions require a separately identifiable profile update
or a later MCP Description version. Mutable upstream content MUST NOT silently
change validation of an immutable validator snapshot.

### Extension identifier

The extension catalogue MUST recognize:

```text
io.modelcontextprotocol/ui
```

as the official MCP Apps extension identifier and associate the Apps profile
with stable revision `2026-01-26`.

Recognition establishes identifier authority and profile availability. It
MUST NOT synthesize, remove, rewrite, or copy `_meta.ui`, server capabilities,
or client requirements.

Valid canonical Apps metadata MAY identify an Apps surface independently of a
server `capabilities.extensions` declaration. The stable Apps specification
defines client advertisement of Apps support; it does not require every server
description to advertise an Apps entry in server capabilities.

### Native representation

MCP Apps semantics MUST use native MCP structures. An MCP Description MUST NOT
require a parallel representation such as:

```yaml
apps:
```

or:

```yaml
tools:
  - ui:
```

Implementations MUST NOT project Apps metadata into MCP Description `x-*`
properties or rewrite native MCP structures merely to apply the profile.

### Tool UI metadata

When a Tool contains `_meta.ui` and the Apps profile applies, `ui` MUST be an
object. The stable recognized Tool fields are `resourceUri` and `visibility`.
Unknown fields MUST be preserved under the existing `_meta` forward-
compatibility rules and MUST NOT fail solely because they are unknown to the
stable profile.

#### `resourceUri`

When present, `resourceUri` MUST be a valid URI with the `ui` scheme. Scheme
comparison follows the underlying URI rules and MUST NOT be implemented as a
case-sensitive string-prefix check.

```text
ui://weather-server/dashboard
```

A `resourceUri` with another scheme is an Apps-profile error.

#### `visibility`

When present, `visibility` MUST be a non-empty array containing only `model`
and `app`, without duplicates.

If omitted, Apps-aware analysis MUST use the semantic default:

```text
["model", "app"]
```

Validation and analysis MUST NOT materialize that default into the serialized
MCP Description unless an explicit transformation requests it.

A Tool whose effective Apps visibility is only `app` is app-only. It remains
part of the server contract and MUST NOT be removed from catalogues, security
analysis, documentation, Effective Protocol Views, or contract diffing merely
because an Apps-aware host may hide it from the model-facing Tool list.

### Deprecated flat Tool metadata

The stable Apps snapshot documents `_meta["ui/resourceUri"]` as deprecated and
says it will be removed before GA, while `_meta.ui.resourceUri` is canonical.
The stable profile SHOULD accept and preserve the flat form with a deprecation
warning. It SHOULD recommend the canonical nested form.

If both forms are present, the profile MUST NOT invent precedence unless the
pinned stable Apps specification defines it. Conflicting values SHOULD produce
an ambiguity error. Tooling MUST NOT rewrite either form without an explicitly
requested transformation.

Removal of the flat form by a future stable Apps revision does not retroactively
change the `2026-01-26` profile.

### UI Resource declarations

A Resource interpreted as an MCP Apps UI Resource MUST use a URI with the `ui`
scheme. Its HTML representation MUST use:

```text
text/html;profile=mcp-app
```

For a Resource statically declared as the target of a Tool
`_meta.ui.resourceUri`, a present `mimeType` MUST match that media type. If the
underlying MCP Description Resource shape permits omission, the profile SHOULD
warn that the static contract cannot establish the required Apps media type
rather than synthesize it.

The profile MUST NOT infer that every Resource using `ui://` is safe to render.
It MUST NOT fetch or execute the Resource during ordinary validation.

### Tool-to-Resource relationship

When a Tool's canonical or accepted deprecated Apps URI matches a Resource
declaration in the MCP Description, the Resource MUST satisfy the stable Apps
UI Resource rules. A matching declaration with a non-`ui` URI or incompatible
media type is an Apps-profile error.

MCP Apps permits UI-only Resources to be omitted from runtime
`resources/list`. MCP Description is a static contract rather than a transcript
of one discovery response. An author describing a stable Tool-to-App
relationship therefore SHOULD declare the referenced UI Resource even when the
server omits it from `resources/list`.

For the initial profile, an unresolved Tool UI Resource reference SHOULD
produce a warning, not an error. Absence from a potentially partial static
description does not prove that `resources/read` cannot serve the Resource.

URI matching MUST use the specification's existing URI comparison rules. The
profile MUST NOT retrieve an unresolved URI automatically.

### UI Resource content examples

Where a Resource example represents `resources/read` for an Apps UI Resource,
the profile SHOULD validate that each applicable returned Resource Contents:

- has the expected `ui` URI;
- uses `text/html;profile=mcp-app`;
- satisfies the underlying MCP Resource Contents payload rules; and
- structurally validates Apps `_meta.ui` Resource metadata when present.

Validation MUST NOT execute HTML or JavaScript. HTML syntax validation is
outside this profile.

### UI Resource metadata

On a UI Resource declaration or returned Resource Contents, the stable profile
SHOULD recognize these `_meta.ui` fields:

```yaml
csp:
  connectDomains: []
  resourceDomains: []
  frameDomains: []
  baseUriDomains: []
permissions:
  camera: {}
  microphone: {}
  geolocation: {}
  clipboardWrite: {}
domain: example
prefersBorder: true
```

Each CSP member, when present, MUST be an array of strings. Validation MUST NOT
contact any declared origin.

Each recognized permission member, when present, MUST be an object satisfying
the pinned Apps profile. A permission declaration is a request, not proof of
authorization or host support.

`domain`, when present, MUST be a string. The profile MUST NOT impose a
host-specific domain grammar.

`prefersBorder`, when present, MUST be boolean. It is a presentation preference,
not a rendering guarantee.

Unknown future Resource metadata MUST be preserved under existing `_meta`
forward-compatibility rules. It MUST NOT fail solely because it is absent from
the stable field catalogue.

The stable profile SHOULD validate Resource-level metadata and content-level
metadata independently. Where tooling computes effective Apps metadata, it
MUST use the precedence defined by the pinned Apps revision and MUST NOT alter
either authored value.

### Capability settings and client requirements

The stable Apps specification defines client advertisement of
`io.modelcontextprotocol/ui` with `mimeTypes`. MCP Description MUST keep these
concepts separate:

- server capability declarations;
- primitive hard client requirements; and
- capabilities observed during a particular runtime negotiation.

The presence of `_meta.ui` MUST NOT synthesize either
`capabilities.extensions` or `clientRequirements.extensions`.

For an applicable MCP revision that supports formal extensions, an author MAY
use a primitive `clientRequirements.extensions` entry only when Apps support is
an unconditional minimum requirement for use of that primitive. Apps-enabled
Tools commonly provide meaningful text fallback, so UI support is often
optional.

When the Apps profile validates a non-empty
`clientRequirements.extensions["io.modelcontextprotocol/ui"]` value, it SHOULD
validate stable client settings, including the structural type of `mimeTypes`
and whether the required Apps media type is represented. Generic compatibility
checking remains `indeterminate` when it cannot understand non-empty extension
settings.

A server `capabilities.extensions` entry, when authored or observed, remains
subject to MCP Description's protocol-version and pre-standard preservation
rules. Catalogue recognition alone does not establish extension-specific
server advertisement semantics. Until the stable Apps specification and the
applicable MCP core revision define those semantics unambiguously, the Apps
profile MUST NOT require such an entry as evidence of an Apps-capable server.

### Core protocol version independence

MCP Apps `2026-01-26` is an extension specification revision, not an MCP core
protocol version. It MUST NOT appear in or be inferred from root
`protocolVersions` solely for that reason.

An MCP Description may target MCP `2026-07-28` while Apps-profile validation
targets Apps `2026-01-26`. Existing Effective Protocol View and revision-
applicability rules continue to govern the underlying MCP structures.

The profile MUST NOT use the unresolved upstream capability-documentation
question to bypass MCP Description's protocol scoping. Support for a later Apps
revision or revised negotiation model requires an explicit profile update.

## Schema impact

This proposal adds no MCP Description serialization property. The existing JSON
Schema already permits native MCP `_meta` values and extension settings in
their designated locations.

Most Apps validation therefore belongs in a semantic profile. The
implementation MUST review the schema for reusable structural constraints but
MUST NOT globally close `_meta.ui` or an extension settings object. Such
closure would break forward-compatible preservation of future extension data.

If no safe structural schema change is needed, the implementation should state
explicitly that the schema is unchanged and identify the semantic-profile
implementation as the source of Apps-specific diagnostics.

## Examples

### UI-enabled and app-only Tools

```yaml
tools:
  - name: get_weather
    description: Get current weather
    inputSchema:
      type: object
      properties:
        location:
          type: string
      required:
        - location
    _meta:
      ui:
        resourceUri: ui://weather-server/dashboard

  - name: refresh_weather
    description: Refresh dashboard data
    inputSchema:
      type: object
    _meta:
      ui:
        resourceUri: ui://weather-server/dashboard
        visibility:
          - app

resources:
  - uri: ui://weather-server/dashboard
    name: weather_dashboard
    description: Interactive weather dashboard
    mimeType: text/html;profile=mcp-app
```

The first Tool uses the semantic default visibility of `model` and `app`. The
second Tool is app-only but remains part of the described Tool inventory.

### UI Resource content and metadata

```yaml
resources:
  - uri: ui://weather-server/dashboard
    name: weather_dashboard
    mimeType: text/html;profile=mcp-app
    protocolVersions:
      - '2025-11-25'
    examples:
      default:
        result:
          contents:
            - uri: ui://weather-server/dashboard
              mimeType: text/html;profile=mcp-app
              text: '<!DOCTYPE html><html><body><div id="app"></div></body></html>'
              _meta:
                ui:
                  csp:
                    connectDomains:
                      - https://api.example.test
                  permissions:
                    clipboardWrite: {}
                  prefersBorder: true
```

The HTML is inert example data. Validation does not load the external origin or
execute the content.

### Optional enhancement without a hard requirement

```yaml
tools:
  - name: get_weather
    inputSchema:
      type: object
    _meta:
      ui:
        resourceUri: ui://weather-server/dashboard
```

Omitting `clientRequirements` means the description makes no unconditional
client-capability claim. It does not remove the App association.

### Invalid Tool URI

```yaml
_meta:
  ui:
    resourceUri: https://example.test/dashboard
```

Expected Apps-profile result: error because `resourceUri` does not use the
`ui` scheme.

### Invalid visibility

```yaml
_meta:
  ui:
    visibility:
      - model
      - human
```

Expected Apps-profile result: error because `human` is not a stable Apps
visibility value.

### Unresolved static Resource

```yaml
tools:
  - name: get_weather
    inputSchema:
      type: object
    _meta:
      ui:
        resourceUri: ui://weather-server/dashboard
```

Expected Apps-profile result: warning because the static description does not
declare the referenced Resource. The warning does not assert that the live
server cannot serve it.

## Compatibility

Classification: **compatible addition**.

No existing MCP Description property changes meaning, and no new serialized
property is required. Documents without Apps declarations are unaffected.
Existing MCP Description 0.8.0 releases and validator snapshots remain
immutable.

Apps-specific semantic diagnostics are produced by an explicitly selected,
version-pinned profile and are distinguishable from core MCP Description
conformance. Documents carrying unknown or future `_meta.ui` members continue
to be preserved. Unknown fields do not fail merely because the stable profile
does not recognize them.

A future MCP Description version may bundle the profile for convenience, but
catalogue recognition alone remains insufficient to convert profile
diagnostics into core conformance results. Any future proposal to make a
profile mandatory must reassess compatibility separately.

## Migration

Documents that do not use MCP Apps require no migration.

Documents already using canonical native Apps structures generally require no
serialization change. Authors should declare referenced UI Resources when a
complete static contract is intended.

Authors using `_meta["ui/resourceUri"]` should migrate to
`_meta.ui.resourceUri`. Tooling may offer an explicit transformation but MUST
NOT rewrite the deprecated form as a side effect of validation.

Migration and capture tooling MUST NOT infer hard `clientRequirements` from an
App association. It also MUST NOT manufacture a server capability declaration
from Tool or Resource metadata.

## Security and privacy considerations

MCP Apps add a richer security surface than ordinary textual Tool results.
Descriptions may expose external origins, nested-frame origins, base URI
permissions, browser permission requests, and dedicated sandbox domains.

MCP Description tooling MUST treat all Apps values and Resource content as
untrusted. Ordinary validation MUST NOT:

- navigate to or fetch declared origins;
- fetch a UI Resource;
- execute HTML or JavaScript;
- grant browser permissions;
- treat a declared domain as trusted; or
- treat declared CSP metadata as evidence of live host enforcement.

Documentation generators MUST output-encode untrusted values. Security tools
MAY surface requested permissions and origins for review but MUST distinguish
declarations from observed enforcement.

Resource examples containing HTML are inert data. MCP Description documents
MUST NOT contain credentials, authentication tokens, secrets, or private user
data in Apps metadata or examples.

App-only Tools remain part of the callable server surface and SHOULD remain
visible to security, governance, inventory, and diff tooling.

## Alternatives considered

### Add a top-level `apps` collection

Rejected. MCP Apps deliberately uses Resources and Tool metadata. A second
model would duplicate the MCP contract and create mapping ambiguity.

### Add an MCP Description `ui` property to Tool

Rejected. `_meta.ui` is the canonical native MCP representation. MCP
Description should describe that representation rather than replace it.

### Keep Apps entirely opaque

Rejected as the long-term behavior. Preservation without an optional semantic
profile prevents meaningful validation, documentation, diffing, and security
review for a stable official extension.

### Require a server capability declaration to activate Apps semantics

Rejected. Stable Apps metadata describes the server's Tool and Resource
surface independently of a particular client's negotiation. The stable Apps
specification documents client advertisement, and its alignment with MCP
`2026-07-28` remains under upstream discussion.

### Infer `clientRequirements.extensions`

Rejected. Apps may be progressive enhancement, and the stable specification
recommends meaningful text fallback. A hard requirement must be authored only
when it is truly unconditional.

### Make Apps-profile errors core conformance errors

Rejected for the initial implementation. MCP Description 0.8.0 establishes
that extension-specific validation uses an explicitly selected profile and is
separate from core conformance. Preserving that boundary keeps this change a
compatible addition and avoids silently tightening open native metadata.

### Follow the Apps development draft

Rejected. Normative behavior must use a stable, pinned external specification.
Draft experimentation must not silently redefine the stable profile.

## Open questions

1. Should unresolved Tool UI Resource references remain warnings permanently,
   or become errors only under an explicit complete-contract mode?
2. What exact activation mechanism should select the built-in Apps profile in
   validator APIs and command-line tools?
3. Should capability settings validation initially cover only primitive client
   requirements, or also server extension advertisements once upstream issue
   742 is resolved?
4. Should the first profile fully validate all CSP origin strings and empty
   permission marker objects, or begin with their stable structural types?
5. When both canonical and deprecated Tool Resource URI forms are present with
   equal values, should one deprecation warning suffice or should tooling also
   report redundant metadata?
6. Should a future external-extension revision registry remain validator
   catalogue metadata, or should MCP Description eventually add a general
   document-level profile declaration mechanism?
7. Which URI normalization, if any, is appropriate for Tool-to-Resource
   matching beyond the existing MCP Description URI comparison rules?

## Implementation and validation plan

1. Add normative Apps-profile text to the active draft's extension,
   capabilities, Tools, Resources, examples, conformance, and security sections.
2. Add a pinned profile entry for `io.modelcontextprotocol/ui` and Apps
   `2026-01-26`, distinct from identifier-only catalogue recognition.
3. Add semantic validation for canonical and deprecated Tool metadata,
   visibility, UI Resource identity, cross-references, Resource Contents, and
   Resource metadata.
4. Keep unknown Apps fields open and preserve them in projection, merge,
   serialization, and conversion tests.
5. Add positive fixtures for default visibility, explicit model/App visibility,
   app-only Tools, UI Resources, CSP, permissions, Resource examples, mixed
   ordinary/App-backed Tools, and graceful degradation without a hard client
  requirement.
6. Add negative fixtures for invalid URI schemes, empty or duplicate
   visibility, unknown visibility values, incompatible media types, malformed
   CSP and permissions, and incompatible declared Resource targets.
7. Add warning fixtures for unresolved static Resources and deprecated flat
   metadata.
8. Derive fixtures where practical from official `modelcontextprotocol/ext-apps`
   examples, including the quickstart, basic host, basic Vanilla JS server, and
   `@modelcontextprotocol/server-map`.
9. Perform interoperability validation against at least one production Apps
   host, such as VS Code with GitHub Copilot, where practical. Host behavior is
   evidence and does not override the pinned stable specification.
10. Update the active draft changelog, compatibility notes, migration guidance,
    proposal snapshot provenance, and assembled specification.
11. Run the complete repository validation suite and profile-specific tests.
12. Implement normative changes on a separate `feature/mcp-apps-support`
    branch after proposal review, as required by the proposal lifecycle.

Discovery tooling such as `mcpcontract dump` or an equivalent should preserve
observed Apps metadata and disclose capability-sensitive discovery context. It
should not claim that no App exists merely because one client capability
context caused the server to omit App metadata.

Contract diff tooling may later classify changes such as added or removed UI
associations, changed Resource URIs or media types, added app-only Tools,
visibility changes, CSP origin changes, and permission changes. Such diff
classification is useful but not required for initial profile conformance.

## Decision record

Pending review.

Review must resolve profile activation, unresolved Resource severity, exact
capability-settings scope, deprecated flat metadata handling, and the effect of
upstream capability-alignment issue 742 before acceptance.