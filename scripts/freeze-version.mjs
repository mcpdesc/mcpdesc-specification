#!/usr/bin/env node
// Freeze the in-progress draft into an immutable, versioned specification folder.
//
// Usage:
//   node scripts/freeze-version.mjs <version>
//
// Example:
//   node scripts/freeze-version.mjs 0.8.0
//
// This performs the mechanical part of a release: it copies `spec/draft/` to
// `spec/<version>/`. It does not mutate schema pointers or status files, since
// those steps require human review. The remaining checklist is printed on exit.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

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

if (!fs.existsSync(draftDir)) die('spec/draft does not exist');
if (fs.existsSync(targetDir)) die(`spec/${version} already exists; frozen versions are immutable`);

fs.cpSync(draftDir, targetDir, { recursive: true });

console.log(`Froze spec/draft -> spec/${version}`);
console.log('');
console.log('Remaining release steps (manual, require review):');
console.log(`  1. Add schemas/mcp-description/${version}.json (canonical community schema).`);
console.log(`  2. Set schemas/latest.json "mcp-description" to ${version}; retire schemas/draft.json.`);
console.log(`  3. Move the CHANGELOG "Unreleased" section into a dated [${version}] entry.`);
console.log(`  4. Update specification-status.json (stable.version -> ${version}).`);
console.log('  5. Update the status tables in README.md and spec/README.md.');
console.log(`  6. Re-initialize spec/draft/ for the next version and add a new Unreleased section.`);
console.log(`  7. Commit and tag v${version} on main.`);
console.log('');
console.log('Then run: npm test');
