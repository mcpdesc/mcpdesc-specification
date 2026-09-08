#!/usr/bin/env node
// Assemble the mutable draft from its ordered section sources.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { assembleDraft, assembleSpecification } from './draft-assembly.mjs';

const root = process.cwd();
const versionDirectory = process.argv[2] ?? 'draft';
const output = path.join(root, 'spec', versionDirectory, 'mcp-description.md');
const { content, sections } = versionDirectory === 'draft'
	? assembleDraft(root)
	: assembleSpecification(root, versionDirectory);

fs.writeFileSync(output, content);
console.log(`Assembled ${sections.length} sections into spec/${versionDirectory}/mcp-description.md.`);