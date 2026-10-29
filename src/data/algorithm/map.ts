/**
 * 知识地图数据:节点坐标在 1380 × 1040 的画布空间中手工布置,
 * 页面渲染为可缩放平移的 SVG。状态与文章数由 noteSlugs 与
 * frontmatter 共同决定(noteSlugs 指向 blog 集合中的算法手记)。
 */

export type MapGroupId =
  'basics' | 'ds' | 'search-sort' | 'graph' | 'dp' | 'greedy';
export type MapNodeStatus = 'done' | 'reviewing' | 'todo';

export type MapGroup = {
  id: MapGroupId;
  label: string;
  en: string;
  /** 分区左上角 */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MapNode = {
  id: string;
  group: MapGroupId;
  label: string;
  /** 画布坐标(结点中心) */
  x: number;
  y: number;
  status: MapNodeStatus;
  /** 关联手记 slug(文章数量 = 有效篇数) */
  noteSlugs: string[];
  intro: string;
  /** 推荐学习顺序 */
  order: string[];
  /** 常见错误 */
  mistakes: string[];
  /** 下一篇阅读建议 */
  next: { label: string; noteSlug?: string; mapNode?: string };
};

export type MapEdgeType = 'prereq' | 'mastered' | 'explore';

export type MapEdge = { from: string; to: string; type: MapEdgeType };

export const MAP_GROUPS: MapGroup[] = [
  {
    id: 'basics',
    label: '算法基础',
    en: 'FOUNDATIONS',
    x: 60,
    y: 60,
    w: 220,
    h: 940,
  },
  {
    id: 'ds',
    label: '数据结构',
    en: 'DATA STRUCTURES',
    x: 310,
    y: 40,
    w: 230,
    h: 980,
  },
  {
    id: 'search-sort',
    label: '查找与排序',
    en: 'SEARCH & SORT',
    x: 570,
    y: 40,
    w: 230,
    h: 500,
  },
  {
    id: 'dp',
    label: '动态规划',
    en: 'DYNAMIC PROGRAMMING',
    x: 570,
    y: 580,
    w: 230,
    h: 440,
  },
  { id: 'graph', label: '图论', en: 'GRAPHS', x: 840, y: 40, w: 230, h: 700 },
  {
    id: 'greedy',
    label: '贪心',
    en: 'GREEDY',
    x: 1110,
    y: 420,
    w: 230,
    h: 400,
  },
];

export const MAP_NODES: MapNode[] = [
  /* ---- 算法基础 ---- */
  {
    id: 'complexity',
    group: 'basics',
    label: '复杂度分析',
    x: 170,
    y: 160,
    status: 'done',
    noteSlugs: [],
    intro: '把「快不快」变成可以计算的量:操作计数、增长阶与均摊分析。',
    order: [
      '大 O 记号与增长阶',
      '循环与递推式的计数',
      '均摊分析(动态数组扩容)',
      '递归树与主定理',
    ],
    mistakes: [
      '把 O 当成精确运行时间',
      '忽略均摊:误以为每次 append 都是 O(n)',
      '空间复杂度忘记算递归栈',
    ],
    next: { label: '递归与分治', mapNode: 'recursion' },
  },
  {
    id: 'recursion',
    group: 'basics',
    label: '递归与分治',
    x: 170,
    y: 400,
    status: 'done',
    noteSlugs: [],
    intro: '把问题拆成同构子问题;分治再把这些子问题的答案合并回来。',
    order: [
      '递归三要素:定义、边界、收敛',
      '画出递归树',
      '分治:拆分—求解—合并',
      '主定理速查',
    ],
    mistakes: [
      '缺少边界导致无限递归',
      '子问题规模没有变小',
      '忘记合并步骤的代价',
    ],
    next: { label: '排序算法(归并与快排)', mapNode: 'sorting' },
  },
  {
    id: 'invariant',
    group: 'basics',
    label: '不变量思维',
    x: 170,
    y: 640,
    status: 'done',
    noteSlugs: ['dp-invariants'],
    intro: '给算法找到那句「从头到尾都为真」的话,正确性就有了把手。',
    order: [
      '什么是循环不变量',
      '初始化 / 保持 / 终止三段证明',
      '用不变量反推边界写法',
      '把不变量迁移到状态设计',
    ],
    mistakes: [
      '不变量描述的是「希望」而不是「事实」',
      '区间开闭与不变量措辞不一致',
    ],
    next: { label: '用不变量理解动态规划', noteSlug: 'dp-invariants' },
  },

  /* ---- 数据结构 ---- */
  {
    id: 'array-list',
    group: 'ds',
    label: '数组与链表',
    x: 425,
    y: 140,
    status: 'done',
    noteSlugs: [],
    intro: '内存连续与逐结点链接:两种最基本的组织方式,决定访问与插入的代价。',
    order: [
      '下标访问与缓存局部性',
      '链表的指针操作',
      '双指针技巧',
      '临界条件:空表 / 单结点',
    ],
    mistakes: ['链表断链:先存 next 再改指针', '双指针移动条件写反'],
    next: { label: '二分查找', mapNode: 'binary-search' },
  },
  {
    id: 'stack-queue',
    group: 'ds',
    label: '栈与队列',
    x: 425,
    y: 320,
    status: 'done',
    noteSlugs: [],
    intro:
      '只开放端的容器:后进先出与先进先出,天然适合「最近相关性」与「层次推进」。',
    order: [
      '栈:括号匹配 / 撤销栈',
      '队列:广度优先的骨架',
      '双端队列',
      '用数组模拟循环队列',
    ],
    mistakes: ['队空 / 队满判断混用 front 与 rear', '栈操作前忘记判空'],
    next: { label: 'BFS 与 DFS', mapNode: 'bfs-dfs' },
  },
  {
    id: 'hash',
    group: 'ds',
    label: '哈希表',
    x: 425,
    y: 500,
    status: 'done',
    noteSlugs: [],
    intro:
      '用散列把「找」变成「算」:平均 O(1) 的取舍是最坏退化与有序性的丢失。',
    order: [
      '散列函数与冲突处理',
      '拉链 vs 开放寻址',
      '装载因子与扩容',
      '用哈希把两重循环降到一重',
    ],
    mistakes: ['把可变对象直接当键', '忘记最坏 O(n) 的场景'],
    next: { label: '并查集', mapNode: 'union-find' },
  },
  {
    id: 'union-find',
    group: 'ds',
    label: '并查集',
    x: 425,
    y: 680,
    status: 'done',
    noteSlugs: ['union-find-forest'],
    intro: '把等价关系收进森林:近乎常数的合并与查询,是连通类问题的默认工具。',
    order: [
      '森林 + 路径压缩',
      '按秩 / 按大小合并',
      '统计连通分量',
      '离线处理与撤销',
    ],
    mistakes: ['只写路径压缩却忘记判自环', '合并时把根接到了孩子上'],
    next: { label: '并查集:把等价关系收进森林', noteSlug: 'union-find-forest' },
  },
  {
    id: 'mono-stack',
    group: 'ds',
    label: '单调栈',
    x: 425,
    y: 860,
    status: 'todo',
    noteSlugs: ['monotonic-stack'],
    intro:
      '维护一个「越往栈底越极端」的栈,一次遍历回答「下一个更大元素」类问题。',
    order: [
      '模板:什么时候弹栈',
      '下一个更大 / 更小元素',
      '柱状图中最大矩形',
      '与双指针的边界差异',
    ],
    mistakes: ['弹栈条件带等号与否,答案差一位', '忘记处理循环数组场景'],
    next: { label: '单调栈:下一个更大元素', noteSlug: 'monotonic-stack' },
  },

  /* ---- 查找与排序 ---- */
  {
    id: 'binary-search',
    group: 'search-sort',
    label: '二分查找',
    x: 685,
    y: 150,
    status: 'done',
    noteSlugs: ['binary-search-boundaries'],
    intro: '在有序里对半砍:一切争议都源于「区间定义」没有先说清楚。',
    order: [
      '闭区间 [left, right] 模板',
      '不变量证明',
      '左右边界变体',
      '防溢出中点写法',
    ],
    mistakes: [
      'left <= right 与 left < right 混用',
      'mid ± 1 忘掉导致死循环',
      '(left+right)/2 溢出',
    ],
    next: {
      label: '二分查找:边界究竟应该停在哪里?',
      noteSlug: 'binary-search-boundaries',
    },
  },
  {
    id: 'sorting',
    group: 'search-sort',
    label: '排序算法',
    x: 685,
    y: 330,
    status: 'done',
    noteSlugs: [],
    intro: '比较排序的下界是 Ω(n log n);每种排序都是对这个下界的一次不同走法。',
    order: [
      '插入:近乎有序时最快',
      '归并:分治与稳定',
      '快排:partition 思想',
      '桶 / 计数 / 基数',
    ],
    mistakes: [
      '快排不随机化被构造数据卡到 O(n²)',
      '归并的临时数组开在递归内',
      '稳定性误判',
    ],
    next: { label: '快速选择', mapNode: 'quick-select' },
  },
  {
    id: 'quick-select',
    group: 'search-sort',
    label: '快速选择',
    x: 685,
    y: 470,
    status: 'reviewing',
    noteSlugs: [],
    intro: '只递归partition 的一侧:第 k 小元素从 O(n log n) 降到平均 O(n)。',
    order: [
      'partition 两种写法',
      '只深入一侧的递推',
      '最坏与中位数枢轴',
      'BFPRT 简介',
    ],
    mistakes: ['两侧都递归退回快排', 'k 的含义(第 k 小 vs 下标 k)混淆'],
    next: { label: '堆(取 Top-K 的另一条路)', mapNode: 'hash' },
  },

  /* ---- 动态规划 ---- */
  {
    id: 'state',
    group: 'dp',
    label: '状态转移',
    x: 685,
    y: 660,
    status: 'reviewing',
    noteSlugs: ['dp-invariants'],
    intro: '先把「一份数据」定义成「一个状态」,转移方程只是状态之间的契约。',
    order: ['从暴力递归出发', '加记忆化', '定义 dp 数组含义', '按拓扑序填表'],
    mistakes: [
      '状态定义含糊(「前 i 个的答案」说不清包含谁)',
      '初始化与含义不自洽',
      '遍历顺序依赖写反',
    ],
    next: { label: '用不变量理解动态规划', noteSlug: 'dp-invariants' },
  },
  {
    id: 'knapsack',
    group: 'dp',
    label: '背包问题',
    x: 685,
    y: 840,
    status: 'todo',
    noteSlugs: [],
    intro: '预算约束下的取舍模型:0-1、完全与多重,差别只在转移方向。',
    order: ['0-1 背包与倒序枚举', '完全背包与正序', '多维费用', '背包九讲选读'],
    mistakes: [
      '0-1 背包容量写成正序(物品重复选)',
      '初始化「恰好装满」与「不超过」混用',
    ],
    next: { label: '区间 DP', mapNode: 'interval-dp' },
  },
  {
    id: 'interval-dp',
    group: 'dp',
    label: '区间 DP',
    x: 685,
    y: 980,
    status: 'todo',
    noteSlugs: [],
    intro: '以区间为状态:先算短区间,再合并长区间,枚举的是「最后一刀」。',
    order: [
      '状态 f[l][r] 的含义',
      '长度从小到大枚举',
      '断点 k 的循环位置',
      '石子合并模板',
    ],
    mistakes: ['枚举顺序不合拓扑(长区间先于短区间)', '边界 l == r 忘记初始化'],
    next: { label: '区间调度(贪心对照)', mapNode: 'interval-scheduling' },
  },

  /* ---- 图论 ---- */
  {
    id: 'bfs-dfs',
    group: 'graph',
    label: 'BFS 与 DFS',
    x: 955,
    y: 150,
    status: 'done',
    noteSlugs: [],
    intro: '图的两种基本遍历:队列推进的层次感,与栈 / 递归深入的纵深。',
    order: [
      '邻接表表示',
      'BFS 层次与无权最短路',
      'DFS 时间戳',
      '网格图与方向数组',
    ],
    mistakes: [
      '入队时没标 visited(重复入队)',
      '递归 DFS 深图爆栈',
      '网格图下标越界',
    ],
    next: { label: '拓扑排序', mapNode: 'topo' },
  },
  {
    id: 'topo',
    group: 'graph',
    label: '拓扑排序',
    x: 955,
    y: 320,
    status: 'done',
    noteSlugs: [],
    intro: '把 DAG 摊成一条线:依赖顺序即答案;摊不成线,说明有环。',
    order: [
      'Kahn 入度法',
      'DFS 后序逆序',
      '判环:入度队列不满',
      '字典序最小的拓扑序',
    ],
    mistakes: ['输出长度 < n 却不判环', '依赖方向建反'],
    next: { label: '最短路', mapNode: 'shortest-path' },
  },
  {
    id: 'shortest-path',
    group: 'graph',
    label: '最短路',
    x: 955,
    y: 490,
    status: 'done',
    noteSlugs: ['dijkstra-non-negative'],
    intro:
      '从 BFS 到 Dijkstra 再到 Bellman-Ford:权重的引入一步步放松「确定即最优」。',
    order: [
      'BFS:无权最短路',
      'Dijkstra:非负权 + 贪心确定',
      'Bellman-Ford:负权与判环',
      'Floyd:多源',
    ],
    mistakes: [
      'Dijkstra 用于负权图',
      '松弛成功却不入队(懒删除写法)',
      'INF 相加溢出',
    ],
    next: {
      label: 'Dijkstra 为什么要求非负权边',
      noteSlug: 'dijkstra-non-negative',
    },
  },
  {
    id: 'mst',
    group: 'graph',
    label: '最小生成树',
    x: 955,
    y: 660,
    status: 'todo',
    noteSlugs: [],
    intro: '用 n-1 条边连通全图:Kruskal 按边贪心,Prim 按点扩张。',
    order: ['Kruskal + 并查集', '切分定理', 'Prim 堆优化', '次小生成树概念'],
    mistakes: ['并查集合并前忘记判同属一集(成环)', '重边 / 自环处理'],
    next: { label: '并查集(前置)', mapNode: 'union-find' },
  },

  /* ---- 贪心 ---- */
  {
    id: 'interval-scheduling',
    group: 'greedy',
    label: '区间调度',
    x: 1225,
    y: 500,
    status: 'reviewing',
    noteSlugs: [],
    intro: '按右端点排序,能选就选:一组经典得几乎可以背诵的贪心证明。',
    order: [
      '活动选择问题',
      '按右端点排序的证明',
      '区间覆盖 / 分组对照',
      '跳跃游戏类问题',
    ],
    mistakes: [
      '按左端点排序做活动选择',
      '把「最多不相交」与「最少覆盖」的排序键搞混',
    ],
    next: { label: '交换论证', mapNode: 'exchange-arg' },
  },
  {
    id: 'exchange-arg',
    group: 'greedy',
    label: '交换论证',
    x: 1225,
    y: 680,
    status: 'todo',
    noteSlugs: [],
    intro: '证明贪心的通用尺子:任何最优解都能在不变差的前提下换成贪心解。',
    order: ['贪心选择性质', '最优子结构', '交换论证三步式', '反例驱动的边界'],
    mistakes: ['拿「局部看起来对」替代证明', '交换后忘记验证约束仍满足'],
    next: { label: '回到复杂度手册回顾各算法界', mapNode: 'complexity' },
  },
];

export const MAP_EDGES: MapEdge[] = [
  /* 先修关系:实线信号蓝 */
  { from: 'complexity', to: 'array-list', type: 'prereq' },
  { from: 'complexity', to: 'recursion', type: 'prereq' },
  { from: 'array-list', to: 'binary-search', type: 'prereq' },
  { from: 'sorting', to: 'binary-search', type: 'prereq' },
  { from: 'array-list', to: 'sorting', type: 'prereq' },
  { from: 'recursion', to: 'sorting', type: 'prereq' },
  { from: 'sorting', to: 'quick-select', type: 'prereq' },
  { from: 'stack-queue', to: 'bfs-dfs', type: 'prereq' },
  { from: 'recursion', to: 'bfs-dfs', type: 'prereq' },
  { from: 'bfs-dfs', to: 'topo', type: 'prereq' },
  { from: 'bfs-dfs', to: 'shortest-path', type: 'prereq' },
  { from: 'topo', to: 'shortest-path', type: 'prereq' },
  { from: 'union-find', to: 'mst', type: 'prereq' },
  { from: 'array-list', to: 'mono-stack', type: 'prereq' },
  { from: 'stack-queue', to: 'mono-stack', type: 'prereq' },
  { from: 'recursion', to: 'state', type: 'prereq' },
  { from: 'state', to: 'knapsack', type: 'prereq' },
  { from: 'state', to: 'interval-dp', type: 'prereq' },
  { from: 'sorting', to: 'interval-scheduling', type: 'prereq' },
  { from: 'interval-scheduling', to: 'exchange-arg', type: 'prereq' },

  /* 已掌握的关联:虚线青绿 */
  { from: 'invariant', to: 'binary-search', type: 'mastered' },
  { from: 'invariant', to: 'state', type: 'mastered' },
  { from: 'binary-search', to: 'quick-select', type: 'mastered' },
  { from: 'union-find', to: 'hash', type: 'mastered' },
  { from: 'topo', to: 'state', type: 'mastered' },

  /* 待探索的拓展:点线琥珀 */
  { from: 'shortest-path', to: 'mst', type: 'explore' },
  { from: 'knapsack', to: 'interval-dp', type: 'explore' },
  { from: 'interval-dp', to: 'interval-scheduling', type: 'explore' },
  { from: 'hash', to: 'state', type: 'explore' },
  { from: 'exchange-arg', to: 'mst', type: 'explore' },
];

export const MAP_NODE_MAP: Map<string, MapNode> = new Map(
  MAP_NODES.map((n) => [n.id, n]),
);

export const EDGE_TYPE_LABEL: Record<MapEdgeType, string> = {
  prereq: '先修关系',
  mastered: '已掌握的关联',
  explore: '待探索的拓展',
};
