#!/usr/bin/env bash
# M1 切片验收：TS DSL → 规范化包 → 与 JSON 包同哈希 → wasm Web 预览同哈希。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODE="$ROOT/code"
export CARGO_HOME="${CARGO_HOME:-$CODE/.cargo-home}"

cd "$ROOT"

echo "== 0. TypeScript 类型检查 =="
if [ -x "$ROOT/node_modules/.bin/tsc" ]; then
  "$ROOT/worldc" ts-check
else
  echo "skip: 未安装 typescript（cd games/world && npm install）"
fi

echo "== 1. TS DSL 编译 + 与 JSON 包对比 =="
"$CODE/run.sh" run -q -p world-cli -- ts-build \
  --src "$ROOT/src/content/demo.harbor" \
  --out "$ROOT/dist/ts/demo.harbor" \
  --compare "$ROOT/data/demo.harbor"

echo "== 2. TS 包跑 M0 trace =="
"$CODE/run.sh" run -q -p world-cli -- test \
  --pack "$ROOT/dist/ts/demo.harbor" \
  --trace "$ROOT/data/demo.harbor/tests/m0.trace.json"

echo "== 3. 内容测试 =="
"$CODE/run.sh" run -q -p world-cli -- content-test --pack "$ROOT/data/demo.harbor"

echo "== 4. 编辑器服务器冒烟 =="
node "$ROOT/test/editor_smoke.mjs"

echo "== 5. 构建 Web 预览（wasm + wasm-bindgen） =="
"$ROOT/web/build.sh"

echo "== 6. 5k 合成基准 =="
"$CODE/run.sh" run -q --release -p world-cli -- bench --synthetic 5000 --ticks 600

echo "== 7. 3D 演示静态契约 =="
node "$ROOT/test/demo3d_static.mjs"

echo "== 8. R-016 三态主题检查 =="
node "$ROOT/../../design/tools/check_html_theme.ts" "$ROOT/web/index.html" "$ROOT/web/editor.html" "$ROOT/web/demo3d.html"

echo "== 9. wasm 预览逻辑测试 =="
node "$ROOT/web/test_preview.cjs"

echo "M1 PASS"
