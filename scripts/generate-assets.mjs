import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';

await mkdir('src/assets', { recursive: true });
await mkdir('public', { recursive: true });
for (const name of ['orbit', 'forma']) {
  await sharp(`src/assets/source/${name}.svg`)
    .webp({ quality: 86 })
    .toFile(`src/assets/${name}.webp`);
}
const core = await sharp('src/assets/core.webp')
  .resize(630, 630)
  .png()
  .toBuffer();
const background =
  Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
<rect width="1200" height="630" fill="#080b10"/>
<path d="M60 90h1080M60 550h1080" stroke="#293b3a"/>
<text x="65" y="66" fill="#9ef0d0" font-family="sans-serif" font-size="22" letter-spacing="6">AETHER</text>
<text x="60" y="255" fill="#f2f0e8" font-family="sans-serif" font-size="74">Beyond the</text>
<text x="60" y="342" fill="#f2f0e8" font-family="sans-serif" font-size="74">ordinary.</text>
<text x="65" y="500" fill="#a8b2c1" font-family="sans-serif" font-size="18" letter-spacing="3">DESIGN MEETS ENGINEERING.</text>
</svg>`);
await sharp(background)
  .composite([{ input: core, left: 570, top: 0 }])
  .png()
  .toFile('public/og.png');
const bytes = await readFile('public/og.png');
console.log(
  `Generated original artwork and OG (${Math.round(bytes.length / 1024)} KiB).`,
);
