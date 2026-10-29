# Binary Search Custom Demo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让读者在二分查找文章中输入自己的严格递增整数数组和目标值，生成可逐步操作的命中或未命中演示，并可随时恢复默认示例。

**Architecture:** 在现有算法数据模块增加纯函数输入解析器，复用 `buildBinarySearchSteps` 生成完整快照。React 岛屿保留 Astro 传入的默认演示，把当前演示与输入草稿分开管理；只有提交合法输入时才替换演示并回到第 0 步。Astro 包装层和路由不变。

**Tech Stack:** Astro 7、React 19、TypeScript、Tailwind CSS 4、Node.js `node:test`、Prettier。

---

## Scope and assumptions

- 数组接受 1–12 个十进制安全整数，元素与目标值都限制在 -999–999。
- 数组可用英文逗号、中文逗号或任意空白分隔，必须严格递增，因此不接受重复值。
- 自定义演示只保留在当前 React 岛屿内，不写入 URL、本地存储或文章数据。
- `src/components/algo/StepVisualizer.astro` 已把 `nums`、`target`、`steps` 全部传给 React，无需修改。
- 不引入新的测试依赖；解析与快照用 Node 测试，React 接线用源码约束测试，交互与响应式用浏览器验收。

### Task 1: Validate and test custom demo input

**Files:**

- Modify: `src/data/algorithm/demos.ts:24-31`
- Create: `tests/algorithm-demo.test.ts`
- Modify: `package.json:6-15`

**Step 1: Write the failing parser and snapshot tests**

Create `tests/algorithm-demo.test.ts` with:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBinarySearchSteps,
  parseBinarySearchInput,
} from '../src/data/algorithm/demos.ts';

test('parses mixed separators and negative integers', () => {
  assert.deepEqual(parseBinarySearchInput(' -8, -3，0  7\n12 ', '7'), {
    nums: [-8, -3, 0, 7, 12],
    target: 7,
  });
});

test('rejects an empty array and an empty target', () => {
  assert.throws(() => parseBinarySearchInput(' ', '1'), /请输入数组/);
  assert.throws(() => parseBinarySearchInput('1, 2', ' '), /请输入目标值/);
});

test('rejects non-decimal and non-integer input', () => {
  assert.throws(() => parseBinarySearchInput('1, 2.5', '2'), /十进制整数/);
  assert.throws(() => parseBinarySearchInput('1, 0x10', '2'), /十进制整数/);
  assert.throws(() => parseBinarySearchInput('1, 2', '1e2'), /十进制整数/);
});

test('rejects duplicate and descending elements', () => {
  assert.throws(
    () => parseBinarySearchInput('1, 2, 2, 4', '2'),
    /严格递增，且不能包含重复值/,
  );
  assert.throws(
    () => parseBinarySearchInput('1, 4, 3', '3'),
    /严格递增，且不能包含重复值/,
  );
});

test('enforces length and numeric display bounds', () => {
  assert.throws(
    () => parseBinarySearchInput('1 2 3 4 5 6 7 8 9 10 11 12 13', '4'),
    /最多包含 12 个/,
  );
  assert.throws(() => parseBinarySearchInput('1, 1000', '2'), /-999 到 999/);
  assert.throws(() => parseBinarySearchInput('1, 2', '-1000'), /-999 到 999/);
  assert.throws(
    () => parseBinarySearchInput('1, 9007199254740992', '2'),
    /-999 到 999/,
  );
});

test('builds a found ending for custom input', () => {
  const { nums, target } = parseBinarySearchInput('1, 3, 5, 7', '5');
  const steps = buildBinarySearchSteps(nums, target);
  assert.equal(steps.at(-1)?.phase, 'found');
  assert.equal(steps.at(-1)?.mid, 2);
});

test('builds a miss ending for custom input', () => {
  const { nums, target } = parseBinarySearchInput('1, 3, 5, 7', '6');
  const steps = buildBinarySearchSteps(nums, target);
  assert.equal(steps.at(-1)?.phase, 'miss');
  assert.equal(steps.at(-1)?.mid, null);
  assert.ok((steps.at(-1)?.left ?? 0) > (steps.at(-1)?.right ?? 0));
});
```

Add this script to `package.json` after `test:live2d`:

```json
"test:algorithm": "node --test tests/algorithm-demo.test.ts",
```

Append the suite to the existing `test` command without removing any existing suite:

```json
"test": "npm run build && npm run test:site && npm run test:game && npm run test:room && npm run test:assistant && npm run test:illustration && npm run test:live2d && npm run test:columns && npm run test:algorithm"
```

**Step 2: Run the new tests to verify they fail**

Run:

```bash
npm run test:algorithm
```

Expected: FAIL because `parseBinarySearchInput` is not exported from `src/data/algorithm/demos.ts`.

**Step 3: Implement the minimal parser**

Add these types and functions immediately before `buildBinarySearchSteps` in `src/data/algorithm/demos.ts`:

```ts
export type BinarySearchInput = {
  nums: number[];
  target: number;
};

function parseDemoInteger(raw: string, label: string): number {
  if (!/^-?\d+$/.test(raw)) {
    throw new Error(`${label}必须是十进制整数`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || Math.abs(value) > 999) {
    throw new Error(`${label}必须在 -999 到 999 之间`);
  }
  return value;
}

/** 解析二分查找演示输入；不合法时抛出可直接展示给读者的错误。 */
export function parseBinarySearchInput(
  rawNums: string,
  rawTarget: string,
): BinarySearchInput {
  if (!rawNums.trim()) {
    throw new Error('请输入数组，包含 1–12 个整数');
  }
  const tokens = rawNums.trim().split(/[，,\s]+/u);
  if (tokens.length > 12) {
    throw new Error('数组最多包含 12 个整数');
  }
  const nums = tokens.map((token) => parseDemoInteger(token, '数组元素'));
  if (nums.some((value, index) => index > 0 && value <= nums[index - 1])) {
    throw new Error('数组必须严格递增，且不能包含重复值');
  }
  if (!rawTarget.trim()) {
    throw new Error('请输入目标值');
  }
  const target = parseDemoInteger(rawTarget.trim(), '目标值');
  return { nums, target };
}
```

Do not change `buildBinarySearchSteps` or the default `DEMOS` data.

**Step 4: Run the parser and snapshot tests**

Run:

```bash
npm run test:algorithm
```

Expected: PASS, 7 tests and 0 failures.

**Step 5: Format and commit the validated data layer**

Run:

```bash
npx --no-install prettier --write src/data/algorithm/demos.ts tests/algorithm-demo.test.ts package.json docs/plans/2026-10-29-binary-search-custom-demo.md
git add src/data/algorithm/demos.ts tests/algorithm-demo.test.ts package.json docs/plans/2026-10-29-binary-search-custom-demo.md
git commit -m "feat: validate custom binary search demos"
```

Expected: one commit containing only the four listed files. Do not add `audit-shots/` or other unrelated worktree changes.

### Task 2: Connect the React form and verify the reader flow

**Files:**

- Modify: `src/components/algo/react/StepVisualizer.tsx:7-83,159-170,296-404`
- Modify: `src/content/blog/binary-search-boundaries.mdx:188-192`
- Test: `tests/algorithm-demo.test.ts`

**Step 1: Add a failing component wiring test**

Append this test to `tests/algorithm-demo.test.ts`:

```ts
test('visualizer wires custom input, accessible errors and example reset', () => {
  const source = readFileSync(
    'src/components/algo/react/StepVisualizer.tsx',
    'utf8',
  );
  assert.ok(source.includes('parseBinarySearchInput(rawNums, rawTarget)'));
  assert.ok(source.includes('buildBinarySearchSteps(next.nums, next.target)'));
  assert.ok(source.includes('role="alert"'));
  assert.ok(source.includes('恢复示例'));
  assert.ok(source.includes('setI(0)'));
});
```

Add the existing Node import used by this test to the top of the same file:

```ts
import { readFileSync } from 'node:fs';
```

**Step 2: Run the wiring test to verify it fails**

Run:

```bash
npm run test:algorithm
```

Expected: FAIL in `visualizer wires custom input, accessible errors and example reset`; the seven data tests still pass.

**Step 3: Add isolated demo state and submit/reset handlers**

Change the data-module import area at the top of `StepVisualizer.tsx` to:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildBinarySearchSteps,
  parseBinarySearchInput,
} from '../../../data/algorithm/demos';
```

Keep the existing props signature. Replace the current state/derivation block (`const [i...` through `const total...`) with:

```ts
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
    setError(cause instanceof Error ? cause.message : '输入无效，请检查后重试');
  }
};

const restoreExample = () => {
  setDemo({ nums, target, steps });
  setRawNums(nums.join(', '));
  setRawTarget(String(target));
  setI(0);
  setError('');
};
```

Replace `const midVal = s.mid !== null ? nums[s.mid] : null;` with:

```ts
const midVal = s.mid !== null ? demo.nums[s.mid] : null;
```

In existing rendering only, make these exact substitutions:

- `nums[s.mid]` → `demo.nums[s.mid]`
- `nums.map((v, idx)` → `demo.nums.map((v, idx)`
- `target = {target}` → `target = {demo.target}`
- `steps.slice(1).map` → `demo.steps.slice(1).map`

Do not replace the props or default-state occurrences of `nums`, `target`, or `steps`.

**Step 4: Add the form and preserve keyboard/touch behavior**

Change the control bar's outer class from `rounded-b-[4px] border border-t-0` to `border border-t-0`, because the new form will become the final rounded section. Change all three existing control buttons from `min-h-[36px]` to `min-h-[44px]`.

Insert this form immediately after the control bar's closing `</div>` and before the root component's closing `</div>`:

```tsx
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
```

Keep `onKeyDown` on the graph group, not on the new form, so pressing arrow keys while editing text does not change steps. Do not add automatic step generation to either input's `onChange`.

Update the paragraph at `src/content/blog/binary-search-boundaries.mdx:190` to:

```mdx
下面默认使用本文的演示数据（`nums = [2,5,8,12,14,18,22,25,30]`，`target = 8`）。用「下一步」或键盘 ←/→ 观察区间收缩，也可以输入自己的严格递增数组与目标值，再点击「生成步骤」：
```

**Step 5: Run component and data tests**

Run:

```bash
npx --no-install prettier --write src/components/algo/react/StepVisualizer.tsx src/content/blog/binary-search-boundaries.mdx tests/algorithm-demo.test.ts
npm run test:algorithm
```

Expected: PASS, 8 tests and 0 failures.

**Step 6: Verify the production build**

Run:

```bash
npm run build
```

Expected: Astro exits 0, builds all pages, and reports no React hydration or TypeScript error.

**Step 7: Verify custom hit, miss, invalid input and reset in the browser**

Start a temporary local server:

```bash
npm run dev -- --host 127.0.0.1 --port 4322
```

Open `http://127.0.0.1:4322/algorithm/notes/binary-search-boundaries/` and verify each case independently:

1. Default graph still starts at step 0 with nine cells and `target = 8`; next, previous and reset retain their original behavior.
2. Enter `1, 3, 5, 7` and `5`, submit, and step to the end: four cells render, `target = 5`, final phase is `命中`, and final `mid = 2`.
3. Replace only the target with `6`, submit, and step to the end: final phase is `未找到`, `mid = —`, and the final interval is empty.
4. Enter `1, 2, 2, 4` and submit: `role="alert"` shows `数组必须严格递增，且不能包含重复值`; the previous custom graph and step remain usable.
5. Click `恢复示例`: both drafts return to the original values, the error disappears, nine cells and `target = 8` return, and step index is 0.
6. Focus the graph and press → then ←: the step changes only while the graph has focus. Focus an input and press ←/→: the text caret behaves normally and the step does not change.

Expected: every case passes without console errors. Stop the temporary server after browser verification; do not leave Node, npm or Astro running.

**Step 8: Verify mobile and desktop layout**

At widths 390 and 1440, with the custom form visible and with an error visible, verify:

- `document.documentElement.scrollWidth <= window.innerWidth`.
- Array cells retain their existing internal horizontal scrolling when needed.
- Form labels and inputs wrap without clipping; all five buttons are at least 44 CSS px high.
- The error remains readable and does not cover the graph or controls.

Expected: no page-level horizontal overflow at either width.

**Step 9: Run the complete regression and formatting checks**

Run:

```bash
npm test && npm run format:check
```

Expected: build succeeds, every existing suite plus `test:algorithm` passes, and Prettier reports all checked files use the correct style.

**Step 10: Commit the reader-facing feature**

Run:

```bash
git add src/components/algo/react/StepVisualizer.tsx src/content/blog/binary-search-boundaries.mdx tests/algorithm-demo.test.ts
git commit -m "feat: add custom input to binary search demo"
git status --short
```

Expected: the commit contains only the three listed files. Any unrelated or untracked audit artifacts remain uncommitted.
