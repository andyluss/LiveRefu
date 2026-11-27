#!/usr/bin/env node
// Static dependency gate for world-core layers.
// Dependency direction: narrative -> agency -> subject -> spacetime.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LAYERS = {
  spacetime: [],
  subject: ["agency", "narrative", "world"],
  agency: ["narrative", "world"],
  narrative: ["world"],
};
const files = {
  spacetime: join(ROOT, "code/crates/world-core/src/layers/spacetime.rs"),
  subject: join(ROOT, "code/crates/world-core/src/layers/subject.rs"),
  agency: join(ROOT, "code/crates/world-core/src/layers/agency.rs"),
  narrative: join(ROOT, "code/crates/world-core/src/layers/narrative.rs"),
};
let failed = 0;
for (const [layer, path] of Object.entries(files)) {
  if (!existsSync(path)) {
    console.error(`✗ ${layer}: missing ${path}`);
    failed++;
    continue;
  }
  const source = readFileSync(path, "utf8");
  const bad = [];
  for (const upper of LAYERS[layer]) {
    const re = new RegExp(`use\\s+crate::(?:layers::)?${upper}\\b`);
    if (re.test(source)) bad.push(upper);
  }
  if (bad.length) {
    console.error(`✗ ${layer}: upward import(s): ${bad.join(", ")}`);
    failed++;
  } else {
    console.log(`✓ ${layer}: no upward imports`);
  }
}
if (failed) {
  console.error(`layer boundary: ${failed} 项失败`);
  process.exit(1);
}
console.log("layer boundary PASS");
