/**
 * 「存档之外」收藏架数据:实体游戏架与存档盒的混合视觉。
 *
 * 每一条对应一款真实在记录的游戏。平台与个人评分在用户确认前
 * 保持 null——收藏架显示空缺「—」,不自动补齐。
 */

export interface ShelfEntry {
  /** games.ts slug */
  game: string;
  /** 收藏架上的私人批注(一句话) */
  note: string;
}

export const SHELF: ShelfEntry[] = [
  {
    game: 'minecraft-create',
    note: '一个还在生长的世界,齿轮越多的地方越安静。',
  },
  {
    game: 'green-hell',
    note: '营地的火堆熄过几次,我就重新点燃过几次。',
  },
  {
    game: 'no-game-series',
    note: '三张卡带都上了架：你和我、逐梦者、莉莉丝。',
  },
];
