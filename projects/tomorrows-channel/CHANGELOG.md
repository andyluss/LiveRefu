# 明日频道 · 项目日志（CHANGELOG）

> 统一记录《明日频道》项目的里程碑、关键决策与文档变更。遵循 Keep a Changelog 风格：`Added`（新增）/ `Changed`（变更）/ `Fixed`（修复）/ `Removed`（移除）。
> 项目结构见 [`README.md`](README.md)；文档入口 [`docs/`](docs/)。

## [Unreleased]

### 新增
- 六角色开发计划会：产出 [`plans/00-project-plan.md`](plans/00-project-plan.md)（M1 单频道闭环排期 / M2 三频道顺序 / 跨角色依赖与风险 / 文档待办）；各角色意见存 `plans/meetings/20260908-1202-devplan/`。

### 变更（程序工程）
- **M1 单频道闭环已接线（骨架级，可运行）**：`AppController` 全局串联 `config_loader`（读 meta/channel/timer/mixer_track 四表）→ `channel_loader`（装载磁带频道 `tape_warm` + 皮肤 Token）→ `channel_fx`（后处理栈）→ `channel_shell`（三态 UI + 三面板数据驱动）→ 番茄计时/混音台（`event_bus` 事件驱动）。
- `game/data/tables/` 增 `channel.json` / `timer.json` / `mixer_track.json` 工程加载副本（权威源 `../../data/tables/`）。
- `main.tscn` 补全节点树：挂 `ChannelLoader` / `PomodoroTimer` / `MixerController` 子节点（其余运行时实例化）。
- 实机验证：`godot --headless --path game --import` 无 SCRIPT ERROR、全局类注册齐；运行主场景闭环自检 **VERIFY PASS**。详见 `game/README.md` §六。
- 已登记 M1 出口缺口（收藏 1 卡、双光实机渲染编辑器验证、真实音景/AudioBus、番茄结束提示等），交对应角色【待定】。

### 变更（结构）
- 项目目录扩展为"文档 + 开发产出"分层：新增强 `game/`（Godot 工程）、`data/`（数值 schema+表）、`art/`（美术源文件工程）；`assets/` 明确定位为"最终导出/运行资源"。
- 各新目录补 `README.md` 说明用途/命名/规范；项目 README 目录结构图同步。
- **项目管理收敛到 `plans/`**：开发计划（`00-project-plan.md`）、里程碑（`plans/milestones/`）、会议记录（`plans/meetings/`，时间戳命名）、决策（`plans/decisions/`）、完成情况（`plans/progress/`）、工作日志（`plans/logs/`）；顶层 `decisions/`、`notes/` 移除。`CHANGELOG.md` 单独处理（对外/里程碑视角）。
- **时间记录精确到分**（AI 节奏快）：文件名 `YYYYMMDD-HHMM-{关键词}`；文档内具体时刻 `YYYY-MM-DD HH:MM`；项目节点类日期保留。里程碑/评审纪要/会议意见等时间戳与文件名已补齐。
- **会议记录改为"一次会议一个文件夹"**：`plans/meetings/` 下每场会议一个 `YYYYMMDD-HHMM-{主题}/` 文件夹，内含 `000-{主题}-summary.md` 汇总 + 会议文件（M0 评审会、开发计划会）。

### 待推进
- M1 单频道（磁带暖未来）闭环启动：主程序排期细化、数值策划 A 落 P0 配置表。
- 各角色 `01_/02_` 草案细化（GDD 主风格定稿后）。
- 主美术补素材：蒸汽波黄昏频道（moodboard 方向缺）、旧接收机本体参考图。
- 项目团队按 [`plans/meetings/`](plans/meetings/) 评审纪要的【待定】项逐条收敛。

---

## [0.2.0] · 2026-09-08 · M0 概念评审通过

### Added
- 项目文档整体迁入 `projects/tomorrows-channel/docs/`，并按角色分子目录（主策划/主程序/主美术/数值策划A/图形程序员A/UI设计美术A + `_shared` 共享）。
- 建立项目主 README 与项目日志（本文件）。
- GDD《明日频道》定稿为 v0.2（§12 开放问题全部收口为【已定】）。
- 跨角色评审纪要（五角色回执汇总 + 图形程序员A"双层光"补充）。

### Changed
- M0 四项【待定】拍板：版权责任人=主策划；放松/解锁边界=纯正反馈零惩罚；技术主线=Godot 4.7.x 桌面导出；渲染后端允许每频道切。
- 定位：方向 D「复古未来氛围陪伴」确立为当前立项；A/B/C 转为候选保留。

### Fixed
- 校正《明日频道》文档日期为东八区实际日期（09-07/09-09 → 09-08）。

---

## [0.1.0] · 2026-09-06 · 立项草案与工作室建立

### Added
- 工作室（studio001/）建立，六个 AI 开发角色各一目录。
- 主策划《立项概念草案》v0.1（候选 A/B/C 三方向）。
- 各角色初始工作文档（01 草案 / 02 模板）。

### Changed
- 立项草案 v0.2：方向 D 确定为当前立项。

---

## 说明

- 本日志从工作室阶段（studio001/）延续记录；更早的角色文档细节见各角色目录与 Git 提交历史。
- 日期均以**东八区**为准（见根 [`tech/docs-convention.md`](../../tech/docs-convention.md) 日期约定）。
