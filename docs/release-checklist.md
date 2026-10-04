# v0.1.0 发布检查

- [x] 审查独立分支提交与 diff；不包含用户原有 `.claude/launch.json` 修改。
- [x] 运行 `npm ci && npx playwright install chromium && npm test` 和 Python 回归；核对记录的版本与退出码。
- [x] 在 Windows PowerShell 5.1 和 PowerShell 7 上查看 CI 结果，确认 junction 安装、更新、卸载没有改动源目录。macOS 上的 PowerShell 复制回退测试不能替代此项。
- [ ] 手工核验 Safari、Firefox、VoiceOver；记录未检查项，不把 Chromium 结果外推。
- [ ] 对照截图与演示页面验收浅/深色、输入方式、窄窗口和关键流程。
- [x] 核对参考来源清单及更新报告；需要修改的速查表经过复查。历史 null 抓取时间不等于已刷新。
- [x] 本次维持原自由使用声明，不新增标准许可证，Apple 内容不再授权。正式许可证仍待后续作者选择，见 `license-decision.md`。
- [x] 作者已授权推送发布；仓库无既有 tag，采用首个版本 `v0.1.0`，并发布统一演示。
- [x] 部署授权后已启用 `.github/workflows/deploy-pages.yml`，配置 Pages 为 Actions；保留手动触发。
- [ ] 部署预览核验相对路径、移动/桌面/无障碍入口、浏览器控制台以及隐私资源清单。
- [x] 本次发布授权涵盖合入 main、创建 tag/Release 和启用 Pages；其他仓库设置不变。

静态打包：`bash scripts/prepare-demo.sh /tmp/apple-style-site-NEW`。要求输出目录不存在；只包含演示与 Web 实现，不发布离线 Apple 参考库、测试、安装器或本机配置。该打包步骤是发布准备，使用 CSS/JS 仍无构建步骤。

发布实际运行与仍未验证的手工项目见 `validation.md` 的“发布补验”。未勾选项不表示已经验收。
