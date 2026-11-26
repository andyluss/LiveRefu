#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
cd "$HERE"
PORT="${1:-8036}"
echo "海風珈琲・潮音の庭 → http://127.0.0.1:${PORT}/"
echo "截图视角：?shot=hero|terrace|interior|beach|shrine|port|night|rain|sea|start"
exec node "$ROOT/tools/serve-static.mjs" --root . --port "$PORT" --bind 127.0.0.1
