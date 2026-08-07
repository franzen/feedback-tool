import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});

assert.equal(result.status, 0, result.stderr || result.stdout);

const [pack] = JSON.parse(result.stdout);
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const paths = pack.files.map(({ path }) => path).sort();
const requiredPaths = [
  'LICENSE',
  'README.md',
  'dist/index.js',
  'package.json',
  'types/index.d.ts',
];

for (const path of requiredPaths) {
  assert(paths.includes(path), `Packed artifact is missing ${path}`);
}

const forbiddenPrefixes = ['.changeset/', '.github/', 'demo/', 'scripts/', 'src/', 'tests/'];
for (const path of paths) {
  assert(!forbiddenPrefixes.some((prefix) => path.startsWith(prefix)), `Packed artifact unexpectedly includes ${path}`);
  assert(!path.includes('.iife.'), `Packed artifact unexpectedly includes an IIFE bundle: ${path}`);
}

assert.equal(pack.name, '@franzen/feedback-tool');
assert.equal(pack.version, manifest.version);
assert.match(pack.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/);

console.log(`Verified ${pack.entryCount} packed files (${pack.size} bytes).`);
