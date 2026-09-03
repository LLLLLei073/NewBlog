/**
 * Picking concept adapted from Animnia/pure-line-room (Apache-2.0).
 * Modified: element-relative rays, scroll-safe pointerup navigation, demand-only
 * rendering, accessible link focus, shared theme and complete lifecycle cleanup.
 * See /licenses/pure-line-room.txt. No upstream audio or continuous animation.
 */
import { Raycaster, Vector2, WebGLRenderer } from 'three';
import { createRoomScene } from './scene';
import { ROOM_ITEMS, type RoomId } from './config';
import { isRoomTap, type TapStart } from './gesture';
import { toggleSiteTheme } from '../../utils/theme';

export function mountRoom(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>('[data-room-stage]')!;
  const host = root.querySelector<HTMLElement>('[data-room-canvas]')!;
  const placeholder = root.querySelector<HTMLElement>(
    '[data-room-placeholder]',
  )!;
  const tooltip = root.querySelector<HTMLElement>('[data-room-tooltip]')!;
  const status = root.querySelector<HTMLElement>('[data-room-status]')!;
  const lamp = root.querySelector<HTMLButtonElement>('[data-room-lamp]')!;
  const events = new AbortController();
  const { signal } = events;
  let renderer: WebGLRenderer | undefined;
  let room: ReturnType<typeof createRoomScene> | undefined;
  let resize: ResizeObserver | undefined;
  let themeObserver: MutationObserver | undefined;
  let frame = 0;
  let active: RoomId | null = null;
  let down: TapStart | null = null;
  let disposed = false;

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    events.abort();
    resize?.disconnect();
    themeObserver?.disconnect();
    room?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    host.replaceChildren();
    root.dataset.roomReady = 'false';
    tooltip.hidden = true;
    placeholder.hidden = false;
    lamp.hidden = true;
    root.style.removeProperty('--coal-left');
    root.style.removeProperty('--coal-top');
    root.style.removeProperty('--coal-size');
  };
  const fail = () => {
    cleanup();
    status.textContent = '房间暂时没加载出来，下面的栏目和文章照常可用。';
  };
  try {
    renderer = new WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    room = createRoomScene();
    host.append(renderer.domElement);
    const canvas = renderer.domElement;
    const ray = new Raycaster();
    const pointer = new Vector2();
    const proxies = [...room.targets.values()].map((item) => item.proxy);

    const invalidate = () => {
      if (disposed || document.hidden || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (disposed || document.hidden) return;
        try {
          renderer!.render(room!.scene, room!.camera);
        } catch {
          fail();
        }
      });
    };
    const projectTooltip = (id: RoomId) => {
      const point = room!.targets.get(id)!.anchor.clone().project(room!.camera);
      const rect = stage.getBoundingClientRect();
      tooltip.style.left = `${Math.max(70, Math.min(rect.width - 70, ((point.x + 1) / 2) * rect.width))}px`;
      tooltip.style.top = `${Math.max(42, ((1 - point.y) / 2) * rect.height - 28)}px`;
    };
    const hover = (id: RoomId | null) => {
      if (active === id) return;
      active = id;
      room!.highlight(id);
      tooltip.hidden = id === null;
      canvas.style.cursor = id ? 'pointer' : 'default';
      if (id) {
        const item = ROOM_ITEMS.find((item) => item.id === id)!;
        tooltip.textContent = `${item.object} · ${item.label}${id === 'lamp' ? '' : ' ↗'}`;
        projectTooltip(id);
      }
      invalidate();
    };
    const pick = (event: PointerEvent): RoomId | null => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, room!.camera);
      return (
        ray.intersectObjects(proxies, false)[0]?.object.userData.roomId ?? null
      );
    };
    const syncTheme = () => {
      const dark = document.documentElement.dataset.theme === 'dark';
      room!.theme(dark);
      lamp.textContent = dark ? '台灯 · 开灯' : '台灯 · 关灯';
      lamp.setAttribute(
        'aria-label',
        dark ? '打开台灯，切换为浅色主题' : '关闭台灯，切换为深色主题',
      );
      invalidate();
    };
    const fit = () => {
      if (disposed) return;
      const { width, height } = stage.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer!.setSize(width, height, false);
      room!.fit(width, height);
      const anchor = room!.projectAssistant(width, height);
      root.style.setProperty('--coal-left', `${stage.offsetLeft + anchor.x}px`);
      root.style.setProperty('--coal-top', `${stage.offsetTop + anchor.y}px`);
      root.style.setProperty('--coal-size', `${anchor.size}px`);
      if (active) projectTooltip(active);
      invalidate();
    };
    canvas.addEventListener(
      'pointermove',
      (event) => {
        if (
          down &&
          Math.hypot(event.clientX - down.x, event.clientY - down.y) > 9
        )
          down.moved = true;
        if (event.pointerType === 'mouse' && !down) hover(pick(event));
      },
      { signal, passive: true },
    );
    canvas.addEventListener(
      'pointerleave',
      () => {
        hover(null);
        down = null;
      },
      { signal },
    );
    canvas.addEventListener(
      'pointerdown',
      (event) => {
        if (!event.isPrimary || event.button !== 0) {
          down = null;
          return;
        }
        down = {
          id: pick(event),
          pointer: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          scrollY: window.scrollY,
          time: performance.now(),
          moved: false,
        };
      },
      { signal, passive: true },
    );
    canvas.addEventListener(
      'pointercancel',
      () => {
        down = null;
        hover(null);
      },
      { signal },
    );
    window.addEventListener(
      'scroll',
      () => {
        if (down) down.moved = true;
        hover(null);
      },
      { signal, passive: true },
    );
    canvas.addEventListener(
      'pointerup',
      (event) => {
        const id = pick(event);
        const tapped = isRoomTap(down, {
          id,
          pointer: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          scrollY: window.scrollY,
          time: performance.now(),
        });
        down = null;
        if (!tapped) return;
        if (id === 'lamp') toggleSiteTheme();
        else {
          const item = ROOM_ITEMS.find((item) => item.id === id);
          if (item?.href) window.location.assign(item.href);
        }
      },
      { signal },
    );
    root
      .querySelectorAll<HTMLAnchorElement>('[data-room-link]')
      .forEach((link) => {
        link.addEventListener(
          'focus',
          () => hover(link.dataset.roomLink as RoomId),
          { signal },
        );
        link.addEventListener('blur', () => hover(null), { signal });
        link.addEventListener(
          'pointerenter',
          () => hover(link.dataset.roomLink as RoomId),
          { signal },
        );
        link.addEventListener('pointerleave', () => hover(null), { signal });
      });
    lamp.addEventListener('click', toggleSiteTheme, { signal });
    lamp.addEventListener('focus', () => hover('lamp'), { signal });
    lamp.addEventListener('blur', () => hover(null), { signal });
    themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    resize = new ResizeObserver(fit);
    resize.observe(stage);
    document.addEventListener(
      'visibilitychange',
      () => {
        down = null;
        if (document.hidden) {
          cancelAnimationFrame(frame);
          frame = 0;
        } else invalidate();
      },
      { signal },
    );
    canvas.addEventListener('webglcontextlost', fail, { signal });
    // Release GPU resources even when the browser puts the document into bfcache.
    window.addEventListener('pagehide', cleanup, { signal, once: true });
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted && disposed && root.isConnected) {
        window.removeEventListener('pageshow', restore);
        mountRoom(root);
      }
    };
    window.addEventListener('pageshow', restore);
    document.addEventListener('astro:before-swap', cleanup, {
      signal,
      once: true,
    });
    syncTheme();
    fit();
    // Verify a first frame before hiding the server-rendered fallback.
    renderer.render(room.scene, room.camera);
    placeholder.hidden = true;
    lamp.hidden = false;
    root.dataset.roomReady = 'true';
    room.loadAvatar(root.dataset.avatar || '/avatar-xulei.jpg', invalidate);
  } catch {
    fail();
  }
  return cleanup;
}
