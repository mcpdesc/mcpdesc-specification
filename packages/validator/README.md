# @mcpdesc/validator

Isomorphic structural and semantic validation for immutable MCP Description specification snapshots.

Version `0.6.0` cumulatively supports these immutable snapshots.

| Selector | Tag | Embedded schema SHA-256 |
|---|---|---|
| `0.8.0-draft.1` | `v0.8.0-draft.1` | `4ceb6042c3fd31703199cd3db869ec5c35c17d2fe9ab7b2f5b96a2a3af0cebe4` |
| `0.8.0-draft.2` | `v0.8.0-draft.2` | `ab692c1a5a0f7e5f29be1940aa8c64a56d4620be0a19d00cf0a64680b7e517fa` |
| `0.8.0-draft.3` | `v0.8.0-draft.3` | `8823c1f1946360b2a44d00920e2092e5e4acd139a1964befad4eb0bf3ce96002` |
| `0.8.0-draft.4` | `v0.8.0-draft.4` | `93ed03f74059b5b3ce7509a96b59161bdab2c3cf7734397a9bec5a7588d0b03b` |
| `0.8.0-rc.1` | `v0.8.0-rc.1` | `936a0f24ade501fcabf3d6498c0440c445daa672a575573a35954cee49430ac4` |

Repository changes alone do not publish the package or create specification or validator tags.

## Usage

```js
import { validateMcpDescription } from '@mcpdesc/validator';

const result = validateMcpDescription(parsedDocument, {
  specification: '0.8.0-rc.1'
});

if (!result.valid) {
  console.error(result.diagnostics);
}
```

Callers provide an already parsed JavaScript value. JSON and YAML parsing are outside this package.

The `options` argument and exact `specification` selector are required. The unqualified selector `0.8.0` is intentionally unsupported because draft and release-candidate iterations are immutable compatibility contracts.

### Entry points

| Entry | Strict CSP without `unsafe-eval` | Fixed MCP Description schemas | Document-provided schemas |
|---|---|---|---|
| `@mcpdesc/validator` | No | Compiled by AJV at runtime | Compiled or interpreted at runtime |
| `@mcpdesc/validator/browser` | Yes | Precompiled during package development | Interpreted at runtime |
| `@mcpdesc/validator/standalone` | Yes | Precompiled during package development | Interpreted at runtime |

Browser applications that prohibit dynamic code generation should use the descriptive CSP-safe browser entry:

```js
import { validateMcpDescription } from '@mcpdesc/validator/browser';
```

The `/browser` entry is a public alias for the existing `/standalone` implementation. `/standalone` remains supported for backward compatibility. Both have the same synchronous API, selectors, diagnostics, and offline external-reference behavior as the default entry. Fixed MCP Description schemas and JSON Schema meta-schemas are precompiled during package development; document-provided Tool and Elicitation schemas use the package's interpreted JSON Schema dependency, so neither entry uses `eval` or `new Function` or requires `unsafe-eval`. These entries are larger and slower than the default AJV-based entry and are JavaScript, not WASM.

The default entry remains unchanged and uses AJV runtime compilation. Applications that need dynamic schema compilation can use it where their runtime policy permits dynamic code generation. Importing it may fail when a browser enforces strict CSP. The package intentionally does not select a different implementation through conditional exports; consumers choose the required behavior explicitly.

## Snapshot resolution

`resolveMcpDescriptionSpecification` resolves an exact validator selector from
the document's `$schema` identity or checks a caller-supplied exact selector:

```js
import { resolveMcpDescriptionSpecification } from '@mcpdesc/validator';

const resolution = resolveMcpDescriptionSpecification(parsedDocument);
if (resolution.status === 'resolved') {
  console.log(resolution.specification, resolution.provenance);
} else {
  console.error(resolution.diagnostics);
}
```

Resolution is pure and performs no network retrieval. It does not validate the
document and never infers a draft snapshot from `mcpdesc: "0.8.0"` alone.
Draft 4's format-qualified schema URI resolves uniquely. Drafts 1 through 3
share the legacy `https://mcpdesc.org/schema/0.8.0.json` URI, so that URI is
ambiguous unless the caller supplies a consistent exact selector:

```js
const resolution = resolveMcpDescriptionSpecification(parsedDocument, {
  specification: '0.8.0-draft.3'
});
```

Unresolved results distinguish missing, invalid, unknown, ambiguous, and
contradictory identity, as well as unsupported caller selectors. A supplied
selector can resolve a document with no `$schema`; when `$schema` is present it
must match the selected snapshot's recorded schema URI.

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

The package exports frozen `supportedSpecifications`, `supportedProtocolVersions`, and `specificationProvenance` values. Provenance records include the snapshot tag, recorded schema URI, and embedded schema SHA-256 digest. Public validation dispatches through a registry keyed by exact specification selectors. The current repository selector set is `0.8.0-draft.1`, `0.8.0-draft.2`, `0.8.0-draft.3`, `0.8.0-draft.4`, and `0.8.0-rc.1`; the protocol-version export is the deduplicated union supported by those snapshots.

npm package SemVer tracks implementation releases independently from specification snapshot identity. Adding a later snapshot is additive: it must use a sibling implementation and selector rather than changing an existing snapshot's schema, semantics, metadata, fixtures, or results.

The runtime bundles its schema, performs no network fetches for external schema references, and imports no Node.js built-ins. Unresolved external Tool-schema references produce incomplete-validation warnings and are preserved. All three ESM entry points support Node.js 20 or later and browser bundlers.

## Snapshot lifecycle

For each approved specification snapshot, maintainers:

1. Add a versioned implementation under `src/snapshots/<selector>/` with its exact selector, snapshot tag, embedded schema, schema SHA-256 digest, and semantic rules. Existing snapshot directories remain unchanged.
2. Freeze the matching fixture corpus under `test/snapshots/<selector>/fixtures/`. Package tests must not read mutable `spec/draft/fixtures/` for an already published selector.
3. Add the exact selector to the runtime registry and update support metadata, TypeScript declarations, tests, the package changelog, and expected package contents. Unqualified versions, aliases, ranges, and not-yet-published selectors remain unsupported.
4. Run the package and repository validation suites. The schema digest, immutable metadata, fixture behavior, browser bundle, declarations, and tarball contents must all pass.

The test snapshots are repository-only development assets and are excluded from the npm tarball. Runtime snapshot implementations and embedded schemas do ship so installed packages remain self-contained.

Supporting code does not authorize publication. During release review, a maintainer explicitly decides the validator package version and intended npm dist-tag so the reviewed specification-tag commit contains the chosen package metadata. Only after that specification snapshot is tagged does a maintainer review the tarball and push an annotated `validator-v<semver>` tag. The trusted-publishing workflow requires that exact tag/package version match, reruns the package checks, and publishes SemVer prereleases with npm `next` or stable versions with `latest`. Repository scripts and other CI workflows do not choose versions, create release tags, or publish packages. No package version or publication choice for a later draft is made by this lifecycle description.

## Development checks

From the repository root:

```bash
npm test --workspace @mcpdesc/validator
npm run test:types --workspace @mcpdesc/validator
npm run test:browser --workspace @mcpdesc/validator
npm run test:package --workspace @mcpdesc/validator
```

The package test runs each immutable snapshot against its own frozen valid, invalid, and warning fixture corpus. YAML source fixtures are decoded by the test harness before validation; the public API continues to accept parsed JavaScript values only. The other checks compile the declarations, bundle the public browser entry with esbuild and Vite, reject runtime AJV compiler inputs and dynamic code generation in those bundles, and inspect `npm pack --dry-run --json` against the intended tarball contents and declared export targets.
