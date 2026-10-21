# 设计系统变更日志（Design System Changelog）

> 记录 **LiveRefu Design System（LRDS）** 自身的版本变更。
> 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [SemVer](https://semver.org/)；
> 时间一律东八区、精确到分（规则见 [`../rules/R06-time.md`](../rules/R06-time.md)）。
> **工作区级**变更仍记根 [`CHANGELOG.md`](../CHANGELOG.md)；本文件只记设计系统发布与决策包。
> 版本标签建议：`design-v<版本>`（与 `workspace-v<版本>` 分开）。

## [未发布]

> v0.1 地基已实现；验收通过后把本段提升为 `0.1.0` 并打 `design-v0.1.0`。

### 新增

- **三层 token 源**（186 个）：[`tokens/core/ref.tokens.json`](tokens/core/ref.tokens.json)（61）、[`tokens/core/sys.tokens.json`](tokens/core/sys.tokens.json)（92）、[`tokens/products/future-archive.tokens.json`](tokens/products/future-archive.tokens.json)（15）、[`tokens/products/future-debris.atomic.tokens.json`](tokens/products/future-debris.atomic.tokens.json)（18）；[`tokens/schema/tokens.schema.json`](tokens/schema/tokens.schema.json)。
- **生成器与闸门**：[`tools/token_lib.ts`](tools/token_lib.ts)、[`tools/build_tokens.ts`](tools/build_tokens.ts)（8/8 自检）、[`tools/check_tokens.ts`](tools/check_tokens.ts)（7/7）、[`tools/check_contrast.ts`](tools/check_contrast.ts)（7/7，68 组对比度 + 7 组层级 + 3 组 focus 分离）、[`tools/check_no_raw_values.ts`](tools/check_no_raw_values.ts)（5/5）、[`tools/check.sh`](tools/check.sh)。
- **生成物**：`tokens/dist/web/tokens.css`、`tokens/dist/godot/tokens.json`、`tokens/dist/docs/tokens.md`；产品副本 `projects/website/app/assets/tokens.generated.css`、`projects/mainline/future-debris/game/data/tokens.json`。
- **介质包说明**：[`kits/web/README.md`](kits/web/README.md)、[`kits/godot/README.md`](kits/godot/README.md)。
- **实现记录与例外**：[`docs/05_实现记录_v0.1.md`](docs/05_实现记录_v0.1.md)、[`docs/exceptions.md`](docs/exceptions.md)（EX-20261021-01 网站组件裸色值、EX-20261021-02 网站 6px 圆角）。

### 变更

- **四道闸门接入根 pre-commit 与 CI**：暂存涉及 `design/`、网站 `theme.css` / `tokens.generated.css` 或游戏 `game/data/tokens.json` 时自动跑 `bash design/tools/check.sh`；CI 另加网站 `verify-contrast.ts`。
- **D1–D10 全部裁决**（用户：按推荐执行，D2/D5 确认；暂不用设计工具；实体后定；v0.1 外观不变）；[`docs/00_决策总表.md`](docs/00_决策总表.md) 转为 v1.0 并新增裁决记录。
- **网站试点**：`projects/website/app/assets/theme.css` 删除裸色值，旧变量名由生成物别名提供；`nuxt.config.ts` 在主题前加载 `tokens.generated.css`；`tools/verify-contrast.ts` 改为从生成物解析 token。
- **游戏试点**：`projects/mainline/future-debris/game/data/tokens.json` 改为生成物，schema 与取值不变；`check_tokens.py`、`run.sh contrast`、`run.sh theme` 全部通过。

### 修复

- **网站 `--focus` 不再复用强调色**：由 `#57D8C8`（= `--teal-bright`）改为独立蓝 `#8AB4F8`。这是 v0.1 唯一有意的视觉变化，只在键盘焦点时可见。

### 备注

- **未做**：全组件库、Figma 库、LiveFab/明日频道迁移、打印/实体、母品牌命名、`design/` M1/M2 转 `block`。债务与收口计划见 [05 §四](docs/05_实现记录_v0.1.md)。

## [0.0.1] - 2026-10-21 12:25 · 立项决策包

### 新增

- **2026-10-21 · 设计系统立项决策包（v0.1 决策阶段）**
  - 新增 [`README.md`](README.md)：定位、原则、决策队列、拟议结构、与既有资产的关系。
  - 新增 [`docs/00_决策总表.md`](docs/00_决策总表.md)：D1–D10 全部待裁决，附推荐、代价、依赖关系与“最小拍板集”。
  - 新增 [`docs/01_现状盘点.md`](docs/01_现状盘点.md)：四套视觉定义的对照与七个真问题（含 focus 色复用、`--line` 误用等合规缺陷）。
  - 新增 [`docs/02_系统架构.md`](docs/02_系统架构.md)：五层模型、三层 token（`ref`/`sys`/`product`）、单一事实来源、生成管线、八道闸门、介质包。
  - 新增 [`docs/03_治理与运营.md`](docs/03_治理与运营.md)：角色与权限、单向门/双向门、DP 流程、设计闸门、版本策略、AI 协作约定。
  - 新增 [`docs/04_落地路线.md`](docs/04_落地路线.md)：P0–P5 阶段、`v0.1` 范围、双试点、Definition of Done、风险与停止条件。
  - **状态**：全部待用户裁决；尚未开始 token 与实现。

### 变更

- 无。

### 弃用

- 无。

### 移除

- 无。

### 修复

- 无。

### 安全

- 无。
