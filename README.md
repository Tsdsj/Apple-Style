# Apple-Style — 将苹果设计系统与 Liquid Glass 打造成 Agent 技能

[English](#english) | 简体中文

四个互相配合的技能包，面向 **Claude Code** 和 **Codex**，复刻了 <https://developer.apple.com/design/> 上的设计指南（人机界面指南 HIG、Liquid Glass、WWDC25 设计相关分享），并附带一份可运行的 Liquid Glass 材质的 Web 实现。

| 技能 | 作用 |
|---|---|
| `skills/Apple-Style` | 入口技能：工作流程、明确的设计规则、8 份带精确数值的速查表、`web/apple-style.css` + `web/liquid-glass.js` + `web/demo.html`、查询/更新脚本 |
| `skills/Apple-Style-Liquid-Glass` | 专注实现 Liquid Glass 材质：图层结构、Web 实现配方与调优、SwiftUI/UIKit/AppKit 的 API 用法 |
| `skills/Apple-Style-HIG` | 离线参考库：172 篇 HIG 页面、Liquid Glass 开发者文档与 API 页面、9 份 WWDC25 文字稿、更新说明 / 资源列表 |
| `skills/Apple-Style-Review` | HIG 合规性审查清单与报告模板 |

## 安装

```bash
./install.sh            # 软链接四个技能到 ~/.claude/skills, ~/.codex/skills, ~/.agents/skills
./install.sh --copy     # 使用复制代替软链接
./install.sh --project  # 安装到当前项目目录下的 ./.claude/skills 和 ./.codex/skills
```

安装完成后，在 Claude Code 中输入 `/Apple-Style`（或直接描述任务，技能会根据描述自动触发）。在 Codex 中，技能会从 `~/.codex/skills` / `~/.agents/skills` 被发现。

## Web 演示

```bash
python3 -m http.server 8765 --directory skills/Apple-Style/web   # 打开 http://localhost:8765/demo.html
```

Lensing（基于 SVG 位移贴图的 `backdrop-filter` 效果）在基于 Chromium 的浏览器中效果最佳；Safari 与 Firefox 会降级为模糊 + 高光效果。

## 来源与更新

参考文本于 2026-09-14 从苹果公开的 DocC JSON 接口（`developer.apple.com/tutorials/data/...`）及 WWDC 视频页面渲染生成。可重新运行 `skills/Apple-Style/scripts/update-reference.sh` 来刷新内容。文本版权归 Apple Inc. 所有，仅供个人 / Agent 参考使用。未内置 SF 字体（苹果许可限制）——CSS 依赖系统字体。

## 目录结构

```
Apple-Style/
  README.md  install.sh
  skills/
    Apple-Style/            SKILL.md  cheatsheets/  web/  scripts/
    Apple-Style-Liquid-Glass/ SKILL.md
    Apple-Style-HIG/        SKILL.md  reference/{INDEX.md, hig/, liquid-glass/, wwdc25/, design-site/}
    Apple-Style-Review/     SKILL.md
```

---

<a id="english"></a>

## English

# Apple-Style — Apple design system + Liquid Glass as agent skills

Four connected skills for **Claude Code** and **Codex** that reproduce the guidance on <https://developer.apple.com/design/> (Human Interface Guidelines, Liquid Glass, WWDC25 design sessions) and ship a working web implementation of the Liquid Glass material.

| Skill | Purpose |
|---|---|
| `skills/Apple-Style` | Entry point: workflow, decisive rules, 8 cheatsheets with exact specs, `web/apple-style.css` + `web/liquid-glass.js` + `web/demo.html`, lookup/update scripts |
| `skills/Apple-Style-Liquid-Glass` | Implementing the material: layer anatomy, web recipe and tuning, SwiftUI/UIKit/AppKit API recipe |
| `skills/Apple-Style-HIG` | Offline reference library: 172 HIG pages, Liquid Glass developer docs + API pages, 9 WWDC25 transcripts, What's New / Resources |
| `skills/Apple-Style-Review` | Audit checklist and report template for HIG compliance |

## Install
```bash
./install.sh            # symlinks the four skills into ~/.claude/skills, ~/.codex/skills, ~/.agents/skills
./install.sh --copy     # copy instead of symlink
./install.sh --project  # install into ./.claude/skills and ./.codex/skills of the current project
```
Then in Claude Code type `/Apple-Style` (or just describe the task — the descriptions trigger automatically). In Codex the skills are discovered from `~/.codex/skills` / `~/.agents/skills`.

## Web demo
```bash
python3 -m http.server 8765 --directory skills/Apple-Style/web   # open http://localhost:8765/demo.html
```
Lensing (SVG displacement `backdrop-filter`) renders in Chromium-based browsers; Safari and Firefox get blur + highlights.

## Provenance & refresh
Reference text was rendered on 2026-09-14 from Apple's public DocC JSON endpoints (`developer.apple.com/tutorials/data/...`) and WWDC video pages. Re-run `skills/Apple-Style/scripts/update-reference.sh` to refresh. Text © Apple Inc.; included for personal/agent reference. SF fonts are not bundled (Apple license) — the CSS relies on the system font.

## Layout
```
Apple-Style/
  README.md  install.sh
  skills/
    Apple-Style/            SKILL.md  cheatsheets/  web/  scripts/
    Apple-Style-Liquid-Glass/ SKILL.md
    Apple-Style-HIG/        SKILL.md  reference/{INDEX.md, hig/, liquid-glass/, wwdc25/, design-site/}
    Apple-Style-Review/     SKILL.md
```
