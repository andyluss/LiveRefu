# LiveDSO Changelog

## [未发布]

### 新增

- 新增 [`docs/04_商品化路径.md`](docs/04_商品化路径.md)：设计系统体检包未来提案；未实施、未排期。
- 新增跨项目 [`DOGFOOD.md`](../DOGFOOD.md) 与 `04` 狗粮计划：9 个未来案例、Wave 1–3、反馈回路；未启动。
- `04_商品化路径.md` 增加 3 个目标产品案例：自由职业者发票 App、家庭能源 App、老人用药提醒 App。

## [0.6.0] - 2026-10-27 22:18

### Added

- **Token 生命周期**：token 叶可写 `deprecated` / `replacedBy` / `deprecationNote`；Workbench Tokens 支持按生命周期过滤、标记弃用并写回源 JSON。
- **弃用检查**：替代 token 不存在/指向自己/替代链仍弃用；契约/风格卡仍引用弃用 token 时告警；报告 Inventory 增加 Lifecycle 列。
- **采用扫描统计弃用引用**：Adoption 结果增加 `deprecatedRefs`，CLI/API/UI 都能看到代码里对弃用 token 的引用。
- 示例 vault 把 `sys.color.action.primaryHover` 标为 deprecated，替代为 `sys.color.action.primary`。

### Changed

- 生命周期编辑只写 token 源 JSON；不自动提交 Git。
- `node:test` 从 9 项增至 10 项（生命周期写回 + 采用扫描弃用统计）。
- 未做：团队/权限、私有 registry、托管；留到 v0.7。

## [0.5.0] - 2026-10-27 22:15

### Added

- **多 vault**：新增 [`vaults.json`](vaults.json) 与 `src/registry.ts`；Workbench 侧栏可切换 sample / LRDS real，`GET /api/vaults` 与 `POST /api/vault` 支持列出/切换。
- **风格卡对比**：Style cards 页新增 A/B 并排对比，显示色板、时代、维护说明、共享色，不修改 vault。
- 注册表路径相对 `vaults.json` 解析，项目整体移动不失效；无注册表时回退到单个默认 vault。

### Changed

- 多 vault 切换只影响当前本地服务进程，不写任何 vault 配置；切换后重新加载 token/契约/风格卡并跑闸门。
- `node:test` 从 8 项增至 9 项（注册表路径解析）。
- 未做：团队/权限、私有 registry、版本/弃用；留到 v0.6。

## [0.4.0] - 2026-10-27 21:41

### Added

- **采用扫描**：新增 `adopt` 命令、`POST /api/adopt` 与 Workbench 的 Adoption 视图；只读扫描一个代码目录，统计 token 引用、裸色、未知 `--dso-` 变量与文件分布。
- **CLI 严格模式**：`--json`、`--strict`（未知变量失败）、`--fail-on-raw`（裸色失败）。

### Changed

- 采用扫描只读；不自动改目标代码、不上传目标目录。
- 未做：多 vault、风格卡对比、团队/私有 registry；留到 v0.5。
- `node:test` 8 项（新增采用扫描测试）。

## [0.3.0] - 2026-10-27 21:37

### Added

- **契约编辑**：Workbench 的 Contracts 卡片增加编辑入口；标题/状态/说明/anatomy/states/tokens/keyboard/a11y/do/dont 可改，写回 `contracts/*.json`。
- **真实 token 预览**：新增 Preview 视图，用当前 vault 的解析值渲染按钮/输入/面板；支持风格卡选择与 default/hover/focus/disabled 状态切换。

### Changed

- 契约编辑与 token 编辑都只写源 JSON；不自动提交 Git。
- **未做**：采用扫描、多 vault、团队/私有 registry；留到 v0.3 后续/v0.4。
- `node:test` 从 6 项增至 7 项（新增契约写回/重载测试）。

## [0.2.0] - 2026-10-27 13:07

### Added

- `import` 命令：从 `design/tokens/` 导入 ref/sys/product 到 LiveDSO vault。
- `vault-lrds/`：真实 LRDS case（6 个文件 / 229 tokens），含契约/风格卡/检查配置。
- **v0.1 baseline**：本地 vault、token 解析/别名、3 类闸门、契约、风格卡、健康报告、CSS 投影、Workbench、`check/report/build/serve`、`node:test`。
- 首批用户决策：独立开发者。
- 许可：Apache-2.0（核心）+ 商业托管/团队/审计；贡献者政策 DCO 1.1。
- 正式名暂定 LiveDesign / 灵动设计；LiveDSO 继续作代号。
- 新增 `LICENSE` / `NOTICE` / `CONTRIBUTING.md` / `DCO` / `TRADEMARKS.md`；核心源码加 SPDX 头。

### Changed

- 只编辑 token 值，不编辑 token 树/契约。
- 无云同步/账号/计费；无 Figma 同步；无采用扫描。
- 0.1.0 是内部 prototype，不单独发版/打 tag；首个版本为 0.2.0。
