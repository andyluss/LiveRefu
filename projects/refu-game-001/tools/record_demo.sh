#!/usr/bin/env bash
# record_demo.sh —— 录制《节点防线》完整流程演示视频（Godot 帧序列 → H.264 MP4）。
#
# 为什么这么绕：Godot 的 Movie Maker 只能直接输出 MJPEG-AVI（本机 avconvert 读不了）
# 或 PNG 帧序列；本机没有 ffmpeg。于是用 Xcode 自带的 AVFoundation 写了一个小编码器
# （tools/make_video.swift），链路是：引擎内渲染 → PNG 帧 → H.264 MP4。
# 全程不依赖屏幕录制权限，也不需要联网。
#
# 用法：
#   tools/record_demo.sh                # 默认 540x960 @30fps
#   tools/record_demo.sh 720 1280 30    # 指定分辨率与帧率
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # 项目根
W="${1:-540}"
H="${2:-960}"
FPS="${3:-30}"

REC_DIR="$HERE/.rec"
FRAME_DIR="$REC_DIR/frames"
OUT_DIR="$HERE/docs/video"
OUT="$OUT_DIR/demo_gameplay.mp4"
ENCODER="$HERE/tools/make_video"

mkdir -p "$FRAME_DIR" "$OUT_DIR" "$HERE/.build/cache" "$HERE/.build/tmp"
find "$FRAME_DIR" -name "*.png" -delete 2>/dev/null || true
rm -f "$REC_DIR"/*.mp4

# 1) 编译编码器（首次或源码更新时）
if [ ! -x "$ENCODER" ] || [ "$HERE/tools/make_video.swift" -nt "$ENCODER" ]; then
  echo "[record] 编译编码器 tools/make_video …"
  TMPDIR="$HERE/.build/tmp" swiftc -O \
    -module-cache-path "$HERE/.build/cache" \
    -Xcc -fmodules-cache-path="$HERE/.build/cache" \
    "$HERE/tools/make_video.swift" -o "$ENCODER" 2>&1 | grep -v "was deprecated" | grep -v "^ *|" | grep -v "^ *[0-9]* |" || true
fi

# 2) 引擎内录制帧序列（帧率固定，因此录像与游戏时间一一对应、可复现）
#
# 注意：Movie Maker 的录制尺寸 = **窗口尺寸**，而工程为了在桌面上不超出屏幕，
# 把窗口覆盖成了 540×960（viewport 仍是 720×1280）。要录成 720×1280，
# 就得临时把这两行 window override 摘掉，录完立刻还原（trap 保证异常也能还原）。
echo "[record] 录制帧序列 ${W}x${H} @${FPS}fps …"
export HOME="$HERE/../.godot-home"
mkdir -p "$HOME"
PROJECT_GODOT="$HERE/game/project.godot"
BACKUP="$HERE/.rec/project.godot.bak"
cp "$PROJECT_GODOT" "$BACKUP"
restore_project() { cp "$BACKUP" "$PROJECT_GODOT"; }
trap restore_project EXIT
python3 - "$PROJECT_GODOT" "$W" "$H" <<'PYEOF'
import re, sys, pathlib
path, w, h = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
s = path.read_text(encoding="utf-8")
s = re.sub(r"window/size/window_width_override=\d+", "window/size/window_width_override=" + w, s)
s = re.sub(r"window/size/window_height_override=\d+", "window/size/window_height_override=" + h, s)
path.write_text(s, encoding="utf-8")
PYEOF
# --quit-after：演示场景若加载失败，Godot 会回退到主菜单且永不退出；用帧数上限兜底（6000 帧 = 200s）。
"${GODOT:-godot}" --path "$HERE/game" \
  --write-movie "$FRAME_DIR/frame.png" --fixed-fps "$FPS" --quit-after 6000 \
  res://scenes/tools/demo.tscn 2>&1 | grep -E "Demo|ERROR|frames at" || true
restore_project
trap - EXIT

FRAMES=$(ls "$FRAME_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
if [ "$FRAMES" = "0" ]; then
  echo "[record] 没有录到任何帧，检查上面的 ERROR" >&2
  exit 1
fi
# 正常约 2700 帧（92 秒）；超过 4000 说明演示场景没加载、录到了回退的主菜单。
if [ "$FRAMES" -gt 4000 ]; then
  echo "[record] 帧数异常（$FRAMES > 4000）：演示场景很可能加载失败，请检查上面的 SCRIPT ERROR" >&2
  exit 1
fi

# 3) 编码成 MP4
echo "[record] 编码 $FRAMES 帧 → $OUT"
"$ENCODER" "$FRAME_DIR" "$OUT" "$FPS" "$W" "$H"

# 4) 验收：让系统解码器读一遍，打印时长/尺寸/码率
"$ENCODER" --probe "$OUT"

# 5) 清理帧（保留 MP4；需要重编码时可加 --keep-frames）
if [ "${4:-}" != "--keep-frames" ]; then
  rm -rf "$FRAME_DIR"
  echo "[record] 已清理中间帧（加 --keep-frames 可保留）"
fi
