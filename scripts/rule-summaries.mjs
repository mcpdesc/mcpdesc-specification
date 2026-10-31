// Rule metadata that the candidate validator needs to report rule results
// (Proposal 0031), read from the candidate rule registry.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { candidateSpecification } from './candidate-specification.mjs';
import { decodeDocumentSource } from './decode-document.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readRuleSummaries(root = repositoryRoot) {
  const directory = path.join(root, candidateSpecification(root).specificationRoot, 'validation', 'rules');
  const summaries = [];
  for (const name of fs.existsSync(directory) ? fs.readdirSync(directory).filter((file) => /\.ya?ml$/.test(file)).sort() : []) {
    const registry = decodeDocumentSource(fs.readFileSync(path.join(directory, name), 'utf8'), 'yaml', name);
    for (const rule of registry.rules ?? []) {
      if (rule.status === 'retired') continue;
      summaries.push({
        id: rule.id,
        kind: rule.kind,
        protocolVersions: rule.applicability.protocolVersions,
        delegated: rule.enforcement === 'external',
        documentSchema: Boolean(rule.documentSchema?.length)
      });
    }
  }
  return summaries.sort((left, right) => left.id.localeCompare(right.id));
}

export const ruleSummaries = readRuleSummaries();
