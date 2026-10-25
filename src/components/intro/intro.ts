/**
 * 「耳朵的私人档案」开屏动画:一张唱片被放进私人档案。
 *
 * 触发规则:
 * - 仅在音乐专栏首页(/music/)且本会话未播放过时执行(sessionStorage:
 *   music-column-intro-v1);深层链接、栏目内导航、返回都不触发;
 * - prefers-reduced-motion: reduce 时直接进入首页(不记录,偏好关闭后
 *   新会话可再看);
 * - ClientRouter 换页时若动画仍在进行,立即清理(hardCancel)。
 *
 * 时间线(约 2400ms,WAAPI,只动 transform/opacity/stroke):
 * 0-180 纸张淡入 → 120-720 唱片落位+沟槽绘制 → 360-960 封面放上
 * → 620-980 唱臂落下(桌面) → 820-1480 标题/档案信息 → 1420-1660 盖章
 * → 1660-1880 停留 → 1880-2400 与首页共享元素交接(FLIP,失败退化交叉淡化)。
 * 跳过(按钮/Esc/Enter/空白点击)约 150ms 淡出并清理全部计时器与监听。
 */

const STORAGE_KEY = 'music-column-intro-v1';

/** 桌面端才保留唱臂(与样式断点一致) */
const DESKTOP = '(min-width: 760px)';

export function isMusicHome(): boolean {
  return location.pathname === '/music/' || location.pathname === '/music';
}

interface Handle {
  skip(): void;
  hardCancel(): void;
}

let active: Handle | null = null;

/** 首页挂载点存在且本会话未播过才开屏;否则移除占位 DOM */
export function mountIntro(): void {
  const root = document.querySelector<HTMLElement>('[data-music-intro]');
  if (!root) return;
  if (active) return; // 快速反复导航不允许叠加实例
  let played = false;
  try {
    played = sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    /* 私有模式视为未播 */
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (played || reduced) {
    root.remove();
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* 忽略 */
  }
  active = createIntro(root);
}

/** 换页(astro:before-swap)时立即终止并清理,不播退出动画 */
export function cancelIntroForSwap(): void {
  active?.hardCancel();
}

function createIntro(root: HTMLElement): Handle {
  const IN = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const OUT = 'cubic-bezier(0.4, 0, 0.2, 1)';
  const STAMP = 'cubic-bezier(0.34, 1.3, 0.64, 1)';

  const anims: Animation[] = [];
  const cleanups: Array<() => void> = [];
  const timers: number[] = [];
  let finished = false;
  let degraded = false; // 窗口尺寸变化后放弃共享元素测量

  const $ = <T extends HTMLElement = HTMLElement>(sel: string) =>
    root.querySelector<T>(sel);
  const $$ = <T extends HTMLElement = HTMLElement>(sel: string) =>
    Array.from(root.querySelectorAll<T>(sel));

  const grain = $('[data-mi-grain]');
  const corners = $$('.mi-corner');
  const disc = $('[data-mi-disc]');
  const grooves = $$<SVGCircleElement>('[data-mi-groove]');
  const sleeve = $('[data-mi-sleeve]');
  const tonearm = $('[data-mi-tonearm]');
  const en = $('[data-mi-en]');
  const line1 = $('[data-mi-l1]');
  const line2 = $('[data-mi-l2]');
  const sub = $('[data-mi-sub]');
  const metas = $$('[data-mi-meta]');
  const rule = $('[data-mi-rule]');
  const stamp = $('[data-mi-stamp]');
  const copy = $('[data-mi-copy]');
  const skipBtn = $('[data-mi-skip]');

  const A = (
    el: Element | null,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ): Animation | undefined => {
    if (!el) return undefined;
    const a = el.animate(keyframes, { fill: 'both', ...options });
    anims.push(a);
    return a;
  };
  const wait = (ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timers.push(id);
  };

  /* ---- 滚动锁定:保留滚动条空间,保存滚动位置 ---- */
  const html = document.documentElement;
  const scrollBarW = window.innerWidth - html.clientWidth;
  const prevScrollY = window.scrollY;
  html.style.overflow = 'hidden';
  if (scrollBarW > 0) html.style.paddingRight = `${scrollBarW}px`;

  /* ---- 焦点管理(必须先取消 hidden,聚焦才生效) ---- */
  const prevFocus = document.activeElement as HTMLElement | null;
  root.hidden = false;
  skipBtn?.focus({ preventScroll: true });
  const onKey = (e: KeyboardEvent) => {
    if (finished) return;
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Tab') {
      // 覆盖层内唯一可聚焦元素:锁定焦点在跳过按钮
      e.preventDefault();
      skipBtn?.focus();
    }
  };
  document.addEventListener('keydown', onKey);
  cleanups.push(() => document.removeEventListener('keydown', onKey));

  /* ---- 跳过:按钮点击 / 点击空白区域,均立即跳过 ---- */
  const onRootClick = (e: MouseEvent) => {
    if (finished) return;
    e.preventDefault();
    finish(true);
  };
  root.addEventListener('click', onRootClick);
  cleanups.push(() => root.removeEventListener('click', onRootClick));

  /* ---- 减少动态效果:动画期间开启则立即结束 ---- */
  const rmQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const onRM = () => {
    if (rmQuery.matches) finish(true);
  };
  rmQuery.addEventListener('change', onRM);
  cleanups.push(() => rmQuery.removeEventListener('change', onRM));

  /* ---- 尺寸变化:共享元素交接退化为交叉淡化 ---- */
  const onResize = () => {
    degraded = true;
  };
  window.addEventListener('resize', onResize, { passive: true });
  cleanups.push(() => window.removeEventListener('resize', onResize));

  /* ================= 时间线 ================= */

  // 0–180 纸张出现(根节点淡入带动颗粒),四角定位线
  // (root 已在焦点管理阶段取消 hidden)
  A(root, [{ opacity: 0 }, { opacity: 1 }], {
    duration: 180,
    easing: 'linear',
  });
  corners.forEach((c) =>
    A(c, [{ opacity: 0 }, { opacity: 0.35 }], {
      duration: 180,
      easing: 'ease-out',
    }),
  );
  A(grain, [{ opacity: 0 }, { opacity: 0.5 }], {
    duration: 180,
    easing: 'linear',
  });

  // 120–720 唱片落位(轻微转动,不整圈旋转)
  A(
    disc,
    [
      { opacity: 0, transform: 'scale(0.94) rotate(-8deg)' },
      { opacity: 1, transform: 'scale(1) rotate(0deg)' },
    ],
    { delay: 120, duration: 450, easing: IN },
  );
  // 落位后极缓慢旋转(累计 ≤4°)
  A(disc, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(3deg)' }], {
    delay: 720,
    duration: 1700,
    easing: 'linear',
  });

  // 260 起:沟槽从内向外依次绘制(每圈间隔 70ms)
  grooves.forEach((g, i) => {
    const c = Number(g.dataset.c || 0);
    A(g, [{ strokeDashoffset: c }, { strokeDashoffset: 0 }], {
      delay: 260 + i * 70,
      duration: 300,
      easing: 'ease-out',
    });
  });

  // 360–960 封面放上唱片(左前方进入)
  A(
    sleeve,
    [
      {
        opacity: 0,
        transform: 'translate(-12px, 24px) rotate(-5deg) scale(0.97)',
      },
      { opacity: 1, transform: 'translate(0, 0) rotate(-2deg) scale(1)' },
    ],
    { delay: 360, duration: 600, easing: IN },
  );

  // 620–980 唱臂落下(仅桌面,样式在移动端隐藏)
  if (matchMedia(DESKTOP).matches) {
    A(
      tonearm,
      [{ transform: 'rotate(-14deg)' }, { transform: 'rotate(0deg)' }],
      { delay: 620, duration: 300, easing: 'ease-out' },
    );
  }

  // 820–1100 英文刊名
  A(
    en,
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 820, duration: 280, easing: IN },
  );

  // 900 起:主标题两行遮罩显现(错开 90ms)
  A(
    line1,
    [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }],
    { delay: 900, duration: 420, easing: IN },
  );
  A(
    line2,
    [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }],
    { delay: 990, duration: 420, easing: IN },
  );

  // 1240 起:辅助文案
  A(
    sub,
    [
      { opacity: 0, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 1240, duration: 300, easing: IN },
  );

  // 1120–1480 档案信息(6px 位移,错开 60ms)
  metas.forEach((m, i) =>
    A(
      m,
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { delay: 1120 + i * 60, duration: 200, easing: IN },
    ),
  );
  // 朱红细线从左绘制
  A(rule, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
    delay: 1260,
    duration: 260,
    easing: 'ease-out',
  });

  // 1420–1660 盖下档案印章(轻微落章回弹)
  A(
    stamp,
    [
      { opacity: 0, transform: 'rotate(-9deg) scale(1.1)' },
      { opacity: 0.9, transform: 'rotate(-6deg) scale(1)' },
    ],
    { delay: 1420, duration: 200, easing: STAMP },
  );

  /* ---- 1660–1880 短暂停留(无新动作) ---- */

  // 1880 起:与首页交接
  wait(1880, handoff);

  function handoff() {
    if (finished) return;
    const heroCover = document.querySelector<HTMLElement>('.hero-cover .cover');
    const heroPeek = document.querySelector<HTMLElement>(
      '.hero-cover .peek-disc',
    );
    const heroH1 = document.querySelector<HTMLElement>('.hero-title h1');
    let flipped = false;

    // 封面 FLIP:开屏封面移动到首页主封面位置(测不到/已降级则跳过)
    if (heroCover && sleeve && !degraded) {
      const from = sleeve.getBoundingClientRect();
      const to = heroCover.getBoundingClientRect();
      if (from.width > 0 && to.width > 0) {
        heroCover.style.opacity = '0';
        if (heroPeek) heroPeek.style.opacity = '0';
        cleanups.push(() => {
          heroCover.style.opacity = '';
          if (heroPeek) heroPeek.style.opacity = '';
        });
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        const s = to.width / from.width;
        A(
          sleeve,
          [
            { transform: 'translate(0,0) rotate(-2deg) scale(1)' },
            // 首页主封面为 -2.5deg 摆放(见 index.astro 的 --tilt-deg)
            {
              transform: `translate(${dx}px, ${dy}px) rotate(-2.5deg) scale(${s})`,
            },
          ],
          { duration: 460, easing: IN },
        );
        flipped = true;
      }
    }

    // 标题:向首页标题方向移动并淡出(首页标题由覆盖层交叉淡化显现)
    if (copy && heroH1 && !degraded) {
      const from = copy.getBoundingClientRect();
      const to = heroH1.getBoundingClientRect();
      const dy = Math.max(
        -40,
        Math.min(40, to.top + to.height / 2 - (from.top + from.height / 2)),
      );
      A(
        copy,
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: `translateY(${dy}px)` },
        ],
        { duration: 300, easing: OUT },
      );
    } else {
      A(copy, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: OUT });
    }

    // 其余装饰 160–240ms 内淡出
    const rest = [disc, tonearm, stamp, ...corners, grain];
    rest.forEach((el) =>
      A(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: OUT }),
    );

    // 纸张背景交叉淡化(封面若已 FLIP,则让其随根节点一起消失)
    A(root, [{ opacity: 1 }, { opacity: 0 }], {
      delay: flipped ? 60 : 0,
      duration: flipped ? 420 : 320,
      easing: 'linear',
    });
    wait(flipped ? 520 : 340, () => finish(false));
  }

  function finish(fast: boolean): void {
    if (finished) return;
    finished = true;
    timers.forEach((id) => window.clearTimeout(id));
    if (fast) {
      A(root, [{ opacity: 1 }, { opacity: 0 }], {
        duration: 150,
        easing: 'linear',
      });
      wait(170, finalize);
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
    // 恢复合理焦点,不遗留在已删除元素上
    if (prevFocus && prevFocus.isConnected) {
      prevFocus.focus({ preventScroll: true });
    } else {
      document.body.focus({ preventScroll: true });
    }
    active = null;
  }

  function hardCancel(): void {
    if (finished) return;
    finished = true;
    timers.forEach((id) => window.clearTimeout(id));
    anims.forEach((a) => a.cancel());
    root.remove();
    html.style.overflow = '';
    html.style.paddingRight = '';
    cleanups.forEach((c) => c());
    active = null;
  }

  return {
    skip: () => finish(true),
    hardCancel,
  };
}
