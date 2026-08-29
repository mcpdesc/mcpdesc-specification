# Getting Started with MCP Description

This guide walks you through creating your first MCP Description document.

## What You'll Build

An MCP Description document for a chess server that:
- Analyzes games and tracks player Elo ratings (tools)
- Exposes leaderboards and game history (resources)
- Provides coaching prompts (prompts)

## Step 1: Start with the Minimum

Every MCP Description needs `mcpdesc`, `info`, `protocolVersions`, and `transports`. Primitive collections are optional in 0.8.0, although this example adds a Tool.

Create a file called `chess-coach.mcpdesc.yaml`:

MCP Description supports JSON and restricted YAML as equal serializations of one JSON-compatible data model. YAML files use YAML 1.2.2 JSON-schema scalar resolution and exclude aliases, custom tags, duplicate or non-string mapping keys, merge semantics, multiple documents, and non-finite numbers.

```yaml
$schema: https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json
mcpdesc: 0.8.0
info:
  name: chess-rating-server
  title: Chess Rating MCP Server
  version: 1.0.0
protocolVersions:
- '2025-11-25'
transports:
- type: stdio
  command: chess-rating
  args:
  - serve
tools:
- name: get_player_rating
  description: Get the current Elo rating for a chess player
  inputSchema:
    type: object
    properties:
      player_id:
        type: string
        description: Player identifier
    required:
    - player_id
```

That's a valid MCP Description. It declares a server with one tool accessible via stdio.

The sample `$schema` value points to the exact Draft 4 schema resource for structural validation and editor tooling. The `mcpdesc` field still carries the MCP Description conformance version, so Draft 4 documents remain `mcpdesc: 0.8.0`.

## Step 2: Add Richer Info

Expand the `info` object with a human-readable title and description. Protocol coverage remains at the document root:

```yaml
info:
  name: chess-coach
  title: Chess Coach MCP Server
  version: 1.0.0
  description: Analyze chess games, track ratings, and review game history
  contact:
    name: Your Team
    email: team@example.com
  license:
    name: MIT
```

## Step 3: Add More Tools

Add tools with input schemas, output schemas, and behavioral annotations:

```yaml
tools:
- name: analyze_game
  title: Analyze Chess Game
  description: Analyze a chess game from PGN notation
  inputSchema:
    type: object
    properties:
      pgn:
        type: string
        description: Game in PGN format
      depth:
        type: integer
        minimum: 1
        maximum: 40
    required:
    - pgn
  outputSchema:
    type: object
    properties:
      evaluation:
        type: number
      best_move:
        type: string
    required:
    - evaluation
    - best_move
  examples:
    short-opening:
      input:
        pgn: 1. e4 e5 2. Nf3 Nc6
        depth: 12
      result:
        content:
        - type: text
          text: White has a small opening advantage.
        structuredContent:
          evaluation: 18
          best_move: Bb5
  annotations:
    readOnlyHint: true
    destructiveHint: false
    idempotentHint: true
  tags:
  - analysis
- name: record_game_result
  title: Record Game Result
  description: Record a game result and update Elo ratings
  inputSchema:
    type: object
    properties:
      white_player_id:
        type: string
      black_player_id:
        type: string
      result:
        type: string
        enum:
        - "1-0"
        - "0-1"
        - "1/2-1/2"
    required:
    - white_player_id
    - black_player_id
    - result
  annotations:
    readOnlyHint: false
    destructiveHint: false
  tags:
  - rating
  - game
```

**Annotation tips:**
- `readOnlyHint: true` — the tool only reads data
- `destructiveHint: false` — the tool doesn't delete anything
- `idempotentHint: true` — same input always gives same result

Tool `examples` pair a named complete `tools/call` argument object with a completed Tool Result. Keep `content` even when `structuredContent` is present. Successful structured content must match `outputSchema`; execution errors use `isError: true` and omit `structuredContent`. For a no-argument Tool, write `input: {}` explicitly. Examples are untrusted, non-exhaustive documentation, not guarantees of live behavior; never include credentials or production data.

When a Tool has an unconditional client capability precondition, add a revision-valid non-empty `clientRequirements` object. This applies to `tools/call`, not `tools/list`:

```yaml
tools:
- name: full_rebuild
  protocolVersions: ['2026-07-28']
  inputSchema:
    type: object
    additionalProperties: false
  clientRequirements:
    extensions:
      io.modelcontextprotocol/tasks: {}
```

Do not derive this field from server capabilities or conditional Elicitation Declarations. Split protocol-scoped variants when the requirement shape differs by MCP revision.

When several declarations reuse a complete schema or named example, place it in the matching root `components` namespace and use a local `$componentRef`:

```yaml
components:
  schemas:
    PlayerLookup:
      type: object
      properties:
        player_id:
          type: string
      required: [player_id]
tools:
  - name: get_player_rating
    inputSchema:
      $componentRef: '#/components/schemas/PlayerLookup'
```

References are local to one document, have no sibling properties, and inherit protocol applicability from each use site. Keep JSON Schema `$ref` for reuse inside an embedded schema. See [the reusable-components example](../examples/reusable-components.yaml).

## Step 4: Add Resources

Resources are data the server exposes. Static resources have fixed URIs; templates have parameters:

```yaml
resources:
- uri: chess://leaderboard/classical
  name: classical_leaderboard
  title: Classical Leaderboard
  description: Top-100 classical chess ratings
  mimeType: application/json
resourceTemplates:
- uriTemplate: "chess://games/{game_id}"
  name: game_detail
  title: Game Detail
  description: Full details of a specific chess game
  mimeType: application/json
  examples:
    sample-game:
      uri: chess://games/example-1234
      result:
        contents:
        - uri: chess://games/example-1234
          mimeType: application/json
          text: '{"id":"example-1234","result":"1-0"}'
- uriTemplate: "chess://players/{player_id}/rating-history"
  name: player_rating_history
  title: Player Rating History
  description: Historical Elo rating progression
  mimeType: application/json
```

Resource `examples` use the declaration URI as their implicit read input. Resource Template examples add the exact concrete expanded `uri`. In both cases, copy only a completed `resources/read` result payload, preserve content order, and use exactly one of `text` or base64 `blob` per content entry. Examples are snapshots and do not guarantee live contents or freshness. Never dereference example URIs automatically or publish sensitive captured data.

For MCP 2026-07-28, the copied result also requires `resultType: complete`, non-negative `ttlMs`, and `cacheScope: public` or `private`. Earlier revisions omit those fields. Use disjoint protocol-scoped Resource variants when one logical Resource needs examples for both shapes.

## Step 5: Add Prompts

Prompts are server-side templates that generate messages:

```yaml
prompts:
- name: game_summary
  title: Game Summary
  description: Generate a narrative summary of a chess game
  arguments:
  - name: game_id
    description: Game to summarize
    required: true
  - name: detail_level
    description: "'brief', 'standard', or 'comprehensive'"
    required: false
  examples:
    standard:
      arguments:
        game_id: example-2026-08-24
        detail_level: standard
      result:
        resultType: complete
        messages:
        - role: user
          content:
            type: text
            text: Summarize the game with key turning points.
```

Prompt `examples` pair a complete `prompts/get` argument map with one completed Prompt result. When no arguments are supplied, either omit `arguments` or write `arguments: {}`. Keep only the payload from the JSON-RPC response's `result` member. For MCP 2026-07-28, include `resultType: complete`; earlier revisions omit it. Examples are descriptive snapshots, not guarantees of deterministic live output.

Tool `interactionExamples` are for the case where one Tool invocation needs more than a terminal result. Put the initial `tools/call` arguments in `input`, record each elicitation, sampling, or roots exchange as one ordered semantic step, and keep the terminal completed Tool Result in `result`. Do not copy JSON-RPC envelopes, `InputRequiredResult`, `requestState`, task handles, or other runtime correlation data. Split protocol-scoped Tool variants when one interaction shape uses revision-specific fields such as sampling Tool use or MCP 2026-07-28 result fields.

## Step 6: Validate

To validate structure, use a JSON Schema 2020-12 validator against the [0.8.0 schema](../../../schemas/mcp-description/0.8.0.json). Complete conformance also requires semantic checks for protocol scopes, transport coverage, security, tag, and component references, revision-specific fields, and Tool-example compatibility with resolved embedded schemas.

```bash
# From a checkout of this specification repository
npm test
```



## Next Steps

- See [examples/](../examples/) for complete working examples at different complexity levels
- See [examples/multi-version.yaml](../examples/multi-version.yaml) for shared declarations and protocol-scoped capability variants across MCP 2025-11-25 and MCP 2026-07-28
- Read the [full specification](../mcp-description.md)
- Learn about [vendor extensions](vendor-extensions-guide.md) for adding custom metadata
- Read the [0.7.0 to 0.8.0 migration guide](migration-0.7-to-0.8.md)
- Compare with [OpenAPI concepts](comparison-with-openapi.md) if you have API background
