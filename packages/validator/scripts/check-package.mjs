import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
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

const expected = [
  'LICENSE',
  'MODIFICATIONS.md',
  'NOTICE',
  'ORIGIN.md',
  'README.md',
  'index.d.ts',
  'package.json',
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
  'src/snapshots/0.8.0-draft.3/semantic.js'
].sort();

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected package contents:\n${actual.join('\n')}`);
}

console.log(`Package tarball passed (${pack.files.length} files, ${pack.size} bytes).`);