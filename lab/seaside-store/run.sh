#!/usr/bin/env bash
# 本地静态服务器（ES module 不能稳定通过 file:// 加载）
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
cd "$HERE"
PORT="${1:-8035}"
echo "海边便利店 → http://127.0.0.1:${PORT}/"
echo "视角参数：?view=hero|front|detail|aerial|alley|corner|sea|store"
exec node "$ROOT/tools/serve-static.mjs" --root . --port "$PORT" --bind 127.0.0.1
