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
  roomCycle,
  roomDuration,
  roomPose,
  COAL_ROAM,
  distance3d,
  type Ground,
} from './motion3d';
import type { createRoom3d } from './scene3d';

export function mountRoomLife(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-room-canvas]')!;
  const stage = root.querySelector<HTMLElement>('[data-room-stage]')!;
  const coal = root.querySelector<HTMLElement>('[data-coal-root]')!;
  const coalButton =
    coal.querySelector<HTMLButtonElement>('[data-coal-toggle]')!;

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
  let scene: Awaited<ReturnType<typeof createRoom3d>> | undefined,
    loading: AbortController | undefined;
  let cycle = roomCycle('window', 26),
    elapsed = 0,
    visits = 0;
  let coalPoint: Ground = { ...COAL_ROAM[1]! },
    coalFrom = { ...coalPoint },
    coalTo = { ...coalPoint },
    coalTime = 0,
    coalWait = 3,
    coalDuration = 1;
  let hover = false,
    pressed = false,
    focused = false;
  const moving = () => !preferences.paused && !reduced.matches;
  let projectedCoal = { x: 0.32, y: 0.87 },
    coalMotion = 0;
  const placeCoal = () => {
    coal.style.left = String(projectedCoal.x * stage.clientWidth) + 'px';
    coal.style.top =
      String(projectedCoal.y * stage.clientHeight + stage.offsetTop) + 'px';
  };
  const coalHeld = () =>
    hover ||
    pressed ||
    focused ||
    coal.dataset.open === 'true' ||
    coal.classList.contains('is-resting');
  const draw = () => {
    if (!active || document.hidden) return;
    const projection = scene?.draw(
      minutes,
      preferences.lamp,
      roomPose(cycle, elapsed),
      coalPoint,
      coalMotion,
      coal.classList.contains('is-resting'),
    );
    if (projection) {
      projectedCoal = projection.coal;
      root
        .querySelectorAll<HTMLElement>('[data-room-hotspot]')
        .forEach((link) => {
          const p = projection.hotspots[link.dataset.roomHotspot!];
          if (p) {
            link.style.setProperty('--x', String(p.x * 100) + '%');
            link.style.setProperty('--y', String(p.y * 100) + '%');
          }
        });
    }
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

      return;
    }
    if (coalTime === 0) {
      const choices = COAL_ROAM.filter((p) => distance3d(p, coalPoint) > 0.2);
      coalFrom = { ...coalPoint };
      coalTo = { ...choices[Math.floor(Math.random() * choices.length)]! };
      coalDuration = 2 + distance3d(coalFrom, coalTo) * 3;
    }
    coalTime += dt;
    const t = Math.min(1, coalTime / coalDuration);
    const eased = t * t * (3 - 2 * t);
    coalPoint = {
      x: coalFrom.x + (coalTo.x - coalFrom.x) * eased,
      z: coalFrom.z + (coalTo.z - coalFrom.z) * eased,
    };
    coalMotion += dt;
    if (t === 1) {
      coalTime = 0;
      coalWait = 4 + Math.random() * 7;
    }
  };
  const animate = (now: number) => {
    frame = 0;
    if (!active || document.hidden || !moving() || !scene) return;
    if (!last || now - last >= 1000 / 30) {
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      elapsed += dt;
      if (elapsed >= roomDuration(cycle)) {
        elapsed -= roomDuration(cycle);
        visits++;
        cycle = roomCycle(
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
    root.querySelector<HTMLElement>('[data-room-placeholder]')!.textContent =
      '书房画面暂不可用，请使用下方入口。';
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
      const { createRoom3d } = await import('./scene3d');
      if (controller.signal.aborted) return;
      const next = await createRoom3d(canvas, controller.signal);
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
  let wasResting = coal.classList.contains('is-resting');
  const coalState = new MutationObserver(() => {
    const resting = coal.classList.contains('is-resting');
    if (resting !== wasResting) {
      wasResting = resting;
      draw();
    }
  });
  coalState.observe(coal, {
    attributes: true,
    attributeFilter: ['class', 'data-open'],
  });
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
      coalState.disconnect();
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
        coalState.observe(coal, {
          attributes: true,
          attributeFilter: ['class', 'data-open'],
        });
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
