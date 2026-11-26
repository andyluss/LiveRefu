// ScriptHost wasm 冒烟：QuickJS 事件 → 命令 → 世界状态。
const fs = require("node:fs");
const path = require("node:path");
const { PreviewWorld } = require("./node-pkg/world_wasm.js");

const pack = fs.readFileSync(path.join(__dirname, "packs", "demo.orbit.data"), "utf8");
const w = new PreviewWorld(pack);
w.talk("player", "demo.commander");
w.pickup("player", "item.badge");
w.interact("player", "demo.reactor");
for (let i = 0; i < 8; i++) w.tick(16666);
const state = JSON.parse(w.state());
const events = JSON.parse(w.poll_events());
const seen = state.state.flags["flag.script.reactor_seen"];
console.log(`script_host flag=${seen} events=${events.map((e) => e.kind).join(",")}`);
if (seen !== true) {
  console.error("ScriptHost did not apply set_flag");
  process.exit(1);
}
if (events.some((e) => e.kind === "script_error")) {
  console.error("ScriptHost reported script_error");
  process.exit(1);
}
console.log("script host PASS");
