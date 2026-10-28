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

test('every column intro skip control meets the 44px touch target', () => {
  for (const name of [
    'AlgorithmIntro',
    'MathIntro',
    'GameIntro',
    'OthersIntro',
    'MusicIntro',
  ]) {
    const source = readFileSync(
      `src/components/intro/${name}.astro`,
      'utf8',
    );
    assert.match(source, /min-height:\s*44px/, `${name} 跳过按钮需 ≥44px 高`);
  }
});

test('all five column navs use the shared right symbol rail with hover labels', () => {
  const navs = [
    'src/components/math/MathSymbolRail.astro',
    'src/components/archive/ArchiveNav.astro',
    'src/components/algo/AlgoNav.astro',
    'src/components/others/OthersNav.astro',
    'src/components/game/GameNav.astro',
  ];
  for (const file of navs) {
    const source = readFileSync(file, 'utf8');
    assert.ok(
      source.includes("from '../ColumnRail.astro'"),
      `${file} 必须使用共享 ColumnRail`,
    );
  }
  const rail = readFileSync('src/components/ColumnRail.astro', 'utf8');
  // 固定在右侧,悬浮/聚焦时以 data-label 弹出具体名称
  assert.match(rail, /right:\s*0/, '符号栏必须固定在右侧');
  assert.ok(rail.includes('data-label'), '悬浮名称必须由 data-label 渲染');
  assert.ok(rail.includes('aria-label={item.label}'), '符号必须带可访问名称');
  // 每个条目触控区 ≥44px
  assert.match(rail, /min-height:\s*48px/, '符号条目需 ≥48px 高');
});
