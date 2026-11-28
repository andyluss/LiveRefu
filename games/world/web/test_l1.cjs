const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { PreviewWorld } = require("./node-pkg/world_wasm.js");

const root = __dirname;
const text = fs.readFileSync(path.join(root, "packs", "demo.subject.data"), "utf8");
const pack = JSON.parse(text);
assert.ok(pack.manifest.kits.includes("core") && pack.manifest.kits.includes("interaction") && pack.manifest.kits.includes("inventory"));
assert.equal(pack.world.interaction_range, 6);
for (const key of ["actors", "rules", "quests", "dialogues", "schedules", "scripts"]) {
  assert.equal(Object.keys(pack[key] ?? {}).length, 0, `${key} must be empty for L1 only`);
}
assert.equal(pack.world.social ?? null, null);
assert.equal(pack.world.systems ?? null, null);

const world = new PreviewWorld(text);
const initial = JSON.parse(world.state());
const door = initial.state.entities.find((e) => e.persistent_id === "door");
assert.ok(door && door.door && !door.door.open);
assert.equal(initial.state.flags && Object.keys(initial.state.flags).length, 0);
assert.equal(initial.state.quests && Object.keys(initial.state.quests).length, 0);

// Too far: the command must be rejected by the L1 range gate, not silently applied.
world.interact("player", "demo.subject.door");
world.tick(16666);
let state = JSON.parse(world.state());
let events = JSON.parse(world.poll_events());
assert.equal(state.state.entities.find((e) => e.persistent_id === "door").door.open, false);
assert.ok(events.some((e) => e.kind === "command_rejected"), "far interaction should be rejected");

// Pick up the keycard (3m away).
world.pickup("player", "item.subject.keycard");
world.tick(16666);
state = JSON.parse(world.state());
events = JSON.parse(world.poll_events());
assert.equal(state.state.entities.find((e) => e.persistent_id === "keycard"), undefined);
assert.ok(events.some((e) => e.kind === "item_acquired"));

// Walk toward the door, stop, then interact.
world.set_move(0, 1);
for (let i = 0; i < 100; i++) world.tick(16666);
world.set_move(0, 0);
world.tick(16666);
world.interact("player", "demo.subject.door");
world.tick(16666);
state = JSON.parse(world.state());
events = JSON.parse(world.poll_events());
assert.equal(state.state.entities.find((e) => e.persistent_id === "door").door.open, true);
assert.ok(events.some((e) => e.kind === "door_opened"));
assert.equal(state.state.social ?? null, null);
assert.equal(state.state.systems ?? null, null);
console.log("L1 subject PASS: range gate, pickup, locked door, inventory, no L2-L5");
