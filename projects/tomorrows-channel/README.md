# 明日频道 · Tomorrow's Channel

> 复古未来主义氛围陪伴应用。项目定位与设计文档见 [`docs/`](docs/)。
> 工作室：LiveRefu Studio；工作区整体说明见根 [`README.md`](../../README.md)。

## 项目一句话

> 你收到了一段来自"从未到来的未来"的广播信号——调频、收藏、陪你把今天的工作与学习做完。

《明日频道》是一款复古未来主义氛围陪伴应用：切换不同"复古未来"频道，让图文音视频低打扰地流淌，用专注计时、环境混音、呼吸放松等小工具陪你学习与工作。

## 项目目录结构

```
projects/tomorrows-channel/
├── README.md          # 项目首页(本文件)
├── CHANGELOG.md       # 项目日志(对外/里程碑视角, 单独处理)
├── docs/              # 设计与角色项目文档(按角色分子目录, 见下)
│   └── _shared/       # 跨角色共享(GDD)
├── plans/             # ★ 项目管理(怎么推进项目): 计划/里程碑/会议/决策/完成情况/工作日志
├── game/              # ★ Godot 程序工程(scenes/scripts/shaders)  主程序/图形/UI 程序
├── data/              # ★ 数值与配置表  schema/=表结构, tables/=数据  数值策划 A
├── art/               # ★ 美术源文件工程(PSD/AI/Blender源)  主美术工作区
├── assets/            # 最终导出的运行资源(供 game/ 加载)   art/audio/ui
└── references/        # 参考资料(外部链接快照、知识库引用索引)
```

> 说明：
> - **分层**：`art/`＝源文件（可编辑）→ `assets/`＝最终导出（运行资源）→ `game/`＝加载运行的工程；`docs/`＝文档/草案/规范；`data/`＝数值配置表。
> - **管理 vs 产出**：`plans/`＝**项目管理**（计划/里程碑/会议记录/决策/完成情况/工作日志）；`docs/`＝**设计与角色产出**（GDD、各角色草案/回执）。`CHANGELOG.md`＝项目日志（对外视角）单独处理，不与 `plans/logs/` 工作日志合并。
> - `assets/`、`art/`、`game/`、`data/`、`plans/`、`references/` 各含 `README.md` 说明用途/命名/规范；`plans/` 下另有模板（`_0000-template`、`_meeting-template`）。
> - `docs/lead-artist/moodboard/` 是**参考/灵感素材**（风格案例图），属主美术文档域，仍在 docs 下。
> - 空目录以 `.gitkeep` 占位（git 不跟踪空目录）。

## 项目状态

**阶段：M0 概念评审通过**（定名《明日频道》、技术主线 Godot 4.7.x 桌面导出、M1 = 单频道"磁带暖未来"闭环）。

## 文档结构（`docs/`）

| 角色 | 子目录 | 内容 |
| --- | --- | --- |
| 主策划 | [`docs/lead-designer/`](docs/lead-designer/) | 立项概念草案 |
| 主程序 | [`docs/lead-programmer/`](docs/lead-programmer/) | Godot 引擎调研、工程/里程碑 |
| 主美术 | [`docs/lead-artist/`](docs/lead-artist/) | 风格方向、素材库（moodboard） |
| 数值策划 A | [`docs/systems-designer-a/`](docs/systems-designer-a/) | 数值框架、配置表 |
| 图形程序员 A | [`docs/graphics-programmer-a/`](docs/graphics-programmer-a/) | 渲染方案、性能预算 |
| UI 设计美术 A | [`docs/ui-artist-a/`](docs/ui-artist-a/) | UI 规范、组件清单 |
| —（共享） | [`docs/_shared/`](docs/_shared/) | GDD、评审纪要、跨角色文档 |

## 角色映射（英文目录名）

| 中文角色 | 英文子目录 |
| --- | --- |
| 主策划 | `lead-designer` |
| 主程序 | `lead-programmer` |
| 主美术 | `lead-artist` |
| 数值策划 A | `systems-designer-a` |
| 图形程序员 A | `graphics-programmer-a` |
| UI 设计美术 A | `ui-artist-a` |

## 里程碑

- **M0** ✅ 概念评审通过（本目录首建，2026-09）
- **M1** 🔄 单频道（磁带暖未来）闭环——待启动
- **M2** ⬜ 三频道三套氛围成立
- **M3** ⬜ 完整"一天"体验
- **M4** ⬜ 内容管线量产

> 里程碑细节见主程序 [`docs/lead-programmer/`](docs/lead-programmer/) 的排期文档。

## 项目日志

项目迭代、决策与关键事件记录在 [`CHANGELOG.md`](CHANGELOG.md)。
