import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const temporarilyNoindex = [
  '/blog/first-post/',
  '/blog/second-post/',
  '/blog/algorithm-column-intro/',
  '/blog/math-column-intro/',
  '/blog/music-column-intro/',
  '/blog/game-column-intro/',
];

// https://astro.build/config
export default defineConfig({
  site: 'https://blog-lllllei.favorys.top',
  base: '/',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !temporarilyNoindex.some((path) => page.endsWith(path)),
    }),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
