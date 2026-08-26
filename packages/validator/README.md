# @mcpdesc/validator

Isomorphic structural and semantic validation for immutable MCP Description specification snapshots.

The initial implementation supports exactly MCP Description `0.8.0-draft.1`, bound to tag `v0.8.0-draft.1` and the embedded `schemas/mcp-description/0.8.0.json` SHA-256 digest `4ceb6042c3fd31703199cd3db869ec5c35c17d2fe9ab7b2f5b96a2a3af0cebe4`.

## Usage

```js
import { validateMcpDescription } from '@mcpdesc/validator';

const result = validateMcpDescription(parsedDocument, {
  specification: '0.8.0-draft.1'
});

if (!result.valid) {
  console.error(result.diagnostics);
}
```

Callers provide an already parsed JavaScript value. JSON and YAML parsing are outside this package.

The `options` argument and exact `specification` selector are required. The unqualified selector `0.8.0` is intentionally unsupported because draft iterations are immutable compatibility contracts.

## Result

`validateMcpDescription` returns:

```ts
interface McpDescriptionValidationResult {
  valid: boolean;
  diagnostics: Array<{
    code: string;
    severity: 'error' | 'warning';
    message: string;
    path: Array<string | number>;
  }>;
}
```

`valid` is false only when at least one error diagnostic exists. Structural JSON Schema failures are emitted as individual diagnostics. Semantic diagnostics are deterministic and receive root-relative paths at their rule sites.

Structural paths start with AJV's instance path. A `required` error appends its `missingProperty`; an `additionalProperties` error appends its `additionalProperty`. This lets callers identify the absent or unexpected property directly.

## Support metadata

The package exports frozen `supportedSpecifications`, `supportedProtocolVersions`, and `specificationProvenance` values. Public validation dispatches through a registry keyed by exact specification selectors. The current selector set remains only `0.8.0-draft.1`.

npm package SemVer tracks implementation releases independently from specification snapshot identity. Adding a later snapshot is additive: it must use a sibling implementation and selector rather than changing an existing snapshot's schema, semantics, metadata, fixtures, or results.

The runtime bundles its schema, performs no network fetches for external schema references, and imports no Node.js built-ins. Unresolved external Tool-schema references produce incomplete-validation warnings and are preserved. The same ESM entry point supports Node.js 20 or later and browser bundlers.

## Snapshot lifecycle

For each approved specification snapshot, maintainers:

1. Add a versioned implementation under `src/snapshots/<selector>/` with its exact selector, snapshot tag, embedded schema, schema SHA-256 digest, and semantic rules. Existing snapshot directories remain unchanged.
2. Freeze the matching fixture corpus under `test/snapshots/<selector>/fixtures/`. Package tests must not read mutable `spec/draft/fixtures/` for an already published selector.
3. Add the exact selector to the runtime registry and update support metadata, TypeScript declarations, tests, and expected package contents. Unqualified versions, aliases, ranges, and not-yet-published selectors remain unsupported.
4. Run the package and repository validation suites. The schema digest, immutable metadata, fixture behavior, browser bundle, declarations, and tarball contents must all pass.

The test snapshots are repository-only development assets and are excluded from the npm tarball. Runtime snapshot implementations and embedded schemas do ship so installed packages remain self-contained.

Supporting code does not authorize publication. During release review, a maintainer explicitly decides the validator package version and intended npm dist-tag so the reviewed specification-tag commit contains the chosen package metadata. Only after that specification snapshot is tagged does a maintainer review the tarball from the tag and run `npm publish`. CI and repository scripts do not choose versions, create tags, move dist-tags, or publish packages. No package version or publication choice for a later draft is made by this lifecycle description.

## Development checks

From the repository root:

```bash
npm test --workspace @mcpdesc/validator
npm run test:types --workspace @mcpdesc/validator
npm run test:browser --workspace @mcpdesc/validator
npm run test:package --workspace @mcpdesc/validator
```

The package test covers the frozen Draft 1 valid, invalid, and warning fixture corpus. The other checks compile the declarations, build for a browser target, and inspect `npm pack --dry-run --json` against the intended tarball contents, including exclusion of test snapshots.
