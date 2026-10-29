/**
 * StepVisualizer —— 算法步骤演示器(演算手稿)。
 * React 岛屿:每一步都是构建期生成的完整快照,组件只负责渲染;
 * 默认不自动播放,键盘 ←/→ 可操作,只动画发生变化的部分。
 * 首个实现为二分查找;控制条与状态面板可被其他算法演示复用。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildBinarySearchSteps,
  parseBinarySearchInput,
} from '../../../data/algorithm/demos';

type Phase = 'init' | 'compare' | 'go-right' | 'go-left' | 'found' | 'miss';

export type Step = {
  left: number;
  right: number;
  mid: number | null;
  phase: Phase;
  cond: string;
  note: string;
};

const PHASE_LABEL: Record<Phase, string> = {
  init: '初始化',
  compare: '比较',
  'go-right': '区间右移',
  'go-left': '区间左移',
  found: '命中',
  miss: '未找到',
};

const CELL_W = 56;
const CELL_GAP = 8;
const CELL_H = 52;
const PAD_X = 24;
const CELL_Y = 52;
const SVG_H = 168;

function cellX(i: number, n: number) {
  const w = n * (CELL_W + CELL_GAP) - CELL_GAP + PAD_X * 2;
  const startX = PAD_X;
  return startX + i * (CELL_W + CELL_GAP) + CELL_W / 2;
}
function svgW(n: number) {
  return n * (CELL_W + CELL_GAP) - CELL_GAP + PAD_X * 2;
}

export default function StepVisualizer({
  nums,
  target,
  steps,
}: {
  nums: number[];
  target: number;
  steps: Step[];
}) {
  const [i, setI] = useState(0);
  const [demo, setDemo] = useState({ nums, target, steps });
  const [rawNums, setRawNums] = useState(nums.join(', '));
  const [rawTarget, setRawTarget] = useState(String(target));
  const [error, setError] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const n = demo.nums.length;
  const s = demo.steps[i];
  const total = demo.steps.length - 1;

  const applyCustomDemo = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const next = parseBinarySearchInput(rawNums, rawTarget);
      setDemo({
        ...next,
        steps: buildBinarySearchSteps(next.nums, next.target),
      });
      setI(0);
      setError('');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '输入无效，请检查后重试',
      );
    }
  };

  const restoreExample = () => {
    setDemo({ nums, target, steps });
    setRawNums(nums.join(', '));
    setRawTarget(String(target));
    setI(0);
    setError('');
  };

  const go = useCallback(
    (d: 1 | -1 | 0) => {
      setI((v) => (d === 0 ? 0 : Math.min(total, Math.max(0, v + d))));
    },
    [total],
  );

  // 键盘 ←/→ (焦点在演示器内时)
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  };

  // 焦点自动落在演示器,便于直接用键盘
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  const midVal = s.mid !== null ? demo.nums[s.mid] : null;

  /** 指针:mid 在数组上方,left/right 在下标行下方,避免相互遮挡 */
  const pointer = (
    idx: number,
    label: string,
    color: string,
    side: 'top' | 'bottom',
  ) => {
    // 区间为空时指针可能越界:夹到画布边缘并淡化
    const clamped = Math.max(-0.4, Math.min(n - 0.6, idx));
    const x = cellX(clamped, n);
    const out = idx < 0 || idx > n - 1;
    if (side === 'top') {
      const labelY = 14;
      const arrowEnd = CELL_Y - 4;
      return (
        <g
          transform={`translate(${x}, 0)`}
          style={{
            transition: 'transform 220ms cubic-bezier(0.22,0.61,0.36,1)',
          }}
          opacity={out ? 0.45 : 1}
        >
          <text
            y={labelY}
            textAnchor="middle"
            fontSize="11"
            fontFamily="var(--font-mono)"
            fill={color}
          >
            {label}
          </text>
          <line
            x1="0"
            y1={labelY + 3}
            x2="0"
            y2={arrowEnd - 6}
            stroke={color}
            strokeWidth="1.2"
          />
          <path d={`M 0 ${arrowEnd} l -4 -6 l 8 0 z`} fill={color} />
        </g>
      );
    }
    const idxY = CELL_Y + CELL_H + 20;
    const labelY = idxY + 26;
    const arrowStart = CELL_Y + CELL_H + 4;
    return (
      <g
        transform={`translate(${x}, 0)`}
        style={{ transition: 'transform 220ms cubic-bezier(0.22,0.61,0.36,1)' }}
        opacity={out ? 0.45 : 1}
      >
        <path d={`M 0 ${arrowStart} l -4 6 l 8 0 z`} fill={color} />
        <line
          x1="0"
          y1={arrowStart + 5}
          x2="0"
          y2={labelY - 12}
          stroke={color}
          strokeWidth="1.2"
        />
        <text
          y={labelY}
          textAnchor="middle"
          fontSize="11"
          fontFamily="var(--font-mono)"
          fill={color}
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <div className="algo-stepper not-prose my-8">
      {/* 图形:有序数组 + 下标 + 指针 + 区间 */}
      <div className="overflow-x-auto rounded-t-[4px] border border-b-0 border-[var(--border)] bg-[var(--popover)]">
        <div
          ref={rootRef}
          tabIndex={0}
          role="group"
          aria-label={`二分查找步骤演示,第 ${i} 步,共 ${total} 步,使用左右方向键操作`}
          onKeyDown={onKey}
          className="grid-paper relative min-w-max px-2 py-3 outline-none"
          style={{ minWidth: Math.min(svgW(n) + 16, 660) }}
        >
          <svg
            width={svgW(n)}
            height={SVG_H}
            viewBox={`0 0 ${svgW(n)} ${SVG_H}`}
            role="img"
            aria-label={`有序数组,当前查找区间 [${s.left}, ${s.right}]${
              s.mid !== null ? `,中点下标 ${s.mid}` : ''
            }`}
          >
            <title>二分查找数组状态</title>
            <desc>
              {`数组共 ${n} 个元素,当前区间 [${s.left}, ${s.right}]${
                s.mid !== null
                  ? `,mid = ${s.mid},nums[mid] = ${demo.nums[s.mid]}`
                  : ''
              }。${s.note}`}
            </desc>

            {/* 搜索区间底色 */}
            {s.left <= s.right && (
              <rect
                x={cellX(s.left, n) - CELL_W / 2 - 3}
                y={CELL_Y - 5}
                width={(s.right - s.left) * (CELL_W + CELL_GAP) + CELL_W + 6}
                height={CELL_H + 10}
                rx="5"
                fill="var(--primary)"
                opacity="0.06"
                style={{ transition: 'all 220ms ease' }}
              />
            )}

            {/* 数组单元 */}
            {demo.nums.map((v, idx) => {
              const inRange = idx >= s.left && idx <= s.right;
              const isMid = s.mid === idx;
              const isFound = s.phase === 'found' && isMid;
              return (
                <g
                  key={idx}
                  style={{ transition: 'opacity 220ms ease' }}
                  opacity={inRange ? 1 : 0.3}
                >
                  <rect
                    x={cellX(idx, n) - CELL_W / 2}
                    y={CELL_Y}
                    width={CELL_W}
                    height={CELL_H}
                    rx="4"
                    fill={
                      isFound
                        ? 'var(--algo-teal)'
                        : isMid &&
                            (s.phase === 'compare' || s.phase === 'found')
                          ? 'var(--primary)'
                          : 'var(--background)'
                    }
                    stroke={
                      isFound || (isMid && s.phase === 'compare')
                        ? isFound
                          ? 'var(--algo-teal)'
                          : 'var(--primary)'
                        : 'var(--border-400)'
                    }
                    strokeWidth={isMid || isFound ? 1.8 : 1}
                    strokeDasharray={inRange ? undefined : '3 3'}
                    style={{ transition: 'all 220ms ease' }}
                  />
                  <text
                    x={cellX(idx, n)}
                    y={CELL_Y + CELL_H / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="15"
                    fontFamily="var(--font-mono)"
                    fontWeight={isMid || isFound ? 600 : 400}
                    fill={
                      isFound || (isMid && s.phase === 'compare')
                        ? '#ffffff'
                        : 'var(--foreground)'
                    }
                  >
                    {v}
                  </text>
                  {/* 下标 */}
                  <text
                    x={cellX(idx, n)}
                    y={CELL_Y + CELL_H + 20}
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fill="var(--muted-foreground)"
                  >
                    {idx}
                  </text>
                </g>
              );
            })}

            {/* 指针:mid 上方 / left、right 下方 */}
            {s.mid !== null &&
              s.mid <= n - 1 &&
              s.phase !== 'miss' &&
              pointer(s.mid, 'mid', 'var(--primary)', 'top')}
            {pointer(s.left, 'left', 'var(--algo-teal)', 'bottom')}
            {pointer(s.right, 'right', 'var(--algo-teal)', 'bottom')}

            {/* 命中标记 */}
            {s.phase === 'found' && s.mid !== null && (
              <text
                x={cellX(s.mid, n)}
                y={CELL_Y - 10}
                textAnchor="middle"
                fontSize="10"
                fontFamily="var(--font-mono)"
                fill="var(--algo-teal)"
              >
                ✓ target
              </text>
            )}
          </svg>
        </div>
      </div>

      {/* 状态数据 + 判断语句 */}
      <div className="grid gap-px border-x border-[var(--border)] bg-[var(--border)] sm:grid-cols-[auto_1fr]">
        <div className="bg-[var(--popover)] px-4 py-3 font-mono text-[0.78rem] leading-[1.9]">
          <div>
            <span className="text-[var(--muted-foreground)]">
              left&nbsp;&nbsp;={' '}
            </span>
            <span className="text-[var(--algo-teal)]">{s.left}</span>
          </div>
          <div>
            <span className="text-[var(--muted-foreground)]">
              right&nbsp;={' '}
            </span>
            <span className="text-[var(--algo-teal)]">{s.right}</span>
          </div>
          <div>
            <span className="text-[var(--muted-foreground)]">
              mid&nbsp;&nbsp;&nbsp;={' '}
            </span>
            <span className="text-[var(--primary)]">{s.mid ?? '—'}</span>
          </div>
          <div>
            <span className="text-[var(--muted-foreground)]">nums[mid] = </span>
            <span className="text-[var(--primary)]">{midVal ?? '—'}</span>
          </div>
        </div>
        <div
          className="flex flex-col justify-center bg-[var(--popover)] px-4 py-3"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <span
              className={
                'inline-flex items-center rounded-[3px] border px-1.5 py-0.5 font-mono text-[0.66rem] tracking-[0.08em] ' +
                (s.phase === 'found'
                  ? 'border-[color-mix(in_srgb,var(--algo-teal)_50%,transparent)] text-[var(--algo-teal)]'
                  : s.phase === 'miss'
                    ? 'border-[color-mix(in_srgb,var(--algo-amber)_60%,transparent)] text-[var(--algo-amber-deep)]'
                    : 'border-[color-mix(in_srgb,var(--primary)_45%,transparent)] text-[var(--primary)]')
              }
            >
              {PHASE_LABEL[s.phase]}
            </span>
            <span className="font-mono text-[0.72rem] text-[var(--muted-foreground)]">
              target = {demo.target}
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[0.8rem] text-[var(--foreground)]">
            {s.cond}
          </p>
          <p className="mt-0.5 text-[0.78rem] leading-relaxed text-[var(--muted-foreground)]">
            {s.note}
          </p>
        </div>
      </div>

      {/* 控制条 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-t-0 border-[var(--border)] bg-[var(--popover)] px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => go(-1)}
            disabled={i === 0}
            className="min-h-[44px] cursor-pointer rounded-[4px] border border-[var(--border-400)] bg-[var(--background)] px-3.5 py-1.5 text-[0.8rem] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[var(--border-400)] disabled:hover:text-[var(--foreground)]"
          >
            ← 上一步
          </button>
          <button
            onClick={() => go(1)}
            disabled={i === total}
            className="min-h-[44px] cursor-pointer rounded-[4px] border border-[var(--primary)] bg-[var(--primary)] px-3.5 py-1.5 text-[0.8rem] font-medium text-[var(--primary-foreground)] transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
          >
            下一步 →
          </button>
          <button
            onClick={() => go(0)}
            disabled={i === 0}
            className="min-h-[44px] cursor-pointer rounded-[4px] border border-[var(--border-400)] bg-[var(--background)] px-3.5 py-1.5 text-[0.8rem] text-[var(--muted-foreground)] transition-colors duration-200 hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            ↺ 重置
          </button>
        </div>
        <div className="flex items-center gap-3 font-mono text-[0.72rem] text-[var(--muted-foreground)]">
          <span className="mono-num">
            步骤 {i} / {total}
          </span>
          <span className="hidden sm:inline" aria-hidden="true">
            键盘 ←/→ 可操作
          </span>
          {/* 步数刻度 */}
          <span className="flex items-center gap-[3px]" aria-hidden="true">
            {demo.steps.slice(1).map((_, k) => (
              <span
                key={k}
                className={
                  'h-[6px] w-[6px] rounded-full transition-colors duration-200 ' +
                  (k < i
                    ? 'bg-[var(--primary)]'
                    : k === i
                      ? 'bg-[var(--primary)] opacity-60'
                      : 'bg-[var(--border-400)]')
                }
              />
            ))}
          </span>
        </div>
      </div>

      <form
        onSubmit={applyCustomDemo}
        className="flex flex-wrap items-end gap-3 rounded-b-[4px] border border-t-0 border-[var(--border)] bg-[var(--popover)] px-3 py-3"
      >
        <label className="min-w-0 flex-1 basis-[240px] text-[0.75rem] text-[var(--muted-foreground)]">
          <span className="mb-1.5 block">有序数组</span>
          <input
            value={rawNums}
            onChange={(event) => setRawNums(event.target.value)}
            placeholder="2, 5, 8, 12"
            aria-describedby={error ? 'binary-search-demo-error' : undefined}
            className="min-h-[44px] w-full rounded-[4px] border border-[var(--border-400)] bg-[var(--background)] px-3 font-mono text-[0.8rem] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
          />
        </label>
        <label className="min-w-0 flex-1 basis-[120px] text-[0.75rem] text-[var(--muted-foreground)]">
          <span className="mb-1.5 block">目标值</span>
          <input
            value={rawTarget}
            onChange={(event) => setRawTarget(event.target.value)}
            aria-describedby={error ? 'binary-search-demo-error' : undefined}
            className="min-h-[44px] w-full rounded-[4px] border border-[var(--border-400)] bg-[var(--background)] px-3 font-mono text-[0.8rem] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="min-h-[44px] cursor-pointer rounded-[4px] border border-[var(--primary)] bg-[var(--primary)] px-3.5 text-[0.8rem] font-medium text-[var(--primary-foreground)] transition-opacity duration-200 hover:opacity-90"
          >
            生成步骤
          </button>
          <button
            type="button"
            onClick={restoreExample}
            className="min-h-[44px] cursor-pointer rounded-[4px] border border-[var(--border-400)] bg-[var(--background)] px-3.5 text-[0.8rem] text-[var(--muted-foreground)] transition-colors duration-200 hover:text-[var(--foreground)]"
          >
            恢复示例
          </button>
        </div>
        <p className="w-full text-[0.7rem] leading-relaxed text-[var(--muted-foreground)]">
          输入 1–12 个严格递增整数，范围 -999–999；支持逗号或空格分隔。
        </p>
        {error && (
          <p
            id="binary-search-demo-error"
            role="alert"
            className="w-full text-[0.75rem] leading-relaxed text-[var(--algo-amber-deep)]"
          >
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
