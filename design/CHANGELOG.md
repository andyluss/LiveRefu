# 设计系统变更日志（Design System Changelog）

> 记录 **LiveRefu Design System（LRDS）** 自身的版本变更。
> 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [SemVer](https://semver.org/)；
> 时间一律东八区、精确到分（规则见 [`../rules/R06-time.md`](../rules/R06-time.md)）。
> **工作区级**变更仍记根 [`CHANGELOG.md`](../CHANGELOG.md)；本文件只记设计系统发布与决策包。
> 版本标签建议：`design-v<版本>`（与 `workspace-v<版本>` 分开）。

## [未发布]

（暂无；下一版发布前在此登记。）

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
