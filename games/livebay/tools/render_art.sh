#!/usr/bin/env bash
# 把 docs-ai/design01/art/images/*.svg 导出为同名 PNG（1600×1000）。
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ART="$HERE/../docs-ai/design01/art/images"
command -v rsvg-convert >/dev/null || { echo "需要 rsvg-convert（librsvg）" >&2; exit 1; }
for svg in "$ART"/*.svg; do
  png="${svg%.svg}.png"
  rsvg-convert -w 1600 -h 1000 "$svg" -o "$png"
  echo "rendered $(basename "$png")"
done
