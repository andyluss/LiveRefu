const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { PreviewWorld } = require("./node-pkg/world_wasm.js");

const text = fs.readFileSync(path.join(__dirname, "packs", "demo.society.data"), "utf8");
const pack = JSON.parse(text);
assert.ok(pack.manifest.kits.includes("core"));
for (const key of ["rules", "quests", "dialogues", "scripts", "schedules"]) {
  assert.equal(Object.keys(pack[key] ?? {}).length, 0, `${key} must be empty for L4 only`);
}
assert.equal(pack.world.systems ?? null, null);
assert.equal(Object.keys(pack.world.social.factions).length, 2);

const world = new PreviewWorld(text);
world.tick(16666);
let state = JSON.parse(world.state());
assert.equal(state.state.social.reputation.player, 0);
assert.equal(state.state.social.factions["faction.growers"].trust, 0);

world.talk("player", "demo.society.grower_a");
world.tick(16666);
state = JSON.parse(world.state());
let events = JSON.parse(world.poll_events());
assert.equal(state.state.social.reputation.player, 1);
const rel1 = Object.values(state.state.social.relationships).find((r) => r.a === "demo.society.grower_a" && r.b === "player");
assert.ok(rel1 && rel1.trust === 1 && rel1.affinity === 1 && rel1.interactions === 1);
assert.ok(events.some((e) => e.kind === "relationship_changed"));

world.social_action("player", "demo.society.grower_a", "support");
world.tick(16666);
state = JSON.parse(world.state());
events = JSON.parse(world.poll_events());
assert.equal(state.state.social.reputation.player, 3);
assert.equal(state.state.social.factions["faction.growers"].trust, 2);
assert.ok(events.some((e) => e.kind === "faction_trust_changed" && e.data.faction === "faction.growers"));

world.social_action("player", "demo.society.engineer_a", "insult");
world.tick(16666);
state = JSON.parse(world.state());
assert.equal(state.state.social.reputation.player, 0);
assert.equal(state.state.social.factions["faction.engineers"].trust, -4);
assert.equal(state.state.social.factions["faction.growers"].trust, 2);
assert.equal(state.state.flags && Object.keys(state.state.flags).length, 0);
assert.equal(state.state.systems ?? null, null);
console.log("L4 society PASS: factions, relationship, reputation, social actions, no L5");
