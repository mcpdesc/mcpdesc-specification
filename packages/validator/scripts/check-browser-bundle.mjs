import { build } from 'esbuild';
import fs from 'node:fs';
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

const inputs = Object.keys(result.metafile.inputs);
for (const selector of ['0.8.0-draft.1', '0.8.0-draft.2', '0.8.0-draft.3', '0.8.0-draft.4', '0.8.0-rc.1']) {
  if (!inputs.some((input) => input.includes(`/snapshots/${selector}/`))) {
    throw new Error(`Browser bundle is missing runtime snapshot ${selector}`);
  }
}
if (inputs.some((input) => input.includes('/scripts/'))) {
  throw new Error('Browser bundle imports mutable repository scripts');
}

if (result.outputFiles.length !== 1 || result.outputFiles[0].contents.byteLength === 0) {
  throw new Error('Browser bundle output is empty');
}

const standalone = fs.readFileSync(new URL('../standalone.js', import.meta.url), 'utf8');
if (/\beval\s*\(|\bnew\s+Function\b/.test(standalone)) {
  throw new Error('Standalone bundle contains dynamic code generation');
}
if (/\bnode:/.test(standalone)) {
  throw new Error('Standalone bundle contains a Node.js built-in import');
}
for (const selector of ['0.8.0-draft.1', '0.8.0-draft.2', '0.8.0-draft.3', '0.8.0-draft.4', '0.8.0-rc.1']) {
  if (!standalone.includes(selector)) {
    throw new Error(`Standalone bundle is missing runtime snapshot ${selector}`);
  }
}

console.log(`Browser bundles passed (standard ${result.outputFiles[0].contents.byteLength} bytes, standalone ${Buffer.byteLength(standalone)} bytes).`);