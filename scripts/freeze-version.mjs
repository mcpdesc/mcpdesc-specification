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

const changelogPath = `spec/${version}/CHANGELOG.md`;
let changelog = fs.readFileSync(path.join(root, changelogPath), 'utf8');
changelog = changelog
  .replace(`- [[${version}] — Unreleased (community working draft)](#080--unreleased-community-working-draft)`, `- [[${version}] — 2026-09-08](#080--2026-09-08)`)
  .replace(`## [${version}-RC.4] — 2026-09-08`, `## [${version}] — 2026-09-08`)
  .replace('> MCP Description v0.8.0 is a community working draft under active review and interoperability testing, so its features may still change before release.\n\n', '')
  .replace('RC.4 includes the compatible Proposal 0022 relaxation:', 'The stable release includes the compatible Proposal 0022 relaxation:')
  .replace('canonical prerelease schema URIs', 'canonical versioned schema URIs')
  .replace('[Proposal 0022 review snapshot](proposal-snapshots/0022-protocol-independent-info-metadata.md)', '[Proposal 0022](../../proposals/0022-protocol-independent-info-metadata.md)');
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
replaceInFile('README.md', 'Release Candidate 4 defines the root Info Object as document-wide metadata independent of MCP protocol revisions. It is a compatible relaxation that preserves Info metadata during migration and projection without changing the JSON Schema shape. RC.4 remains a prerelease and does not update `schemas/latest.json`; earlier release-candidate tags remain unchanged.', 'Version 0.8.0 defines the root Info Object as document-wide metadata independent of MCP protocol revisions. It is a compatible relaxation that preserves Info metadata during migration and projection without changing the JSON Schema shape.', 'release summary');
replaceInFile('README.md', '- Released versions are frozen into their own version folder under `spec/` (for example `spec/0.8.0/`) and tagged (for example `v0.8.0`); `spec/draft/` is then re-initialized from that snapshot.\n- `schemas/latest.json` continues to identify v0.7.0 until stable v0.8.0 is explicitly released.', '- Released versions are frozen into their own version folder under `spec/` (for example `spec/0.8.0/`) and tagged (for example `v0.8.0`).\n- `schemas/latest.json` identifies the current stable schema. No active draft is present until development of the next version begins.', 'repository roles');

const specReadmePath = path.join(root, 'spec', 'README.md');
let specReadme = fs.readFileSync(specReadmePath, 'utf8');
specReadme = specReadme
  .replace(/> This directory contains[\s\S]*?and upgrade when the format advances\./, `> This directory contains the MCP Description (\`mcpdesc\`) specification. Version\n> **${version}** is the current stable release, maintained in this repository.\n> Implementations vendor a single schema version from [\`../schemas/mcp-description/\`](../schemas/mcp-description/)\n> and upgrade when the format advances.`)
  .replace('| 0.7.0 | Current stable release |', '| 0.7.0 | Previous stable release |')
  .replace('| 0.8.0 | Release Candidate 4 (`v0.8.0-rc.4`; prerelease) | [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification) | [`../schemas/mcp-description/0.8.0.json`](../schemas/mcp-description/0.8.0.json) (prerelease) |', '| 0.8.0 | Current stable release | [`mcpdesc/mcpdesc-specification`](https://github.com/mcpdesc/mcpdesc-specification/tree/v0.8.0/spec/0.8.0) | [`../schemas/mcp-description/0.8.0.json`](../schemas/mcp-description/0.8.0.json) |')
  .replace('The exact proposal revisions represented by Draft 4 are recorded in its [`draft/PROPOSALS.md`](draft/PROPOSALS.md) manifest.', 'The exact proposal revisions represented by 0.8.0 are recorded in its [`0.8.0/PROPOSALS.md`](0.8.0/PROPOSALS.md) manifest.')
  .replace('  draft/               Active prerelease (currently 0.8.0-rc.4)\n', '')
  .replace('    mcp-description.md  Assembled normative specification text\n    sections/          Normative specification, section by section\n    guides/            Rationale, tutorials, and comparisons (non-normative)\n    examples/          Example MCP Description documents\n    extensions/        Vendor extension specifications\n    CHANGELOG.md       Format version history\n', '')
  .replace('  0.7.0/               Frozen release pointer (canonical source: Cisco Open)', '  0.8.0/               Frozen current stable release\n  0.7.0/               Frozen release pointer (canonical source: Cisco Open)')
  .replace('The in-progress working draft\nlives in `draft/`; when it is released it is frozen into a version folder\n(e.g. `0.8.0/`) and `draft/` is re-initialized from that snapshot.', 'An in-progress working draft lives in `draft/` when development is active; when released, it is frozen into a version folder.')
  .replace('- **Read the spec**: [draft/mcp-description.md](draft/mcp-description.md)', '- **Read the spec**: [0.8.0/mcp-description.md](0.8.0/mcp-description.md)')
  .replace('[draft/examples/](draft/examples/)', '[0.8.0/examples/](0.8.0/examples/)')
  .replace('[../schemas/mcp-description/0.7.0.json](../schemas/mcp-description/0.7.0.json) (latest', '[../schemas/mcp-description/0.8.0.json](../schemas/mcp-description/0.8.0.json) (latest')
  .replace('[draft/guides/getting-started.md](draft/guides/getting-started.md)', '[0.8.0/guides/getting-started.md](0.8.0/guides/getting-started.md)');
fs.writeFileSync(specReadmePath, specReadme);

fs.rmSync(draftDir, { recursive: true });
fs.rmSync(path.join(root, 'schemas', 'draft.json'));

console.log(`Prepared stable ${version}: froze spec/draft -> spec/${version} and retired active draft state.`);
console.log('');
console.log('Then run:');
console.log(`  npm run release:check -- stable ${version}`);
console.log('  npm test');
