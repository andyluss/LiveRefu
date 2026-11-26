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
rm -rf "$HERE/assets"
mkdir -p "$HERE/assets"
cp -R "$ROOT/data/demo.harbor/art" "$HERE/assets/art"
cp -R "$ROOT/data/demo.harbor/audio" "$HERE/assets/audio"
# 直接写 GDExtension 清单，避免 Linux headless --import 在 CI 上 core dump。
mkdir -p "$HERE/.godot"
printf 'res://world_godot.gdextension\n' > "$HERE/.godot/extension_list.cfg"
echo "godot adapter built: $HERE"
