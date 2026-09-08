# 问题：执行壳渲染目标未定（决定 shader 语言与 M2 切片开工）

> 状态：**open**（未解，待主程序拍板）
> 发现：2026-09-08 14:06 · 发现人：图形程序员 A
> 类型：technical · 优先级：**高**（阻塞 M2 滤镜材质开工；M1 前置确认）

## 现象 / 问题描述

图形侧滤镜/后处理材质写哪种 shader 语言，取决于**最终执行壳**：

- **Godot 原生导出**（macOS/Windows 原生）→ 写 **Godot ShaderLanguage**；
- **Electron/Tauri + Web** → 写 **GLSL/WebGL2**。

两种语言**不通用**。图形程序员 A 在 [`05_m1-render-slice.md`](../../../docs/graphics-programmer-a/05_m1-render-slice.md) §五 · 待定 #1 与 [`04_response-gdd.md`](../../../docs/graphics-programmer-a/04_response-gdd.md) §六 均明确：此项未定，则滤镜材质语言无法落地，**直接影响 M2 风格切片开工时间**。

## 影响 / 卡点

- 决定 Magnet/太空/蒸汽波三频道滤镜材质写哪种 shader 语言；若中段改壳，需整批重写材质；
- 影响图形侧何时能定稿 `data/fx_preset.json` 对应的材质实现；
- 与"是否每频道切渲染后端""暖光真 bloom vs 2D 假辉光"联动（见 technical-004、ADR-0001）。

## 尝试 / 参考

- 图形 A 倾向：Godot 原生导出（Compatibility，Web 降级天然覆盖），见 [`02_`/`05_m1-render-slice.md`](../../../docs/graphics-programmer-a/05_m1-render-slice.md) §2.3、「一句话给主程序」；
- 引擎调研：主程序 [`03_godot-engine-research.md`](../../../docs/lead-programmer/03_godot-engine-research.md)（Godot 4.7.x、桌面导出、Web 降级；平台导出支持）；
- 开发计划 [`00-project-plan.md`](../../00-project-plan.md) §五 风险（平台差异记 ADR）；§一「技术主线 Godot 4.7.x 桌面导出」。

## 解决方向 / 需求

- **需主程序拍板执行壳**：确认 M1/M2 以 Godot 原生导出为准（M1 已是），是否保留 Electron/Tauri+Web 作为兜底预案；
- 定案后：图形 A 按对应语言写材质；若主程序维持 Godot 原生，则 M2 前无需双实现。

## 变更记录

- 2026-09-08 14:06：登记。
