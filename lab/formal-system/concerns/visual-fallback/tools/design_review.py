#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
design_review —— S6 · 设计/手感复核面（截图网格 + 基调锚点）。

为每个频道生成一张"复核卡"：基调锚点（一句话基调）+ 视觉/音景 token 摘要 + **截图槽位** + 人工复核清单。
人类针对"温暖、可久处"这一类**不可形式化**的美学做**视觉直觉**判断（对照基调锚点：达到 / 未达 / 想改）。

现阶段无实机渲染，故提供**结构化复核模板**；待有截图后填入、逐格勾选。这也是"机器判定覆盖不到的美学"交由人的兜底。

产出：viz/design-review.html / .json
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
TABLE = os.path.join(ROOT, "projects", "tomorrows-channel", "data", "tables", "channel.json")
OUT = os.path.join(ROOT, "lab", "formal-system", "concerns", "visual-fallback", "viz", "design-review")


def load(path):
    try:
        return json.load(open(path, encoding="utf-8"))
    except (OSError, ValueError):
        return None


def card(ch):
    esc = lambda s: str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    lut = ch.get("lut") or {}
    skin = ch.get("skin") or {}
    tokens = (lut.get("tokens") or []) + (skin.get("container_tokens") or [])
    chips = "".join(f'<span class="chip">{esc(t)}</span>' for t in tokens[:8])
    return f"""<div class="chan">
  <div class="chan-head"><b>{esc(ch.get('name_zh'))}</b><span>{esc(ch.get('channel_id'))} · {esc(ch.get('tier'))}</span></div>
  <div class="screenshot">= 待补渲染 =</div>
  <div class="anchor">基调锚点：<b>「{esc(ch.get('tagline'))}」</b></div>
  <div class="tokens">{chips}</div>
  <div class="checklist">
    <label><input type="checkbox"> 达到「{esc(ch.get('tagline'))}」基调</label>
    <label><input type="checkbox"> 色调/氛围符合骨架</label>
    <label><input type="checkbox"> 可久处/不刺眼</label>
    <div class="revnote">想改的点：<input type="text" placeholder="(供人工记录)"></div>
  </div>
</div>"""


def main():
    channels = load(TABLE) or []
    cards = "".join(card(c) for c in channels) or "<p class=dim>暂无频道</p>"
    html = f"""<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>S6 设计/手感复核面 · formal-system 可视验证面</title>
<style>:root{{--fg:#1d2b3a;--dim:#6b7280;--bg:#f7f8fa;--card:#fff;--line:#e5e7eb;}}
*{{box-sizing:border-box}} body{{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--fg);background:var(--bg);}}
.wrap{{max-width:1080px;margin:0 auto;padding:24px 20px 60px}} h1{{font-size:22px;margin:0 0 4px}}
.sub{{color:var(--dim);font-size:13px;margin-bottom:18px}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}}
.chan{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px}}
.chan-head{{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}}
.chan-head span{{color:var(--dim);font-size:12px}}
.screenshot{{height:150px;background:#eef1f4;border:1px dashed var(--line);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--dim);font-size:12px;margin-bottom:8px}}
.anchor{{font-size:13px;margin-bottom:8px}}.tokens{{margin-bottom:8px}}.chip{{display:inline-block;background:#eef1f4;color:var(--dim);border-radius:999px;padding:2px 8px;font-size:11px;margin:2px}}
.checklist label{{display:block;font-size:13px;margin:4px 0}}.revnote{{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--dim);margin-top:6px}}
.revnote input{{flex:1}}.notes{{color:var(--dim);font-size:13px;margin-top:16px}}</style></head>
<body><div class="wrap"><h1>S6 · 设计/手感复核面</h1>
<div class="sub">formal-system 可视验证面 S6 · 生成 {datetime.datetime.now().astimezone():%Y-%m-%d %H:%M %Z} · 数据源 channel.json（基调锚点=tagline）</div>
<div class="grid">{cards}</div>
<div class="notes">说明：这是**不可形式化美学**（温暖/可久处）的人工兜底面——对照**基调锚点**逐格复核；
当前"待补渲染"槽位待实机截图填充；勾选与记录为人工复核结果，不愿自动判定。随 M2 三频道扩展即自动成网格。</div>
</div></body></html>"""
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT + ".html", "w", encoding="utf-8") as f:
        f.write(html)
    with open(OUT + ".json", "w", encoding="utf-8") as f:
        json.dump({"generated": datetime.datetime.now().astimezone().isoformat(),
                   "channels": [{"id": c.get("channel_id"), "name": c.get("name_zh"),
                                 "anchor": c.get("tagline")} for c in channels]},
                  f, ensure_ascii=False, indent=2)
    print(f"S6 设计/手感复核面 · {len(channels)} 个频道")
    for c in channels:
        print(f"  🔲 {c.get('channel_id')} · {c.get('name_zh')} · 「{c.get('tagline')}」")
    print(f"  产出: {OUT}.html / .json")


if __name__ == "__main__":
    sys.exit(main())
