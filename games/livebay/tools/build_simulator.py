#!/usr/bin/env python3
"""build_simulator.py —— 生成 docs-ai/design01/simulator/index.html。

离线、单页、数据驱动：不启动 Godot，不回写游戏数据。
数据来自 game/data/*.json；--check 校验生成物是否过期。
"""
from __future__ import annotations

import hashlib
import html
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "game" / "data"
OUT = ROOT / "docs-ai" / "design01" / "simulator" / "index.html"
TRACE = ROOT / "docs-ai" / "design01" / "simulator" / "traces.json"
WAVE_FILES = {"bay01": "waves.json", "bay02": "waves_bay02.json", "bay03": "waves_bay03.json"}
MAP_FILES = ["map_bay01.json", "map_bay02.json", "map_bay03.json"]


def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def build_data() -> dict:
    maps = []
    for f in MAP_FILES:
        m = load(f)
        m["waves"] = load(WAVE_FILES[m["id"]])
        maps.append(m)
    payload = {
        "towers": load("towers.json"),
        "enemies": load("enemies.json"),
        "balance": load("balance.json"),
        "maps": maps,
    }
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    payload["source_hash"] = "sha256:" + hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return payload


def html_page(data: dict, traces: dict) -> str:
    js_data = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    js_traces = json.dumps(traces, ensure_ascii=False, separators=(",", ":"))
    page = r'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>LiveBay · 数值沙盘</title>
<meta name="description" content="LiveBay 离线数值沙盘：地图覆盖、DPS、波次压力、经济与诊断；不是完整战斗模拟。">
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
:root{{color-scheme:light dark;--bg:#e9e3d5;--panel:#f5efe2;--panel2:#ded5c3;--ink:#232b2f;--muted:#5f6967;--line:#b9ae98;--teal:#2f6b65;--orange:#c95b2c;--amber:#b47a16;--rust:#8c4a32;--shadow:0 16px 40px rgba(35,43,47,.12);--mono:"SFMono-Regular",Consolas,monospace;--sans:"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC",system-ui,sans-serif}}
:root[data-theme="light"]{{color-scheme:light}}
:root[data-theme="dark"]{{color-scheme:dark;--bg:#11181b;--panel:#182326;--panel2:#223136;--ink:#e9e3d5;--muted:#a9b4b0;--line:#3d4d4d;--teal:#73c5bb;--orange:#ed8a5a;--amber:#e0b35f;--rust:#d08a70;--shadow:0 18px 50px rgba(0,0,0,.35)}}
@media (prefers-color-scheme:dark){{:root:not([data-theme]){{color-scheme:dark}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:14px/1.6 var(--sans)}}a{{color:var(--teal)}}button,select,input{{font:inherit;color:inherit}}
.topbar{{position:sticky;top:0;z-index:10;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px clamp(14px,4vw,38px);background:color-mix(in srgb,var(--bg) 90%,transparent);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}}
.brand span{{display:block;font:700 10px/1.3 var(--mono);letter-spacing:.16em;color:var(--orange)}}.brand strong{{display:block}}
.theme-switch{{display:flex;gap:3px;border:1px solid var(--line);border-radius:999px;padding:3px;background:var(--panel)}}.theme-switch button{{border:0;background:transparent;color:var(--muted);padding:6px 9px;border-radius:999px;cursor:pointer;font-size:12px}}.theme-switch button[aria-pressed="true"]{{background:var(--ink);color:var(--panel)}}
.wrap{{max-width:1240px;margin:0 auto;padding:clamp(20px,4vw,40px) clamp(14px,4vw,38px) 60px}}
.eyebrow{{margin:0 0 8px;font:700 11px/1 var(--mono);letter-spacing:.18em;color:var(--orange)}}h1{{margin:0;font-size:clamp(28px,4.5vw,46px);line-height:1.1;letter-spacing:-.04em}}.lede{{max-width:76ch;color:var(--muted)}}.notice{{border-left:3px solid var(--amber);background:var(--panel);border-radius:0 10px 10px 0;padding:10px 13px;color:var(--muted);margin:14px 0;font-size:12.5px}}
.toolbar{{display:flex;gap:10px;flex-wrap:wrap;align-items:end;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px;margin:14px 0}}
.field{{display:flex;flex-direction:column;gap:3px;min-width:130px}}.field label{{font-size:11px;color:var(--muted)}}.field select,.field input{{background:var(--bg);border:1px solid var(--line);border-radius:7px;padding:6px 8px}}
.btn{{border:1px solid var(--line);background:var(--bg);border-radius:8px;padding:7px 11px;cursor:pointer}}.btn.primary{{background:var(--teal);border-color:var(--teal);color:var(--panel)}}.btn:hover{{border-color:var(--orange)}}
.layout{{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:16px;align-items:start}}
.card{{background:var(--panel);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:14px;min-width:0}}h2{{font-size:16px;margin:0 0 3px}}h2 .n{{color:var(--orange);font:700 10px var(--mono);margin-right:6px}}.hint{{color:var(--muted);font-size:12px;margin:0 0 10px}}
.map-svg{{width:100%;height:auto;display:block;background:var(--bg);border:1px solid var(--line);border-radius:10px}}.map-svg .path{{fill:none;stroke:var(--teal);stroke-width:6;stroke-linecap:round;stroke-linejoin:round;opacity:.7}}.map-svg .range{{fill:color-mix(in srgb,var(--teal) 10%,transparent);stroke:var(--teal);stroke-width:1;stroke-dasharray:3 3}}.map-svg .slot{{fill:var(--orange);stroke:var(--panel);stroke-width:2;cursor:pointer}}.map-svg .slot.empty{{fill:var(--muted)}}.map-svg .slot-label{{fill:var(--ink);font:10px var(--mono);text-anchor:middle}}.map-svg .base{{fill:none;stroke:var(--orange);stroke-width:3}}.map-svg text{{font-family:var(--sans)}}
.slot-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:10px}}.slot-card{{border:1px solid var(--line);border-radius:9px;padding:7px 8px;background:var(--bg)}}.slot-card label{{display:block;font:10px var(--mono);color:var(--muted);margin-bottom:3px}}.slot-card select{{width:100%;border:1px solid var(--line);border-radius:6px;padding:5px;background:var(--panel)}}
.stats{{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px}}.stat{{background:var(--bg);border:1px solid var(--line);border-radius:9px;padding:8px 10px}}.stat .v{{font:800 20px/1.2 var(--mono);color:var(--teal)}}.stat .l{{font-size:10px;color:var(--muted)}}
.bar-row{{display:grid;grid-template-columns:80px 1fr 48px;gap:7px;align-items:center;margin:5px 0;font-size:11px}}.bar-row .track{{height:8px;background:var(--panel2);border-radius:999px;overflow:hidden}}.bar-row .fill{{height:100%;background:var(--teal);border-radius:999px}}.bar-row .fill.warn{{background:var(--orange)}}.bar-row .num{{text-align:right;font:10px var(--mono);color:var(--muted)}}
table{{width:100%;border-collapse:collapse;font-size:11.5px}}th,td{{padding:5px 4px;border-bottom:1px solid var(--line);text-align:left}}th{{color:var(--muted);font-weight:600}}
.diag{{border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--bg);font-size:12px;color:var(--muted);margin-top:8px}}.diag strong{{color:var(--orange)}}.tag{{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:2px 7px;font:10px var(--mono);color:var(--muted);margin-right:4px}}
.footer{{border-top:1px solid var(--line);margin-top:20px;padding-top:12px;color:var(--muted);font-size:11.5px;display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between}}
@media(max-width:900px){{.layout{{grid-template-columns:1fr}}}}@media print{{.topbar,.toolbar,.theme-switch,.slot-grid{{display:none!important}}.card{{box-shadow:none;break-inside:avoid}}}}
</style>
</head>
<body>
<header class="topbar"><div class="brand"><span>LiveBay · design01 · simulator</span><strong>数值沙盘</strong></div><div class="theme-switch" role="group" aria-label="主题"><button type="button" data-theme-choice="system" aria-pressed="true">系统</button><button type="button" data-theme-choice="light" aria-pressed="false">浅色</button><button type="button" data-theme-choice="dark" aria-pressed="false">深色</button></div></header>
<main class="wrap">
<p class="eyebrow">Offline · analytic · read-only</p><h1>先算清楚，再打一局。</h1>
<p class="lede">调塔、调波、调经济，不必每次都启动 Godot。这个页面只做<b>解析估算</b>：覆盖、DPS、波次压力、供能与诊断；它不是完整战斗复刻。</p>
<div class="notice"><b>边界：</b>敌人逐帧走位、减速叠加、故障相邻塔、玩家操作误差不在第一版内。结果用于比较与发现异常，不替代 Godot 的最终裁决。</div>

<section class="toolbar">
  <div class="field"><label for="map">地图</label><select id="map"></select></div>
  <div class="field"><label for="wave">波次</label><select id="wave"><option value="all">全部（合计）</option></select></div>
  <div class="field"><label for="level">塔等级</label><select id="level"><option value="1">1 级</option><option value="2">2 级</option><option value="3">3 级</option></select></div>
  <div class="field"><label for="speed">敌人速度 × <span id="speedOut">1.00</span></label><input id="speed" type="range" min="0.7" max="1.5" step="0.05" value="1"></div>
  <button class="btn" id="preset">标准班</button>
  <button class="btn" id="clear">清空</button>
</section>

<div class="layout">
  <section class="card">
    <h2><span class="n">01</span>地图与塔位</h2><p class="hint">选择塔位上的塔；射程圈与覆盖弦会随塔改变。</p>
    <svg id="mapSvg" class="map-svg" viewBox="0 0 800 400" role="img" aria-label="地图路径与塔位"></svg>
    <div class="slot-grid" id="slotGrid"></div>
  </section>

  <section class="card">
    <h2><span class="n">02</span>指标</h2><p class="hint">“压力”是波次 HP 除以（生成窗口 + 穿越时间），不是准确 TTK。</p>
    <div class="stats" id="stats"></div>
    <div id="bars"></div>
    <div class="diag" id="diag"></div>
  </section>
</div>

<div class="layout" style="margin-top:16px">
  <section class="card">
    <h2><span class="n">03</span>塔位明细</h2><p class="hint">DPS 为单目标理论值；覆盖弦 = 2×sqrt(range² - 最近距离²)。</p>
    <div id="towerTable"></div>
  </section>
  <section class="card">
    <h2><span class="n">04</span>波次压力</h2><p class="hint">按地图自己的波次表计算；不是同一套波次换皮。</p>
    <div id="waveTable"></div>
    <div class="diag"><strong>当前地图修正：</strong><span id="mods"></span></div>
  </section>
</div>

<section class="card" id="traceCard" style="margin-top:16px">
  <h2><span class="n">05</span>Godot 对账</h2>
  <p class="hint">内置 trace 来自 <code>./run.sh sim-trace</code>；页面对照当前配置与标准班的静态事实。解析沙盘不产生逐局 grade，因此击杀/漏过/保障度只显示 Godot 参考值，不冒充预测。</p>
  <div class="toolbar">
    <div class="field"><label for="traceFile">导入 traces.json</label><input id="traceFile" type="file" accept="application/json,.json"></div>
    <button class="btn" id="traceBuiltin">使用内置 trace</button>
    <span class="tag" id="traceSource">内置</span>
  </div>
  <div class="diag" id="traceStatus">正在读取 trace…</div>
  <div id="traceTable"></div>
</section>

<section class="card" id="miniCard" style="margin-top:16px">
  <h2><span class="n">06</span>P4 离散小模拟</h2>
  <p class="hint">用当前地图、当前塔位与塔等级跑一次固定步长的小模拟：移动、索敌、开火、减速、故障停塔、漏过、供能与评级。它比解析估算更接近游戏，但仍不是完整 Godot 复刻。</p>
  <div class="toolbar">
    <button class="btn primary" id="miniRun">运行 P4</button>
    <button class="btn" id="miniReset">重置</button>
    <span class="tag" id="miniStatus">尚未运行</span>
  </div>
  <div class="stats" id="miniStats"></div>
  <div class="diag" id="miniDiag">点「运行 P4」开始；使用当前塔位选择，塔等级采用上方等级。</div>
  <div id="miniWaves"></div>
</section>

<footer class="footer"><span>由 <code>tools/build_simulator.py</code> 生成 · 数据 hash <code id="hash"></code></span><span><a href="../flows/game_flow.html">流程图</a> · <a href="README.md">方案/说明</a></span></footer>
</main>
<script>
const DATA = __DATA__;
const TRACES = __TRACES__;
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const state = {{mapId: DATA.maps[0].id, wave: 'all', level: 1, speed: 1, slots: {{}}}};
const towerById = Object.fromEntries(DATA.towers.map(t => [t.id, t]));
const enemyById = Object.fromEntries(DATA.enemies.map(e => [e.id, e]));

function mapData() {{ return DATA.maps.find(m => m.id === state.mapId); }}
function pathLen(m) {{
  let n = 0; for (let i=1;i<m.path.length;i++) n += Math.hypot(m.path[i][0]-m.path[i-1][0], m.path[i][1]-m.path[i-1][1]); return n;
}}
function pointSeg(p, a, b) {{
  const dx=b[0]-a[0], dy=b[1]-a[1]; const l=dx*dx+dy*dy || 1;
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l));
  return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy));
}}
function nearest(m, p) {{
  let d=Infinity; for (let i=1;i<m.path.length;i++) d=Math.min(d,pointSeg(p,m.path[i-1],m.path[i])); return d;
}}
function assigned() {{
  const m=mapData(); return m.slots.map((p,i)=>({{slot:i,pos:p,tower:state.slots[i]||'',def:state.slots[i]?towerById[state.slots[i]]:null}})).filter(x=>x.def);
}}
function defaultSlots(m) {{
  const out={{}}; const ids=m.slots.map((_,i)=>i);
  if (ids.length>3) {{ out[3]='interceptor'; out[4]='pulse'; }}
  else {{ out[ids[0]]='interceptor'; out[ids[1]]='interceptor'; }}
  if (ids.length>5) out[5]='supply';
  return out;
}}
function towerStats(x) {{
  const t=x.def, d=nearest(mapData(), x.pos);
  const chord = t.range>d ? 2*Math.sqrt(Math.max(0,t.range*t.range-d*d)) : 0;
  const dps = Number(t.damage||0)*Number(t.fire_rate||0)*(1+0.25*(state.level-1));
  return {{...x, dist:d, chord, dps, income:Number(t.income||0)}};
}}
function waveStats() {{
  const m=mapData(), list = state.wave==='all' ? m.waves : m.waves.filter(w=>String(w.index)===String(state.wave));
  let hp=0,count=0,reward=0,leak=0,spawn=0,maxTravel=0;
  for (const w of list) {{
    for (const g of w.groups) {{
      const e=enemyById[g.enemy]; count+=g.count; hp+=g.count*e.hp; reward+=g.count*e.reward; leak+=g.count*e.leak_damage;
      spawn=Math.max(spawn, g.delay+(g.count-1)*g.interval);
      maxTravel=Math.max(maxTravel, pathLen(m)/e.speed);
    }}
  }}
  return {{hp,count,reward,leak,spawn,maxTravel,list}};
}}
function fmt(n) {{ return Math.round(n).toLocaleString('zh-CN'); }}
function renderMap() {{
  const m=mapData(), svg=$('#mapSvg'); const xs=m.path.map(p=>p[0]), ys=m.path.map(p=>p[1]);
  const pad=30, w=800, h=400, minx=Math.min(...xs), maxx=Math.max(...xs), miny=Math.min(...ys), maxy=Math.max(...ys);
  const sx=x=>pad+(x-minx)/(maxx-minx||1)*(w-pad*2), sy=y=>pad+(y-miny)/(maxy-miny||1)*(h-pad*2);
  const pts=m.path.map(p=>`${{sx(p[0]).toFixed(1)}},${{sy(p[1]).toFixed(1)}}`).join(' ');
  let out=`<polyline points="${{pts}}" fill="none" stroke="var(--teal)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`;
  const base=m.base.pos; out+=`<circle cx="${{sx(base[0])}}" cy="${{sy(base[1])}}" r="18" class="base"/>`;
  const bySlot=Object.fromEntries(assigned().map(x=>[x.slot,x]));
  m.slots.forEach((p,i)=>{{
    const a=bySlot[i]; const color=a?'var(--orange)':'var(--muted)';
    out+=`<circle cx="${{sx(p[0])}}" cy="${{sy(p[1])}}" r="7" fill="${{color}}" stroke="var(--panel)" stroke-width="2"/>`;
    out+=`<text x="${{sx(p[0])}}" y="${{sy(p[1])-12}}" class="slot-label" fill="var(--ink)" font-size="10" text-anchor="middle">${{i+1}}</text>`;
    if (a && a.def.range>0) out+=`<circle cx="${{sx(p[0])}}" cy="${{sy(p[1])}}" r="${{(a.def.range/(maxx-minx||1))*(w-pad*2)}}" fill="none" stroke="var(--teal)" stroke-width="1" stroke-dasharray="3 3" opacity=".55"/>`;
  }});
  svg.innerHTML=out;
}}
function renderSlots() {{
  const m=mapData(); const grid=$('#slotGrid'); grid.innerHTML='';
  m.slots.forEach((p,i)=>{{
    const card=document.createElement('div'); card.className='slot-card';
    const label=document.createElement('label'); label.textContent='塔位 '+(i+1); card.appendChild(label);
    const sel=document.createElement('select'); sel.dataset.slot=String(i);
    sel.innerHTML='<option value="">空</option>'+DATA.towers.map(t=>`<option value="${{t.id}}">${{t.name}} · ${{t.cost}}</option>`).join('');
    sel.value=state.slots[i]||''; sel.addEventListener('change',()=>{{ if(sel.value) state.slots[i]=sel.value; else delete state.slots[i]; writeHash(); render(); }});
    card.appendChild(sel); grid.appendChild(card);
  }});
}}
function render() {{
  const towers=assigned().map(towerStats); const ws=waveStats();
  const dps=towers.reduce((n,x)=>n+x.dps,0);
  const coverage=towers.reduce((n,x)=>n+x.chord,0)/(pathLen(mapData())||1);
  const buildCost=towers.reduce((n,x)=>n+Number(x.def.cost||0),0);
  const pressure=ws.hp/Math.max(1,ws.spawn+ws.maxTravel/state.speed);
  const startEnergy=Number(DATA.balance.starting_energy||90)+(Number(mapData().modifiers?.energy_delta)||0);
  const remain=startEnergy-buildCost+ws.reward;
  $('#stats').innerHTML=[
    ['路径长度', fmt(pathLen(mapData()))+' px'], ['波次 HP', fmt(ws.hp)],
    ['理论 DPS', dps.toFixed(1)], ['覆盖倍率', coverage.toFixed(2)+'×'],
    ['波次压力', pressure.toFixed(1)+' DPS'], ['建造/剩余供能', fmt(buildCost)+' / '+fmt(remain)]
  ].map(([l,v])=>`<div class="stat"><div class="v">${{v}}</div><div class="l">${{l}}</div></div>`).join('');
  const maxBar=Math.max(pathLen(mapData()), ...towers.map(x=>x.chord),1);
  $('#bars').innerHTML=towers.map(x=>`<div class="bar-row"><span>塔位 ${{x.slot+1}}</span><div class="track"><div class="fill" style="width:${{Math.min(100,x.chord/maxBar*100)}}%"></div></div><span class="num">${{fmt(x.chord)}}</span></div>`).join('') || '<p class="hint">还没有塔。</p>';
  let verdict='';
  if (!towers.length) verdict='先放至少一座塔。';
  else if (dps < pressure) verdict='理论 DPS 低于波次压力：可能漏过，先补输出或延长停留时间。';
  else if (coverage < 0.25) verdict='DPS 够但覆盖偏窄：检查塔位是否集中在同一段弧。';
  else if (ws.hp===0) verdict='当前选择没有波次数据。';
  else verdict='在解析口径下可试；仍需用 Godot 试玩确认手感与故障窗口。';
  $('#diag').innerHTML='<strong>诊断</strong><br>'+verdict+'<br><span class="tag">压力='+pressure.toFixed(1)+'</span><span class="tag">覆盖率='+coverage.toFixed(2)+'</span><span class="tag">塔='+towers.length+'</span>';
  $('#towerTable').innerHTML='<table><thead><tr><th>塔位</th><th>塔</th><th>距离</th><th>弦长</th><th>DPS</th><th>造价</th></tr></thead><tbody>'+(towers.map(x=>`<tr><td>${{x.slot+1}}</td><td>${{x.def.name}}</td><td>${{x.dist.toFixed(1)}}</td><td>${{fmt(x.chord)}}</td><td>${{x.dps.toFixed(1)}}</td><td>${{x.def.cost}}</td></tr>`).join('')||'<tr><td colspan="6" class="hint">空</td></tr>')+'</tbody></table>';
  $('#waveTable').innerHTML='<table><thead><tr><th>波</th><th>数量</th><th>HP</th><th>奖励</th><th>漏过</th><th>压力</th></tr></thead><tbody>'+ws.list.map(w=>{{
    let h=0,n=0,rew=0,leak=0,sp=0,tr=0;
    for(const g of w.groups){{const e=enemyById[g.enemy]; n+=g.count; h+=g.count*e.hp; rew+=g.count*e.reward; leak+=g.count*e.leak_damage; sp=Math.max(sp,g.delay+(g.count-1)*g.interval); tr=Math.max(tr,pathLen(mapData())/e.speed);}}
    const p=h/Math.max(1,sp+tr/state.speed);
    return `<tr><td>${{w.index}}</td><td>${{n}}</td><td>${{fmt(h)}}</td><td>${{rew}}</td><td>${{leak}}</td><td>${{p.toFixed(1)}}</td></tr>`;
  }}).join('')+'</tbody></table>';
  const mods=mapData().modifiers||{}; $('#mods').textContent=Object.keys(mods).length?Object.entries(mods).map(([k,v])=>k+' '+v).join(' · '):'无';
  $('#hash').textContent=DATA.source_hash;
  renderMap();
  renderTrace();
}}
let traceData = TRACES;
function waveStatsAll() {{
  const old = state.wave; state.wave='all'; const r=waveStats(); state.wave=old; return r;
}}
function renderTrace() {{
  const target = (traceData?.scenarios || []).find(s => s.map === state.mapId && s.scenario === 'standard');
  if (!target) {{
    $('#traceStatus').textContent = '没有当前地图的 trace。运行 ./run.sh sim-trace 后重新生成页面，或导入 JSON。';
    $('#traceTable').innerHTML = '';
    return;
  }}
  const all = waveStatsAll();
  const towers = assigned().map(towerStats);
  const facts = target.facts || {{}};
  const rows = [
    ['路径长度', Math.round(pathLen(mapData())), Math.round(Number(facts.path_length || 0)), '±1 px'],
    ['塔位', mapData().slots.length, Number(facts.slots || 0), '精确'],
    ['波数', mapData().waves.length, Number(facts.waves || 0), '精确'],
    ['敌人总数', all.count, Number(facts.wave_count || 0), '精确'],
    ['波次 HP', all.hp, Number(facts.wave_hp || 0), '精确'],
    ['建造塔数', towers.filter(t => t.def.kind !== 'upgrade').length, (target.build || []).filter(b => b.tower !== 'upgrade').length, '精确'],
    ['建造花费', towers.reduce((n,t)=>n+Number(t.def.cost||0),0), Number(target.result?.spent || 0), '参考'],
  ];
  const html = rows.map(([name,a,b,tol]) => {{
    const ok = Math.abs(Number(a)-Number(b)) <= (tol === '±1 px' ? 1 : 0);
    return `<tr><td>${{name}}</td><td>${{a}}</td><td>${{b}}</td><td>${{ok?'<span style="color:var(--teal)">一致</span>':'<span style="color:var(--orange)">差异</span>'}}</td><td>${{tol}}</td></tr>`;
  }}).join('');
  const r = target.result || {{}};
  $('#traceStatus').innerHTML = `当前地图：<b>${{mapData().name}}</b> · 场景：<b>standard</b> · Godot：<b>${{r.grade||'?'}}</b> / 保障度 ${{r.integrity||0}} / 击杀 ${{r.kills||0}} / 漏过 ${{r.leaked||0}} / ${{Number(r.seconds||0).toFixed(1)}}s`;
  $('#traceTable').innerHTML = `<table><thead><tr><th>静态事实</th><th>沙盘</th><th>Godot</th><th>判定</th><th>容差</th></tr></thead><tbody>${{html}}</tbody></table><p class="hint" style="margin-top:8px">Godot 逐局结果仅作为参考；当前配置若不是标准班，塔数/花费会出现差异，这是预期。</p>`;
}}

/* ---------------- P4 discrete mini simulation ---------------- */
let mini = null;
function miniTowerCost(def, level) {
  return Number(def.cost || 0);
}
function miniStart() {
  const m = mapData();
  const mods = m.modifiers || {};
  const towers = [];
  let energy = Number(DATA.balance.starting_energy || 90) + Number(mods.energy_delta || 0);
  assigned().forEach(a => {
    const def = a.def;
    const cost = miniTowerCost(def, state.level);
    if (energy < cost) return;
    energy -= cost;
    towers.push({
      slot: a.slot, def, level: state.level, cooldown: 0,
      incomeTimer: 0, disabled: 0, degraded: 0,
      invested: cost
    });
  });
  const maxIntegrity = Number(DATA.balance.starting_integrity || 100) + Number(mods.integrity_delta || 0);
  mini = {
    map: m, towers, energy, integrity: maxIntegrity, maxIntegrity,
    waveIndex: -1, state: 'prep', timer: 1.0, time: 0,
    enemies: [], queue: [], kills: 0, leaked: 0, spent: 0,
    waveCleared: [], waves: [],
    speedMult: Number(mods.speed_mult || 1) * Number(state.speed || 1),
    damageMult: Number(mods.damage_mult || 1)
  };
  mini.spent = towers.reduce((n,t)=>n+t.invested,0);
  $('#miniStatus').textContent = `开始 · ${m.name} · ${towers.length} 塔`;
  beginMiniWave();
}
function beginMiniWave() {
  const m = mini.map;
  mini.waveIndex += 1;
  if (mini.waveIndex >= m.waves.length) { mini.state='won'; return; }
  const w = m.waves[mini.waveIndex];
  mini.state='wave'; mini.timer=0; mini.queue=[];
  for (const g of w.groups) for (let i=0;i<g.count;i++) mini.queue.push({t: g.delay + i*g.interval, enemy: g.enemy});
  mini.queue.sort((a,b)=>a.t-b.t);
  mini.waveStartEnergy=mini.energy; mini.waveKills=mini.kills; mini.waveLeaked=mini.leaked;
  mini.waveTime=0;
}
function miniSpawnDue() {
  while (mini.queue.length && mini.queue[0].t <= mini.waveTime) {
    const item=mini.queue.shift();
    const e=DATA.enemies.find(x=>x.id===item.enemy);
    const reverse=(e.behavior==='reverse');
    mini.enemies.push({
      def:e, hp:Number(e.hp), dist: reverse ? Number(mini.map.path.length?pathLen(mini.map):0) : 0,
      direction: reverse?-1:1, slow:0, slowTimer:0, hit:{}
    });
  }
}
function miniPoint(d) {
  const p=mini.map.path; if(p.length<2) return [0,0];
  const total=pathLen(mini.map); if(d<=0) return p[0]; if(d>=total) return p[p.length-1];
  let acc=0;
  for(let i=1;i<p.length;i++){const seg=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]); if(acc+seg>=d){const t=(d-acc)/(seg||1);return [p[i-1][0]+(p[i][0]-p[i-1][0])*t,p[i-1][1]+(p[i][1]-p[i-1][1])*t];} acc+=seg;}
  return p[p.length-1];
}
function miniTick(dt) {
  if (mini.state==='won' || mini.state==='lost') return;
  mini.time += dt;
  if (mini.state==='prep') { mini.timer-=dt; if(mini.timer<=0) beginMiniWave(); return; }
  if (mini.state!=='wave') return;
  mini.waveTime += dt; miniSpawnDue();
  // towers
  for (const t of mini.towers) {
    if (t.disabled>0) { t.disabled-=dt; continue; }
    if (t.degraded>0) { t.degraded-=dt; }
    const def=t.def, dmg=Number(def.damage||0)*(1+0.25*(t.level-1))*mini.damageMult;
    if (def.kind==='supply') {
      t.incomeTimer-=dt;
      if(t.incomeTimer<=0){t.incomeTimer+=Number(def.income_interval||5); mini.energy+=Number(def.income||0);}
      continue;
    }
    t.cooldown-=dt;
    if(t.cooldown>0) continue;
    const pos=mini.map.slots[t.slot];
    const range=Number(def.range||0);
    const targets=mini.enemies.filter(e=>!e.dead && Math.hypot(pos[0]-miniPoint(e.dist)[0],pos[1]-miniPoint(e.dist)[1])<=range);
    if(!targets.length) continue;
    if(def.kind==='single') {
      targets.sort((a,b)=>b.dist-a.dist);
      const e=targets[0]; e.hp-=dmg; if(e.hp<=0)e.dead=true;
    } else {
      for(const e of targets){e.hp-=dmg; const slow=Number(def.slow||0); if(slow>0){e.slow=Math.max(e.slow,slow);e.slowTimer=Math.max(e.slowTimer,Number(def.slow_duration||1.5));} if(e.hp<=0)e.dead=true;}
    }
    t.cooldown=1/Math.max(0.05,Number(def.fire_rate||0.5));
  }
  // enemies
  for (const e of mini.enemies) {
    if(e.dead) continue;
    if(e.slowTimer>0){e.slowTimer-=dt;e.slow*=1;}
    let speed=Number(e.def.speed||0)*mini.speedMult;
    if(e.slowTimer>0) speed*=1-e.slow;
    e.dist += speed*dt*e.direction;
    // fault: disable nearby towers once
    if(e.def.behavior==='reverse') {
      const p=miniPoint(e.dist);
      for(const t of mini.towers){ if(e.hit[t.slot]) continue; const sp=mini.map.slots[t.slot]; if(Math.hypot(p[0]-sp[0],p[1]-sp[1])<=Number(e.def.disable_radius||0)){e.hit[t.slot]=true; t.disabled=Math.max(t.disabled,Number(e.def.disable_duration||0)); if(Object.keys(e.hit).length>=Number(e.def.disable_targets||99)) break;}}
    }
    if(e.direction>0 && e.dist>=pathLen(mini.map)) { e.dead=true; e.leaked=true; }
    else if(e.direction<0 && e.dist<=0) { e.dead=true; }
  }
  for(const e of mini.enemies){if(e.dead && e.leaked){mini.leaked++; mini.integrity=Math.max(0,mini.integrity-Number(e.def.leak_damage||0));} else if(e.dead){mini.kills++; mini.energy+=Number(e.def.reward||0);} }
  mini.enemies=mini.enemies.filter(e=>!e.dead);
  if(mini.integrity<=0){mini.state='lost'; finishMini(); return;}
  if(!mini.queue.length && !mini.enemies.length){
    mini.waveCleared.push(mini.waveIndex+1);
    mini.waves.push({index:mini.waveIndex+1,kills:mini.kills-mini.waveKills,leaked:mini.leaked-mini.waveLeaked,energy:mini.energy-mini.waveStartEnergy});
    for(const t of mini.towers){if(t.def.kind==='supply' && t.disabled<=0) mini.integrity=Math.min(mini.maxIntegrity, mini.integrity+Number(t.def.repair||0));}
    if(mini.waveIndex>=mini.map.waves.length-1){mini.state='won';finishMini();return;}
    mini.state='prep'; mini.timer=1.0;
  }
  }
}
function finishMini(){
  const r=mini.integrity/mini.maxIntegrity;
  const b=DATA.balance;
  mini.grade = mini.state==='lost' ? 'F' : (r>=b.grade_s_ratio?'S':r>=b.grade_a_ratio?'A':r>=b.grade_b_ratio?'B':'C');
  mini.done=true;
  $('#miniStatus').textContent = `完成 · ${mini.grade} · ${mini.integrity.toFixed(0)}/${mini.maxIntegrity}`;
  $('#miniStats').innerHTML=[
    ['grade',mini.grade],['保障度',mini.integrity.toFixed(0)+'/'+mini.maxIntegrity],['击杀',mini.kills],['漏过',mini.leaked],['供能',Math.round(mini.energy)],['模拟时长',mini.time.toFixed(1)+'s']
  ].map(([l,v])=>`<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');
  $('#miniWaves').innerHTML='<table><thead><tr><th>波</th><th>击杀</th><th>漏过</th><th>供能变化</th></tr></thead><tbody>'+mini.waves.map(w=>`<tr><td>${w.index}</td><td>${w.kills}</td><td>${w.leaked}</td><td>${w.energy}</td></tr>`).join('')+'</tbody></table>';
  $('#miniDiag').textContent = mini.state==='lost' ? '保障度归零：这次配置失败。' : '小模拟结束。它仍是离散近似；请用 ./run.sh playtest 或实际游戏复核关键结论。';
}
function runMini(){
  miniStart();
  let steps=0;
  while(mini && (mini.state==='prep'||mini.state==='wave') && steps<60*900){miniTick(1/60);steps++;}
  if(mini && !mini.done){ if(mini.state!=='lost'&&mini.state!=='won') mini.state='lost'; finishMini(); }
}
function writeHash() {{
  const p=new URLSearchParams(); p.set('map',state.mapId); p.set('wave',state.wave); p.set('level',state.level); p.set('speed',state.speed);
  const slots=Object.entries(state.slots).map(([k,v])=>k+':'+v).join(','); if(slots) p.set('slots',slots);
  const h='#'+p.toString(); if(location.hash!==h) {{ try{{history.replaceState(null,'',h);}}catch(e){{location.hash=h;}} }}
}}
function readHash() {{
  const p=new URLSearchParams(location.hash.replace(/^#/,''));
  if(p.get('map')&&DATA.maps.some(m=>m.id===p.get('map'))) state.mapId=p.get('map');
  if(p.get('wave')) state.wave=p.get('wave');
  if(p.get('level')) state.level=Number(p.get('level'))||1;
  if(p.get('speed')) state.speed=Number(p.get('speed'))||1;
  const slots=p.get('slots'); if(slots) for(const pair of slots.split(',')){{const [k,v]=pair.split(':'); if(v&&towerById[v]) state.slots[k]=v;}}
}}
function syncControls() {{
  $('#map').value=state.mapId; $('#wave').value=state.wave; $('#level').value=String(state.level); $('#speed').value=String(state.speed); $('#speedOut').textContent=Number(state.speed).toFixed(2);
}}
function populateWaves() {{
  const sel=$('#wave'); sel.innerHTML='<option value="all">全部（合计）</option>'+mapData().waves.map(w=>`<option value="${{w.index}}">第 ${{w.index}} 波</option>`).join(''); sel.value=state.wave;
}}
function init() {{
  const mapSel=$('#map'); mapSel.innerHTML=DATA.maps.map(m=>`<option value="${{m.id}}">${{m.name}}</option>`).join('');
  readHash();
  if(!Object.keys(state.slots).length) state.slots=defaultSlots(mapData());
  populateWaves(); syncControls();
  mapSel.addEventListener('change',()=>{{state.mapId=mapSel.value; state.slots=defaultSlots(mapData()); state.wave='all'; populateWaves(); syncControls(); writeHash(); render();}});
  $('#wave').addEventListener('change',e=>{{state.wave=e.target.value;writeHash();render();}});
  $('#level').addEventListener('change',e=>{{state.level=Number(e.target.value);writeHash();render();}});
  $('#speed').addEventListener('input',e=>{{state.speed=Number(e.target.value);$('#speedOut').textContent=state.speed.toFixed(2);writeHash();render();}});
  $('#preset').addEventListener('click',()=>{{state.slots=defaultSlots(mapData());state.level=1;state.speed=1;syncControls();writeHash();render();}});
  $('#clear').addEventListener('click',()=>{{state.slots={{}};writeHash();render();}});
  $('#traceBuiltin').addEventListener('click',()=>{{traceData=TRACES;$('#traceSource').textContent='内置';renderTrace();}});
  $('#miniRun').addEventListener('click',runMini);
  $('#miniReset').addEventListener('click',()=>{{mini=null;$('#miniStats').innerHTML='';$('#miniWaves').innerHTML='';$('#miniStatus').textContent='尚未运行';$('#miniDiag').textContent='点「运行 P4」开始。';}});
  $('#traceFile').addEventListener('change',async e=>{{
    const f=e.target.files?.[0]; if(!f) return;
    try {{ traceData=JSON.parse(await f.text()); $('#traceSource').textContent=f.name; renderTrace(); }}
    catch(err) {{ $('#traceStatus').textContent='trace JSON 解析失败：'+err; }}
  }});
  render();
}}
init();
</script>
<script>
(function(){{
  var KEY='lrds-theme', buttons=Array.prototype.slice.call(document.querySelectorAll('[data-theme-choice]'));
  var mql=window.matchMedia('(prefers-color-scheme: dark)');
  function apply(){{var c=document.documentElement.dataset.themeChoice||'system',mode=c==='system'?(mql.matches?'dark':'light'):c;document.documentElement.dataset.theme=mode;buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===c)));}}
  buttons.forEach(b=>b.addEventListener('click',()=>{{document.documentElement.dataset.themeChoice=b.dataset.themeChoice;try{{localStorage.setItem(KEY,b.dataset.themeChoice);}}catch(e){{}}apply();}}));
  try{{mql.addEventListener('change',apply);}}catch(e){{}}
  apply();
}})();
</script>
</body>
</html>'''
    page = page.replace('{{', '{').replace('}}', '}')
    page = page.replace('__DATA__', js_data)
    return page.replace('__TRACES__', js_traces)


def main() -> int:
    data = build_data()
    traces = json.loads(TRACE.read_text(encoding="utf-8")) if TRACE.exists() else {"scenarios": []}
    page = html_page(data, traces)
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != page:
            print("build_simulator: index.html 过期，请运行 ./run.sh simulator", file=sys.stderr)
            return 1
        print("build_simulator: 数值沙盘与数据一致")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(page, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(page)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
