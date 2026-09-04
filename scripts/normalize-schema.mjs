#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';
import { canonicalizeJsonSource } from './canonical-json.mjs';

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error('Usage: node scripts/normalize-schema.mjs <schema.json> [...]');
  process.exit(1);
}

for (const schemaPath of paths) {
  try {
    const source = fs.readFileSync(schemaPath, 'utf8');
    fs.writeFileSync(schemaPath, canonicalizeJsonSource(source));
    console.log(`Normalized ${schemaPath}`);
  } catch (error) {
    console.error(`normalize-schema: ${schemaPath}: ${error.message}`);
    process.exitCode = 1;
  }
}