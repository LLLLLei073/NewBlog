---
title: '欢迎来到我的博客'
description: '这是博客的第一篇文章，介绍如何使用 Astro 构建静态博客并部署到 GitHub Pages。'
pubDate: '2025-08-01'
series: '博客搭建'
---

欢迎来到我的博客！这是第一篇文章。

## 为什么选择 Astro？

[Astro](https://astro.build) 是一个现代化的静态站点生成器，它的主要优势包括：

- **零 JavaScript 默认**：页面只发送必要的 HTML，性能极佳
- **组件群岛**：可以在需要交互的地方使用 React、Vue、Svelte 等框架
- **内容优先**：对 Markdown、MDX 和 CMS 非常友好
- **优秀的开发者体验**：支持 TypeScript、快速热更新

## 部署方案

本博客将源代码推送到 GitHub 仓库，通过 GitHub Actions 自动构建并部署到 GitHub Pages。每次推送新文章时，网站会自动更新。

## 如何开始写作

只需要在 `src/content/blog/` 目录下新建一个 `.md` 文件，添加 frontmatter 元数据即可：

```markdown
---
title: '文章标题'
description: '文章描述'
pubDate: '2025-08-01'
category: 'algorithm'
---
```

感谢阅读！
