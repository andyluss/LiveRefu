import init, { PreviewWorld } from "./pkg/world_wasm.js";

const W = 900;
const H = 650;
const TICK_US = 16666;
const PACK_URL = "./packs/demo.society.data";
const RANGE = 7;
const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const el = {
  mode: document.getElementById("mode"), reputation: document.getElementById("reputation"),
  targetName: document.getElementById("target-name"), relation: document.getElementById("relation"),
  factionCount: document.getElementById("faction-count"), factions: document.getElementById("factions"),
  event: document.getElementById("event-line"), events: document.getElementById("events"),
  talk: document.getElementById("talk"), support: document.getElementById("support"), thank: document.getElementById("thank"),
  propose: document.getElementById("propose"), mediate: document.getElementById("mediate"), insult: document.getElementById("insult"),
  pause: document.getElementById("pause"), reset: document.getElementById("reset"),
  l2: document.getElementById("l2-proof"), l3: document.getElementById("l3-proof"), l5: document.getElementById("l5-proof"),
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
let selected = "grower_a";
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
    pink: css("--pink", "#ff6d9e"), green: css("--green", "#83edac"), danger: css("--danger", "#ff766e"),
  };
}
function map() {
  const b = zone?.bounds ?? { min: [-10, 0, -7], max: [10, 4, 7] };
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
function actors() { return current?.state?.entities?.filter((e) => e.kind === "actor") ?? []; }
function byPersistent(id) { return current?.state?.entities?.find((e) => e.persistent_id === id) ?? null; }
function target() { return byPersistent(selected); }
function loc(key) {
  const table = pack?.loc?.["zh-CN"] ?? pack?.loc ?? {};
  return table[String(key ?? "").replace(/^loc:/, "")] ?? key;
}
function clock(minutes) { const m = ((Number(minutes) || 0) % 1440 + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`; }
function selectedFaction() {
  const t = target();
  if (!t) return null;
  for (const [id, faction] of Object.entries(current?.state?.social?.factions ?? {})) {
    if (faction.members.includes(t.content_id)) return [id, faction];
  }
  return null;
}
function relationship(a, b) {
  const social = current?.state?.social;
  if (!social) return null;
  const [x, y] = a <= b ? [a, b] : [b, a];
  return social.relationships[`${x}|${y}`] ?? null;
}
function status(value) {
  if (value >= 10) return "盟友";
  if (value <= -10) return "敌对";
  return "中立";
}
function logEvent(event) {
  let detail = "";
  if (event.kind === "relationship_changed") detail = ` · trust ${event.data.trust} / affinity ${event.data.affinity}`;
  else if (event.kind === "reputation_changed") detail = ` · ${event.data.value}`;
  else if (event.kind === "faction_trust_changed") detail = ` · ${event.data.faction} ${event.data.trust}`;
  else if (event.data?.text) detail = ` · ${event.data.text}`;
  logs.push(`${String(current?.state?.tick ?? 0).padStart(4, "0")}  ${event.kind}${detail}`);
  logs = logs.slice(-12);
  el.events.textContent = logs.length ? logs.join("\n") : "—";
}
function drainEvents() {
  try { for (const event of JSON.parse(world.poll_events())) logEvent(event); } catch {}
}
function renderFactions() {
  if (!current) return;
  const social = current.state.social;
  if (!social) return;
  el.reputation.textContent = String(social.reputation?.player ?? 0);
  el.factionCount.textContent = String(Object.keys(social.factions).length);
  const rows = Object.entries(social.factions).map(([id, faction]) => {
    const width = Math.round((faction.trust + 100) / 2);
    return `<div class="faction-row"><div class="faction-head"><span>${loc(faction.name)}</span><b>${faction.trust}</b></div><div class="faction-bar"><i style="width:${width}%"></i></div><div class="faction-meta">${faction.members.length} members · ${status(faction.trust)}</div></div>`;
  });
  el.factions.innerHTML = rows.join("");
  const t = target();
  el.targetName.textContent = t ? loc(pack.actors?.[t.content_id]?.name ?? t.content_id) : "—";
  const rel = t ? relationship("player", t.content_id) : null;
  el.relation.textContent = rel ? `trust ${rel.trust} · affinity ${rel.affinity} · ${rel.interactions}x` : "尚未建立";
}
function updateHud() {
  if (!current) return;
  const s = current.state;
  el.mode.textContent = paused ? "PAUSED · 60 Hz" : "RUNNING · 60 Hz";
  el.l2.textContent = `${Object.keys(pack?.schedules ?? {}).length} schedules`;
  el.l3.textContent = `${Object.keys(s.flags ?? {}).length} flags · ${Object.keys(s.quests ?? {}).length} quests`;
  el.l5.textContent = s.systems ? "present" : "absent";
  el.l5.classList.toggle("absent", !s.systems);
  renderFactions();
  el.event.textContent = error || (logs.at(-1) ?? "点击 NPC 选择目标，再选择社会动作");
}
function draw() {
  const c = palette();
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
  if (!zone) return;
  const m = map();
  const [x0, z0] = m.toScreen(m.minX, m.minZ);
  const [x1, z1] = m.toScreen(m.maxX, m.maxZ);
  // two faction fields
  ctx.fillStyle = "rgba(255,195,106,.045)"; ctx.fillRect(x0, z0, (x1 - x0) / 2, z1 - z0);
  ctx.fillStyle = "rgba(94,231,255,.045)"; ctx.fillRect((x0 + x1) / 2, z0, (x1 - x0) / 2, z1 - z0);
  ctx.strokeStyle = c.line; ctx.lineWidth = 1;
  for (let x = Math.ceil(m.minX); x <= m.maxX; x++) { const [sx] = m.toScreen(x, m.minZ); ctx.beginPath(); ctx.moveTo(sx, z0); ctx.lineTo(sx, z1); ctx.stroke(); }
  for (let z = Math.ceil(m.minZ); z <= m.maxZ; z++) { const [, sz] = m.toScreen(m.minX, z); ctx.beginPath(); ctx.moveTo(x0, sz); ctx.lineTo(x1, sz); ctx.stroke(); }

  // initial / live NPC-NPC relationships
  const relations = Object.values(current?.state?.social?.relationships ?? {});
  for (const rel of relations) {
    if (!rel.a.startsWith("demo.") || !rel.b.startsWith("demo.")) continue;
    const a = current.state.entities.find((e) => e.content_id === rel.a);
    const b = current.state.entities.find((e) => e.content_id === rel.b);
    if (!a || !b) continue;
    const [ax, az] = m.toScreen(a.transform.position[0], a.transform.position[2]);
    const [bx, bz] = m.toScreen(b.transform.position[0], b.transform.position[2]);
    ctx.strokeStyle = rel.trust >= 0 ? "rgba(131,237,172,.32)" : "rgba(255,118,110,.4)";
    ctx.lineWidth = Math.max(1, Math.min(4, 1 + Math.abs(rel.trust) / 8));
    ctx.beginPath(); ctx.moveTo(ax, az); ctx.lineTo(bx, bz); ctx.stroke();
  }

  actors().forEach((actor) => {
    const faction = Object.entries(current.state.social?.factions ?? {}).find(([, f]) => f.members.includes(actor.content_id));
    const color = faction?.[1].color ?? c.dim;
    const [sx, sz] = m.toScreen(actor.transform.position[0], actor.transform.position[2]);
    if (actor.persistent_id === selected) {
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(sx, sz, 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(sx, sz, 8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = c.ink; ctx.font = "8px ui-monospace, monospace";
    ctx.fillText(loc(pack.actors?.[actor.content_id]?.name ?? actor.content_id), sx + 11, sz - 7);
    if (faction) { ctx.fillStyle = color; ctx.font = "7px ui-monospace, monospace"; ctx.fillText(faction[0].replace("faction.", "F/"), sx + 11, sz + 6); }
  });

  const p = player();
  if (p) {
    const pos = p.transform.position; const [sx, sz] = m.toScreen(pos[0], pos[2]);
    ctx.strokeStyle = "rgba(255,195,106,.22)"; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(sx, sz, RANGE * m.scale, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const t = target();
    if (t) {
      const [tx, tz] = m.toScreen(t.transform.position[0], t.transform.position[2]);
      ctx.strokeStyle = "rgba(237,248,255,.22)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sz); ctx.lineTo(tx, tz); ctx.stroke();
    }
    const path = current.state.path ?? [];
    if (path.length) {
      ctx.strokeStyle = c.cyan; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(sx, sz);
      for (const [wx, wz] of path.slice(current.state.path_index ?? 0)) { const [ax, az] = m.toScreen(wx, wz); ctx.lineTo(ax, az); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    trail.push([pos[0], pos[2]]); if (trail.length > 70) trail.shift();
    ctx.strokeStyle = "rgba(255,109,158,.3)"; ctx.lineWidth = 2; ctx.beginPath();
    trail.forEach(([tx, tz], i) => { const [ax, az] = m.toScreen(tx, tz); if (i === 0) ctx.moveTo(ax, az); else ctx.lineTo(ax, az); });
    ctx.stroke();
    ctx.fillStyle = c.pink; ctx.shadowColor = c.pink; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(sx, sz, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(sx - 2, sz - 2, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = c.line; ctx.lineWidth = 2; ctx.strokeRect(x0, z0, x1 - x0, z1 - z0);
  ctx.fillStyle = c.faint; ctx.font = "9px ui-monospace, monospace";
  ctx.fillText("ZONE.SOCIETY · L4 FACTIONS / RELATIONSHIPS / REPUTATION", x0, z0 - 10);
  ctx.textAlign = "right"; ctx.fillText(`tick ${current?.state?.tick ?? 0} · ${clock(current?.state?.clock_minutes ?? 0)}`, x1, z1 + 18); ctx.textAlign = "left";
}
function tickWorld() {
  if (!world) return;
  try { world.tick(TICK_US); current = JSON.parse(world.state()); drainEvents(); } catch (error) { error = String(error); }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(now - last, 100); last = now;
  if (!paused && world) {
    acc += dt; let guard = 0;
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
  if (!world || !target()) return;
  error = "";
  const id = target().content_id;
  if (kind === "talk") world.talk("player", id);
  else world.social_action("player", id, kind);
  tickWorld(); current = JSON.parse(world.state());
}
function selectAt(sx, sy) {
  const m = map();
  for (const actor of actors()) {
    const [ax, az] = m.toScreen(actor.transform.position[0], actor.transform.position[2]);
    if (Math.hypot(ax - sx, az - sy) < 22) { selected = actor.persistent_id; return true; }
  }
  return false;
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
    if (selectAt(sx, sy)) { current = JSON.parse(world.state()); return; }
    const [x, z] = map().toWorld(sx, sy);
    if (x >= zone.bounds.min[0] && x <= zone.bounds.max[0] && z >= zone.bounds.min[2] && z <= zone.bounds.max[2]) { world.move_to(x, z); tickWorld(); }
  });
  const actions = { talk: el.talk, support: el.support, thank: el.thank, propose: el.propose, mediate: el.mediate, insult: el.insult };
  for (const [kind, button] of Object.entries(actions)) button.addEventListener("click", () => act(kind));
  el.pause.addEventListener("click", () => { paused = !paused; el.pause.textContent = paused ? "继续" : "暂停"; });
  el.reset.addEventListener("click", reset);
}
function reset() {
  if (!world) return;
  world.reset(); current = JSON.parse(world.state()); selected = "grower_a"; logs = []; trail = []; lastMove = [0, 0]; paused = false; error = "";
  el.pause.textContent = "暂停"; el.events.textContent = "—"; syncMove();
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
    error = `L4 demo failed: ${error}`; el.event.textContent = error; el.mode.textContent = "ERROR"; console.error(error);
  }
}
boot();
