#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$HERE/build.sh"
GODOT_BIN="${GODOT_BIN:-godot}"
HOME="${GODOT_HOME:-$HERE/.godot-home}" "$GODOT_BIN" --headless --path "$HERE" test.tscn --quit-after 300 2>&1 | tee "$HERE/test.log"
grep -q "GODOT TETRIS TEST PASS" "$HERE/test.log"
