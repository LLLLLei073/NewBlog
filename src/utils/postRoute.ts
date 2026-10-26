/**
 * 各专栏文章的专属命名空间映射。
 * 五个专栏(algorithm/music/math/game/others)文章全部走 /<column>/notes/<slug>/,
 * 未分类文章归入 others。旧 /blog/<slug>/ 地址由 blog/[...slug].astro 生成
 * 重定向桩承接。全站生成文章链接一律经过 postHref。
 */

const NOTE_ROUTES: Record<string, string> = {
  algorithm: '/algorithm/notes/',
  music: '/music/notes/',
  math: '/math/notes/',
  game: '/game/notes/',
  others: '/others/notes/',
};

/** 文章最终访问地址(带尾斜杠)。未识别的 category 一律归入其他专栏。 */
export function postHref(id: string, category?: string | null): string {
  const prefix = (category && NOTE_ROUTES[category]) || NOTE_ROUTES.others!;
  return `${prefix}${id}/`;
}
