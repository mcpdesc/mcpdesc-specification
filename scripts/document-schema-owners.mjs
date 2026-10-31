// Rule ownership of canonical MCP Description schema locations, read from the
// candidate rule registry's documentSchema fields (Proposal 0033).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { candidateSpecification } from './candidate-specification.mjs';
import { decodeDocumentSource } from './decode-document.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readDocumentSchemaOwners(root = repositoryRoot) {
  const directory = path.join(root, candidateSpecification(root).specificationRoot, 'validation', 'rules');
  const owners = [];
  for (const name of fs.existsSync(directory) ? fs.readdirSync(directory).filter((file) => /\.ya?ml$/.test(file)).sort() : []) {
    const registry = decodeDocumentSource(fs.readFileSync(path.join(directory, name), 'utf8'), 'yaml', name);
    for (const rule of registry.rules ?? []) {
      if (rule.status === 'retired') continue;
      for (const pointer of rule.documentSchema ?? []) owners.push([pointer, rule.id]);
    }
  }
  return owners.sort(([left], [right]) => left.localeCompare(right));
}

export const documentSchemaOwners = readDocumentSchemaOwners();
