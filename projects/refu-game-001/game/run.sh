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
    python3 "$HERE/../tools/check_file_size.py" || LINT_FAILED=1
    "$GODOT" --headless --path "$HERE" --import >/dev/null 2>&1 || true
    "$HERE/run.sh" smoke || exit 1
    shift; exec "$GODOT" --headless --path "$HERE" res://scenes/tools/headless_sim.tscn "$@" ;;
  import)   exec "$GODOT" --headless --path "$HERE" --import ;;
  shot)     shift; exec "$GODOT" --path "$HERE" res://scenes/tools/screenshot.tscn -- "$@" ;;
  demo)     shift; exec "$GODOT" --path "$HERE" res://scenes/tools/demo.tscn -- "$@" ;;
  lint)     shift; exec python3 "$HERE/../tools/check_file_size.py" "$@" ;;
  smoke)
    # 无头冒烟：把演示场景跑 4 秒，任何 SCRIPT ERROR 都算失败。
    # 为什么需要它：验收用例只驱动 core/，界面与工具链的接线错误（漏声明成员、场景名写错）
    # 不会被 19 条用例发现，却会让录像整段失败。
    out=$("$GODOT" --headless --path "$HERE" --quit-after 120 res://scenes/tools/demo.tscn 2>&1)
    if echo "$out" | grep -q "SCRIPT ERROR"; then
      echo "$out" | grep -A3 "SCRIPT ERROR" | head -20
      echo "冒烟测试：FAIL（演示场景有脚本错误）"; exit 1
    fi
    echo "冒烟测试：PASS（演示场景 4 秒无脚本错误）" ;;
  *)        echo "用法: $0 {run|editor|check|import}" >&2; exit 2 ;;
esac
