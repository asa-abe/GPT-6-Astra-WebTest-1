import { test, expect } from '@playwright/test';

test.beforeEach(async ({}, info) => {
  test.skip(
    info.project.name !== 'chromium',
    'GPU lifecycle is exercised in Chromium; static behavior is tested across engines.',
  );
});

test('3D starts, settles, responds, pauses, deallocates and retries without duplicates', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const stage = page.locator('[data-stage]');
  const canvas = page.locator('[data-render] canvas');
  await expect(stage).toHaveAttribute('data-state', 'interactive');
  await expect(canvas).toHaveCount(1);
  expect(
    Number(await canvas.getAttribute('data-draw-calls')),
  ).toBeLessThanOrEqual(50);
  expect(
    Number(await canvas.getAttribute('data-triangles')),
  ).toBeLessThanOrEqual(80_000);
  expect(Number(await canvas.getAttribute('data-dpr'))).toBeLessThanOrEqual(
    1.5,
  );
  expect(
    Number(await canvas.getAttribute('data-gpu-estimate')),
  ).toBeLessThanOrEqual(64 * 1024 ** 2);
  await page.waitForTimeout(1800);
  const settled = await canvas.getAttribute('data-frames');
  await page.waitForTimeout(400);
  expect(await canvas.getAttribute('data-frames')).toBe(settled);
  await info.attach('interactive-hero', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.mouse.move(1100, 420);
  await expect.poll(() => canvas.getAttribute('data-frames')).not.toBe(settled);
  await page.locator('[data-pause]').click();
  await expect(stage).toHaveAttribute('data-state', 'paused');
  const paused = await canvas.getAttribute('data-frames');
  await page.mouse.move(1000, 350);
  await page.waitForTimeout(300);
  expect(await canvas.getAttribute('data-frames')).toBe(paused);
  await page.locator('[data-pause]').click();
  await page.locator('[data-static]').click();
  await expect(stage).toHaveAttribute('data-state', 'static');
  await expect(canvas).toHaveCount(0);
  await expect(page.locator('[data-retry]')).toBeFocused();
  await page.locator('[data-retry]').click();
  await expect(stage).toHaveAttribute('data-state', 'interactive');
  await expect(canvas).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('deep link does not request 3D until the hero is visited', async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(request.url());
  });
  await page.goto('/#contact');
  await expect(page.locator('#contact')).toBeInViewport();
  await page.waitForTimeout(1800);
  expect(scripts).toHaveLength(1);
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'interactive',
  );
  expect(scripts.length).toBeGreaterThan(1);
});

test('OS setting changes during delayed import cannot start animation', async ({
  page,
}) => {
  await page.route('**/_astro/*.js', async (route) => {
    if (/\/experience\./.test(route.request().url()))
      await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await page.goto('/');
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'loading',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(1300);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'static',
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'interactive',
  );
});

test('context loss gives a poster, a clear notice, and an explicit retry', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'interactive',
  );
  await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('webgl2');
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  });
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'static-error',
  );
  await expect(page.locator('[data-experience-status]')).toContainText(
    '表示できない',
  );
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.locator('[data-retry]').click();
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'interactive',
  );
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('save-data avoids importing 3D', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: true, addEventListener() {} },
    }),
  );
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(request.url());
  });

  await page.goto('/');
  await expect(page.locator('[data-experience-status]')).toContainText(
    'データ節約',
  );
  await page.waitForTimeout(1700);
  expect(scripts).toHaveLength(1);
});

test('a failed module request keeps the poster and reports the error', async ({
  page,
}) => {
  await page.route('**/_astro/experience.*.js', (route) =>
    route.abort('failed'),
  );
  await page.goto('/');
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'static-error',
  );
  await expect(page.locator('[data-poster]')).toBeVisible();
  await expect(page.locator('[data-retry]')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.unroute('**/_astro/experience.*.js');
  await page.locator('[data-retry]').click();
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'interactive',
  );
  await page.locator('.hero-actions .button').click();
  await expect(page).toHaveURL(/#contact$/);
});

test('stopping while loading does not create a hidden running canvas', async ({
  page,
}) => {
  await page.route('**/_astro/experience.*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await page.goto('/');
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'loading',
  );
  await page.locator('[data-pause]').click();
  await page.waitForTimeout(1300);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('[data-experience-status]')).toContainText(
    '停止中',
  );
  await page.locator('[data-pause]').click();
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'interactive',
  );
});

test('3D emphasis and reduced-motion changes preserve static information', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'interactive',
  );
  await page.locator('[data-part="expression"]').click();
  await expect(page.locator('[data-part="expression"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('[data-technology="expression"] h3')).toBeVisible();
  await expect(page.locator('[data-part="expression"]')).toBeHidden();
});
test('offscreen rendering stops and history restores one scene', async ({
  page,
}) => {
  await page.goto('/');
  const stage = page.locator('[data-stage]');
  const canvas = page.locator('canvas');
  await expect(stage).toHaveAttribute('data-state', 'interactive');
  await page.locator('.hero-actions .button').click();
  await expect(page.locator('#contact')).toBeInViewport();
  await page.waitForTimeout(1000);
  const frame = await canvas.getAttribute('data-frames');
  await page.waitForTimeout(400);
  expect(await canvas.getAttribute('data-frames')).toBe(frame);
  await page.goBack();
  await expect(stage).toBeInViewport();
  await expect(canvas).toHaveCount(1);
});

test('persisted page lifecycle and tab visibility suspend the single renderer', async ({
  page,
}) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('[data-stage]')).toHaveAttribute(
    'data-state',
    'interactive',
  );
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: true }),
    ),
  );
  const hiddenFrame = await canvas.getAttribute('data-frames');
  await page.waitForTimeout(250);
  expect(await canvas.getAttribute('data-frames')).toBe(hiddenFrame);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    ),
  );
  await expect
    .poll(() => canvas.getAttribute('data-frames'))
    .not.toBe(hiddenFrame);
  await expect(canvas).toHaveCount(1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const backgroundFrame = await canvas.getAttribute('data-frames');
  await page.waitForTimeout(250);
  expect(await canvas.getAttribute('data-frames')).toBe(backgroundFrame);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect
    .poll(() => canvas.getAttribute('data-frames'))
    .not.toBe(backgroundFrame);
  await expect(canvas).toHaveCount(1);
});
