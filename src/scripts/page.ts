import type { Experience } from '../experience';

interface Connection extends EventTarget {
  saveData?: boolean;
}
interface NavigatorWithConnection extends Navigator {
  connection?: Connection;
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element)
    throw new Error(`AETHER: required element missing: ${selector}`);
  return element;
}

function enhancePage() {
  const events = new AbortController();
  const { signal } = events;
  const menu = document.querySelector<HTMLDetailsElement>('[data-menu]');
  const summary = menu?.querySelector('summary');
  menu?.addEventListener(
    'click',
    (event) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href^="#"]')
          : null;
      if (!link) return;
      menu.open = false;
      const target = document.getElementById(link.hash.slice(1));
      if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    },
    { signal },
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && menu?.open) {
        menu.open = false;
        summary?.focus();
      }
    },
    { signal },
  );
  document.addEventListener(
    'click',
    (event) => {
      if (
        menu?.open &&
        event.target instanceof Node &&
        !menu.contains(event.target)
      ) {
        const inside = menu.contains(document.activeElement);
        menu.open = false;
        if (inside) summary?.focus({ preventScroll: true });
      }
    },
    { signal },
  );
  const copy = document.querySelector<HTMLButtonElement>('[data-copy]');
  const copyStatus = document.querySelector<HTMLElement>('[data-copy-status]');
  if (copy && copyStatus && navigator.clipboard) {
    copy.hidden = false;
    copy.addEventListener(
      'click',
      async () => {
        try {
          await navigator.clipboard.writeText(copy.dataset.copy ?? '');
          copyStatus.textContent = copy.dataset.success ?? '';
        } catch (error) {
          console.warn(
            '[AETHER] Clipboard unavailable',
            error instanceof Error ? error.name : 'UnknownError',
          );
          copyStatus.textContent = copy.dataset.failure ?? '';
        }
      },
      { signal },
    );
  }
  function openAnchor() {
    const target = document.getElementById(location.hash.slice(1));
    if (target instanceof HTMLDetailsElement) target.open = true;
  }
  window.addEventListener('hashchange', openAnchor, { signal });
  openAnchor();

  const stage = required<HTMLElement>('[data-stage]');
  const container = required<HTMLElement>('[data-render]');
  const story = required<HTMLElement>('[data-story]');
  const poster = required<HTMLImageElement>('[data-poster]');
  const controls = required<HTMLElement>('[data-controls]');
  const status = required<HTMLElement>('[data-experience-status]');
  const pause = required<HTMLButtonElement>('[data-pause]');
  const staticButton = required<HTMLButtonElement>('[data-static]');
  const retry = required<HTMLButtonElement>('[data-retry]');
  const parts = [
    ...document.querySelectorAll<HTMLButtonElement>('[data-part]'),
  ];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = (navigator as NavigatorWithConnection).connection;
  const buildDisabled = stage.dataset.disabled === 'true';
  const initialAnchor = document.getElementById(location.hash.slice(1));
  let waitingForAnchor =
    !!initialAnchor &&
    !story.contains(initialAnchor) &&
    initialAnchor.id !== 'main';
  let ready = false;
  let loading = false;
  let paused = false;
  let manualStatic = false;
  let failed = false;
  let moduleFailed = false;
  let budgetStatic = false;
  let pageHidden = false;
  let disposed = false;
  let generation = 0;
  let scheduled: number | undefined;
  let scheduledIdle = false;
  let experience: Experience | undefined;
  status.tabIndex = -1;

  function inView() {
    const box = stage.getBoundingClientRect();
    return box.width > 0 && box.bottom > 90 && box.top < innerHeight;
  }
  function blocked() {
    return (
      buildDisabled ||
      reduced.matches ||
      !!connection?.saveData ||
      manualStatic ||
      failed ||
      budgetStatic
    );
  }
  function canRun() {
    return (
      ready &&
      !disposed &&
      !pageHidden &&
      !document.hidden &&
      !waitingForAnchor &&
      !paused &&
      !blocked() &&
      inView()
    );
  }
  function cancelScheduled() {
    if (scheduled !== undefined) {
      if (scheduledIdle) cancelIdleCallback(scheduled);
      else clearTimeout(scheduled);
      scheduled = undefined;
    }
  }
  function release() {
    generation++;
    cancelScheduled();
    experience?.dispose();
    experience = undefined;
    parts.forEach((part) => {
      part.setAttribute('aria-pressed', 'false');
      part
        .closest<HTMLElement>('[data-technology]')
        ?.removeAttribute('data-selected');
    });
  }
  function updateControls() {
    const focus = document.activeElement;
    const wasControl =
      focus instanceof HTMLElement &&
      (controls.contains(focus) || parts.some((part) => part === focus));
    const restricted =
      reduced.matches || !!connection?.saveData || buildDisabled;
    pause.hidden =
      restricted ||
      manualStatic ||
      failed ||
      budgetStatic ||
      (!experience && !loading && !paused);
    staticButton.hidden =
      restricted ||
      manualStatic ||
      failed ||
      budgetStatic ||
      (!experience && !loading && !paused);
    retry.hidden = restricted || !(manualStatic || failed || budgetStatic);
    retry.textContent = moduleFailed
      ? (retry.dataset.reloadLabel ?? '')
      : (retry.dataset.retryLabel ?? '');
    pause.textContent = paused
      ? (pause.dataset.resumeLabel ?? '')
      : (pause.dataset.pauseLabel ?? '');
    pause.setAttribute('aria-pressed', String(paused));
    controls.hidden = pause.hidden && staticButton.hidden && retry.hidden;
    parts.forEach((part) => {
      part.hidden = !experience || paused || blocked();
    });
    if (wasControl && focus.closest('[hidden]')) {
      const next = [pause, retry, staticButton].find(
        (button) => !button.hidden,
      );
      (next ?? status).focus({ preventScroll: true });
    }
  }
  function report(message: string, state: string) {
    stage.dataset.state = state;
    if (status.textContent !== message) status.textContent = message;
    updateControls();
  }
  function reconcile() {
    if (disposed) return;
    // Initial hash navigation may still be scrolling when the load event fires.
    if (waitingForAnchor && !inView()) waitingForAnchor = false;
    if (blocked()) {
      if (experience) release();
      cancelScheduled();
      const key = reduced.matches
        ? 'reduced'
        : connection?.saveData
          ? 'dataSaving'
          : failed
            ? 'error'
            : budgetStatic
              ? 'budget'
              : 'staticMessage';
      report(stage.dataset[key] ?? '', failed ? 'static-error' : 'static');
      return;
    }
    experience?.setActive(canRun());
    if (experience)
      report(
        stage.dataset[paused ? 'paused' : 'interactive'] ?? '',
        paused ? 'paused' : 'interactive',
      );
    else if (paused) report(stage.dataset.paused ?? '', 'poster');
    else if (loading) report(stage.dataset.loading ?? '', 'loading');
    else if (ready) report(stage.dataset.staticMessage ?? '', 'poster');
    if (!canRun()) {
      cancelScheduled();
      return;
    }
    if (!experience && !loading && scheduled === undefined) {
      scheduledIdle = 'requestIdleCallback' in window;
      scheduled = scheduledIdle
        ? requestIdleCallback(
            () => {
              scheduled = undefined;
              void load();
            },
            { timeout: 1500 },
          )
        : window.setTimeout(() => {
            scheduled = undefined;
            void load();
          }, 120);
    }
  }
  function fail(reason: string) {
    console.warn(`[AETHER] Static fallback: ${reason}`);
    failed = true;
    release();
    reconcile();
  }
  async function load() {
    if (!canRun() || loading || experience) return;
    const token = generation;
    let imported = false;
    loading = true;
    reconcile();
    try {
      const { createExperience } = await import('../experience/index');
      imported = true;
      if (token !== generation || !canRun()) return;
      experience = createExperience({
        stage,
        container,
        story,
        onFailure: (reason) => fail(reason),
        onQuality(quality) {
          if (quality === 'static') {
            console.warn('[AETHER] Static fallback: sustained frame delay');
            budgetStatic = true;
            release();
            reconcile();
          } else stage.dataset.quality = quality;
        },
      });
    } catch (error) {
      if (token === generation && !disposed) {
        moduleFailed = !imported;
        console.error(
          '[AETHER] Initialization failed',
          error instanceof Error ? error.name : 'UnknownError',
        );
        fail('initialization');
      }
    } finally {
      loading = false;
      reconcile();
    }
  }
  pause.addEventListener(
    'click',
    () => {
      paused = !paused;
      reconcile();
    },
    { signal },
  );
  staticButton.addEventListener(
    'click',
    () => {
      manualStatic = true;
      release();
      reconcile();
    },
    { signal },
  );
  retry.addEventListener(
    'click',
    () => {
      if (reduced.matches || connection?.saveData || buildDisabled) return;
      // Browsers cache rejected module imports; a user-requested reload resets that cache.
      if (moduleFailed) {
        location.reload();
        return;
      }
      manualStatic = failed = budgetStatic = paused = false;
      reconcile();
    },
    { signal },
  );
  parts.forEach((part, index) =>
    part.addEventListener(
      'click',
      () => {
        if (!experience || paused || blocked()) return;
        const selected = part.getAttribute('aria-pressed') !== 'true';
        parts.forEach((button) => {
          const value = selected && button === part;
          button.setAttribute('aria-pressed', String(value));
          const card = button.closest<HTMLElement>('[data-technology]');
          if (card) card.dataset.selected = String(value);
        });
        experience.select(selected ? index + 1 : 0);
      },
      { signal },
    ),
  );
  const observer = new IntersectionObserver(reconcile, {
    threshold: [0, 0.05, 0.2],
  });
  observer.observe(stage);
  reduced.addEventListener('change', reconcile, { signal });
  connection?.addEventListener('change', reconcile, { signal });
  document.addEventListener('visibilitychange', reconcile, { signal });
  window.addEventListener('resize', reconcile, { signal });
  window.addEventListener('hashchange', reconcile, { signal });
  window.addEventListener(
    'pagehide',
    (event) => {
      pageHidden = true;
      cancelScheduled();
      experience?.setActive(false);
      if (!event.persisted) {
        disposed = true;
        release();
        observer.disconnect();
        events.abort();
      }
    },
    { signal },
  );
  window.addEventListener(
    'pageshow',
    () => {
      pageHidden = false;
      reconcile();
    },
    { signal },
  );
  async function prepare() {
    try {
      await poster.decode();
    } catch (error) {
      console.warn(
        '[AETHER] Poster decode failed',
        error instanceof Error ? error.name : 'UnknownError',
      );
    }
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        ready = true;
        reconcile();
      }),
    );
  }
  if (document.readyState === 'complete') void prepare();
  else
    window.addEventListener('load', () => void prepare(), {
      once: true,
      signal,
    });
  reconcile();
}

enhancePage();
