#!/usr/bin/env bash
# 构建 M2 最小 Godot GDExtension，并准备无头哈希场景。
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
export CARGO_HOME="${CARGO_HOME:-$ROOT/code/.cargo-home}"

EXT="$ROOT/godot-extension"
cargo build --manifest-path "$EXT/Cargo.toml" --release
mkdir -p "$HERE/bin"
case "$(uname -s)" in
  Darwin) cp "$EXT/target/release/libworld_godot.dylib" "$HERE/bin/" ;;
  Linux) cp "$EXT/target/release/libworld_godot.so" "$HERE/bin/" ;;
  *) echo "unsupported host; copy the extension manually" >&2; exit 1 ;;
esac
mkdir -p "$ROOT/dist/demo.harbor"
"$ROOT/worldc" build --pack "$ROOT/data/demo.harbor" --out "$ROOT/dist/demo.harbor" >/dev/null
cp "$ROOT/dist/demo.harbor/pack.data" "$HERE/pack.data"
if command -v "${GODOT_BIN:-godot}" >/dev/null 2>&1; then
  export HOME="${GODOT_HOME:-$HERE/.godot-home}"
  mkdir -p "$HOME"
  "${GODOT_BIN:-godot}" --headless --path "$HERE" --import >/dev/null
fi
echo "godot adapter built: $HERE"
