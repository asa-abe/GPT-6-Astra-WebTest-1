import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  readFile,
  readdir,
  writeFile,
  mkdir,
  copyFile,
} from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';

const root = resolve('dist');
const html = await readFile(`${root}/index.html`, 'utf8');
const assets = await readdir(`${root}/_astro`);
const htmlFiles = (await readdir(root, { recursive: true })).filter((file) =>
  file.endsWith('.html'),
);
assert.deepEqual(
  htmlFiles,
  ['index.html'],
  'The LP must contain exactly one HTML page',
);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(ids.length, new Set(ids).size, 'Duplicate HTML IDs');
for (const match of html.matchAll(/href="#([^"]+)"/g))
  assert(ids.includes(match[1]), `Broken anchor: ${match[1]}`);
assert.equal(
  (html.match(/<h1[\s>]/g) ?? []).length,
  1,
  'Exactly one h1 is required',
);
assert(!html.includes('rel="modulepreload"'), '3D must not be preloaded');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
const initialPaths = scripts
  .map((match) => match[1].match(/\bsrc="([^"]+)"/)?.[1])
  .filter(Boolean);
const visited = new Set();
async function visit(file) {
  const path = resolve(file);
  assert(path.startsWith(`${root}/`), 'Asset outside dist');
  if (visited.has(path)) return;
  visited.add(path);
  const code = await readFile(path, 'utf8');
  const imports = [
    ...code.matchAll(
      /\b(?:import|export)\s*(?:(?:[\w*{},$\s]+?)from\s*)?["'](\.[^"']+)["']/g,
    ),
  ];
  for (const match of imports) await visit(resolve(dirname(path), match[1]));
}
for (const file of initialPaths) await visit(`${root}${file}`);
const inline = scripts.filter((match) => !/\bsrc=/.test(match[1]));
let initialJS = inline.reduce(
  (total, match) => total + gzipSync(match[2]).length,
  0,
);
for (const path of visited) initialJS += gzipSync(await readFile(path)).length;
let delayedJS = 0;
for (const asset of assets.filter((name) => name.endsWith('.js'))) {
  if (!visited.has(`${root}/_astro/${asset}`))
    delayedJS += gzipSync(await readFile(`${root}/_astro/${asset}`)).length;
}
assert(initialJS <= 35 * 1024, `Initial JS exceeds 35 KiB: ${initialJS}`);
assert(delayedJS <= 450 * 1024, `Delayed JS exceeds 450 KiB: ${delayedJS}`);
const hashes = inline.map(
  (match) =>
    `'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`,
);
const csp = `default-src 'self'; script-src 'self' ${hashes.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`;
const headers = `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Cache-Control: public, max-age=0, must-revalidate\n/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n`;
await writeFile(`${root}/_headers`, headers);
await mkdir(`${root}/licenses`, { recursive: true });
for (const [source, name] of [
  ['astro', 'Astro'],
  ['three', 'Three'],
  ['@fontsource-variable/geist', 'Geist'],
]) {
  await copyFile(
    `node_modules/${source}/LICENSE`,
    `${root}/licenses/${name}.txt`,
  );
}
const gsapSource = await readFile('node_modules/gsap/gsap-core.js', 'utf8');
const gsapNotice = gsapSource.match(/\/\*![\s\S]*?\*\//)?.[0];
assert(
  gsapNotice?.includes('@license'),
  'GSAP copyright/license notice is missing',
);
await writeFile(`${root}/licenses/GSAP.txt`, `${gsapNotice}\n`);
console.log(
  `Single-page build OK. gzip JS: initial ${(initialJS / 1024).toFixed(1)} KiB / deferred ${(delayedJS / 1024).toFixed(1)} KiB.`,
);
console.log(
  'Generated dist/_headers for compatible static hosts; other hosts must apply equivalent settings.',
);
