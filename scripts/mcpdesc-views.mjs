// Build and combine Effective Protocol Views for MCP Description v0.8.0.
//
// This module projects a multi-revision description to one protocol revision,
// merges compatible revision-specific views, and compares descriptions using
// semantic normalization. Public operations validate their inputs and outputs
// with both the v0.8.0 structural schema and its semantic rules.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMcpdesc08Validator, validateMcpdesc08Document } from './validate-0.8.mjs';

const scopedCollections = ['transports', 'capabilities', 'tools', 'resources', 'resourceTemplates', 'prompts'];
const primitiveCollections = new Set(['tools', 'resources', 'resourceTemplates', 'prompts']);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(scriptDirectory, '..', 'schemas', 'mcp-description', '0.8.0.json');
const validateStructure = createMcpdesc08Validator(JSON.parse(fs.readFileSync(schemaPath, 'utf8')));

function clone(value) {
  return structuredClone(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

function canonicalString(value) {
  return JSON.stringify(canonicalize(value));
}

function normalizeSecurity(owner) {
  if (!Array.isArray(owner?.security)) return;
  owner.security = owner.security
    .map((requirement) => Object.fromEntries(
      Object.entries(requirement)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, scopes]) => [name, [...scopes].sort()])
    ))
    .sort((left, right) => canonicalString(left).localeCompare(canonicalString(right)));
}

function semanticCanonicalString(value) {
  const normalized = clone(value);
  if (Array.isArray(normalized.protocolVersions)) normalized.protocolVersions.sort();
  normalizeSecurity(normalized);
  for (const collection of scopedCollections) {
    if (!Array.isArray(normalized[collection])) continue;
    for (const item of normalized[collection]) {
      if (Array.isArray(item.protocolVersions)) item.protocolVersions.sort();
      normalizeSecurity(item);
    }
    normalized[collection].sort((left, right) => canonicalString(left).localeCompare(canonicalString(right)));
  }
  return canonicalString(normalized);
}

function withoutScope(value) {
  const result = clone(value);
  delete result.protocolVersions;
  return result;
}

function effectiveScope(item, rootScope) {
  return item.protocolVersions ?? rootScope;
}

function assertConforming(document, label) {
  const errors = validateMcpdesc08Document(document, validateStructure, label)
    .filter((diagnostic) => diagnostic.level === 'error');
  if (errors.length) {
    throw new Error(`${label} is not a conforming mcpdesc 0.8.0 document: ${errors.map((diagnostic) => `[${diagnostic.code}] ${diagnostic.message}`).join(' | ')}`);
  }
}

function projectUnchecked(document, version, options = {}) {
  const rootScope = document.protocolVersions;
  const result = clone(document);
  result.protocolVersions = [version];

  for (const collection of scopedCollections) {
    if (!Array.isArray(document[collection])) continue;
    const projected = document[collection]
      .filter((item) => effectiveScope(item, rootScope).includes(version))
      .map(withoutScope);
    if (projected.length || (primitiveCollections.has(collection) && !options.omitEmptyPrimitiveCollections)) {
      result[collection] = projected;
    } else {
      delete result[collection];
    }
  }

  return result;
}

export function projectProtocolView(document, version, options = {}) {
  const rootScope = document?.protocolVersions;
  if (!Array.isArray(rootScope) || !rootScope.includes(version)) {
    throw new Error(`Cannot project MCP protocol revision ${JSON.stringify(version)} because it is absent from root protocolVersions`);
  }
  assertConforming(document, 'Projection source');
  const result = projectUnchecked(document, version, options);
  assertConforming(result, `Projection result for MCP ${version}`);
  return result;
}

function unscopedDocumentPart(view) {
  const result = clone(view);
  delete result.protocolVersions;
  for (const collection of scopedCollections) delete result[collection];
  return result;
}

function collectProtocolViews(documents, inputsValidated = false) {
  const byVersion = new Map();
  documents.forEach((document, documentIndex) => {
    if (!Array.isArray(document?.protocolVersions) || document.protocolVersions.length === 0) {
      throw new Error('Every merge input must contain a non-empty root protocolVersions array');
    }
    if (!inputsValidated) assertConforming(document, `Merge input ${documentIndex + 1}`);
    for (const version of document.protocolVersions) {
      const view = projectUnchecked(document, version);
      assertConforming(view, `Merge input ${documentIndex + 1} projection for MCP ${version}`);
      const previous = byVersion.get(version);
      if (previous && !semanticallyEquivalent(previous, view)) {
        throw new Error(`Conflicting Effective Protocol Views for MCP ${version}`);
      }
      byVersion.set(version, view);
    }
  });
  return byVersion;
}

function mergeCollection(views, collection, allVersions) {
  const declarations = new Map();
  for (const [version, view] of views) {
    for (const declaration of view[collection] ?? []) {
      const unscoped = withoutScope(declaration);
      const key = semanticCanonicalString(unscoped);
      const existing = declarations.get(key) ?? { declaration: unscoped, versions: [] };
      existing.versions.push(version);
      declarations.set(key, existing);
    }
  }

  return [...declarations.values()]
    .sort((left, right) => canonicalString(left.declaration).localeCompare(canonicalString(right.declaration)))
    .map(({ declaration, versions }) => {
      const orderedVersions = allVersions.filter((version) => versions.includes(version));
      if (orderedVersions.length === allVersions.length) return declaration;
      return { ...declaration, protocolVersions: orderedVersions };
    });
}

export function mergeProtocolDescriptions(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error('At least one MCP Description document is required for merge');
  }

  documents.forEach((document, index) => assertConforming(document, `Merge input ${index + 1}`));
  const views = collectProtocolViews(documents, true);
  const versions = [...views.keys()].sort();
  const firstView = views.values().next().value;
  const expectedUnscoped = semanticCanonicalString(unscopedDocumentPart(firstView));
  for (const [version, view] of views) {
    if (semanticCanonicalString(unscopedDocumentPart(view)) !== expectedUnscoped) {
      throw new Error(`Conflicting unscoped metadata in MCP ${version} Effective Protocol View`);
    }
  }

  const result = unscopedDocumentPart(firstView);
  result.protocolVersions = versions;
  for (const collection of scopedCollections) {
    const merged = mergeCollection(views, collection, versions);
    if (merged.length) result[collection] = merged;
  }
  assertConforming(result, 'Merge result');
  return result;
}

export function semanticallyEquivalent(left, right) {
  return semanticCanonicalString(left) === semanticCanonicalString(right);
}
