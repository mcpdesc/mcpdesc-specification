import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { buildValidationCatalog } from './validation-catalog.mjs';

const root = process.cwd();
const [snapshot, output, ...flags] = process.argv.slice(2);
try {
  assert.ok(snapshot && output && flags.every((flag) => flag === '--prepare') && flags.length <= 1,
    'Usage: node scripts/export-rule-catalog.mjs <snapshot> <new-output-directory> [--prepare]');
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(fs.realpathSync(git('rev-parse', '--show-toplevel')), fs.realpathSync(root), 'Run from the repository root');
  assert.equal(git('status', '--porcelain'), '', 'Catalog export requires a clean working tree');
  const commit = git('rev-parse', 'HEAD');
  if (!flags.includes('--prepare')) {
    assert.equal(git('cat-file', '-t', `v${snapshot}`), 'tag', 'Catalog export requires an annotated tag');
    assert.equal(git('rev-parse', `v${snapshot}^{}`), commit, 'Catalog export must run at the tagged commit');
  }
  const destination = path.resolve(output);
  assert.ok(!fs.existsSync(destination), 'Output directory must not already exist');
  const bundle = buildValidationCatalog(root, snapshot, commit);
  for (const [relative, bytes] of bundle.files) {
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  console.log(`${flags.length ? 'PREPARATION ONLY (not a publication)' : 'Tagged catalog export'}: ${snapshot}, ${bundle.manifest.ruleCount} rules, commit ${commit}`);
  console.log(`Bundle: ${destination}`);
  console.log('Publish and verify immutable artifacts before updating the discovery index.');
} catch (error) {
  console.error(`export-rule-catalog: ${error.message}`);
  process.exitCode = 1;
}