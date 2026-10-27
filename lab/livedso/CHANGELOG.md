# LiveDSO Changelog

## [未发布]

### 新增

- 新增 [`docs/04_商品化路径.md`](docs/04_商品化路径.md)：设计系统体检包未来提案；未实施、未排期。
- 新增跨项目 [`DOGFOOD.md`](../DOGFOOD.md) 与 `04` 狗粮计划：9 个未来案例、Wave 1–3、反馈回路；未启动。
- `04_商品化路径.md` 增加 3 个目标产品案例：自由职业者发票 App、家庭能源 App、老人用药提醒 App。

## [0.2.0] - 2026-10-27 12:57

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
