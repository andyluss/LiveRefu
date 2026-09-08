# 问题：Godot 平台系统集成缺口（托盘/全局快捷键/勿扰）——首期第 1 大风险

> 状态：**open**（未解，待 M1 后系统集成切片 spike 验证）
> 发现：2026-09-08 14:06 · 发现人：主程序
> 类型：risk · 优先级：**高**（高概率/高影响，GDD §10 风险 1）

## 现象 / 问题描述

主程序（[`04_response-gdd.md`](../../../docs/lead-programmer/04_response-gdd.md) §1.3、§3）评估：需要"常驻后台/托盘/迷你窗/全局快捷键/系统勿扰"的**系统级集成能力**，但 Godot 原生支持**不完整**：

| 能力 | Godot 原生 | 状态 |
| --- | --- | --- |
| 后台常驻低功耗 | `OS.set_low_processor_usage_mode` 等 | ✅ 原生 |
| 迷你窗/悬浮小窗 | 多 `Window` + `DisplayServer.window_*` | ✅ 原生 |
| 系统托盘图标 | **无原生 TrayIcon** | ⚠️ 需薄原生桥（GDExtension/插件） |
| 全局快捷键（跨应用） | `Input` 仅应用内 | ⚠️ 需 GDExtension（CGEventTap / RegisterHotKey） |
| 系统勿扰集成 | 无原生 | ❌ 后置 |

这是 **GDD §10 风险 1（后台/勿扰/快捷键平台差异，高/高）**，是首期**第 1 大风险**。差异集中在"系统级集成"，而非渲染。

## 影响 / 卡点

- 若薄原生桥（插件 + GDExtension）成本不可控，需降级"无托盘、有迷你小窗、无系统勿扰"版本；影响 GDD §9/§10 的"陪伴"体验（常驻+快捷键）；
- macOS / Windows 双端差异大，需把双端差异收敛到一个适配层。

## 尝试 / 参考

- 主程序 [`04_response-gdd.md`](../../../docs/lead-programmer/04_response-gdd.md) §1.3 薄原生桥方案：优先找/vetted Godot 4.x 社区插件（托盘/快捷键，接 `addons/`）；缺口由图形 A/主程序用 **GDExtension（C++/Rust）** 写 `system_integration` 模块（封装托盘/全局快捷键/勿扰查询）；兜底 = Electron/Tauri 宿主壳（M1 后 spike 评估）；
- 开发计划 [`00-project-plan.md`](../../00-project-plan.md) §三 M1（App 壳 spike 先行）、§五 风险 1（M1 独立 spike；降级"关窗→隐藏迷你窗+应用内快捷键"）；平台差异记 ADR。

## 解决方向 / 需求

- **主程序**：M1 后做系统集成切片（spike）验证插件/GDExtension 可行性；出薄原生桥能力评估与双端适配层设计；
- 若 spike 发现成本失控：按预案降级"无托盘/有迷你小窗/无系统勿扰"版本，系统勿扰明确标非首期；
- 期间把结论回写（ADR）供 M2/M3 决定是否投入。

## 变更记录

- 2026-09-08 14:06：登记。
