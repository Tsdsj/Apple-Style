# Apple-Style 演示

从仓库根目录运行 `python3 -m http.server 8765 --bind 127.0.0.1`，然后打开 [演示首页](http://127.0.0.1:8765/)。首页（根目录 `index.html`）有两个入口，先看 **参考网站**，再看 **组件工作台**：

- 参考网站：`skills/Apple-Style/web/examples/site/`，一个虚构产品的官网与博客，展示网站模式落在真实页面上的样子。源码使用根相对路径（技能教的写法），所以只能作为站点根目录运行；本地检查请见下文。
- [组件工作台](http://127.0.0.1:8765/demo/index.html)：主站源码在本目录，内容包括移动组件、系统颜色样本、语义操作色、字体/同心圆角、拖拽/键盘/click 控件、桌面窗口与无障碍偏好模拟。样式和运行时直接来自 `../skills/Apple-Style/web/`，没有构建步骤。工作台底部链接 `web/demo.html` 和 `web/demo-desktop.html` 两个最小示例，并提供回到演示首页的链接。

默认中文，可切换英文；首页与工作台共用同一个语言选择。

组件状态由运行时维护，监听 `change`；不要在 click 中再次修改相同值。模拟偏好不是操作系统/辅助技术测试。交付清单可记录未检查、已检查通过/失败、不适用；进度只是人工记录，不能当自动验收。

真实验证范围、命令和剩余限制见 [validation](../docs/validation.md)。Playwright 保持后台运行，在 `test-results/` 保存 390/1440px 示例截图，并检查六个关键宽度的溢出、键盘行为、对比度和资源释放。Safari、Firefox、VoiceOver 未执行的项目保持未验证。

截图为固定随机种子的可重复示例，尚无跨操作系统的整页像素黄金基线。

## 打包与部署

`scripts/prepare-demo.sh NEW_DIRECTORY` 生成可部署的站点目录（不部署、不改设置）。输出结构：

- `index.html`：演示首页，即仓库根目录 `index.html` 原样复制。它的链接都相对于自身位置，所以在仓库和子路径下都成立。
- `demo/`：组件工作台，路径与仓库相同。
- `skills/Apple-Style/web/examples/site/`：参考网站。仓库副本保持根相对路径；打包副本由 `scripts/relativize-site.py` 改写为相对于每个文件的路径，所以 `https://user.github.io/Apple-Style/skills/Apple-Style/web/examples/site/` 这类子路径下也能加载。

改写规则（只作用于打包副本的 `*.html`）：

- 改写 `href`、`src`、`srcset`、`action`、`poster`、`formaction`、`xlink:href`，以及 `meta` 的 `content`（刷新地址或以 `/` 开头的路径）。
- 按文件所在目录计算层级：`/css/base.css` 在根目录为 `css/base.css`，在 `blog/` 为 `../css/base.css`，在 `blog/tags/` 为 `../../css/base.css`。`/` 变为 `index.html`（或上一级的 `../index.html`），`/blog/` 变为 `blog/index.html`。查询串和片段保留。
- 不改：绝对地址（`https://`）、协议相对地址（`//cdn…`）、只有片段的地址（`#…`）、`mailto:`/`tel:`/`data:`，`<script>`/`<style>` 正文和注释。`og:image` 和 `canonical` 本来就是绝对地址，保持不变。
- 遇到 `<base>` 会拒绝打包；改写后仍残留根相对地址时打包失败，不会产生半成品。

已知限制：

- **404 页不能在任意深度生效。** GitHub Pages 只在站点根目录使用 `404.html`，而参考站的 404 页使用相对路径，只在它自己的目录层级正确。打包根目录没有 404 页，未知地址由 Pages 默认页面返回。参考站的 `404.html` 作为文件存在（`skills/Apple-Style/web/examples/site/404.html`），可直接访问，但不会自动接管未知地址。如需站点级 404，应把参考站放到站点根目录，那时可以使用原来的根相对路径。
- **`robots.txt`、`sitemap.xml`、canonical 和 og:image 仍指向 `https://example.com`。** 这是示例站点，部署前要替换为真实域名。打包时没有改它们。
- **表单仍没有后端。** `action` 改写为相对路径后仍指向 `api/contact` 和 `api/subscribe`，两者都不存在；提交会得到错误提示，这与参考站文档中的说明一致。
- **本地检查参考站要在它自己的目录启动服务**，例如 `python3 -m http.server 8766 --directory skills/Apple-Style/web/examples/site`。在仓库根目录直接打开时，根相对路径指向仓库根，样式会缺失。也可以先打包，再从打包目录启动。

Pages 根地址目前仍是旧的跳转页；下一次部署后，`https://tsdsj.github.io/Apple-Style/` 打开演示首页。本次已按作者授权公开部署到 https://tsdsj.github.io/Apple-Style/ 。

## English

Serve the repository root and open `/`, the demo home. It has two entries: the reference website (`skills/Apple-Style/web/examples/site/`, a fictional company site and blog) and the component workbench (`/demo/index.html`). Both use the same CSS and JS from the skill, with no build step. The language choice is shared between the home page and the workbench.

`scripts/prepare-demo.sh NEW_DIRECTORY` packages the home page at the package root, the workbench under `demo/`, and the reference site under `skills/Apple-Style/web/examples/site/`. In the package, the reference site's root-relative URLs are rewritten to paths relative to each file by `scripts/relativize-site.py`, so it also loads under a Pages sub-path. The repository copy keeps the root-relative paths the skill teaches.

Known limits: the reference site's `404.html` works only at its own directory level, because Pages serves a 404 page only from the site root; `robots.txt`, `sitemap.xml`, canonical and `og:image` still point to `example.com`; the contact and subscribe forms have no backend. To check the reference site locally, serve its directory as the root (`--directory skills/Apple-Style/web/examples/site`).

Controls emit `change`; do not double-toggle in click handlers. Preference simulations and manually recorded checklist states do not establish assistive-technology validation. See the validation record for actual evidence. No public deployment is enabled by this directory.
