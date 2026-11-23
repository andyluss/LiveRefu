#!/usr/bin/env node
// RefuWorld TypeScript DSL → 规范化内容包（M1）。
// 运行：node tools/ts-build.mjs --src src/content/demo.harbor --out dist/ts/demo.harbor
//
// 说明：Node 24 直接执行带类型标注的 .ts（type stripping）；不做类型检查。
// 类型检查由编辑器/未来的 tsc 任务负责；编译期只保证结构可被 worldc 校验。

import { mkdirSync, readdirSync, rmSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import * as dsl from "#world-authoring";

function parseArgs(argv) {
  const args = { src: "src/content/demo.harbor", out: "dist/ts/demo.harbor" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--src") args.src = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log("ts-build --src <dir> --out <dir>");
      process.exit(0);
    } else {
      throw new Error(`未知参数: ${argv[i]}`);
    }
  }
  return args;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) out.push(...walk(path));
    else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) out.push(path);
  }
  return out;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function byKind(defs, kind) {
  return defs.filter((d) => d.kind === kind);
}

function one(defs, kind, label) {
  const found = byKind(defs, kind);
  if (found.length !== 1) {
    throw new Error(`${label}: 需要且只能有一个 ${kind}，实际 ${found.length}`);
  }
  return found[0];
}

function idOf(def, kind) {
  const id = def.data?.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`${kind} 缺少 id（来源 ${def.source}）`);
  }
  return id;
}

function assertUnique(defs, kind) {
  const seen = new Map();
  for (const def of byKind(defs, kind)) {
    const id = kind === "loc" ? def.locale : idOf(def, kind);
    if (typeof id !== "string" || id.length === 0) {
      throw new Error(`${kind} 缺少键（来源 ${def.source}）`);
    }
    if (seen.has(id)) {
      throw new Error(`${kind} 重复键=${id}（${seen.get(id)} 与 ${def.source}）`);
    }
    seen.set(id, def.source);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const src = resolve(args.src);
  const out = resolve(args.out);
  const files = walk(src);
  if (files.length === 0) throw new Error(`没有找到 .ts 文件: ${src}`);

  dsl.reset();
  for (const file of files) {
    dsl.setSource(file);
    await import(pathToFileURL(file).href);
  }
  const defs = dsl.take();

  const pack = one(defs, "pack", "内容包").data;
  const world = one(defs, "world", "世界").data;
  for (const kind of ["zone", "actor", "prop", "item", "rule", "quest", "dialogue", "schedule", "loc"]) {
    assertUnique(defs, kind);
  }

  rmSync(out, { recursive: true, force: true });
  writeJson(join(out, "pack.json"), pack);

  const worldPath = pack.entry?.world;
  if (typeof worldPath !== "string" || !worldPath.endsWith(".json")) {
    throw new Error("pack.entry.world 必须是 .json 路径");
  }
  writeJson(join(out, worldPath), world);

  const dirs = {
    zone: "world/zones",
    actor: "world/actors",
    prop: "world/props",
    item: "world/items",
    rule: "rules",
    quest: "quests",
    dialogue: "dialogue",
    schedule: "schedules",
  };
  for (const [kind, dir] of Object.entries(dirs)) {
    for (const def of byKind(defs, kind)) {
      writeJson(join(out, dir, `${idOf(def, kind)}.json`), def.data);
    }
  }
  for (const def of byKind(defs, "loc")) {
    if (typeof def.locale !== "string" || def.locale.length === 0) {
      throw new Error(`loc 缺少 locale（来源 ${def.source}）`);
    }
    writeJson(join(out, "loc", `${def.locale}.json`), def.data);
  }

  const counts = Object.fromEntries(
    Object.keys(dirs).map((kind) => [kind, byKind(defs, kind).length]),
  );
  console.log(`ts-build: ${src} -> ${out}`);
  console.log(JSON.stringify({ pack: pack.id, world: world.id, counts }));
}

main().catch((error) => {
  console.error(`ts-build: ${error.message}`);
  process.exitCode = 1;
});
