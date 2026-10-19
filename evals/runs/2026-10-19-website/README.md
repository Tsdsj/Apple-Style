# 冷启动对比：用 / 不用技能做一个完整官网

日期：2026-10-19　·　技能版本：`main` @ `0fbdbe6`（文件哈希见 [`skill-hashes.txt`](skill-hashes.txt)）　·　环境：Linux 容器、Chromium 141 headless、Playwright 1.58.2、axe-core 4.10.2、Lighthouse 12

结论与建议在 [`docs/audit/2026-10-19-website-guidance-audit.md`](../../../docs/audit/2026-10-19-website-guidance-audit.md)。本目录保存方法、原始数据和生成的站点。

## 方法

- **任务**：同一段需求（见下文），为虚构的记账应用「青柠记账」做一个可上线的中文官网：首页、功能、价格、FAQ、博客列表 + 文章、关于、联系（表单）、隐私政策、404；静态 HTML/CSS/JS，无构建、无外部 CDN 和网络字体，390–1920px，浅色与深色，交付 README。
- **条件**：4 个全新子 agent，与本会话的上下文隔离，模型与工具相同，并行运行。
  - **启用技能（A、D）**：告知技能位于 `skills/`，要求先读 `skills/Apple-Style/SKILL.md` 并按其流程工作，只许读 `skills/` 下的文件。
  - **未启用技能（B、C）**：禁止读取仓库中的任何文件。
  - 站点目录用中性的字母命名，组别不出现在路径中。
- **中断**：4 个 agent 都在中途碰到会话额度上限，额度重置后从断点继续。耗时与 token 因此不可比，本次不做效率结论。
- **越界写入**：D 在恢复后用相对路径把两张调试截图写到了仓库根目录的 `.dev/shots/`，违反了“只在输出目录写文件”的要求。评估时已删除，不影响站点本身。
- **评估**：用同一套脚本检查 4 个站点（[`tools/check-site.spec.js`](tools/check-site.spec.js)）：
  - 从首页爬取全站，检查坏链和失效锚点；
  - 每页检查元数据、地标、标题层级和跳转链接，并记录控制台错误和外部请求；
  - 在 320 / 390 / 768 / 1024 / 1440 / 1920px 下检查横向溢出；
  - 每页在浅色和深色下各跑一次 axe（WCAG 2.2 AA + 最佳实践）；
  - 在 390px 下用键盘操作移动端菜单；
  - 检查首页前 20 个焦点的焦点环；
  - 联系表单：先空提交，再填写可见字段后提交；
  - 减弱动态效果与强制颜色；
  - 用 [`tools/serve.py`](tools/serve.py) 模拟静态托管，访问深层的不存在路径，看 404 页是否正常显示；
  - 另外用 Lighthouse（移动端模拟）测 `index`、`pricing`、`contact` 三页（[`tools/lh-run.sh`](tools/lh-run.sh)）。

  检查脚本先在一个故意埋了问题的小站上验证过（坏链、锚点、Esc 不关闭菜单、404 深层路径丢样式都能查出）。
- **偏差声明**：
  - 每组只有 2 个样本，只有一个任务，单次运行，只能作探索性结论。
  - 评审者知道每个站点属于哪一组。不过评分以自动化检查为主，截图对比只用于描述。
  - 生成站点和评审用的是同一模型家族。

## 需求原文（两组相同）

> 为一款虚构的 iPhone / Mac 记账应用「青柠记账 Lime Ledger」做一个完整、可上线的官网。需要：首页、功能介绍、价格（免费版与订阅版对比）、常见问题、博客（列表页 + 至少一篇文章）、关于我们、联系我们（带表单，提交后有反馈，不需要真实后端）、隐私政策和 404 页面。要求克制的 Apple 风格，支持手机（390px）到大屏桌面（1920px），浅色和深色。用静态 HTML/CSS/JS，不需要构建工具，不依赖外部 CDN 或网络字体，直接放到静态托管就能用。内容用中文，文案可以虚构。完成后在站点根目录写一个 README.md，说明页面结构、主要设计决策和你做过的检查。

启用组额外的一段话：

> 本机装有 Apple-Style 技能套件，位于 /home/user/Apple-Style/skills/（包含 Apple-Style、Apple-Style-HIG、Apple-Style-Liquid-Glass、Apple-Style-Review 四个技能）。这个需求正好匹配 Apple-Style 技能，请把它当作已加载的技能来用：先完整阅读 …/skills/Apple-Style/SKILL.md，按其中的工作流程做，需要时再打开它指向的其他文件。只读 …/skills/ 下的内容。

未启用组额外的一段话：

> 不要读取 /home/user/Apple-Style 目录下的任何文件（Playwright 安装除外）。

两组拿到的环境说明也相同：Python 3、Node 22、已安装的 Playwright 与 Chromium 路径、各自的端口。

## 结果

| 检查 | A（启用） | D（启用） | B（未启用） | C（未启用） |
|---|---|---|---|---|
| 页面（不含 404） | 11 | 11 | 11 | 11 |
| 坏链 / 失效锚点 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| 每页标题唯一、描述、`lang`、图标、OG、canonical | 齐 | 齐 | 齐 | 齐（无 `color-scheme` meta） |
| 单一 `h1`、标题不跳级、跳转链接 | 是 | 是 | 是 | 是 |
| 320px 横向溢出 | 无 | 无 | 无 | **2 页**（38px、58px） |
| axe 严重级违规（浅色） | **0** | `link-in-text-block` 1 页 | 对比度 50 个节点（2 页）+ `link-in-text-block` 5 页 | 对比度 59 个节点（4 页）+ `link-in-text-block` 3 页 |
| axe 中等级 | 0 | `aside` 嵌套 4 页 | 0 | `aside` 嵌套 1 页 |
| 焦点环（前 20 个焦点） | 全部可见 | 全部可见 | 全部可见 | 全部可见 |
| 移动端菜单：Enter 打开、Esc 关闭并还焦点 | 是 | 是 | 是 | 是 |
| 表单：空提交标错并聚焦第一项；有效提交出现成功反馈 | 是 | 是 | 是 | 是 |
| 404：`noindex`、深层路径仍有样式 | 是 | 是 | 是 | 是 |
| 减弱动态效果下仍在运行的动画 | 0 | 0 | 0 | 0 |
| Lighthouse 性能（3 页） | 96–97 | 86–97 | 100 | 99–100 |
| Lighthouse 无障碍 / 最佳实践 / SEO | 100 / 100 / 100 | 100 / 100 / 100 | 96–100 / 100 / 100 | 96–100 / 100 / 100 |
| LCP（移动端模拟） | 2.4–2.6 s | 2.4–2.8 s | 1.6–1.7 s | 1.5–1.7 s |
| 每页传输（未压缩） | 251–269 KB | 271–302 KB | 88–115 KB | 86–117 KB |
| CSS：库 + 自写 | 101.8 + 58.7 KB | 101.8 + 77.4 KB | 0 + 68.3 KB | 0 + 66.5 KB |
| JS：库 + 自写 | 74.5 + 14.7 KB | 74.5 + 13.7 KB | 0 + 15.2 KB | 0 + 13.9 KB |
| 首页未使用的 CSS / JS（Lighthouse） | 库 CSS 80 KB、自写 36 KB；库 JS 41 KB | 库 CSS 80 KB、自写 46 KB；库 JS 41 KB | 41 KB；JS 0 | 36 KB；JS 0 |
| 用到的 `as-*` 类 | 33 种 | 29 种 | — | — |

补充说明：

- **对比度**：B、C 的对比度违规大多在用 HTML 画的产品界面示意图里（`.ui-entry`、`.mac__group` 等）。两个 agent 自己做对比度检查时把示意图当作装饰排除了，axe 仍然检查这些文字。C 的文章页图表（`.split-bar`）不属于示意图，是真实违规。
- **`link-in-text-block`**：正文里的链接只靠颜色区分，属于 WCAG 1.4.1。
- **D 的 pricing 页**：TBT 390ms 来自页面自己的 `site.js`（启动 874ms），不是来自库。
- 4 个站点都自带 `robots.txt`、`sitemap.xml`、社交分享图和 favicon，B、C、D 还有订阅源。4 个站点的页眉页脚都在每页里复制一份，B 为此写了同步脚本。
- 启用组的 README 按 Apple-Style-Review 的约定，把每项标为已检查、未检查或不适用，并写明了 Safari、读屏软件和真机都未检查。未启用组同样诚实地列出了局限，但 C 只检查了 390px 及以上宽度，没有发现 320px 的溢出。

视觉对比见 [`compare/`](compare/)（每张图从左到右依次为 A、B、C、D）。四个站点观感接近：

- 启用组的页眉是浮动的玻璃胶囊导航组（iOS 工具栏写法）；
- 未启用组的页眉是通栏的磨砂横条（apple.com 写法）。

## 无头浏览器里的大半径背景模糊

两个启用组 agent 都在截图里发现，移动端菜单（大玻璃）背后的文字几乎没有被模糊。A 把它归因于库在菜单展开动画中途计算折射；两者都用 `data-lens="off"` 关掉了菜单的折射，D 还加厚了填充。

复核结果：在同一个 headless Chromium 里，**不加载库**的纯 CSS `backdrop-filter: blur()` 也会这样：

- 8px 和 14px 能完全模糊；
- 20px 起，背后的文字明显保持清晰。

见 [`compare/headless-backdrop-blur.png`](compare/headless-backdrop-blur.png) 和 [`tools/headless-blur-probe.spec.js`](tools/headless-blur-probe.spec.js)。所以这不是库的缺陷，而是测试环境的渲染限制：大玻璃的默认模糊是 40px。有 GPU 的 Chrome 是否正常，本次没有验证。

## 复现

```bash
# 在仓库根目录；AXE 指向 axe-core 4.10.2 的 axe.min.js
SITE=evals/runs/2026-10-19-website/sites/A PORT=9211 OUT=/tmp/eval-A AXE=/path/to/axe.min.js \
  CHROMIUM=/opt/pw-browsers/chromium npx playwright test -c evals/runs/2026-10-19-website/tools/website.config.js
EVIDENCE=/tmp python3 evals/runs/2026-10-19-website/tools/summarize.py eval-A   # 或直接读 evidence/A/*.json
CHROMIUM=/opt/pw-browsers/chromium evals/runs/2026-10-19-website/tools/lh-run.sh \
  evals/runs/2026-10-19-website/sites/A 9221 /tmp/eval-A /index.html /pricing.html /contact.html
```

[`evidence/`](evidence/) 保存了每个站点的全部 JSON 结果、Lighthouse 摘要和关键截图（移动端菜单、表单两种状态、深层 404、强制颜色）。整页截图和 Lighthouse 原始报告体积太大，没有收入仓库。
