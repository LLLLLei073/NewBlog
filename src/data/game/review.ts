/**
 * 「存档之外」年度回顾:一张可逐段展开的游戏杂志海报。
 *
 * 只在拥有真实数据时才填条目;没有真实内容的奖项保持 null,
 * 显示「留给年末的我」空位。游戏时长、数量、类型统计等数据
 * 不虚构,页面不提供任何仪表盘式图形。
 */

export interface ReviewEntry {
  text: string;
  /** 关联文章或档案锚点(可选) */
  href?: string;
  linkLabel?: string;
}

export interface ReviewSlot {
  key: string;
  no: string;
  icon: 'star' | 'scene' | 'gear' | 'pulse' | 'replay' | 'shots';
  title: string;
  en: string;
  /** 真实条目;null 表示等待年末补全 */
  entry: ReviewEntry | null;
}

export const REVIEW_YEAR = 2026;

export const REVIEW_SLOTS: ReviewSlot[] = [
  {
    key: 'favorite',
    no: '01',
    icon: 'star',
    title: '年度最喜欢的游戏',
    en: 'GAME OF THE YEAR',
    entry: null,
  },
  {
    key: 'scene',
    no: '02',
    icon: 'scene',
    title: '最难忘的场景',
    en: 'THE SCENE',
    entry: null,
  },
  {
    key: 'machine',
    no: '03',
    icon: 'gear',
    title: '最满意的机械结构',
    en: 'BEST MACHINE',
    entry: {
      text: '第一条自动化产线:它让基地第一次有了自己的节拍。',
      href: '/game/notes/minecraft-create-first-production-line/',
      linkLabel: '阅读建造手记',
    },
  },
  {
    key: 'pulse',
    no: '04',
    icon: 'pulse',
    title: '最紧张的一次生存经历',
    en: 'CLOSEST CALL',
    entry: null,
  },
  {
    key: 'replay',
    no: '05',
    icon: 'replay',
    title: '最常重访的游戏',
    en: 'MOST REVISITED',
    entry: null,
  },
  {
    key: 'shots',
    no: '06',
    icon: 'shots',
    title: '个人截图精选',
    en: 'SCREENSHOT PICKS',
    entry: null,
  },
];
