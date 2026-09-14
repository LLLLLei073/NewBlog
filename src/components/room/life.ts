import {
  localMinutes,
  untilNextMinute,
  lightingAt,
} from '../home/illustration/daylight';
import {
  readStudyPreferences,
  saveStudyPreference,
  PAUSE_KEY,
  LAMP_KEY,
  PREFERENCE_EVENT,
  type LampMode,
} from '../home/illustration/preferences';
import {
  activityCycle,
  cycleDuration,
  girlAt,
  COAL_POINTS,
  lerpPoint,
  distance,
  type Point,
} from './activity';
import type { createIllustratedRoom } from './illustrated-scene';

export function mountRoomLife(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-room-canvas]')!;
  const stage = root.querySelector<HTMLElement>('[data-room-stage]')!;
  const coal = root.querySelector<HTMLElement>('[data-coal-root]')!;
  const coalButton =
    coal.querySelector<HTMLButtonElement>('[data-coal-toggle]')!;
  const coalSprite = coalButton.querySelector('svg')!;
  const motion = root.querySelector<HTMLButtonElement>('[data-room-motion]')!;
  const lamp = root.querySelector<HTMLSelectElement>('[data-room-lamp]')!;
  const status = root.querySelector<HTMLElement>('[data-room-status]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController(),
    { signal } = events;
  let preferences = readStudyPreferences(),
    active = true,
    frame = 0,
    last = 0,
    timer = 0,
    minutes = localMinutes(new Date());
  let scene: Awaited<ReturnType<typeof createIllustratedRoom>> | undefined,
    loading: AbortController | undefined;
  let cycle = activityCycle('window', 26),
    elapsed = 0,
    visits = 0;
  let coalPoint: Point = { ...COAL_POINTS[1]! },
    coalFrom = { ...coalPoint },
    coalTo = { ...coalPoint },
    coalTime = 0,
    coalWait = 3,
    coalDuration = 1;
  let hover = false,
    pressed = false,
    focused = false;
  const moving = () => !preferences.paused && !reduced.matches;
  const placeCoal = () => {
    coal.style.left = `${coalPoint.x * stage.clientWidth}px`;
    coal.style.top = `${coalPoint.y * stage.clientHeight}px`;
  };
  const coalHeld = () =>
    hover ||
    pressed ||
    focused ||
    coal.dataset.open === 'true' ||
    coal.classList.contains('is-resting');
  const draw = () => {
    if (!active || document.hidden) return;
    scene?.draw(minutes, preferences.lamp, girlAt(cycle, elapsed));
    placeCoal();
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  };
  const advanceCoal = (dt: number) => {
    if (coalHeld()) return;
    if (coalWait > 0) {
      coalWait -= dt;
      coalSprite.style.transform = '';
      return;
    }
    if (coalTime === 0) {
      const choices = COAL_POINTS.filter((p) => distance(p, coalPoint) > 0.08);
      coalFrom = { ...coalPoint };
      coalTo = { ...choices[Math.floor(Math.random() * choices.length)]! };
      coalDuration = 2 + distance(coalFrom, coalTo) * 5;
    }
    coalTime += dt;
    const t = Math.min(1, coalTime / coalDuration);
    coalPoint = lerpPoint(coalFrom, coalTo, t * t * (3 - 2 * t));
    const hop = Math.abs(Math.sin(t * Math.PI * 3));
    const roll = Math.sin(t * Math.PI * 2) * 12;
    coalSprite.style.transform = `translateY(${-hop * 7}px) rotate(${roll}deg) scale(${1 + (1 - hop) * 0.1},${0.9 + hop * 0.1})`;
    if (t === 1) {
      coalTime = 0;
      coalWait = 4 + Math.random() * 7;
      coalSprite.style.transform = '';
    }
  };
  const animate = (now: number) => {
    frame = 0;
    if (!active || document.hidden || !moving() || !scene) return;
    if (!last || now - last >= 1000 / 30) {
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      elapsed += dt;
      if (elapsed >= cycleDuration(cycle)) {
        elapsed -= cycleDuration(cycle);
        visits++;
        cycle = activityCycle(
          visits % 2 ? 'shelf' : 'window',
          24 + Math.random() * 14,
        );
      }
      advanceCoal(dt);
      draw();
    }
    frame = requestAnimationFrame(animate);
  };
  const sync = () => {
    stop();
    lamp.value = preferences.lamp;
    motion.disabled = reduced.matches;
    motion.setAttribute('aria-pressed', String(!moving()));
    motion.textContent = reduced.matches
      ? '已减少动态效果'
      : preferences.paused
        ? '播放动效'
        : '暂停动效';
    coal.classList.toggle('is-paused', !moving() || document.hidden);
    draw();
    if (active && !document.hidden && moving() && scene)
      frame = requestAnimationFrame(animate);
  };
  const tick = () => {
    clearTimeout(timer);
    if (!active || document.hidden) return;
    const now = new Date();
    minutes = localMinutes(now);
    if (scene) status.textContent = lightingAt(minutes).label;
    draw();
    timer = window.setTimeout(tick, untilNextMinute(now));
  };
  const fallback = () => {
    stop();
    canvas.hidden = true;
    motion.hidden = true;
    root.dataset.roomReady = 'false';
    status.textContent = '动态画面暂不可用，可以使用下方入口和找笔记。';
  };
  const dispose = () => {
    stop();
    loading?.abort();
    scene?.dispose();
    scene = undefined;
    canvas.hidden = true;
  };
  const start = async () => {
    loading?.abort();
    const controller = new AbortController();
    loading = controller;
    try {
      const { createIllustratedRoom } = await import('./illustrated-scene');
      if (controller.signal.aborted) return;
      const next = await createIllustratedRoom(canvas, controller.signal);
      if (controller.signal.aborted) {
        next.dispose();
        return;
      }
      scene = next;
      canvas.hidden = false;
      motion.hidden = false;
      root.dataset.roomReady = 'true';
      tick();
      sync();
    } catch (error) {
      if (!controller.signal.aborted) {
        console.warn('Room uses static artwork:', error);
        fallback();
      }
    }
  };
  motion.addEventListener(
    'click',
    () => {
      preferences.paused = !preferences.paused;
      saveStudyPreference(PAUSE_KEY, String(preferences.paused));
      sync();
    },
    { signal },
  );
  lamp.addEventListener(
    'change',
    () => {
      preferences.lamp = lamp.value as LampMode;
      saveStudyPreference(LAMP_KEY, preferences.lamp);
      draw();
    },
    { signal },
  );
  const changed = () => {
    preferences = readStudyPreferences();
    sync();
  };
  window.addEventListener('storage', changed, { signal });
  window.addEventListener(PREFERENCE_EVENT, changed, { signal });
  reduced.addEventListener('change', sync, { signal });
  coalButton.addEventListener(
    'pointerenter',
    () => {
      hover = true;
    },
    { signal },
  );
  coalButton.addEventListener(
    'pointerleave',
    () => {
      hover = false;
    },
    { signal },
  );
  coalButton.addEventListener(
    'pointerdown',
    () => {
      pressed = true;
    },
    { signal },
  );
  window.addEventListener(
    'pointerup',
    () => {
      pressed = false;
    },
    { signal },
  );
  window.addEventListener(
    'pointercancel',
    () => {
      pressed = false;
    },
    { signal },
  );
  coalButton.addEventListener(
    'focus',
    () => {
      focused = true;
    },
    { signal },
  );
  coalButton.addEventListener(
    'blur',
    () => {
      focused = false;
    },
    { signal },
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      tick();
      sync();
    },
    { signal },
  );
  const resize = new ResizeObserver(draw);
  resize.observe(stage);
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      dispose();
      fallback();
    },
    { signal },
  );
  canvas.addEventListener(
    'webglcontextrestored',
    () => {
      if (active) void start();
    },
    { signal },
  );
  window.addEventListener(
    'pagehide',
    (event) => {
      active = false;
      clearTimeout(timer);
      dispose();
      resize.disconnect();
      if (!event.persisted) events.abort();
    },
    { signal },
  );
  window.addEventListener(
    'pageshow',
    (event) => {
      if (event.persisted) {
        active = true;
        preferences = readStudyPreferences();
        resize.observe(stage);
        tick();
        void start();
      }
    },
    { signal },
  );
  placeCoal();
  sync();
  tick();
  void start();
}
