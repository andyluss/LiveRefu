#!/usr/bin/env python3
"""build_guide.py —— 生成 `projects/mainline/GUIDE.html`：一份**给小白看的玩法说明**。

为什么要生成而不是手写：
  文档里最贵的错是"数字过期"（本项目栽过多次）。难度曲线、卡池构成、势力配额
  全部**从真实数据表现读**再画成图，重跑一次就同步；`--check` 还会比对磁盘上的文件，
  过期直接报错。

为什么是"给小白看"而不是设计文档：
  读者不知道"纪元""序列""铺场效率"这些词。所以先讲**你在一局里到底在做什么**，
  再讲为什么这样设计；术语一律先给白话解释，再给术语。

用法：
  python3 build_guide.py           生成 GUIDE.html
  python3 build_guide.py --check   只校验磁盘文件是否与数据一致（不写）
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent          # mainline/guide/
MAINLINE = HERE.parent                                  # mainline/
TABLES = MAINLINE / "future-debris/game/data/tables"
OUT = MAINLINE / "GUIDE.html"

FACTION_ZH = {"FAC-ATOMIC-AEC": "原子能委员会", "FAC-ATOMIC-SUB": "郊区秩序",
              "FAC-ATOMIC-HAU": "清运承包方", "FAC-ATOMIC-ROA": "辐射漫游者"}
POSTURE = {"FAC-ATOMIC-AEC": "清理 residue", "FAC-ATOMIC-SUB": "回避 residue",
           "FAC-ATOMIC-HAU": "搬运 residue", "FAC-ATOMIC-ROA": "喂养 residue"}
WIN = {"FAC-ATOMIC-AEC": "守成", "FAC-ATOMIC-SUB": "守成",
       "FAC-ATOMIC-HAU": "清剿", "FAC-ATOMIC-ROA": "清剿"}
ACC = {"FAC-ATOMIC-AEC": "#1f9e94", "FAC-ATOMIC-SUB": "#4f9e5a",
       "FAC-ATOMIC-HAU": "#d9612f", "FAC-ATOMIC-ROA": "#c08a13"}
KIND_ZH = {"tower": "塔", "unit": "单位", "skill": "技能", "support": "支援",
           "modifier": "改装", "relic": "残片"}


def load(name):
    return json.loads((TABLES / f"{name}.json").read_text(encoding="utf-8"))["entries"]


# ── 迷你图表（内联 SVG，无依赖）─────────────────────────────────────────────
def line_chart(values, chapters, width=860, height=250, pad=38):
    """难度曲线：每关的总配额。章节用竖线分隔。"""
    n = len(values)
    lo, hi = min(values), max(values)
    span = max(1, hi - lo)
    def x(i): return pad + (width - pad * 2) * i / max(1, n - 1)
    def y(v): return height - pad - (height - pad * 2) * (v - lo) / span
    pts = " ".join(f"{x(i):.1f},{y(v):.1f}" for i, v in enumerate(values))
    area = f"{pad},{height-pad} " + pts + f" {x(n-1):.1f},{height-pad}"
    parts = [f'<svg viewBox="0 0 {width} {height}" class="chart" role="img" aria-label="难度曲线">']
    parts.append(f'<polygon points="{area}" fill="#1f9e94" opacity="0.10"/>')
    # 章节分隔
    for i in range(1, n):
        if chapters[i] != chapters[i - 1]:
            parts.append(f'<line x1="{x(i)-6:.1f}" y1="{pad-10}" x2="{x(i)-6:.1f}" '
                         f'y2="{height-pad}" stroke="#c9c2b2" stroke-dasharray="3 4"/>')
    parts.append(f'<polyline points="{pts}" fill="none" stroke="#1f9e94" stroke-width="2.4"/>')
    for i, v in enumerate(values):
        parts.append(f'<circle cx="{x(i):.1f}" cy="{y(v):.1f}" r="3.4" fill="#1f9e94"/>')
        if i in (0, n - 1) or v == hi:
            parts.append(f'<text x="{x(i):.1f}" y="{y(v)-9:.1f}" class="lbl">{v}</text>')
    for i, v in enumerate(values):
        parts.append(f'<text x="{x(i):.1f}" y="{height-pad+16}" class="lbl">{i+1}</text>')
    parts.append(f'<text x="0" y="{pad-16}" class="lbl3">每关「总配额」＝敌人要被打掉的总血量</text>')
    parts.append("</svg>")
    return "".join(parts)


def bar_chart(items, width=860, row=26, pad=110):
    """横向条形图：items=[(标签, 值, 颜色)]"""
    height = pad // 2 + row * len(items) + 10
    vmax = max(v for _, v, _ in items) or 1
    parts = [f'<svg viewBox="0 0 {width} {height}" class="chart" role="img">']
    for i, (label, v, color) in enumerate(items):
        y = 10 + i * row
        w = (width - pad - 60) * v / vmax
        parts.append(f'<text x="0" y="{y+14}" class="lbl2">{label}</text>')
        parts.append(f'<rect x="{pad}" y="{y+3}" width="{w:.1f}" height="{row-10}" rx="4" fill="{color}"/>')
        parts.append(f'<text x="{pad+w+8:.1f}" y="{y+14}" class="lbl2">{v}</text>')
    parts.append("</svg>")
    return "".join(parts)


def build():
    cards, levels, rules, factions = load("cards"), load("levels"), load("rules"), load("factions")

    # 难度曲线：每关 6 波配额之和
    totals = [sum(e["quotas"]) for e in levels]
    chapters = [e["chapter"] for e in levels]
    curve = line_chart(totals, chapters)

    # 卡池构成
    per_faction = {f: sum(1 for c in cards if c["faction"] == f) for f in FACTION_ZH}
    faction_bars = bar_chart(
        [(FACTION_ZH[f], per_faction[f], ACC[f]) for f in FACTION_ZH])
    kinds = {k: sum(1 for c in cards if c["kind"] == k) for k in KIND_ZH}
    rarity = {r: sum(1 for c in cards if c["rarity"] == r) for r in ("common", "rare", "epic")}
    rarity_bars = bar_chart(
        [("标准 common", rarity["common"], "#8c8272"), ("罕见 rare", rarity["rare"], "#1f9e94"),
         ("史诗 epic", rarity["epic"], "#c08a13")], width=520, pad=96)

    # 规则卡示例（挑一对"同一件事、两种相反后果"，最能讲清"规则改物理法则"）
    by_id = {r["id"]: r for r in rules}
    def rule_card(rid, note):
        r = by_id[rid]
        return f'''<div class="rc">
      <div class="rc-name">{r["name"]}</div>
      <div class="rc-body">{r["text"]}</div>
      <div class="rc-note">{note}</div></div>'''
    chain = rule_card("RULE-ATOMIC-001", "污染**变成伤害来源**——但只有当残渣够多时才生效")
    hearing = rule_card("RULE-ATOMIC-002", "污染**变成罚款**——残渣越多，你越难受")

    rule_rows = "".join(
        f'<tr><td>{r["name"]}</td><td class="dim">{r["text"]}</td>'
        f'<td>{ {"level_grant": "关卡自带", "unlock": "解锁", "era_default": "纪元默认"}.get(r.get("acquisition"), r.get("acquisition", "")) }</td></tr>'
        for r in rules)

    # 一张示例卡的数据（用真实数据讲"六段各是什么"）
    demo = next(c for c in cards if c["id"] == "RC-ATOMIC-009")
    f_zh = FACTION_ZH[demo["faction"]]
    f_acc = ACC[demo["faction"]]

    total_rules, total_levels = len(rules), len(levels)
    total_cards = len(cards)

    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>未来残片 · 玩法说明（给第一次听说它的人）</title>
<!-- 由 guide/build_guide.py 生成：图中数字全部来自游戏数据表，改数据后重跑即同步。
     python3 guide/build_guide.py --check 会在文件过期时报错。 -->
<style>
  :root{{--bg:#fbf8f1;--ink:#221d15;--ink2:#4a4335;--dim:#7d7462;--line:#e0d8c6;
        --acc:#1f9e94;--warm:#d9612f;--gold:#c08a13;--card:#fff;--code:#f1ece0}}
  *{{box-sizing:border-box}}
  body{{margin:0;background:var(--bg);color:var(--ink);
       font:17px/1.78 -apple-system,"PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif}}
  .wrap{{max-width:900px;margin:0 auto;padding:46px 24px 90px}}
  h1{{font-size:34px;line-height:1.25;margin:0 0 6px;letter-spacing:.5px}}
  .sub{{color:var(--dim);font-size:15px;margin-bottom:34px}}
  h2{{font-size:23px;margin:56px 0 6px;padding-bottom:10px;border-bottom:2px solid var(--line)}}
  h2 .n{{color:var(--acc);margin-right:10px;font-weight:800}}
  h3{{font-size:17px;margin:26px 0 8px;color:var(--acc)}}
  p{{margin:12px 0}}
  .lead{{font-size:19px;line-height:1.7;color:var(--ink2)}}
  b,strong{{color:var(--ink)}}
  code{{background:var(--code);border:1px solid var(--line);border-radius:4px;padding:1px 5px;font-size:.88em}}
  .dim{{color:var(--dim)}}
  .box{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin:20px 0}}
  .box.tip{{border-left:4px solid var(--acc)}}
  .box.warn{{border-left:4px solid var(--warm)}}
  .box h3{{margin-top:0}}
  .grid2{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}
  .grid3{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}}
  @media(max-width:720px){{.grid2,.grid3{{grid-template-columns:1fr}}}}
  .chart{{width:100%;height:auto;display:block;margin:10px 0}}
  text.lbl{{font:12px Menlo,monospace;fill:#7d7462;text-anchor:middle}}
  text.lbl3{{font:13px -apple-system,"PingFang SC",sans-serif;fill:#7d7462;text-anchor:start}}
  text.lbl2{{font:13px -apple-system,"PingFang SC",sans-serif;fill:#4a4335}}

  /* 一局流程 */
  .flow{{display:flex;gap:6px;flex-wrap:wrap;margin:16px 0}}
  .step{{flex:1;min-width:120px;background:var(--card);border:1px solid var(--line);
        border-radius:10px;padding:12px;text-align:center;position:relative}}
  .step b{{display:block;font-size:15px;margin-bottom:3px}}
  .step span{{font-size:12.5px;color:var(--dim)}}
  .step::after{{content:"→";position:absolute;right:-14px;top:50%;transform:translateY(-50%);
               color:var(--dim);font-weight:700}}
  .step:last-child::after{{content:""}}

  /* 资源张力和降级区 */
  .tension{{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;margin:18px 0}}
  .res{{border-radius:12px;padding:16px;border:1px solid var(--line);background:var(--card)}}
  .res .k{{font-size:13px;letter-spacing:.14em;text-transform:uppercase}}
  .res .v{{font-size:28px;font-weight:800;font-family:Menlo,monospace}}
  .res.p .k,.res.p .v{{color:var(--acc)}} .res.r .k,.res.r .v{{color:var(--warm)}}
  .arrow{{font-size:24px;color:var(--dim)}}
  .board{{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}}
  .slot{{aspect-ratio:1;border-radius:8px;border:1px solid var(--line);display:grid;
        place-items:center;font:13px Menlo,monospace;background:var(--card)}}
  .slot.z1{{background:#fdf0e6;border-color:#f0c3a3;color:#a8501f}}
  .slot.z2{{background:#fbe0cc;border-color:#e6a273;color:#8f3f12}}
  .slot.z3{{background:#f6c9a8;border-color:#d9612f;color:#6f2c08}}
  .slot.base{{background:#eaf4f2;border-color:#9fd0ca;color:#146b63}}

  /* 卡面解剖 */
  .anatomy{{display:grid;grid-template-columns:300px 1fr;gap:26px;align-items:start;margin:16px 0}}
  @media(max-width:720px){{.anatomy{{grid-template-columns:1fr}}}}
  .mini-card{{width:300px;border-radius:12px;padding:5px;background:linear-gradient(146deg,#fffdf6,#cfd6db 30%,#6f7b89 45%,#e9e4d6 70%,#fffdf6);box-shadow:0 10px 22px rgba(0,0,0,.16)}}
  .mini-face{{border-radius:9px;background:#f3ede1;padding:9px 10px;display:flex;flex-direction:column;gap:6px}}
  .mf-top{{display:flex;justify-content:space-between;align-items:flex-start}}
  .mf-name{{font-size:15px;font-weight:800}}
  .mf-dept{{font:8px Menlo,monospace;letter-spacing:.14em;color:#8a7f66}}
  .mf-cost{{width:26px;height:26px;border-radius:50%;background:#f3ede1;border:2px solid var(--warm);
           display:grid;place-items:center;font:13px Menlo,monospace;font-weight:800}}
  .mf-art{{height:92px;border-radius:6px;background:linear-gradient(135deg,#17454a,#08171b);
          border:1px solid #6f7b89;display:grid;place-items:center;color:#8fb9b4;font-size:10px}}
  .mf-keys{{display:flex;gap:4px}}
  .mf-keys i{{font-style:normal;font-size:9px;background:#e6ddc9;border-radius:3px;padding:2px 6px;color:#4a3f2c}}
  .mf-stats{{display:flex;gap:5px}}
  .mf-stats div{{flex:1;background:#eae2cf;border-radius:4px;padding:4px 5px;text-align:center}}
  .mf-stats b{{display:block;font:14px Menlo,monospace}}
  .mf-stats span{{font-size:8px;color:#7d7462}}
  .mf-text{{font-size:9px;color:#3a3327;line-height:1.5}}
  .mf-flavor{{font-size:8.5px;color:#7d7462;border-left:2px solid var(--acc);padding-left:5px}}
  .legend{{display:grid;gap:9px;margin-top:4px}}
  .legend div{{display:grid;grid-template-columns:22px 1fr;gap:8px;font-size:14.5px;align-items:baseline}}
  .legend em{{font-style:normal;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;
             background:var(--acc);color:#fff;font:11px Menlo,monospace;font-weight:700}}

  table{{width:100%;border-collapse:collapse;margin:14px 0;font-size:14.5px}}
  th,td{{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}}
  th{{font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim)}}

  .rc{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px}}
  .rc-name{{font-weight:800;font-size:16px;color:var(--acc);margin-bottom:6px}}
  .rc-body{{font-size:14.5px}}
  .rc-note{{font-size:13px;color:var(--dim);margin-top:8px;border-top:1px dashed var(--line);padding-top:8px}}

  /* 决策循环 */
  .loop{{display:grid;place-items:center;margin:10px 0}}
  .loop svg{{max-width:460px}}

  footer{{margin-top:70px;padding-top:18px;border-top:1px solid var(--line);color:var(--dim);font-size:13px}}
</style>
</head>
<body>
<div class="wrap">

<h1>未来残片</h1>
<p class="sub">一份给第一次听说它的人的说明 · 读完你会知道：这游戏在玩什么、为什么这样设计</p>

<p class="lead">
  你向一个<strong>相信清洁能源的明天</strong>提交改造提案。<br>
  每一次供电都更快，也把<span style="color:var(--warm);font-weight:700">一点代价</span>留在了地图上。
</p>

<div class="box tip">
  <h3>三十秒版本</h3>
  <p>这是一款<strong>塔防 + 卡牌</strong>游戏。你把卡牌放到固定位置的塔位上，让它们自动打退一波波敌人。</p>
  <p>但它和大多数塔防有一个关键区别：<strong>你的每一次强攻都要用"污染"来付账</strong>。
     污染不会消失，它在地图上长成一片<strong>降级区</strong>——最后可能反过来杀死你。</p>
  <p>所以每一局你要回答的其实是一个问题：<strong>这条命，值不值得留下这么多残渣？</strong></p>
</div>

<h2><span class="n">01</span>一局是怎么走的</h2>
<p>一局大约 10–15 分钟。流程固定，只有第五步会变：</p>
<div class="flow">
  <div class="step"><b>选关</b><span>挑一个关卡<br>它有固定的规则</span></div>
  <div class="step"><b>抽牌</b><span>从卡组抽 8 张<br>放进手牌</span></div>
  <div class="step"><b>布防</b><span>花"电力"把牌<br>放到 8 个塔位</span></div>
  <div class="step"><b>波次</b><span>敌人一波波来<br>塔自动打</span></div>
  <div class="step"><b>代价结算</b><span>残渣长成降级区<br>慢慢咬你的基地</span></div>
</div>
<p class="dim">然后回到第三步，直到敌人清完（赢）或者基地被咬到 0（输）。</p>

<h2><span class="n">02</span>两个数字：电力与残渣</h2>
<p>整个游戏只围绕两个数字转动。理解它们，就理解了这个游戏。</p>
<div class="tension">
  <div class="res p"><div class="k">电力 POWER</div><div class="v">能做的事</div>
    <p class="dim" style="font-size:14px;margin:6px 0 0">你每回合的"预算"。放塔、用技能都要花它。越多，你打得越狠。</p></div>
  <div class="arrow">⇄</div>
  <div class="res r"><div class="k">残渣 RESIDUE</div><div class="v">留下的债</div>
    <p class="dim" style="font-size:14px;margin:6px 0 0">每次强攻都会留下它。它不消失，会变成地图上的危险区。</p></div>
</div>
<div class="box warn">
  <h3>这是这个游戏唯一的核心张力</h3>
  <p><strong>变强和变脏是同一件事。</strong>没有"又快又干净"的选项——想打得更狠，就得接受更难收拾的后果。</p>
  <p class="dim">大多数塔防的取舍是"先造哪个塔"；这里的取舍是<strong>"我愿意为这一波付多少代价"</strong>。</p>
</div>

<h2><span class="n">03</span>代价长什么样：降级区</h2>
<p>残渣不是记分板上的数字，它会<strong>长在地图上</strong>。这就是降级区。</p>
<div class="board">
  <div class="slot base">基地</div><div class="slot">塔位</div><div class="slot z1">1</div><div class="slot z2">3</div>
  <div class="slot">塔位</div><div class="slot z1">2</div><div class="slot z3">6</div><div class="slot z2">4</div>
</div>
<p class="dim">格内数字＝该格的残渣量。颜色越深，降级越重：它会削弱站在上面的塔，并持续伤害基地。</p>
<div class="grid2">
  <div class="box"><h3>你能做什么</h3>
    <p>花<strong>电力</strong>清除残渣（有代价，但能救命）。有些势力更擅长这件事。</p></div>
  <div class="box"><h3>你不能做什么</h3>
    <p><strong>让残渣凭空消失。</strong>它只是被搬走、被清掉、或者被"吃掉"——每一种都要付账。</p></div>
</div>

<h2><span class="n">04</span>卡牌：一张卡上有六段信息</h2>
<p>卡牌是你唯一的行动手段。每张卡的版式都一样，位置固定——所以你不用每次重新找"这张卡几点费用"。</p>
<div class="anatomy">
  <div class="mini-card"><div class="mini-face">
    <div class="mf-top"><div><div class="mf-dept">HAU · {f_zh}</div>
      <div class="mf-name">{demo["name"]}</div></div><div class="mf-cost">{demo["cost"]}</div></div>
    <div class="mf-art">插画位</div>
    <div class="mf-keys"><i>{demo["keywords"][0]}</i><i>{demo["keywords"][1]}</i></div>
    <div class="mf-stats"><div><b>{demo["power"]}</b><span>电力</span></div>
      <div><b>{demo["residue"]}</b><span>残渣</span></div><div><b>{demo["might"]}</b><span>战力</span></div></div>
    <div class="mf-text">{demo["text"]}</div>
    <div class="mf-flavor">「{demo.get("flavor", "")}」</div>
  </div></div>
  <div class="legend">
    <div><em>1</em><span><b>势力 + 卡名</b>：这张卡属于谁。左上角小圆点是势力色。</span></div>
    <div><em>2</em><span><b>费用</b>：打出它要花多少电力。顺时针一眼就能找到。</span></div>
    <div><em>3</em><span><b>插画</b>：这张卡"长什么样"。目前是几何母题占位。</span></div>
    <div><em>4</em><span><b>关键词</b>：两个词概括它的性质（穿透 / 耗材 / 封锁 …）。</span></div>
    <div><em>5</em><span><b>三项数值</b>：<b style="color:var(--acc)">电力</b>（产出）、<b style="color:var(--warm)">残渣</b>（代价）、<b>战力</b>（打多少）。</span></div>
    <div><em>6</em><span><b>规则 + 风味</b>：上面是机制说明，下面引号里是这个世界的口气。</span></div>
  </div>
</div>
<h3>六类卡，各管一件事</h3>
<div class="grid3">
  <div class="box"><h3>塔 tower</h3><p class="dim">放在塔位上持续输出。防线的骨架。</p></div>
  <div class="box"><h3>单位 unit</h3><p class="dim">能移动的角色，可以顶到更前面。</p></div>
  <div class="box"><h3>技能 skill</h3><p class="dim">一次性爆发，通常很脏（残渣高）。</p></div>
  <div class="box"><h3>支援 support</h3><p class="dim">清残渣、加电、修基地。</p></div>
  <div class="box"><h3>改装 modifier</h3><p class="dim">给别的卡加效果。</p></div>
  <div class="box"><h3>残片 relic</h3><p class="dim">跨关携带，长期收益。</p></div>
</div>

<h2><span class="n">05</span>四个势力：同一套数字，四种活法</h2>
<p>四个势力的卡用的是同一套数值规则。差别在<strong>它们怎么对待残渣</strong>——以及因此<strong>怎么算赢</strong>。</p>
<table>
  <tr><th>势力</th><th>对残渣的姿态</th><th>玩起来的手感</th><th>怎么算赢</th><th>卡数</th></tr>
  <tr><td style="color:{ACC["FAC-ATOMIC-AEC"]};font-weight:700">原子能委员会</td><td>清理</td>
      <td>把残渣清掉，甚至能攒出一次爆发</td><td>守成（活到最后）</td><td>{per_faction["FAC-ATOMIC-AEC"]}</td></tr>
  <tr><td style="color:{ACC["FAC-ATOMIC-SUB"]};font-weight:700">郊区秩序</td><td>回避</td>
      <td>保持干净格，越干净打得越狠</td><td>守成（活到最后）</td><td>{per_faction["FAC-ATOMIC-SUB"]}</td></tr>
  <tr><td style="color:{ACC["FAC-ATOMIC-HAU"]};font-weight:700">清运承包方</td><td>搬运</td>
      <td>把残渣搬到最脏的格子上，回收更划算</td><td>清剿（清完波次）</td><td>{per_faction["FAC-ATOMIC-HAU"]}</td></tr>
  <tr><td style="color:{ACC["FAC-ATOMIC-ROA"]};font-weight:700">辐射漫游者</td><td>喂养</td>
      <td><strong>把残渣从惩罚翻转为燃料</strong></td><td>清剿（清完波次）</td><td>{per_faction["FAC-ATOMIC-ROA"]}</td></tr>
</table>
<div class="box tip">
  <h3>为什么这样设计</h3>
  <p>"清理"和"回避"的势力把残渣当<strong>麻烦</strong>，所以它们的目标是<strong>活下来</strong>（守成）。</p>
  <p>"搬运"和"喂养"的势力把残渣当<strong>资源</strong>，所以它们的目标是<strong>把敌人清光</strong>（清剿）。</p>
  <p><strong>胜利条件跟着玩法走，而不是硬塞一个统一目标</strong>——这是四势力不像"换皮"的原因。</p>
</div>
{faction_bars}

<h2><span class="n">06</span>规则卡：每一关的"物理法则"</h2>
<p>除了卡组，每关还会挂上 2–4 张<strong>规则卡</strong>。它们不改变你的牌，而是改变<strong>这一关的规则本身</strong>——同一张牌在不同规则下结果完全不同。</p>
<div class="grid2">
  {chain}
  {hearing}
</div>
<p class="dim">左边这条把污染当燃料，右边这条把污染当罚款。<strong>同样是"残渣 ≥ 12"，一边是奖励，一边是惩罚。</strong>这就是规则卡的意义：让每一关问出不同的问题。</p>
<p>全部 {total_rules} 条规则卡：</p>
<table>
  <tr><th>规则</th><th>效果</th><th>怎么获得</th></tr>
  {rule_rows}
</table>

<h2><span class="n">07</span>难度是怎么爬的</h2>
<p>游戏有 <strong>{total_levels} 关</strong>、<strong>8 章</strong>，每章两关。下面是每关的"总配额"——也就是敌人要被打掉的总血量。</p>
{curve}
<div class="box">
  <h3>怎么读这张图</h3>
  <p>每条竖虚线是章节分界。<strong>每一章都会先松后紧</strong>：章内前几关给你适应，最后一关突然抬起来撞你一堵墙——然后下一章从更高的位置重新开始。</p>
  <p class="dim">这不是随机波动，是刻意设计的节奏：<strong>一口气爬 16 关会很累，8 次"小高潮"才让人想继续。</strong></p>
</div>

<h2><span class="n">08</span>一局里你在想什么</h2>
<p>把它画成一个环，你会看到这个游戏的心跳：</p>
<div class="loop">
<svg viewBox="0 0 460 300" role="img" aria-label="决策循环">
  <defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L6,3 L0,6 Z" fill="#1f9e94"/></marker></defs>
  <rect x="150" y="16" width="160" height="46" rx="10" fill="#fff" stroke="#e0d8c6"/>
  <text x="230" y="45" text-anchor="middle" font-size="14">这一波要不要加倍打？</text>
  <rect x="330" y="120" width="118" height="46" rx="10" fill="#fff" stroke="#e0d8c6"/>
  <text x="389" y="141" text-anchor="middle" font-size="13">会留下多少</text>
  <text x="389" y="158" text-anchor="middle" font-size="13" fill="#d9612f">残渣？</text>
  <rect x="150" y="212" width="160" height="46" rx="10" fill="#fff" stroke="#e0d8c6"/>
  <text x="230" y="233" text-anchor="middle" font-size="13">这些残渣会不会</text>
  <text x="230" y="250" text-anchor="middle" font-size="13" fill="#d9612f">压死我自己？</text>
  <rect x="14" y="120" width="118" height="46" rx="10" fill="#fff" stroke="#e0d8c6"/>
  <text x="73" y="141" text-anchor="middle" font-size="13">先清残渣</text>
  <text x="73" y="158" text-anchor="middle" font-size="13" fill="#1f9e94">还是先加塔？</text>
  <path d="M312 52 Q360 62 372 112" fill="none" stroke="#1f9e94" stroke-width="2" marker-end="url(#a)"/>
  <path d="M352 172 Q310 205 250 208" fill="none" stroke="#1f9e94" stroke-width="2" marker-end="url(#a)"/>
  <path d="M196 258 Q120 246 100 178" fill="none" stroke="#1f9e94" stroke-width="2" marker-end="url(#a)"/>
  <path d="M116 122 Q150 96 178 64" fill="none" stroke="#1f9e94" stroke-width="2" marker-end="url(#a)"/>
</svg>
</div>
<p class="dim">四步走完，回到第一步。你会发现<strong>没有一步是"怎么赢"</strong>——全是"怎么付得起"。这就是这个游戏的性格。</p>

<h2><span class="n">09</span>怎么算赢、怎么算输</h2>
<div class="grid2">
  <div class="box"><h3>赢</h3>
    <p><strong>守成</strong>：撑过所有波次，且基地还活着。<br>
       <strong>清剿</strong>：把所有波次的敌人清光。</p>
    <p class="dim">注意：<strong>基地血量归零就立刻算输</strong>，哪怕你已经快打完了——"判赢但基地 0 血"是明确修复过的 bug。</p></div>
  <div class="box"><h3>评级</h3>
    <p>结算会给 S / A / B… 的评级。<strong>评级只由事实推导</strong>：你漏了多少、剩多少血、攒了多少残渣。</p>
    <p class="dim">刻意不做"评分注水"——因为玩家会立刻看穿。</p></div>
</div>

<h2><span class="n">10</span>词表（看过就懂）</h2>
<table>
  <tr><th>词</th><th>白话解释</th></tr>
  <tr><td><b>纪元</b></td><td>一个大主题包（比如"原子朋克 / 太空时代"）。每一纪有一套自己的视觉与内容。</td></tr>
  <tr><td><b>提案卡</b></td><td>就是"卡牌"。名字来自设定：你向未来提交改造提案。</td></tr>
  <tr><td><b>自走式防线</b></td><td>塔防的另一种叫法：塔会自动攻击，你只负责布置。</td></tr>
  <tr><td><b>塔位</b></td><td>地图上固定位置的坑。只能往里面放牌，不能自由摆放。</td></tr>
  <tr><td><b>降级区</b></td><td>残渣堆积形成的地图区域，会削弱塔并持续伤害基地。</td></tr>
  <tr><td><b>规则卡</b></td><td>每关挂载的特殊规则，改变这一关的规则本身。</td></tr>
  <tr><td><b>残片</b></td><td>跨关携带的长期收益物（类似别的游戏的"遗物"）。</td></tr>
  <tr><td><b>配额</b></td><td>这一波敌人需要被打掉的总血量。难度就是靠它调的。</td></tr>
</table>

<h2><span class="n">11</span>现在做到哪了</h2>
<p>游戏已经<strong>能完整玩完一局</strong>（选关 → 战斗 → 结算 → 存档），有 <strong>{total_cards} 张卡</strong>、
<strong>{total_levels} 关</strong>、<strong>4 个势力</strong>、<strong>{total_rules} 条规则卡</strong>。</p>
<div class="box warn">
  <h3>还没做到的</h3>
  <p><strong>还没有插画</strong>：卡面与战场用的是几何母题占位（美术产能问题，不是技术问题）。</p>
  <p><strong>还没被真人玩过</strong>：目前所有验证都是自动化的——它能证明"规则不会崩"，但证明不了"好不好玩"。</p>
</div>
<p class="dim">如果你只想知道"这游戏现在值不值得看"——它已经是一个能玩的完整循环，但还没有任何一个人以外的东西被验证。</p>

<footer>
  本页由 <code>guide/build_guide.py</code> 从游戏数据表生成：图中每个数字都来自
  <code>cards.json</code> / <code>levels.json</code> / <code>rules.json</code> / <code>factions.json</code>。
  数据变了请重跑 <code>python3 guide/build_guide.py</code>；<code>--check</code> 会提示页面过期。
</footer>

</div>
</body>
</html>
'''
    return html


def main() -> int:
    html = build()
    check = "--check" in sys.argv
    if check:
        if not OUT.exists():
            print(f"✗ 缺 {OUT.relative_to(MAINLINE.parent.parent)}，请先运行 build_guide.py")
            return 1
        if OUT.read_text(encoding="utf-8") != html:
            print("✗ GUIDE.html 已过期（与数据表不一致），请重跑 build_guide.py")
            return 1
        print("✓ GUIDE.html 与数据一致")
        return 0
    OUT.write_text(html, encoding="utf-8")
    print(f"已生成 {OUT.relative_to(MAINLINE.parent.parent)}（{len(html) / 1024:.1f} KB）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
