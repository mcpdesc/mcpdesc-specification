---

## Appendix A: Icon Object

<a id="req-icon-fields"></a>The Icon object describes an icon for UI display. Several objects in this specification use it.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `src` | string (URI) | **Yes** | URI of the icon: an HTTP or HTTPS URL, or a `data:` URI. |
| `mimeType` | string | No | MIME type override (e.g., `"image/png"`, `"image/svg+xml"`). |
| `sizes` | array\<string\> | No | Sizes at which the icon can be used (e.g., `"48x48"`, `"96x96"`, `"any"`). |
| `theme` | string | No | Theme the icon is designed for: `"light"` or `"dark"`. |

<a id="req-icon-client-formats"></a>Clients MUST support `image/png` and `image/jpeg`. Clients SHOULD also support `image/svg+xml` and `image/webp`.

---

## Appendix B: Complete Example

See [examples/full-featured.yaml](../examples/full-featured.yaml) for a complete MCP Description document that shows many features of this specification.

---

## Appendix C: JSON Schema

The canonical schema resource for this stable release is `https://mcpdesc.org/schema/mcp-description/0.9.0.json`. This repository also contains the normative JSON Schema at [../../../schemas/mcp-description/0.9.0.json](../../../schemas/mcp-description/0.9.0.json).

Frozen copies of earlier schemas may also be available from archival URLs, such as the legacy Draft 3 short URI `https://mcpdesc.org/schema/0.8.0.json` and the stable 0.7.0 mirror `https://mcpdesc.org/schema/mcp-description/0.7.0.json`. These URLs are only retrieval locations. They do not change the `$id` values embedded in the frozen schemas they mirror.

---

## Appendix D: References

### Normative References

- **[RFC 2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", RFC 2119, March 1997.
- **[RFC 3986]** Berners-Lee, T., Fielding, R., and L. Masinter, "Uniform Resource Identifier (URI): Generic Syntax", RFC 3986, January 2005.
- **[RFC 6570]** Gregorio, J., Fielding, R., Hadley, M., Nottingham, M., and D. Orchard, "URI Template", RFC 6570, March 2012.
- **[RFC 8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", RFC 8174, May 2017.
- **[RFC 8259]** Bray, T., "The JavaScript Object Notation (JSON) Data Interchange Format", RFC 8259, December 2017.
- **[RFC 9512]** Bormann, C., et al., "YAML Media Type", RFC 9512, February 2024.
- **[YAML 1.2.2]** Ben-Kiki, O., Evans, C., and I. döt Net, "YAML Ain't Markup Language, Version 1.2.2", October 2021.
- **[JSON Schema]** Wright, A., Andrews, H., Hutton, B., "JSON Schema: A Media Type for Describing JSON Documents", draft-bhutton-json-schema-01, June 2022.

### Informative References

- **[MCP Protocol]** Agentic AI Foundation, "Model Context Protocol Specification", https://modelcontextprotocol.io
- **[OpenAPI 3.1]** OpenAPI Initiative, "OpenAPI Specification v3.1.0", https://spec.openapis.org/oas/v3.1.0
- **[Semantic Versioning]** Preston-Werner, T., "Semantic Versioning 2.0.0", https://semver.org