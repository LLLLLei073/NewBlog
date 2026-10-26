/**
 * 「抽屉杂记」开屏时间线:抽屉拉开,便签飞上软木板。
 *
 * 触发规则由共享控制器(columnIntro.ts)承担:仅其他专栏首页且本会话
 * 未播过(sessionStorage: others-column-intro-v1)、reduced-motion 直接
 * 进正文、可跳过、before-swap 硬清理。
 *
 * 时间线(约 2320ms,WAAPI,只动 transform/opacity):
 * 0-180 木板淡入 → 180-560 抽屉两段拉开 → 620-1120 三张便签依次飞入,
 * 图钉落钉回弹 → 1000-1330 标题两行遮罩 + 副标 → 1480 盖「随手收录」
 * 章 → 1860 起与首页软木板交叉淡化交接。
 */

import {
  mountColumnIntro,
  cancelColumnIntroForSwap,
  type TimelineContext,
} from './columnIntro';

const STORAGE_KEY = 'others-column-intro-v1';

export function isOthersHome(): boolean {
  return location.pathname === '/others/' || location.pathname === '/others';
}

export function mountOthersIntro(): void {
  mountColumnIntro({
    rootSelector: '[data-others-intro]',
    storageKey: STORAGE_KEY,
    isHome: isOthersHome,
    timeline: { play, handoff },
  });
}

export { cancelColumnIntroForSwap as cancelOthersIntroForSwap };

function play(ctx: TimelineContext): void {
  const { root, animate, wait } = ctx;
  const drawer = root.querySelector<HTMLElement>('[data-ot-drawer]');
  const inside = root.querySelector('[data-ot-inside]');
  const notes = Array.from(
    root.querySelectorAll<HTMLElement>('[data-ot-note]'),
  );
  const en = root.querySelector('[data-ot-en]');
  const line1 = root.querySelector('[data-ot-l1]');
  const line2 = root.querySelector('[data-ot-l2]');
  const sub = root.querySelector('[data-ot-sub]');
  const stamp = root.querySelector('[data-ot-stamp]');

  // 0-180 木板出现
  animate(root, [{ opacity: 0 }, { opacity: 1 }], {
    duration: 180,
    easing: 'linear',
  });

  // 180-560 抽屉两段拉开:先顿一下,再整面滑出
  animate(
    drawer,
    [
      { transform: 'translateY(0)' },
      { transform: 'translateY(18px)', offset: 0.35 },
      { transform: 'translateY(86px)' },
      { opacity: 0, offset: 0.9 },
      { opacity: 0 },
    ],
    { delay: 180, duration: 380, easing: ctx.IN },
  );
  animate(inside, [{ opacity: 0 }, { opacity: 1 }], {
    delay: 420,
    duration: 200,
    easing: 'ease-out',
  });

  // 620/780/940 便签依次飞入,图钉落钉回弹
  notes.forEach((note, i) => {
    const delay = 620 + i * 160;
    const tilt = note.style.getPropertyValue('--tilt') || '0deg';
    animate(
      note,
      [
        {
          opacity: 0,
          transform: `translate(-26px, 30px) rotate(calc(${tilt} - 5deg)) scale(0.96)`,
        },
        {
          opacity: 1,
          transform: `translate(0, 0) rotate(${tilt}) scale(1)`,
        },
      ],
      { delay, duration: 320, easing: ctx.IN },
    );
    const pin = note.querySelector('.pin');
    animate(
      pin,
      [
        { opacity: 0, transform: 'scale(1.55)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { delay: delay + 190, duration: 170, easing: ctx.STAMP },
    );
  });

  // 1000 英文小标
  animate(
    en,
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 1000, duration: 260, easing: ctx.IN },
  );

  // 1080/1170 标题两行遮罩
  animate(
    line1,
    [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }],
    { delay: 1080, duration: 400, easing: ctx.IN },
  );
  animate(
    line2,
    [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }],
    { delay: 1170, duration: 400, easing: ctx.IN },
  );

  // 1330 副标
  animate(
    sub,
    [
      { opacity: 0, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 1330, duration: 280, easing: ctx.IN },
  );

  // 1480 盖「随手收录」章
  animate(
    stamp,
    [
      { opacity: 0, transform: 'rotate(8deg) scale(1.14)' },
      { opacity: 0.9, transform: 'rotate(3deg) scale(1)' },
    ],
    { delay: 1480, duration: 200, easing: ctx.STAMP },
  );

  /* 1860 起交接 */
  wait(1860, () => ctx.handoff());
}

function handoff(ctx: TimelineContext): void {
  const { root, animate, wait } = ctx;
  const drawerBox = root.querySelector('.ot-drawer');
  const board = root.querySelector('.ot-board');
  const copy = root.querySelector<HTMLElement>('[data-ot-copy]');
  const heroH1 = document.querySelector<HTMLElement>('.hero-copy h1');

  /* 抽屉淡出 */
  animate(drawerBox, [{ opacity: 1 }, { opacity: 0 }], {
    duration: 200,
    easing: ctx.OUT,
  });

  /* 软木板:轻微缩没并交叉淡化(首页 hero 木板随根节点一起显现) */
  animate(
    board,
    [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.98)' },
    ],
    { duration: 300, easing: ctx.OUT },
  );

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

  /* 木板底色交叉淡化 */
  animate(root, [{ opacity: 1 }, { opacity: 0 }], {
    duration: 380,
    easing: 'linear',
  });
  wait(460, () => ctx.finish());
}
