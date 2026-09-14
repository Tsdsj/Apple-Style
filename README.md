# Apple-Style

**把苹果的设计系统（HIG + Liquid Glass）做成 Agent 技能，并附带一套可直接使用的 Web 实现。**

简体中文 | [English](#english)

面向 **Claude Code** 与 **Codex** 的四个技能包，复刻 <https://developer.apple.com/design/> 的设计指南——人机界面指南（HIG）、Liquid Glass 材质、WWDC25 设计相关分享——并提供一份真正跑得起来的 Liquid Glass Web 实现（CSS + JS，无依赖、无构建步骤）。

技能装好后，你只要描述想做的界面，Agent 就会按苹果的分层规则、尺寸、动效和无障碍要求去实现，而不是凭印象堆一层毛玻璃。

---

## 目录

- [快速开始](#快速开始)
- [安装](#安装)
- [技能构成](#技能构成)
- [Web 实现](#web-实现)
- [演示站](#演示站)
- [仓库结构](#仓库结构)
- [本地验证](#本地验证)
- [常见问题](#常见问题)
- [来源与许可](#来源与许可)

---

## 快速开始

```bash
# macOS / Linux —— 无需先克隆
curl -fsSL https://raw.githubusercontent.com/Tsdsj/Apple-Style/main/install.sh | bash
```

```powershell
# Windows（PowerShell 5.1+）
irm https://raw.githubusercontent.com/Tsdsj/Apple-Style/main/install.ps1 | iex
```

然后在 Claude Code 里输入 `/Apple-Style`，或者直接描述任务——技能描述会自动触发：

> 帮我做一个学生宿舍管理后台，iOS 26 的观感，标签栏在宽屏要变成侧边栏。

在 Codex 中，技能会从 `~/.codex/skills` / `~/.agents/skills` 被自动发现。

## 安装

### 环境要求

| 平台 | 要求 |
|---|---|
| macOS / Linux | bash 3.2+；`git` 或 `curl`（远程安装时） |
| Windows | PowerShell 5.1+ 或 PowerShell 7；可选 `git` |
| 浏览器（使用 Web 实现时） | Chromium 系最佳；Safari / Firefox 自动降级为模糊 + 高光 |

安装器默认创建**软链接**（Windows 上是目录联接 junction，不需要管理员权限、不需要开发者模式），所以改动源码后，所有 Agent 立刻生效。

### 从克隆安装

```bash
git clone https://github.com/Tsdsj/Apple-Style.git && cd Apple-Style
./install.sh                    # 链接到检测到的 Agent 目录
```

```powershell
git clone https://github.com/Tsdsj/Apple-Style.git; cd Apple-Style
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

### 选项

两端的选项一一对应（`--copy` ↔ `-Copy`）：

| 选项 | 作用 |
|---|---|
| `--link` / `-Link` | 软链接 / 目录联接（默认），源码改动实时生效 |
| `--copy` / `-Copy` | 复制安装，与源码解耦 |
| `--project` / `-Project` | 装到当前目录的 `./.claude/skills` 与 `./.codex/skills` |
| `--to DIR` / `-To DIR` | 装到指定目录（可重复） |
| `--all` / `-All` | 即使 `~/.codex`、`~/.agents` 不存在也一并创建 |
| `--update` / `-Update` | 更新缓存副本后重新安装 |
| `--ref REF` / `-Ref REF` | 指定分支或标签 |
| `--dir DIR` / `-Dir DIR` | 用指定检出目录作为源 |
| `--uninstall` / `-Uninstall` | 卸载本安装器创建的内容 |
| `--quiet` / `-Quiet`、`--help` / `-Help` | 静默 / 帮助 |

远程安装时传参：

```bash
curl -fsSL https://raw.githubusercontent.com/Tsdsj/Apple-Style/main/install.sh | bash -s -- --copy
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Tsdsj/Apple-Style/main/install.ps1))) -Copy
```

### 安装到哪里

默认只写入**已经存在**的 Agent 目录（`~/.claude`、`~/.codex`、`~/.agents`），不会在没装过对应工具的机器上撒下空目录；一个都没有时退回 `~/.claude/skills` 并给出提示。远程安装会把仓库缓存到 `~/.local/share/apple-style`（Windows 为 `%LOCALAPPDATA%\apple-style`），软链接指向那里，因此 `--update` 一次刷新所有安装。

### 更新与卸载

```bash
./install.sh --update        # 或在克隆目录里 git pull（链接安装会自动跟随）
./install.sh --uninstall
```

## 技能构成

| 技能 | 何时被触发 | 内容 |
|---|---|---|
| **Apple-Style** | 构建或改造任何要有苹果观感的界面 | 工作流程、不可违反的硬规则、9 份带精确数值的速查表（含 Web 落地专用的 `web-implementation.md`）、`web/` 下的完整实现、查询与更新脚本 |
| **Apple-Style-Liquid-Glass** | 专门实现或调试 Liquid Glass 材质本身 | 材质图层解剖（折射、色散、沿轮廓移动的高光、凝胶形变）、Web 调优配方、SwiftUI / UIKit / AppKit 对应 API |
| **Apple-Style-HIG** | 需要苹果的原文或确切数值 | 离线参考库：172 篇 HIG 页面、24 篇 Liquid Glass 开发者文档、9 份 WWDC25 文字稿，配 `hig-lookup.sh` 检索 |
| **Apple-Style-Review** | 交付前审查、或界面「就是不像苹果」 | 分层 / 颜色 / 字体 / 形状 / 动效 / 无障碍 / Web 落地的完整清单与报告模板 |

四个技能互相引用：入口技能负责决策与落地，需要引证时去 HIG 库取原文，交付前用 Review 过一遍。

## Web 实现

`skills/Apple-Style/web/` 下的 `apple-style.css`（747 行）与 `liquid-glass.js`（663 行）可直接复制进任何项目，无依赖、无构建。

```html
<link rel="stylesheet" href="apple-style.css">

<button class="as-glass as-glass-interactive as-button as-button-glass">常规</button>
<button class="as-glass as-glass-interactive as-glass-prominent as-button as-button-glass">完成</button>

<header class="as-scroll-edge as-edge-top">
  <div class="as-toolbar" role="toolbar">
    <div class="as-toolbar-title" data-reveal-on-scroll>标题</div>
    <div class="as-glass as-glass-group">…图标按钮…</div>
  </div>
</header>

<nav class="as-tabbar" data-minimize data-sidebar>…标签…</nav>

<script src="liquid-glass.js"></script>
<script>LiquidGlass.init()</script>
```

**材质**：沿表面法线计算的折射位移贴图、三通道色散、对比度重整（避免发灰）、1px conic-gradient 高光并**沿轮廓绕行**。光是被折射出来的，不是画上去的——内部保持干净，没有贯穿本体的光泽渐变、没有双道内斜面，那些是廉价塑料按钮的做法。

**交互**：按压时的凝胶形变、从指尖亮起并溢出到邻近玻璃的内发光、小尺寸玻璃随背景明暗自动翻转。分段控件、开关、滑块都是**可拖拽**的——1:1 跟手、随速度拉伸、橡皮筋回弹、弹簧落位，由 `LiquidGlass.init()` 统一接管并派发 `change` 事件。

**结构**：

| 能力 | 用法 |
|---|---|
| 标签栏 ↔ 侧边栏 | `.as-tabbar[data-sidebar]`，≥1024px 自动变为侧边栏；页面容器加 `.as-with-tabsidebar` 让出空间 |
| 滚动收起标签栏 | `.as-tabbar[data-minimize]` |
| 大标题 → 小标题 | `.as-toolbar-title[data-reveal-on-scroll]`，大标题滚出后才显示 |
| 同心圆角 | `.as-container[data-concentric]` + `.as-concentric`，或 `calc(var(--as-glass-radius) - 内边距)` |
| 滚动边缘效果 | `.as-scroll-edge.as-edge-top` / `.as-edge-bottom`，替代自定义栏背景 |

**JS API**：`init` `attach` `adapt` `applyLens` `morph` `materialize` `controls` `segmented` `toggle` `slider` `tabBarMinimize` `titleOnScroll` `concentric` `supportsLens` `refresh`。

**无障碍**：降低透明度 / 增强对比度 / 减弱动态效果三组媒体查询全部就位；焦点环为玻璃单独调过；组件的 ARIA 映射见 `web-implementation.md`。

**性能**：默认不做整页图层提升，离屏玻璃自动卸载滤镜，色散按需开启（`data-chroma="on"`），拖拽全程零布局读取；`<html data-perf="lite">` 可一键关闭折射。

> **两个许可陷阱**：SF Symbols 不可用于 Web（自绘 24×24、1.8 描边的 SVG 代替），SF 字体不可自托管（依赖 `-apple-system` 回退）。细节见 `skills/Apple-Style/cheatsheets/web-implementation.md`。

## 演示站

`demo/` 是独立的双语（默认中文）演示站，完整展示设计语言，并带同心圆角调试台、无障碍偏好模拟与交付检查清单。**演示代码只在 `demo/` 内，`skills/` 不掺杂任何演示代码**——演示页通过相对路径直接引用技能本体的 CSS/JS，改技能、刷新页面即可看到效果。

```bash
python3 -m http.server 8765        # 必须从仓库根目录起服务
# 打开 http://localhost:8765/demo/index.html
```

技能自带的最小示例：

```bash
python3 -m http.server 8765 --directory skills/Apple-Style/web
# 打开 http://localhost:8765/demo.html
```

演示站的说明见 [demo/README.md](demo/README.md)。

## 仓库结构

```
Apple-Style/
├── install.sh                    macOS / Linux 安装器（支持远程一行安装）
├── install.ps1                   Windows 安装器（目录联接，无需管理员权限）
├── demo/                         独立演示站
└── skills/
    ├── Apple-Style/              入口技能
    │   ├── SKILL.md              工作流、硬规则、常见错误对照表
    │   ├── cheatsheets/          9 份速查表（材质/颜色/字体/布局/组件/动效/无障碍/原则/Web）
    │   ├── web/                  apple-style.css · liquid-glass.js · demo.html
    │   └── scripts/              hig-lookup.sh · update-reference.sh
    ├── Apple-Style-Liquid-Glass/ 材质实现与调优
    ├── Apple-Style-HIG/          离线参考库（hig/ liquid-glass/ wwdc25/ design-site/）
    └── Apple-Style-Review/       HIG 合规审查清单
```

## 本地验证

改动 `skills/Apple-Style/web/` 之后，至少过一遍：

```bash
python3 -m http.server 8765 --directory skills/Apple-Style/web   # 打开 demo.html
```

- 浅色 + 深色；在深色与浅色内容上各看一次玻璃
- 系统偏好：减弱透明度、增强对比度、减弱动态效果（Chrome DevTools → Rendering 可模拟）
- 键盘走查：每个可交互元素都要有在玻璃上看得见的焦点环
- 窄到 320px；标签栏在 ≥1024px 应变成侧边栏
- Safari 与 Firefox：没有折射，确认降级后仍像一层材质

最后用 `Apple-Style-Review` 技能跑一遍清单再交付。

## 常见问题

**装完 Agent 里找不到技能** — 确认技能落在了正确目录（`~/.claude/skills/Apple-Style/SKILL.md` 应当存在），然后重启 Agent；用 `--project` 装的只对该项目可见。

**Windows 提示脚本被禁止运行** — 用 `powershell -ExecutionPolicy Bypass -File .\install.ps1`，或先 `Set-ExecutionPolicy -Scope Process Bypass`。

**Windows 上链接变成了复制** — 目录联接不能跨卷或指向部分网络路径，安装器会自动降级并提示；此时用 `-Update` 更新。

**玻璃在 Safari / Firefox 里没有折射** — 这两个引擎不支持 `backdrop-filter` 的 SVG 位移贴图，实现会自动降级为模糊 + 高光，这是预期行为。

**玻璃看起来发灰发浑** — 多半是在内容层用了玻璃，或者玻璃叠玻璃。规则是：玻璃只属于浮动的导航/控件层，内容层用实色或标准材质。

## 来源与许可

参考文本于 2026-09-14 从苹果公开的 DocC JSON 接口（`developer.apple.com/tutorials/data/...`）与 WWDC 视频页渲染生成，可运行 `skills/Apple-Style/scripts/update-reference.sh` 刷新。

**文本版权归 Apple Inc. 所有**，此处仅作个人 / Agent 参考之用。未内置 SF 字体与 SF Symbols（苹果许可限制）——CSS 依赖系统字体，图标需自绘。本仓库自身的代码（CSS / JS / 脚本 / 速查表写作）可自由使用。

---

<a id="english"></a>

# Apple-Style (English)

**Apple's design system (HIG + Liquid Glass) packaged as agent skills, with a working web implementation.**

Four connected skills for **Claude Code** and **Codex** that reproduce the guidance at <https://developer.apple.com/design/> — the Human Interface Guidelines, the Liquid Glass material and the WWDC25 design sessions — plus a dependency-free, build-free web implementation of the material.

Once installed, describe the UI you want and the agent builds it against Apple's layering rules, metrics, motion and accessibility requirements instead of guessing at a frosted background.

## Quick start

```bash
# macOS / Linux — no clone needed
curl -fsSL https://raw.githubusercontent.com/Tsdsj/Apple-Style/main/install.sh | bash
```

```powershell
# Windows (PowerShell 5.1+)
irm https://raw.githubusercontent.com/Tsdsj/Apple-Style/main/install.ps1 | iex
```

Then type `/Apple-Style` in Claude Code, or just describe the task — the skill descriptions trigger on their own. In Codex the skills are discovered from `~/.codex/skills` / `~/.agents/skills`.

## Install

| Platform | Requirements |
|---|---|
| macOS / Linux | bash 3.2+; `git` or `curl` for the remote install |
| Windows | PowerShell 5.1+ or PowerShell 7; `git` optional |
| Browser (for the web implementation) | Chromium-based is best; Safari / Firefox degrade to blur + highlights |

Both installers symlink by default (directory junctions on Windows — no administrator rights, no Developer Mode), so edits to the source are picked up by every agent immediately.

```bash
git clone https://github.com/Tsdsj/Apple-Style.git && cd Apple-Style
./install.sh
```

```powershell
git clone https://github.com/Tsdsj/Apple-Style.git; cd Apple-Style
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Options map one to one between the two scripts (`--copy` ↔ `-Copy`):

| Option | Effect |
|---|---|
| `--link` / `-Link` | symlink / junction (default); source edits are live |
| `--copy` / `-Copy` | copy instead, decoupled from the source |
| `--project` / `-Project` | install into `./.claude/skills` and `./.codex/skills` |
| `--to DIR` / `-To DIR` | install into an arbitrary directory (repeatable) |
| `--all` / `-All` | create `~/.codex` and `~/.agents` even if they don't exist |
| `--update` / `-Update` | refresh the cached copy, then install again |
| `--ref REF` / `-Ref REF` | branch or tag to download |
| `--dir DIR` / `-Dir DIR` | use an existing checkout as the source |
| `--uninstall` / `-Uninstall` | remove what the installer created |
| `--quiet` / `-Quiet`, `--help` / `-Help` | quiet / help |

Passing options through the remote one-liner:

```bash
curl -fsSL https://raw.githubusercontent.com/Tsdsj/Apple-Style/main/install.sh | bash -s -- --copy
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Tsdsj/Apple-Style/main/install.ps1))) -Copy
```

The installers only write into agent directories that already exist (`~/.claude`, `~/.codex`, `~/.agents`), so they don't scatter empty trees on machines that never use those tools; if none exist they fall back to `~/.claude/skills` and say so. A remote install caches the repository in `~/.local/share/apple-style` (`%LOCALAPPDATA%\apple-style` on Windows) and links from there, so `--update` refreshes every install at once.

## The skills

| Skill | Triggers on | Contents |
|---|---|---|
| **Apple-Style** | building or restyling anything that should feel like Apple | workflow, the rules you cannot break, 9 cheatsheets with exact specs (including `web-implementation.md`), the full web implementation, lookup/update scripts |
| **Apple-Style-Liquid-Glass** | implementing or debugging the material itself | layer anatomy (refraction, dispersion, travelling specular highlight, gel flex), web tuning recipes, SwiftUI / UIKit / AppKit APIs |
| **Apple-Style-HIG** | you need Apple's own words or exact numbers | offline library: 172 HIG pages, 24 Liquid Glass developer docs, 9 WWDC25 transcripts, with `hig-lookup.sh` |
| **Apple-Style-Review** | pre-ship audit, or "it just doesn't look like Apple" | full checklist and report template across layering, colour, type, shape, motion, accessibility and web delivery |

## The web implementation

`skills/Apple-Style/web/apple-style.css` (747 lines) and `liquid-glass.js` (663 lines) drop into any project — no dependencies, no build step.

```html
<link rel="stylesheet" href="apple-style.css">
<button class="as-glass as-glass-interactive as-button as-button-glass">Regular</button>
<button class="as-glass as-glass-interactive as-glass-prominent as-button as-button-glass">Done</button>
<nav class="as-tabbar" data-minimize data-sidebar>…tabs…</nav>
<script src="liquid-glass.js"></script><script>LiquidGlass.init()</script>
```

- **Material** — a refraction map displaced along the surface normal, three-channel dispersion, a contrast re-level so refracted content stays punchy instead of milky, and a 1px conic-gradient specular rim that **travels around the silhouette**. Light is *bent, not painted*: the interior stays clean, with no gloss sweep and no double bevel.
- **Interaction** — gel flex on press, illumination starting under the pointer and spreading to nearby glass, small glass flipping light/dark with its backdrop. The segmented control, switch and slider are **draggable**: 1:1 tracking, stretch with velocity, rubber-band at the ends, spring on release. `LiquidGlass.init()` owns their state and emits `change`.
- **Structure** — `.as-tabbar[data-sidebar]` turns the tab bar into a sidebar at regular width (pair with `.as-with-tabsidebar`); `data-minimize` collapses it on scroll; `.as-toolbar-title[data-reveal-on-scroll]` shows the compact title only after the large title scrolls away; `.as-scroll-edge` replaces custom bar backgrounds; concentric radii via `.as-container[data-concentric]`.
- **JS API** — `init` `attach` `adapt` `applyLens` `morph` `materialize` `controls` `segmented` `toggle` `slider` `tabBarMinimize` `titleOnScroll` `concentric` `supportsLens` `refresh`.
- **Accessibility** — Reduce Transparency, Increase Contrast and Reduce Motion are handled; focus rings are tuned to stay visible on glass; per-component ARIA mapping lives in `web-implementation.md`.
- **Performance** — no blanket layer promotion, offscreen glass drops its filter, dispersion is opt-in per element (`data-chroma="on"`), gestures do zero layout reads; `<html data-perf="lite">` turns lensing off entirely.

> **Two licensing traps**: SF Symbols may not ship to a browser (draw your own on a 24×24 / 1.8-stroke grid), and SF fonts may not be self-hosted (rely on the `-apple-system` stack).

## Showcase site

`demo/` is a standalone bilingual showcase with a live concentric-radius playground, accessibility simulations and the pre-ship checklist. **Demo code lives in `demo/` only — nothing is mixed into `skills/`.** It loads the skill's own CSS/JS by relative path, so editing the skill and reloading shows the result.

```bash
python3 -m http.server 8765          # serve from the repository root
# open http://localhost:8765/demo/index.html
```

## Verifying a change

After touching `skills/Apple-Style/web/`, serve `skills/Apple-Style/web` and check: light + dark, glass over dark *and* light content, Reduce Transparency / Increase Contrast / Reduce Motion, keyboard-only with a visible focus ring on glass, 320px width, the sidebar form at ≥1024px, and Safari/Firefox where lensing degrades to blur. Then run the `Apple-Style-Review` checklist.

## FAQ

**The agent can't find the skills** — check that `~/.claude/skills/Apple-Style/SKILL.md` exists, then restart the agent. A `--project` install is only visible inside that project.

**Windows refuses to run the script** — use `powershell -ExecutionPolicy Bypass -File .\install.ps1`, or `Set-ExecutionPolicy -Scope Process Bypass` first.

**Windows copied instead of linking** — junctions can't cross volumes or point at some network paths; the installer falls back to copying and says so. Use `-Update` to refresh those.

**No refraction in Safari / Firefox** — neither engine supports SVG displacement maps in `backdrop-filter`; the implementation degrades to blur + highlights by design.

**The glass looks muddy** — almost always glass used in the content layer, or glass on glass. Glass belongs only to the floating navigation/control layer; content uses solid colours or standard materials.

## Provenance & licence

Reference text was rendered on 2026-09-14 from Apple's public DocC JSON endpoints (`developer.apple.com/tutorials/data/...`) and WWDC video pages; re-run `skills/Apple-Style/scripts/update-reference.sh` to refresh.

**Text © Apple Inc.**, included for personal/agent reference only. SF fonts and SF Symbols are not bundled (Apple licence) — the CSS relies on the system font stack and icons must be drawn yourself. The code in this repository (CSS / JS / scripts / cheatsheet prose) is free to use.
