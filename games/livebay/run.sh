#!/usr/bin/env bash
# LiveBay（逍遥湾）· 统一入口
# 与工作区其它 Godot 项目一致：把 HOME 指到 games/.godot-home，避免写用户目录。
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAME="$HERE/game"

WS_ROOT="$HERE"
while [ "$WS_ROOT" != "/" ] && [ ! -d "$WS_ROOT/.git" ]; do
  WS_ROOT="$(dirname "$WS_ROOT")"
done
export HOME="$WS_ROOT/games/.godot-home"
mkdir -p "$HOME"

GODOT="${GODOT:-godot}"
CMD="${1:-run}"

case "$CMD" in
  run)
    exec "$GODOT" --path "$GAME" "$@"
    ;;
  editor)
    exec "$GODOT" -e --path "$GAME" "${@:2}"
    ;;
  import)
    exec "$GODOT" --headless --path "$GAME" --import
    ;;
  test)
    exec "$GODOT" --headless --path "$GAME" --script tests/run_sim.gd
    ;;
  check)
    exec "$GODOT" --headless --path "$GAME" --quit-after 180
    ;;
  *)
    echo "用法: ./run.sh [run|editor|import|test|check]" >&2
    echo "  run     启动游戏" >&2
    echo "  editor  打开 Godot 编辑器" >&2
    echo "  import  导入资源" >&2
    echo "  test    无头模拟测试" >&2
    echo "  check   无头启动 180 帧，抓脚本错误" >&2
    exit 1
    ;;
esac
