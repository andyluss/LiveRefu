#!/usr/bin/env bash
# M2 Godot CTS 基础组（L/T/I/E/V/S/X/D）无头实跑。
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$HERE/build.sh"
export HOME="${GODOT_HOME:-$HERE/.godot-home}"
mkdir -p "$HOME"
GODOT_BIN="${GODOT_BIN:-godot}"
"$GODOT_BIN" --headless --path "$HERE" cts.tscn --quit-after 60
