# 五专栏独立界面 + 开屏动画 + 旧入口全量迁移计划

> 2026-10-26 批准实施。目标:算法、数学、音乐、游戏、其他五个专栏全部拥有
> 独立风格界面与专属开屏动画;站内不再有任何入口进入旧专栏界面,旧 URL
> 全部自动跳转到新界面。

**默认决策**:「其他」文章迁入 `/others/notes/<slug>/`,与四栏结构完全一致;
`/blog/` 保留为全站文章总目录。

## 总约束(全程遵守)

- 主题机制沿用 `pageName → body[data-page] → 语义令牌`;新专栏样式一律以
  `body[data-page='…']` 收口,暗色需覆盖 `body::before/after` 星空背景。
- 组件脚本必须走 `utils/lifecycle.ts` 的 `onPageLoad`;播放器
  `transition:persist="music-player"` 不动;程序化跳转用 `navigate()`/`postHref()`。
- React 岛屿 SSR 禁碰 window;Tailwind 只用现有 `algo-tw.css`(无 preflight)。
- 开屏统一行为:SSR 输出但 `hidden`、每会话只播一次(sessionStorage 独立
  key)、跳过按钮/Esc/Enter/空白点击、reduced-motion 直接移除、
  `astro:before-swap` 硬清理、WAAPI 只动 transform/opacity/stroke、无音频、
  ≤2.5s、无 JS 时正文直接可见。
- 静态托管无 301:旧 URL 迁移沿用 `meta refresh 0s + canonical + noindex +
兜底链接` 方案(`src/pages/blog/[...slug].astro` 原范式)。

## Phase 0 — 落盘与基线

- 本文档即计划落盘;Node 22 跑 `npm test` 基线全绿。

## Phase 1 — 路由与数据层统一(先接线后视觉)

1. `src/utils/postRoute.ts`:`NOTE_ROUTES` 增加 `others: '/others/notes/'`;
   `postHref` 未分类 fallback 也返回 `/others/notes/<id>/`;`isMigrated` 恒真。
2. `src/utils/notes-paths.ts`:`ColumnId` 加 `'others'`;`getNotePaths` 改用
   `getPostCategory(p.data).id === column` 匹配;`buildPostJsonLd` 的
   `articleSection` 改中文栏目名。
3. `src/utils/categories.ts`:五个 `path` 改为 `/algorithm/`、`/math/`、
   `/music/`、`/game/`、`/others/`。
4. `src/components/Header.astro`:删掉音乐/算法中文 label 特判,统一 `c.path`。
5. `src/components/room/config.ts`:课本→`/math/`、手柄→`/game/`、
   抽屉→`/others/`。
6. `src/components/room/CoalAssistant.astro`:文章索引改用 `postHref`。
7. `src/pages/categories/[category].astro`:改为纯迁移桩(meta refresh →
   对应新专栏首页 + canonical + noindex + 可点链接)。
8. `src/pages/blog/[...slug].astro`:全部文章变迁移桩,大幅简化;
   `/blog/index.astro` 保留全站总目录。
9. 新建 `src/pages/others/notes/[slug].astro`(`getNotePaths('others')`,
   Phase 5 前暂用 BlogPost)。
10. `astro.config.mjs` sitemap filter:排除 `/categories/<id>/` 与
    `/blog/<slug>/` 迁移桩(`/blog/` 索引本身保留)。
11. `README.md` 专栏路由表更新。
12. 测试同步:`tests/site.test.ts` 首页栏目断言改新地址;新增「旧分类页/
    旧文章页 = noindex 迁移桩 + canonical 指新地址」;noindex/sitemap 断言迁到
    新路径;`tests/assistant.test.ts` 断言助手链接已 postHref 化。
13. 验证:`npm run build && npm run test:site && npm run test:assistant &&
npm run test:room`。

## Phase 2 — 数学专栏「形与数 · 直觉图鉴」

**视觉**:美术馆/图鉴语言——骨白展墙 + 群青墨 + 朱砂点缀、衬线大标题、
几何构图内联 SVG(圆规弧、正弦曲线、定理图版)。文章页引入
`katex/dist/katex.min.css`。

**新建**:`src/styles/math.css`、`src/data/math/column.ts`、
`src/components/math/MathNav.astro`、`src/components/math/GeometryPlate.astro`、
`src/pages/math/index.astro`、`src/pages/math/notes.astro`。

**开屏** `src/components/intro/MathIntro.astro` + `mathIntro.ts`
(key `math-column-intro-v1`):展墙淡入 → 点/线/圆规弧线依次绘制 → 正弦
曲线扫过 → 标题「形与数」两行遮罩显现 → 图版编号 + 印章 → FLIP 交接首页
hero 图版(失败退化交叉淡化)。

## Phase 3 — 游戏专栏「玩法解剖室 · PLAYLAB」

**视觉**:街机/debug HUD——深炭底 + 信号绿/珊瑚橙/紫罗兰,等宽字点缀,
HUD 边框、存档槽卡片,扫描线极淡且仅暗色。

**新建**:`src/styles/game.css`、`src/data/game/column.ts`、
`src/components/game/GameNav.astro`、`src/components/game/HudCard.astro`、
`src/pages/game/index.astro`、`src/pages/game/notes.astro`。

**开屏** `GameIntro.astro` + `gameIntro.ts`(key `game-column-intro-v1`):
黑屏 HUD 引导行逐条「打印」→ 像素光标闪烁 → 标题「玩法解剖室」扫入 →
START 徽章脉冲 → FLIP 交接 hero 存档槽。无音频自动播放。

## Phase 4 — 其他专栏「抽屉杂记」

**视觉**:软木板留言板——软木棕底 + 牛皮纸/米黄/浅绿便签 + 纸胶带 + 图钉,
等宽日期戳,卡片轻微确定性旋转(按 slug hash)。

**新建**:`src/styles/others.css`、`src/data/others/column.ts`、
`src/components/others/OthersNav.astro`、`src/components/others/PinnedNote.astro`、
`src/pages/others/index.astro`、`src/pages/others/notes.astro`。

**开屏** `OthersIntro.astro` + `othersIntro.ts`(key `others-column-intro-v1`):
抽屉两段拉开 → 三张便签依次飞入并钉住(落钉回弹)→ 标题「抽屉杂记」盖章 →
交叉淡化进首页。

## Phase 5 — 共用文章骨架、音乐与算法收尾

1. 以 `BlogPost.astro` 为底演进出 `src/layouts/ColumnPost.astro`:保留全部
   文章能力(TOC、上下篇、系列、推荐、评论、分享、阅读进度、键盘翻页),
   新增 `pageName`、`backHref`、`categoryLabel`;原 BlogPost 验证后删除。
2. `music/math/game/others` 四个 `notes/[slug].astro` 切到 ColumnPost +
   各自 pageName/backHref/中文栏目名;头部加专栏铭牌。
3. 音乐各页内部嵌套 `<main>` 改 `section`。
4. 算法补齐:`AlgorithmIntro`(节点-边网络生长 → 标题 → FLIP 交接 hero,
   key `algorithm-column-intro-v1`);`complexity.astro` 引 KaTeX CSS;
   `map.astro` 把 `next.noteSlug` 转成 `href`;`AlgorithmPost` 透传 `noindex`。
5. 共用开屏控制器 `src/components/intro/columnIntro.ts`(会话门控/焦点/
   滚动锁/跳过/reduced-motion/before-swap 硬清理),算法/数学/游戏/其他四个
   新开屏共用;音乐现有 `intro.ts` 不动。

## Phase 6 — 入口清扫与全量验收

- 全局 grep `/categories/`、`/blog/${`、`window.location` 残留,逐一消灭
  (允许保留:迁移桩自身、`/blog/` 总目录入口)。
- 浏览器验收矩阵:五专栏首页+列表+文章 ClientRouter 往返;每个开屏首次/
  重复/Esc/动画中离开/reduced-motion/无 JS;播放器跨专栏连续播放且 DOM 仅
  一个 audio;390/768/1440 无横向溢出;暗色;算法 React 深链无 hydration 告警。
- 最终命令:`npm run build && npm test && npx --no-install tsc --noEmit &&
npm run format:check`。
- 每个 Phase 单独 commit。

## 完成标准

1. `/categories/<五栏目>/` 与 `/blog/<任何文章>/` 全部是 noindex 迁移桩,
   0 秒跳新地址且不入 sitemap。
2. 首页/导航/关于页/小房间/小煤球/搜索/归档/RSS 不再产生任何旧专栏或旧
   文章链接。
3. 五专栏 `body[data-page]` 各自独立主题,文章页同专栏一致。
4. 五个首页各有一段 ≤2.5s 开屏:会话一次、可跳过、reduced-motion/无 JS
   直接正文。
5. 全部 npm test + tsc + prettier 通过。
