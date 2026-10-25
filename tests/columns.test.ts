import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COLUMN } from '../src/data/algorithm/column.ts';
import { MAP_NODE_MAP } from '../src/data/algorithm/map.ts';

const shelf = readFileSync('src/pages/music/shelf.astro', 'utf8');
const header = readFileSync('src/components/Header.astro', 'utf8');
const complexity = readFileSync('src/pages/algorithm/complexity.astro', 'utf8');

test('weekly map deep link points to a selectable node', () => {
  assert.ok(MAP_NODE_MAP.has(COLUMN.weekly.mapNode));
});

test('shelf hidden state wins over grid, card and row display styles', () => {
  assert.match(
    shelf,
    /\.shelf-page\s+\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/,
  );
});

test('mobile menu removes every element listener installed by its init', () => {
  for (const [event, handler] of [
    ['click', 'onToggle'],
    ['click', 'onMenuClick'],
    ['keydown', 'onKey'],
    ['change', 'onMq'],
  ]) {
    assert.ok(
      header.includes(`addEventListener('${event}', ${handler})`) &&
        header.includes(`removeEventListener('${event}', ${handler})`),
      `${handler} must have symmetric cleanup`,
    );
  }
});

test('complexity result count uses only one of the duplicated row layouts', () => {
  assert.match(
    complexity,
    /if \(hit && row\.closest\('\[data-cx-table\]'\)\) visible\+\+;/,
  );
});
