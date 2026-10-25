# 窗边插画素材与实现记录

本轮在 codex/illustrated-home 分支制作，基于已发布提交 f04182aa。参考 KumengScreen 的昼夜插画表现方式；代码、构图与角色素材在本项目独立制作，没有复制参考项目的代码或素材。

## 素材

使用 Codex 内置 image_gen 工具生成。没有调用需要 API Key 的 CLI 服务。底图和配套图均为 1536 × 1024：

- `study-base-original.png`：原创深色中长发动漫女生、窗边书桌、书本、电脑与植物；左侧留白。
- `study-closed-original.png`：对同一底图做眼睑局部编辑，生成闭眼帧。
- `study-normal-original.png`：同一构图的相机空间法线图，RGB 对应向右、向上、向观察者。

三个原始 PNG 保存在本目录。站点使用 `public/art/study/base.webp`、`closed.webp`、`normal.webp`。底图与闭眼帧以 WebP quality 92 编码，法线图为无损 WebP；只转换格式，不改变像素尺寸或构图。运行时三张位图合计约 2.13 MB；无脚本静态首图约 292 KB。浏览器仅加载站点内素材。

初次请求配套图时遇到服务额度限制；额度恢复后重试成功，最终版本采用生成的法线图和闭眼图。临时程序化法线和眼睑贴图已删除。动效遮罩 `motion.svg` 是代码绘制的数据纹理，R 标记发梢，G 标记毛衣呼吸区域，脸部与撑脸的手保持固定。

## 生成提示词

### 底图

Create an original premium hand-painted anime background illustration for a personal student blog, landscape 1536x1024 or wider 3:2 composition, no text, no logos, no interface. A peaceful lived-in study at a large window. An original young adult anime woman with dark charcoal medium-long hair, loose ivory sweater, sits at a wooden desk on the RIGHT side, quietly resting one hand near an open notebook and laptop. Warm grey-green eyes OPEN, face visible in soft three-quarter view facing slightly left, eyes clearly separated and unobstructed by bangs, head around x=72% y=38% of image. Head upper body and desk clearly composed. Desk occupies bottom right; understated slim laptop, several books, small green potted plant, warm desk lamp near far right. Large mullioned window behind character shows soft trees and distant quiet city. Restrained sage, muted cream, pale blue-grey, natural wood. LEFT 40% is calm softly textured wall and subtle curtain shadow, spacious negative space for readable website text, few objects there. Detailed drawn linework, nuanced painterly shading, cinematic slice-of-life anime environment, elegant atmospheric art, not 3D, not photorealistic, not a mockup. Soft neutral diffuse late morning illumination, no extreme exposure or heavy colored lighting so it can be relit in WebGL. Character, face, hair ends, hand, books, plant and lamp should be distinct silhouettes. Entire artwork edge to edge. An inviting quiet study scene, rich image detail on right but subdued uncluttered left. Avoid letters, signatures, floating particles, fake UI, extra people, sexualized clothing, exaggerated pose. Save generated image as a project art asset.

### 闭眼帧（以底图为编辑输入）

Precise minimal image edit for a blinking animation sprite. Keep image EXACTLY 1536x1024, identical crop/camera/pixel layout. ONLY change the two OPEN EYES of the anime woman to naturally CLOSED relaxed eyelids at their exact existing positions. Preserve original eye placement and angle, head pose, nose, mouth, hair, face contour, coloring and lighting. Everything outside her eyes must remain unchanged. Do not redraw, restyle, zoom, rotate, reframe or shift the character or background. Output the full original image with only the small eyelid change. No text. Original frame and edited frame will be crossfaded only over the eyes so they must match.

### 法线图（以底图为编辑输入）

Create a technical camera-space normal map from this exact source image, for WebGL 2.5D relighting. MUST maintain original 1536x1024 pixel dimensions, exact original framing and geometry, zero pose or object displacement. Represent surface direction only: R = rightward normal component, G = upward normal component, B = toward-camera normal component, encoded component*0.5+0.5. Front-facing wall/window flat purple-blue RGB128,128,255. Model original woman's face/nose/cheeks, hair locks, sweater folds, hands and book/table surfaces with smooth rounded normal gradients. Desk top upward-facing cyan/green, front of books blue/violet. Uniform smooth lavender/cyan/blue technical normal-map appearance. Eliminate all original albedo colors and lighting/shadows; encode geometry only. The woman and objects must align perfectly with the source. No text, labels or added objects. Soft and continuous surface orientation, not noisy or metallic. This is a data texture, not a beauty illustration.

## 校准与边界

- 所有图使用左上角原点，保持原始坐标，不分别裁剪。桌面 `object-position: 60% 50%`，手机为 `75% 50%`；着色器与静态首图共用相同 cover 算法。
- 左眼遮罩中心 (0.7363, 0.3506)、半径 (0.019, 0.022)；右眼中心 (0.7812, 0.3691)、半径 (0.017, 0.020)。仅此范围混合闭眼帧。闭眼时局部法线取邻近皮肤，避免法线图中睁眼的虹膜残影。
- 窗外光方向、环境光与台灯强度由设备本地时间插值。不是根据地理位置计算的天文日出日落，不使用定位接口。
- 这是二维插画的艺术化重光照；原画保留部分绘制阴影，法线图也是近似表面，不承诺物理精确的三维投影。
- 光尘 12 个、微弱发梢位移、毛衣呼吸、约 5.7 秒一次眨眼；最高 30 fps，渲染像素比上限 1.5，最长画布边不超过 1920 像素。
- 首页不修改阅读页 theme / dark-variant，只保存自己的暂停偏好。减少动态效果优先于手动播放。
- 无 WebGL、贴图加载失败时保留底图与普通 HTML 导航；仅配套素材失败已实测，底图本身不可下载时仍保留可读背景与导航。

## 开发验收页

`tests/fixtures/study.html` 与 `lifecycle.html` 不进入生产构建。运行开发服务器端口 4650 后，临时复制到 public 下的 `__study-check.html`、`__study-lifecycle.html`，从浏览器访问，结束后删除这两个临时副本再构建。

前者用实际渲染器检查四个时段与眼部像素；后者加载实际首页，通过测试环境模拟无 WebGL、配套素材失败、减少动态效果、隐藏标签、pagehide/pageshow 与上下文丢失。测试控制不属于首页产品界面。
