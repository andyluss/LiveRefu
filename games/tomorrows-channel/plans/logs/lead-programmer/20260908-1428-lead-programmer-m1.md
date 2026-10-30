# 工作日志：主程序 · M1 阶段（2026-09-08）

> 日期：2026-09-08（东八区）· 记录角色：主程序
> 文件：`logs/lead-programmer/` · 时段：M1 工程骨架 → 闭环串联

## 一、本时段工作

| 时间 | 做了什么 | 产出/落点 | 提交 |
| --- | --- | --- | --- |
| 08:xx | Godot 4.7.x 引擎调研、技术选型（锁定 Godot/倾向 Compatibility） | `docs/lead-programmer/03_godot-engine-research.md`、`01_tech-stack-draft.md` | `b1ee2f4`、`9e541c0` |
| 13:xx | 搭建 Godot 工程骨架（project.godot/acomplish/目录/脚本骨架/main.tscn） | `game/project.godot` 等 | `9e541c0` |
| 14:xx | 串联 M1 单频道闭环（AppController 接线 + 数据驱动 + 事件驱动） | `game/` 接线 | `8f0498f` |
| 14:xx | 实现收藏 1 卡逻辑（collection_controller + 合规闸门） | `game/scripts/collection_controller.gd` | `8f0498f` |

## 二、遇到的主要问题

- **headless 沙箱 user:// 崩溃**：本机 `--headless` 在 sandbox 下无法建 `user://` 目录而崩溃。解决：`export HOME=/tmp/gdhome` 规避；`OS.has_feature("headless")` 不可靠，用 `DisplayServer.get_name()=="headless"` 判定。已写进 game/README §六。
- **渲染器选择**：磁带 2D 后处理（双光层+扫描线+微噪）是否需 Forward+/HDR/真 bloom。结论：不需要，用 Compatibility + 2D 假辉光（图形 A 切片确认，issues technical-002/004）。
- **配置表 schema 未冻结**：content_card 等五张表的字段（含强制版权字段）M1 第一周必锁，但 content-pool schema 尚未冻结（issues technical-006）。
- **脚本资源 .uid**：Godot 4 自动生成 .gd.uid，必须入库（否则换机器丢资源关联）。

## 三、心得 / 经验

- **数据驱动 + 事件驱动是结对最优解**：内容走配置表（meta/channel/timer/mixer_track/content_card）、模块用 event_bus 解耦——加内容零代码改动，模块职责清晰。
- **渲染器先锁再开发**：M1 前就锁定 Compatibility（而非上了 Forward+ 再返工），是正确决策；避免中段换渲染后端。
- **headless 验证跑赢文档**：实机 `--quit-after 5` 能发现脚本/资源加载问题，比只看文档强；工程状态标"已接线可运行闭环（骨架级）"，有验证证据支撑。
- **接口骨架先行**：event_bus 的信号、ChannelSkin 的 token 槽，都在开发前定义好，UI/图形/数值据此实现——避免各角色强行对接。

## 四、关键决策 / 变更

- 渲染器锁定 Compatibility（ADR-0001）；config_loader 支持 object/array 表；channel_fx `clamp→clampf` 类型修正。

## 五、遗留 / 待办

- 【待定】content-pool schema 冻结（含嵌套 copyright，按版权定案）。
- 【待定】双光实机渲染（shader 在 Godot 编辑器 GPU 验证，issues technical-003）。
- 【待定】真实音景/AudioBus 布局、番茄结束轻提示、频道路由表集中。

## 六、变更记录

- 2026-09-08：新增本工作日志。
