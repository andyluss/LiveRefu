#!/usr/bin/env node
// consistency_heatmap —— 跨文档一致性热力图（可视验证面 S3）。
//
// 把同一个契约字段/取值在各文档里的具体取值抽出来，与权威源对拍，渲染成一张热力矩阵：
// 每行一个契约项、每列一份文档、单元格=该文档给出的取值，颜色表达一致性。
// 等价于 ../tools/consistency_heatmap.py，可被 node / deno / bun 直接运行。
//
// 产出：
//   lab/formal-system/concerns/visual-fallback/viz/consistency-heatmap.html
//   lab/formal-system/concerns/visual-fallback/viz/consistency-heatmap.json

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
const DEFAULT_OUT = path.join(
  ROOT, "lab", "formal-system", "concerns", "visual-fallback", "viz",
  "consistency-heatmap.html",
);

const SCAN_DIRS = ["doc", "projects", "studio001", "tech", "lab", "tools"];
const SKIP_DIRS = new Set([".git", "target", "node_modules"]);

// 契约项: [显示名, 字段锚, 取值正则, 权威值]
const SEP = "\\s*[=:：|｜]?\\s*";
const ENTITIES = [
  ["pomodoro_work(专注)", "pomodoro_work", "pomodoro_work" + SEP + "(\\d+)", 25],
  ["pomodoro_break(休息)", "pomodoro_break", "pomodoro_break" + SEP + "(\\d+)", 5],
  ["focus_min(下限)", "focus_min", "focus_min" + SEP + "(\\d+)", 5],
  ["focus_max(上限)", "focus_max", "focus_max" + SEP + "(\\d+)", 120],
  ["fragment_base_per_tomato", "fragment_base_per_tomato", "fragment_base_per_tomato" + SEP + "(\\d+)", 8],
  ["collect_frag=common", "common", "common" + SEP + "(\\d+)", 3],
  ["collect_frag=rare", "rare", "rare" + SEP + "(\\d+)", 5],
  ["collect_frag=cult", "cult", "cult" + SEP + "(\\d+)", 8],
];

function read_text(p) {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch (_e) {
    return "";
  }
}

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

function find_md() {
  const files = [];
  const root_readme = path.join(ROOT, "README.md");
  if (fs.existsSync(root_readme)) files.push(root_readme);
  for (const sub of SCAN_DIRS) {
    const base = path.join(ROOT, sub);
    if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) continue;
    walk(base, files);
  }
  return files.sort();
}

function norm_val(s) {
  const f = Number(s);
  if (Number.isNaN(f)) return s;
  return f; // Number.isInteger 会自动把 25.0 视为 25
}

function rel_of(abs_path) {
  return path.relative(ROOT, path.resolve(abs_path)).split(path.sep).join("/");
}

function findall(pat, text) {
  const re = new RegExp(pat, "g");
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1] !== undefined) out.push(m[1]);
    else out.push(m[0]);
  }
  return out;
}

function build_matrix(rel_of) {
  const matrix = Array.from({ length: ENTITIES.length }, () => ({}));
  for (const p of find_md()) {
    const text = read_text(p);
    const rel = rel_of(p);
    for (let i = 0; i < ENTITIES.length; i++) {
      const pattern = ENTITIES[i][2];
      const vals = findall(pattern, text);
      if (vals.length) matrix[i][rel] = new Set(vals.map(norm_val));
    }
  }
  return matrix;
}

function cell_kind(values, auth) {
  if (!values || values.size === 0) return ["na", "—", ""];
  const vlist = [...values].sort((a, b) => {
    const sa = String(a), sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
  if (values.has(auth)) {
    if (values.size === 1) return ["match", String(auth), "与权威一致"];
    const others = vlist.filter((v) => v !== auth);
    return ["conflict", vlist.map(String).join(","),
      `同文档出现多个值(权威${auth} + ${pyList(others)})`];
  }
  if (values.size > 1) {
    return ["conflict", vlist.map(String).join(","), `同文档多个值且均≠权威${auth}`];
  }
  return ["mismatch", String(vlist[0]), `≠ 权威 ${auth}`];
}

function pyList(arr) {
  return "[" + arr.map((v) => String(v)).join(", ") + "]";
}

// Python 列表 repr：元素用 ", " 连接，字符串用单引号。
function pyRepr(arr) {
  return "[" + arr.map((v) => (typeof v === "string" ? `'${v}'` : String(v))).join(", ") + "]";
}

function summarize(matrix) {
  const per_entity = [];
  for (let i = 0; i < ENTITIES.length; i++) {
    const cells = matrix[i];
    const auth = ENTITIES[i][3];
    let match = 0, mismatch = 0, conflict = 0;
    for (const v of Object.values(cells)) {
      if (v.has(auth) && v.size === 1) match++;
      else if (v.size > 0 && !v.has(auth) && v.size === 1) mismatch++;
      if (v.size > 1) conflict++;
    }
    per_entity.push({
      entity: ENTITIES[i][0], auth, docs: Object.keys(cells).length,
      match, mismatch, conflict,
    });
  }
  return per_entity;
}

function short_doc(rel) {
  const b = rel.split("/").pop().slice(0, -3);
  return b.slice(0, 16) + (b.length > 16 ? "…" : "");
}

function escape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// —— 时间戳工具 ——
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

function render_html(matrix, out_path) {
  const doc_cols = new Set();
  for (const m of matrix) for (const rel of Object.keys(m)) doc_cols.add(rel);
  const cols = [...doc_cols].sort();
  const stat = summarize(matrix);

  const header = cols.map((d) => `<th title="${escape(d)}">${escape(short_doc(d))}</th>`).join("");
  const rows = [];
  for (let i = 0; i < ENTITIES.length; i++) {
    const cells = [];
    for (const d of cols) {
      const [kind, disp, tip] = cell_kind(matrix[i][d] || new Set(), ENTITIES[i][3]);
      cells.push(`<td class="c-${kind}" title="${escape(tip)}">${escape(String(disp))}</td>`);
    }
    const s = stat[i];
    const flag = (s.mismatch || s.conflict) ? '<span class="warn">⚠ 不一致</span>' : "";
    rows.push(
      `<tr><th class="row-name">${escape(ENTITIES[i][0])}` +
      `<div class="row-sub">权威 ${s.auth} · ${s.docs} 篇</div></th>` +
      cells.join("") + `<td class="row-stat">${flag}</td></tr>`,
    );
  }

  const html = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>跨文档一致性热力图 · formal-system 可视验证面 S3</title>
<style>
:root { --fg:#1d2b3a; --dim:#6b7280; --bg:#f7f8fa; --card:#fff; --line:#e5e7eb; }
* { box-sizing:border-box; }
body { margin:0; font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
  color:var(--fg); background:var(--bg); }
.wrap { max-width:1200px; margin:0 auto; padding:24px 20px 60px; }
h1 { font-size:22px; margin:0 0 4px; }
.sub { color:var(--dim); font-size:13px; margin-bottom:18px; }
.legend { display:flex; gap:14px; margin-bottom:16px; font-size:12px; color:var(--dim); }
.legend span { display:inline-flex; align-items:center; gap:5px; }
.lg { width:13px; height:13px; border-radius:3px; display:inline-block; }
.card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:18px; overflow-x:auto; }
table { border-collapse:collapse; font-size:12px; width:max-content; }
th,td { border:1px solid var(--line); padding:6px 9px; text-align:center; white-space:nowrap; }
th { color:var(--dim); font-weight:600; background:#fbfcfe; }
.row-name { text-align:left; position:sticky; left:0; background:#fff; z-index:1; }
.row-sub { font-size:10px; color:var(--dim); font-weight:400; }
th.row-name, td.row-stat { min-width:150px; }
.row-stat { background:#fbfcfe; }
.c-match { background:#d8f3dc; color:#1b7a3d; }
.c-mismatch { background:#f8d7da; color:#9b1c1c; }
.c-conflict { background:#fdebd0; color:#b45309; }
.c-na { background:#f3f4f6; color:#9ca3af; }
.warn { color:#b45309; font-size:11px; }
.notes { color:var(--dim); font-size:13px; }
</style></head>
<body><div class="wrap">
<h1>跨文档一致性热力图</h1>
<div class="sub">formal-system 可视验证面 S3 · 生成 ${hourNow()} ·
仅锚定<code>字段名=数值</code>可验证事实；权威值取自 <code>data/tables/*.json</code></div>

<div class="legend">
  <span><i class="lg" style="background:#d8f3dc"></i>与权威一致</span>
  <span><i class="lg" style="background:#f8d7da"></i>不一致(≠权威)</span>
  <span><i class="lg" style="background:#fdebd0"></i>同文档冲突(多值)</span>
  <span><i class="lg" style="background:#f3f4f6"></i>未提及</span>
</div>

<div class="card">
<table>
  <thead><tr><th class="row-name">契约项</th>${header}<th>逐行</th></tr></thead>
  <tbody>${rows.join("")}</tbody>
</table>
</div>

<div class="notes">
<b>怎么读</b>：一行是一个契约项（参数或取值映射），一列是一份文档；<b>找红色/琥珀色格子</b>——
红=该文档取值≠权威，琥珀=该文档内部就出现了多个值（自身矛盾），都提示"口径不一致"，需人工确认。
</div>
</div></body></html>`;

  fs.writeFileSync(out_path, html, "utf-8");
  return [cols, stat];
}

function write_json(out_html, matrix, doc_cols, stat) {
  const cells = {};
  for (let i = 0; i < ENTITIES.length; i++) {
    for (const d of doc_cols) {
      const [kind, disp, tip] = cell_kind(matrix[i][d] || new Set(), ENTITIES[i][3]);
      cells[`${ENTITIES[i][1]}::${d}`] = { value: disp, kind, note: tip };
    }
  }
  const data = {
    generated: isoNow(),
    entities: stat.map((s, i) => ({
      entity: s.entity, field: ENTITIES[i][1], authoritative: ENTITIES[i][3],
      docs: s.docs, match: s.match, mismatch: s.mismatch, conflict: s.conflict,
    })),
    docs: doc_cols,
    summary: stat,
    cells,
  };
  const json_path = out_html.slice(0, -path.extname(out_html).length) + ".json";
  fs.writeFileSync(json_path, JSON.stringify(data, null, 2) + "\n", "utf-8");
  return json_path;
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

function self_test() {
  const cases = [
    [new Set([3]), 3, "match"],
    [new Set([4]), 3, "mismatch"],
    [new Set([3, 5]), 3, "conflict"],
    [new Set([5, 4]), 3, "conflict"],
    [new Set(), 3, "na"],
  ];
  let ok = true;
  for (const [values, auth, exp] of cases) {
    const [kind] = cell_kind(values, auth);
    const passed = kind === exp;
    ok = ok && passed;
    console.log(`  ${passed ? "PASS" : "FAIL"}  cell_kind(${pyRepr([...values].sort((a, b) => a - b))}, auth=${auth}) = ${kind} (期望 ${exp})`);
  }

  const probe = "约定 focus_max=120；但某处写成 focus_max=240。";
  const bad = findall("focus_max\\s*[=:：]?\\s*(\\d+)", probe);
  const [kind] = cell_kind(new Set(bad.map(norm_val)), 120);
  const badSet = new Set(bad);
  const passed = kind === "conflict" && badSet.size === 2 && badSet.has("120") && badSet.has("240");
  ok = ok && passed;
  console.log(`  ${passed ? "PASS" : "FAIL"}  端到端: 'focus_max=120…focus_max=240' -> ${kind} (${pyRepr(bad.slice().sort())})`);

  console.log("self-test:", ok ? "PASS" : "FAIL");
  return ok ? 0 : 1;
}

function main() {
  if (process.argv.includes("--self-test")) return self_test();

  let out = DEFAULT_OUT;
  const idx = process.argv.indexOf("--out");
  if (idx !== -1 && idx + 1 < process.argv.length) out = process.argv[idx + 1];

  const matrix = build_matrix(rel_of);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const [doc_cols, stat] = render_html(matrix, out);
  const json_path = write_json(out, matrix, doc_cols, stat);

  console.log(`契约项 ${ENTITIES.length} 个, 涉及文档 ${doc_cols.length} 份`);
  for (const s of stat) {
    const flag = (s.mismatch || s.conflict) ? "⚠" : "ok";
    console.log(`  ${flag} ${s.entity}: 权威${s.auth} · ${s.docs}篇 (一致${s.match} / 不一致${s.mismatch} / 冲突${s.conflict})`);
  }
  console.log(`热力图已生成: ${out}`);
  console.log(`数据已生成:   ${json_path}`);
  return 0;
}

process.exit(main());
