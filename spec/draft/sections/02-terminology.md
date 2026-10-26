## 2. Terminology

### 2.1 Key Words

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

### 2.2 Definitions

**MCP Description Document**
A document conforming to this specification that describes an MCP server surface as the JSON-compatible data model defined in Section 3.1, serialized as conforming JSON or YAML.

**Server Surface**
The durable, externally relevant characteristics and behavior of an MCP server that MCP Description can represent, including transports, instructions, security requirements, capabilities, primitives, schemas, and applicable extensions.

**Described Server Surface**
The server surface represented by an MCP Description Document. It is not necessarily exhaustive of everything implemented or available in every runtime context.

**Effective Protocol View**
The projection of an MCP Description Document containing the declarations applicable to one MCP protocol revision.

**MCP Server**
A server implementing the Model Context Protocol, exposing tools, resources, and/or prompts to MCP clients.

**MCP Client**
An application that connects to an MCP server using the MCP protocol.

**Tool**
A server-side function that an MCP client can invoke with structured input parameters and receive structured output.

**Resource**
A server-side data source identified by a URI that an MCP client can read.

**Resource Template**
A parameterized resource definition using a URI template (RFC 6570) that can produce resource URIs when template variables are provided.

**Prompt**
A server-side prompt template that an MCP client can invoke with arguments to generate messages.

**Transport**
The communication mechanism used to connect to an MCP server (e.g., stdio, streamable-http, SSE).

**Specification Extension**
A property in an MCP Description document whose name begins with `x-` that provides vendor-specific metadata outside the core specification.

**Capability**
A feature or behavior supported by an MCP server, declared in a Capabilities Object.

**Protocol Applicability**
The MCP protocol revisions to which a declaration applies, determined from its effective protocol scope.

**Security Requirement**
A declaration of one or more named security schemes and, where applicable, authorization scopes that must be satisfied to access a transport or primitive.

### 2.3 Normative and Informative Content

The requirements in this document and the versioned JSON Schema are normative. They jointly define conformance; an inconsistency between them is a specification defect.

Examples, code excerpts, guides, and other companion documents are informative unless explicitly identified as normative. A complete example presented as valid is expected to conform, but it does not create requirements or override normative text or schema constraints.

Repository fixtures are test artifacts rather than independent sources of requirements. Their directory identifies whether the repository validator expects them to be valid, invalid, or valid with warnings. If a fixture conflicts with the specification, the fixture or implementation must be corrected.

