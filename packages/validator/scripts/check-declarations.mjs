import fs from 'node:fs';

for (const filename of ['index.d.ts']) {
  const source = fs.readFileSync(new URL(`../${filename}`, import.meta.url), 'utf8');
  if (/\bany\b/.test(source)) {
    throw new Error(`${filename} exposes the any type`);
  }
}

console.log('TypeScript declarations passed.');