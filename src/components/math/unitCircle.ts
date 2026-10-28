/**
 * 单位圆探索器:θ 滑块 / 播放暂停 / 重置 / 常用角快捷入口,
 * 驱动 SVG 中半径、P 点、角度弧与 cos/sin 投影同步更新。
 * 只更新发生变化的图形属性;默认不自动播放;方向键以 5° 步进;
 * prefers-reduced-motion 下快捷角直接跳转、不播放补间。
 * 由 onPageLoad 挂载,返回对称清理函数。
 */
const CX = 200;
const CY = 200;
const R = 130;
const ARC = 34;
const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;
const KEY_STEP = Math.PI / 36; // 方向键 5°
const SPEED = TAU / 8; // 播放:8 秒一圈

const PI_STEPS: Array<[number, string]> = [
  [0, '0'],
  [Math.PI / 6, 'π/6'],
  [Math.PI / 4, 'π/4'],
  [Math.PI / 3, 'π/3'],
  [HALF_PI, 'π/2'],
  [(2 * Math.PI) / 3, '2π/3'],
  [(3 * Math.PI) / 4, '3π/4'],
  [(5 * Math.PI) / 6, '5π/6'],
  [Math.PI, 'π'],
  [(7 * Math.PI) / 6, '7π/6'],
  [(5 * Math.PI) / 4, '5π/4'],
  [(4 * Math.PI) / 3, '4π/3'],
  [(3 * Math.PI) / 2, '3π/2'],
  [(5 * Math.PI) / 3, '5π/3'],
  [(7 * Math.PI) / 4, '7π/4'],
  [(11 * Math.PI) / 6, '11π/6'],
  [TAU, '2π'],
];

function fmt(x: number): string {
  const s = x.toFixed(2);
  return s === '-0.00' ? '0.00' : s;
}

function piLabel(v: number): string | null {
  for (const [val, label] of PI_STEPS) {
    if (Math.abs(v - val) < 0.012) return label;
  }
  return null;
}

export function mountUnitCircle(): () => void {
  const root = document.querySelector<HTMLElement>('[data-uc]');
  if (!root) return () => {};
  /* 不做 dataset 守卫:onPageLoad 首屏会"立即执行 + astro:page-load
     再执行",第二轮会先跑上一轮的清理(移除监听)再进来,守卫反而
     会把监听清空;onPageLoad 保证同轮不会重入。 */

  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel);
  const radius = $<SVGLineElement>('[data-uc-radius]');
  const point = $<SVGCircleElement>('[data-uc-point]');
  const peak = $<SVGCircleElement>('[data-uc-peak]');
  const arc = $<SVGPathElement>('[data-uc-arc]');
  const arcLabel = $<SVGTextElement>('[data-uc-arc-label]');
  const cosLine = $<SVGLineElement>('[data-uc-cosline]');
  const cosLabel = $<SVGTextElement>('[data-uc-coslabel]');
  const sinLine = $<SVGLineElement>('[data-uc-sinline]');
  const sinLabel = $<SVGTextElement>('[data-uc-sinlabel]');
  const slider = $<HTMLInputElement>('[data-uc-slider]');
  const playBtn = $<HTMLButtonElement>('[data-uc-play]');
  const playText = $<HTMLElement>('[data-uc-play-text]');
  const resetBtn = $<HTMLButtonElement>('[data-uc-reset]');
  const quickBtns = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-uc-quick]'),
  );
  const thVal = $<HTMLElement>('[data-uc-th-val]');
  const degVal = $<HTMLElement>('[data-uc-deg-val]');
  const cosVal = $<HTMLElement>('[data-uc-cos-val]');
  const sinVal = $<HTMLElement>('[data-uc-sin-val]');
  const zVal = $<HTMLElement>('[data-uc-z-val]');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let theta = Math.PI / 3;
  let prevTheta = theta;
  let playing = false;
  let raf = 0;
  let tweenRaf = 0;
  let last = -1;

  const setPlay = (on: boolean) => {
    playing = on;
    playBtn?.setAttribute('aria-pressed', String(on));
    if (playText) playText.textContent = on ? '暂停' : '播放';
    if (!on && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const pulsePeak = () => {
    if (!peak || typeof peak.animate !== 'function') return;
    peak.animate(
      [
        { opacity: 0.9, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(2.4)' },
      ],
      { duration: 520, easing: 'ease-out' },
    );
  };

  const render = () => {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const px = CX + R * c;
    const py = CY - R * s;

    radius?.setAttribute('x2', String(px));
    radius?.setAttribute('y2', String(py));
    point?.setAttribute('cx', String(px));
    point?.setAttribute('cy', String(py));

    if (arc) {
      if (theta < 0.03) {
        arc.setAttribute('opacity', '0');
      } else {
        arc.setAttribute('opacity', '1');
        const large = theta > Math.PI ? 1 : 0;
        arc.setAttribute(
          'd',
          `M ${CX + ARC} ${CY} A ${ARC} ${ARC} 0 ${large} 0 ${
            CX + ARC * c
          } ${CY - ARC * s}`,
        );
      }
    }
    if (arcLabel) {
      const mid = theta / 2;
      arcLabel.setAttribute('x', String(CX + 47 * Math.cos(mid)));
      arcLabel.setAttribute('y', String(CY - 47 * Math.sin(mid) + 4));
    }

    cosLine?.setAttribute('x1', String(px));
    cosLine?.setAttribute('y1', String(py));
    cosLine?.setAttribute('x2', String(px));
    cosLine?.setAttribute('y2', String(CY));
    if (cosLabel) {
      cosLabel.setAttribute('x', String(px));
      cosLabel.setAttribute('y', String(s >= 0 ? CY + 17 : CY - 10));
    }
    sinLine?.setAttribute('x1', String(CX));
    sinLine?.setAttribute('y1', String(py));
    sinLine?.setAttribute('x2', String(px));
    sinLine?.setAttribute('y2', String(py));
    if (sinLabel) {
      sinLabel.setAttribute('x', String((CX + px) / 2));
      sinLabel.setAttribute('y', String(py - 7));
    }

    if (thVal) {
      const label = piLabel(theta);
      thVal.textContent = label
        ? `θ = ${label} ≈ ${theta.toFixed(3)}`
        : `θ = ${theta.toFixed(3)}`;
    }
    if (degVal) {
      degVal.textContent = `≈ ${((theta * 180) / Math.PI).toFixed(0)}°`;
    }
    if (cosVal) cosVal.textContent = `cos θ = ${fmt(c)}`;
    if (sinVal) sinVal.textContent = `sin θ = ${fmt(s)}`;
    if (zVal) {
      zVal.textContent = `z = ${fmt(c)} ${s < 0 ? '−' : '+'} ${fmt(
        Math.abs(s),
      )}i`;
    }
    if (slider) slider.value = String(theta);

    root.classList.toggle('is-identity', Math.abs(theta - Math.PI) < 0.015);

    if ((prevTheta < HALF_PI) !== (theta < HALF_PI)) pulsePeak();
    prevTheta = theta;
  };

  const tick = (t: number) => {
    if (!playing) return;
    raf = requestAnimationFrame(tick);
    if (document.hidden) {
      last = t;
      return;
    }
    if (last < 0) last = t;
    const dt = Math.min(48, t - last);
    last = t;
    theta = Math.min(TAU, theta + (SPEED * dt) / 1000);
    render();
    if (theta >= TAU) setPlay(false);
  };

  const stopTween = () => {
    if (tweenRaf) cancelAnimationFrame(tweenRaf);
    tweenRaf = 0;
  };

  const goTo = (target: number) => {
    const clamped = Math.max(0, Math.min(TAU, target));
    setPlay(false);
    stopTween();
    if (reduced.matches) {
      theta = clamped;
      render();
      return;
    }
    const from = theta;
    const start = performance.now();
    const dur = 240;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      theta = from + (clamped - from) * e;
      render();
      if (k < 1) tweenRaf = requestAnimationFrame(step);
      else tweenRaf = 0;
    };
    tweenRaf = requestAnimationFrame(step);
  };

  const onSliderInput = () => {
    if (!slider) return;
    setPlay(false);
    stopTween();
    theta = Math.max(0, Math.min(TAU, parseFloat(slider.value) || 0));
    render();
  };
  const onSliderKey = (e: KeyboardEvent) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!keys.includes(e.key) && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    setPlay(false);
    stopTween();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown')
      theta = Math.max(0, theta - KEY_STEP);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp')
      theta = Math.min(TAU, theta + KEY_STEP);
    else if (e.key === 'Home') theta = 0;
    else theta = TAU;
    render();
  };
  const onPlay = () => {
    stopTween();
    if (playing) {
      setPlay(false);
      return;
    }
    if (theta >= TAU - 1e-4) theta = 0;
    setPlay(true);
    last = -1;
    raf = requestAnimationFrame(tick);
  };
  const onReset = () => goTo(0);
  const onQuick = (e: MouseEvent) => {
    const btn = (e.currentTarget as HTMLElement).dataset.ucQuick;
    if (!btn) return;
    goTo(parseFloat(btn));
  };

  slider?.addEventListener('input', onSliderInput);
  slider?.addEventListener('keydown', onSliderKey);
  playBtn?.addEventListener('click', onPlay);
  resetBtn?.addEventListener('click', onReset);
  quickBtns.forEach((b) => b.addEventListener('click', onQuick));
  render();

  return () => {
    setPlay(false);
    stopTween();
    slider?.removeEventListener('input', onSliderInput);
    slider?.removeEventListener('keydown', onSliderKey);
    playBtn?.removeEventListener('click', onPlay);
    resetBtn?.removeEventListener('click', onReset);
    quickBtns.forEach((b) => b.removeEventListener('click', onQuick));
  };
}
