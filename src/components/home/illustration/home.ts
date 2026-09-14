import { lightingAt, localMinutes, untilNextMinute } from './daylight';
import type { StudyScene } from './scene';
import {
  readStudyPreferences,
  saveStudyPreference,
  PAUSE_KEY,
  PREFERENCE_EVENT,
} from './preferences';

export function mountIllustratedHome(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-study-canvas]')!;
  const toggle = root.querySelector<HTMLButtonElement>('[data-motion-toggle]')!;
  const motionLabel = root.querySelector<HTMLElement>('[data-motion-label]')!;
  const motionIcon = root.querySelector<HTMLElement>('[data-motion-icon]')!;
  const status = root.querySelector<HTMLElement>('[data-scene-status]')!;
  const details = root.querySelector<HTMLDetailsElement>(
    '[data-home-categories]',
  )!;
  const summary = details.querySelector('summary')!;
  const time = root.querySelector<HTMLTimeElement>('[data-clock-time]')!;
  const date = root.querySelector<HTMLElement>('[data-clock-date]')!;
  const clock = root.querySelector<HTMLElement>('[data-home-clock]')!;
  const label = root.querySelector<HTMLElement>('[data-light-label]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let { paused, lamp } = readStudyPreferences();
  let scene: StudyScene | undefined;
  let loading: AbortController | undefined;
  let active = true;
  let frame = 0;
  let minuteTimer = 0;
  let elapsed = 1;
  let last = 0;
  let minutes = localMinutes(new Date());
  const moving = () => !paused && !reduced.matches;
  const draw = () => {
    if (active && !document.hidden)
      scene?.draw(minutes, elapsed, moving(), lamp);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  };
  const animate = (now: number) => {
    frame = 0;
    if (!active || document.hidden || !scene || !moving()) {
      last = 0;
      return;
    }
    if (!last || now - last >= 1000 / 30) {
      elapsed += last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      draw();
    }
    frame = requestAnimationFrame(animate);
  };
  const sync = () => {
    stop();
    const effectivePaused = !moving();
    toggle.setAttribute('aria-pressed', String(effectivePaused));
    toggle.disabled = reduced.matches;
    motionLabel.textContent = reduced.matches
      ? '已减少动态效果'
      : paused
        ? '播放动效'
        : '暂停动效';
    motionIcon.textContent = effectivePaused ? '▷' : 'Ⅱ';
    draw();
    if (active && !document.hidden && moving() && scene)
      frame = requestAnimationFrame(animate);
  };
  const tick = () => {
    clearTimeout(minuteTimer);
    if (!active || document.hidden) return;
    const now = new Date();
    minutes = localMinutes(now);
    time.dateTime = now.toISOString();
    time.textContent = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(now);
    date.textContent = new Intl.DateTimeFormat('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(now);
    label.textContent = lightingAt(minutes).label;
    clock.hidden = false;
    draw();
    minuteTimer = window.setTimeout(tick, untilNextMinute(now));
  };
  const fallback = () => {
    stop();
    canvas.hidden = true;
    toggle.hidden = true;
    root.dataset.sceneState = 'static';
    status.textContent = '动态画面暂不可用，已显示静态插画。';
  };
  const start = async () => {
    loading?.abort();
    const controller = new AbortController();
    loading = controller;
    try {
      const { createStudyScene } = await import('./scene');
      if (controller.signal.aborted) return;
      const next = await createStudyScene(canvas, controller.signal);
      if (controller.signal.aborted) {
        next.dispose();
        return;
      }
      scene = next;
      canvas.hidden = false;
      toggle.hidden = false;
      root.dataset.sceneState = 'ready';
      status.textContent = '';
      sync();
    } catch (error) {
      if (controller.signal.aborted) return;
      console.warn('Study scene uses static artwork:', error);
      fallback();
    }
  };
  const dispose = () => {
    stop();
    loading?.abort();
    scene?.dispose();
    scene = undefined;
    canvas.hidden = true;
  };
  const closeCategories = (restore: boolean) => {
    details.open = false;
    if (restore) summary.focus();
  };
  details.addEventListener('toggle', () =>
    summary.setAttribute('aria-expanded', String(details.open)),
  );
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && details.open) {
      closeCategories(true);
      event.preventDefault();
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (details.open && !details.contains(event.target as Node))
      closeCategories(false);
  });
  details.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !details.contains(event.relatedTarget as Node))
      closeCategories(false);
  });
  toggle.addEventListener('click', () => {
    if (reduced.matches) return;
    paused = !paused;
    saveStudyPreference(PAUSE_KEY, String(paused));
    sync();
  });
  reduced.addEventListener('change', sync);
  const preferencesChanged = () => {
    ({ paused, lamp } = readStudyPreferences());
    sync();
  };
  window.addEventListener('storage', preferencesChanged);
  window.addEventListener(PREFERENCE_EVENT, preferencesChanged);
  const resize = new ResizeObserver(draw);
  resize.observe(root);
  document.addEventListener('visibilitychange', () => {
    tick();
    sync();
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    dispose();
    fallback();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    if (active) void start();
  });
  window.addEventListener('pagehide', (event) => {
    active = false;
    clearTimeout(minuteTimer);
    dispose();
    resize.disconnect();
    if (!event.persisted) {
      reduced.removeEventListener('change', sync);
      window.removeEventListener('storage', preferencesChanged);
      window.removeEventListener(PREFERENCE_EVENT, preferencesChanged);
    }
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      active = true;
      ({ paused, lamp } = readStudyPreferences());
      resize.observe(root);
      tick();
      void start();
    }
  });
  tick();
  void start();
}
