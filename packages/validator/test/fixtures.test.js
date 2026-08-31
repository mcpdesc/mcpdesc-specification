import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import { validateMcpDescription } from '../src/index.js';

function fixtureFiles(fixtureRoot, group) {
  const directory = path.join(fixtureRoot, group);
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:json|ya?ml)$/i.test(entry.name))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

function parseFixture(filename) {
  const source = fs.readFileSync(filename, 'utf8');
  return filename.endsWith('.json') ? JSON.parse(source) : YAML.parse(source);
}

for (const specification of ['0.8.0-draft.1', '0.8.0-draft.2', '0.8.0-draft.3', '0.8.0-draft.4', '0.8.0-rc.1']) {
  const fixtureRoot = fileURLToPath(new URL(`./snapshots/${specification}/fixtures/`, import.meta.url));
  for (const [group, expected] of [
    ['expected-valid', 'valid'],
    ['expected-invalid', 'invalid'],
    ['expected-warning', 'warning']
  ]) {
    for (const filename of fixtureFiles(fixtureRoot, group)) {
      test(`${specification}/${group}/${path.basename(filename)}`, () => {
        const result = validateMcpDescription(parseFixture(filename), { specification });
        const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
        const warnings = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'warning');

        if (expected === 'valid') {
          assert.equal(result.valid, true);
          assert.deepEqual(result.diagnostics, []);
        } else if (expected === 'invalid') {
          assert.equal(result.valid, false);
          assert.ok(errors.length > 0);
        } else {
          assert.equal(result.valid, true);
          assert.deepEqual(errors, []);
          assert.ok(warnings.length > 0);
        }

        for (const diagnostic of result.diagnostics) {
          assert.deepEqual(Object.keys(diagnostic).sort(), ['code', 'message', 'path', 'severity']);
          assert.ok(diagnostic.path.every((segment) => typeof segment === 'string' || Number.isInteger(segment)));
        }
      });
    }
  }
}