#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
req_trace —— S4 · 需求 ←→ 文档 追踪矩阵。

把**需求/验收**（取自里程碑 M1 验收与关键任务）与**文档**（项目 docs/、plans/、game/ 下的 md）建一个
追踪矩阵：行=需求，列=文档，单元格=该文档是否**引用/呼应**该需求（按关键词命中）。人类扫一眼即可看出
"**哪些需求没有落到文档**"（空行=覆盖缺口）、"**哪些文档跨越太多需求**"（可能失焦）。

只锚定**关键词命中的可验证事实**；关键词为启发式，非精确语义追踪（见 README 边界）。

产出：
  lab/formal-system/concerns/visual-fallback/viz/req-trace.html   自包含矩阵
  lab/formal-system/concerns/visual-fallback/viz/req-trace.json   机器可读
"""
import datetime
import json
import os
import re
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


ROOT = find_workspace_root()  # LiveRefu
PROJ = os.path.join(ROOT, "projects", "tomorrows-channel")
OUT = os.path.join(ROOT, "lab", "formal-system", "concerns", "visual-fallback", "viz", "req-trace")

# 需求/验收（id, 标题, 关键词）。来源：plans/milestones/20260906-1534-milestone-plan.md（M1 验收+任务）。
REQS = [
    ("R1", "专注 25min 不打断", ["25", "专注", "番茄", "不打断"]),
    ("R2", "混音台 ≥2 轨可用", ["混音", "轨道", "音量", "mixer", "track"]),
    ("R3", "收藏 1 卡", ["收藏", "图鉴", "collect"]),
    ("R4", "静默可用（无动态）", ["静默", "无动态", "静态", "关闭"]),
    ("R5", "频道=可插拔 bundle", ["bundle", "插拔", "频道装载", "load"]),
    ("R6", "配置表 schema + CI", ["schema", "契约", "校验", "check_data", "CI"]),
    ("R7", "番茄 25+5", ["25", "5", "休息", "break", "pomodoro"]),
    ("R8", "三态 UI 骨架", ["三态", "漫游", "设置", "图鉴", "UI"]),
]
SKIP_DIRS = {"meetings", "__pycache__", "target"}
SCAN_UNDER = ["docs", "plans", "game"]


def walk_md(root):
    files = []
    for sub in SCAN_UNDER:
        base = os.path.join(PROJ, sub)
        if not os.path.isdir(base):
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                if fn.endswith(".md"):
                    files.append(os.path.join(dirpath, fn))
    return sorted(files)


def read(path):
    try:
        return open(path, encoding="utf-8").read()
    except (OSError, UnicodeDecodeError):
        return ""


def short_doc(path):
    return os.path.basename(path)[:-3]


def main():
    docs = walk_md(PROJ)
    texts = {p: read(p) for p in docs}
    matrix = []
    for rid, title, kws in REQS:
        hits = {}
        for p in docs:
            t = texts[p].lower()
            hits[short_doc(p)] = sum(1 for k in kws if k.lower() in t)
        covered = [d for d, c in hits.items() if c > 0]
        matrix.append({"id": rid, "title": title, "kw": kws,
                       "covered": covered, "hit": hits, "n": len(covered)})

    doc_cols = [short_doc(p) for p in docs]
    file_name = "req-trace"
    html = render(matrix, doc_cols, file_name)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT + ".html", "w", encoding="utf-8") as f:
        f.write(html)
    with open(OUT + ".json", "w", encoding="utf-8") as f:
        json.dump({
            "generated": datetime.datetime.now().astimezone().isoformat(),
            "documents": doc_cols,
            "requirements": [
                {"id": r["id"], "title": r["title"], "covered_docs": r["covered"], "n": r["n"]}
                for r in matrix
            ],
            "coverage": {"requirements": len(matrix), "covered": sum(1 for r in matrix if r["n"] > 0),
                         "gaps": [r["id"] for r in matrix if r["n"] <= 1]},
        }, f, ensure_ascii=False, indent=2)
    print(f"S4 需求←→文档追踪 · 需求 {len(matrix)} · 文档 {len(doc_cols)}")
    for r in matrix:
        flag = "⚠" if r["n"] <= 1 else "ok"
        print(f"  {flag} {r['id']} {r['title']}: {r['n']} 篇文档")
    print(f"  缺口(≤1 篇): {[r['id'] for r in matrix if r['n']<=1]}")
    print(f"  产出: {OUT}.html / .json")


def render(matrix, doc_cols, name):
    esc = lambda s: str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    header = "".join(f'<th title="{esc(d)}">{esc(d)}</th>' for d in doc_cols)
    rows = []
    for r in matrix:
        cells = []
        for d in doc_cols:
            c = r["hit"].get(d, 0)
            cls = "c-hit" if c else "c-no"
            cells.append(f'<td class="{cls}">{"✓" if c else ""}</td>')
        flag = '<span class="warn">⚠ 少文档</span>' if r["n"] <= 1 else ""
        rows.append(f'<tr><th class="row-name">{esc(r["id"])} · {esc(r["title"])}<div class="row-sub">{r["n"]} 篇</div></th>'
                    + "".join(cells) + f'<td class="row-stat">{flag}</td></tr>')
    return f"""<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>S4 需求←→文档追踪矩阵 · formal-system 可视验证面</title>
<style>
:root{{--fg:#1d2b3a;--dim:#6b7280;--bg:#f7f8fa;--card:#fff;--line:#e5e7eb;}}
*{{box-sizing:border-box}} body{{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--fg);background:var(--bg);}}
.wrap{{max-width:1200px;margin:0 auto;padding:24px 20px 60px}} h1{{font-size:22px;margin:0 0 4px}}
.sub{{color:var(--dim);font-size:13px;margin-bottom:18px}}
.legend{{display:flex;gap:14px;margin-bottom:14px;font-size:12px;color:var(--dim)}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:18px;overflow-x:auto}}
table{{border-collapse:collapse;font-size:12px;width:max-content}}
th,td{{border:1px solid var(--line);padding:5px 8px;text-align:center;white-space:nowrap}}
th{{color:var(--dim);font-weight:600;background:#fbfcfe}}
.row-name{{text-align:left;position:sticky;left:0;background:#fff;min-width:220px}}
.row-sub{{font-size:10px;color:var(--dim);font-weight:400}}
.c-hit{{background:#d8f3dc;color:#1b7a3d}} .c-no{{background:#f3f4f6;color:#c8cdd4}}
.warn{{color:#b45309;font-size:11px}} .notes{{color:var(--dim);font-size:13px}}
</style></head><body><div class="wrap">
<h1>S4 · 需求 ←→ 文档 追踪矩阵</h1>
<div class="sub">formal-system 可视验证面 S4 · 生成 {datetime.datetime.now().astimezone():%Y-%m-%d %H:%M %Z} · 关键词命中(启发式) · 需求来源: milestone M1 验收/任务</div>
<div class="legend"><span><i style="background:#d8f3dc;display:inline-block;width:12px;height:12px;border-radius:3px"></i> 该文档引用该需求</span><span><i style="background:#f3f4f6;display:inline-block;width:12px;height:12px;border-radius:3px"></i> 未引用</span></div>
<div class="card"><table><thead><tr><th class="row-name">需求</th>{header}<th>覆盖</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>
<div class="notes"><b>怎么读</b>：一行是一个需求/验收，一列是一份文档。<b>找"横向稀疏/整行空白"</b>——那是<span style="color:#b45309">覆盖缺口</span>（需求没落到具体文档），需人工补文档或确认由谁承接。</div>
</div></body></html>"""


if __name__ == "__main__":
    sys.exit(main())
