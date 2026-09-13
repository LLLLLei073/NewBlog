import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeAssistantQuery,
  randomAssistantNote,
  searchAssistantNotes,
  type AssistantNote,
} from '../src/components/room/assistant.ts';

const notes: AssistantNote[] = [
  {
    title: '数组练习',
    description: '双指针',
    category: '算法',
    href: '/a/',
    pubDate: '2026-03-03',
  },
  {
    title: '线性代数',
    description: '矩阵笔记',
    category: '数学',
    href: '/b/',
    pubDate: '2026-03-02',
  },
  {
    title: '游戏开发',
    description: '碰撞检测',
    category: '游戏',
    href: '/c/',
    pubDate: '2026-03-01',
  },
  {
    title: '音乐随记',
    description: '和弦',
    category: '音乐',
    href: '/d/',
    pubDate: '2026-02-28',
  },
  {
    title: '项目记录',
    description: '桌面应用',
    category: '其他',
    href: '/e/',
    pubDate: '2026-02-27',
  },
  {
    title: '排序算法',
    description: '数组 快速排序',
    category: '算法',
    href: '/f/',
    pubDate: '2026-02-26',
  },
  {
    title: '图论',
    description: '最短路',
    category: '算法',
    href: '/g/',
    pubDate: '2026-02-25',
  },
];

test('query normalization ignores case and repeated spaces', () => {
  assert.deepEqual(normalizeAssistantQuery('  ARRAY   算法 '), [
    'array',
    '算法',
  ]);
});

test('empty query returns the latest three notes', () => {
  assert.deepEqual(searchAssistantNotes(notes, ''), notes.slice(0, 3));
});

test('all query terms must match title description or category', () => {
  assert.deepEqual(
    searchAssistantNotes(notes, '数组 算法').map((note) => note.href),
    ['/a/', '/f/'],
  );
  assert.deepEqual(
    searchAssistantNotes(notes, '矩阵 数学').map((note) => note.href),
    ['/b/'],
  );
  assert.equal(searchAssistantNotes(notes, '数组 音乐').length, 0);
});

test('random reading uses only the supplied published index', () => {
  assert.equal(randomAssistantNote(notes, () => 0)?.href, '/a/');
  assert.equal(randomAssistantNote(notes, () => 0.999)?.href, '/g/');
  assert.equal(
    randomAssistantNote([], () => 0),
    null,
  );
});

test('homepage embeds only published notes and all room links', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.ok(html.includes('data-coal-root'));
  assert.equal(
    (html.match(/class="coal-nav"[\s\S]*?<\/nav>/)?.[0].match(/<a /g) ?? [])
      .length,
    9,
  );
  assert.ok(!html.includes('data-draft="true"'));
  assert.ok(
    !readFileSync('dist/about/index.html', 'utf8').includes('data-coal-root'),
  );
});
