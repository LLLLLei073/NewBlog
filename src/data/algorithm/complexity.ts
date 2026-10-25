/**
 * 复杂度手册数据:常见数据结构操作 / 排序 / 图算法 + 递推式推导。
 * 复杂度统一存字符串(如 'O(1)');空表渲染为 '—'。
 */

export type ComplexityRow = {
  /** 主语(结构名 / 算法名) */
  name: string;
  /** 操作或变体(数据结构表用) */
  op?: string;
  best: string;
  avg: string;
  worst: string;
  space: string;
  /** 稳定性(排序表用):true 稳定 / false 不稳定 */
  stable?: boolean;
  /** 简短适用条件 */
  note: string;
};

export type ComplexitySection = {
  id: string;
  title: string;
  desc: string;
  /** 数据结构表按结构分组显示 op */
  columns: string[];
  rows: ComplexityRow[];
};

export const COMPLEXITY_SECTIONS: ComplexitySection[] = [
  {
    id: 'ds',
    title: '常见数据结构操作',
    desc: '同一结构的不同操作复杂度并不对称;均摊复杂度标注了「均摊」。',
    columns: ['结构 / 操作', '最好', '平均', '最坏', '空间', '适用条件'],
    rows: [
      {
        name: '动态数组',
        op: '按下标访问',
        best: 'O(1)',
        avg: 'O(1)',
        worst: 'O(1)',
        space: 'O(n)',
        note: '内存连续,缓存友好',
      },
      {
        name: '动态数组',
        op: '尾部追加',
        best: 'O(1)',
        avg: 'O(1) 均摊',
        worst: 'O(n)',
        space: 'O(n)',
        note: '扩容时整体搬迁',
      },
      {
        name: '动态数组',
        op: '中间插入 / 删除',
        best: 'O(1)',
        avg: 'O(n)',
        worst: 'O(n)',
        space: 'O(n)',
        note: '需要搬移后续元素',
      },
      {
        name: '链表',
        op: '头插 / 头删',
        best: 'O(1)',
        avg: 'O(1)',
        worst: 'O(1)',
        space: 'O(n)',
        note: '已知结点位置时 O(1)',
      },
      {
        name: '链表',
        op: '按下标访问',
        best: 'O(1)',
        avg: 'O(n)',
        worst: 'O(n)',
        space: 'O(n)',
        note: '只能顺序走',
      },
      {
        name: '哈希表',
        op: '插入 / 查找 / 删除',
        best: 'O(1)',
        avg: 'O(1)',
        worst: 'O(n)',
        space: 'O(n)',
        note: '最坏出现在全体冲突',
      },
      {
        name: '平衡二叉搜索树',
        op: '插入 / 查找 / 删除',
        best: 'O(log n)',
        avg: 'O(log n)',
        worst: 'O(log n)',
        space: 'O(n)',
        note: '有序遍历、前驱后继',
      },
      {
        name: '二叉堆',
        op: '取最值',
        best: 'O(1)',
        avg: 'O(1)',
        worst: 'O(1)',
        space: 'O(n)',
        note: '只维护偏序',
      },
      {
        name: '二叉堆',
        op: '插入 / 弹出',
        best: 'O(1)',
        avg: 'O(log n)',
        worst: 'O(log n)',
        space: 'O(n)',
        note: '自底向上建堆 O(n)',
      },
      {
        name: '栈 / 队列',
        op: '入 / 出',
        best: 'O(1)',
        avg: 'O(1)',
        worst: 'O(1)',
        space: 'O(n)',
        note: '只操作端部',
      },
      {
        name: '并查集',
        op: 'find / union',
        best: 'O(1)',
        avg: 'O(α(n))',
        worst: 'O(α(n))',
        space: 'O(n)',
        note: '路径压缩 + 按秩合并',
      },
    ],
  },
  {
    id: 'sort',
    title: '常见排序算法',
    desc: '稳定性指相等元素相对次序是否保持;下表均按升序约定。',
    columns: ['算法', '最好', '平均', '最坏', '空间', '稳定性', '适用条件'],
    rows: [
      {
        name: '冒泡排序',
        best: 'O(n)',
        avg: 'O(n²)',
        worst: 'O(n²)',
        space: 'O(1)',
        stable: true,
        note: '提前退出可优化最好情况',
      },
      {
        name: '选择排序',
        best: 'O(n²)',
        avg: 'O(n²)',
        worst: 'O(n²)',
        space: 'O(1)',
        stable: false,
        note: '交换次数最少,比较次数固定',
      },
      {
        name: '插入排序',
        best: 'O(n)',
        avg: 'O(n²)',
        worst: 'O(n²)',
        space: 'O(1)',
        stable: true,
        note: '小规模或近乎有序时极快',
      },
      {
        name: '希尔排序',
        best: 'O(n log n)',
        avg: '取决于增量',
        worst: 'O(n²)',
        space: 'O(1)',
        stable: false,
        note: '插入排序的分组改进',
      },
      {
        name: '归并排序',
        best: 'O(n log n)',
        avg: 'O(n log n)',
        worst: 'O(n log n)',
        space: 'O(n)',
        stable: true,
        note: '稳定且性能可预测,适合外排',
      },
      {
        name: '快速排序',
        best: 'O(n log n)',
        avg: 'O(n log n)',
        worst: 'O(n²)',
        space: 'O(log n)',
        stable: false,
        note: '常数小;需随机化避免最坏',
      },
      {
        name: '堆排序',
        best: 'O(n log n)',
        avg: 'O(n log n)',
        worst: 'O(n log n)',
        space: 'O(1)',
        stable: false,
        note: '原地且最坏有保证,但缓存不友好',
      },
      {
        name: '计数排序',
        best: 'O(n + k)',
        avg: 'O(n + k)',
        worst: 'O(n + k)',
        space: 'O(k)',
        stable: true,
        note: 'k 为值域大小,仅限整数',
      },
      {
        name: '基数排序',
        best: 'O(d(n + k))',
        avg: 'O(d(n + k))',
        worst: 'O(d(n + k))',
        space: 'O(n + k)',
        stable: true,
        note: 'd 为最大位数,逐位稳定排序',
      },
    ],
  },
  {
    id: 'graph',
    title: '图算法',
    desc: 'V 为点数,E 为边数;邻接表存储下的复杂度。',
    columns: ['算法', '时间', '空间', '适用条件'],
    rows: [
      {
        name: '广度优先 BFS',
        best: 'O(V + E)',
        avg: 'O(V + E)',
        worst: 'O(V + E)',
        space: 'O(V)',
        note: '无权图最短路、层次遍历',
      },
      {
        name: '深度优先 DFS',
        best: 'O(V + E)',
        avg: 'O(V + E)',
        worst: 'O(V + E)',
        space: 'O(V)',
        note: '连通性、环检测、割点',
      },
      {
        name: '拓扑排序(Kahn)',
        best: 'O(V + E)',
        avg: 'O(V + E)',
        worst: 'O(V + E)',
        space: 'O(V)',
        note: 'DAG 依赖顺序;可判环',
      },
      {
        name: 'Dijkstra(二叉堆)',
        best: 'O((V + E) log V)',
        avg: 'O((V + E) log V)',
        worst: 'O((V + E) log V)',
        space: 'O(V)',
        note: '单源最短路,要求非负权边',
      },
      {
        name: 'Bellman-Ford',
        best: 'O(VE)',
        avg: 'O(VE)',
        worst: 'O(VE)',
        space: 'O(V)',
        note: '允许负权边,可检测负环',
      },
      {
        name: 'Floyd-Warshall',
        best: 'O(V³)',
        avg: 'O(V³)',
        worst: 'O(V³)',
        space: 'O(V²)',
        note: '多源最短路,点少边密',
      },
      {
        name: 'Kruskal',
        best: 'O(E log E)',
        avg: 'O(E log E)',
        worst: 'O(E log E)',
        space: 'O(V)',
        note: '最小生成树,配合并查集',
      },
      {
        name: 'Prim(二叉堆)',
        best: 'O(E log V)',
        avg: 'O(E log V)',
        worst: 'O(E log V)',
        space: 'O(V)',
        note: '最小生成树,适合稠密图',
      },
    ],
  },
];

/** 图算法表时间列合并展示最好/平均/最坏相同时的三列。 */

export type Recurrence = {
  /** 递推式(LaTeX) */
  formula: string;
  /** 结果(LaTeX) */
  result: string;
  /** 对应算法 */
  algo: string;
  /** 一句话推导 */
  derivation: string;
};

export const RECURRENCES: Recurrence[] = [
  {
    formula: 'T(n) = T(n/2) + O(1)',
    result: 'O(\\log n)',
    algo: '二分查找',
    derivation:
      '每轮问题规模减半、只做常数工作,n 轮后规模到 1,共 \\log_2 n 轮。',
  },
  {
    formula: 'T(n) = 2T(n/2) + O(n)',
    result: 'O(n \\log n)',
    algo: '归并排序',
    derivation:
      '递归树每层总工作量 O(n),共 \\log_2 n 层,相乘即得主定理 case 2。',
  },
  {
    formula: 'T(n) = 2T(n/2) + O(1)',
    result: 'O(n)',
    algo: '树的遍历',
    derivation:
      '每层常数工作摊到 2^k 个结点上仍是 O(1)/层?不——叶子数 O(n) 主导,总代价即结点总数。',
  },
  {
    formula: 'T(n) = T(n-1) + O(n)',
    result: 'O(n^2)',
    algo: '快速排序(最坏)',
    derivation:
      '每轮只减少一个元素,第 i 轮工作 n - i,求和 \\sum_{i=1}^{n} i = O(n^2)。',
  },
  {
    formula: 'T(n) = 2T(n-1) + O(1)',
    result: 'O(2^n)',
    algo: '朴素汉诺塔 / 子集枚举',
    derivation: '递归树的结点数按 2 的幂增长,深度 n,总数 2^n - 1。',
  },
  {
    formula: 'T(n) = T(n/2) + O(n)',
    result: 'O(n)',
    algo: '快速选择(平均)',
    derivation: '每轮线性扫描一次,但只剩一半: n + n/2 + n/4 + \\cdots < 2n。',
  },
];
