# Apple-Style 演示

从仓库根目录运行 `python3 -m http.server 8765 --bind 127.0.0.1`，打开 [统一入口](http://127.0.0.1:8765/demo/index.html)。主站源码在本目录，技能包中的 `web/demo.html` 和 `web/demo-desktop.html` 是可单独查看的最小示例，统一入口底部提供链接。

内容包括移动组件、系统颜色样本、语义操作色、字体/同心圆角、拖拽/键盘/click 控件、桌面窗口与无障碍偏好模拟。默认中文，可切换英文。样式和运行时直接来自 `../skills/Apple-Style/web/`，没有构建步骤。

组件状态由运行时维护，监听 `change`；不要在 click 中再次修改相同值。模拟偏好不是操作系统/辅助技术测试。交付清单可记录未检查、已检查通过/失败、不适用；进度只是人工记录，不能当自动验收。

真实验证范围、命令和剩余限制见 [validation](../docs/validation.md)。Playwright 保持后台运行，在 `test-results/` 保存 390/1440px 示例截图，并检查六个关键宽度的溢出、键盘行为、对比度和资源释放。Safari、Firefox、VoiceOver 未执行的项目保持未验证。

截图为固定随机种子的可重复示例，尚无跨操作系统的整页像素黄金基线。部署准备使用 `scripts/prepare-demo.sh`，不会发布参考库；公开发布需要额外授权。

## English

Serve the repository root and open `/demo/index.html`. The showcase links the minimal mobile and desktop examples, all using the same CSS/JS. Controls emit `change`; do not double-toggle in click handlers. Preference simulations and manually recorded checklist states do not establish assistive-technology validation. See the validation record for actual evidence. No public deployment is enabled by this directory.
