#!/usr/bin/env python3
"""build_extra_flows.py —— 生成 flows/ 的四张补充流程图。

生成：
  player_flow.md / player_flow.html     玩家操作流程
  wave_flow.md / wave_flow.html         波次生命周期
  l1_flow.md / l1_flow.html             L1 检查单/故障/记录
  data_flow.md / data_flow.html         数据到 MissionPack

HTML 使用 Graphviz 渲染成内联 SVG，不依赖 Mermaid/CDN。
用法：
  python3 tools/build_extra_flows.py
  python3 tools/build_extra_flows.py --check
"""
from __future__ import annotations

import html
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "docs-ai" / "design01" / "flows"

DOCS = [
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


def render_svg(dot_src: str) -> str:
    proc = subprocess.run(["dot", "-Tsvg"], input=dot_src, text=True, capture_output=True)
    if proc.returncode != 0:
        raise SystemExit("build_extra_flows: graphviz dot 失败：\n" + proc.stderr)
    return proc.stdout


def write_md(doc: dict) -> str:
    return f"""# {doc['title']}

> 由 `tools/build_extra_flows.py` 生成；配套总览见 [README.md](README.md)，总状态机见 [game_flow.md](game_flow.md)。

{doc['desc']}

```mermaid
{doc['mermaid']}
```

## 说明

- 这张图是流程/结构图，不是数值平衡表；
- 图中的“等待/选项”是流程层概念，不一定是 `Sim.State` 的枚举值；
- 改状态/命令/事件后运行 `./run.sh flow` 重新生成。
"""


def html_page(docs: list[dict], svgs: dict[str, str]) -> str:
    sections = []
    for d in docs:
        sections.append(f'''<section class="card" id="{d['id']}">
  <h2>{html.escape(d['title'])}</h2>
  <p class="hint">{html.escape(d['desc'])}</p>
  <div class="diagram">{svgs[d['id']]}</div>
  <p class="hint"><a href="{d['id']}.md">Markdown / Mermaid 版</a></p>
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
<footer class="foot">由 <code>tools/build_extra_flows.py</code> 生成 · 配套方法见 <a href="README.md">README.md</a> · 不要手改</footer>
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


def main() -> int:
    svgs = {d["id"]: render_svg(d["dot"]) for d in DOCS}
    targets = {}
    for d in DOCS:
        targets[OUT / f"{d['id']}.md"] = write_md(d)
    targets[OUT / "extra_flows.html"] = html_page(DOCS, svgs)
    if "--check" in sys.argv:
        stale = [str(p.relative_to(ROOT)) for p, text in targets.items() if not p.exists() or p.read_text(encoding="utf-8") != text]
        if stale:
            print("build_extra_flows: 生成物过期：", ", ".join(stale), file=sys.stderr)
            return 1
        print("build_extra_flows: 补充流程图与代码一致")
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    for p, text in targets.items():
        p.write_text(text, encoding="utf-8")
        print(f"wrote {p.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
