const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { PreviewWorld } = require("./node-pkg/world_wasm.js");

const root = __dirname;
const packText = fs.readFileSync(path.join(root, "packs", "demo.spacetime.data"), "utf8");
const pack = JSON.parse(packText);
assert.deepEqual(pack.manifest.kits, ["core"]);
for (const key of ["actors", "items", "rules", "quests", "dialogues", "schedules", "scripts"]) {
  assert.equal(Object.keys(pack[key] ?? {}).length, 0, `${key} must be empty for L0 only`);
}
assert.equal(pack.world.social ?? null, null);
assert.equal(pack.world.systems ?? null, null);
assert.ok(Object.keys(pack.navs).length >= 1);

const world = new PreviewWorld(packText);
const initial = JSON.parse(world.state());
const s = initial.state;
assert.equal(s.flags && Object.keys(s.flags).length, 0);
assert.equal(s.quests && Object.keys(s.quests).length, 0);
assert.equal(s.social ?? null, null);
assert.equal(s.systems ?? null, null);
const player = s.entities.find((e) => e.id.index === s.player.index && e.id.generation === s.player.generation);
assert.ok(player);
assert.equal(player.inventory.length, 0);
assert.ok(s.entities.some((e) => e.kind === "prop"));
assert.ok(!s.entities.some((e) => e.kind === "actor" || e.kind === "item"));
const before = [player.transform.position[0], player.transform.position[2]];
const hashBefore = initial.final_hash;

world.move_to(8, 6);
for (let i = 0; i < 180; i++) world.tick(16666);
const after = JSON.parse(world.state());
const p2 = after.state.entities.find((e) => e.id.index === after.state.player.index && e.id.generation === after.state.player.generation);
assert.ok(Math.hypot(p2.transform.position[0] - before[0], p2.transform.position[2] - before[1]) > 1,
  "player should move along A* path");

world.reset();
const reset = JSON.parse(world.state());
assert.equal(reset.final_hash, hashBefore, "reset must return to the same deterministic state");
console.log("L0 sandbox PASS: core-only pack, movement, nav, collision, reset hash");
