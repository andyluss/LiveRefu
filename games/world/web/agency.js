import init, { PreviewWorld } from "./pkg/world_wasm.js";

const W = 900;
const H = 650;
const TICK_US = 16666;
const PACK_URL = "./packs/demo.agency.data";
const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const el = {
  mode: document.getElementById("mode"), clock: document.getElementById("clock"),
  tick: document.getElementById("tick"), actors: document.getElementById("actors"),
  paths: document.getElementById("paths"), behaviors: document.getElementById("behaviors"),
  event: document.getElementById("event-line"), schedule: document.getElementById("schedule-list"),
  events: document.getElementById("events"), l1: document.getElementById("l1-proof"),
  l3: document.getElementById("l3-proof"), l4: document.getElementById("l4-proof"), l5: document.getElementById("l5-proof"),
  pause: document.getElementById("pause"), speed: document.getElementById("speed"),
  jump5: document.getElementById("jump5"), jump9: document.getElementById("jump9"), reset: document.getElementById("reset"),
};

let world = null;
let pack = null;
let current = null;
let zone = null;
let paused = false;
let simSpeed = 1;
let acc = 0;
let last = performance.now();
let logs = [];
let trails = new Map();
let error = "";

function setupCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
setupCanvas();
function css(name, fallback) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; }
function palette() {
  return {
    bg: css("--solid", "#0b1423"), ink: css("--ink", "#edf8ff"), dim: css("--dim", "#8fa8bd"),
    faint: css("--faint", "#5e7489"), line: css("--line", "rgba(104,206,231,.18)"),
    cyan: css("--cyan", "#5ee7ff"), amber: css("--amber", "#ffc36a"),
    pink: css("--pink", "#ff6d9e"), green: css("--green", "#83edac"), violet: css("--violet", "#9b8cff"),
  };
}
const ACTOR_COLORS = ["#ff6d9e", "#5ee7ff", "#ffc36a"];
function map() {
  const b = zone?.bounds ?? { min: [-12, 0, -8], max: [12, 4, 8] };
  const minX = b.min[0], maxX = b.max[0], minZ = b.min[2], maxZ = b.max[2];
  const pad = 46;
  const scale = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxZ - minZ));
  const ox = (W - (maxX - minX) * scale) / 2 - minX * scale;
  const oz = (H - (maxZ - minZ) * scale) / 2 - minZ * scale;
  return { minX, maxX, minZ, maxZ, scale, toScreen: (x, z) => [ox + x * scale, oz + z * scale] };
}
function clock(minutes) {
  const m = ((Number(minutes) || 0) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;
}
function entities() { return current?.state?.entities ?? []; }
function actors() { return entities().filter((e) => e.kind === "actor"); }
function player() {
  if (!current) return null;
  const s = current.state;
  return s.entities.find((e) => e.id.index === s.player.index && e.id.generation === s.player.generation) ?? null;
}
function actorColor(entity, index) {
  const key = entity.persistent_id ?? entity.content_id;
  const hash = [...key].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  return ACTOR_COLORS[(hash + index) % ACTOR_COLORS.length];
}
function logEvent(event) {
  logs.push(`${String(current?.state?.tick ?? 0).padStart(5, "0")}  ${event.kind}${event.data?.entity ? `  · ${event.data.entity} → ${event.data.behavior}` : ""}`);
  logs = logs.slice(-12);
  el.events.textContent = logs.length ? logs.join("\n") : "—";
}
function drainEvents() {
  try { for (const event of JSON.parse(world.poll_events())) logEvent(event); } catch {}
}
function renderSchedule() {
  if (!pack) return;
  const scheduleByContent = new Map();
  for (const actor of actors()) scheduleByContent.set(actor.content_id, actor);
  const rows = [];
  for (const [contentId, def] of Object.entries(pack.actors)) {
    if (!def.brain?.schedule) continue;
    const stateActor = scheduleByContent.get(contentId);
    const schedule = pack.schedules[def.brain.schedule];
    if (!schedule || !stateActor) continue;
    const currentBehavior = stateActor.behavior;
    const entries = schedule.entries.map((entry) => {
      const active = entry.behavior === currentBehavior;
      return `<div class="schedule-entry ${active ? "active" : ""}"><span>${entry.from}–${entry.to} · ${entry.behavior}</span><span>${entry.target ? `[${entry.target.join(", ")}]` : ""}</span></div>`;
    }).join("");
    rows.push(`<div class="schedule-row"><b>${stateActor.persistent_id ?? contentId}<em>${currentBehavior ?? "—"}</em></b>${entries}</div>`);
  }
  el.schedule.innerHTML = rows.join("");
}
function updateHud() {
  if (!current) return;
  const s = current.state;
  const list = actors();
  const pathCount = Object.keys(s.npc_paths ?? {}).length;
  el.clock.textContent = clock(s.clock_minutes);
  el.tick.textContent = String(s.tick);
  el.actors.textContent = String(list.length);
  el.paths.textContent = `${pathCount} active`;
  el.behaviors.textContent = list.map((a) => a.behavior ?? "—").join(" / ");
  el.mode.textContent = `${paused ? "PAUSED" : "SIM"} ×${simSpeed} · 60 Hz`;
  el.l1.textContent = "0 commands · 0 inventory";
  el.l3.textContent = `${Object.keys(s.flags ?? {}).length} flags · ${Object.keys(s.quests ?? {}).length} quests`;
  el.l4.textContent = s.social ? "present" : "absent";
  el.l5.textContent = s.systems ? "present" : "absent";
  el.l4.classList.toggle("absent", !s.social);
  el.l5.classList.toggle("absent", !s.systems);
  el.event.textContent = error || (logs.at(-1) ?? "日程驱动 behavior · 行为驱动路径");
  renderSchedule();
}
function pathFor(entity) {
  const key = entity.persistent_id ?? entity.content_id;
  return current?.state?.npc_paths?.[key] ?? null;
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
  for (let x = Math.ceil(m.minX); x <= m.maxX; x++) { const [sx] = m.toScreen(x, m.minZ); ctx.beginPath(); ctx.moveTo(sx, z0); ctx.lineTo(sx, z1); ctx.stroke(); }
  for (let z = Math.ceil(m.minZ); z <= m.maxZ; z++) { const [, sz] = m.toScreen(m.minX, z); ctx.beginPath(); ctx.moveTo(x0, sz); ctx.lineTo(x1, sz); ctx.stroke(); }

  const p = player();
  if (p) {
    const [sx, sz] = m.toScreen(p.transform.position[0], p.transform.position[2]);
    ctx.fillStyle = "rgba(143,168,189,.6)"; ctx.beginPath(); ctx.arc(sx, sz, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.faint; ctx.font = "8px ui-monospace, monospace"; ctx.fillText("player", sx + 7, sz + 3);
  }

  actors().forEach((actor, index) => {
    const color = actorColor(actor, index);
    const pos = actor.transform.position;
    const [sx, sz] = m.toScreen(pos[0], pos[2]);
    const path = pathFor(actor);
    if (path) {
      ctx.strokeStyle = color; ctx.globalAlpha = .34; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.moveTo(sx, sz);
      for (const waypoint of path.path.slice(path.index ?? 0)) { const [ax, az] = m.toScreen(waypoint[0], waypoint[1]); ctx.lineTo(ax, az); }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      const [tx, tz] = m.toScreen(path.target[0], path.target[1]);
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(tx, tz, 8, 0, Math.PI * 2); ctx.stroke();
    }
    let trail = trails.get(actor.persistent_id);
    if (!trail) { trail = []; trails.set(actor.persistent_id, trail); }
    trail.push([pos[0], pos[2]]); if (trail.length > 80) trail.shift();
    ctx.strokeStyle = color; ctx.globalAlpha = .26; ctx.lineWidth = 2; ctx.beginPath();
    trail.forEach(([tx, tz], i) => { const [ax, az] = m.toScreen(tx, tz); if (i === 0) ctx.moveTo(ax, az); else ctx.lineTo(ax, az); });
    ctx.stroke(); ctx.globalAlpha = 1;

    ctx.shadowColor = color; ctx.shadowBlur = 16; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(sx, sz, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = c.ink; ctx.font = "8px ui-monospace, monospace";
    ctx.fillText(`${actor.persistent_id ?? actor.content_id} · ${actor.behavior ?? "—"}`, sx + 10, sz - 8);
  });

  ctx.strokeStyle = c.line; ctx.lineWidth = 2; ctx.strokeRect(x0, z0, x1 - x0, z1 - z0);
  ctx.fillStyle = c.faint; ctx.font = "9px ui-monospace, monospace";
  ctx.fillText("ZONE.AGENCY · L2 SCHEDULE / BEHAVIOR", x0, z0 - 10);
  ctx.textAlign = "right"; ctx.fillText(`clock ${clock(current?.state?.clock_minutes ?? 0)} · tick ${current?.state?.tick ?? 0}`, x1, z1 + 18); ctx.textAlign = "left";
}

function advanceTicks(count) {
  if (!world) return;
  try {
    for (let i = 0; i < count; i++) world.tick(TICK_US);
    current = JSON.parse(world.state());
    drainEvents();
  } catch (error) { error = String(error); }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(now - last, 100); last = now;
  if (!paused && world) {
    acc += dt;
    let guard = 0;
    while (acc >= TICK_US / 1000 && guard < 6) {
      advanceTicks(simSpeed);
      acc -= TICK_US / 1000;
      guard++;
    }
    if (guard >= 6) acc = 0;
  }
  draw(); updateHud();
}
function jumpTo(hour, minute = 0) {
  const target = hour * 60 + minute;
  let ticks = Math.max(0, Math.round((target - current.state.clock_minutes) * 60));
  if (ticks > 9000) ticks = 9000;
  advanceTicks(ticks);
}
function reset() {
  if (!world) return;
  world.reset(); current = JSON.parse(world.state()); logs = []; trails = new Map();
  paused = false; error = ""; simSpeed = 1; el.pause.textContent = "暂停";
  el.speed.textContent = "×1"; el.events.textContent = "—"; acc = 0;
}
function bind() {
  window.addEventListener("keydown", (event) => {
    const k = event.key.toLowerCase();
    if (k === " ") { event.preventDefault(); paused = !paused; el.pause.textContent = paused ? "继续" : "暂停"; }
    if (k === "r") reset();
  });
  el.pause.addEventListener("click", () => { paused = !paused; el.pause.textContent = paused ? "继续" : "暂停"; });
  el.speed.addEventListener("click", () => {
    simSpeed = simSpeed === 1 ? 60 : simSpeed === 60 ? 300 : 1;
    el.speed.textContent = `×${simSpeed}`;
  });
  el.jump5.addEventListener("click", () => jumpTo(8, 0));
  el.jump9.addEventListener("click", () => jumpTo(9, 0));
  el.reset.addEventListener("click", reset);
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
    error = `L2 demo failed: ${error}`;
    el.event.textContent = error; el.mode.textContent = "ERROR";
    console.error(error);
  }
}
boot();
