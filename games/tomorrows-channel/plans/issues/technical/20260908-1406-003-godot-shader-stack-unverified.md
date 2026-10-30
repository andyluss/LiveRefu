# 问题：M1 后处理栈未在 Godot 内验证（shader 编译/参数映射/全屏锚点）

> 状态：**open**（未解，待 Godot 编辑器逐项确认）
> 发现：2026-09-08 14:06 · 发现人：主程序（据图形程序员 A 记录）
> 类型：technical · 优先级：**高**（M1 出口"双光实机渲染"验收依赖）

## 现象 / 问题描述

当前工作区**无 Godot 4.7.x 编辑器/运行环境**，磁带频道后处理栈的四个 `.gdshader` 与 `channel_fx.gd` 的**语法 / 资源编译未在 Godot 内验证**。已知需在 Godot 里确认的点（[`game/README.md`](../../../game/README.md) §5.5 / §6.5）：

- `SCREEN_PIXEL_SIZE` 在 `canvas_item` fragment 的可用性（本栈假设叠加层铺满视口，`UV / SCREEN_PIXEL_SIZE` 得像素坐标）；
- 四个 `.gdshader` 的编译与 `uniform`（`hint_range` / `source_color` / 纹理 `repeat_enable`）映射；
- `ShaderMaterial.set_shader_parameter` 的参数类型映射（`vec4`←`Vector4`、`vec3`←`Vector3`）与 `ColorRect` 全屏锚点在 `CanvasLayer` 下的缩放。

`godot --headless` 无法加载体渲染，只能证明"无 SCRIPT ERROR / 类注册齐"，**不能**证明 shader 实机可编译、双光合成画面正确。

## 影响 / 卡点

- M1 出口标准 #1「频道氛围成立」、双光实机渲染验收（[`game/README.md`](../../../game/README.md) §6.5）依赖此项；
- 若 shader 编译失败或参数映射错误，后处理栈（扫描线/微噪/窗口遮罩/容器暖光）会整体失效，磁带氛围成立与否无法实证；
- 若 Uniform 命名/精度不符，切换皮肤 Token 注入的参数可能丢失（`vec4`/`vec3` 类型不匹配）。

## 尝试 / 参考

- 已用 `godot --headless --path game --import` / `--quit-after 5` 验证闭环逻辑（无 SCRIPT ERROR、VERIFY PASS）——仅逻辑层；
- 需在 Godot 4.7.x（Compatibility）打开 `game/` 工程逐项确认（[`game/README.md`](../../../game/README.md) §5.5）。

## 解决方向 / 需求

- **需图形程序员 A** 在 Godot 编辑器（Compatibility）打开工程，逐项确认 §5.5 清单；
- 一校验即修正，并补 "动效开/关" 两态截图作 `game/README.md` §6.5 验收证据；
- 若 `SCREEN_PIXEL_SIZE` 不可用，改用其他取像素坐标方案（如顶点/片元内联尺寸）并回填。

## 变更记录

- 2026-09-08 14:06：登记。
