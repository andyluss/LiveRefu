#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
visual_health —— 文档健康仪表盘生成器（"可视验证面"，实验层 F 兜底）。

作用：形式化校验（编译/契约/测试）只能判定"可判定"的东西；对文档、创意、设计这类
**不可形式化**的产物，把它的"结构 / 覆盖 / 一致性 / 异常"渲染成一张图，让**人类用视觉
直觉**兜底扫出"哪里不对"。本脚本生成一份**零依赖、可一键重跑、自包含**的 HTML 仪表盘。

产出：
  lab/formal-system/viz/doc-health.html        # 自包含仪表盘（图谱 + 异常面板 + 清单）

可视化内容（详见 README）：
  - 文档图谱：节点=md 文档，边=文档间相对链接，按主题着色；节点大小∝活跃度，红环=陈旧。
  - 开放问题密度 / 决策密度：每文档的【待定】/【已定】计数。
  - 异常面板：孤立文档、高【待定】文档、陈旧文档。

原则（防"好看但没用"）：
  1. 只锚定**可验证事实**（链接、【待定】标记、git/mtime 可得的变更时间、主题），不做主观判断。
  2. **异常优先**：默认渲染"哪里偏离"，而非全量内容。
  3. 确定可复现：纯 Python 标准库，越界路径容错，一键重跑。

用法：
  python3 lab/formal-system/tools/visual_health.py            # 生成默认仪表盘
  python3 lab/formal-system/tools/visual_health.py --out <path>  # 自定义输出
"""

import datetime
import json
import math
import os
import re
import subprocess
import sys

# 交互脚本（不含花括号语法，避免与 f-string 冲突；作为普通字符串追加以保证安全）。
SCRIPT_JS = """
<script>
const tip=document.getElementById('tip');
document.querySelectorAll('svg circle.node').forEach(function(c){
  c.addEventListener('mousemove',function(e){
    tip.style.opacity=1;
    tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px';
    tip.innerHTML='<b>'+c.dataset.title+'</b><br><span>'+c.dataset.rel+'</span>';
  });
  c.addEventListener('mouseleave',function(){tip.style.opacity=0;});
});
</script>
"""

HERE = os.path.dirname(os.path.abspath(__file__))
# tools -> formal-system -> lab -> 工作区根
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DEFAULT_OUT = os.path.join(ROOT, "lab", "formal-system", "viz", "doc-health.html")

# 扫描范围（相对工作区根），避免把 .git/target 等算进来。
SCAN_DIRS = ["doc", "projects", "studio", "tech", "lab", "tools"]
STALE_DAYS = 60            # 超过即视为"陈旧"
HIGH_OPEN_TOP = 10         # 高【待定】取前 N
ANOMALY_LIST_LEN = 10
MAX_EDGES_PER_NODE = 60    # 图谱里单节点最多画的边，避免乱成线团


# ----------------------------------------------------------------------------
# 基础工具
# ----------------------------------------------------------------------------
def read_text(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except (OSError, UnicodeDecodeError):
        return ""


def git_last_commit(rel_path):
    """返回该 git 追踪文件的最后一次提交 ISO 时间; 未追踪/失败则返回 None。"""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cI", "--", rel_path],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=10,
        )
        line = out.stdout.strip()
        return line if line else None
    except Exception:
        return None


def change_iso(rel_path, abs_path):
    iso = git_last_commit(rel_path)
    if iso:
        return iso
    # 未追踪文件退回 mtime
    try:
        return datetime.datetime.fromtimestamp(
            os.path.getmtime(abs_path)
        ).astimezone().isoformat()
    except OSError:
        return None


def days_since(iso):
    if not iso:
        return None
    try:
        t = datetime.datetime.fromisoformat(iso)
    except ValueError:
        return None
    now = datetime.datetime.now(t.tzinfo)
    return max(0, (now - t).days)


# ----------------------------------------------------------------------------
# 文档解析
# ----------------------------------------------------------------------------
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")


def resolve_md_target(link_target, from_abs):
    """解析相对链接到目标 md 绝对路径；非本地 md 返回 None。"""
    t = link_target.split("#")[0].strip()
    if not t.endswith(".md"):
        return None
    if t.startswith(("http:", "https:")):
        return None
    cand = os.path.normpath(os.path.join(os.path.dirname(from_abs), t))
    if os.path.isfile(cand):
        return os.path.abspath(cand)
    return None


def parse_doc(abs_path, rel_path):
    text = read_text(abs_path)
    title = None
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("# "):
            title = s[2:].strip()
            break
    if not title:
        title = os.path.basename(rel_path)[:-3]
    open_q = text.count("【待定】")
    closed_q = text.count("【已定】")
    # 收集一条去重的链接集合（按目标 abs 唯一）
    targets = set()
    for m in LINK_RE.finditer(text):
        tgt = resolve_md_target(m.group(1), abs_path)
        if tgt:
            targets.add(tgt)
    return {
        "abs": abs_path,
        "rel": rel_path,
        "title": title,
        "open": open_q,
        "closed": closed_q,
        "targets": targets,
        "iso": change_iso(rel_path, abs_path),
    }


# ----------------------------------------------------------------------------
# 主题归类（用于着色/聚类）
# ----------------------------------------------------------------------------
def themes_for(rel):
    parts = rel.split(os.sep)
    if not parts:
        return "其他"
    top = parts[0]
    if top == "doc":
        if len(parts) >= 2 and parts[1] == "retro-futurism":
            rest = rel[len("doc/retro-futurism/"):]
            # 附录_<theme>卷/README.md -> 主题从目录名
            if rest.startswith("附录_"):
                seg = re.match(r"附录_([^/]+)卷", rest)
                return (seg.group(1) if seg else "附录") + "卷"
            # 正文 NN_<篇名>_...
            m = re.match(r"\d\d_([^_]+篇)", os.path.basename(rel))
            if m:
                return m.group(1)
            if "索引" in os.path.basename(rel) or "统计" in os.path.basename(rel):
                return "索引"
            if "合订本" in os.path.basename(rel):
                return "合订"
            return "总论"
        if len(parts) >= 3 and parts[1] == "punks":
            return parts[2]  # atompunk/biopunk/...
        return "doc"
    if top == "studio":
        return "工作室" if len(parts) < 2 else parts[1]
    if top == "projects" and len(parts) >= 2:
        proj = parts[1]
        if len(parts) >= 4 and parts[2] == "docs":
            return "项目:" + parts[3]
        if len(parts) >= 3 and parts[2] in ("plans",):
            return "项目:计划"
        if len(parts) >= 3 and parts[2] == "data":
            return "项目:数据"
        if len(parts) >= 3 and parts[2] == "README.md":
            return "项目:" + proj
        return "项目:" + proj
    if top == "tech":
        return "技术规范"
    if top == "lab":
        return "实验区"
    if top == "tools":
        return "工具"
    return "其他"


# ----------------------------------------------------------------------------
# 收集 & 建图
# ----------------------------------------------------------------------------
def collect_docs():
    docs = []
    seen = set()
    root_readme = os.path.join(ROOT, "README.md")
    if os.path.isfile(root_readme):
        _add_doc(root_readme, docs, seen)
    for sub in SCAN_DIRS:
        base_abs = os.path.join(ROOT, sub)
        if not os.path.isdir(base_abs):
            continue
        for dirpath, dirnames, filenames in os.walk(base_abs):
            dirnames[:] = [d for d in dirnames if d not in (".git", "target", "node_modules")]
            for fn in filenames:
                if fn.endswith(".md"):
                    _add_doc(os.path.join(dirpath, fn), docs, seen)
    return docs


def _add_doc(abs_path, docs, seen):
    abs_path = os.path.abspath(abs_path)
    if abs_path in seen:
        return
    seen.add(abs_path)
    rel = os.path.relpath(abs_path, ROOT)
    docs.append(parse_doc(abs_path, rel))


def build_graph(docs):
    """返回 (nodes, edges)。nodes=doc dict 列表(带 id/degree/theme/day)，
    edges=去重的 (src_id, dst_id) 列表。"""
    idx = {d["abs"]: i for i, d in enumerate(docs)}
    nodes = []
    for d in docs:
        theme = themes_for(d["rel"])
        nodes.append(
            {
                **d,
                "id": idx[d["abs"]],
                "theme": theme,
                "degree": 0,
                "day": days_since(d["iso"]),
            }
        )
    edges = set()
    for d in docs:
        src = idx[d["abs"]]
        for tgt in d["targets"]:
            dst = idx.get(tgt)
            if dst is None:
                continue
            if src == dst:
                continue
            edges.add((src, dst))
            # 度增量（无向）
            nodes[src]["degree"] += 1
            nodes[dst]["degree"] += 1
    return nodes, sorted(edges)


# ----------------------------------------------------------------------------
# 颜色 / 布局
# ----------------------------------------------------------------------------
def color_for(theme):
    palette = [
        "#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#8e44ad", "#e76f51",
        "#1d3557", "#6a994e", "#bc6c25", "#c1121f", "#5e548e", "#00a8a8",
        "#e07a5f", "#81b29a", "#3d405b", "#f2cc8f", "#9d4edd", "#0a9396",
    ]
    h = sum(ord(c) for c in theme) % len(palette)
    return palette[h]


def radial_positions(nodes):
    """按主题聚类的放射状静态布局，确定性（排序）。返回 {id: (x, y, r)}。"""
    from collections import defaultdict
    groups = defaultdict(list)
    for n in nodes:
        groups[n["theme"]].append(n["id"])

    # 中心与半径（放射状，确定性）
    cx, cy = 0.0, 0.0
    R_base = 120.0
    theme_keys = sorted(groups.keys())
    n_theme = max(1, len(theme_keys))
    pos = {}

    # 先给每个主题一个扇区
    for i, theme in enumerate(theme_keys):
        ids = groups[theme]
        start_angle = (2 * math.pi) * (i / n_theme)
        sector = (2 * math.pi) / n_theme
        ids_sorted = sorted(ids)
        m = len(ids_sorted)
        for j, nid in enumerate(ids_sorted):
            # 扇区内沿弧线排布，半径随序号增加（避免重叠）
            frac = (j + 1) / (m + 1)
            ang = start_angle + sector * frac
            radius = (R_base + 60 * (m / 20.0)) + (25.0 * (j % 12))
            x = cx + radius * math.cos(ang)
            y = cy + radius * math.sin(ang)
            pos[nid] = (x, y, radius)
    return pos


# ----------------------------------------------------------------------------
# HTML 渲染
# ----------------------------------------------------------------------------
def svg_graph(nodes, edges, pos):
    n_id = {n["id"]: n for n in nodes}
    edge_limit = MAX_EDGES_PER_NODE
    used_edges = set()
    edge_lines = []
    for (a, b) in edges:
        if len(used_edges) >= 4000:
            break
        if a > b:
            a, b = b, a
        if (a, b) in used_edges:
            continue
        used_edges.add((a, b))
        if n_id[a]["degree"] > edge_limit or n_id[b]["degree"] > edge_limit:
            continue
        x1, y1, _ = pos[a]
        x2, y2, _ = pos[b]
        edge_lines.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}"/>')

    node_circles = []
    for n in nodes:
        x, y, _ = pos[n["id"]]
        r = 3 + min(14.0, 4 * math.sqrt(n["degree"] + 1))
        fill = color_for(n["theme"])
        stroke = ""
        cls = []
        if n["day"] is not None and n["day"] > STALE_DAYS:
            stroke = 'stroke="#c1121f" stroke-width="2"'
            cls.append("stale")
        if n["degree"] == 0:
            stroke = 'stroke="#333" stroke-width="1.5" stroke-dasharray="2 2"'
            cls.append("orphan")
        label = escape(n["rel"])
        title = escape(n["title"])
        node_circles.append(
            f'<circle class="node {" ".join(cls)}" data-rel="{label}" '
            f'data-title="{title}" cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" '
            f'fill="{fill}" opacity="0.9" {stroke}/>'
        )

    vb_w = 1600
    vb_h = 1600
    return (
        f'<svg viewBox="{-800} {-800} {vb_w} {vb_h}" width="100%" height="560">'
        f'<g class="edges">{"".join(edge_lines)}</g>'
        f'<g class="nodes">{"".join(node_circles)}</g></svg>',
        pos,
    )


def escape(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def html_summary(nodes, edges):
    total_open = sum(n["open"] for n in nodes)
    total_closed = sum(n["closed"] for n in nodes)
    orphans = [n for n in nodes if n["degree"] == 0]
    stale = [n for n in nodes if n["day"] is not None and n["day"] > STALE_DAYS]
    return orphans, stale, total_open, total_closed


def anomaly_panel(nodes, edges):
    orphans = [n for n in nodes if n["degree"] == 0]
    high_open = sorted([n for n in nodes if n["open"] > 0], key=lambda n: -n["open"])[:HIGH_OPEN_TOP]
    stale = sorted([n for n in nodes if n["day"] is not None and n["day"] > STALE_DAYS],
                   key=lambda n: -n["day"])[:ANOMALY_LIST_LEN]

    def rows(items):
        parts = []
        for n in items:
            parts.append(
                f'<li><b>{escape(n["title"])}</b> '
                f'<span class=dim>{escape(n["rel"])}</span> '
                f'<span class=meta>链接{n["degree"]} · 待定{n["open"]} · 已定{n["closed"]} · '
                f'{"陈旧"+str(n["day"])+"天" if n["day"] is not None and n["day"]>STALE_DAYS else ""}</span></li>'
            )
        return "".join(parts) if parts else "<li class=dim>无</li>"

    return orphans, high_open, stale, rows


def render_html(nodes, edges, pos, out_path):
    orphans, stale, total_open, total_closed = html_summary(nodes, edges)
    orphans_all, high_open, stale_top, rows = anomaly_panel(nodes, edges)
    svg, _ = svg_graph(nodes, edges, pos)

    legend = sorted({n["theme"] for n in nodes})
    legend_html = "".join(
        f'<span class="legend-item"><span class="dot" style="background:{color_for(t)}"/>'
        f'{escape(t)} ({sum(1 for n in nodes if n["theme"]==t)})</span>'
        for t in legend
    )

    table_rows = []
    for n in sorted(nodes, key=lambda n: n["rel"]):
        table_rows.append(
            f'<tr><td>{escape(n["title"])}</td><td class=dim>{escape(n["rel"])}</td>'
            f'<td>{n["open"]}</td><td>{n["closed"]}</td><td>{n["degree"]}</td>'
            f'<td>{n["day"] if n["day"] is not None else "—"}</td></tr>'
        )

    html = f"""<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>文档健康仪表盘 · formal-system 可视验证面</title>
<style>
:root {{ --fg:#1d2b3a; --dim:#6b7280; --bg:#f7f8fa; --card:#fff; --line:#e5e7eb; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
  color:var(--fg); background:var(--bg); }}
.wrap {{ max-width:1200px; margin:0 auto; padding:24px 20px 60px; }}
h1 {{ font-size:22px; margin:0 0 4px; }}
.sub {{ color:var(--dim); font-size:13px; margin-bottom:18px; }}
.tiles {{ display:grid; grid-template-columns:repeat(6,1fr); gap:12px; margin-bottom:18px; }}
.tile {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px 14px; }}
.tile b {{ display:block; font-size:24px; }}
.tile span {{ font-size:12px; color:var(--dim); }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:18px; }}
h2 {{ font-size:16px; margin:0 0 10px; }}
svg {{ background:#fbfcfe; border-radius:8px; }}
svg line {{ stroke:#c9d3de; stroke-width:1; }}
svg circle.node {{ cursor:pointer; }}
svg circle.node:hover {{ stroke:#1d2b3a; stroke-width:2; }}
#tip {{ position:fixed; pointer-events:none; background:#1d2b3a; color:#fff; padding:8px 10px;
  border-radius:6px; font-size:12px; max-width:360px; opacity:0; transition:opacity .12s; z-index:9; }}
.legend {{ display:flex; flex-wrap:wrap; gap:10px; margin-top:10px; font-size:12px; color:var(--dim); }}
.legend-item {{ display:inline-flex; align-items:center; gap:4px; }}
.dot {{ width:10px; height:10px; border-radius:50%; display:inline-block; }}
.cols {{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }}
li {{ margin:5px 0; font-size:13px; }}
.dim {{ color:var(--dim); }} .meta {{ color:var(--dim); margin-left:6px; font-size:12px; }}
table {{ width:100%; border-collapse:collapse; font-size:12px; }}
th,td {{ text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); }}
th {{ color:var(--dim); font-weight:600; }}
.scroll {{ max-height:480px; overflow:auto; }}
</style></head>
<body><div class="wrap">
<h1>文档健康仪表盘</h1>
<div class="sub">formal-system 可视验证面（实验层F）· 生成时间 {datetime.datetime.now().astimezone():%Y-%m-%d %H:%M %Z} ·
零依赖自包含 · 由 <code>lab/formal-system/tools/visual_health.py</code> 一键重跑</div>

<div class="tiles">
  <div class="tile"><b>{len(nodes)}</b><span>文档</span></div>
  <div class="tile"><b>{len(edges)}</b><span>互链</span></div>
  <div class="tile"><b>{total_open}</b><span>【待定】</span></div>
  <div class="tile"><b>{total_closed}</b><span>【已定】</span></div>
  <div class="tile"><b>{len(orphans)}</b><span>孤立文档</span></div>
  <div class="tile"><b>{len(stale)}</b><span>陈旧(&gt;{STALE_DAYS}天)</span></div>
</div>

<div class="card">
  <h2>文档图谱（节点∝活跃度 · 主题着色 · 红环=陈旧 · 虚线=孤立）</h2>
  {svg}
  <div class="legend">{legend_html}</div>
</div>

<div class="cols">
  <div class="card"><h2>孤立文档（无任何互链）</h2><ul>{rows(orphans_all)}</ul></div>
  <div class="card"><h2>高【待定】文档（打开问题最多）</h2><ul>{rows(high_open)}</ul></div>
  <div class="card"><h2>陈旧文档（最近变更 &gt;{STALE_DAYS} 天）</h2><ul>{rows(stale_top)}</ul></div>
  <div class="card"><h2>清单（排序）</h2>
    <div class="scroll"><table><thead><tr><th>标题</th><th>路径</th><th>待定</th><th>已定</th><th>链接</th><th>变更天数</th></tr></thead>
    <tbody>{''.join(table_rows)}</tbody></table></div>
  </div>
</div>

<div id="tip"></div>
</div>
""" + SCRIPT_JS + "</body></html>"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)


def write_json(out_html, nodes, edges):
    """输出机器可读的摘要 JSON，便于 CI/报告/对话内卡片复用。"""
    themes = {}
    for n in nodes:
        t = n["theme"]
        th = themes.setdefault(t, {"docs": 0, "open": 0, "closed": 0, "orphan": 0})
        th["docs"] += 1
        th["open"] += n["open"]
        th["closed"] += n["closed"]
        if n["degree"] == 0:
            th["orphan"] += 1
    orphans, stale, total_open, total_closed = html_summary(nodes, edges)
    top_open = sorted([n for n in nodes if n["open"] > 0], key=lambda n: -n["open"])[:10]
    data = {
        "generated": datetime.datetime.now().astimezone().isoformat(),
        "counts": {
            "docs": len(nodes), "links": len(edges), "open": total_open,
            "closed": total_closed, "orphans": len(orphans), "stale": len(stale),
        },
        "themes": themes,
        "top_open": [{"title": n["title"], "rel": n["rel"], "open": n["open"]} for n in top_open],
    }
    json_path = os.path.splitext(out_html)[0] + ".json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return json_path


def main():
    out = DEFAULT_OUT
    if "--out" in sys.argv:
        i = sys.argv.index("--out")
        if i + 1 < len(sys.argv):
            out = sys.argv[i + 1]

    docs = collect_docs()
    nodes, edges = build_graph(docs)
    pos = radial_positions(nodes)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    render_html(nodes, edges, pos, out)
    json_path = write_json(out, nodes, edges)

    orphans, stale, total_open, total_closed = html_summary(nodes, edges)
    print(f"文档 {len(nodes)} 张, 互链 {len(edges)} 条")
    print(f"【待定】{total_open} / 【已定】{total_closed}")
    print(f"孤立文档 {len(orphans)} 张, 陈旧(>{STALE_DAYS}天) {len(stale)} 张")
    print(f"仪表盘已生成: {out}")
    print(f"数据已生成:   {json_path}")


if __name__ == "__main__":
    main()
