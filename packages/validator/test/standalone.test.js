import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import { validateMcpDescription as validateStandard } from '../src/index.js';

const originalEval = globalThis.eval;
const OriginalFunction = globalThis.Function;
globalThis.eval = () => { throw new EvalError('eval blocked by test CSP'); };
globalThis.Function = function BlockedFunction() { throw new EvalError('Function blocked by test CSP'); };
const { validateMcpDescription: validateStandalone } = await import('../standalone.js');
globalThis.eval = originalEval;
globalThis.Function = OriginalFunction;

function validateStandaloneUnderCsp(document, options) {
  globalThis.eval = () => { throw new EvalError('eval blocked by test CSP'); };
  globalThis.Function = function BlockedFunction() { throw new EvalError('Function blocked by test CSP'); };
  try {
    return validateStandalone(document, options);
  } finally {
    globalThis.eval = originalEval;
    globalThis.Function = OriginalFunction;
  }
}

function fixtureFiles(fixtureRoot) {
  return ['expected-valid', 'expected-invalid', 'expected-warning'].flatMap((group) => {
    const directory = path.join(fixtureRoot, group);
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(?:json|ya?ml)$/i.test(entry.name))
      .map((entry) => path.join(directory, entry.name));
  }).sort();
}

function parseFixture(filename) {
  const source = fs.readFileSync(filename, 'utf8');
  return filename.endsWith('.json') ? JSON.parse(source) : YAML.parse(source);
}

function diagnosticIdentity(diagnostic) {
  return JSON.stringify([diagnostic.code, diagnostic.severity, diagnostic.path]);
}

test('standalone bundle contains no dynamic code generation', () => {
  const source = fs.readFileSync(new URL('../standalone.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\beval\s*\(|\bnew\s+Function\b/);
});

for (const specification of ['0.8.0-draft.1', '0.8.0-draft.2', '0.8.0-draft.3', '0.8.0-draft.4', '0.8.0-rc.1']) {
  const fixtureRoot = fileURLToPath(new URL(`./snapshots/${specification}/fixtures/`, import.meta.url));
  test(`standalone ${specification} matches standard fixture outcomes`, () => {
    for (const filename of fixtureFiles(fixtureRoot)) {
      const document = parseFixture(filename);
      const options = { specification };
      const standard = validateStandard(document, options);
      const standalone = validateStandaloneUnderCsp(document, options);
      assert.equal(standalone.valid, standard.valid, filename);
      assert.deepEqual(
        [...new Set(standalone.diagnostics.map(diagnosticIdentity))].sort(),
        [...new Set(standard.diagnostics.map(diagnosticIdentity))].sort(),
        filename
      );
    }
  });
}