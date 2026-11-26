#!/usr/bin/env node
import { readFileSync } from "node:fs";
const [aPath, bPath] = process.argv.slice(2);
if (!aPath || !bPath) {
  console.error("用法: node test/events_compare.mjs <godot.jsonl> <headless.jsonl>");
  process.exit(2);
}
const parse = (path) => readFileSync(path, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.stringify(JSON.parse(l)));
const a = parse(aPath), b = parse(bPath);
let failed = 0;
if (a.length !== b.length) { console.log(`✗ count ${a.length} != ${b.length}`); failed++; }
for (let i = 0; i < Math.min(a.length, b.length); i++) {
  if (a[i] !== b[i]) { console.log(`✗ event ${i}: ${a[i]} != ${b[i]}`); failed++; }
}
if (failed) process.exit(1);
console.log(`event sequence PASS: ${a.length} events identical`);
