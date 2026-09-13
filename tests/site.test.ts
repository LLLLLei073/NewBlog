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
  assert.equal(files.length, 18);
  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    assert.equal(
      (html.match(/<title>/g) ?? []).length,
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

test('homepage is a five chapter journey ending in the room', () => {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  assert.equal((html.match(/data-home-chapter=/g) ?? []).length, 5);
  assert.ok(html.includes('你好，'));
  assert.ok(html.includes('我是徐磊。'));
  assert.ok(html.includes('来我的小房间坐坐'));
  assert.ok(!html.includes('recent-notes'));
  assert.ok(
    html.indexOf('data-home-chapter') < html.indexOf('data-room-stage'),
  );
  assert.ok(!html.includes('class="nav-links"'));
  assert.ok(!html.includes('id="mobile-menu"'));
  assert.ok(!html.includes('class="rss-link"'));
  assert.ok(!html.includes('<footer'));

  const about = readFileSync(join(dist, 'about', 'index.html'), 'utf8');
  assert.ok(about.includes('class="nav-links"'));
  assert.ok(about.includes('id="mobile-menu"'));
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

test('placeholder articles are noindex and excluded from sitemap', () => {
  const noindexSlugs = [
    'first-post',
    'second-post',
    'algorithm-column-intro',
    'math-column-intro',
    'music-column-intro',
    'game-column-intro',
  ];
  for (const slug of noindexSlugs) {
    const html = readFileSync(join(dist, 'blog', slug, 'index.html'), 'utf8');
    assert.match(html, /<meta name="robots" content="noindex, follow">/);
  }

  const realArticle = readFileSync(
    join(dist, 'blog', 'cf-friend-tracker', 'index.html'),
    'utf8',
  );
  assert.ok(!realArticle.includes('name="robots" content="noindex'));

  const sitemapXml = readFileSync(join(dist, 'sitemap-0.xml'), 'utf8');
  for (const slug of noindexSlugs) assert.ok(!sitemapXml.includes(slug));
  assert.ok(sitemapXml.includes('/blog/cf-friend-tracker/'));
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
    join(dist, 'blog', 'cf-friend-tracker', 'index.html'),
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
  for (const file of htmlFiles().filter((path) =>
    path.includes(`${join('blog', '')}`),
  )) {
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    )) {
      assert.doesNotThrow(() => JSON.parse(match[1]!));
    }
  }
});
