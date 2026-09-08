# ADR-0001：渲染器锁定 Compatibility（2D/UI 为主）

> 状态：**accepted（已定）**
> 日期：2026-09-08（东八区）
> 决策者：主程序 + 图形程序员 A（项目方确认）

## 背景

《明日频道》是**氛围陪伴应用**（非传统游戏），主载体为 2D/UI + 内容播放、弱 3D。M1 = 单频道（磁带暖未来）闭环，其 2D 后处理（容器暖光×频道色双层光 + 扫描线 + 微噪）需确定渲染器，避免中段返工。

## 候选方案

- **方案 A：Compatibility（OpenGL/WebGL）**——2D/UI 完整、低功耗、支持 Web 降级；2D 假辉光/扫描线原生支持；磁带所需的 2D 后处理无需特别渲染特性。
- **方案 B：Forward+**——支持 HDR / 真 bloom / 屏幕发光，复古视觉更强；但这些为 Forward+ 独占，Compatibility(OpenGL) 下 Environment glow 未实现（godotengine #66455），且 Forward+/Mobile(Vulkan) 不上 Web → 断掉 Web 降级。

## 决策

**选定：方案 A（Compatibility）。**

M1 磁带的 2D 后处理（双层光 + 扫描线 + 微噪）**不需要 Forward+ / HDR / 真 bloom**；暖光用 **2D 假辉光**（径向渐变/PointLight2D/加法小范围）即可。Compatibility = WebGL 是 Web 端可用后端，**一次到位、Web 降级零返工**。建议整包三频道统一 Compatibility/2D 单后端（是否每频道切后端留给 M2 前拍板，M1 不涉及切换）。

## 理由

- M1 验证的是"陪伴手感"（闭不闭环），**不在 M1 提前投入滤镜/美术**（开发计划风险 #4）；Compatibility 足以支撑磁带最小氛围。
- 磁带 2D 后处理预算（动效全开 ≈0.6–1.3ms / 全关 ≈0.2–0.5ms）在 Compatibility 下远低于 ≤3ms 预算与 60FPS（16.7ms）。
- 保留 Web 降级能力，降低后续平台风险。

## 影响

- 正面：低功耗、Web 降级友好、2D 后处理成本可控、避免 Forward+ 绑定。
- 需留意：若 M2 太空/蒸汽波频道需要更强的 3D/辉光，届时评估是否切 Forward+（或保持单后端最省）；`project.godot` 按 Compatibility 配置。
- 关联：主程序 [`01_tech-stack-draft.md`](../../docs/lead-programmer/01_tech-stack-draft.md)（渲染器确认）、图形程序员 A [`05_m1-render-slice.md`](../../docs/graphics-programmer-a/05_m1-render-slice.md)（对照切片）、开发计划 [`00-project-plan.md`](../00-project-plan.md)（M1 第一周必锁）。

## 变更记录

- 2026-09-08：新增本决策（渲染器锁定 Compatibility；图形 A 切片建议 + 主程序确认 + 项目方确认）。
