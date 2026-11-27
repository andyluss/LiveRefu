import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pack = JSON.parse(readFileSync(join(ROOT, "refuworld.pack.data"), "utf8"));
assert.equal(pack.manifest.id, "lab.tetris");
assert.ok(pack.world.systems, "L5 systems definition");
assert.ok(pack.world.systems.battery_kwh < 48, "low-battery scenario for L3 objective");
assert.ok(pack.quests["quest.tetris.grid"], "L3 quest definition");
assert.deepEqual(pack.quests["quest.tetris.grid"].objectives.map((o) => o.flag).sort(), [
  "flag.tetris.first_clear", "flag.tetris.power_saved", "flag.tetris.tetris",
]);
const html = readFileSync(join(ROOT, "refuworld.html"), "utf8");
assert.ok(html.includes("__REFUWORLD_MODE__"));
assert.ok(html.includes("rw-panel") && html.includes("rw-quest"));
assert.ok(html.includes("refuworld.pack.data") === false, "pack loaded by bridge");
console.log("✓ RefuWorld pack / L3 / L5 / entry");
console.log("refuworld PASS");
