# Apple-Style 实用性审计：用这套技能开发真实网站 / Web 应用

审计日期：2026-10-16　·　审计对象：`af1efad`（v0.1.0 之后的 main）　·　视角：2026 年 10 月的 Apple 平台与 Web 平台现状

> **修复状态（2026-10-17）**：§2.1–2.7 的 P0/P1 缺陷已修复并加了回归测试（`tests/browser/regressions.spec.js`），见 CHANGELOG 的 Unreleased 与 `docs/validation.md` 末节。§2.8–2.10 及第 3 节以后的建议尚未处理。§2.7 的处理方式是保持样式表默认不分层（避免破坏现有未分层 reset），并文档化 `@import … layer()` 的接入写法。

> 结论先行：这套技能的**方法论**（规则强度分级、证据状态、不从宽度推断平台、对比度安全的操作色、生命周期清理、安装保护）在同类项目里属于上乘；但作为“拿来开发真实网站/应用”的工具，它目前在 **时效性（仍以 iOS 26 / WWDC25 为基准，而 iOS 27 / Safari 27 已于 2026-09 正式发布）**、**工程集成（无 ESM/SSR/Tailwind 层级/版本化分发）**、**组件覆盖（表单、选择器、进度、提示、表格全缺）**、**平台原生能力利用（未使用 `<dialog>`、popover、anchor positioning、可定制 `<select>`、View Transitions、scroll-driven animations）** 四个方面明显落后，并有 **8 个已实测复现的缺陷**（含 Windows 高对比度下开关不可见、RTL 滑块错位、快捷键劫持输入框）。

---

## 0. 评分卡

| 维度 | 评价 | 一句话 |
|---|---|---|
| 设计规则与证据纪律 | **强** | 官方要求 / 官方建议 / 项目默认 / 视觉经验分级清楚，Review 的 checked / not checked / n/a 证据模型很少见 |
| 时效性（对照 iOS 27、macOS 27、Safari 27） | **弱** | 技能正文、速查表和转录仍停在 WWDC25；参考库里已有 2026-06 的 HIG 更新，但派生规则没跟上 |
| Web 运行时正确性 | **中** | 键盘/ARIA/生命周期做得扎实；但已复现 8 个缺陷，见 §2 |
| 无障碍 | **中** | 键盘模型、对比度测得好；强制颜色、RTL、文字缩放、粗指针命中区有缺口 |
| 性能可伸缩性 | **中偏弱** | 自适应采样每个滚动帧都做；滤镜贴图无缓存，见 §2.9 |
| 工程集成（框架、SSR、Tailwind、打包） | **弱** | IIFE 挂 `window`，Node 导入直接崩溃；无 `@layer`，Tailwind v4 工具类无法覆盖 |
| 组件覆盖（真实应用所需） | **弱** | 无文本框、复选/单选、弹出/下拉按钮、步进器、进度、Toast、表格、骨架屏、营销站模式 |
| 跨浏览器 / 辅助技术验证 | **弱** | 仅 Chromium；Playwright 已能跑 WebKit/Firefox 却未启用 |
| 技能本身（加载成本、规范合规、评测） | **中** | 渐进披露合理；但技能名不符合 Agent Skills 规范，评测从未运行，缺类名速查 |
| 维护与合规 | **中偏弱** | 208 个来源中 203 个抓取时间为 null；无 LICENSE；完整再分发 Apple 文本存在合规风险 |

---

## 1. 范围、方法与限制

**做了什么**

1. 通读全部 4 个 `SKILL.md`、10 个速查表、`apple-style.css`（1064 行）、`liquid-glass.js`（1109 行）、演示、测试、CI、安装器与参考库清单。
2. 在本容器中运行项目自带测试：
   - Python：`29 tests OK (skipped=8)`（8 个为 PowerShell，容器无 pwsh）。
   - Playwright（Chromium 141 headless，用 `executablePath` 指向预装浏览器）：**40 通过 / 1 失败**，失败项是 `layout /demo/index.html at 320`（见 §2.5）。
3. 针对疑点编写了一次性 Playwright 探针（不在仓库中），逐项复现缺陷，结果写在 §2 各条中。
4. 对照一手资料：Apple Developer 上的 WWDC26 会话文字稿（204、315、250、292、251、220、269、278、289、290、8015）、Safari 26.0 与 Safari 27.0 官方发布说明（DocC JSON）、仓库内参考库自带的 HIG 页与 2026-06 What's New；webkit.org、web.dev 等站点在本环境被出口策略拦截，相关结论使用搜索摘要并在文中标注。

**没做什么 / 限制**

- 没有在真实 Safari、Firefox、VoiceOver、NVDA、真机 iPhone/iPad 上验证；凡涉及 Safari 渲染行为的条目都标为“需真机验证”。
- 性能数字来自容器内 headless Chromium，只用于说明量级与趋势，不代表任何设备的帧率。
- 本报告不修改代码；所有修复都是建议。

---

## 2. 已实测复现的缺陷（按优先级）

### 2.1 P0 · 强制颜色模式（Windows 高对比度）下开关完全不可见、分段控件看不出选中项

- **证据**：`page.emulateMedia({ forcedColors: 'active' })` 后截图，两个 `.as-toggle`（开/关）整块消失，`.as-segmented` 只剩两段文字，没有任何选中指示。
- **原因**：`apple-style.css:1039` 的 `@media (forced-colors: active)` 只处理了 `.as-glass`。开关的状态完全靠背景色（`--as-fill` / `--as-green`）和白色旋钮表达，强制颜色会把这些背景改写为系统色，状态信息全部丢失；分段指示器、选中标签页、侧栏选中行同理。
- **影响**：Windows 高对比度用户无法得知开关状态 —— 属于核心交互不可用（Review 技能自己的 Blocker 定义）。
- **修复**：为 `.as-toggle`（`border: 1px solid ButtonText`；选中 `background: Highlight`；旋钮 `background: ButtonText` 或 `Canvas` 加边框）、`.as-seg-indicator` / `.as-segment[aria-checked="true"]` / `[aria-selected="true"]`（`Highlight` + `HighlightText` 或 `outline`）、`.as-tab.is-selected`、侧栏选中行补充 forced-colors 规则，并加入回归测试（Playwright 可直接模拟）。

### 2.2 P0 · `data-shortcuts` 会劫持文本框里的 ⌘A / Ctrl+A / Ctrl+Z

- **证据**：页面菜单含 “Select All Rows ⌘A” 和 “Undo Approve ⌘Z”，焦点在 `<input>` 中按 `Control+a`、`Meta+a`、`Control+z`：三次都触发了菜单项，输入框的原生全选与撤销**全部被阻止**（`selectionStart/End` 停在 13/13，撤销后文本未恢复）。
- **原因**：`liquid-glass.js:928` 的全局 `keydown` 没有排除可编辑目标（`input`、`textarea`、`select`、`[contenteditable]`），且 `cmd = e.metaKey || e.ctrlKey` 让 ⌘ 在 Mac 上同时匹配 Ctrl。
- **影响**：任何同时有菜单栏和表单的真实应用（几乎所有后台类应用）都会破坏编辑体验；演示中的 ⌘R / ⌘N 在 Windows 上会映射到 Ctrl+R / Ctrl+N，与浏览器保留快捷键冲突。
- **修复**：可编辑目标默认跳过（菜单项可用 `data-shortcut-in-fields` 显式放行）；按平台区分 ⌘ 与 Ctrl；文档列出浏览器保留组合（⌘N/⌘T/⌘W/⌘Q、Ctrl+N 等无法或不应拦截）。

### 2.3 P1 · RTL：滑块旋钮画在镜像错误的位置；多处物理方向属性

- **证据**：`dir="rtl"` 下 `value=10` 的 `.as-slider`，覆盖层旋钮画在靠左处；在画出的旋钮位置点击，原生控件得到 **90**。同页的 `.as-list .as-value` 出现在行首而非行尾、`.as-alert` 为 `text-align: left`、`.as-badge` 使用 `right: -4px`。
- **原因**：`liquid-glass.js:659` 以 `f * (w − kw)` 从左计算位置，未考虑 RTL 中 range 方向翻转；轨道填充 `linear-gradient(to right …)` 同样不翻转。CSS 中 `apple-style.css:547 / 557 / 560 / 562 / 578 / 584 / 693 / 698` 等仍使用 `left/right/margin-left/text-align:left`，与 `web-implementation.md` 自己的“逻辑属性 everywhere”规则矛盾。开关的“开”方向在 RTL 中也未镜像。
- **修复**：逻辑属性替换（`margin-inline-start`、`inset-inline-end`、`text-align: start`、`padding-inline-start`）；滑块按 `getComputedStyle(input).direction` 镜像 `f`，轨道用 `:dir(rtl)` 切换渐变方向；开关在 RTL 中镜像旋钮行程。加一组 RTL 回归用例。

### 2.4 P1 · `.as-vibrant` 在浅色模式下文字完全不可见

- **证据**：同一段 40px 文字，加 `.as-vibrant` 时截图暗像素数 **0**，去掉该类为 **1115**。
- **原因**：`apple-style.css:244` 对黑色文字使用 `mix-blend-mode: plus-lighter`，相加混合中黑色等于 0，文字消失。
- **修复**：移除该混合模式，或仅在深色外观下使用；Web 上“活力色”用语义标签色近似即可。

### 2.5 P1 · 搜索框在窄容器中溢出（现有测试在本环境失败）

- **证据**：本环境中 `layout /demo/index.html at 320` 失败（`scrollWidth 327 > 321`）。定位到 `.as-glass.as-search` 内的 `<input type="search">`：容器 260px，输入框 269px，`min-width: auto`。
- **原因**：`apple-style.css:685` `.as-search input { flex: 1 }` 缺少 `min-inline-size: 0`；`@media (max-width: 600px)` 的补丁只覆盖 `.as-toolbar .as-search`。输入框的最小内容宽度依赖字体度量，CI 机器的字体恰好没触发。
- **修复**：给 `.as-search input` 全局加 `min-inline-size: 0`；布局测试增加“回退字体 / CJK 字体”组合，避免结果依赖运行机器的字体。

### 2.6 P1 · 无法在 SSR / ESM 环境中导入运行时

- **证据**：`node -e "require('./skills/Apple-Style/web/liquid-glass.js')"` 与动态 `import()` 均报 `ReferenceError: window is not defined`；文件没有任何 ESM 导出。
- **原因**：`liquid-glass.js:1109` 直接 `})(window);`，模块顶层访问 `document.currentScript`。
- **影响**：Next.js / Nuxt / SvelteKit / Astro 等主流框架中，只要组件文件在服务端被求值就会崩溃；只能用 `<script>` 标签或在 effect 中动态导入。
- **修复**：顶层加 `typeof window` 守卫；提供 ESM 版（具名导出 `init/destroy/attach/…`）与 `.d.ts`；在 `package.json` 中提供 `exports`，可发布到 npm 或至少用 Git tag + jsDelivr 提供带版本的 URL。

### 2.7 P1 · 未分层的 CSS 会压过 Tailwind v4 工具类

- **证据**：`<button class="as-button as-button-filled px-2 bg-red">` 在 `@layer utilities { .px-2 … .bg-red … }` 存在时，计算结果仍是 `padding 20px`、`background rgb(0,102,204)`。
- **原因**：级联层规则中，未分层样式永远优先于任何分层样式，与选择器优先级无关。Tailwind v4 把工具类放在 `@layer utilities` 中。
- **影响**：`web-implementation.md` 写着“Tailwind can use the existing classes”，但实际无法用工具类微调任何 `as-*` 组件。
- **修复**：整份样式包进 `@layer apple-style { … }`（或额外提供 `apple-style.layered.css`），文档给出 `@layer theme, base, apple-style, components, utilities;` 的推荐顺序。

### 2.8 P2 · 玻璃组“防护”会静默隐藏内容

- **证据**：`.as-glass-group` 内放一个 `.as-glass` 按钮，计算样式为 `display: none`，按钮从页面和无障碍树中消失，没有任何提示。
- **原因**：`apple-style.css:378` 用 `display: none !important` 作为“禁止玻璃套玻璃”的防护。
- **修复**：改为开发态可见警告（例如虚线 outline）并在运行时 `console.warn`；不要隐藏用户内容。

### 2.9 P2 · 自适应采样与折射贴图的开销随元素数线性放大

- **证据 A（自适应）**：20 个固定玻璃按钮的长页面，滚轮滚动 60 次，`document.elementsFromPoint` 被调用 **3600 次**（每帧 20 元素 × 3 采样点），仅这一项累计约 **383 ms**（容器内 headless Chromium，仅示意量级）。
- **证据 B（贴图）**：30 个玻璃按钮的长列表，初始生成 3 张位移贴图；上下滚动两个来回后累计 **113 张**。每次重新进入视口都重新逐像素计算并 `toDataURL()` 编码。
- **原因**：`liquid-glass.js:1002` 在每个滚动帧调度 `adapt()`；`sampleBehind`（`:300`）每次还写 `style.pointerEvents` 两次触发样式失效——而结果已经用 `n !== el && !el.contains(n)` 过滤，这次写入是多余的。`:998` 的 IntersectionObserver 在进入视口时 `relens()`，`buildMap()`（`:101`）没有缓存。
- **修复**：滚动中节流（例如滚动停止后或每 100–150 ms 采样一次）；删除多余的 `pointerEvents` 写入；按 `宽×高×半径×rim` 缓存贴图 URL，低分辨率生成后交给 `feImage` 拉伸；在 CI 中加一个 4× CPU 节流的滚动基准，作为预算而不是“性能提升”宣称。
- **自相矛盾**：速查表要求“只动画 `transform`/`opacity`，不要动画 `blur()` 或 `width`”，但 `materialize()`（`:360`）动画 `filter: blur(6px)`，`morph()`（`:342`）动画 `left/top/width/height`。

### 2.10 P2 · 维护脚本与清单

- `scripts/transcript.py:26` 把标题硬编码为 `(WWDC25)`：用它抓取 WWDC26 会话会被错误标注（本次审计实际复现）。
- `reference/sources.json`：208 个来源中 **203 个 `fetched_at` 为 null**，只有 2026-10-04 刷新过 5 个。
- 演示中的 `.as-sheet-backdrop` 始终以 `position: fixed; inset: 0` 加深色背景存在于 DOM 中（只是 `opacity: 0`）。社区多方报告 Safari 26 起会取视口边缘的固定元素背景来着色工具栏，这类隐藏遮罩可能把工具栏染暗 —— **需真机验证**；无论结论如何，关闭时用 `hidden` 或 `<dialog>::backdrop` 更稳妥。

---

## 3. 时效性：2026 年的 Apple 与项目现状对照

### 3.1 Apple 平台（设计系统）

| 2026 年的变化（来源） | 项目现状 | 建议 |
|---|---|---|
| iOS 27 / iPadOS 27 / macOS 27 已发布；Safari 27.0 于 **2026-09-14** 发布（Safari 27 发布说明） | 技能描述写 “iOS 26 / macOS 26 design system”；`components-quickref.md` 标题仍是 “new design, iOS/iPadOS/macOS 26” | 全面改为“iOS/macOS 26 起的新设计 + 27 的调整”，列出版本差异 |
| WWDC26 设计相关会话：250 Principles of great design、292 Design intuitive search experiences、251 Communicate your brand identity on iOS、290 Craft clear names、220 Refine accessibility for custom controls | 参考库只有 9 个 WWDC25 转录 | 纳入这些转录（先修 `transcript.py` 的年份） |
| Liquid Glass 在 2027 版系统中“refined look”，并会响应新的系统 **Liquid Glass 滑块**调整着色（WWDC26-269） | 只有 `data-liquid-glass="tinted"` 二值开关 | Web 无法读取该系统设置；文档应说明这一点，可考虑提供 0–1 的 `--as-glass-opacity-pref` 让站点自行暴露偏好 |
| HIG Scroll views（2026-06-08）：**优先使用 automatic 样式**；工具栏控件多、玻璃外有文字、固定表头时会给出更不透明的分隔；macOS 27 中有自由浮动文字（如标题栏中的窗口标题）时 automatic 解析为 **hard**（WWDC26-289） | `materials-and-liquid-glass.md:41` 仍写 “Soft (default, iOS/iPadOS)”；`.as-scroll-edge` 默认 soft | 改写规则；CSS 提供 `.as-edge-auto` 启发式（栏内有非玻璃文字或固定表头时用 hard） |
| HIG Menus（2026-06-08）：图标“少而有目的”，**同组菜单项要么都有图标要么都没有**；iPad/Mac 菜单栏默认只保留关键操作的图标（WWDC26-269/278） | `components-quickref.md:49` 写“introduce a related group with one symbol and let text do the rest”，与新规则冲突 | 更正速查表；`demo` 菜单按组统一处理 |
| HIG Sheets（2026-03-24）：单视图 sheet 中 **Cancel 在前导、Done 在尾随**；Done 必须与 Cancel 或 Back 配对；不要三者同时出现；支持下滑关闭 | 速查表未涉及按钮放置；运行时没有下滑关闭 | 补规则；sheet 组件给出标准头部结构和拖拽关闭（含键盘替代） |
| macOS 27：侧栏延伸到窗口边缘，内容在其后流动；侧栏**选中使用半粗体文字强调**（WWDC26-289） | `.as-split > .as-sidebar` 为不透明面板，选中行为整行强调色填充（`apple-style.css:895`） | 以 HIG 与 macOS 27 设计资源复核桌面层视觉；至少提供“半粗体 + 低强调背景”的选中样式 |
| iOS 27：任意标签页可设为 **prominent**，标签栏收起时仍可见（WWDC26-278）；导航栏也可滚动最小化（WWDC26-269） | `.as-tabbar.is-minimized` 只保留选中项与搜索；无导航栏最小化 | 增加 `data-prominent` 标签；导航栏最小化可直接用 scroll-driven animations 实现 |
| 工具栏：新的 `ToolbarOverflowMenu`、可见性优先级，窗口变窄时系统自动把项目收进溢出菜单（WWDC26-269） | 窄屏时 `.as-toolbar` 直接 `flex-wrap` 换行（`apple-style.css` 末尾 600px 规则） | 提供“溢出到 More 菜单”的模式与优先级属性（`data-priority`），换行不是 Apple 的做法 |
| HIG Sidebars（2026-06-08）：图标颜色默认用 App 强调色，固定颜色只在有明确含义时少量使用 | CSS 默认强调色图标，基本一致 | 保持；速查表补一句“固定色仅用于有含义的少数图标” |

### 3.2 Web 平台（真实网站最直接受益的部分）

| 能力 | 状态（来源） | 对本项目的意义 |
|---|---|---|
| **可定制 `<select>`**：`appearance: base-select`、`::picker(select)`、`::checkmark`、`::picker-icon`、`<selectedcontent>` | Safari 27、Chrome 135（Safari 27 发布说明、WWDC26-315）。Apple 在会话中明确说：原生 select “on Apple platforms are called **pull down buttons**” | 项目没有任何弹出/下拉按钮组件。这是用纯 HTML/CSS 做出 Apple 式 pop-up / pull-down 按钮且自带无障碍的官方路径，不支持的浏览器自动回退原生 |
| **`<input type="checkbox" switch>`** | Safari 17.4 起支持原生开关外观，Safari 27 修正其外观属性（Safari 27 发布说明）；iOS 上的触感反馈据社区与 WebKit Bugzilla 报告始于 iOS 18（未在一手资料中核实） | 在 Safari 中可直接得到系统开关；`.as-toggle` 适合作为其他浏览器的增强层，而不是唯一实现 |
| **CSS Anchor Positioning** | Safari 26.0 加入（Safari 26 发布说明）；Firefox 约在 147 版补齐（第三方报告）；Interop 2026 重点项 | 菜单、弹出框、工具提示的定位可以不再手写 `getBoundingClientRect` + `scrollY`（演示 `demo.js` 的 `wireMenu`） |
| **Popover API + 调用命令 `commandfor`/`command`** | Popover 已 Baseline；invoker commands 据 Chrome 的 modern-web-guidance 于 2025-12 达到 Baseline（Chrome 135 / Firefox 144 / Safari 26.2，第三方汇总，需核实）；`closedby` Safari 尚未支持 | 菜单、弹出框可声明式打开/关闭、自动顶层、轻关闭；运行时只需补 `role="menu"` 的方向键模型 |
| **`<dialog>` + `showModal()`** | 早已 Baseline | 焦点困住、背景 inert、Esc 关闭、顶层渲染全部内建；当前演示用 `div[role=dialog]` + 手动 inert（`demo.html:232-239`），这些逻辑不在库里，开发者要自己重写 |
| **Scroll-driven Animations** | Safari 26.0 加入（Safari 26 发布说明）；Interop 2026 重点项 | 标签栏最小化、标题随滚动出现、滚动边缘效果都可用 CSS 实现，减少 JS 滚动监听 |
| **View Transitions** | 同文档转场已 Baseline；Interop 2026 继续推进跨文档转场 | `morph()` 的“matchedGeometry”可改用 `view-transition-name`，并消除对布局属性的动画 |
| **`@starting-style` + `transition-behavior: allow-discrete`** | 主流浏览器均已支持 | `materialize` 的进出场可纯 CSS 完成，配合 `display`/`popover`/`dialog` |
| **`contrast-color()`** | Safari 26.0 加入（Safari 26 发布说明） | 自定义 `--as-tint` 上的文字颜色可以自动选择，作为渐进增强 |
| **任意网站都可成为 iOS/iPadOS 主屏 Web App** | Safari 26.0（发布说明 “Added support for any website to become a web app on iOS or iPadOS”） | 底部浮动标签栏在 Safari 浏览器标签页中会与 Safari 自身的底部工具栏叠在一起；在 `display-mode: standalone` 中才最接近原生。CSS 里没有任何 `display-mode` 处理 |
| **`theme-color` 不再用于 Safari 26+ 工具栏着色** | 多方社区报告（Apple 发布说明未记载）：Safari 26 起根据 `html`/`body` 背景以及靠近视口边缘的 fixed/sticky 元素背景来着色 | `web-implementation.md:217` 仍以 `theme-color` 作为主建议。应改为：保留 meta 供其他浏览器使用，同时显式设置 `html`/`body` 背景，并检查顶部/底部固定元素（包括隐藏遮罩） |
| **Grid Lanes（瀑布流）** | Safari 26.4 起（WWDC26-204、314） | 作品集/相册类网站（评测任务 `website` 正是摄影作品站）可直接用 |
| **iOS 26 冻结 UA 中的系统版本** | Safari 26 发布说明 | `supportsLens` 依赖 UA 嗅探；目前不受影响，但应改为纯能力检测或明确的白名单策略 |

---

## 4. 以“开发真实网站/应用”的场景走一遍

假设让 Agent 用这套技能做两个常见项目：

**A. 一个 SaaS 后台（登录、设置页、列表 + 详情、筛选、弹窗确认、Toast）**

| 需要 | 技能能提供 | 缺口 |
|---|---|---|
| 登录/设置表单 | `web-implementation.md` 的表单规则（label、autocomplete、16px、错误描述） | **没有文本框、复选框、单选按钮、表单分组、错误态的样式**；只有 `.as-search` |
| 筛选下拉 | 无 | 没有 pop-up / pull-down 按钮；最佳方案正是可定制 `<select>` |
| 弹窗确认 | `.as-alert`、`.as-sheet` 的外观 | **打开/关闭、焦点管理、inert、Esc 都在演示脚本里**，库不提供；开发者需重写或复制演示代码 |
| 菜单 | `.as-menu` 外观、`menuBar()` 焦点模型 | 打开、定位、关闭、方向键都要自己写（`menuBar` 注释明确“opening and placing the menu stays with the app”） |
| 列表 + 详情 | `.as-list`、`.as-split`、`.as-inspector` | 无表格/数据网格、无排序表头、无选择状态的通用列表行 |
| 加载/空态/错误 | 速查表要求“四种状态” | 没有骨架屏、进度条、旋转指示器、空态组件 |
| Toast | z-index 表里有 `toast 60` | `.toast` 只在 `demo/demo.css` 中，库里没有 |
| 框架集成 | React/Vue 的 mount/unmount 示例 | SSR 崩溃（§2.6）、Tailwind 无法覆盖（§2.7）、无类型声明、无 npm 包 |

**B. 一个品牌/营销网站（评测任务 `website` 的类型）**

技能的规则层已经说对了：“普通网站不需要模拟原生窗口、侧栏和检查器”。但组件层几乎全是 App 结构（标签栏、侧栏、检查器、菜单栏）。许多人说“Apple 风格网站”时指的是 apple.com 式的**全局导航、大标题排版、产品磁贴、分段导航、页脚**，以及克制的材质使用；这些模式没有示例或组件。建议新增一个“内容网站”速查表和最小示例，明确哪些玻璃/材质适合网页导航层、哪些不适合。

---

## 5. 技能本身的可用性（作为 Agent Skill）

1. **命名不符合 Agent Skills 规范**：`name: Apple-Style`、`Apple-Style-HIG` 等含大写字母。agentskills.io 规范要求 `name` 只含小写字母、数字和连字符，且与目录名一致；Zed 文档说明不合规的技能会加载失败。Claude Code 目前能加载，但跨 Agent 的可移植性受损。建议改为 `apple-style`、`apple-style-hig`、`apple-style-liquid-glass`、`apple-style-review`，安装器做一次迁移。
2. **加载成本与缺少类名索引**：Web 流程最少要读 `SKILL.md`（约 1.5k tokens）+ `rules-and-evidence`（约 1k）+ `web-implementation`（约 5.1k）+ `materials`（约 2.1k）+ `demo.html`（约 4.6k），约 14k tokens 才开始写代码；而要知道所有 `as-*` 类、状态属性和 JS 钩子，只能再读 18k tokens 的 CSS 或 15k 的 JS。一页约 2k tokens 的“类名 / 属性 / 事件参考表”能显著降低成本和误用。
3. **资产交付没有版本**：CSS/JS 文件头没有版本号，Agent 复制进项目后无法判断来自哪一版，也无法安全升级；建议文件头写入版本与来源 commit，`SKILL.md` 明确“复制到项目的静态资源目录、不要修改、升级时整体替换”。
4. **评测从未运行**：`evals/` 设计完善，但 README 与 validation 都写明“未运行任何启用/关闭对比”。在没有对比结果前，无法说明技能让产出更好。建议至少跑 `website` 与 `existing-project` 两个任务各 3 次。
5. **Review 技能缺少可执行的检查工具**：它要求“有证据的 checked”，但用户项目没有现成脚本可跑。建议提供 `scripts/audit-page.mjs <url>`：多宽度溢出、玻璃上文字对比度、命中区、强制颜色截图、减少动态效果、RTL 截图、axe-core 结果，输出可直接填进 Review 表格的 JSON。

---

## 6. 验证覆盖

- **只测 Chromium**：`playwright.config.js` 只有 `browserName: 'chromium'`，而 CI 已经在 `macos-latest` 上运行。Playwright 自带 WebKit 与 Firefox，加两个 project 就能覆盖大部分引擎差异（WebKit ≠ Safari，但能发现 `backdrop-filter`、`light-dark()`、Pointer Events 等差异）。这是成本最低、收益最高的一步。
- **缺失的回归类别**：强制颜色、RTL、回退字体/CJK 宽度、Tailwind 层级共存、文本框中的快捷键、SSR 导入、性能预算——本次发现的缺陷都落在这些空白里。
- **文字缩放**：所有字号与行高都是 px（例如 `apple-style.css:178`），`web-implementation.md:18` 也明确建议用 px。浏览器缩放可以满足 WCAG 1.4.4，但不会响应浏览器的“默认字号”设置，也不会响应 iOS 的 Dynamic Type。WWDC26-251 再次强调 Dynamic Type“是很多人依赖的偏好”。建议改为 rem 字阶（17px = 1.0625rem），并提供可选的 `font: -apple-system-body` 钩子（WebKit 专有，用 `@supports` 包裹），作为权衡后的项目默认。
- **粗指针命中区**：速查表要求触摸 44×44，但 `.as-toggle` 高 31px、`.as-segment` 高 32px（`apple-style.css:634 / 602`），只有 `.as-window` 的行高在 `any-pointer: coarse` 时提升。可以用伪元素扩大命中区而不改变视觉尺寸。

---

## 7. 合规与维护

- **没有 LICENSE 文件**：现有的“可自由使用”声明对公司采用不够明确；多数企业的法务流程会因此拒绝引入。`docs/license-decision.md` 已列出选项，建议尽快选定（MIT 或 Apache-2.0 最常见）。
- **Apple 文本的再分发**：仓库包含约 30 万词的 HIG 与文档渲染文本。即便标明版权归属，公开再分发仍有风险（非法律意见）。可选的降低风险方式：仓库只保留索引、来源清单与短引用，安装时由现有的事务式更新脚本按需抓取到本地。
- **参考库新鲜度**：203/208 个来源抓取时间未知；HIG 页虽已包含 2026-06 的变更，但派生速查表没有同步（§3.1）。建议每次全量刷新后自动输出“哪些速查表段落引用了变更页”的待复核清单——更新脚本已有报告框架，只差这一步关联。

---

## 8. 做得好的地方（应保留）

- 规则强度四分法与证据三状态，是防止 Agent“自信地编造合规”的有效机制。
- 明确“宽度不等于平台”“普通网站不需要假窗口”，避免了这类项目最常见的错误。
- 操作色与系统色样本分离，默认白字对比度经过实测（5.57:1 / 5.15:1）。
- 运行时的资源归属与 `destroy()` 清理有测试证明（重复 init、卸载、重挂载）。
- radio group 与 tabs 的区分、roving tabindex、click/键盘/拖拽不重复触发、取消不提交，都有回归测试。
- 安装器的归属凭据、不认领旧安装、暂存回滚，安全性考虑周到。
- 验证文档如实列出未验证项，没有夸大。

---

## 9. 建议路线图

**立即（1–2 天，均为小改动）**

1. 修复 §2.1 强制颜色、§2.2 快捷键劫持、§2.4 `.as-vibrant`、§2.5 搜索框溢出、§2.8 玻璃组静默隐藏。
2. 为以上各项与 RTL 加回归测试；Playwright 加 `webkit`、`firefox` 两个 project。
3. 技能名改为小写；CSS/JS 文件头加版本号；选定 LICENSE。

**短期（1–2 周）**

4. §2.3 RTL 全面改逻辑属性并修复滑块/开关镜像。
5. §2.6 + §2.7：ESM 版本、`typeof window` 守卫、`.d.ts`、`@layer apple-style`，发布带版本的分发（npm 或 Git tag + CDN）。
6. 修正 §3.1 中的过时规则（滚动边缘 automatic、菜单图标、sheet 按钮、theme-color），把技能目标更新为 iOS/macOS 27；修 `transcript.py` 并纳入 WWDC26 会话；全量刷新参考库。
7. §2.9 性能：节流采样、删除多余样式写入、贴图缓存；加 CPU 节流的滚动预算测试。

**中期（1–2 个月）**

8. 用平台原生能力重做浮层：`<dialog>`（sheet/alert）、`popover` + anchor positioning + `commandfor`（menu/popover）、`@starting-style`（materialize）、View Transitions（morph）、scroll-driven animations（标签栏最小化、标题出现）。库直接提供这些行为，而不是留给演示代码。
9. 补齐真实应用组件：文本框/表单分组/错误态、复选与单选、基于可定制 `<select>` 的 pop-up/pull-down 按钮、步进器、进度与活动指示器、Toast、骨架屏、基础表格；以及内容网站速查表与最小示例。
10. 提供 `audit-page` 脚本让 Review 技能的证据可在用户项目中真实产出；运行 `evals/` 的启用/关闭对比并公开结果。
11. 在真实 Safari（iOS 27 / macOS 27）与 VoiceOver 上做一轮人工验收，重点：工具栏着色、底部固定栏与 Safari 自身工具栏的关系、主屏 Web App 模式。

---

## 附录 A · 复现要点

所有探针均在 Chromium 141 headless 中运行，页面通过 `page.route()` 注入并引用仓库内的 `apple-style.css` / `liquid-glass.js`（注意加 `<meta charset="utf-8">`，否则 `⌘` 会被误解码，快捷键解析为 0 个）。

| 编号 | 关键操作 | 观察结果 |
|---|---|---|
| 强制颜色 | `emulateMedia({ forcedColors: 'active' })` 后截图 | 开关不可见；分段无选中指示 |
| 快捷键 | 菜单含 ⌘A / ⌘Z，`init()` 后在 `<input>` 内按 `Control+a`、`Meta+a`、`Control+z` | 菜单项被触发 3 次；原生全选、撤销被阻止 |
| RTL 滑块 | `dir=rtl`，`value=10`，点击画出的旋钮中心 | `value` 变为 90 |
| vibrant | 40px 文字截图统计暗像素 | 有该类 0，无该类 1115 |
| 溢出 | 320px 视口查找右边界超出的元素 | `input[type=search]` 269px 位于 260px 容器中 |
| SSR | `node -e "require(…/liquid-glass.js)"` | `ReferenceError: window is not defined` |
| Tailwind 层 | `@layer utilities { .px-2; .bg-red }` 与 `.as-button-filled` 共存 | 工具类不生效 |
| 玻璃组 | `.as-glass-group > .as-glass` | `display: none` |
| 自适应开销 | 20 个固定玻璃按钮，滚动 60 次 | `elementsFromPoint` 3600 次，约 383 ms |
| 贴图 | 30 个玻璃按钮，滚动两个来回 | 贴图 3 → 113 张 |

## 附录 B · 来源

一手（Apple）：

- [What’s new in WebKit for Safari 27（WWDC26-204）](https://developer.apple.com/videos/play/wwdc2026/204/)
- [Rediscover the HTML select element（WWDC26-315）](https://developer.apple.com/videos/play/wwdc2026/315/)
- [What’s new in SwiftUI（WWDC26-269）](https://developer.apple.com/videos/play/wwdc2026/269/)
- [Modernize your UIKit app（WWDC26-278）](https://developer.apple.com/videos/play/wwdc2026/278/)
- [Modernize your AppKit app（WWDC26-289）](https://developer.apple.com/videos/play/wwdc2026/289/)
- [Design intuitive search experiences（WWDC26-292）](https://developer.apple.com/videos/play/wwdc2026/292/)
- [Communicate your brand identity on iOS（WWDC26-251）](https://developer.apple.com/videos/play/wwdc2026/251/)
- [Refine accessibility for custom controls（WWDC26-220）](https://developer.apple.com/videos/play/wwdc2026/220/)
- [Principles of great design（WWDC26-250）](https://developer.apple.com/videos/play/wwdc2026/250/)
- [Safari and Web Technologies Group Lab（WWDC26-8015）](https://developer.apple.com/videos/play/wwdc2026/8015/)
- [Safari 26.0 Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes)
- [Safari 27.0 Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes)
- 仓库内 `skills/Apple-Style-HIG/reference/design-site/whats-new.md` 及 `hig/{menus,sidebars,scroll-views,sheets,tab-bars}.md` 的 Change log

二手（本环境无法直接访问，基于搜索结果摘要，需自行核实）：

- [News from WWDC26: WebKit in Safari 27 beta（webkit.org）](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/)
- [Interop 2026（web.dev）](https://web.dev/blog/interop-2026)
- [Declarative dialog / popover control（GoogleChrome modern-web-guidance）](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-behaviors/declarative-dialog-popover-control.md)
- [Agent Skills specification（agentskills.io）](https://agentskills.io/specification)、[Zed: Skills](https://zed.dev/docs/ai/skills.md)
- Safari 26 工具栏着色与 theme-color：[Ben Nasedkin](https://nasedk.in/blog/ios26-safari-toolbar-colors/)、[pavel 1ar.ionov](https://1ar.io/updates/safari-26-liquid-glass-web/)、[grooovinger](https://grooovinger.com/notes/2026-02-27-safari-26-header-background)、[Danny Moerkerke](https://x.com/dannymoerkerke/status/1995944519632912570)
- iOS 27 Liquid Glass 变化：[MacRumors](https://www.macrumors.com/2026/06/10/how-liquid-glass-is-changing-in-ios-27/)
- 原生开关触感：[WebKit Bugzilla 285120](https://bugs.webkit.org/show_bug.cgi?id=285120)
