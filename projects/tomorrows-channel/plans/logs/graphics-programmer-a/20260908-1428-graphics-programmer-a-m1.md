# 工作日志：图形程序员 A · M1 阶段（2026-09-08）

> 日期：2026-09-08（东八区）· 记录角色：图形程序员 A
> 文件：`logs/graphics-programmer-a/` · 时段：M1 渲染切片 + 2D 后处理栈

## 一、本时段工作

| 时间 | 做了什么 | 产出/落点 | 提交 |
| --- | --- | --- | --- |
| 13:xx | 渲染器对照切片（Compatibility vs Forward+ 的磁带 2D 后处理）+ M1 滤镜性能预算 | `docs/graphics-programmer-a/05_m1-render-slice.md` | `...` |
| 14:xx | 磁带频道 2D 后处理栈（scanline/noise/window_mask/container_glow shader + channel_fx 三层） | `game/shaders/`、`scenes/channel/channel_fx.gd` | `dd1e0d8` |

## 二、遇到的主要问题

- **渲染器选择**：磁带 2D 后处理（双光层+扫描线+微噪）是否需要 Forward+/HDR/真 bloom？结论：**不需要**。真 bloom 是 Forward+ 独占且 Compatibility 下 `Environment glow` 未实现（godot #66455），用了反绑死 Forward+、断 Web 降级。暖光用 2D 假辉光（issues technical-004/005）。
- **shader 待 Godot 内验证**：无 Godot 环境，4 个 .gdshader 未在 Godot 内编译；SCREEN_PIXEL_SIZE 在 canvas_item 可用性、uniform/Param 映射、ColorRect 全屏锚点待确认（issues technical-003）。后已由语法审查 + 主程序 headless 加载缓解。
- **执行壳渲染目标未定**：写 Godot ShaderLanguage 还是 WebGL/GLSL，取决于主程序是否 Godot 原生导出（issues technical-002）。

## 三、心得 / 经验

- **"合并单次全屏 pass + tileable 叠加"是降本杠杆**：扫描线用 tileable 纹理叠加（<0.1ms）而非屏幕重采样，把成本压住；单频道动效全开 ≈0.6–1.3ms、全关静默 ≈0.2–0.5ms，远在 ≤3ms 与 60FPS 内。
- **静默可用是一等特性**：动效做成独立可关 feature、基底（LUT+材质+静态底图+皮肤）与动效层解耦；容器暖光属基底、动效关闭仍保留——"一盏亮着的灯"才成立。
- **分层解耦防止互相污染**：信号层（频道色）/容器层（暖光）/动效层用 CanvasLayer 分，加窗口遮罩隔离，暖光只作用容器、LUT 只作用信号。
- **性能预算先算再实现**：切片文档就给预算（各 effect 耗时），约束实现不要去踩。

## 四、关键决策 / 变更

- 渲染器建议 Compatibility（已定）；暖光用 2D 假辉光（非真 bloom）；磁带动效栈"先磁带建栈、M2 共享扩展"。

## 五、遗留 / 待办

- 【待定】M2 前定"是否每频道切渲染后端"。
- 【待定】主美术磁带基调的动效样本/色值/静态回退验收（P1–P8）。
- 【待定】后处理是否盖 UI 及强度上限（issues design-001）。

## 六、变更记录

- 2026-09-08：新增本工作日志。
