/**
 * 「存档之外」游戏记录数据。
 *
 * 当前真实游玩内容只有三款:SLOT 01《我的世界》机械动力整合包、
 * SLOT 02《绿色地狱》、SLOT 03「不存在」系列。
 *
 * 硬性约定:整合包版本、模组数量、游戏进度、基地完成度、世界名称、
 * 游戏时长、生存天数、通关状态、"不存在"系列的具体作品名——这些
 * 只在用户本人提供后显示,这里一律不填(null 或显式说明)。
 */

/** 游玩状态(筛选维度,与「正在游玩」页筛选一一对应) */
export type PlayStatus =
  | 'playing' // 正在游玩
  | 'building' // 持续建造
  | 'done' // 已通关
  | 'shelved' // 暂时搁置
  | 'planned' // 计划游玩
  | 'revisiting'; // 持续重访

export const PLAY_STATUS_LABEL: Record<PlayStatus, string> = {
  playing: '正在游玩',
  building: '持续建造',
  done: '已通关',
  shelved: '暂时搁置',
  planned: '计划游玩',
  revisiting: '持续重访',
};

/** 状态色(湖绿/酸性黄/珊瑚之外仅有的状态色,均配文字标签使用) */
export const PLAY_STATUS_TONE: Record<PlayStatus, 'acid' | 'lake' | 'coral'> = {
  playing: 'lake',
  building: 'acid',
  done: 'lake',
  shelved: 'coral',
  planned: 'lake',
  revisiting: 'acid',
};

/** 占位插画变体(GameFigure);用户提供真实截图后由页面直接替换 */
export type GameArt = 'create' | 'wilds' | 'meta';

export interface GameRecord {
  /** 稳定标识:文章元数据、收藏架、页内锚点都用它 */
  slug: string;
  /** 记忆卡槽位号 */
  slot: '01' | '02' | '03';
  title: string;
  /** 存档槽/封面上的英文小字 */
  titleEn: string;
  status: PlayStatus;
  /** 状态签文字;默认取 PLAY_STATUS_LABEL,系列等特殊槽位可覆盖 */
  statusLabel: string;
  /** 一句私人短评(首页存档槽/收藏架批注) */
  quote: string;
  tags: string[];
  /** 收藏架类型筛选值 */
  genres: string[];
  /** 平台:未确认保持 null,显示为「平台待记录」 */
  platform: string | null;
  /** 个人评分:未确认保持 null,显示为「—」 */
  rating: string | null;
  /** 当前阶段描述:只在有真实手记/记录可指时给出 */
  stage: string | null;
  art: GameArt;
  /** 专属档案类型:长期世界档案 / 生存记录 / 系列记录入口 */
  archive: 'world' | 'survival' | 'series';
  /** 该档案区块的中文标题与英文小标 */
  archiveTitle: string;
  archiveEn: string;
  /**
   * 待确认说明:仅"不存在"系列使用——作品名、平台、状态、封面
   * 等待玩家本人确认后逐项补全。
   */
  pendingNote?: string;
}

export const GAMES: GameRecord[] = [
  {
    slug: 'minecraft-create',
    slot: '01',
    title: '《我的世界》机械动力整合包',
    titleEn: 'CREATE · MINECRAFT',
    status: 'building',
    statusLabel: PLAY_STATUS_LABEL.building,
    quote: '把一座基地慢慢变成会自己运转的世界。',
    tags: ['我的世界', '机械动力', '整合包', '沙盒建造', '自动化', '机械结构'],
    genres: ['沙盒建造', '自动化'],
    platform: null,
    rating: null,
    stage: '最新记录:第一条自动化产线(见手记)',
    art: 'create',
    archive: 'world',
    archiveTitle: '长期世界档案',
    archiveEn: 'WORLD ARCHIVE',
  },
  {
    slug: 'green-hell',
    slot: '02',
    title: '《绿色地狱》',
    titleEn: 'GREEN HELL',
    status: 'playing',
    statusLabel: PLAY_STATUS_LABEL.playing,
    quote: '在雨林里，每一点安全感都需要亲手维持。',
    tags: ['绿色地狱', '生存', '雨林', '资源管理', '营地建设'],
    genres: ['生存', '开放世界'],
    platform: null,
    rating: null,
    stage: null,
    art: 'wilds',
    archive: 'survival',
    archiveTitle: '生存记录',
    archiveEn: 'SURVIVAL LOG',
  },
  {
    slug: 'no-game-series',
    slot: '03',
    title: '「不/存在的」系列',
    titleEn: 'THE NOEXISTENCEN SERIES',
    status: 'planned',
    statusLabel: '系列记录中',
    quote: '系列作品已确认——我的游玩记录，一篇一篇补上。',
    tags: ['视觉小说', 'Meta', '心理恐怖', '系列记录'],
    genres: ['视觉小说', 'Meta', '系列'],
    platform: null,
    rating: null,
    stage: '作品清单已确认：3 部',
    art: 'meta',
    archive: 'series',
    archiveTitle: '系列记录入口',
    archiveEn: 'SERIES INDEX',
    pendingNote:
      '系列作品与公开信息已确认(0x0Real Studio 开发 / Nino Games 发行);个人游玩状态、评分与官方封面等待我逐部补全。',
  },
];

/**
 * 「不/存在的」(NOexistenceN)系列作品清单:用户确认的系列,
 * 公开发售信息来自官方商店页与发行商公告。个人游玩状态
 * (status)在用户逐部确认前保持 null,显示「待记录」。
 */
export interface SeriesWork {
  slug: string;
  title: string;
  titleEn: string;
  /** 作品类型(公开定位) */
  kind: string;
  /** 公开平台(已确认部分) */
  platform: string;
  /** 公开发售日期;未确认保持 null */
  released: string | null;
  /** 一句话定位(只描述公开信息,不含剧情评价) */
  note: string;
  /** 个人游玩状态:未记录保持 null */
  status: string | null;
}

export const SERIES_WORKS: SeriesWork[] = [
  {
    slug: 'noexistence-you-and-me',
    title: '《不/存在的你，和我》',
    titleEn: 'The NOexistenceN of You and Me',
    kind: '心理恐怖 · 短篇视觉小说',
    platform: 'Steam · 移动端 · 主机',
    released: '2024/12/15',
    note: '系列起点，官方口径的“爆款作”，后登陆主机平台。',
    status: null,
  },
  {
    slug: 'noexistence-morphean',
    title: '《不/存在的逐梦者：银葱之森》',
    titleEn: 'The NOexistenceN of Morphean Paradox: The Forest of Silver Shallots',
    kind: '视觉小说 × RPG · 公会经营',
    platform: 'Steam（抢先体验）',
    released: '2026/01/19',
    note: '正统续作，玩法转向公会经营与多路线叙事。',
    status: null,
  },
  {
    slug: 'noexistence-lilith',
    title: '《不/存在的莉莉丝》',
    titleEn: 'The NOexistenceN of Lilith',
    kind: '桌面陪伴',
    platform: 'Steam',
    released: null,
    note: '系列衍生企划，桌面陪伴体验。',
    status: null,
  },
];

export const GAME_BY_SLUG: Record<string, GameRecord> = Object.fromEntries(
  GAMES.map((g) => [g.slug, g]),
);

/** 「正在游玩」页的筛选顺序(全部 / 六种状态) */
export const PLAY_FILTERS: { key: PlayStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'playing', label: PLAY_STATUS_LABEL.playing },
  { key: 'building', label: PLAY_STATUS_LABEL.building },
  { key: 'done', label: PLAY_STATUS_LABEL.done },
  { key: 'shelved', label: PLAY_STATUS_LABEL.shelved },
  { key: 'planned', label: PLAY_STATUS_LABEL.planned },
  { key: 'revisiting', label: PLAY_STATUS_LABEL.revisiting },
];
