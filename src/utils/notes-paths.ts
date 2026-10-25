/**
 * 专栏文章路由(/<column>/notes/<slug>/)的共享 getStaticPaths 工厂。
 * 上一篇/下一篇按「栏内」相邻计算;系列与推荐阅读仍在全站范围挑选。
 * 供 algorithm/music/math/game 四个 notes/[slug].astro 复用。
 */
import { type CollectionEntry, getCollection } from 'astro:content';
import { SITE_AUTHOR, SITE_AUTHOR_IMAGE, SITE_URL } from '../consts.ts';
import { postHref } from './postRoute.ts';

export type ColumnId = 'algorithm' | 'music' | 'math' | 'game';

export type Nav = { slug: string; title: string; href: string };
export type Related = {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
  category: string | null;
  href: string;
};
export type SeriesPost = { slug: string; title: string; href: string };

export type NoteProps = {
  post: CollectionEntry<'blog'>;
  newer: Nav | null;
  older: Nav | null;
  related: Related[];
  seriesPosts: SeriesPost[];
  seriesName: string | null;
};

const asNav = (p: CollectionEntry<'blog'>): Nav => ({
  slug: p.id,
  title: p.data.title,
  href: postHref(p.id, p.data.category),
});

export async function getNotePaths(
  column: ColumnId,
): Promise<{ params: { slug: string }; props: NoteProps }[]> {
  const all = (await getCollection('blog'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const own = all.filter((p) => p.data.category === column);

  return own.map((post, i) => {
    const newer = i > 0 ? asNav(own[i - 1]) : null;
    const older = i < own.length - 1 ? asNav(own[i + 1]) : null;

    const seriesPosts: SeriesPost[] = post.data.series
      ? all
          .filter((p) => p.id !== post.id && p.data.series === post.data.series)
          .map((p) => ({
            slug: p.id,
            title: p.data.title,
            href: postHref(p.id, p.data.category),
          }))
      : [];

    // 推荐阅读:先同专栏近邻,不足用其他文章补齐(与全站规则一致)
    const sameCat = all.filter(
      (p) =>
        p.id !== post.id &&
        (p.data.category ?? null) === (post.data.category ?? null),
    );
    const otherCat = all.filter(
      (p) =>
        p.id !== post.id &&
        (p.data.category ?? null) !== (post.data.category ?? null),
    );
    const related: Related[] = [...sameCat, ...otherCat]
      .slice(0, 3)
      .map((p) => ({
        slug: p.id,
        title: p.data.title,
        description: p.data.description,
        pubDate: p.data.pubDate,
        category: p.data.category ?? null,
        href: postHref(p.id, p.data.category),
      }));

    return {
      params: { slug: post.id },
      props: {
        post,
        newer,
        older,
        related,
        seriesPosts,
        seriesName: post.data.series ?? null,
      },
    };
  });
}

/** 文章结构化数据(SEO),地址按专栏命名空间生成。 */
export function buildPostJsonLd(post: CollectionEntry<'blog'>) {
  const { title, description, pubDate, updatedDate, heroImage, category } =
    post.data;
  const href = postHref(post.id, category);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    datePublished: pubDate.toISOString(),
    ...(updatedDate ? { dateModified: updatedDate.toISOString() } : {}),
    author: {
      '@type': 'Person',
      name: SITE_AUTHOR,
      url: SITE_URL,
      image: new URL(SITE_AUTHOR_IMAGE, SITE_URL).toString(),
    },
    publisher: { '@type': 'Person', name: SITE_AUTHOR, url: SITE_URL },
    ...(category ? { articleSection: category } : {}),
    mainEntityOfPage: new URL(href, SITE_URL).toString(),
    ...(heroImage ? { image: new URL(heroImage, SITE_URL).toString() } : {}),
  };
}
