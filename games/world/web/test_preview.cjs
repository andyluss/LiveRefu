const fs = require("node:fs");
const path = require("node:path");
const { PreviewWorld } = require("./node-pkg/world_wasm.js");

const root = __dirname;
const pack = fs.readFileSync(path.join(root, "pack.data"), "utf8");
const trace = fs.readFileSync(path.join(root, "m0.trace.json"), "utf8");
const EXPECTED = "0xc840fe2090a0a085";

const w = new PreviewWorld(pack);
const replayHash = w.replay(trace);
console.log(`replay=${replayHash}`);
if (replayHash !== EXPECTED) {
  console.error(`replay mismatch: expected ${EXPECTED}`);
  process.exit(1);
}

w.reset();
for (let tick = 1; tick <= 600; tick++) {
  if (tick === 10) w.interact("player", "demo.airlock");
  if (tick === 20) w.pickup("player", "item.keycard");
  if (tick === 30) w.interact("player", "demo.airlock");
  if (tick === 40) w.talk("player", "demo.keeper");
  w.tick(16666);
}
const state = JSON.parse(w.state());
const events = JSON.parse(w.poll_events());
console.log(`preview=${state.final_hash} entities=${state.state.entities.length} events=${events.length}`);
if (state.final_hash !== EXPECTED) {
  console.error(`preview mismatch: expected ${EXPECTED}`);
  process.exit(1);
}
// 移动 + 关门碰撞：玩家应向前移动，但被关闭的气闸挡住。
w.reset();
w.set_move(0, 1);
for (let tick = 1; tick <= 120; tick++) w.tick(16666);
const moved = JSON.parse(w.state());
const player = moved.state.entities.find((e) => e.content_id === "player");
const z = player.transform.position[2];
console.log(`movement z=${z.toFixed(2)}`);
if (!(z > 0.5 && z < 5.6)) {
  console.error(`movement/collision failed: z=${z}`);
  process.exit(1);
}
// 寻路：点击门后，玩家应绕开气闸到达 z>7.5。
w.reset();
w.move_to(0, 9);
for (let tick = 1; tick <= 500; tick++) w.tick(16666);
const pathed = JSON.parse(w.state());
const p2 = pathed.state.entities.find((e) => e.content_id === "player");
const z2 = p2.transform.position[2];
console.log(`path z=${z2.toFixed(2)} assets=${pathed.assets.length}`);
if (z2 < 7.5) {
  console.error(`pathfinding failed: z=${z2}`);
  process.exit(1);
}
if (!pathed.assets.includes("mesh.keeper")) {
  console.error(`assets missing: ${pathed.assets}`);
  process.exit(1);
}
console.log("wasm preview PASS");
