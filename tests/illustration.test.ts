import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  lightingAt,
  imageCrop,
  localMinutes,
  untilNextMinute,
} from '../src/components/home/illustration/daylight.ts';

test('daylight wraps continuously at midnight and has distinct local light sources', () => {
  assert.deepEqual(lightingAt(0), lightingAt(1440));
  assert.deepEqual(lightingAt(-60), lightingAt(1380));
  const dawn = lightingAt(420),
    noon = lightingAt(720),
    evening = lightingAt(1080),
    night = lightingAt(0);
  assert.ok(noon.ambient[0] > night.ambient[0]);
  assert.ok(night.lamp > noon.lamp);
  assert.ok(evening.color[0] > evening.color[2]);
  assert.ok(dawn.direction[0] < 0 && evening.direction[0] > 0);
  for (let minute = 0; minute < 1440; minute++) {
    const current = lightingAt(minute),
      next = lightingAt(minute + 1);
    for (const key of ['color', 'ambient', 'direction'] as const) {
      current[key].forEach((value, i) => {
        assert.ok(Number.isFinite(value));
        assert.ok(
          Math.abs(value - next[key][i]!) < 0.025,
          `${key} at ${minute}`,
        );
      });
    }
  }
});

test('cover crop stays in the source image and preserves the character on mobile', () => {
  for (const [width, height] of [
    [1440, 900],
    [375, 812],
    [320, 740],
    [1280, 680],
  ]) {
    const crop = imageCrop(width!, height!, 1536, 1024);
    crop.scale.forEach((size, i) => {
      assert.ok(size > 0 && size <= 1);
      assert.ok(crop.offset[i]! >= 0 && crop.offset[i]! + size <= 1.00001);
    });
    if (width! <= 700) {
      const facePosition = (0.76 - crop.offset[0]!) / crop.scale[0]!;
      assert.ok(facePosition > 0.15 && facePosition < 0.9);
    }
  }
});

test('clock schedules the minute boundary and uses device local hours', () => {
  const date = new Date(2026, 8, 13, 19, 42, 31, 250);
  assert.equal(localMinutes(date), 1182);
  assert.equal(untilNextMinute(date), 28750);
});

test('all artwork resources are local and maps use the original coordinate system', () => {
  assert.ok(existsSync('public/art/study/base.webp'));
  assert.ok(existsSync('public/art/study/closed.webp'));
  assert.ok(existsSync('public/art/study/normal.webp'));
  for (const map of ['motion.svg']) {
    const svg = readFileSync(`public/art/study/${map}`, 'utf8');
    assert.ok(svg.includes('viewBox="0 0 1536 1024"'));
    assert.ok(!svg.includes('<image'));
  }
});
