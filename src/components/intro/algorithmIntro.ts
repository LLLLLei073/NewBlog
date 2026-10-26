/**
 * 「演算手稿」开屏时间线:从离散节点到清晰路径。
 *
 * 触发规则由共享控制器(columnIntro.ts)承担:仅算法首页且本会话
 * 未播过(sessionStorage: algorithm-column-intro-v1)、reduced-motion
 * 直接进正文、Esc/Enter/空白点击/跳过按钮可跳过、before-swap 硬清理。
 * 本文件只负责视觉时间线:坐标纸出现 → 落位五节点带权图 →
 * 按预定义步骤推出 A → C → D → E(dist[E] = 3)→ 与首页 hero
 * 图区共享元素交接(FLIP;移动端、缩放中或测量失败时退化为交叉淡化)。
 *
 * 时间线(约 2480ms,WAAPI 只动 transform/opacity/stroke-dashoffset,
 * 状态色变化走一次性 class + CSS transition):
 * 0-180 坐标纸淡入 → 140-620 图注/参考线/INPUT → 260-760 节点依次
 * 落位(scale 0.72)→ 640 d[A] = 0 → 560-1180 八条边绘制+边权 →
 * 950-1720 搜索步骤(relax/settle 交替,琥珀推进、逐段转信号蓝)→
 * 1120-1600 标题遮罩显现 → 1500-1700 路径结论与 PATH FOUND →
 * 1940 起与首页交接。
 */

import {
  mountColumnIntro,
  cancelColumnIntroForSwap,
  type TimelineContext,
} from './columnIntro';

const STORAGE_KEY = 'algorithm-column-intro-v1';
/** 移动端空间不足:共享元素过渡退化为交叉淡化 */
const MOBILE = '(max-width: 759px)';

type PathEdge = 'AC' | 'CD' | 'DE';
type SearchNode = 'C' | 'D' | 'E';

type Step =
  | { at: number; kind: 'relax'; edge: PathEdge; first?: boolean }
  | { at: number; kind: 'dist'; node: SearchNode }
  | { at: number; kind: 'settle'; node: SearchNode; toPath?: PathEdge }
  | { at: number; kind: 'complete' };

/**
 * 预定义搜索步骤(与图结构核对无误,不运行真实算法):
 * d[A]=0 → relax A→C(d[C]=1)→ settle C → relax C→D(d[D]=2)
 * → settle D(A→C 定格为路径)→ relax D→E(d[E]=3)
 * → settle E(C→D 定格)→ complete(D→E 定格、非路径边降对比)。
 */
const STEPS: Step[] = [
  { at: 950, kind: 'relax', edge: 'AC', first: true },
  { at: 1090, kind: 'dist', node: 'C' },
  { at: 1160, kind: 'settle', node: 'C' },
  { at: 1200, kind: 'relax', edge: 'CD' },
  { at: 1340, kind: 'dist', node: 'D' },
  { at: 1420, kind: 'settle', node: 'D', toPath: 'AC' },
  { at: 1440, kind: 'relax', edge: 'DE' },
  { at: 1580, kind: 'dist', node: 'E' },
  { at: 1680, kind: 'settle', node: 'E', toPath: 'CD' },
  { at: 1720, kind: 'complete' },
];

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
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel);
  const $$ = <T extends Element>(sel: string) =>
    Array.from(root.querySelectorAll<T>(sel));

  const grid = $('[data-ai-grid]');
  const corners = $$('.ai-corner');
  const vol = $('[data-ai-vol]');
  const input = $('[data-ai-input]');
  const figcap = $('[data-ai-figcap]');
  const refx = $<HTMLElement>('[data-ai-refx]');
  const refy = $<HTMLElement>('[data-ai-refy]');
  const nodeEl = (id: string) => $(`[data-ai-node="${id}"]`);
  const letterEl = (id: string) => $(`[data-ai-letter="${id}"]`);
  const distEl = (id: string) => $(`[data-ai-dist="${id}"]`);
  const hiEl = (id: string) => $(`[data-ai-hi="${id}"]`);
  const edgeEls = $$<SVGGeometryElement>('[data-ai-edge]');
  const weightEls = $$('[data-ai-weight]');
  const tagEls = $$('.ai-tag');
  const en = $('[data-ai-en]');
  const line1 = $('[data-ai-l1]');
  const sub = $('[data-ai-sub]');
  const rdist = $('[data-ai-rdist]');
  const rpath = $('[data-ai-rpath]');
  const rule = $('[data-ai-rule]');
  const found = $('[data-ai-found]');

  const rise = (el: Element | null, delay: number, duration: number) =>
    animate(
      el,
      [
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { delay, duration, easing: ctx.IN },
    );

  /* ---- 0-180 坐标纸出现 ---- */
  animate(root, [{ opacity: 0 }, { opacity: 1 }], {
    duration: 180,
    easing: 'linear',
  });
  animate(grid, [{ opacity: 0 }, { opacity: 1 }], {
    duration: 220,
    easing: 'linear',
  });
  corners.forEach((c) =>
    animate(c, [{ opacity: 0 }, { opacity: 0.6 }], {
      duration: 220,
      easing: 'ease-out',
    }),
  );
  for (const el of [vol, input]) rise(el, 120, 220);

  /* ---- 140-620 图注与参考线 ---- */
  animate(
    figcap,
    [
      { opacity: 0, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 140, duration: 240, easing: ctx.IN },
  );
  animate(refx, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
    delay: 150,
    duration: 200,
    easing: 'ease-out',
  });
  animate(refy, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
    delay: 210,
    duration: 200,
    easing: 'ease-out',
  });

  /* ---- 260-760 节点按 A、B、C、D、E 落位 ---- */
  ['A', 'B', 'C', 'D', 'E'].forEach((id, i) => {
    animate(
      nodeEl(id),
      [
        { opacity: 0, transform: 'scale(0.72)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { delay: 260 + i * 70, duration: 260, easing: ctx.IN },
    );
    animate(letterEl(id), [{ opacity: 0 }, { opacity: 1 }], {
      delay: 400 + i * 70,
      duration: 180,
      easing: 'ease-out',
    });
  });

  /* ---- 640 初始条件 d[A] = 0 ---- */
  rise(distEl('A'), 640, 220);
  tagEls.forEach((tag) =>
    animate(tag, [{ opacity: 0 }, { opacity: 1 }], {
      delay: 700,
      duration: 200,
      easing: 'ease-out',
    }),
  );

  /* ---- 560-1180 连接图结构:stroke-dashoffset 逐条绘制 ---- */
  edgeEls.forEach((edge, i) => {
    const len = Number(edge.dataset.len || 0);
    animate(edge, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
      delay: 560 + i * 45,
      duration: 230,
      easing: 'ease-out',
    });
  });
  weightEls.forEach((w) => {
    const edge = (w as Element).getAttribute('data-ai-weight');
    const index = edgeEls.findIndex(
      (e) => e.getAttribute('data-ai-edge') === edge,
    );
    rise(w, 560 + index * 45 + 170, 200);
  });

  /* ---- 950-1720 搜索步骤(预定义状态呈现) ---- */
  const apply = (step: Step): void => {
    if (step.kind === 'relax') {
      if (step.first) nodeEl('A')?.classList.add('is-settled');
      const hi = hiEl(step.edge);
      hi?.classList.add('is-active');
      const len = Number(hi?.getAttribute('data-len') || 0);
      animate(hi, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
        duration: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      });
      return;
    }
    if (step.kind === 'dist') {
      distEl(step.node)?.classList.add('is-current');
      nodeEl(step.node)?.classList.add('is-current');
      rise(distEl(step.node), 0, 200);
      return;
    }
    if (step.kind === 'settle') {
      const node = nodeEl(step.node);
      node?.classList.remove('is-current');
      node?.classList.add('is-settled');
      distEl(step.node)?.classList.remove('is-current');
      if (step.toPath) {
        const hi = hiEl(step.toPath);
        hi?.classList.remove('is-active');
        hi?.classList.add('is-path');
      }
      return;
    }
    // complete:D→E 定格为路径,E 完成描边,非路径边降低对比度
    for (const id of ['CD', 'DE'] as const) {
      hiEl(id)?.classList.remove('is-active');
      hiEl(id)?.classList.add('is-path');
    }
    nodeEl('E')?.classList.add('is-done');
    root.classList.add('ai-done');
  };
  STEPS.forEach((step) => wait(step.at, () => apply(step)));

  /* ---- 1120-1600 标题显现(与搜索后半段交叠) ---- */
  animate(
    en,
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 1140, duration: 260, easing: ctx.IN },
  );
  animate(
    line1,
    [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }],
    { delay: 1220, duration: 400, easing: ctx.IN },
  );
  animate(
    sub,
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 1460, duration: 300, easing: ctx.IN },
  );

  /* ---- 1500-1700 路径结论 ---- */
  rise(rdist, 1500, 240);
  rise(rpath, 1600, 240);
  animate(rule, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
    delay: 1660,
    duration: 240,
    easing: 'ease-out',
  });
  animate(found, [{ opacity: 0 }, { opacity: 1 }], {
    delay: 1640,
    duration: 200,
    easing: 'ease-out',
  });

  /* ---- 1940 起交接(总时长约 2480ms) ---- */
  wait(1940, () => ctx.handoff());
}

function handoff(ctx: TimelineContext): void {
  const { root, animate, wait } = ctx;
  const paper = root.querySelector<HTMLElement>('[data-ai-paper]');
  const grid = root.querySelector('[data-ai-grid]');
  const corners = Array.from(root.querySelectorAll('.ai-corner'));
  const vol = root.querySelector('[data-ai-vol]');
  const input = root.querySelector('[data-ai-input]');
  const figcap = root.querySelector('.ai-figcap');
  const head = root.querySelector<HTMLElement>('.ai-head');
  const result = root.querySelector<HTMLElement>('.ai-result');

  const heroRight = document.querySelector<HTMLElement>('.hero-right');
  const heroH1 = document.querySelector<HTMLElement>('.hero-left h1');

  /* 移动端空间不足、窗口缩放中或测量失败:退化为交叉淡化 */
  const degenerate =
    ctx.degraded() ||
    matchMedia(MOBILE).matches ||
    !paper ||
    !heroRight ||
    paper.getBoundingClientRect().width <= 0 ||
    heroRight.getBoundingClientRect().width <= 0;

  let flipped = false;
  if (!degenerate) {
    const from = paper!.getBoundingClientRect();
    const to = heroRight!.getBoundingClientRect();
    /* 整图等比例平移缩放,节点相对位置与路径结果不变 */
    heroRight!.style.opacity = '0';
    ctx.cleanup(() => {
      heroRight!.style.opacity = '';
    });
    ctx.wait(540, () => {
      heroRight!.style.opacity = '';
    });
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const s = to.width / from.width;
    animate(
      paper,
      [
        { transform: 'translate(0,0) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
      ],
      { duration: 460, easing: ctx.IN },
    );
    flipped = true;
  }

  /* 标题向首页标题区域过渡并交叉淡化 */
  if (head && heroH1 && !degenerate) {
    const from = head.getBoundingClientRect();
    const to = heroH1.getBoundingClientRect();
    const dy = Math.max(
      -40,
      Math.min(40, to.top + to.height / 2 - (from.top + from.height / 2)),
    );
    animate(
      head,
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: `translateY(${dy}px)` },
      ],
      { duration: 300, easing: ctx.OUT },
    );
  } else {
    animate(head, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 200,
      easing: ctx.OUT,
    });
  }

  /* 其余图纸元素在约 180ms 内淡出 */
  animate(result, [{ opacity: 1 }, { opacity: 0 }], {
    duration: 220,
    easing: ctx.OUT,
  });
  for (const el of [figcap, vol, input, grid, ...corners]) {
    animate(el, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 180,
      easing: ctx.OUT,
    });
  }

  /* 坐标纸背景与首页交叉淡化 */
  animate(root, [{ opacity: 1 }, { opacity: 0 }], {
    delay: flipped ? 60 : 0,
    duration: flipped ? 420 : 320,
    easing: ctx.OUT,
  });
  wait(flipped ? 540 : 360, () => ctx.finish());
}
