#!/usr/bin/env bash
# 构建并用 Godot 4.7 headless 跑 600 tick C ABI 哈希对账。
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$HERE/build.sh"
export HOME="${GODOT_HOME:-$HERE/.godot-home}"
mkdir -p "$HOME"
GODOT_BIN="${GODOT_BIN:-godot}"
"$HERE/../worldc" save --pack "$HERE/../data/demo.harbor" --trace "$HERE/../data/demo.harbor/tests/m0.trace.json" --out "$HERE/headless-save.json"
"$GODOT_BIN" --headless --path "$HERE" main.tscn --quit-after 10
"$HERE/../worldc" test --pack "$HERE/../data/demo.harbor" --trace "$HERE/../data/demo.harbor/tests/m0.trace.json" --events > "$HERE/headless-events.log"
tail -n +3 "$HERE/headless-events.log" > "$HERE/headless-events.jsonl"
node "$HERE/../test/events_compare.mjs" "$HERE/m2-events.jsonl" "$HERE/headless-events.jsonl"
"$HERE/../worldc" load --pack "$HERE/../data/demo.harbor" --save "$HERE/m2-save.bin" | tee "$HERE/godot-save-load.log"
grep -q "hash=0x3606a221e9990561" "$HERE/godot-save-load.log"
