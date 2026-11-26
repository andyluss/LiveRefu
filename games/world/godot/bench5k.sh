#!/usr/bin/env bash
# Godot 5k 视图/同步基准。headless 下测 CPU 侧 tick + view sync，不是 GPU 帧时间。
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
GODOT_BIN="${GODOT_BIN:-godot}"
export HOME="${GODOT_HOME:-$HERE/.godot-home}"
mkdir -p "$HOME"
python3 "$ROOT/test/make_5k_pack.py" "$ROOT/dist/5k-src" >/dev/null
"$ROOT/worldc" build --pack "$ROOT/dist/5k-src" --out "$ROOT/dist/demo.5k" >/dev/null
cp "$ROOT/dist/demo.5k/pack.data" "$HERE/pack.data"
"$HERE/build.sh" >/dev/null
cp "$ROOT/dist/demo.5k/pack.data" "$HERE/pack.data"
"$GODOT_BIN" --headless --path "$HERE" bench5k.tscn --quit-after 120
