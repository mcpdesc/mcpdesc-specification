import fs from 'node:fs';
import path from 'node:path';

export function assembleDraft(root) {
  const sectionDir = path.join(root, 'spec', 'draft', 'sections');
  if (!fs.existsSync(sectionDir)) throw new Error('spec/draft/sections does not exist');

  const sections = fs.readdirSync(sectionDir)
    .filter((filename) => /^\d{2}-.+\.md$/.test(filename))
    .sort();
  if (sections.length === 0) throw new Error('no numbered draft sections found');

  const content = sections
    .map((filename) => fs.readFileSync(path.join(sectionDir, filename), 'utf8').trimEnd())
    .join('\n\n')
    .replaceAll('../../implementations.md', '../implementations.md')
    .replaceAll('../examples/', 'examples/')
    .replaceAll('../fixtures/', 'fixtures/')
    .replaceAll('../../../schemas/', '../../schemas/');

  return { content: `${content}\n`, sections };
}