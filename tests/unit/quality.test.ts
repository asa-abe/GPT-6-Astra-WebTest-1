import { describe, expect, it } from 'vitest';
import { FrameMonitor, pixelRatio } from '../../src/experience/quality';

function run(
  monitor: FrameMonitor,
  interval: number,
  duration: number,
  start = 1,
) {
  const changes: string[] = [];
  for (let time = start; time < start + duration; time += interval) {
    const change = monitor.sample(time);
    if (change) changes.push(change);
  }
  return changes;
}
describe('quality budgets', () => {
  it('caps DPR and actual framebuffer pixels', () => {
    expect(pixelRatio(400, 400, 3, 'standard')).toBe(1.5);
    expect(pixelRatio(400, 400, 3, 'low')).toBe(1);
    const memoryCapped = pixelRatio(2000, 2000, 3, 'standard', 1_000_000);
    expect(2000 * 2000 * memoryCapped ** 2).toBeLessThanOrEqual(1_000_000);
    for (const quality of ['standard', 'low'] as const) {
      const ratio = pixelRatio(3840, 2160, 3, quality);
      expect(3840 * 2160 * ratio ** 2).toBeLessThanOrEqual(
        (quality === 'standard' ? 2_000_000 : 1_000_000) + 0.001,
      );
    }
  });
  it('preserves good rendering quality', () => {
    expect(run(new FrameMonitor(), 16.7, 25000)).toEqual([]);
  });
  it('requires warmup and three complete slow windows', () => {
    const monitor = new FrameMonitor();
    expect(run(monitor, 33.3, 6500)).toEqual([]);
    expect(run(monitor, 33.3, 1500, 6501)).toEqual(['low']);
  });
  it('steps through low before static with sustained frame delay', () => {
    expect(run(new FrameMonitor(), 50, 17000)).toEqual(['low', 'static']);
  });
  it('does not mistake intentional idle for low FPS', () => {
    const monitor = new FrameMonitor();
    for (let i = 0; i < 30; i++) {
      expect(run(monitor, 50, 1000, i * 3000 + 1)).toEqual([]);
      monitor.reset();
    }
    expect(monitor.quality).toBe('standard');
  });
  it('resets a partially observed window after visibility interruptions', () => {
    const monitor = new FrameMonitor();
    run(monitor, 50, 6000);
    expect(run(monitor, 16.7, 10000, 10000)).toEqual([]);
    expect(monitor.quality).toBe('standard');
  });
  it('does not promote after lower quality is selected', () => {
    const monitor = new FrameMonitor();
    run(monitor, 33.3, 8000);
    expect(monitor.quality).toBe('low');
    expect(run(monitor, 16.7, 15000, 8100)).toEqual([]);
    expect(monitor.quality).toBe('low');
  });
});
