import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    aetherLab: { lcp: number; cls: number };
  }
}

for (const width of [1440, 390]) {
  for (const reduced of [false, true]) {
    test(`compressed transfer and lab LCP/CLS: ${width}px / ${reduced ? 'Q0' : '3D'}`, async ({
      browser,
    }, info) => {
      test.skip(
        info.project.name !== 'chromium',
        'Fixed Chromium lab conditions, not real-user Web Vitals.',
      );
      test.setTimeout(90_000);
      const records: {
        lcp: number;
        cls: number;
        initial: number;
        delayed: number;
        total: number;
      }[] = [];
      for (let run = 0; run < 5; run++) {
        const context = await browser.newContext({
          viewport: { width, height: width === 390 ? 844 : 900 },
          deviceScaleFactor: width === 390 ? 3 : 1,
          reducedMotion: reduced ? 'reduce' : 'no-preference',
        });
        const page = await context.newPage();
        await page.addInitScript(() => {
          window.aetherLab = { lcp: 0, cls: 0 };
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              window.aetherLab.lcp = entry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (
                'hadRecentInput' in entry &&
                !entry.hadRecentInput &&
                'value' in entry &&
                typeof entry.value === 'number'
              )
                window.aetherLab.cls += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
        });
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 150,
          downloadThroughput: 10_000_000 / 8,
          uploadThroughput: 1_000_000 / 8,
        });
        await page.goto('http://127.0.0.1:4322/');
        if (!reduced)
          await expect(page.locator('[data-stage]')).toHaveAttribute(
            'data-state',
            'interactive',
          );
        await page.waitForTimeout(5000);
        const initial = await page.evaluate(() => {
          const navigation = performance.getEntriesByType(
            'navigation',
          )[0] as PerformanceNavigationTiming;
          const entries = performance.getEntriesByType(
            'resource',
          ) as PerformanceResourceTiming[];
          const delayed = entries.filter((e) =>
            /\/experience\..*\.js/.test(e.name),
          );
          return {
            ...window.aetherLab,
            initial:
              navigation.encodedBodySize +
              entries
                .filter((e) => !delayed.includes(e))
                .reduce((sum, e) => sum + e.encodedBodySize, 0),
            delayed: delayed.reduce((sum, e) => sum + e.encodedBodySize, 0),
          };
        });
        await page.evaluate(() => {
          document
            .querySelectorAll<HTMLDetailsElement>(
              'main details, footer details',
            )
            .forEach((details) => {
              details.open = true;
            });
        });
        for (const id of ['work', 'process', 'faq', 'contact', 'privacy']) {
          await page.locator(`#${id}`).scrollIntoViewIfNeeded();
        }
        await page.waitForFunction(() =>
          [...document.images].every(
            (image) => image.complete && image.naturalWidth > 0,
          ),
        );
        const total = await page.evaluate(() => {
          const navigation = performance.getEntriesByType(
            'navigation',
          )[0] as PerformanceNavigationTiming;
          return (
            navigation.encodedBodySize +
            (
              performance.getEntriesByType(
                'resource',
              ) as PerformanceResourceTiming[]
            ).reduce((sum, entry) => sum + entry.encodedBodySize, 0)
          );
        });
        expect(initial.initial).toBeGreaterThan(0);
        expect(initial.initial).toBeLessThanOrEqual(500 * 1024);
        expect(initial.delayed).toBeLessThanOrEqual(450 * 1024);
        expect(initial.delayed).toBeLessThanOrEqual(1.2 * 1024 ** 2);
        expect(total).toBeLessThanOrEqual(3 * 1024 ** 2);
        if (reduced) expect(initial.delayed).toBe(0);
        else expect(initial.delayed).toBeGreaterThan(0);
        expect(initial.cls).toBeLessThanOrEqual(0.1);
        expect(initial.lcp).toBeGreaterThan(0);
        expect(initial.lcp).toBeLessThanOrEqual(4000);
        records.push({ ...initial, total });
        await context.close();
      }
      const median = records
        .map((record) => record.lcp)
        .sort((a, b) => a - b)[2]!;
      expect(median).toBeLessThanOrEqual(2500);
      await info.attach(`lab-${width}-${reduced ? 'q0' : '3d'}`, {
        body: JSON.stringify(
          {
            conditions:
              '10Mbps down / 1Mbps up / 150ms; desktop CPU, no mobile CPU emulation',
            records,
            median,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });
    });
  }
}
