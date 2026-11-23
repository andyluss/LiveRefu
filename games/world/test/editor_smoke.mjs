#!/usr/bin/env node
// 编辑器服务器 API 冒烟：临时包 → 保存 → 校验 → 构建。
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const PORT = 8799;
const tmp = mkdtempSync(join(tmpdir(), "refuworld-editor-"));
cpSync(join(ROOT, "data/demo.harbor"), tmp, { recursive: true });

const server = spawn("node", [join(ROOT, "tools/editor-server.mjs"), "--pack", tmp, "--port", String(PORT)], {
  cwd: ROOT,
  stdio: ["ignore", "pipe", "pipe"],
});
let stderr = "";
server.stderr.on("data", (chunk) => { stderr += chunk; });

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`editor server 未启动: ${stderr}`);
}

try {
  await waitForServer();
  const pack = await fetch(`http://127.0.0.1:${PORT}/api/pack`).then((r) => r.json());
  if (!pack.files || Object.keys(pack.files).length < 10) throw new Error("pack files 不完整");
  if (!pack.files["assets/assets.index.json"]) throw new Error("assets 未加载");
  if (!pack.files["world/nav/nav.harbor.json"]) throw new Error("nav 未加载");

  const zoneKey = Object.keys(pack.files).find((k) => k.startsWith("world/zones/"));
  const zone = pack.files[zoneKey];
  zone.placements[0].at[0] = 5.5;
  let res = await fetch(`http://127.0.0.1:${PORT}/api/file`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: zoneKey, data: zone }),
  });
  if (!res.ok) throw new Error(`保存失败 HTTP ${res.status}`);

  const saved = JSON.parse(readFileSync(join(tmp, zoneKey), "utf8"));
  if (saved.placements[0].at[0] !== 5.5) throw new Error("保存未落盘");

  const bad = structuredClone(saved);
  bad.placements[0].actor = "demo.missing";
  res = await fetch(`http://127.0.0.1:${PORT}/api/file`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: zoneKey, data: bad }),
  });
  if (res.status !== 422) throw new Error(`坏内容应被拒绝，实际 HTTP ${res.status}`);
  const afterBad = JSON.parse(readFileSync(join(tmp, zoneKey), "utf8"));
  if (afterBad.placements[0].actor !== "demo.keeper") {
    throw new Error("坏内容未被回滚");
  }

  res = await fetch(`http://127.0.0.1:${PORT}/api/bake`, { method: "POST" });
  const baked = await res.json();
  if (!res.ok || !baked.ok) throw new Error(`烘焙失败: ${baked.error}`);
  if (!existsSync(join(tmp, "world/nav/nav.harbor.json"))) throw new Error("导航文件未生成");

  res = await fetch(`http://127.0.0.1:${PORT}/api/validate`, { method: "POST" });
  const validation = await res.json();
  if (!validation.ok) throw new Error(`校验失败: ${JSON.stringify(validation.errors)}`);

  res = await fetch(`http://127.0.0.1:${PORT}/api/build`, { method: "POST" });
  const build = await res.json();
  if (!res.ok || !build.ok) throw new Error(`构建失败: ${build.error}`);

  console.log("editor smoke PASS");
} finally {
  server.kill("SIGTERM");
  rmSync(tmp, { recursive: true, force: true });
}
