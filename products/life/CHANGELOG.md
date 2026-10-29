# Life Changelog

## [2.2.0] - 2026-10-29 08:42

### Added

- **好好喝 Hydrate v1.0**：饮水核心 + 配方/杯具/咖啡因三个扩展包，端口 4208；
- 独立产品/功能/数据/验收文档与 CHANGELOG；
- Life 扩展到 8 款；测试覆盖 7 款通用 app + ledger。

## [2.1.0] - 2026-10-29 08:41

### Added

- **好好穿 Wearwell v1.0**：今日穿搭 + 衣橱 + 洗衣 + 愿望清单（core + 3 packs），端口 4207；
- 十款新应用计划 `docs/10_十款新应用计划.md`，首款交付，其余 9 款按轮次推进；
- 好好穿独立文档：产品定义、功能与扩展包、数据模型、验收。

### Changed

- Life 从 6 款扩展到 7 款；测试覆盖 6 款通用 app + ledger；
- `dev:all`/`bundle` 加入 wear；通用 app 测试扩展到 6 款。

## [2.0.1] - 2026-10-29 08:36

### Changed

- 新增 [`docs/09_决策记录.md`](docs/09_决策记录.md)，统一 Life 级、五款 app 扩展包与慢慢记 M1–M15；
- 慢慢记原决策表迁移为指针，避免旧链接断裂。

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
