#!/usr/bin/env node
// review_ledger —— 人工复核账本 CLI（可视验证面第③层）。
//
// 配合 visual_health.py（它算出异常：孤立/高待定/陈旧），由人类对每个异常登记 approve 或 flag，
// 写入追加式 ledger，形成可追踪、可统计的复核记录。
// 等价于 ../tools/review_ledger.py，可被 node / deno / bun 直接运行。

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
const DEFAULT_LEDGER = path.join(
  ROOT, "lab", "formal-system", "concerns", "visual-fallback", "viz", "review-ledger.json",
);
const SCHEMA = "lab/formal-system/review-ledger v1";

function pad2(n) { return String(n).padStart(2, "0"); }

function rel_norm(p) {
  if (path.isAbsolute(p)) {
    return path.relative(ROOT, path.resolve(p)).split(path.sep).join("/");
  }
  return p.split(path.sep).join("/");
}

function load(p) {
  if (!fs.existsSync(p)) return { schema: SCHEMA, records: [] };
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function save(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function randId() {
  try {
    const u = globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : null;
    if (u) return u.replace(/-/g, "").slice(0, 8);
  } catch (_e) { /* fall through */ }
  let s = "";
  for (let i = 0; i < 8; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

function isoSeconds() {
  const d = new Date();
  const off = -d.getTimezoneOffset();
  const sgn = off >= 0 ? "+" : "-";
  const oh = pad2(Math.floor(Math.abs(off) / 60));
  const om = pad2(Math.abs(off) % 60);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` +
    `${sgn}${oh}:${om}`;
}

function add_record(r, data) {
  const verdict = String(r.verdict).toLowerCase();
  if (verdict !== "approve" && verdict !== "flag") {
    console.error("verdict 必须为 approve 或 flag");
    process.exit(1);
  }
  const rec = {
    id: randId(),
    rel: rel_norm(r.rel),
    verdict,
    reason: r.reason,
    reviewer: r.reviewer,
    reviewed_at: isoSeconds(),
  };
  if (r.action) rec.action = r.action;
  data.records.push(rec);
  return rec;
}

function latest_by_rel(data) {
  const out = {};
  for (const rec of (data.records || [])) out[rec.rel] = rec;
  return out;
}

function cmd_record(r, ledger) {
  const data = load(ledger);
  const rec = add_record(r, data);
  save(ledger, data);
  console.log(`[+${rec.verdict}] ${rec.rel}`);
  console.log(`    原因: ${rec.reason}`);
  console.log(`    人/时间: ${rec.reviewer} @ ${rec.reviewed_at}  id=${rec.id}`);
  return 0;
}

function cmd_list(ledger) {
  const data = load(ledger);
  const recs = data.records || [];
  if (!recs.length) {
    console.log("账本为空。");
    return 0;
  }
  for (const rec of recs) {
    console.log(`${rec.reviewed_at}  ${rec.verdict.padEnd(7)} ${rec.rel}` +
      `  (id=${rec.id} 人=${rec.reviewer} 因=${rec.reason || ""})`);
  }
  return 0;
}

function cmd_status(ledger) {
  const data = load(ledger);
  const latest = latest_by_rel(data);
  const counts = { approve: 0, flag: 0 };
  for (const rec of Object.values(latest)) {
    counts[rec.verdict] = (counts[rec.verdict] || 0) + 1;
  }
  if (!Object.keys(latest).length) {
    console.log("账本为空（尚未登记任何复核）。");
    return 0;
  }
  console.log(`当前复核状态（按文档最新一条）: 通过 ${counts.approve} / 标记 ${counts.flag} / 共 ${Object.keys(latest).length}`);
  for (const rel of Object.keys(latest).sort()) {
    const rec = latest[rel];
    console.log(`  ${rec.verdict.padEnd(7)} ${rel}  (人=${rec.reviewer} 因=${rec.reason || ""})`);
  }
  return 0;
}

function cmd_delete(id, ledger) {
  const data = load(ledger);
  const before = (data.records || []).length;
  const before_latest = Object.keys(latest_by_rel(data)).length;
  data.records = (data.records || []).filter((r) => r.id !== id);
  save(ledger, data);
  console.log(`删除 id=${id}: 记录 ${before}→${data.records.length}, ` +
    `当前文档 ${before_latest}→${Object.keys(latest_by_rel(data)).length}`);
  return 0;
}

function opt(args, name, def) {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : def;
}

function main() {
  const args = process.argv.slice(2);

  let ledger = DEFAULT_LEDGER;
  for (let i = 0; i + 1 < args.length; i++) {
    if (args[i] === "--ledger") ledger = args[i + 1];
  }

  const subs = new Set(["record", "list", "status", "delete"]);
  let cmd = null;
  for (const a of args) if (subs.has(a)) { cmd = a; break; }
  if (cmd === null) {
    console.error("error: 缺少子命令（record/list/status/delete）");
    process.exit(2);
  }
  const rest = args.slice(args.indexOf(cmd) + 1);

  if (cmd === "record") {
    const rel = opt(rest, "--rel", null);
    const verdict = opt(rest, "--verdict", null);
    const reason = opt(rest, "--reason", null);
    if (rel === null || verdict === null || reason === null) {
      console.error("error: record 需要 --rel / --verdict / --reason");
      process.exit(2);
    }
    if (verdict !== "approve" && verdict !== "flag") {
      console.error("error: 无效的 --verdict（须为 approve 或 flag）");
      process.exit(2);
    }
    const reviewer = opt(rest, "--reviewer", "human");
    const action = opt(rest, "--action", "");
    return cmd_record({ rel, verdict, reason, reviewer, action }, ledger);
  }
  if (cmd === "list") return cmd_list(ledger);
  if (cmd === "status") return cmd_status(ledger);
  if (cmd === "delete") {
    const id = rest.find((a) => !a.startsWith("--"));
    if (id === undefined) {
      console.error("error: delete 需要 id 参数");
      process.exit(2);
    }
    return cmd_delete(id, ledger);
  }
  return 0;
}

process.exit(main());
