/*
 * visual_health —— 文档健康仪表盘生成器（"可视验证面"，实验层 F 兜底）。
 *
 * 作用：形式化校验（编译/契约/测试）只能判定"可判定"的东西；对文档、创意、设计这类
 * **不可形式化**的产物，把它的"结构 / 覆盖 / 一致性 / 异常"渲染成一张图，让**人类用视觉
 * 直觉**兜底扫出"哪里不对"。本脚本生成一份**零依赖、可一键重跑、自包含**的 HTML 仪表盘。
 *
 * 产出：
 *   lab/formal-system/concerns/visual-fallback/viz/doc-health.html        # 自包含仪表盘（图谱 + 复核账本 + 异常面板 + 清单）
 *   lab/formal-system/concerns/visual-fallback/viz/doc-health.json        # 机器可读摘要（计数/主题/复核覆盖）
 *
 * 可视化内容（详见 README）：
 *   - 文档图谱：节点=md 文档，边=文档间相对链接，按主题着色；节点大小∝活跃度；
 *     绿环=已通过 / 橙环=已标记 / 虚线=未复核异常 / 红点=陈旧。
 *   - 开放问题密度 / 决策密度：每文档的【待定】/【已定】计数。
 *   - 人工复核账本：读取 viz/review-ledger.json（由 tools/review_ledger.py 登记），
 *     把异常标注为 未复核/已通过/已标记，并给出复核覆盖率。
 *
 * 可选：--ledger <path> 指向自定义账本。
 *
 * 原则（防"好看但没用"）：
 *   1. 只锚定**可验证事实**（链接、【待定】标记、git/mtime 可得的变更时间、主题），不做主观判断。
 *   2. **异常优先**：默认渲染"哪里偏离"，而非全量内容。
 *   3. 确定可复现：仅依赖 Node 内置模块（node:fs / node:path / node:child_process），
 *      零 npm 依赖，跨 node / deno / bun 直接运行；越界路径容错，一键重跑。
 *
 * 用法（运行本文件时自动查找工作区根，位置无关）：
 *   node --experimental-strip-types lab/formal-system/concerns/visual-fallback/tools/visual_health.ts            # 生成默认仪表盘
 *   node --experimental-strip-types lab/formal-system/concerns/visual-fallback/tools/visual_health.ts --out <path>  # 自定义输出
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as cp from "node:child_process";

// 交互脚本（不含花括号语法，避免与模板字符串冲突；作为普通字符串追加，保证安全）。
const SCRIPT_JS = `
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
`;

// ----------------------------------------------------------------------------
// 基础工具
// ----------------------------------------------------------------------------
// 相当于 Python 的：os.path.dirname(os.path.abspath(__file__))。
const HERE = import.meta.dirname;

function find_workspace_root(): string {
  // 向上找到工作区根（含 .git），使本工具位置无关。
  let d = HERE;
  while (true) {
    if (fs.existsSync(path.join(d, ".git"))) {
      return d;
    }
    const parent = path.dirname(d);
    if (parent === d) {
      return d;
    }
    d = parent;
  }
}

const ROOT = find_workspace_root();
const DEFAULT_OUT = path.join(ROOT, "lab", "formal-system", "concerns", "visual-fallback", "viz", "doc-health.html");
const DEFAULT_LEDGER = path.join(ROOT, "lab", "formal-system", "concerns", "visual-fallback", "viz", "review-ledger.json");
const META_COMPLIANCE = path.join(ROOT, "lab", "formal-system", "concerns", "visual-fallback", "viz", "meta-compliance.json");
const META_CHECK_SCRIPT = path.join(ROOT, "lab", "formal-system", "concerns", "meta-rules", "tools", "meta_rules_check.py");

// 扫描范围（相对工作区根），避免把 .git/target 等算进来。
const SCAN_DIRS = ["doc", "projects", "studio", "tech", "lab", "tools"];
const STALE_DAYS = 60;            // 超过即视为"陈旧"
const HIGH_OPEN_TOP = 10;         // 高【待定】取前 N
const ANOMALY_LIST_LEN = 10;
const MAX_EDGES_PER_NODE = 60;    // 图谱里单节点最多画的边，避免乱成线团

type ReviewStyle = { stroke: string; cls: string };

// 复核状态下节点的描边样式（绿=已通过, 橙=已标记, 虚线=未复核异常）
const REVIEW_STYLE: Record<string, ReviewStyle> = {
  approved: { stroke: 'stroke="#2a9d8f" stroke-width="2.5"', cls: "approved" },
  flagged: { stroke: 'stroke="#f4a261" stroke-width="2.5"', cls: "flagged" },
  unreviewed: { stroke: 'stroke="#333" stroke-width="1.5" stroke-dasharray="3 2"', cls: "anomaly" },
};

function read_text(p: string): string {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return "";
  }
}

function is_file(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function is_dir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function git_last_commit(rel_path: string): string | null {
  // 返回该 git 追踪文件的最后一次提交 ISO 时间；未追踪/失败则返回 null。
  try {
    const out = cp.execFileSync("git", ["log", "-1", "--format=%cI", "--", rel_path], {
      cwd: ROOT,
      encoding: "utf-8",
      timeout: 10000,
    });
    const line = String(out).trim();
    return line ? line : null;
  } catch {
    return null;
  }
}

function change_iso(rel_path: string, abs_path: string): string | null {
  const iso = git_last_commit(rel_path);
  if (iso) {
    return iso;
  }
  // 未追踪文件退回 mtime。
  try {
    return new Date(fs.statSync(abs_path).mtimeMs).toISOString();
  } catch {
    return null;
  }
}

function days_since(iso: string | null): number | null {
  if (!iso) {
    return null;
  }
  const t = new Date(iso);
  const ms = t.getTime();
  if (isNaN(ms)) {
    return null;
  }
  const now = Date.now();
  return Math.max(0, Math.floor((now - ms) / 86400000));
}

// ----------------------------------------------------------------------------
// 文档解析
// ----------------------------------------------------------------------------
const LINK_RE = /\[[^\]]*\]\(([^)\s]+)\)/g;

function resolve_md_target(link_target: string, from_abs: string): string | null {
  // 解析相对链接到目标 md 绝对路径；非本地 md 返回 null。
  const t = link_target.split("#")[0].trim();
  if (!t.endsWith(".md")) {
    return null;
  }
  if (t.startsWith("http:") || t.startsWith("https:")) {
    return null;
  }
  const cand = path.normalize(path.join(path.dirname(from_abs), t));
  if (is_file(cand)) {
    return path.resolve(cand);
  }
  return null;
}

function count_occurrences(text: string, sub: string): number {
  if (!sub) {
    return 0;
  }
  let c = 0;
  let i = 0;
  while (true) {
    i = text.indexOf(sub, i);
    if (i === -1) {
      break;
    }
    c++;
    i += sub.length;
  }
  return c;
}

type Doc = {
  abs: string;
  rel: string;
  title: string;
  open: number;
  closed: number;
  targets: Set<string>;
  iso: string | null;
};

function parse_doc(abs_path: string, rel_path: string): Doc {
  const text = read_text(abs_path);
  let title: string | null = null;
  for (const line of text.split("\n")) {
    const s = line.trim();
    if (s.startsWith("# ")) {
      title = s.slice(2).trim();
      break;
    }
  }
  if (!title) {
    title = path.basename(rel_path).slice(0, -3);
  }
  const open_q = count_occurrences(text, "【待定】");
  const closed_q = count_occurrences(text, "【已定】");
  // 收集一条去重的链接集合（按目标 abs 唯一）
  const targets: Set<string> = new Set();
  LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(text)) !== null) {
    const tgt = resolve_md_target(m[1], abs_path);
    if (tgt) {
      targets.add(tgt);
    }
  }
  return {
    abs: abs_path,
    rel: rel_path,
    title,
    open: open_q,
    closed: closed_q,
    targets,
    iso: change_iso(rel_path, abs_path),
  };
}

// ----------------------------------------------------------------------------
// 主题归类（用于着色/聚类）
// ----------------------------------------------------------------------------
function themes_for(rel: string): string {
  const parts = rel.split(path.sep);
  if (!parts.length) {
    return "其他";
  }
  const top = parts[0];
  if (top === "doc") {
    if (parts.length >= 2 && parts[1] === "retro-futurism") {
      const rest = rel.slice("doc/retro-futurism/".length);
      // 附录_<theme>卷/README.md -> 主题从目录名
      if (rest.startsWith("附录_")) {
        const seg = /^附录_([^/]+)卷/.exec(rest);
        return (seg ? seg[1] : "附录") + "卷";
      }
      // 正文 NN_<篇名>_...
      const m = /^\d\d_([^_]+篇)/.exec(path.basename(rel));
      if (m) {
        return m[1];
      }
      const base = path.basename(rel);
      if (base.includes("索引") || base.includes("统计")) {
        return "索引";
      }
      if (base.includes("合订本")) {
        return "合订";
      }
      return "总论";
    }
    if (parts.length >= 3 && parts[1] === "punks") {
      return parts[2]; // atompunk/biopunk/...
    }
    return "doc";
  }
  if (top === "studio") {
    return parts.length < 2 ? "工作室" : parts[1];
  }
  if (top === "projects" && parts.length >= 2) {
    const proj = parts[1];
    if (parts.length >= 4 && parts[2] === "docs") {
      return "项目:" + parts[3];
    }
    if (parts.length >= 3 && parts[2] === "plans") {
      return "项目:计划";
    }
    if (parts.length >= 3 && parts[2] === "data") {
      return "项目:数据";
    }
    if (parts.length >= 3 && parts[2] === "README.md") {
      return "项目:" + proj;
    }
    return "项目:" + proj;
  }
  if (top === "tech") {
    return "技术规范";
  }
  if (top === "lab") {
    return "实验区";
  }
  if (top === "tools") {
    return "工具";
  }
  return "其他";
}

// ----------------------------------------------------------------------------
// 收集 & 建图
// ----------------------------------------------------------------------------
type WalkEntry = [string, string[], string[]];

function os_walk(base: string): WalkEntry[] {
  // 顶层深度优先遍历，跳过 .git/target/node_modules（与 Python os.walk 过滤一致）。
  const result: WalkEntry[] = [];
  const stack = [base];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const dirnames: string[] = [];
    const filenames: string[] = [];
    for (const e of entries) {
      if (e.isDirectory()) {
        dirnames.push(e.name);
      } else if (e.isFile()) {
        filenames.push(e.name);
      }
    }
    const filtered = dirnames
      .filter((d) => d !== ".git" && d !== "target" && d !== "node_modules")
      .sort();
    filenames.sort();
    result.push([dir, filtered, filenames]);
    // 逆序入栈，保证弹出时按字典序深度优先。
    for (let i = filtered.length - 1; i >= 0; i--) {
      stack.push(path.join(dir, filtered[i]));
    }
  }
  return result;
}

function _add_doc(abs_path: string, docs: Doc[], seen: Set<string>): void {
  const a = path.resolve(abs_path);
  if (seen.has(a)) {
    return;
  }
  seen.add(a);
  const rel = path.relative(ROOT, a);
  docs.push(parse_doc(a, rel));
}

function collect_docs(): Doc[] {
  const docs: Doc[] = [];
  const seen: Set<string> = new Set();
  const root_readme = path.join(ROOT, "README.md");
  if (is_file(root_readme)) {
    _add_doc(root_readme, docs, seen);
  }
  for (const sub of SCAN_DIRS) {
    const base_abs = path.join(ROOT, sub);
    if (!is_dir(base_abs)) {
      continue;
    }
    for (const [dirpath, , filenames] of os_walk(base_abs)) {
      for (const fn of filenames) {
        if (fn.endsWith(".md")) {
          _add_doc(path.join(dirpath, fn), docs, seen);
        }
      }
    }
  }
  return docs;
}

type Node = Doc & {
  id: number;
  theme: string;
  degree: number;
  day: number | null;
  cats?: Set<string>;
  is_anomaly?: boolean;
  review?: LedgerRec;
  review_state?: string | null;
};

function build_graph(docs: Doc[]): [Node[], [number, number][]] {
  const idx = new Map<string, number>();
  docs.forEach((d, i) => idx.set(d.abs, i));
  const nodes: Node[] = [];
  for (const d of docs) {
    const theme = themes_for(d.rel);
    nodes.push({
      ...d,
      id: idx.get(d.abs)!,
      theme,
      degree: 0,
      day: days_since(d.iso),
    });
  }
  const edges = new Set<string>();
  const edgePairs: [number, number][] = [];
  for (const d of docs) {
    const src = idx.get(d.abs)!;
    for (const tgt of d.targets) {
      const dst = idx.get(tgt);
      if (dst === undefined) {
        continue;
      }
      if (src === dst) {
        continue;
      }
      // Python build_graph 保留"有向"边：(A→B) 与 (B→A) 是两条不同的边；
      // 度增量按每条有向边各 +1（无向含义仅体现在 svg 渲染阶段的去重）。
      const key = src + ":" + dst;
      if (edges.has(key)) {
        continue;
      }
      edges.add(key);
      edgePairs.push([src, dst]);
      // 度增量（无向）
      nodes[src].degree += 1;
      nodes[dst].degree += 1;
    }
  }
  edgePairs.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  return [nodes, edgePairs];
}

type LedgerRec = { rel?: string; verdict?: string; reason?: string; reviewer?: string; reviewed_at?: string };

function load_ledger(p: string): Record<string, LedgerRec> {
  // 读取人工复核账本，返回 rel -> 该文档最新一条记录 的映射（追加式，最后写入者=当前态）。
  if (!p || !fs.existsSync(p)) {
    return {};
  }
  let data: any;
  try {
    data = JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
  const latest: Record<string, LedgerRec> = {};
  for (const rec of data.records || []) {
    latest[String(rec.rel || "").replace(/\\/g, "/")] = rec;
  }
  return latest;
}

function is_anomaly(nodes: Node[]): void {
  // 计算每个节点的异常类别（孤立/开放问题/陈旧）与是否异常。
  for (const n of nodes) {
    const cats: Set<string> = new Set();
    if (n.degree === 0) {
      cats.add("孤立");
    }
    if (n.open > 0) {
      cats.add("待定");
    }
    if (n.day !== null && n.day > STALE_DAYS) {
      cats.add("陈旧");
    }
    n.cats = cats;
    n.is_anomaly = cats.size > 0;
  }
}

// 账本里的 verdict(approve/flag) -> 仪表盘/图谱用的状态(approved/flagged)
const VERDICT_TO_STATE: Record<string, string> = { approve: "approved", flag: "flagged" };

function annotate_review(nodes: Node[], ledger: Record<string, LedgerRec>): void {
  // 把人工复核账本合并到节点：review_state ∈ {approved, flagged, unreviewed, None}。
  for (const n of nodes) {
    const rec = ledger[n.rel];
    if (n.is_anomaly) {
      n.review = rec;
      n.review_state = rec ? (VERDICT_TO_STATE[rec.verdict!] ?? "unreviewed") : "unreviewed";
    } else {
      n.review = rec;
      n.review_state = rec ? (VERDICT_TO_STATE[rec.verdict!] ?? null) : null;
    }
  }
}

function refresh_compliance(): string | null {
  // 运行 meta_rules_check.py 生成元规则合规 JSON 供仪表盘读取（失败不阻断仪表盘）。
  const script = META_CHECK_SCRIPT;
  const py = process.env.PYTHON || "python3";
  try {
    cp.execFileSync(py, [script, "--json", META_COMPLIANCE], {
      cwd: ROOT,
      encoding: "utf-8",
      timeout: 60000,
    });
  } catch {
    // 忽略，不阻断仪表盘。
  }
  return fs.existsSync(META_COMPLIANCE) ? META_COMPLIANCE : null;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function compliance_snippet(): string {
  // 读取元规则合规 JSON，渲染成一个"元规则合规"面板（无数据返回空串）。
  if (!fs.existsSync(META_COMPLIANCE)) {
    return "";
  }
  let d: any;
  try {
    d = JSON.parse(fs.readFileSync(META_COMPLIANCE, "utf-8"));
  } catch {
    return "";
  }
  const items = d.items || [];
  const ok_items: string[] = items.filter((i: any) => i.status === "ok").map((i: any) => i.text);
  const bad_items: string[] = items.filter((i: any) => i.status === "violation").map((i: any) => i.text);
  const counts = d.counts || {};

  const lis = (seq: string[]): string => {
    return seq.slice(0, 14).map((x) => `<li>${escape(x)}</li>`).join("") || "<li class=dim>—</li>";
  };

  return `
<div class="card">
  <h2>元规则合规（M1 文件组织 + M2 命名 · ${escape(d.concern || "")}）
    <span class="badge">${d.compliant ? "✅ 已合规" : "⚠ 需修正"}</span>
  </h2>
  <div class="revtiles">
    <div class="tile"><b>${counts.ok || 0}</b><span>合规项</span></div>
    <div class="tile"><b>${counts.violations || 0}</b><span>违规</span></div>
    <div class="tile"><b>${items.length}</b><span>检查项</span></div>
  </div>
  <div class="cols">
    <div class="innercard"><h2>合规明细</h2><ul>${lis(ok_items)}</ul></div>
    <div class="innercard"><h2>违规（如有）</h2><ul>${lis(bad_items)}</ul></div>
  </div>
</div>
`;
}

// ----------------------------------------------------------------------------
// 颜色 / 布局
// ----------------------------------------------------------------------------
function color_for(theme: string): string {
  const palette = [
    "#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#8e44ad", "#e76f51",
    "#1d3557", "#6a994e", "#bc6c25", "#c1121f", "#5e548e", "#00a8a8",
    "#e07a5f", "#81b29a", "#3d405b", "#f2cc8f", "#9d4edd", "#0a9396",
  ];
  let h = 0;
  for (const ch of theme) {
    h += ch.codePointAt(0)!;
  }
  return palette[h % palette.length];
}

function radial_positions(nodes: Node[]): Map<number, [number, number, number]> {
  // 按主题聚类的放射状静态布局，确定性（排序）。返回 {id: (x, y, r)}。
  const groups = new Map<string, number[]>();
  for (const n of nodes) {
    if (!groups.has(n.theme)) {
      groups.set(n.theme, []);
    }
    groups.get(n.theme)!.push(n.id);
  }

  // 中心与半径（放射状，确定性）
  const cx = 0.0;
  const cy = 0.0;
  const R_base = 120.0;
  const theme_keys = [...groups.keys()].sort();
  const n_theme = Math.max(1, theme_keys.length);
  const pos = new Map<number, [number, number, number]>();

  // 先给每个主题一个扇区
  for (let i = 0; i < theme_keys.length; i++) {
    const theme = theme_keys[i];
    const ids = groups.get(theme)!;
    const start_angle = (2 * Math.PI) * (i / n_theme);
    const sector = (2 * Math.PI) / n_theme;
    const ids_sorted = [...ids].sort((a, b) => a - b);
    const m = ids_sorted.length;
    for (let j = 0; j < m; j++) {
      const nid = ids_sorted[j];
      // 扇区内沿弧线排布，半径随序号增加（避免重叠）
      const frac = (j + 1) / (m + 1);
      const ang = start_angle + sector * frac;
      const radius = (R_base + 60 * (m / 20.0)) + (25.0 * (j % 12));
      const x = cx + radius * Math.cos(ang);
      const y = cy + radius * Math.sin(ang);
      pos.set(nid, [x, y, radius]);
    }
  }
  return pos;
}

// ----------------------------------------------------------------------------
// HTML 渲染
// ----------------------------------------------------------------------------
function svg_graph(nodes: Node[], edges: [number, number][], pos: Map<number, [number, number, number]>): string {
  const n_id = new Map<number, Node>();
  for (const n of nodes) {
    n_id.set(n.id, n);
  }
  const edge_limit = MAX_EDGES_PER_NODE;
  const used_edges = new Set<string>();
  const edge_lines: string[] = [];
  for (const [a0, b0] of edges) {
    if (used_edges.size >= 4000) {
      break;
    }
    const a = a0 < b0 ? a0 : b0;
    const b = a0 < b0 ? b0 : a0;
    const key = a + ":" + b;
    if (used_edges.has(key)) {
      continue;
    }
    used_edges.add(key);
    const na = n_id.get(a)!;
    const nb = n_id.get(b)!;
    if (na.degree > edge_limit || nb.degree > edge_limit) {
      continue;
    }
    const [x1, y1] = pos.get(a)!;
    const [x2, y2] = pos.get(b)!;
    edge_lines.push(`<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}"/>`);
  }

  const node_circles: string[] = [];
  for (const n of nodes) {
    const [x, y] = pos.get(n.id)!;
    const r = 3 + Math.min(14.0, 4 * Math.sqrt(n.degree + 1));
    const fill = color_for(n.theme);
    let stroke = "";
    let cls = "";
    if (n.is_anomaly) {
      const st = REVIEW_STYLE[n.review_state ?? ""] || REVIEW_STYLE.unreviewed;
      stroke = st.stroke;
      cls = st.cls;
    }
    const label = escape(n.rel);
    const title = escape(n.title);
    const parts: string[] = [];
    parts.push(
      `<circle class="node ${cls}" data-rel="${label}" data-title="${title}" ` +
        `cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="${fill}" opacity="0.9" ${stroke}/>`
    );
    if (n.day !== null && n.day > STALE_DAYS) {
      parts.push(`<circle cx="${x.toFixed(0)}" cy="${(y - r).toFixed(0)}" r="2.2" fill="#c1121f"/>`);
    }
    node_circles.push(parts.join(""));
  }

  const vb_w = 1600;
  const vb_h = 1600;
  return (
    `<svg viewBox="${-800} ${-800} ${vb_w} ${vb_h}" width="100%" height="560">` +
    `<g class="edges">${edge_lines.join("")}</g>` +
    `<g class="nodes">${node_circles.join("")}</g></svg>`
  );
}

function html_summary(nodes: Node[], _edges: [number, number][]) {
  const total_open = nodes.reduce((a, n) => a + n.open, 0);
  const total_closed = nodes.reduce((a, n) => a + n.closed, 0);
  const orphans = nodes.filter((n) => n.degree === 0);
  const stale = nodes.filter((n) => n.day !== null && n.day! > STALE_DAYS);
  return { orphans, stale, total_open, total_closed };
}

function anomaly_panel(nodes: Node[], _edges: [number, number][]) {
  const orphans = nodes.filter((n) => n.degree === 0);
  const high_open = [...nodes]
    .filter((n) => n.open > 0)
    .sort((a, b) => b.open - a.open)
    .slice(0, HIGH_OPEN_TOP);
  const stale_top = [...nodes]
    .filter((n) => n.day !== null && n.day! > STALE_DAYS)
    .sort((a, b) => b.day! - a.day!)
    .slice(0, ANOMALY_LIST_LEN);

  const rows = (items: Node[]): string => {
    const parts: string[] = [];
    for (const n of items) {
      const stale_txt = n.day !== null && n.day > STALE_DAYS ? `陈旧${n.day}天` : "";
      parts.push(
        `<li><b>${escape(n.title)}</b> ` +
          `<span class=dim>${escape(n.rel)}</span> ` +
          `<span class=meta>链接${n.degree} · 待定${n.open} · 已定${n.closed} · ${stale_txt}</span></li>`
      );
    }
    return parts.join("") || "<li class=dim>无</li>";
  };

  return { orphans, high_open, stale_top, rows };
}

const REVIEW_STATE_LABEL: Record<string, string> = {
  approved: "已通过",
  flagged: "已标记",
  unreviewed: "未复核",
};

function review_summary(nodes: Node[]) {
  const anomalies = nodes.filter((n) => n.is_anomaly);
  const approved = anomalies.filter((n) => n.review_state === "approved");
  const flagged = anomalies.filter((n) => n.review_state === "flagged");
  const unreviewed = anomalies.filter((n) => n.review_state === "unreviewed");
  return { anomalies, approved, flagged, unreviewed };
}

function review_rows(items: Node[], with_reason = false): string {
  const parts: string[] = [];
  for (const n of items) {
    const cats = [...(n.cats ?? [])].sort().join("、");
    const state_label = REVIEW_STATE_LABEL[n.review_state ?? ""] ?? n.review_state ?? "";
    const rec = n.review;
    const reason = rec && with_reason ? escape(rec.reason || "") : "";
    const who = rec ? escape(rec.reviewer || "") : "";
    const when = rec ? (rec.reviewed_at || "") : "";
    const meta = `异常 = ${cats}` + (reason ? ` · 因:${reason}` : "");
    const who_when = rec && who ? ` · ${who}@${when}` : rec ? ` · ${when}` : "";
    parts.push(
      `<li><b>${escape(n.title)}</b> <span class=dim>${escape(n.rel)}</span> ` +
        `<span class=meta>${meta}${who_when}</span> ` +
        `<span class="rev ${escape(n.review_state ?? "")}">${state_label}</span></li>`
    );
  }
  return parts.join("") || "<li class=dim>无</li>";
}

// 本地时区的 ISO 字符串（带时区偏移），对应 Python datetime.astimezone().isoformat()。
function local_iso(): string {
  const d = new Date();
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abso = Math.abs(off);
  const pad = (num: number) => String(num).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abso / 60))}:${pad(abso % 60)}`
  );
}

// 生成时间字符串 "YYYY-MM-DD HH:MM TZ"，对应 Python 的 %Y-%m-%d %H:%M %Z。
function format_gen_time(): string {
  const d = new Date();
  const pad = (num: number) => String(num).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  let tz = "";
  try {
    const tzPart = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(d);
    const name = tzPart.find((p) => p.type === "timeZoneName");
    tz = name ? name.value : "";
  } catch {
    // 忽略，仅影响显示。
  }
  return `${date} ${time} ${tz}`.trim();
}

function render_html(nodes: Node[], edges: [number, number][], pos: Map<number, [number, number, number]>, out_path: string): void {
  const { orphans, stale, total_open, total_closed } = html_summary(nodes, edges);
  const { orphans: orphans_all, high_open, stale_top, rows } = anomaly_panel(nodes, edges);
  const { anomalies, approved, flagged, unreviewed } = review_summary(nodes);
  const svg = svg_graph(nodes, edges, pos);
  const compliance_html = compliance_snippet();

  const legend = [...new Set(nodes.map((n) => n.theme))].sort();
  const legend_html = legend
    .map((t) => {
      const count = nodes.filter((n) => n.theme === t).length;
      return (
        `<span class="legend-item"><span class="dot" style="background:${color_for(t)}"/>` +
        `${escape(t)} (${count})</span>`
      );
    })
    .join("");

  const table_rows: string[] = [];
  for (const n of [...nodes].sort((a, b) => (a.rel < b.rel ? -1 : 1))) {
    table_rows.push(
      `<tr><td>${escape(n.title)}</td><td class=dim>${escape(n.rel)}</td>` +
        `<td>${n.open}</td><td>${n.closed}</td><td>${n.degree}</td>` +
        `<td>${n.day !== null ? n.day : "—"}</td></tr>`
    );
  }

  const html = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>文档健康仪表盘 · formal-system 可视验证面</title>
<style>
:root { --fg:#1d2b3a; --dim:#6b7280; --bg:#f7f8fa; --card:#fff; --line:#e5e7eb; }
* { box-sizing:border-box; }
body { margin:0; font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
  color:var(--fg); background:var(--bg); }
.wrap { max-width:1200px; margin:0 auto; padding:24px 20px 60px; }
h1 { font-size:22px; margin:0 0 4px; }
.sub { color:var(--dim); font-size:13px; margin-bottom:18px; }
.tiles { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; margin-bottom:18px; }
.tile { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px 14px; }
.tile b { display:block; font-size:24px; }
.tile span { font-size:12px; color:var(--dim); }
.card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:18px; }
h2 { font-size:16px; margin:0 0 10px; }
svg { background:#fbfcfe; border-radius:8px; }
svg line { stroke:#c9d3de; stroke-width:1; }
svg circle.node { cursor:pointer; }
svg circle.node:hover { stroke:#1d2b3a; stroke-width:2; }
#tip { position:fixed; pointer-events:none; background:#1d2b3a; color:#fff; padding:8px 10px;
  border-radius:6px; font-size:12px; max-width:360px; opacity:0; transition:opacity .12s; z-index:9; }
.legend { display:flex; flex-wrap:wrap; gap:10px; margin-top:10px; font-size:12px; color:var(--dim); }
.legend-item { display:inline-flex; align-items:center; gap:4px; }
.dot { width:10px; height:10px; border-radius:50%; display:inline-block; }
.cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
li { margin:5px 0; font-size:13px; }
.revtiles { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:14px; }
.badge { float:right; font-size:12px; color:var(--dim); font-weight:400; }
.innercard { border:1px solid var(--line); border-radius:10px; padding:12px; background:#fbfcfe; }
.rev { display:inline-block; padding:1px 7px; border-radius:999px; font-size:11px; margin-left:6px; }
.rev.approved { background:#d8f3dc; color:#1b7a3d; }
.rev.flagged { background:#fdebd0; color:#b45309; }
.rev.unreviewed { background:#e5e7eb; color:#6b7280; }
.dim { color:var(--dim); } .meta { color:var(--dim); margin-left:6px; font-size:12px; }
table { width:100%; border-collapse:collapse; font-size:12px; }
th,td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); }
th { color:var(--dim); font-weight:600; }
.scroll { max-height:480px; overflow:auto; }
</style></head>
<body><div class="wrap">
<h1>文档健康仪表盘</h1>
<div class="sub">formal-system 可视验证面（实验层F）· 生成时间 ${format_gen_time()} ·
零依赖自包含 · 由 <code>lab/formal-system/concerns/visual-fallback/tools/visual_health.py</code> 一键重跑</div>

<div class="tiles">
  <div class="tile"><b>${nodes.length}</b><span>文档</span></div>
  <div class="tile"><b>${edges.length}</b><span>互链</span></div>
  <div class="tile"><b>${total_open}</b><span>【待定】</span></div>
  <div class="tile"><b>${total_closed}</b><span>【已定】</span></div>
  <div class="tile"><b>${orphans.length}</b><span>孤立文档</span></div>
  <div class="tile"><b>${stale.length}</b><span>陈旧(&gt;${STALE_DAYS}天)</span></div>
</div>

<div class="card">
  <h2>文档图谱（节点∝活跃度 · 主题着色 · 绿环=已通过 · 橙环=已标记 · 虚线=未复核异常 · 红点=陈旧）</h2>
  ${svg}
  <div class="legend">${legend_html}</div>
</div>

<div class="card">
  <h2>人工复核账本（第③层 · 机器标记→人复核→可追踪）
    <span class="badge">异常 ${anomalies.length} · 已通过 ${approved.length} · 已标记 ${flagged.length} · 未复核 ${unreviewed.length}</span>
  </h2>
  <div class="revtiles">
    <div class="tile"><b>${anomalies.length}</b><span>异常总数</span></div>
    <div class="tile"><b>${approved.length}</b><span>已通过</span></div>
    <div class="tile"><b>${flagged.length}</b><span>已标记</span></div>
    <div class="tile"><b>${unreviewed.length}</b><span>未复核</span></div>
  </div>
  <div class="cols">
    <div class="innercard"><h2>未复核异常（待人工）</h2><ul>${review_rows(unreviewed)}</ul></div>
    <div class="innercard"><h2>已标记（flag · 带理由）</h2><ul>${review_rows(flagged, true)}</ul></div>
  </div>
  <div class="innercard"><h2>已通过（approve）</h2><ul>${review_rows(approved)}</ul></div>
</div>

${compliance_html}

<div class="cols">
  <div class="card"><h2>孤立文档（无任何互链）</h2><ul>${rows(orphans_all)}</ul></div>
  <div class="card"><h2>高【待定】文档（打开问题最多）</h2><ul>${rows(high_open)}</ul></div>
  <div class="card"><h2>陈旧文档（最近变更 &gt;${STALE_DAYS} 天）</h2><ul>${rows(stale_top)}</ul></div>
  <div class="card"><h2>清单（排序）</h2>
    <div class="scroll"><table><thead><tr><th>标题</th><th>路径</th><th>待定</th><th>已定</th><th>链接</th><th>变更天数</th></tr></thead>
    <tbody>${table_rows.join("")}</tbody></table></div>
  </div>
</div>

<div id="tip"></div>
</div>
` + SCRIPT_JS + "</body></html>";

  fs.writeFileSync(out_path, html, "utf-8");
}

function write_json(out_html: string, nodes: Node[], edges: [number, number][]): string {
  // 输出机器可读的摘要 JSON，便于 CI/报告/对话内卡片复用。
  const themes: Record<string, { docs: number; open: number; closed: number; orphan: number }> = {};
  for (const n of nodes) {
    const t = n.theme;
    if (!themes[t]) {
      themes[t] = { docs: 0, open: 0, closed: 0, orphan: 0 };
    }
    themes[t].docs += 1;
    themes[t].open += n.open;
    themes[t].closed += n.closed;
    if (n.degree === 0) {
      themes[t].orphan += 1;
    }
  }
  const { orphans, stale, total_open, total_closed } = html_summary(nodes, edges);
  const anomalies = nodes.filter((n) => n.is_anomaly);
  const approved = anomalies.filter((n) => n.review_state === "approved").length;
  const flagged = anomalies.filter((n) => n.review_state === "flagged").length;
  const unreviewed = anomalies.filter((n) => n.review_state === "unreviewed").length;
  const top_open = [...nodes]
    .filter((n) => n.open > 0)
    .sort((a, b) => b.open - a.open)
    .slice(0, 10)
    .map((n) => ({ title: n.title, rel: n.rel, open: n.open }));

  const data = {
    generated: local_iso(),
    counts: {
      docs: nodes.length, links: edges.length, open: total_open,
      closed: total_closed, orphans: orphans.length, stale: stale.length,
    },
    review: {
      anomaly_total: anomalies.length, approved,
      flagged, unreviewed,
    },
    themes,
    top_open,
  };
  const json_path = out_html.replace(/\.html$/, "") + ".json";
  fs.writeFileSync(json_path, JSON.stringify(data, null, 2), "utf-8");
  return json_path;
}

function main(): void {
  let out = DEFAULT_OUT;
  let ledger_path = DEFAULT_LEDGER;
  const argv = process.argv;
  {
    const i = argv.indexOf("--out");
    if (i !== -1 && i + 1 < argv.length) {
      out = argv[i + 1];
    }
  }
  {
    const i = argv.indexOf("--ledger");
    if (i !== -1 && i + 1 < argv.length) {
      ledger_path = argv[i + 1];
    }
  }

  const docs = collect_docs();
  const [nodes, edges] = build_graph(docs);
  is_anomaly(nodes);
  annotate_review(nodes, load_ledger(ledger_path));
  refresh_compliance(); // 生成元规则合规 JSON, 供仪表盘"元规则合规"面板读取
  const pos = radial_positions(nodes);
  const out_dir = path.dirname(out);
  if (out_dir) {
    fs.mkdirSync(out_dir, { recursive: true });
  }
  render_html(nodes, edges, pos, out);
  const json_path = write_json(out, nodes, edges);

  const { orphans, stale, total_open, total_closed } = html_summary(nodes, edges);
  const { anomalies, approved, flagged, unreviewed } = review_summary(nodes);
  console.log(`文档 ${nodes.length} 张, 互链 ${edges.length} 条`);
  console.log(`【待定】${total_open} / 【已定】${total_closed}`);
  console.log(`孤立文档 ${orphans.length} 张, 陈旧(>${STALE_DAYS}天) ${stale.length} 张`);
  console.log(`复核账本: 异常 ${anomalies.length} / 已通过 ${approved.length} / 已标记 ${flagged.length} / 未复核 ${unreviewed.length}`);
  console.log(`仪表盘已生成: ${out}`);
  console.log(`数据已生成:   ${json_path}`);
}

main();
