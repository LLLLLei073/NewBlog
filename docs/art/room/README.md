# 同一间书房：素材与验收

> 历史记录：以下说明对应旧二维插画房间。当前房间已迁移为三维场景，见 [三维书房说明](../../room3d/README.md)。原始素材保留用于溯源；旧动作图集与遮挡渲染不再使用。

实现位于 `codex/illustrated-home`，基于当前未发布的插画首页继续开发。本轮未提交、推送或部署。

## 交付内容

- `background-original.png`：首页书房的远景，无固定人物。
- `character-original.png`：12 个少女姿态，含 6 个步行帧、站立、窗边、伸手取书、阅读和起身。人物与首页保持相同头发、服装和画风。
- `alpha-original.png`：与角色图对齐的黑白剪影遮罩。
- `normal-original.png`：房间局部重光照法线图。
- `foreground-original.png`：桌面、桌腿及右侧植物的前景遮挡遮罩。

全部由 Codex 内置 image_gen 生成。没有使用 API Key CLI，也没有借用他人的角色素材。原始 PNG 保留在这里，站点使用 public/art/room 下对应 WebP：背景和角色 quality 92，其余无损；仅转换格式。合计约 3.25 MB，静态首图约 381 KB。

素材服务未能返回真正带 alpha 的角色图，返回了烘焙棋盘格。因此补做独立二值角色遮罩，由 WebGL 在渲染时组合，避免棋盘格进入画面。动画图没有机械切成等宽格，而是根据真实姿态轮廓逐个标定矩形和躯干锚点，保留完整步幅。左右行走共用姿态并镜像，镜像时相应转换锚点。

## 行为与边界

少女沿预设无障碍路线自主选择书桌、窗边和书架，阅读停留 24–38 秒。小煤球在前景安全地面选择目标，短跳、回弹和滚动，停留 4–11 秒。鼠标接近、触摸按下、键盘焦点、面板展开和休息时停止位移。固定“找笔记”入口始终可用。

两页共享 `lllllei-study-paused` 和 `lllllei-study-lamp`；台灯为 auto/on/off，原文章主题键不受影响。减少动态效果优先，后台取消动画和分钟计时，返回时恢复；画布最长边 1920，DPR 上限 1.5，最高 30fps。手机场景按 3:2 完整显示，九个入口在下方；桌面额外提供对应物品热点。

这是一套有明确动作帧的二维分层插画，不是三维骨骼角色。动作是有限的步行和日常姿态序列，行走范围受家具和安全路线限制；不提供任意寻路、旋转镜头或复杂物理碰撞。法线图与遮挡是艺术化近似，保留部分原画阴影。

旧黑白线框的渲染、拾取和手势实现已删除；旧来源许可文件保留作为历史素材说明。无新增依赖。

## 已完成验证

- 构建 19 个页面，24 项测试通过；旧几何测试替换为路线连续性、禁入区域、煤球安全距离和原入口保留测试。
- 浏览器检查清晨、正午、黄昏、午夜，台灯跟随/开/关；检查阅读、起身、行走、窗边及取书姿态。测试页运行了三个完整循环（3 倍时间播放），正常页面也验证了自主活动。
- 生命周期测试：1.1 秒窗口运行 31 帧，暂停 0 帧，后台 0 帧，恢复 31 帧；pagehide 停止，上下文丢失及恢复通过。
- 无 WebGL 和素材失败均显示静态图，保留 9 个入口及搜索；减少动态效果时只作初始化绘制，按钮禁用。
- 1440、375、320 像素宽度检查；320 × 500 下场景完整，无横向溢出，内容自然滚动；小煤球点击范围 44 × 44。
- 小煤球搜索 Codeforces 命中 1 篇；搜索期间位置不变，Escape 关闭并返回固定入口。首页与房间的暂停偏好跨页同步，台灯偏好往返保留。
- 未在实体手机测量耗电与帧率。

验收夹具是 tests/fixtures/room-art.html 和 room-lifecycle.html，临时复制到 public 通过开发服务器访问；完成后删除 public 副本，夹具不进入生产站点。

## 生成提示词

### 书房背景（首页原图作为风格和家具参考）

Create a new original full-room background for this exact illustrated study, using the input as STYLE and FURNITURE reference. Landscape 1536x1024. Pull camera back to see whole cozy room, fixed almost frontal mild elevated perspective, NOT isometric. NO PEOPLE anywhere, no silhouettes or portraits of people. Same sage plaster wall, large dark mullioned window center-right, cream curtain, wood floor, quiet treetops/town outside, same wood desk with laptop, open notebook, brass lamp at RIGHT side, empty chair in front desk. Tall bookshelf on left, closed wooden door far left, small record player and game controller on low left cabinet, small framed botanical print and calendar on wall. Composition designed for walking animated character: furnishings occupy back and side edges; broad empty unobstructed floor foreground lower 35%, walkway from left bookshelf across center to chair on right. Desk tabletop at y60%, floor rear at y66%, chair seat y69%. All furniture entirely visible; no big foreground objects blocking walkable floor. Restrained softly painted detailed anime illustration matching reference, neutral diffuse daytime light suitable for relighting. No text, UI, labels, watermark. No human baked into background. Keep grounded believable furniture scale and gentle straight perspective.

### 少女姿态（首页原图作为角色参考）

Create a production sprite sheet with REAL TRANSPARENT ALPHA background. Reference image establishes exact character identity and painterly anime style: same young adult woman, dark charcoal medium-long hair with small side braids, grey-green eyes, ivory cable knit sweater. Add full-length muted charcoal relaxed trousers and simple brown flat indoor shoes. 1536x1024 canvas, EXACT 6 columns by 2 rows grid of equal 256x512 cells. 12 separate FULL BODY sprites, each centered within its cell, feet baseline 480 pixels within each cell, head at about 48px, identical scale. No clipping, no overlapping cells. Top row six successive frames of a natural walking cycle facing RIGHT in profile / slight three-quarter, showing left contact, down, passing, right contact, down, passing poses. Legs and arms articulate correctly, different leg poses, feet planted, restrained motion. Bottom row left to right: neutral standing facing right; standing turned partly away looking out window; standing reaching right arm to bookshelf (no furniture); seated reading open book on lap facing RIGHT (no chair, feet baseline same, head lower to match sitting); rising halfway from sitting bent knees and leaning forward; neutral standing three-quarter facing viewer with relaxed hands. Sprite sheet only: no text labels, no borders, no shadows, no floor, no furniture, NO white backing, genuinely transparent alpha. Keep same face hair clothing color across every frame. Detailed delicate drawn linework and painterly soft neutral shading matching reference, not chibi, not pixel art, not 3D. Whole bodies including both shoes must fit each cell.

### 法线图（书房背景为输入）

Technical camera-space normal map of this exact background. Preserve EXACT 1536x1024 image framing geometry and pixel positions. RGB encode normals: right +X red, up +Y green, towards camera +Z blue, component*.5+.5. Front-facing wall/window lavender RGB128,128,255, floor upward cyan/green, furniture tops upward cyan/green, rounded plant leaves and furniture modeled smoothly. No original albedo, no painted lighting, just smooth blue violet cyan normal directions. No text. This will be used as aligned data texture for relighting the exact original image.

### 角色遮罩（角色姿态图为输入）

Create an exact binary silhouette MATTE mask for this sprite sheet. Output 1536x1024 RGB image with PURE BLACK background replacing all checkerboard, and PURE SOLID WHITE filling every character silhouette including hair, face, sweater, trousers, shoes, held book. White flat silhouettes only with NO internal lines or details. Keep ALL original character outlines and all 12 poses at EXACT original coordinates. Black gaps between arms and body and between legs. Do not move, resize, stylize or invent contours. Anti-aliased silhouette edges allowed. This is a precise alpha mask data image, not an illustration.

### 前景遮罩（书房背景为输入）

Produce exact aligned foreground occlusion MASK of this room at1536x1024. Pure black everywhere EXCEPT the desk itself on right: tabletop, books laptop cup lamp standing on tabletop, table legs, drawer cabinet beneath desk, and rightmost foreground potted plant, these are PURE WHITE solid silhouettes. Chair and chair blanket must be BLACK as they belong behind the seated character. Window wall floor rug and all left furniture must be BLACK. No internal detail in white silhouettes. Keep exact pixel positions and contours, no movement. This is a black-white data mask used to redraw original desk in front of an animated person sitting in chair.
