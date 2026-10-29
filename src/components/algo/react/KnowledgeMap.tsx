/**
 * KnowledgeMap —— 算法知识地图(演算手稿)。
 * React 岛屿:SVG 节点关系图,滚轮缩放 + 拖拽平移;hover 突出关联边,
 * 点击选中平滑移动视野并在侧栏展开主题详情;提供普通列表视图,
 * 移动端默认列表。边的三态用线型区分(不只靠颜色)。
 */
import { useEffect, useMemo, useRef, useState } from 'react';

export type KmGroup = {
  id: string;
  label: string;
  en: string;
  x: number;
  y: number;
  w: number;
  h: number;
};
export type KmArticle = { title: string; href: string; fileNo: string };
export type KmNode = {
  id: string;
  group: string;
  label: string;
  x: number;
  y: number;
  status: 'done' | 'reviewing' | 'todo';
  articles: KmArticle[];
  intro: string;
  order: string[];
  mistakes: string[];
  next: { label: string; href?: string; mapNode?: string };
};
export type KmEdge = {
  from: string;
  to: string;
  type: 'prereq' | 'mastered' | 'explore';
};

const NW = 210;
const NH = 64;
const CANVAS = { w: 1380, h: 1040 };

const STATUS_LABEL = {
  done: '已整理',
  reviewing: '复习中',
  todo: '待补充',
} as const;
const EDGE_STYLE = {
  prereq: { label: '先修关系', dash: '' as string, color: 'var(--primary)' },
  mastered: { label: '已掌握的关联', dash: '6 4', color: 'var(--algo-teal)' },
  explore: { label: '待探索的拓展', dash: '2 5', color: 'var(--algo-amber)' },
} as const;

/** 线段与节点矩形边界的交点(两端各留 6px 空隙) */
function edgePoints(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const tx = dx !== 0 ? (NW / 2 + 7) / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? (NH / 2 + 7) / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  return {
    x1: a.x + dx * t,
    y1: a.y + dy * t,
    x2: b.x - dx * t,
    y2: b.y - dy * t,
  };
}

type ViewMode = 'graph' | 'list';
type Xform = { x: number; y: number; k: number };

export default function KnowledgeMap({
  groups,
  nodes,
  edges,
}: {
  groups: KmGroup[];
  nodes: KmNode[];
  edges: KmEdge[];
}) {
  const isMobile = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 760px)').matches;
  // 支持从文章「在知识地图中查看」深链进来:?node=<id>
  const initialNode = () => {
    if (typeof window === 'undefined') return null;
    const id = new URLSearchParams(window.location.search).get('node');
    return id && nodes.some((n) => n.id === id) ? id : null;
  };
  const [view, setView] = useState<ViewMode>('graph');
  const [selected, setSelected] = useState<string | null>(initialNode);
  const [hovered, setHovered] = useState<string | null>(null);
  const [t, setT] = useState<Xform>({ x: 0, y: 0, k: 1 });
  const [smooth, setSmooth] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    px: number;
    py: number;
    ox: number;
    oy: number;
  } | null>(null);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  useEffect(() => {
    if (isMobile()) setView('list');
  }, []);

  /* ---- 平移与缩放 ---- */
  const clientToCanvas = (cx: number, cy: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scale = Math.min(rect.width / CANVAS.w, rect.height / CANVAS.h);
    const ox = (rect.width - CANVAS.w * scale) / 2;
    const oy = (rect.height - CANVAS.h * scale) / 2;
    return {
      x: (cx - rect.left - ox) / scale,
      y: (cy - rect.top - oy) / scale,
    };
  };

  // 非被动监听 wheel,才能 preventDefault
  useEffect(() => {
    const el = svgRef.current;
    if (!el || view !== 'graph') return;
    let wheelTimer = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setSmooth(false);
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => setSmooth(true), 140);
      const p = clientToCanvas(e.clientX, e.clientY);
      setT((prev) => {
        const k = Math.min(
          2.6,
          Math.max(0.55, prev.k * (e.deltaY < 0 ? 1.12 : 0.89)),
        );
        // 以指针为锚缩放
        return {
          k,
          x: p.x - ((p.x - prev.x) * k) / prev.k,
          y: p.y - ((p.y - prev.y) * k) / prev.k,
        };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.clearTimeout(wheelTimer);
    };
  }, [view]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (view !== 'graph') return;
    setSmooth(false);
    drag.current = { px: e.clientX, py: e.clientY, ox: t.x, oy: t.y };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scale = Math.min(rect.width / CANVAS.w, rect.height / CANVAS.h);
    setT((p) => ({
      ...p,
      x: drag.current!.ox + (e.clientX - drag.current!.px) / scale,
      y: drag.current!.oy + (e.clientY - drag.current!.py) / scale,
    }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const zoomBy = (f: number) =>
    setT((p) => {
      const k = Math.min(2.6, Math.max(0.55, p.k * f));
      const cx = CANVAS.w / 2;
      const cy = CANVAS.h / 2;
      return {
        k,
        x: cx - ((cx - p.x) * k) / p.k,
        y: cy - ((cy - p.y) * k) / p.k,
      };
    });

  /** 平滑移动视野,使节点居中(g 变换:子坐标 c → 画布 c*k + t) */
  const focusNode = (id: string) => {
    const n = nodeMap.get(id);
    if (!n) return;
    const k = 1.15;
    setSmooth(true);
    setT({ k, x: CANVAS.w / 2 - n.x * k, y: CANVAS.h / 2 - n.y * k });
  };

  const selectNode = (id: string) => {
    setSelected(id);
    if (view === 'graph') focusNode(id);
  };

  /* ---- 关联高亮 ---- */
  const activeId = hovered ?? selected;
  const related = useMemo(() => {
    if (!activeId) return null;
    const set = new Set<string>([activeId]);
    for (const e of edges) {
      if (e.from === activeId) set.add(e.to);
      if (e.to === activeId) set.add(e.from);
    }
    return set;
  }, [activeId, edges]);

  const sel = selected ? nodeMap.get(selected) : null;

  const nodeVisual = (n: KmNode) => {
    const isActive = activeId === n.id;
    const dim = related ? !related.has(n.id) : false;
    const done = n.status === 'done';
    return (
      <g
        key={n.id}
        transform={`translate(${n.x - NW / 2}, ${n.y - NH / 2})`}
        opacity={dim ? 0.28 : 1}
        style={{ transition: 'opacity 200ms ease', cursor: 'pointer' }}
        onMouseEnter={() => setHovered(n.id)}
        onMouseLeave={() => setHovered(null)}
        onClick={(e) => {
          e.stopPropagation();
          selectNode(n.id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectNode(n.id);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`${n.label},${STATUS_LABEL[n.status]},${n.articles.length} 篇手记`}
        aria-pressed={selected === n.id}
      >
        <title>{`${n.label}(${STATUS_LABEL[n.status]})`}</title>
        <rect
          width={NW}
          height={NH}
          rx="6"
          fill={isActive ? 'var(--primary)' : 'var(--background)'}
          stroke={
            n.status === 'todo'
              ? 'var(--muted-foreground)'
              : n.status === 'reviewing'
                ? 'var(--algo-amber)'
                : 'var(--algo-teal)'
          }
          strokeWidth={isActive ? 2 : 1.3}
          strokeDasharray={n.status === 'todo' ? '5 3' : undefined}
          style={{ transition: 'fill 180ms ease' }}
        />
        <text
          x={14}
          y={26}
          fontSize="22"
          fontWeight={500}
          fill={isActive ? '#fff' : 'var(--foreground)'}
          style={{ transition: 'fill 180ms ease' }}
        >
          {n.label}
        </text>
        {/* 文章数 + 状态:文字而非仅颜色 */}
        <text
          x={14}
          y={49}
          fontSize="16"
          fontFamily="var(--font-mono)"
          fill={isActive ? 'rgba(255,255,255,0.75)' : 'var(--muted-foreground)'}
        >
          {n.articles.length > 0 ? `${n.articles.length} 篇手记` : '暂无手记'} ·{' '}
          {STATUS_LABEL[n.status]}
        </text>
      </g>
    );
  };

  return (
    <div className="algo-kmap">
      {/* 视图切换 */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div
          role="group"
          aria-label="视图切换"
          className="flex overflow-hidden rounded-[4px] border border-[var(--border-400)]"
        >
          {(['graph', 'list'] as const).map((v) => (
            <button
              key={v}
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={
                'min-h-[34px] cursor-pointer px-4 py-1.5 text-[0.8rem] transition-colors duration-200 ' +
                (view === v
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]')
              }
            >
              {v === 'graph' ? '图形视图' : '列表视图'}
            </button>
          ))}
        </div>
        {view === 'graph' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => zoomBy(1 / 1.25)}
              aria-label="缩小"
              className="h-[34px] w-[34px] cursor-pointer rounded-[4px] border border-[var(--border-400)] bg-[var(--background)] font-mono text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--primary)]"
            >
              −
            </button>
            <button
              onClick={() => zoomBy(1.25)}
              aria-label="放大"
              className="h-[34px] w-[34px] cursor-pointer rounded-[4px] border border-[var(--border-400)] bg-[var(--background)] font-mono text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--primary)]"
            >
              +
            </button>
            <button
              onClick={() => setT({ x: 0, y: 0, k: 1 })}
              className="min-h-[34px] cursor-pointer rounded-[4px] border border-[var(--border-400)] bg-[var(--background)] px-3 text-[0.78rem] text-[var(--muted-foreground)] transition-colors duration-200 hover:text-[var(--foreground)]"
            >
              复位
            </button>
          </div>
        )}
      </div>

      <div
        className={
          view === 'graph'
            ? 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]'
            : ''
        }
      >
        {/* ---- 图形视图 ---- */}
        {view === 'graph' && (
          <div className="grid-paper relative overflow-hidden rounded-[4px] border border-[var(--border)] bg-[var(--popover)]">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`}
              className="block h-[520px] w-full touch-none sm:h-[600px]"
              role="application"
              aria-label="算法知识地图,可拖拽平移、滚轮缩放,点击节点查看详情"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onClick={() => setSelected(null)}
            >
              <title>算法知识地图</title>
              <desc>
                六大分区:算法基础、数据结构、查找与排序、图论、动态规划、贪心;
                实线为先修关系,虚线为已掌握关联,点线为待探索拓展。
              </desc>

              <g
                style={{
                  transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})`,
                  transition: smooth
                    ? 'transform 260ms cubic-bezier(0.22,0.61,0.36,1)'
                    : 'none',
                }}
              >
                {/* 分区背景 */}
                {groups.map((g) => (
                  <g key={g.id}>
                    <rect
                      x={g.x}
                      y={g.y}
                      width={g.w}
                      height={g.h}
                      rx="10"
                      fill="var(--background)"
                      stroke="var(--border)"
                      strokeWidth="1"
                      strokeDasharray="2 6"
                      opacity="0.55"
                    />
                    <text
                      x={g.x + 16}
                      y={g.y + 30}
                      fontSize="20"
                      fill="var(--foreground)"
                      fontWeight="600"
                      opacity="0.85"
                    >
                      {g.label}
                    </text>
                    <text
                      x={g.x + 16}
                      y={g.y + 50}
                      fontSize="13"
                      fontFamily="var(--font-condensed)"
                      letterSpacing="2"
                      fill="var(--muted-foreground)"
                    >
                      {g.en}
                    </text>
                  </g>
                ))}

                {/* 边 */}
                {edges.map((e, idx) => {
                  const a = nodeMap.get(e.from);
                  const b = nodeMap.get(e.to);
                  if (!a || !b) return null;
                  const { x1, y1, x2, y2 } = edgePoints(a, b);
                  const mx = (x1 + x2) / 2;
                  const my = (y1 + y2) / 2;
                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const len = Math.hypot(dx, dy) || 1;
                  // 垂直方向弯曲,避开直线穿过节点
                  const bend = Math.min(26, len * 0.12);
                  const cx = mx - (dy / len) * bend;
                  const cy = my + (dx / len) * bend;
                  const st = EDGE_STYLE[e.type];
                  const lit = activeId
                    ? e.from === activeId || e.to === activeId
                    : false;
                  const dim = activeId ? !lit : false;
                  // 箭头方向(按曲线终点切线近似)
                  const ang = Math.atan2(y2 - cy, x2 - cx);
                  const ax = x2 - Math.cos(ang) * 2;
                  const ay = y2 - Math.sin(ang) * 2;
                  return (
                    <g
                      key={idx}
                      opacity={dim ? 0.15 : lit ? 1 : 0.55}
                      style={{ transition: 'opacity 200ms ease' }}
                    >
                      <path
                        d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                        fill="none"
                        stroke={st.color}
                        strokeWidth={lit ? 2 : 1.4}
                        strokeDasharray={st.dash || undefined}
                        style={{ transition: 'stroke-width 180ms ease' }}
                      />
                      {e.type === 'prereq' && (
                        <path
                          d={`M ${ax} ${ay} l ${-Math.cos(ang - 0.42) * 9} ${-Math.sin(ang - 0.42) * 9} l ${-Math.cos(ang + 0.42) * 9} ${-Math.sin(ang + 0.42) * 9} z`}
                          fill={st.color}
                        />
                      )}
                    </g>
                  );
                })}

                {/* 节点 */}
                {nodes.map(nodeVisual)}
              </g>
            </svg>

            {/* 图例:线型 + 文字 */}
            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1 rounded-[4px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] px-3 py-2 font-mono text-[0.68rem] text-[var(--muted-foreground)]">
              {(Object.keys(EDGE_STYLE) as const).map((k) => (
                <span key={k} className="flex items-center gap-2">
                  <svg width="26" height="6" aria-hidden="true">
                    <line
                      x1="0"
                      y1="3"
                      x2="26"
                      y2="3"
                      stroke={EDGE_STYLE[k].color}
                      strokeWidth="1.6"
                      strokeDasharray={EDGE_STYLE[k].dash || undefined}
                    />
                  </svg>
                  {EDGE_STYLE[k].label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ---- 详情面板 ---- */}
        {view === 'graph' && (
          <aside
            className="top-[calc(var(--header-height)+1rem)] h-fit rounded-[4px] border border-[var(--border)] bg-[var(--popover)] lg:sticky"
            aria-live="polite"
          >
            {sel ? (
              <div className="p-5">
                <p className="mono-label mb-1">
                  TOPIC / {sel.group.toUpperCase()}
                </p>
                <h3 className="mb-2 text-[1.15rem] font-semibold text-[var(--foreground)]">
                  {sel.label}
                </h3>
                <div className="mb-3 flex items-center gap-2">
                  <span className="status-chip" data-status={sel.status}>
                    {STATUS_LABEL[sel.status]}
                  </span>
                  <span className="mono-num font-mono text-[0.72rem] text-[var(--muted-foreground)]">
                    {sel.articles.length} 篇手记
                  </span>
                </div>
                <p className="mb-4 text-[0.85rem] leading-relaxed text-[var(--secondary-foreground)]">
                  {sel.intro}
                </p>

                <p className="mono-label crosshair mb-2">推荐学习顺序</p>
                <ol className="mb-4 list-decimal space-y-1 pl-5 text-[0.82rem] leading-relaxed text-[var(--foreground)]">
                  {sel.order.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ol>

                {sel.articles.length > 0 && (
                  <>
                    <p className="mono-label crosshair mb-2">已发布手记</p>
                    <ul className="mb-4 space-y-1.5">
                      {sel.articles.map((a) => (
                        <li key={a.href}>
                          <a href={a.href} className="algo-link text-[0.84rem]">
                            <span className="mono-num mr-1.5">{a.fileNo}</span>
                            {a.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <p
                  className="mono-label crosshair mb-2"
                  style={{ color: 'var(--algo-amber-deep)' }}
                >
                  常见错误
                </p>
                <ul className="mb-4 list-none space-y-1 pl-0 text-[0.82rem] leading-relaxed text-[var(--secondary-foreground)]">
                  {sel.mistakes.map((m, i) => (
                    <li key={i} className="amber-mark pl-4 -indent-4">
                      {m}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-[var(--border)] pt-3">
                  <p className="mono-label mb-1.5">下一篇阅读建议</p>
                  {sel.next.href ? (
                    <a
                      href={sel.next.href}
                      className="algo-link text-[0.85rem]"
                    >
                      {sel.next.label} →
                    </a>
                  ) : sel.next.mapNode && nodeMap.has(sel.next.mapNode) ? (
                    <button
                      onClick={() => selectNode(sel.next.mapNode!)}
                      className="cursor-pointer border-0 bg-transparent p-0 text-left text-[0.85rem] text-[var(--primary)] underline decoration-dotted underline-offset-4"
                    >
                      {sel.next.label}(地图内) →
                    </button>
                  ) : (
                    <span className="text-[0.85rem] text-[var(--muted-foreground)]">
                      {sel.next.label}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5">
                <p className="mono-label mb-2">HOW TO READ</p>
                <p className="mb-3 text-[0.84rem] leading-relaxed text-[var(--secondary-foreground)]">
                  点击节点查看主题详情:介绍、推荐学习顺序、已发布手记与常见错误;
                  悬停节点会突出它的关联边。拖拽平移,滚轮缩放。
                </p>
                <p className="text-[0.84rem] leading-relaxed text-[var(--secondary-foreground)]">
                  共 {nodes.length} 个主题、
                  {edges.filter((e) => e.type === 'prereq').length} 条先修关系;
                  也可以切换到
                  <button
                    onClick={() => setView('list')}
                    className="cursor-pointer border-0 bg-transparent px-1 text-[var(--primary)] underline underline-offset-4"
                  >
                    列表视图
                  </button>
                  浏览。
                </p>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ---- 列表视图(移动端默认) ---- */}
      {view === 'list' && (
        <div className="space-y-6">
          {groups.map((g) => {
            const list = nodes.filter((n) => n.group === g.id);
            if (list.length === 0) return null;
            return (
              <section key={g.id} aria-labelledby={`kg-${g.id}`}>
                <div className="mb-2 border-b border-[var(--border)] pb-1.5">
                  <h3
                    id={`kg-${g.id}`}
                    className="inline text-[1rem] font-semibold text-[var(--foreground)]"
                  >
                    {g.label}
                  </h3>
                  <span className="mono-label ml-3">{g.en}</span>
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {list.map((n) => (
                    <li
                      key={n.id}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5"
                    >
                      <span className="min-w-[7.5em] text-[0.92rem] font-medium text-[var(--foreground)]">
                        {n.label}
                      </span>
                      <span className="status-chip" data-status={n.status}>
                        {STATUS_LABEL[n.status]}
                      </span>
                      <span className="mono-num font-mono text-[0.7rem] text-[var(--muted-foreground)]">
                        {n.articles.length} 篇
                      </span>
                      {n.articles.map((a) => (
                        <a
                          key={a.href}
                          href={a.href}
                          className="algo-link text-[0.8rem]"
                        >
                          {a.fileNo} {a.title}
                        </a>
                      ))}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
