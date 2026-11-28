const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { PreviewWorld } = require("./node-pkg/world_wasm.js");

const text = fs.readFileSync(path.join(__dirname, "packs", "demo.agency.data"), "utf8");
const pack = JSON.parse(text);
assert.ok(pack.manifest.kits.includes("core") && pack.manifest.kits.includes("agency"));
for (const key of ["rules", "quests", "dialogues", "scripts"]) {
  assert.equal(Object.keys(pack[key] ?? {}).length, 0, `${key} must be empty for L2 only`);
}
assert.equal(pack.world.social ?? null, null);
assert.equal(pack.world.systems ?? null, null);
assert.equal(Object.keys(pack.actors).length, 3);
assert.equal(Object.keys(pack.schedules).length, 3);

const world = new PreviewWorld(text);
world.tick(16666);
let state = JSON.parse(world.state());
assert.equal(state.state.flags && Object.keys(state.state.flags).length, 0);
assert.equal(state.state.quests && Object.keys(state.state.quests).length, 0);
const initialWorker = state.state.entities.find((e) => e.persistent_id === "worker");
assert.equal(initialWorker.behavior, "rest");
const initialPos = [...initialWorker.transform.position];

for (let i = 0; i < 299; i++) world.tick(16666);
const after = JSON.parse(world.state());
const events = JSON.parse(world.poll_events());
const worker = after.state.entities.find((e) => e.persistent_id === "worker");
assert.equal(worker.behavior, "work", "worker should switch at 08:00");
assert.ok(worker.transform.position[0] !== initialPos[0] || worker.transform.position[2] !== initialPos[2], "worker should move");
assert.ok(after.state.npc_paths && after.state.npc_paths.worker, "worker npc path should exist");
assert.ok(events.some((e) => e.kind === "schedule_changed" && e.data.entity === "demo.agency.worker"));
assert.equal(after.state.social ?? null, null);
assert.equal(after.state.systems ?? null, null);
console.log("L2 agency PASS: schedule → behavior → target → path → movement, no L3-L5");
