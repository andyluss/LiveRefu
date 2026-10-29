# Life Changelog

## [3.2.0] - 2026-10-29 08:57

### 变更

- **`--life-*` 提升为 LRDS `product.life`**：`design/tokens/products/life.tokens.json` 固化浅/深色产品语义；
- Life 的 `packages/web/tokens.css` 改为从该源生成，不再手写颜色；
- 14 个 LiveDSO 风格变体继续覆盖 `--life-*`；默认浅/深色与变体分层更明确；
- 更新设计系统说明、统一决策 L15 与统合总纲版本。

## [3.1.1] - 2026-10-29 08:53

### 修复

- `docs/00_统合总纲.md` 应用表从 6 款补全为 16 款；
- 同步更新目标/完成定义的款数、`entries + modules` 数据模型与共享 token 说明。

## [3.1.0] - 2026-10-29 08:52

### Added

- **Life 统合主页**：`http://127.0.0.1:4200`，聚合 16 款应用入口、在线状态与首个摘要指标；
- 分组/搜索/刷新、共享主题控制、跨端口 CORS；
- `npm run home`；`dev:all` 同时启动主页；
- 统合主页文档 `docs/11_统合主页.md`。

### Changed

- 共享 core 与慢慢记 API 增加 local CORS，支持主页聚合状态。
## [3.0.0] - 2026-10-29 08:49

### Added

- **好好聊 Connect v1.0**：联系核心 + 人物/礼物/重要日期三个扩展包，端口 4216；
- **十款新应用全部 v1.0 交付**；Life 共 16 款；测试覆盖 15 款通用 app + ledger。

## [2.9.0] - 2026-10-29 08:48

### Added

- **好好整 Tidylog v1.0**：整理核心 + 空间/物品去向/捐赠三个扩展包，端口 4215；
- 独立文档与 CHANGELOG；Life 扩展到 15 款。

## [2.8.0] - 2026-10-29 08:47

### Added

- **好好养 Carelog v1.0**：照护核心 + 照护计划/健康记录/用品三个扩展包，端口 4214；
- 独立产品/功能/数据/验收文档与 CHANGELOG；
- Life 扩展到 14 款；测试覆盖 13 款通用 app + ledger。

## [2.7.0] - 2026-10-29 08:47

### Added

- **好好行 Travellog v1.0**：出行核心 + 地点/行程/纪念物三个扩展包，端口 4213；
- 独立产品/功能/数据/验收文档与 CHANGELOG；
- Life 扩展到 13 款；测试覆盖 12 款通用 app + ledger。

## [2.6.0] - 2026-10-29 08:46

### Added

- **好好学 Learnlog v1.0**：学习核心 + 课程/技能地图/学习笔记三个扩展包，端口 4212；
- 独立产品/功能/数据/验收文档与 CHANGELOG；
- Life 扩展到 12 款；测试覆盖 11 款通用 app + ledger。

## [2.5.0] - 2026-10-29 08:45

### Added

- **好好听 Listenlog v1.0**：专辑/播客核心 + 歌单/现场/设备三个扩展包，端口 4211；
- 独立产品/功能/数据/验收文档与 CHANGELOG；
- Life 扩展到 11 款；测试覆盖 10 款通用 app + ledger。

## [2.4.0] - 2026-10-29 08:44

### Added

- **好好看 Watchlog v1.0**：电影/剧集核心 + 片单/影院/剧集进度三个扩展包，端口 4210；
- 独立产品/功能/数据/验收文档与 CHANGELOG；
- Life 扩展到 10 款；测试覆盖 9 款通用 app + ledger。

## [2.3.0] - 2026-10-29 08:43

### Added

- **好好写 Journal v1.0**：日记核心 + 提示卡/回顾/感恩三个扩展包，端口 4209；
- 独立产品/功能/数据/验收文档与 CHANGELOG；
- Life 扩展到 9 款；测试覆盖 8 款通用 app + ledger。

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
