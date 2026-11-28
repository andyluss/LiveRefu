const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { PreviewWorld } = require("./node-pkg/world_wasm.js");

const text = fs.readFileSync(path.join(__dirname, "packs", "demo.narrative.data"), "utf8");
const pack = JSON.parse(text);
assert.ok(pack.manifest.kits.includes("quest") && pack.manifest.kits.includes("dialogue") && pack.manifest.kits.includes("script"));
assert.equal(Object.keys(pack.schedules ?? {}).length, 0, "L2 schedules must be empty");
assert.equal(pack.world.social ?? null, null);
assert.equal(pack.world.systems ?? null, null);

const world = new PreviewWorld(text);
world.tick(16666);
let state = JSON.parse(world.state());
assert.equal(state.state.quests["quest.narrative"].active, true);
assert.equal(state.state.flags && Object.keys(state.state.flags).length, 0);

// Talk starts a real branching dialogue.
world.talk("player", "demo.narrative.archivist");
world.tick(16666);
let events = JSON.parse(world.poll_events());
const started = events.find((e) => e.kind === "dialogue_started");
assert.ok(started && started.data.choices.length === 2, "dialogue should expose choices");

// Choose a branch and reach an end node.
world.choose_dialogue("dialogue.narrative", started.data.node, 0);
world.tick(16666);
state = JSON.parse(world.state());
events = JSON.parse(world.poll_events());
assert.ok(events.some((e) => e.kind === "dialogue_node" && e.data.node === "trust"));
assert.ok(events.some((e) => e.kind === "dialogue_ended"));

// Pickup, approach terminal, fire rule + challenge timer.
world.pickup("player", "item.narrative.shard");
world.tick(16666);
world.set_move(0, 1);
for (let i = 0; i < 100; i++) world.tick(16666);
world.set_move(0, 0);
world.tick(16666);
world.interact("player", "demo.narrative.terminal");
for (let i = 0; i < 4; i++) world.tick(16666);
state = JSON.parse(world.state());
events = JSON.parse(world.poll_events());
assert.equal(state.state.flags["flag.narrative.terminal"], true);
assert.equal(state.state.flags["flag.narrative.script"], true, "ctx.after should fire");
assert.equal(state.state.quests["quest.narrative"].completed, true);
assert.equal(state.state.social ?? null, null);
assert.equal(state.state.systems ?? null, null);
console.log("L3 narrative PASS: dialogue choice, rules, quest, script timer, no L4/L5");
