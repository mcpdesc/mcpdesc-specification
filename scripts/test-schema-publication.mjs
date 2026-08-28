import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  analyzeSchemaPublication,
  verifySchemaPublication
} from './schema-publication.mjs';

const root = process.cwd();
const schemaPath = path.join(root, 'schemas', 'mcp-description', '0.8.0.json');
const expectedBytes = fs.readFileSync(schemaPath);
const expectedSchema = JSON.parse(expectedBytes.toString('utf8'));
const requestedUrl = String(expectedSchema.$id);

function startServer(handler) {
  return new Promise((resolve, reject) => {
    const server = createServer(handler);
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}/schema.json`
      });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

const successHeaders = {
  'content-type': 'application/schema+json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'public, max-age=31536000, immutable',
  etag: '"draft-4-schema"'
};

const { server, url } = await startServer((request, response) => {
  response.writeHead(200, successHeaders);
  response.end(expectedBytes);
});

try {
  const result = await verifySchemaPublication({
    requestedUrl: url,
    expectedBytes,
    expectedRootId: expectedSchema.$id,
    expectedDialect: expectedSchema.$schema,
    requestOrigin: 'https://editor.example'
  });
  assert.equal(result.ok, true, result.errors.join('; '));
  assert.deepEqual(result.warnings, []);
} finally {
  await closeServer(server);
}

const warningResult = analyzeSchemaPublication({
  requestedUrl,
  responseUrl: requestedUrl,
  status: 200,
  headers: {
    ...successHeaders,
    'content-type': 'application/json; charset=utf-8'
  },
  bodyBytes: expectedBytes,
  expectedBytes,
  expectedRootId: expectedSchema.$id,
  expectedDialect: expectedSchema.$schema,
  requestOrigin: 'https://editor.example'
});
assert.equal(warningResult.ok, true);
assert.ok(warningResult.warnings.some((warning) => warning.includes('application/schema+json')));

const redirectResult = analyzeSchemaPublication({
  requestedUrl,
  responseUrl: requestedUrl,
  status: 302,
  headers: {
    location: 'https://example.invalid/other.json'
  },
  bodyBytes: Buffer.from(''),
  expectedBytes,
  expectedRootId: expectedSchema.$id,
  expectedDialect: expectedSchema.$schema,
  requestOrigin: 'https://editor.example'
});
assert.equal(redirectResult.ok, false);
assert.ok(redirectResult.errors.some((error) => error.includes('must not redirect')));

const htmlFallbackResult = analyzeSchemaPublication({
  requestedUrl,
  responseUrl: requestedUrl,
  status: 200,
  headers: {
    ...successHeaders,
    'content-type': 'text/html; charset=utf-8'
  },
  bodyBytes: Buffer.from('<!doctype html><html><body>fallback</body></html>'),
  expectedBytes,
  expectedRootId: expectedSchema.$id,
  expectedDialect: expectedSchema.$schema,
  requestOrigin: 'https://editor.example'
});
assert.equal(htmlFallbackResult.ok, false);
assert.ok(htmlFallbackResult.errors.some((error) => error.includes('HTML fallback')));
assert.ok(htmlFallbackResult.errors.some((error) => error.includes('JSON-compatible')));

const headerFailureResult = analyzeSchemaPublication({
  requestedUrl,
  responseUrl: requestedUrl,
  status: 200,
  headers: {
    'content-type': 'application/schema+json',
    'cache-control': 'public, max-age=31536000',
    etag: 'W/"weak"'
  },
  bodyBytes: expectedBytes,
  expectedBytes,
  expectedRootId: expectedSchema.$id,
  expectedDialect: expectedSchema.$schema,
  requestOrigin: 'https://editor.example'
});
assert.equal(headerFailureResult.ok, false);
assert.ok(headerFailureResult.errors.some((error) => error.includes('Access-Control-Allow-Origin')));
assert.ok(headerFailureResult.errors.some((error) => error.includes('Cache-Control')));
assert.ok(headerFailureResult.errors.some((error) => error.includes('strong')));

console.log('Schema publication tests passed.');