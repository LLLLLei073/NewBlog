import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { MODEL } from '../src/components/live2d/config.ts';
import { gateCharacter } from '../src/components/live2d/gate.ts';
import { inventoryFromManifest } from '../src/components/live2d/manifest.ts';
import {
  motionFor,
  pickLine,
  planReaction,
  reactionKindFor,
} from '../src/components/live2d/model.ts';
import {
  focusFromPointer,
  pointerIsFar,
  restFocus,
} from '../src/components/live2d/pointer.ts';
import { isLive2dTap, type TapStart } from '../src/components/live2d/tap.ts';

const dist = join(process.cwd(), 'dist');
const articlePage = join(dist, 'blog', 'cf-friend-tracker', 'index.html');
const otherPages = ['index.html', 'room/index.html', 'about/index.html'];
const skipped =
  MODEL === null ? 'config 里 MODEL 仍为 null，模型尚未接入' : false;

test('点击在摇头与害羞之间交替，顺序确定', () => {
  assert.equal(reactionKindFor(0), 'shake');
  assert.equal(reactionKindFor(1), 'shy');
  assert.equal(reactionKindFor(2), 'shake');
  assert.equal(reactionKindFor(7), 'shy');
});

test('文案不会连续重复，空文案池返回空串', () => {
  const pool = ['甲', '乙', '丙'];
  let previous: string | null = null;
  for (let i = 0; i < 60; i++) {
    const line = pickLine(pool, previous);
    assert.ok(pool.includes(line));
    assert.notEqual(line, previous);
    previous = line;
  }
  assert.equal(pickLine([], '甲'), '');
});

test('反应规划在缺少动作组时仍然给出文案', () => {
  const lines = { shake: ['别摇啦'], shy: ['被发现了'] };
  const bare = planReaction(null, 0, null, lines);
  assert.equal(bare.kind, 'shake');
  assert.equal(bare.line, '别摇啦');
  assert.equal(bare.motion, undefined);

  const plain = {
    name: 'a',
    path: '/live2d/a/a.model3.json',
    scale: 1,
    position: [0, 0] as [number, number],
    motions: ['Idle', 'TapBody'],
  };
  assert.equal(motionFor(plain, 'shake', 0), 'Idle');
  assert.equal(motionFor(plain, 'shake', 1), 'TapBody');
  assert.equal(motionFor(plain, 'shy', 0), undefined);
  assert.deepEqual(planReaction(plain, 0, null, lines), {
    kind: 'shake',
    line: '别摇啦',
    motion: 'Idle',
  });

  const named = {
    ...plain,
    shakeMotion: 'ShakeHead',
    shakeExpression: 'f03',
    shyExpression: 'f02',
    shyMotion: 'Favor',
  };
  assert.deepEqual(planReaction(named, 0, null, lines), {
    kind: 'shake',
    line: '别摇啦',
    motion: 'ShakeHead',
    expression: 'f03',
  });
  assert.deepEqual(planReaction(named, 1, '别摇啦', lines), {
    kind: 'shy',
    line: '被发现了',
    motion: 'Favor',
    expression: 'f02',
  });
});

test('门控按优先级拒绝加载', () => {
  const allow = {
    width: 1440,
    pointerFine: true,
    reducedMotion: false,
    saveData: false,
    stored: false,
    hidden: false,
    webgl: true,
  };
  assert.deepEqual(gateCharacter(allow), { ok: true });
  const reasons = [
    ['stored', { stored: true }],
    ['viewport', { width: 768 }],
    ['pointer', { pointerFine: false }],
    ['motion', { reducedMotion: true }],
    ['save-data', { saveData: true }],
    ['hidden', { hidden: true }],
    ['webgl', { webgl: false }],
  ] as const;
  for (const [reason, patch] of reasons) {
    assert.deepEqual(gateCharacter({ ...allow, ...patch }), {
      ok: false,
      reason,
    });
  }
  assert.deepEqual(gateCharacter({ ...allow, stored: true, width: 320 }), {
    ok: false,
    reason: 'stored',
  });
});

test('指针换算按舞台外扩范围钳制，镜像只在中心翻转', () => {
  const rect = { left: 12, top: 40, width: 200, height: 260 };
  // 外扩边界由浮点乘法得到，比较前统一收敛到 1e-6，避免 229.99999999999997 这类噪音。
  const at = (
    clientX: number,
    clientY: number,
    mirror = false,
  ): { x: number; y: number } => {
    const point = focusFromPointer(rect, clientX, clientY, mirror);
    return {
      x: Math.round(point.x * 1e6) / 1e6,
      y: Math.round(point.y * 1e6) / 1e6,
    };
  };
  assert.deepEqual(at(112, 170), { x: 100, y: 130 });
  assert.deepEqual(at(12 + 400, 40 + 900), { x: 230, y: 299 });
  assert.deepEqual(at(-400, -400), { x: -30, y: -39 });
  assert.deepEqual(at(112, 170, true), { x: 100, y: 130 });
  assert.deepEqual(at(12, 40, true), { x: 200, y: 0 });
  assert.deepEqual(restFocus(rect), { x: 100, y: 260 });
  assert.equal(pointerIsFar(rect, 112, 170), false);
  assert.equal(pointerIsFar(rect, 12 + 401, 170), true);
  assert.equal(pointerIsFar(rect, 112, 40 - 261), true);
});

const tapStart: TapStart = {
  pointer: 1,
  x: 20,
  y: 20,
  scrollY: 0,
  time: 0,
  moved: false,
};
const tapEnd = { pointer: 1, x: 22, y: 22, scrollY: 0, time: 100 };

test('点击判定排除拖动、滚动、多指、长按与落空', () => {
  assert.equal(isLive2dTap(tapStart, tapEnd), true);
  for (const invalid of [
    { ...tapEnd, x: 60 },
    { ...tapEnd, scrollY: 10 },
    { ...tapEnd, pointer: 2 },
    { ...tapEnd, time: 900 },
  ]) {
    assert.equal(isLive2dTap(tapStart, invalid), false);
  }
  assert.equal(isLive2dTap(null, tapEnd), false);
  assert.equal(isLive2dTap({ ...tapStart, moved: true }, tapEnd), false);
});

test('manifest 解析同时兼容 Cubism 4 与 Cubism 2 写法', () => {
  assert.deepEqual(
    inventoryFromManifest({
      FileReferences: {
        Motions: { Idle: [], TapHead: [] },
        Expressions: [{ Name: 'f01' }, { Name: '' }, {}],
      },
    }),
    { motions: ['Idle', 'TapHead'], expressions: ['f01'] },
  );
  assert.deepEqual(
    inventoryFromManifest({
      motions: { Idle: [] },
      expressions: [{ name: 'f02' }],
    }),
    { motions: ['Idle'], expressions: ['f02'] },
  );
  assert.deepEqual(inventoryFromManifest(null), {
    motions: [],
    expressions: [],
  });
});

test(
  '模型资产完整：引用文件存在、moc3 合法、体积在预算内',
  { skip: skipped },
  () => {
    assert.ok(MODEL);
    assert.ok(existsSync(join('public', MODEL.path)), MODEL.path);
    const manifest = JSON.parse(
      readFileSync(join('public', MODEL.path), 'utf8'),
    ) as Record<string, unknown>;
    const text = JSON.stringify(manifest);
    assert.ok(!/https?:\/\//.test(text), '模型引用必须全部是站内相对路径');
    const references = manifest.FileReferences as
      | {
          Moc?: string;
          Textures?: string[];
          Physics?: string;
          Pose?: string;
          Motions?: Record<string, { File?: string }[]>;
          Expressions?: { File?: string }[];
        }
      | undefined;
    const files = [
      references?.Moc,
      ...(references?.Textures ?? []),
      references?.Physics,
      references?.Pose,
      ...Object.values(references?.Motions ?? {}).flatMap((group) =>
        group.map((motion) => motion?.File),
      ),
      ...(references?.Expressions ?? []).map((expression) => expression?.File),
    ].filter((file): file is string => typeof file === 'string');
    assert.ok(files.length > 0, 'manifest 至少引用了 moc 与贴图');
    const base = join('public', dirname(MODEL.path));
    let total = 0;
    for (const file of files) {
      const path = join(base, file);
      assert.ok(existsSync(path), `${file} 必须存在`);
      total += statSync(path).size;
    }
    const moc = join(base, references!.Moc!);
    assert.equal(
      readFileSync(moc).subarray(0, 4).toString('latin1'),
      'MOC3',
      'moc3 文件头必须合法',
    );
    assert.ok(
      total < 80 * 1024 * 1024,
      `模型总体积 ${total} 超出预算（单文件仍须小于 GitHub 100MB 限制）`,
    );

    const inventory = inventoryFromManifest(manifest);
    assert.deepEqual(
      inventory.motions.slice().sort(),
      MODEL.motions.slice().sort(),
      'config 的动作组清单必须与 manifest 一致',
    );
    for (const group of [MODEL.shakeMotion, MODEL.shyMotion]) {
      if (group) assert.ok(inventory.motions.includes(group), group);
    }
    for (const expression of [MODEL.shakeExpression, MODEL.shyExpression]) {
      if (expression) {
        assert.ok(
          inventory.expressions.includes(expression),
          `${expression} 必须出现在 manifest 的表情清单里`,
        );
      }
    }
  },
);

test('看板娘容器只出现在文章页', { skip: skipped }, () => {
  const article = readFileSync(articlePage, 'utf8');
  assert.ok(article.includes('data-live2d-model="' + MODEL!.path + '"'));
  const toggle = article.match(/<button[^>]*data-live2d-toggle[^>]*>/)?.[0];
  assert.ok(toggle, '文章页必须有显示/隐藏按钮');
  assert.ok(toggle.includes('aria-pressed="false"'));
  assert.ok(article.includes('data-live2d-status role="status"'));
  assert.ok(
    !/src="\/live2d\//.test(article) && !/href="\/live2d\//.test(article),
    '模型路径只能出现在 data-* 属性里',
  );
  for (const page of otherPages) {
    assert.ok(
      !readFileSync(join(dist, page), 'utf8').includes('data-live2d'),
      `${page} 不应加载看板娘`,
    );
  }
});

test('看板娘分块不进首屏请求', () => {
  const chunks = readdirSync(join(dist, '_astro'))
    .filter((file) => file.endsWith('.js'))
    .map((file) => join(dist, '_astro', file));
  const lazy = chunks.filter((file) =>
    readFileSync(file, 'utf8').includes('Live2DCubismCore'),
  );
  assert.ok(lazy.length > 0, 'oh-my-live2d 必须随构建产出独立分块');

  const html = readFileSync(articlePage, 'utf8');
  const referenced = new Set(
    [
      ...html.matchAll(/<script[^>]+src="([^"]+)"/g),
      ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g),
    ].map((match) => join(dist, match[1]!.replace(/^\//, ''))),
  );
  for (const chunk of lazy) {
    assert.ok(!referenced.has(chunk), `${chunk} 不应出现在首屏请求里`);
  }
});
