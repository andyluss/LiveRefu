#!/usr/bin/env bash
# render.sh —— 把 cards.js 里的每张卡渲染成 WebP。
#
# 产出：
#   out/<theme>-<size>/<卡号>.webp   全套 2× 渲染（导出物，已 gitignore）
#   preview-light.webp               9 张联系表（杂志式 · 中号）
#   preview-dark.webp                9 张联系表（暗卡 · 中号）
#   preview-compare.webp             两朝向并排对比（同一批卡、同一尺寸）
#   preview-sizes.webp               同一张卡的 大/中/小 三档
#
# 为什么用 Chrome 无头而不是在 Godot 里截图：
#   这里做的是**卡面设计**（版式/材质/排版），迭代频率极高，改一行 CSS 就能重出图。
#   定稿后再把「材质分层 + 字号/间距 + 稀有度处理」回灌到 GDScript 的 CardView。
#
# 用法：./render.sh              全出（54 张 + 4 预览）
#       ./render.sh --preview    只重出 4 张预览（快）
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/out"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || CHROME="$(command -v google-chrome || command -v chromium || true)"
[ -x "$CHROME" ] || { echo "找不到 Chrome/Chromium；可用 CHROME=/path/to/chrome 指定" >&2; exit 2; }
command -v cwebp >/dev/null || { echo "找不到 cwebp（brew install webp）" >&2; exit 2; }
mkdir -p "$OUT"

# 画质：用户要求"先不压大小" → 高质量，不追求体积
Q="${WEBP_Q:-95}"

shot() { # $1=url $2=输出png $3=W $4=H $5=scale(默认2)
  # ⚠️ 必须先删旧图：下面用"输出文件非空"判断完成，旧文件在会**立即误判完成**并杀掉 Chrome，
  #    留下上一版的图（踩过：改完样式重渲，哈希一模一样）。
  rm -f "$2"
  local ud; ud="$(mktemp -d)"
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --user-data-dir="$ud" --force-device-scale-factor="${5:-2}" \
    --window-size="$3,$4" --virtual-time-budget=3000 \
    --screenshot="$2" "$1" >/dev/null 2>&1 &
  local pid=$!
  for _ in $(seq 1 56); do [ -s "$2" ] && break; sleep 0.15; done
  kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true
  rm -rf "$ud"
  # 护栏：页面 JS 报错时 Chrome 会输出近乎空的图。失败不能静默通过。
  local sz; sz=$(wc -c < "$2" 2>/dev/null || echo 0)
  if [ "$sz" -lt 40000 ]; then
    echo "  ✗ $(basename "$2") 只有 ${sz} 字节，疑似渲染失败（JS 报错？）" >&2
    return 1
  fi
}

to_webp() { # $1=png $2=webp
  cwebp -quiet -q "$Q" -m 6 -mt "$1" -o "$2" >/dev/null 2>&1
  rm -f "$1"
}

preview() { # $1=查询串 $2=输出名 $3=W $4=H
  local tmp; tmp="$(mktemp -t pv).png"
  shot "file://$HERE/index.html?$1" "$tmp" "$3" "$4" 1
  to_webp "$tmp" "$HERE/$2"
  printf '  %-22s %5s KB\n' "$2" "$(wc -c < "$HERE/$2" | awk '{printf "%.0f", $1/1024}')"
}

IDS=$(grep -o '"id": *"[^"]*"' "$HERE/cards.js" | sed 's/.*"\([^"]*\)"$/\1/')

if [ "${1:-}" != "--preview" ]; then
  echo "—— 全套渲染：2 朝向 × 3 尺寸 × $(echo "$IDS" | wc -l | tr -d ' ') 张 ——"
  for theme in light dark; do
    for size in l m s; do
      dir="$OUT/$theme-$size"; mkdir -p "$dir"
      case "$size" in l) W=520; H=720;; m) W=420; H=582;; s) W=340; H=471;; esac
      for id in $IDS; do
        tmp="$(mktemp -t card).png"
        shot "file://$HERE/index.html?card=$id&theme=$theme&size=$size" "$tmp" "$W" "$H" 2
        to_webp "$tmp" "$dir/$id.webp"
      done
      printf '  %-12s %s 张\n' "$theme-$size" "$(ls -1 "$dir" | wc -l | tr -d ' ')"
    done
  done
fi

echo "—— 预览 ——"
preview "theme=light&size=m&mode=grid"    "preview-light.webp"   1400 2200
preview "theme=dark&size=m&mode=grid"     "preview-dark.webp"    1400 2200
preview "theme=light&size=s&mode=compare" "preview-compare.webp" 1520 1320
preview "theme=dark&size=l&mode=scale"    "preview-sizes.webp"   1420 900

echo
echo "总计：out/ $(find "$OUT" -name '*.webp' 2>/dev/null | wc -l | tr -d ' ') 张（已 gitignore）+ 4 张预览（入库）"
