# NewBlog

一个基于 [Astro](https://astro.build) 构建的静态博客，部署在 [GitHub Pages](https://pages.github.com) 上。

## 特性

- 🚀 极速静态生成
- 📝 Markdown / MDX 内容支持
- 🌙 自动深色模式
- 📱 响应式设计
- 🔍 SEO 友好（Open Graph、Twitter Card、Sitemap）
- 📡 RSS 订阅
- 🔄 GitHub Actions 自动部署

## 本地开发

```bash
npm install --legacy-peer-deps
npm run dev
```

然后打开 <http://localhost:4321/NewBlog/>。

## 写作

在 `src/content/blog/` 目录下新建 `.md` 或 `.mdx` 文件，例如：

```markdown
---
title: '文章标题'
description: '文章描述'
pubDate: '2025-08-01'
tags: ['标签']
---

正文内容……
```

## 部署

1. 在 GitHub 创建仓库 `yourusername/NewBlog`。
2. 修改 `astro.config.mjs` 中的 `site` 为你的 GitHub Pages 域名：
   ```js
   site: 'https://yourusername.github.io',
   base: '/NewBlog',
   ```
   如果仓库名为 `yourusername.github.io`，则删除 `base: '/NewBlog'` 这一行。
3. 推送代码到 `main` 分支，GitHub Actions 会自动构建并部署。
4. 在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。

## 项目结构

```
.
├── .github/workflows/deploy.yml  # 自动部署工作流
├── public/                       # 静态资源
├── src/
│   ├── components/               # 可复用组件
│   ├── content/blog/             # 博客文章
│   ├── layouts/                  # 页面布局
│   ├── pages/                    # 路由页面
│   ├── consts.ts                 # 站点常量
│   └── styles/global.css         # 全局样式
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

## 自定义

- 修改 `src/consts.ts` 中的站点标题、描述和作者信息。
- 修改 `src/styles/global.css` 调整主题颜色和样式。
- 在 `src/components/` 中添加更多组件。

## 许可

MIT
