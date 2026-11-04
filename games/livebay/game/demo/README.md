# LiveBay Tools · 编辑器演示

> 程序化编辑器演示场景，用于生成 `docs-ai/design01/shots/editor_usage.mp4`。
>
> **这不是桌面录屏**：macOS 的 `screencapture -v` 在当前环境无法保存视频；本演示用 Godot 重画编辑器界面与交互，动画由 `editor_demo.gd` 驱动。

## 生成

```bash
cd games/livebay
mkdir -p /tmp/editor_frames
HOME=../.godot-home godot --path game \
  --write-movie /tmp/editor_frames/frame.png \
  --fixed-fps 30 --quit-after 750 \
  res://demo/editor_demo.tscn

swiftc -module-cache-path /tmp/swift-modules \
  -Xcc -fmodules-cache-path=/tmp/clang-modules \
  game/demo/encode.swift -o /tmp/encode_editor

/tmp/encode_editor /tmp/editor_frames \
  docs-ai/design01/shots/editor_usage.mp4 30
```

- 1280×720 / 30fps / 25s / H.264；
- 750 帧；
- 字体使用 macOS `STHeiti Light`（路径在 `editor_demo.gd`）；其他系统若无该字体，中文可能回退为方块。

## 场景

| 时间 | 展示 |
| --- | --- |
| 0–3s | 打开 LiveBay Tools、2D 地图叠加 |
| 3–5s | 拖动塔位、射程预览 |
| 5–8s | 插入路径点 |
| 8–13s | 波次时间轴、W4 选中、拖动延迟 |
| 13–18s | 内嵌 SubViewport 预览 |
| 18–21s | 保存写回 `numbers/` |
| 21–25s | 命名历史与回到动作之前 |

## 边界

- 演示只模拟交互，不是实际鼠标操作；
- 视频用于展示工作流，不作为“编辑器已完全可用”的证据；
- 真实能力与限制见 [`game/addons/livebay_tools/README.md`](../addons/livebay_tools/README.md)。
