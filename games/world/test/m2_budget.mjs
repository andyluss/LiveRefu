#!/usr/bin/env node
// M2 resource-budget gate: adapter size/boundary, pack payload, frame budget.
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const adapter = read("godot-extension/src/lib.rs");
const adapterLines = adapter.split("\n").length;
assert.ok(adapterLines <= 2000, `adapter lines ${adapterLines} > 2000`);
assert.ok(!/world_core|world-pack|world_pack/.test(adapter), "adapter must not import core/pack crates");

const packPath = resolve(ROOT, "godot/pack.data");
const packSize = statSync(packPath).size;
assert.ok(packSize <= 10 * 1024 * 1024, `pack.data ${packSize} bytes > 10 MB`);
const pack = JSON.parse(readFileSync(packPath, "utf8"));
const zones = Object.values(pack.zones ?? {});
const placements = zones.reduce((n, zone) => n + (zone.placements?.length ?? 0), 0);
const actors = Object.keys(pack.actors ?? {}).length;
const props = Object.keys(pack.props ?? {}).length;
const items = Object.keys(pack.items ?? {}).length;
const quests = Object.keys(pack.quests ?? {}).length;

const ci = JSON.parse(read("docs/bench/m2-godot-5k-frame-ci.json"));
const gpu = JSON.parse(read("docs/bench/m2-godot-5k-gpu.json"));
assert.ok(ci.frame_ms_p95 <= 1000 / 60, `CI frame P95 ${ci.frame_ms_p95} > 16.67ms`);
assert.ok(gpu.frame_ms_p95 <= 1000 / 60, `GPU frame P95 ${gpu.frame_ms_p95} > 16.67ms`);
assert.ok(ci.frames >= 120 && gpu.frames >= 120, "frame sample too small");

console.log(`adapter_lines=${adapterLines} <= 2000`);
console.log(`pack.data=${packSize}B; actors=${actors} props=${props} items=${items} quests=${quests} placements=${placements}`);
console.log(`frame_p95: ci=${ci.frame_ms_p95}ms gpu=${gpu.frame_ms_p95}ms <= 16.67ms`);
console.log("M2 BUDGET PASS");
