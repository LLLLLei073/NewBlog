/**
 * 交互步骤演示器的快照数据。
 *
 * 设计约定:每一步都是「完整快照」,由纯函数在构建期生成;
 * 演示组件只负责按快照渲染,不掺杂算法逻辑——同一套控制条
 * 可以复用到 BFS / Dijkstra / DP / 并查集等任何演示。
 */

export type BiSearchPhase =
  'init' | 'compare' | 'go-right' | 'go-left' | 'found' | 'miss';

/** 二分查找单步快照 */
export type BiSearchStep = {
  left: number;
  right: number;
  mid: number | null;
  phase: BiSearchPhase;
  /** 本步的判断语句(展示用) */
  cond: string;
  /** 本步说明 */
  note: string;
};

export type BiSearchDemo = {
  kind: 'binary-search';
  nums: number[];
  target: number;
  steps: BiSearchStep[];
};

/** 闭区间 [left, right] 二分查找:每步落一份完整快照。 */
export function buildBinarySearchSteps(
  nums: number[],
  target: number,
): BiSearchStep[] {
  const steps: BiSearchStep[] = [];
  let left = 0;
  let right = nums.length - 1;

  steps.push({
    left,
    right,
    mid: null,
    phase: 'init',
    cond: `left = 0, right = ${right}`,
    note: `在闭区间 [0, ${right}] 内查找 target = ${target}`,
  });

  while (left <= right) {
    const mid = left + ((right - left) >> 1);
    steps.push({
      left,
      right,
      mid,
      phase: 'compare',
      cond: `nums[${mid}] = ${nums[mid]} 与 target = ${target} 比较`,
      note: `mid = left + (right - left) / 2 = ${mid},答案只可能在 [left, right] = [${left}, ${right}] 内`,
    });

    if (nums[mid] === target) {
      steps.push({
        left,
        right,
        mid,
        phase: 'found',
        cond: `nums[${mid}] == ${target} → 返回 ${mid}`,
        note: `命中:下标 ${mid} 就是目标,共比较 ${steps.filter((s) => s.phase === 'compare').length} 次`,
      });
      return steps;
    }

    if (nums[mid] < target) {
      steps.push({
        left,
        right,
        mid,
        phase: 'go-right',
        cond: `nums[${mid}] = ${nums[mid]} < ${target} → left = mid + 1 = ${mid + 1}`,
        note: `中点偏小,目标只可能在右侧,丢弃左半段(含 mid)`,
      });
      left = mid + 1;
    } else {
      steps.push({
        left,
        right,
        mid,
        phase: 'go-left',
        cond: `nums[${mid}] = ${nums[mid]} > ${target} → right = mid - 1 = ${mid - 1}`,
        note: `中点偏大,目标只可能在左侧,丢弃右半段(含 mid)`,
      });
      right = mid - 1;
    }
  }

  steps.push({
    left,
    right,
    mid: null,
    phase: 'miss',
    cond: `left(${left}) > right(${right}) → 区间为空,返回 -1`,
    note: '循环不变量保证:答案若存在必在 [left, right] 内;区间为空即不存在',
  });
  return steps;
}

/** 已注册的演示集合:文章 frontmatter 的 demo 字段引用这里的 id。 */
export const DEMOS: Record<string, BiSearchDemo> = {
  'binary-search': {
    kind: 'binary-search',
    nums: [2, 5, 8, 12, 14, 18, 22, 25, 30],
    // 取 8(下标 2):第一轮 mid=4 偏大向左收缩,再偏小向右收缩,
    // 左右两个方向的区间更新都能演示到,而非中点一步命中
    target: 8,
    steps: [], // 构建期填充,见下方
  },
};

DEMOS['binary-search'].steps = buildBinarySearchSteps(
  DEMOS['binary-search'].nums,
  DEMOS['binary-search'].target,
);
