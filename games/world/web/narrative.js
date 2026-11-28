import init, { PreviewWorld } from "./pkg/world_wasm.js";

const W = 900;
const H = 650;
const TICK_US = 16666;
const PACK_URL = "./packs/demo.narrative.data";
const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const el = {
  mode: document.getElementById("mode"), tick: document.getElementById("tick"),
  questState: document.getElementById("quest-state"), flagCount: document.getElementById("flag-count"),
  scriptState: document.getElementById("script-state"), dialogueState: document.getElementById("dialogue-state"),
  event: document.getElementById("event-line"), events: document.getElementById("events"),
  dialogue: document.getElementById("dialogue"), speaker: document.getElementById("dialogue-speaker"),
  text: document.getElementById("dialogue-text"), choices: document.getElementById("dialogue-choices"),
  talk: document.getElementById("talk"), pickup: document.getElementById("pickup"), terminal: document.getElementById("terminal"),
  pause: document.getElementById("pause"), reset: document.getElementById("reset"),
  questTitle: document.getElementById("quest-title"), objectives: document.getElementById("objectives"),
  flags: document.getElementById("flags"), l2: document.getElementById("l2-proof"),
  l4: document.getElementById("l4-proof"), l5: document.getElementById("l5-proof"),
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
let activeDialogue = null;
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
    pink: css("--pink", "#ff6d9e"), green: css("--green", "#83edac"), violet: "#c6a7ff",
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
function entity(persistentId) { return current?.state?.entities?.find((e) => e.persistent_id === persistentId) ?? null; }
function distance(a, b) {
  if (!a || !b) return Infinity;
  return Math.hypot(a.transform.position[0] - b.transform.position[0], a.transform.position[2] - b.transform.position[2]);
}
function isInside(x, z) { return x >= zone.bounds.min[0] && x <= zone.bounds.max[0] && z >= zone.bounds.min[2] && z <= zone.bounds.max[2]; }
function logEvent(event) {
  logs.push(`${String(current?.state?.tick ?? 0).padStart(4, "0")}  ${event.kind}${event.data?.text ? `  · ${event.data.text}` : event.data?.flag ? `  · ${event.data.flag}` : ""}`);
  logs = logs.slice(-12);
  el.events.textContent = logs.length ? logs.join("\n") : "—";
}
function applyEvent(event) {
  logEvent(event);
  if (event.kind === "dialogue_started" || event.kind === "dialogue_node") {
    activeDialogue = {
      dialogue: event.data.dialogue,
      node: event.data.node,
      speaker: event.data.speaker ?? "档案员",
      text: event.data.text ?? "",
      choices: event.data.choices ?? [],
      ended: Boolean(event.data.end),
    };
  }
  if (event.kind === "dialogue_ended" && activeDialogue) activeDialogue.ended = true;
}
function drainEvents() {
  try { for (const event of JSON.parse(world.poll_events())) applyEvent(event); } catch {}
}
function renderDialogue() {
  if (!activeDialogue) { el.dialogue.hidden = true; el.dialogueState.textContent = "closed"; return; }
  el.dialogue.hidden = false;
  el.dialogueState.textContent = activeDialogue.node;
  const speakerKey = String(activeDialogue.speaker ?? "").replace(/^loc:/, "");
  const loc = pack.loc?.["zh-CN"] ?? pack.loc ?? {};
  const actorDef = pack.actors?.[speakerKey];
  const speakerName = actorDef?.name ? loc[String(actorDef.name).replace(/^loc:/, "")] : null;
  el.speaker.textContent = speakerName ?? loc[speakerKey] ?? activeDialogue.speaker ?? "档案员";
  el.text.textContent = activeDialogue.text;
  el.choices.innerHTML = "";
  if (activeDialogue.choices.length) {
    activeDialogue.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = choice.text;
      button.addEventListener("click", () => chooseDialogue(index));
      el.choices.appendChild(button);
    });
  } else {
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "结束对话";
    close.addEventListener("click", () => { activeDialogue = null; renderDialogue(); });
    el.choices.appendChild(close);
  }
}
function renderQuest() {
  if (!current || !pack) return;
  const quest = pack.quests?.["quest.narrative"];
  if (!quest) return;
  const state = current.state.quests?.["quest.narrative"];
  const titleKey = String(quest.title ?? "quest.narrative").replace(/^loc:/, "");
  const loc = pack.loc?.["zh-CN"] ?? pack.loc ?? {};
  el.questTitle.textContent = loc[titleKey] ?? quest.title ?? "quest.narrative";
  el.questState.textContent = state?.completed ? "completed" : state?.active ? "active" : "inactive";
  const defs = {
    talk: ["与档案员交谈", "talk:demo.narrative.archivist"],
    acquire: ["取得记忆碎片", "acquire:item.narrative.shard"],
    flag: ["启动记忆终端", "flag:flag.narrative.terminal"],
  };
  el.objectives.innerHTML = quest.objectives.map((objective) => {
    const kind = objective.kind === "talk" ? "talk" : objective.kind === "acquire" ? "acquire" : "flag";
    const [label, key] = defs[kind] ?? ["目标", ""];
    const [realKey] = kind === "talk" ? [`talk:${objective.target}`] : kind === "acquire" ? [`acquire:${objective.item}`] : [`flag:${objective.flag}`];
    const done = state?.progress?.[realKey] >= 1;
    return `<div class="objective ${done ? "done" : ""}"><i></i><span>${label}</span></div>`;
  }).join("");
}
function updateHud() {
  if (!current) return;
  const s = current.state;
  el.tick.textContent = String(s.tick);
  el.flagCount.textContent = String(Object.keys(s.flags ?? {}).length);
  el.scriptState.textContent = s.flags?.["flag.narrative.script"] ? "fired" : "idle";
  el.mode.textContent = paused ? "PAUSED · 60 Hz" : "RUNNING · 60 Hz";
  el.l2.textContent = `${Object.keys(pack?.schedules ?? {}).length} schedules · L3 actors only`;
  el.l4.textContent = s.social ? "present" : "absent";
  el.l5.textContent = s.systems ? "present" : "absent";
  el.l4.classList.toggle("absent", !s.social);
  el.l5.classList.toggle("absent", !s.systems);
  el.flags.innerHTML = Object.entries(s.flags ?? {}).map(([key, value]) => `<span class="${value ? "ok" : ""}">${key} = ${value}</span>`).join("") || "—";
  renderQuest();
  renderDialogue();
  el.event.textContent = error || (logs.at(-1) ?? "与档案员交谈，选择对话分支");
}
function draw() {
  const c = palette();
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
  if (!zone) return;
  const m = map();
  const [x0, z0] = m.toScreen(m.minX, m.minZ);
  const [x1, z1] = m.toScreen(m.maxX, m.maxZ);
  ctx.strokeStyle = c.line; ctx.lineWidth = 1;
  for (let x = Math.ceil(m.minX); x <= m.maxX; x++) { const [sx] = m.toScreen(x, m.minZ); ctx.beginPath(); ctx.moveTo(sx, z0); ctx.lineTo(sx, z1); ctx.stroke(); }
  for (let z = Math.ceil(m.minZ); z <= m.maxZ; z++) { const [, sz] = m.toScreen(m.minX, z); ctx.beginPath(); ctx.moveTo(x0, sz); ctx.lineTo(x1, sz); ctx.stroke(); }

  const archivist = entity("archivist");
  if (archivist) {
    const [sx, sz] = m.toScreen(archivist.transform.position[0], archivist.transform.position[2]);
    ctx.fillStyle = "rgba(198,167,255,.18)"; ctx.strokeStyle = c.violet; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(sx, sz, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.violet; ctx.font = "9px ui-monospace, monospace"; ctx.fillText("ARCHIVIST", sx + 20, sz - 8);
  }
  const terminal = entity("terminal");
  if (terminal) {
    const p = terminal.transform.position;
    const [sx, sz] = m.toScreen(p[0] - 0.8, p[2] - 0.5);
    ctx.fillStyle = "rgba(94,231,255,.12)"; ctx.strokeStyle = c.cyan; ctx.lineWidth = 1.6;
    ctx.fillRect(sx, sz, 1.6 * m.scale, 1.0 * m.scale); ctx.strokeRect(sx, sz, 1.6 * m.scale, 1.0 * m.scale);
    ctx.fillStyle = c.cyan; ctx.fillText("TERMINAL", sx, sz - 7);
  }
  const shard = entity("shard");
  if (shard) {
    const p = shard.transform.position;
    const [sx, sz] = m.toScreen(p[0], p[2]);
    ctx.fillStyle = c.amber; ctx.shadowColor = c.amber; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(sx, sz - 8); ctx.lineTo(sx + 7, sz); ctx.lineTo(sx, sz + 8); ctx.lineTo(sx - 7, sz); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = c.ink; ctx.font = "9px ui-monospace, monospace"; ctx.fillText("SHARD", sx, sz - 12);
  }
  const p = player();
  if (p) {
    const pos = p.transform.position; const [sx, sz] = m.toScreen(pos[0], pos[2]);
    ctx.strokeStyle = "rgba(198,167,255,.24)"; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(sx, sz, 6 * m.scale, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
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
  ctx.fillText("ZONE.NARRATIVE · L3 DIALOGUE / RULES / QUEST / SCRIPT", x0, z0 - 10);
  ctx.textAlign = "right"; ctx.fillText(`tick ${current?.state?.tick ?? 0}`, x1, z1 + 18); ctx.textAlign = "left";
}
function tickWorld() {
  if (!world) return;
  try { world.tick(TICK_US); current = JSON.parse(world.state()); drainEvents(); } catch (error) { error = String(error); }
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
  if (kind === "talk") world.talk("player", "demo.narrative.archivist");
  if (kind === "pickup") world.pickup("player", "item.narrative.shard");
  if (kind === "terminal") world.interact("player", "demo.narrative.terminal");
  tickWorld(); current = JSON.parse(world.state());
}
function chooseDialogue(index) {
  if (!world || !activeDialogue) return;
  world.choose_dialogue(activeDialogue.dialogue, activeDialogue.node, index);
  tickWorld(); current = JSON.parse(world.state());
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
    if (isInside(x, z)) { world.move_to(x, z); tickWorld(); }
  });
  el.talk.addEventListener("click", () => act("talk"));
  el.pickup.addEventListener("click", () => act("pickup"));
  el.terminal.addEventListener("click", () => act("terminal"));
  el.pause.addEventListener("click", () => { paused = !paused; el.pause.textContent = paused ? "继续" : "暂停"; });
  el.reset.addEventListener("click", reset);
}
function reset() {
  if (!world) return;
  world.reset(); current = JSON.parse(world.state()); activeDialogue = null; logs = []; trail = [];
  lastMove = [0, 0]; paused = false; error = ""; el.pause.textContent = "暂停"; el.events.textContent = "—";
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
    error = `L3 demo failed: ${error}`; el.event.textContent = error; el.mode.textContent = "ERROR"; console.error(error);
  }
}
boot();
