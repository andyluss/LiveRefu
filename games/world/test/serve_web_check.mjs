#!/usr/bin/env node
import { createStaticServer } from "../tools/serve-web.mjs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = createStaticServer({ root });
await new Promise((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
let failed = 0;
const check = async (path, status, type) => {
  const res = await fetch(base + path);
  const ok = res.status === status && (!type || (res.headers.get("content-type") ?? "").startsWith(type));
  console.log(`${ok ? "✓" : "✗"} ${path} ${res.status} ${res.headers.get("content-type") ?? ""}`);
  if (!ok) failed++;
};
await check("/web/demos.html", 200, "text/html");
await check("/web/", 200, "text/html");
await check("/web/README.md", 200, "text/markdown");
await check("/does-not-exist", 404);
await check("/%2e%2e%2fpackage.json", 403);
server.closeAllConnections?.();
await new Promise((resolvePromise) => server.close(resolvePromise));
if (failed) process.exit(1);
console.log("serve-web PASS");
