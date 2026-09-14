# Apple-Style — 将苹果设计系统与 Liquid Glass 打造成 Agent 技能

[English](#english) | 简体中文

四个互相配合的技能包，面向 **Claude Code** 和 **Codex**，复刻了 <https://developer.apple.com/design/> 上的设计指南（人机界面指南 HIG、Liquid Glass、WWDC25 设计相关分享），并附带一份可运行的 Liquid Glass 材质的 Web 实现。

| 技能 | 作用 |
|---|---|
| `skills/Apple-Style` | 入口技能：工作流程、明确的设计规则、9 份带精确数值的速查表（含面向 Web 落地的 `web-implementation.md`）、`web/apple-style.css` + `web/liquid-glass.js` + `web/demo.html`、查询/更新脚本 |
| `skills/Apple-Style-Liquid-Glass` | 专注实现 Liquid Glass 材质：图层结构（含色散折射、沿轮廓移动的高光、凝胶形变）、Web 实现配方与调优、SwiftUI/UIKit/AppKit 的 API 用法 |
| `skills/Apple-Style-HIG` | 离线参考库：172 篇 HIG 页面、Liquid Glass 开发者文档与 API 页面、9 份 WWDC25 文字稿、更新说明 / 资源列表 |
| `skills/Apple-Style-Review` | HIG 合规性审查清单与报告模板 |

## 安装

```bash
./install.sh            # 软链接四个技能到 ~/.claude/skills, ~/.codex/skills, ~/.agents/skills
./install.sh --copy     # 使用复制代替软链接
./install.sh --project  # 安装到当前项目目录下的 ./.claude/skills 和 ./.codex/skills
```

安装完成后，在 Claude Code 中输入 `/Apple-Style`（或直接描述任务，技能会根据描述自动触发）。在 Codex 中，技能会从 `~/.codex/skills` / `~/.agents/skills` 被发现。

## 演示站（推荐）

`demo/` 是一个独立的演示站，用中英双语（默认中文）完整展示技能的设计语言，并附带同心圆角调试台、无障碍偏好模拟与交付检查清单。**演示代码只放在 `demo/`，`skills/` 里不掺杂任何演示代码**——演示页通过相对路径直接引用技能本体的 `apple-style.css` 与 `liquid-glass.js`，改技能、刷新页面即可看到效果。

```bash
python3 -m http.server 8765          # 必须从仓库根目录起服务
# 打开 http://localhost:8765/demo/index.html
```

详见 [demo/README.md](demo/README.md)。

## Web 实现包含什么

`web/apple-style.css` + `web/liquid-glass.js` 复刻的不只是"毛玻璃背景"：

- **材质**：沿表面法线计算的折射位移贴图、三通道色散（红/绿/蓝以不同强度折射，在边缘形成极淡的彩色条纹）、对比度重整（避免发灰发浑）、1px 的 conic-gradient 边缘高光，**会沿轮廓绕行**。光是被**折射**出来的，不是画上去的——内部保持干净，没有贯穿本体的光泽渐变、没有双道内斜面、不做提亮，那些是廉价塑料按钮的做法。
- **交互**：按压时的凝胶形变、从指尖亮起并溢出到邻近玻璃的内发光、随背景明暗自动翻转的小尺寸玻璃。
- **手势**：分段控件、开关、滑块都是**可拖拽**的——1:1 跟手、随速度拉伸、橡皮筋回弹、弹簧落位，由 `LiquidGlass.init()` 统一接管并派发 `change` 事件。
- **无障碍**：降低透明度 / 增强对比度 / 减弱动态效果的媒体查询全部就位。
- **性能**：默认不做整页图层提升，离屏玻璃自动卸载滤镜，色散按需开启（`data-chroma="on"`），拖拽全程零布局读取；`<html data-perf="lite">` 可一键关闭折射。

Web 落地相关的规范（组件的 ARIA 映射、焦点与键盘、断点与安全区、表单、主题切换、z-index 分层、性能预算，以及 **SF Symbols / SF 字体不可用于 Web** 这两个许可陷阱）集中在 `skills/Apple-Style/cheatsheets/web-implementation.md`。

## 技能自带的最小示例

```bash
python3 -m http.server 8765 --directory skills/Apple-Style/web   # 打开 http://localhost:8765/demo.html
```

Lensing（基于 SVG 位移贴图的 `backdrop-filter` 效果）在基于 Chromium 的浏览器中效果最佳；Safari 与 Firefox 会降级为模糊 + 高光效果。

## 来源与更新

参考文本于 2026-09-14 从苹果公开的 DocC JSON 接口（`developer.apple.com/tutorials/data/...`）及 WWDC 视频页面渲染生成。可重新运行 `skills/Apple-Style/scripts/update-reference.sh` 来刷新内容。文本版权归 Apple Inc. 所有，仅供个人 / Agent 参考使用。未内置 SF 字体（苹果许可限制）——CSS 依赖系统字体。

## 目录结构

```
Apple-Style/
  README.md  install.sh
  demo/                     独立演示站（index.html i18n.js demo.js demo.css README.md）
  skills/
    Apple-Style/            SKILL.md  cheatsheets/  web/  scripts/
    Apple-Style-Liquid-Glass/ SKILL.md
    Apple-Style-HIG/        SKILL.md  reference/{INDEX.md, hig/, liquid-glass/, wwdc25/, design-site/}
    Apple-Style-Review/     SKILL.md
```

---

<a id="english"></a>

## English

# Apple-Style — Apple design system + Liquid Glass as agent skills

Four connected skills for **Claude Code** and **Codex** that reproduce the guidance on <https://developer.apple.com/design/> (Human Interface Guidelines, Liquid Glass, WWDC25 design sessions) and ship a working web implementation of the Liquid Glass material.

| Skill | Purpose |
|---|---|
| `skills/Apple-Style` | Entry point: workflow, decisive rules, 9 cheatsheets with exact specs (including `web-implementation.md` for the web last mile), `web/apple-style.css` + `web/liquid-glass.js` + `web/demo.html`, lookup/update scripts |
| `skills/Apple-Style-Liquid-Glass` | Implementing the material: layer anatomy (dispersion, travelling specular highlight, gel flex), web recipe and tuning, SwiftUI/UIKit/AppKit API recipe |
| `skills/Apple-Style-HIG` | Offline reference library: 172 HIG pages, Liquid Glass developer docs + API pages, 9 WWDC25 transcripts, What's New / Resources |
| `skills/Apple-Style-Review` | Audit checklist and report template for HIG compliance |

## Install
```bash
./install.sh            # symlinks the four skills into ~/.claude/skills, ~/.codex/skills, ~/.agents/skills
./install.sh --copy     # copy instead of symlink
./install.sh --project  # install into ./.claude/skills and ./.codex/skills of the current project
```
Then in Claude Code type `/Apple-Style` (or just describe the task — the descriptions trigger automatically). In Codex the skills are discovered from `~/.codex/skills` / `~/.agents/skills`.

## Showcase site (recommended)

`demo/` is a standalone, bilingual (Chinese by default) showcase of the whole design language, with a live concentric-radius playground, accessibility preference simulations and the pre-ship checklist. **Demo code lives in `demo/` only — nothing is mixed into `skills/`.** The page loads the skill's own `apple-style.css` and `liquid-glass.js` by relative path, so editing the skill and reloading shows the result immediately.

```bash
python3 -m http.server 8765          # must be served from the repository root
# open http://localhost:8765/demo/index.html
```

See [demo/README.md](demo/README.md).

## What the web implementation actually covers

`web/apple-style.css` + `web/liquid-glass.js` reproduce more than a frosted background:

- **Material** — a refraction map displaced along the surface normal, three-channel dispersion (R/G/B bend by different amounts for a faint colour fringe at the rim), a contrast re-level so refracted content stays punchy instead of milky, and a 1px conic-gradient specular rim that **travels around the silhouette**. Light is *bent, not painted*: the interior stays clean, with no gloss sweep, no double bevel and no brightness boost — those are what make glass read as cheap plastic.
- **Interaction** — gel flex on press, illumination that starts under the pointer and spreads to nearby glass, small glass flipping light/dark with the content behind it.
- **Gestures** — the segmented control, switch and slider are **draggable**: 1:1 tracking, stretch with drag velocity, rubber-band at the ends, spring on release. `LiquidGlass.init()` owns their state and emits `change`.
- **Accessibility** — Reduce Transparency, Increase Contrast and Reduce Motion are all handled.
- **Performance** — no blanket layer promotion, offscreen glass drops its filter, dispersion is opt-in per element (`data-chroma="on"`), gestures do zero layout reads; `<html data-perf="lite">` turns lensing off entirely.

The web-specific rules — per-component ARIA mapping, focus and keyboard, breakpoints and safe areas, forms, theming, the z-index scale, the performance budget, and the two licensing traps (**SF Symbols and SF fonts cannot ship to a browser**) — live in `skills/Apple-Style/cheatsheets/web-implementation.md`.

## Minimal example bundled with the skill
```bash
python3 -m http.server 8765 --directory skills/Apple-Style/web   # open http://localhost:8765/demo.html
```
Lensing (SVG displacement `backdrop-filter`) renders in Chromium-based browsers; Safari and Firefox get blur + highlights.

## Provenance & refresh
Reference text was rendered on 2026-09-14 from Apple's public DocC JSON endpoints (`developer.apple.com/tutorials/data/...`) and WWDC video pages. Re-run `skills/Apple-Style/scripts/update-reference.sh` to refresh. Text © Apple Inc.; included for personal/agent reference. SF fonts are not bundled (Apple license) — the CSS relies on the system font.

## Layout
```
Apple-Style/
  README.md  install.sh
  demo/                     standalone showcase (index.html i18n.js demo.js demo.css README.md)
  skills/
    Apple-Style/            SKILL.md  cheatsheets/  web/  scripts/
    Apple-Style-Liquid-Glass/ SKILL.md
    Apple-Style-HIG/        SKILL.md  reference/{INDEX.md, hig/, liquid-glass/, wwdc25/, design-site/}
    Apple-Style-Review/     SKILL.md
```
