# Tidepool 文档站

虚构的开源命令行工具 Tidepool 的文档站。纯静态 HTML、CSS、JS：没有构建步骤，没有运行时，没有外部 CDN，没有字体文件。站点根目录就是本目录，需要从根路径提供服务（资源路径都是根相对路径，如 `/css/apple-core.css`）。

## 页面

| 文件 | 内容 |
| --- | --- |
| `index.html` | 首页：简介、安装命令（安装脚本、Homebrew、npm）、功能卡片、最新版本 |
| `quick-start.html` | 快速开始：系统要求、安装、初始化项目、登录、第一次同步 |
| `guides/configuration.html` | 指南一：配置文件位置、设置表、忽略规则、环境变量、校验 |
| `guides/plugins.html` | 指南二：插件钩子、安装、启用、编写、示例插件、超时与失败、安全 |
| `guides/troubleshooting.html` | 指南三：`doctor`、日志、错误码 E101 到 E503、同步慢、冲突、问题报告 |
| `reference/api.html` | API 参考：全局参数、每个命令的参数表、退出码、环境变量 |
| `changelog.html` | 更新日志：1.0.0 到 1.4.0 |
| `404.html` | 404 页，带 `noindex`，由主机返回 404 状态 |

每个页面都有：跳过链接、顶部导航（窄屏折叠为 Menu）、文档侧边栏（窄屏为可折叠的 "Documentation menu"）、页内目录、上一页与下一页、页脚（含浅色、深色、跟随系统的切换）。代码块在自身内部横向滚动，宽表格在自己的区域内滚动，页面本身不出现横向滚动。

## 结构

```
sites/N/
  index.html, quick-start.html, 404.html, changelog.html
  guides/        configuration.html, plugins.html, troubleshooting.html
  reference/     api.html
  css/
    apple-core.css   核心层：tokens, base, glass, controls, preferences（按此顺序拼接，复制自 Apple-Style 技能）
    patterns.css     页面模式：site-header, site-nav, site-footer, prose, legal（目录与 404）, section（首页卡片）
    docs.css         本站自己的布局：侧边栏、阅读栏、上一页/下一页、外观切换
  js/
    site-nav.js      窄屏导航折叠（复制自技能，未修改）
    site.js          文档菜单的断点同步、外观切换（约 1.6 KB，无依赖）
  img/social.png     Open Graph 图（1200 × 630，纯图形，无文字）
  apple-touch-icon.png, favicon.svg
  robots.txt, sitemap.xml
```

- 页面头部和页脚在每个页面里都是手工复制的同一段标记（只有 `aria-current` 不同）。修改时要在所有页面同步改。
- 没有使用液态玻璃：导航栏用标准材质，内容区不使用玻璃。
- 没有 SF 字体文件，没有 SF Symbols。图标只用 CSS 画的箭头。
- 页面使用的颜色都是 `tokens.css` 中的令牌，浅色与深色都由系统或 `data-theme` 决定。

## 预览

在本目录的上级环境中，用技能自带的服务脚本（它会返回真正的 404 状态）：

```sh
python3 /home/user/Apple-Style/skills/Apple-Style-Review/scripts/check-site/serve.py /home/user/Apple-Style/evals/runs/2026-10-19-website-v2/sites/N 9413
```

然后打开 http://127.0.0.1:9413/ 。

## 检查

### 1. 页眉页脚一致性

忽略 `aria-current` 后，所有页面的 `<header>` 与 `<footer>` 应只有两个不同的块：

```python
import pathlib, re, sys
pattern = re.compile(r'<(?P<tag>header|footer) class="as-site-(?:header|footer)".*?</(?P=tag)>', re.S)
blocks = {}
for page in sorted(pathlib.Path(".").rglob("*.html")):
    for m in pattern.finditer(page.read_text(encoding="utf-8")):
        blocks.setdefault(re.sub(r' aria-current="page"', "", m.group(0)), []).append(str(page))
if len(blocks) != 2:
    sys.exit(f"{len(blocks)} distinct header/footer blocks; expected 2")
```

上次运行结果：2 个块，通过。

### 2. 浏览器检查（技能的 check-site 工具）

在装有 `@playwright/test` 的项目中运行（这里使用的是 `/home/user/Apple-Style`）：

```sh
SITE=/home/user/Apple-Style/evals/runs/2026-10-19-website-v2/sites/N PORT=9413 \
WIDTHS=320,390,768,1024,1280,1440,2000 OUT=<输出目录> \
AXE=/home/user/Apple-Style/node_modules/axe-core/axe.min.js \
CHROMIUM=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell PYTHON=python3 \
npx playwright test -c /home/user/Apple-Style/skills/Apple-Style-Review/scripts/check-site/check-site.config.js
```

结果（Chromium headless，7 个页面，宽度 320、390、768、1024、1280、1440、2000 px，axe-core 4.10.2）：

| # | 项目 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | 内部链接与锚点 | 通过 | 7 个页面，198 个内部链接，56 个锚点全部可解析 |
| 2 | 每页元数据、标题层级、地标 | 通过 | lang、唯一 title、description、canonical、缩放未禁用、color-scheme、一个 h1、无跳级、main/banner/contentinfo、跳过链接 |
| 3 | 320 到 2000 px 横向溢出 | 通过 | 49 个页面 × 宽度组合，无横向溢出 |
| 4 | 正文链接不靠颜色区分 | 通过 | 5 个正文链接均有下划线 |
| 5 | axe 浅色与深色 | 通过 | 14 次（页面 × 配色），无严重或紧急违规 |
| 6 | 窄屏菜单键盘操作 | 通过 | Tab 到达按钮，Enter 打开，Esc 关闭，焦点返回 |
| 7 | 前 20 个 Tab 停靠点的焦点指示 | 通过 | 20 个停靠点均可见 |
| 8 | 表单空提交与有效提交 | 不适用 | 站点没有表单 |
| 9 | 深层缺失路径的 404 | 通过 | `/a/b/c/missing-xyz` 返回 404，有 noindex，样式与首页一致 |
| 10 | 关闭 JavaScript 时的导航与正文 | 通过 | 390 与 1280 px 下主导航可达，正文存在 |
| 11 | 减弱动效与强制颜色 | 通过 | 无超过 10 ms 的动画，强制颜色下控件可见 |
| 12 | 预算与 LCP | 未检查 | 阻塞 CSS 估计约 39 KB（预算 80 KB）；JS 以原样计为 5.4 KB（其中 `site-nav.js` 3.6 KB 来自技能，未压缩；`site.js` 1.6 KB 是站点自己的）。LCP 未测（没有 Lighthouse） |
| 13 | 控制台错误与请求 | 通过 | 无控制台错误、页面错误或失败请求；外部源 0 个 |

本次运行：通过 11，失败 0，未检查 1，不适用 1。

### 未检查或未覆盖

- 第 12 项的 LCP 与 Lighthouse 没有运行。未压缩的 JS 超过工具的 5 KB 线，但工具分不清技能 JS 与站点 JS；按文件看，技能的 `site-nav.js` 压缩后约 1.8 KB，站点的 `site.js` 压缩后更小。
- 只测了 Chromium 的 headless 渲染。没有测 Safari、Firefox、屏幕阅读器、真机，也没有手工做 200% 文字缩放。
- 没有玻璃材质，因此无需做玻璃的 GPU 检查。
- 截图只在 390 与 1280 px、浅色与深色下人工看过（首页、配置指南、API 参考），没有做完整的视觉审阅。

## 注意

- 内容全部虚构（Tidepool、tidepool.example、版本号、命令与输出）。`tidepool.example` 下的链接只是占位，不会被检查工具请求。
- 规范链接、Open Graph 和站点地图使用 `https://tidepool.example`。正式部署时替换为真实域名，并同时修改 `sitemap.xml` 与 `robots.txt`。
- 404 状态由主机决定。本地预览用 `serve.py` 模拟；在真实主机上要确认对缺失路径返回 404 而非 200 或跳转。
- 站点不需要构建步骤。页面由一次性脚本生成，该脚本不在本目录中；之后直接编辑 HTML 即可。
