# 发布检查（尚未发布）

- [ ] 审查独立分支提交与 diff；不包含用户原有 `.claude/launch.json` 修改。
- [ ] 运行 `npm ci && npx playwright install chromium && npm test` 和 Python 回归；核对记录的版本与退出码。
- [ ] 在 Windows PowerShell 5.1 和 PowerShell 7 上查看 CI 结果，确认 junction 安装、更新、卸载没有改动源目录。macOS 上的 PowerShell 复制回退测试不能替代此项。
- [ ] 手工核验 Safari、Firefox、VoiceOver；记录未检查项，不把 Chromium 结果外推。
- [ ] 对照截图与演示页面验收浅/深色、输入方式、窄窗口和关键流程。
- [ ] 核对参考来源清单及更新报告；需要修改的速查表经过复查。历史 null 抓取时间不等于已刷新。
- [ ] 作者决定正式许可证，明确原创资产范围、作者署名和 Apple 参考文本的独立地位。见 `license-decision.md`。
- [ ] 作者确认版本号、Release 内容与是否启用公开站点。
- [ ] 获得部署授权后才复制 `deploy-pages.yml.example` 到工作流目录并配置 Pages；该模板当前不生效。
- [ ] 部署预览核验相对路径、移动/桌面/无障碍入口、浏览器控制台以及隐私资源清单。
- [ ] 合并主分支、创建 tag、发布 Release、修改仓库设置各自需要授权。

静态打包：`bash scripts/prepare-demo.sh /tmp/apple-style-site-NEW`。要求输出目录不存在；只包含演示与 Web 实现，不发布离线 Apple 参考库、测试、安装器或本机配置。该打包步骤是发布准备，使用 CSS/JS 仍无构建步骤。
