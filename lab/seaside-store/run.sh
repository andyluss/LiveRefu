#!/usr/bin/env bash
# 本地静态服务器（ES module 不能稳定通过 file:// 加载）
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-8035}"
echo "海边便利店 → http://127.0.0.1:${PORT}/"
echo "视角参数：?view=hero|front|detail|aerial|alley|corner|sea|store"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
