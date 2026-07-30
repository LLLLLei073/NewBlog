import { getCollection } from 'astro:content';

export interface TagInfo {
  tag: string;
  count: number;
}

/** 收集所有非草稿文章的标签及出现次数，按数量降序、名称升序排列。 */
export async function getAllTags(): Promise<TagInfo[]> {
  const posts = (await getCollection('blog')).filter((p) => !p.data.draft);
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh'));
}

/** 标签筛选页的链接路径。 */
export function tagPath(tag: string): string {
  return `/tags/${encodeURIComponent(tag)}/`;
}
