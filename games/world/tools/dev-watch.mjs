#!/usr/bin/env node
// TS 内容开发监听：改 src/content → 编译 → worldc build → 复制 pack.data。
// 预览若由 `worldc editor` 提供，会通过 /api/pack-version 自动刷新。
import { copyFileSync, existsSync, watch } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SRC = join(ROOT, "src/content/demo.harbor");
const TS_OUT = join(ROOT, "dist/ts/demo.harbor");
const BUILD_OUT = join(ROOT, "dist/demo.harbor");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", stdio: "inherit" });
  return result.status === 0;
}

function build() {
  console.log("\n[dev] compile TS…");
  if (!run(process.execPath, [join(ROOT, "tools/ts-build.mjs"), "--src", SRC, "--out", TS_OUT])) return;
  console.log("[dev] build pack…");
  if (!run("bash", [join(ROOT, "worldc"), "build", "--pack", TS_OUT, "--out", BUILD_OUT])) return;
  const bundle = join(BUILD_OUT, "pack.data");
  if (existsSync(bundle)) {
    copyFileSync(bundle, join(ROOT, "web/pack.data"));
    console.log("[dev] copied web/pack.data");
  }
}

let timer = null;
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(build, 180);
}

build();
if (process.argv.includes("--once")) process.exit(0);
watch(SRC, { recursive: true }, schedule);
console.log(`[dev] watching ${SRC}（Ctrl-C 退出）`);
