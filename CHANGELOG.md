# Changelog

## Unreleased

网站优先改造 阶段 1（[改造清单](docs/plan/2026-10-19-website-first-plan.md) 1.3、1.4、1.11）：

- 样式表源文件拆分到 `skills/Apple-Style/web/css/*.css`，内容未改动。`apple-style.css` 由 `scripts/build-css.py` 按原节顺序合并生成，与拆分前逐字节一致；新增压缩版 `apple-style.min.css`。
- `scripts/build-css.py --check` 检查生成文件是否过期，以及是否使用了未声明的 `var(--as-*)`；`tests/test_build_css.py` 把它接入 CI。
- 演示页的说明、技能文件的文件列表和打包测试改为指向新结构。
- 网站公共层（1.12）：`controls.css` 只保留按钮、表单字段、状态标签和徽标；工具栏、标签栏、侧栏、sheet、菜单、分段控件、开关、滑块等移入 `app.css`，它们的偏好设置覆盖移入最后合并的 `app-preferences.css`。合并顺序为 tokens、base、glass、controls、preferences、app、window、density、app-preferences。在演示页上逐元素比较 240 种组合（宽度、深浅色、强制颜色、减弱动态效果、增强对比度、减弱透明度、密度、平台）的计算样式，与分层前一致。公共层压缩后 25.2 KB。
- `.as-input` 默认有边框（新令牌 `--as-field-border`），对页面背景和输入框填充的对比度在浅色和深色下均 ≥ 3:1（WCAG 1.4.11，1.8）。
- 正文（段落、列表、定义、表格、引用、图片说明）中没有类名的链接默认带下划线；`nav` 中的链接和带类名的链接（如 `a.as-button`）不再显示浏览器默认下划线（WCAG 1.4.1，1.9）。
- `SKILL.md` 改为以网站为主：先判断页面类型（内容网站、Web 应用、Mac 窗口、原生），按类型列出要读的文件；新增网站快速开始和“网站上不要做”的清单。`rules-and-evidence.md` 增加页面类型表（1.1、1.2）。
- 新增 `cheatsheets/website.md`：公共层的加载方式、可选的延后加载折射、性能预算（项目默认值）和无头浏览器渲染模糊的限制（1.5、1.6）。Review 增加网站预算检查项。
- 技能目录内指向目录之外的链接改为仓库 URL，`tests/test_skill_links.py` 防止再出现（1.10）。
- 新增 `web/js/site-nav.js`（压缩后 1.8 KB，不依赖运行时）：窄屏展开导航，Esc 关闭并归还焦点、点外部或链接关闭、变宽时自动收起，无 JS 时链接照常可用（1.7）。
- 新增网站模式：页眉 `web/patterns/site-header.css`（通栏材质条与浮动玻璃胶囊两种写法，吸顶不遮挡锚点）、窄屏导航 `site-nav.css`、页脚 `site-footer.css`，写法和无障碍要求在 `cheatsheets/website-patterns.md`，浏览器测试在 `tests/browser/patterns.spec.js`（2.1–2.3）。
- `website.md` 增加元数据与 SEO、多页共享页眉页脚、字体、深色模式、静态托管、框架接入和上线清单（2.15）。
- `web-implementation.md` 只保留所有网页通用的内容（含表单），应用组件的约定移到新的 `web-app.md`；`components-quickref.md` 分为网站和 Web 应用两部分（2.18）。
- `typography.md` 增加网页大字号与中日韩排版，`layout-and-shapes.md` 增加网页布局，Liquid Glass 技能增加“网站上的玻璃”（2.19）。
- 参考库新增 `marketing/` 分类：用事务式刷新收录 developer.apple.com 的 App Store 营销指南与预购页（徽章用法、Apple 产品图、产品名称与商标写法），来源增至 210 个；`hig-lookup.sh --page` 可查到这两页（2.20）。
- 新增网站模式：主视觉与大字号 `hero.css`、版块与功能网格 `section.css`、价格与对比表 `pricing.css`、FAQ `faq.css`、文章排版 `prose.css`、博客列表/面包屑/分页/标签 `blog.css`，均写入 `website-patterns.md`，测试在 `tests/browser/content-patterns.spec.js`（2.4–2.9）。文章页（公共层 + 页眉页脚 + 版块、文章、博客）压缩后 38.3 KB，落地页（+ 主视觉、价格、FAQ）39.8 KB。
- 没有类名的链接改用 `--as-link` 颜色：浏览器默认的 #0000EE 在深色背景上对比度约 2.2:1。
- 新增网站模式：网站表单 `site-form.css` + `web/js/site-form.js`（压缩后 1.9 KB；错误摘要获得焦点、行内错误、成功状态、键盘与读屏都碰不到的防垃圾字段）、404 与法律页 `legal.css`、产品示意图 `mockup.css`（含 App Store 徽章与 Apple 商标写法，出处为参考库中的营销指南）、图片与媒体 `media.css`、滚动进入动效 `motion.css`，测试在 `tests/browser/site-forms-media.spec.js`（2.10–2.14）。
- 页眉在 320px 下保持一行；相邻同背景版块不再叠加上下留白。
- `.as-body` 去掉浏览器默认的 8px 外边距；网站快速开始给 `<body>` 加上 `class="as-body"`（否则字体、颜色和背景不生效）。
- 表单字段示例把错误提示移到 `<label>` 之外：放在标签内的错误一旦显示，会成为字段可访问名称的一部分。
- Review 新增网站检查清单，与新脚本 `skills/Apple-Style-Review/scripts/check-site/` 的 13 项检查一一对应：全站坏链与锚点、逐页元数据、各宽度横向溢出、正文链接非颜色标识、axe（浅色与深色）、窄屏菜单键盘操作、焦点可见、表单两种提交、深层路径 404、无 JS 浏览、偏好设置、体积预算与 LCP、控制台与请求。没测的项一律记为未检查。用 `tests/fixtures/bad-site/` 验证每个埋入的问题都被查出（`tests/test_check_site.py`），并对照上次评测的站点 A、B 复核结果（3.1–3.3）。
- 新增参考站 `skills/Apple-Style/web/examples/site/`（虚构产品，10 个页面，用到全部 14 个网站模式）：按页面类型生成的 CSS 包由 `scripts/build-css.py` 维护并纳入 `--check`；每页技能 CSS 压缩后 ≤ 38.7 KB，JS ≤ 3.7 KB；Lighthouse 移动端三页均为 100/100/100/100（LCP 1.35–1.59 秒）。`tests/browser/reference-site.spec.js` 在浅色和深色下对每页跑 axe（0 违规）、五个宽度的溢出、深层 404、键盘、表单与预算；`check-site` 在 CI 中跑参考站，无任何失败项（2.16、2.17、3.4）。
- 为满足预算，公共层再瘦身（25.2 KB → 20.5 KB）：网站模式与参考站都用不到的规则（玻璃组、临时玻璃、暗化层、Mac 尺寸、select 弹出层、mini/xlarge 按钮等）移入 `app.css`，演示页与测试页的计算样式前后一致。
- 新增开发依赖 `axe-core@4.10.2`（仅用于仓库测试）。
- `check-site` 修正：空提交后焦点落在链接到出错字段的错误摘要上也算通过；表单提交到本机不存在的后端时，成功状态记为未检查而非误判为通过；只含图片的链接在强制颜色下视为可见。
- 修复窄屏导航的布局偏移：`site-nav.js` 延后加载，加载后才收起链接，页眉随之变矮，下面的内容整体上移。对照重测中用通栏页眉的两个站点 CLS 为 0.27 和 0.29（Lighthouse 性能 85–86）。现在由 `<head>` 中一行内联脚本给 `<html>` 加 `as-js`，收起状态从首帧就生效；`destroy()` 设置 `data-plain` 恢复原位。浮动页眉原先用来抵消偏移的固定高度一并去掉，参考站三页 CLS 从 0.017 降到 0。新增测试：脚本延迟加载时页眉高度不变，并以去掉 `as-js` 的对照证明测试能发现偏移。
- 演示首页改为先展示参考网站，再进入组件工作台（仓库根目录 `index.html`，打包时原样复制）；打包时由 `scripts/relativize-site.py` 把参考站的根相对路径改写为相对路径，部署在 Pages 子路径下也能加载。新增 `tests/test_relativize_site.py` 与在 `/Apple-Style/` 子路径下检查打包结果的 `tests/browser/pages-package.spec.js`（4.3）。

修复 [2026-10 实用性审计](docs/audit/2026-10-16-practicality-audit.md) §2.1–2.7 的 P0/P1 缺陷，每项都有回归测试（`tests/browser/regressions.spec.js`）。

- 强制颜色（Windows 对比度主题）：开关、分段选中、滑块、选中的标签/分组项/侧栏行/菜单栏项改用系统色绘制，状态不再消失；填充类按钮保留可见边界。
- 菜单快捷键：⌘ 在 Apple 平台只匹配 Command，其他平台只匹配 Ctrl；焦点在文本框或富文本中时，编辑键（全选、剪贴板、撤销/重做、移动与删除）留给输入框，⌘S 等其他命令照常执行。
- RTL：滑块按 HIG 从右向左填充并在正确位置绘制旋钮；开关镜像，拖拽方向随之镜像；列表值、徽标、提醒与 sheet 标题、菜单缩放原点、sheet 位置和侧栏内边距改为逻辑属性。
- `.as-vibrant`：去掉在浅色外观下让文字消失的 `plus-lighter` 混合。
- `.as-search`：输入框可以收缩，不再按字体度量撑破窄容器。
- 运行时可在 Node / 服务端渲染 / 无 DOM 测试环境中导入（返回同形状的空操作 API），支持 CommonJS；新增 ES 模块入口 `liquid-glass.mjs`；同页的脚本与模块共享一个运行时。演示打包包含 `.mjs`。
- 级联层：样式表保持默认不分层（不影响现有 `<link>` 用法），文档给出导入到层的写法，使 Tailwind v4 工具类可以覆盖组件。

审计 §2.8–2.10：

- 玻璃组中的 `.as-glass` 不再被 `display: none` 隐藏，而是平面渲染（内容可见可用），运行时不挂载它并在控制台警告一次。
- 性能：滚动/缩放时背景采样最多每 120 ms 一次并在停止后补采一次；采样不再写 `pointer-events`；位移贴图按尺寸/圆角/边缘缓存（48 项）；DOM 变化只在有节点移除时扫描已注册组件；快捷键只在菜单项变化时重新收集；`materialize()` 对大玻璃与 lite 模式不再动画 `filter: blur()`。浏览器测试以调用次数作为预算。
- 维护：转录标题从页面识别 WWDC 年份（不再写死 WWDC25）；参考库接受 `wwdcNN/` 目录；页面 404 时报告 `moved_to`，新增 `--retire`；待复核速查表按引用关系列出（`recheck_reasons`）；HTML 渲染识别表格行并跳过隐藏元素与按钮。
- 参考库全量刷新：208 个来源全部重新抓取（新增 Apple In-App Purchase，下线改名前的 In-App Purchase，设计入门页迁到 `/design/get-started/`，28 页内容更新）。
- 关闭的 sheet 遮罩不再渲染（`visibility: hidden`），避免浏览器按视口边缘固定元素着色工具栏时取到隐藏遮罩。

[PC 端网页评估](evals/runs/2026-10-17-pc-web/report.md) 发现的 D1–D3：

- 分栏变量（栏宽、内容最小宽度、行高、窗口工具栏高度）定义到 `:root`，`.as-split` 可以在 `.as-window` 之外使用，也仍可在任意祖先上覆盖；`.as-window` 没有菜单栏时分栏也能撑满高度；窄屏时所有分栏都隐藏拖拽条。
- `--as-label-secondary` 浅色值从 60% 提到 74%，默认满足 4.5:1（白底 5.02:1、浅灰底 4.72:1）；深色不变。
- 新增 `--as-accent-on-tint`，`.as-button-tinted` 的文字在浅色下改用深一档的蓝色（白底 5.57:1、浅灰底 5.04:1）。
- 新增桌面 Web 尺寸档 `data-density="desktop"`：正文 14/20、按钮与搜索框 32px、分段控件整体 32px、菜单/侧栏/分栏行 32px、开关 40×24、滑块 20px 拇指，并有对应的文字样式阶梯；所有组件一起缩放。触屏（`any-pointer: coarse`）下保持 44px 命中区、16px 输入文字和触屏尺寸的开关与滑块。项目默认值，不是 Apple 规范。
- 新增 `--as-destructive-text`，危险按钮与危险菜单项的文字不再使用系统红色样本（白底 3.57:1）：浅色 `#d1001f`、深色 `#ff6961`，在标准背景与大玻璃上 ≥ 4.94:1；增强对比度下为 `#b42318` / `#ff8a80`。

Web 应用组件（评估第 5 节列出的缺口），测试在 `tests/browser/components.spec.js`：

- 表单字段：`.as-form`、`.as-form-field`、`.as-form-label`、`.as-form-hint`、`.as-form-error`、`.as-form-row`，`.as-input` 用于文本框、文本区和 `<select>`；`aria-invalid="true"` 显示红色边，错误与提示文字 ≥ 4.5:1；跟随三个尺寸档，触屏 44px / 16px。
- Pop-up 按钮：`<select class="as-input">` 在支持的浏览器、有指针时使用可定制 select（`appearance: base-select`），选单为大玻璃材质、前置勾选标记；触屏和不支持的浏览器保留系统选择器。
- 可选择列表：`.as-listbox` / `.as-option`，运行时 `listbox()`（`init()` 自动升级）提供单选 listbox 键盘模型：一个 Tab 停靠点，方向键、Home/End、按字母跳转，`aria-orientation="horizontal"` 与 RTL，`data-activation="manual"`，跳过禁用项，发出 `change`。页面重绘行或用 `aria-selected` 从代码选中时，运行时同步角色与停靠点；被重绘的行原本有焦点时，焦点移到新的选中行。选中行为强调色白字，其中的次要文字与状态标签一起变白，焦点环画在行外。
- 模态对话框：`<dialog class="as-dialog">`（配合 `showModal()`），不透明表面 `--as-modal-bg`，头部与底部在长内容滚动时固定，底部操作靠后、主操作在最后；用 `@starting-style` 做进出场。
- Toast：运行时 `toast(message, { duration })`，每次一条，`role="status"` 播报，相同内容重复也会再次播报；有模态对话框时放进对话框内（背景不可操作的区域不会播报）；页面有浮动标签栏时显示在标签栏之上；`destroy()` 清理。
- 空状态 `.as-empty`、骨架屏 `.as-skeleton`（减弱动态效果时停止脉动）、状态标签 `.as-pill` 及 info / success / warning / critical 变体（两种外观下都 ≥ 4.5:1）、`.as-pill-dot`。
- 强制颜色、降低透明度、增强对比度与减弱动态效果覆盖以上组件；`.as-root` / `.as-body` 设置 `accent-color`，原生复选框与单选框使用强调色。
- `demo.html` 新增组件示例；评估页改用库组件，页面 CSS 从 76 行降到 24 行（`[gap]` 只剩 CJK 字体 5 行）。

## v0.1.0 — 2026-10-04

Reliability hardening.

- 安装：外置安装凭据、复制内容/文件名/权限指纹、未知归属与修改内容保留、源目标重叠拒绝、暂存替换和失败回滚。旧安装不自动认领；无 Git 下载端点支持分支与标签。
- 控件：区分 tabs 和 radio group，roving tabindex、焦点同步、禁用项跳过、标准 click；拖拽只提交一次，取消不激活。
- 样式：系统颜色样本保留；为普通白字按钮与选中行提供默认满足对比度的语义操作色；修复窄屏工具栏/示例溢出。
- 生命周期：新增 detach/destroy，重复 init 复用绑定，根节点作用域、动态增删/重挂载、配置持久化和资源清理；补充 React/Vue cleanup 示例。
- 技能：目标平台、产品形态、输入和容器尺寸分开判断；区分官方要求/建议、项目默认和视觉经验；Review 明确证据状态。
- 参考库：208 个现有来源纳入 manifest；覆盖四类内容、自动 INDEX、抓取时间/内容与源响应哈希、失败不覆盖、事务回滚和变更报告。
- 发布补验：Windows PowerShell 5.1/7 的原生 junction、Linux/macOS 回归已在真实 CI 通过；补齐 .NET 文件哈希兼容和确定的浏览器媒体测试基线。
- 验证/交付：安装器与参考夹具、真实 Chromium 交互/资源/样式/布局回归、CI、固定 Skill 评测任务、统一演示链接与尚未启用的发布配置。

具体执行证据、发布状态与未验证项见 `docs/validation.md`。
