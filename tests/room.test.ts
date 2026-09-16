import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ROOM_LINKS } from '../src/components/room/config.ts';
import {
  roomCycle,
  roomDuration,
  roomPose,
  distance3d,
  SEAT,
  STANDING,
  COAL_ROAM,
  TARGETS,
  SPEED,
} from '../src/components/room/motion3d.ts';
import { lampStrength } from '../src/components/home/illustration/preferences.ts';
test('nine destinations and static navigation remain available', () => {
  assert.deepEqual(
    ROOM_LINKS.map((i) => i.href),
    [
      '/categories/algorithm/',
      '/categories/math/',
      '/categories/music/',
      '/categories/game/',
      '/categories/others/',
      '/blog/',
      '/about/',
      '/archives/',
      '/friends/',
    ],
  );
  assert.deepEqual(
    new Set(Object.keys(TARGETS)),
    new Set(ROOM_LINKS.map((i) => i.id)),
  );
  for (const i of ROOM_LINKS) assert.ok(existsSync(`dist${i.href}index.html`));
  const html = readFileSync('dist/room/index.html', 'utf8');
  assert.ok(
    !html.includes('/art/room/'),
    'old room artwork never flashes during loading',
  );
  assert.ok(!existsSync('dist/art/room/background.webp'));
  assert.equal((html.match(/data-room-link=/g) || []).length, 9);
  for (const id of [
    'data-room-placeholder',
    'data-coal-open',
    'data-room-lamp',
  ])
    assert.ok(html.includes(id));
});
for (const visit of ['window', 'shelf'] as const)
  test(`${visit}: three continuous cycles avoid furniture and the coal corridor`, () => {
    const cycle = roomCycle(visit),
      duration = roomDuration(cycle);
    let previous = roomPose(cycle, 0);
    for (let t = 0.01; t < duration * 3; t += 0.01) {
      const p = roomPose(cycle, t);
      assert.ok(distance3d(p, previous) < 0.007, 'continuous root position');
      assert.ok(p.x > -2 && p.x < 1.3 && p.z > -1.2 && p.z < 0.2);
      assert.ok(!(p.x > 0.18 && p.z < -0.92), 'outside desk footprint');
      assert.ok(!(p.x < -0.75 && p.z < -0.9), 'outside cabinets');
      for (const c of COAL_ROAM)
        assert.ok(distance3d(c, p) > 1, 'separate floor corridors');
      previous = p;
    }
    assert.equal(roomPose(cycle, duration).seated, 1);
    const rise = cycle.find((p) => p.kind === 'rise')!;
    assert.deepEqual(rise.from, SEAT);
    assert.deepEqual(rise.to, STANDING);
  });
test('routes accelerate, stop and preserve world-space foot contacts through corners', () => {
  for (const visit of ['window', 'shelf'] as const) {
    const cycle = roomCycle(visit);
    let previous = roomPose(cycle, 0),
      maxSpeed = 0;
    for (let t = 0.01; t < roomDuration(cycle); t += 0.01) {
      const p = roomPose(cycle, t);
      if (p.action === 'walk' && previous.action === 'walk')
        maxSpeed = Math.max(maxSpeed, distance3d(p, previous) / 0.01);
      for (let i = 0; i < 2; i++) {
        const f = p.feet[i]!,
          old = previous.feet[i]!;
        assert.ok(
          Math.hypot(f.x - old.x, f.y - old.y, f.z - old.z) < 0.04,
          'no teleporting feet',
        );
        if (f.planted && old.planted)
          assert.ok(
            distance3d(f, old) < 1e-7,
            'planted feet remain fixed even while turning',
          );
      }
      previous = p;
    }
    assert.ok(maxSpeed <= SPEED + 0.001);
    assert.equal(
      cycle.filter((p) => p.kind === 'walk').length,
      2,
      'continuous outbound and return routes',
    );
  }
});
test('model metadata permits modification and web redistribution', () => {
  const data = readFileSync('public/models/study/girl.vrm');
  const json = JSON.parse(
    data.subarray(20, 20 + data.readUInt32LE(12)).toString(),
  );
  const meta = json.extensions.VRMC_vrm.meta;
  assert.equal(meta.allowRedistribution, true);
  assert.equal(meta.modification, 'allowModificationRedistribution');
  assert.equal(meta.avatarPermission, 'everyone');
  assert.deepEqual(meta.authors, ['pixiv Inc.']);
  for (const bone of [
    'hips',
    'leftUpperLeg',
    'leftLowerLeg',
    'leftFoot',
    'rightUpperLeg',
    'rightLowerLeg',
    'rightFoot',
  ])
    assert.ok(json.extensions.VRMC_vrm.humanoid.humanBones[bone]);
});
test('lighting stays independent of reading theme and 3D loads only in room', () => {
  assert.equal(lampStrength('auto', 0.42), 0.42);
  assert.equal(lampStrength('off', 0.9), 0);
  assert.equal(lampStrength('on', 0), 0.95);
  const source = readFileSync('src/components/room/life.ts', 'utf8');
  assert.ok(!source.includes('setTheme'));
  assert.ok(source.includes("import('./scene3d')"));
  const home = readFileSync('dist/index.html', 'utf8');
  assert.ok(!home.includes('girl.vrm'));
  assert.ok(!home.includes('scene3d'));
});
