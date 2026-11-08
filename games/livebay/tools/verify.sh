#!/usr/bin/env bash
# LiveBay · 一键全量验收
# 由 ./run.sh verify 调用；失败项继续跑完，最后汇总。
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN="$HERE/run.sh"
WS_ROOT="$HERE"
while [ "$WS_ROOT" != "/" ] && [ ! -d "$WS_ROOT/.git" ]; do WS_ROOT="$(dirname "$WS_ROOT")"; done

pass=0
fail=0

run_step() {
  local label="$1"; shift
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ $label"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if "$@"; then
    echo "✓ PASS  $label"
    pass=$((pass + 1))
  else
    echo "✗ FAIL  $label"
    fail=$((fail + 1))
  fi
}

run_step "无头模拟测试" "$RUN" test
run_step "扩展包检查" "$RUN" expansions-check
run_step "编辑器数据桥" "$RUN" editor-test
run_step "三张地图无头试玩" "$RUN" playtest
run_step "生存玩法与数值矩阵" "$RUN" survival-test
run_step "数值与 data 一致" "$RUN" numbers-check
run_step "MissionPack 清单" "$RUN" pack-check
run_step "流程图生成物" "$RUN" flow-check
run_step "数值沙盘生成物" "$RUN" simulator-check
run_step " briefing GUIDE/HUB 对账" "$RUN" briefing-check
run_step "无头启动 180 帧" "$RUN" check

# 文档链接（只扫 LiveBay）
run_step "Markdown 内部链接" python3 "$WS_ROOT/tools/check_links.py" --sub "$HERE"

# R-016：设计文档 HTML + briefing + flows + simulator + 工作区 HUB
HTML_FILES="$(find "$HERE/docs-ai/design01/html" -name '*.html' -print)
$HERE/briefing/HUB.html
$HERE/briefing/GUIDE.html
$(find "$HERE/docs-ai/design01/flows" -name '*.html' -print)
$HERE/docs-ai/design01/simulator/index.html
$WS_ROOT/HUB.html"
# shellcheck disable=SC2086
run_step "生成式 HTML 三态 (R-016)" node "$WS_ROOT/design/tools/check_html_theme.ts" $HTML_FILES

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "验收汇总：PASS $pass · FAIL $fail"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$fail" -ne 0 ]; then
  exit 1
fi
exit 0
