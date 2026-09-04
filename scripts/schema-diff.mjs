#!/usr/bin/env node

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const METADATA_PATHS = new Set(['/$id', '/description']);
const MISSING = Symbol('missing');

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pointerSegment(value) {
  return String(value).replaceAll('~', '~0').replaceAll('/', '~1');
}

function collectChanges(oldValue, newValue, pointer = '') {
  if (oldValue === MISSING) return [{ kind: 'added', path: pointer || '/', newValue }];
  if (newValue === MISSING) return [{ kind: 'removed', path: pointer || '/', oldValue }];

  if (isObject(oldValue) && isObject(newValue)) {
    const keys = [...new Set([...Object.keys(oldValue), ...Object.keys(newValue)])].sort();
    return keys.flatMap((key) => collectChanges(
      Object.hasOwn(oldValue, key) ? oldValue[key] : MISSING,
      Object.hasOwn(newValue, key) ? newValue[key] : MISSING,
      `${pointer}/${pointerSegment(key)}`
    ));
  }

  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    const length = Math.max(oldValue.length, newValue.length);
    return Array.from({ length }, (_, index) => collectChanges(
      index < oldValue.length ? oldValue[index] : MISSING,
      index < newValue.length ? newValue[index] : MISSING,
      `${pointer}/${index}`
    )).flat();
  }

  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return [];
  return [{ kind: 'changed', path: pointer || '/', oldValue, newValue }];
}

function displayValue(value) {
  return JSON.stringify(value);
}

function formatChange(change) {
  if (change.kind === 'added') return `  added ${change.path}\n    + ${displayValue(change.newValue)}`;
  if (change.kind === 'removed') return `  removed ${change.path}\n    - ${displayValue(change.oldValue)}`;
  return `  changed ${change.path}\n    - ${displayValue(change.oldValue)}\n    + ${displayValue(change.newValue)}`;
}

function formatSection(title, changes) {
  return `${title}:\n${changes.length === 0 ? '  none' : changes.map(formatChange).join('\n')}`;
}

export function compareSchemas(oldSchema, newSchema) {
  const changes = collectChanges(oldSchema, newSchema);
  return {
    metadata: changes.filter((change) => METADATA_PATHS.has(change.path)),
    validation: changes.filter((change) => !METADATA_PATHS.has(change.path))
  };
}

export function formatSchemaDiff(oldSchema, newSchema) {
  const result = compareSchemas(oldSchema, newSchema);
  return {
    ...result,
    output: `${formatSection('Metadata changes', result.metadata)}\n\n${formatSection('Validation changes', result.validation)}\n`
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [oldPath, newPath] = process.argv.slice(2);
  if (!oldPath || !newPath) {
    console.error('Usage: node scripts/schema-diff.mjs <old-schema.json> <new-schema.json>');
    process.exit(2);
  }

  try {
    const oldSchema = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
    const newSchema = JSON.parse(fs.readFileSync(newPath, 'utf8'));
    const result = formatSchemaDiff(oldSchema, newSchema);
    process.stdout.write(result.output);
    if (result.validation.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error(`schema-diff: ${error.message}`);
    process.exitCode = 2;
  }
}