# data · 工程加载用配置表（game 内副本）

> game 内的配置表副本/派生目录，仅供 Godot 运行时按 `res://data/` 加载。**数值/结构的权威源在 [`../../data/`](../../data/README.md)**：
> `tables/` 存实际数值、`schema/` 定表结构（JSON Schema），均由数值策划 A 维护。
> **本目录禁止作为编辑入口**——改数值去 `../../data/tables/`，改结构去 `../../data/schema/`。

## 一、与本目录相关的约定

- **分层**：`game/data/` = 工程加载用副本；`../../data/` = 权威源（编辑入口）。二者分离，避免游戏运行时误改源数据。
- 字段一律 `snake_case`；禁止魔法数；常量经 `../../data/schema/` 冻结（见 [`docs/lead-programmer/01_tech-stack-draft.md`](../../docs/lead-programmer/01_tech-stack-draft.md) §4.2）。
- 渲染/UI/数值中被别角色定稿的字段，程序侧不擅自定义（对应字段以【待定】标注，见 `01_tech-stack-draft.md` §七）。

## 二、加载源映射

| 运行时路径 | 权威源 | 维护 |
| --- | --- | --- |
| `res://data/tables/`（运行时表） | [`../../data/tables/`](../../data/tables/) | 数值策划 A |
| schema 校验（`res://data/schema/`） | [`../../data/schema/`](../../data/schema/) | 数值策划 A |

## 三、当前状态（骨架占位）

- 本目录当前仅为骨架占位（`.gitkeep`）。
- **M1 已冻结表**：`meta.json`（全局数值参数：`pomodoro_work/break`、`focus_min/max`、`fragment_base_per_tomato`）位于 [`../../data/tables/meta.json`](../../data/tables/meta.json)，schema 在 [`../../data/schema/meta.schema.json`](../../data/schema/meta.schema.json)。
- 运行时加载：M1 由 `ConfigLoader`（`../scripts/autoload/config_loader.gd`）读取 `res://data/tables/` 下的表。因 `res://` 只能访问工程根（`game/`）内的资源，`meta.json` 已在 `tables/` 内放置**运行时副本**（由 `../../data/tables/meta.json` 派生，编辑仍走权威源）；当前默认读 `res://data/tables/meta.json`。
- `channel / timer / mixer_track / collectible` 表随 schema 冻结后接入【待定】。

> 相对路径约定：本文件位于 `game/data/`，到项目根目录 `data/` 为 `../../data/`，到 `docs/` 为 `../../docs/`。
