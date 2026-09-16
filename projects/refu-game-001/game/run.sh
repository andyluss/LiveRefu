#!/usr/bin/env bash
# 统一入口：所有 Godot 调用都从这里走。
# 为什么设置 HOME：Godot 会在 ~/Library/Application Support/Godot 写用户数据（日志/存档）。
# 把 HOME 指到工作区内的 .godot-home，既避免污染真实用户目录，也让沙箱/CI 无需额外权限。
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export HOME="$HERE/../../../.godot-home"
mkdir -p "$HOME"
GODOT="${GODOT:-godot}"
case "${1:-run}" in
  run)      exec "$GODOT" --path "$HERE" ;;
  editor)   exec "$GODOT" -e --path "$HERE" ;;
  check)
    # 先扫一遍文件系统：新增的 class_name 脚本要先注册进 global_script_class_cache，
    # 否则无头运行会报 "Identifier ... not declared"。
    "$GODOT" --headless --path "$HERE" --import >/dev/null 2>&1 || true
    shift; exec "$GODOT" --headless --path "$HERE" res://scenes/tools/headless_sim.tscn "$@" ;;
  import)   exec "$GODOT" --headless --path "$HERE" --import ;;
  shot)     shift; exec "$GODOT" --path "$HERE" res://scenes/tools/screenshot.tscn -- "$@" ;;
  demo)     shift; exec "$GODOT" --path "$HERE" res://scenes/tools/demo.tscn -- "$@" ;;
  *)        echo "用法: $0 {run|editor|check|import}" >&2; exit 2 ;;
esac
