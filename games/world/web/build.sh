#!/usr/bin/env bash
# 构建 M1 Web 预览：JSON 包 + wasm 内核 + wasm-bindgen 胶水。
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODE="$ROOT/code"
export CARGO_HOME="${CARGO_HOME:-$CODE/.cargo-home}"

# macOS 自带 ar 产 BSD archive；wasm 目标需要 GNU archive，QuickJS 静态库才能链接。
if [[ "$(uname -s)" == "Darwin" ]]; then
  for prefix in /opt/homebrew/opt/llvm /usr/local/opt/llvm; do
    if [[ -x "$prefix/bin/llvm-ar" ]]; then
      export AR="${AR:-$prefix/bin/llvm-ar}"
      export RANLIB="${RANLIB:-$prefix/bin/llvm-ranlib}"
      break
    fi
  done
fi

cd "$CODE"

echo "== build content packs =="
for id in demo.harbor demo.market demo.greenhouse demo.orbit; do
  cargo run -q -p world-cli -- bake nav --pack "$ROOT/data/$id" >/dev/null
  cargo run -q -p world-cli -- build --pack "$ROOT/data/$id" --out "$ROOT/dist/$id"
done
mkdir -p "$ROOT/web/packs"
for id in demo.harbor demo.market demo.greenhouse demo.orbit; do
  cp "$ROOT/dist/$id/pack.data" "$ROOT/web/packs/$id.data"
done

echo "== build wasm =="
if command -v rustup >/dev/null 2>&1; then
  export RUSTC="$(rustup which rustc)"
  rustup run stable cargo build --release --target wasm32-unknown-unknown -p world-wasm
else
  cargo build --release --target wasm32-unknown-unknown -p world-wasm
fi

echo "== wasm-bindgen (web) =="
wasm-bindgen --target web --out-dir "$ROOT/web/pkg" \
  "$CODE/target/wasm32-unknown-unknown/release/world_wasm.wasm"

echo "== wasm-bindgen (node, for tests) =="
wasm-bindgen --target nodejs --out-dir "$ROOT/web/node-pkg" \
  "$CODE/target/wasm32-unknown-unknown/release/world_wasm.wasm"

printf '{"type":"commonjs"}\n' > "$ROOT/web/node-pkg/package.json"
mkdir -p "$ROOT/web/node-pkg/node_modules/env"
printf 'exports.__rquickjs_host_now_us = () => 0;\n' > "$ROOT/web/node-pkg/node_modules/env/index.js"

cp "$ROOT/dist/demo.harbor/pack.data" "$ROOT/web/pack.data"
cp "$ROOT/data/demo.harbor/tests/m0.trace.json" "$ROOT/web/m0.trace.json"

echo "web build: $ROOT/web"
echo "run: cd $ROOT && node tools/serve-web.mjs --port 8787"
