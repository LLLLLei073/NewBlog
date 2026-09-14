import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ROOM_LINKS } from '../src/components/room/config.ts';
import {
  activityCycle,
  cycleDuration,
  girlAt,
  COAL_POINTS,
  HOTSPOTS,
  distance,
  SPRITES,
} from '../src/components/room/activity.ts';
import { lampStrength } from '../src/components/home/illustration/preferences.ts';

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
test('nine original destinations retain both illustrated and ordinary entrances', () => {
  assert.deepEqual(
    ROOM_LINKS.map((i) => i.href),
    expected,
  );
  assert.deepEqual(
    new Set(HOTSPOTS.map((i) => i.id)),
    new Set(ROOM_LINKS.map((i) => i.id)),
  );
  for (const href of expected) assert.ok(existsSync(`dist${href}index.html`));
  const html = readFileSync('dist/room/index.html', 'utf8');
  assert.equal((html.match(/data-room-link=/g) || []).length, 9);
  assert.ok(html.includes('data-coal-open'));
  assert.ok(html.includes('data-room-placeholder'));
  assert.ok(html.includes('/art/room/background.webp'));
  assert.ok(!html.includes('线框'));
});
for (const visit of ['window', 'shelf'] as const) {
  test(`${visit} route walks continuously, visits furniture and returns to reading`, () => {
    const cycle = activityCycle(visit, 26),
      duration = cycleDuration(cycle);
    let previous = girlAt(cycle, 0);
    const poses = new Set();
    const walkFrames = new Set();
    for (let t = 0.02; t < duration * 3; t += 0.02) {
      const g = girlAt(cycle, t);
      assert.ok(distance(g, previous) < 0.002, 'no position teleport');
      assert.ok(
        g.x >= 0.2 && g.x <= 0.706 && g.y >= 0.65 && g.y <= 0.8,
        'inside open room',
      );
      assert.ok(!(g.x < 0.35 && g.y < 0.7), 'outside left cabinet');
      assert.ok(!(g.x > 0.74), 'outside desk');
      poses.add(g.pose);
      if (g.pose === 'walk') walkFrames.add(g.frame);
      previous = g;
    }
    assert.ok(poses.has(visit));
    assert.ok(poses.has('read'));
    assert.ok(poses.has('rise'));
    assert.equal(walkFrames.size, 6);
    assert.equal(girlAt(cycle, duration).pose, 'read');
  });
}
test('coal paths remain clear of entrances and girl feet, including phone touch radius', () => {
  for (const a of COAL_POINTS)
    for (const b of COAL_POINTS)
      for (let i = 0; i <= 100; i++) {
        const t = i / 100,
          p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        assert.ok(p.y >= 0.9 && p.x >= 0.14 && p.x <= 0.61);
        for (const hot of HOTSPOTS) assert.ok(distance(p, hot) > 0.15);
        for (const visit of ['window', 'shelf'] as const) {
          const c = activityCycle(visit, 26);
          for (let s = 0; s < cycleDuration(c); s += 1)
            assert.ok(distance(p, girlAt(c, s)) > 0.11);
        }
      }
});
test('sprite rectangles contain full poses and local maps are present', () => {
  assert.equal(SPRITES.length, 12);
  for (const [x, y, w, h] of SPRITES) {
    assert.ok(x >= 0 && y >= 0 && x + w <= 1536 && y + h <= 1024);
  }
  for (const name of [
    'background',
    'normal',
    'character',
    'alpha',
    'foreground',
  ])
    assert.ok(existsSync(`public/art/room/${name}.webp`));
});
test('lamp override preserves automatic light and never modifies reading theme', () => {
  assert.equal(lampStrength('auto', 0.42), 0.42);
  assert.equal(lampStrength('off', 0.9), 0);
  assert.equal(lampStrength('on', 0), 0.95);
  const source = readFileSync('src/components/room/life.ts', 'utf8');
  assert.ok(!source.includes('data-theme'));
  assert.ok(!source.includes('setTheme'));
});
