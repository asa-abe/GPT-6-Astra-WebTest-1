import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Pose } from './scene';

export function createMotion(
  stage: HTMLElement,
  story: HTMLElement,
  target: Pose,
  invalidate: () => void,
) {
  gsap.registerPlugin(ScrollTrigger);
  const desktop = matchMedia('(min-width: 1000px) and (min-height: 701px)');
  const fine = matchMedia('(pointer: fine)');
  const events = new AbortController();
  let active = true;
  let bounds = stage.getBoundingClientRect();
  const progress = () => {
    if (!active) return;
    target.progress = desktop.matches ? trigger.progress : 0;
    invalidate();
  };
  const trigger = ScrollTrigger.create({
    trigger: story,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      if (!active) return;
      target.progress = desktop.matches ? self.progress : 0;
      invalidate();
    },
    onRefresh: () => {
      bounds = stage.getBoundingClientRect();
    },
  });
  function pointer(event: PointerEvent) {
    if (!active || !fine.matches || event.pointerType === 'touch') return;
    target.x = gsap.utils.clamp(
      -1,
      1,
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    );
    target.y = gsap.utils.clamp(
      -1,
      1,
      ((event.clientY - bounds.top) / bounds.height) * 2 - 1,
    );
    invalidate();
  }
  stage.addEventListener(
    'pointerenter',
    () => {
      bounds = stage.getBoundingClientRect();
    },
    { signal: events.signal },
  );
  stage.addEventListener('pointermove', pointer, { signal: events.signal });
  stage.addEventListener(
    'pointerleave',
    () => {
      target.x = 0;
      target.y = 0;
      if (active) invalidate();
    },
    { signal: events.signal },
  );
  desktop.addEventListener('change', progress, { signal: events.signal });
  target.progress = desktop.matches ? trigger.progress : 0;

  return {
    setActive(value: boolean) {
      active = value;
      if (value) {
        trigger.enable(false, false);
        trigger.refresh();
        progress();
      } else trigger.disable(false);
    },
    select(index: number) {
      if (!active) return;
      target.emphasis = index;
      invalidate();
    },
    dispose() {
      events.abort();
      trigger.kill();
    },
  };
}
