// Build and combine Effective Protocol Views for MCP Description v0.8.0.
//
// This module projects a multi-revision description to one protocol revision,
// merges compatible revision-specific views, and compares descriptions using
// semantic normalization. Public operations validate their inputs and outputs
// with both the v0.8.0 structural schema and its semantic rules.

import { validateMcpdesc08Document } from './validate-0.8.mjs';

const scopedCollections = ['transports', 'capabilities', 'tools', 'resources', 'resourceTemplates', 'prompts'];
const primitiveCollections = new Set(['tools', 'resources', 'resourceTemplates', 'prompts']);

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
  delete normalized.provenance;
  if (Array.isArray(normalized.protocolVersions)) normalized.protocolVersions.sort();
  normalizeSecurity(normalized);
  for (const collection of scopedCollections) {
    if (!Array.isArray(normalized[collection])) continue;
    for (const item of normalized[collection]) {
      if (primitiveCollections.has(collection)) delete item.provenanceIds;
      if (Array.isArray(item.protocolVersions)) item.protocolVersions.sort();
      for (const elicitation of item.elicitations ?? []) {
        if (Array.isArray(elicitation.protocolVersions)) elicitation.protocolVersions.sort();
      }
      normalizeSecurity(item);
    }
    normalized[collection].sort((left, right) => canonicalString(left).localeCompare(canonicalString(right)));
  }
  return canonicalString(normalized);
}

function semanticDeclarationCanonicalString(value) {
  const normalized = clone(value);
  delete normalized.provenanceIds;
  return semanticCanonicalString(normalized);
}

function mergeDeclarationCanonicalString(value) {
  return canonicalString({
    runtime: semanticDeclarationCanonicalString(value),
    provenanceIds: Array.isArray(value.provenanceIds) ? [...value.provenanceIds].sort() : null
  });
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
  const errors = validateMcpdesc08Document(document)
    .filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length) {
    throw new Error(`${label} is not a conforming mcpdesc 0.8.0 document: ${errors.map((diagnostic) => `[${diagnostic.code}] ${diagnostic.message}`).join(' | ')}`);
  }
}

function projectUnchecked(document, version) {
  const rootScope = document.protocolVersions;
  const result = clone(document);
  result.protocolVersions = [version];

  for (const collection of scopedCollections) {
    if (!Array.isArray(document[collection])) continue;
    const projected = document[collection]
      .filter((item) => effectiveScope(item, rootScope).includes(version))
      .map((item) => {
        const itemScope = effectiveScope(item, rootScope);
        const projectedItem = withoutScope(item);
        if (Array.isArray(item.elicitations)) {
          const projectedElicitations = item.elicitations
            .filter((elicitation) => effectiveScope(elicitation, itemScope).includes(version))
            .map(withoutScope);
          if (projectedElicitations.length) {
            projectedItem.elicitations = projectedElicitations;
          } else {
            delete projectedItem.elicitations;
          }
        }
        return projectedItem;
      });
    if (projected.length) {
      result[collection] = projected;
    } else {
      delete result[collection];
    }
  }

  return result;
}

export function projectProtocolView(document, version) {
  const rootScope = document?.protocolVersions;
  if (!Array.isArray(rootScope) || !rootScope.includes(version)) {
    throw new Error(`Cannot project MCP protocol revision ${JSON.stringify(version)} because it is absent from root protocolVersions`);
  }
  assertConforming(document, 'Projection source');
  const result = projectUnchecked(document, version);
  assertConforming(result, `Projection result for MCP ${version}`);
  return result;
}

function unscopedDocumentPart(view) {
  const result = clone(view);
  delete result.protocolVersions;
  for (const collection of scopedCollections) delete result[collection];
  return result;
}

function sameStringSet(left, right) {
  return canonicalString([...left].sort()) === canonicalString([...right].sort());
}

function mergeProvenance(documents) {
  const records = {};
  const registryExtensions = {};
  const idMaps = [];
  const mappedDefaults = [];

  documents.forEach((document, documentIndex) => {
    const registry = document.provenance;
    const idMap = new Map();
    for (const [id, record] of Object.entries(registry?.records ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
      let mappedId = id;
      if (Object.hasOwn(records, mappedId) && canonicalString(records[mappedId]) !== canonicalString(record)) {
        const suffix = `~${documentIndex + 1}`;
        mappedId = `${id}${suffix}`;
        let collision = 2;
        while (Object.hasOwn(records, mappedId)) {
          if (canonicalString(records[mappedId]) === canonicalString(record)) break;
          mappedId = `${id}${suffix}-${collision}`;
          collision += 1;
        }
      }
      if (!Object.hasOwn(records, mappedId)) records[mappedId] = clone(record);
      idMap.set(id, mappedId);
    }

    for (const [name, value] of Object.entries(registry ?? {}).filter(([name]) => name.startsWith('x-'))) {
      if (Object.hasOwn(registryExtensions, name) && canonicalString(registryExtensions[name]) !== canonicalString(value)) {
        throw new Error(`Conflicting provenance registry extension ${JSON.stringify(name)} cannot be preserved during merge`);
      }
      registryExtensions[name] = clone(value);
    }

    idMaps.push(idMap);
    mappedDefaults.push((registry?.defaultIds ?? []).map((id) => idMap.get(id)));
  });

  const firstDefaults = mappedDefaults[0] ?? [];
  const defaultIds = firstDefaults.length > 0 && mappedDefaults.every((ids) => sameStringSet(ids, firstDefaults))
    ? [...firstDefaults]
    : [];
  const provenance = Object.keys(records).length > 0
    ? { records, ...(defaultIds.length ? { defaultIds } : {}), ...registryExtensions }
    : undefined;

  const normalizedDocuments = documents.map((document, documentIndex) => {
    const normalized = clone(document);
    const sourceDefaults = document.provenance?.defaultIds ?? [];
    const idMap = idMaps[documentIndex];
    for (const collection of primitiveCollections) {
      for (const [primitiveIndex, primitive] of (normalized[collection] ?? []).entries()) {
        const sourcePrimitive = document[collection][primitiveIndex];
        const hadOverride = Array.isArray(sourcePrimitive.provenanceIds);
        const effectiveIds = (sourcePrimitive.provenanceIds ?? sourceDefaults).map((id) => idMap.get(id));
        if (hadOverride || !sameStringSet(effectiveIds, defaultIds)) {
          if (effectiveIds.length) primitive.provenanceIds = effectiveIds;
          else delete primitive.provenanceIds;
        } else {
          delete primitive.provenanceIds;
        }
      }
    }
    if (provenance) normalized.provenance = clone(provenance);
    else delete normalized.provenance;
    return normalized;
  });

  return normalizedDocuments;
}

function effectiveProvenanceIds(view, declaration) {
  return declaration.provenanceIds ?? view.provenance?.defaultIds ?? [];
}

function combineEquivalentViews(previous, incoming) {
  const combined = clone(previous);
  const defaultIds = combined.provenance?.defaultIds ?? [];
  for (const collection of primitiveCollections) {
    const declarations = new Map(
      (combined[collection] ?? []).map((declaration) => [semanticDeclarationCanonicalString(declaration), declaration])
    );
    for (const incomingDeclaration of incoming[collection] ?? []) {
      const key = semanticDeclarationCanonicalString(incomingDeclaration);
      const declaration = declarations.get(key);
      if (!declaration) continue;
      const ids = [...new Set([
        ...effectiveProvenanceIds(previous, declaration),
        ...effectiveProvenanceIds(incoming, incomingDeclaration)
      ])].sort();
      const preserveOverride = Array.isArray(declaration.provenanceIds) || Array.isArray(incomingDeclaration.provenanceIds);
      if (preserveOverride || !sameStringSet(ids, defaultIds)) {
        if (ids.length) declaration.provenanceIds = ids;
        else delete declaration.provenanceIds;
      } else {
        delete declaration.provenanceIds;
      }
    }
  }
  return combined;
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
      byVersion.set(version, previous ? combineEquivalentViews(previous, view) : view);
    }
  });
  return byVersion;
}

function mergeCollection(views, collection, allVersions) {
  const declarations = new Map();
  for (const [version, view] of views) {
    for (const declaration of view[collection] ?? []) {
      const unscoped = withoutScope(declaration);
      const key = mergeDeclarationCanonicalString(unscoped);
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
  const normalizedDocuments = mergeProvenance(documents);
  const views = collectProtocolViews(normalizedDocuments, true);
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
