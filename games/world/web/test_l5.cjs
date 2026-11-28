const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { PreviewWorld } = require("./node-pkg/world_wasm.js");

const text = fs.readFileSync(path.join(__dirname, "packs", "demo.systems.data"), "utf8");
const pack = JSON.parse(text);
assert.ok(pack.world.systems);
for (const key of ["actors", "rules", "quests", "dialogues", "scripts", "schedules"]) {
  assert.equal(Object.keys(pack[key] ?? {}).length, 0, `${key} must be empty for L5 only`);
}
assert.equal(pack.world.social ?? null, null);

const world = new PreviewWorld(text);
world.tick(16666);
let state = JSON.parse(world.state());
let events = JSON.parse(world.poll_events());
assert.ok(events.some((e) => e.kind === "system_warning" && e.data.system === "water"));
assert.equal(state.state.social ?? null, null);
assert.equal(state.state.systems.weather, "clear");

const loadBefore = state.state.systems.load_kw;
world.set_system_policy("compute");
world.tick(16666);
state = JSON.parse(world.state());
events = JSON.parse(world.poll_events());
assert.equal(state.state.systems.policy, "compute");
assert.ok(state.state.systems.load_kw > loadBefore, "compute must raise load");
assert.ok(events.some((e) => e.kind === "system_policy_changed"));

const waterBefore = state.state.systems.water_m3;
world.set_system_policy("irrigate");
for (let i = 0; i < 120; i++) world.tick(16666);
state = JSON.parse(world.state());
assert.equal(state.state.systems.policy, "irrigate");
assert.ok(state.state.systems.water_m3 < waterBefore, "irrigate must draw water");
assert.ok(state.state.systems.battery_kwh >= 0);
assert.equal(state.state.social ?? null, null);
console.log("L5 systems PASS: weather, energy, water, AI load, policy, warning, no L1-L4");
