#!/usr/bin/env node
import { createStaticServer } from "./serve-static.mjs";
const server = createStaticServer({ root: process.cwd() });
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
let failed = 0;
const check = async (path, status, type) => {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  const ok = res.status === status && (!type || (res.headers.get("content-type") ?? "").startsWith(type));
  console.log(`${ok ? "✓" : "✗"} ${path} ${res.status}`);
  if (!ok) failed++;
};
await check("/HUB.html", 200, "text/html");
await check("/tools/README.md", 200, "text/markdown");
await check("/does-not-exist", 404);
await check("/%2e%2e%2fpackage.json", 403);
server.closeAllConnections?.();
await new Promise((resolve) => server.close(resolve));
if (failed) process.exit(1);
console.log("serve-static PASS");
