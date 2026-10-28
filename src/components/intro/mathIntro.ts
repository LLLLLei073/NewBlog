/**
 * 「数学观象台」开屏时间线:构造单位圆,抵达欧拉公式。
 *
 * 触发规则由共享控制器(columnIntro.ts)承担:仅数学首页且本会话
 * 未播过(sessionStorage: math-column-intro-v1)、reduced-motion 直接
 * 进正文、可跳过、before-swap 硬清理。
 *
 * 时间线(约 2600ms;WAAPI 只动 transform/opacity/stroke,旋转阶段
 * 用 rAF 驱动几何属性,rAF 句柄登记进 ctx.cleanup):
 * 0-200 展厅亮起 → 160-620 坐标轴自原点绘出 → 420-1080 单位圆
 * 逆时针描边、半径与 P 点出现 → 820-1420 半径旋转 θ:0→π,投影与
 * 角度弧同步,过 π/2 短暂强调 (0,1) → 1080-1580 标题显现 →
 * 1380-1900 通用公式分部显现,θ=π 后降亮度,浮现 e^{iπ}+1=0 与
 * 黄绿细线 → 1900-2100 停留 → 2080 起与首页 hero 交接(FLIP,
 * 移动端/resize 退化交叉淡化)。
 */

import {
  mountColumnIntro,
  cancelColumnIntroForSwap,
  type TimelineContext,
} from './columnIntro';

const STORAGE_KEY = 'math-column-intro-v1';

/* 与 SVG 骨架一致的几何常量 */
const CX = 200;
const CY = 200;
const R = 130;
const ARC = 34;
const HALF_PI = Math.PI / 2;

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

function easeInOutCubic(k: number): number {
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

function play(ctx: TimelineContext): void {
  const { root, animate, wait } = ctx;
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel);

  const corners = Array.from(root.querySelectorAll('[data-mi-corner]'));
  const dots = Array.from(root.querySelectorAll('[data-mi-dot]'));
  const draws = Array.from(
    root.querySelectorAll<SVGGeometryElement>('[data-mi-draw]'),
  );
  /* DOM 顺序即绘制顺序:x+ / x− / y+ / y− / 圆 / 半径 */
  const [axXP, axXN, axYP, axYN, circle, radius] = draws;
  const arrows = Array.from(root.querySelectorAll('[data-mi-arrow]'));
  const ticks = Array.from(root.querySelectorAll('[data-mi-tick]'));
  const axLabels = Array.from(root.querySelectorAll('[data-mi-axlabel]'));
  const rLabel = $('[data-mi-rlabel]');
  const point = $<SVGCircleElement>('[data-mi-point]');
  const peak = $<SVGCircleElement>('[data-mi-peak]');
  const arc = $<SVGPathElement>('[data-mi-arc]');
  const thetaLabel = $<SVGTextElement>('[data-mi-theta-label]');
  const cosLine = $<SVGLineElement>('[data-mi-cosline]');
  const cosLabel = $<SVGTextElement>('[data-mi-coslabel]');
  const sinLine = $<SVGLineElement>('[data-mi-sinline]');
  const sinLabel = $<SVGTextElement>('[data-mi-sinlabel]');
  const thetaVal = $('[data-mi-theta-val]');
  const en = $('[data-mi-en]');
  const title = $('[data-mi-title]');
  const sub = $('[data-mi-sub]');
  const steps = Array.from(root.querySelectorAll('[data-mi-step]'));
  const fParts = Array.from(root.querySelectorAll('[data-mi-fp]'));
  const formula = $('[data-mi-formula]');
  const identity = $('[data-mi-identity]');
  const idLine = $('[data-mi-idline]');
  const copy = root.querySelector<HTMLElement>('[data-mi-copy]');
  const figure = root.querySelector<HTMLElement>('[data-mi-figure]');

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

  const setStep = (done: number, current: number) => {
    steps.forEach((el, i) => {
      const n = i + 1;
      el.classList.toggle('is-done', n <= done);
      el.classList.toggle('is-current', n === current);
    });
  };

  /* ---- 旋转阶段(820-1420):rAF 驱动,θ:0→π ---- */
  let rotRaf = 0;
  let prevTheta = 0;
  const setTheta = (th: number) => {
    const c = Math.cos(th);
    const s = Math.sin(th);
    const px = CX + R * c;
    const py = CY - R * s;
    if (radius) {
      radius.setAttribute('x2', String(px));
      radius.setAttribute('y2', String(py));
    }
    point?.setAttribute('cx', String(px));
    point?.setAttribute('cy', String(py));
    if (arc) {
      if (th < 0.03) {
        arc.setAttribute('opacity', '0');
      } else {
        arc.setAttribute('opacity', '1');
        const large = th > Math.PI ? 1 : 0;
        arc.setAttribute(
          'd',
          `M ${CX + ARC} ${CY} A ${ARC} ${ARC} 0 ${large} 0 ${
            CX + ARC * c
          } ${CY - ARC * s}`,
        );
      }
    }
    if (thetaLabel) {
      const mid = th / 2;
      thetaLabel.setAttribute('x', String(CX + 47 * Math.cos(mid)));
      thetaLabel.setAttribute('y', String(CY - 47 * Math.sin(mid) + 4));
    }
    cosLine?.setAttribute('x1', String(px));
    cosLine?.setAttribute('y1', String(py));
    cosLine?.setAttribute('x2', String(px));
    cosLine?.setAttribute('y2', String(CY));
    cosLabel?.setAttribute('x', String(px));
    cosLabel?.setAttribute('y', String(s >= 0 ? CY + 17 : CY - 10));
    sinLine?.setAttribute('x1', String(CX));
    sinLine?.setAttribute('y1', String(py));
    sinLine?.setAttribute('x2', String(px));
    sinLine?.setAttribute('y2', String(py));
    sinLabel?.setAttribute('x', String((CX + px) / 2));
    sinLabel?.setAttribute('y', String(py - 7));
    if (thetaVal) {
      thetaVal.textContent =
        th >= Math.PI - 0.005 ? 'θ = π' : `θ = ${th.toFixed(2)}`;
    }
    /* 经过 π/2:短暂强调 (0,1),不做停顿 */
    if ((prevTheta < HALF_PI) !== (th < HALF_PI) && peak) {
      peak.setAttribute('opacity', '0.9');
      animate(
        peak,
        [
          { opacity: 0.9, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(2.4)' },
        ],
        { duration: 480, easing: 'ease-out' },
      );
    }
    prevTheta = th;
  };

  /* ---- 0-200 展厅亮起 ---- */
  animate(root, [{ opacity: 0 }, { opacity: 1 }], {
    duration: 200,
    easing: 'linear',
  });
  corners.forEach((c) =>
    animate(c, [{ opacity: 0 }, { opacity: 0.55 }], {
      duration: 200,
      easing: 'ease-out',
    }),
  );
  dots.forEach((d, i) =>
    animate(d, [{ opacity: 0 }, { opacity: 1 }], {
      delay: 60 + i * 60,
      duration: 220,
      easing: 'ease-out',
    }),
  );

  /* ---- 160-620 建立坐标 ---- */
  draw(axXP, 160, 220);
  draw(axXN, 200, 220);
  draw(axYP, 250, 220);
  draw(axYN, 300, 220);
  arrows.forEach((a) =>
    animate(a, [{ opacity: 0 }, { opacity: 1 }], {
      delay: 470,
      duration: 150,
      easing: 'ease-out',
    }),
  );
  ticks.forEach((t) =>
    animate(t, [{ opacity: 0 }, { opacity: 1 }], {
      delay: 490,
      duration: 140,
      easing: 'ease-out',
    }),
  );
  axLabels.forEach((l, i) =>
    animate(l, [{ opacity: 0 }, { opacity: 1 }], {
      delay: 500 + i * 40,
      duration: 160,
      easing: 'ease-out',
    }),
  );

  /* ---- 420-1080 画出单位圆 + 半径 + P ---- */
  draw(circle, 420, 600);
  draw(radius, 940, 170);
  if (rLabel)
    animate(rLabel, [{ opacity: 0 }, { opacity: 1 }], {
      delay: 1000,
      duration: 180,
      easing: 'ease-out',
    });
  if (point)
    animate(
      point,
      [
        { opacity: 0, transform: 'scale(0.4)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { delay: 1010, duration: 220, easing: ctx.IN },
    );

  /* ---- 820-1420 旋转半径与投影 ---- */
  const startRotation = () => {
    const start = performance.now();
    const dur = 600;
    const frame = (now: number) => {
      if (!rotRaf) return;
      const k = Math.min(1, (now - start) / dur);
      setTheta(Math.PI * easeInOutCubic(k));
      if (k < 1) {
        rotRaf = requestAnimationFrame(frame);
      } else {
        rotRaf = 0;
        setTheta(Math.PI);
      }
    };
    rotRaf = requestAnimationFrame(frame);
    ctx.cleanup(() => {
      if (rotRaf) cancelAnimationFrame(rotRaf);
      rotRaf = 0;
    });
  };
  wait(820, startRotation);
  /* 投影线与标注随旋转开始淡入 */
  for (const el of [cosLine, sinLine, cosLabel, sinLabel]) {
    animate(el, [{ opacity: 0 }, { opacity: 0.85 }], {
      delay: 880,
      duration: 260,
      easing: 'ease-out',
    });
  }

  /* ---- 1080-1580 标题显现(与旋转交叠) ---- */
  animate(
    en,
    [
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 1080, duration: 300, easing: ctx.IN },
  );
  animate(title, [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], {
    delay: 1170,
    duration: 460,
    easing: ctx.IN,
  });
  animate(
    sub,
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: 1330, duration: 300, easing: ctx.IN },
  );

  /* ---- 1380-1900 形成欧拉公式 ---- */
  fParts.forEach((p, i) =>
    animate(p, [{ opacity: 0 }, { opacity: 1 }], {
      delay: 1360 + i * 80,
      duration: 200,
      easing: 'ease-out',
    }),
  );
  /* θ=π 后(约 1540):通用公式降亮度,恒等式浮现 + 黄绿细线 */
  wait(1540, () => {
    animate(formula, [{ opacity: 1 }, { opacity: 0.4 }], {
      duration: 260,
      easing: ctx.OUT,
    });
    animate(identity, [{ opacity: 0 }, { opacity: 1 }], {
      delay: 60,
      duration: 280,
      easing: 'ease-out',
    });
    animate(idLine, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      delay: 240,
      duration: 140,
      easing: ctx.OUT,
    });
  });

  /* ---- 步骤进度 ---- */
  wait(160, () => setStep(0, 1));
  wait(1080, () => setStep(1, 2));
  wait(1420, () => setStep(2, 3));
  wait(1900, () => setStep(3, 4));

  /* ---- 2080 交接 ---- */
  wait(2080, () => ctx.handoff());
}

function handoff(ctx: TimelineContext): void {
  const { root, animate, wait } = ctx;
  const figure = root.querySelector<HTMLElement>('[data-mi-figure]');
  const copy = root.querySelector<HTMLElement>('[data-mi-copy]');
  const stepsBar = root.querySelector<HTMLElement>('.mi-steps');
  const corners = Array.from(root.querySelectorAll('[data-mi-corner]'));

  const heroFigure = document.querySelector<HTMLElement>(
    '[data-mo-hero-figure]',
  );
  const heroTitle = document.querySelector<HTMLElement>(
    '[data-mo-hero-title]',
  );

  const MOBILE = '(max-width: 759px)';
  const degenerate =
    ctx.degraded() ||
    matchMedia(MOBILE).matches ||
    !figure ||
    !heroFigure ||
    figure.getBoundingClientRect().width <= 0 ||
    heroFigure.getBoundingClientRect().width <= 0;

  /* 标题:向首页标题方向移动并交叉淡化 */
  if (copy && heroTitle && !ctx.degraded()) {
    const from = copy.getBoundingClientRect();
    const to = heroTitle.getBoundingClientRect();
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
      { duration: 320, easing: ctx.OUT },
    );
  } else if (copy) {
    animate(copy, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 200,
      easing: ctx.OUT,
    });
  }
  if (stepsBar)
    animate(stepsBar, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 200,
      easing: ctx.OUT,
    });

  if (!degenerate) {
    /* 单位圆展台 FLIP 到首页数学对象区域;环面随后成为最终视觉 */
    const from = figure.getBoundingClientRect();
    const to = heroFigure.getBoundingClientRect();
    if (from.width > 0 && to.width > 0) {
      heroFigure.style.opacity = '0';
      // 交接被跳过时也要恢复首页元素(清理函数在自然结束/硬取消都会执行)
      ctx.cleanup(() => {
        heroFigure.style.opacity = '';
      });
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const s = Math.min(1.6, Math.max(0.4, to.width / from.width));
      animate(
        figure,
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          {
            transform: `translate(${dx}px, ${dy}px) scale(${s})`,
            opacity: 0.15,
          },
        ],
        { duration: 460, easing: ctx.IN },
      );
      ctx.wait(500, () => {
        heroFigure.style.opacity = '';
      });
      animate(root, [{ opacity: 1 }, { opacity: 0 }], {
        delay: 80,
        duration: 400,
        easing: 'linear',
      });
      wait(520, () => ctx.finish());
      return;
    }
  }

  /* 移动端 / 测量失败 / resize:整体交叉淡化 */
  for (const el of corners) {
    animate(el, [{ opacity: 0.55 }, { opacity: 0 }], {
      duration: 200,
      easing: ctx.OUT,
    });
  }
  animate(root, [{ opacity: 1 }, { opacity: 0 }], {
    duration: 320,
    easing: 'linear',
  });
  wait(340, () => ctx.finish());
}
