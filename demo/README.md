# Apple-Style Demo

[English](#english) | 简体中文

技能组的可运行演示站。**所有演示代码只存在于 `demo/` 目录**，`skills/` 里没有任何演示代码；本页通过相对路径直接引用技能本体：

```
demo/index.html  →  ../skills/Apple-Style/web/apple-style.css
                    ../skills/Apple-Style/web/liquid-glass.js
```

改技能里的这两个文件 → 刷新浏览器 → 所有示例立刻反映改动。可以把这页当作技能的调试台与回归验证页。

## 运行

```bash
python3 -m http.server 8765
```

然后打开 <http://localhost:8765/demo/index.html>。

> 必须从**仓库根目录**起服务，否则 `../skills/...` 的相对路径解析不到。
> 仓库里已带 `.claude/launch.json`，在 Claude Code 里可直接用 `demo` 这个配置启动。

Lensing（基于 SVG 位移贴图的 `backdrop-filter`）只在 Chromium 内核浏览器生效；Safari / Firefox 自动降级为模糊 + 高光。页面顶部的状态芯片会显示当前是否生效。

## 页面内容

| 小节 | 对应速查表 | 看什么 |
|---|---|---|
| 关于本页 | `SKILL.md` | lensing 是否生效、启用色散的元素数、被接管的玻璃元素数量、当前外观 / 平台 |
| 两层模型 | `design-principles.md` | 内容层 vs 控制层的正误对照 |
| 材质 | `materials-and-liquid-glass.md` | Regular / Clear / Tinted / Large、亮度自适应、标准材质、玻璃叠玻璃反例 |
| 颜色 | `color.md` | 18 个系统色 + 10 个语义色，附解析后的实际 rgb 值 |
| 字体排印 | `typography.md` | 完整字阶，随平台开关在 iOS / macOS 规格间切换 |
| 形状 | `layout-and-shapes.md` | 胶囊 / 固定 / 同心，含同心圆角实时调试台 |
| 控件 | `components-quickref.md` | 按钮、分段控件、开关、滑块、搜索框、内嵌分组列表——**三个控件都可以按住拖拽** |
| 导航与呈现 | `components-quickref.md` | 工具栏、边栏、菜单、工作表、提醒、浮动标签栏 |
| 动效 | `motion-and-interaction.md` | morph、materialize、按压凝胶形变与内发光、跟手拖拽 |
| 无障碍 | `accessibility-and-inclusion.md` | 四个偏好模拟开关 |
| 常见错误 | `SKILL.md` | 九条正误对照 |
| 交付清单 | `Apple-Style-Review/SKILL.md` | 十二项检查，进度存在浏览器本地 |

## 值得亲手试的几处

- **分段控件**：按住*当前选中*的那一段左右拖，指示器 1:1 跟手、随速度横向拉伸，拖到两端有橡皮筋回弹，松手弹簧落位。
- **开关**：按住旋钮甩到另一侧；直接点按仍然是切换。
- **滑块**：拖动时旋钮才变成透明透镜并拉伸，静止时是安静的白色圆点。
- **玻璃按钮**：按住看凝胶形变与指尖内发光；把指针移到边缘，高光会沿轮廓绕行。
- 这些状态全部由 `liquid-glass.js` 维护，并派发 `change` 事件——**不要再自己加 click 监听**，否则会双重触发。

## 演示设置（右上角浮动分组）

外观（自动 / 浅色 / 深色）· 平台（iOS / macOS）· 玻璃外观（清晰 / 着色）· 语言（中文 / English）。所有选择存在 `localStorage`，刷新后保持。

## 无障碍偏好模拟

「无障碍」小节里的四个开关会在 `<html>` 上打 `data-sim-rt / -ct / -rm / -dt`，`demo.css` 末尾复刻了 `apple-style.css` 里对应的媒体查询，方便在普通显示器上检查效果。**这些规则只在 demo 里，不会写回技能。**

注意：lensing 的滤镜是写在元素 inline style 上的，会盖过模拟规则，因此打开「降低透明度 / 增强对比度」时 `demo.js` 会先摘掉 inline 滤镜，关闭后再重新计算。

## 国际化

默认中文，右上角可切到英文。

- 词典：`i18n.js`，两个语言对象共用同一套键。
- 标注方式：`data-i18n`（文本）、`data-i18n-html`（含标签）、`data-i18n-aria`（aria-label）、`data-i18n-ph`（placeholder）。
- 新增文案时两种语言都要补齐；缺键会在控制台打出 `[i18n] 缺少翻译` 并回退到英文。
- 中文下 `demo.css` 会补上 `PingFang SC` 等中文字体，并取消为拉丁字母设计的负字距。

## 文件

```
demo/
  index.html   页面结构，所有文案带 data-i18n 标注
  i18n.js      中英词典
  demo.js      国际化、动态内容生成、交互连线、偏好模拟
  demo.css     页面骨架、示例舞台、偏好模拟样式（不含设计语言本身）
  README.md
```

---

<a id="english"></a>

## English

A runnable showcase for the skill set. **All demo code lives in `demo/` only** — nothing was added to `skills/`. The page loads the skill itself by relative path:

```
demo/index.html  →  ../skills/Apple-Style/web/apple-style.css
                    ../skills/Apple-Style/web/liquid-glass.js
```

Edit those two files in the skill, reload the browser, and every example reflects the change. Use the page as a workbench for tuning and regression-checking the skill.

### Run

```bash
python3 -m http.server 8765
```

Open <http://localhost:8765/demo/index.html>. Serve from the **repository root** — otherwise the `../skills/...` paths do not resolve. A `.claude/launch.json` entry named `demo` is included for Claude Code.

Lensing (SVG displacement `backdrop-filter`) only renders in Chromium-based browsers; Safari and Firefox fall back to blur plus highlights. The status chips near the top tell you which you got.

### What is on the page

Two-layer model, materials (Regular / Clear / Tinted / Large plus wrong-way examples), system and semantic colors with resolved rgb values, the full type scale in iOS and macOS specs, shapes with a live concentric-radius playground, controls, navigation and presentation components, motion (morph / materialize / press flex / scrubbing), accessibility preference simulations, the common-mistakes table, and the 12-item pre-ship checklist.

### Worth trying by hand

- **Segmented control** — press the *selected* segment and drag: the indicator tracks 1:1, stretches with the speed, rubber-bands past the ends and springs into place.
- **Switch** — throw the knob; a plain tap still flips it.
- **Slider** — the thumb becomes a transparent lens and stretches only while you drag it.
- **Glass buttons** — hold one for the gel flex and the glow under your pointer; move toward an edge and the specular highlight travels around the silhouette.
- All of this state lives in `liquid-glass.js` and is reported via a `change` event — **do not add your own click handlers**, or the controls fire twice.

### Settings (floating group, top right)

Appearance (auto / light / dark) · Platform (iOS / macOS) · Glass look (clear / tinted) · Language (中文 / English). Choices persist in `localStorage`.

### Accessibility simulation

The four switches in the Accessibility section set `data-sim-rt / -ct / -rm / -dt` on `<html>`; the bottom of `demo.css` mirrors the matching media queries from `apple-style.css` so you can check them on an ordinary display. These rules are demo-only and are never written back to the skill.

Note: the lensing filter is applied as an inline style and would win over the simulation rules, so `demo.js` strips it while Reduce Transparency or Increase Contrast is on and recomputes it when they go off.

### i18n

Chinese by default; toggle to English from the settings group.

- Dictionary: `i18n.js`, one shared key set per locale.
- Markup: `data-i18n` (text), `data-i18n-html` (markup), `data-i18n-aria` (aria-label), `data-i18n-ph` (placeholder).
- Add both locales for every new key; a missing key logs a console warning and falls back to English.
- In Chinese, `demo.css` adds `PingFang SC` and friends to the font stack and removes the negative tracking that is designed for Latin text.
