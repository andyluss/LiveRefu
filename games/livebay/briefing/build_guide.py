#!/usr/bin/env python3
"""build_guide.py —— 生成 briefing/GUIDE.html：给第一次听说 LiveBay 的人看的玩法说明。

数字、塔/敌人/波次/地图全部从 game/data/*.json 现读；--check 比对磁盘页面，
过期直接报错。页面不是设计文档，不复制权威规则。
"""
import html
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
FD = HERE.parent
DATA = FD / "game/data"
OUT = HERE / "GUIDE.html"
GENERATED = "2026-11-05"


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def esc(v):
    return html.escape(str(v), quote=True)


def map_svg(mapdata):
    pts = mapdata["path"]
    slots = mapdata["slots"]
    base = mapdata["base"]["pos"]
    xs = [p[0] for p in pts] + [p[0] for p in slots] + [base[0]]
    ys = [p[1] for p in pts] + [p[1] for p in slots] + [base[1]]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    pad = 40

    def sx(x): return pad + (x - minx) / max(1, maxx - minx) * (860 - pad * 2)
    def sy(y): return pad + (y - miny) / max(1, maxy - miny) * (360 - pad * 2)

    path = "M " + " L ".join(f"{sx(x):.1f} {sy(y):.1f}" for x, y in pts)
    slot_nodes = "".join(
        f'<circle cx="{sx(x):.1f}" cy="{sy(y):.1f}" r="8" fill="#D9622B" stroke="#F5EFE2" stroke-width="2"/>'
        f'<text x="{sx(x):.1f}" y="{sy(y)-14:.1f}" text-anchor="middle" class="lbl">{i+1}</text>'
        for i, (x, y) in enumerate(slots)
    )
    return f'''<svg viewBox="0 0 860 360" class="chart map-svg" role="img" aria-label="外环第七段路径与 7 个塔位">
      <path d="{path}" fill="none" stroke="#1f9e94" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>
      <circle cx="{sx(base[0]):.1f}" cy="{sy(base[1]):.1f}" r="22" fill="none" stroke="#C95B2C" stroke-width="4"/>
      <text x="{sx(base[0]):.1f}" y="{sy(base[1])+34:.1f}" text-anchor="middle" class="lbl">湾口 / 基地</text>
      {slot_nodes}
      <text x="{sx(pts[0][0]):.1f}" y="{sy(pts[0][1])+26:.1f}" text-anchor="middle" class="lbl">入口</text>
    </svg>'''


def wave_chart(waves, enemies):
    by = {e["id"]: e for e in enemies}
    totals, hp = [], []
    for w in waves:
        n = sum(g["count"] for g in w["groups"])
        q = sum(g["count"] * by[g["enemy"]].get("hp", 0) for g in w["groups"])
        totals.append(n)
        hp.append(q)
    width, height, pad = 860, 240, 42
    maxv = max(hp) or 1

    def x(i): return pad + (width - pad * 2) * i / max(1, len(hp) - 1)
    def y(v): return height - pad - (height - pad * 2) * v / maxv
    barw = (width - pad * 2) / len(hp) * 0.45
    parts = [f'<svg viewBox="0 0 {width} {height}" class="chart" role="img" aria-label="每波敌人数量与总血量">']
    for i, (n, q) in enumerate(zip(totals, hp)):
        cx = x(i)
        bh = height - pad - y(q)
        parts.append(f'<rect x="{cx-barw/2:.1f}" y="{y(q):.1f}" width="{barw:.1f}" height="{bh:.1f}" rx="4" fill="#D9622F" opacity=".78"/>')
        parts.append(f'<text x="{cx:.1f}" y="{y(q)-7:.1f}" class="lbl">{n} 敌 / {q} HP</text>')
        parts.append(f'<text x="{cx:.1f}" y="{height-pad+18:.1f}" class="lbl">第 {i+1} 波</text>')
    parts.append('</svg>')
    return "".join(parts)


def build():
    towers = load("towers.json")
    enemies = load("enemies.json")
    waves = load("waves.json")
    mapdata = load("map_bay01.json")
    balance = load("balance.json")

    total_slots = len(mapdata["slots"])
    total_waves = len(waves)
    total_towers = len(towers)
    total_enemies = len(enemies)
    start_energy = int(balance.get("starting_energy", 0))
    start_integrity = int(balance.get("starting_integrity", 0))

    tower_cards = "".join(f'''<article class="card">
      <div class="card-top"><h3>{esc(t["name"])}</h3><span class="cost">{int(t["cost"])} 供能</span></div>
      <p>{esc(t.get("description", ""))}</p>
      <div class="kv"><span>伤害 <b>{esc(t.get("damage", 0))}</b></span><span>射程 <b>{esc(t.get("range", 0))}</b></span><span>攻速 <b>{esc(t.get("fire_rate", 0))}</b></span></div>
    </article>''' for t in towers)

    enemy_rows = "".join(f'''<tr><td><b>{esc(e["name"])}</b><br><span class="dim">{esc(e.get("description", ""))}</span></td>
      <td class="q">{int(e.get("hp", 0))}</td><td class="q">{int(e.get("speed", 0))}</td>
      <td class="q">{int(e.get("leak_damage", 0))}</td><td>{esc(e.get("behavior", "normal"))}</td></tr>''' for e in enemies)

    fault = next((e for e in enemies if e.get("behavior") == "reverse"), None)
    fault_text = "第 4/5 波出现「故障」：从湾口反向扩散，经过塔位时让塔短暂离线。" if fault else ""

    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LiveBay · 玩法说明（给第一次听说它的人）</title>
<!-- 由 briefing/build_guide.py 生成；数字来自 game/data/*.json，改数据后重跑。 -->
<script>
(function () {{
  document.documentElement.dataset.js = 'true';
  var KEY = 'lrds-theme', choice = 'system', saved = null;
  try {{ saved = localStorage.getItem(KEY); }} catch (e) {{}}
  if (saved === 'system' || saved === 'light' || saved === 'dark') choice = saved;
  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  document.documentElement.dataset.theme = choice === 'system' ? (mql.matches ? 'dark' : 'light') : choice;
  document.documentElement.dataset.themeChoice = choice;
}})();
</script>
<style>
*{{box-sizing:border-box}}
html,body{{margin:0;padding:0;background:var(--bg);color:var(--ink);font:17px/1.75 -apple-system,"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif}}
a{{color:var(--teal);text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--teal) 30%,transparent)}}
a:hover{{border-bottom-color:var(--teal)}}
.wrap{{max-width:900px;margin:0 auto;padding:42px 24px 90px}}
.guide-topbar{{position:sticky;top:0;z-index:20;background:var(--bg);border-bottom:1px solid var(--line)}}
.guide-topbar-inner{{max-width:1180px;margin:0 auto;padding:10px 24px;display:flex;align-items:center;gap:18px}}
.guide-brand{{flex:0 0 auto;color:var(--ink);text-decoration:none;font-weight:800;font-size:16px}}
.guide-brand span{{color:var(--teal);font:10px var(--mono,Menlo,monospace);letter-spacing:.12em;margin-left:6px}}
.guide-links{{display:flex;gap:13px;flex:1;overflow-x:auto;padding:2px 0}}
.guide-links a{{flex:0 0 auto;color:var(--dim);text-decoration:none;font-size:12px;border-bottom:1px solid transparent;padding:3px 0}}
.guide-links a:hover{{color:var(--teal);border-bottom-color:var(--teal)}}
.guide-topbar .theme-switch{{margin-left:auto;margin-right:0}}
h1{{font-size:clamp(30px,5vw,44px);line-height:1.22;margin:0 0 6px;letter-spacing:.01em}}
.sub{{color:var(--dim);font-size:15px;margin-bottom:30px}}
h2{{font-size:23px;margin:52px 0 6px;padding-bottom:10px;border-bottom:2px solid var(--line);scroll-margin-top:80px}}
h2 .n{{color:var(--teal);margin-right:10px;font-weight:800}}
h3{{font-size:17px;margin:20px 0 8px;color:var(--teal)}}
p{{margin:12px 0}}
.lead{{font-size:19px;line-height:1.7;color:var(--dim)}}
b,strong{{color:var(--ink)}}
code{{background:var(--sunken);border:1px solid var(--line);border-radius:4px;padding:1px 5px;font-size:.88em}}
.dim{{color:var(--dim)}}
.box{{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin:20px 0}}
.box.tip{{border-left:4px solid var(--teal)}} .box.warn{{border-left:4px solid var(--orange)}}
.box h3{{margin-top:0}}
.grid2{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}
.grid3{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}}
@media(max-width:720px){{.grid2,.grid3{{grid-template-columns:1fr}}}}
.chart{{width:100%;height:auto;display:block;margin:10px 0}}
text.lbl{{font:11px Menlo,monospace;fill:var(--dim);text-anchor:middle}}
.map-svg{{border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:6px}}
.flow{{display:flex;gap:6px;flex-wrap:wrap;margin:16px 0}}
.step{{flex:1;min-width:120px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;text-align:center;position:relative}}
.step b{{display:block;font-size:15px;margin-bottom:3px}} .step span{{font-size:12.5px;color:var(--dim)}}
.step::after{{content:"→";position:absolute;right:-14px;top:50%;transform:translateY(-50%);color:var(--dim);font-weight:700}}
.step:last-child::after{{content:""}}
.tension{{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;margin:18px 0}}
.res{{border-radius:12px;padding:16px;border:1px solid var(--line);background:var(--panel)}}
.res .k{{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}}
.res .v{{font-size:28px;font-weight:800;font-family:Menlo,monospace;color:var(--teal)}}
.res.r .v{{color:var(--orange)}} .arrow{{font-size:24px;color:var(--dim)}}
.card{{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px}}
.card-top{{display:flex;justify-content:space-between;align-items:baseline;gap:8px}}
.card h3{{margin:0;color:var(--ink)}} .cost{{color:var(--orange);font:12px Menlo,monospace}}
.kv{{display:flex;gap:12px;flex-wrap:wrap;color:var(--dim);font-size:12.5px;margin-top:8px}}
.kv b{{color:var(--ink);font-family:Menlo,monospace}}
table{{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px}}
th,td{{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}}
th{{font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--dim)}}
.q{{font-variant-numeric:tabular-nums}}
.footer{{margin-top:34px;padding-top:14px;border-top:1px solid var(--line);color:var(--dim);font-size:12px}}
@media(max-width:720px){{
  .guide-topbar-inner{{padding:8px 18px;gap:10px;flex-wrap:wrap}}
  .guide-links{{order:3;flex-basis:100%;gap:12px;padding-bottom:4px}}
  .guide-brand{{font-size:15px}} .wrap{{padding-left:18px;padding-right:18px}}
}}
@media print{{
  html,body{{background:#fff;color:#000;font-size:10.5px;line-height:1.45}}
  .guide-topbar,.theme-switch{{display:none!important}} .wrap{{max-width:none;padding:0}}
  a{{color:#000;border-bottom:none}} h2{{color:#000;border-bottom:1px solid #666}} h3{{color:#0a4a44}}
  .card,.box,.res,.step{{background:#fff;border:1px solid #999;break-inside:avoid}}
  .lead,.dim,.card p,.step span,.footer{{color:#1a1a1a!important}}
  @page{{margin:11mm 10mm}}
}}
</style>
<link rel="stylesheet" href="theme.css">
</head>
<body data-page="guide">
<header class="guide-topbar">
  <div class="guide-topbar-inner">
    <a class="guide-brand" href="HUB.html">LiveBay <span>GUIDE</span></a>
    <nav class="guide-links" aria-label="章节导航">
      <a href="#s1">三十秒</a><a href="#s2">一局</a><a href="#s3">资源</a><a href="#s4">塔</a><a href="#s5">敌人</a><a href="#s6">波次</a><a href="#s7">故障</a><a href="#s8">L1</a><a href="#s9">结果</a><a href="#s10">为什么</a><a href="#s11">词表</a>
    </nav>
    <div class="theme-switch" role="group" aria-label="主题">
      <button type="button" data-theme-choice="system" aria-pressed="true">系统</button>
      <button type="button" data-theme-choice="light" aria-pressed="false">浅色</button>
      <button type="button" data-theme-choice="dark" aria-pressed="false">深色</button>
    </div>
  </div>
</header>

<main class="wrap">
  <section id="s1">
    <p class="dim">LiveBay · 逍遥湾 · 给第一次听说它的人</p>
    <h1>你是一个值班人，<br>不是指挥官。</h1>
    <p class="lead">在一座月牙形的移动太空城里，你守外环的一段舱壁。敌人不是“邪恶军团”，而是星际尘埃、乱流、重壳，以及从湾口反向扩散的内部故障。你要做的不是打赢一场战争，而是让这一班安全过去。</p>
    <div class="box tip"><h3>三十秒版本</h3><p>用供能造 <b>{total_towers} 种塔</b>，守住 <b>{total_slots} 个固定塔位</b>，扛过 <b>{total_waves} 波</b>敌人。漏过敌人会扣保障度；保障度归零就失败。第 4/5 波的「故障」会让塔短暂离线——先修输出还是先保经济，是这一班的核心选择。</p></div>
  </section>

  <section id="s2">
    <h2><span class="n">01</span>一局是怎么走的</h2>
    <div class="flow">
      <div class="step"><b>准备</b><span>看路径与供能，造第一座塔</span></div>
      <div class="step"><b>交战</b><span>敌人沿外弧走向湾口</span></div>
      <div class="step"><b>整备</b><span>升级 / 补塔 / 修复</span></div>
      <div class="step"><b>结算</b><span>5 波结束或保障度归零</span></div>
    </div>
    <p>准备时间首波 <b>{esc(balance.get("prepare_time", 30))} 秒</b>，之后波间 <b>{esc(balance.get("between_wave_time", 20))} 秒</b>。时间不是背景：它决定你能不能在看懂局面之前把塔放对。</p>
  </section>

  <section id="s3">
    <h2><span class="n">02</span>两种资源：供能与保障度</h2>
    <div class="tension">
      <div class="res"><div class="k">供能</div><div class="v">{start_energy}</div><div class="dim">建造 / 升级 / 出售；击杀获得</div></div>
      <div class="arrow">↔</div>
      <div class="res r"><div class="k">保障度</div><div class="v">{start_integrity}</div><div class="dim">漏过扣；补给塔每波修复</div></div>
    </div>
    <p>供能是“现在能做什么”，保障度是“还能撑多久”。大多数失败不是不会造塔，而是把供能全投在输出上，忘了留修复与升级的余地。</p>
  </section>

  <section id="s4">
    <h2><span class="n">03</span>三座塔，三种职责</h2>
    <div class="grid3">{tower_cards}</div>
    <p class="dim">塔位固定，不能随便挪；升级提高伤害/射程/产出，出售返还一部分投入。</p>
  </section>

  <section id="s5">
    <h2><span class="n">04</span>四种敌人：压力不是一种</h2>
    <table><thead><tr><th>敌人</th><th>HP</th><th>速度</th><th>漏过伤害</th><th>行为</th></tr></thead><tbody>{enemy_rows}</tbody></table>
    <p>{fault_text}</p>
  </section>

  <section id="s6">
    <h2><span class="n">05</span>五波：从数量到处置</h2>
    {wave_chart(waves, enemies)}
    <p>前 3 波主要考“输出够不够”，第 4/5 波开始考“故障来了怎么办”。柱状图是每波敌人数量与总血量，不是难度评分；真正的难度还取决于路径、塔位和你的建造顺序。</p>
  </section>

  <section id="s7">
    <h2><span class="n">06</span>故障：让塔离线的那一下</h2>
    <p>「故障」不是普通敌人：它从湾口反向扩散，经过塔位时让附近 <b>{esc(fault.get("disable_targets", 0) if fault else 0)} 座塔</b>短暂离线 <b>{esc(fault.get("disable_duration", 0) if fault else 0)} 秒</b>。它不一定直接扣保障度，但它会制造一个缺口：输出少了，后面的敌人就漏过去了。</p>
    <div class="box warn"><b>处理顺序：</b>先看缺口会不会导致漏过；如果会，优先补输出或减速；如果不会，趁离线修经济。故障不是“随机惩罚”，而是逼你在有限时间里重新分配注意力。</div>
  </section>

  <section id="s8">
    <h2><span class="n">07</span>L1 扩展：同一班，不同做法</h2>
    <p>扩展包把“班次”做成可比较的选择：W4 检查单、W5 故障命中暂停、事故记录、接班简报、低报审计。A/B/C 是三个样例，不是正式关卡。</p>
    <table><thead><tr><th>变体</th><th>W4</th><th>W5</th><th>它想验证什么</th></tr></thead><tbody>
      <tr><td>A</td><td>复查</td><td>隔离</td><td>谨慎：用时间换故障时长</td></tr>
      <tr><td>B</td><td>按惯例</td><td>隔离</td><td>短期省事，长期进审计</td></tr>
      <tr><td>C</td><td>照签</td><td>旁路</td><td>冒险：保覆盖，但降级扩散</td></tr>
    </tbody></table>
    <p>用 <code>./run.sh compare</code> 可以在同一张图、同一命令下比较三者；它输出 grade / 保障度 / 击杀 / 漏过 / 供能 / 时长。</p>
  </section>

  <section id="s9">
    <h2><span class="n">08</span>输赢与评级</h2>
    <p>守住 5 波就赢；保障度归零就输。评级按剩余保障度比例分档（S/A/B/C），不是“击杀越多越好”——漏过少、保障度高，才是好班次。</p>
    <p class="dim">数值是占位：真正的平衡要经过更多地图、职业与波次验证。</p>
  </section>

  <section id="s10">
    <h2><span class="n">09</span>为什么是弧形、为什么是岗位</h2>
    <p>弧形路径让“守哪一段”变成空间选择：直线路径容易变成唯一解，弧形让不同塔位的覆盖范围有差异，玩家必须判断“这段弧值不值得投资”。固定塔位则把“造在哪里”变成“先造什么、什么时候升级”的取舍。</p>
    <p>岗位塔防的重点不是“指挥官视角”，而是“值班人视角”：你不是全知全能，只能在有限信息、有限供能、有限时间里做局部最优。故障、低报、交接班，都是这个视角的一部分。</p>
  </section>

  <section id="s11">
    <h2><span class="n">10</span>词表</h2>
    <table><tbody>
      <tr><td><b>供能</b></td><td>建造与升级的资源；击杀敌人、补给塔产出。</td></tr>
      <tr><td><b>保障度</b></td><td>基地生命；敌人漏过扣，补给塔修复。</td></tr>
      <tr><td><b>塔位</b></td><td>地图上的固定建造点，共 {total_slots} 个。</td></tr>
      <tr><td><b>故障</b></td><td>反向扩散的内部敌人；经过塔位时让塔短暂离线。</td></tr>
      <tr><td><b>L1</b></td><td>班次层：检查单、故障处置、事故记录；当前是样例。</td></tr>
      <tr><td><b>黑匣子</b></td><td>事件 + 命令记录，可回放最近一局。</td></tr>
    </tbody></table>
  </section>

  <footer class="footer">
    <p>本页由 <code>briefing/build_guide.py</code> 生成；数字来自 <code>game/data/*.json</code>。改数据后运行 <code>python3 briefing/build_guide.py</code>，用 <code>--check</code> 校验是否过期。</p>
    <p>返回 <a href="HUB.html">项目 HUB</a> · 详细设计见 <a href="../docs-ai/design01/README.md">design01</a> · 生成时间：{GENERATED}</p>
  </footer>
</main>
<script src="theme.js" defer></script>
</body>
</html>'''
    return html


def main():
    html = build()
    if "--check" in sys.argv:
        if not OUT.exists():
            print("FAIL GUIDE.html 不存在")
            return 1
        if OUT.read_text(encoding="utf-8") != html:
            print("FAIL GUIDE.html 已过期：请运行 python3 briefing/build_guide.py")
            return 1
        print("GUIDE.html 与数据一致")
        return 0
    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT} ({len(html)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
