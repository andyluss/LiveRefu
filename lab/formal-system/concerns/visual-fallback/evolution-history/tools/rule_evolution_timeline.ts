#!/usr/bin/env node
// rule_evolution_timeline —— P1 · 元规则状态阶梯（rule evolution state staircase）。
//
// 读 lab/formal-system/concerns/meta-rules/M*-*.md 的「演进历史」表（版本/日期/状态/变更），
// 把每条约规则的**状态机轨迹**画成阶梯图：x=版本(v1..vN)，y=状态层级(draft..retired)，每规则一条折线。
// 一眼看出"谁一路升到已定、谁在回退/震荡、谁卡在 proposed"——这是 M3 状态机(多状态/子状态/迁移)的可视面。
//
// 用法：node --experimental-strip-types <本文件>     （或 deno run --allow-read / bun 直接跑）
// 产出：同目录 rule-evolution-timeline.html / .json
import * as fs from "node:fs";
import * as path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname); // evolution-history/tools
const META_DIR = path.join(HERE, "..", "..", "..", "meta-rules"); // tools -> evolution-history -> visual-fallback -> concerns -> meta-rules
const OUT = path.join(HERE, "..", "viz", "rule-evolution-timeline"); // tools -> evolution-history -> viz

const ORDER = ["draft", "proposed", "experimental", "accepted", "in-review", "superseded", "deprecated", "retired"];
const ZH = { draft: "草案", proposed: "建议", experimental: "试用", accepted: "已定", "in-review": "复核中", superseded: "被取代", deprecated: "废弃", retired: "退役" };
const ROW = /^\|\s*v(\d+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*`([^`]+)`\s*\|\s*(.*)$/;

function readText(p) { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }
function rules() {
  const out = [];
  for (const fn of fs.readdirSync(META_DIR)) {
    if (!/^M\d+.*\.md$/.test(fn)) continue;
    const rows = [];
    for (const line of readText(path.join(META_DIR, fn)).split("\n")) {
      const m = line.match(ROW);
      if (m) rows.push({ v: +m[1], date: m[2], state: m[3], change: m[4].trim().replace(/\|.*$/, "").trim() });
    }
    if (rows.length) out.push({ id: fn.replace(/\.md$/, ""), rows });
  }
  return out;
}

function colorFor(id) {
  const pal = ["#2a9d8f", "#e76f51", "#457b9d", "#8e44ad", "#f4a261", "#6a994e", "#c1121f", "#1d3557"];
  let h = 0; for (const c of id) h += c.charCodeAt(0);
  return pal[h % pal.length];
}

const rules_ = rules();
if (!rules_.length) { console.error("未找到元规则演进历史"); process.exit(1); }
const maxV = Math.max(...rules_.flatMap((r) => r.rows.map((x) => x.v)));

// 布局
const W = 940, padL = 120, padR = 30, padT = 30, padB = 30;
const bandH = 30, plotH = ORDER.length * bandH; const plotY0 = padT;
const stepX = (W - padL - padR) / maxV;
const xOf = (v) => padL + (v - 1) * stepX + stepX / 2;
const yOf = (state) => plotY0 + (ORDER.length - 1 - ORDER.indexOf(state.split(".")[0])) * bandH + bandH / 2;

// 状态横带
let bands = "";
for (let i = 0; i < ORDER.length; i++) {
  const y = plotY0 + (ORDER.length - 1 - i) * bandH;
  bands += `<text class="st" x="${padL - 10}" y="${y + bandH / 2 + 4}" text-anchor="end">${ZH[ORDER[i]]}</text>`;
  bands += i < ORDER.length - 1 ? `<line class="grid" x1="${padL}" y1="${y + bandH}" x2="${W - padR}" y2="${y + bandH}"/>` : "";
}
let vticks = "";
for (let v = 1; v <= maxV; v++) {
  vticks += `<text class="vx" x="${xOf(v)}" y="${padT + ORDER.length * bandH + 18}" text-anchor="middle">v${v}</text>`;
}

// 每规则折线
let lines = "", marks = "", legend = "";
for (const r of rules_) {
  const color = colorFor(r.id);
  let poly = "";
  const pts = r.rows.slice().sort((a, b) => a.v - b.v);
  for (let i = 0; i < pts.length; i++) {
    const x = xOf(pts[i].v), y = yOf(pts[i].state);
    marks += `<circle class="dot" data-tip="${r.id} v${pts[i].v} · ${pts[i].state} · ${pts[i].date}<br>${pts[i].change}" cx="${x}" cy="${y}" r="5" fill="${color}"/>`;
    if (i > 0) {
      const px = xOf(pts[i - 1].v), py = yOf(pts[i - 1].state);
      poly += `<line x1="${px}" y1="${py}" x2="${x}" y2="${py}" stroke="${color}" stroke-width="2.5"/>`;
      poly += `<line x1="${x}" y1="${py}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="2.5"/>`;
    }
  }
  lines += `<g>${poly}</g>`;
  legend += `<span class="lg"><i style="background:${color}"></i>${r.id}</span>`;
}

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

const H = padT + ORDER.length * bandH + padB;
const html = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>元规则状态阶梯 · formal-system 可视验证面 P1</title>
<style>:root{--fg:#1d2b3a;--dim:#6b7280;--bg:#f7f8fa;--card:#fff;--line:#e5e7eb;}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--fg);background:var(--bg);}
.wrap{max-width:1000px;margin:0 auto;padding:24px 20px 60px}h1{font-size:22px;margin:0 0 4px}
.sub{color:var(--dim);font-size:13px;margin-bottom:16px}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
svg text.st{fill:var(--dim);font-size:12px}svg text.vx{fill:var(--dim);font-size:11px}svg line.grid{stroke:var(--line);stroke-width:1}
svg line{stroke-linejoin:round}svg .dot{cursor:pointer}
.legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;font-size:12px;color:var(--dim)}
.lg{display:inline-flex;align-items:center;gap:4px}.lg i{width:11px;height:11px;border-radius:50%;display:inline-block}
#tip{position:fixed;pointer-events:none;background:#1d2b3a;color:#fff;padding:8px 10px;border-radius:6px;font-size:12px;max-width:420px;opacity:0;transition:opacity .12s;z-index:9}
.notes{color:var(--dim);font-size:13px;margin-top:12px}</style></head>
<body><div class="wrap"><h1>P1 · 元规则状态阶梯</h1>
<div class="sub">formal-system 可视验证面 P1 · 生成 ${new Date().toISOString().slice(0, 19)} · 数据源 meta-rules/M*-*.md 演进历史 · 每规则 = 状态机轨迹（x=版本, y=状态层级）</div>
<div class="card"><svg viewBox="0 0 ${W} ${H}" width="100%">${bands}${vticks}${lines}${marks}</svg><div class="legend">${legend}</div></div>
<div class="notes">怎么读：每条约规则一条折线，纵坐标=状态（低→高：草案/建议/试用/已定/复核中/被取代/废弃/退役）。
<b>找"锯齿/回退"</b>（如 已定→复核中→已定 = 被反复挑战）、<b>卡在 proposed</b>（长期未定稿）、<b>一次升到 accepted</b>（拍板）。点击圆点看 版本/状态/日期/变更。</div>
<div id="tip"></div>
</div></body></html>`;

fs.writeFileSync(OUT + ".html", html, "utf8");
const json = rules_.map((r) => ({ rule: r.id, states: r.rows.map((x) => ({ v: x.v, date: x.date, state: x.state, change: x.change })) }));
fs.writeFileSync(OUT + ".json", JSON.stringify({ generated: new Date().toISOString(), rules: json }, null, 2), "utf8");
console.log(`P1 元规则状态阶梯 · ${rules_.length} 条元规则`);
for (const r of rules_) console.log(`  ${r.id}: ${r.rows.map((x) => `${x.state}(v${x.v})`).join(" → ")}`);
console.log(`产出: ${OUT}.html / .json`);
