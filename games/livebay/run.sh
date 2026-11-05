#!/usr/bin/env bash
# LiveBay（逍遥湾）· 统一入口
# 规则：TECH-B2（验收与不回归）
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
    exec "$GODOT" --path "$GAME" "${@:2}"
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
  numbers)
    python3 "$HERE/tools/export_numbers.py"
    exec python3 "$HERE/tools/export_mission_pack.py"
    ;;
  numbers-check)
    python3 "$HERE/tools/export_numbers.py" --check
    exec python3 "$HERE/tools/export_mission_pack.py" --check
    ;;
  pack)
    exec python3 "$HERE/tools/export_mission_pack.py"
    ;;
  pack-check)
    exec python3 "$HERE/tools/export_mission_pack.py" --check
    ;;
  merge)
    exec python3 "$HERE/tools/merge_design_html.py"
    ;;
  editor-test)
    exec "$GODOT" --headless --path "$GAME" --script tests/test_editor_bridge.gd
    ;;
  replay)
    exec "$GODOT" --headless --path "$GAME" --script tests/replay_blackbox.gd -- "${@:2}"
    ;;
  expansions-check)
    exec "$GODOT" --headless --path "$GAME" --script tests/test_expansions.gd
    ;;
  compare)
    exec "$GODOT" --headless --path "$GAME" --script tests/compare_expansions.gd -- "${@:2}"
    ;;
  *)
    echo "用法: ./run.sh [run|editor|import|test|check|editor-test|replay|expansions-check|compare|numbers|numbers-check|pack|pack-check|merge]" >&2
    echo "  run     启动游戏" >&2
    echo "  editor  打开 Godot 编辑器" >&2
    echo "  import  导入资源" >&2
    echo "  test    无头模拟测试" >&2
    echo "  check   无头启动 180 帧，抓脚本错误" >&2
    echo "  numbers        从 numbers/ 表格导出 game/data" >&2
    echo "  numbers-check  校验表格与 game/data 是否一致" >&2
    echo "  pack           编译 game/data/mission_pack.json" >&2
    echo "  pack-check     校验 MissionPack 清单是否最新" >&2
    echo "  editor-test    检查编辑器数据桥（读取 + numbers 校验）" >&2
    echo "  replay         回放最新黑匣子（可传路径）" >&2
    echo "  expansions-check 校验扩展包/preset/变体互斥" >&2
    echo "  compare        输出 L1 A/B/C 对比表" >&2
    echo "  merge          把 design01 的 HTML 融合成单文件" >&2
    exit 1
    ;;
esac
