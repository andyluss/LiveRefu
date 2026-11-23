const fs = require("node:fs");
const path = require("node:path");
const { PreviewWorld } = require("./node-pkg/world_wasm.js");

const root = __dirname;
const pack = fs.readFileSync(path.join(root, "pack.data"), "utf8");
const trace = fs.readFileSync(path.join(root, "m0.trace.json"), "utf8");
const EXPECTED = "0xd1c6ea084b71cc0d";

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
console.log("wasm preview PASS");
