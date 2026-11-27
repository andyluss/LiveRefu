import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(join(ROOT, name), "utf8");
const html = read("index.html");
const css = read("style.css");
const game = read("game.mjs");
const sw = read("sw.js");
const manifest = JSON.parse(read("manifest.webmanifest"));

for (const file of ["index.html", "style.css", "logic.mjs", "audio.mjs", "game.mjs", "manifest.webmanifest", "sw.js", "icon.svg", "icon-192.png", "icon-512.png"]) {
  assert.ok(existsSync(join(ROOT, file)), `missing ${file}`);
}
for (const id of ["board", "hold", "next", "score", "level", "lines", "overlay", "primary", "sound", "status"]) {
  assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
}
assert.ok(html.includes('data-theme-choice="system"') && html.includes('data-theme-choice="light"') && html.includes('data-theme-choice="dark"'));
assert.ok(html.includes("lrds-theme"));
assert.ok(html.includes("data-theme"));
assert.ok(html.includes("aria-pressed"));
assert.ok(css.includes("prefers-reduced-motion"));
assert.ok(css.includes("color-scheme"));
assert.ok(game.includes("TetrisGame") && game.includes("requestAnimationFrame"));
assert.ok(!game.includes("https://") && !html.includes("https://"), "no external runtime dependencies");
assert.equal(manifest.display, "standalone");
assert.ok(manifest.icons.some((i) => i.sizes === "192x192") && manifest.icons.some((i) => i.sizes === "512x512"));
assert.ok(sw.includes("./index.html") && sw.includes("./game.mjs"));
console.log("✓ tetris files / UI / R-016 / PWA / offline shell");
console.log("static PASS");
