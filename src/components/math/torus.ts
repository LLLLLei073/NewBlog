/**
 * 首页环面线框:预计算参数点集,Canvas 每帧重投影。
 * x=(R+r·cos v)·cos u,y=(R+r·cos v)·sin u,z=r·sin v。
 * 慢速自转 + 鼠标轻微视差(只改变观察角度);30fps 节流,
 * 页面隐藏时跳过绘制;prefers-reduced-motion 只画静态帧。
 * 由 onPageLoad 挂载,返回的清理函数在换页时执行。
 */
const R = 3;
const r = 1;
const NU = 36; // 大圆方向划分数
const NV = 14; // 管方向划分数

/* 点集 [iu][iv] = [x, y, z],构建一次复用 */
const PTS: number[][][] = Array.from({ length: NU }, (_, iu) => {
  const u = (iu / NU) * Math.PI * 2;
  return Array.from({ length: NV }, (_, iv) => {
    const v = (iv / NV) * Math.PI * 2;
    return [
      (R + r * Math.cos(v)) * Math.cos(u),
      (R + r * Math.cos(v)) * Math.sin(u),
      r * Math.sin(v),
    ];
  });
});

export function mountTorus(): () => void {
  const canvas = document.querySelector<HTMLCanvasElement>(
    '[data-torus-canvas]',
  );
  if (!canvas) return () => {};
  /* 无 dataset 守卫,理由同 unitCircle:onPageLoad 的两轮触发之间
     会先执行上一轮清理,守卫会把监听与渲染循环清空。 */
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const rmQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let az = -0.9; // 方位角:慢速自转
  const el = 0.5; // 俯仰角:固定低角度观察
  let azOff = 0;
  let elOff = 0; // 鼠标视差(平滑跟随)
  let tAz = 0;
  let tEl = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let last = -1;
  let disposed = false;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    draw();
  };

  /* 环面配色跟随全站主题:暗色=夜间展厅,亮色=日间展厅 */
  const palette = () => {
    const light =
      document.documentElement.getAttribute('data-theme') === 'light';
    return light
      ? {
          line: 'rgba(29, 31, 26, 0.26)',
          axis: 'rgba(29, 31, 26, 0.18)',
          label: 'rgba(92, 96, 83, 0.9)',
          hi: '#5c750d',
        }
      : {
          line: 'rgba(236, 236, 226, 0.24)',
          axis: 'rgba(236, 236, 226, 0.16)',
          label: 'rgba(156, 160, 149, 0.75)',
          hi: '#d7ef72',
        };
  };

  const project = (): number[][] => {
    const out: number[][] = [];
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) / 8.8;
    const ca = Math.cos(az + azOff);
    const sa = Math.sin(az + azOff);
    const ce = Math.cos(el + elOff);
    const se = Math.sin(el + elOff);
    const F = 13;
    for (const ring of PTS) {
      for (const [x0, y0, z0] of ring) {
        const x1 = x0 * ca - y0 * sa;
        const y1 = x0 * sa + y0 * ca;
        const y2 = y1 * ce - z0 * se;
        const z2 = y1 * se + z0 * ce;
        const s = scale * (F / (F - z2));
        out.push([cx + x1 * s, cy - y2 * s, z2]);
      }
    }
    return out;
  };

  const strokePoly = (P: number[][], idx: number[], close: boolean) => {
    ctx.beginPath();
    idx.forEach((k, i) => {
      const [sx, sy] = P[k]!;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    if (close) ctx.closePath();
    ctx.stroke();
  };

  function draw(): void {
    if (w < 2) return;
    const C = palette();
    const P = project();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    /* 低对比度坐标轴 + 标注 */
    const axes: Array<[number[], string]> = [
      [[1.95, 0, 0], 'x(t)'],
      [[0, 1.95, 0], 'y(t)'],
      [[0, 0, 1.6], 'z(t)'],
    ];
    const ca = Math.cos(az + azOff);
    const sa = Math.sin(az + azOff);
    const ce = Math.cos(el + elOff);
    const se = Math.sin(el + elOff);
    const F = 13;
    const scale = Math.min(w, h) / 8.8;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = C.label;
    for (const [v, label] of axes) {
      const [x0, y0, z0] = v as [number, number, number];
      const x1 = x0 * ca - y0 * sa;
      const y1 = x0 * sa + y0 * ca;
      const y2 = y1 * ce - z0 * se;
      const z2 = y1 * se + z0 * ce;
      const s = scale * (F / (F - z2));
      const ex = w / 2 + x1 * s;
      const ey = h / 2 - y2 * s;
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.fillText(label, ex + 4, ey - 4);
    }

    /* 线框:竖圈(固定 v)与横圈(固定 u) */
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    const uIdx = (k: number) =>
      Array.from({ length: NU }, (_, i) => i * NV + ((k % NV) + NV) % NV);
    const vIdx = (k: number) =>
      Array.from({ length: NV }, (_, i) => (((k % NU) + NU) % NU) * NV + i);
    for (let iv = 0; iv < NV; iv++) strokePoly(P, uIdx(iv), true);
    for (let iu = 0; iu < NU; iu++) strokePoly(P, vIdx(iu), false);

    /* 当前参数曲线:黄绿管圈,随方位角缓慢游走 */
    const iuHi =
      (((Math.round(((az + azOff + 1.15) / (Math.PI * 2)) * NU) % NU) + NU) %
        NU);
    ctx.strokeStyle = C.hi;
    ctx.lineWidth = 1.4;
    strokePoly(P, vIdx(iuHi), false);
  }

  const tick = (t: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (document.hidden) {
      last = t;
      return;
    }
    if (last < 0) last = t;
    const dt = Math.min(64, t - last);
    if (t - last < 33) return; // ~30fps
    last = t;
    az += (0.05 * dt) / 1000; // 约 0.05 rad/s 的缓慢自转
    azOff += (tAz - azOff) * 0.05;
    elOff += (tEl - elOff) * 0.05;
    draw();
  };

  const start = () => {
    if (disposed || raf || rmQuery.matches) return;
    last = -1;
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2) return;
    tAz = ((e.clientX - rect.left) / rect.width - 0.5) * 0.16;
    tEl = -((e.clientY - rect.top) / rect.height - 0.5) * 0.1;
  };
  const onLeave = () => {
    tAz = 0;
    tEl = 0;
  };
  const onRMChange = () => {
    if (rmQuery.matches) {
      stop();
      draw();
    } else {
      start();
    }
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  rmQuery.addEventListener('change', onRMChange);
  /* 主题切换时立即换配色重绘(静态帧也生效) */
  const themeMo = new MutationObserver(() => draw());
  themeMo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  if (rmQuery.matches) draw();
  else start();

  return () => {
    disposed = true;
    stop();
    ro.disconnect();
    themeMo.disconnect();
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerleave', onLeave);
    rmQuery.removeEventListener('change', onRMChange);
  };
}
