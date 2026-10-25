/**
 * 「演算手稿」主题定义与展示标签。
 * topic 值与 content.config.ts 的 frontmatter 枚举一一对应。
 */

export type TopicId =
  'ds' | 'search-sort' | 'graph' | 'dp' | 'greedy' | 'string' | 'math-bit';

export type Topic = {
  id: TopicId;
  /** 中文名 */
  label: string;
  /** 英文缩写(编号用,如 DS / GRP) */
  abbr: string;
  /** 主题编号,用于文章头部「主题编号」展示 */
  no: string;
  desc: string;
};

export const TOPICS: Topic[] = [
  {
    id: 'ds',
    label: '数据结构',
    abbr: 'DS',
    no: '01',
    desc: '数组、链表、栈、队列、哈希与并查集:先有结构,再谈算法。',
  },
  {
    id: 'search-sort',
    label: '查找与排序',
    abbr: 'SRS',
    no: '02',
    desc: '在有序与无序之间划出界限:二分、排序与它们的不变量。',
  },
  {
    id: 'graph',
    label: '图论',
    abbr: 'GRP',
    no: '03',
    desc: '从表示、遍历到最短路:把关系抽象成点与边之后再思考。',
  },
  {
    id: 'dp',
    label: '动态规划',
    abbr: 'DP',
    no: '04',
    desc: '状态、转移与最优子结构:用不变量理解每一张状态表。',
  },
  {
    id: 'greedy',
    label: '贪心',
    abbr: 'GDY',
    no: '05',
    desc: '局部最优何时推出全局最优:交换论证是常用的尺子。',
  },
  {
    id: 'string',
    label: '字符串',
    abbr: 'STR',
    no: '06',
    desc: '匹配、哈希与自动机:在字符序列上建立索引与记忆。',
  },
  {
    id: 'math-bit',
    label: '数学与位运算',
    abbr: 'MTH',
    no: '07',
    desc: '计数、取模与二进制技巧:让数字本身成为数据结构。',
  },
];

export const TOPIC_MAP: Map<TopicId, Topic> = new Map(
  TOPICS.map((t) => [t.id, t]),
);

export function topicOf(id: string | undefined): Topic | undefined {
  return id ? TOPIC_MAP.get(id as TopicId) : undefined;
}

/* ---- 难度与状态展示标签 ---- */

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: '入门',
  intermediate: '中等',
  advanced: '进阶',
};

export type NoteStatus = 'done' | 'reviewing' | 'todo';
export const STATUS_LABEL: Record<NoteStatus, string> = {
  done: '已整理',
  reviewing: '复习中',
  todo: '待补充',
};
