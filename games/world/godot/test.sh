#!/usr/bin/env bash
# 构建并用 Godot 4.7 headless 跑 600 tick C ABI 哈希对账。
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$HERE/build.sh"
export HOME="${GODOT_HOME:-$HERE/.godot-home}"
mkdir -p "$HOME"
GODOT_BIN="${GODOT_BIN:-godot}"
"$GODOT_BIN" --headless --path "$HERE" --import >/dev/null
"$GODOT_BIN" --headless --path "$HERE" main.tscn --quit-after 10
