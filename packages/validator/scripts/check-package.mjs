import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const changelog = fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
if (!changelog.includes(`## [${packageJson.version}] - `)) {
  throw new Error(`CHANGELOG.md has no dated ${packageJson.version} release section`);
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const output = execFileSync(
  npm,
  ['pack', '--dry-run', '--json', '--ignore-scripts'],
  { cwd: packageRoot, encoding: 'utf8' }
);
const [pack] = JSON.parse(output);
const actual = pack.files.map((file) => file.path).sort();
if (actual.some((filename) => filename.startsWith('test/snapshots/'))) {
  throw new Error('Frozen test snapshots must not ship in the package tarball');
}
if (actual.some((filename) => filename.startsWith('scripts/'))) {
  throw new Error('Mutable repository or package scripts must not ship in the package tarball');
}
for (const [entry, conditions] of Object.entries(packageJson.exports)) {
  for (const [condition, target] of Object.entries(conditions)) {
    const filename = target.replace(/^\.\//, '');
    if (!actual.includes(filename)) {
      throw new Error(`Export ${entry} condition ${condition} targets missing packed file ${filename}`);
    }
  }
}

const expected = [
  'CHANGELOG.md',
  'LICENSE',
  'MODIFICATIONS.md',
  'NOTICE',
  'ORIGIN.md',
  'README.md',
  'index.d.ts',
  'package.json',
  'standalone.js',
  'src/index.js',
  'src/snapshots/0.8.0-draft.1/index.js',
  'src/snapshots/0.8.0-draft.1/schema.json',
  'src/snapshots/0.8.0-draft.1/semantic.js',
  'src/snapshots/0.8.0-draft.2/base.js',
  'src/snapshots/0.8.0-draft.2/index.js',
  'src/snapshots/0.8.0-draft.2/schema.json',
  'src/snapshots/0.8.0-draft.2/semantic.js',
  'src/snapshots/0.8.0-draft.3/base.js',
  'src/snapshots/0.8.0-draft.3/index.js',
  'src/snapshots/0.8.0-draft.3/schema.json',
  'src/snapshots/0.8.0-draft.3/semantic.js',
  'src/snapshots/0.8.0-draft.4/base.js',
  'src/snapshots/0.8.0-draft.4/index.js',
  'src/snapshots/0.8.0-draft.4/schema.json',
  'src/snapshots/0.8.0-draft.4/semantic.js',
  'src/snapshots/0.8.0-rc.1/base.js',
  'src/snapshots/0.8.0-rc.1/index.js',
  'src/snapshots/0.8.0-rc.1/schema.json',
  'src/snapshots/0.8.0-rc.1/semantic.js'
].sort();

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected package contents:\n${actual.join('\n')}`);
}

console.log(`Package tarball passed (${pack.files.length} files, ${pack.size} bytes).`);