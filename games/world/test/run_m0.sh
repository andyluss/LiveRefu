#!/usr/bin/env bash
# M0 验收：确定性、存档、坏包、C ABI 同哈希、wasm+QuickJS。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODE="$ROOT/code"
export CARGO_HOME="$CODE/.cargo-home"
export AR="${AR:-/opt/homebrew/opt/llvm/bin/llvm-ar}"
export RANLIB="${RANLIB:-/opt/homebrew/opt/llvm/bin/llvm-ranlib}"

cd "$CODE"

echo "== 1. Rust 测试 =="
cargo test -q --workspace

echo "== 2. 内容包校验（正例） =="
cargo run -q -p world-cli -- validate

echo "== 3. 确定性双跑 =="
TEST_OUT="$(cargo run -q -p world-cli -- test)"
echo "$TEST_OUT"
HEADLESS_HASH="$(printf '%s\n' "$TEST_OUT" | sed -n 's/.*hash=\(0x[0-9a-f]*\).*/\1/p' | head -1)"
if [ -z "$HEADLESS_HASH" ]; then echo "无法解析 headless hash"; exit 1; fi
cargo run -q -p world-cli -- replay --trace "$ROOT/data/demo.harbor/tests/m0.trace.json" --expect "$HEADLESS_HASH"

echo "== 4. 坏包校验（5 类） =="
for d in "$ROOT"/test/fixtures/invalid/*; do
  set +e
  OUT="$(cargo run -q -p world-cli -- validate --pack "$d" 2>&1)"
  CODE_EXIT=$?
  set -e
  if [ "$CODE_EXIT" -eq 0 ]; then
    echo "坏包未报错: $d"; echo "$OUT"; exit 1
  fi
  printf '  %-42s %s\n' "$(basename "$d")" "$(printf '%s\n' "$OUT" | grep -o 'E-[A-Z]*-[0-9]*' | head -1)"
done

echo "== 5. build + C ABI 宿主 =="
cargo run -q -p world-cli -- build --out "$ROOT/dist/demo.harbor"
cargo build -q -p world-ffi
cc "$CODE/hosts/c/main.c" -I "$CODE/include" \
  -L "$CODE/target/debug" -lworld_ffi \
  -Wl,-rpath,"$CODE/target/debug" \
  -o "$ROOT/dist/c_host"
C_OUT="$("$ROOT/dist/c_host" --pack "$ROOT/dist/demo.harbor/pack.data")"
echo "$C_OUT"
C_HASH="$(printf '%s\n' "$C_OUT" | sed -n 's/.*final_hash=\(0x[0-9a-f]*\).*/\1/p')"
if [ "$C_HASH" != "$HEADLESS_HASH" ]; then
  echo "C ABI 哈希不一致: headless=$HEADLESS_HASH c=$C_HASH"; exit 1
fi
echo "C ABI 同哈希: $C_HASH"

echo "== 6. wasm32 + QuickJS =="
RUSTC="$(rustup which rustc)" rustup run stable cargo build --release \
  --target wasm32-unknown-unknown -p world-script-wasm
node "$ROOT/test/wasm_quickjs.mjs" \
  "$CODE/target/wasm32-unknown-unknown/release/world_script_wasm.wasm"

echo "== 7. 基准 =="
cargo run -q -p world-cli -- bench

echo "M0 PASS"
