# Northline 北线 落地页与价格页

虚构团队协作 SaaS「Northline」的静态站点：一个落地页（`index.html`）和一个价格页（`pricing.html`）。
纯 HTML / CSS / JS，无构建步骤，无外部 CDN，无字体文件。内容为中文，全部内容（品牌、评价、价格）均为虚构。

## 结构

```
index.html          落地页：主视觉、6 个功能卖点、3 条客户评价、行动号召
pricing.html        价格页：页面标题、3 个方案卡片（推荐团队版）、功能对比表、5 条常见问题
404.html            404 页（noindex，供缺失路径返回）
css/apple-core.css  Apple-Style 核心层：tokens、base、glass、controls、preferences（原样拼接）
css/apple-shell.css Apple-Style 页眉（浮动胶囊变体）、窄屏导航、页脚
css/apple-home.css  Apple-Style 首页模式：hero、section 与卡片、HTML 产品示意、滚动进入
css/apple-pricing.css Apple-Style 价格模式：hero、section、方案卡片与对比表、FAQ
css/site.css        本站样式：中文字体回退、中文行距与字距、页面布局、404 页
js/site-nav.js      窄屏菜单（≤ 2 KB，defer 加载；无 JS 时链接原地换行可见）
robots.txt, sitemap.xml, icon.svg
```

- 样式来源是本机 Apple-Style 技能（`/home/user/Apple-Style/skills/Apple-Style/`），按 `cheatsheets/website.md` 的加载规则：只复制用到的核心层与页面模式，每页分别加载。
- 页眉为浮动胶囊（玻璃只用于导航层），正文卡片与表格均为实心表面；不使用 `liquid-glass.js`。
- 浅色/深色跟随系统设置（`prefers-color-scheme`），没有手动切换。
- 所有 CTA 目前指向锚点或 `mailto:`，因为注册、购买流程不在本站范围内。接入真实注册后替换这些 `href`。

## 预览

资源路径为根相对路径（`/css/...`），需要通过 HTTP 访问站点根目录，直接用 `file://` 打开样式会丢失。例如：

```sh
python3 -m http.server 9415 --directory /home/user/Apple-Style/evals/runs/2026-10-19-website-v2/sites/P
```

然后打开 http://127.0.0.1:9415/ 与 http://127.0.0.1:9415/pricing.html 。

## 检查

按 Apple-Style-Review 的网站检查清单，使用其 `scripts/check-site/`（Playwright 1.58.2 + 本机 Chromium headless shell，axe-core 4.10.2），
输出写到临时目录，本站目录未写入任何报告文件。结果（2 个页面，宽度 320 / 390 / 768 / 1024 / 1440）：

| 检查 | 结果 |
|---|---|
| 1 内部链接与 `#` 锚点 | 通过（26 个内部链接、19 个锚点） |
| 2 每页元数据、标题层级、地标、跳过链接 | 通过 |
| 3 各宽度横向溢出 | 通过（10 组页面 × 宽度） |
| 4 正文链接可辨认 | 不适用（正文中没有链接） |
| 5 axe WCAG 2.2 AA，浅色与深色 | 通过（无 serious / critical） |
| 6 窄屏菜单键盘操作（390 px） | 通过 |
| 7 前 20 个 Tab 停靠点的焦点可见 | 通过（16 个停靠点） |
| 8 表单空提交与成功提交 | 不适用（本站没有表单） |
| 9 缺失深路径的 404、noindex、样式 | 通过 |
| 10 无 JS 浏览 | 通过 |
| 11 减少动态效果、强制颜色 | 通过 |
| 12 渲染阻塞 CSS / JS 预算 | CSS 约 35.9 KB（预算 80 KB）；JS 约 3.6 KB；**LCP 未测**（未安装 Lighthouse，无基线） |
| 13 控制台错误、失败请求、外部源 | 通过（无外部请求） |

补充的人工检查（Chromium headless，Playwright 脚本）：

- 390 px 与 1440 px、浅色与深色四组截图，无控制台错误、无页面错误、无失败请求。
- 价格页在 390 px 与 320 px 下页面本身无横向滚动；对比表在自己的滚动区域内横向滚动（Apple-Style 模式的预期行为）。修复过一次：方案卡按钮的 `box-sizing` 导致溢出 48 px，已改为 `border-box`。
- 滚动进入的动效在完整页面截图里呈起始状态（已知限制），滚动到位后正常显示。

## 已知限制与未做的事

- **未检查** Safari、Firefox、VoiceOver / NVDA、真实设备、GPU 下的大面积玻璃效果（无头 Chromium 对 20 px 以上的 backdrop blur 渲染不准）。
- **LCP 未测**，没有与"不带参考代码的同页"的对比。
- 页眉在两页之间只差一个 `aria-current="page"`。Apple-Style 的 `website.md` 里的"页眉逐字相同"检查脚本会因此报告 2 个不同的页眉块；这是按 Apple-Style 的 current-page 规则做的有意差异，并非漏改。页脚两页完全相同。
- 没有 og:image、JSON-LD 与 favicon.ico（只有 `icon.svg`）。
- 价格、用户数、评价均为虚构示例，页脚已标注。
