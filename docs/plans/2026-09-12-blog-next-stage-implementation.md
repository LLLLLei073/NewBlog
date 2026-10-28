# 徐磊个人博客下一阶段 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把当前“房间直接作为首页”的版本升级为自然滚动的个人主页，修复草稿与导航细节，保留小房间和小煤球作为最终入口，并降低首屏资源开销。

**Architecture:** Astro 继续静态构建，文章数据和既有 URL 不变。首页新增独立滚动叙事组件；Header、Footer 通过沉浸模式参数仅在首页简化；Three.js 与助手脚本只在首页末尾房间接近视口后加载。栏目和房间入口继续复用同一份配置，搜索数据在构建期从非草稿文章生成。

**Tech Stack:** Astro 7、TypeScript、Three.js、Markdown/MDX、Node test、GitHub Pages。

---

## 发布范围与明确取舍

- 本轮包含：滚动首页、首页星空暗色、房间渐进增强、小煤球助手恢复、草稿过滤、中文栏目名、移动文章页遮挡修复、基础 SEO 和资源整理。
- 本轮不包含：AI 对话、全文搜索、后台、数据库、新栏目、音效、自由旋转房间、自动编造或批量生成文章。
- 现有九个房间入口、文章 URL、Markdown 数据结构、Giscus 评论、RSS 与 GitHub Pages 部署方式保持兼容。
- 占位文章继续保留 URL，但加入可选 `noindex`；不删除已经公开的页面。真实内容由徐磊提供经历和素材后再扩写。

## Task 1：建立安全工作区和回归基线

**Files:**

- Modify: `tests/room.test.ts`
- Create: `tests/site.test.ts`
- Modify: `package.json`

1. 获取最新 `origin/main`，确认当前 `main` 干净且与远端一致；从远端创建 `codex/blog-next-stage` 独立 worktree，不直接在发布中的 `main` 上开发。
2. 在 `tests/site.test.ts` 增加构建产物检查：18 个现有路由继续生成、内部链接无缺失、每页有唯一 title/description/canonical、文章 JSON-LD 可解析。
3. 增加草稿隔离测试：草稿不能进入首页、栏目、归档、RSS、推荐搜索和 sitemap。
4. 在 `package.json` 中让 `npm test` 依次执行构建、站点测试、房间测试和助手测试。
5. 运行 `npm test`，记录当前通过项和新测试的预期失败，再提交 `test: add site regression baseline`。

## Task 2：修复数据一致性问题

**Files:**

- Modify: `src/components/PostSearch.astro`
- Modify: `src/utils/categories.ts`
- Modify: `src/pages/archives.astro`
- Modify: `src/pages/blog/[...slug].astro`

1. 先写测试，证明空搜索推荐当前可能包含草稿，并验证归档、文章卡片和推荐阅读不应显示 `algorithm` 等内部 ID。
2. `PostSearch` 的推荐数据在排序前统一执行 `!post.data.draft` 过滤。
3. 所有用户可见栏目名称统一调用 `getPostCategory()`，显示“算法、数学、音乐、游戏、其他”，内部 ID 只用于 URL 和数据字段。
4. `BlogPosting.articleSection` 改为中文栏目名；未填写 category 的文章正确标记为“其他”。
5. 运行站点测试和构建，提交 `fix: keep drafts private and localize categories`。

## Task 3：实现自然滚动首页

**Files:**

- Create: `src/components/home/HomeJourney.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/utils/categories.ts`

1. 为首页静态结构写测试：一个 H1、五段栏目介绍、最后一个房间区域；不得出现“最近写的”和首页九宫格常驻导航。
2. 第一屏使用普通学生口吻：标题“你好，我是徐磊”，简介说明自己是大学生、在学习和写代码，不使用职业品牌或夸张口号。
3. 按算法、数学、音乐、游戏、其他顺序渲染五段不可点击的栏目介绍；名称与基础说明复用 `CATEGORIES`，每段使用原创 SVG 线稿。
4. 页面使用自然长页滚动，不吸附、不锁屏；IntersectionObserver 只播放一次淡入，脚本不可用时内容默认可见。
5. `prefers-reduced-motion: reduce` 下取消绘制、位移、闪烁与平滑滚动。
6. 删除首页“最近写的”，把“小房间”设为最终段落和唯一具体栏目入口。
7. 运行测试和格式检查，提交 `feat: add scrolling student homepage`。

## Task 4：首页沉浸导航与暗色主题

**Files:**

- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/Header.astro`
- Modify: `src/components/Footer.astro`
- Modify: `src/styles/global.css`

1. 为 `BaseLayout` 增加明确的 `immersiveHome` 布尔参数，并传给 Header、Footer；不要复用含义模糊的 `room` 参数控制多个行为。
2. 首页 Header 只渲染站名与主题按钮，不渲染栏目、RSS 和移动菜单；其他路由维持现有完整导航。
3. 首页不渲染页脚导航，房间来源与许可作为页面最后内容；其他页面页脚不变。
4. 删除首页强制纯色背景和隐藏 `body::before/after` 的规则，默认暗色恢复全站星空；极简暗色仍关闭星云和星点。
5. 主题按钮触摸面积提升到至少 44×44px，暗色变体按钮的 aria-label 包含当前模式。
6. 检查首页与文章页的浅色、星空、极简暗色三种状态，提交 `feat: add immersive home shell and restore starfield`。

## Task 5：房间渐进增强与延迟加载

**Files:**

- Modify: `src/components/room/Room.astro`
- Modify: `src/components/room/interaction.ts`
- Modify: `src/components/room/scene.ts`
- Modify: `tests/room.test.ts`

1. 扩展测试：九个目标地址不变，WebGL 成功时普通入口视觉隐藏，键盘聚焦时可展开；WebGL 失败或无脚本时入口始终可见。
2. WebGLRenderer 使用透明画布，Three 场景背景设为 `null`，使浅色纸张和暗色星空能延续到房间区域。
3. 静态线稿先渲染；房间距离视口约一屏时再动态导入 Three.js，加载完成后无布局跳动地替换占位图。
4. 正常状态下把普通九宫格裁剪为视觉隐藏内容，但保留在可访问树中；Tab 聚焦后展开并同步高亮房间物品。
5. 页面隐藏时暂停，pagehide/路由切换时释放 WebGL、ResizeObserver 和事件监听器；上下文丢失后回退静态入口。
6. 保持移动端 `pan-y pinch-zoom`，滑动、长按、多指和取消事件不得触发跳转。
7. 在 1120×620、720×392、343×340、288×340 下运行拾取测试，提交 `perf: lazy load transparent room scene`。

## Task 6：恢复首页专属小煤球助手

**Files:**

- Create: `src/components/room/CoalAssistant.astro`
- Create: `src/components/room/assistant.ts`
- Create: `tests/assistant.test.ts`
- Modify: `src/components/room/Room.astro`

1. 先写助手测试：只索引非草稿文章；标题、摘要和中文栏目支持空格分词 AND 匹配；空输入显示最近三篇；首屏显示六条；随机文章只选择已发布文章。
2. 使用原创 SVG 绘制黑色团子、白眼睛和手绘眼镜，不复制参考仓库素材；助手位置跟随房间舞台，不固定在浏览器角落。
3. 点击后在房间下方展开工具面板，提供找笔记、九个房间入口、随便读一篇、休息/叫醒；不做聊天，不请求后端，不上传关键词。
4. 桌面支持眼睛轻微跟随和偶尔眨眼；触屏滑动不打开；减少动态效果、页面隐藏或休息时停止动画。
5. Escape 收起并把焦点还给助手；面板提供清晰标题、状态提示和至少 44px 操作区域。
6. WebGL 失败时助手仍可作为静态线稿使用；无 JavaScript 时只显示形象和原有普通入口，不显示失效控件。
7. 运行助手测试、房间测试和浏览器键盘检查，提交 `feat: add homepage coal note helper`。

## Task 7：文章页移动体验与可访问性

**Files:**

- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/layouts/BlogPost.astro`
- Modify: `src/components/Header.astro`

1. 在 BaseLayout 开头增加“跳到正文”链接，并给主内容稳定 id；仅键盘聚焦时显示。
2. 移动菜单打开后聚焦第一个链接，Tab/Shift+Tab 保持在菜单内，Escape 或选择链接后关闭并恢复焦点。
3. 文章悬浮目录按钮使用 `env(safe-area-inset-bottom)`，正文增加相应底部/右侧安全空间，确保 320–375px 时不遮住文字、代码或评论输入框。
4. 悬浮面板打开时正确设置 aria-hidden/aria-expanded；点击外部、Escape 和路由离开均清理状态。
5. 桌面左侧文章列表最多显示当前栏目最近八篇，完整文章列表仍由 `/blog/` 承担，避免文章增长后侧栏无限延长。
6. 运行键盘、读屏结构和手机截图检查，提交 `fix: improve article navigation accessibility`。

## Task 8：按页面加载资源并整理 PWA

**Files:**

- Modify: `src/styles/global.css`
- Modify: `src/layouts/BlogPost.astro`
- Modify: `src/components/MermaidEnhance.astro`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `public/sw.js`
- Delete: `public/fonts/Inter-400.woff2`, `Inter-500.woff2`, `Inter-600.woff2`, `Inter-700.woff2`

1. 将 KaTeX CSS 从全局样式移动到文章布局，确保首页、关于和栏目页不携带数学 CSS；不引入新的数学库。
2. 删除当前未被 CSS 使用的四个 Inter 文件，保留 JetBrains Mono；构建后确认没有 404 字体请求。
3. Mermaid 继续仅在存在图表代码块时加载，并改用严格安全模式；失败时保留可读错误和原始源码入口。
4. 停止新页面注册 Service Worker；`sw.js` 保留一个发布周期作为退役脚本，注销旧 worker 并删除 `lllllei-*` 缓存，避免老用户长期看到旧页面。
5. 保留 manifest 和站点图标，但不宣传离线能力；下一次稳定发布后再删除退役脚本。
6. 对比构建资源：首屏不请求 Three.js、KaTeX 字体或 Mermaid；提交 `perf: scope heavy assets and retire service worker`。

## Task 9：补齐低成本 SEO 与公开内容状态

**Files:**

- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/layouts/BlogPost.astro`
- Modify: `src/content.config.ts`
- Modify: `src/pages/about.astro`
- Modify: `src/content/blog/*.md`

1. Head 增加 RSS discovery、`og:locale=zh_CN`、图片 alt/宽高字段；继续使用当前 canonical 与站点 URL。
2. 关于页增加与可见内容一致的 `ProfilePage` + `Person` JSON-LD，不添加不存在的学历、奖项或职业经历。
3. 文章页显示作者“徐磊”和真实更新时间；结构化数据同步中文栏目、作者、发布日期和修改日期。
4. content schema 增加 `noindex` 可选字段；欢迎、Markdown 示例和“即将上线”占位文章先设为 noindex，但保留路由。真实扩写完成后逐篇移除。
5. 为项目文章预留 `heroImage`，第一批只使用真实截图，不生成虚假的产品界面；没有图片时继续使用全站默认分享图。
6. 运行构建并验证 sitemap、robots、RSS、canonical 和 JSON-LD，提交 `seo: improve discovery and mark placeholder posts`。

## Task 10：完整验收与发布

1. 运行 `npm test`、`npm run format:check`、`git diff --check`，要求全部通过且无新增警告；Three.js 大包警告允许存在，但必须确认它不进入首屏请求。
2. 在 1440、768、375、320px 检查：首页首屏、五段介绍、最后房间、小煤球面板、文章正文、移动菜单和评论区，无横向溢出。
3. 验证浅色、星空、极简暗色、减少动态效果、JavaScript 禁用、WebGL 禁用和页面后台恢复。
4. 验证九个房间目标、台灯、助手搜索、中文输入、空结果、随机文章、Escape、焦点恢复和滑动不误触。
5. 本地确认后从干净发布分支合并；推送前再次获取远端状态，不覆盖新的远端提交。
6. 推送后等待 GitHub Actions 完成，在线检查首页、任一栏目、任一文章、RSS、sitemap、404 和 HTTPS；确认旧 Service Worker 不再控制页面。

## 内容工作（独立于代码发布）

- 第一阶段写三篇真实文章：一篇项目复盘、一篇算法/数学学习记录、一篇兴趣文章；每篇包含自己遇到的问题、尝试过程和最后结论。
- `CF Friends` 补真实界面截图、项目地址、安装方式、当前限制、数据保存方式，以及 API Key/Secret 不得提交到仓库的提醒。
- 不要求固定周更，默认目标为每两周一篇完整文章；占位专栏文章在有真实内容后再恢复索引。

## 最终验收标准

- 首页符合“开屏介绍 → 五个栏目 → 小房间”的自然滚动顺序，首页不出现重复具体导航和最近文章。
- 默认暗色为原夜空，极简暗色仍可选，房间画布没有纯色矩形断层。
- 其他页面完整导航、文章 URL、评论、RSS 和分享功能不回归。
- 草稿不会通过任何列表或推荐泄露，用户界面不显示英文栏目 ID。
- 首屏不加载 Three.js、Mermaid、KaTeX 字体；320px 不溢出，悬浮按钮不遮正文。
- 构建、格式、站点、房间和助手测试全部通过，线上部署与本地构建一致。
