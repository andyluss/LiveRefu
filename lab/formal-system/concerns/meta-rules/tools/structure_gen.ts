#!/usr/bin/env node
// structure_gen —— 为目录生成 STRUCTURE.md（结构 + 细节说明 + 文件关系图 mermaid）。
// 对应元规则 M4（目录说明与统一索引）。跨运行时 TypeScript，与 structure_gen.py 同功能。

import * as fs from "node:fs";
import * as path from "node:path";

const HERE = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
// meta-rules/tools -> meta-rules -> concerns -> formal-system
const DEFAULT_ROOT = path.normalize(path.join(HERE, "..", "..", ".."));
const SKIP = new Set<string>(["__pycache__", "target", ".git", "node_modules"]);
const LINK_RE = /\]\(([^)]+\.md|[^)]+\.(png|svg|jpg))\)/g;

const SYM: Record<string, string> = {
  "README.md": "出入口说明",
  "STRUCTURE.md": "目录结构(本文件)",
  "CHANGELOG.md": "变更日志",
  "EXPERIMENT.md": "交接启动文档",
  "meta-rules-config.json": "元规则判定配置",
};

function dirsUnder(root: string): string[] {
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
        isDir = fs.lstatSync(full).isDirectory(); // 不跟随符号链接
      } catch {
        isDir = false;
      }
      if (isDir) visit(full);
    }
  };
  visit(root);
  return out;
}

function oneLine(dir: string, name: string): string {
  if (name in SYM) return SYM[name];
  const fp = path.join(dir, name);
  if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) return "（子目录，见其 STRUCTURE.md）";
  const lower = name.toLowerCase();
  if (lower.endsWith(".md")) {
    // 取首个 # 标题
    try {
      const text = fs.readFileSync(fp, "utf8");
      for (const line of text.split("\n")) {
        const s = line.replace(/^\s+/, "");
        if (s.startsWith("# ")) return s.slice(2).trim().slice(0, 48);
      }
    } catch (e) {
      // ignore
    }
    return "（Markdown 文档）";
  }
  if (lower.endsWith(".py") || lower.endsWith(".rs")) return "（代码文件）";
  if (lower.endsWith(".json")) {
    try {
      const d = JSON.parse(fs.readFileSync(fp, "utf8"));
      if (d && typeof d === "object" && !Array.isArray(d) && d.concern) {
        return `配置：${d.concern}`;
      }
    } catch (e) {
      // ignore
    }
    return "（JSON 配置/数据）";
  }
  if (lower.endsWith(".html") || lower.endsWith(".svg") || lower.endsWith(".png") || lower.endsWith(".jpg") || name.startsWith(".")) {
    return "（资源/产物）";
  }
  return "（文件）";
}

function treeLines(dir: string, prefix = ""): string[] {
  const entries = listdir(dir)
    .filter((e) => !SKIP.has(e) && !e.startsWith("."))
    .sort();
  const lines: string[] = [];
  for (const e of entries) {
    lines.push(prefix + (e !== entries[entries.length - 1] ? "├─ " : "└─ ") + e);
  }
  return lines;
}

function relDisplay(rootAbs: string, d: string): string {
  const r = path.relative(rootAbs, d);
  return r === "" ? "." : r;
}

function listdir(p: string): string[] {
  try {
    return fs.readdirSync(p, { encoding: "utf8" });
  } catch {
    return [];
  }
}

function splitext(n: string): [string, string] {
  const i = n.lastIndexOf(".");
  if (i <= 0) return [n, ""];
  return [n.slice(0, i), n.slice(i)];
}

function relEdges(dir: string): [string, string][] {
  const edges: [string, string][] = [];
  for (const name of listdir(dir).sort()) {
    if (!name.toLowerCase().endsWith(".md") || name === "STRUCTURE.md") continue;
    const src = splitext(name)[0];
    let text: string;
    try {
      text = fs.readFileSync(path.join(dir, name), "utf8");
    } catch (e) {
      continue;
    }
    for (const m of text.matchAll(LINK_RE)) {
      const tgt = m[1].split("#")[0].replace(/^[./]+/, "");
      const b = path.basename(tgt);
      if (b === name) continue;
      const base = splitext(b)[0];
      if (base) edges.push([src, base]);
    }
  }
  return edges;
}

function mermaid(dir: string): string {
  const nodes = listdir(dir)
    .filter((e) => !SKIP.has(e) && !e.startsWith("."))
    .sort();
  const parts = ["```mermaid", "graph TD"];
  const ide: Record<string, string> = {};
  for (let i = 0; i < nodes.length; i++) {
    const e = nodes[i];
    ide[e] = `N${i}`;
    if (fs.existsSync(path.join(dir, e)) && fs.statSync(path.join(dir, e)).isDirectory()) {
      parts.push(`    N${i}{{${e}}}`);
    } else {
      parts.push(`    N${i}[${e}]`);
    }
  }
  const seen = new Set<string>();
  for (const [a, b] of relEdges(dir)) {
    const key = `${a}\u0000${b}`;
    if (a in ide && b in ide && a !== b && !seen.has(key)) {
      seen.add(key);
      parts.push(`    ${ide[a]} -->|link| ${ide[b]}`);
    }
  }
  parts.push("```");
  return parts.join("\n");
}

function structureMd(dir: string, root: string): string {
  const abs = path.resolve(dir);
  const name = path.basename(abs) || path.sep;
  const rel = path.relative(path.resolve(root), abs);
  const title = `# ${name} · 目录结构与文件关系`;
  const entries = listdir(dir)
    .filter((e) => !SKIP.has(e) && !e.startsWith("."))
    .sort();
  let rows = "";
  if (entries.length) {
    rows = entries.map((e) => `| \`${e}\` | ${oneLine(dir, e)} |`).join("\n") + "\n";
  } else {
    rows = "（空目录，暂无条目）\n";
  }
  const treeJoin = treeLines(dir, "    ").join("\n");
  return `${title}

> 目录 \`${rel || "."}\` 的说明。属 **目录自描述**（元规则 M4 目录说明与统一索引）：列结构 + 条目说明 + 文件关系图；
> 这类说明由树根 README 末尾统一索引。

## 一、目录结构

\`\`\`
${name}/
${treeJoin}
\`\`\`

## 二、条目说明

| 条目 | 说明 |
| --- | --- |
${rows}

## 三、文件关系图（mermaid）

${mermaid(dir)}
`;
}

function main(): number {
  let root = DEFAULT_ROOT;
  let only: string | null = null;
  const rootIdx = process.argv.indexOf("--root");
  if (rootIdx !== -1 && rootIdx + 1 < process.argv.length) {
    root = process.argv[rootIdx + 1];
  }
  const onlyIdx = process.argv.indexOf("--only");
  if (onlyIdx !== -1 && onlyIdx + 1 < process.argv.length) {
    only = process.argv[onlyIdx + 1];
  }
  const check = process.argv.includes("--check");

  const targets = only ? [path.resolve(only)] : dirsUnder(root);
  const missing: string[] = [];
  const written: string[] = [];
  for (const d of targets) {
    const sp = path.join(d, "STRUCTURE.md");
    if (check && !fs.existsSync(sp)) {
      missing.push(relDisplay(path.resolve(root), d));
    } else if (!check && !fs.existsSync(sp)) {
      try {
        // 与 Python 一致：先以 open(sp,"w") 创建文件，再计算内容，故生成的 STRUCTURE.md 会列出自身。
        fs.writeFileSync(sp, "");
        fs.writeFileSync(sp, structureMd(d, root));
      } catch (e) {
        continue;
      }
      written.push(relDisplay(path.resolve(root), d));
    }
  }

  if (check) {
    console.log(`检测 ${targets.length} 个目录，缺 STRUCTURE.md：${missing.length}`);
    for (const m of missing) console.log("  ✗ " + m);
  } else {
    console.log(`已为 ${written.length} 个目录生成 STRUCTURE.md`);
    for (const w of written) console.log("  ✔ " + w);
  }
  return check && missing.length ? 1 : 0;
}

process.exitCode = main();
