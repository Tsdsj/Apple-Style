# 可靠性修复验证记录

执行日期：2026-10-04（Asia/Shanghai）。基线 `6b9a4aa`，分支 `codex/reliability-hardening`。原有 `.claude/launch.json` 修改保留且不纳入本次提交。仓库未发现 AGENTS.md、CodeStable 或 harness 骨架；遵循本次用户给出的工程约束。

环境：macOS 27.0.1 arm64、Node 24.18.0、Python 3.14.6、Playwright 1.58.2、Chromium 145.0.7632.6。PowerShell 7.6.6 从官方发布归档读取，在独立临时目录中校验官方 SHA-256 后运行，没有全局安装。

## 复现与修复证据

| 问题 | 修复前实际观察 | 修复与对应文件 |
|---|---|---|
| 安装归属 | 自建目录被卸载；复制覆盖修改；源目标相同时源文件消失 | `install.sh` / `install.ps1`：外置凭据、指纹、保留未知/修改、路径冲突拒绝、暂存与锁 |
| 不完整源包 | Shell 会先安装第一个技能再失败 | 两端在任何技能写入前校验四个源技能 |
| 分段键盘 | ArrowRight 未移动焦点，未跳过禁用项 | `liquid-glass.js`：radio/tabs、roving tabindex、焦点/ARIA/面板、动态禁用修复 |
| click/取消 | `element.click()` 不激活；旧 pointercancel 会执行结束提交 | 标准 click 与拖拽分流，取消恢复，抑制拖拽后重复 click；原生与自定义 switch 路径 |
| 生命周期/参数 | destroy 缺失；scale:7 实际生成30；重复 Observer 无清理 | 组件资源归属与清理、根作用域、重复 init、动态移除/重挂载、父级初始化下销毁、持久化 attach 配置 |
| 默认对比度 | 白字系统蓝浅色 **3.5201:1**、深色 **3.2337:1** | 系统色样本保留；操作色 #0066cc/#006bd6，白字分别 **5.5666:1 / 5.1545:1**；填充按钮、prominent glass 与选中行检查通过 |
| 示例 | 320/390px 横向溢出；菜单项为不可聚焦 div；弹窗焦点未管理 | CSS 窄屏换行/盒模型、示例 menu/button 语义、dialog focus/inert/Escape、统一演示链接 |
| 参考维护 | 空 DocC JSON 被渲染为无效空文档；旧脚本直接覆盖、遗漏分类 | manifest 全分类、严格解析、批量暂存/回滚、自动 INDEX、来源时间/哈希和更新报告 |

## 实际执行

```bash
npm install --ignore-scripts
npx playwright install chromium
npx playwright test --reporter=line
APPLE_STYLE_PWSH=/tmp/apple-style-pwsh/runtime/pwsh \
  python3 -m unittest discover -s tests -p 'test_*.py' -v
bash -n install.sh skills/Apple-Style/scripts/update-reference.sh scripts/prepare-demo.sh
node --check skills/Apple-Style/web/liquid-glass.js
node --check demo/demo.js
git diff --check
```

- **Chromium：41 个通过**，后台 headless 运行。[日志](evidence/chromium-tests.txt)。涵盖键盘、程序 click、实际鼠标 click/拖拽、Pointer 取消、禁用项、焦点/ARIA、手动 tabs 与面板、卸载/移出作用域/重挂载、重复 init、嵌套作用域销毁、参数/偏好、对比度和布局。
- **Python：28 个通过**，其中 Shell 11、PowerShell 7、参考更新 8、交付一致性 2。[日志](evidence/python-tests.txt)。PowerShell 在本机检验了复制、链接不可用时的复制回退、归属保护、重复安装/更新/卸载、冲突和无 Git 分支/标签下载夹具。
- Shell/JS 语法与 `git diff --check` 通过。
- 资源计数用例：重复 init 的监听数相同；destroy 后运行时监听、Observer 观察目标、待执行帧/定时器、生成节点、滤镜及 JS 动画为零。该用例不等于长时堆内存压力测试。
- 三个实际示例均在 **320 / 390 / 768 / 1024 / 1440 / 2000px** 检查文档横向溢出和浏览器错误。390/1440px 留存截图；另有 ARIA snapshot 和重复 init 前后控件像素一致性检查。不是跨系统整页截图黄金基线。

[移动入口截图](evidence/showcase-390.png) · [桌面截图](evidence/desktop-1440.png)。已检查这两张实际截图的布局；全站每种外观的逐像素人工验收尚未进行。

### 参考库

先运行本地夹具：HTTP 404、网络/超时、无效 JSON、空文档、HTML/转录解析失败、部分成功不提交、提交异常回滚和路径拒绝。

随后有限在线执行：

```bash
skills/Apple-Style/scripts/update-reference.sh \
  --only hig/layout.md \
  --only liquid-glass/api/swiftui-glass-interactive----.md \
  --only liquid-glass/adopting-liquid-glass.md \
  --only design-site/resources.md \
  --only wwdc25/219-meet-liquid-glass.md \
  --report docs/reference-online-report.json
```

**5 个成功，0 失败**，见 [逐项报告](reference-online-report.json)。报告的 modified 相对于该次更新前的本地快照，不一定等于相对 main 的 Git diff。208 个来源都有 URL 和当前内容哈希；全库哈希/INDEX 一致性通过。只有本次 5 个源有精确抓取时间，其余 203 个为历史未知时间，未宣称全量重新联网抓取。

已根据抽样来源复核本次涉及的平台/窗口、材质和 API 描述。更新报告列出的其他速查主题不是本次全量官方资料复审的通过证明。

### 发布准备

`bash scripts/prepare-demo.sh NEW_DIRECTORY` 已实际运行并由测试确认：Web 资产字节一致，已有输出目录被拒绝，参考库和 `.claude` 不进入产物。Pages 模板位于 `docs/deploy-pages.yml.example`，不在活动工作流目录。只准备文件，没有发布。

## 未验证、不适用与必要决策

| 项目 | 状态 | 说明 |
|---|---|---|
| Windows 原生 junction / PowerShell 5.1 / 7 | 已检查，通过 | 发布补验已在 Windows runner 实际运行，两套 shell 各 8 项，断言原生 junction 安装 |
| Linux/macOS CI、GitHub Actions | 已检查，通过 | 发布补验的四个矩阵任务全部成功，见下方链接 |
| Safari、Firefox、VoiceOver/NVDA | 未验证 | 没有虚构跨浏览器或辅助技术验收 |
| React/Vue 实际应用 | 未验证 | 提供 mount/unmount 示例；浏览器回归验证了对应生命周期 API，没有运行框架应用 |
| 长时内存、低端设备、性能提升 | 未验证 | 没有匹配基线的性能测量；无性能提升声明 |
| 模型启用/关闭 Skill 比较 | 未运行 | 五个固定任务、配对方法和结果字段已准备，见 `evals/` |
| 全站所有文本/自定义色对比度 | 未全量验证 | 已测默认白字操作面/选中行；任意背景、品牌覆盖和辅助文本仍需产品级检查 |
| 发布站点、Release、合并 main | 已授权 | 本轮按作者要求发布 v0.1.0；发布记录见仓库 Releases，部署记录见 Actions |
| 正式许可证 | 待作者决定 | 原自由使用声明保留；MIT/BSD-3-Clause/Apache-2.0 等选项见 `license-decision.md`，未给 Apple 内容新增许可 |
| 原生 Apple App 自动合规 | 不适用 | 本次产物是 Web 近似实现和技能资料，不是原生应用认证 |

## 发布补验

作者随后授权“提交且推送发布”。[发布前 CI](https://github.com/Tsdsj/Apple-Style/actions/runs/37202831652) 对提交 `87f4fc5` 的四个任务全部通过，原始结构化记录见 [release-ci.json](evidence/release-ci.json)。

- Linux/macOS：Python 29 项与 Chromium 41 项；包含安装、参考、打包一致性和浏览器回归。
- Windows PowerShell 5.1 / PowerShell 7：各 8 个安装器用例，明确断言 receipt 为 link，实际覆盖原生 junction。
- 首轮 Windows 5.1 无法自动加载 Get-FileHash，现使用 .NET 流式 SHA-256，保留同样的指纹格式，并增加缺少该 cmdlet 的夹具。
- macOS runner 默认 `prefers-reduced-transparency: reduce` 为 true；旧正向折射测试因此看不到滤镜。现记录宿主偏好并为正向用例设定明确媒体基线，独立偏好用例仍验证减少透明度/增强对比度下禁用滤镜。
- 在真实 CI 失败后修复并重跑，没有把原本未运行的 Windows 检查补写为历史通过。

Safari、Firefox、VoiceOver/NVDA、框架应用和性能/模型对比仍未验证。正式许可证维持原声明，不新增授权。版本及在线演示的最终公开记录：[v0.1.0](https://github.com/Tsdsj/Apple-Style/releases/tag/v0.1.0)、[演示站](https://tsdsj.github.io/Apple-Style/)、[部署工作流](https://github.com/Tsdsj/Apple-Style/actions/workflows/deploy-pages.yml)。

## 审计缺陷修复（未发布）

执行日期：2026-10-17。环境：Linux 容器、Node 22.22.0、Python 3.13.16、Playwright 1.58.2、Chromium 141.0.7390.37（通过 `launchOptions.executablePath` 使用预装浏览器）。对应 [实用性审计](audit/2026-10-16-practicality-audit.md) §2.1–2.7。

- 修复前，基线测试在本环境 **40 通过 / 1 失败**（`layout /demo/index.html at 320`，搜索框按本机字体度量溢出 6px；CI 机器字体未触发）。
- 新增 `tests/browser/regressions.spec.js` 共 14 项。先在未修复代码上运行：**12 失败、2 通过**。通过的两项是预期的：深色外观下的 vibrant 用例是对照组；级联层用例验证的是文档化的导入方式本就可行，作为守护测试保留。
- 修复后：**Chromium 55 通过**（原 41 项 + 新 14 项，含原先失败的 320px 布局），**Python 29 通过（PowerShell 8 项因容器无 pwsh 跳过）**；`node --check`、`bash -n scripts/prepare-demo.sh` 与 `git diff --check` 通过。
- Node 直接验证：`require('liquid-glass.js')` 与 `import('liquid-glass.mjs')` 返回空操作 API；在 `"type": "module"` 的包中从 `.mjs` 导入同样可用（`.js` 在该包中不能作为默认导入，这是 `.mjs` 入口存在的原因）。
- 强制颜色下的开关、分段、滑块、分组选中与填充按钮另做了截图人工检查。

范围限制不变：只验证了 Chromium 的强制颜色模拟与 RTL；真实 Windows 对比度主题、Safari、Firefox、VoiceOver/NVDA 仍未验证。快捷键的平台判断在测试中通过覆盖 `navigator.platform` / `userAgentData` 模拟，未在真实 macOS Safari 上按键验证。

## 审计 §2.8–2.10 修复（未发布）

执行日期：2026-10-17，环境同上节。

- 新增 6 项浏览器回归测试（嵌套玻璃、采样节流、贴图复用、DOM 变化扫描、materialize 滤镜、sheet 遮罩），先在未修复代码上运行：**6 项全部失败**；修复后全部通过。新增 5 项参考脚本单元测试（转录年份、`wwdcNN` 目录、定向复核、`--retire`、`moved_to`、表格与隐藏元素渲染），单元测试不联网。
- 修复后：**Chromium 61 通过**，**Python 35 通过（PowerShell 8 项跳过）**，`node --check` 与 `git diff --check` 通过。
- 性能探针（审计时的同一脚本、同一 headless Chromium，只说明量级）：20 个固定玻璃按钮滚动 60 次，`elementsFromPoint` **3600 → 1080 次**、累计 **383 → 44 ms**；30 个玻璃按钮来回滚动两次，位移贴图生成 **113 → 10 张**（10 为不同文字宽度的数量）。
- 参考库全量刷新：首次运行因 2 个来源 404 整批中止、未写入任何文件（事务行为符合预期）。确认 Apple 将 In-App Purchase 改名为 Apple In-App Purchase（旧地址 301）、设计入门页迁到 `/design/get-started/` 后，更新该条目地址并 `--retire hig/in-app-purchase.md` 重跑：**新增 1、下线 1、更新 28、未变 179、失败 0**，208 个来源的 `fetched_at` 均为 2026-10-17。
- 复核：更新报告指向 `accessibility-and-inclusion.md`（privacy、right-to-left）、`components-quickref.md`（icons、sf-symbols）、`web-implementation.md`（right-to-left）。对应页面的变化为 ATT 同意界面细则、文档链接更新、删除文档图标模板说明；速查表规则不受影响，未修改。
