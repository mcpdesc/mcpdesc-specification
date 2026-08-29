import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_CACHE_DIRECTIVES = ['public', 'max-age=31536000', 'immutable'];

function headerValue(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) ?? '';
  const exact = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(exact)) return exact.join(', ');
  return exact ?? '';
}

function normalizeMediaType(contentType) {
  return String(contentType || '').split(';', 1)[0].trim().toLowerCase();
}

function isJsonCompatibleMediaType(mediaType) {
  return mediaType === 'application/schema+json'
    || mediaType === 'application/json'
    || /^application\/[a-z0-9.+-]+\+json$/i.test(mediaType);
}

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function looksLikeHtml(bodyText) {
  const prefix = bodyText.trimStart().slice(0, 512).toLowerCase();
  return prefix.startsWith('<!doctype html') || prefix.startsWith('<html') || prefix.includes('<html');
}

function cacheControlIncludesRequired(value) {
  const directives = new Set(
    String(value || '')
      .split(',')
      .map((directive) => directive.trim().toLowerCase())
      .filter(Boolean)
  );
  return REQUIRED_CACHE_DIRECTIVES.every((directive) => directives.has(directive));
}

export function loadDraftSchemaPublicationExpectation(root) {
  const manifestPath = path.join(root, 'schemas', 'draft.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest.schema) throw new Error('schemas/draft.json: missing schema path');
  if (!manifest.schemaId) throw new Error('schemas/draft.json: missing schemaId');

  const schemaPath = String(manifest.schema);
  const schemaBytes = fs.readFileSync(path.join(root, schemaPath));
  const schema = JSON.parse(schemaBytes.toString('utf8'));

  return {
    requestedUrl: String(manifest.schemaId),
    schemaPath,
    expectedBytes: schemaBytes,
    expectedRootId: String(schema.$id || ''),
    expectedDialect: String(schema.$schema || ''),
    localErrors: manifest.schemaId === schema.$id
      ? []
      : [`schemas/draft.json schemaId ${JSON.stringify(manifest.schemaId)} does not match ${schemaPath} root $id ${JSON.stringify(schema.$id)}`]
  };
}

export async function fetchSchemaPublication(requestedUrl, { fetchImpl = fetch, requestOrigin = 'https://editor.example' } = {}) {
  const response = await fetchImpl(requestedUrl, {
    redirect: 'manual',
    headers: {
      accept: 'application/schema+json, application/json;q=0.9',
      origin: requestOrigin
    }
  });
  const bodyBytes = Buffer.from(await response.arrayBuffer());
  return {
    requestedUrl,
    responseUrl: response.url,
    redirected: response.redirected,
    status: response.status,
    headers: response.headers,
    bodyBytes,
    requestOrigin
  };
}

export function analyzeSchemaPublication({
  requestedUrl,
  responseUrl,
  redirected = false,
  status,
  headers,
  bodyBytes,
  expectedBytes,
  expectedRootId,
  expectedDialect,
  requestOrigin = 'https://editor.example'
}) {
  const errors = [];
  const warnings = [];
  const contentType = headerValue(headers, 'content-type');
  const mediaType = normalizeMediaType(contentType);
  const bodyText = bodyBytes.toString('utf8');
  const actualDigest = sha256Hex(bodyBytes);
  const expectedDigest = sha256Hex(expectedBytes);

  if (status !== 200) {
    errors.push(`expected HTTP 200 for ${requestedUrl}, found ${status}`);
  }
  if (redirected || (status >= 300 && status < 400)) {
    const location = headerValue(headers, 'location');
    errors.push(`canonical schema publication must not redirect${location ? ` (Location: ${location})` : ''}`);
  }
  if (responseUrl && responseUrl !== requestedUrl) {
    errors.push(`canonical schema response URL ${JSON.stringify(responseUrl)} does not match request URL ${JSON.stringify(requestedUrl)}`);
  }
  if (!isJsonCompatibleMediaType(mediaType)) {
    errors.push(`Content-Type must be JSON-compatible, found ${JSON.stringify(contentType || '(missing)')}`);
  } else if (mediaType !== 'application/schema+json') {
    warnings.push(`Content-Type ${JSON.stringify(contentType)} is JSON-compatible but not application/schema+json`);
  }
  if (looksLikeHtml(bodyText)) {
    errors.push('response body appears to be an HTML fallback, not a JSON Schema document');
  }

  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch (error) {
    errors.push(`response body is not valid JSON: ${error.message}`);
  }

  if (!bodyBytes.equals(expectedBytes)) {
    errors.push(`response bytes differ from repository schema ${expectedDigest}; observed ${actualDigest}`);
  }
  if (parsed && parsed.$schema !== expectedDialect) {
    errors.push(`schema dialect mismatch: expected ${JSON.stringify(expectedDialect)}, found ${JSON.stringify(parsed.$schema)}`);
  }
  if (parsed && parsed.$id !== expectedRootId) {
    errors.push(`root $id mismatch: expected ${JSON.stringify(expectedRootId)}, found ${JSON.stringify(parsed.$id)}`);
  }

  const cors = String(headerValue(headers, 'access-control-allow-origin') || '').trim();
  if (!(cors === '*' || cors === requestOrigin)) {
    errors.push(`Access-Control-Allow-Origin must permit ${requestOrigin} or *, found ${JSON.stringify(cors || '(missing)')}`);
  }

  const cacheControl = headerValue(headers, 'cache-control');
  if (!cacheControlIncludesRequired(cacheControl)) {
    errors.push(`Cache-Control must include ${REQUIRED_CACHE_DIRECTIVES.join(', ')}, found ${JSON.stringify(cacheControl || '(missing)')}`);
  }

  const etag = String(headerValue(headers, 'etag') || '').trim();
  if (!etag) {
    errors.push('missing ETag header');
  } else if (/^W\//i.test(etag)) {
    errors.push(`ETag must be strong, found weak validator ${JSON.stringify(etag)}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    observed: {
      status,
      mediaType,
      contentType,
      responseUrl,
      expectedDigest,
      actualDigest,
      cacheControl,
      cors,
      etag
    }
  };
}

export async function verifySchemaPublication({
  requestedUrl,
  expectedBytes,
  expectedRootId,
  expectedDialect,
  fetchImpl = fetch,
  requestOrigin = 'https://editor.example'
}) {
  const response = await fetchSchemaPublication(requestedUrl, { fetchImpl, requestOrigin });
  return analyzeSchemaPublication({
    ...response,
    expectedBytes,
    expectedRootId,
    expectedDialect
  });
}