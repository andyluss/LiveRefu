#!/usr/bin/env node
// hub —— 可视验证面统一入口/导航页。
//
// 把 S1+S2(文档健康) / S3(一致性) / S4(需求追踪) / S5(数据不变量) / S6(设计复核) / P1(元规则状态阶梯) / ①③复核账本
// 汇成一个自包含 viz/index.html。`--run` 可先全量刷新所有面(全 TS)再生成。
// 可被 node / deno / bun 直接运行（脚本均为 TS，见 tech/rules/T02 全链路 TS）。

import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(path.resolve(process.argv[1]));

function find_workspace_root() {
  let d = HERE;
  for (;;) {
    if (fs.existsSync(path.join(d, ".git"))) return d;
    const parent = path.dirname(d);
    if (parent === d) return d;
    d = parent;
  }
}

const ROOT = find_workspace_root();
const VF = path.join(ROOT, "lab", "formal-system", "concerns", "visual-fallback");
const VIZ = path.join(VF, "viz");
const TOOLS = path.join(VF, "tools");
const INDEX = path.join(VIZ, "index.html");

function load(name) {
  const p = path.join(VIZ, name);
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (_e) {
    return null;
  }
}

function surfaces() {
  const s_doc_health = () => {
    const d = load("doc-health.json");
    if (!d) return ["（未生成）", false];
    const c = d.counts || {}, r = d.review || {};
    const warn = (c.stale || 0) > 0 || (r.unreviewed || 0) > 0;
    return [`${c.docs || 0} 文档 · ${c.links || 0} 互链 · 待定${c.open || 0}/已定${c.closed || 0} · 孤立${c.orphans || 0} · 复核未${r.unreviewed || 0}`, warn];
  };

  const s_consistency = () => {
    const d = load("consistency-heatmap.json");
    if (!d) return ["（未生成）", false];
    const bad = (d.summary || []).filter((e) => e.mismatch || e.conflict).length;
    return [`${(d.entities || []).length} 契约项 · 不一致/冲突 ${bad}`, bad > 0];
  };

  const s_req_trace = () => {
    const d = load("req-trace.json");
    if (!d) return ["（未生成）", false];
    const cv = d.coverage || {};
    const gaps = cv.gaps || [];
    return [`${cv.requirements || 0} 需求 · 文档 ${(d.documents || []).length} · 缺口 ${gaps.length}`, gaps.length > 0];
  };

  const s_data_invariants = () => {
    const d = load("data-invariants.json");
    if (!d) return ["（未生成）", false];
    const inv = d.invariants || [];
    const bad = inv.filter((i) => !i.ok).length;
    return [`${inv.length} 项不变量 · 偏离 ${bad}`, bad > 0];
  };

  const s_design_review = () => {
    const d = load("design-review.json");
    if (!d) return ["（未生成）", false];
    const ch = d.channels || [];
    return [`${ch.length} 频道复核卡 · 基调锚点待人工`, false];
  };

  const s_ledger = () => {
    const d = load("review-ledger.json");
    if (!d) return ["（未生成）", false];
    const recs = d.records || [];
    return [`${recs.length} 条复核记录`, false];
  };

  const s_p1 = () => {
    let d = null;
    try { d = JSON.parse(fs.readFileSync(path.join(VF, "evolution-history", "rule-evolution-timeline.json"), "utf8")); } catch (_e) {}
    if (!d) return ["（未生成）", false];
    const rules = d.rules || [];
    const drifted = rules.filter((r) => new Set(r.states.map((s) => String(s.state).split(".")[0])).size > 2).length;
    return [`${rules.length} 条元规则轨迹 · 多状态 ${drifted}`, drifted > 0];
  };

  return [
    ["当前状态 / 自检", [
      ["S1+S2", "文档健康仪表盘", "visual_health.ts", "doc-health.html", s_doc_health],
    ]],
    ["一致性 / 追踪", [
      ["S3", "跨文档一致性热力图", "consistency_heatmap.ts", "consistency-heatmap.html", s_consistency],
      ["S4", "需求←→文档追踪矩阵", "req_trace.ts", "req-trace.html", s_req_trace],
    ]],
    ["数据 / 设计", [
      ["S5", "数据不变量可视化", "data_invariants.ts", "data-invariants.html", s_data_invariants],
      ["S6", "设计/手感复核面", "design_review.ts", "design-review.html", s_design_review],
    ]],
    ["演进历史 / 元规则", [
      ["P1", "元规则状态阶梯", "evolution-history/rule_evolution_timeline.ts", "../evolution-history/rule-evolution-timeline.html", s_p1],
    ]],
    ["第③层", [
      ["①③", "人工复核账本", "review_ledger.ts", "review-ledger.json", s_ledger],
    ]],
  ];
}

function run_all() {
  // 按序刷新各面（均用 TS；内部一个运行其它 .ts）。visual_health 会顺带跑 meta_rules_check。
  const jobs = [
    ["visual_health", path.join(TOOLS, "visual_health.ts")],
    ["consistency_heatmap", path.join(TOOLS, "consistency_heatmap.ts")],
    ["req_trace", path.join(TOOLS, "req_trace.ts")],
    ["data_invariants", path.join(TOOLS, "data_invariants.ts")],
    ["design_review", path.join(TOOLS, "design_review.ts")],
    ["rule_evolution_timeline", path.join(VF, "evolution-history", "rule_evolution_timeline.ts")],
  ];
  for (const [name, tsPath] of jobs) {
    if (!fs.existsSync(tsPath)) continue;
    console.log(`  -> node --experimental-strip-types ${name}.ts`);
    spawnSync(process.execPath, ["--experimental-strip-types", tsPath], { cwd: ROOT, stdio: "inherit" });
  }
}

function render(categories) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const blocks = [];
  for (const [cat, items] of categories) {
    const cards = [];
    for (const [sid, name, script, html, summary_fn] of items) {
      const [line, warn] = summary_fn();
      const vt = warn ? "warn" : "ok";
      cards.push(`<a class="card ${vt}" href="${html}">
  <div class="cat">${esc(sid)}</div>
  <div class="name">${esc(name)}</div>
  <div class="line">${esc(line)}</div>
  <div class="dot">${warn ? "⚠ 复核" : "✓ 健康"}</div>
  <div class="gen">${esc(script)}</div>
</a>`);
    }
    blocks.push(`<h2>${esc(cat)}</h2><div class="grid">${cards.join("")}</div>`);
  }
  return blocks.join("");
}

function pad2(n) { return String(n).padStart(2, "0"); }
function tzAbbr() {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
      .formatToParts(new Date());
    const tz = parts.find((p) => p.type === "timeZoneName");
    return tz ? tz.value : "UTC";
  } catch (_e) {
    return "UTC";
  }
}
function hourNow() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())} ${tzAbbr()}`;
}

function main() {
  const run = process.argv.includes("--run");
  if (run) {
    console.log("刷新全部可视面……");
    run_all();
  }
  const cats = surfaces();
  const html = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>可视验证面总览 · formal-system</title>
<style>:root{--fg:#1d2b3a;--dim:#6b7280;--bg:#f7f8fa;--card:#fff;--line:#e5e7eb;}
*{box-sizing:border-box} body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--fg);background:var(--bg);}
.wrap{max-width:1080px;margin:0 auto;padding:24px 20px 60px} h1{font-size:24px;margin:0 0 4px}
.lead{color:var(--dim);font-size:13px;margin-bottom:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-bottom:10px}
h2{font-size:15px;margin:18px 0 10px}
a.card{display:block;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;text-decoration:none;color:inherit;transition:box-shadow .15s}
a.card:hover{box-shadow:0 4px 14px rgba(0,0,0,.08)}
.cat{font-size:11px;color:var(--dim);font-weight:700;letter-spacing:.06em}
.name{font-size:16px;font-weight:700;margin:2px 0} .line{font-size:12px;color:var(--dim);min-height:30px}
.dot{font-size:12px;margin:6px 0} .card.ok .dot{color:#1b7a3d} .card.warn .dot{color:#b45309;font-weight:700}
.gen{font-size:11px;color:#9ca3af;border-top:1px solid var(--line);padding-top:6px}
.run{display:inline-block;background:#1d2b3a;color:#fff;border-radius:8px;padding:8px 14px;text-decoration:none;font-size:13px;margin-bottom:16px}
.notes{color:var(--dim);font-size:13px}</style></head>
<body><div class="wrap"><h1>可视验证面 · 总览</h1>
<div class="lead">formal-system 可视验证面（机器判定 → 可视异常面 → 人工复核）。点卡片进入对应面；<b>⚠ 复核</b>=该面有偏离/待人工。</div>
<a class="run" href="#refresh">刷新全部面：node --experimental-strip-types lab/formal-system/concerns/visual-fallback/tools/hub.ts --run</a>
${render(cats)}
<div class="notes">生成 ${hourNow()} · 由 ${path.basename(process.argv[1])} 读取各面 JSON 生成；\`--run\` 先依次刷新 consistency_heatmap / req_trace / data_invariants / design_review（visual_health 无 .ts 版本，故跳过）。</div>
</div></body></html>`;

  fs.mkdirSync(VIZ, { recursive: true });
  fs.writeFileSync(INDEX, html, "utf-8");
  console.log(`统一入口导航页已生成: ${INDEX}`);
  return 0;
}

process.exit(main());
