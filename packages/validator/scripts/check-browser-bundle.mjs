import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const result = await build({
  entryPoints: [fileURLToPath(new URL('../src/index.js', import.meta.url))],
  bundle: true,
  format: 'esm',
  logLevel: 'silent',
  metafile: true,
  platform: 'browser',
  write: false
});

const nodeInputs = Object.keys(result.metafile.inputs).filter((input) => input.startsWith('node:'));
if (nodeInputs.length > 0) {
  throw new Error(`Browser bundle contains Node built-ins: ${nodeInputs.join(', ')}`);
}

if (result.outputFiles.length !== 1 || result.outputFiles[0].contents.byteLength === 0) {
  throw new Error('Browser bundle output is empty');
}

console.log(`Browser bundle passed (${result.outputFiles[0].contents.byteLength} bytes).`);