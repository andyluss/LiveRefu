#!/usr/bin/env node
// 工作区共享静态 Web 服务：替代各项目的 `python3 -m http.server`，无第三方依赖。
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MIME = new Map(Object.entries({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".wasm": "application/wasm",
  ".data": "application/octet-stream",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
}));

export function createStaticServer({ root = process.cwd() } = {}) {
  const rootDir = resolve(root);
  return createServer(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end("Method Not Allowed");
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    } catch {
      res.writeHead(400).end("Bad Request");
      return;
    }
    let target = resolve(rootDir, "." + pathname);
    if (target !== rootDir && !target.startsWith(rootDir + sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    try {
      let info = await stat(target);
      if (info.isDirectory()) {
        if (!pathname.endsWith("/")) {
          res.writeHead(301, { Location: pathname + "/" }).end();
          return;
        }
        target = join(target, "index.html");
        info = await stat(target);
      }
      if (!info.isFile()) throw new Error("not a file");
      res.writeHead(200, {
        "Content-Type": MIME.get(extname(target).toLowerCase()) ?? "application/octet-stream",
        "Content-Length": info.size,
        "Cache-Control": "no-store",
        "Connection": "close",
      });
      if (req.method === "HEAD") res.end();
      else createReadStream(target).on("error", () => res.destroy()).pipe(res);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not Found");
    }
  });
}

export function parseArgs(argv) {
  const opts = { root: process.cwd(), port: 8787, bind: "127.0.0.1" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--root") opts.root = argv[++i];
    else if (arg === "--port") opts.port = Number(argv[++i]);
    else if (arg === "--bind") opts.bind = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log("用法: node tools/serve-static.mjs [--root DIR] [--port N] [--bind ADDR]");
      process.exit(0);
    } else {
      console.error(`未知参数: ${arg}`);
      process.exit(2);
    }
  }
  if (!Number.isInteger(opts.port) || opts.port < 0 || opts.port > 65535) {
    console.error("--port 必须是 0..65535 的整数");
    process.exit(2);
  }
  return opts;
}

export function runCli(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  const server = createStaticServer({ root: opts.root });
  server.listen(opts.port, opts.bind, () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : opts.port;
    console.log(`static web: http://${opts.bind}:${port}/ (root ${resolve(opts.root)})`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
