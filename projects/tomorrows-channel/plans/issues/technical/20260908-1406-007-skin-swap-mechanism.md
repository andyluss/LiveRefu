# 问题：换肤机制未定（运行时 Token 热切换 vs 预烘焙 UI 主题）

> 状态：**open**（未解，待主程序定架构；M1 启动最先对齐点之一）
> 发现：2026-09-08 14:06 · 发现人：UI 设计美术 A
> 类型：technical · 优先级：**高**（决定 Token 系统组织与 M2 换肤成本）

## 现象 / 问题描述

"随频道变的只是 Token 值、不改骨架结构"是 UI 骨架（[`05_m1-ui-skeleton.md`](../../../docs/ui-artist-a/05_m1-ui-skeleton.md) §八 ②）的既定原则，但 Godot 下**换肤的具体实现路径未定**：

- **运行时 Token 热切换**：皮肤数据（色板/材质/边框清单）在运行时注入置换，同一套骨架节点换值；
- **预烘焙 UI 主题**：每套皮肤预生成一套 Theme/资源，运行时按主题切换。

两种路径决定 Token 系统组织方式与 M2 成本（能否**不改结构仅换 Token**）。主程序在 [`06_m1-ui-godot-impl.md`](../../../docs/ui-artist-a/06_m1-ui-godot-impl.md) §3.4 标注【待定·主程序】；UI A `04_` §6·③ 亦提出该项。

## 影响 / 卡点

- 决定 `ChannelSkin` Token 的组织与注入链路；影响 M1 轻量皮肤（磁带）与 M2 三频道换肤管线成本；
- 若选错路径，M2 三频道皮肤可能需重构骨架或重做皮肤资源。

## 尝试 / 参考

- UI A 已按"共用骨架 + 频道主题 Token（ChannelSkin）"落地 M1 骨架与三面板 `_apply_skin()`（零硬编码取色），[`game/README.md`](../../../game/README.md) §4.2/§4.3；
- 主程序需确认 Godot 下场"Token 热切换"可行性（`Theme`/`Resource` 置换）；
- 开发计划 M2：三频道皮肤"只挂 Token、绝不各自重画"[`00-project-plan.md`](../../00-project-plan.md) §三 M2。

## 解决方向 / 需求

- **需主程序确认换肤路径**：运行时 Token 热切换 vs 预烘焙主题（建议热切换——对齐"只换值不改结构"）；
- 定案后：明确 `ChannelSkin` Token 结构、`_apply_skin()` 契约、是否走 Godot Theme 定制——供 UI A 锁定并供主程序实现。

## 变更记录

- 2026-09-08 14:06：登记。
