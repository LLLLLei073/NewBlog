/**
 * 「存档之外」手记的文章级元数据(按 blog 内容集合 slug 索引)。
 *
 * 文章正文仍来自 blog 集合(category: game);这里补充回放式文章页
 * 需要的专属信息:所属游戏、WORLD LOG 编号、剧透策略、评论纸核心
 * 记录与章节时间轴(锚点对应正文里的 gg-anchor 标记)。
 * 没有 meta 的游戏专栏文章会退回简化头部,不缺页。
 */

import type { GameArt } from './games';

export type SpoilerLevel = 'none' | 'mild' | 'heavy';

export const SPOILER_LABEL: Record<SpoilerLevel, string> = {
  none: '无剧透',
  mild: '含轻度剧透',
  heavy: '含关键剧透',
};

export interface ReplayChapter {
  /** 正文内 <span class="gg-anchor" id="..."> 锚点 id */
  id: string;
  label: string;
  /** 时间轴上的装饰时间码(可选) */
  time?: string;
}

export interface GameArticleMeta {
  /** 所属游戏(games.ts slug);专栏公告类文章为 null */
  game: string | null;
  /** 首屏截图上的回放编号,如 WORLD LOG 01 */
  log: string | null;
  /** 记录类型签:建造记录 / 生存记录 / 手记 等 */
  chapterTag: string | null;
  spoiler: SpoilerLevel;
  /** 剧透说明(始终以文字出现,不只靠模糊/遮挡) */
  spoilerNote: string | null;
  /** 私人评价一句话(头部展示;个人评分仅在真实数据时给出) */
  verdict: string | null;
  /** 个人评分:未确认保持 null */
  rating: string | null;
  /** 评论纸:一句核心记录 + 主题 */
  coreNote: string;
  theme: string | null;
  chapters: ReplayChapter[];
  /** 首屏画面:占位插画变体或真实截图 */
  figure: { art?: GameArt; src?: string; alt: string };
}

export const ARTICLE_META: Record<string, GameArticleMeta> = {
  'game-column-intro': {
    game: null,
    log: null,
    chapterTag: '开栏手记',
    spoiler: 'none',
    spoilerNote: null,
    verdict: null,
    rating: null,
    coreNote: '这个专栏从今天开始记账:记录通关以后,仍留在心里的部分。',
    theme: '开栏',
    chapters: [],
    figure: { art: 'meta', alt: '记忆卡与像素对话框的装饰插画' },
  },
  'minecraft-create-first-production-line': {
    game: 'minecraft-create',
    log: 'WORLD LOG 01',
    chapterTag: '建造记录',
    spoiler: 'none',
    spoilerNote: null,
    verdict: '先让机器稳定运转,再考虑把基地做得漂亮。',
    rating: null,
    coreNote: '第一条产线的意义不是产量,而是基地第一次有了自己的节拍。',
    theme: '建造主题:自动化产线',
    chapters: [
      { id: 'ch-world', label: '世界初建', time: '00:00' },
      { id: 'ch-machine', label: '第一台机器', time: '00:48' },
      { id: 'ch-power', label: '动力接入', time: '01:36' },
      { id: 'ch-line', label: '产线运转', time: '02:24' },
      { id: 'ch-expand', label: '基地扩建', time: '03:12' },
    ],
    figure: {
      art: 'create',
      alt: '机械动力基地产线的装饰插画:齿轮、传动带与轴',
    },
  },
};

/** 取文章 meta;未登记的文章返回 null(页面退回简化头部) */
export function getGameArticleMeta(slug: string): GameArticleMeta | null {
  return ARTICLE_META[slug] ?? null;
}
