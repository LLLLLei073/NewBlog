/**
 * 「耳朵的私人档案」曲库数据。
 *
 * 内容来自本机真实曲库(神椿系虚拟歌手为主)。增删方法:
 * 1. 新音频:文件放进 C:/Users/60421/Music,在 scripts/encode-music.mjs
 *    的 SONGS 里补一条 [文件名, slug],跑 `npm run encode:music`
 *    (自动转码 mp3 到 public/music/archive/ 并更新 src/data/durations.ts);
 * 2. 在下方 TRACKS 补一条曲目记录;
 * 3. 需要进唱片架就建/改 Entry,需要进场景歌单就往对应 Scene 的 trackIds 里加。
 *
 * 短评尽量保持「具体、有记忆」的私人语气,避免空泛形容。
 */
import { DURATIONS } from './durations';

export interface Track {
  /** 曲目 id,即音频 slug */
  id: string;
  title: string;
  /** 展示用艺人,缺省继承条目 */
  artist?: string;
  src: string;
  /** 秒,由 durations.ts 提供 */
  duration: number;
  /** 情绪标签(场景歌单里展示) */
  mood?: string;
  /** 心动曲:曲目表用朱红标记 */
  loved?: boolean;
  /** 一句私人注记(详情页曲目表展示) */
  note?: string;
}

const t = (id: string, title: string, extra: Partial<Track> = {}): Track => ({
  id,
  title,
  src: `/music/archive/${id}.m4a`,
  duration: DURATIONS[id] ?? 0,
  ...extra,
});

export const TRACKS: Track[] = [
  // —— 花譜 ——
  t('kafu-fukakai', '不可解', {
    artist: '花譜',
    mood: '锋利',
    note: '第一句进来的瞬间,房间安静了一个调。',
  }),
  t('kafu-shironri', '私論理', { artist: '花譜', mood: '思辨' }),
  t('kafu-kagami', '鏡よ鏡', { artist: '花譜', mood: '对视' }),
  t('kafu-shinzo', '心臓と絡繰', { artist: '花譜', mood: '机械' }),
  t('kafu-kakio', '過去を喰らう', { artist: '花譜', mood: '消化中' }),
  t('kafu-wasurete', '忘れてしまえ', { artist: '花譜', mood: '嘴硬' }),
  t('kafu-samayoi', '彷徨い', { artist: '花譜', mood: '游荡' }),
  t('kafu-yakobus', '夜行バスにて', {
    artist: '花譜',
    mood: '夜间移动',
    loved: true,
    note: '末班车靠窗的位置,是这首歌的配套设施。',
  }),
  t('kafu-kaerimichi', '帰り路', { artist: '花譜', mood: '归途' }),
  t('kafu-yogafuri', '夜が降り止む前に', {
    artist: '花譜',
    mood: '将明未明',
    loved: true,
    note: '熬夜到这个点,反而会原谅自己。',
  }),
  t('kafu-keshiki', '景色', { artist: '花譜', mood: '窗外' }),
  t('kafu-erika', 'エリカ', { artist: '花譜', mood: '散步' }),
  t('kafu-hitoeni', 'ひとえに壊れて', { artist: '花譜', mood: '脆弱' }),
  t('kafu-majo', '魔女', {
    artist: '花譜',
    mood: '戏剧',
    loved: true,
    note: '副歌像幕布被人一把扯开。',
  }),
  t('kafu-hinadori', '雛鳥', { artist: '花譜', mood: '幼鸟' }),
  t('kafu-ito', '糸', { artist: '花譜', mood: '牵引' }),
  t('kafu-soshitehana', 'そして花になる', { artist: '花譜', mood: '舒展' }),
  t('kafu-mikakunin', '未確認少女進行形', { artist: '花譜', mood: '进行曲' }),
  t('kafu-montage', 'モンタージュ', { artist: '花譜', mood: '剪辑' }),
  t('kafu-meru', 'メルの黄昏', { artist: '花譜', mood: '黄昏' }),
  t('kafu-heroines', 'Re:HEROINES', { artist: '花譜', mood: '群像' }),
  t('kafu-quiz', 'quiz', { artist: '花譜', mood: '提问' }),
  t('kafu-kinormal', '危ノーマル', { artist: '花譜', mood: '临界' }),
  t('kafu-answer', 'アンサー', { artist: '花譜', mood: '回答' }),
  t('kafu-dance-live', 'ダンスが僕の恋人 at I SCREAM LIVE', {
    artist: '花譜',
    mood: '现场',
  }),
  t('kafu-inochi-live', '命に嫌われている at I SCREAM LIVE', {
    artist: '花譜',
    mood: '现场',
    loved: true,
    note: '隔两年重听,键盘声一进来还是会坐直。',
  }),
  t('kafu-lily-live', '明けない夜のリリィ at I SCREAM LIVE', {
    artist: '花譜',
    mood: '现场',
  }),
  // —— V.W.P ——
  t('vwp-dennou', '電脳', {
    artist: 'V.W.P',
    mood: '电子',
    loved: true,
    note: '写代码写到深夜的固定背景音,像主机在自言自语。',
  }),
  t('vwp-shuten', '終点', { artist: 'V.W.P', mood: '到站' }),
  t('vwp-kyomei', '共鳴 (Single Version)', { artist: 'V.W.P', mood: '共振' }),
  t('vwp-henshin', '変身', { artist: 'V.W.P', mood: '变身' }),
  t('vwp-kikai', '機械の声', {
    artist: 'V.W.P × V.I.P',
    mood: '机械',
    note: '人声被拆成零件又装回去的过程。',
  }),
  t('vwp-rinne-ac', '輪廻 (acoustic ver.)', {
    artist: '花譜 / 理芽 / 春猿火 / ヰ世界情緒',
    mood: '不插电',
    loved: true,
    note: '五把声音唱同一句的时候,像在看慢动作烟花。',
  }),
  // —— 合作 ——
  t('faketype-manneri', 'マンネリウィークエンド', {
    artist: 'FAKE TYPE. × 花譜',
    mood: '跳跳跳',
    note: '通勤路上的加速挡,踩点走路专用。',
  }),
  t('rim-candy', 'キャンディーゲリラ', {
    artist: '理芽 × 花譜',
    mood: '甜暴击',
  }),
  t('kafu-rim-mahou', 'まほう', {
    artist: '花譜 × 理芽',
    mood: '咒语',
    loved: true,
    note: '两个声线交替的那几句,耳机分左右听刚好。',
  }),
  t('haru-aien', '愛厭奇縁', {
    artist: '春猿火 × ヰ世界情緒',
    mood: '爱憎',
  }),
  t('kuko-raven', 'レイヴン・フリージア (Live)', {
    artist: '香椎モイミ × 幸祜',
    mood: '现场',
  }),
  // —— ヰ世界情緒 / 明透 / 存流 ——
  t('isekai-sirius', 'シリウスの心臓', {
    artist: 'ヰ世界情緒',
    mood: '闪烁',
  }),
  t('isekai-netsu', '熱異常', {
    artist: 'ヰ世界情緒',
    mood: '发烧',
    loved: true,
    note: '夏天夜里听会起鸡皮疙瘩的那种准。',
  }),
  t('asu-cinnamon', 'Cinnamon', { artist: '明透', mood: '肉桂' }),
  t('asu-bitter', 'ビターエチュード', { artist: '明透', mood: '微苦' }),
  t('sunaru-tokyo', '東京は夜', {
    artist: '存流 × 明透',
    mood: '城市夜',
    loved: true,
    note: '"东京是夜"这四个字本身就是一整首歌。',
  }),
  // —— 可不(KAFU)——
  t('kafu-synth-aidol', 'アイドル', {
    artist: 'tawase × 可不',
    mood: '闪耀',
    loved: true,
    note: '可信度堪忧的自称,但唱得太开心了,信了。',
  }),
  t('kafu-synth-mohana', '燃花', {
    artist: 'ぷろとぽいんと × 可不',
    mood: '绽放',
  }),
  t('kafu-synth-nemurenai', '眠れない夜に想い出を灯して', {
    artist: '海ぶどう × 可不',
    mood: '失眠',
  }),
];

export const TRACK_MAP = new Map(TRACKS.map((track) => [track.id, track]));

/* ============ 唱片架条目 ============ */

export type EntryCategory = '花譜' | '神椿系' | '合作曲' | '虚拟歌手';

export interface Entry {
  slug: string;
  title: string;
  artist: string;
  kind: '私人选辑' | '现场记录' | '合作选辑' | '单曲抽屉';
  /** 条目专属平面色(封套/标记用) */
  accent: string;
  category: EntryCategory;
  rating: number;
  /** 收藏编号,如 A-001 */
  no: string;
  /** 收藏日期 */
  acquired: string;
  /** 真实封面图(预留:填地址即用原图,当前全部留空走档案封套) */
  cover?: string;
  /** 最近收藏(唱片架筛选用) */
  fresh?: boolean;
  /** 一句私人批注(封面 hover 展示) */
  blurb: string;
  /** 前言 */
  intro: string;
  /** 乐评正文(段落);仅主打条目写完整乐评 */
  review?: string[];
  /** 大引用句 */
  quote?: string;
  /** 对照推荐条目 slug */
  cfSlug?: string;
  cfText?: string;
  trackIds: string[];
}

export const ENTRIES: Entry[] = [
  {
    slug: 'kafu-yakobus',
    title: '夜行バスにて',
    artist: '花譜',
    kind: '私人选辑',
    accent: '#B4472E',
    category: '花譜',
    rating: 9.6,
    no: 'A-001',
    acquired: '2025-11-26',
    blurb: '最后一班巴士的窗,是给这组歌预留的。',
    intro:
      '一张写给夜间移动的选辑:上车、靠窗、到站,以及中间那段谁也找不到你的时间。',
    review: [
      '第一次认真听《夜行バスにて》是在末班车上。车里只剩我和司机,玻璃上有一层雾,路灯扫过来的时候整块窗都在晃。花譜的声音有一种"贴着耳朵说话但不看你"的质地,放在那种场景里,连报站的电子音都像是编曲的一部分。',
      '这张选辑的顺序就是我真实的听法:《夜行バスにて》上车,《帰り路》走在小区门口那段,《夜が降り止む前に》留给出门前犹豫要不要再走一圈的自己。《景色》和《エリカ》是白天也成立的歌,但放在这里,它们负责让天亮得慢一点。',
      '《ひとえに壊れて》压轴,是因为到家之后总得有一首歌陪你站在楼下把最后一段听完。这也是我把这些歌装进同一个信封的理由——它们记录的不是某一场演出,而是很多个"今天先到这里"的夜晚。',
    ],
    quote: '巴士到站之前,谁都不必立刻成为大人。',
    cfSlug: 'yoru-no-edge',
    cfText: '如果这六首听完还不够天亮,接着翻隔壁那份《夜のエッジ》。',
    trackIds: [
      'kafu-yakobus',
      'kafu-kaerimichi',
      'kafu-yogafuri',
      'kafu-keshiki',
      'kafu-erika',
      'kafu-hitoeni',
    ],
  },
  {
    slug: 'kafu-fukakai',
    title: '不可解(再考)',
    artist: '花譜',
    kind: '私人选辑',
    accent: '#7E3B2A',
    category: '花譜',
    rating: 9.3,
    no: 'A-002',
    acquired: '2025-11-26',
    blurb: '词没完全听懂,情绪倒是全收到了。',
    intro:
      '把花譜唱功里"锋利"的那一面集中放在一起:自我诘问、镜面、心脏与齿轮。',
    trackIds: [
      'kafu-fukakai',
      'kafu-shironri',
      'kafu-kagami',
      'kafu-shinzo',
      'kafu-kakio',
      'kafu-wasurete',
      'kafu-samayoi',
    ],
  },
  {
    slug: 'kafu-iscream',
    title: 'I SCREAM LIVE 现场记录',
    artist: '花譜',
    kind: '现场记录',
    accent: '#A63D47',
    category: '花譜',
    rating: 9.1,
    no: 'A-003',
    acquired: '2025-11-26',
    blurb: '隔着屏幕,也被淋到的一场雨。',
    intro:
      '三首 I SCREAM LIVE 的现场音源,加上两首录音室版对照。现场的花譜会更"物理"一点:呼吸、气流、还有明显更狠的高音。',
    trackIds: [
      'kafu-inochi-live',
      'kafu-dance-live',
      'kafu-lily-live',
      'kafu-kinormal',
      'kafu-quiz',
    ],
  },
  {
    slug: 'kafu-shoujokei',
    title: '少女形',
    artist: '花譜',
    kind: '单曲抽屉',
    accent: '#A6586B',
    category: '花譜',
    rating: 8.9,
    no: 'A-004',
    acquired: '2025-11-26',
    blurb: '九首排在一起,像一卷没标日期的胶片。',
    intro:
      '剩下的花譜单曲都收在这个抽屉里:从《魔女》的幕布到《Re:HEROINES》的群像,风格跳,但每首都是同一个人。',
    trackIds: [
      'kafu-majo',
      'kafu-mikakunin',
      'kafu-hinadori',
      'kafu-ito',
      'kafu-soshitehana',
      'kafu-montage',
      'kafu-meru',
      'kafu-heroines',
      'kafu-answer',
    ],
  },
  {
    slug: 'vwp-dennou',
    title: '電脳',
    artist: 'V.W.P',
    kind: '私人选辑',
    accent: '#1F2933',
    category: '神椿系',
    rating: 9.0,
    no: 'B-001',
    acquired: '2025-11-26',
    blurb: '像一台旧电脑做了一场关于人间的梦。',
    intro:
      'V.W.P 的电子面:电流、机械声与不插电的《輪廻》收尾——同一个企划的两种电流方向。',
    trackIds: [
      'vwp-dennou',
      'vwp-shuten',
      'vwp-kikai',
      'vwp-kyomei',
      'vwp-henshin',
      'vwp-rinne-ac',
    ],
  },
  {
    slug: 'mahou',
    title: 'まほう(合作选辑)',
    artist: '花譜 / 理芽 / FAKE TYPE. / 春猿火 / 幸祜',
    kind: '合作选辑',
    accent: '#C08A2D',
    category: '合作曲',
    rating: 8.8,
    no: 'B-002',
    acquired: '2025-11-26',
    fresh: true,
    blurb: '跨企划合作的抽屉,每一首都意外地合拍。',
    intro: '最喜欢的几首合作曲:两个声线互相递话的感觉,和独唱完全是两种物种。',
    trackIds: [
      'kafu-rim-mahou',
      'rim-candy',
      'faketype-manneri',
      'haru-aien',
      'kuko-raven',
    ],
  },
  {
    slug: 'yoru-no-edge',
    title: '夜のエッジ',
    artist: '明透 / ヰ世界情緒 / 存流',
    kind: '私人选辑',
    accent: '#2E7D68',
    category: '神椿系',
    rating: 9.2,
    no: 'B-003',
    acquired: '2025-11-26',
    fresh: true,
    blurb: '东京的夜不止一种颜色,这一面比较薄。',
    intro:
      '明透、ヰ世界情緒、存流,三个声线都带"夜色滤镜"的歌。适合音量调到 40%,让房间先暗下来。',
    trackIds: [
      'sunaru-tokyo',
      'asu-bitter',
      'asu-cinnamon',
      'isekai-sirius',
      'isekai-netsu',
    ],
  },
  {
    slug: 'kafu-synth-aidol',
    title: 'アイドル',
    artist: '可不(KAFU)',
    kind: '单曲抽屉',
    accent: '#2E7F9E',
    category: '虚拟歌手',
    rating: 8.6,
    no: 'C-001',
    acquired: '2025-11-26',
    blurb: '花譜的声音种子,开出了另一种花。',
    intro:
      '可不(KAFU)的三首。同一份声源,在不同的作曲家手里长成完全不同的植物。',
    trackIds: ['kafu-synth-aidol', 'kafu-synth-mohana', 'kafu-synth-nemurenai'],
  },
];

/* ============ 场景歌单 ============ */

export interface Scene {
  slug: string;
  title: string;
  en: string;
  desc: string;
  moods: string[];
  /** 便签式 listening note */
  note: string;
  accent: string;
  trackIds: string[];
}

export const SCENES: Scene[] = [
  {
    slug: 'night',
    title: '深夜独处',
    en: 'LATE NIGHT, ALONE',
    desc: '音量调低,灯关掉。这些歌不负责哄睡,只负责陪着。',
    moods: ['安静', '失眠', '耳机'],
    note: '40% 音量 + 靠墙 + 不看手机,是这套歌单的正确打开方式。',
    accent: '#3B5BDB',
    trackIds: [
      'sunaru-tokyo',
      'asu-bitter',
      'kafu-yakobus',
      'isekai-sirius',
      'isekai-netsu',
      'kafu-hitoeni',
    ],
  },
  {
    slug: 'rain',
    title: '雨天散步',
    en: 'RAIN WALK',
    desc: '伞面敲点上拍之后再出发。路线不重要,别太短就行。',
    moods: ['潮湿', '散步', '伞'],
    note: '雨天唯一的好处:所有人都在跑,只有散步的人在看。',
    accent: '#0CA678',
    trackIds: [
      'kafu-erika',
      'asu-cinnamon',
      'kafu-kaerimichi',
      'kafu-synth-nemurenai',
      'kafu-ito',
    ],
  },
  {
    slug: 'commute',
    title: '通勤路上',
    en: 'COMMUTE',
    desc: '人潮里的节拍器。目标:下车之前刚好循环完一轮。',
    moods: ['节奏', '人潮', '踩点'],
    note: '早高峰实验结果:这三分钟的红绿灯,等得毫无怨言。',
    accent: '#F59F00',
    trackIds: [
      'kafu-synth-aidol',
      'faketype-manneri',
      'kafu-mikakunin',
      'vwp-kyomei',
      'kafu-quiz',
    ],
  },
  {
    slug: 'focus',
    title: '专注工作',
    en: 'DEEP FOCUS',
    desc: '不需要歌词进入大脑、但需要电流占住耳朵的时候。',
    moods: ['循环', '低干扰', '电流'],
    note: '实测:循环第五遍之后,代码和音乐会变成同一件事。',
    accent: '#1F2933',
    trackIds: [
      'vwp-dennou',
      'vwp-kikai',
      'vwp-henshin',
      'kafu-montage',
      'kafu-shironri',
    ],
  },
  {
    slug: 'weekend',
    title: '周末醒来',
    en: 'WEEKEND MORNING',
    desc: '赖床的光学组件:阳光、被子和慢慢醒来的旋律。',
    moods: ['阳光', '慢', '赖床'],
    note: '闹钟关掉之后再点开,顺序别反了。',
    accent: '#D6336C',
    trackIds: [
      'kafu-soshitehana',
      'kafu-synth-mohana',
      'kafu-keshiki',
      'kafu-meru',
      'kafu-heroines',
    ],
  },
];

/* ============ 播放队列解析 ============ */

export interface QueueInfo {
  id: string;
  kind: 'album' | 'scene';
  slug: string;
  title: string;
  /** 条目专属色,播放器界面用 */
  accent: string;
  tracks: Track[];
}

export function resolveQueue(id: string | undefined): QueueInfo | undefined {
  if (!id) return undefined;
  const [kind, slug] = id.split(':');
  const pick = (ids: string[]) =>
    ids.map((tid) => TRACK_MAP.get(tid)).filter((x): x is Track => Boolean(x));
  if (kind === 'album') {
    const entry = ENTRIES.find((e) => e.slug === slug);
    if (!entry) return undefined;
    return {
      id,
      kind,
      slug,
      title: entry.title,
      accent: entry.accent,
      tracks: pick(entry.trackIds),
    };
  }
  if (kind === 'scene') {
    const scene = SCENES.find((s) => s.slug === slug);
    if (!scene) return undefined;
    return {
      id,
      kind,
      slug,
      title: scene.title,
      accent: scene.accent,
      tracks: pick(scene.trackIds),
    };
  }
  return undefined;
}

/** 曲目所属条目(场景歌单里显示"所属"用) */
export function entryOfTrack(trackId: string): Entry | undefined {
  return ENTRIES.find((e) => e.trackIds.includes(trackId));
}

/** mm:ss 显示 */
export function mmss(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function totalSec(ids: string[]): number {
  return ids.reduce((sum, id) => sum + (DURATIONS[id] ?? 0), 0);
}

/** 主打条目(首页首屏) */
export const FEATURED_SLUG = 'kafu-yakobus';

/** 唱片架筛选 */
export const SHELF_FILTERS = [
  { key: 'all', label: '全部' },
  { key: '花譜', label: '花譜' },
  { key: '神椿系', label: '神椿系' },
  { key: '合作曲', label: '合作曲' },
  { key: '虚拟歌手', label: '虚拟歌手' },
  { key: 'fresh', label: '最近收藏' },
  { key: 'top', label: '高分条目' },
] as const;
