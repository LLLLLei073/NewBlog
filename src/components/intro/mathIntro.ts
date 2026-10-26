/**
 * 「形与数」开屏时间线:一张定理图版在展墙上被绘制出来。
 *
 * 触发规则由共享控制器(columnIntro.ts)承担:仅数学首页且本会话
 * 未播过(sessionStorage: math-column-intro-v1)、reduced-motion 直接
 * 进正文、可跳过、before-swap 硬清理。
 *
 * 时间线(约 2380ms,WAAPI,只动 transform/opacity/stroke):
 * 0-180 展墙淡入 → 120-800 坐标轴/圆/半径/角度弧依次绘制 →
 * 860-1280 正弦曲线扫过 → 860-1250 标题两行遮罩显现 →
 * 1120-1450 图鉴信息 → 1450-1650 盖「直觉先行」章 → 1860 起与首页
 * hero 图版共享元素交接(FLIP,失败退化交叉淡化)。
 */

import {
  mountColumnIntro,
  cancelColumnIntroForSwap,
  type TimelineContext,
} from './columnIntro';

const STORAGE_KEY = 'math-column-intro-v1';

export function isMathHome(): boolean {
  return location.pathname === '/math/' || location.pathname === '/math';
}

export function mountMathIntro(): void {
  mountColumnIntro({
    rootSelector: '[data-math-intro]',
    storageKey: STORAGE_KEY,
    isHome: isMathHome,
    timeline: { play, handoff },
  });
}

export { cancelColumnIntroForSwap as cancelMathIntroForSwap };

function play(ctx: TimelineContext): void {
  const { root, animate, wait } = ctx;
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel);

  const corners = Array.from(root.querySelectorAll('.mt-corner'));
  const plate = $('[data-mt-plate]');
  const draws = Array.from(
    root.querySelectorAll<SVGGeometryElement>('[data-mt-draw]'),
  );
  /* DOM 顺序即绘制顺序:轴、轴、圆、半径、角度弧、正弦 */
  const [axisX, axisY, circle, radius, arc, sine] = draws;
  const en = $('[data-mt-en]');
  const line1 = $('[data-mt-l1]');
  const line2 = $('[data-mt-l2]');
  const sub = $('[data-mt-sub]');
  const metas = Array.from(root.querySelectorAll('[data-mt-meta]'));
  const stamp = $('[data-mt-stamp]');

  /* stroke 绘制助手:测量真实长度后用 dashoffset 画出来 */
  const draw = (
    el: SVGGeometryElement | undefined,
    delay: number,
    duration: number,
  ) => {
    if (!el) return;
    let len = 0;
    try {
      len = el.getTotalLength();
    } catch {
      /* 无几何信息时退化为透明度 */
    }
    if (len > 0) {
      el.style.strokeDasharray = `${len}`;
      animate(el, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
        delay,
        duration,
        easing: 'ease-out',
      });
    } else {
      animate(el, [{ opacity: 0 }, { opacity: 1 }], { delay, duration });
    }
  };

  // 0-180 展墙出现
  animate(root, [{ opacity: 0 }, { opacity: 1 }], {
    duration: 180,
    easing: 'linear',
  });
  corners.forEach((c) =>
    animate(c, [{ opacity: 0 }, { opacity: 0.55 }], {
      duration: 200,
      easing: 'ease-out',
    }),
  );

  // 120-620 图版框轻落位
  animate(
    plate,
    [
      { opacity: 0, transform: 'translateY(10px) scale(0.985)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ],
    { delay: 120, duration: 460, easing: ctx.IN },
  );

  // 140-800 几何构造依次绘制
  draw(axisX, 140, 280);
  draw(axisY, 240, 280);
  draw(circle, 340, 460);
  draw(radius, 660, 220);
  draw(arc, 780, 180);
  draw(sine, 880, 420);

  // 860-1140 英文刊名 + 标题两行遮罩
  animate(
    en,
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 860, duration: 280, easing: ctx.IN },
  );
  animate(
    line1,
    [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }],
    { delay: 950, duration: 420, easing: ctx.IN },
  );
  animate(
    line2,
    [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }],
    { delay: 1040, duration: 420, easing: ctx.IN },
  );

  // 1250 辅助文案
  animate(
    sub,
    [
      { opacity: 0, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 1250, duration: 300, easing: ctx.IN },
  );

  // 1120-1450 图鉴信息错峰
  metas.forEach((m, i) =>
    animate(
      m,
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { delay: 1120 + i * 90, duration: 220, easing: ctx.IN },
    ),
  );

  // 1450-1650 盖「直觉先行」章
  animate(
    stamp,
    [
      { opacity: 0, transform: 'rotate(-10deg) scale(1.12)' },
      { opacity: 0.92, transform: 'rotate(-4deg) scale(1)' },
    ],
    { delay: 1450, duration: 200, easing: ctx.STAMP },
  );

  /* 1860 起交接 */
  wait(1860, () => ctx.handoff());
}

function handoff(ctx: TimelineContext): void {
  const { root, animate, wait } = ctx;
  const art = root.querySelector<HTMLElement>('[data-mt-art]');
  const copy = root.querySelector<HTMLElement>('[data-mt-copy]');
  const plate = root.querySelector<HTMLElement>('[data-mt-plate]');
  const corners = Array.from(root.querySelectorAll('.mt-corner'));
  const stamp = root.querySelector('[data-mt-stamp]');

  const heroArt = document.querySelector<HTMLElement>('.hero-plate .plate-art');
  const heroH1 = document.querySelector<HTMLElement>('.hero-copy h1');
  let flipped = false;

  /* 图版 FLIP:开屏图版移动到首页 hero 图版位置 */
  if (heroArt && art && !ctx.degraded()) {
    const from = art.getBoundingClientRect();
    const to = heroArt.getBoundingClientRect();
    if (from.width > 0 && to.width > 0) {
      heroArt.style.opacity = '0';
      // 交接被跳过时也要恢复首页元素(清理函数在自然结束/硬取消都会执行)
      ctx.cleanup(() => {
        heroArt.style.opacity = '';
      });
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const s = to.width / from.width;
      animate(
        art,
        [
          { transform: 'translate(0,0) scale(1)' },
          { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
        ],
        { duration: 460, easing: ctx.IN },
      );
      ctx.animate(plate, [{ opacity: 1 }, { opacity: 0 }], {
        delay: 240,
        duration: 220,
        easing: ctx.OUT,
      });
      ctx.wait(500, () => {
        heroArt.style.opacity = '';
      });
      flipped = true;
    }
  }

  /* 标题:向首页标题方向移动并淡出 */
  if (copy && heroH1 && !ctx.degraded()) {
    const from = copy.getBoundingClientRect();
    const to = heroH1.getBoundingClientRect();
    const dy = Math.max(
      -40,
      Math.min(40, to.top + to.height / 2 - (from.top + from.height / 2)),
    );
    animate(
      copy,
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: `translateY(${dy}px)` },
      ],
      { duration: 300, easing: ctx.OUT },
    );
  } else {
    animate(copy, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 200,
      easing: ctx.OUT,
    });
  }

  /* 其余装饰淡出 */
  for (const el of [...corners, stamp]) {
    animate(el, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 200,
      easing: ctx.OUT,
    });
  }

  /* 展墙交叉淡化 */
  animate(root, [{ opacity: 1 }, { opacity: 0 }], {
    delay: flipped ? 60 : 0,
    duration: flipped ? 420 : 320,
    easing: 'linear',
  });
  wait(flipped ? 520 : 340, () => ctx.finish());
}
