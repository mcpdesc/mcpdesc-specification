import { build } from 'esbuild';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build as viteBuild } from 'vite';

const entryPoint = fileURLToPath(new URL('../test/browser-entry.js', import.meta.url));
const result = await build({
  entryPoints: [entryPoint],
  bundle: true,
  format: 'esm',
  logLevel: 'silent',
  minify: true,
  metafile: true,
  platform: 'browser',
  write: false
});

const nodeInputs = Object.keys(result.metafile.inputs).filter((input) => input.startsWith('node:'));
if (nodeInputs.length > 0) {
  throw new Error(`Browser bundle contains Node built-ins: ${nodeInputs.join(', ')}`);
}

const inputs = Object.keys(result.metafile.inputs);
if (inputs.some((input) => input.includes('/node_modules/ajv/') || input.includes('/packages/validator/src/'))) {
  throw new Error('Browser bundle transitively imports the runtime AJV implementation');
}

if (result.outputFiles.length !== 1 || result.outputFiles[0].contents.byteLength === 0) {
  throw new Error('Browser bundle output is empty');
}
const browserBundle = result.outputFiles[0].text;
if (/\beval\s*\(|\bnew\s+Function\b/.test(browserBundle)) {
  throw new Error('Browser bundle contains dynamic code generation');
}

const standaloneResult = await build({
  stdin: {
    contents: "export * from '@mcpdesc/validator/standalone';",
    loader: 'js',
    resolveDir: fileURLToPath(new URL('..', import.meta.url))
  },
  bundle: true,
  format: 'esm',
  logLevel: 'silent',
  minify: true,
  platform: 'browser',
  write: false
});
const standaloneBundleSize = standaloneResult.outputFiles[0].contents.byteLength;
if (result.outputFiles[0].contents.byteLength !== standaloneBundleSize) {
  throw new Error('Browser alias and standalone produce different esbuild bundle sizes');
}

const viteResult = await viteBuild({
  configFile: false,
  logLevel: 'silent',
  build: {
    lib: { entry: entryPoint, formats: ['es'] },
    minify: true,
    write: false
  }
});
const viteOutputs = Array.isArray(viteResult) ? viteResult.flatMap((output) => output.output) : viteResult.output;
const viteChunks = viteOutputs.filter((output) => output.type === 'chunk');
if (viteChunks.length === 0 || viteChunks.every((chunk) => chunk.code.length === 0)) {
  throw new Error('Vite browser bundle output is empty');
}
const viteModules = viteChunks.flatMap((chunk) => Object.keys(chunk.modules));
if (viteModules.some((input) => input.includes('/node_modules/ajv/') || input.includes('/packages/validator/src/'))) {
  throw new Error('Vite browser bundle transitively imports the runtime AJV implementation');
}
if (viteChunks.some((chunk) => /\beval\s*\(|\bnew\s+Function\b/.test(chunk.code))) {
  throw new Error('Vite browser bundle contains dynamic code generation');
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

const viteBundleSize = viteChunks.reduce((size, chunk) => size + Buffer.byteLength(chunk.code), 0);
console.log(`Browser bundles passed (esbuild browser ${result.outputFiles[0].contents.byteLength} bytes, esbuild standalone ${standaloneBundleSize} bytes, Vite browser ${viteBundleSize} bytes, generated standalone ${Buffer.byteLength(standalone)} bytes).`);