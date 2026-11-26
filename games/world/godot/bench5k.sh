#!/usr/bin/env bash
# Godot 5k 视图/同步基准。headless 下测 CPU 侧 tick + view sync，不是 GPU 帧时间。
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
GODOT_BIN="${GODOT_BIN:-godot}"
# 先构建（cargo 需要调用方 HOME 找 rustup 默认 toolchain），再切 Godot 的 HOME。
python3 "$ROOT/test/make_5k_pack.py" "$ROOT/dist/5k-src" >/dev/null
"$ROOT/worldc" build --pack "$ROOT/dist/5k-src" --out "$ROOT/dist/demo.5k" >/dev/null
cp "$ROOT/dist/demo.5k/pack.data" "$HERE/pack.data"
"$HERE/build.sh" >/dev/null
cp "$ROOT/dist/demo.5k/pack.data" "$HERE/pack.data"
export HOME="${GODOT_HOME:-$HERE/.godot-home}"
mkdir -p "$HOME"
"$GODOT_BIN" --headless --path "$HERE" bench5k.tscn --quit-after 120
