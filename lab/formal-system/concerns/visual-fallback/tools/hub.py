#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
hub —— 可视验证面统一入口/导航页。

把 S1+S2(文档健康) / S3(一致性) / S4(需求追踪) / S5(数据不变量) / S6(设计复核) / ①③复核账本 汇成一个
自包含 `viz/index.html`：分类网格，每张卡片 = 一个面（名称 + 链接 + **状态摘要**，从各面 JSON 取），
一眼看出"哪些面健康、哪些有警告"。`--run` 可先全量刷新所有面再生成。

用法：
  python3 lab/formal-system/concerns/visual-fallback/tools/hub.py            # 由现有 JSON 生成导航页
  python3 lab/formal-system/concerns/visual-fallback/tools/hub.py --run      # 先刷新全部面, 再生成
产出：lab/formal-system/concerns/visual-fallback/viz/index.html（自包含）
"""
import datetime
import json
import os
import subprocess
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
VF = os.path.join(ROOT, "lab", "formal-system", "concerns", "visual-fallback")
VIZ = os.path.join(VF, "viz")
TOOLS = os.path.join(VF, "tools")
INDEX = os.path.join(VIZ, "index.html")


def load(name):
    p = os.path.join(VIZ, name)
    try:
        return json.load(open(p, encoding="utf-8"))
    except (OSError, ValueError):
        return None


# 每个面：id/名称/分类/生成脚本/html/json/摘要(取 json -> (状态行, warn))
def surfaces():
    def s_doc_health():
        d = load("doc-health.json")
        if not d:
            return "（未生成）", False
        c = d.get("counts", {}); r = d.get("review", {})
        warn = (c.get("stale", 0) > 0) or (r.get("unreviewed", 0) > 0)
        return (f"{c.get('docs',0)} 文档 · {c.get('links',0)} 互链 · 待定{c.get('open',0)}/已定{c.get('closed',0)} · "
                f"孤立{c.get('orphans',0)} · 复核未{ r.get('unreviewed',0)}"), warn

    def s_consistency():
        d = load("consistency-heatmap.json")
        if not d:
            return "（未生成）", False
        bad = sum(1 for e in d.get("summary", []) if e.get("mismatch") or e.get("conflict"))
        return f"{len(d.get('entities',[]))} 契约项 · 不一致/冲突 {bad}", bad > 0

    def s_req_trace():
        d = load("req-trace.json")
        if not d:
            return "（未生成）", False
        cv = d.get("coverage", {})
        gaps = cv.get("gaps", [])
        return f"{cv.get('requirements',0)} 需求 · 文档 {len(d.get('documents',[]))} · 缺口 {len(gaps)}", len(gaps) > 0

    def s_data_invariants():
        d = load("data-invariants.json")
        if not d:
            return "（未生成）", False
        inv = d.get("invariants", [])
        bad = [i for i in inv if not i.get("ok")]
        return f"{len(inv)} 项不变量 · 偏离 {len(bad)}", len(bad) > 0

    def s_design_review():
        d = load("design-review.json")
        if not d:
            return "（未生成）", False
        ch = d.get("channels", [])
        return f"{len(ch)} 频道复核卡 · 基调锚点待人工", False

    def s_ledger():
        d = load("review-ledger.json")
        if not d:
            return "（未生成）", False
        recs = d.get("records", [])
        return f"{len(recs)} 条复核记录", False

    CATS = [
        ("当前状态 / 自检", [
            ("S1+S2", "文档健康仪表盘", "visual_health.py", "doc-health.html", s_doc_health),
        ]),
        ("一致性 / 追踪", [
            ("S3", "跨文档一致性热力图", "consistency_heatmap.py", "consistency-heatmap.html", s_consistency),
            ("S4", "需求←→文档追踪矩阵", "req_trace.py", "req-trace.html", s_req_trace),
        ]),
        ("数据 / 设计", [
            ("S5", "数据不变量可视化", "data_invariants.py", "data-invariants.html", s_data_invariants),
            ("S6", "设计/手感复核面", "design_review.py", "design-review.html", s_design_review),
        ]),
        ("第③层", [
            ("①③", "人工复核账本", "review_ledger.py", "review-ledger.json", s_ledger),
        ]),
    ]
    return CATS


def run_all():
    """按序刷新各面（visual_health 会顺带跑 meta_rules_check 做合规面板）。"""
    scripts = ["visual_health.py", "consistency_heatmap.py", "req_trace.py",
               "data_invariants.py", "design_review.py"]
    for s in scripts:
        print(f"  -> python3 {s}")
        subprocess.run([sys.executable, os.path.join(TOOLS, s)], cwd=ROOT, capture_output=False)


def render(categories):
    esc = lambda s: str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    blocks = []
    for cat, items in categories:
        cards = []
        for sid, name, script, html, summary_fn in items:
            line, warn = summary_fn()
            vt = "ok" if not warn else "warn"
            cards.append(f"""<a class="card {vt}" href="{html}">
  <div class="cat">{esc(sid)}</div>
  <div class="name">{esc(name)}</div>
  <div class="line">{esc(line)}</div>
  <div class="dot">{'⚠ 复核' if warn else '✓ 健康'}</div>
  <div class="gen">{esc(script)}</div>
</a>""")
        blocks.append(f'<h2>{esc(cat)}</h2><div class="grid">{"".join(cards)}</div>')
    return "".join(blocks)


def main():
    run = "--run" in sys.argv
    if run:
        print("刷新全部可视面……")
        run_all()
    cats = surfaces()
    html = f"""<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>可视验证面总览 · formal-system</title>
<style>:root{{--fg:#1d2b3a;--dim:#6b7280;--bg:#f7f8fa;--card:#fff;--line:#e5e7eb;}}
*{{box-sizing:border-box}} body{{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--fg);background:var(--bg);}}
.wrap{{max-width:1080px;margin:0 auto;padding:24px 20px 60px}} h1{{font-size:24px;margin:0 0 4px}}
.lead{{color:var(--dim);font-size:13px;margin-bottom:18px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-bottom:10px}}
h2{{font-size:15px;margin:18px 0 10px}}
a.card{{display:block;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;text-decoration:none;color:inherit;transition:box-shadow .15s}}
a.card:hover{{box-shadow:0 4px 14px rgba(0,0,0,.08)}}
.cat{{font-size:11px;color:var(--dim);font-weight:700;letter-spacing:.06em}}
.name{{font-size:16px;font-weight:700;margin:2px 0}} .line{{font-size:12px;color:var(--dim);min-height:30px}}
.dot{{font-size:12px;margin:6px 0}} .card.ok .dot{{color:#1b7a3d}} .card.warn .dot{{color:#b45309;font-weight:700}}
.gen{{font-size:11px;color:#9ca3af;border-top:1px solid var(--line);padding-top:6px}}
.run{{display:inline-block;background:#1d2b3a;color:#fff;border-radius:8px;padding:8px 14px;text-decoration:none;font-size:13px;margin-bottom:16px}}
.notes{{color:var(--dim);font-size:13px}}</style></head>
<body><div class="wrap"><h1>可视验证面 · 总览</h1>
<div class="lead">formal-system 可视验证面（机器判定 → 可视异常面 → 人工复核）。点卡片进入对应面；<b>⚠ 复核</b>=该面有偏离/待人工。</div>
<a class="run" href="#refresh">刷新全部面：python3 lab/formal-system/concerns/visual-fallback/tools/hub.py --run</a>
{render(cats)}
<div class="notes">生成 {datetime.datetime.now().astimezone():%Y-%m-%d %H:%M %Z} · 由 {os.path.basename(__file__)} 读取各面 JSON 生成；`--run` 先依次刷新 visual_health / consistency_heatmap / req_trace / data_invariants / design_review。</div>
</div></body></html>"""
    os.makedirs(VIZ, exist_ok=True)
    with open(INDEX, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"统一入口导航页已生成: {INDEX}")


if __name__ == "__main__":
    sys.exit(main())
