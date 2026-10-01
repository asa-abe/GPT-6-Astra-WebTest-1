import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({ reducedMotion: 'reduce' });

test('complete static content, navigation, native disclosures and honest preview', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/AETHER/);
  await expect(page.locator('h1')).toHaveCount(1);
  for (const id of [
    'hero',
    'technology',
    'work',
    'process',
    'faq',
    'contact',
    'privacy',
  ])
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  await page.locator('.hero-actions .button').click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator('.contact-preview')).toBeVisible();
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await page.locator('#faq details').first().locator('summary').click();
  await expect(page.locator('#faq details').first()).toHaveAttribute(
    'open',
    '',
  );
  await page.locator('.work-details').first().locator('summary').click();
  await expect(page.locator('.work-details').first().locator('dd')).toHaveCount(
    4,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  );
  expect(errors).toEqual([]);
});

test('reduced motion never requests the delayed 3D module', async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'static',
  );
  await expect(page.locator('[data-experience-status]')).toContainText(
    '動きを抑える設定',
  );
  await page.waitForTimeout(1700);
  expect(scripts).toHaveLength(1);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('[data-poster]')).toBeVisible();
  await expect(page.locator('[data-controls]')).toBeHidden();
});

test('responsive layouts and expanded content stay inside the viewport', async ({
  page,
}, info) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => {
      document
        .querySelectorAll<HTMLDetailsElement>('main details, footer details')
        .forEach((details) => {
          details.open = true;
        });
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await expect(page.locator('h1')).toBeVisible();
  }
  await page.evaluate(() => {
    document
      .querySelectorAll<HTMLDetailsElement>('details')
      .forEach((details) => {
        details.open = false;
      });
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await documentFonts(page);
  await info.attach('desktop-preview', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});

test('WCAG automated checks on the page and expanded disclosures', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    document
      .querySelectorAll<HTMLDetailsElement>('main details, footer details')
      .forEach((details) => {
        details.open = true;
      });
  });
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(report.violations).toEqual([]);
});

test('keyboard skip and mobile menu preserve focus', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.keyboard.press(info.project.name === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const summary = page.locator('[data-menu] summary');
  await summary.click();
  await expect(page.locator('[data-menu]')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(summary).toBeFocused();
  await summary.click();
  await page.locator('[data-menu] a[href="#work"]').click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator('[data-menu]')).not.toHaveAttribute('open');
  await expect(page.locator('#work')).toBeFocused();
});

test('anchors and FAQ work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/');
  await page.locator('[data-menu] summary').click();
  await page.locator('[data-menu] a[href="#work"]').click();
  await expect(page).toHaveURL(/#work$/);
  await page.locator('[data-menu] summary').click();
  await page.locator('#faq summary').first().click();
  await expect(page.locator('#faq details').first()).toHaveAttribute(
    'open',
    '',
  );
  await expect(page.locator('[data-poster]')).toBeVisible();
  await expect(page.locator('[data-controls]')).toBeHidden();
  await context.close();
});

test('unknown paths are 404 and assets are served', async ({ request }) => {
  expect((await request.get('/not-a-real-page')).status()).toBe(404);
  expect((await request.get('/favicon.svg')).status()).toBe(200);
  expect(await (await request.get('/robots.txt')).text()).toContain(
    'Disallow: /',
  );
});

test('live 3D works in each supported browser engine', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.locator('[data-stage]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'interactive',
    { timeout: 20000 },
  );
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.locator('[data-pause]').click();
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'paused',
  );
});

async function documentFonts(page: import('@playwright/test').Page) {
  await page.evaluate(() => document.fonts.ready);
}
