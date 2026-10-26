#!/usr/bin/env bash
# LRDS 一键验收：四道通用闸门 + 风格卡对账 + 各自自检 + 生成物对账。
# 用法：bash design/tools/check.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

run() {
  echo ""
  echo "── $* ──"
  node "$@"
}

run design/tools/check_tokens.ts --self-test
run design/tools/check_tokens.ts
run design/tools/check_contrast.ts --self-test
run design/tools/check_contrast.ts
run design/tools/check_no_raw_values.ts --self-test
run design/tools/check_no_raw_values.ts
run design/tools/build_tokens.ts --self-test
run design/tools/build_tokens.ts --check
run design/tools/check_tomorrows_channel_skin.ts --self-test
run design/tools/check_tomorrows_channel_skin.ts
run design/tools/check_component_contracts.ts --self-test
run design/tools/check_component_contracts.ts
run design/tools/build_web_kit.ts --self-test
run design/tools/build_web_kit.ts --check
run design/tools/check_component_usage.ts --self-test
run design/tools/check_component_usage.ts
run design/tools/build_hub.ts --self-test
run design/tools/build_hub.ts --check

echo ""
echo "✓ LRDS 设计系统闸门全部通过（含风格卡对账）"
