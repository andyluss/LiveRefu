const fs = require("node:fs");
const path = require("node:path");
const { PreviewWorld } = require("./node-pkg/world_wasm.js");

const dir = path.join(__dirname, "packs");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".data")).sort();
let failed = 0;
for (const file of files) {
  try {
    const pack = fs.readFileSync(path.join(dir, file), "utf8");
    const world = new PreviewWorld(pack);
    const state = JSON.parse(world.state());
    const entities = state.state.entities.length;
    console.log(`✓ ${file} entities=${entities}`);
    if (entities < 2) failed++;
  } catch (error) {
    console.error(`✗ ${file}: ${error.message}`);
    failed++;
  }
}
if (failed) process.exit(1);
console.log(`demos load PASS: ${files.length} packs`);
