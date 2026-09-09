#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
data_invariants —— S5 · 数据不变量可视化（图表）。

读主项目 `data/tables/*.json`，把**数据不变量**画成图，让人类用视觉直觉复核"数值/配比是否符合设计直觉"：
  - 稀有度配比（actual vs 设计 70/25/5）——发现配比偏离。
  - 各时段 duration_min 是否落在 [focus_min, focus_max]。
  - 各轨 default_volume 是否在 [0,1]。
  - 各稀有度 collect_frag 初值（3/5/8）。
  - 每频道 LUT/容器 token 数量是否 ≥ 最低要求。

只锚定**可验证数据**（表内数值 + schema 范围 + 设计配比常数）。

产出：viz/data-invariants.html / .json
"""
import datetime
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def find_workspace_root():
    d = os.path.dirname(os.path.abspath(__file__))
    while True:
        if os.path.isdir(os.path.join(d, ".git")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return d
        d = parent


ROOT = find_workspace_root()
DATA = os.path.join(ROOT, "projects", "tomorrows-channel", "data", "tables")
OUT = os.path.join(ROOT, "lab", "formal-system", "concerns", "visual-fallback", "viz", "data-invariants")
DESIGN_RATIO = {"common": 70, "rare": 25, "cult": 5}  # 设计配比(%) (GDD §1.3)


def load(name):
    try:
        return json.load(open(os.path.join(DATA, name), encoding="utf-8"))
    except (OSError, ValueError):
        return None


def svg_bars(items, color="#2a9d8f", maxv=None, label="", w=720):
    """items: [(label, value, ok)] -> 横向条形 SVG。"""
    if not items:
        return "<p class=dim>无数据</p>"
    maxv = maxv or max((v for _, v, _ in items), default=1) or 1
    bar_h = 24
    h = bar_h * len(items) + 20
    y = 6
    out = [f'<svg viewBox="0 0 {w} {h}" width="100%"><text x="0" y="0" class="axis">{label}</text>']
    for name, v, ok in items:
        bw = max(2, (v / maxv) * (w - 120))
        barcol = color if ok else "#f4a261"
        out.append(f'<text x="0" y="{y+16}" class="lab">{name}</text>')
        out.append(f'<rect x="0" y="{y+4}" width="{bw}" height="{bar_h-8}" rx="3" fill="{barcol}"/>')
        out.append(f'<text x="{bw+6}" y="{y+16}" class="val">{v}{(" ⚠" if not ok else "")}</text>')
        y += bar_h
    out.append("</svg>")
    return "".join(out)


def main():
    meta = load("meta.json") or {}
    timer = load("timer.json") or []
    mixer = load("mixer_track.json") or []
    content = load("content_card.json") or []
    channel = load("channel.json") or []

    invariants = []
    # 1) 配比 vs 设计
    cnt = {"common": 0, "rare": 0, "cult": 0}
    for c in content:
        cnt[c.get("rarity", "")] = cnt.get(c.get("rarity", ""), 0) + 1
    total = max(1, len(content))
    ratio_items = []
    for r, target in DESIGN_RATIO.items():
        actual = round(100 * cnt.get(r, 0) / total)
        ratio_items.append((f"{r} ({actual}%)", actual, abs(actual - target) <= 15))
    ok_ratio = all(ok for _, _, ok in ratio_items) and total >= 10
    invariants.append(("稀有度配比", ratio_items, ok_ratio,
                       f"实际 {dict((r, round(100*cnt.get(r,0)/max(1,total))) for r in DESIGN_RATIO)} vs 设计 70/25/5"
                       f"（M1 仅 {total} 卡 → 偏离属预期，量产需回填配比）"))

    # 2) duration_min in [focus_min, focus_max]
    fmin = meta.get("focus_min"); fmax = meta.get("focus_max")
    dur = [("focus_default", t.get("duration_min"), fmin <= t.get("duration_min", -1) <= fmax)
           for t in timer if t.get("timer_id") == "focus_default"]
    dur += [("break_default", t.get("duration_min"), fmin <= t.get("duration_min", -1) <= fmax)
            for t in timer if t.get("timer_id") == "break_default"]
    ok_dur = all(ok for _, _, ok in dur) and dur
    invariants.append(("各时段 duration_min（应在 [focus_min, focus_max]）", dur, ok_dur,
                       f"范围 [{fmin}, {fmax}]"))

    # 3) default_volume in [0,1]
    vol = [(t.get("track_id")[:22], t.get("default_volume"), 0 <= t.get("default_volume", -1) <= 1) for t in mixer]
    ok_vol = all(ok for _, _, ok in vol) and vol
    invariants.append(("各轨 default_volume（应在 [0,1]）", vol, ok_vol, "线性 0–1"))

    # 4) collect_frag per rarity (design 3/5/8)
    cf = [("common", 3, True), ("rare", 5, True), ("cult", 8, True)]
    actual_cf = {}
    for c in content:
        actual_cf[c.get("rarity")] = c.get("collect_frag")
    cf_items = [(r, actual_cf.get(r, d), actual_cf.get(r, d) == d) for r, d, _ in cf]
    ok_cf = all(ok for _, _, ok in cf_items)
    invariants.append(("collect_frag 初值（设计 common3/rare5/cult8）", cf_items, ok_cf, "按 GDD B-2"))

    # 5) LUT/container token 数量
    tok = []
    for ch in channel:
        lut = len((ch.get("lut") or {}).get("tokens", []) or [])
        cont = len((ch.get("skin") or {}).get("container_tokens", []) or [])
        tok.append((f"{ch.get('channel_id')} · LUT", lut, lut >= 1))
        tok.append((f"{ch.get('channel_id')} · 容器", cont, cont >= 1))
    ok_tok = all(ok for _, _, ok in tok) and tok
    invariants.append(("每频道 LUT/容器 token 数量（≥1）", tok, ok_tok, "M1 磁带 6 LUT / 8 容器"))

    # render
    sections = []
    for title, items, ok, note in invariants:
        sections.append(f'<div class="card"><h2>{title} <span class="badge">{"✅" if ok else "⚠ 需复核"}</span></h2>'
                        f'{svg_bars(items, color="#2a9d8f" if ok else "#f4a261")}<div class="notes">{note}</div></div>')
    html = f"""<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>S5 数据不变量 · formal-system 可视验证面</title>
<style>:root{{--fg:#1d2b3a;--dim:#6b7280;--bg:#f7f8fa;--card:#fff;--line:#e5e7eb;}}
*{{box-sizing:border-box}} body{{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--fg);background:var(--bg);}}
.wrap{{max-width:1000px;margin:0 auto;padding:24px 20px 60px}} h1{{font-size:22px;margin:0 0 4px}}
.sub{{color:var(--dim);font-size:13px;margin-bottom:18px}}.card{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:18px}}
h2{{font-size:16px;margin:0 0 8px}}.badge{{font-size:12px;color:var(--dim);font-weight:400}}
.notes{{color:var(--dim);font-size:13px;margin-top:6px}} svg text.lab{{fill:var(--fg);font-size:12px}}
svg text.val{{fill:var(--dim);font-size:12px}} svg .axis{{fill:var(--dim);font-size:11px}}</style></head>
<body><div class="wrap"><h1>S5 · 数据不变量可视化</h1>
<div class="sub">formal-system 可视验证面 S5 · 生成 {datetime.datetime.now().astimezone():%Y-%m-%d %H:%M %Z} · 数据源 data/tables/*.json + 设计常数</div>
{"".join(sections)}
<div class="notes">边注：这些不变量已由 schema 机器校验；这里的价值是让人类一眼看出"配比/数值是否如**设计直觉**"——例如 M1 仅 3 卡时配比必然偏离 70/25/5，属预期，量产需回填。</div>
</div></body></html>"""
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT + ".html", "w", encoding="utf-8") as f:
        f.write(html)
    with open(OUT + ".json", "w", encoding="utf-8") as f:
        json.dump({"generated": datetime.datetime.now().astimezone().isoformat(),
                   "invariants": [{"title": t, "ok": ok, "note": n} for t, _, ok, n in invariants]},
                  f, ensure_ascii=False, indent=2)
    print(f"S5 数据不变量 · {len(invariants)} 项")
    for t, _, ok, n in invariants:
        print(f"  {'✅' if ok else '⚠'} {t}: {n}")
    print(f"  产出: {OUT}.html / .json")


if __name__ == "__main__":
    sys.exit(main())
