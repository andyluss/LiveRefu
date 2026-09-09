#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
consistency_heatmap —— 跨文档一致性热力图（可视验证面 S3）。

把**同一个契约字段/取值**（如 pomodoro_work、focus_max、collect_frag 的 rarity→初值映射）
在**各文档里的具体取值**抽出来，与**权威源**（data/tables/*.json 或本表约定的基准值）对拍，
渲染成一张热力矩阵：每行一个契约项、每列一份文档、单元格=该文档给出的取值，**颜色表达一致性**
（绿=与权威一致 / 红=不一致 / 琥珀=文档内有冲突 / 灰=该文档未提及）。

人类扫一眼即知"哪个契约在哪些文档写不一致"——这是把"多文档口径是否一致"从逐字读变成
**可视化扫异常**（正是 formaliation.md 里 '文档间对同一契约的表述是否一致' 这一难形式化的真实风险）。

产出：
  lab/formal-system/concerns/visual-fallback/viz/consistency-heatmap.html   # 自包含热力图
  lab/formal-system/concerns/visual-fallback/viz/consistency-heatmap.json   # 机器可读矩阵

只锚定**字段名 + 数值**这种可验证事实；用字段名锚定（避免误抓"25分钟"的裸数字）。

用法：
  python3 lab/formal-system/concerns/visual-fallback/tools/consistency_heatmap.py
  python3 lab/formal-system/concerns/visual-fallback/tools/consistency_heatmap.py --out <path>
"""
import datetime
import json
import os
import re
import sys

def find_workspace_root():
    d = os.path.dirname(os.path.abspath(__file__))
    while True:
        if os.path.isdir(os.path.join(d, ".git")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return d
        d = parent


HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = find_workspace_root()
DEFAULT_OUT = os.path.join(ROOT, "lab", "formal-system", "visual-fallback", "viz", "consistency-heatmap.html")

SCAN_DIRS = ["doc", "projects", "studio", "tech", "lab", "tools"]
SKIP_DIRS = {".git", "target", "node_modules"}

# 契约项: (显示名, 字段锚, 取值正则, 权威值)
# 权威值来自 projects/tomorrows-channel/data/tables/*.json 或本表已冻结的映射约定。
# 取值之间允许 = : ： | ｜(markdown 表格) 或空白。
SEP = r"\s*[=:：|｜]?\s*"
ENTITIES = [
    ("pomodoro_work(专注)", "pomodoro_work", r"pomodoro_work" + SEP + r"(\d+)", 25),
    ("pomodoro_break(休息)", "pomodoro_break", r"pomodoro_break" + SEP + r"(\d+)", 5),
    ("focus_min(下限)", "focus_min", r"focus_min" + SEP + r"(\d+)", 5),
    ("focus_max(上限)", "focus_max", r"focus_max" + SEP + r"(\d+)", 120),
    ("fragment_base_per_tomato", "fragment_base_per_tomato", r"fragment_base_per_tomato" + SEP + r"(\d+)", 8),
    ("collect_frag=common", "common", r"common" + SEP + r"(\d+)", 3),
    ("collect_frag=rare", "rare", r"rare" + SEP + r"(\d+)", 5),
    ("collect_frag=cult", "cult", r"cult" + SEP + r"(\d+)", 8),
]


def read_text(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except (OSError, UnicodeDecodeError):
        return ""


def find_md():
    files = []
    root_readme = os.path.join(ROOT, "README.md")
    if os.path.isfile(root_readme):
        files.append(root_readme)
    for sub in SCAN_DIRS:
        base = os.path.join(ROOT, sub)
        if not os.path.isdir(base):
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                if fn.endswith(".md"):
                    files.append(os.path.join(dirpath, fn))
    return sorted(files)


def norm_val(s):
    try:
        f = float(s)
        return int(f) if f.is_integer() else f
    except ValueError:
        return s


def build_matrix(rel_of):
    """返回 {entity_index: {doc_rel: set(values)}}。"""
    matrix = {i: {} for i in range(len(ENTITIES))}
    for path in find_md():
        text = read_text(path)
        rel = rel_of(path)
        for i, (name, field, pattern, auth) in enumerate(ENTITIES):
            vals = re.findall(pattern, text)
            if vals:
                matrix[i][rel] = {norm_val(v) for v in vals}
    return matrix


def rel_of(abs_path):
    return os.path.relpath(os.path.abspath(abs_path), ROOT).replace("\\", "/")


def cell_kind(values, auth):
    """返回 (kind, display, tooltip)。kind ∈ match/mismatch/conflict/na。"""
    if not values:
        return "na", "—", ""
    vlist = sorted(values, key=lambda v: str(v))
    if auth in values:
        if len(values) == 1:
            return "match", str(auth), "与权威一致"
        others = [v for v in vlist if v != auth]
        return "conflict", ",".join(str(v) for v in vlist), f"同文档出现多个值(权威{auth} + {others})"
    if len(values) > 1:
        return "conflict", ",".join(str(v) for v in vlist), f"同文档多个值且均≠权威{auth}"
    return "mismatch", str(vlist[0]), f"≠ 权威 {auth}"


def summarize(matrix):
    per_entity = []
    for i, (name, field, _, auth) in enumerate(ENTITIES):
        cells = matrix[i]
        match = sum(1 for v in cells.values() if auth in v and len(v) == 1)
        mismatch = sum(1 for v in cells.values() if v and auth not in v and len(v) == 1)
        conflict = sum(1 for v in cells.values() if len(v) > 1)
        per_entity.append({"entity": name, "auth": auth, "docs": len(cells),
                           "match": match, "mismatch": mismatch, "conflict": conflict})
    return per_entity


def render_html(matrix, out_path):
    doc_cols = sorted({rel for m in matrix.values() for rel in m})
    stat = summarize(matrix)

    header = "".join(f'<th title="{escape(d)}">{short_doc(d)}</th>' for d in doc_cols)
    rows = []
    for i, (name, _, _, auth) in enumerate(ENTITIES):
        cells = []
        for d in doc_cols:
            kind, disp, tip = cell_kind(matrix[i].get(d, set()), auth)
            cells.append(
                f'<td class="c-{kind}" title="{escape(tip)}">{escape(str(disp))}</td>'
            )
        s = stat[i]
        flag = ""
        if s["mismatch"] or s["conflict"]:
            flag = '<span class="warn">⚠ 不一致</span>'
        rows.append(
            f'<tr><th class="row-name">{escape(name)}'
            f'<div class="row-sub">权威 {auth} · {s["docs"]} 篇</div></th>'
            + "".join(cells) + f'<td class="row-stat">{flag}</td></tr>'
        )

    html = f"""<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>跨文档一致性热力图 · formal-system 可视验证面 S3</title>
<style>
:root {{ --fg:#1d2b3a; --dim:#6b7280; --bg:#f7f8fa; --card:#fff; --line:#e5e7eb; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
  color:var(--fg); background:var(--bg); }}
.wrap {{ max-width:1200px; margin:0 auto; padding:24px 20px 60px; }}
h1 {{ font-size:22px; margin:0 0 4px; }}
.sub {{ color:var(--dim); font-size:13px; margin-bottom:18px; }}
.legend {{ display:flex; gap:14px; margin-bottom:16px; font-size:12px; color:var(--dim); }}
.legend span {{ display:inline-flex; align-items:center; gap:5px; }}
.lg {{ width:13px; height:13px; border-radius:3px; display:inline-block; }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:18px; overflow-x:auto; }}
table {{ border-collapse:collapse; font-size:12px; width:max-content; }}
th,td {{ border:1px solid var(--line); padding:6px 9px; text-align:center; white-space:nowrap; }}
th {{ color:var(--dim); font-weight:600; background:#fbfcfe; }}
.row-name {{ text-align:left; position:sticky; left:0; background:#fff; z-index:1; }}
.row-sub {{ font-size:10px; color:var(--dim); font-weight:400; }}
th.row-name, td.row-stat {{ min-width:150px; }}
.row-stat {{ background:#fbfcfe; }}
.c-match {{ background:#d8f3dc; color:#1b7a3d; }}
.c-mismatch {{ background:#f8d7da; color:#9b1c1c; }}
.c-conflict {{ background:#fdebd0; color:#b45309; }}
.c-na {{ background:#f3f4f6; color:#9ca3af; }}
.warn {{ color:#b45309; font-size:11px; }}
.notes {{ color:var(--dim); font-size:13px; }}
</style></head>
<body><div class="wrap">
<h1>跨文档一致性热力图</h1>
<div class="sub">formal-system 可视验证面 S3 · 生成 {datetime.datetime.now().astimezone():%Y-%m-%d %H:%M %Z} ·
仅锚定<code>字段名=数值</code>可验证事实；权威值取自 <code>data/tables/*.json</code></div>

<div class="legend">
  <span><i class="lg" style="background:#d8f3dc"></i>与权威一致</span>
  <span><i class="lg" style="background:#f8d7da"></i>不一致(≠权威)</span>
  <span><i class="lg" style="background:#fdebd0"></i>同文档冲突(多值)</span>
  <span><i class="lg" style="background:#f3f4f6"></i>未提及</span>
</div>

<div class="card">
<table>
  <thead><tr><th class="row-name">契约项</th>{header}<th>逐行</th></tr></thead>
  <tbody>{"".join(rows)}</tbody>
</table>
</div>

<div class="notes">
<b>怎么读</b>：一行是一个契约项（参数或取值映射），一列是一份文档；<b>找红色/琥珀色格子</b>——
红=该文档取值≠权威，琥珀=该文档内部就出现了多个值（自身矛盾），都提示"口径不一致"，需人工确认。
</div>
</div></body></html>"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    return doc_cols, stat


def write_json(out_html, matrix, doc_cols, stat):
    cells = {}
    for i, (name, _, _, auth) in enumerate(ENTITIES):
        for d in doc_cols:
            kind, disp, tip = cell_kind(matrix[i].get(d, set()), auth)
            cells[f"{ENTITIES[i][1]}::{d}"] = {"value": disp, "kind": kind, "note": tip}
    data = {
        "generated": datetime.datetime.now().astimezone().isoformat(),
        "entities": [
            {"entity": s["entity"], "field": ENTITIES[i][1], "authoritative": ENTITIES[i][3],
             "docs": s["docs"], "match": s["match"], "mismatch": s["mismatch"], "conflict": s["conflict"]}
            for i, s in enumerate(stat)
        ],
        "docs": doc_cols,
        "summary": stat,
        "cells": cells,
    }
    json_path = os.path.splitext(out_html)[0] + ".json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return json_path


def short_doc(rel):
    b = os.path.basename(rel)[:-3]
    return b[:16] + ("…" if len(b) > 16 else "")


def escape(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def self_test():
    """对一致性判定逻辑做自检（匹配/不一致/冲突/未提及），确保检测器真的能抓到漂移。"""
    cases = [
        ({3}, 3, "match"),
        ({4}, 3, "mismatch"),
        ({3, 5}, 3, "conflict"),   # 含权威 + 异值
        ({5, 4}, 3, "conflict"),   # 全异值但多值
        (set(), 3, "na"),
    ]
    ok = True
    for values, auth, exp in cases:
        kind, _disp, _tip = cell_kind(values, auth)
        passed = kind == exp
        ok = ok and passed
        print(f"  {'PASS' if passed else 'FAIL'}  cell_kind({sorted(values)}, auth={auth}) = {kind} (期望 {exp})")

    # 端到端：造一段"字段=异值"文本，抽取应判定为不一致
    import tempfile
    probe = "约定 focus_max=120；但某处写成 focus_max=240。"
    bad = re.findall(r"focus_max\s*[=:：]?\s*(\d+)", probe)
    kind, disp, _ = cell_kind({norm_val(v) for v in bad}, 120)
    passed = kind == "conflict" and set(bad) == {"120", "240"}
    ok = ok and passed
    print(f"  {'PASS' if passed else 'FAIL'}  端到端: 'focus_max=120…focus_max=240' -> {kind} ({sorted(bad)})")

    print("self-test:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main():
    if "--self-test" in sys.argv:
        return self_test()

    out = DEFAULT_OUT
    if "--out" in sys.argv:
        i = sys.argv.index("--out")
        if i + 1 < len(sys.argv):
            out = sys.argv[i + 1]
    matrix = build_matrix(rel_of)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    doc_cols, stat = render_html(matrix, out)
    json_path = write_json(out, matrix, doc_cols, stat)

    print(f"契约项 {len(ENTITIES)} 个, 涉及文档 {len(doc_cols)} 份")
    for s in stat:
        flag = "⚠" if (s["mismatch"] or s["conflict"]) else "ok"
        print(f"  {flag} {s['entity']}: 权威{s['auth']} · {s['docs']}篇 "
              f"(一致{s['match']} / 不一致{s['mismatch']} / 冲突{s['conflict']})")
    print(f"热力图已生成: {out}")
    print(f"数据已生成:   {json_path}")


if __name__ == "__main__":
    sys.exit(main())
