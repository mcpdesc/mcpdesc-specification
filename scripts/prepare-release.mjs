#!/usr/bin/env node
// Dispatch mechanical release preparation while preserving maintainer approval boundaries.
//
// Usage:
//   node scripts/prepare-release.mjs draft.<iteration> <YYYY-MM-DD>
//   node scripts/prepare-release.mjs rc.<iteration> <YYYY-MM-DD>
//   node scripts/prepare-release.mjs validator <selector>
//   node scripts/prepare-release.mjs stable <version>

import { execFileSync } from 'node:child_process';
import process from 'node:process';

const [target, value] = process.argv.slice(2);
let script;
let args;

if (/^draft\.\d+$/.test(target ?? '')) {
  script = 'scripts/prepare-draft-snapshot.mjs';
  args = [target.split('.')[1], value];
} else if (/^rc\.\d+$/.test(target ?? '')) {
  script = 'scripts/prepare-release-candidate.mjs';
  args = [target.split('.')[1], value];
} else if (target === 'validator') {
  script = 'scripts/prepare-validator-snapshot.mjs';
  args = [value];
} else if (target === 'stable') {
  script = 'scripts/freeze-version.mjs';
  args = [value];
} else {
  console.error('Usage:');
  console.error('  npm run release:prepare -- draft.<iteration> <YYYY-MM-DD>');
  console.error('  npm run release:prepare -- rc.<iteration> <YYYY-MM-DD>');
  console.error('  npm run release:prepare -- validator <selector>');
  console.error('  npm run release:prepare -- stable <version>');
  process.exit(1);
}

try {
  execFileSync(process.execPath, [script, ...args], { stdio: 'inherit' });
} catch (error) {
  if (error.status === null) console.error(`Release preparation failed: ${error.message}`);
  process.exit(error.status || 1);
}