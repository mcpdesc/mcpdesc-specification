import { Buffer } from 'node:buffer';
import {
  isAlias,
  isMap,
  isScalar,
  isSeq,
  parseAllDocuments
} from 'yaml';

const limits = {
  sourceBytes: 5 * 1024 * 1024,
  depth: 100,
  nodes: 100_000,
  scalarLength: 1024 * 1024,
  collectionItems: 100_000
};

const jsonCompatibleTags = new Set([
  'tag:yaml.org,2002:map',
  'tag:yaml.org,2002:seq',
  'tag:yaml.org,2002:str',
  'tag:yaml.org,2002:null',
  'tag:yaml.org,2002:bool',
  'tag:yaml.org,2002:int',
  'tag:yaml.org,2002:float'
]);

function decodeError(sourceName, message) {
  return new SyntaxError(`${sourceName}: ${message}`);
}

function assertSourceLimit(source, sourceName) {
  if (Buffer.byteLength(source, 'utf8') > limits.sourceBytes) {
    throw decodeError(sourceName, `source exceeds ${limits.sourceBytes} UTF-8 bytes`);
  }
}

function inspectJsonValue(value, sourceName, state, depth = 0) {
  if (depth > limits.depth) throw decodeError(sourceName, `nesting exceeds ${limits.depth} levels`);
  state.nodes += 1;
  if (state.nodes > limits.nodes) throw decodeError(sourceName, `value count exceeds ${limits.nodes}`);

  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw decodeError(sourceName, 'numbers must be finite');
  }
  if (typeof value === 'string' && value.length > limits.scalarLength) {
    throw decodeError(sourceName, `scalar exceeds ${limits.scalarLength} characters`);
  }
  if (Array.isArray(value)) {
    if (value.length > limits.collectionItems) {
      throw decodeError(sourceName, `collection exceeds ${limits.collectionItems} entries`);
    }
    for (const item of value) inspectJsonValue(item, sourceName, state, depth + 1);
    return;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length > limits.collectionItems) {
      throw decodeError(sourceName, `collection exceeds ${limits.collectionItems} entries`);
    }
    for (const [key, item] of entries) {
      if (key.length > limits.scalarLength) {
        throw decodeError(sourceName, `mapping key exceeds ${limits.scalarLength} characters`);
      }
      inspectJsonValue(item, sourceName, state, depth + 1);
    }
  }
}

function inspectYamlNode(node, sourceName, state, depth = 0) {
  if (depth > limits.depth) throw decodeError(sourceName, `nesting exceeds ${limits.depth} levels`);
  state.nodes += 1;
  if (state.nodes > limits.nodes) throw decodeError(sourceName, `node count exceeds ${limits.nodes}`);
  if (isAlias(node)) throw decodeError(sourceName, 'YAML aliases are not supported');
  if (node?.tag && !jsonCompatibleTags.has(node.tag)) {
    throw decodeError(sourceName, `YAML tag ${node.tag} is not supported`);
  }

  if (isScalar(node)) {
    if (typeof node.value === 'number' && !Number.isFinite(node.value)) {
      throw decodeError(sourceName, 'YAML numbers must be finite');
    }
    if (
      node.type === 'PLAIN'
      && typeof node.value === 'string'
      && /^[+-]?(?:\.inf|\.nan)$/i.test(node.source ?? '')
    ) {
      throw decodeError(sourceName, 'YAML non-finite numeric forms are not supported');
    }
    if (typeof node.value === 'string' && node.value.length > limits.scalarLength) {
      throw decodeError(sourceName, `YAML scalar exceeds ${limits.scalarLength} characters`);
    }
    return;
  }

  if (isMap(node)) {
    if (node.items.length > limits.collectionItems) {
      throw decodeError(sourceName, `YAML mapping exceeds ${limits.collectionItems} entries`);
    }
    for (const pair of node.items) {
      if (!isScalar(pair.key) || typeof pair.key.value !== 'string') {
        throw decodeError(sourceName, 'every YAML mapping key must resolve to a string');
      }
      inspectYamlNode(pair.key, sourceName, state, depth + 1);
      inspectYamlNode(pair.value, sourceName, state, depth + 1);
    }
    return;
  }

  if (isSeq(node)) {
    if (node.items.length > limits.collectionItems) {
      throw decodeError(sourceName, `YAML sequence exceeds ${limits.collectionItems} entries`);
    }
    for (const item of node.items) inspectYamlNode(item, sourceName, state, depth + 1);
  }
}

export function decodeDocumentSource(source, format, sourceName = 'document') {
  if (typeof source !== 'string') throw new TypeError('document source must be a string');
  assertSourceLimit(source, sourceName);

  if (format === 'json') {
    let value;
    try {
      value = JSON.parse(source);
    } catch (error) {
      throw decodeError(sourceName, `invalid JSON: ${error.message}`);
    }
    inspectJsonValue(value, sourceName, { nodes: 0 });
    return value;
  }

  if (format !== 'yaml') throw new TypeError(`unsupported document format: ${format}`);

  let documents;
  try {
    documents = parseAllDocuments(source, {
      schema: 'json',
      strict: true,
      uniqueKeys: true,
      merge: false
    });
  } catch (error) {
    throw decodeError(sourceName, `invalid YAML: ${error.message}`);
  }
  if (documents.length !== 1) {
    throw decodeError(sourceName, 'YAML input must contain exactly one document');
  }

  const document = documents[0];
  const diagnostics = [...document.errors, ...document.warnings].filter(
    (diagnostic) => diagnostic.code !== 'TAG_RESOLVE_FAILED'
      || !diagnostic.message.startsWith('Unresolved plain scalar ')
  );
  if (diagnostics.length) throw decodeError(sourceName, `invalid YAML: ${diagnostics[0].message}`);

  inspectYamlNode(document.contents, sourceName, { nodes: 0 });
  const value = document.toJS({ maxAliasCount: 0, mapAsMap: false });
  inspectJsonValue(value, sourceName, { nodes: 0 });
  return value;
}

export function documentFormatForPath(filename) {
  if (/\.json$/i.test(filename)) return 'json';
  if (/\.ya?ml$/i.test(filename)) return 'yaml';
  throw new TypeError(`cannot determine document format from path: ${filename}`);
}