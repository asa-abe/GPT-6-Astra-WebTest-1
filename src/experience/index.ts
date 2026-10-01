import { createScene, type Pose } from './scene';
import { createMotion } from './motion';
import { FrameMonitor, type Quality } from './quality';

interface Options {
  stage: HTMLElement;
  container: HTMLElement;
  story: HTMLElement;
  onFailure: (reason: 'context' | 'render') => void;
  onQuality: (quality: Quality) => void;
}
export interface Experience {
  setActive: (active: boolean) => void;
  select: (index: number) => void;
  dispose: () => void;
}

export function createExperience(options: Options): Experience {
  const scene = createScene(options.container);
  const monitor = new FrameMonitor();
  let frame = 0;
  let active = true;
  let disposed = false;
  let lastTime = 0;
  let introStart = 0;
  const target: Pose = { progress: 0, x: 0, y: 0, emphasis: 0, intro: 1 };
  const current: Pose = { ...target, intro: 0 };
  let motion: ReturnType<typeof createMotion> | undefined;
  let observer: ResizeObserver | undefined;

  function invalidate() {
    if (!frame && active && !disposed) frame = requestAnimationFrame(draw);
  }
  function draw(now: number) {
    frame = 0;
    if (!active || disposed) return;
    try {
      const delta = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;
      if (!introStart) introStart = now;
      current.intro = Math.min(1, (now - introStart) / 900);
      const blend = 1 - Math.exp(-10 * delta);
      let difference = 1 - current.intro;
      for (const key of ['progress', 'x', 'y', 'emphasis'] as const) {
        current[key] += (target[key] - current[key]) * blend;
        difference += Math.abs(target[key] - current[key]);
      }
      scene.update(current);
      scene.render();
      const quality = monitor.sample(now);
      if (quality) {
        if (quality !== 'static') scene.setQuality(quality);
        options.onQuality(quality);
        if (quality === 'static' || disposed) return;
      }
      if (difference > 0.0005) invalidate();
      else {
        lastTime = 0;
        monitor.reset();
      }
    } catch (error) {
      console.error(
        '[AETHER] Render failed',
        error instanceof Error ? error.name : 'UnknownError',
      );
      options.onFailure('render');
    }
  }
  function onContextLost(event: Event) {
    event.preventDefault();
    options.onFailure('context');
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    active = false;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    motion?.dispose();
    scene.canvas.removeEventListener('webglcontextlost', onContextLost);
    scene.dispose();
  }
  try {
    scene.canvas.addEventListener('webglcontextlost', onContextLost);
    motion = createMotion(options.stage, options.story, target, invalidate);
    current.progress = target.progress;
    observer = new ResizeObserver(() => {
      if (disposed) return;
      try {
        scene.resize();
        if (active) invalidate();
        else scene.render();
      } catch (error) {
        console.error(
          '[AETHER] Resize failed',
          error instanceof Error ? error.name : 'UnknownError',
        );
        options.onFailure('render');
      }
    });
    observer.observe(options.container);
    scene.setQuality('standard');
    scene.update(current);
    scene.render();
    invalidate();
    return {
      setActive(value: boolean) {
        if (disposed || value === active) return;
        active = value;
        motion?.setActive(value);
        if (value) invalidate();
        else {
          cancelAnimationFrame(frame);
          frame = 0;
          lastTime = 0;
          monitor.reset();
        }
      },
      select(index) {
        motion?.select(index);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
