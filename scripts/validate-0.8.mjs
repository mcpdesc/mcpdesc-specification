// Provide structural and semantic validation for MCP Description v0.8.0.
//
// The exported helpers complement the published JSON Schema with cross-object
// rules for protocol scopes, revision applicability, security, tags, embedded
// Tool schemas, transports, and extension namespaces. Diagnostics distinguish
// fatal errors from nonfatal warnings. External schema references are never
// fetched automatically; unresolved targets are preserved and reported.

import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export const supportedProtocolVersions = [
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
  '2025-11-25',
  '2026-07-28'
];

const protocolOrder = new Map(supportedProtocolVersions.map((version, index) => [version, index]));
const toolSchemaDialectVersion = '2025-11-25';
const knownReservedCapabilityExtensions = new Set([
  'io.modelcontextprotocol/tasks'
]);

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

export function semanticValidateDocument(document, rel = 'document') {
  const diagnostics = [];
  validateProtocolScopes(document, rel, diagnostics);
  validateSecurityRequirements(document, rel, diagnostics);
  validateTagReferences(document, rel, diagnostics);
  validateVersionSpecificSemantics(document, rel, diagnostics);
  validateToolSchemas(document, rel, diagnostics);
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