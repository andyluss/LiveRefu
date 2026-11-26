#!/usr/bin/env node
// M2 适配器边界：只允许 world-abi；不直接使用内核/玩法 crate；源码行数预算。
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const extension = join(root, "godot-extension/src");
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".rs")) files.push(p);
  }
};
walk(extension);
const forbidden = /world_core|world-pack|world_pack|world_kits|world-kits/;
let failed = 0;
for (const f of files) {
  const text = readFileSync(f, "utf8");
  if (forbidden.test(text)) {
    console.log(`✗ forbidden dependency keyword: ${relative(root, f)}`);
    failed++;
  }
}
const gd = readdirSync(join(root, "godot")).filter((f) => f.endsWith(".gd"));
const lines = [...files.map((f) => [f, readFileSync(f, "utf8")]), ...gd.map((f) => [join(root, "godot", f), readFileSync(join(root, "godot", f), "utf8")])]
  .reduce((n, [, text]) => n + text.split("\n").length, 0);
if (lines > 2000) { console.log(`✗ adapter lines ${lines} > 2000`); failed++; }
if (failed) process.exit(1);
console.log(`M2 boundary PASS: ${files.length} Rust files + ${gd.length} GDScript files, ${lines} lines <= 2000; no core/gameplay crate imports`);
