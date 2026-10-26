import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = join(process.cwd(), 'dist');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const htmlFiles = () => walk(dist).filter((path) => path.endsWith('.html'));

test('all public pages have basic search metadata', () => {
  const files = htmlFiles();
  // 音乐/算法专栏上线后页面数随内容增长,只设下限保证全量检查
  assert.ok(files.length >= 19, `unexpected page count: ${files.length}`);
  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    // 迁移桩(/blog/ → 专栏命名空间)是极简 meta-refresh 跳转页,不套完整元数据
    if (html.includes('http-equiv="refresh"')) continue;
    // 只数 <head> 里的文档标题;正文 SVG 图解的 <title> 是无障碍名称,合法
    const head = html.slice(0, html.indexOf('</head>'));
    assert.equal(
      (head.match(/<title>/g) ?? []).length,
      1,
      relative(dist, file),
    );
    assert.match(html, /<meta name="description" content="[^"]+">/);
    assert.match(html, /<link rel="canonical" href="https:\/\//);
  }
});

test('built internal links resolve to a file or route', () => {
  const missing = new Set<string>();
  for (const file of htmlFiles()) {
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      const url = match[1]!.split(/[?#]/)[0]!;
      if (!url || url === '/') continue;
      const path = join(dist, url.replace(/^\//, ''));
      if (
        !existsSync(path) &&
        !existsSync(join(path, 'index.html')) &&
        !existsSync(`${path}.html`)
      ) {
        missing.add(`${relative(dist, file)} -> ${url}`);
      }
    }
  }
  assert.deepEqual([...missing], []);
});

test('illustrated homepage links to the separate room and keeps static navigation', () => {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  assert.ok(html.includes('徐磊'));
  assert.ok(html.includes('data-illustration'));
  assert.ok(html.includes('/art/study/base.webp'));
  assert.ok(html.includes('href="/room/"'));
  assert.ok(!html.includes('data-room-stage'));
  assert.ok(!html.includes('data-coal-root'));
  assert.ok(!html.includes('data-home-chapter'));
  assert.ok(!html.includes('id="theme-toggle"'));
  // 五个专栏均指向独立专栏首页,不再有旧 /categories/ 链接
  for (const path of [
    '/algorithm/',
    '/math/',
    '/music/',
    '/game/',
    '/others/',
  ]) {
    assert.ok(html.includes(`href="${path}"`), path);
  }
  assert.ok(!html.includes('href="/categories/'));
  const room = readFileSync(join(dist, 'room', 'index.html'), 'utf8');
  assert.ok(room.includes('data-room-stage'));
  assert.ok(room.includes('data-coal-root'));
  assert.ok(room.includes('href="/"'));
  const about = readFileSync(join(dist, 'about', 'index.html'), 'utf8');
  assert.ok(about.includes('class="nav-links"'));
  assert.ok(about.includes('href="/room/"'));
  assert.ok(about.includes('<footer'));
});

test('head exposes RSS, locale and complete share image metadata', () => {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  assert.match(html, /<link rel="alternate" type="application\/rss\+xml"/);
  assert.match(html, /<meta property="og:locale" content="zh_CN">/);
  assert.match(html, /<meta property="og:image:width" content="\d+">/);
  assert.match(html, /<meta property="og:image:height" content="\d+">/);
  assert.match(html, /<meta property="og:image:alt" content="[^"]+">/);
  assert.match(html, /<meta name="twitter:image:alt" content="[^"]+">/);
});

test('legacy category and article urls redirect to new column namespaces', () => {
  const columnHomes: Record<string, string> = {
    algorithm: '/algorithm/',
    math: '/math/',
    music: '/music/',
    game: '/game/',
    others: '/others/',
  };
  for (const [id, home] of Object.entries(columnHomes)) {
    const html = readFileSync(
      join(dist, 'categories', id, 'index.html'),
      'utf8',
    );
    assert.match(
      html,
      new RegExp(`http-equiv="refresh" content="0; url=${home}"`),
    );
    assert.match(html, /<meta name="robots" content="noindex, follow">/);
    assert.ok(
      html.includes(
        `rel="canonical" href="https://blog-lllllei.favorys.top${home}"`,
      ),
      `${id} canonical must point to ${home}`,
    );
  }

  const stub = readFileSync(
    join(dist, 'blog', 'cf-friend-tracker', 'index.html'),
    'utf8',
  );
  assert.match(
    stub,
    /http-equiv="refresh" content="0; url=\/others\/notes\/cf-friend-tracker\/"/,
  );
  assert.match(stub, /<meta name="robots" content="noindex, follow">/);
});

test('placeholder articles are noindex and excluded from sitemap', () => {
  const noindexPages: [string, string][] = [
    ['first-post', join('others', 'notes')],
    ['second-post', join('others', 'notes')],
    ['algorithm-column-intro', join('algorithm', 'notes')],
    ['math-column-intro', join('math', 'notes')],
    ['music-column-intro', join('music', 'notes')],
    ['game-column-intro', join('game', 'notes')],
  ];
  for (const [slug, dir] of noindexPages) {
    const html = readFileSync(join(dist, dir, slug, 'index.html'), 'utf8');
    assert.match(html, /<meta name="robots" content="noindex, follow">/);
  }

  const realArticle = readFileSync(
    join(dist, 'others', 'notes', 'cf-friend-tracker', 'index.html'),
    'utf8',
  );
  assert.ok(!realArticle.includes('name="robots" content="noindex'));

  const sitemapXml = readFileSync(join(dist, 'sitemap-0.xml'), 'utf8');
  for (const slug of noindexPages.map(([slug]) => slug))
    assert.ok(!sitemapXml.includes(slug));
  assert.ok(sitemapXml.includes('/others/notes/cf-friend-tracker/'));
  // 迁移桩不入 sitemap
  assert.ok(!sitemapXml.includes('/blog/cf-friend-tracker/'));
  assert.ok(!sitemapXml.includes('/categories/'));
});

test('retirement build unregisters old workers and does not register a new one', () => {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  assert.ok(html.includes('getRegistrations'));
  assert.ok(html.includes('registration.unregister'));
  assert.ok(!html.includes("serviceWorker.register('/sw.js')"));

  const worker = readFileSync(join(dist, 'sw.js'), 'utf8');
  assert.ok(worker.includes('self.registration.unregister()'));
  assert.ok(!worker.includes("addEventListener('fetch'"));
});

test('KaTeX styles stay on articles instead of the homepage', () => {
  const home = readFileSync(join(dist, 'index.html'), 'utf8');
  const article = readFileSync(
    join(dist, 'others', 'notes', 'cf-friend-tracker', 'index.html'),
    'utf8',
  );
  const cssLinks = (html: string) =>
    [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(
      (match) => match[1]!,
    );
  const cssText = (hrefs: string[]) =>
    hrefs
      .map((href) => readFileSync(join(dist, href.replace(/^\//, '')), 'utf8'))
      .join('\n');

  assert.ok(!cssText(cssLinks(home)).includes('.katex'));
  assert.ok(cssText(cssLinks(article)).includes('.katex'));
});

test('draft recommendations are filtered before sorting', () => {
  const source = readFileSync('src/components/PostSearch.astro', 'utf8');
  const start = source.indexOf("getCollection('blog')");
  assert.match(
    source.slice(start, start + 240),
    /filter\(\(p\) => !p\.data\.draft\)/,
  );
});

test('article structured data is valid JSON', () => {
  for (const file of htmlFiles().filter(
    (path) =>
      path.includes(`${join('blog', '')}`) ||
      path.includes(`${join('notes', '')}`),
  )) {
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    )) {
      assert.doesNotThrow(() => JSON.parse(match[1]!));
    }
  }
});
