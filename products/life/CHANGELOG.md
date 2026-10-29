# Life Changelog

## [2.0.0] - 2026-10-29 08:33

### Added

- **五款生活 app 升级为 core + 2 packs**：睡眠环境/睡前程序、食材库存/餐食计划、身体状态/训练计划、书库/摘录、家庭物品/维护计划；
- 共享 core 支持多集合、pack 开关、模块状态/API；
- 五款 app 各自的独立产品/功能/数据/验收文档；
- 慢慢记并入 `apps/ledger`，Life 从 5 款变为 6 款；
- 主题生成器/主题控制抽到 `packages/theme` 与 `packages/web`，6 款 app 共用 7 个风格族 × light/dark 变体；
- 共享主题支持 `data-theme`（system/light/dark）与 `data-style`（风格变体）。

### Changed

- Life 升级为 v2.0；端口：ledger 4206；`dev:all`/`bundle`/`check` 覆盖 6 款；
- 五款通用 app + ledger 均使用同一套主题控制。

## [1.1.0] - 2026-10-29 08:26

### Added

- 慢慢记并入 `apps/ledger`，Life 从 5 款变为 6 款；
- 主题生成器/主题控制抽到 `packages/theme` 与 `packages/web`，6 款 app 共用 7 个风格族 × light/dark 变体；
- 共享主题支持 `data-theme`（system/light/dark）与 `data-style`（风格变体）。

### Changed

- 端口：ledger 4206；`dev:all`/`bundle`/`check` 覆盖 6 款；
- 五款通用 app + ledger 均使用同一套主题控制。

## [1.0.0] - 2026-10-29 08:16

### Added

- 五款 v1.0 应用：好好睡、好好吃、慢慢走、好好读、好好住；
- 共享 `packages/core`（配置、JSON store、HTTP、校验、summary）与 `packages/web`（token、组件、表单、图表）；
- 独立启动、`dev:all`、独立打包脚本；
- 统合文档：工程、设计系统、架构、数据、应用矩阵、未来路径。

### Changed

- 首版即统一骨架；不再为每个 app 复制服务端/前端框架。
