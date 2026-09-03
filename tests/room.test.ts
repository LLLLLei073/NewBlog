import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Raycaster, Vector2, Vector3 } from 'three';
import { createRoomScene } from '../src/components/room/scene.ts';
import { ROOM_LINKS } from '../src/components/room/config.ts';
import { isRoomTap, type TapStart } from '../src/components/room/gesture.ts';

const expected = [
  '/categories/algorithm/',
  '/categories/math/',
  '/categories/music/',
  '/categories/game/',
  '/categories/others/',
  '/blog/',
  '/about/',
  '/archives/',
  '/friends/',
];
test('nine unique objects point to the agreed existing routes', () => {
  assert.deepEqual(
    ROOM_LINKS.map((item) => item.href),
    expected,
  );
  assert.equal(new Set(ROOM_LINKS.map((item) => item.id)).size, 9);
  for (const href of expected)
    assert.ok(existsSync(`dist${href}index.html`), href);
});

for (const [width, height] of [
  [1120, 620],
  [720, 392],
  [343, 340],
  [288, 340],
]) {
  test(`all ten object centers pick correctly and fit ${width}×${height}`, () => {
    const room = createRoomScene();
    room.fit(width!, height!);
    const ray = new Raycaster();
    const proxies = [...room.targets.values()].map((item) => item.proxy);
    assert.equal(proxies.length, 10);
    for (const [id, item] of room.targets) {
      const p = item.anchor.clone().project(room.camera);
      assert.ok(
        Math.abs(p.x) < 1 && Math.abs(p.y) < 1,
        `${id} inside viewport`,
      );
      ray.setFromCamera(new Vector2(p.x, p.y), room.camera);
      assert.equal(
        ray.intersectObjects(proxies, false)[0]?.object.userData.roomId,
        id,
        `${id} unambiguous center`,
      );
      room.highlight(id);
      assert.equal(
        [...room.targets.values()].filter((t) => t.highlight.visible).length,
        1,
      );
    }
    for (const x of [-5.15, 5.15])
      for (const y of [-0.16, 5.45])
        for (const z of [-4.15, 4.15]) {
          const p = new Vector3(x, y, z).project(room.camera);
          assert.ok(
            Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1,
            'entire room silhouette fits',
          );
        }
    room.dispose();
    assert.equal(room.scene.children.length, 0);
  });
}

const start: TapStart = {
  id: 'computer',
  pointer: 1,
  x: 20,
  y: 20,
  scrollY: 0,
  time: 0,
  moved: false,
};
const end = { id: 'computer', pointer: 1, x: 22, y: 22, scrollY: 0, time: 100 };
test('single tap enters, movement/scroll/cancel/multi-touch/long press do not', () => {
  assert.equal(isRoomTap(start, end), true);
  for (const invalid of [
    { ...end, y: 60 },
    { ...end, scrollY: 10 },
    { ...end, pointer: 2 },
    { ...end, id: 'textbook' },
    { ...end, time: 900 },
  ])
    assert.equal(isRoomTap(start, invalid), false);
  assert.equal(isRoomTap(null, end), false);
  assert.equal(isRoomTap({ ...start, moved: true }, end), false);
});

test('static HTML has all fallback links, illustration and exactly three recent posts', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.equal((html.match(/data-room-link=/g) || []).length, 9);
  assert.ok(html.includes('小房间的线稿'));
  assert.equal((html.match(/class="note-number"/g) || []).length, 3);
  assert.ok(html.includes('data-room-placeholder'));
  assert.ok(!html.includes('<audio'));
  const article = readFileSync('dist/blog/second-post/index.html', 'utf8');
  assert.ok(!article.includes('data-room-stage'));
  assert.ok(!article.includes('data-room-home'));
});
