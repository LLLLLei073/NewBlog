/** Local-only metadata search; never includes article bodies or drafts. */
export interface AssistantPost {
  title: string;
  description: string;
  category: string;
  href: string;
  publishedAt: string;
}

interface SourcePost {
  id: string;
  data: {
    title: string;
    description: string;
    category?: string;
    pubDate: Date;
    draft?: boolean;
  };
}

export function buildAssistantIndex(
  posts: SourcePost[],
  labels: Record<string, string>,
): AssistantPost[] {
  return posts
    .filter((post) => !post.data.draft)
    .sort(
      (a, b) =>
        b.data.pubDate.valueOf() - a.data.pubDate.valueOf() ||
        a.id.localeCompare(b.id),
    )
    .map(({ id, data }) => ({
      title: data.title,
      description: data.description,
      category: labels[data.category || 'others'] || labels.others || '其他',
      href: `/blog/${id}/`,
      publishedAt: data.pubDate.toISOString(),
    }));
}

export function searchPosts(posts: AssistantPost[], query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  return terms.length
    ? posts.filter((post) => {
        const text =
          `${post.title} ${post.description} ${post.category}`.toLocaleLowerCase();
        return terms.every((term) => text.includes(term));
      })
    : posts;
}

export function resultPage(
  posts: AssistantPost[],
  query: string,
  expanded = false,
) {
  const searching = query.trim().length > 0;
  const matches = searchPosts(posts, query);
  const empty = searching && matches.length === 0;
  const visible =
    !searching || empty
      ? posts.slice(0, 3)
      : expanded
        ? matches
        : matches.slice(0, 6);
  return {
    visible,
    empty,
    total: matches.length,
    more: searching && !empty && !expanded && matches.length > 6,
  };
}

export function randomPost(
  posts: AssistantPost[],
  random = Math.random,
): AssistantPost | undefined {
  if (!posts.length) return undefined;
  return posts[
    Math.min(posts.length - 1, Math.max(0, Math.floor(random() * posts.length)))
  ];
}

/** Safe inside an inert application/json script, including user-written titles. */
export function serializeIndex(posts: AssistantPost[]) {
  return JSON.stringify(posts).replace(/</g, '\\u003c');
}
