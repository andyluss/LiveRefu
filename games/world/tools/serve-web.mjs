#!/usr/bin/env node
// RefuWorld 兼容入口：实现统一在工作区 tools/serve-static.mjs。
export { createStaticServer, parseArgs, runCli } from "../../../tools/serve-static.mjs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { runCli } from "../../../tools/serve-static.mjs";

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
