/**
 * 各专栏文章的专属命名空间映射。
 * algorithm / music / math / game 专栏文章走 /<column>/notes/<slug>/,
 * 未分类文章留在 /blog/<slug>/。旧 /blog/ 地址由 blog/[...slug].astro
 * 生成重定向桩承接。全站生成文章链接一律经过 postHref。
 */

const NOTE_ROUTES: Record<string, string> = {
  algorithm: '/algorithm/notes/',
  music: '/music/notes/',
  math: '/math/notes/',
  game: '/game/notes/',
};

/** 文章最终访问地址(带尾斜杠)。 */
export function postHref(id: string, category?: string | null): string {
  const prefix = (category && NOTE_ROUTES[category]) || '/blog/';
  return `${prefix}${id}/`;
}

/** 该文章是否已迁入专栏命名空间(旧 /blog/ 地址需要重定向)。 */
export function isMigrated(category?: string | null): boolean {
  return Boolean(category && NOTE_ROUTES[category]);
}
