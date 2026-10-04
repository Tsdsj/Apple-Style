# Apple-Style

Apple HIG 与 Liquid Glass 的四个 Agent 技能，以及可直接引入的 Web CSS / JavaScript。**Web 使用无运行时依赖、无构建步骤**；Node、Playwright 和 Python 仅用于维护与回归验证。

[English summary](#english) · [在线演示](https://tsdsj.github.io/Apple-Style/) · [演示源码](demo/index.html) · [验证记录](docs/validation.md) · [变更说明](CHANGELOG.md)

## 安装

建议先检出并审查代码，再安装：

```bash
git clone https://github.com/Tsdsj/Apple-Style.git
cd Apple-Style
./install.sh
```

```powershell
git clone https://github.com/Tsdsj/Apple-Style.git
cd Apple-Style
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

远程一行安装仍支持，执行的是所请求地址返回的脚本；需要固定版本时使用经审查的 tag/commit 脚本地址：

```bash
curl -fsSL https://raw.githubusercontent.com/Tsdsj/Apple-Style/main/install.sh | bash
```

```powershell
irm https://raw.githubusercontent.com/Tsdsj/Apple-Style/main/install.ps1 | iex
```

| 用途 | macOS / Linux | PowerShell |
|---|---|---|
| 链接（默认） | `--link` | `-Link`（Windows junction，不可用时明确回退复制） |
| 复制 | `--copy` | `-Copy` |
| 当前项目 | `--project` | `-Project` |
| 指定目标 | `--to "DIR"`，可重复 | `-To "DIR1", "DIR2"` |
| 创建所有 Agent 目录 | `--all` | `-All` |
| 使用本地源 | `--dir "CHECKOUT"` | `-Dir "CHECKOUT"` |
| 更新远程缓存 | `--update` | `-Update` |
| 下载分支或标签 | `--ref REF` | `-Ref REF` |
| 卸载 | `--uninstall` | `-Uninstall` |
| 帮助 / 静默 | `--help` / `--quiet` | `-Help` / `-Quiet` |

默认选择已存在的 `~/.claude`、`~/.codex`、`~/.agents` 下的 skills 目录；一个都没有时提示并使用 `~/.claude/skills`。远程缓存位于 `~/.local/share/apple-style`（遵循 XDG_DATA_HOME），Windows 为 `%LOCALAPPDATA%\apple-style`。

环境：Bash 3.2+、`shasum` 或 `sha256sum`；远程需要 Git，或 curl + tar。PowerShell 5.1+/7，Git 可选。无 Git 时使用通用 archive endpoint 支持分支和标签；本地夹具验证了两种引用与失败保留，不代表所有远程引用已在线验证。路径含空格受支持；Shell 路径/引用不支持换行。

`--ref` 作用于远程下载；在克隆中直接运行默认使用该克隆。`--update` 在未指定 `--dir` 时刷新受管理的远程缓存。显式 `--dir` 始终使用给定源：本地源码更新由你执行 `git pull` 或切换引用，再重新运行复制安装；链接会直接看到源变化。

### 安装保护与旧版本迁移

- 每个目标目录的 `.apple-style-install/` 保存外置安装记录。复制记录包含来源和内容指纹，链接记录包含确切链接目标。目录名称或 `SKILL.md` 本身不证明归属。
- 安装、更新和卸载只替换/删除记录匹配且未修改的安装。未知归属、用户修改、缺失/损坏记录和外来链接会保留并提示；出现保留项退出码为 **2**，其他错误为 **1**，完整成功为 **0**。
- 替换先准备暂存副本；移动失败恢复原内容。安装按目标加锁；中断后若留下锁/暂存目录，先检查和备份，不要直接删除。来源与目标重叠（包括解析后的路径别名）会被拒绝。
- 卸载链接仅移除链接，不删除源检出。复制安装的新增/修改文件会阻止整个技能目录被删除。记录用于防误删，不是防御具有同一用户权限的恶意篡改的安全边界。
- **旧安装没有可靠记录时一律不自动认领。** 先检查、备份，再由你把旧目录/链接移出目标位置，重新安装到空位置；合并个人修改前保留备份。旧缓存同理，或用 `--dir` 指向明确的检出。
- 复制模式不提供强制覆盖未知目录的开关。PowerShell 复制源含嵌套链接时拒绝复制，避免不同版本的递归差异；可选择链接模式。

## 技能与规则

| 技能 | 内容 |
|---|---|
| [Apple-Style](skills/Apple-Style/SKILL.md) | 组成、工作流程、语义颜色、Web 入口 |
| [Apple-Style-HIG](skills/Apple-Style-HIG/SKILL.md) | 离线参考和来源检索 |
| [Apple-Style-Liquid-Glass](skills/Apple-Style-Liquid-Glass/SKILL.md) | 材质实现和参数调节 |
| [Apple-Style-Review](skills/Apple-Style-Review/SKILL.md) | 有证据的只读审查与修复建议 |

分别判断**目标平台、应用类型、输入方式、可用容器空间**。1366px 的 iPad 不是 Mac，700px 的 Mac 窗口也不是 iPhone；普通网页无需模拟原生窗口。768/1024/1280px 是本项目布局默认值。`data-platform="macos"` 是显式密度选择，`.as-window`、侧栏、检查器按产品需要选用。

[规则强度与证据](skills/Apple-Style/cheatsheets/rules-and-evidence.md) 区分官方要求、官方建议、项目默认和视觉经验。Review 用“已检查（通过/失败）／未检查／不适用”，不能把读完文字清单当作验证通过。固定的 Skill 启用/关闭比较任务见 [evals](evals/README.md)；当前尚未执行模型对比。

## Web 使用与生命周期

复制 `skills/Apple-Style/web/apple-style.css` 和 `liquid-glass.js`，直接引入：

```html
<link rel="stylesheet" href="apple-style.css">
<main id="app">
  <button class="as-glass as-glass-interactive as-button">普通操作</button>
  <button class="as-button as-button-filled">保存</button>
  <div class="as-segmented" role="radiogroup" aria-label="地图样式">
    <button class="as-segment is-selected" role="radio" aria-checked="true">地图</button>
    <button class="as-segment" role="radio" aria-checked="false">公交</button>
  </div>
  <button class="as-toggle" role="switch" aria-checked="false" aria-label="Wi-Fi">
    <span class="as-knob"></span>
  </button>
</main>
<script src="liquid-glass.js"></script>
<script>
  const app = document.querySelector('#app');
  const runtime = LiquidGlass.init(app);
  // 在组件或路由卸载前：runtime.destroy(); 或 LiquidGlass.destroy(app);
</script>
```

- `init(root = document)` 包含 root 自身，重复调用不会重复绑定；只自动初始化作用域内新增节点。移除节点后异步清理；移除整个 root 后，重新挂载需再次 `init(root)`。
- `destroy(root = document)` 释放该作用域的 Observer、监听、定时器、动画帧、JS 动画和生成的滤镜/控件节点。`detach(el)` 清理单组件/子树；显式卸载前调用清理最确定。父级即使已初始化，也不会立即重新绑定已销毁子树；再次 `init(root)` 才恢复该组件。
- `attach(el, { scale: 12, rim: 14, chroma: false, lens: true, adapt: true })` 只处理一块玻璃。重复 attach 合并显式参数，并在 resize、外观变化及滤镜重新生成时保留配置；`scale: 0` 有效。
- `refresh()` 刷新滤镜与背景采样；`morph` / `materialize` 返回 Promise，销毁期间取消不会造成未处理的 rejection。直接操作原有 helper 的 API 仍保留。
- `radiogroup` 选择值；`tablist` 切换内容，作者必须提供每个 tab 的 `aria-controls` 与对应 panel。默认箭头同步焦点和选择；`data-activation="manual"` 的 tabs 用 Enter/Space 激活。禁用项跳过，click/键盘/拖拽均可用，取消不提交。
- 控件维护 DOM 状态并发出冒泡 `change`；不要在 click 中再次切换同一状态。React/Vue 请在 mount 后 init、unmount 前 destroy；[完整示例](skills/Apple-Style/cheatsheets/web-implementation.md#runtime-lifecycle-and-frameworks)。

系统蓝色样本 `--as-blue` 保留；普通白字操作面使用 `--as-action-bg` / `--as-action-fg`，默认浅深色均满足 4.5:1。自定义 tint、透明度、图片背景和辅助文字仍应检查实际组合。增强对比度、降低透明度、减弱动态效果是额外支持，不是默认可读性的替代。

## 演示与兼容范围

```bash
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/demo/index.html
```

统一入口保留移动组件、同心圆角和无障碍模拟，并链接 [桌面窗口](skills/Apple-Style/web/demo-desktop.html) 与 [最小组件示例](skills/Apple-Style/web/demo.html)。示例共用本体 CSS/JS。检查清单只记录人工检查状态，不自动证明质量。

本次实际浏览器验证为 Chromium，详见 [验证记录](docs/validation.md)。SVG backdrop lensing 使用 Chromium 启发式检测，**不等于逐浏览器的渲染能力证明**；其他引擎走 CSS blur/highlight 路径。Safari、Firefox、VoiceOver 目前未验证。现代 CSS（如 `light-dark()`、`color-mix()`）、Observer 与 Pointer Events 是使用前提，不承诺旧浏览器完整兼容。

这是 Web 近似实现，不是 Apple 原生渲染器。没有性能提升、低端机帧率或长期稳定性测试结论。减少滤镜可用 `data-perf="lite"`；自动色散预算为 8，显式 `chroma: true` 可覆盖。`.as-window` 的窄窗口堆叠保留平台属性和内容。

## 可重复验证

```bash
npm ci
npx playwright install chromium
npm test
python3 -m unittest discover -s tests -p 'test_*.py' -v
git diff --check
```

PowerShell 用例自动发现 `pwsh`/`powershell`；也可通过 `APPLE_STYLE_PWSH=/absolute/path/pwsh` 指定。缺少运行时会明确 skip。CI 覆盖 Linux/macOS Chromium，以及 Windows PowerShell 5.1/7 安装器。实际运行链接与结果见 [发布验证记录](docs/validation.md#发布补验)。

覆盖安装归属/修改/更新/卸载、分支/标签下载夹具，浏览器键盘/click/拖拽/取消/焦点/ARIA，资源计数/卸载/重挂载/配置，浅深色对比度、偏好与三个示例的 320/390/768/1024/1440/2000px 布局。保存示例截图，另用 ARIA snapshot、尺寸/溢出断言和重复 init 的控件像素一致性作可重复检查；不宣称已有跨平台全页面像素黄金基线。

## 参考库维护

[INDEX](skills/Apple-Style-HIG/reference/INDEX.md) 由脚本生成；[sources.json](skills/Apple-Style-HIG/reference/sources.json) 记录 208 个现有来源的规范 URL、抓取入口、抓取时间与 SHA-256。旧内容的准确时间未知，明确为 null；不能补造时间。

```bash
skills/Apple-Style/scripts/update-reference.sh --index-only
skills/Apple-Style/scripts/update-reference.sh --only hig/layout.md --report /tmp/reference-check.json
# 全量刷新（可能耗时；覆盖所有分类，发现新增 HIG 链接）：
skills/Apple-Style/scripts/update-reference.sh --report /tmp/reference-update.json
```

仅需 Python 3 标准库。下载/解析先在暂存中完成，任一失败则整批不写入有效参考；提交失败恢复旧目录。报告区分新增、修改、未变和失败，并列出待复核速查表。更新参考不等于自动证明速查表仍正确。网络故障、HTTP 错误、无效 JSON、解析失败及回滚先由本地夹具覆盖，在线验证限制为少量来源。

## 发布准备与许可

[CHANGELOG](CHANGELOG.md)、[发布检查项](docs/release-checklist.md)、[Pages 部署工作流](.github/workflows/deploy-pages.yml) 已启用为手动触发，模板仍保留作参考。`scripts/prepare-demo.sh NEW_DIRECTORY` 只打包演示和 Web 资产，排除 Apple 离线参考和本机文件。本次按作者授权发布 `v0.1.0`，演示站通过 Actions 部署。后续部署使用手动触发；正式许可证保持原有声明。

Apple 参考文本版权归 Apple Inc.，保留来源记录；未捆绑 SF 字体与 SF Symbols。原项目声明“本仓库自身的代码（CSS / JS / 脚本 / 速查表写作）可自由使用”保持不变。当前没有标准 LICENSE，本次不新增授权范围。正式许可证由作者选择，见 [许可证决策](docs/license-decision.md)。

<a id="english"></a>

## English

Four Apple design skills plus dependency-free, build-free CSS/JS. Install from a reviewed checkout with `./install.sh` or `install.ps1`. Install receipts protect unowned or modified directories; legacy installations are never silently adopted. Exit 2 means content was preserved and needs review. Copy updates and uninstall require a matching fingerprint; links are only unlinked, never recursively removed through their target.

Choose platform, app type, input methods and container size independently. A wide iPad is not a Mac, and a desktop web page does not require a native window. Rules distinguish official constraints, recommendations, project defaults and visual heuristics.

Call `LiquidGlass.init(root)` after mount and `destroy(root)` before unmount. Initialization is idempotent and scoped; single surfaces support `attach(el, options)` / `detach(el)`. Options survive resize and appearance regeneration. Radio groups select values; tabs require linked panels. Keyboard, click and drag are supported without duplicate activation; cancellation does not commit. Default white-text actions use accessible semantic colors while retaining Apple system swatches.

Run `npm ci`, `npx playwright install chromium`, `npm test`, and `python3 -m unittest discover -s tests -p 'test_*.py' -v`. See [validation](docs/validation.md) for executed checks and explicit gaps. Windows-native junctions are covered by the Windows CI jobs, separately from macOS copy fallback tests. Safari, Firefox, VoiceOver and model on/off comparisons remain unverified. See the linked release verification record for actual CI and deployment runs.

Reference refreshes use a source manifest, hashes, timestamps, local fixtures and a transactional commit. Missing legacy fetch times remain unknown. Apple reference content is not relicensed. The existing free-use statement for original project code is retained; choosing a standard LICENSE remains the author's decision.
