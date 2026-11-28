# RefuWorld · 项目 TODO

> 项目内部待办入口。跨工作区/设计系统事项仍以根 [`../../TODO.md`](../../TODO.md) 为准。
> 最后更新：2026-11-28

## P1 · 必须项

| ID | 事项 | 状态 | 下一步 | 详情 |
| --- | --- | --- | --- | --- |
| W-001 | 真实作者 2h 试用 | 待开始 | 找非工程作者按 `08_两小时教程.md` 完成可玩房间；记录卡点 | [08](docs/08_两小时教程.md) |
| W-002 | ScriptHost 文件系统 watcher | 已完成 | `worldc watch-scripts` 轮询 `scripts/**/*.js`，变化后重新校验并 `World::reload_scripts`；状态/命令 timer 保留 | [07 §4.8](docs/07_M1实现与验收.md) |
| W-003 | 完整 NPC 避让/感知 | 进行中 | 局部感知事件/侧移/卡住重试已加；仍需多 NPC 协同与全局重规划 | [12](docs/12_活NPC与行为层方案.md) |

## P2 · 硬化 / 扩展

| ID | 事项 | 状态 | 下一步 | 详情 |
| --- | --- | --- | --- | --- |
| W-004 | 真实墙钟 `setTimeout` | 已完成 | 拍板：确定性 tick 为唯一调度；`setTimeout` 映射 tick，不提供墙钟副作用 API | [07 §4.8](docs/07_M1实现与验收.md) |
| W-005 | 函数型 timer 跨 reload | 已完成 | 自包含函数按源码迁移；闭包函数明确不支持，留作安全边界 | [07 §4.8](docs/07_M1实现与验收.md) |
| W-006 | 多 Zone / 5k 全量决策 | 待开始 | 在 real5k-v2 上增加多 Zone 驻留与全量 NPC 决策，复核 bevy_ecs | [07 §4.10](docs/07_M1实现与验收.md) |
| W-007 | Windows Godot 导出验证 | 待开始 | 补 `.dll` 打包与导出预设；在 Windows 跑 600 tick/存档 | [09](docs/09_M2适配器启动.md) |
| W-008 | 外机 GPU timer 复测 | 待开始 | 用厂商 GPU timer 而非 wall-clock；记录 P50/P95 | [09](docs/09_M2适配器启动.md) |
| W-009 | 编辑器复杂对话图自动布局 | 已完成 | 分层 + barycenter 自动布局、正交箭头边、字段级错误与保存前校验 | [07 §4.4](docs/07_M1实现与验收.md) |
| W-010 | L0 动态障碍可视化 | 已完成 | `web/spacetime.html` 的「移动障碍」按钮通过 `MoveProp` 展示局部 nav 重建与实时 blocked 格 | [13](docs/13_L0时空沙盒.md) |

## 维护

- 完成项直接改状态，并在「下一步」写提交/日期。
- 只收项目工作；跨项目/设计系统事项回根 TODO 或 `design/TODO.md`。
