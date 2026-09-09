#!/usr/bin/env node
// req_trace —— S4 · 需求 ←→ 文档 追踪矩阵。
//
// 把需求/验收与文档建一个追踪矩阵：行=需求，列=文档，单元格=该文档是否引用/呼应该需求（按关键词命中）。
// 等价于 ../tools/req_trace.py，可被 node / deno / bun 直接运行。
//
// 产出：lab/formal-system/concerns/visual-fallback/viz/req-trace.html / .json

import * as fs from "node:fs";
import * as path from "node:path";

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
const PROJ = path.join(ROOT, "projects", "tomorrows-channel");
const OUT = path.join(ROOT, "lab", "formal-system", "concerns", "visual-fallback", "viz", "req-trace");

const REQS = [
  ["R1", "专注 25min 不打断", ["25", "专注", "番茄", "不打断"]],
  ["R2", "混音台 ≥2 轨可用", ["混音", "轨道", "音量", "mixer", "track"]],
  ["R3", "收藏 1 卡", ["收藏", "图鉴", "collect"]],
  ["R4", "静默可用（无动态）", ["静默", "无动态", "静态", "关闭"]],
  ["R5", "频道=可插拔 bundle", ["bundle", "插拔", "频道装载", "load"]],
  ["R6", "配置表 schema + CI", ["schema", "契约", "校验", "check_data", "CI"]],
  ["R7", "番茄 25+5", ["25", "5", "休息", "break", "pomodoro"]],
  ["R8", "三态 UI 骨架", ["三态", "漫游", "设置", "图鉴", "UI"]],
];
const SKIP_DIRS = new Set(["meetings", "__pycache__", "target"]);
const SCAN_UNDER = ["docs", "plans", "game"];

function walk(base, out) {
  let entries;
  try {
    entries = fs.readdirSync(base, { withFileTypes: true });
  } catch (_e) {
    return;
  }
  for (const e of entries) {
    const p = path.join(base, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(p, out);
    } else if (e.isFile() && e.name.endsWith(".md")) {
      out.push(p);
    }
  }
}

function walk_md() {
  const files = [];
  for (const sub of SCAN_UNDER) {
    const base = path.join(PROJ, sub);
    if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) continue;
    walk(base, files);
  }
  return files.sort();
}

function read(p) {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch (_e) {
    return "";
  }
}

function short_doc(p) {
  return p.split(path.sep).pop().slice(0, -3);
}

function render(matrix, doc_cols) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const header = doc_cols.map((d) => `<th title="${esc(d)}">${esc(d)}</th>`).join("");
  const rows = [];
  for (const r of matrix) {
    const cells = [];
    for (const d of doc_cols) {
      const c = (r.hit[d] || 0);
      const cls = c ? "c-hit" : "c-no";
      cells.push(`<td class="${cls}">${c ? "✓" : ""}</td>`);
    }
    const flag = r.n <= 1 ? '<span class="warn">⚠ 少文档</span>' : "";
    rows.push(`<tr><th class="row-name">${esc(r.id)} · ${esc(r.title)}<div class="row-sub">${r.n} 篇</div></th>` +
      cells.join("") + `<td class="row-stat">${flag}</td></tr>`);
  }
  return `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>S4 需求←→文档追踪矩阵 · formal-system 可视验证面</title>
<style>
:root{--fg:#1d2b3a;--dim:#6b7280;--bg:#f7f8fa;--card:#fff;--line:#e5e7eb;}
*{box-sizing:border-box} body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--fg);background:var(--bg);}
.wrap{max-width:1200px;margin:0 auto;padding:24px 20px 60px} h1{font-size:22px;margin:0 0 4px}
.sub{color:var(--dim);font-size:13px;margin-bottom:18px}
.legend{display:flex;gap:14px;margin-bottom:14px;font-size:12px;color:var(--dim)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:18px;overflow-x:auto}
table{border-collapse:collapse;font-size:12px;width:max-content}
th,td{border:1px solid var(--line);padding:5px 8px;text-align:center;white-space:nowrap}
th{color:var(--dim);font-weight:600;background:#fbfcfe}
.row-name{text-align:left;position:sticky;left:0;background:#fff;min-width:220px}
.row-sub{font-size:10px;color:var(--dim);font-weight:400}
.c-hit{background:#d8f3dc;color:#1b7a3d} .c-no{background:#f3f4f6;color:#c8cdd4}
.warn{color:#b45309;font-size:11px} .notes{color:var(--dim);font-size:13px}
</style></head><body><div class="wrap">
<h1>S4 · 需求 ←→ 文档 追踪矩阵</h1>
<div class="sub">formal-system 可视验证面 S4 · 生成 ${hourNow()} · 关键词命中(启发式) · 需求来源: milestone M1 验收/任务</div>
<div class="legend"><span><i style="background:#d8f3dc;display:inline-block;width:12px;height:12px;border-radius:3px"></i> 该文档引用该需求</span><span><i style="background:#f3f4f6;display:inline-block;width:12px;height:12px;border-radius:3px"></i> 未引用</span></div>
<div class="card"><table><thead><tr><th class="row-name">需求</th>${header}<th>覆盖</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
<div class="notes"><b>怎么读</b>：一行是一个需求/验收，一列是一份文档。<b>找"横向稀疏/整行空白"</b>——那是<span style="color:#b45309">覆盖缺口</span>（需求没落到具体文档），需人工补文档或确认由谁承接。</div>
</div></body></html>`;
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
function isoNow() {
  const d = new Date();
  const off = -d.getTimezoneOffset();
  const sgn = off >= 0 ? "+" : "-";
  const oh = pad2(Math.floor(Math.abs(off) / 60));
  const om = pad2(Math.abs(off) % 60);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` +
    `.${pad2(d.getMilliseconds())}${sgn}${oh}:${om}`;
}

function main() {
  const docs = walk_md();
  const texts = new Map(docs.map((p) => [p, read(p)]));
  const matrix = [];
  for (const [rid, title, kws] of REQS) {
    const hits = {};
    for (const p of docs) {
      const t = texts.get(p).toLowerCase();
      hits[short_doc(p)] = kws.reduce((n, k) => (t.includes(k.toLowerCase()) ? n + 1 : n), 0);
    }
    const covered = Object.entries(hits).filter(([, c]) => c > 0).map(([d]) => d);
    matrix.push({ id: rid, title, kw: kws, covered, hit: hits, n: covered.length });
  }

  const doc_cols = docs.map(short_doc);
  const file_name = "req-trace";
  const html = render(matrix, doc_cols, file_name);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT + ".html", html, "utf-8");
  fs.writeFileSync(OUT + ".json", JSON.stringify({
    generated: isoNow(),
    documents: doc_cols,
    requirements: matrix.map((r) => ({ id: r.id, title: r.title, covered_docs: r.covered, n: r.n })),
    coverage: {
      requirements: matrix.length,
      covered: matrix.filter((r) => r.n > 0).length,
      gaps: matrix.filter((r) => r.n <= 1).map((r) => r.id),
    },
  }, null, 2) + "\n", "utf-8");

  console.log(`S4 需求←→文档追踪 · 需求 ${matrix.length} · 文档 ${doc_cols.length}`);
  for (const r of matrix) {
    const flag = r.n <= 1 ? "⚠" : "ok";
    console.log(`  ${flag} ${r.id} ${r.title}: ${r.n} 篇文档`);
  }
  console.log(`  缺口(≤1 篇): ${JSON.stringify(matrix.filter((r) => r.n <= 1).map((r) => r.id))}`);
  console.log(`  产出: ${OUT}.html / .json`);
  return 0;
}

process.exit(main());
