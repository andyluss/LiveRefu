#!/usr/bin/env node
// structure_check —— 检测一棵目录树里每个目录是否都有合格的 STRUCTURE.md（对应元规则 M4）。
// 跨运行时 TypeScript（node/deno/bun 直接运行）。与 structure_check.py 同功能。

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const HERE = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const DEFAULT_ROOT = path.normalize(path.join(HERE, "..", "..", "..")); // formal-system
const SKIP = new Set<string>(["__pycache__", "target", ".git", "node_modules"]);
const REQUIRED = ["目录结构", "条目说明", "文件关系图"];

function dirsUnder(root: string): string[] {
  // 对应 Python os.walk 语义：root 目录被追加两次（一次 init，一次首次遍历），子目录按 DFS 顺序追加。
  const out: string[] = [root];
  const visit = (dir: string): void => {
    out.push(dir);
    let children: string[] = [];
    try {
      children = fs.readdirSync(dir, { encoding: "utf8" });
    } catch {
      children = [];
    }
    for (const d of children) {
      if (SKIP.has(d) || d.startsWith(".")) continue;
      const full = path.join(dir, d);
      let isDir = false;
      try {
        isDir = fs.lstatSync(full).isDirectory(); // 不跟随符号链接（等价 os.walk followlinks=False）
      } catch {
        isDir = false;
      }
      if (isDir) visit(full);
    }
  };
  visit(root);
  return out;
}

function validate(dir: string): [boolean, string] {
  const sp = path.join(dir, "STRUCTURE.md");
  if (!fs.existsSync(sp)) return [false, "缺 STRUCTURE.md"];
  let text: string;
  try {
    text = fs.readFileSync(sp, "utf8");
  } catch (e) {
    return [false, "STRUCTURE.md 读取失败"];
  }
  const missing = REQUIRED.filter((r) => !text.includes(r));
  if (missing.length) return [false, "缺小节: " + missing.join(", ")];
  if (!text.includes("mermaid")) return [false, "缺 mermaid 文件关系图"];
  return [true, ""];
}

function relDisplay(rootAbs: string, d: string): string {
  const r = path.relative(rootAbs, d);
  return r === "" ? "." : r;
}

function selfTest(): number {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "struct-check-"));
  const good = path.join(base, "good");
  fs.mkdirSync(good);
  fs.writeFileSync(
    path.join(good, "STRUCTURE.md"),
    "## 一、目录结构\n## 二、条目说明\n## 三、文件关系图（mermaid）\n```mermaid\ngraph TD\nA[x]\n```\n"
  );
  const bad = path.join(base, "bad");
  fs.mkdirSync(bad);
  fs.writeFileSync(path.join(bad, "STRUCTURE.md"), "## 只有结构\n");
  const missing = path.join(base, "missing");
  fs.mkdirSync(missing);

  const ok_g = validate(good)[0];
  const ok_b = validate(bad)[0];
  const ok_m = validate(missing)[0];
  const passed = ok_g && !ok_b && !ok_m;
  console.log(`  good: ${ok_g}, bad(缺小节): ${ok_b}, missing(缺文件): ${ok_m}`);
  console.log("self-test:", passed ? "PASS" : "FAIL");
  return passed ? 0 : 1;
}

function main(): number {
  if (process.argv.includes("--self-test")) return selfTest();
  let root = DEFAULT_ROOT;
  const idx = process.argv.indexOf("--root");
  if (idx !== -1 && idx + 1 < process.argv.length) {
    root = process.argv[idx + 1];
  }
  const rootAbs = path.resolve(root);
  const dirs = dirsUnder(rootAbs);
  const bad: [string, string][] = [];
  for (const d of dirs) {
    const ok = validate(d);
    if (!ok[0]) bad.push([relDisplay(rootAbs, d), ok[1]]);
  }
  console.log(`STRUCTURE.md 检测 · ${dirs.length} 个目录`);
  const sortedBad = bad.slice().sort();
  for (const [rel, reason] of sortedBad) console.log(`  ✗ ${rel}: ${reason}`);
  console.log(`\n判定: 目录 ${dirs.length} · 不合格 ${bad.length}`);
  return bad.length ? 1 : 0;
}

process.exitCode = main();
