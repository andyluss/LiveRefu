#!/usr/bin/env bash
# LRDS v0.1 一键验收：四道闸门 + 各自自检 + 生成物对账。
# 用法：bash design/tools/check.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

run() {
  echo ""
  echo "── $* ──"
  node --experimental-strip-types "$@"
}

run design/tools/check_tokens.ts --self-test
run design/tools/check_tokens.ts
run design/tools/check_contrast.ts --self-test
run design/tools/check_contrast.ts
run design/tools/check_no_raw_values.ts --self-test
run design/tools/check_no_raw_values.ts
run design/tools/build_tokens.ts --self-test
run design/tools/build_tokens.ts --check

echo ""
echo "✓ LRDS v0.1 四道闸门全部通过"
