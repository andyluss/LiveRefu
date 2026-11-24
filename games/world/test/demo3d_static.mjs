#!/usr/bin/env node
// 3D 演示的静态契约：本地 Three.js、import map、R-016、wasm 交互入口。
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "web/demo3d.html"), "utf8");
const js = readFileSync(join(ROOT, "web/demo3d.js"), "utf8");

const checks = [];
function check(name, ok) { checks.push([name, ok]); }

check("import map", html.includes('type="importmap"') && html.includes('"three": "./vendor/three/three.module.js"'));
check("theme control", html.includes("data-theme-choice") && html.includes("lrds-theme"));
check("module entry", html.includes('src="./demo3d.js"'));
for (const file of [
  "three.module.js", "three.core.js", "LICENSE",
  "addons/controls/OrbitControls.js",
  "addons/postprocessing/EffectComposer.js",
  "addons/postprocessing/UnrealBloomPass.js",
  "addons/environments/RoomEnvironment.js",
]) {
  check(`vendor ${file}`, existsSync(join(ROOT, "web/vendor/three", file)));
}
check("wasm state", js.includes("new PreviewWorld") && js.includes("world.state()"));
check("interactions", js.includes("world.move_to") && js.includes("world.pickup") && js.includes("world.interact"));
check("no CDN", !/https?:\/\//.test(html.replace(/http:\/\/127\.0\.0\.1/g, "")));

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`demo3d static: ${failed} 项失败`);
  process.exit(1);
}
console.log("demo3d static PASS");
