# 慢慢记 Changelog

## [1.3.0] - 2026-10-29 08:26

### Changed

- **并入 Life 套件**：`products/manmanji/` → `products/life/apps/ledger/`；端口 4190 → 4206。
- 主题系统改为 Life 共享层：`packages/theme/themes.ts`、`packages/web/theme.js`、`packages/web/theme.css`、`packages/web/themes.generated.*`。
- 慢慢记与五款 Life app 共用 7 个风格族 × light/dark 变体；风格/外观分离由共享层实现。
- 服务端仍保留 `settings.theme` 家族校验；前端通过共享主题回调写回。

## [1.2.0] - 2026-10-28 21:54

### Changed

- **风格与外观分离**：顶栏新增独立“风格主题”选择与“系统/浅色/深色”三段外观控件；设置页同步。
- 风格改为 7 个族，每族固定 light/dark 两个变体；`data-style` 表示风格，`data-theme` 表示 system/light/dark（R-001）。
- 外观持久化到 `localStorage['lrds-theme']`；系统模式监听 `prefers-color-scheme`；首屏内联脚本避免闪烁。

### Fixed

- 修正生成主题 CSS 注释中的 `*/` 导致首个变体选择器失效；生成选择器改为 `[data-style]`。

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
