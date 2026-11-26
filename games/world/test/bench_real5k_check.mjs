#!/usr/bin/env node
import { readFileSync } from "node:fs";

const report = JSON.parse(readFileSync(process.argv[2], "utf8"));
const checks = [
  ["initial 5000 entities", report.entities_initial === 5000],
  ["5 runs", report.runs >= 1],
  ["hash equal", report.hashes_equal === true],
  ["no rejected commands", report.command_rejected === 0],
  ["no script errors", report.script_errors === 0],
  ["tick p95 present", typeof report.tick_ms?.p95 === "number"],
  ["tick p95 <= 2ms", report.tick_ms.p95 <= 2.0],
  ["snapshot p95 <= 5ms", report.snapshot_hash_ms.p95 <= 5.0]
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`real5k PASS: tick p95=${report.tick_ms.p95}ms, hash=${report.final_hash}`);
