import {
  HIDDEN_KEY,
  IDLE_LINES,
  MODEL,
  MODEL_VOLUME,
  REACTION_MS,
  REACTION_PRIORITY,
  SHAKE_LINES,
  SHY_LINES,
  STAGE,
  WELCOME_LINES,
  WIDE_VIEWPORT,
} from './config.ts';
import { gateCharacter } from './gate.ts';
import { planReaction } from './model.ts';
import { focusFromPointer, pointerIsFar, restFocus } from './pointer.ts';
import { isLive2dTap, type TapStart } from './tap.ts';
import {
  asInstance,
  focusModel,
  modelOf,
  playReaction,
  setInstanceActive,
} from './bridge.ts';

const readHidden = () => {
  try {
    return localStorage.getItem(HIDDEN_KEY) === 'true';
  } catch {
    return false;
  }
};

const saveHidden = (hidden: boolean) => {
  try {
    localStorage.setItem(HIDDEN_KEY, String(hidden));
  } catch {
    /* 无存储权限时只在本次会话内生效。 */
  }
};

const canRenderWebgl = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

/** 首屏渲染让位给正文，空闲时再开始加载模型。 */
const whenIdle = (run: () => void) => {
  const requestIdle = (
    window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
    }
  ).requestIdleCallback;
  if (requestIdle) requestIdle(run, { timeout: 2500 });
  else window.setTimeout(run, 1200);
};

/**
 * 文章页的 Live2D 看板娘：门控 → 空闲加载 → 跟随光标 → 点击反应 → 隐藏偏好。
 * 返回清理函数，页面离开或测试时释放全部监听与 DOM。
 */
export function mountCharacter(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>('[data-live2d-host]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-live2d-toggle]');
  const status = root.querySelector<HTMLElement>('[data-live2d-status]');
  if (!host || !toggle || !status || !MODEL) return () => {};
  const config = MODEL;

  const events = new AbortController();
  const { signal } = events;
  const wide = matchMedia(`(min-width: ${WIDE_VIEWPORT}px)`);
  let instance: ReturnType<typeof asInstance> | undefined;
  let model: ReturnType<typeof modelOf>;
  let hidden = readHidden();
  let loading = false;
  let frame = 0;
  let down: TapStart | null = null;
  let clicks = 0;
  let previousLine: string | null = null;
  let disposed = false;

  const setStatus = (text: string) => {
    status.textContent = text;
  };
  const syncToggle = () => {
    toggle.setAttribute('aria-pressed', String(hidden));
    toggle.textContent = hidden ? '叫回看板娘' : '隐藏看板娘';
  };
  const stageSize = () => (wide.matches ? STAGE.wide : STAGE.narrow);
  const clearStage = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    down = null;
    model = undefined;
    instance = undefined;
    host.replaceChildren();
    root.dataset.live2dReady = 'false';
  };
  const gateInput = () => ({
    width: window.innerWidth,
    pointerFine: matchMedia('(pointer: fine)').matches,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData,
    ),
    stored: hidden,
    hidden: document.hidden,
    webgl: canRenderWebgl(),
  });

  const applyVisibility = () => {
    root.dataset.live2dOff = String(hidden);
    setInstanceActive(instance, !hidden);
    if (hidden) setStatus('');
  };

  const mount = async () => {
    if (loading || disposed || hidden) return;
    loading = true;
    setStatus('看板娘正在过来…');
    try {
      const { loadOml2d } = await import('oh-my-live2d');
      if (disposed || hidden) {
        loading = false;
        setStatus('');
        return;
      }
      const size = stageSize();
      const next = asInstance(
        loadOml2d({
          parentElement: host,
          dockedPosition: 'left',
          mobileDisplay: false,
          sayHello: false,
          primaryColor: '#d97757',
          transitionTime: 600,
          menus: { disable: true },
          statusBar: { disable: true },
          tips: {
            messageLine: 3,
            style: { pointerEvents: 'none' },
            idleTips: {
              message: IDLE_LINES,
              duration: 6000,
              priority: 2,
              interval: 26000,
            },
            welcomeTips: {
              message: WELCOME_LINES,
              duration: 5200,
              priority: 3,
            },
          },
          models: [
            {
              name: config.name,
              path: config.path,
              scale: config.scale,
              position: config.position,
              stageStyle: {
                ...STAGE.offset,
                width: size.width,
                height: size.height,
              },
              motionPreloadStrategy: 'IDLE',
              volume: MODEL_VOLUME,
            },
          ],
        }),
      );
      instance = next;
      // 仅调试用：带 ?live2d-debug 时把实例挂到 window，便于在浏览器里调缩放与位置。
      if (location.search.includes('live2d-debug')) {
        (window as Window & { __live2d?: unknown }).__live2d = next;
      }
      next.onLoad?.((state) => {
        if (state === 'loading') return;
        loading = false;
        if (state === 'fail') {
          clearStage();
          setStatus('看板娘没加载出来，不影响阅读。');
          return;
        }
        model = modelOf(next);
        root.dataset.live2dReady = 'true';
        setStatus('');
      });
    } catch {
      loading = false;
      clearStage();
      setStatus('看板娘没加载出来，不影响阅读。');
    }
  };

  const start = () => {
    if (disposed) return;
    const verdict = gateCharacter(gateInput());
    if (verdict.ok) {
      whenIdle(() => void mount());
      return;
    }
    if (verdict.reason === 'hidden') {
      document.addEventListener(
        'visibilitychange',
        () => {
          if (!document.hidden) start();
        },
        { signal, once: true },
      );
      return;
    }
    if (verdict.reason === 'webgl') {
      setStatus('当前浏览器不支持 WebGL，看板娘先不出现啦。');
    }
  };

  const restNow = () => {
    if (!model) return;
    const rect = host.getBoundingClientRect();
    const point = restFocus(rect);
    focusModel(model, point.x, point.y);
  };

  const react = () => {
    const reaction = planReaction(config, clicks, previousLine, {
      shake: SHAKE_LINES,
      shy: SHY_LINES,
    });
    clicks += 1;
    previousLine = reaction.line;
    playReaction(model, reaction);
    instance?.tipsMessage?.(reaction.line, REACTION_MS, REACTION_PRIORITY);
  };

  document.addEventListener(
    'pointermove',
    (event) => {
      if (
        down &&
        Math.hypot(event.clientX - down.x, event.clientY - down.y) > 9
      ) {
        down.moved = true;
      }
      if (!model || hidden || frame || event.pointerType === 'touch') return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (disposed || !model) return;
        const rect = host.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const point = pointerIsFar(rect, event.clientX, event.clientY)
          ? restFocus(rect)
          : focusFromPointer(
              rect,
              event.clientX,
              event.clientY,
              config.mirror === true,
            );
        focusModel(model, point.x, point.y);
      });
    },
    { signal, passive: true },
  );
  document.addEventListener('pointerleave', restNow, { signal });
  window.addEventListener('blur', restNow, { signal });
  window.addEventListener(
    'scroll',
    () => {
      if (down) down.moved = true;
    },
    { signal, passive: true },
  );
  host.addEventListener(
    'pointerdown',
    (event) => {
      if (!event.isPrimary || event.button !== 0) {
        down = null;
        return;
      }
      down = {
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
  host.addEventListener(
    'pointerup',
    (event) => {
      const tapped = isLive2dTap(down, {
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        scrollY: window.scrollY,
        time: performance.now(),
      });
      down = null;
      if (tapped) react();
    },
    { signal },
  );
  host.addEventListener('pointercancel', () => (down = null), { signal });
  host.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      react();
    },
    { signal },
  );
  wide.addEventListener(
    'change',
    () => instance?.setStageStyle?.({ ...STAGE.offset, ...stageSize() }),
    { signal },
  );
  toggle.addEventListener(
    'click',
    () => {
      hidden = !hidden;
      saveHidden(hidden);
      syncToggle();
      applyVisibility();
      if (!hidden && !instance) start();
    },
    { signal },
  );

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    events.abort();
    cancelAnimationFrame(frame);
    frame = 0;
    setInstanceActive(instance, false);
    host.replaceChildren();
    root.dataset.live2dReady = 'false';
  };

  window.addEventListener(
    'pagehide',
    (event) => {
      if (event.persisted) setInstanceActive(instance, false);
      else cleanup();
    },
    { signal },
  );
  window.addEventListener(
    'pageshow',
    (event) => {
      if (event.persisted) setInstanceActive(instance, !hidden);
    },
    { signal },
  );
  document.addEventListener('astro:before-swap', cleanup, { signal });

  syncToggle();
  applyVisibility();
  start();
  return cleanup;
}
