#!/usr/bin/env node
// Freeze the in-progress draft into an immutable, versioned stable-release folder.
// Do not use this script for `v<version>-draft.<iteration>` snapshot tags.
//
// Usage:
//   node scripts/freeze-version.mjs <version>
//
// Example:
//   node scripts/freeze-version.mjs 0.8.0
//
// This performs the deterministic part of a stable release after maintainer
// approval: it freezes the draft, converts stable identities and status, records
// implemented proposals, and retires the active draft.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { assembleSpecification } from './draft-assembly.mjs';

const root = process.cwd();
const version = process.argv[2];

function die(message) {
  console.error(`freeze-version: ${message}`);
  process.exit(1);
}

if (!version) die('missing <version> argument (e.g. 0.8.0)');
if (!/^\d+\.\d+\.\d+$/.test(version)) die(`invalid version "${version}"; expected x.y.z`);

const draftDir = path.join(root, 'spec', 'draft');
const targetDir = path.join(root, 'spec', version);
const releaseTag = `v${version}`;
const stableSchemaId = `https://mcpdesc.org/schema/mcp-description/${version}.json`;
const prereleaseSchemaId = `https://mcpdesc.org/schema/mcp-description/${version}-rc.4.json`;

if (!fs.existsSync(draftDir)) die('spec/draft does not exist');
if (fs.existsSync(targetDir)) die(`spec/${version} already exists; frozen versions are immutable`);

fs.cpSync(draftDir, targetDir, { recursive: true });

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) die(`could not find ${label}`);
  return source.replace(search, replacement);
}

function replaceInFile(relativePath, search, replacement, label) {
  const fullPath = path.join(root, relativePath);
  const source = fs.readFileSync(fullPath, 'utf8');
  fs.writeFileSync(fullPath, replaceRequired(source, search, replacement, `${relativePath}: ${label}`));
}

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : [fullPath];
  });
}

const sectionPath = `spec/${version}/sections/00-front-matter.md`;
let frontMatter = fs.readFileSync(path.join(root, sectionPath), 'utf8');
frontMatter = frontMatter
  .replace(/^status: .+$/m, 'status: Stable release')
  .replace(/^release-candidate-iteration: .+\n/m, '')
  .replace(/^snapshot-tag: .+$/m, `release-tag: ${releaseTag}`)
  .replace(/^edition-date: .+\n/m, '')
  .replace(/^edition-tag: .+\n/m, '')
  .replace(/^editorial-base-tag: .+\n/m, '')
  .replace(/^editorial-edition: .+\n/m, '')
  .replace(/^released: false$/m, 'released: true')
  .replace(/^baseline-snapshot: .+$/m, `baseline-snapshot: v${version}-rc.4`)
  .replace(/^editors:\n(?:  - name: .+\n    url: .+\n)+/m, '')
  .replace(`**Version**: ${version} (release candidate 4; \`v${version}-rc.4\`)`, `**Version**: ${version}`)
  .replace('**Status**: Release candidate 4 — prerelease', '**Status**: Stable release')
  .replace(
    `This document is a **Release Candidate** for MCP Description v${version}, identified by prerelease tag \`v${version}-rc.4\`.\n\nThe exact proposals implemented by this release candidate are recorded in the [proposal revision manifest](../PROPOSALS.md).\n\nThis is **not** a stable release and may change before final release as review and interoperability testing conclude. The current stable release is v0.7.0, whose canonical source remains the Cisco Open \`mcptoolkit-contract\` repository.`,
    `This document is the stable MCP Description v${version} specification, identified by tag \`${releaseTag}\`.\n\nThe proposal revisions that informed this release are recorded in the [proposal revision manifest](../PROPOSALS.md).`
  );
fs.writeFileSync(path.join(root, sectionPath), frontMatter);

replaceInFile(
  `spec/${version}/sections/04-versioning.md`,
  `This release candidate uses \`\"${version}\"\` and is not a stable release.`,
  `This stable release uses \`\"${version}\"\`.`,
  'stable mcpdesc identity',
);
replaceInFile(
  `spec/${version}/sections/04-versioning.md`,
  `A prerelease label in \`$schema\` does not change the MCP Description conformance version: Release Candidate 4 documents remain \`mcpdesc: ${version}\`.\n\n\`\`\`yaml\n$schema: ${prereleaseSchemaId}\nmcpdesc: ${version}\n\`\`\``,
  `The \`$schema\` value does not change the MCP Description conformance version.\n\n\`\`\`yaml\n$schema: ${stableSchemaId}\nmcpdesc: ${version}\n\`\`\``,
  'stable schema example',
);
replaceInFile(
  `spec/${version}/sections/15-serialization.md`,
  `For ${version} Release Candidate 4, the canonical value is \`${prereleaseSchemaId}\`. The stable ${version} release will instead use \`${stableSchemaId}\`. In both cases, the \`$schema\` value does not change the required \`mcpdesc: ${version}\` discriminator.`,
  `For ${version}, the canonical value is \`${stableSchemaId}\`. The \`$schema\` value does not change the required \`mcpdesc: ${version}\` discriminator.`,
  'stable schema reference',
);
replaceInFile(
  `spec/${version}/sections/99-appendices.md`,
  `- \`${prereleaseSchemaId}\` for the Release Candidate 4 canonical schema resource\n- \`${stableSchemaId}\` for the stable ${version} canonical schema resource after release`,
  `- \`${stableSchemaId}\` for the stable ${version} canonical schema resource`,
  'stable appendix schema resources',
);

for (const fullPath of filesUnder(targetDir)) {
  const source = fs.readFileSync(fullPath, 'utf8');
  if (source.includes(prereleaseSchemaId)) {
    fs.writeFileSync(fullPath, source.replaceAll(prereleaseSchemaId, stableSchemaId));
  }
}

replaceInFile(`spec/${version}/sections/04-versioning.md`, `A public prerelease uses the target version followed by its prerelease identifier, for example \`${stableSchemaId}\`.`, 'A public prerelease uses the target version followed by its prerelease identifier, for example `https://mcpdesc.org/schema/mcp-description/0.9.0-rc.1.json`.', 'generic prerelease schema example');
replaceInFile(`spec/${version}/sections/04-versioning.md`, 'The repository files `schemas/latest.json` and `schemas/draft.json` remain version-status manifests rather than MCP Description JSON Schemas. They identify released or active-draft status for repository workflows and MUST NOT be treated as public schema identities.', 'The repository file `schemas/latest.json` and, when an active draft exists, `schemas/draft.json` are version-status manifests rather than MCP Description JSON Schemas. They identify released or active-draft status for repository workflows and MUST NOT be treated as public schema identities.', 'optional draft status manifest');
replaceInFile(`spec/${version}/sections/04-versioning.md`, 'Implementations SHOULD support the latest specification version. Implementations MAY support multiple versions.', "Implementations MAY support multiple MCP Description versions. An implementation claiming support for a version MUST process its `mcpdesc` discriminator according to that version's requirements.", 'immutable version support guidance');
replaceInFile(`spec/${version}/sections/09-tools.md`, 'The first 0.8.0 draft defines three step kinds:', 'MCP Description 0.8.0 defines three step kinds:', 'stable Tool interaction wording');
replaceInFile(`spec/${version}/sections/99-appendices.md`, 'demonstrating all features of this specification.', 'demonstrating a broad set of features from this specification.', 'example coverage claim');
replaceInFile(`spec/${version}/guides/getting-started.md`, 'Every MCP Description needs `mcpdesc`, `info`, `protocolVersions`, and `transports`. Primitive collections are optional in 0.8.0, although this example adds a Tool.', 'Every MCP Description requires `mcpdesc`, `info`, and a non-empty `protocolVersions` array. `transports` and primitive collections are optional. This tutorial adds both a transport and a Tool.', 'minimum document fields');
replaceInFile(`spec/${version}/guides/getting-started.md`, 'The sample `$schema` value points to the exact schema resource for structural validation and editor tooling. The `mcpdesc` field still carries the MCP Description conformance version, so release-candidate documents remain `mcpdesc: 0.8.0`.', 'The sample `$schema` value points to the exact schema resource for structural validation and editor tooling. The `mcpdesc` field carries the MCP Description conformance version independently of the schema resource.', 'stable conformance identity');
replaceInFile(`spec/${version}/guides/getting-started.md`, 'To validate structure, use a JSON Schema 2020-12 validator against the [0.8.0 schema](../../../schemas/mcp-description/0.8.0.json). Complete conformance also requires semantic checks for protocol scopes, transport coverage, security, tag, and component references, revision-specific fields, and Tool-example compatibility with resolved embedded schemas.\n\n```bash\n# From a checkout of this specification repository\nnpm test\n```', 'Structural validation checks the document shape. Use any JSON Schema Draft 2020-12 implementation with the [0.8.0 schema](../../../schemas/mcp-description/0.8.0.json).\n\nComplete conformance also requires semantic validation of protocol scopes, transport coverage, security, tag and component references, revision-specific fields, and Tool-example compatibility with resolved embedded schemas. The `@mcpdesc/validator` library provides structural and semantic validation for applications. For command-line use, `mcpcontract validate` validates a document and selects its declared MCP Description version:\n\n```bash\nmcpcontract validate chess-coach.mcpdesc.yaml --schema mcpdesc --strict\n```\n\nThese tools are implementations, not normative parts of the specification. See [Known Implementations](../../implementations.md) for the validator library, CLI, MCP Description Editor, and other companion tools.', 'consumer validation guidance');
replaceInFile(`spec/${version}/guides/getting-started.md`, '\n\n\n\n## Next Steps', '\n\n## Next Steps', 'validation section spacing');
replaceInFile(`spec/${version}/guides/faq.md`, `\nFor a release candidate such as RC4, the \`$schema\` value is \`${stableSchemaId}\`, while \`mcpdesc\` remains \`${version}\`.\n`, '', 'obsolete RC FAQ');
replaceInFile(`spec/${version}/guides/faq.md`, 'For MCP Description 0.8.0, add `"$schema": "https://mcpdesc.org/schema/mcp-description/0.8.0.json"` for editor support and use the repository validation workflow for complete validation. Offline validators may bundle that canonical schema locally; network retrieval is optional.', 'For MCP Description 0.8.0, add `"$schema": "https://mcpdesc.org/schema/mcp-description/0.8.0.json"` for editor support and use a conforming semantic validator for complete validation. Offline validators may bundle that canonical schema locally; network retrieval is optional. See [Known Implementations](../../implementations.md) for available libraries and tools.', 'consumer validator guidance');
replaceInFile(`spec/${version}/guides/migration-0.7-to-0.8.md`, 'a migrated 0.8.0 draft document', 'a migrated 0.8.0 document', 'stable migration wording');
replaceInFile(`spec/${version}/guides/intro.md`, 'Today, MCP servers typically expose their capabilities only at runtime. This means:', 'MCP defines runtime discovery rather than a portable, offline server-surface document. Without a separate description artifact:', 'runtime discovery framing');
replaceInFile(`spec/${version}/guides/intro.md`, '* documentation must be generated dynamically', '* documentation generation requires a live connection or implementation-specific metadata', 'documentation discovery dependency');
replaceInFile(`spec/${version}/guides/intro.md`, '### 3. No standard portable description for MCP servers', '### 3. No protocol-defined portable description for MCP servers', 'portable description heading');
replaceInFile(`spec/${version}/guides/intro.md`, 'the MCP ecosystem lacks a standard **description document**', 'the MCP protocol does not define a portable static **description document**', 'portable description scope');
replaceInFile(`spec/${version}/guides/intro.md`, '* hierarchical tag taxonomy', '* flat document-wide tag catalogue', 'flat tag catalogue');
replaceInFile(`spec/${version}/guides/relationship-to-mcp.md`, 'does not execute Tools, contain Resource content, retrieve Prompts', 'does not execute Tools, provide authoritative live Resource content, retrieve Prompts', 'runtime Resource boundary');
replaceInFile(`spec/${version}/guides/design-principles.md`, '| **Metadata** | Who built it and how | Authors, generation metadata |', '| **Supplemental metadata** | Project-specific context and provenance | Generation or observation provenance in `x-*` extensions |', 'metadata guidance');
replaceInFile(`spec/${version}/guides/comparison-with-openapi.md`, '| `info` | `info` | Nearly identical structure |', '| `info` | `info` | Similar metadata role; MCP Description additionally requires programmatic `name` |', 'Info comparison');
replaceInFile(`spec/${version}/guides/comparison-with-openapi.md`, '| `security` / `securitySchemes` | `security` | Same structure |', '| `security` / `securitySchemes` | `security` / `securitySchemes` | Named schemes and requirement arrays with MCP Description semantics |', 'security comparison');
replaceInFile(`spec/${version}/guides/comparison-with-openapi.md`, '| `tags` | `tags` on tools/resources/prompts | Per-entity tagging |', '| `tags` | Root `tags` catalogue and declaration references | Flat document-wide categorization |', 'tag comparison');
replaceInFile(`spec/${version}/guides/comparison-with-openapi.md`, 'Both specifications use a nearly identical `info` object:', 'Both specifications use an `info` object for document-wide metadata:', 'Info object wording');
replaceInFile(`spec/${version}/guides/comparison-with-openapi.md`, 'MCP tools are simpler — no HTTP verbs, path parameters, or content negotiation. Just a name, description, and input schema.', 'MCP Tools avoid HTTP verbs, path parameters, and content negotiation. Beyond their required name and input schema, 0.8.0 Tools can declare output schemas, examples, interactions, elicitation, security, client requirements, tags, annotations, metadata, and protocol-revision scope.', 'Tool comparison');
replaceInFile(`spec/${version}/guides/comparison-with-openapi.md`, '| **Tool Annotations** | Behavioral hints (readOnly, destructive, idempotent) |', '| **Tool Annotations** | Behavioral hints (readOnly, destructive, idempotent) |\n| **Protocol Revision Scopes** | One description can declare and project deterministic Effective Protocol Views for multiple MCP revisions |\n| **MCP Extensions** | Formal extension capabilities and extension-aware client requirements |\n| **Client Requirements** | Primitive-level minimum client capabilities |\n| **Elicitation and Interaction Examples** | Declared user interaction plus Tool, completion, and multi-step examples |', '0.8.0 comparison features');
replaceInFile('spec/implementations.md', '[`../schemas/mcp-description/0.7.0.json`](../schemas/mcp-description/0.7.0.json). Draft conformance', '[`../schemas/mcp-description/0.8.0.json`](../schemas/mcp-description/0.8.0.json). MCP Description conformance', 'stable validator guidance');
replaceInFile('spec/implementations.md', 'with an exact snapshot selector', 'with an exact version or snapshot selector', 'stable validator selector');
replaceInFile('spec/implementations.md', 'Tools and libraries that support the MCP Description format.', 'Tools and libraries that support the MCP Description format. This is a non-normative catalogue; inclusion does not imply endorsement or conformance certification.', 'non-normative implementation catalogue');
replaceInFile('spec/implementations.md', '## Generators', '## CLI and Generators', 'CLI catalogue heading');
replaceInFile('spec/implementations.md', 'CLI toolkit — extracts capabilities from live MCP servers, generates MCP Description documents, analyzes backward compatibility', 'CLI toolkit — validates MCP Description documents, extracts capabilities from live MCP servers, generates descriptions, and analyzes backward compatibility', 'mcpcontract validation capability');
replaceInFile('spec/implementations.md', '## Validators', '## Validator Libraries', 'validator catalogue heading');
replaceInFile('spec/implementations.md', 'Any JSON Schema validator can perform structural validation using a versioned schema such as [`../schemas/mcp-description/0.8.0.json`](../schemas/mcp-description/0.8.0.json). MCP Description conformance also includes semantic rules that JSON Schema alone cannot express; consumers should use `@mcpdesc/validator` with an exact version or snapshot selector for the combined result. External Tool-schema references are never fetched automatically and produce warnings when complete offline validation is unavailable.', 'Any JSON Schema Draft 2020-12 implementation can perform structural validation using a versioned schema such as [`../schemas/mcp-description/0.8.0.json`](../schemas/mcp-description/0.8.0.json). Structural validation checks document shape but is not sufficient for MCP Description conformance.\n\nSemantic validation applies the cross-object and revision-sensitive rules that JSON Schema alone cannot express. Applications can use `@mcpdesc/validator` with an exact version or snapshot selector for combined structural and semantic validation; command-line users can use `mcpcontract validate`. External Tool-schema references are never fetched automatically by `@mcpdesc/validator` and produce warnings when complete offline validation is unavailable.', 'validation layers');

const changelogPath = `spec/${version}/CHANGELOG.md`;
let changelog = fs.readFileSync(path.join(root, changelogPath), 'utf8');
changelog = changelog
  .replace(`- [[${version}] — Unreleased (community working draft)](#080--unreleased-community-working-draft)`, `- [[${version}] — 2026-09-08](#080--2026-09-08)`)
  .replace(`## [${version}-RC.4] — 2026-09-08`, `## [${version}] — 2026-09-08`)
  .replace('> MCP Description v0.8.0 is a community working draft under active review and interoperability testing, so its features may still change before release.\n\n', '')
  .replace('Version 0.8 adds multi-revision descriptions, including protocol-scoped declarations and deterministic views for each MCP revision.', 'Version 0.8 adds protocol-version-scoped declarations and deterministic views for each supported MCP protocol version.')
  .replace(/\nRC\.4 includes the compatible Proposal 0022 relaxation:[\s\S]*?The JSON Schema validation shape is unchanged apart from the RC\.4 identity and `\$schema` references\.\n/, '\n')
  .replace('canonical prerelease schema URIs', 'canonical versioned schema URIs')
  .replace('[Proposal 0022 review snapshot](proposal-snapshots/0022-protocol-independent-info-metadata.md)', 'Proposal 0022')
  .replace('Detailed Draft 1–4 and release-candidate history is available in the [GitHub prereleases](https://github.com/mcpdesc/mcpdesc-specification/releases) and [tags](https://github.com/mcpdesc/mcpdesc-specification/tags).', 'Detailed history is available in the [GitHub prereleases](https://github.com/mcpdesc/mcpdesc-specification/releases) and [tags](https://github.com/mcpdesc/mcpdesc-specification/tags).');
changelog = changelog
  .replace('It also introduces reusable components, richer examples and interaction scenarios, client capability requirements, elicitation declarations, extension support, and stronger validation across JSON and YAML documents.', 'It also introduces reusable components, richer examples and interaction scenarios, client capability requirements, elicitation declarations, extension support, and stronger validation across JSON and YAML documents.\n\nThe accepted proposals represented by this release are listed in the [0.8.0 proposal revision manifest](PROPOSALS.md).')
  .replace('- Removed `info.protocolVersion` and added required root `protocolVersions` using the closed set of MCP revisions whose semantics 0.8.0 validates.', '- Removed `info.protocolVersion` and added required root `protocolVersions` using the closed set of MCP revisions whose semantics 0.8.0 validates (Proposal 0001).')
  .replace('- Changed root `capabilities` from one object to an array of protocol-scoped Capabilities Objects.', '- Changed root `capabilities` from one object to an array of protocol-scoped Capabilities Objects (Proposal 0001).')
  .replace('- Replaced inline security definitions with named root `securitySchemes` and Security Requirement Arrays.', '- Replaced inline security definitions with named root `securitySchemes` and Security Requirement Arrays (Proposal 0003).')
  .replace('- Required every Tool to contain an object-rooted `inputSchema`.', '- Required every Tool to contain an object-rooted `inputSchema` (Proposal 0001).')
  .replace('- Updated pre-1.0 versioning policy to permit breaking changes in `0.x` minor releases.', '- Updated pre-1.0 versioning policy to permit breaking changes in `0.x` minor releases (release policy).')
  .replace('- MCP `2026-07-28` support and protocol applicability across transports, capabilities, and primitive declarations.', '- MCP `2026-07-28` support and protocol applicability across transports, capabilities, and primitive declarations (Proposal 0001).')
  .replace('- Deterministic Effective Protocol Views with projection and conflict-detecting merge behavior.', '- Deterministic Effective Protocol Views with projection and conflict-detecting merge behavior (Proposal 0001).')
  .replace('- Root `instructions`, formal MCP extension declarations, and primitive `clientRequirements`.', '- Root `instructions`, formal MCP extension declarations, and primitive `clientRequirements` (Proposals 0001, 0012).')
  .replace('- Named Tool, Resource, Resource Template, and Prompt examples, plus Tool interaction and completion examples.', '- Named Tool, Resource, Resource Template, and Prompt examples, plus Tool interaction and completion examples (Proposals 0004, 0005, 0015, 0016, 0017).')
  .replace('- Reusable typed `components` referenced through local `$componentRef` objects.', '- Reusable typed `components` referenced through local `$componentRef` objects (Proposal 0009).')
  .replace('- Operation-level elicitation declarations and object-level `x-*` specification extensions.', '- Operation-level elicitation declarations and object-level `x-*` specification extensions (Proposals 0007, 0011).')
  .replace('- JSON and restricted YAML serializations, canonical versioned schema URIs, and expanded semantic validation.', '- JSON and restricted YAML serializations, canonical versioned schema URIs, and expanded semantic validation (Proposals 0010, 0019).')
  .replace('- Made `transports` optional and defined omission of an optional section as no declaration rather than evidence of runtime non-support.', '- Made `transports` optional and defined omission of an optional section as no declaration rather than evidence of runtime non-support (Proposal 0013).')
  .replace('- Required ordinary declaration collections to be non-empty when present and projection or merge to omit collections that become empty.', '- Required ordinary declaration collections to be non-empty when present and projection or merge to omit collections that become empty (Proposal 0013).')
  .replace('- Defined MCP 2025-06-18 as the floor for complete revision-specific semantic validation; older recognized revisions produce incomplete-validation diagnostics.', '- Defined MCP 2025-06-18 as the floor for complete revision-specific semantic validation; older recognized revisions produce incomplete-validation diagnostics (Proposals 0001, 0002).')
  .replace('- Aligned Tool, Resource, Resource Template, Prompt, annotation, `_meta`, and extension validation with their applicable MCP revisions.', '- Aligned Tool, Resource, Resource Template, Prompt, annotation, `_meta`, and extension validation with their applicable MCP revisions (Proposals 0001, 0002).')
  .replace('- Treated unrecognized MCP-reserved extension identifiers and unresolved external Tool schema references as warning-and-preserve conditions.', '- Treated pre-standard or unrecognized MCP extension declarations and unresolved external Tool schema references as warning-and-preserve conditions (Proposals 0001, 0021).')
  .replace('- Distinguished MCP 2025-11-25 core Tasks from MCP 2026-07-28 Tasks extensions.', '- Distinguished MCP 2025-11-25 core Tasks from MCP 2026-07-28 Tasks extensions (Proposal 0001).')
  .replace('- Made active specification examples vendor-neutral and removed bundled vendor-specific extension metadata.', '- Made active specification examples vendor-neutral and removed bundled vendor-specific extension metadata (editorial).')
  .replace('\n\n\n### Breaking', '\n\n### Breaking');
fs.writeFileSync(path.join(root, changelogPath), changelog);

const { content: assembledSpecification } = assembleSpecification(root, version);
fs.writeFileSync(path.join(targetDir, 'mcp-description.md'), assembledSpecification);

const schemaPath = path.join(root, 'schemas', 'mcp-description', `${version}.json`);
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
schema.$id = stableSchemaId;
schema.title = 'MCP Description (mcpdesc)';
schema.description = 'A static, curated format to describe what an MCP server offers. Uses MCP-native terminology, an OpenAPI-aligned info and security structure, and support for multiple transports, protocol revisions, and specification extensions. Supports MCP protocol revisions 2024-11-05, 2025-03-26, 2025-06-18, 2025-11-25, and 2026-07-28.';
fs.writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);

const latestPath = path.join(root, 'schemas', 'latest.json');
const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
latest['mcp-description'] = version;
fs.writeFileSync(latestPath, `${JSON.stringify(latest, null, 2)}\n`);

const statusPath = path.join(root, 'specification-status.json');
const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
status.stable = {
  version,
  status: 'current-stable-release',
  canonicalSource: 'https://github.com/mcpdesc/mcpdesc-specification',
  path: `spec/${version}`,
  releaseTag,
  releaseDate: '2026-09-08',
};
delete status.draft;
delete status.editorialEdition;
fs.writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`);

const excludedProposals = new Set(['0008-primitive-provenance.md']);
const proposalSource = path.join(targetDir, 'proposal-snapshots');
for (const filename of fs.readdirSync(proposalSource).filter((name) => name.endsWith('.md'))) {
  if (excludedProposals.has(filename)) continue;
  const source = fs.readFileSync(path.join(proposalSource, filename), 'utf8');
  let implemented = replaceRequired(source, '- Status: Review', '- Status: Implemented', `${filename}: proposal status`);
  const decision = 'Accepted and implemented in MCP Description 0.8.0 by maintainer release decision on 2026-09-08. The decision approves the documented bootstrap review-period exceptions based on public Draft 1-4 and RC.1-RC.4 review and interoperability testing.';
  implemented = replaceRequired(implemented, '## Decision record\n', `## Decision record\n\n${decision}\n`, `${filename}: decision record`)
    .replace(/\nPending (?:community )?review(?: and maintainer decision)?\.(?:[^\n]*)?\n/, '\n');
  fs.writeFileSync(path.join(root, 'proposals', filename), implemented);
}

replaceInFile('README.md', '> This repository is the development home for the next version of the MCP Description Specification. Draft material here is not a released specification until it is explicitly tagged and published — see the status table below.', '> This repository is the canonical home of the MCP Description Specification.', 'repository status');
replaceInFile('README.md', '| 0.7.0 | Current stable release | [`cisco-open/mcptoolkit-contract`](https://github.com/cisco-open/mcptoolkit-contract/tree/main/spec) |\n| 0.8.0 | Release Candidate 4 (`v0.8.0-rc.4`; prerelease) | [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification) |', '| 0.8.0 | Current stable release | [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification/tree/v0.8.0/spec/0.8.0) |\n| 0.7.0 | Previous stable release | [`cisco-open/mcptoolkit-contract`](https://github.com/cisco-open/mcptoolkit-contract/tree/main/spec) |', 'status table');
replaceInFile('README.md', 'Release Candidate 4 defines the root Info Object as document-wide metadata independent of MCP protocol revisions. It is a compatible relaxation that preserves Info metadata during migration and projection without changing the JSON Schema shape. RC.4 remains a prerelease and does not update `schemas/latest.json`; earlier release-candidate tags remain unchanged.', 'MCP Description 0.8.0 adds MCP `2026-07-28` support, multi-revision server descriptions, and deterministic Effective Protocol Views. It also introduces reusable components, richer examples and interactions, primitive client capability requirements, elicitation declarations, formal MCP extension support, reusable security schemes, and conforming JSON and YAML serializations. See the [changelog](CHANGELOG.md) for details.', 'release summary');
replaceInFile('README.md', '- `main` is the integration branch and the default view of the project. It carries every released specification version as a folder under `spec/`, plus the in-progress `spec/draft/`, so work in progress is visible without switching branches.\n- Feature branches (for example `feature/support-meta` or `feature/support-mcp-2026-07-28`) target `main` via pull request and change `spec/draft/`.\n- Released versions are frozen into their own version folder under `spec/` (for example `spec/0.8.0/`) and tagged (for example `v0.8.0`); `spec/draft/` is then re-initialized from that snapshot.\n- `schemas/latest.json` continues to identify v0.7.0 until stable v0.8.0 is explicitly released.', '- `main` is the integration branch and the default view of the project. It carries every released specification version and, when development is active, the in-progress `spec/draft/`.\n- Feature branches target `main` via pull request. When an active development version has been initialized, normative feature branches change `spec/draft/`.\n- Released versions are frozen into their own version folder under `spec/` (for example `spec/0.8.0/`) and tagged (for example `v0.8.0`).\n- `schemas/latest.json` identifies the current stable schema. No active draft is present until development of the next version begins.', 'repository roles');
replaceInFile('README.md', 'spec/                         Per-version specification folders (draft/ + frozen releases)', 'spec/                         Per-version specification folders and optional active draft', 'repository structure');

const specReadmePath = path.join(root, 'spec', 'README.md');
let specReadme = fs.readFileSync(specReadmePath, 'utf8');
specReadme = specReadme
  .replace(/> This directory contains[\s\S]*?and upgrade when the format advances\./, `> This directory contains the MCP Description (\`mcpdesc\`) specification. Version\n> **${version}** is the current stable release, maintained in this repository.\n> Implementations vendor a single schema version from [\`../schemas/mcp-description/\`](../schemas/mcp-description/)\n> and upgrade when the format advances.`)
  .replace('| 0.7.0 | Current stable release |', '| 0.7.0 | Previous stable release |')
  .replace('| 0.8.0 | Release Candidate 4 (`v0.8.0-rc.4`; prerelease) | [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification) | [`../schemas/mcp-description/0.8.0.json`](../schemas/mcp-description/0.8.0.json) (prerelease) |', '| 0.8.0 | Current stable release | [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification/tree/v0.8.0/spec/0.8.0) | [`../schemas/mcp-description/0.8.0.json`](../schemas/mcp-description/0.8.0.json) |')
  .replace('| 0.7.0 | Previous stable release | [`cisco-open/mcptoolkit-contract`](https://github.com/cisco-open/mcptoolkit-contract/tree/main/spec) | [`../schemas/mcp-description/0.7.0.json`](../schemas/mcp-description/0.7.0.json) |\n| 0.8.0 | Current stable release | [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification/tree/v0.8.0/spec/0.8.0) | [`../schemas/mcp-description/0.8.0.json`](../schemas/mcp-description/0.8.0.json) |', '| 0.8.0 | Current stable release | [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification/tree/v0.8.0/spec/0.8.0) | [`../schemas/mcp-description/0.8.0.json`](../schemas/mcp-description/0.8.0.json) |\n| 0.7.0 | Previous stable release | [`cisco-open/mcptoolkit-contract`](https://github.com/cisco-open/mcptoolkit-contract/tree/main/spec) | [`../schemas/mcp-description/0.7.0.json`](../schemas/mcp-description/0.7.0.json) |')
  .replace('The exact proposal revisions represented by Draft 4 are recorded in its [`draft/PROPOSALS.md`](draft/PROPOSALS.md) manifest.', 'The exact proposal revisions represented by 0.8.0 are recorded in its [`0.8.0/PROPOSALS.md`](0.8.0/PROPOSALS.md) manifest.')
  .replace(`\`\`\`yaml
mcpdesc: 0.7.0
info:
  name: chess-rating-server
  title: Chess Rating MCP Server
  version: 1.0.0
transports:
\- type: stdio
  command: chess-rating
  args:
  \- serve
tools:
\- name: get_player_rating
  description: Get the current Elo rating for a chess player
  inputSchema:
    type: object
    properties:
      player_id:
        type: string
        description: Player identifier
    required:
    \- player_id
\`\`\``, `\`\`\`yaml
$schema: ${stableSchemaId}
mcpdesc: ${version}
info:
  name: chess-rating-server
  title: Chess Rating MCP Server
  version: 1.0.0
protocolVersions:
\- '2026-07-28'
\`\`\``)
  .replace('  draft/               Active prerelease (currently 0.8.0-rc.4)\n', '')
  .replace('    mcp-description.md  Assembled normative specification text\n    sections/          Normative specification, section by section\n    guides/            Rationale, tutorials, and comparisons (non-normative)\n    examples/          Example MCP Description documents\n    extensions/        Vendor extension specifications\n    CHANGELOG.md       Format version history\n', '')
  .replace('  0.7.0/               Frozen release pointer (canonical source: Cisco Open)', '  0.8.0/               Frozen current stable release\n  0.7.0/               Frozen release pointer (canonical source: Cisco Open)')
  .replace('The in-progress working draft\nlives in `draft/`; when it is released it is frozen into a version folder\n(e.g. `0.8.0/`) and `draft/` is re-initialized from that snapshot.', 'An in-progress working draft lives in `draft/` when development is active; when released, it is frozen into a version folder.')
  .replace('- **Read the spec**: [draft/mcp-description.md](draft/mcp-description.md)', '- **Read the spec**: [0.8.0/mcp-description.md](0.8.0/mcp-description.md)')
  .replace('[draft/examples/](draft/examples/)', '[0.8.0/examples/](0.8.0/examples/)')
  .replace('[../schemas/mcp-description/0.7.0.json](../schemas/mcp-description/0.7.0.json) (latest', '[../schemas/mcp-description/0.8.0.json](../schemas/mcp-description/0.8.0.json) (latest')
  .replace('[draft/guides/getting-started.md](draft/guides/getting-started.md)', '[0.8.0/guides/getting-started.md](0.8.0/guides/getting-started.md)');
specReadme = specReadme.replace('- **OpenAPI-aligned** — familiar `info`, `security`, and metadata patterns\n- **Multi-transport**', '- **OpenAPI-aligned** — familiar `info`, `security`, and metadata patterns\n- **Multi-revision** — one document can describe deterministic views for multiple MCP revisions\n- **Client-aware** — primitives can declare required client capabilities and elicitation behavior\n- **Reusable** — typed local components reduce duplication across schemas and examples\n- **Example-rich** — named results, completions, and Tool interaction scenarios document behavior\n- **Multi-transport**').replace('- **Multi-transport** — declare stdio, streamable-http, and SSE endpoints\n- **Extensible**', '- **Multi-transport** — declare stdio, streamable-http, and SSE endpoints\n- **JSON + YAML** — conforming serializations share one JSON-compatible data model\n- **Extensible**');
fs.writeFileSync(specReadmePath, specReadme);

replaceInFile('CONTRIBUTING.md', '- Target `main` from a contribution branch and make normative changes under `spec/draft/`.', '- Target `main` from a contribution branch. When an active development version has been initialized, make normative changes under `spec/draft/`.', 'optional draft contribution target');
replaceInFile('CONTRIBUTING.md', '1. an issue explaining the problem and use cases;\n2. a proposal under `proposals/` when design choices or compatibility are involved;', '1. a corresponding public issue explaining the problem and use cases;\n2. a proposal authored for review and captured exactly under `spec/draft/proposal-snapshots/` when design choices or compatibility are involved;', 'proposal inputs');
replaceInFile('CONTRIBUTING.md', '7. a `spec/draft/CHANGELOG.md` entry.', '7. a changelog entry in the active development version.', 'active changelog');
replaceInFile('CONTRIBUTING.md', 'Proposals are merged to `main` only once accepted, then implemented as a separate `spec/draft/` change; see the proposal workflow in [`GOVERNANCE.md`](GOVERNANCE.md).', 'Every proposal corresponds to a public issue. Its normative changes are implemented first in the active development version under `spec/draft/`, with the reviewed proposal revision captured under `spec/draft/proposal-snapshots/` and recorded in `spec/draft/PROPOSALS.md`. Once accepted, the proposal becomes a durable decision record under the root `proposals/` directory. See the proposal workflow in [`GOVERNANCE.md`](GOVERNANCE.md).', 'proposal implementation target');
replaceInFile('AGENTS.md', 'For every normative change, update all affected artifacts:', 'When an active development version has been initialized, update all affected artifacts for every normative change:', 'optional draft discipline');
replaceInFile('AGENTS.md', '- v0.7.0 is the current stable release; its canonical source remains Cisco Open.\n- v0.8.0 is a community working draft in this repository.\n- Do not promote v0.8.0 to stable without an explicit release decision.\n- Do not change `schemas/latest.json` from 0.7.0 during draft work.', '- v0.8.0 is the current stable release in this repository.\n- v0.7.0 remains frozen; its canonical source remains Cisco Open.\n- No active draft exists until work on the next version is explicitly initialized.\n- `schemas/latest.json` identifies the current stable release and MUST NOT point to draft or prerelease content.', 'stable locked constraints');

fs.rmSync(draftDir, { recursive: true });
fs.rmSync(path.join(root, 'schemas', 'draft.json'));

console.log(`Prepared stable ${version}: froze spec/draft -> spec/${version} and retired active draft state.`);
console.log('');
console.log('Then run:');
console.log(`  npm run release:check -- stable ${version}`);
console.log('  npm test');
