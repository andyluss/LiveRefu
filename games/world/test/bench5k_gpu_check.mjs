#!/usr/bin/env node
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("用法: node test/bench5k_gpu_check.mjs <json>");
  process.exit(2);
}
const report = JSON.parse(readFileSync(file, "utf8"));
const checks = [
  ["frames >= 180", report.frames >= 180],
  ["multimesh >= 5000", report.multimesh_count >= 5000],
  ["has host", typeof report.host === "string" && report.host.length > 0],
  ["p50 present", typeof report.frame_ms_p50 === "number"],
  ["p95 present", typeof report.frame_ms_p95 === "number"],
  ["p95 <= 200ms (software GL)", report.frame_ms_p95 <= 200],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`frame PASS: host=${report.host}, p95=${report.frame_ms_p95}ms, frames=${report.frames}`);
