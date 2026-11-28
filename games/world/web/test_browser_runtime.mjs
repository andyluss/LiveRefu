#!/usr/bin/env node
// Real browser smoke for the 2D / 2.5D / 3D Web hosts.
// Uses CDP directly (no Playwright dependency). Requires CHROME_BIN or a local Chrome.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = resolve(import.meta.dirname, "..");
const PORT = 8787;
const TAB_PORT = 9231;
const CANDIDATES = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const chromeBin = CANDIDATES.find((p) => existsSync(p));
if (!chromeBin) {
  console.error("browser runtime: Chrome not found; set CHROME_BIN");
  process.exit(2);
}

const server = spawn("node", [join(ROOT, "tools/serve-web.mjs"), "--port", String(PORT)], { cwd: ROOT, stdio: "ignore" });
const profile = mkdtempSync(join(tmpdir(), "refuworld-browser-"));
const chrome = spawn(chromeBin, [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
  "--use-gl=angle", "--use-angle=swiftshader",
  `--remote-debugging-port=${TAB_PORT}`, `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
let chromeErr = "";
chrome.stderr.on("data", (chunk) => { chromeErr += chunk; });

async function waitFor(url, attempts = 80) {
  for (let i = 0; i < attempts; i++) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await sleep(100);
  }
  throw new Error(`timeout waiting for ${url}`);
}

let ws;
let nextId = 0;
const pending = new Map();
const errors = [];
function send(method, params = {}) {
  return new Promise((resolvePromise, reject) => {
    const id = ++nextId;
    pending.set(id, { resolvePromise, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error(`CDP timeout ${method}`)); }
    }, 12000);
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "evaluate failed");
  return result.result?.value;
}

try {
  await waitFor(`http://127.0.0.1:${PORT}/web/index.html`);
  await waitFor(`http://127.0.0.1:${TAB_PORT}/json/version`);
  const pages = await (await fetch(`http://127.0.0.1:${TAB_PORT}/json/list`)).json();
  const page = pages.find((p) => p.type === "page");
  if (!page) throw new Error("no Chrome page target");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => { ws.onopen = resolvePromise; ws.onerror = reject; });
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message)); else p.resolvePromise(msg.result ?? {});
      return;
    }
    if (msg.method === "Runtime.exceptionThrown") {
      errors.push(msg.params.exceptionDetails?.exception?.description ?? msg.params.exceptionDetails?.text ?? "exception");
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      errors.push(msg.params.args?.map((a) => a.value ?? a.description ?? "").join(" "));
    }
  };
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Log.enable");

  const pagesToCheck = [
    ["L0", "/web/spacetime.html"],
    ["L1", "/web/subject.html"],
    ["L2", "/web/agency.html"],
    ["2D", "/web/index.html"],
    ["2.5D", "/web/iso.html?demo=market"],
    ["3D", "/web/solarfarm3d.html"],
  ];
  const report = [];
  for (const [label, path] of pagesToCheck) {
    const before = errors.length;
    await send("Page.navigate", { url: `http://127.0.0.1:${PORT}${path}` });
    await sleep(3500);
    let status;
    try {
      status = await evaluate(`(() => {
        const cs = [...document.querySelectorAll('canvas')];
        return {
          ready: document.readyState,
          title: document.title,
          canvases: cs.map((c) => [c.id || c.className || 'canvas', c.width, c.height]),
          text: (document.body?.innerText || '').slice(0, 80)
        };
      })()`);
    } catch (error) {
      status = { error: String(error) };
    }
    const pageErrors = errors.slice(before);
    const canvasOk = Array.isArray(status.canvases) && status.canvases.some(([, w, h]) => w > 0 && h > 0);
    report.push({ label, path, canvasOk, pageErrors, status });
    if (!canvasOk || pageErrors.length) {
      errors.push(`${label}: no canvas or runtime errors`);
    }
  }
  for (const row of report) {
    console.log(`${row.canvasOk && !row.pageErrors.length ? "PASS" : "FAIL"} ${row.label} ${row.path}`);
    if (row.pageErrors.length) console.log("  errors:", row.pageErrors.slice(0, 3));
  }
  if (errors.length) {
    console.error("browser runtime FAIL");
    console.error(errors.slice(-8).join("\n"));
    process.exitCode = 1;
  } else {
    console.log("browser runtime PASS (L0 / L1 / L2 / 2D / 2.5D / 3D)");
  }
} catch (error) {
  console.error("browser runtime FAIL:", error.message);
  if (chromeErr) console.error(chromeErr.split("\n").slice(-5).join("\n"));
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch {}
  chrome.kill("SIGTERM");
  server.kill("SIGTERM");
  await sleep(250);
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {}
}
