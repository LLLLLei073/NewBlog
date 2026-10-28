/**
 * 「存档之外」开屏时间线:插入记忆卡,发现旧存档。
 *
 * 触发规则由共享控制器(columnIntro.ts)承担:仅游戏首页且本会话
 * 未播过(sessionStorage: game-column-intro-v1)、reduced-motion 直接
 * 进正文、可跳过(按钮/Esc/Enter/空白点击)、before-swap 硬清理。
 *
 * 时间线(总时长约 2500ms;WAAPI 只动 transform/opacity,数字
 * 计数用 rAF 并登记清理):
 *   0-180    钴蓝背景与网点像素装饰浮现,左上插入提示
 *   120-620  中央记忆卡自上方插入(cubic-bezier(0.22,1,0.36,1)),
 *            到位 2px 短促回弹;错位阴影晚约 60ms;左侧倾斜记忆卡
 *            图形随后淡入
 *   480-940  四个存档格错开 80ms 显现,扫描标记依次经过 01-04,
 *            结束后 01 变酸性黄(齿轮缓慢转动一次)
 *   760-1180 状态文字变 SAVE DATA FOUND,01 旁像素箭头移动一次
 *            约 4px,细黑线画出,WORLD IN PROGRESS 贴纸自右上进入
 *            落位旋转约 8 度
 *   900-1450 「存档/之外」两行遮罩显现,油墨错位阴影各晚约
 *            50ms,英文名与条带主张随后
 *   1180-1720 分段加载条依次填充(每段约 42ms),等宽数字 0→100%,
 *            完成后显示 SAVE DATA READY(纯装饰,不绑定真实加载)
 *   1580-1880 PRESS START 一次透明度变化 + 一次明暗切换,酸黄
 *            细线,角落 GOOD GAME. GREAT MEMORIES.
 *   1880-2080 完整构图稳定停留
 *   2080-2500 交接:记忆卡 FLIP 到首页主视觉、标题交叉淡化、
 *            贴纸飞向首页贴纸位;移动端/resize/测量失败退化为
 *            整体交叉淡化。
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
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel);

  const dots = Array.from(root.querySelectorAll('[class*="gi-dots"]'));
  const sparks = Array.from(root.querySelectorAll('.gi-spark'));
  const notice = $('[data-gi-notice]');
  const sidecard = $('[data-gi-sidecard]');
  const cardwrap = $('[data-gi-cardwrap]');
  const shadow = $('[data-gi-shadow]');
  const newgame = $('[data-gi-newgame]');
  const slots = Array.from(
    root.querySelectorAll<HTMLElement>('[data-gi-slot]'),
  );
  const scan = $('[data-gi-scan]');
  const arrow = $('[data-gi-arrow]');
  const status = $('[data-gi-status]');
  const statusLine = $('[data-gi-status-line]');
  const wip = $('[data-gi-wip]');
  const faces = [$('[data-gi-cnface1]'), $('[data-gi-cnface2]')];
  const cnShadows = [$('[data-gi-cnshadow1]'), $('[data-gi-cnshadow2]')];
  const en = $('[data-gi-en]');
  const claim = $('[data-gi-claim]');
  const loader = $('[data-gi-loader]');
  const loadLabel = $('[data-gi-load-label]');
  const segs = Array.from(
    root.querySelectorAll<HTMLElement>('[data-gi-seg]'),
  );
  const pct = $('[data-gi-load-pct]');
  const start = $('[data-gi-start]');
  const startLine = $('[data-gi-start-line]');
  const corner = $('[data-gi-corner]');

  /* ---- 0-180 启动画面 ---- */
  animate(root, [{ opacity: 0 }, { opacity: 1 }], {
    duration: 180,
    easing: 'linear',
  });
  dots.forEach((d, i) =>
    animate(d, [{ opacity: 0 }, { opacity: 0.9 }], {
      delay: 40 + i * 50,
      duration: 240,
      easing: 'ease-out',
    }),
  );
  sparks.forEach((s, i) =>
    animate(s, [{ opacity: 0 }, { opacity: 0.85 }], {
      delay: 60 + i * 60,
      duration: 220,
      easing: 'ease-out',
    }),
  );
  if (notice)
    animate(notice, [{ opacity: 0 }, { opacity: 1 }], {
      delay: 90,
      duration: 220,
      easing: 'ease-out',
    });

  /* ---- 120-620 插入记忆卡 ---- */
  if (cardwrap) {
    animate(
      cardwrap,
      [
        { opacity: 0, transform: 'translateY(-36px) scale(0.97)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ],
      { delay: 120, duration: 500, easing: ctx.IN },
    );
    /* 到位回弹:2px 短促下沉再回正 */
    animate(
      cardwrap,
      [
        { transform: 'translateY(0)' },
        { transform: 'translateY(2px)' },
        { transform: 'translateY(0)' },
      ],
      { delay: 560, duration: 150, easing: 'ease-out' },
    );
  }
  /* 错位阴影晚约 60ms */
  if (shadow)
    animate(shadow, [{ opacity: 0 }, { opacity: 1 }], {
      delay: 180,
      duration: 360,
      easing: 'ease-out',
    });
  if (newgame)
    animate(
      newgame,
      [
        { opacity: 0, transform: 'rotate(6deg) scale(0.9)' },
        { opacity: 1, transform: 'rotate(6deg) scale(1)' },
      ],
      { delay: 520, duration: 240, easing: ctx.STAMP },
    );
  /* 左侧记忆卡图形随后淡入(最终约 -8 度) */
  if (sidecard)
    animate(
      sidecard,
      [
        { opacity: 0, transform: 'rotate(-4deg) translateY(8px)' },
        { opacity: 1, transform: 'rotate(-8deg) translateY(0)' },
      ],
      { delay: 520, duration: 300, easing: ctx.IN },
    );

  /* ---- 480-940 扫描存档格 ---- */
  slots.forEach((slot, i) =>
    animate(
      slot,
      [
        { opacity: 0, transform: 'translateY(7px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { delay: 480 + i * 80, duration: 240, easing: ctx.IN },
    ),
  );
  /* 扫描标记依次经过 01-04,结束后 01 选中 */
  if (scan && slots.length === 4) {
    const row = slots[0]!.parentElement;
    const step = row ? row.clientWidth / 4 : 0;
    animate(
      scan,
      [
        { opacity: 0, transform: `translateX(${step * 0.5}px)` },
        { opacity: 1, transform: `translateX(${step * 0.5}px)`, offset: 0.08 },
        { transform: `translateX(${step * 1.5}px)`, offset: 0.36 },
        { transform: `translateX(${step * 2.5}px)`, offset: 0.64 },
        { transform: `translateX(${step * 3.5}px)`, offset: 0.92 },
        { opacity: 0, transform: `translateX(${step * 3.5}px)` },
      ],
      { delay: 560, duration: 360, easing: 'linear', fill: 'both' },
    );
  }
  wait(940, () => {
    slots[0]?.classList.add('is-sel');
  });

  /* ---- 760-1180 发现存档 ---- */
  wait(760, () => {
    if (status) {
      status.textContent = '> SAVE DATA FOUND';
      animate(
        status,
        [
          { opacity: 0, transform: 'translateY(5px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 240, easing: ctx.IN },
      );
    }
  });
  if (statusLine)
    animate(
      statusLine,
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      { delay: 880, duration: 260, easing: ctx.OUT },
    );
  /* 01 旁像素箭头:只移动一次,幅度约 4px */
  if (arrow)
    animate(
      arrow,
      [
        { opacity: 0, transform: 'translateX(-4px)' },
        { opacity: 1, transform: 'translateX(0)', offset: 0.6 },
        { opacity: 1, transform: 'translateX(0)' },
      ],
      { delay: 820, duration: 320, easing: ctx.OUT },
    );
  /* WORLD IN PROGRESS 贴纸自右上进入,落位旋转约 8 度 */
  if (wip)
    animate(
      wip,
      [
        { opacity: 0, transform: 'translate(26px, -22px) rotate(14deg)' },
        { opacity: 1, transform: 'translate(0, 0) rotate(8deg)' },
      ],
      { delay: 900, duration: 320, easing: ctx.IN },
    );

  /* ---- 900-1450 标题落版 ---- */
  faces.forEach((face, i) => {
    if (!face) return;
    animate(
      face,
      [{ transform: 'translateY(108%)' }, { transform: 'translateY(0)' }],
      {
        delay: 900 + i * 100,
        duration: 460,
        easing: ctx.IN,
      },
    );
    /* 油墨错位阴影比主标题晚约 50ms */
    const sh = cnShadows[i];
    if (sh)
      animate(sh, [{ opacity: 0 }, { opacity: 1 }], {
        delay: 950 + i * 100,
        duration: 240,
        easing: 'ease-out',
      });
  });
  if (en)
    animate(
      en,
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { delay: 1180, duration: 280, easing: ctx.IN },
    );
  if (claim)
    animate(
      claim,
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { delay: 1300, duration: 280, easing: ctx.IN },
    );

  /* ---- 1180-1720 分段加载条 ---- */
  if (loader)
    animate(loader, [{ opacity: 0 }, { opacity: 1 }], {
      delay: 1180,
      duration: 200,
      easing: 'ease-out',
    });
  segs.forEach((seg, i) =>
    animate(seg, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      delay: 1220 + i * 42,
      duration: 120,
      easing: 'linear',
    }),
  );
  /* 等宽数字 0→100:固定宽度避免抖动;装饰性进度,不向读屏播报 */
  let pctRaf = 0;
  wait(1220, () => {
    const t0 = performance.now();
    const dur = 500;
    const frame = (now: number) => {
      if (!pctRaf) return;
      const k = Math.min(1, (now - t0) / dur);
      const value = Math.round((1 - Math.pow(1 - k, 2)) * 100);
      if (pct) pct.textContent = `${value}%`;
      if (k < 1) pctRaf = requestAnimationFrame(frame);
      else pctRaf = 0;
    };
    pctRaf = requestAnimationFrame(frame);
    ctx.cleanup(() => {
      if (pctRaf) cancelAnimationFrame(pctRaf);
      pctRaf = 0;
      if (pct) pct.textContent = '100%';
    });
  });
  wait(1720, () => {
    if (loadLabel) loadLabel.textContent = 'SAVE DATA READY';
  });

  /* ---- 1580-1880 PRESS START ---- */
  if (start) {
    animate(start, [{ opacity: 0 }, { opacity: 1 }], {
      delay: 1580,
      duration: 220,
      easing: 'ease-out',
    });
    /* 仅一次明暗切换,不做高频闪烁 */
    wait(1760, () => {
      animate(start, [{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], {
        duration: 260,
        easing: 'ease-in-out',
      });
    });
  }
  if (startLine)
    animate(
      startLine,
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      { delay: 1700, duration: 200, easing: ctx.OUT },
    );
  if (corner)
    animate(corner, [{ opacity: 0 }, { opacity: 1 }], {
      delay: 1800,
      duration: 240,
      easing: 'ease-out',
    });

  /* ---- 2080 交接 ---- */
  wait(2080, () => ctx.handoff());
}

function handoff(ctx: TimelineContext): void {
  const { root, animate, wait } = ctx;
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel);

  const cardwrap = $('[data-gi-cardwrap]');
  const titlewrap = $('[data-gi-titlewrap]');
  const wip = $('[data-gi-wip]');
  const start = $('[data-gi-start]');
  const loader = $('[data-gi-loader]');
  const corner = $('[data-gi-corner]');
  const notice = $('[data-gi-notice]');
  const sidecard = $('[data-gi-sidecard]');
  const status = root.querySelector('.gi-status');

  const heroFigure = document.querySelector<HTMLElement>(
    '[data-gg-hero-figure]',
  );
  const heroTitle = document.querySelector<HTMLElement>(
    '[data-gg-hero-title]',
  );
  const heroSticker = document.querySelector<HTMLElement>(
    '[data-gg-hero-sticker]',
  );

  const MOBILE = '(max-width: 759px)';
  const degenerate =
    ctx.degraded() ||
    matchMedia(MOBILE).matches ||
    !cardwrap ||
    !heroFigure ||
    cardwrap.getBoundingClientRect().width <= 0 ||
    heroFigure.getBoundingClientRect().width <= 0;

  /* 次要元素先快速退场 */
  for (const el of [start, loader, corner, notice, sidecard, status]) {
    animate(el, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 160,
      easing: ctx.OUT,
    });
  }

  /* FLIP:把开屏元素送向首页对应位置,落点元素在飞行中隐藏 */
  const flip = (
    el: Element | null,
    target: HTMLElement | null,
    duration: number,
  ): boolean => {
    if (!el || !target) return false;
    const from = el.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    if (from.width <= 0 || to.width <= 0) return false;
    target.style.opacity = '0';
    ctx.cleanup(() => {
      target.style.opacity = '';
    });
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const s = Math.min(1.6, Math.max(0.35, to.width / from.width));
    animate(
      el,
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) scale(${s})`,
          opacity: 0.2,
        },
      ],
      { duration, easing: ctx.IN },
    );
    ctx.wait(duration + 60, () => {
      target.style.opacity = '';
    });
    return true;
  };

  if (!degenerate) {
    /* 记忆卡(含存档格)扩展为首页主视觉 */
    flip(cardwrap, heroFigure, 430);
    /* 中文标题向首页大标题方向过渡并交叉淡化 */
    if (titlewrap && heroTitle && !ctx.degraded()) {
      const from = titlewrap.getBoundingClientRect();
      const to = heroTitle.getBoundingClientRect();
      const dy = Math.max(
        -48,
        Math.min(48, to.top + to.height / 2 - (from.top + from.height / 2)),
      );
      animate(
        titlewrap,
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: `translateY(${dy}px)` },
        ],
        { duration: 330, easing: ctx.OUT },
      );
    } else if (titlewrap) {
      animate(titlewrap, [{ opacity: 1 }, { opacity: 0 }], {
        duration: 220,
        easing: ctx.OUT,
      });
    }
    /* WORLD IN PROGRESS 贴纸飞向首页贴纸位 */
    flip(wip, heroSticker, 430);
    animate(root, [{ opacity: 1 }, { opacity: 0 }], {
      delay: 70,
      duration: 380,
      easing: 'linear',
    });
    wait(480, () => ctx.finish());
    return;
  }

  /* 移动端 / resize / 测量失败:整体交叉淡化 */
  for (const el of [titlewrap, wip]) {
    animate(el, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 220,
      easing: ctx.OUT,
    });
  }
  animate(root, [{ opacity: 1 }, { opacity: 0 }], {
    duration: 320,
    easing: 'linear',
  });
  wait(340, () => ctx.finish());
}
