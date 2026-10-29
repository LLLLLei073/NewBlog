import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildBinarySearchSteps,
  parseBinarySearchInput,
} from '../src/data/algorithm/demos.ts';

test('parses mixed separators and negative integers', () => {
  assert.deepEqual(parseBinarySearchInput(' -8, -3，0  7\n12 ', '7'), {
    nums: [-8, -3, 0, 7, 12],
    target: 7,
  });
});

test('rejects an empty array and an empty target', () => {
  assert.throws(() => parseBinarySearchInput(' ', '1'), /请输入数组/);
  assert.throws(() => parseBinarySearchInput('1, 2', ' '), /请输入目标值/);
});

test('rejects non-decimal and non-integer input', () => {
  assert.throws(() => parseBinarySearchInput('1, 2.5', '2'), /十进制整数/);
  assert.throws(() => parseBinarySearchInput('1, 0x10', '2'), /十进制整数/);
  assert.throws(() => parseBinarySearchInput('1, 2', '1e2'), /十进制整数/);
});

test('rejects duplicate and descending elements', () => {
  assert.throws(
    () => parseBinarySearchInput('1, 2, 2, 4', '2'),
    /严格递增，且不能包含重复值/,
  );
  assert.throws(
    () => parseBinarySearchInput('1, 4, 3', '3'),
    /严格递增，且不能包含重复值/,
  );
});

test('enforces length and numeric display bounds', () => {
  assert.throws(
    () => parseBinarySearchInput('1 2 3 4 5 6 7 8 9 10 11 12 13', '4'),
    /最多包含 12 个/,
  );
  assert.throws(() => parseBinarySearchInput('1, 1000', '2'), /-999 到 999/);
  assert.throws(() => parseBinarySearchInput('1, 2', '-1000'), /-999 到 999/);
  assert.throws(
    () => parseBinarySearchInput('1, 9007199254740992', '2'),
    /-999 到 999/,
  );
});

test('builds a found ending for custom input', () => {
  const { nums, target } = parseBinarySearchInput('1, 3, 5, 7', '5');
  const steps = buildBinarySearchSteps(nums, target);
  assert.equal(steps.at(-1)?.phase, 'found');
  assert.equal(steps.at(-1)?.mid, 2);
});

test('builds a miss ending for custom input', () => {
  const { nums, target } = parseBinarySearchInput('1, 3, 5, 7', '6');
  const steps = buildBinarySearchSteps(nums, target);
  assert.equal(steps.at(-1)?.phase, 'miss');
  assert.equal(steps.at(-1)?.mid, null);
  assert.ok((steps.at(-1)?.left ?? 0) > (steps.at(-1)?.right ?? 0));
});

test('visualizer wires custom input, accessible errors and example reset', () => {
  const source = readFileSync(
    'src/components/algo/react/StepVisualizer.tsx',
    'utf8',
  );
  assert.ok(source.includes('parseBinarySearchInput(rawNums, rawTarget)'));
  assert.ok(source.includes('buildBinarySearchSteps(next.nums, next.target)'));
  assert.ok(source.includes('role="alert"'));
  assert.ok(source.includes('恢复示例'));
  assert.ok(source.includes('setI(0)'));
});
