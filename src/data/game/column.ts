/**
 * 「玩法解剖室 · PLAYLAB」游戏专栏文案与板块数据。
 * 文案与主题清单来自开栏手记(game-column-intro);文章列表始终从
 * blog 内容集合实时读取,这里不重复维护。
 */

export interface GameSection {
  /** 槽位号 */
  slot: string;
  /** 英文小标 */
  en: string;
  title: string;
  /** 一句话说明 */
  note: string;
  items: string[];
}

export const COLUMN = {
  updated: '2026.10.26',
  headline: '玩,也要玩得明白',
  intro:
    '游戏既是娱乐,也是最好的交互艺术。这里从玩家和创作者两个视角聊游戏:拆机制、写代码、做小游戏,也认真记录玩过的每一款。',
  sub: '从 SELECT 到 GAME OVER',
  en: 'PLAY DISSECTION LAB',
  sectionsHint: '四个存档槽对应四类内容,进度条会随着手记慢慢涨。',
} as const;

export const SECTIONS: GameSection[] = [
  {
    slot: 'SLOT 01',
    en: 'DEV',
    title: '游戏开发',
    note: '从零做小游戏:循环、物理、存档与最后一公里。',
    items: [
      '用 Phaser / Godot / Unity 做小游戏',
      '游戏循环:核心骨架',
      '物理与碰撞',
      '存档、音效、UI 收尾',
    ],
  },
  {
    slot: 'SLOT 02',
    en: 'DESIGN',
    title: '设计与拆解',
    note: '为什么好玩:心流、奖励与反馈循环。',
    items: [
      '让人上瘾的机制',
      '马里奥的跳跃、塞尔达的开放世界',
      '关卡设计基本原则',
      '独立游戏赏析',
    ],
  },
  {
    slot: 'SLOT 03',
    en: 'ALGO × GAME',
    title: '算法与游戏',
    note: '经典小游戏背后都是正经算法。',
    items: [
      '贪吃蛇、俄罗斯方块实现',
      'A* 寻路、状态机、行为树',
      '迷宫生成与程序化关卡',
      '游戏 AI 入门',
    ],
  },
  {
    slot: 'SLOT 04',
    en: 'PLAY LOG',
    title: '攻略与心得',
    note: '认真玩过的游戏,值得认真写下来。',
    items: ['深度攻略', '行业观察', '游玩随笔'],
  },
];
