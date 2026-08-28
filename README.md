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
npm install
npm run dev
```

然后打开 <http://localhost:4321/>。

## 写作

在 `src/content/blog/` 目录下新建 `.md` 或 `.mdx` 文件，例如：

```markdown
---
title: '文章标题'
description: '文章描述'
pubDate: '2025-08-01'
category: 'algorithm' # 可选：algorithm | math | music | game，不填归入「其他」
---
```

正文内容……

```

## 专栏

文章按 `category` 前置字段归入五大专栏（`/categories/<id>/`）：

| category | 专栏 | 路径 |
| --- | --- | --- |
| `algorithm` | 算法 | `/categories/algorithm/` |
| `math` | 数学 | `/categories/math/` |
| `music` | 音乐 | `/categories/music/` |
| `game` | 游戏 | `/categories/game/` |
| （不填） | 其他 | `/categories/others/` |
## 部署

站点通过 GitHub Pages 部署，并绑定自定义域名 `blog-lllllei.favorys.top`：

1. 在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。
2. 在 **Settings → Pages → Custom domain** 填入自定义域名，并在域名服务商处
   添加 CNAME 记录指向 `<username>.github.io`（仓库内的 `public/CNAME`
   会在每次部署时保留该域名）。
3. 推送代码到 `main` 分支，GitHub Actions 会自动构建并部署
   （工作流见 `.github/workflows/deploy.yml`）。
4. 站点地址在 `astro.config.mjs` 的 `site` 中维护，部署在根路径
   （`base: '/'`），无需子路径配置。

## 项目结构

```

.
├── .github/workflows/deploy.yml # 自动部署工作流
├── public/ # 静态资源
├── src/
│ ├── components/ # 可复用组件
│ ├── content/blog/ # 博客文章
│ ├── layouts/ # 页面布局
│ ├── pages/ # 路由页面
│ ├── consts.ts # 站点常量
│ └── styles/global.css # 全局样式
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
```
