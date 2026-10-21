# Kits · 介质适配包

> **Kit 不是“再写一套 token”**：它只负责把 `sys.*` / `product.*` 落地到某个介质。
> 任何 Kit 都不得新增核心语义；缺语义时先回 `design/tokens/` 提案。

| Kit | 状态 | 消费方式 | 说明 |
| --- | --- | --- | --- |
| [web](web/README.md) | **v0.2 试点** | `dist/web/future-archive.css` / `livefab.css` | CSS 变量 + 旧变量兼容别名；网站与 LiveFab 已接入 |
| [godot](godot/README.md) | **v0.1 试点** | `dist/godot/tokens.json` | 与《未来残片》现有 schema 一致；`ThemeBuilder` 编译 Theme |
| [app](app/README.md) | **v0.3 起步** | `dist/app/tokens.json`（平台无关 JSON） | 触控目标、安全区、Dynamic Type、平台导航；**尚无真实 App 消费者** |
| print | v0.3 | CSV/JSON 规格 + 版式模板 | CMYK/专色、纸张、出血、条码/法务位 |
| physical | v0.4 | CMF 规格 + 刀版 + 供应商清单 | 颜色/材料/表面、工艺、公差、包装、安全 |

## 规则

1. **值从 token 来**：Kit 里不出现新的设计值。
2. **生成物不手改**：改 `design/tokens/`，重跑 `build_tokens.ts`。
3. **每个 Kit 有验收命令**：写清怎么证明“它真的生效了”，不能只说“已接入”。
4. **平台差异写下来**：焦点、触控、字体回退、安全区、性能预算，各自成节。
