/**
 * 「玩法解剖室」开屏时间线:主机开机 → 标题浮现 → PRESS START。
 *
 * 触发规则由共享控制器(columnIntro.ts)承担:仅游戏首页且本会话
 * 未播过(sessionStorage: game-column-intro-v1)、reduced-motion 直接
 * 进正文、可跳过、before-swap 硬清理。无音频自动播放。
 *
 * 时间线(约 2500ms,WAAPI,只动 transform/opacity):
 * 0-160 深炭底淡入 → 240-1040 HUD 引导行逐条打印 → 1100 起像素光标
 * 闪烁 → 1300-1740 标题两行遮罩 + 副标 → 1800 PRESS START 落章 →
 * 1980 起与首页 hero 存档槽共享元素交接(FLIP,失败退化交叉淡化)。
 */

import {
  mountColumnIntro,
  cancelColumnIntroForSwap,
  type TimelineContext,
} from './columnIntro';

const STORAGE_KEY = 'game-column-intro-v1';

export function isGameHome(): boolean {
  return location.pathname === '/game/' || location.pathname === '/game';
}

export function mountGameIntro(): void {
  mountColumnIntro({
    rootSelector: '[data-game-intro]',
    storageKey: STORAGE_KEY,
    isHome: isGameHome,
    timeline: { play, handoff },
  });
}

export { cancelColumnIntroForSwap as cancelGameIntroForSwap };

function play(ctx: TimelineContext): void {
  const { root, animate, wait } = ctx;
  const boots = Array.from(root.querySelectorAll('[data-gt-boot]'));
  const cursor = root.querySelector('[data-gt-cursor]');
  const en = root.querySelector('[data-gt-en]');
  const line1 = root.querySelector('[data-gt-l1]');
  const line2 = root.querySelector('[data-gt-l2]');
  const sub = root.querySelector('[data-gt-sub]');
  const start = root.querySelector('[data-gt-start]');

  // 0-160 主机底色出现
  animate(root, [{ opacity: 0 }, { opacity: 1 }], {
    duration: 160,
    easing: 'linear',
  });

  // 240-1040 HUD 引导行逐条打印
  boots.forEach((b, i) =>
    animate(
      b,
      [
        { opacity: 0, transform: 'translateX(-8px)' },
        { opacity: 1, transform: 'translateX(0)' },
      ],
      { delay: 240 + i * 280, duration: 220, easing: ctx.IN },
    ),
  );

  // 1100 起像素光标闪烁三下(步进闪烁,不使用平滑缓动)
  animate(
    cursor,
    [
      { opacity: 0 },
      { opacity: 1 },
      { opacity: 0 },
      { opacity: 1 },
      { opacity: 0 },
      { opacity: 1 },
    ],
    {
      delay: 1100,
      duration: 640,
      easing: 'steps(1, end)',
    },
  );

  // 1300 英文小标
  animate(
    en,
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 1300, duration: 260, easing: ctx.IN },
  );

  // 1400/1490 标题两行遮罩
  animate(
    line1,
    [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }],
    { delay: 1400, duration: 400, easing: ctx.IN },
  );
  animate(
    line2,
    [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }],
    { delay: 1490, duration: 400, easing: ctx.IN },
  );

  // 1650 副标
  animate(
    sub,
    [
      { opacity: 0, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 1650, duration: 280, easing: ctx.IN },
  );

  // 1800 PRESS START 落章
  animate(
    start,
    [
      { opacity: 0, transform: 'scale(1.16)' },
      { opacity: 1, transform: 'scale(1)' },
    ],
    { delay: 1800, duration: 200, easing: ctx.STAMP },
  );

  /* 1980 起交接 */
  wait(1980, () => ctx.handoff());
}

function handoff(ctx: TimelineContext): void {
  const { root, animate, wait } = ctx;
  const boot = root.querySelector<HTMLElement>('.gt-boot');
  const copyKids = [
    root.querySelector('[data-gt-en]'),
    root.querySelector('.gt-title'),
    root.querySelector('[data-gt-sub]'),
  ];
  const start = root.querySelector<HTMLElement>('[data-gt-start]');

  const heroSlot = document.querySelector<HTMLElement>('.hero-slot');
  const heroH1 = document.querySelector<HTMLElement>('.hero-copy h1');
  let inserted = false;

  /* 标题三元素向首页标题方向淡出 */
  const dy = (() => {
    if (!heroH1) return 0;
    const from = start?.getBoundingClientRect();
    const to = heroH1.getBoundingClientRect();
    if (!from || from.width === 0) return 0;
    return Math.max(
      -40,
      Math.min(40, to.top + to.height / 2 - (from.top + from.height / 2)),
    );
  })();
  for (const el of copyKids) {
    animate(
      el,
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: `translateY(${dy}px)` },
      ],
      { duration: 260, easing: ctx.OUT },
    );
  }

  /* PRESS START 按原尺寸"插入"首页 CONTINUE 存档槽 */
  if (heroSlot && start && !ctx.degraded()) {
    const from = start.getBoundingClientRect();
    const to = heroSlot.getBoundingClientRect();
    if (from.width > 0 && to.width > 0) {
      heroSlot.style.opacity = '0';
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dySlot = to.top + to.height / 2 - (from.top + from.height / 2);
      animate(
        start,
        [
          { transform: 'translate(0,0)' },
          { transform: `translate(${dx}px, ${dySlot}px)` },
        ],
        { duration: 440, easing: ctx.IN },
      );
      window.setTimeout(() => {
        heroSlot.style.opacity = '';
      }, 480);
      inserted = true;
    }
  }

  /* 引导行淡出 */
  animate(boot, [{ opacity: 1 }, { opacity: 0 }], {
    duration: 200,
    easing: ctx.OUT,
  });

  /* 底色交叉淡化 */
  animate(root, [{ opacity: 1 }, { opacity: 0 }], {
    delay: inserted ? 60 : 0,
    duration: inserted ? 440 : 320,
    easing: 'linear',
  });
  wait(inserted ? 540 : 340, () => ctx.finish());
}
