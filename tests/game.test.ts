import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { COLUMN } from '../src/data/game/column.ts';
import {
  GAMES,
  GAME_BY_SLUG,
  PLAY_FILTERS,
  PLAY_STATUS_LABEL,
  SERIES_WORKS,
} from '../src/data/game/games.ts';
import {
  ARTICLE_META,
  getGameArticleMeta,
} from '../src/data/game/articles.ts';
import { SHELF } from '../src/data/game/collection.ts';
import { REVIEW_SLOTS } from '../src/data/game/review.ts';

/* ============================================================
   数据层:「存档之外」当前只记录真实内容,未确认信息必须空缺
   ============================================================ */

test('game column identity and storage key match the spec', () => {
  assert.equal(COLUMN.name, '存档之外');
  assert.equal(COLUMN.en, 'BEYOND THE SAVE FILE');
  assert.equal(COLUMN.claim, '记录通关以后，仍留在心里的部分');
  assert.equal(COLUMN.sticker, 'WORLD IN PROGRESS');
  assert.equal(COLUMN.player, 'PLAYER 01');
  assert.equal(COLUMN.introKey, 'game-column-intro-v1');
});

test('home page shows exactly the three real save slots', () => {
  assert.deepEqual(
    GAMES.map((g) => g.slug),
    ['minecraft-create', 'green-hell', 'no-game-series'],
  );
  assert.deepEqual(
    GAMES.map((g) => g.slot),
    ['01', '02', '03'],
  );
  assert.equal(GAMES[0]!.status, 'building');
  assert.equal(GAMES[0]!.statusLabel, PLAY_STATUS_LABEL.building);
});

test('unconfirmed game data stays empty instead of being fabricated', () => {
  for (const game of GAMES) {
    assert.equal(game.platform, null, `${game.slug} 平台必须空缺`);
    assert.equal(game.rating, null, `${game.slug} 评分必须空缺`);
  }
  // 整合包版本/模组数量/进度/时长等一律不出现任何数字化进度
  const raw = readFileSync('src/data/game/games.ts', 'utf8');
  assert.ok(!/\b\d+\s*%/.test(raw), '游戏数据不得包含进度百分比');
  const series = GAME_BY_SLUG['no-game-series']!;
  assert.ok(series.pendingNote, '“不存在”系列必须保留待确认说明');
  // 收藏架与系列一一对应,且同样不填评分/平台之外的数据
  assert.deepEqual(
    SHELF.map((s) => s.game),
    GAMES.map((g) => g.slug),
  );
});

test('play filters cover the six documented states', () => {
  assert.deepEqual(
    PLAY_FILTERS.map((f) => f.key),
    [
      'all',
      'playing',
      'building',
      'done',
      'shelved',
      'planned',
      'revisiting',
    ],
  );
});

test('article meta keeps chapter anchors unique and spoiler text policy', () => {
  const mc = getGameArticleMeta('minecraft-create-first-production-line');
  assert.ok(mc, '产线手记必须有回放元数据');
  assert.equal(mc.game, 'minecraft-create');
  assert.equal(mc.spoiler, 'none');
  assert.equal(mc.log, 'WORLD LOG 01');
  assert.deepEqual(
    mc.chapters.map((c) => c.id),
    ['ch-world', 'ch-machine', 'ch-power', 'ch-line', 'ch-expand'],
  );
  const ids = new Set(mc.chapters.map((c) => c.id));
  assert.equal(ids.size, mc.chapters.length);
  for (const [slug, meta] of Object.entries(ARTICLE_META)) {
    if (meta.spoiler !== 'none') {
      assert.ok(meta.spoilerNote, `${slug} 剧透策略必须有文字说明`);
    }
  }
  // 正文中的章节锚点与 meta 一一对应
  const body = readFileSync(
    'src/content/blog/minecraft-create-first-production-line.md',
    'utf8',
  );
  for (const chapter of mc!.chapters) {
    assert.ok(
      body.includes(`id="${chapter.id}"`),
      `正文缺少锚点 ${chapter.id}`,
    );
  }
});

test('review slots without real entries stay empty on purpose', () => {
  const filled = REVIEW_SLOTS.filter((s) => s.entry !== null);
  // 只有「最满意的机械结构」有真实手记可指,其余必须留空
  assert.deepEqual(
    filled.map((s) => s.key),
    ['machine'],
  );
  assert.match(filled[0]!.entry!.href!, /^\/game\/notes\//);
});

/* ============================================================
   开屏:会话门控、时间线与跳过
   ============================================================ */

test('intro timeline follows the memory-card script and cleans up', () => {
  const timeline = readFileSync('src/components/intro/gameIntro.ts', 'utf8');
  assert.ok(timeline.includes("'game-column-intro-v1'"));
  // 关键节点:插入 / 扫描 / 发现存档 / 加载完成 / 交接
  assert.ok(timeline.includes('SAVE DATA FOUND'));
  assert.ok(timeline.includes('SAVE DATA READY'));
  assert.ok(timeline.includes('wait(2080'), '交接应从 2080ms 开始');
  // 进度百分比计数必须登记 rAF 清理
  assert.match(timeline, /cancelAnimationFrame\(pctRaf\)/);
  // FLIP 测量失败时退化为交叉淡化
  assert.ok(timeline.includes('degenerate'));
});

test('intro root exposes data-game-intro and a 44px skip control', () => {
  const intro = readFileSync('src/components/intro/GameIntro.astro', 'utf8');
  assert.ok(intro.includes('data-game-intro'));
  assert.match(intro, /min-height:\s*44px/);
  assert.ok(intro.includes('EMPTY SLOT'));
  assert.ok(intro.includes('PRESS START'));
  assert.ok(intro.includes('INSERT MEMORY CARD'));
});

/* ============================================================
   构建产物:页面挂载点、存档槽与空缺表达
   ============================================================ */

const dist = join(process.cwd(), 'dist');

function readDist(...segments: string[]): string {
  return readFileSync(join(dist, ...segments), 'utf8');
}

test('built game pages keep their data hooks and navigation', () => {
  const pages: [string, string[]][] = [
    ['game/index.html', ['data-game-nav', 'data-crail', 'data-save-slot', 'NOW PLAYING']],
    ['game/playing/index.html', ['data-filter', 'world-archive-title']],
    ['game/notes/index.html', ['data-game-nav']],
    ['game/collection/index.html', ['data-view', 'data-filter-group']],
    ['game/review/index.html', ['rslot', 'SCREENSHOT PICKS']],
  ];
  for (const [file, needles] of pages) {
    const html = readDist(...file.split('/'));
    for (const needle of needles) {
      assert.ok(html.includes(needle), `${file} 缺少 ${needle}`);
    }
  }
});

test('home save slots match the real play list without fake progress', () => {
  const html = readDist('game', 'index.html');
  for (const needle of [
    '《我的世界》机械动力整合包',
    '《绿色地狱》',
    '「不/存在的」系列',
    '持续建造',
    'MEMORY CARD',
  ]) {
    assert.ok(html.includes(needle), `首页存档槽缺少 ${needle}`);
  }
  // 不虚构进度百分比与游戏时长(剔除样式与脚本里的合法 CSS 百分比)
  const visibleText = html
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '');
  assert.ok(!/\b\d{2,3}%/.test(visibleText), '首页不得出现虚构进度百分比');
  assert.ok(!visibleText.includes('游戏时长'));
});

test('sample production-line article renders replay furniture and spoilers', () => {
  const html = readDist(
    'game',
    'notes',
    'minecraft-create-first-production-line',
    'index.html',
  );
  assert.ok(html.includes('data-page="game"'));
  assert.ok(html.includes('返回手记存档'));
  assert.ok(html.includes('WORLD LOG 01'));
  assert.ok(html.includes('data-chapter'), '缺少章节时间轴链接');
  assert.ok(html.includes('gg-spoiler'), '缺少剧透折叠结构');
  assert.ok(html.includes('显示剧透内容'));
  // 章节锚点落进正文
  for (const id of ['ch-world', 'ch-power', 'ch-expand']) {
    assert.ok(html.includes(`id="${id}"`), `正文缺少锚点 ${id}`);
  }
});

test('series slot lists the confirmed NOexistenceN works without fake play data', () => {
  const playing = readDist('game', 'playing', 'index.html');
  // 三部正式作品全部列出
  for (const needle of [
    '《不/存在的你，和我》',
    '《不/存在的逐梦者：银葱之森》',
    '《不/存在的莉莉丝》',
    '0x0Real Studio',
    'Nino Games',
  ]) {
    assert.ok(playing.includes(needle), `系列区块缺少 ${needle}`);
  }
  // 个人游玩状态未被编造
  assert.ok(playing.includes('待记录'), '个人状态必须保持待记录');
  assert.ok(!playing.includes('个人评分'), '不得代填个人评分');
});

test('review page keeps its empty slots and avoids dashboards', () => {
  const review = readDist('game', 'review', 'index.html');
  assert.ok(review.includes('留给年末'), '年度回顾必须保留空位说明');
  // 不使用仪表盘式统计
  assert.ok(!review.includes('chart'), '年度回顾不应引入图表');
});

test('SERIES_WORKS lists exactly the three confirmed series titles', () => {
  assert.deepEqual(
    SERIES_WORKS.map((w) => w.title),
    [
      '《不/存在的你，和我》',
      '《不/存在的逐梦者：银葱之森》',
      '《不/存在的莉莉丝》',
    ],
  );
  for (const work of SERIES_WORKS) {
    assert.equal(work.status, null, `${work.title} 个人状态必须空缺`);
    assert.ok(work.platform, `${work.title} 平台来自公开信息`);
  }
});
