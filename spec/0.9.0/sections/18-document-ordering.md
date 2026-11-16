## 18. Document-oriented Serialization Ordering

This section defines a recommended presentation order for MCP Description
fields in newly generated JSON and YAML documents. Its purpose is to make
documents easier to scan and more consistent across producers. It does not
change document meaning, validation, or conformance. Property order remains
insignificant, as specified in [Section 3.1](#31-format) and
[Section 3.7](#37-property-ordering). The same sequences apply to JSON and
YAML; neither format gives object member order semantic meaning.

<a id="req-document-ordering-default"></a>A producer that generates an MCP Description document SHOULD emit fields according to this section when it has neither a source property order to preserve nor an explicit caller-selected ordering policy. A source-preserving editor or converter SHOULD preserve the source property order unless the caller selects this ordering profile. Producers MAY expose other ordering policies.

The sequences in this section are the source of truth for this presentation
profile. JSON Schema property order, examples, and implementation-specific
constants do not define or override them. A sequence applies only to fields
defined at the stated location for the document version. It does not authorize
a field or change its validity.

### 18.1 Ordering Algorithm

<a id="req-document-ordering-algorithm"></a>An implementation applying this profile MUST emit the known fields present in a recognized fixed-field object in the listed left-to-right order, followed by any unlisted fields in their existing relative order. It MUST skip missing fields and MUST NOT create defaults or empty sections. It MUST apply a sequence to a child object only when that object's structure is recognized.

<a id="req-document-ordering-collections"></a>An implementation applying this profile MUST preserve the order of every array and the entry order of every named map, including when it organizes the elements or values within them.

<a id="req-document-ordering-recognition"></a>An implementation applying this profile MUST select a sequence using the document path, owning structure, and union discriminator together. It MUST NOT classify arbitrary objects by matching familiar field names such as `name`, `type`, `properties`, or `description`. For an unknown object, unknown variant, malformed container, or opaque subtree, it MUST preserve the existing order and MUST NOT guess a sequence or fall back to alphabetical sorting. It MUST NOT apply this profile recursively inside an opaque subtree.

<a id="req-document-ordering-preservation"></a>Applying this profile MUST NOT change any value or field presence. It MUST NOT resolve references, deduplicate values, expand aliases, or replace inline objects with references. Because unknown fields move after the known fields, their absolute positions can change even though their relative order is kept. Only a source-preserving policy avoids such moves.

This profile does not guarantee that comments, whitespace, quoting, YAML
anchors, source locations, or original property positions survive conversion.
It does not define canonical JSON or a source-aware editing API.

### 18.2 Root Document

| Structure | Field sequence |
| --- | --- |
| MCP Description root | `$schema`, `mcpdesc`, `info`, `instructions`, `protocolVersions`, `transports`, `securitySchemes`, `security`, `capabilities`, `tools`, `resources`, `resourceTemplates`, `prompts`, `tags`, `components` |

`$schema` and `mcpdesc` come first because they identify the format. Server
identity and instructions precede protocol versions and transports. Security
definitions precede their default requirements. Server capability declarations
precede primitive declarations. Tag definitions and reusable components follow
the primary server description. Unknown fields and `x-*` extensions follow
`components`, retaining their relative order.

This sequence applies only to root fields. It does not reorder tools,
resources, prompts, transports, tags, or capability entries within their arrays.

### 18.3 Identity and Shared Presentation Fields

| Structure | Field sequence |
| --- | --- |
| `info` | `name`, `title`, `version`, `id`, `description`, `icons`, `websiteUrl`, `contact`, `license` |
| `info.contact` | `name`, `url`, `email` |
| `info.license` | `name`, `url` |
| Icon entry wherever icons are declared | `src`, `mimeType`, `sizes`, `theme` |
| Root tag definition | `name`, `description` |

Icon and icon-size arrays keep their order. A declaration's `tags` array
contains names, not tag-definition objects, and keeps its exact order.

### 18.4 Transports and Security

| Structure | Field sequence |
| --- | --- |
| HTTP transport, including the schema's HTTP variants | `type`, `url`, `protocolVersions`, `security` |
| Stdio transport | `type`, `command`, `args`, `env`, `protocolVersions`, `security` |
| HTTP security scheme | `type`, `scheme`, `bearerFormat`, `description` |
| API-key security scheme | `type`, `in`, `name`, `description` |
| OAuth 2 security scheme | `type`, `description`, `flows` |
| OpenID Connect security scheme | `type`, `description`, `openIdConnectUrl` |
| OAuth `flows` | `authorizationCode`, `clientCredentials`, `implicit`, `password` |
| OAuth flow | `authorizationUrl`, `tokenUrl`, `refreshUrl`, `scopes` |

`securitySchemes` is a named map. Scheme names keep their order, and only
recognized scheme values are organized. Stdio `env` is an environment-variable
map and is opaque. OAuth `scopes` maps scope names to descriptions and keeps
its entry order.

Every `security` array keeps its exact order. Each requirement object maps
scheme names to scope arrays; both its entry order and each scope array's order
are kept. Ordering does not sort alternatives, merge requirements, expand an
empty requirement, or collapse an empty security array.

### 18.5 Server and Client Capabilities

| Structure | Field sequence |
| --- | --- |
| Entry in root `capabilities` | `protocolVersions`, `tools`, `resources`, `prompts`, `logging`, `completions`, `tasks`, `extensions`, `experimental` |
| Server tool capability | `listChanged` |
| Server resource capability | `subscribe`, `listChanged` |
| Server prompt capability | `listChanged` |
| Server task capability | `list`, `cancel`, `requests` |
| Task `requests` | `tools` |
| Task `requests.tools` | `call` |
| Declaration `clientRequirements` | `roots`, `sampling`, `elicitation`, `tasks`, `extensions`, `experimental` |

`logging`, `completions`, server `experimental`, task `list`, task `cancel`,
and task `requests.tools.call` have open payload objects, which are preserved
in full. An empty object remains empty; ordering does not add capability flags.

Client requirement values are open objects and are preserved recursively.
Their keys are not interpreted as server capability fields or converted to
flags. Client `experimental` is a named map of such values and is also
preserved. Server and client `extensions` map extension identifiers to opaque
values. Identifiers, their order, and all nested payload order are preserved.

### 18.6 Concrete Primitive Declarations

Fields follow a common progression: identity, documentation, protocol scope,
primary contract, behavior, dependencies, examples, and metadata. Each
primitive kind has its own sequence, so no sequence lists a field that the
kind does not support.

| Structure | Field sequence |
| --- | --- |
| Tool | `name`, `title`, `description`, `icons`, `tags`, `deprecated`, `protocolVersions`, `inputSchema`, `outputSchema`, `annotations`, `execution`, `security`, `clientRequirements`, `elicitations`, `examples`, `interactionExamples`, `_meta` |
| Resource | `uri`, `name`, `title`, `description`, `icons`, `tags`, `deprecated`, `protocolVersions`, `mimeType`, `size`, `annotations`, `security`, `clientRequirements`, `elicitations`, `examples`, `_meta` |
| Resource template | `uriTemplate`, `name`, `title`, `description`, `icons`, `tags`, `deprecated`, `protocolVersions`, `mimeType`, `annotations`, `security`, `clientRequirements`, `elicitations`, `examples`, `completionExamples`, `_meta` |
| Prompt | `name`, `title`, `description`, `icons`, `tags`, `deprecated`, `protocolVersions`, `arguments`, `security`, `clientRequirements`, `elicitations`, `examples`, `completionExamples`, `_meta` |
| Prompt argument | `name`, `title`, `description`, `required` |
| Tool annotations | `title`, `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` |
| Resource annotations, including content-block annotations | `audience`, `priority`, `lastModified` |
| Tool `execution` | `taskSupport` |

`inputSchema` and `outputSchema` are preserved completely, including their
property maps, keyword order, and nested arrays. `_meta` is also preserved
completely. Annotation sequences apply only at recognized annotation
locations, not to arbitrary objects named `annotations` inside schemas or
application payloads.

### 18.7 Elicitation Declarations

| Structure | Field sequence |
| --- | --- |
| Elicitation declaration | `name`, `mode`, `message`, `protocolVersions`, `when`, `requestedSchema`, `url`, `onDecline`, `onCancel` |

The declaration array keeps its order. `mode` selects the declaration shape;
ordering never changes `mode` or supplies a missing one.

`requestedSchema` is an opaque schema boundary, even though the specification
defines a restricted vocabulary for elicitation schemas. No ordering sequence
applies to any of its fields, including:

- form-schema fields `$schema`, `type`, `properties`, and `required`;
- property fields `type`, `title`, `description`, `default`, `format`,
  `minLength`, `maxLength`, `minimum`, `maximum`, `enum`, `enumNames`,
  `oneOf`, `items`, `minItems`, and `maxItems`;
- enum-option fields `const` and `title`;
- item `type`, `enum`, or `anyOf` structures; and
- `additionalProperties` and its nested property-schema structure.

Parallel arrays such as `enum` and `enumNames` keep their exact order.

### 18.8 Examples and Their Fixed Envelopes

Example names are authored identifiers, not fields with a preferred order.
The `examples`, `completionExamples`, and `interactionExamples` maps keep
their entry order. The following sequences apply only to recognized example
envelopes and the protocol-defined objects within them, never to arbitrary
application input or output.

| Structure | Field sequence |
| --- | --- |
| Tool example | `input`, `result` |
| Resource example | `result` |
| Resource-template example | `uri`, `result` |
| Prompt example | `arguments`, `result` |
| Completion example | `argument`, `context`, `result` |
| Completion argument | `name`, `value` |
| Completion context | `arguments` |
| Completion result | `values`, `total`, `hasMore` |
| Completed tool result | `resultType`, `isError`, `content`, `structuredContent`, `_meta` |
| Completed resource-read result | `resultType`, `contents`, `cacheScope`, `ttlMs`, `_meta` |
| Completed prompt result | `resultType`, `description`, `messages`, `_meta` |
| Completed completion result | `resultType`, `completion`, `_meta` |
| Prompt message | `role`, `content` |
| Resource text contents | `uri`, `mimeType`, `text`, `_meta` |
| Resource blob contents | `uri`, `mimeType`, `blob`, `_meta` |
| Text content block | `type`, `text`, `annotations`, `_meta` |
| Image or audio content block | `type`, `mimeType`, `data`, `annotations`, `_meta` |
| Embedded-resource content block | `type`, `resource`, `annotations`, `_meta` |
| Resource-link content block | `type`, `uri`, `name`, `title`, `description`, `icons`, `mimeType`, `size`, `annotations`, `_meta` |

Tool example `input`, result `structuredContent`, prompt example `arguments`,
and completion context `arguments` are application-owned payloads or argument
maps and are preserved recursively. Content, messages, resource contents,
completion values, and all other arrays keep their original order.

String payloads such as `text`, `blob`, and `data` are never parsed,
reformatted, decoded, or interpreted as nested documents. Unknown result or
content variants remain untouched, including their nested objects.

### 18.9 Interaction Examples

| Structure | Field sequence |
| --- | --- |
| Tool interaction example | `input`, `steps`, `result` |
| Elicitation step | `type`, `declaration`, `request`, `response` |
| Roots or sampling step | `type`, `request`, `response` |
| Form elicitation request | `mode`, `message`, `requestedSchema` |
| URL elicitation request | `mode`, `message`, `url` |
| Accepted elicitation response | `action`, `content`, `_meta` |
| Declined or cancelled elicitation response | `action`, `_meta` |
| Roots-list request | No declared fields; preserve the empty object |
| Roots-list result | `roots`, `_meta` |
| Root declaration | `uri`, `name`, `_meta` |
| Sampling create-message request | `messages`, `systemPrompt`, `includeContext`, `modelPreferences`, `maxTokens`, `temperature`, `stopSequences`, `tools`, `toolChoice`, `metadata` |
| Sampling create-message result | `role`, `content`, `model`, `stopReason`, `_meta` |
| Sampling message | `role`, `content` |
| Sampling model preferences | `hints`, `intelligencePriority`, `speedPriority`, `costPriority` |
| Sampling model hint | `name` |
| Sampling request tool | `name`, `title`, `description`, `inputSchema`, `annotations` |
| Sampling tool choice | `mode` |
| Sampling tool-use content | `type`, `id`, `name`, `input` |
| Sampling tool-result content | `type`, `toolUseId`, `isError`, `content` |

The `steps` array is an ordered interaction trace and keeps its order, like
every array (see [Section 18.1](#181-ordering-algorithm)). Tool inputs,
elicitation response `content`, sampling tool-use `input`, sampling
`metadata`, every `_meta` subtree, and schemas keep their existing internal
order.

Sampling message content uses the content-block sequences from
[Section 18.8](#188-examples-and-their-fixed-envelopes) when its variant is
recognized. Model hint, message, tool, stop-sequence, and roots arrays keep
their order. On open result envelopes, unknown fields follow the known fields
in their existing relative order. Their values are opaque: an open envelope
does not make them interpretable.

### 18.10 Reusable Components and References

| Structure | Field sequence |
| --- | --- |
| `components` | `schemas`, `toolExamples`, `resourceExamples`, `resourceTemplateExamples`, `promptExamples` |
| Component reference object | `$componentRef` |

Each component category is a named map whose component-name order is kept.
Entire `components.schemas` values are opaque, including schema objects and
component references. Boolean subschemas inside a schema remain untouched.
Other component values use the matching example envelope sequence from
[Section 18.8](#188-examples-and-their-fixed-envelopes), or remain reference
objects. Reference objects inside an opaque schema are part of that schema and
are not traversed.

Reference strings remain byte-for-byte unchanged. Ordering does not resolve
references, rename components, reorder component entries by dependencies,
inline values, or convert between relative and absolute references.
