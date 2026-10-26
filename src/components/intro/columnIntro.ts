/**
 * 专栏开屏共享控制器(算法/数学/游戏/其他四个新开屏共用)。
 *
 * 只共享「行为」,不共享视觉:会话门控(sessionStorage 每会话一次)、
 * 滚动锁(保留滚动条空间)、焦点管理、跳过(按钮/Esc/Enter/空白点击)、
 * reduced-motion 直接移除、窗口缩放后放弃共享元素测量、
 * astro:before-swap 硬清理、动画/定时器全量回收。
 * 每个专栏提供自己的 play 时间线与 handoff 交接(WAAPI,只动
 * transform/opacity/stroke;无音频;总时长 ≤2.5s)。
 *
 * 音乐专栏的 intro.ts 是首例完整实现,保持独立、不迁移到此。
 */

export interface TimelineContext {
  root: HTMLElement;
  /** WAAPI 动画登记(fill:both,控制器统一 cancel 回收) */
  animate: (
    el: Element | null,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ) => Animation | undefined;
  /** 定时器登记(控制器统一 clearTimeout 回收) */
  wait: (ms: number, fn: () => void) => void;
  /** 窗口尺寸已变化:共享元素测量(FLIP)应降级为交叉淡化 */
  degraded: () => boolean;
  /** 登记清理函数:自然收尾与换页硬取消都会执行(如恢复首页元素样式) */
  cleanup(fn: () => void): void;
  /** 触发本专栏的交接阶段(时间线末尾用 ctx.wait(...) 调度调用) */
  handoff: () => void;
  /** 交接淡出完成后收尾(handoff 的最后一步) */
  finish: () => void;
  /* 三条常用缓动,与音乐开屏保持一致的手感 */
  IN: string;
  OUT: string;
  STAMP: string;
}

export interface ColumnIntroTimeline {
  /** 覆盖层已可见、滚动已锁定后调用:编排本专栏的时间线 */
  play(ctx: TimelineContext): void;
  /** 时间线末尾的交接(FLIP/交叉淡化);完成后必须调用 ctx.finish() */
  handoff(ctx: TimelineContext): void;
}

export interface ColumnIntroOptions {
  rootSelector: string;
  storageKey: string;
  /** 仅专栏首页触发;深层链接、栏目内导航、返回都不触发 */
  isHome(): boolean;
  timeline: ColumnIntroTimeline;
}

interface Handle {
  hardCancel(): void;
}

let active: Handle | null = null;

/** ClientRouter 换页时立即终止并清理,不播退出动画 */
export function cancelColumnIntroForSwap(): void {
  active?.hardCancel();
}

export function isColumnIntroActive(): boolean {
  return active !== null;
}

/** 首页挂载点存在且本会话未播过才开屏;否则移除占位 DOM */
export function mountColumnIntro(options: ColumnIntroOptions): void {
  if (!options.isHome()) return; // 仅专栏首页;深层链接与栏目内导航不触发
  const root = document.querySelector<HTMLElement>(options.rootSelector);
  if (!root) return;
  if (active) return; // 快速反复导航不允许叠加实例
  let played = false;
  try {
    played = sessionStorage.getItem(options.storageKey) === '1';
  } catch {
    /* 私有模式视为未播 */
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (played || reduced) {
    root.remove();
    return;
  }
  try {
    sessionStorage.setItem(options.storageKey, '1');
  } catch {
    /* 忽略 */
  }
  /* 暗色模式下 main 是 z-index:1 的堆叠上下文(压星空用),覆盖层留在
     main 内会压不过 z-40 的 Header;搬到 body 直下以脱离该上下文。 */
  document.body.appendChild(root);
  active = createController(root, options);
}

function createController(
  root: HTMLElement,
  options: ColumnIntroOptions,
): Handle {
  const { timeline } = options;

  const anims: Animation[] = [];
  const cleanups: Array<() => void> = [];
  const timers: number[] = [];
  let finished = false;
  let isDegraded = false; // 窗口尺寸变化后放弃共享元素测量

  const animate: TimelineContext['animate'] = (el, keyframes, opts) => {
    if (!el) return undefined;
    const a = el.animate(keyframes, { fill: 'both', ...opts });
    anims.push(a);
    return a;
  };
  const wait: TimelineContext['wait'] = (ms, fn) => {
    const id = window.setTimeout(fn, ms);
    timers.push(id);
  };

  /* ---- 滚动锁定:保留滚动条空间,保存滚动位置 ---- */
  const html = document.documentElement;
  const scrollBarW = window.innerWidth - html.clientWidth;
  const prevScrollY = window.scrollY;
  html.style.overflow = 'hidden';
  if (scrollBarW > 0) html.style.paddingRight = `${scrollBarW}px`;

  /* ---- 焦点管理(必须先取消 hidden,聚焦才生效) ----
     覆盖层内约定唯一可聚焦元素:[data-intro-skip] */
  const skipBtn = root.querySelector<HTMLElement>('[data-intro-skip]');
  const prevFocus = document.activeElement as HTMLElement | null;
  root.hidden = false;
  skipBtn?.focus({ preventScroll: true });
  const onKey = (e: KeyboardEvent) => {
    if (finished) return;
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      skipBtn?.focus();
    }
  };
  document.addEventListener('keydown', onKey);
  cleanups.push(() => document.removeEventListener('keydown', onKey));

  /* ---- 跳过:按钮点击 / 点击空白区域 ---- */
  const onRootClick = (e: MouseEvent) => {
    if (finished) return;
    if (e.target === skipBtn || skipBtn?.contains(e.target as Node)) return;
    e.preventDefault();
    finish(true);
  };
  root.addEventListener('click', onRootClick);
  cleanups.push(() => root.removeEventListener('click', onRootClick));
  skipBtn?.addEventListener('click', onSkipClick);
  function onSkipClick(e: MouseEvent) {
    if (finished) return;
    e.preventDefault();
    e.stopPropagation();
    finish(true);
  }
  cleanups.push(() => skipBtn?.removeEventListener('click', onSkipClick));

  /* ---- 减少动态效果:动画期间开启则立即结束 ---- */
  const rmQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const onRM = () => {
    if (rmQuery.matches) finish(true);
  };
  rmQuery.addEventListener('change', onRM);
  cleanups.push(() => rmQuery.removeEventListener('change', onRM));

  /* ---- 尺寸变化:共享元素交接退化为交叉淡化 ---- */
  const onResize = () => {
    isDegraded = true;
  };
  window.addEventListener('resize', onResize, { passive: true });
  cleanups.push(() => window.removeEventListener('resize', onResize));

  const ctx: TimelineContext = {
    root,
    animate,
    wait,
    degraded: () => isDegraded,
    cleanup: (fn) => cleanups.push(fn),
    handoff: () => handoff(),
    finish: () => finish(false),
    IN: 'cubic-bezier(0.22, 1, 0.36, 1)',
    OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    STAMP: 'cubic-bezier(0.34, 1.3, 0.64, 1)',
  };

  let handoffStarted = false;
  const handoff = () => {
    if (finished || handoffStarted) return;
    handoffStarted = true;
    timeline.handoff(ctx);
  };
  timeline.play(ctx);

  function finish(fast: boolean): void {
    if (finished) return;
    finished = true;
    timers.forEach((id) => window.clearTimeout(id));
    timers.length = 0;
    if (fast) {
      animate(root, [{ opacity: 1 }, { opacity: 0 }], {
        duration: 150,
        easing: 'linear',
      });
      // 延迟收尾也登记进 timers:若这 170ms 内发生换页,
      // hardCancel 会清掉它并立即接管清理,避免旧定时器跑到新页面。
      timers.push(window.setTimeout(finalize, 170));
    } else {
      finalize();
    }
  }

  function finalize(): void {
    anims.forEach((a) => a.cancel());
    root.remove();
    html.style.overflow = '';
    html.style.paddingRight = '';
    window.scrollTo({
      top: prevScrollY,
      behavior: 'instant' as ScrollBehavior,
    });
    cleanups.forEach((c) => c());
    timers.forEach((id) => window.clearTimeout(id));
    if (prevFocus && prevFocus.isConnected) {
      prevFocus.focus({ preventScroll: true });
    } else {
      document.body.focus({ preventScroll: true });
    }
    active = null;
  }

  function hardCancel(): void {
    // 幂等:跳过后 170ms 收尾窗口内换页时,finished 已为 true 但
    // 延迟 finalize 尚未执行,这里必须立即接管全部清理(含 active),
    // 否则残留的滚动锁/监听器会带进新页面,并阻塞下一个专栏开屏。
    finished = true;
    timers.forEach((id) => window.clearTimeout(id));
    timers.length = 0;
    anims.forEach((a) => a.cancel());
    root.remove();
    html.style.overflow = '';
    html.style.paddingRight = '';
    cleanups.forEach((c) => c());
    active = null;
  }

  return {
    hardCancel,
  };
}
