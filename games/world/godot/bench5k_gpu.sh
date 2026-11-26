#!/usr/bin/env bash
# 真实窗口帧时间采集；需要显示环境。headless 下会明确标记为 headless。
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
GODOT_BIN="${GODOT_BIN:-godot}"
python3 "$ROOT/test/make_5k_pack.py" "$ROOT/dist/5k-src" >/dev/null
"$ROOT/worldc" build --pack "$ROOT/dist/5k-src" --out "$ROOT/dist/demo.5k" >/dev/null
cp "$ROOT/dist/demo.5k/pack.data" "$HERE/pack.data"
"$HERE/build.sh" >/dev/null
cp "$ROOT/dist/demo.5k/pack.data" "$HERE/pack.data"
export HOME="${GODOT_HOME:-$HERE/.godot-home}"
mkdir -p "$HOME"
restore_harbor() {
  cp "$ROOT/dist/demo.harbor/pack.data" "$HERE/pack.data" 2>/dev/null || true
}
trap restore_harbor EXIT
RENDER_ARGS=()
if [[ -n "${GODOT_RENDER_METHOD:-}" ]]; then
  RENDER_ARGS+=(--rendering-method "$GODOT_RENDER_METHOD")
fi
if [[ -n "${GODOT_RENDER_DRIVER:-}" ]]; then
  RENDER_ARGS+=(--rendering-driver "$GODOT_RENDER_DRIVER")
fi
"$GODOT_BIN" "${RENDER_ARGS[@]}" --path "$HERE" bench5k_gpu.tscn --quit-after 600
