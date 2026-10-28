/**
 * 「数学观象台 · MATH OBSERVATORY」专栏文案与展览数据。
 * 主张:看见那些无法直接看见的结构——每个主题都是一件可以
 * 观察、旋转和拆解的展品。文章列表始终从 blog 内容集合实时
 * 读取,这里只维护展览结构与策展文案。
 */

export const COLUMN = {
  name: '数学观象台',
  en: 'MATH OBSERVATORY',
  claim: '看见那些无法直接看见的结构',
  intro:
    '这里记录数学概念、定理与几何直觉的观测手记。每个主题都是一件展品:可以凑近观察、缓慢旋转、逐层拆解,直到抽象的结构自己显形。',
  updated: '2026.10.26',
  observation: 'OBSERVATION 00',
  /** 展览开放说明(列表页/画廊页头部) */
  hint: '展览持续布展中:先立展签,再补展品,证明与问题同期陈列。',
} as const;

/** 首页底部展览索引条目 */
export interface Exhibit {
  no: string;
  en: string;
  title: string;
  desc: string;
  /** 缩略图种类(MathFigure key) */
  thumb: 'torus' | 'unitcircle' | 'series';
  href: string;
  /** 关联文章数;0 显示「整理中」 */
  count: number;
}

export const EXHIBITS: Exhibit[] = [
  {
    no: '01',
    en: 'TOPOLOGY',
    title: '拓扑学',
    desc: '形变中的不变量',
    thumb: 'torus',
    href: '/math/topics/#t-topology',
    count: 0,
  },
  {
    no: '02',
    en: 'EULER FORMULA',
    title: '欧拉公式',
    desc: '从单位圆出发',
    thumb: 'unitcircle',
    href: '/math/notes/euler-formula/',
    count: 1,
  },
  {
    no: '03',
    en: 'INFINITE SERIES',
    title: '无穷级数',
    desc: '接近一个极限',
    thumb: 'series',
    href: '/math/proofs/#p-basel',
    count: 1,
  },
];

/** 观测主题页章节 */
export interface Topic {
  id: string;
  no: string;
  name: string;
  en: string;
  /** 一句核心问题(珊瑚标记) */
  question: string;
  concepts: string[];
  /** 阅读顺序 */
  order: string[];
  /** 当前整理状态:未开始 | 观测中 | 整理中 | 已完成 */
  status: '未开始' | '观测中' | '整理中' | '已完成';
  /** 代表图形(MathFigure key) */
  figure: 'spiral' | 'riemann' | 'grid' | 'unitcircle' | 'torus';
  figureAlt: string;
  /** 可选深链(如欧拉公式展示页) */
  href?: string;
}

export const TOPICS: Topic[] = [
  {
    id: 't-limit',
    no: '01',
    name: '极限',
    en: 'LIMITS',
    question: '无限接近意味着什么',
    concepts: ['数列与收敛', 'ε-δ 语言', '夹逼准则', '发散与爆炸'],
    order: ['极限的定义', '收敛的判别', '级数:离散的极限'],
    status: '观测中',
    figure: 'spiral',
    figureAlt: '不断向中心收拢的方形螺旋,表示数列收敛',
  },
  {
    id: 't-calculus',
    no: '02',
    name: '微积分',
    en: 'CALCULUS',
    question: '变化如何累积',
    concepts: ['导数即斜率', '积分即面积', '微积分基本定理', '泰勒逼近'],
    order: ['割线到切线', '黎曼和', '基本定理', '泰勒展开'],
    status: '观测中',
    figure: 'riemann',
    figureAlt: '曲线下的矩形条逼近曲边梯形面积',
  },
  {
    id: 't-linear',
    no: '03',
    name: '线性代数',
    en: 'LINEAR ALGEBRA',
    question: '空间如何被变换',
    concepts: ['向量与基', '矩阵即变换', '行列式即缩放', '特征向量:不变方向'],
    order: ['向量与基', '矩阵乘法', '行列式', '特征值与特征向量'],
    status: '整理中',
    figure: 'grid',
    figureAlt: '网格被矩阵拉伸成平行四边形',
  },
  {
    id: 't-complex',
    no: '04',
    name: '复数',
    en: 'COMPLEX NUMBERS',
    question: '旋转如何写成代数',
    concepts: ['虚数单位 i', '复平面', '模与辐角', '欧拉公式'],
    order: ['复平面', '模与辐角', '欧拉公式'],
    status: '观测中',
    figure: 'unitcircle',
    figureAlt: '单位圆上的旋转半径与投影',
    href: '/math/notes/euler-formula/',
  },
  {
    id: 't-topology',
    no: '05',
    name: '拓扑学',
    en: 'TOPOLOGY',
    question: '哪些性质在连续形变中保留',
    concepts: ['同胚', '连通性', '基本群', '欧拉示性数'],
    order: ['什么是同胚', '欧拉示性数', '闭曲面的分类'],
    status: '未开始',
    figure: 'torus',
    figureAlt: '环面线框,拓扑学的代表性曲面',
  },
];

/** 证明画廊:证明方法筛选 */
export const PROOF_METHODS = [
  { id: 'all', label: '全部' },
  { id: 'direct', label: '直接证明' },
  { id: 'contradiction', label: '反证法' },
  { id: 'induction', label: '数学归纳法' },
  { id: 'constructive', label: '构造性证明' },
  { id: 'geometric', label: '几何解释' },
] as const;

export type ProofMethodId = (typeof PROOF_METHODS)[number]['id'];

/** 证明画廊条目 */
export interface Proof {
  id: string;
  no: string;
  name: string;
  method: Exclude<ProofMethodId, 'all'>;
  methodLabel: string;
  /** KaTeX 行内/展示公式源码 */
  formula: string;
  minutes: number;
  diagram:
    | 'sqrt2'
    | 'primes'
    | 'ladder'
    | 'basel'
    | 'unitcircle';
  diagramAlt: string;
  note: string;
  href?: string;
}

export const PROOFS: Proof[] = [
  {
    id: 'p-irrational',
    no: 'T-01',
    name: '√2 是无理数',
    method: 'contradiction',
    methodLabel: '反证法',
    formula: '\\sqrt{2}\\notin\\mathbb{Q}',
    minutes: 4,
    diagram: 'sqrt2',
    diagramAlt: '正方形与对角线,长宽不可公度',
    note: '假设 √2 = p/q(既约),平方后推出 p、q 同为偶数,与既约矛盾。',
  },
  {
    id: 'p-primes',
    no: 'T-02',
    name: '素数有无穷多个',
    method: 'contradiction',
    methodLabel: '反证法',
    formula: 'p_{1}p_{2}\\cdots p_{n}+1',
    minutes: 5,
    diagram: 'primes',
    diagramAlt: '数轴上不断向外延伸的素数刻度',
    note: '欧几里得:把已知素数全部相乘再加一,这个新数不被任何已知素数整除。',
  },
  {
    id: 'p-arithmetic',
    no: 'T-03',
    name: '等差数列求和',
    method: 'constructive',
    methodLabel: '构造性证明',
    formula: 'S_{n}=\\frac{n(a_{1}+a_{n})}{2}',
    minutes: 3,
    diagram: 'ladder',
    diagramAlt: '逐级增高的阶梯,首尾配对求和',
    note: '高斯的配对技巧:把数列正着写一遍、倒着写一遍,对应位置相加。',
  },
  {
    id: 'p-basel',
    no: 'T-04',
    name: '巴塞尔问题',
    method: 'geometric',
    methodLabel: '几何解释',
    formula: '\\sum_{n=1}^{\\infty}\\frac{1}{n^{2}}=\\frac{\\pi^{2}}{6}',
    minutes: 8,
    diagram: 'basel',
    diagramAlt: '一层层缩小的圆弧,倒数平方和的几何直观',
    note: '直观入口:倒数平方和可以摆成灯塔式的圆弧堆积,π 从圆里长出来。',
  },
  {
    id: 'p-euler',
    no: 'T-05',
    name: '欧拉公式的几何理解',
    method: 'geometric',
    methodLabel: '几何解释',
    formula: 'e^{i\\theta}=\\cos\\theta+i\\sin\\theta',
    minutes: 9,
    diagram: 'unitcircle',
    diagramAlt: '单位圆上的旋转与投影',
    note: '指数语言与三角语言在单位圆上重合:旋转即指数。',
    href: '/math/notes/euler-formula/',
  },
];

/** 问题本状态 */
export const QUESTION_STATUS = {
  todo: { label: '未开始', symbol: '○' },
  deriving: { label: '推导中', symbol: '◐' },
  verifying: { label: '待验证', symbol: '◑' },
  done: { label: '已解决', symbol: '●' },
} as const;

export type QuestionStatus = keyof typeof QUESTION_STATUS;

export interface Question {
  id: string;
  body: string;
  understanding: string;
  /** 卡住的位置(珊瑚标记) */
  stuck: string;
  concepts: string[];
  lastTry: string;
  status: QuestionStatus;
}

export const QUESTIONS: Question[] = [
  {
    id: 'q-epsilon',
    body: '为什么 ε-δ 定义恰好刻画了「无限接近」?「要多近有多近」如何被严格化?',
    understanding:
      '把 ε 看成挑战者给出的精度要求,δ 是我的回应;对每个 ε 都能给出 δ,才算「接近」。',
    stuck: '邻域语言与数列极限的等价性证明,反向方向总是缺一步。',
    concepts: ['极限', '邻域'],
    lastTry: '2026.10.20 重读《陶哲轩实分析》第 4 章。',
    status: 'deriving',
  },
  {
    id: 'q-eigen',
    body: '特征向量为什么恰好指向「变换后不改变方向」的轴?它和行列式为 0 有什么联系?',
    understanding: '把矩阵看成空间的拉伸,特征向量是拉伸后仍留在原直线上的方向。',
    stuck: '|A−λI|=0 只说明存在非零解,还不能直观看到「不变方向」。',
    concepts: ['线性代数', '特征值'],
    lastTry: '2026.10.22 用 3Blue1Brown 的方式手算了 2×2 例子。',
    status: 'verifying',
  },
  {
    id: 'q-genus',
    body: '亏格 g 的曲面一定能嵌入三维空间吗?克莱因瓶为什么不行?',
    understanding: '环面(亏格 1)可以;克莱因瓶在三维里必然自相交。',
    stuck: '还没有找到「自相交不可避免」的论证入口。',
    concepts: ['拓扑学', '曲面'],
    lastTry: '尚未开始系统阅读,只在展签层面想象过。',
    status: 'todo',
  },
  {
    id: 'q-basel',
    body: '巴塞尔问题里,π 为什么会从整数倒数之和里出现?',
    understanding:
      '几何解释里 π 来自圆:倒数平方和摆成圆弧堆积,总长度被圆周率接管。',
    stuck: '已解决。欧拉的原始插值论证与严格证明都整理进画廊条目。',
    concepts: ['无穷级数', '巴塞尔问题'],
    lastTry: '2026.10.24 整理进证明画廊 T-04。',
    status: 'done',
  },
];

/** 欧拉公式展示页:底部横向推导步骤 */
export interface EulerStep {
  no: string;
  title: string;
  desc: string;
  /** 面板正文 */
  text: string;
  /** 面板公式(KaTeX 展示模式) */
  formula: string;
}

export const EULER_STEPS: EulerStep[] = [
  {
    no: '01',
    title: '单位圆',
    desc: '建立几何舞台',
    text: '在复平面上,到原点距离恒为 1 的点集构成单位圆。它是所有旋转共同的舞台:任何角度都能在圆上找到自己的位置。',
    formula: 'x^{2}+y^{2}=1',
  },
  {
    no: '02',
    title: '弧度与旋转',
    desc: '理解角的度量与旋转',
    text: '弧度制下,角 θ 就是沿圆走过的弧长。从点 (1,0) 出发逆时针旋转 θ,圆上对应的点记为 P。',
    formula: '\\theta=s/r=\\theta',
  },
  {
    no: '03',
    title: '复平面',
    desc: '点与复数的对应',
    text: '复平面把点写成复数:P = (cos θ, sin θ) 对应 z = cos θ + i sin θ。它的模长恒为 1——旋转不改变长度。',
    formula: '\\left|z\\right|=\\sqrt{\\cos^{2}\\theta+\\sin^{2}\\theta}=1',
  },
  {
    no: '04',
    title: '欧拉公式',
    desc: '公式的推导与意义',
    text: '把「旋转 θ 角」这件事写成指数语言,就得到欧拉公式。取 θ = π:旋转半圈到达 (−1, 0),于是 e^{iπ} + 1 = 0。',
    formula: 'e^{i\\pi}+1=0',
  },
];
