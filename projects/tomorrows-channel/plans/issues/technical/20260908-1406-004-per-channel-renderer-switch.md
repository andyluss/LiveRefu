# 问题：是否每频道切渲染后端未定（决定后处理栈是否双实现）

> 状态：**open**（未解，待 M2 前主程序拍板；M1 不触发）
> 发现：2026-09-08 14:06 · 发现人：图形程序员 A
> 类型：technical · 优先级：**中**（M2 依赖，M1 不受阻塞）

## 现象 / 问题描述

磁带（M1）已由 ADR-0001 锁定 **Compatibility**（2D/UI、2D 假辉光、Web 降级）。但 M2 三频道（磁带 / 太空 / 蒸汽波）**是否每频道切渲染后端**仍未定：

- **统一单后端**（整包 Compatibility/2D）：三滤镜同为 2D 屏幕/背景级（星雾=UV 滚动+粒子、慢色偏=色带映射），可共用同一个全屏 pass 与遮罩；
- **每频道切后端**（磁带=Compatibility，太空/蒸汽波含 3D 部分=Forward+）：Compatibility 全屏 pass 与 Forward+ 全屏 pass **不通用** → 后处理栈需**双实现**，成本高。

图形程序员 A 判断**倾向整包统一 Compatibility/2D（单后端最省）**，是否切留待主程序在 M2 前拍板（[`05_m1-render-slice.md`](../../../docs/graphics-programmer-a/05_m1-render-slice.md) §五 #2、§2.3）。

## 影响 / 卡点

- M2 依赖"**频道 = 可插拔 bundle**"抽象，且 M2 关键依赖"主程序先定是否每频道切渲染后端"（[`00-project-plan.md`](../../00-project-plan.md) §三 M2）；
- 若 M1 不做可插拔 bundle 抽象 / 后端分工不定，M2 三频道可能需重构；
- 影响资源数量与显存（星雾纹理是否跨频道同源复用，见图形 A `04_` §六）。

## 尝试 / 参考

- ADR-0001（渲染器锁定 Compatibility）——仅锁 M1，明示"是否每频道切后端留给 M2 前拍板"；
- 引擎调研 [`03_godot-engine-research.md`](../../../docs/lead-programmer/03_godot-engine-research.md)：（Forward+ 光照/雾/辉光、HDR、面光源；Compatibility 无 HDR bloom）——为 M2 是否切 Forward+ 提供依据；
- 开发计划 [`00-project-plan.md`](../../00-project-plan.md) §三 M2 关键依赖。

## 解决方向 / 需求

- **需主程序在 M2 前拍板**：是否允许每频道切渲染后端，还是整包统一单后端；
- 若统一单后端：图形 A 复用同一 pass/遮罩，复杂度最低；若允许切：明确哪些频道切 Forward+、后处理栈双实现的边界与成本预估。

## 变更记录

- 2026-09-08 14:06：登记。
