#!/usr/bin/env node
// Demo 体系静态契约：索引页、2.5D、环形 3D、内容包与本地 vendor。
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];
function check(name, ok) { checks.push([name, ok]); }

const gallery = readFileSync(join(ROOT, "web/demos.html"), "utf8");
const iso = readFileSync(join(ROOT, "web/iso.html"), "utf8");
const isoJs = readFileSync(join(ROOT, "web/iso.js"), "utf8");
const orbit = readFileSync(join(ROOT, "web/orbit3d.html"), "utf8");
const orbitJs = readFileSync(join(ROOT, "web/orbit3d.js"), "utf8");

const scenarioIds = ["dock", "kitchen", "clinic", "tram", "library", "rooftop", "archive", "blackout", "farm", "station"];
for (const id of ["market", "greenhouse", "orbit", ...scenarioIds]) {
  check(`pack demo.${id}`, existsSync(join(ROOT, "data", `demo.${id}`, "pack.json")));
}
for (const id of ["market", "greenhouse", "orbit"]) {
  check(`nav demo.${id}`, existsSync(join(ROOT, "data", `demo.${id}`, "world/nav/nav." + id + ".json")));
}
check("gallery cards", (gallery.match(/class="demo-card"/g) || []).length >= 15);
check("gallery links", gallery.includes("iso.html?demo=market") && gallery.includes("iso.html?demo=greenhouse") && gallery.includes("orbit3d.html"));
for (const id of scenarioIds) check(`gallery scenario ${id}`, gallery.includes(`index.html?demo=demo.${id}`));
for (const image of ["harbor-2d", "harbor-3d", "market", "greenhouse", "orbit", "editor", "scenario"]) {
  check(`gallery image ${image}`, existsSync(join(ROOT, "web/images/demos", image + (image === "scenario" ? ".svg" : ".jpg"))));
}
check("demo catalog", existsSync(join(ROOT, "web/demos-data.js")));
check("gallery R-016", gallery.includes("data-theme-choice") && gallery.includes("lrds-theme"));
check("iso R-016", iso.includes("data-theme-choice") && iso.includes("lrds-theme"));
check("iso wasm", isoJs.includes("new PreviewWorld") && isoJs.includes("world.move_to") && isoJs.includes("demo.market") && isoJs.includes("demo.greenhouse"));
check("orbit R-016", orbit.includes("data-theme-choice") && orbit.includes("lrds-theme"));
check("orbit vendor", orbit.includes('"three": "./vendor/three/three.module.js"'));
check("orbit wasm", orbitJs.includes("new PreviewWorld") && orbitJs.includes("demo.orbit") && orbitJs.includes("world.pickup"));
check("orbit script", existsSync(join(ROOT, "data/demo.orbit/scripts/reactor.js")));
check("archive script", existsSync(join(ROOT, "data/demo.archive/scripts/archive.js")));
check("quickjs env shim", existsSync(join(ROOT, "web/vendor/quickjs-env.js")));
check("local only", !/https?:\/\//.test(gallery + iso + orbit));

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failed += 1;
}
if (failed) { console.error(`demos static: ${failed} 项失败`); process.exit(1); }
console.log("demos static PASS");
