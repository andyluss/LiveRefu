#!/usr/bin/env python3
"""build_flow.py —— 从状态/命令/事件 + 迁移模型生成静态流程图。

生成：
  flows/game_flow.{md,html}     一局总状态机
  flows/player_flow.{md,html}   玩家操作流程
  flows/wave_flow.{md,html}     波次生命周期
  flows/l1_flow.{md,html}       L1 检查单/故障/记录
  flows/data_flow.{md,html}     数据到 MissionPack
  flows/extra_flows.html        四张补充图总览

用法：
  python3 tools/build_flow.py
  python3 tools/build_flow.py --check
"""
from __future__ import annotations

import html
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
FLOW_DIR = ROOT / "docs-ai" / "design01" / "flows"
SIM = ROOT / "game" / "scripts" / "core" / "sim.gd"
RUNTIME = ROOT / "game" / "scripts" / "application" / "mission_runtime.gd"

# 流程层概念：核心状态 + 运行时等待态（等待态不是 Sim.State 枚举值）。
OVERLAYS = {
    "CHECKLIST": "检查单等待（W4/W5）",
    "FAULT": "故障选择等待（W5）",
}

# 人写的迁移模型；生成器负责校验状态、命令、事件是否真实存在。
TRANSITIONS = [
    dict(frm="[*]", to="PREP", trigger="new_run", source="internal", kind="system",
         guard="创建 MissionRuntime", effect="clock / event bus / black box 初始化"),
    dict(frm="PREP", to="WAVE", trigger="start_wave", source="command", kind="player",
         guard="state == PREP", effect="生成第 1 波；玩家也可提前开波"),
    dict(frm="WAVE", to="BETWEEN", trigger="WaveCleared", source="event", kind="system",
         guard="spawn_queue 空且 enemies 空；不是最后一波", effect="进入波间整备"),
    dict(frm="BETWEEN", to="WAVE", trigger="start_wave", source="command", kind="player",
         guard="state == BETWEEN", effect="生成下一波"),
    dict(frm="WAVE", to="WON", trigger="last_wave_cleared", source="internal", kind="system",
         guard="最后一波清除", effect="结算 grade / integrity / kills"),
    dict(frm="WAVE", to="LOST", trigger="integrity_zero", source="system", kind="system",
         guard="integrity <= 0", effect="事故结算，可重试"),
    dict(frm="BETWEEN", to="CHECKLIST", trigger="ChecklistRequested", source="event", kind="system",
         guard="下一波有检查单（W4/W5）；clock 暂停", effect="打开检查单 UI"),
    dict(frm="CHECKLIST", to="BETWEEN", trigger="submit_checklist", source="command", kind="player",
         guard="pending card 匹配", effect="写入检查单结果；恢复 clock"),
    dict(frm="WAVE", to="FAULT", trigger="FaultChoiceRequested", source="event", kind="system",
         guard="W5 故障命中；clock 暂停", effect="打开隔离/旁路 UI"),
    dict(frm="FAULT", to="WAVE", trigger="submit_fault_choice", source="command", kind="player",
         guard="fault_choice_pending", effect="应用隔离/旁路；恢复 clock"),
    dict(frm="WON", to="PREP", trigger="reset", source="command", kind="player",
         guard="本班结束", effect="重开一班；保留接班记忆"),
    dict(frm="LOST", to="PREP", trigger="reset", source="command", kind="player",
         guard="本班结束", effect="重开一班；保留接班记录"),
]

# 仅供 SVG 布局；key 为状态名。
POS = {
    "PREP": (90, 120), "WAVE": (330, 120), "BETWEEN": (570, 120), "WON": (810, 120),
    "CHECKLIST": (330, 330), "FAULT": (90, 330), "LOST": (570, 330),
}

STATE_DESC = {
    "PREP": "准备：看路径、塔位、供能，决定第一座塔。",
    "WAVE": "交战：敌人沿路径移动，塔开火，故障可能命中。",
    "BETWEEN": "波间整备：补塔、升级、修复，准备下一波。",
    "WON": "结束：5 波清除，结算评级与保障度。",
    "LOST": "结束：保障度归零，结算事故。",
    "CHECKLIST": "等待：W4/W5 检查单打开，clock 暂停。",
    "FAULT": "等待：W5 故障命中，选择隔离/旁路。",
}


def read_states() -> list[str]:
    src = SIM.read_text(encoding="utf-8")
    m = re.search(r"enum\s+State\s*\{([^}]*)\}", src)
    if not m:
        raise SystemExit("build_flow: 找不到 Sim.State 枚举")
    return [x.strip() for x in m.group(1).split(",") if x.strip()]


def read_commands() -> list[str]:
    src = RUNTIME.read_text(encoding="utf-8")
    return sorted(set(re.findall(r'commands\.register\(&"([^"]+)"', src)))


def read_events() -> list[str]:
    src = RUNTIME.read_text(encoding="utf-8")
    return sorted(set(re.findall(r'emit_event\(&"([^"]+)"', src)))


def validate(states: list[str], commands: list[str], events: list[str]) -> None:
    known = set(states) | set(OVERLAYS) | {"[*]"}
    problems = []
    for t in TRANSITIONS:
        if t["frm"] not in known:
            problems.append(f"未知来源状态 {t['frm']}")
        if t["to"] not in known:
            problems.append(f"未知目标状态 {t['to']}")
        if t["source"] == "command" and t["trigger"] not in commands:
            problems.append(f"命令不存在 {t['trigger']}（{t['frm']}→{t['to']}）")
        if t["source"] == "event" and t["trigger"] not in events:
            problems.append(f"事件不存在 {t['trigger']}（{t['frm']}→{t['to']}）")
    if problems:
        raise SystemExit("build_flow: 迁移模型与代码不一致：\n  " + "\n  ".join(problems))


def mermaid(states: list[str], commands: list[str], events: list[str]) -> str:
    lines = [
        "# LiveBay · 一局静态流程图",
        "",
        "> 由 `tools/build_flow.py` 生成；状态/命令/事件来自 `game/scripts/`，迁移模型人工维护。",
        "> 检查单/故障等待态是流程层概念，不是 `Sim.State` 的枚举值。",
        "",
        "```mermaid",
        "stateDiagram-v2",
    ]
    for s in states:
        lines.append(f"    state \"{s} · {STATE_DESC[s]}\" as {s}")
    for s, desc in OVERLAYS.items():
        lines.append(f"    state \"{s} · {desc}\" as {s}")
    lines.append("")
    for t in TRANSITIONS:
        label = t["trigger"]
        if t["guard"]:
            label += " [" + t["guard"] + "]"
        lines.append(f"    {t['frm']} --> {t['to']}: {label}")
    lines += ["```", "", "## 迁移表", "",
              "| 从 | 触发 | 到 | 类型 | 守卫 | 副作用 |",
              "| --- | --- | --- | --- | --- | --- |"]
    for t in TRANSITIONS:
        lines.append("| %s | `%s` | %s | %s | %s | %s |" % (
            t["frm"], t["trigger"], t["to"], t["kind"], t["guard"], t["effect"]))
    lines += ["", "## 代码事实", "",
              f"- 核心状态：`{', '.join(states)}`",
              f"- 运行时等待态：`{', '.join(OVERLAYS)}`",
              f"- 命令（{len(commands)}）：`{', '.join(commands)}`",
              f"- 事件（{len(events)}）：`{', '.join(events)}`",
              "", "## 怎么维护", "",
              "1. 改状态/命令/事件后跑 `./run.sh flow`；",
              "2. 迁移模型变了，改 `tools/build_flow.py` 的 `TRANSITIONS`；",
              "3. `--check` 会校验生成物是否过期，以及命令/事件是否真实存在。",
              ""]
    return "\n".join(lines)


def edge_svg() -> str:
    """固定布局的 SVG 边；不依赖 Mermaid/CDN。"""
    def box(name):
        x, y = POS[name]
        return x, y

    # 每条边的 path 与标签位置；不是自动布局，布局本身就是图的一部分。
    edges = [
        ("[*]", "PREP", "M 30 50 L 90 88", "new_run", 58, 73),
        ("PREP", "WAVE", "M 160 120 L 250 120", "start_wave", 205, 108),
        ("WAVE", "BETWEEN", "M 400 120 L 490 120", "cleared", 445, 108),
        ("BETWEEN", "WON", "M 640 120 L 730 120", "last wave", 685, 108),
        ("WAVE", "LOST", "M 390 152 C 430 250, 500 300, 550 330", "integrity=0", 470, 250),
        ("WAVE", "FAULT", "M 300 152 C 230 230, 180 290, 150 330", "fault", 205, 245),
        ("FAULT", "WAVE", "M 130 300 C 180 230, 240 190, 300 150", "choice", 190, 235),
        ("BETWEEN", "CHECKLIST", "M 540 152 C 500 230, 450 290, 400 330", "checklist", 470, 245),
        ("CHECKLIST", "BETWEEN", "M 380 300 C 430 230, 500 190, 540 150", "submit", 455, 235),
        ("BETWEEN", "WAVE", "M 570 88 C 520 30, 440 30, 390 88", "start_wave (loop)", 480, 34),
        ("WON", "PREP", "M 810 88 C 600 0, 200 0, 90 88", "reset", 450, 18),
        ("LOST", "PREP", "M 570 362 C 350 430, 130 430, 90 152", "reset", 330, 430),
    ]
    parts = ['<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="var(--line-strong)"/></marker></defs>']
    for frm, to, d, label, lx, ly in edges:
        parts.append(f'<path class="edge" d="{d}" marker-end="url(#arrow)"/>')
        parts.append(f'<text class="edge-label" x="{lx}" y="{ly}" text-anchor="middle">{html.escape(label)}</text>')
    for name in POS:
        x, y = POS[name]
        kind = "overlay" if name in OVERLAYS else ("terminal" if name in ("WON", "LOST") else "core")
        parts.append(f'<g class="node {kind}"><rect x="{x-70}" y="{y-32}" width="140" height="64" rx="12"/>'
                     f'<text class="node-name" x="{x}" y="{y-4}" text-anchor="middle">{name}</text>'
                     f'<text class="node-sub" x="{x}" y="{y+14}" text-anchor="middle">{STATE_DESC[name][:18]}</text></g>')
    parts.append('<text class="start-label" x="30" y="30" text-anchor="middle">start</text>')
    return "".join(parts)


def html_page(states: list[str], commands: list[str], events: list[str]) -> str:
    rows = "".join(
        f'<tr><td><code>{html.escape(t["frm"])}</code></td><td><code>{html.escape(t["trigger"])}</code></td>'
        f'<td><code>{html.escape(t["to"])}</code></td><td>{html.escape(t["kind"])}</td>'
        f'<td>{html.escape(t["guard"])}</td><td>{html.escape(t["effect"])}</td></tr>'
        for t in TRANSITIONS)
    state_chips = "".join(f'<span class="chip core">{html.escape(s)}</span>' for s in states)
    overlay_chips = "".join(f'<span class="chip overlay">{html.escape(s)}</span>' for s in OVERLAYS)
    return f'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>LiveBay · 一局静态流程图</title>
<meta name="description" content="LiveBay 一局的静态状态机：状态、命令、事件、守卫条件与检查单/故障等待态。">
<script>
(function () {{
  var KEY = 'lrds-theme';
  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  var choice = 'system';
  try {{
    var saved = localStorage.getItem(KEY);
    if (saved === 'system' || saved === 'light' || saved === 'dark') choice = saved;
  }} catch (e) {{}}
  function apply() {{
    var mode = choice === 'system' ? (mql.matches ? 'dark' : 'light') : choice;
    document.documentElement.dataset.theme = mode;
    document.documentElement.dataset.themeChoice = choice;
    document.documentElement.classList.add('js');
  }}
  apply();
  try {{ mql.addEventListener('change', function () {{
    if (document.documentElement.dataset.themeChoice === 'system') apply();
  }}); }} catch (e) {{}}
}})();
</script>
<style>
:root {{
  color-scheme: light dark;
  --bg:#e9e3d5; --panel:#f5efe2; --panel2:#ded5c3; --ink:#232b2f; --muted:#5f6967;
  --line:#b9ae98; --line-strong:#8f8778; --teal:#2f6b65; --orange:#c95b2c; --amber:#b47a16;
  --shadow:0 16px 40px rgba(35,43,47,.12); --mono:"SFMono-Regular",Consolas,monospace;
  --sans:"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC",system-ui,sans-serif;
}}
:root[data-theme="light"] {{ color-scheme: light; }}
:root[data-theme="dark"] {{
  color-scheme: dark;
  --bg:#11181b; --panel:#182326; --panel2:#223136; --ink:#e9e3d5; --muted:#a9b4b0;
  --line:#3d4d4d; --line-strong:#6d7d78; --teal:#73c5bb; --orange:#ed8a5a; --amber:#e0b35f;
  --shadow:0 18px 50px rgba(0,0,0,.35);
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme]) {{ color-scheme: dark; }} }}
* {{ box-sizing: border-box; }}
body {{ margin:0; background:var(--bg); color:var(--ink); font:15px/1.65 var(--sans); }}
a {{ color:var(--teal); }}
.topbar {{ position:sticky; top:0; z-index:10; display:flex; justify-content:space-between; align-items:center; gap:12px;
  padding:10px clamp(14px,4vw,40px); background:color-mix(in srgb,var(--bg) 90%,transparent);
  border-bottom:1px solid var(--line); backdrop-filter:blur(12px); }}
.brand span {{ display:block; font:700 10px/1.4 var(--mono); letter-spacing:.16em; color:var(--orange); }}
.theme-switch {{ display:flex; gap:4px; border:1px solid var(--line); border-radius:999px; padding:3px; background:var(--panel); }}
.theme-switch button {{ border:0; background:transparent; color:var(--muted); padding:6px 10px; border-radius:999px; cursor:pointer; font-size:12px; }}
.theme-switch button[aria-pressed="true"] {{ background:var(--ink); color:var(--panel); }}
.wrap {{ max-width:1180px; margin:0 auto; padding:clamp(24px,5vw,50px) clamp(14px,4vw,40px) 60px; }}
.eyebrow {{ margin:0 0 10px; font:700 11px/1 var(--mono); letter-spacing:.2em; color:var(--orange); text-transform:uppercase; }}
h1 {{ margin:0; font-size:clamp(30px,5vw,54px); line-height:1.08; letter-spacing:-.04em; }}
.lede {{ max-width:70ch; color:var(--muted); font-size:clamp(15px,1.6vw,18px); }}
.badges {{ display:flex; gap:8px; flex-wrap:wrap; margin:16px 0; }}
.chip {{ border:1px solid var(--line); border-radius:999px; padding:3px 9px; font:600 11px var(--mono); color:var(--muted); }}
.chip.core {{ color:var(--teal); border-color:color-mix(in srgb,var(--teal) 45%,var(--line)); }}
.chip.overlay {{ color:var(--amber); border-color:color-mix(in srgb,var(--amber) 45%,var(--line)); border-style:dashed; }}
.card {{ background:var(--panel); border:1px solid var(--line); border-radius:16px; box-shadow:var(--shadow); padding:18px; margin-top:16px; }}
h2 {{ font-size:19px; margin:0 0 4px; }} h2 .n {{ color:var(--orange); font:700 11px var(--mono); margin-right:8px; }}
.hint {{ color:var(--muted); font-size:12.5px; margin:0 0 12px; }}
.diagram {{ width:100%; height:auto; display:block; background:var(--bg); border:1px solid var(--line); border-radius:12px; }}
.diagram .edge {{ fill:none; stroke:var(--line-strong); stroke-width:1.6; opacity:.9; }}
.diagram .node rect {{ fill:var(--panel2); stroke:var(--line); stroke-width:1.5; }}
.diagram .node.core rect {{ stroke:var(--teal); }}
.diagram .node.overlay rect {{ stroke:var(--amber); stroke-dasharray:5 4; fill:transparent; }}
.diagram .node.terminal rect {{ fill:var(--ink); stroke:var(--ink); }}
.diagram .node.terminal .node-name {{ fill:var(--panel); }} .diagram .node.terminal .node-sub {{ fill:var(--panel2); }}
.diagram .node-name {{ fill:var(--ink); font:700 13px var(--sans); }}
.diagram .node-sub {{ fill:var(--muted); font:9px var(--mono); }}
.diagram .edge-label {{ fill:var(--muted); font:9px var(--mono); paint-order:stroke; stroke:var(--bg); stroke-width:3px; }}
.diagram .start-label {{ fill:var(--muted); font:9px var(--mono); }}
table {{ width:100%; border-collapse:collapse; font-size:12.5px; }}
th,td {{ text-align:left; vertical-align:top; padding:7px 8px; border-bottom:1px solid var(--line); }}
th {{ color:var(--muted); font-weight:600; }}
code {{ font-family:var(--mono); font-size:.9em; }}
.method {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; }}
.method article {{ border:1px solid var(--line); border-radius:10px; padding:10px 12px; background:var(--bg); }}
.method h3 {{ margin:0 0 4px; font-size:13px; }} .method p {{ margin:0; color:var(--muted); font-size:12px; }}
.foot {{ margin-top:22px; border-top:1px solid var(--line); padding-top:12px; color:var(--muted); font-size:12px; }}
.noscript {{ border:1px solid var(--orange); color:var(--orange); padding:10px; border-radius:8px; }}
@media print {{
  :root,:root[data-theme] {{ color-scheme:light; --bg:#fff; --panel:#fff; --panel2:#eee; --ink:#111; --muted:#333; --line:#999; --line-strong:#555; }}
  .topbar,.theme-switch,.foot {{ display:none!important; }} .card {{ box-shadow:none; break-inside:avoid; }}
  body {{ background:#fff; }}
}}
</style>
</head>
<body>
<header class="topbar">
  <div class="brand"><span>LiveBay · design01 · flows</span><strong>一局静态流程图</strong></div>
  <div class="theme-switch" role="group" aria-label="主题">
    <button type="button" data-theme-choice="system" aria-pressed="true">系统</button>
    <button type="button" data-theme-choice="light" aria-pressed="false">浅色</button>
    <button type="button" data-theme-choice="dark" aria-pressed="false">深色</button>
  </div>
</header>
<main class="wrap">
  <p class="eyebrow">Generated from state / command / event</p>
  <h1>把一局游戏，压成一张可以验证的图。</h1>
  <p class="lede">这不是每一帧的录像，而是 LiveBay 的稳定状态、玩家命令、系统事件和守卫条件。检查单/故障等待态用虚线表示；它们不是 <code>Sim.State</code> 的枚举值。</p>
  <div class="badges">{state_chips}{overlay_chips}<span class="chip">{len(TRANSITIONS)} 条迁移</span></div>
  <noscript><div class="noscript">此页的交互只有主题切换；流程图、迁移表和说明无需 JavaScript。</div></noscript>

  <section class="card">
    <h2><span class="n">01</span>一局状态机</h2>
    <p class="hint">实线=核心迁移，虚线=等待态；WON/LOST 仍可通过 reset 回到 PREP。</p>
    <svg class="diagram" viewBox="0 0 1040 460" role="img" aria-label="LiveBay 一局状态机">
      {edge_svg()}
    </svg>
  </section>

  <section class="card">
    <h2><span class="n">02</span>迁移表：图的可验证版本</h2>
    <p class="hint">图用来理解，表用来实现和测试。每条边都有触发、守卫和副作用。</p>
    <table><thead><tr><th>从</th><th>触发</th><th>到</th><th>类型</th><th>守卫</th><th>副作用</th></tr></thead><tbody>{rows}</tbody></table>
  </section>

  <section class="card">
    <h2><span class="n">03</span>方法：动态怎么变静态</h2>
    <div class="method">
      <article><h3>按稳定状态截断</h3><p>只记录状态改变，不记录每一秒。</p></article>
      <article><h3>把循环折叠成回边</h3><p>五波不画五遍；用回边 + 终止条件。</p></article>
      <article><h3>把时间/随机放到边上</h3><p>超时、概率、并行都写成守卫或注释。</p></article>
      <article><h3>用日志反推</h3><p>从 EventBus / CommandBus / BlackBox 生成真实迁移。</p></article>
    </div>
    <p class="hint" style="margin-top:12px">完整方法与维护规则见 <a href="README.md">flows/README.md</a>；Mermaid 版见 <a href="game_flow.md">game_flow.md</a>。</p>
  </section>

  <footer class="foot">由 <code>tools/build_flow.py</code> 生成 · 状态/命令/事件来自 <code>game/scripts/</code> · 迁移模型人工维护 · 不要手改本页</footer>
</main>
<script>
(function () {{
  var KEY = 'lrds-theme';
  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-theme-choice]'));
  function apply() {{
    var c = document.documentElement.dataset.themeChoice || 'system';
    var mode = c === 'system' ? (mql.matches ? 'dark' : 'light') : c;
    document.documentElement.dataset.theme = mode;
    buttons.forEach(function (b) {{ b.setAttribute('aria-pressed', String(b.dataset.themeChoice === c)); }});
  }}
  buttons.forEach(function (b) {{
    b.addEventListener('click', function () {{
      document.documentElement.dataset.themeChoice = b.dataset.themeChoice;
      try {{ localStorage.setItem(KEY, b.dataset.themeChoice); }} catch (e) {{}}
      apply();
    }});
  }});
  try {{ mql.addEventListener('change', apply); }} catch (e) {{}}
  apply();
}})();
</script>
</body>
</html>'''



ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "docs-ai" / "design01" / "flows"

EXTRA_DOCS = [
    {
        "id": "player_flow",
        "title": "玩家操作流程",
        "desc": "一次值班里，玩家在准备/交战/整备之间做什么；暂停与倍速是横切操作，不改变核心状态。",
        "mermaid": """flowchart TD
    A[进入一班] --> B[PREP 准备]
    B --> C{选择塔位}
    C --> D{供能足够?}
    D -- 是 --> E[建造 / 升级 / 出售]
    D -- 否 --> F[等待补给 / 开波]
    E --> C
    F --> G{开波?}
    G -- 是 --> H[WAVE 交战]
    G -- 否 --> C
    H --> I{波次清除?}
    I -- 是 --> J[BETWEEN 整备]
    I -- 否 --> H
    J --> C
    J --> K{最后一波?}
    K -- 是 --> L[结算 / 重开]
    K -- 否 --> G
    P[暂停 / 倍速] -. 随时 .-> B
    P -. 随时 .-> H""",
        "dot": """digraph player {
  rankdir=LR; bgcolor="transparent"; fontname="PingFang SC"; fontsize=11;
  node [shape=box, style="rounded,filled", fillcolor="#F5EFE2", color="#6F7B89", fontcolor="#232B2F", fontname="PingFang SC", margin="0.16,0.08"];
  edge [color="#6F7B89", fontcolor="#5F6967", fontname="PingFang SC", fontsize=9];
  A [label="进入一班", shape=oval, fillcolor="#3E6F6B", fontcolor="#F5EFE2"];
  B [label="PREP 准备"];
  C [label="选择塔位", shape=diamond];
  D [label="供能足够?", shape=diamond];
  E [label="建造 / 升级 / 出售"];
  F [label="等待补给 / 开波"];
  G [label="开波?", shape=diamond];
  H [label="WAVE 交战"];
  I [label="波次清除?", shape=diamond];
  J [label="BETWEEN 整备"];
  K [label="最后一波?", shape=diamond];
  L [label="结算 / 重开", shape=oval, fillcolor="#D9622B", fontcolor="#F5EFE2"];
  P [label="暂停 / 倍速", style="dashed,rounded", fillcolor="transparent"];
  A -> B; B -> C; C -> D; D -> E [label="是"];
  D -> F [label="否"]; E -> C [label="继续建造"];
  F -> G; G -> H [label="是"]; G -> C [label="否"];
  H -> I; I -> J [label="是"]; I -> H [label="否"];
  J -> C; J -> K; K -> L [label="是"]; K -> G [label="否"];
  P -> B [style=dashed, label="随时"]; P -> H [style=dashed, label="随时"];
}""",
    },
    {
        "id": "wave_flow",
        "title": "波次生命周期",
        "desc": "从准备倒计时到生成、移动、命中/漏过、清除；最后一波进入 WON，保障度归零进入 LOST。",
        "mermaid": """flowchart TD
    A[PREP / BETWEEN] --> B[开始波次]
    B --> C[生成组：按 interval/delay]
    C --> D[敌人沿路径移动]
    D --> E{经过塔位?}
    E -- 故障 --> F[停塔 / 降级]
    E -- 普通 --> G[塔开火]
    F --> H[继续移动]
    G --> H
    H --> I{到湾口?}
    I -- 是 --> J[扣保障度]
    I -- 否 --> D
    J --> K{保障度=0?}
    K -- 是 --> L[LOST]
    K -- 否 --> M{波次清空?}
    M -- 否 --> D
    M -- 是 --> N{最后一波?}
    N -- 是 --> O[WON]
    N -- 否 --> P[BETWEEN]
    P --> B""",
        "dot": """digraph wave {
  rankdir=LR; bgcolor="transparent"; fontname="PingFang SC"; fontsize=11;
  node [shape=box, style="rounded,filled", fillcolor="#F5EFE2", color="#6F7B89", fontcolor="#232B2F", fontname="PingFang SC", margin="0.14,0.07"];
  edge [color="#6F7B89", fontcolor="#5F6967", fontname="PingFang SC", fontsize=9];
  A [label="PREP / BETWEEN"];
  B [label="开始波次"];
  C [label="生成组\\ninterval / delay"];
  D [label="敌人移动"];
  E [label="经过塔位?", shape=diamond];
  F [label="停塔 / 降级", fillcolor="#FFE8D8", color="#D9622B"];
  G [label="塔开火"];
  H [label="继续移动"];
  I [label="到湾口?", shape=diamond];
  J [label="扣保障度", fillcolor="#FFE8D8"];
  K [label="保障度=0?", shape=diamond];
  L [label="LOST", shape=oval, fillcolor="#8C4A32", fontcolor="#F5EFE2"];
  M [label="波次清空?", shape=diamond];
  N [label="最后一波?", shape=diamond];
  O [label="WON", shape=oval, fillcolor="#3E6F6B", fontcolor="#F5EFE2"];
  P [label="BETWEEN"];
  A -> B; B -> C; C -> D; D -> E;
  E -> F [label="故障"]; E -> G [label="普通"];
  F -> H; G -> H; H -> I;
  I -> J [label="是"]; I -> D [label="否"];
  J -> K; K -> L [label="是"]; K -> M [label="否"];
  M -> D [label="否"]; M -> N [label="是"];
  N -> O [label="是"]; N -> P [label="否"];
  P -> B;
}""",
    },
    {
        "id": "l1_flow",
        "title": "L1 班次扩展流程",
        "desc": "W4 检查单、W5 故障选择、结算记录、接班记忆与低报审计；这些是班次层样例，不是核心状态枚举。",
        "mermaid": """flowchart TD
    A[BETWEEN / 第 4 波前] --> B[W4 检查单]
    B --> C{选项}
    C -- 照签 --> D[无额外效果]
    C -- 复查 --> E[故障停塔 -1s]
    C -- 按惯例 --> F[低报 +1]
    A --> G[W5 故障命中]
    G --> H{隔离 / 旁路}
    H -- 隔离 --> I[停塔 2.5s]
    H -- 旁路 --> J[降级 8s + 相邻 4s]
    D --> K[结算]
    E --> K
    F --> K
    I --> K
    J --> K
    K --> L[事故记录]
    L --> M[ShiftMemory / 10 班档案]
    M --> N{连续低报?}
    N -- 1 班 --> O[故障 +1s]
    N -- 2 班 --> P[广播 + 故障 +2s]
    N -- 3 班 --> Q[停班审计 2 班 + 禁用旁路]
    M --> R[下一班简报]""",
        "dot": """digraph l1 {
  rankdir=LR; bgcolor="transparent"; fontname="PingFang SC"; fontsize=11;
  node [shape=box, style="rounded,filled", fillcolor="#F5EFE2", color="#6F7B89", fontcolor="#232B2F", fontname="PingFang SC", margin="0.14,0.07"];
  edge [color="#6F7B89", fontcolor="#5F6967", fontname="PingFang SC", fontsize=9];
  A [label="BETWEEN / W4 前"];
  B [label="W4 检查单"];
  C [label="选项", shape=diamond];
  D [label="照签：无效果"];
  E [label="复查：故障 -1s"];
  F [label="按惯例：低报 +1"];
  G [label="W5 故障命中"];
  H [label="隔离 / 旁路", shape=diamond];
  I [label="隔离：停塔 2.5s"];
  J [label="旁路：降级 8s\\n相邻 4s"];
  K [label="结算"];
  L [label="事故记录"];
  M [label="ShiftMemory\\n10 班档案"];
  N [label="连续低报?", shape=diamond];
  O [label="故障 +1s"];
  P [label="广播 + 故障 +2s"];
  Q [label="停班审计 2 班\\n禁用旁路"];
  R [label="下一班简报"];
  A -> B; B -> C; C -> D; C -> E; C -> F;
  A -> G; G -> H; H -> I; H -> J;
  D -> K; E -> K; F -> K; I -> K; J -> K;
  K -> L; L -> M; M -> N;
  N -> O [label="1 班"]; N -> P [label="2 班"]; N -> Q [label="3 班"];
  M -> R [label="下一班"];
}""",
    },
    {
        "id": "data_flow",
        "title": "数据到 MissionPack",
        "desc": "Markdown 数值表是源；Python 导出 JSON，编译 MissionPack；DataLoader 校验后进入 Sim。测试和 HUB 再反过来校验数据。",
        "mermaid": """flowchart TD
    A[numbers/*.md] --> B[export_numbers.py]
    B --> C[game/data/*.json]
    C --> D[export_mission_pack.py]
    D --> E[MissionPack manifest + hash]
    E --> F[DataLoader]
    C --> F
    F --> G[MissionRuntime / Sim]
    G --> H[tests / blackbox / playtest]
    H --> I[tests & HUB facts]
    I --> A""",
        "dot": """digraph data {
  rankdir=LR; bgcolor="transparent"; fontname="PingFang SC"; fontsize=11;
  node [shape=box, style="rounded,filled", fillcolor="#F5EFE2", color="#6F7B89", fontcolor="#232B2F", fontname="PingFang SC", margin="0.14,0.07"];
  edge [color="#6F7B89", fontcolor="#5F6967", fontname="PingFang SC", fontsize=9];
  A [label="numbers/*.md\\n唯一数值源"];
  B [label="export_numbers.py"];
  C [label="game/data/*.json"];
  D [label="export_mission_pack.py"];
  E [label="MissionPack\\nmanifest + hash"];
  F [label="DataLoader\\n校验"];
  G [label="MissionRuntime / Sim"];
  H [label="tests / blackbox / playtest"];
  I [label="测试 & HUB facts\\n反向校验"];
  A -> B; B -> C; C -> D; D -> E; E -> F; C -> F;
  F -> G; G -> H; H -> I; I -> A [style=dashed, label="反馈"];
}""",
    },
]


def render_extra_svg(dot_src: str) -> str:
    proc = subprocess.run(["dot", "-Tsvg"], input=dot_src, text=True, capture_output=True)
    if proc.returncode != 0:
        raise SystemExit("build_flow: graphviz dot 失败：\n" + proc.stderr)
    return proc.stdout


def write_extra_md(doc: dict) -> str:
    return f"""# {doc['title']}

> 由 `tools/build_flow.py` 生成；配套总览见 [README.md](README.md)，总状态机见 [game_flow.md](game_flow.md)。

{doc['desc']}

```mermaid
{doc['mermaid']}
```

## 说明

- 这张图是流程/结构图，不是数值平衡表；
- 图中的“等待/选项”是流程层概念，不一定是 `Sim.State` 的枚举值；
- 改状态/命令/事件后运行 `./run.sh flow` 重新生成。
"""


def extra_overview_html(docs: list[dict], svgs: dict[str, str]) -> str:
    sections = []
    for d in docs:
        sections.append(f'''<section class="card" id="{d['id']}">
  <h2>{html.escape(d['title'])}</h2>
  <p class="hint">{html.escape(d['desc'])}</p>
  <div class="diagram">{svgs[d['id']]}</div>
  <p class="hint"><a href="{d['id']}.html">单页 HTML</a> · <a href="{d['id']}.md">Markdown / Mermaid 版</a></p>
</section>''')
    nav = "".join(f'<a href="#{d["id"]}">{html.escape(d["title"])}</a>' for d in docs)
    return f'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>LiveBay · 补充流程图</title>
<script>
(function () {{
  var KEY='lrds-theme', choice='system', saved=null;
  try {{ saved=localStorage.getItem(KEY); }} catch(e) {{}}
  if (saved==='system'||saved==='light'||saved==='dark') choice=saved;
  var mql=window.matchMedia('(prefers-color-scheme: dark)');
  document.documentElement.dataset.theme=choice==='system'?(mql.matches?'dark':'light'):choice;
  document.documentElement.dataset.themeChoice=choice;
  document.documentElement.classList.add('js');
}})();
</script>
<style>
:root{{color-scheme:light dark;--bg:#e9e3d5;--panel:#f5efe2;--ink:#232b2f;--muted:#5f6967;--line:#b9ae98;--teal:#2f6b65;--orange:#c95b2c;--shadow:0 14px 36px rgba(35,43,47,.1);--sans:"PingFang SC","Noto Sans CJK SC",system-ui,sans-serif;--mono:Menlo,Consolas,monospace}}
:root[data-theme="light"]{{color-scheme:light}}
:root[data-theme="dark"]{{color-scheme:dark;--bg:#11181b;--panel:#182326;--ink:#e9e3d5;--muted:#a9b4b0;--line:#3d4d4d;--teal:#73c5bb;--orange:#ed8a5a;--shadow:0 18px 50px rgba(0,0,0,.35)}}
@media (prefers-color-scheme:dark){{:root:not([data-theme]){{color-scheme:dark}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.65 var(--sans)}}
a{{color:var(--teal)}} .topbar{{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:10px clamp(14px,4vw,40px);border-bottom:1px solid var(--line);background:var(--bg);position:sticky;top:0;z-index:10}}
.brand span{{display:block;font:700 10px/1.3 var(--mono);letter-spacing:.16em;color:var(--orange)}}.brand strong{{display:block}}
.theme-switch{{display:flex;gap:3px;border:1px solid var(--line);border-radius:999px;padding:3px;background:var(--panel)}}
.theme-switch button{{border:0;background:transparent;color:var(--muted);padding:6px 9px;border-radius:999px;cursor:pointer;font-size:12px}}
.theme-switch button[aria-pressed="true"]{{background:var(--ink);color:var(--panel)}}
.wrap{{max-width:1180px;margin:0 auto;padding:clamp(24px,5vw,48px) clamp(14px,4vw,40px) 60px}}
.eyebrow{{margin:0 0 10px;font:700 11px/1 var(--mono);letter-spacing:.2em;color:var(--orange)}}h1{{margin:0;font-size:clamp(30px,5vw,52px);line-height:1.08;letter-spacing:-.04em}}.lede{{max-width:70ch;color:var(--muted)}}
nav.flow-nav{{display:flex;gap:6px;flex-wrap:wrap;margin:18px 0}}nav.flow-nav a{{border:1px solid var(--line);border-radius:999px;padding:4px 9px;text-decoration:none;font-size:12px}}
.card{{background:var(--panel);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:18px;margin-top:16px}}h2{{margin:0 0 4px;font-size:19px}}.hint{{color:var(--muted);font-size:12.5px}}
.diagram{{background:#F5EFE2;border:1px solid var(--line);border-radius:12px;padding:8px;overflow:auto}}.diagram svg{{max-width:100%;height:auto;display:block;margin:0 auto}}
.foot{{margin-top:22px;border-top:1px solid var(--line);padding-top:12px;color:var(--muted);font-size:12px}}
@media print{{.topbar,nav.flow-nav,.theme-switch{{display:none!important}}.card{{box-shadow:none;break-inside:avoid}}}}
</style>
</head>
<body>
<header class="topbar"><div class="brand"><span>LiveBay · design01 · flows</span><strong>补充流程图</strong></div><div class="theme-switch" role="group" aria-label="主题"><button type="button" data-theme-choice="system" aria-pressed="true">系统</button><button type="button" data-theme-choice="light" aria-pressed="false">浅色</button><button type="button" data-theme-choice="dark" aria-pressed="false">深色</button></div></header>
<main class="wrap">
<p class="eyebrow">More static views</p><h1>四张补充流程图：操作、波次、L1、数据。</h1>
<p class="lede">总状态机回答“一局在哪里停”；这四张图分别回答“玩家怎么操作、波次怎么走、L1 怎么扩、数据怎么进工程”。均由 Graphviz 预渲染为内联 SVG，不依赖在线渲染。</p>
<nav class="flow-nav">{nav}<a href="game_flow.html">总状态机 →</a></nav>
{''.join(sections)}
<footer class="foot">由 <code>tools/build_flow.py</code> 生成 · 配套方法见 <a href="README.md">README.md</a> · 不要手改</footer>
</main>
<script>
(function(){{
  var KEY='lrds-theme', buttons=Array.prototype.slice.call(document.querySelectorAll('[data-theme-choice]'));
  var mql=window.matchMedia('(prefers-color-scheme: dark)');
  function apply(){{
    var c=document.documentElement.dataset.themeChoice||'system', mode=c==='system'?(mql.matches?'dark':'light'):c;
    document.documentElement.dataset.theme=mode;
    buttons.forEach(function(b){{b.setAttribute('aria-pressed',String(b.dataset.themeChoice===c));}});
  }}
  buttons.forEach(function(b){{b.addEventListener('click',function(){{document.documentElement.dataset.themeChoice=b.dataset.themeChoice;try{{localStorage.setItem(KEY,b.dataset.themeChoice);}}catch(e){{}}apply();}});}});
  try{{mql.addEventListener('change',apply);}}catch(e){{}}
  apply();
}})();
</script>
</body>
</html>'''


def extra_single_page(d: dict, svg: str) -> str:
    others = "".join(
        f'<a href="{x["id"]}.html">{html.escape(x["title"])}</a>'
        for x in EXTRA_DOCS if x["id"] != d["id"])
    return f'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>LiveBay · {html.escape(d['title'])}</title>
<script>
(function () {{
  var KEY='lrds-theme', choice='system', saved=null;
  try {{ saved=localStorage.getItem(KEY); }} catch(e) {{}}
  if (saved==='system'||saved==='light'||saved==='dark') choice=saved;
  var mql=window.matchMedia('(prefers-color-scheme: dark)');
  document.documentElement.dataset.theme=choice==='system'?(mql.matches?'dark':'light'):choice;
  document.documentElement.dataset.themeChoice=choice;
  document.documentElement.classList.add('js');
}})();
</script>
<style>
:root{{color-scheme:light dark;--bg:#e9e3d5;--panel:#f5efe2;--ink:#232b2f;--muted:#5f6967;--line:#b9ae98;--teal:#2f6b65;--orange:#c95b2c;--shadow:0 14px 36px rgba(35,43,47,.1);--sans:"PingFang SC","Noto Sans CJK SC",system-ui,sans-serif;--mono:Menlo,Consolas,monospace}}
:root[data-theme="light"]{{color-scheme:light}}
:root[data-theme="dark"]{{color-scheme:dark;--bg:#11181b;--panel:#182326;--ink:#e9e3d5;--muted:#a9b4b0;--line:#3d4d4d;--teal:#73c5bb;--orange:#ed8a5a;--shadow:0 18px 50px rgba(0,0,0,.35)}}
@media (prefers-color-scheme:dark){{:root:not([data-theme]){{color-scheme:dark}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.65 var(--sans)}}
a{{color:var(--teal)}} .topbar{{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:10px clamp(14px,4vw,40px);border-bottom:1px solid var(--line);background:var(--bg);position:sticky;top:0;z-index:10}}
.brand span{{display:block;font:700 10px/1.3 var(--mono);letter-spacing:.16em;color:var(--orange)}}.brand strong{{display:block}}
.theme-switch{{display:flex;gap:3px;border:1px solid var(--line);border-radius:999px;padding:3px;background:var(--panel)}}
.theme-switch button{{border:0;background:transparent;color:var(--muted);padding:6px 9px;border-radius:999px;cursor:pointer;font-size:12px}}
.theme-switch button[aria-pressed="true"]{{background:var(--ink);color:var(--panel)}}
.wrap{{max-width:1180px;margin:0 auto;padding:clamp(24px,5vw,48px) clamp(14px,4vw,40px) 60px}}
.eyebrow{{margin:0 0 10px;font:700 11px/1 var(--mono);letter-spacing:.2em;color:var(--orange)}}h1{{margin:0;font-size:clamp(30px,5vw,52px);line-height:1.08;letter-spacing:-.04em}}.lede{{max-width:70ch;color:var(--muted)}}
nav.flow-nav{{display:flex;gap:6px;flex-wrap:wrap;margin:18px 0}}nav.flow-nav a{{border:1px solid var(--line);border-radius:999px;padding:4px 9px;text-decoration:none;font-size:12px}}
.card{{background:var(--panel);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:18px;margin-top:16px}}
.diagram{{background:#F5EFE2;border:1px solid var(--line);border-radius:12px;padding:8px;overflow:auto}}.diagram svg{{max-width:100%;height:auto;display:block;margin:0 auto}}
.foot{{margin-top:22px;border-top:1px solid var(--line);padding-top:12px;color:var(--muted);font-size:12px}}
@media print{{.topbar,nav.flow-nav,.theme-switch{{display:none!important}}.card{{box-shadow:none;break-inside:avoid}}}}
</style>
</head>
<body>
<header class="topbar"><div class="brand"><span>LiveBay · design01 · flows</span><strong>{html.escape(d['title'])}</strong></div><div class="theme-switch" role="group" aria-label="主题"><button type="button" data-theme-choice="system" aria-pressed="true">系统</button><button type="button" data-theme-choice="light" aria-pressed="false">浅色</button><button type="button" data-theme-choice="dark" aria-pressed="false">深色</button></div></header>
<main class="wrap">
<p class="eyebrow">Single flow view</p><h1>{html.escape(d['title'])}</h1>
<p class="lede">{html.escape(d['desc'])}</p>
<nav class="flow-nav"><a href="extra_flows.html">四图总览</a><a href="game_flow.html">总状态机</a>{others}<a href="{d['id']}.md">Mermaid 版</a></nav>
<section class="card"><div class="diagram">{svg}</div></section>
<section class="card"><p class="lede" style="margin:0">这张图由 <code>tools/build_flow.py</code> 生成，使用 Graphviz 预渲染 SVG。流程方法与维护规则见 <a href="README.md">flows/README.md</a>；总状态机见 <a href="game_flow.html">game_flow.html</a>。</p></section>
<footer class="foot">不要手改 · 改模型后运行 <code>./run.sh flow</code> · LiveBay</footer>
</main>
<script>
(function(){{
  var KEY='lrds-theme', buttons=Array.prototype.slice.call(document.querySelectorAll('[data-theme-choice]'));
  var mql=window.matchMedia('(prefers-color-scheme: dark)');
  function apply(){{
    var c=document.documentElement.dataset.themeChoice||'system', mode=c==='system'?(mql.matches?'dark':'light'):c;
    document.documentElement.dataset.theme=mode;
    buttons.forEach(function(b){{b.setAttribute('aria-pressed',String(b.dataset.themeChoice===c));}});
  }}
  buttons.forEach(function(b){{b.addEventListener('click',function(){{document.documentElement.dataset.themeChoice=b.dataset.themeChoice;try{{localStorage.setItem(KEY,b.dataset.themeChoice);}}catch(e){{}}apply();}});}});
  try{{mql.addEventListener('change',apply);}}catch(e){{}}
  apply();
}})();
</script>
</body>
</html>'''



def build_extra_targets() -> dict:
    svgs = {d["id"]: render_extra_svg(d["dot"]) for d in EXTRA_DOCS}
    targets = {}
    for d in EXTRA_DOCS:
        targets[OUT / f"{d['id']}.md"] = write_extra_md(d)
        targets[OUT / f"{d['id']}.html"] = extra_single_page(d, svgs[d["id"]])
    targets[OUT / "extra_flows.html"] = extra_overview_html(EXTRA_DOCS, svgs)
    return targets


def main() -> int:
    states = read_states()
    commands = read_commands()
    events = read_events()
    validate(states, commands, events)
    targets = {
        FLOW_DIR / "game_flow.md": mermaid(states, commands, events),
        FLOW_DIR / "game_flow.html": html_page(states, commands, events),
    }
    targets.update(build_extra_targets())
    if "--check" in sys.argv:
        stale = [str(p.relative_to(ROOT)) for p, text in targets.items() if not p.exists() or p.read_text(encoding="utf-8") != text]
        if stale:
            print("build_flow: 生成物过期：", ", ".join(stale), file=sys.stderr)
            return 1
        print("build_flow: 总图与补充图均与代码一致")
        return 0
    FLOW_DIR.mkdir(parents=True, exist_ok=True)
    for p, text in targets.items():
        p.write_text(text, encoding="utf-8")
        print(f"wrote {p.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
