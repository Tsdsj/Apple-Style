# 网站优先改造后的对照重测

日期：2026-10-19 至 10-20　·　技能版本：`claude/adoring-mayer-8j1t1d` @ `8fd6ad7`（文件哈希见 [`skill-hashes.txt`](skill-hashes.txt)）　·　环境：Linux 容器、Chromium 141 headless、Playwright 1.58.2、axe-core 4.10.2、Lighthouse 12.8　·　对应计划 [4.2](../../../docs/plan/2026-10-19-website-first-plan.md)

上一轮（[2026-10-19 完整官网](../2026-10-19-website/README.md)）的结论是：技能带来无障碍和验证纪律，但页面更重，网站特有的部分都要 agent 自己写。改造后重测同样的问题，并加上两类新网站和一个 Web 应用回归任务。

## 方法

- **网站任务**（`evals/tasks.json`）：`website-full`（上一轮的 12 页官网需求原文）、`docs-site`（命令行工具文档站）、`landing-pricing`（SaaS 落地页加价格页）。每个任务一个启用技能、一个未启用技能的冷启动 agent，每组共 3 次。
- **Web 应用回归**：`narrow-mac`（700 / 1440px 的 Mac 文档编辑窗口），一个用改造后的技能（X），一个用改造前的技能（Y，`main` @ `0fbdbe6`，从 git 导出到临时目录），按 `tasks.json` 的 5 个检查项评分。
- **模型**：所有评测 agent 都用 Haiku 5.5，思考强度高。上一轮的模型不同，两轮的绝对数字不能直接比较，只比较同一轮内的两组。
- **隔离**：启用组只许读 `skills/`；未启用组不许读仓库（Playwright、Chromium 和 axe-core 的路径两组都告知）。站点目录用中性字母，组别不出现在路径里。
- **中断**：8 个 agent 中有 6 个在中途碰到会话额度上限，额度恢复后从断点继续。耗时与 token 不可比。
- **越界**：N 一开始把输出目录建成了 `sites/A`（空目录，已改名）；M 误调用了一次创建会话的工具，留下一个空闲的云端会话；Y 在仓库里运行过一次 `git status`。这些都没有改动站点之外的文件。
- **评估**（同一套工具，评审者知道组别，评分以自动化为主）：
  - Review 技能的 [`check-site`](../../../skills/Apple-Style-Review/scripts/check-site/README.md)，13 项检查，带 axe（浅色和深色）和 Lighthouse；
  - Lighthouse 移动端模拟测首页，每站 3 次取中位数，分别在**不压缩**（与上一轮相同）和**开启 gzip**（更接近真实静态托管）两种服务器下各测一遍；
  - 按规则比对把站点 CSS 拆成“从技能复制的”和“自己写的”（压缩后字节）。

## 结果

| | K 官网（启用） | L 官网（未启用） | N 文档（启用） | M 文档（未启用） | P 落地页（启用） | Q 落地页（未启用） |
|---|---|---|---|---|---|---|
| 页面（含 404） | 12 | 11 | 8 | 8 | 3 | 2 |
| check-site 失败项 | **0** | 1 | **0** | 5 | **0** | 4 |
| 失败内容 | — | 标题跳级（1 页） | — | 缺 canonical、320px 溢出、404 无 noindex、无 JS 时导航不可见、阻塞脚本 | — | 缺 canonical、无 404 页、无 JS 时导航不可见、阻塞脚本 |
| axe 严重级（浅色 + 深色） | 0 | 0 | 0 | 0 | 0 | 0 |
| 自写 CSS（压缩后） | 7.0 KB | 16.1 KB | 7.4 KB | 7.9 KB | 3.8 KB | 13.0 KB |
| 技能 CSS（全部文件，压缩后） | 45.8 KB | — | 31.7 KB | — | 40.7 KB | — |
| 首页阻塞渲染 CSS（check-site 估算，压缩后） | 43.3 KB | 16.1 KB | 39.0 KB | 7.9 KB | 35.9 KB | 13.0 KB |
| 首页 JS（未压缩） | 3.6 KB | 6.7 KB | 5.4 KB | 4.7 KB | 3.6 KB | 2.7 KB |
| Lighthouse 性能（不压缩 / gzip） | 86 / 86 | 100 / 100 | 85 / 85 | 100 / 100 | 100 / 100 | 100 / 100 |
| LCP 不压缩 | 1.35 s | 1.01 s | 1.36 s | 0.96 s | 1.50 s | 1.12 s |
| LCP gzip | 1.06 s | 1.05 s | 0.96 s | 0.95 s | 1.08 s | 1.19 s |
| CLS | **0.271** | 0.023 | **0.291** | 0 | 0.017 | 0 |

逐项数据：[`evidence/`](evidence/)（每站的 check-site `results.json` 与 `summary.md`、`lighthouse-index.json`、`css-js-sizes.json`）。首页截图：[`compare/`](compare/)（1280 浅色、390 深色）。

Web 应用回归：

| 检查项（`narrow-mac`） | X 改造后 | Y 改造前 |
|---|---|---|
| 700px 仍是 Mac | 是 | 是 |
| 面板不丢失内容 | 是（只设 `hidden`） | 是 |
| 检查器可选 | 是 | 是 |
| 键盘命令 | ⌥⌘S / ⌥⌘I、F6、菜单 | ⌥⌘S / ⌥⌘I、F6 |
| 可验证的宽度检查 | 67 项断言 | 37 项断言 |

两者都是 5/5，改造没有让 Web 应用场景退化。

## 与计划完成标准对照

| 指标（计划 4.2） | 目标 | 结果 |
|---|---|---|
| axe 严重级违规（含 `link-in-text-block`） | 每站 0 | **达到**：6 站全为 0（未启用组这次也是 0，见“解读”） |
| LCP 差距 | ≤ 0.2 秒 | **gzip 下达到**（+0.00、+0.01、−0.11 秒）；不压缩时**未达到**（+0.34、+0.39、+0.38 秒） |
| 技能 CSS / JS | ≤ 40 KB / ≤ 5 KB | 每页基本达到：阻塞渲染 CSS 含自写为 36–43 KB；JS 3.6–5.4 KB（未压缩计） |
| 自写 CSS | 明显少于未启用组 | **达到**：平均 6.1 KB 对 12.3 KB，约少一半 |
| Web 应用任务 | 通过率不低于改造前 | **达到**：5/5 对 5/5 |

## 解读

- **网站完整度上的差距变大了**：启用组 3 站的 check-site 都没有失败项；未启用组 3 站共 10 项失败，集中在上线细节（canonical、404 的 noindex、无 JS 时导航可见、脚本 `defer`、320px）。这些正是改造后 `website.md`、网站模式和 Review 清单覆盖的内容。
- **无障碍差距这次没有出现**：未启用组的 axe 严重级也是 0。上一轮的对比度问题主要出在 HTML 画的产品示意图里，这次未启用组的站点更简单（L 甚至没有运行 axe，靠自己计算对比度）。样本太少，不能据此说技能在无障碍上没有作用，也不能说有。
- **体积代价基本消除，但没有归零**：自写 CSS 少了一半，复制的技能 CSS 每页约 30–36 KB。开启 gzip 时 LCP 与未启用组持平；不压缩时仍慢约 0.35 秒，来自更大的样式和更多的样式请求（K 有 6 个 CSS 文件）。上一轮同条件下慢 0.7–1.3 秒（模型不同，仅作方向参考）。
- **评测发现的缺陷**（均已在本轮修复）：
  - **窄屏导航的布局偏移**：K、N 用通栏页眉，`site-nav.js` 延后加载后才收起链接，页眉变矮，整页上移，CLS 0.27 和 0.29，Lighthouse 性能因此只有 85–86。参考站当时只修了浮动页眉那一种写法。修复见 `site-nav.css`：`<head>` 中一行内联脚本给 `<html>` 加 `as-js`，收起状态从首帧就生效；参考站 CLS 由 0.017 降到 0。
  - **分栏面板隐藏不掉**：`.as-split > .as-inspector { display: block }` 与 `.as-split > [hidden]` 优先级相同且在后，技能自带的桌面演示也受影响（X 发现）。
  - **⌥ 快捷键被当成编辑键**：焦点在富文本中时，⌥⌘I 被当成 ⌘I（斜体）留给输入框（X 发现）。
  - **页眉页脚一致性校验脚本**：类名与模式不符，且不忽略 `aria-current`，在正确的站点上也会报错（P 发现）。
- **未解决**：`window.css` 在 1024px 以下把分栏改为上下堆叠，与“700px 的 Mac 窗口仍是 Mac”的指导矛盾。X 在副本里把下限改成 640px，Y 改用容器查询自己实现。改造前后的技能都有这个问题，记为后续项。

## 局限

- 每组 3 个样本，每个任务各 1 次，单一模型，只能作方向参考。
- 评审者知道组别；评分以 check-site 和 Lighthouse 为主，截图只用于描述。
- 只在 Chromium headless 中检查；Safari、Firefox、读屏软件、真机都未测。容器里缺少部分中文字重，截图中的中文标题可能偏细。
- Lighthouse 在本机服务器上运行，gzip 服务器是评测用的简化实现（`evidence/` 中不含其源码，做法见上文）。

## 复现

```bash
# check-site（在仓库根目录；AXE 来自开发依赖，LIGHTHOUSE 指向 lighthouse CLI）
SITE=evals/runs/2026-10-19-website-v2/sites/K PORT=9501 OUT=/tmp/check-K AXE=node_modules/axe-core/axe.min.js \
  LIGHTHOUSE=/path/to/lighthouse CHROMIUM=/path/to/chromium \
  npx playwright test -c skills/Apple-Style-Review/scripts/check-site/check-site.config.js
```
