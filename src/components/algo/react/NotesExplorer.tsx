/**
 * NotesExplorer —— 题解手记列表(演算手稿)。
 * React 岛屿:主题/难度/状态筛选 + 搜索 + 列表↔紧凑表格视图,
 * 筛选状态写入 URL query(可分享/可后退)。横向文章索引,不做卡片墙。
 */
import { useEffect, useMemo, useRef, useState } from 'react';

export type ExplorerNote = {
  slug: string;
  href: string;
  fileNo: string;
  title: string;
  topic: string;
  topicLabel: string;
  topicNo: string;
  difficulty: string;
  difficultyLabel: string;
  status: string;
  statusLabel: string;
  readMinutes: number;
  updated: string;
  takeaway: string;
  /** 搜索语料:标题 + 结论 + 标签 + 题号 + 算法名(小写) */
  haystack: string;
};

export type FilterDef = { id: string; label: string };

type ViewMode = 'list' | 'table';

function useQueryState(onHydrate?: (p: URLSearchParams) => void) {
  // SSR 阶段没有 window:先给空参数,挂载后从地址栏水合
  const [params, setParams] = useState<URLSearchParams>(
    () => new URLSearchParams(),
  );
  const hydrated = useRef(false);

  useEffect(() => {
    const read = () => new URLSearchParams(window.location.search);
    if (!hydrated.current) {
      hydrated.current = true;
      const initial = read();
      setParams(initial);
      onHydrate?.(initial);
    }
    const onPop = () => setParams(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = (
    next: URLSearchParams,
    opts: { replace?: boolean } = { replace: true },
  ) => {
    setParams(next);
    const qs = next.toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    if (opts.replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
  };

  return [params, apply] as const;
}

export default function NotesExplorer({
  notes,
  topics,
  difficulties,
  statuses,
}: {
  notes: ExplorerNote[];
  topics: FilterDef[];
  difficulties: FilterDef[];
  statuses: FilterDef[];
}) {
  const [q, setQ] = useState('');
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [params, apply] = useQueryState((initial) =>
    setQ(initial.get('q') ?? ''),
  );

  // 移动端默认表格?不——默认列表;仅记住显式切换
  const view = (params.get('view') === 'table' ? 'table' : 'list') as ViewMode;

  const topic = params.get('topic') ?? 'all';
  const level = params.get('level') ?? 'all';
  const status = params.get('status') ?? 'all';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    apply(next);
  };

  // 搜索词变化 → 同步 URL(轻量防抖)
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q) next.set('q', q);
      else next.delete('q');
      if (next.toString() !== params.toString()) apply(next);
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return notes.filter((n) => {
      if (topic !== 'all' && n.topic !== topic) return false;
      if (level !== 'all' && n.difficulty !== level) return false;
      if (status !== 'all' && n.status !== status) return false;
      return words.every((w) => n.haystack.includes(w));
    });
  }, [notes, q, topic, level, status]);

  const hasFilter =
    topic !== 'all' || level !== 'all' || status !== 'all' || q.trim() !== '';

  const chip = (
    list: FilterDef[],
    value: string,
    onPick: (v: string) => void,
  ) => (
    <div role="group" className="flex flex-wrap items-center gap-1.5">
      {list.map((f) => (
        <button
          key={f.id}
          aria-pressed={value === f.id}
          onClick={() => onPick(f.id)}
          className={
            'min-h-[32px] cursor-pointer rounded-[3px] border px-2.5 py-1 text-[0.78rem] transition-colors duration-200 ' +
            (value === f.id
              ? 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_9%,transparent)] text-[var(--primary)]'
              : 'border-[var(--border-400)] bg-[var(--background)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]')
          }
        >
          {f.label}
        </button>
      ))}
    </div>
  );

  const statusChip = (n: ExplorerNote) => (
    <span className={`status-chip status-chip-sm`} data-status={n.status}>
      {n.statusLabel}
    </span>
  );

  return (
    <div className="algo-explorer">
      {/* 筛选与搜索 */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="mono-label">主题</span>
            {chip([{ id: 'all', label: '全部' }, ...topics], topic, (v) =>
              setParam('topic', v),
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="mono-label">难度</span>
            {chip([{ id: 'all', label: '全部' }, ...difficulties], level, (v) =>
              setParam('level', v),
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="mono-label">状态</span>
            {chip([{ id: 'all', label: '全部' }, ...statuses], status, (v) =>
              setParam('status', v),
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-md">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索标题、算法名、标签、题号…"
              aria-label="搜索手记"
              className="w-full rounded-[4px] border border-[var(--border-400)] bg-[var(--background)] px-3 py-2 pl-8 text-[0.85rem] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
            <svg
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--muted-foreground)"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.2" y2="16.2" />
            </svg>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="mono-num font-mono text-[0.72rem] text-[var(--muted-foreground)]"
              aria-live="polite"
            >
              {filtered.length} / {notes.length} 篇
            </span>
            <div
              role="group"
              aria-label="视图切换"
              className="flex overflow-hidden rounded-[4px] border border-[var(--border-400)]"
            >
              {(['list', 'table'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  aria-pressed={view === v}
                  onClick={() => setParam('view', v === 'list' ? '' : v)}
                  className={
                    'min-h-[32px] cursor-pointer px-3 py-1 text-[0.78rem] transition-colors duration-200 ' +
                    (view === v
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]')
                  }
                >
                  {v === 'list' ? '列表' : '表格'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="border border-dashed border-[var(--border-400)] px-6 py-14 text-center">
          <p className="font-mono text-[0.85rem] text-[var(--muted-foreground)]">
            没有匹配的手记{hasFilter ? ';试试放宽筛选条件' : ''}。
          </p>
          {hasFilter && (
            <button
              onClick={() => {
                setQ('');
                apply(new URLSearchParams());
              }}
              className="mt-3 min-h-[36px] cursor-pointer rounded-[4px] border border-[var(--border-400)] px-3 py-1.5 text-[0.8rem] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              清除全部筛选
            </button>
          )}
        </div>
      )}

      {/* 列表视图:横向文章索引 */}
      {filtered.length > 0 && view === 'list' && (
        <ol className="divide-y divide-[var(--border)] border-t border-b border-[var(--border)]">
          {filtered.map((n) => {
            const open = openRow === n.slug;
            return (
              <li key={n.slug} className="group">
                <div
                  className="flex cursor-pointer items-baseline gap-4 py-3.5 pr-1 pl-1 transition-colors duration-200 hover:bg-[var(--accent)]"
                  onClick={() => setOpenRow(open ? null : n.slug)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpenRow(open ? null : n.slug);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                >
                  <span className="mono-num w-11 shrink-0 font-mono text-[0.95rem] font-medium text-[var(--primary)]">
                    {n.fileNo}
                  </span>
                  <span className="min-w-0 flex-1">
                    <a
                      href={n.href}
                      className="text-[1.02rem] font-medium text-[var(--foreground)] no-underline hover:text-[var(--primary)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {n.title}
                    </a>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.74rem] text-[var(--muted-foreground)]">
                      <span className="font-mono tracking-[0.06em]">
                        {n.topicNo}·{n.topicLabel}
                      </span>
                      <span>{n.difficultyLabel}</span>
                      {statusChip(n)}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-right font-mono text-[0.72rem] text-[var(--muted-foreground)] sm:block">
                    <span className="block">{n.readMinutes} 分钟</span>
                    <span className="block">{n.updated}</span>
                  </span>
                  <span
                    className={
                      'w-4 shrink-0 text-center font-mono text-[0.7rem] text-[var(--muted-foreground)] transition-transform duration-200 ' +
                      (open ? 'rotate-90' : '')
                    }
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </div>
                {open && (
                  <p className="border-l-2 border-[color-mix(in_srgb,var(--primary)_45%,transparent)] mb-3 ml-1 mr-1 -mt-1 py-2 pl-4 text-[0.86rem] leading-relaxed text-[var(--secondary-foreground)]">
                    <span className="mono-label mr-2">核心结论</span>
                    {n.takeaway}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* 表格视图:紧凑 */}
      {filtered.length > 0 && view === 'table' && (
        <div className="overflow-x-auto border-t border-b border-[var(--border)]">
          <table className="w-full min-w-[680px] border-collapse text-left text-[0.82rem]">
            <thead>
              <tr className="border-b border-[var(--border)] font-mono text-[0.7rem] tracking-[0.1em] text-[var(--muted-foreground)]">
                <th scope="col" className="px-3 py-2.5 font-normal">
                  编号
                </th>
                <th scope="col" className="px-3 py-2.5 font-normal">
                  标题
                </th>
                <th scope="col" className="px-3 py-2.5 font-normal">
                  主题
                </th>
                <th scope="col" className="px-3 py-2.5 font-normal">
                  难度
                </th>
                <th scope="col" className="px-3 py-2.5 font-normal">
                  状态
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-normal">
                  阅读
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-normal">
                  更新
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr
                  key={n.slug}
                  className="border-b border-[var(--border)] transition-colors duration-200 last:border-0 hover:bg-[var(--accent)]"
                >
                  <td className="mono-num px-3 py-2 font-mono text-[var(--primary)]">
                    {n.fileNo}
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={n.href}
                      className="text-[var(--foreground)] no-underline hover:text-[var(--primary)]"
                    >
                      {n.title}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-[var(--muted-foreground)]">
                    {n.topicLabel}
                  </td>
                  <td className="px-3 py-2 text-[var(--muted-foreground)]">
                    {n.difficultyLabel}
                  </td>
                  <td className="px-3 py-2">{statusChip(n)}</td>
                  <td className="mono-num px-3 py-2 text-right font-mono text-[var(--muted-foreground)]">
                    {n.readMinutes} min
                  </td>
                  <td className="mono-num px-3 py-2 text-right font-mono text-[var(--muted-foreground)]">
                    {n.updated}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
