import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

test('public builds require configuration; approved content exposes real mail controls', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const env = {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: '1',
    SITE_MODE: 'production',
    SITE_URL: '',
    CONTACT_EMAIL: '',
    OPERATOR_NAME: '',
    CONTENT_APPROVED: 'false',
  };
  const invalid = spawnSync(
    'pnpm',
    ['exec', 'astro', 'build', '--outDir', 'test-results/publication-invalid'],
    { env, encoding: 'utf8' },
  );
  expect(invalid.status).not.toBe(0);
  expect(invalid.stdout + invalid.stderr).toContain('CONTACT_EMAIL');
  const valid = spawnSync(
    'pnpm',
    ['exec', 'astro', 'build', '--outDir', 'test-results/publication-approved'],
    {
      env: {
        ...env,
        SITE_URL: 'https://aether.studio/',
        CONTACT_EMAIL: 'studio@aether.studio',
        OPERATOR_NAME: 'テスト用運営者',
        CONTENT_APPROVED: 'true',
      },
      encoding: 'utf8',
    },
  );
  expect(valid.status, valid.stdout + valid.stderr).toBe(0);
  const html = await readFile(
    'test-results/publication-approved/index.html',
    'utf8',
  );
  expect(html).toContain('https://aether.studio/og.png');
  expect(
    await readFile('test-results/publication-approved/robots.txt', 'utf8'),
  ).toContain('Allow: /');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('http://127.0.0.1:4322/', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: html }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          document.documentElement.dataset.copiedAddress = value;
        },
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://aether.studio/',
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'index, follow',
  );
  const structuredData = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(JSON.parse(structuredData || 'null')).toMatchObject({
    '@type': 'WebSite',
    url: 'https://aether.studio/',
  });
  await expect(page.locator('.contact-preview')).toHaveCount(0);
  const link = page.locator('#contact .button');
  expect(await link.getAttribute('href')).toBe(
    `mailto:studio@aether.studio?subject=${encodeURIComponent('AETHERへのプロジェクト相談')}`,
  );
  await page.locator('[data-copy]').click();
  await expect(page.locator('[data-copy-status]')).toContainText(
    'コピーしました',
  );
  expect(await page.locator('html').getAttribute('data-copied-address')).toBe(
    'studio@aether.studio',
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException('Blocked', 'NotAllowedError');
        },
      },
    }),
  );
  await page.locator('[data-copy]').click();
  await expect(page.locator('[data-copy-status]')).toContainText(
    'コピーできませんでした',
  );
  await expect(page.locator('.email-address')).toBeVisible();
});
