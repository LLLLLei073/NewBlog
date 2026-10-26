/**
 * 「演算手稿」开屏时间线:坐标纸上,一张图逐渐生长出来。
 *
 * 触发规则由共享控制器(columnIntro.ts)承担:仅算法首页且本会话
 * 未播过(sessionStorage: algorithm-column-intro-v1)、reduced-motion
 * 直接进正文、可跳过、before-swap 硬清理。
 *
 * 时间线(约 2380ms,WAAPI,只动 transform/opacity/stroke):
 * 0-180 坐标纸淡入 → 180-780 五个节点依次落位 → 300-1300 边依次绘制 →
 * 880-1250 标题两行遮罩 + 副标 → 1120-1450 档案信息 → 1450-1650 盖
 * 「演算中」章 → 1860 起与首页 hero 图区共享元素交接(FLIP)。
 */

import {
  mountColumnIntro,
  cancelColumnIntroForSwap,
  type TimelineContext,
} from './columnIntro';

const STORAGE_KEY = 'algorithm-column-intro-v1';

export function isAlgorithmHome(): boolean {
  return (
    location.pathname === '/algorithm/' || location.pathname === '/algorithm'
  );
}

export function mountAlgorithmIntro(): void {
  mountColumnIntro({
    rootSelector: '[data-algorithm-intro]',
    storageKey: STORAGE_KEY,
    isHome: isAlgorithmHome,
    timeline: { play, handoff },
  });
}

export { cancelColumnIntroForSwap as cancelAlgorithmIntroForSwap };

function play(ctx: TimelineContext): void {
  const { root, animate, wait } = ctx;
  const paper = root.querySelector<HTMLElement>('[data-ai-paper]');
  const nodes = Array.from(root.querySelectorAll('[data-ai-node]'));
  const edges = Array.from(
    root.querySelectorAll<SVGGeometryElement>('[data-ai-edge]'),
  );
  const en = root.querySelector('[data-ai-en]');
  const line1 = root.querySelector('[data-ai-l1]');
  const line2 = root.querySelector('[data-ai-l2]');
  const sub = root.querySelector('[data-ai-sub]');
  const metas = Array.from(root.querySelectorAll('[data-ai-meta]'));
  const stamp = root.querySelector('[data-ai-stamp]');

  // 0-180 坐标纸出现
  animate(root, [{ opacity: 0 }, { opacity: 1 }], {
    duration: 180,
    easing: 'linear',
  });

  // 120-560 图板轻落位
  animate(
    paper,
    [
      { opacity: 0, transform: 'translateY(10px) scale(0.985)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ],
    { delay: 120, duration: 440, easing: ctx.IN },
  );

  // 180-780 节点依次落位(小回弹)
  nodes.forEach((n, i) =>
    animate(
      n,
      [
        { opacity: 0, transform: 'scale(0.4)' },
        { opacity: 1, transform: 'scale(1.08)', offset: 0.75 },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { delay: 180 + i * 130, duration: 260, easing: ctx.IN },
    ),
  );

  // 300-1300 边依次绘制
  edges.forEach((e, i) => {
    let len = 0;
    try {
      len = e.getTotalLength();
    } catch {
      /* 无几何信息时退化为透明度 */
    }
    if (len > 0) {
      e.style.strokeDasharray = `${len}`;
      animate(e, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
        delay: 300 + i * 140,
        duration: 260,
        easing: 'ease-out',
      });
    } else {
      animate(e, [{ opacity: 0 }, { opacity: 0.75 }], {
        delay: 300 + i * 140,
        duration: 260,
      });
    }
  });

  // 880 英文刊名
  animate(
    en,
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 880, duration: 260, easing: ctx.IN },
  );

  // 960/1050 标题两行遮罩
  animate(
    line1,
    [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }],
    { delay: 960, duration: 420, easing: ctx.IN },
  );
  animate(
    line2,
    [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }],
    { delay: 1050, duration: 420, easing: ctx.IN },
  );

  // 1250 副标
  animate(
    sub,
    [
      { opacity: 0, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 1250, duration: 300, easing: ctx.IN },
  );

  // 1120-1450 档案信息错峰
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

  // 1450-1650 盖「演算中」章
  animate(
    stamp,
    [
      { opacity: 0, transform: 'rotate(-10deg) scale(1.1)' },
      { opacity: 0.92, transform: 'rotate(-4deg) scale(1)' },
    ],
    { delay: 1450, duration: 200, easing: ctx.STAMP },
  );

  /* 1860 起交接 */
  wait(1860, () => ctx.handoff());
}

function handoff(ctx: TimelineContext): void {
  const { root, animate, wait } = ctx;
  const paper = root.querySelector<HTMLElement>('[data-ai-paper]');
  const copy = root.querySelector<HTMLElement>('[data-ai-copy]');
  const stamp = root.querySelector('[data-ai-stamp]');

  const heroRight = document.querySelector<HTMLElement>('.hero-right');
  const heroH1 = document.querySelector<HTMLElement>('.hero-left h1');
  let flipped = false;

  /* 图板 FLIP:移动到首页 hero 图区位置 */
  if (heroRight && paper && !ctx.degraded()) {
    const from = paper.getBoundingClientRect();
    const to = heroRight.getBoundingClientRect();
    if (from.width > 0 && to.width > 0) {
      heroRight.style.opacity = '0';
      // 交接被跳过时也要恢复首页元素(清理函数在自然结束/硬取消都会执行)
      ctx.cleanup(() => {
        heroRight.style.opacity = '';
      });
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const s = Math.min(to.width / from.width, to.height / from.height);
      animate(
        paper,
        [
          { transform: 'translate(0,0) scale(1)' },
          { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
        ],
        { duration: 460, easing: ctx.IN },
      );
      ctx.wait(500, () => {
        heroRight.style.opacity = '';
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
  animate(stamp, [{ opacity: 1 }, { opacity: 0 }], {
    duration: 200,
    easing: ctx.OUT,
  });

  /* 纸面交叉淡化 */
  animate(root, [{ opacity: 1 }, { opacity: 0 }], {
    delay: flipped ? 60 : 0,
    duration: flipped ? 420 : 320,
    easing: 'linear',
  });
  wait(flipped ? 520 : 340, () => ctx.finish());
}
