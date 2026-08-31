import { build } from 'esbuild';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import standaloneCode from 'ajv/dist/standalone/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(packageRoot, 'standalone.js');
const draft7Adapter = path.join(packageRoot, 'src/standalone/ajv-adapter.js');
const draft2020Adapter = path.join(packageRoot, 'src/standalone/ajv-2020-adapter.js');
const formatsAdapter = path.join(packageRoot, 'src/standalone/ajv-formats-adapter.js');
const selectors = ['0.8.0-draft.1', '0.8.0-draft.2', '0.8.0-draft.3', '0.8.0-draft.4', '0.8.0-rc.1'];
const schemas = selectors.map((selector) => JSON.parse(fs.readFileSync(
  path.join(packageRoot, 'src/snapshots', selector, 'schema.json'),
  'utf8'
)));
const ajv = new Ajv2020({ allErrors: true, strict: false, code: { source: true, esm: true } });
addFormats(ajv);
for (const [index, schema] of schemas.entries()) {
  ajv.addSchema({ ...schema, $id: `urn:mcpdesc:standalone:${selectors[index]}` }, selectors[index]);
}
const validatorExports = Object.fromEntries(selectors.map((selector, index) => [`snapshot${index + 1}`, selector]));
const generatedValidators = `${standaloneCode(ajv, validatorExports)}
export const validatorsByDescription = new Map([
${schemas.map((schema, index) => `  [${JSON.stringify(schema.description)}, snapshot${index + 1}]`).join(',\n')}
]);
`;
const ajvDraft7 = new Ajv({ allErrors: true, strict: false, code: { source: true, esm: true } });
addFormats(ajvDraft7);
const generatedMetaDraft7 = standaloneCode(ajvDraft7, ajvDraft7.getSchema('http://json-schema.org/draft-07/schema#'));
const generatedMetaDraft2020 = standaloneCode(ajv, ajv.getSchema('https://json-schema.org/draft/2020-12/schema'));

const standaloneValidatorsPlugin = {
  name: 'standalone-validators',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^#standalone-(?:validators|meta-draft7|meta-draft2020)$/ }, (args) => ({ path: args.path, namespace: 'standalone' }));
    pluginBuild.onLoad({ filter: /.*/, namespace: 'standalone' }, (args) => ({
      contents: args.path === '#standalone-validators'
        ? generatedValidators
        : args.path === '#standalone-meta-draft7'
          ? generatedMetaDraft7
          : generatedMetaDraft2020,
      loader: 'js'
    }));
  }
};
const cspAdaptersPlugin = {
  name: 'csp-adapters',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^ajv$/ }, () => ({ path: draft7Adapter }));
    pluginBuild.onResolve({ filter: /^ajv\/dist\/2020\.js$/ }, () => ({ path: draft2020Adapter }));
    pluginBuild.onResolve({ filter: /^ajv-formats$/ }, () => ({ path: formatsAdapter }));
    pluginBuild.onResolve({ filter: /^(?:ajv|ajv-formats)\/dist\//, namespace: 'standalone' }, (args) => {
      const resolved = fileURLToPath(import.meta.resolve(args.path));
      return { path: fs.existsSync(resolved) ? resolved : `${resolved}.js` };
    });
  }
};

await build({
  entryPoints: [path.join(packageRoot, 'src/index.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  outfile: output,
  external: ['@cfworker/json-schema'],
  minify: true,
  logLevel: 'silent',
  plugins: [cspAdaptersPlugin, standaloneValidatorsPlugin]
});

console.log(`Built ${path.relative(packageRoot, output)} (${fs.statSync(output).size} bytes).`);