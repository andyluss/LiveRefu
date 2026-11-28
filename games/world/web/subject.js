import init, { PreviewWorld } from "./pkg/world_wasm.js";

const W = 900;
const H = 650;
const TICK_US = 16666;
const PACK_URL = "./packs/demo.subject.data";
const RANGE = 6;
const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const el = {
  mode: document.getElementById("mode"),
  range: document.getElementById("range"),
  position: document.getElementById("position"),
  inventory: document.getElementById("inventory"),
  door: document.getElementById("door-state"),
  tick: document.getElementById("tick"),
  event: document.getElementById("event-line"),
  events: document.getElementById("events"),
  pickup: document.getElementById("pickup"),
  openDoor: document.getElementById("open-door"),
  inspect: document.getElementById("inspect"),
  pause: document.getElementById("pause"),
  reset: document.getElementById("reset"),
  l2: document.getElementById("l2-proof"),
  l3: document.getElementById("l3-proof"),
  l4: document.getElementById("l4-proof"),
  l5: document.getElementById("l5-proof"),
};

let world = null;
let pack = null;
let current = null;
let zone = null;
let paused = false;
let last = performance.now();
let acc = 0;
let keys = new Set();
let lastMove = [0, 0];
let trail = [];
let logs = [];
let error = "";

function setupCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
setupCanvas();

function css(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
function palette() {
  return {
    bg: css("--solid", "#0b1423"), ink: css("--ink", "#edf8ff"),
    dim: css("--dim", "#8fa8bd"), faint: css("--faint", "#5e7489"),
    line: css("--line", "rgba(104,206,231,.18)"), cyan: css("--cyan", "#5ee7ff"),
    amber: css("--amber", "#ffc36a"), pink: css("--pink", "#ff6d9e"),
    danger: css("--danger", "#ff766e"), green: css("--green", "#83edac"),
  };
}
function map() {
  const b = zone?.bounds ?? { min: [-10, 0, -8], max: [10, 4, 8] };
  const minX = b.min[0], maxX = b.max[0], minZ = b.min[2], maxZ = b.max[2];
  const pad = 46;
  const scale = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxZ - minZ));
  const ox = (W - (maxX - minX) * scale) / 2 - minX * scale;
  const oz = (H - (maxZ - minZ) * scale) / 2 - minZ * scale;
  return { minX, maxX, minZ, maxZ, scale, toScreen: (x, z) => [ox + x * scale, oz + z * scale], toWorld: (sx, sy) => [(sx - ox) / scale, (sy - oz) / scale] };
}
function player() {
  if (!current) return null;
  const s = current.state;
  return s.entities.find((e) => e.id.index === s.player.index && e.id.generation === s.player.generation) ?? null;
}
function findEntity(persistentId) {
  return current?.state?.entities?.find((e) => e.persistent_id === persistentId) ?? null;
}
function distanceTo(entity) {
  const p = player();
  if (!p || !entity) return Infinity;
  const a = p.transform.position, b = entity.transform.position;
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}
function isInside(x, z) {
  return x >= zone.bounds.min[0] && x <= zone.bounds.max[0] && z >= zone.bounds.min[2] && z <= zone.bounds.max[2];
}
function clock(minutes) {
  const m = ((Number(minutes) || 0) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;
}

function logEvent(event) {
  logs.push(`${String(current?.state?.tick ?? 0).padStart(4, "0")}  ${event.kind}${event.data?.text ? `  · ${event.data.text}` : ""}`);
  logs = logs.slice(-10);
  el.events.textContent = logs.length ? logs.join("\n") : "—";
}

function drainEvents() {
  try {
    const events = JSON.parse(world.poll_events());
    for (const event of events) logEvent(event);
  } catch {}
}

function updateHud() {
  if (!current) return;
  const s = current.state;
  const p = player();
  const door = findEntity("door");
  const pos = p?.transform.position ?? [0, 0, 0];
  const doorDistance = distanceTo(door);
  el.range.textContent = Number.isFinite(doorDistance) ? `${doorDistance.toFixed(1)}m / ${RANGE.toFixed(0)}m` : "—";
  el.range.className = doorDistance <= RANGE ? "range-good" : "range-bad";
  el.position.textContent = `${pos[0].toFixed(1)}, ${pos[2].toFixed(1)}`;
  const inventory = p?.inventory ?? [];
  el.inventory.textContent = inventory.length ? inventory.map((s) => `${s.item} ×${s.count}`).join(", ") : "empty";
  el.door.textContent = door?.door?.open ? "open" : "locked";
  el.door.style.color = door?.door?.open ? "var(--green)" : "var(--amber)";
  el.tick.textContent = String(s.tick);
  el.mode.textContent = paused ? "PAUSED · 60 Hz" : "RUNNING · 60 Hz";
  el.l2.textContent = `${Object.keys(pack?.schedules ?? {}).length} schedules · ${Object.keys(pack?.actors ?? {}).length} actors`;
  el.l3.textContent = `${Object.keys(s.flags ?? {}).length} flags · ${Object.keys(s.quests ?? {}).length} quests`;
  el.l4.textContent = s.social ? "present" : "absent";
  el.l5.textContent = s.systems ? "present" : "absent";
  el.l4.classList.toggle("absent", !s.social);
  el.l5.classList.toggle("absent", !s.systems);
  el.event.textContent = error || (logs.at(-1) ?? "WASD 接近 · 距离 ≤ 6m 才能交互");
}

function draw() {
  const c = palette();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
  if (!zone) return;
  const m = map();
  const [x0, z0] = m.toScreen(m.minX, m.minZ);
  const [x1, z1] = m.toScreen(m.maxX, m.maxZ);
  ctx.strokeStyle = c.line; ctx.lineWidth = 1;
  for (let x = Math.ceil(m.minX); x <= m.maxX; x++) {
    const [sx] = m.toScreen(x, m.minZ);
    ctx.beginPath(); ctx.moveTo(sx, z0); ctx.lineTo(sx, z1); ctx.stroke();
  }
  for (let z = Math.ceil(m.minZ); z <= m.maxZ; z++) {
    const [, sz] = m.toScreen(m.minX, z);
    ctx.beginPath(); ctx.moveTo(x0, sz); ctx.lineTo(x1, sz); ctx.stroke();
  }

  const door = findEntity("door");
  if (door) {
    const p = door.transform.position;
    const open = door.door?.open;
    const [sx, sz] = m.toScreen(p[0] - 0.6, p[2] - 0.25);
    ctx.fillStyle = open ? "rgba(131,237,172,.22)" : "rgba(255,195,106,.2)";
    ctx.strokeStyle = open ? c.green : c.amber;
    ctx.lineWidth = 2;
    ctx.fillRect(sx, sz, 1.2 * m.scale, 0.5 * m.scale);
    ctx.strokeRect(sx, sz, 1.2 * m.scale, 0.5 * m.scale);
    ctx.fillStyle = open ? c.green : c.amber;
    ctx.font = "9px ui-monospace, monospace";
    ctx.fillText(open ? "DOOR · OPEN" : "DOOR · LOCKED", sx, sz - 7);
  }
  const consoleEntity = findEntity("console");
  if (consoleEntity) {
    const p = consoleEntity.transform.position;
    const [sx, sz] = m.toScreen(p[0] - 0.75, p[2] - 0.5);
    ctx.fillStyle = "rgba(94,231,255,.14)";
    ctx.strokeStyle = c.cyan; ctx.lineWidth = 1.5;
    ctx.fillRect(sx, sz, 1.5 * m.scale, 1.0 * m.scale);
    ctx.strokeRect(sx, sz, 1.5 * m.scale, 1.0 * m.scale);
    ctx.fillStyle = c.cyan; ctx.fillText("CONSOLE", sx, sz - 7);
  }
  const keycard = findEntity("keycard");
  if (keycard) {
    const p = keycard.transform.position;
    const [sx, sz] = m.toScreen(p[0], p[2]);
    ctx.fillStyle = c.amber; ctx.shadowColor = c.amber; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(sx, sz - 8); ctx.lineTo(sx + 8, sz); ctx.lineTo(sx, sz + 8); ctx.lineTo(sx - 8, sz); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = c.ink; ctx.font = "9px ui-monospace, monospace"; ctx.fillText("KEYCARD", sx, sz - 12);
  }

  const p = player();
  if (p) {
    const pos = p.transform.position;
    const [sx, sz] = m.toScreen(pos[0], pos[2]);
    ctx.strokeStyle = "rgba(255,195,106,.22)"; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(sx, sz, RANGE * m.scale, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const path = current.state.path ?? [];
    if (path.length) {
      ctx.strokeStyle = c.cyan; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(sx, sz);
      for (const [wx, wz] of path.slice(current.state.path_index ?? 0)) { const [ax, az] = m.toScreen(wx, wz); ctx.lineTo(ax, az); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    trail.push([pos[0], pos[2]]); if (trail.length > 70) trail.shift();
    ctx.strokeStyle = "rgba(255,109,158,.32)"; ctx.lineWidth = 2; ctx.beginPath();
    trail.forEach(([tx, tz], i) => { const [ax, az] = m.toScreen(tx, tz); if (i === 0) ctx.moveTo(ax, az); else ctx.lineTo(ax, az); });
    ctx.stroke();
    ctx.fillStyle = c.pink; ctx.shadowColor = c.pink; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(sx, sz, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(sx - 2, sz - 2, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = c.line; ctx.lineWidth = 2; ctx.strokeRect(x0, z0, x1 - x0, z1 - z0);
  ctx.fillStyle = c.faint; ctx.font = "9px ui-monospace, monospace";
  ctx.fillText("ZONE.SUBJECT · L1 INTERACTION", x0, z0 - 10);
  ctx.textAlign = "right"; ctx.fillText(`tick ${current?.state?.tick ?? 0} · ${clock(current?.state?.clock_minutes ?? 0)}`, x1, z1 + 18); ctx.textAlign = "left";
}

function tickWorld() {
  if (!world) return;
  try {
    world.tick(TICK_US);
    current = JSON.parse(world.state());
    drainEvents();
  } catch (error) {
    error = String(error);
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(now - last, 100); last = now;
  if (!paused && world) {
    acc += dt;
    let guard = 0;
    while (acc >= TICK_US / 1000 && guard < 5) { tickWorld(); acc -= TICK_US / 1000; guard++; }
    if (guard >= 5) acc = 0;
  }
  draw(); updateHud();
}
function moveVector() {
  let x = 0, z = 0;
  if (keys.has("w") || keys.has("arrowup")) z -= 1;
  if (keys.has("s") || keys.has("arrowdown")) z += 1;
  if (keys.has("a") || keys.has("arrowleft")) x -= 1;
  if (keys.has("d") || keys.has("arrowright")) x += 1;
  if (x && z) { x *= .7071; z *= .7071; }
  return [x, z];
}
function syncMove() {
  if (!world) return;
  const [x, z] = moveVector();
  if (x !== lastMove[0] || z !== lastMove[1]) { world.set_move(x, z); lastMove = [x, z]; }
}
function act(kind) {
  if (!world) return;
  error = "";
  if (kind === "pickup") world.pickup("player", "item.subject.keycard");
  if (kind === "door") world.interact("player", "demo.subject.door");
  if (kind === "inspect") world.interact("player", "demo.subject.console");
  tickWorld();
  current = JSON.parse(world.state());
}
function bind() {
  window.addEventListener("keydown", (event) => {
    const k = event.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) event.preventDefault();
    if (k === " ") { paused = !paused; el.pause.textContent = paused ? "继续" : "暂停"; return; }
    if (k === "r") { reset(); return; }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { keys.add(k); syncMove(); }
  });
  window.addEventListener("keyup", (event) => { keys.delete(event.key.toLowerCase()); syncMove(); });
  window.addEventListener("blur", () => { keys.clear(); syncMove(); });
  canvas.addEventListener("click", (event) => {
    if (!world) return;
    const rect = canvas.getBoundingClientRect();
    const sx = (event.clientX - rect.left) * W / rect.width;
    const sy = (event.clientY - rect.top) * H / rect.height;
    const [x, z] = map().toWorld(sx, sy);
    if (isInside(x, z)) {
      world.move_to(x, z);
      tickWorld();
    }
  });
  el.pickup.addEventListener("click", () => act("pickup"));
  el.openDoor.addEventListener("click", () => act("door"));
  el.inspect.addEventListener("click", () => act("inspect"));
  el.pause.addEventListener("click", () => { paused = !paused; el.pause.textContent = paused ? "继续" : "暂停"; });
  el.reset.addEventListener("click", reset);
}
function reset() {
  if (!world) return;
  world.reset();
  current = JSON.parse(world.state());
  logs = []; trail = []; lastMove = [0, 0]; paused = false; error = "";
  el.pause.textContent = "暂停";
  el.events.textContent = "—";
  syncMove();
}
async function boot() {
  try {
    const response = await fetch(PACK_URL);
    if (!response.ok) throw new Error(`pack HTTP ${response.status}`);
    const text = await response.text();
    pack = JSON.parse(text);
    zone = pack.zones[pack.manifest.entry.start_zone];
    await init();
    world = new PreviewWorld(text);
    current = JSON.parse(world.state());
    bind();
    requestAnimationFrame(frame);
  } catch (error) {
    error = `L1 demo failed: ${error}`;
    el.event.textContent = error;
    el.mode.textContent = "ERROR";
    console.error(error);
  }
}
boot();
