#!/usr/bin/env node
// RefuWorld M1 本地编辑器服务器：读写 JSON 内容包、校验、构建、复制预览包。
// 仅绑定 127.0.0.1；不做鉴权，供本机开发使用。

import { createServer } from "node:http";
import {
  existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { dirname, extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const packDir = resolve(arg("pack", join(ROOT, "data/demo.harbor")));
const webDir = join(ROOT, "web");
const distDir = join(ROOT, "dist/demo.harbor");
const port = Number(arg("port", "8788"));

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function jsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => join(dir, f));
}

function loadPackFiles() {
  const manifest = readJson(join(packDir, "pack.json"));
  const files = { "pack.json": manifest };
  const worldPath = manifest.entry?.world;
  if (typeof worldPath === "string") files[worldPath] = readJson(join(packDir, worldPath));
  const dirs = [
    "world/zones", "world/actors", "world/props", "world/items",
    "rules", "quests", "dialogue", "schedules", "loc",
  ];
  for (const dir of dirs) {
    for (const path of jsonFiles(join(packDir, dir))) {
      const rel = relative(packDir, path).split(sep).join("/");
      files[rel] = readJson(path);
    }
  }
  return { root: packDir, files };
}

function runWorldc(args) {
  const result = spawnSync("bash", [join(ROOT, "worldc"), ...args], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function validate() {
  const result = runWorldc(["validate", "--pack", packDir, "--json"]);
  let json = null;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    json = { ok: false, errors: [{ code: "E-TOOL", path: "worldc", message: result.stderr || result.stdout }] };
  }
  return { ...result, json };
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolvePromise, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("请求体过大"));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", () => resolvePromise(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "editor.html" : pathname.replace(/^\/+/, "");
  const full = resolve(webDir, normalize(rel));
  if (!full.startsWith(webDir + sep) && full !== webDir) {
    res.writeHead(403); res.end("forbidden"); return;
  }
  if (!existsSync(full) || !statSync(full).isFile()) {
    res.writeHead(404); res.end("not found"); return;
  }
  const ext = extname(full);
  res.writeHead(200, {
    "content-type": MIME[ext] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  res.end(readFileSync(full));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname === "/api/health") {
      sendJson(res, 200, { ok: true, pack: packDir, port });
      return;
    }
    if (pathname === "/api/pack-version") {
      const bundle = join(webDir, "pack.data");
      sendJson(res, 200, { mtime: existsSync(bundle) ? statSync(bundle).mtimeMs : 0 });
      return;
    }
    if (pathname === "/api/pack" && req.method === "GET") {
      sendJson(res, 200, loadPackFiles());
      return;
    }
    if (pathname === "/api/file" && req.method === "PUT") {
      const body = JSON.parse(await readBody(req));
      const rel = String(body.path ?? "").replace(/\\/g, "/");
      const full = resolve(packDir, normalize(rel));
      if (!full.startsWith(packDir + sep) || !full.endsWith(".json")) {
        sendJson(res, 400, { ok: false, error: "非法路径" });
        return;
      }
      const previous = existsSync(full) ? readFileSync(full) : null;
      writeJson(full, body.data);
      const check = validate();
      if (!check.json.ok) {
        if (previous !== null) writeFileSync(full, previous);
        else try { rmSync(full); } catch {}
        sendJson(res, 422, { ok: false, error: "内容校验失败，已回滚", errors: check.json.errors });
        return;
      }
      sendJson(res, 200, { ok: true, path: rel, warnings: check.json.warnings });
      return;
    }
    if (pathname === "/api/validate" && req.method === "POST") {
      const result = validate();
      sendJson(res, 200, { ok: result.json.ok, ...result.json, stdout: result.stdout, stderr: result.stderr });
      return;
    }
    if (pathname === "/api/build" && req.method === "POST") {
      const result = runWorldc(["build", "--pack", packDir, "--out", distDir]);
      if (result.status !== 0) {
        sendJson(res, 500, { ok: false, error: result.stderr || result.stdout });
        return;
      }
      const bundle = join(distDir, "pack.data");
      if (!existsSync(bundle)) {
        sendJson(res, 500, { ok: false, error: "构建未产出 pack.data" });
        return;
      }
      writeFileSync(join(webDir, "pack.data"), readFileSync(bundle));
      sendJson(res, 200, { ok: true, output: result.stdout, pack_data: join(webDir, "pack.data") });
      return;
    }
    if (pathname.startsWith("/api/")) {
      sendJson(res, 404, { ok: false, error: "未知 API" });
      return;
    }
    serveStatic(req, res, pathname);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: String(error?.message ?? error) });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`RefuWorld editor: http://127.0.0.1:${port}/`);
  console.log(`pack: ${packDir}`);
  console.log(`preview: http://127.0.0.1:${port}/index.html`);
});
