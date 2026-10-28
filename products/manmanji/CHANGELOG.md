# 慢慢记 Changelog

## [1.1.0] - 2026-10-28 21:44

### Added

- **9 个主题**：默认 paper/night + 7 个来自 LiveDSO 风格卡（Retro Paper/CRT、Cassette Amber、Atompunk、Material Dark、Tailwind Paper、Carbon Night）。
- `tools/build-themes.ts` 读取 LiveDSO vault/style-card，生成 `web/themes.generated.css` 与主题列表；`themes` / `themes:check` / `themes:list`。
- 主题选择器与主题切换按生成列表工作；服务端校验主题白名单。

### Fixed

- 修复主题生成 CSS 注释中 `*/` 提前闭合导致第一条主题选择器失效的问题；新增生成物回归测试。

## [1.0.1] - 2026-10-28 21:38

### Fixed

- **顶部导航按钮无反应**：按钮只有 `data-view`，没有点击处理；补上 `#nav` 委托监听，点击后写入 hash 并触发路由。
- 新增导航静态回归测试。

## [1.0.0] - 2026-10-28 21:28

### Added

- 本地优先记账核心：账户、收入/支出/转账、分类、预算、月度报表；
- 单页 Web：总览、流水、账户、预算、报表、设置；
- **pack.freelance**：客户、发票、行项目、税、状态、收款入账、逾期；
- JSON 持久化 + `.bak`、CSV 导出、完整 JSON 备份；
- 领域/存储/API 测试与产品文档。

### Changed

- 首个 v1.0 完整产品；后续按真实使用反馈演进。
