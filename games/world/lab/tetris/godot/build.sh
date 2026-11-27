#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
export CARGO_HOME="${CARGO_HOME:-$ROOT/code/.cargo-home}"
EXT="$ROOT/godot-extension"

echo "== build RefuWorld Godot extension =="
cargo build --manifest-path "$EXT/Cargo.toml" --release
mkdir -p "$HERE/bin"
case "$(uname -s)" in
  Darwin) cp "$EXT/target/release/libworld_godot.dylib" "$HERE/bin/" ;;
  Linux) cp "$EXT/target/release/libworld_godot.so" "$HERE/bin/" ;;
  *) echo "unsupported host: copy godot-extension/target/release/* to lab/tetris/godot/bin/" >&2; exit 1 ;;
esac

echo "== build shared lab.tetris pack =="
"$ROOT/worldc" build --pack "$ROOT/data/lab.tetris" --out "$ROOT/dist/lab.tetris"
cp "$ROOT/dist/lab.tetris/pack.data" "$HERE/refuworld.pack.data"
mkdir -p "$HERE/.godot"
printf 'res://world_godot.gdextension\n' > "$HERE/.godot/extension_list.cfg"
echo "godot tetris built: $HERE"
