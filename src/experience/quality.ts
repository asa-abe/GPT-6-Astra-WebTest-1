export type Quality = 'standard' | 'low' | 'static';

export function pixelRatio(
  width: number,
  height: number,
  deviceRatio: number,
  quality: Quality,
  memoryPixelLimit = Infinity,
): number {
  const cap = quality === 'standard' ? 1.5 : 1;
  const pixels = quality === 'standard' ? 2_000_000 : 1_000_000;
  return Math.min(
    Math.max(deviceRatio, 0.1),
    cap,
    Math.sqrt(Math.min(pixels, memoryPixelLimit) / Math.max(1, width * height)),
  );
}

export class FrameMonitor {
  quality: Quality = 'standard';
  private started = 0;
  private previous = 0;
  private windowStart = 0;
  private slowWindows = 0;
  private samples: number[] = [];

  reset() {
    this.started = 0;
    this.previous = 0;
    this.windowStart = 0;
    this.slowWindows = 0;
    this.samples = [];
  }

  sample(now: number): Quality | null {
    if (this.quality === 'static') return null;
    if (!this.started || now - this.previous > 250) {
      this.reset();
      this.started = now;
      this.previous = now;
      return null;
    }
    const interval = now - this.previous;
    this.previous = now;
    if (now - this.started < 1000) return null;
    if (!this.windowStart) this.windowStart = now;
    this.samples.push(interval);
    if (now - this.windowStart < 2000) return null;
    this.samples.sort((a, b) => a - b);
    const p95 = this.samples[Math.ceil(this.samples.length * 0.95) - 1] ?? 0;
    const threshold = this.quality === 'standard' ? 25 : 40;
    this.slowWindows = p95 > threshold ? this.slowWindows + 1 : 0;
    this.samples = [];
    this.windowStart = now;
    if (this.slowWindows < 3) return null;
    this.quality = this.quality === 'standard' ? 'low' : 'static';
    this.reset();
    return this.quality;
  }
}
