#!/usr/bin/env node
// Assemble the mutable draft from its ordered section sources.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { assembleDraft } from './draft-assembly.mjs';

const root = process.cwd();
const output = path.join(root, 'spec', 'draft', 'mcp-description.md');
const { content, sections } = assembleDraft(root);

fs.writeFileSync(output, content);
console.log(`Assembled ${sections.length} sections into spec/draft/mcp-description.md.`);