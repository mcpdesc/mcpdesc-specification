#!/usr/bin/env node
// Prepare or check an immutable editorial edition of an existing RC or stable release.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { assembleDraft } from './draft-assembly.mjs';

const protectedPaths = [
  'schemas',
  'scripts/mcpdesc-views.mjs',
  'scripts/validate-0.8.mjs',
  'scripts/validator-base.mjs',
  'spec/draft/PROPOSALS.md',
  'spec/draft/examples',
  'spec/draft/fixtures',
  'spec/draft/proposal-snapshots',
  'spec/draft/serialization-fixtures'
];

function git(root, args, options = {}) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', ...options }).trim();
}

function validBaseTag(value) {
  return /^v\d+\.\d+\.\d+(?:-rc\.\d+)?$/.test(value ?? '');
}

function editionTag(baseTag, iteration) {
  return `${baseTag}+editorial.${iteration}`;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function activeTarget(status, baseTag) {
  if (status.draft?.snapshotTag === baseTag) {
    return {
      kind: 'prerelease',
      sectionPath: 'spec/draft/sections/00-front-matter.md',
      assembledPath: 'spec/draft/mcp-description.md'
    };
  }
  if (`v${status.stable?.version}` === baseTag) {
    return {
      kind: 'stable',
      assembledPath: `spec/${status.stable.version}/mcp-description.md`
    };
  }
  return null;
}

function updateFrontMatter(source, metadata) {
  const fields = [
    ['editorial-edition', String(metadata.iteration)],
    ['editorial-base-tag', metadata.baseTag],
    ['edition-tag', metadata.editionTag],
    ['edition-date', metadata.editionDate]
  ];
  let updated = source;
  for (const [name, value] of fields) {
    const pattern = new RegExp(`^${name}: .+$`, 'm');
    if (pattern.test(updated)) updated = updated.replace(pattern, `${name}: ${value}`);
    else updated = updated.replace(/^snapshot-tag: .+$/m, (line) => `${line}\n${name}: ${value}`);
  }
  return updated;
}

export function prepareEditorialEdition(root, baseTag, iterationValue, date) {
  const iteration = Number(iterationValue);
  if (!validBaseTag(baseTag)) throw new Error('base tag must use vX.Y.Z or vX.Y.Z-rc.N');
  if (!Number.isInteger(iteration) || iteration < 1) throw new Error('iteration must be a positive integer');
  if (!validDate(date)) {
    throw new Error('date must be a real calendar date using YYYY-MM-DD');
  }
  git(root, ['rev-parse', '--verify', `${baseTag}^{commit}`]);
  git(root, ['merge-base', '--is-ancestor', baseTag, 'HEAD']);

  const statusPath = path.join(root, 'specification-status.json');
  const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  const target = activeTarget(status, baseTag);
  if (!target) throw new Error(`${baseTag} is not the active release candidate or stable release`);
  const previous = status.editorialEdition;
  if (previous?.baseTag === baseTag && iteration <= previous.iteration) {
    throw new Error(`iteration must be greater than current editorial edition ${previous.iteration}`);
  }

  const metadata = {
    baseTag,
    iteration,
    editionTag: editionTag(baseTag, iteration),
    editionDate: date,
    target: target.kind
  };
  status.editorialEdition = metadata;
  fs.writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`);

  const assembledPath = path.join(root, target.assembledPath);
  if (target.sectionPath) {
    const sectionPath = path.join(root, target.sectionPath);
    fs.writeFileSync(sectionPath, updateFrontMatter(fs.readFileSync(sectionPath, 'utf8'), metadata));
    fs.writeFileSync(assembledPath, assembleDraft(root).content);
  } else {
    fs.writeFileSync(assembledPath, updateFrontMatter(fs.readFileSync(assembledPath, 'utf8'), metadata));
  }
  return metadata;
}

export function checkEditorialEdition(root) {
  const errors = [];
  const status = JSON.parse(fs.readFileSync(path.join(root, 'specification-status.json'), 'utf8'));
  const metadata = status.editorialEdition;
  if (!metadata) return { errors: ['specification-status.json has no editorialEdition metadata'] };
  if (!validBaseTag(metadata.baseTag)) errors.push('baseTag must use vX.Y.Z or vX.Y.Z-rc.N');
  if (!Number.isInteger(metadata.iteration) || metadata.iteration < 1) errors.push('iteration must be a positive integer');
  const expectedTag = editionTag(metadata.baseTag, metadata.iteration);
  if (metadata.editionTag !== expectedTag) errors.push(`editionTag must be ${expectedTag}`);
  if (!validDate(metadata.editionDate)) errors.push('editionDate must be a real calendar date using YYYY-MM-DD');
  const target = activeTarget(status, metadata.baseTag);
  if (!target || target.kind !== metadata.target) errors.push('baseTag and target must identify the active release candidate or stable release');

  try {
    git(root, ['rev-parse', '--verify', `${metadata.baseTag}^{commit}`]);
    git(root, ['merge-base', '--is-ancestor', metadata.baseTag, 'HEAD']);
    const changed = git(root, ['diff', '--name-only', metadata.baseTag, '--', ...protectedPaths]);
    if (changed) errors.push(`protected conformance artifacts differ from ${metadata.baseTag}: ${changed.split('\n').join(', ')}`);
    const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '--', ...protectedPaths]);
    if (untracked) errors.push(`untracked protected conformance artifacts exist: ${untracked.split('\n').join(', ')}`);
  } catch (error) {
    errors.push(`cannot compare with ${metadata.baseTag}: ${error.message}`);
  }

  if (target) {
    const frontMatter = fs.readFileSync(path.join(root, target.assembledPath), 'utf8').split('---', 2)[1] ?? '';
    for (const value of [
      `editorial-edition: ${metadata.iteration}`,
      `editorial-base-tag: ${metadata.baseTag}`,
      `edition-tag: ${metadata.editionTag}`,
      `edition-date: ${metadata.editionDate}`
    ]) {
      if (!frontMatter.includes(value)) errors.push(`${target.assembledPath} is missing ${JSON.stringify(value)}`);
    }
  }
  return { ...metadata, errors };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = process.cwd();
  const [command, baseTag, iteration, date] = process.argv.slice(2);
  try {
    if (command === 'prepare') {
      const metadata = prepareEditorialEdition(root, baseTag, iteration, date);
      console.log(`Prepared ${metadata.editionTag}. Review prose and run npm run release:check -- editorial.`);
    } else if (command === 'check') {
      const result = checkEditorialEdition(root);
      if (result.errors.length > 0) throw new Error(result.errors.join('\n'));
      console.log(`Checked editorial edition ${result.editionTag}.`);
    } else {
      throw new Error('usage: editorial-edition.mjs prepare <base-tag> <iteration> <YYYY-MM-DD> | check');
    }
  } catch (error) {
    console.error(`editorial-edition: ${error.message}`);
    process.exitCode = 1;
  }
}