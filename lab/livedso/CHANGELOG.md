# LiveDSO Changelog

## [0.1.0] - 2026-10-27 12:49

### Added

- 本地优先 vault：DTCG 风格 token + contracts + style-cards + checks。
- `src/tokens.ts`：别名解析、分层、CSS variables 投影。
- `src/checks.ts`：坏别名、语义裸色、对比度、焦点复用、契约完整性/token 引用、风格卡检查、健康分、Markdown 报告。
- `src/vault.ts`：vault 读取/写回 token 值/状态视图。
- `src/server.ts`：Node 原生 HTTP API + 静态 Workbench（仅 127.0.0.1）。
- `src/cli.ts`：`check` / `report` / `build` / `serve`。
- Web Workbench：总览、Tokens 搜索/过滤/改值、Contracts、Style cards、Checks、Report、三态主题。
- 示例 vault（LRDS sample，独立演示数据）。
- `node:test` 核心测试。

### Changed

- v0.1 只编辑 token 值，不编辑 token 树/契约。
- 无云同步/账号/计费；无 Figma 同步；无采用扫描。
- 报告中的时间使用 UTC；vault 路径会显示相对尾部。
