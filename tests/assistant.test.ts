import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildAssistantIndex,
  searchPosts,
  resultPage,
  randomPost,
  serializeIndex,
} from '../src/components/assistant/search.ts';
import { createRoomScene } from '../src/components/room/scene.ts';
import { Raycaster, Vector2 } from 'three';

const sources = Array.from({ length: 9 }, (_, i) => ({
  id: `post-${i}`,
  data: {
    title: `学习笔记 ${i}`,
    description: i === 0 ? 'Astro 和算法练习' : '日常 学习',
    category: i === 0 ? 'algorithm' : 'math',
    pubDate: new Date(Date.UTC(2026, 7, 9 - i)),
    draft: i === 8,
  },
  body: '不应进入索引的全文',
}));
const posts = buildAssistantIndex(sources, {
  algorithm: '算法',
  math: '数学',
  others: '其他',
});

test('index excludes drafts and bodies, is sorted and contains only public metadata', () => {
  assert.equal(posts.length, 8);
  assert.equal(posts[0]?.href, '/blog/post-0/');
  assert.ok(!JSON.stringify(posts).includes('不应进入'));
  assert.deepEqual(
    Object.keys(posts[0]!).sort(),
    ['title', 'description', 'category', 'href', 'publishedAt'].sort(),
  );
});
test('Chinese, mixed case, whitespace and AND matching work', () => {
  assert.equal(searchPosts(posts, '  ASTRO   算法 ').length, 1);
  assert.equal(searchPosts(posts, '数学 学习').length, 7);
  assert.equal(searchPosts(posts, 'ASTRO 数学').length, 0);
  assert.equal(searchPosts(posts, '不应进入索引的全文').length, 0);
  assert.equal(searchPosts(posts, '   ').length, 8);
});
test('initial recent three, six results, expand all, empty fallback', () => {
  assert.equal(resultPage(posts, '').visible.length, 3);
  assert.equal(resultPage(posts, '学习').visible.length, 6);
  assert.equal(resultPage(posts, '学习').more, true);
  assert.equal(resultPage(posts, '学习', true).visible.length, 8);
  assert.equal(resultPage(posts, '找不到').empty, true);
  assert.deepEqual(resultPage(posts, '找不到').visible, posts.slice(0, 3));
  assert.deepEqual(resultPage([], '').visible, []);
});
test('random selection uses published posts only and handles empty index', () => {
  assert.equal(
    randomPost([], () => 0),
    undefined,
  );
  assert.equal(
    randomPost(posts, () => 0),
    posts[0],
  );
  assert.equal(
    randomPost(posts, () => 0.99999),
    posts[7],
  );
});
test('JSON cannot terminate script or inject markup', () => {
  const hostile = [
    { ...posts[0]!, title: '</script><img src=x onerror=alert(1)>' },
  ];
  const json = serializeIndex(hostile);
  assert.ok(!json.includes('<'));
  assert.deepEqual(JSON.parse(json), hostile);
});
for (const [width, height] of [
  [1120, 620],
  [712, 392],
  [335, 340],
  [280, 340],
]) {
  test(`mascot hit area fits and does not cover any navigation target at ${width}px`, () => {
    const room = createRoomScene();
    room.fit(width!, height!);
    const { x, y, size } = room.projectAssistant(width!, height!);
    assert.ok(
      x - size / 2 >= 0 &&
        x + size / 2 <= width! &&
        y - size >= 0 &&
        y <= height!,
    );
    const ray = new Raycaster();
    const proxies = [...room.targets.values()].map((item) => item.proxy);
    // Test actual picking volumes rather than inflated projected AABBs.
    for (let px = x - size / 2; px <= x + size / 2; px += 2)
      for (let py = y - size; py <= y; py += 2) {
        ray.setFromCamera(
          new Vector2((px / width!) * 2 - 1, 1 - (py / height!) * 2),
          room.camera,
        );
        assert.equal(
          ray.intersectObjects(proxies, false).length,
          0,
          'mascot never steals a room click',
        );
      }
    room.dispose();
  });
}
test('only homepage includes assistant, inert index and hidden JS-only controls', () => {
  const home = readFileSync('dist/index.html', 'utf8');
  assert.ok(home.includes('<room-assistant'));
  assert.match(home, /data-coal-toggle[^>]*hidden/);
  assert.match(home, /id="coal-panel"[^>]*hidden/);
  assert.ok(home.includes('data-coal-static'));
  const script = home.match(
    /<script[^>]*data-coal-index[^>]*>([\s\S]*?)<\/script>/,
  )?.[1];
  assert.ok(script && Array.isArray(JSON.parse(script)));
  for (const path of ['about', 'blog', 'categories/math', 'blog/second-post']) {
    const html = readFileSync(`dist/${path}/index.html`, 'utf8');
    assert.ok(!html.includes('room-assistant'));
    assert.ok(!html.includes('Assistant.astro_astro_type_script'));
  }
});
