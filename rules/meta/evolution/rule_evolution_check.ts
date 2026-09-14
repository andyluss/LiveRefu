#!/usr/bin/env node
// rule_evolution_check —— 形式化检查"规则演进状态"（属 rules/meta 的 evolution 子关注点）。
// 校验**元规则**（rules/meta/M<编号>-*.md）与**具体规则**（rules/R<编号>-*.md）的演进状态是否符合 M3 状态机。
// 跨运行时 TypeScript（node/deno/bun 直接运行）。整合自 lab/formal-system/concerns/meta-rules/evolution/rule_evolution_check.ts。

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const HERE = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const META_DIR = path.normalize(path.join(HERE, "..")); // rules/meta/ （元规则 M 系列）
const RULES_DIR = path.normalize(path.join(HERE, "..", "..")); // rules/ （具体规则 R 系列）

// ---- M3 状态机 ----
const PRIMARY: Record<string, string> = {
  draft: "草案",
  proposed: "建议",
  experimental: "试用",
  accepted: "已定",
  "in-review": "复核中",
  superseded: "被取代",
  deprecated: "废弃",
  retired: "退役",
};
const SUBS: Record<string, Record<string, string>> = {
  proposed: { draft: "初稿", discussion: "讨论中", trial: "试行中" },
  experimental: { trial: "试点", validated: "已初验" },
  accepted: { active: "现行", applied: "已落地", lapsed: "暂搁置" },
  "in-review": { challenged: "被质疑", superseding: "待被取代" },
};
const ALLOWED: Record<string, Set<string>> = {
  draft: new Set(["proposed", "experimental", "retired"]),
  proposed: new Set(["experimental", "accepted", "retired"]),
  experimental: new Set(["accepted", "in-review", "retired"]),
  accepted: new Set(["in-review", "superseded", "deprecated", "retired"]),
  "in-review": new Set(["accepted", "superseded", "deprecated", "retired"]),
  superseded: new Set(["deprecated", "retired"]),
  deprecated: new Set(["retired"]),
  retired: new Set<string>(),
};
const HEADER_MAP: Record<string, string> = {
  草案: "draft",
  建议: "proposed",
  试用: "experimental",
  实验期: "experimental",
  已定: "accepted",
  复核中: "in-review",
  被取代: "superseded",
  废弃: "deprecated",
  退役: "retired",
};

const ROW_RE = /^\|\s*v(\d+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*`([^`]+)`\s*\|/;

function splitState(state: string): [string, string | null] {
  const parts = state.trim().split(".");
  return [parts[0], parts.length > 1 ? parts[1] : null];
}

function validState(state: string): [boolean, string] {
  const [primary, sub] = splitState(state);
  if (!(primary in PRIMARY)) {
    return [false, `主状态 ${JSON.stringify(primary)} 不在 ${JSON.stringify(Object.keys(PRIMARY).sort())}`];
  }
  if (sub !== null && !(sub in (SUBS[primary] ?? {}))) {
    return [false, `子状态 ${JSON.stringify(sub)} 不属于 ${primary} 允许的 ${JSON.stringify(Object.keys(SUBS[primary] ?? {}).sort())}`];
  }
  return [true, ""];
}

function transitionOk(a: string, b: string): boolean {
  const pa = splitState(a)[0];
  const pb = splitState(b)[0];
  return pa === pb || (ALLOWED[pa]?.has(pb) ?? false);
}

function parseRule(fp: string): { ver: number; date: string; state: string }[] | null {
  let text: string;
  try {
    text = fs.readFileSync(fp, "utf8");
  } catch (e) {
    return null;
  }
  const rows: { ver: number; date: string; state: string }[] = [];
  for (const line of text.split("\n")) {
    const m = ROW_RE.exec(line);
    if (m) rows.push({ ver: parseInt(m[1], 10), date: m[2], state: m[3] });
  }
  if (!rows.length) return null;
  return rows;
}

function checkFile(fp: string): string[] {
  const history = parseRule(fp);
  const name = path.basename(fp);
  if (history === null) return [`${name}: 无「演进历史」表(含 状态 列)`];
  const issues: string[] = [];
  let last_date: Date | null = null;
  for (let i = 0; i < history.length; i++) {
    const { ver, date, state } = history[i];
    const [ok, why] = validState(state);
    if (!ok) issues.push(`${name} v${ver}: 状态非法 -> ${state} (${why})`);
    try {
      const d = new Date(date + "T00:00:00Z");
      if (Number.isNaN(d.getTime())) throw new Error("bad date");
      if (last_date !== null && d.getTime() < last_date.getTime()) {
        issues.push(`${name} v${ver}: 日期降序 ${date} < 上一条`);
      }
      last_date = d;
    } catch (err) {
      issues.push(`${name} v${ver}: 日期格式非法 -> ${date}`);
    }
    if (i > 0) {
      const prev = history[i - 1].state;
      if (!transitionOk(prev, state)) {
        issues.push(`${name}: 迁移非法 ${prev} -> ${state}`);
      }
    }
  }
  // 最新状态 = 当前状态
  const cur = history[history.length - 1].state;
  const [okc, whyc] = validState(cur);
  if (!okc) issues.push(`${name}: 当前状态非法 -> ${cur} (${whyc})`);
  return issues;
}

function selfTest(): number {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "evol-check-"));

  const good = `# M9 测试（已定 · 已落地）
| 版本 | 日期 | 状态 | 变更 | 依据 |
| --- | --- | --- | --- | --- |
| v1 | 2026-09-09 | \`proposed\` | 初定 | . |
| v2 | 2026-09-09 | \`accepted.applied\` | 定稿+落地 | . |
`;
  const bad_trans = `# M8 测试（已定）
| 版本 | 日期 | 状态 | 变更 | 依据 |
| --- | --- | --- | --- | --- |
| v1 | 2026-09-09 | \`retired\` | 退役 | . |
| v2 | 2026-09-09 | \`accepted\` | 从退役回已定(非法) | . |
`;
  fs.writeFileSync(path.join(base, "M9x.md"), good);
  fs.writeFileSync(path.join(base, "M8x.md"), bad_trans);

  const issues_g = checkFile(path.join(base, "M9x.md"));
  const issues_b = checkFile(path.join(base, "M8x.md"));
  const ok = issues_g.length === 0 && issues_b.some((i) => i.includes("迁移非法"));

  console.log("  good(M9):", issues_g.length === 0 ? "PASS" : "FAIL " + issues_g.join(";"));
  console.log("  bad(M8):", issues_b.some((i) => i.includes("迁移非法")) ? "PASS" : "FAIL");
  console.log("self-test:", ok ? "PASS" : "FAIL");
  return ok ? 0 : 1;
}

function main(): number {
  if (process.argv.includes("--self-test")) return selfTest();
  const files: string[] = [];
  const collect = (dir: string, re: RegExp): void => {
    try {
      const all = fs.readdirSync(dir, { encoding: "utf8" });
      sortCmp(all);
      for (const f of all) {
        const fp = path.join(dir, f);
        if (re.test(f) && fs.existsSync(fp) && fs.statSync(fp).isFile()) files.push(fp);
      }
    } catch (e) {
      /* 目录不存在则跳过 */
    }
  };
  collect(META_DIR, /^M\d+-.*\.md$/);  // 元规则：rules/meta/M<编号>-*.md
  collect(RULES_DIR, /^R\d+-.*\.md$/); // 具体规则：rules/R<编号>-*.md
  const issues: string[] = [];
  for (const f of files) issues.push(...checkFile(f));
  console.log(`演进状态检查 · ${files.length} 条规则（元规则 M + 具体规则 R）`);
  for (const i of issues) console.log("  ✗ " + i);
  if (!issues.length) console.log("  全部合法 ✔");
  console.log(`\n判定: 规则 ${files.length} · 违规 ${issues.length}`);
  return issues.length ? 1 : 0;
}

function sortCmp(arr: string[]): void {
  arr.sort();
}

process.exitCode = main();
