// Resolve the candidate specification version and its repository locations.
//
// The candidate is the active draft when specification-status.json declares
// one, otherwise the current stable release. Repository tooling and tests use
// this module instead of hard-coding a version or probing for spec/draft.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export function candidateSpecification(root = process.cwd()) {
  const status = JSON.parse(fs.readFileSync(path.join(root, 'specification-status.json'), 'utf8'));
  const draft = status.draft ?? null;
  const version = draft?.version ?? status.stable?.version;
  if (!version) throw new Error('specification-status.json identifies neither a draft nor a stable version');
  const directory = draft ? 'draft' : version;
  return {
    status,
    version,
    stableVersion: status.stable?.version,
    isDraft: Boolean(draft),
    directory,
    specificationRoot: `spec/${directory}`,
    schemaPath: `schemas/mcp-description/${version}.json`
  };
}
