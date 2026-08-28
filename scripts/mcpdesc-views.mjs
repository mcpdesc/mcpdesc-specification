// Build and combine Effective Protocol Views for MCP Description v0.8.0.
//
// This module projects a multi-revision description to one protocol revision,
// merges compatible revision-specific views, and compares descriptions using
// semantic normalization. Public operations validate their inputs and outputs
// with both the v0.8.0 structural schema and its semantic rules.

import { validateMcpdesc08Document } from './validate-0.8.mjs';

const scopedCollections = ['transports', 'capabilities', 'tools', 'resources', 'resourceTemplates', 'prompts'];
const primitiveCollections = new Set(['tools', 'resources', 'resourceTemplates', 'prompts']);
const componentNamespaces = ['schemas', 'toolExamples', 'resourceExamples', 'resourceTemplateExamples', 'promptExamples'];

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
  return semanticCanonicalString(value);
}

function mergeDeclarationCanonicalString(value) {
  return semanticDeclarationCanonicalString(value);
}

function withoutScope(value) {
  const result = clone(value);
  delete result.protocolVersions;
  return result;
}

function effectiveScope(item, rootScope) {
  return item.protocolVersions ?? rootScope;
}

function isReferenceObject(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).length === 1
    && typeof value.$componentRef === 'string';
}

function visitReferenceObjects(document, visitor) {
  for (const namespace of componentNamespaces) {
    for (const value of Object.values(document.components?.[namespace] ?? {})) {
      if (isReferenceObject(value)) visitor(value);
    }
  }
  for (const [collection, declarations] of Object.entries({
    tools: document.tools,
    resources: document.resources,
    resourceTemplates: document.resourceTemplates,
    prompts: document.prompts
  })) {
    for (const declaration of declarations ?? []) {
      if (collection === 'tools') {
        for (const field of ['inputSchema', 'outputSchema']) {
          if (isReferenceObject(declaration[field])) visitor(declaration[field]);
        }
      }
      if (collection !== 'tools' && collection !== 'resources' && collection !== 'resourceTemplates' && collection !== 'prompts') continue;
      for (const value of Object.values(declaration.examples ?? {})) {
        if (isReferenceObject(value)) visitor(value);
      }
    }
  }
  for (const collection of primitiveCollections) {
    for (const declaration of document[collection] ?? []) {
      for (const elicitation of declaration.elicitations ?? []) {
        if (isReferenceObject(elicitation.requestedSchema)) visitor(elicitation.requestedSchema);
      }
    }
  }
}

function pruneComponents(document) {
  if (!document.components) return;
  const retained = new Set();
  const pending = [];
  const enqueue = (reference) => {
    if (!reference.startsWith('#/components/') || retained.has(reference)) return;
    retained.add(reference);
    pending.push(reference);
  };

  const declarationsOnly = clone(document);
  delete declarationsOnly.components;
  visitReferenceObjects(declarationsOnly, (reference) => enqueue(reference.$componentRef));
  while (pending.length) {
    const reference = pending.shift();
    const [, , namespace, name] = reference.split('/');
    const value = document.components?.[namespace]?.[name];
    if (isReferenceObject(value)) enqueue(value.$componentRef);
  }

  const components = Object.fromEntries(
    Object.entries(document.components).filter(([name]) => name.startsWith('x-'))
  );
  for (const namespace of componentNamespaces) {
    const values = Object.fromEntries(
      Object.entries(document.components[namespace] ?? {})
        .filter(([name]) => retained.has(`#/components/${namespace}/${name}`))
    );
    if (Object.keys(values).length) components[namespace] = values;
  }
  if (Object.keys(components).length) document.components = components;
  else delete document.components;
}

function assertConforming(document, label) {
  const errors = validateMcpdesc08Document(document)
    .filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length) {
    throw new Error(`${label} is not a conforming mcpdesc 0.8.0 document: ${errors.map((diagnostic) => `[${diagnostic.code}] ${diagnostic.message}`).join(' | ')}`);
  }
}

function projectUnchecked(document, version, pruneUnusedComponents = true) {
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

  if (pruneUnusedComponents) pruneComponents(result);

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

function mergeComponents(documents) {
  const components = {};
  const extensions = {};
  const referenceMaps = [];

  documents.forEach((document, documentIndex) => {
    const referenceMap = new Map();
    for (const [name, value] of Object.entries(document.components ?? {}).filter(([name]) => name.startsWith('x-'))) {
      if (Object.hasOwn(extensions, name) && canonicalString(extensions[name]) !== canonicalString(value)) {
        throw new Error(`Conflicting Components Object extension ${JSON.stringify(name)} cannot be preserved during merge`);
      }
      extensions[name] = clone(value);
    }
    for (const namespace of componentNamespaces) {
      const targetNamespace = components[namespace] ??= {};
      for (const [name, value] of Object.entries(document.components?.[namespace] ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
        let mappedName = name;
        if (Object.hasOwn(targetNamespace, mappedName)
          && (isReferenceObject(value) || canonicalString(targetNamespace[mappedName]) !== canonicalString(value))) {
          const suffix = `-${documentIndex + 1}`;
          mappedName = `${name}${suffix}`;
          let collision = 2;
          while (Object.hasOwn(targetNamespace, mappedName)) {
            mappedName = `${name}${suffix}-${collision}`;
            collision += 1;
          }
        }
        referenceMap.set(
          `#/components/${namespace}/${name}`,
          `#/components/${namespace}/${mappedName}`
        );
        if (!Object.hasOwn(targetNamespace, mappedName)) targetNamespace[mappedName] = clone(value);
      }
    }
    referenceMaps.push(referenceMap);
  });

  documents.forEach((document, documentIndex) => {
    const referenceMap = referenceMaps[documentIndex];
    for (const namespace of componentNamespaces) {
      for (const [name, value] of Object.entries(document.components?.[namespace] ?? {})) {
        const mappedReference = referenceMap.get(`#/components/${namespace}/${name}`);
        const mappedName = mappedReference?.split('/').at(-1);
        if (mappedName && isReferenceObject(value)) {
          components[namespace][mappedName] = {
            $componentRef: referenceMap.get(value.$componentRef) ?? value.$componentRef
          };
        }
      }
    }
  });

  for (const namespace of componentNamespaces) {
    if (Object.keys(components[namespace] ?? {}).length === 0) delete components[namespace];
  }
  const combined = Object.keys(components).length || Object.keys(extensions).length
    ? { ...components, ...extensions }
    : undefined;

  return documents.map((document, documentIndex) => {
    const normalized = clone(document);
    visitReferenceObjects(normalized, (reference) => {
      reference.$componentRef = referenceMaps[documentIndex].get(reference.$componentRef) ?? reference.$componentRef;
    });
    if (combined) normalized.components = clone(combined);
    else delete normalized.components;
    return normalized;
  });
}

function collectProtocolViews(documents, inputsValidated = false) {
  const byVersion = new Map();
  documents.forEach((document, documentIndex) => {
    if (!Array.isArray(document?.protocolVersions) || document.protocolVersions.length === 0) {
      throw new Error('Every merge input must contain a non-empty root protocolVersions array');
    }
    if (!inputsValidated) assertConforming(document, `Merge input ${documentIndex + 1}`);
    for (const version of document.protocolVersions) {
      const view = projectUnchecked(document, version, false, false);
      assertConforming(view, `Merge input ${documentIndex + 1} projection for MCP ${version}`);
      const previous = byVersion.get(version);
      if (previous && !semanticallyEquivalent(previous, view)) {
        throw new Error(`Conflicting Effective Protocol Views for MCP ${version}`);
      }
      byVersion.set(version, previous ?? view);
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
  const normalizedDocuments = mergeComponents(documents);
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
