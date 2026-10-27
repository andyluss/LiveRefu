# LiveLand Changelog

## [0.2.0] - 2026-10-28 07:27

### Added

- **多世界**：`worlds.json` 注册表、`/api/worlds` / `/api/world` 切换、Workbench 世界选择。
- **Canon 编辑/删除**：`/api/canon/update` / `/api/canon/delete`，Workbench 内联编辑表单与删除确认。
- **资产缩略图**：本地 `/api/asset` 只读服务，路径限制在 world 目录内；示例 SVG/CSV 资产。
- **HTML 世界页**：`htmlWorld` 导出、CLI `html`、API `export type=html`，单文件可独立打开。
- 示例世界「灰岸」：2 时代 / 4 canon / 3 实体 / 2 资产，用于多世界演示。
- 新增 [`docs/04_商品化路径.md`](docs/04_商品化路径.md)：World Pack 未来提案；未实施、未排期。
- 新增跨项目 [`DOGFOOD.md`](../DOGFOOD.md) 与 `04` 狗粮计划：9 个未来案例、Wave 1–3、反馈回路；未启动。
- `04_商品化路径.md` 增加 3 个目标产品案例：TTRPG 世界包《橙港》、叙事游戏《潮汐维修》、互动展《维护者的房间》。

### Changed

- `node:test` 从 3 项增至 5 项（注册表/canon 写回、HTML 转义）。
- 云/账号/团队/权限/托管继续搁置。
- 许可/正式名/首批用户仍待定。

## [0.1.0] - 2026-10-27 13:41

### Added

- 单世界 JSON 模型：约束、时代、canon、实体、资产、输出。
- 世界 lint：canon 冲突/缺失依赖/未知时代、资产来源/许可、时代代价/维护。
- Web Workbench：总览、时代、Canon、实体、资产、Lint、输出。
- 添加 canon 并写回世界 JSON。
- 导出世界圣经、风格指南、资产清单。
- CLI：`check` / `report` / `style` / `assets` / `serve`。
- 示例世界「橙港」：3 时代 / 12 canon / 8 实体 / 6 资产。
- `node:test` 3 项测试。

### Changed

- 许可/正式名/首批用户仍待定。
