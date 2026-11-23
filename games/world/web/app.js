import init, { PreviewWorld } from "./pkg/world_wasm.js";

const EXPECTED_HASH = "0xd1c6ea084b71cc0d";
const TICK_US = 16666;

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const el = {
  status: document.getElementById("status"),
  quests: document.getElementById("quests"),
  inventory: document.getElementById("inventory"),
  flags: document.getElementById("flags"),
  events: document.getElementById("events"),
  replay: document.getElementById("replay-result"),
  pause: document.getElementById("btn-pause"),
};

let world = null;
let current = null;
let traceText = "";
let paused = false;
let selected = null;
let lineCache = [];
let screenMap = new Map();
let last = performance.now();
let acc = 0;
let errorShown = false;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);
}

function t(text) {
  if (typeof text !== "string") return text;
  if (!text.startsWith("loc:")) return text;
  const key = text.slice(4);
  return current?.loc?.[key] ?? key;
}

function nameOf(contentId) {
  if (!contentId) return "?";
  if (contentId === "player") return "你";
  const key = current?.names?.[contentId];
  return key ? t(key) : contentId;
}

function questTitle(id) {
  const key = current?.quest_titles?.[id];
  return key ? t(key) : id;
}

function clock(minutes) {
  const m = ((Number(minutes) || 0) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function entityKey(entity) {
  return `${entity.id.index}:${entity.id.generation}`;
}

function isPlayer(entity) {
  return current && entity.id.index === current.state.player.index
    && entity.id.generation === current.state.player.generation;
}

function formatEvent(ev) {
  const d = ev.data ?? {};
  switch (ev.kind) {
    case "world_started": return `世界启动：${d.pack_id}`;
    case "zone_activated": return `区域激活：${d.zone}`;
    case "quest_started": return `任务开始：${questTitle(d.quest)}`;
    case "quest_completed": return `任务完成：${questTitle(d.quest)}`;
    case "interact": return `交互：${nameOf(d.actor)} → ${nameOf(d.target)}`;
    case "talk": return `对话：${nameOf(d.actor)} → ${nameOf(d.target)}`;
    case "item_acquired": return `获得：${nameOf(d.item)} ×${d.count}`;
    case "entity_despawned": return `移除：${nameOf(d.content_id)}`;
    case "flag_changed": return `标记：${d.flag} = ${d.value}`;
    case "sound": return `音效：${d.id}`;
    case "toast": return `提示：${d.text}`;
    case "dialogue_started": return `对话：${d.text}`;
    case "schedule_changed": return `日程：${nameOf(d.entity)} → ${d.behavior}`;
    default: return ev.kind;
  }
}

function appendEvents(events) {
  for (const ev of events) lineCache.push(formatEvent(ev));
  if (lineCache.length > 80) lineCache.splice(0, lineCache.length - 80);
}

function pushLine(text) {
  lineCache.push(text);
  if (lineCache.length > 80) lineCache.shift();
}

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderHud() {
  if (!current) return;
  const s = current.state;
  const player = s.entities.find(isPlayer);
  const items = player?.inventory ?? [];

  el.status.innerHTML = `
    <span class="tag">tick</span><span>${esc(s.tick)}</span>
    <span class="tag">时间</span><span>${clock(s.clock_minutes)}</span>
    <span class="tag">哈希</span><span><code>${esc(current.final_hash)}</code></span>
    <span class="tag">实体</span><span>${s.entities.length}</span>
    <span class="tag">状态</span><span>${paused ? "暂停" : "运行"}</span>
  `;

  const quests = Object.entries(s.quests ?? {});
  el.quests.innerHTML = quests.length === 0
    ? `<p class="muted">没有活动任务</p>`
    : quests.map(([id, q]) => {
        const state = q.completed ? "已完成" : q.active ? "进行中" : "未开始";
        const objectives = Object.entries(q.progress ?? {})
          .map(([key, value]) => `${value ? "✓" : "·"} ${esc(key)}`)
          .join("<br>");
        return `<div class="quest ${q.completed ? "done" : ""}">
          <div><strong>${esc(questTitle(id))}</strong> · ${state}</div>
          <div class="objectives">${objectives || "尚无进度"}</div>
        </div>`;
      }).join("");

  el.inventory.innerHTML = items.length === 0
    ? `<p class="muted">背包为空</p>`
    : items.map((stack) => `<div class="item-line"><span>${esc(nameOf(stack.item))}</span><span class="tag">×${stack.count}</span></div>`).join("");

  const flags = Object.entries(s.flags ?? {}).filter(([, v]) => v);
  el.flags.innerHTML = flags.length === 0
    ? `<p class="muted">没有已置位标记</p>`
    : flags.map(([key]) => `<div class="item-line"><code>${esc(key)}</code></div>`).join("");

  el.events.replaceChildren(...lineCache.slice(-12).map((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    return li;
  }));
}

function draw() {
  if (!current) return;
  const s = current.state;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = css("--canvas");
  ctx.fillRect(0, 0, W, H);

  const zone = current.zones?.[s.zone_id];
  const minX = zone ? zone.bounds.min[0] : -20;
  const maxX = zone ? zone.bounds.max[0] : 20;
  const minZ = zone ? zone.bounds.min[2] : -20;
  const maxZ = zone ? zone.bounds.max[2] : 20;
  const pad = 52;
  const scale = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxZ - minZ));
  const ox = (W - (maxX - minX) * scale) / 2 - minX * scale;
  const oz = (H - (maxZ - minZ) * scale) / 2 - minZ * scale;
  const screen = (x, z) => [ox + x * scale, oz + z * scale];

  ctx.strokeStyle = css("--grid");
  ctx.lineWidth = 1;
  for (let x = Math.ceil(minX / 2) * 2; x <= maxX; x += 2) {
    const [sx, sz0] = screen(x, minZ);
    const [, sz1] = screen(x, maxZ);
    ctx.beginPath(); ctx.moveTo(sx, sz0); ctx.lineTo(sx, sz1); ctx.stroke();
  }
  for (let z = Math.ceil(minZ / 2) * 2; z <= maxZ; z += 2) {
    const [sx0, sz] = screen(minX, z);
    const [sx1] = screen(maxX, z);
    ctx.beginPath(); ctx.moveTo(sx0, sz); ctx.lineTo(sx1, sz); ctx.stroke();
  }

  if (zone) {
    const [x0, z0] = screen(minX, minZ);
    const [x1, z1] = screen(maxX, maxZ);
    ctx.fillStyle = css("--panel");
    ctx.globalAlpha = 0.16;
    ctx.fillRect(x0, z0, x1 - x0, z1 - z0);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = css("--line");
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, z0, x1 - x0, z1 - z0);
  }

  screenMap = new Map();
  const labelBoxes = [];
  const entities = [...s.entities].sort((a, b) => a.transform.position[2] - b.transform.position[2]);
  for (const entity of entities) {
    const [x, z] = entity.transform.position;
    const [sx, sz] = screen(x, z);
    const key = entityKey(entity);
    screenMap.set(key, { x: sx, y: sz, entity });
    const label = entity.kind === "prop" && entity.door?.open
      ? `${nameOf(entity.content_id)}（已开）`
      : nameOf(entity.content_id);
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    const width = ctx.measureText(label).width;
    let labelY = entity.kind === "actor" ? sz - 22 : entity.kind === "item" ? sz + 38 : sz + 30;
    let box = { left: sx - width / 2 - 5, top: labelY - 13, right: sx + width / 2 + 5, bottom: labelY + 5 };
    let guard = 0;
    while (guard < 6 && labelBoxes.some((b) => !(box.right < b.left || box.left > b.right || box.bottom < b.top || box.top > b.bottom))) {
      labelY += 18;
      box = { left: sx - width / 2 - 5, top: labelY - 13, right: sx + width / 2 + 5, bottom: labelY + 5 };
      guard += 1;
    }
    labelBoxes.push(box);
    drawEntity(entity, sx, sz, key, label, labelY);
  }

}

function drawEntity(entity, sx, sz, key, label, labelY) {
  const chosen = selected === key;
  const accent = css("--accent");
  const accent2 = css("--accent-2");
  const ink = css("--ink");
  const panel = css("--panel");
  ctx.save();
  if (chosen) {
    ctx.strokeStyle = accent2;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx, sz, 22, 0, Math.PI * 2); ctx.stroke();
  }
  if (isPlayer(entity)) {
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(sx, sz, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = panel; ctx.lineWidth = 2; ctx.stroke();
  } else if (entity.kind === "actor") {
    ctx.fillStyle = accent2;
    ctx.beginPath(); ctx.arc(sx, sz, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = panel; ctx.lineWidth = 2; ctx.stroke();
  } else if (entity.kind === "prop") {
    ctx.fillStyle = entity.door?.open ? accent : accent2;
    ctx.fillRect(sx - 12, sz - 10, 24, 20);
    ctx.strokeStyle = panel; ctx.lineWidth = 2; ctx.strokeRect(sx - 12, sz - 10, 24, 20);
  } else {
    ctx.fillStyle = accent2;
    ctx.beginPath();
    ctx.moveTo(sx, sz - 8); ctx.lineTo(sx + 8, sz); ctx.lineTo(sx, sz + 8); ctx.lineTo(sx - 8, sz);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = panel; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  const width = ctx.measureText(label).width;
  ctx.fillStyle = panel;
  ctx.globalAlpha = 0.88;
  ctx.beginPath();
  ctx.roundRect(sx - width / 2 - 5, labelY - 13, width + 10, 18, 5);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = ink;
  ctx.fillText(label, sx, labelY);
  ctx.restore();
}

function entityAt(x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const hit of screenMap.values()) {
    const dx = hit.x - x;
    const dy = hit.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist < 26 && dist < bestDist) {
      best = hit;
      bestDist = dist;
    }
  }
  return best;
}

function nearest(predicate, maxDist = 8) {
  if (!current) return null;
  const player = current.state.entities.find(isPlayer);
  if (!player) return null;
  const [px, pz] = player.transform.position;
  let best = null;
  let bestDist = Infinity;
  for (const entity of current.state.entities) {
    if (isPlayer(entity) || !predicate(entity)) continue;
    const [x, z] = entity.transform.position;
    const dist = Math.hypot(x - px, z - pz);
    if (dist < bestDist) { best = entity; bestDist = dist; }
  }
  return bestDist <= maxDist ? best : null;
}

async function act(entity) {
  if (!entity) {
    pushLine("附近没有可操作目标");
    return;
  }
  selected = entityKey(entity);
  try {
    if (entity.kind === "item") await world.pickup("player", entity.content_id);
    else if (entity.kind === "actor") await world.talk("player", entity.content_id);
    else await world.interact("player", entity.content_id);
    pushLine(`操作：${nameOf(entity.content_id)}（${entity.kind}）`);
  } catch (error) {
    pushLine(`错误：${error}`);
  }
}

function bindUi() {
  document.getElementById("btn-interact").addEventListener("click", () => act(nearest((e) => e.kind === "prop")));
  document.getElementById("btn-pickup").addEventListener("click", () => act(nearest((e) => e.kind === "item")));
  document.getElementById("btn-talk").addEventListener("click", () => act(nearest((e) => e.kind === "actor")));

  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;
    const hit = entityAt(x, y);
    if (hit) act(hit.entity);
  });

  el.pause.addEventListener("click", () => {
    paused = !paused;
    world?.pause(paused);
    el.pause.textContent = paused ? "继续" : "暂停";
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    try {
      world.reset();
      selected = null;
      paused = false;
      el.pause.textContent = "暂停";
      lineCache = [];
      el.replay.textContent = "";
      el.replay.className = "hint";
    } catch (error) {
      pushLine(`重置失败：${error}`);
    }
  });

  document.getElementById("btn-replay").addEventListener("click", () => {
    try {
      const hash = world.replay(traceText);
      const ok = hash === EXPECTED_HASH;
      el.replay.textContent = `M0 replay：${hash} ${ok ? "PASS" : `FAIL（期望 ${EXPECTED_HASH}）`}`;
      el.replay.className = `hint ${ok ? "pass" : "fail"}`;
    } catch (error) {
      el.replay.textContent = `回放失败：${error}`;
      el.replay.className = "hint fail";
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    const key = event.key.toLowerCase();
    if (key === "e") { event.preventDefault(); act(nearest((e) => e.kind === "prop")); }
    if (key === "f") { event.preventDefault(); act(nearest((e) => e.kind === "item")); }
    if (key === "t") { event.preventDefault(); act(nearest((e) => e.kind === "actor")); }
    if (key === "p") { event.preventDefault(); el.pause.click(); }
    if (key === "r") { event.preventDefault(); document.getElementById("btn-reset").click(); }
  });
}

function loop(now) {
  if (!world) {
    requestAnimationFrame(loop);
    return;
  }
  const dt = Math.min(now - last, 100);
  last = now;
  if (!paused) {
    acc += dt * 1000;
    let n = 0;
    while (acc >= TICK_US && n < 4) {
      world.tick(TICK_US);
      acc -= TICK_US;
      n += 1;
    }
  }
  try {
    current = JSON.parse(world.state());
    const events = JSON.parse(world.poll_events());
    if (events.length > 0) appendEvents(events);
    renderHud();
    draw();
  } catch (error) {
    if (!errorShown) {
      errorShown = true;
      el.status.innerHTML = `<p class="fail">预览失败：${esc(error)}</p>`;
    }
  }
  requestAnimationFrame(loop);
}

async function boot() {
  try {
    await init();
    const [packResponse, traceResponse] = await Promise.all([
      fetch("./pack.data"),
      fetch("./m0.trace.json"),
    ]);
    if (!packResponse.ok) throw new Error(`pack.data HTTP ${packResponse.status}`);
    if (!traceResponse.ok) throw new Error(`m0.trace.json HTTP ${traceResponse.status}`);
    const packText = await packResponse.text();
    traceText = await traceResponse.text();
    world = new PreviewWorld(packText);
    bindUi();
    current = JSON.parse(world.state());
    appendEvents(JSON.parse(world.poll_events()));
    renderHud();
    draw();
    requestAnimationFrame(loop);
  } catch (error) {
    el.status.innerHTML = `<p class="fail">加载失败：${esc(error)}</p>`;
    console.error(error);
  }
}

boot();
