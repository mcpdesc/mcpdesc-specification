// Provide structural and semantic validation for MCP Description v0.8.0.
//
// The exported helpers complement the published JSON Schema with cross-object
// rules for protocol scopes, revision applicability, security, tags, embedded
// Tool schemas and examples, Resource examples, transports, and extension namespaces. Diagnostics
// distinguish fatal errors from nonfatal warnings. External schema references
// are never fetched automatically; unresolved targets are preserved and reported.

import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { UriTemplateMatcher } from 'uri-template-matcher';

export const supportedProtocolVersions = [
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
  '2025-11-25',
  '2026-07-28'
];

const protocolOrder = new Map(supportedProtocolVersions.map((version, index) => [version, index]));
const toolSchemaDialectVersion = '2025-11-25';
const completeSemanticConformanceVersion = '2025-06-18';
const knownReservedCapabilityExtensions = new Set([
  'io.modelcontextprotocol/tasks'
]);
const metaKeyPattern = /^(?:(?:[A-Za-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?)(?:\.[A-Za-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\/)?(?:[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)?$/;

function createValidatorForDialect(dialect) {
  const Factory = dialect === '2020-12' ? Ajv2020 : Ajv;
  const instance = new Factory({ allErrors: true, strict: false });
  addFormats(instance);
  return instance;
}

function normalizeScope(scope) {
  return [...scope].sort((left, right) => protocolOrder.get(left) - protocolOrder.get(right));
}

function effectiveScope(document, item, parentScope) {
  return normalizeScope(item?.protocolVersions ?? parentScope ?? document.protocolVersions ?? []);
}

function intersection(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

function collectOAuthScopeCatalog(scheme) {
  if (!scheme || typeof scheme !== 'object') return new Set();
  const catalog = new Set();
  if (scheme.type === 'oauth2') {
    for (const flow of Object.values(scheme.flows ?? {})) {
      for (const scope of Object.keys(flow?.scopes ?? {})) catalog.add(scope);
    }
  }
  return catalog;
}

function embeddedSchemaDialect(schema) {
  const declared = schema?.$schema;
  if (declared === undefined) return '2020-12';
  if (typeof declared !== 'string') return null;
  if (/^https?:\/\/json-schema\.org\/draft\/2020-12\/schema#?$/.test(declared)) return '2020-12';
  if (/^https?:\/\/json-schema\.org\/draft-07\/schema#?$/.test(declared)) return 'draft-07';
  return null;
}

function schemaForPartialOfflineCompilation(schema) {
  const externalReferences = [];

  function visit(value) {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object') return value;
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref' && typeof child === 'string' && !child.startsWith('#')) {
        externalReferences.push(child);
        continue;
      }
      result[key] = visit(child);
    }
    return result;
  }

  return { schema: visit(schema), externalReferences };
}

function makeDiagnostic(code, level, message) {
  return { code, level, message };
}

function usesMcpReservedPrefix(identifier) {
  if (typeof identifier !== 'string') return false;
  const [prefix] = identifier.split('/', 1);
  const labels = prefix.split('.');
  if (labels.length < 2) return false;
  const secondLabel = labels[1].toLowerCase();
  return secondLabel === 'modelcontextprotocol' || secondLabel === 'mcp';
}

function usesMcpReservedMetaPrefix(identifier, version) {
  if (typeof identifier !== 'string' || !identifier.includes('/')) return false;
  const labels = identifier.slice(0, identifier.indexOf('/')).split('.');
  if (version === '2025-06-18') {
    return labels.slice(0, -1).some((label) => ['modelcontextprotocol', 'mcp'].includes(label.toLowerCase()));
  }
  return labels.length >= 2 && ['modelcontextprotocol', 'mcp'].includes(labels[1].toLowerCase());
}

function isImplementation(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && typeof value.name === 'string' && typeof value.version === 'string';
}

function validateMeta(document, rel, diagnostics) {
  const rootScope = normalizeScope(document.protocolVersions ?? []);
  const legacyVersions = rootScope.filter(
    (version) => protocolOrder.get(version) < protocolOrder.get(completeSemanticConformanceVersion)
  );
  if (legacyVersions.length) {
    diagnostics.push(
      makeDiagnostic(
        'legacy-protocol-validation-incomplete',
        'warning',
        `${rel}: MCP ${legacyVersions.join(', ')} are legacy compatibility revisions; structural and selected checks were applied, but complete MCP semantic conformance was not evaluated`
      )
    );
  }

  function validateKnownReservedKey(key, value, context, version, location) {
    let validContext;
    let validValue;

    if (key === 'progressToken' && ['2025-06-18', '2025-11-25', '2026-07-28'].includes(version)) {
      validContext = context === 'request';
      validValue = typeof value === 'string' || typeof value === 'number';
    } else if (key === 'io.modelcontextprotocol/related-task' && version === '2025-11-25') {
      validContext = context === 'result';
      validValue = value && typeof value === 'object' && !Array.isArray(value) && typeof value.taskId === 'string';
    } else if (key === 'io.modelcontextprotocol/serverInfo' && version === '2026-07-28') {
      validContext = context === 'result';
      validValue = isImplementation(value);
    } else if (
      version === '2026-07-28'
      && ['io.modelcontextprotocol/protocolVersion', 'io.modelcontextprotocol/clientInfo', 'io.modelcontextprotocol/clientCapabilities', 'io.modelcontextprotocol/logLevel'].includes(key)
    ) {
      validContext = context === 'request';
      validValue = key === 'io.modelcontextprotocol/protocolVersion'
        ? typeof value === 'string'
        : key === 'io.modelcontextprotocol/clientInfo'
          ? isImplementation(value)
          : key === 'io.modelcontextprotocol/clientCapabilities'
            ? value && typeof value === 'object' && !Array.isArray(value)
            : ['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'].includes(value);
    } else if (key === 'io.modelcontextprotocol/subscriptionId' && version === '2026-07-28') {
      validContext = context === 'notification' || context === 'subscription-result';
      validValue = typeof value === 'string' || typeof value === 'number';
    } else if (version === '2026-07-28' && ['traceparent', 'tracestate', 'baggage'].includes(key)) {
      validContext = true;
      validValue = typeof value === 'string' && value.length > 0;
    } else {
      return false;
    }

    if (!validContext) {
      diagnostics.push(
        makeDiagnostic(
          'meta-reserved-key-context',
          'error',
          `${rel}: ${location} uses reserved _meta key ${JSON.stringify(key)} in a ${context} context where MCP ${version} does not define it`
        )
      );
    } else if (!validValue) {
      diagnostics.push(
        makeDiagnostic(
          'meta-reserved-key-value',
          'error',
          `${rel}: ${location}[${JSON.stringify(key)}] has an invalid value for MCP ${version}`
        )
      );
    }
    return true;
  }

  function check(meta, context, scope, location) {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return;
    for (const [key, value] of Object.entries(meta)) {
      if (!metaKeyPattern.test(key)) {
        diagnostics.push(
          makeDiagnostic(
            'meta-key-invalid',
            'error',
            `${rel}: ${location} contains invalid MCP _meta key ${JSON.stringify(key)}`
          )
        );
        continue;
      }
      for (const version of scope.filter((candidate) => protocolOrder.get(candidate) >= protocolOrder.get(completeSemanticConformanceVersion))) {
        if (validateKnownReservedKey(key, value, context, version, location)) continue;
        if (usesMcpReservedMetaPrefix(key, version)) {
          diagnostics.push(
            makeDiagnostic(
              'meta-unknown-reserved-key',
              'warning',
              `${rel}: ${location} contains unrecognized key ${JSON.stringify(key)} under an MCP-reserved prefix for MCP ${version}; preserve it and review its authority`
            )
          );
        }
      }
    }
  }

  for (const [kind, items] of [
    ['tools', document.tools ?? []],
    ['resources', document.resources ?? []],
    ['resourceTemplates', document.resourceTemplates ?? []],
    ['prompts', document.prompts ?? []]
  ]) {
    items.forEach((item, itemIndex) => {
      const scope = effectiveScope(document, item, rootScope);
      check(item._meta, 'declaration', scope, `${kind}[${itemIndex}]._meta`);
      if (kind === 'tools') {
        for (const [exampleName, example] of Object.entries(item.examples ?? {})) {
          const result = example?.result;
          if (!result || typeof result !== 'object' || Array.isArray(result)) continue;
          const resultLocation = `${kind}[${itemIndex}].examples[${JSON.stringify(exampleName)}].result`;
          check(result._meta, 'result', scope, `${resultLocation}._meta`);
          (result.content ?? []).forEach((content, contentIndex) => {
            const contentLocation = `${resultLocation}.content[${contentIndex}]`;
            check(content?._meta, 'content', scope, `${contentLocation}._meta`);
            if (content?.type === 'resource') check(content.resource?._meta, 'content', scope, `${contentLocation}.resource._meta`);
          });
        }
      } else if (kind !== 'prompts') {
        for (const [exampleName, example] of Object.entries(item.examples ?? {})) {
          const result = example?.result;
          if (!result || typeof result !== 'object' || Array.isArray(result)) continue;
          const resultLocation = `${kind}[${itemIndex}].examples[${JSON.stringify(exampleName)}].result`;
          check(result._meta, 'result', scope, `${resultLocation}._meta`);
          (result.contents ?? []).forEach((content, contentIndex) => {
            check(content?._meta, 'content', scope, `${resultLocation}.contents[${contentIndex}]._meta`);
          });
        }
      }
    });
  }
}

function validateTagReferences(document, rel, diagnostics) {
  const declaredTags = new Set();
  for (const tag of document.tags ?? []) {
    if (declaredTags.has(tag.name)) {
      diagnostics.push(makeDiagnostic('duplicate-root-tag', 'error', `${rel}: root tags must use unique names; found duplicate tag ${JSON.stringify(tag.name)}`));
      continue;
    }
    declaredTags.add(tag.name);
  }
  if (!declaredTags.size) return;

  for (const [kind, items] of [
    ['tools', document.tools ?? []],
    ['resources', document.resources ?? []],
    ['resourceTemplates', document.resourceTemplates ?? []],
    ['prompts', document.prompts ?? []]
  ]) {
    items.forEach((item, index) => {
      for (const tag of item.tags ?? []) {
        if (!declaredTags.has(tag)) {
          diagnostics.push(
            makeDiagnostic(
              'unknown-tag-reference',
              'error',
              `${rel}: ${kind}[${index}] references undeclared tag ${JSON.stringify(tag)}`
            )
          );
        }
      }
    });
  }
}

function validateSecurityRequirements(document, rel, diagnostics) {
  const schemeMap = document.securitySchemes ?? {};
  const schemeNames = new Set(Object.keys(schemeMap));
  const scopeCatalogByScheme = new Map(
    Object.entries(schemeMap).map(([name, scheme]) => [name, collectOAuthScopeCatalog(scheme)])
  );

  function checkRequirementArray(requirementArray, location) {
    if (!Array.isArray(requirementArray)) return;
    requirementArray.forEach((requirement, requirementIndex) => {
      for (const [schemeName, scopes] of Object.entries(requirement)) {
        if (!schemeNames.has(schemeName)) {
          diagnostics.push(
            makeDiagnostic(
              'unknown-security-scheme',
              'error',
              `${rel}: ${location}[${requirementIndex}] references unknown security scheme ${JSON.stringify(schemeName)}`
            )
          );
          continue;
        }
        const scheme = schemeMap[schemeName];
        if (!Array.isArray(scopes)) continue;
        const duplicateScopes = scopes.filter((scope, index) => scopes.indexOf(scope) !== index);
        if (duplicateScopes.length) {
          diagnostics.push(
            makeDiagnostic(
              'duplicate-security-scope',
              'error',
              `${rel}: ${location}[${requirementIndex}].${schemeName} contains duplicate scope values`
            )
          );
        }
        if ((scheme.type === 'http' || scheme.type === 'apiKey') && scopes.length > 0) {
          diagnostics.push(
            makeDiagnostic(
              'non-oauth-scope-misuse',
              'error',
              `${rel}: ${location}[${requirementIndex}].${schemeName} uses scopes with ${scheme.type}, but only oauth2 and openIdConnect requirements may list scopes`
            )
          );
        }
        if (scheme.type === 'oauth2' || scheme.type === 'openIdConnect') {
          const catalog = scopeCatalogByScheme.get(schemeName) ?? new Set();
          for (const scope of scopes) {
            if (!catalog.has(scope)) {
              diagnostics.push(
                makeDiagnostic(
                  'uncatalogued-oauth-scope',
                  'warning',
                  `${rel}: ${location}[${requirementIndex}].${schemeName} references scope ${JSON.stringify(scope)} that is not present in the declared static scope catalogue`
                )
              );
            }
          }
        }
      }
    });
  }

  checkRequirementArray(document.security, 'security');
  (document.transports ?? []).forEach((transport, index) => {
    checkRequirementArray(transport.security, `transports[${index}].security`);
  });
  for (const [kind, items] of [
    ['tools', document.tools ?? []],
    ['resources', document.resources ?? []],
    ['resourceTemplates', document.resourceTemplates ?? []],
    ['prompts', document.prompts ?? []]
  ]) {
    items.forEach((item, index) => {
      checkRequirementArray(item.security, `${kind}[${index}].security`);
    });
  }
}

function validateProtocolScopes(document, rel, diagnostics) {
  const rootScope = normalizeScope(document.protocolVersions ?? []);
  const coverage = new Set();

  function assertSubset(scope, parentScope, location) {
    const parentScopeSet = new Set(parentScope);
    for (const version of scope) {
      if (!parentScopeSet.has(version)) {
        diagnostics.push(
          makeDiagnostic(
            'protocol-scope-outside-parent',
            'error',
            `${rel}: ${location} includes protocol version ${version} outside its parent scope`
          )
        );
      }
    }
  }

  (document.transports ?? []).forEach((transport, index) => {
    const scope = effectiveScope(document, transport, rootScope);
    assertSubset(scope, rootScope, `transports[${index}].protocolVersions`);
    for (const version of scope) coverage.add(version);
  });
  for (const version of rootScope) {
    if (!coverage.has(version)) {
      diagnostics.push(
        makeDiagnostic(
          'transport-coverage-gap',
          'error',
          `${rel}: protocol version ${version} is present at the root but not covered by any transport`
        )
      );
    }
  }

  const capabilities = document.capabilities ?? [];
  capabilities.forEach((capability, index) => {
    const scope = effectiveScope(document, capability, rootScope);
    assertSubset(scope, rootScope, `capabilities[${index}].protocolVersions`);
  });
  for (let index = 0; index < capabilities.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < capabilities.length; otherIndex += 1) {
      const leftScope = effectiveScope(document, capabilities[index], rootScope);
      const rightScope = effectiveScope(document, capabilities[otherIndex], rootScope);
      const overlap = intersection(leftScope, rightScope);
      if (overlap.length > 0) {
        diagnostics.push(
          makeDiagnostic(
            'capability-scope-overlap',
            'error',
            `${rel}: capabilities[${index}] and capabilities[${otherIndex}] overlap for protocol versions ${overlap.join(', ')}`
          )
        );
      }
    }
  }

  for (const [kind, items, key] of [
    ['tools', document.tools ?? [], 'name'],
    ['prompts', document.prompts ?? [], 'name'],
    ['resources', document.resources ?? [], 'uri'],
    ['resourceTemplates', document.resourceTemplates ?? [], 'uriTemplate']
  ]) {
    const byIdentifier = new Map();
    items.forEach((item, index) => {
      const identifier = item[key];
      const scope = effectiveScope(document, item, rootScope);
      assertSubset(scope, rootScope, `${kind}[${index}].protocolVersions`);
      const existing = byIdentifier.get(identifier) ?? [];
      for (const other of existing) {
        const overlap = intersection(scope, other.scope);
        if (overlap.length > 0) {
          diagnostics.push(
            makeDiagnostic(
              'primitive-scope-overlap',
              'error',
              `${rel}: ${kind}[${index}] with identifier ${JSON.stringify(identifier)} overlaps ${kind}[${other.index}] for protocol versions ${overlap.join(', ')}`
            )
          );
        }
      }
      existing.push({ index, scope });
      byIdentifier.set(identifier, existing);
    });
  }
}

function validateVersionSpecificSemantics(document, rel, diagnostics) {
  const rootScope = normalizeScope(document.protocolVersions ?? []);

  function checkMinimumVersion(location, object, fieldName, minimumVersion, scope) {
    if (!(fieldName in object)) return;
    for (const version of scope) {
      if (protocolOrder.get(version) < protocolOrder.get(minimumVersion)) {
        diagnostics.push(
          makeDiagnostic(
            'field-not-supported-by-version',
            'error',
            `${rel}: ${location}.${fieldName} is not defined for MCP ${version}; it requires ${minimumVersion} or later`
          )
        );
      }
    }
  }

  function checkOnlyVersion(location, object, fieldName, supportedVersion, scope) {
    if (!(fieldName in object)) return;
    for (const version of scope) {
      if (version !== supportedVersion) {
        diagnostics.push(
          makeDiagnostic(
            'field-not-supported-by-version',
            'error',
            `${rel}: ${location}.${fieldName} is defined only for MCP ${supportedVersion}, not MCP ${version}`
          )
        );
      }
    }
  }

  checkMinimumVersion('info', document.info ?? {}, 'title', '2025-06-18', rootScope);
  checkMinimumVersion('info', document.info ?? {}, 'description', '2025-11-25', rootScope);
  checkMinimumVersion('info', document.info ?? {}, 'icons', '2025-11-25', rootScope);
  checkMinimumVersion('info', document.info ?? {}, 'websiteUrl', '2025-11-25', rootScope);

  (document.transports ?? []).forEach((transport, index) => {
    const scope = effectiveScope(document, transport, rootScope);
    if (transport.type === 'streamable-http') {
      for (const version of scope) {
        if (protocolOrder.get(version) >= protocolOrder.get('2025-03-26')) continue;
        diagnostics.push(
          makeDiagnostic(
            'transport-not-supported-by-version',
            'error',
            `${rel}: transports[${index}] uses Streamable HTTP, which is not defined for MCP ${version}; it requires 2025-03-26 or later`
          )
        );
      }
    }
    if (transport.type === 'sse') {
      for (const version of scope) {
        if (protocolOrder.get(version) < protocolOrder.get('2025-03-26')) continue;
        diagnostics.push(
          makeDiagnostic(
            'legacy-sse-for-modern-version',
            'warning',
            `${rel}: transports[${index}] associates legacy SSE with MCP ${version}, where Streamable HTTP is the standard remote transport`
          )
        );
      }
    }
  });

  (document.tools ?? []).forEach((tool, index) => {
    const scope = effectiveScope(document, tool, rootScope);
    checkMinimumVersion(`tools[${index}]`, tool, 'title', '2025-06-18', scope);
    checkMinimumVersion(`tools[${index}]`, tool, 'outputSchema', '2025-06-18', scope);
    checkMinimumVersion(`tools[${index}]`, tool, '_meta', '2025-06-18', scope);
    checkMinimumVersion(`tools[${index}]`, tool, 'annotations', '2025-03-26', scope);
    checkOnlyVersion(`tools[${index}]`, tool, 'execution', '2025-11-25', scope);
    checkMinimumVersion(`tools[${index}]`, tool, 'icons', '2025-11-25', scope);
  });

  for (const [kind, items] of [
    ['resources', document.resources ?? []],
    ['resourceTemplates', document.resourceTemplates ?? []],
    ['prompts', document.prompts ?? []]
  ]) {
    items.forEach((item, index) => {
      const scope = effectiveScope(document, item, rootScope);
      checkMinimumVersion(`${kind}[${index}]`, item, 'title', '2025-06-18', scope);
      checkMinimumVersion(`${kind}[${index}]`, item, '_meta', '2025-06-18', scope);
      checkMinimumVersion(`${kind}[${index}]`, item, 'icons', '2025-11-25', scope);
      if (kind !== 'prompts' && item.annotations?.lastModified !== undefined) {
        for (const version of scope) {
          if (protocolOrder.get(version) >= protocolOrder.get('2025-06-18')) continue;
          diagnostics.push(
            makeDiagnostic(
              'resource-annotation-not-supported-by-version',
              'error',
              `${rel}: ${kind}[${index}].annotations.lastModified is not defined for MCP ${version}`
            )
          );
        }
      }
      if (kind === 'prompts') {
        (item.arguments ?? []).forEach((argument, argumentIndex) => {
          checkMinimumVersion(`${kind}[${index}].arguments[${argumentIndex}]`, argument, 'title', '2025-06-18', scope);
        });
      }
    });
  }

  (document.capabilities ?? []).forEach((capability, index) => {
    const scope = effectiveScope(document, capability, rootScope);
    if ('completions' in capability) checkMinimumVersion(`capabilities[${index}]`, capability, 'completions', '2025-03-26', scope);
    if ('tasks' in capability) {
      checkMinimumVersion(`capabilities[${index}]`, capability, 'tasks', '2025-11-25', scope);
      if (scope.includes('2026-07-28')) {
        diagnostics.push(
          makeDiagnostic(
            'tasks-core-not-valid-in-2026',
            'error',
            `${rel}: capabilities[${index}].tasks cannot apply to MCP 2026-07-28; use capabilities.extensions instead`
          )
        );
      }
    }
    if ('extensions' in capability) {
      for (const version of scope) {
        if (protocolOrder.get(version) < protocolOrder.get('2026-07-28')) {
          diagnostics.push(
            makeDiagnostic(
              'extensions-not-supported-by-version',
              'error',
              `${rel}: capabilities[${index}].extensions is not defined for MCP ${version}; it requires 2026-07-28`
            )
          );
        }
      }
      for (const identifier of Object.keys(capability.extensions ?? {})) {
        if (!usesMcpReservedPrefix(identifier) || knownReservedCapabilityExtensions.has(identifier)) continue;
        diagnostics.push(
          makeDiagnostic(
            'unknown-reserved-extension-identifier',
            'warning',
            `${rel}: capabilities[${index}].extensions contains unrecognized identifier ${JSON.stringify(identifier)} under an MCP-reserved prefix; preserve it and review its authority`
          )
        );
      }
    }
    if ('logging' in capability && scope.includes('2026-07-28')) {
      diagnostics.push(
        makeDiagnostic(
          'logging-deprecated-in-2026',
          'warning',
          `${rel}: capabilities[${index}].logging applies to MCP 2026-07-28, where logging is deprecated`
        )
      );
    }
  });
}

const singleSchemaKeywords = [
  'additionalItems',
  'additionalProperties',
  'contains',
  'contentSchema',
  'else',
  'if',
  'items',
  'not',
  'propertyNames',
  'then',
  'unevaluatedItems',
  'unevaluatedProperties'
];
const arraySchemaKeywords = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];
const mapSchemaKeywords = ['$defs', 'definitions', 'dependentSchemas', 'patternProperties'];

function collectMcpHeaderAnnotations(schema) {
  const annotations = [];

  function visit(node, location, propertiesOnlyPath, isPropertyNode) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    if (Object.hasOwn(node, 'x-mcp-header')) {
      annotations.push({
        location,
        value: node['x-mcp-header'],
        type: node.type,
        staticallyReachable: propertiesOnlyPath && isPropertyNode
      });
    }

    if (node.properties && typeof node.properties === 'object' && !Array.isArray(node.properties)) {
      for (const [name, child] of Object.entries(node.properties)) {
        visit(child, `${location}.properties[${JSON.stringify(name)}]`, propertiesOnlyPath, propertiesOnlyPath);
      }
    }

    for (const keyword of mapSchemaKeywords) {
      const map = node[keyword];
      if (!map || typeof map !== 'object' || Array.isArray(map)) continue;
      for (const [name, child] of Object.entries(map)) {
        visit(child, `${location}.${keyword}[${JSON.stringify(name)}]`, false, false);
      }
    }
    for (const keyword of arraySchemaKeywords) {
      if (!Array.isArray(node[keyword])) continue;
      node[keyword].forEach((child, index) => visit(child, `${location}.${keyword}[${index}]`, false, false));
    }
    for (const keyword of singleSchemaKeywords) {
      const child = node[keyword];
      if (Array.isArray(child)) {
        child.forEach((item, index) => visit(item, `${location}.${keyword}[${index}]`, false, false));
      } else {
        visit(child, `${location}.${keyword}`, false, false);
      }
    }
    const dependencies = node.dependencies;
    if (dependencies && typeof dependencies === 'object' && !Array.isArray(dependencies)) {
      for (const [name, child] of Object.entries(dependencies)) {
        if (!Array.isArray(child)) visit(child, `${location}.dependencies[${JSON.stringify(name)}]`, false, false);
      }
    }
  }

  visit(schema, 'inputSchema', true, false);
  return annotations;
}

function validateMcpHeaderAnnotations(tool, toolIndex, scope, rel, diagnostics) {
  const annotations = collectMcpHeaderAnnotations(tool.inputSchema);
  if (!annotations.length) return;

  for (const version of scope) {
    if (version !== '2026-07-28') {
      diagnostics.push(
        makeDiagnostic(
          'field-not-supported-by-version',
          'error',
          `${rel}: tools[${toolIndex}].inputSchema uses x-mcp-header, which is not defined for MCP ${version}`
        )
      );
    }
  }

  const byCaseInsensitiveName = new Map();
  for (const annotation of annotations) {
    const location = `tools[${toolIndex}].${annotation.location}.x-mcp-header`;
    if (!annotation.staticallyReachable) {
      diagnostics.push(
        makeDiagnostic(
          'invalid-x-mcp-header',
          'error',
          `${rel}: ${location} is not on a property statically reachable from the schema root through properties only`
        )
      );
    }
    if (typeof annotation.value !== 'string' || !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(annotation.value)) {
      diagnostics.push(
        makeDiagnostic(
          'invalid-x-mcp-header',
          'error',
          `${rel}: ${location} must be a non-empty HTTP field-name token`
        )
      );
      continue;
    }
    if (!['boolean', 'integer', 'string'].includes(annotation.type)) {
      diagnostics.push(
        makeDiagnostic(
          'invalid-x-mcp-header',
          'error',
          `${rel}: ${location} may annotate only a boolean, integer, or string property`
        )
      );
    }
    const normalizedName = annotation.value.toLowerCase();
    const previousLocation = byCaseInsensitiveName.get(normalizedName);
    if (previousLocation) {
      diagnostics.push(
        makeDiagnostic(
          'duplicate-x-mcp-header',
          'error',
          `${rel}: ${location} duplicates ${previousLocation} case-insensitively`
        )
      );
    } else {
      byCaseInsensitiveName.set(normalizedName, location);
    }
  }
}

function validateLegacyToolSchemaShape(schema, location, rel, diagnostics) {
  if (Object.hasOwn(schema, 'properties')) {
    const properties = schema.properties;
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
      diagnostics.push(
        makeDiagnostic(
          'invalid-legacy-tool-schema-shape',
          'error',
          `${rel}: ${location}.properties must be an object for MCP revisions before ${toolSchemaDialectVersion}`
        )
      );
    } else {
      for (const [name, propertySchema] of Object.entries(properties)) {
        if (propertySchema && typeof propertySchema === 'object' && !Array.isArray(propertySchema)) continue;
        diagnostics.push(
          makeDiagnostic(
            'invalid-legacy-tool-schema-shape',
            'error',
            `${rel}: ${location}.properties[${JSON.stringify(name)}] must be an object for MCP revisions before ${toolSchemaDialectVersion}`
          )
        );
      }
    }
  }
  if (Object.hasOwn(schema, 'required') && (!Array.isArray(schema.required) || schema.required.some((name) => typeof name !== 'string'))) {
    diagnostics.push(
      makeDiagnostic(
        'invalid-legacy-tool-schema-shape',
        'error',
        `${rel}: ${location}.required must be an array of strings for MCP revisions before ${toolSchemaDialectVersion}`
      )
    );
  }
}

function validateToolSchemas(document, rel, diagnostics) {
  const rootScope = normalizeScope(document.protocolVersions ?? []);

  (document.tools ?? []).forEach((tool, toolIndex) => {
    const scope = effectiveScope(document, tool, rootScope);
    for (const fieldName of ['inputSchema', 'outputSchema']) {
      const schema = tool[fieldName];
      if (!schema || typeof schema !== 'object' || Array.isArray(schema)) continue;
      const location = `tools[${toolIndex}].${fieldName}`;
      const hasLegacyScope = scope.some((version) => protocolOrder.get(version) < protocolOrder.get(toolSchemaDialectVersion));
      const hasDialectAwareScope = scope.some((version) => protocolOrder.get(version) >= protocolOrder.get(toolSchemaDialectVersion));
      if (Object.hasOwn(schema, '$schema')) {
        for (const version of scope) {
          if (protocolOrder.get(version) >= protocolOrder.get(toolSchemaDialectVersion)) continue;
          diagnostics.push(
            makeDiagnostic(
              'field-not-supported-by-version',
              'error',
              `${rel}: ${location}.$schema is not defined for MCP ${version}; it requires ${toolSchemaDialectVersion} or later`
            )
          );
        }
      }
      if (hasLegacyScope) validateLegacyToolSchemaShape(schema, location, rel, diagnostics);

      if (hasDialectAwareScope) {
        const dialect = embeddedSchemaDialect(schema);
        if (!dialect) {
          diagnostics.push(
            makeDiagnostic(
              'unsupported-tool-schema-dialect',
              'error',
              `${rel}: ${location} declares an unsupported JSON Schema dialect ${JSON.stringify(schema.$schema)}`
            )
          );
        } else {
          const validator = createValidatorForDialect(dialect);
          try {
            if (!validator.validateSchema(schema, true)) {
              const details = validator.errors?.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ') ?? 'unknown meta-schema error';
              diagnostics.push(
                makeDiagnostic(
                  'invalid-tool-schema',
                  'error',
                  `${rel}: ${location} is not valid JSON Schema ${dialect}: ${details}`
                )
              );
            } else {
              validator.compile(schema);
            }
          } catch (error) {
            const partial = schemaForPartialOfflineCompilation(schema);
            try {
              if (!partial.externalReferences.length) throw error;
              createValidatorForDialect(dialect).compile(partial.schema);
              const references = [...new Set(partial.externalReferences)].sort();
              diagnostics.push(
                makeDiagnostic(
                  'unresolved-external-tool-schema-reference',
                  'warning',
                  `${rel}: ${location} contains external $ref values unavailable to offline validation (${references.map((reference) => JSON.stringify(reference)).join(', ')}); the references are preserved, but complete Tool schema validation was not possible`
                )
              );
            } catch (partialError) {
              diagnostics.push(
                makeDiagnostic(
                  'invalid-tool-schema',
                  'error',
                  `${rel}: ${location} is not a compilable JSON Schema ${dialect}: ${partialError.message}`
                )
              );
            }
          }
        }
      }

      if (fieldName === 'outputSchema' && schema.type !== 'object') {
        for (const version of scope) {
          if (version === '2026-07-28') continue;
          diagnostics.push(
            makeDiagnostic(
              'field-not-supported-by-version',
              'error',
              `${rel}: ${location} must have type "object" when it applies to MCP ${version}`
            )
          );
        }
      }
    }
    validateMcpHeaderAnnotations(tool, toolIndex, scope, rel, diagnostics);
  });
}

function validateLegacyExampleValue(schema, value, location, rel, diagnostics) {
  if (schema.type === 'object' && (!value || typeof value !== 'object' || Array.isArray(value))) {
    diagnostics.push(makeDiagnostic('tool-example-schema-mismatch', 'error', `${rel}: ${location} must be an object`));
    return;
  }
  for (const name of schema.required ?? []) {
    if (!Object.hasOwn(value, name)) {
      diagnostics.push(makeDiagnostic('tool-example-schema-mismatch', 'error', `${rel}: ${location} is missing required property ${JSON.stringify(name)}`));
    }
  }
  if (schema.additionalProperties === false && schema.properties && typeof schema.properties === 'object') {
    for (const name of Object.keys(value)) {
      if (!Object.hasOwn(schema.properties, name)) {
        diagnostics.push(makeDiagnostic('tool-example-schema-mismatch', 'error', `${rel}: ${location} contains undeclared property ${JSON.stringify(name)}`));
      }
    }
  }
}

function validateExampleValue(schema, value, location, rel, diagnostics) {
  const dialect = embeddedSchemaDialect(schema);
  if (!dialect) return;
  const partial = schemaForPartialOfflineCompilation(schema);
  if (partial.externalReferences.length) {
    const references = [...new Set(partial.externalReferences)].sort();
    diagnostics.push(
      makeDiagnostic(
        'incomplete-tool-example-validation',
        'warning',
        `${rel}: ${location} could not be validated completely because its associated Tool schema contains unresolved external $ref values (${references.map((reference) => JSON.stringify(reference)).join(', ')})`
      )
    );
    return;
  }
  try {
    const validate = createValidatorForDialect(dialect).compile(schema);
    if (!validate(value)) {
      const details = validate.errors?.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ') ?? 'unknown validation error';
      diagnostics.push(makeDiagnostic('tool-example-schema-mismatch', 'error', `${rel}: ${location} does not validate against its associated Tool schema: ${details}`));
    }
  } catch {
    // validateToolSchemas reports the malformed or unsupported schema itself.
  }
}

function validateToolExamples(document, rel, diagnostics) {
  const rootScope = normalizeScope(document.protocolVersions ?? []);

  (document.tools ?? []).forEach((tool, toolIndex) => {
    if (!tool.examples || typeof tool.examples !== 'object' || Array.isArray(tool.examples)) return;
    const scope = effectiveScope(document, tool, rootScope);
    const legacyVersions = scope.filter((version) => protocolOrder.get(version) < protocolOrder.get(toolSchemaDialectVersion));
    const modernVersions = scope.filter((version) => protocolOrder.get(version) >= protocolOrder.get(toolSchemaDialectVersion));

    for (const [exampleName, example] of Object.entries(tool.examples)) {
      if (!example || typeof example !== 'object') continue;
      const exampleLocation = `tools[${toolIndex}].examples[${JSON.stringify(exampleName)}]`;
      const result = example.result ?? {};
      const successful = result.isError !== true;

      for (const envelopeField of ['jsonrpc', 'id', 'error']) {
        if (Object.hasOwn(result, envelopeField)) {
          diagnostics.push(makeDiagnostic('tool-example-json-rpc-envelope', 'error', `${rel}: ${exampleLocation}.result must not contain JSON-RPC envelope field ${JSON.stringify(envelopeField)}`));
        }
      }
      for (const incompleteField of ['task', 'inputRequests', 'requestState']) {
        if (Object.hasOwn(result, incompleteField)) {
          diagnostics.push(makeDiagnostic('incomplete-tool-example-result', 'error', `${rel}: ${exampleLocation}.result must not contain non-completed workflow field ${JSON.stringify(incompleteField)}`));
        }
      }

      for (const version of scope) {
        const resultLocation = `${exampleLocation}.result`;
        if (version === '2026-07-28' && result.resultType !== 'complete') {
          diagnostics.push(makeDiagnostic('tool-example-result-version-mismatch', 'error', `${rel}: ${resultLocation}.resultType must be "complete" for MCP ${version}`));
        }
        if (version !== '2026-07-28' && Object.hasOwn(result, 'resultType')) {
          diagnostics.push(makeDiagnostic('tool-example-result-version-mismatch', 'error', `${rel}: ${resultLocation}.resultType is not defined for MCP ${version}`));
        }
        if (Object.hasOwn(result, 'structuredContent') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
          diagnostics.push(makeDiagnostic('tool-example-result-version-mismatch', 'error', `${rel}: ${resultLocation}.structuredContent is not defined for MCP ${version}`));
        }
        if (Object.hasOwn(result, 'structuredContent') && version !== '2026-07-28' && (!result.structuredContent || typeof result.structuredContent !== 'object' || Array.isArray(result.structuredContent))) {
          diagnostics.push(makeDiagnostic('tool-example-result-version-mismatch', 'error', `${rel}: ${resultLocation}.structuredContent must be an object for MCP ${version}`));
        }
        (result.content ?? []).forEach((content, contentIndex) => {
          const contentLocation = `${resultLocation}.content[${contentIndex}]`;
          if (content.type === 'audio' && protocolOrder.get(version) < protocolOrder.get('2025-03-26')) {
            diagnostics.push(makeDiagnostic('tool-example-content-version-mismatch', 'error', `${rel}: ${contentLocation} uses audio content, which is not defined for MCP ${version}`));
          }
          if (content.type === 'resource_link' && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
            diagnostics.push(makeDiagnostic('tool-example-content-version-mismatch', 'error', `${rel}: ${contentLocation} uses resource-link content, which is not defined for MCP ${version}`));
          }
          if (Object.hasOwn(content, '_meta') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
            diagnostics.push(makeDiagnostic('tool-example-content-version-mismatch', 'error', `${rel}: ${contentLocation}._meta is not defined for MCP ${version}`));
          }
          if (content.type === 'resource' && Object.hasOwn(content.resource ?? {}, '_meta') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
            diagnostics.push(makeDiagnostic('tool-example-content-version-mismatch', 'error', `${rel}: ${contentLocation}.resource._meta is not defined for MCP ${version}`));
          }
          if (content.type === 'resource_link' && Array.isArray(content.icons) && protocolOrder.get(version) < protocolOrder.get('2025-11-25')) {
            diagnostics.push(makeDiagnostic('tool-example-content-version-mismatch', 'error', `${rel}: ${contentLocation}.icons is not defined for MCP ${version}`));
          }
          if (content.annotations?.lastModified !== undefined && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
            diagnostics.push(makeDiagnostic('tool-example-content-version-mismatch', 'error', `${rel}: ${contentLocation}.annotations.lastModified is not defined for MCP ${version}`));
          }
        });
      }

      if (!successful && Object.hasOwn(result, 'structuredContent')) {
        diagnostics.push(makeDiagnostic('structured-tool-error-example', 'error', `${rel}: ${exampleLocation}.result must not contain structuredContent when isError is true`));
      }
      if (successful && tool.outputSchema && !Object.hasOwn(result, 'structuredContent')) {
        diagnostics.push(makeDiagnostic('missing-tool-example-structured-content', 'error', `${rel}: ${exampleLocation}.result must contain structuredContent because the Tool declares outputSchema`));
      }

      if (legacyVersions.length) {
        validateLegacyExampleValue(tool.inputSchema, example.input, `${exampleLocation}.input`, rel, diagnostics);
        diagnostics.push(
          makeDiagnostic(
            'incomplete-tool-example-validation',
            'warning',
            `${rel}: ${exampleLocation}.input compatibility could not be validated completely for MCP ${legacyVersions.join(', ')} because those revisions do not define an embedded Tool-schema dialect`
          )
        );
      }
      if (modernVersions.length) {
        validateExampleValue(tool.inputSchema, example.input, `${exampleLocation}.input`, rel, diagnostics);
      }
      if (successful && Object.hasOwn(result, 'structuredContent') && tool.outputSchema) {
        if (legacyVersions.length) {
          validateLegacyExampleValue(tool.outputSchema, result.structuredContent, `${exampleLocation}.result.structuredContent`, rel, diagnostics);
          diagnostics.push(
            makeDiagnostic(
              'incomplete-tool-example-validation',
              'warning',
              `${rel}: ${exampleLocation}.result.structuredContent compatibility could not be validated completely for MCP ${legacyVersions.join(', ')} because those revisions do not define an embedded Tool-schema dialect`
            )
          );
        }
        if (modernVersions.length) {
          validateExampleValue(tool.outputSchema, result.structuredContent, `${exampleLocation}.result.structuredContent`, rel, diagnostics);
        }
      }
    }
  });
}

function isValidBase64(value) {
  if (typeof value !== 'string' || value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return false;
  return Buffer.from(value, 'base64').toString('base64') === value;
}

function validateCompletedResourceResult(result, scope, location, rel, diagnostics) {
  for (const envelopeField of ['jsonrpc', 'id', 'error']) {
    if (Object.hasOwn(result, envelopeField)) {
      diagnostics.push(makeDiagnostic('resource-example-json-rpc-envelope', 'error', `${rel}: ${location} must not contain JSON-RPC envelope field ${JSON.stringify(envelopeField)}`));
    }
  }
  for (const incompleteField of ['task', 'inputRequests', 'requestState']) {
    if (Object.hasOwn(result, incompleteField)) {
      diagnostics.push(makeDiagnostic('incomplete-resource-example-result', 'error', `${rel}: ${location} must not contain non-completed workflow field ${JSON.stringify(incompleteField)}`));
    }
  }

  for (const version of scope) {
    if (version === '2026-07-28' && result.resultType !== 'complete') {
      diagnostics.push(makeDiagnostic('resource-example-result-version-mismatch', 'error', `${rel}: ${location}.resultType must be "complete" for MCP ${version}`));
    }
    if (version !== '2026-07-28' && Object.hasOwn(result, 'resultType')) {
      diagnostics.push(makeDiagnostic('resource-example-result-version-mismatch', 'error', `${rel}: ${location}.resultType is not defined for MCP ${version}`));
    }
    if (Object.hasOwn(result, '_meta') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
      diagnostics.push(makeDiagnostic('resource-example-result-version-mismatch', 'error', `${rel}: ${location}._meta is not defined for MCP ${version}`));
    }
    (result.contents ?? []).forEach((content, contentIndex) => {
      if (Object.hasOwn(content, '_meta') && protocolOrder.get(version) < protocolOrder.get('2025-06-18')) {
        diagnostics.push(makeDiagnostic('resource-example-content-version-mismatch', 'error', `${rel}: ${location}.contents[${contentIndex}]._meta is not defined for MCP ${version}`));
      }
    });
  }
}

function validateResourceExampleContents(owner, requestedUri, result, location, rel, diagnostics) {
  const contents = result.contents ?? [];
  let requestedEntryFound = false;

  contents.forEach((content, contentIndex) => {
    const contentLocation = `${location}.result.contents[${contentIndex}]`;
    if (content.uri === requestedUri) {
      requestedEntryFound = true;
      if (owner.mimeType && content.mimeType && content.mimeType !== owner.mimeType) {
        diagnostics.push(makeDiagnostic('resource-example-mime-type-mismatch', 'warning', `${rel}: ${contentLocation}.mimeType ${JSON.stringify(content.mimeType)} differs from the declaration MIME type ${JSON.stringify(owner.mimeType)}`));
      }
      if (owner.size !== undefined) {
        const actualSize = typeof content.text === 'string'
          ? Buffer.byteLength(content.text, 'utf8')
          : typeof content.blob === 'string' && isValidBase64(content.blob)
            ? Buffer.from(content.blob, 'base64').length
            : undefined;
        if (actualSize !== undefined && actualSize !== owner.size) {
          diagnostics.push(makeDiagnostic('resource-example-size-mismatch', 'warning', `${rel}: ${contentLocation} contains ${actualSize} raw bytes, which differs from the declared Resource size ${owner.size}`));
        }
      }
    }
    if (typeof content.blob === 'string' && !isValidBase64(content.blob)) {
      diagnostics.push(makeDiagnostic('invalid-resource-example-base64', 'error', `${rel}: ${contentLocation}.blob must be valid canonical base64`));
    }
  });

  if (!requestedEntryFound) {
    diagnostics.push(makeDiagnostic('resource-example-requested-uri-not-returned', 'warning', `${rel}: ${location}.result.contents has no entry for requested URI ${JSON.stringify(requestedUri)}; this is valid only for a documented collection or indirection`));
  }
}

function validateResourceExamples(document, rel, diagnostics) {
  const rootScope = normalizeScope(document.protocolVersions ?? []);

  for (const [kind, items] of [
    ['resources', document.resources ?? []],
    ['resourceTemplates', document.resourceTemplates ?? []]
  ]) {
    items.forEach((owner, ownerIndex) => {
      if (!owner.examples || typeof owner.examples !== 'object' || Array.isArray(owner.examples)) return;
      const scope = effectiveScope(document, owner, rootScope);
      let template;
      if (kind === 'resourceTemplates') {
        try {
          template = new UriTemplateMatcher();
          template.add(owner.uriTemplate);
        } catch (error) {
          template = undefined;
          diagnostics.push(makeDiagnostic('resource-template-example-invalid-template', 'error', `${rel}: ${kind}[${ownerIndex}].uriTemplate is not a valid RFC 6570 template: ${error.message}`));
        }
      }

      for (const [exampleName, example] of Object.entries(owner.examples)) {
        if (!example || typeof example !== 'object' || Array.isArray(example)) continue;
        const location = `${kind}[${ownerIndex}].examples[${JSON.stringify(exampleName)}]`;
        const result = example.result;
        if (!result || typeof result !== 'object' || Array.isArray(result)) continue;
        const requestedUri = kind === 'resources' ? owner.uri : example.uri;

        if (kind === 'resourceTemplates' && typeof requestedUri === 'string' && template && !template.match(requestedUri)) {
          diagnostics.push(makeDiagnostic('resource-template-example-invalid-expansion', 'error', `${rel}: ${location}.uri ${JSON.stringify(requestedUri)} is not a valid RFC 6570 expansion of ${JSON.stringify(owner.uriTemplate)}`));
        }

        validateCompletedResourceResult(result, scope, `${location}.result`, rel, diagnostics);
        if (typeof requestedUri === 'string') validateResourceExampleContents(owner, requestedUri, result, location, rel, diagnostics);
      }
    });
  }
}

export function semanticValidateDocument(document, rel = 'document') {
  const diagnostics = [];
  validateProtocolScopes(document, rel, diagnostics);
  validateSecurityRequirements(document, rel, diagnostics);
  validateTagReferences(document, rel, diagnostics);
  validateVersionSpecificSemantics(document, rel, diagnostics);
  validateMeta(document, rel, diagnostics);
  validateToolSchemas(document, rel, diagnostics);
  validateToolExamples(document, rel, diagnostics);
  validateResourceExamples(document, rel, diagnostics);
  diagnostics.sort((left, right) => left.code.localeCompare(right.code) || left.message.localeCompare(right.message));
  return diagnostics;
}

export function createMcpdesc08Validator(schema) {
  const ajv = createValidatorForDialect('2020-12');
  return ajv.compile(schema);
}

export function formatStructuralErrors(validate) {
  return validate.errors?.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ') ?? 'unknown error';
}

export function validateMcpdesc08Document(document, validateStructure, rel = 'document') {
  const diagnostics = [];
  if (!validateStructure(document)) {
    diagnostics.push(
      makeDiagnostic(
        'schema-validation',
        'error',
        `${rel}: does not validate against 0.8.0: ${formatStructuralErrors(validateStructure)}`
      )
    );
    return diagnostics;
  }
  return semanticValidateDocument(document, rel);
}