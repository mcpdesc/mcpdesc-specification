## 2. Terminology

### 2.1 Key Words

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals, as shown here.

### 2.2 Definitions

**MCP Description Document**
A document conforming to this specification that describes an MCP server surface as the JSON-compatible data model defined in Section 3.1, serialized as conforming JSON or YAML.

**Server Surface**
The durable, externally relevant characteristics and behavior of an MCP server that MCP Description can represent, including transports, instructions, security requirements, capabilities, primitives, schemas, and applicable extensions.

**Described Server Surface**
The server surface represented by an MCP Description Document. It need not include everything the server implements or exposes in every runtime context.

**Effective Protocol View**
The projection of an MCP Description Document containing the declarations applicable to one MCP protocol version.

**Primitive**
A Tool, Resource, Resource Template, or Prompt declaration in an MCP Description. The [MCP specification](https://modelcontextprotocol.io/specification/2025-11-25/server) calls Tools, Resources, and Prompts server primitives.

**Specification Extension**
A property in an MCP Description document whose name begins with `x-` that provides vendor-specific metadata outside the core specification.

**Capability**
A protocol feature or behavior supported by a server or client. MCP Description declares server capabilities in a Capabilities Object, such as resource subscriptions or list-change notifications. A primitive's `clientRequirements` instead records the minimum client capabilities needed to use it.

**Protocol Applicability**
The MCP protocol versions to which a declaration applies, determined from its effective protocol scope.

### 2.3 Normative and Informative Content

The requirements in this document and the versioned JSON Schema are normative. Together, they define conformance. If they conflict, the specification has a defect.

Examples, code excerpts, guides, and other companion documents are informative unless explicitly identified as normative. A complete example presented as valid is expected to conform. It does not create requirements or override normative text or schema constraints.

Repository fixtures are test artifacts, not independent sources of requirements. Their directory indicates whether the repository validator expects them to be valid, invalid, or valid with warnings. If a fixture conflicts with the specification, the fixture or implementation needs correction.

Section sources contain invisible anchors of the form `req-<topic>` before requirement sentences. Validation rules cite these anchors to identify the requirement they check. See [`validation/README.md`](../validation/README.md#rule-records) for details.

Anchors are informative markup. They do not create, change, or rank requirements.
