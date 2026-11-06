## 18. Document-oriented Serialization Ordering

This section defines a recommended presentation order for MCP Description
properties in newly generated JSON and YAML documents. It is intended to make
documents easier to scan and more consistent across producers. It does not
change document meaning, validation, or conformance: property order remains
insignificant as specified in Sections 3.1 and 3.7.

<a id="req-document-ordering-default"></a>A producer that generates an MCP Description document without source property order to preserve or an explicit caller-selected ordering policy SHOULD emit properties according to this section. A source-preserving editor or converter SHOULD preserve the source property order unless the caller selects this ordering profile. Producers MAY expose other ordering policies.

The sequences in this section are the source of truth for this presentation
profile. JSON Schema property order, examples, and implementation-specific
constants do not define or override these sequences. A sequence applies only to
fields defined at the stated location for the document version; it does not
authorize a field or change its validity.

### 18.1 Ordering Algorithm

<a id="req-document-ordering-algorithm"></a>An implementation applying this profile MUST emit present known fields of a recognized fixed-field object in the listed left-to-right order, followed by unlisted fields in their existing relative order. It MUST skip missing fields and MUST NOT create defaults or empty sections. It MUST apply a rule to a child object only when that object's structure is recognized.

<a id="req-document-ordering-collections"></a>An implementation applying this profile MUST preserve the order of every array while visiting eligible elements and MUST preserve entry order in named maps while visiting values whose structure is explicitly known. The sequences below apply equally to JSON and YAML; neither format gives object member order semantic meaning.

<a id="req-document-ordering-recognition"></a>The implementation MUST identify a rule using the document path, owning structure, and union discriminator together. It MUST NOT classify arbitrary objects by matching familiar field names such as `name`, `type`, `properties`, or `description`. For an unknown object, unknown variant, malformed container, or opaque subtree, it MUST preserve the existing order and MUST NOT guess a rule or fall back to alphabetical sorting. Every array and named-map entry sequence MUST remain unchanged while the implementation visits eligible values. The implementation MUST preserve opaque subtrees without recursively applying this profile.

<a id="req-document-ordering-preservation"></a>Applying this profile MUST NOT change any value or field presence. It MUST NOT resolve references, deduplicate values, expand aliases, or replace inline objects with references. Unknown fields on an organized object follow the known fields and retain their relative order; this may change their absolute positions. A source-preserving policy is required when even those moves must be avoided.

This profile does not promise preservation of comments, whitespace, quoting,
YAML anchors, source locations, or original property positions after conversion.
It does not define canonical JSON or a source-aware editing API.

### 18.2 Root Document

| Structure | Field sequence |
| --- | --- |
| MCP Description root | `$schema`, `mcpdesc`, `info`, `instructions`, `protocolVersions`, `transports`, `securitySchemes`, `security`, `capabilities`, `tools`, `resources`, `resourceTemplates`, `prompts`, `tags`, `components` |

The header identifies the format first. Server identity and instructions
precede connectivity. Security definitions precede their default requirements.
Capability flags precede concrete declarations. Tag definitions and reusable
components follow the primary server description. Unknown fields and `x-*`
extensions follow `components`, retaining their relative order.

This sequence applies only to root properties. It does not sort tools,
resources, prompts, transports, tags, or capability entries within their arrays.

### 18.3 Identity and Shared Presentation Fields

| Structure | Field sequence |
| --- | --- |
| `info` | `name`, `title`, `version`, `id`, `description`, `icons`, `websiteUrl`, `contact`, `license` |
| `info.contact` | `name`, `url`, `email` |
| `info.license` | `name`, `url` |
| Icon entry wherever icons are declared | `src`, `mimeType`, `sizes`, `theme` |
| Root tag definition | `name`, `description` |

Preserve the order of icon and icon-size arrays. A declaration's `tags` array
contains names, not tag-definition objects, and retains its exact sequence.

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

`securitySchemes` is a named map: preserve scheme-name order and organize only
recognized scheme values. Stdio `env` is an environment-variable map and is
opaque. OAuth `scopes` is a scope-name-to-description map and retains entry
order.

Every `security` array retains its exact order. Each requirement object maps
scheme names to scope arrays; preserve both the object entry order and scope
array order. Do not sort alternatives, merge requirements, expand an empty
requirement, or collapse an empty security array.

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

`logging`, `completions`, server `experimental`, task `list`, task `cancel`, and
task `requests.tools.call` have open payload objects. Preserve them in full. An
empty object remains empty; do not synthesize capability flags.

Client requirement values are open objects. Preserve those values recursively;
do not interpret their keys as server capability fields or convert them to
flags. Client `experimental` is a named map of such values and is also
preserved. Both server and client `extensions` are extension-identifier maps
with opaque values. Preserve identifiers, their ordering, and all nested
payload ordering.

### 18.6 Concrete Capability Declarations

The common progression is identity, documentation, protocol scope, primary
contract, behavior, dependencies, examples, and metadata. Exact per-kind lists
avoid inventing fields on kinds that do not support them.

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

Preserve `inputSchema` and `outputSchema` completely, including their property
maps, keyword order, and nested arrays. Preserve `_meta` completely. Annotation
rules apply only at recognized annotation locations, not arbitrary objects
called `annotations` inside schemas or application payloads.

### 18.7 Elicitation Declarations

| Structure | Field sequence |
| --- | --- |
| Elicitation declaration | `name`, `mode`, `message`, `protocolVersions`, `when`, `requestedSchema`, `url`, `onDecline`, `onCancel` |

Preserve the order of the declaration array. Mode selects the appropriate
shape; ordering never changes it or supplies a missing discriminator.

`requestedSchema` is an opaque schema boundary, even though the specification
defines a restricted elicitation schema vocabulary. This includes the known
form-schema fields `$schema`, `type`, `properties`, and `required`; property
fields `type`, `title`, `description`, `default`, `format`, `minLength`,
`maxLength`, `minimum`, `maximum`, `enum`, `enumNames`, `oneOf`, `items`,
`minItems`, and `maxItems`; enum-option `const` and `title`; and item `type`,
`enum`, or `anyOf` structures. Preserve `additionalProperties` and its nested
property-schema structure as well. None receives an ordering rule. Preserve
parallel arrays such as `enum` and `enumNames` exactly.

### 18.8 Examples and Their Fixed Envelopes

Example names are authored identifiers, not fields with a preferred order.
Preserve entry order in `examples`, `completionExamples`, and
`interactionExamples` maps. Apply the following rules only to recognized
example envelopes and protocol-defined objects within them, never arbitrary
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
maps: preserve them recursively. Keep content, messages, resource contents,
completion values, and all other arrays in their original order.

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

The `steps` array is an ordered interaction trace, and the array-preservation
requirement above applies to it. Tool inputs, elicitation response `content`,
sampling tool-use `input`, sampling `metadata`, every `_meta` subtree, and
schemas retain their existing internal order.

Sampling message content uses the known content-block rules above where its
variant is recognized. Model hint, message, tool, stop-sequence, and roots
arrays retain their order. Unknown fields on open result envelopes follow known
fields in their existing relative order, with opaque values; openness does not
permit interpreting those values.

### 18.10 Reusable Components and References

| Structure | Field sequence |
| --- | --- |
| `components` | `schemas`, `toolExamples`, `resourceExamples`, `resourceTemplateExamples`, `promptExamples` |
| Component reference object | `$componentRef` |

Each component category is a named map. Preserve component-name order. Entire
`components.schemas` values are opaque, including schema objects and component
references. Boolean subschemas inside a schema remain untouched. Other
component values use the corresponding recognized example envelope rule or
remain reference objects. Reference objects inside an opaque schema are part
of that schema and are not traversed.

Keep reference strings byte-for-byte unchanged. Do not resolve references,
rename components, reorder component entries by dependencies, inline values,
or change relative versus absolute references as part of ordering.
