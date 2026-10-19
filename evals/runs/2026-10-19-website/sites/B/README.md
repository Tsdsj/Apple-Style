# 青柠记账 Lime Ledger · 官网

虚构的 iPhone / Mac 记账应用「青柠记账」的产品官网。纯静态 HTML / CSS / JS：没有构建步骤，不依赖任何外部 CDN、网络字体或第三方脚本，把整个目录上传到任意静态托管（Nginx、GitHub Pages、Netlify、Vercel、Cloudflare Pages、OSS/COS 等）即可上线。

## 本地预览

```bash
# 推荐：行为与静态托管一致（不存在的路径会返回 404.html）
node tools/serve.js            # http://localhost:9102/

# 或者任何静态服务器
python3 -m http.server 9102
```

除 404 页外，所有页面都使用相对路径，直接双击 `index.html` 用 `file://` 打开也能正常浏览。

## 页面结构

| 页面 | 文件 | 内容 |
| --- | --- | --- |
| 首页 | `index.html` | 英雄区（Mac + iPhone 样机）、功能拼贴、隐私、Mac 版、用户评价、价格预览、下载区 `#download` |
| 功能介绍 | `features.html` | 记账 / 预算 / 报表 / 账户 / 同步与隐私 / Mac 版六个章节（顶部锚点导航），以及“更多细节” |
| 价格 | `pricing.html` | 按年 / 按月切换的两档方案、逐项功能对比表、家人共享、订阅相关问答、订阅条款说明 |
| 常见问题 | `faq.html` | 5 个分类、18 个问题，可即时搜索；每个问题都有锚点（如 `faq.html#refund`）可直接展开 |
| 博客列表 | `blog/index.html` | 置顶文章 + 文章卡片，附 RSS（`blog/feed.xml`，Atom 格式） |
| 博客文章 | `blog/lime-ledger-3.html`、`blog/local-first.html`、`blog/30-day-habits.html` | 三篇完整文章，含作者、日期、阅读时长、复制链接、继续阅读 |
| 关于我们 | `about.html` | 品牌故事、三条原则、数字、时间线、团队、招聘 |
| 联系我们 | `contact.html` | 各类联系方式 + 留言表单（校验、加载、成功 / 失败反馈），支持 `contact.html?topic=billing` 预选主题 |
| 隐私政策 | `privacy.html` | 11 个章节，桌面端带吸顶目录并高亮当前章节 |
| 404 | `404.html` | 友好的找不到页面，提供返回入口 |

```
.
├── index.html  features.html  pricing.html  faq.html
├── about.html  contact.html  privacy.html  404.html
├── blog/        index.html · 3 篇文章 · feed.xml
├── assets/
│   ├── css/style.css     全站唯一样式表（设计变量 → 基础 → 组件 → 页面 → 样机 → 动效 → 打印）
│   ├── js/theme.js       head 中同步执行：标记 JS 可用、应用已保存的外观，防止深浅色闪烁
│   ├── js/main.js        其余交互（defer）
│   └── img/              图标 SVG、PNG 图标、社交分享图 og-image.png
├── favicon.svg  apple-touch-icon.png  site.webmanifest
├── robots.txt   sitemap.xml
└── tools/                维护工具（不参与页面运行，可不部署）
    ├── inject.py         把公共 head / 页头 / 页脚写入每个页面
    ├── serve.js          本地预览服务器
    └── check-site.js     自动检查脚本
```

## 主要设计决策

**克制的 Apple 风格。** 大号粗体标题、充足留白、白色与浅灰（`#f5f5f7`）交替的分区、圆角卡片、半透明毛玻璃导航栏。全站只有一个强调色——青柠绿（浅色 `#1f7a35`，深色 `#4ad66d`），只用于链接、按钮和少量强调。首页隐私区用一整块黑色制造节奏变化，其余地方保持安静。

**系统字体，不加载网络字体。** 字体栈依次为 SF Pro / 苹方 / 冬青黑 / 微软雅黑 / Noto Sans CJK / 思源黑体，各平台都能拿到本机最好的中文字体，也省掉了几 MB 的中文字体下载。

**产品“截图”全部用 HTML/CSS 绘制。** iPhone、Mac 窗口、预算环、报表、账户列表、小组件都是 DOM 元素而不是图片：矢量清晰、体积极小，并且会随站点切换深浅色，顺便展示了 App 自身的深色模式。样机内部全部使用 `em` 单位，外层用容器查询单位（`cqi`）统一缩放，任何宽度下比例都不变；每个样机带 `role="img"` 和描述性的 `aria-label`，屏幕阅读器读到的是一句话而不是一堆数字。样机里的数字前后一致（本月支出 ¥3,286.40、预算 ¥5,000、各分类占比等）。

**浅色与深色。** 所有颜色都是 CSS 变量，默认跟随系统 `prefers-color-scheme`；页脚有“自动 / 浅色 / 深色”切换，选择保存在 `localStorage`（不可用时退化为仅当前页面生效）。`theme.js` 在 `<head>` 里同步执行，首屏之前就应用好主题，不会闪烁；`theme-color` 也会同步更新。

**中文排版。** 中文标题容易在词中间断行（例如“需要 / 时”），所以标题按意群拆成 `.ph` 片段，只在片段之间换行；再配合 `text-wrap: balance / pretty`。正文行高 1.6，文章 1.85；中文不使用负字距。

**响应式。** 主要断点 734px / 833px / 1068px，内容最大宽度 1180px，侧边距 `clamp(16px, 4vw, 44px)`（390px 时正好 16px）。833px 以下导航收进全屏菜单（焦点限制在菜单内，Esc 关闭并归还焦点）。在 390、768、1024、1440、1920 五种宽度下都没有横向滚动。

**渐进增强。** 没有 JS 时所有内容和导航都完整可见：移动端导航退化为一行可横向滚动的链接，滚动渐显动画不会把内容藏起来，联系页显示邮件替代方案。JS 只负责增强：菜单、主题、计费周期、FAQ 搜索、表单、复制链接、目录高亮。所有动效都遵守“减弱动态效果”设置。

**无障碍。** 跳到主要内容链接、完整的地标结构、每页一个 `h1` 且标题不跳级、`aria-current` 标记当前页、清晰的焦点样式、表格带 `caption` 与 `scope`、勾号图标附带“包含 / 不包含”的读屏文字、所有文字对比度 ≥ 4.5:1（大字 ≥ 3:1）。表单错误使用 `aria-invalid` + `aria-describedby`，汇总提示用 `role="alert"`，提交失败时焦点移到第一个错误字段，成功后移到成功标题。

**联系表单（无后端）。** 前端校验（必填、邮箱格式、内容 10～1000 字、同意隐私政策），失焦即时校验但不打扰空字段；提交时按钮进入加载状态；成功后显示回显邮箱和留言编号的成功面板，可“再写一条”。另有蜂蜜罐字段过滤机器人。默认**只模拟发送**；接入真实服务时，给 `<form id="contact-form">` 加上 `data-endpoint="https://你的接口"`，脚本会以 JSON POST（字段：`name`、`email`、`topic`、`device`、`message`），并根据响应显示成功或失败（失败时提示改用邮件）。

**路径策略。** 普通页面用相对路径，所以可以用 `file://` 打开，也能部署在子目录下。`404.html` 例外：托管平台会在任意 URL 下返回它，所以它的资源和链接都用 `/` 开头的绝对路径——如果站点部署在子路径（如 `example.com/lime/`），需要把 404 页里的 `/` 前缀改成对应路径。

**公共页头页脚。** 没有构建工具，因此每个 HTML 文件都是完整页面。为避免 12 个页面的页头页脚不一致，它们由 `tools/inject.py` 写入 `<!-- inject:head|header|footer -->` 标记之间（可重复运行，并根据页面所在目录自动处理相对路径和当前导航高亮）。修改导航或页脚时编辑脚本里的模板，然后运行 `python3 tools/inject.py`。只改某个页面的正文则直接编辑该 HTML。

**性能与 SEO。** 每页只有 1 个 CSS（68 KB，gzip 后约 15 KB）和 2 个 JS（共 15 KB，gzip 后约 6 KB），没有框架和字体文件；整页未压缩约 90～115 KB。每页都有独立的 `title`、`description`、`canonical` 和 Open Graph 信息，首页带 `SoftwareApplication`、文章带 `BlogPosting` 结构化数据，另有 `sitemap.xml`、`robots.txt`、Atom 订阅和 Web App Manifest。

## 上线前请替换的占位内容

- **域名**：`https://www.limeledger.example` 出现在 canonical、Open Graph、JSON-LD、`sitemap.xml`、`robots.txt`、`blog/feed.xml`，以及 `tools/inject.py` 的 `SITE` 常量中。全局替换后运行一次 `python3 tools/inject.py`。
- **App Store 链接**：首页下载区的 `https://apps.apple.com/cn/app/id6470000001` 为占位 ID。
- **邮箱**：`support@ / business@ / press@ / privacy@ / jobs@limeledger.example`。
- **联系表单接口**：见上文 `data-endpoint`。不接入时，访客的留言不会被发送。
- **虚构文案**：用户数、用户评价、团队成员、时间线、公司信息均为虚构。隐私政策是按产品设定撰写的示例，正式发布前应由法务审阅。
- 如在中国大陆托管，需在页脚补充 ICP 备案号。
- canonical 使用 `.html` 结尾的地址；如果托管平台会把 `/features.html` 重定向到 `/features`，可以把 canonical 和站内链接统一改为无后缀形式。

## 做过的检查

自动检查脚本 `tools/check-site.js`（Playwright + Chromium）最后一次运行结果为**全部通过**，覆盖：

1. **12 个页面 × 5 种宽度（390 / 768 / 1024 / 1440 / 1920）× 浅色 / 深色**，共 120 次加载：无控制台错误、无脚本异常、无资源加载失败、**没有任何对外部域名的请求**、无横向溢出。
2. **文字对比度**：在 390 和 1440 宽度、两种主题下逐个文本节点计算（考虑半透明颜色、祖先透明度和背景叠加），全部达到 WCAG AA。检查中发现“Pro”徽章（4.41:1）和下载按钮小字（3.77:1）不达标，已修正。
3. **结构与基础无障碍**：`lang`、标题、描述、唯一 `h1`、标题层级不跳级、无重复 `id`、图片 `alt`、表单控件都有标签、链接与按钮都有可读名称、ARIA 引用的 `id` 都存在、地标与跳转链接齐全、各页标题不重复。
4. **站内链接**：54 个站内链接、资源与锚点（含 `#download`、`#refund` 等片段）全部可达；4 个外链（Apple 标准最终用户许可协议、Apple 退款申请页、两个 App Store 占位链接）未在线请求。
5. **交互**：首个 Tab 聚焦跳转链接；移动端菜单展开、焦点限制、Esc 关闭并归还焦点；外观切换后刷新仍保持、可切回自动；计费周期切换价格（¥68/年 ↔ ¥8/月）；FAQ 搜索与无结果提示；锚点直接展开问题；`?topic=` 预选主题；空表单提交显示 5 处错误并聚焦第一个；邮箱格式提示；加载状态；成功面板回显邮箱并移动焦点；“再写一条”重置；文章复制链接反馈。
6. **404**：`/does-not-exist` 与多级路径 `/blog/nope/deeper/` 都返回 404 状态码，且样式完整加载。
7. **无 JS 降级**：禁用 JavaScript 后 12 个页面的内容都可见、导航 6 个链接都可用，联系页给出邮件替代方案。

另外做过的人工与辅助检查：

- 逐页截图审阅（桌面 1440 / 1920、平板 768、手机 390，浅色与深色），据此修正了：中文标题词中断行、页脚列表残留圆点、卡片小标题颜色被覆盖、同步示意图连线宽度为 0、白色分区紧跟灰色分区时上边距丢失、Mac 样机列表图标文字变灰、功能页手机样机向上压住页头、表单复选框在 `.field` 内被拉伸成长条、`hidden` 属性被组件的 `display` 覆盖导致表单无法隐藏等问题。
- 用 Python HTML 解析器检查全部页面的标签闭合；`sitemap.xml`、`feed.xml` 可被 XML 解析，`site.webmanifest` 是合法 JSON。
- 兼容性：容器查询单位、`dvh`、`color-mix()` 都写了旧浏览器的回退值；`text-wrap` 属于渐进增强。自动测试只在 Chromium 中进行，Safari 与 Firefox 未在本环境中实测。

重新运行检查：

```bash
node tools/serve.js &
PLAYWRIGHT=/path/to/node_modules/playwright CHROMIUM=/path/to/chromium node tools/check-site.js
```

`PLAYWRIGHT` 和 `CHROMIUM` 可省略（默认使用 `require('playwright')` 及其自带浏览器）；`BASE_URL` 可指向任意已部署的地址。
