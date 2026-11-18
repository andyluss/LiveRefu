#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-8036}"
echo "海風珈琲・潮音の庭 → http://127.0.0.1:${PORT}/"
echo "截图视角：?shot=hero|terrace|interior|beach|shrine|port|night|rain|sea|start"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
