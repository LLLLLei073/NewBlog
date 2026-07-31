import { getCollection, type CollectionEntry } from 'astro:content';

export interface CategoryDef {
  /** 唯一标识（与 path 用），英文小写。 */
  id: 'algorithm' | 'math' | 'music' | 'game' | 'others';
  /** 中文显示名。 */
  label: string;
  /** 页面路径。 */
  path: string;
  /** 导航栏上的简短描述（可选）。 */
  description: string;
}

/** 五个专栏定义。前四个对应 frontmatter 的 category 字段，others 为兜底。 */
export const CATEGORIES: readonly CategoryDef[] = [
  { id: 'algorithm', label: '算法', path: '/categories/algorithm/', description: '算法、数据结构、刷题笔记' },
  { id: 'math',      label: '数学', path: '/categories/math/',      description: '高等数学、线性代数、概率论' },
  { id: 'music',     label: '音乐', path: '/categories/music/',     description: '乐理、编曲、乐器演奏' },
  { id: 'game',      label: '游戏', path: '/categories/game/',      description: '游戏开发、设计、攻略' },
  { id: 'others',    label: '其他', path: '/categories/others/',    description: '未归入以上专栏的文章' },
] as const;

/** id → CategoryDef 的快速查找表。 */
export const CATEGORY_BY_ID: Record<string, CategoryDef> =
  Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

/**
 * 根据 frontmatter 的 category 字段决定文章所属专栏。
 * 规则：category 命中 algorithm/math/music/game 之一即归入该专栏；
 * 未填写或非法值一律归入 `others`。
 */
export function getPostCategory(
  post: Pick<CollectionEntry<'blog'>['data'], 'category'>,
): CategoryDef {
  const cat = post.category;
  if (cat && CATEGORY_BY_ID[cat] && cat !== 'others') return CATEGORY_BY_ID[cat]!;
  return CATEGORY_BY_ID['others']!;
}

/**
 * 一次性把所有非草稿文章按专栏分组并按发布时间倒序排序。
 * 返回的 Map 键为 CategoryDef，值是该专栏下的文章列表（已按时间倒序）。
 * 一定包含全部 5 个专栏键（即使为空数组）。
 */
export async function groupPostsByCategory(): Promise<Map<CategoryDef, CollectionEntry<'blog'>[]>> {
  const posts = (await getCollection('blog')).filter((p) => !p.data.draft);
  const groups = new Map<CategoryDef, CollectionEntry<'blog'>[]>();
  for (const cat of CATEGORIES) groups.set(cat, []);
  for (const post of posts) {
    const cat = getPostCategory(post.data);
    groups.get(cat)!.push(post);
  }
  for (const [cat, list] of groups) {
    list.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  }
  return groups;
}
