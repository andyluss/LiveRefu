#!/usr/bin/env bash
# Future Debris（未来残片）· 统一入口：所有 Godot 调用与验收都从这里走。
#
# 为什么设置 HOME：Godot 会在 ~/Library/Application Support/Godot 写用户数据（日志/缓存）。
# 指到工作区内的 .godot-home 既不污染真实用户目录，也让沙箱/CI 无需额外权限（沿用 refu-game-001 的做法）。
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAME="$HERE/game"
# 上溯找工作区根（含 .git 的那一层），而不是靠数 ".." 的层数：
# 层数一旦写错就会把 HOME 指到工作区外（沙箱会拒绝写入），且错误信息只有一行 mkdir。
WS_ROOT="$HERE"
while [ "$WS_ROOT" != "/" ] && [ ! -d "$WS_ROOT/.git" ]; do
  WS_ROOT="$(dirname "$WS_ROOT")"
done
export HOME="$WS_ROOT/.godot-home"
mkdir -p "$HOME"
GODOT="${GODOT:-godot}"

need_godot() {
  if ! command -v "$GODOT" >/dev/null 2>&1; then
    echo "找不到 Godot（$GODOT）。请安装 Godot 4.7 或设置 GODOT=/path/to/godot" >&2
    exit 2
  fi
}

# 无头跑一个场景并断言：脚本错误、解析错误、加载失败都算失败。
# 为什么不用退出码就够：Godot 对部分脚本错误仍返回 0，必须扫日志（既有教训）。
headless_assert() {
  local scene="$1"; shift
  local out
  set +e
  out="$("$GODOT" --headless --path "$GAME" --quit-after 300 "$scene" "$@" 2>&1)"
  local status=$?
  set -e
  echo "$out"
  if echo "$out" | grep -qE "SCRIPT ERROR|Parse Error|Failed to load|BOOT FAILED|Cannot open"; then
    echo "── 失败详情 ──" >&2
    echo "$out" | grep -E "SCRIPT ERROR|Parse Error|Failed to load|BOOT FAILED|Cannot open" -A3 | head -30 >&2
    return 1
  fi
  if [ "$status" -ne 0 ]; then
    echo "── Godot 退出码 $status ──" >&2
    return 1
  fi
  if ! echo "$out" | grep -q "BOOT OK"; then
    echo "── 未观察到成功标记 BOOT OK ──" >&2
    return 1
  fi
  return 0
}

case "${1:-run}" in
  run)    need_godot; exec "$GODOT" --path "$GAME" ;;
  editor) need_godot; exec "$GODOT" -e --path "$GAME" ;;

  lint)
    shift
    exec python3 "$HERE/tools/check_file_size.py" "$@"
    ;;

  data)
    shift
    exec python3 "$HERE/tools/check_data.py" "$@"
    ;;

  boot)
    # 只跑无头自检（不跑其它闸门），用于快速确认工程还能装载。
    shift
    need_godot
    "$GODOT" --headless --path "$GAME" --import >/dev/null 2>&1 || true
    headless_assert "res://scenes/tools/boot_probe.tscn" "$@"
    echo "无头自检：PASS"
    ;;

  check)
    # 五道闸门（S1.1）：文件预算 → 数据契约 → 视觉 token → 工程装载 → 无头自检。
    # 顺序有讲究：静态错误最便宜，先跑；需要引擎的最后跑。
    echo "══ Future Debris · 验收闸门（S1.1）══"
    echo "── 1/5 文件预算 ──"
    python3 "$HERE/tools/check_file_size.py" --self-test
    echo "── 2/5 数据契约 ──"
    python3 "$HERE/tools/check_data.py" --self-test
    echo "── 3/5 视觉 token（对比度 + 层级亮度顺序 + 样张色彩越界） ──"
    python3 "$HERE/tools/check_contrast.py" --self-test
    echo "── 4/5 工程导入（Godot 装载） ──"
    need_godot
    "$GODOT" --headless --path "$GAME" --import >/dev/null 2>&1 || true
    echo "导入完成"
    echo "── 5/5 无头自检 ──"
    headless_assert "res://scenes/tools/boot_probe.tscn" "$@"
    echo "══ 全部闸门通过 ══"
    ;;

  contrast)
    shift
    exec python3 "$HERE/tools/check_contrast.py" "$@"
    ;;

  *)
    echo "用法: $0 {run|editor|check|boot|lint|data|contrast}" >&2
    exit 2
    ;;
esac
