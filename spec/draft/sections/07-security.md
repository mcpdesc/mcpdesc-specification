## 7. Security

MCP Description represents statically known authentication and authorization through reusable named Security Scheme Objects and Security Requirement Arrays. Both `securitySchemes` and `security` are OPTIONAL.

These declarations describe access requirements. They do not define token acquisition, authorization-server discovery, runtime access-control policy, or authorization-filtered discovery behavior.

### 7.1 Named Security Schemes

Root `securitySchemes` is a map from a local name to a Security Scheme Object. Every local name MUST match `^[A-Za-z0-9._-]+$`.

```json
{
  "securitySchemes": {
    "oauth": {
      "type": "oauth2",
      "flows": {
        "authorizationCode": {
          "authorizationUrl": "https://auth.example.com/authorize",
          "tokenUrl": "https://auth.example.com/token",
          "scopes": { "games:read": "Read games" }
        }
      }
    },
    "api-key": {
      "type": "apiKey",
      "in": "header",
      "name": "X-API-Key"
    }
  }
}
```

### 7.2 Security Scheme Object

Each Security Scheme Object MUST include `type`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | **Yes** | `"http"`, `"apiKey"`, `"oauth2"`, or `"openIdConnect"` |
| `scheme` | string | For `http` | HTTP authentication scheme |
| `bearerFormat` | string | No | Bearer-token format hint |
| `name` | string | For `apiKey` | API-key parameter name |
| `in` | string | For `apiKey` | `"header"`, `"query"`, or `"cookie"` |
| `flows` | OAuth Flows Object | For `oauth2` | One or more OAuth2 flows |
| `openIdConnectUrl` | string (URI) | For `openIdConnect` | OpenID Connect discovery URL |
| `description` | string | No | Human-readable description |

An OAuth Flows Object MAY contain `implicit`, `password`, `clientCredentials`, and `authorizationCode`. At least one flow MUST be present. Every flow MUST contain a `scopes` map and MAY contain `refreshUrl`. An implicit flow MUST contain `authorizationUrl`; password and client-credentials flows MUST contain `tokenUrl`; an authorization-code flow MUST contain both `authorizationUrl` and `tokenUrl`.

### 7.3 Security Requirement Array

A `security` value is an array of Security Requirement Objects. Each object maps local security-scheme names to arrays of scope strings.

```json
{
  "security": [
    { "oauth": ["games:read"] },
    { "api-key": [] }
  ]
}
```

Entries in the outer array are alternatives (**OR**). Multiple scheme names in one object are jointly required (**AND**). Every listed OAuth2 or OpenID Connect scope is required.

Every referenced name MUST exist in root `securitySchemes`. Scope arrays MUST contain unique strings. HTTP and API-key schemes MUST use an empty scope array. An OAuth2 or OpenID Connect requirement MAY use a scope absent from a static scope catalogue; validators MAY warn but MUST NOT reject solely for that reason.

Array order, scheme-key order, and scope order are not semantically significant.

### 7.4 Omission, Clearing, and Anonymous Access

The following forms are distinct:

- omitted `security`: inherit at a nested level, or make no declaration at root;
- `security: []`: explicitly clear any inherited mcpdesc security requirement;
- `security: [{}]`: explicitly allow anonymous access as an alternative;
- `security: [{}, {"oauth": ["games:read"]}]`: allow anonymous access or the named OAuth requirement.

Implementations MUST preserve the distinction between `[]` and `[{}]` and MUST NOT normalize one into the other.

### 7.5 Placement and Precedence

`security` MAY appear at the document root, a Transport Object, or any Tool, Resource, Resource Template, or Prompt Object.

For a primitive used through a selected transport, the effective requirement is the first present value in this order:

1. primitive `security`;
2. selected transport `security`;
3. root `security`;
4. no mcpdesc-declared requirement.

This is replacement, not merging. Protocol projection MUST preserve security declarations and MUST NOT copy one transport's inherited security onto a primitive unless a separate operation also selects that transport.

### 7.6 Interpretation Limits

Primitive requirements describe access conditions, not identities, roles, ownership, or exact discovery visibility. A requirement neither guarantees that a primitive is hidden before authorization nor guarantees that it is visible.

A primitive-level override applies regardless of selected transport. If transport inheritance cannot faithfully represent materially different per-transport primitive requirements, authors SHOULD publish separate descriptions or use a specification extension. Tools MUST NOT invent a combined requirement.
