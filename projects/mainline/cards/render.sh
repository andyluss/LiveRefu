#!/usr/bin/env bash
# render.sh —— 把 cards.js 里的每张卡渲染成 PNG（2× 供审阅）。
#
# 为什么用 Chrome 无头渲染而不是在 Godot 里截图：
#   这里做的是**卡面设计**（版式/材质/排版），迭代频率极高；
#   HTML/CSS 改一行就能重出图，且能直接量到像素。定稿后再回灌到 GDScript 的 CardView。
#
# 用法：./render.sh            → out/<卡号>.png（2×）+ out/contact-sheet.png
# 需要：本机 Chrome（没有则回退到任意 chromium 名）
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/out"
PREVIEW="$HERE/preview.png"   # 无 sips 时的回退
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || CHROME="$(command -v google-chrome || command -v chromium || true)"
[ -x "$CHROME" ] || { echo "找不到 Chrome/Chromium，可用 CHROME=/path/to/chrome 指定" >&2; exit 2; }
mkdir -p "$OUT"

# 从 cards.js 里取卡号（避免在这里重复写一遍清单）
IDS=$(grep -o '"id": *"[^"]*"' "$HERE/cards.js" | sed 's/.*"\([^"]*\)"$/\1/')

shot() { # $1=url $2=outfile $3=W $4=H $5=scale(默认2)
  # ⚠️ 必须先删旧图：下面用"输出文件非空"判断渲染完成，旧文件在会**立即误判完成**，
  #    于是杀掉 Chrome、留下上一版的图（实测踩过：改完样式重渲，哈希一模一样）。
  rm -f "$2"
  local ud; ud="$(mktemp -d)"
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --user-data-dir="$ud" --force-device-scale-factor="${5:-2}" \
    --window-size="$3,$4" --virtual-time-budget=3000 \
    --screenshot="$2" "$1" >/dev/null 2>&1 &
  local pid=$!
  # Chrome 无头有时不自行退出，等图落地即可
  for _ in $(seq 1 40); do [ -s "$2" ] && break; sleep 0.25; done
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  rm -rf "$ud"
  # 护栏：页面报错时 Chrome 会输出一张近乎空的图（实测 <10KB）。
  # 不能让失败静默通过——产出一张白图比渲染失败更难发现。
  local sz; sz=$(wc -c < "$2" 2>/dev/null || echo 0)
  if [ "$sz" -lt 40000 ]; then
    echo "  ✗ $2 只有 ${sz} 字节，疑似页面渲染失败（JS 报错？）" >&2
    return 1
  fi
}

for id in $IDS; do
  shot "file://$HERE/index.html?card=$id" "$OUT/$id.png" 520 720
  printf '  %-16s → out/%s.png\n' "$id" "$id"
done

# 联系表：4 列（整页放大后裁切）
# 联系表入到仓库根（一张图看全 9 张，供 README 与快速阅览）；单张 2× 留在 out/（导出物，不入库）
# 尺寸控制：联系表用 1×（2× 会到 10MB）；再压成 JPEG，颗粒噪点用 PNG 压不动。
TMP_PV="$OUT/.preview.png"
shot "file://$HERE/index.html?sheet=1" "$TMP_PV" 1720 2420 1
if command -v sips >/dev/null 2>&1; then
  sips -s format jpeg -s formatOptions 80 "$TMP_PV" --out "$HERE/preview.jpg" >/dev/null 2>&1
  rm -f "$TMP_PV" "$HERE/preview.png"
  echo "  preview            → preview.jpg（$(wc -c < "$HERE/preview.jpg" | awk '{printf "%.0f", $1/1024}') KB）"
else
  mv "$TMP_PV" "$PREVIEW"
  echo "  preview            → preview.png（无 sips，未压缩）"
fi
echo "完成：out/ $(ls -1 "$OUT"/*.png 2>/dev/null | wc -l | tr -d ' ') 张 + preview.png"
echo "  （out/ 已在 .gitignore；preview.png 入库）"
