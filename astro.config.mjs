import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  site: 'https://blog-lllllei.favorys.top',
  base: '/',
  integrations: [mdx(), react(), sitemap()],
  vite: {
    // 算法专栏「演算手稿」的 React 岛屿使用 Tailwind v4 工具类;
    // 样式经 src/styles/algo-tw.css 引入(不含 preflight,不影响全站)
    plugins: [tailwindcss()],
  },
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
