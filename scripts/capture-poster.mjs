import { chromium } from '@playwright/test';
import sharp from 'sharp';

const url = process.env.PREVIEW_URL || 'http://127.0.0.1:4321';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.goto(url);
  await page
    .locator('[data-stage][data-state="interactive"]')
    .waitFor({ timeout: 30000 });
  await page.waitForTimeout(1600);
  await page.locator('[data-pause]').click();
  // Capture only the canvas, without baking the page's grid and annotations into the fallback.
  await page.addStyleTag({
    content:
      'html, body { background: transparent !important; } .core-stage::before, .core-grid, .core-axis, .core-coordinate, .core-annotation, .core-poster { visibility: hidden !important; }',
  });
  const image = await page
    .locator('[data-render] canvas')
    .screenshot({ omitBackground: true });
  await sharp(image)
    .resize(1000, 1000)
    .webp({ quality: 86 })
    .toFile('src/assets/core.webp');
  console.log('Captured the actual initial 3D pose to src/assets/core.webp.');
} finally {
  await browser.close();
}
