import init, { PreviewWorld } from "./pkg/world_wasm.js";

const W = 900;
const H = 650;
const TICK_US = 16666;
const PACK_URL = "./packs/demo.spacetime.data";
const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const el = {
  tick: document.getElementById("tick"),
  clock: document.getElementById("clock"),
  position: document.getElementById("position"),
  speed: document.getElementById("speed"),
  path: document.getElementById("path"),
  hash: document.getElementById("hash"),
  mode: document.getElementById("mode"),
  event: document.getElementById("event-line"),
  l1: document.getElementById("l1-proof"),
  l2: document.getElementById("l2-proof"),
  l3: document.getElementById("l3-proof"),
  l4: document.getElementById("l4-proof"),
  l5: document.getElementById("l5-proof"),
  pause: document.getElementById("pause"),
  route: document.getElementById("route"),
  reset: document.getElementById("reset"),
};

let world = null;
let pack = null;
let current = null;
let nav = null;
let zone = null;
let paused = false;
let target = null;
let last = performance.now();
let acc = 0;
let keys = new Set();
let trail = [];
let lastMove = [0, 0];
let fps = 60;
let fpsAcc = 0;
let fpsFrames = 0;
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
    bg: css("--solid", "#0b1423"),
    ink: css("--ink", "#edf8ff"),
    dim: css("--dim", "#8fa8bd"),
    faint: css("--faint", "#5e7489"),
    line: css("--line", "rgba(104,206,231,.18)"),
    cyan: css("--cyan", "#5ee7ff"),
    amber: css("--amber", "#ffc36a"),
    pink: css("--pink", "#ff6d9e"),
    danger: css("--danger", "#ff766e"),
    green: css("--green", "#83edac"),
  };
}

function map() {
  const b = zone?.bounds ?? { min: [-12, 0, -9], max: [12, 4, 9] };
  const minX = b.min[0], maxX = b.max[0], minZ = b.min[2], maxZ = b.max[2];
  const pad = 38;
  const scale = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxZ - minZ));
  const ox = (W - (maxX - minX) * scale) / 2 - minX * scale;
  const oz = (H - (maxZ - minZ) * scale) / 2 - minZ * scale;
  return {
    minX, maxX, minZ, maxZ, scale,
    toScreen: (x, z) => [ox + x * scale, oz + z * scale],
    toWorld: (sx, sy) => [(sx - ox) / scale, (sy - oz) / scale],
  };
}

function player() {
  if (!current) return null;
  const s = current.state;
  return s.entities.find((entity) => entity.id.index === s.player.index && entity.id.generation === s.player.generation) ?? null;
}

function isInsideZone(x, z) {
  return x >= zone.bounds.min[0] && x <= zone.bounds.max[0] && z >= zone.bounds.min[2] && z <= zone.bounds.max[2];
}

function updateHud() {
  if (!current) return;
  const s = current.state;
  const p = player();
  const pos = p?.transform?.position ?? [0, 0, 0];
  el.tick.textContent = String(s.tick);
  el.clock.textContent = clock(s.clock_minutes);
  el.position.textContent = `${pos[0].toFixed(1)}, ${pos[2].toFixed(1)}`;
  el.speed.textContent = `${(p?.speed ?? 0).toFixed(1)} m/s`;
  const remaining = Math.max(0, (s.path?.length ?? 0) - (s.path_index ?? 0));
  el.path.textContent = remaining > 0 ? `${remaining} waypoints` : (target ? "settling" : "idle");
  el.hash.textContent = current.final_hash ?? "—";
  el.mode.textContent = paused ? "PAUSED · 60 Hz" : "RUNNING · 60 Hz";
  el.event.textContent = error || (remaining > 0 ? `A* path · ${remaining} waypoints · collision on` : "WASD 移动 · 点击地面寻路 · Space 暂停");
  el.l1.textContent = `${p?.inventory?.length ?? 0} inv · 0 commands`;
  el.l2.textContent = `${Object.keys(pack?.schedules ?? {}).length} schedules · ${Object.keys(pack?.actors ?? {}).length} actors`;
  el.l3.textContent = `${Object.keys(s.flags ?? {}).length} flags · ${Object.keys(s.quests ?? {}).length} quests`;
  el.l4.textContent = s.social ? "present" : "absent";
  el.l5.textContent = s.systems ? "present" : "absent";
  el.l4.classList.toggle("absent", !s.social);
  el.l5.classList.toggle("absent", !s.systems);
}

function clock(minutes) {
  const m = ((Number(minutes) || 0) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;
}

function draw() {
  const c = palette();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  if (!zone) return;
  const m = map();
  const [x0, z0] = m.toScreen(m.minX, m.minZ);
  const [x1, z1] = m.toScreen(m.maxX, m.maxZ);
  ctx.fillStyle = "rgba(3, 8, 16, .56)";
  ctx.fillRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 1;
  for (let x = Math.ceil(m.minX); x <= m.maxX; x++) {
    const [sx] = m.toScreen(x, m.minZ);
    ctx.beginPath(); ctx.moveTo(sx, z0); ctx.lineTo(sx, z1); ctx.stroke();
  }
  for (let z = Math.ceil(m.minZ); z <= m.maxZ; z++) {
    const [, sz] = m.toScreen(m.minX, z);
    ctx.beginPath(); ctx.moveTo(x0, sz); ctx.lineTo(x1, sz); ctx.stroke();
  }

  // nav blocked cells
  if (nav) {
    const cell = nav.cell;
    for (const index of nav.blocked) {
      const nx = index % nav.width;
      const nz = Math.floor(index / nav.width);
      const wx = nav.origin[0] + nx * cell;
      const wz = nav.origin[1] + nz * cell;
      const [sx, sz] = m.toScreen(wx, wz);
      ctx.fillStyle = "rgba(150, 55, 55, .18)";
      ctx.fillRect(sx, sz, cell * m.scale, cell * m.scale);
    }
  }

  // props / obstacles from snapshot
  if (current) {
    for (const entity of current.state.entities) {
      if (entity.kind !== "prop") continue;
      const p = entity.transform.position;
      const collider = entity.collider;
      if (collider?.shape === "aabb") {
        const half = collider.half ?? [0.5, 0.5];
        const [sx, sz] = m.toScreen(p[0] - half[0], p[2] - half[1]);
        ctx.fillStyle = "rgba(255, 195, 106, .16)";
        ctx.strokeStyle = "rgba(255, 195, 106, .75)";
        ctx.lineWidth = 1.5;
        ctx.fillRect(sx, sz, half[0] * 2 * m.scale, half[1] * 2 * m.scale);
        ctx.strokeRect(sx, sz, half[0] * 2 * m.scale, half[1] * 2 * m.scale);
      }
    }
  }

  // path
  const p = player();
  if (p) {
    const s = current.state;
    const pos = p.transform.position;
    const [px, pz] = m.toScreen(pos[0], pos[2]);
    const path = s.path ?? [];
    if (path.length) {
      ctx.strokeStyle = c.cyan;
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.moveTo(px, pz);
      for (const waypoint of path.slice(s.path_index ?? 0)) {
        const [wx, wz] = m.toScreen(waypoint[0], waypoint[1]);
        ctx.lineTo(wx, wz);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      for (const waypoint of path.slice(s.path_index ?? 0)) {
        const [wx, wz] = m.toScreen(waypoint[0], waypoint[1]);
        ctx.fillStyle = c.cyan;
        ctx.beginPath(); ctx.arc(wx, wz, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (target) {
      const [tx, tz] = m.toScreen(target[0], target[1]);
      ctx.strokeStyle = c.amber;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tx, tz, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx - 18, tz); ctx.lineTo(tx - 6, tz); ctx.moveTo(tx + 6, tz); ctx.lineTo(tx + 18, tz); ctx.stroke();
    }
    trail.push([pos[0], pos[2]]);
    if (trail.length > 90) trail.shift();
    ctx.strokeStyle = "rgba(255, 109, 158, .32)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    trail.forEach(([tx, tz], index) => {
      const [sx, sz] = m.toScreen(tx, tz);
      if (index === 0) ctx.moveTo(sx, sz); else ctx.lineTo(sx, sz);
    });
    ctx.stroke();
    ctx.shadowColor = c.pink;
    ctx.shadowBlur = 22;
    ctx.fillStyle = c.pink;
    ctx.beginPath(); ctx.arc(px, pz, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = c.ink;
    ctx.beginPath(); ctx.arc(px - 2, pz - 2, 2, 0, Math.PI * 2); ctx.fill();
  }

  // zone border
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, z0, x1 - x0, z1 - z0);
  ctx.fillStyle = c.faint;
  ctx.font = "9px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(`ZONE.SPACETIME · ${m.maxX - m.minX} × ${m.maxZ - m.minZ} m`, x0, z0 - 10);
  ctx.textAlign = "right";
  ctx.fillText(`60 Hz · tick ${current?.state?.tick ?? 0}`, x1, z1 + 18);
  ctx.textAlign = "left";
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(now - last, 100);
  last = now;
  fpsAcc += dt;
  fpsFrames++;
  if (fpsAcc >= 500) { fps = Math.round(fpsFrames * 1000 / fpsAcc); fpsAcc = 0; fpsFrames = 0; }
  if (!paused && world) {
    acc += dt;
    let guard = 0;
    while (acc >= TICK_US / 1000 && guard < 5) {
      try { world.tick(TICK_US); } catch (error) { error = String(error); break; }
      acc -= TICK_US / 1000;
      guard++;
    }
    if (guard >= 5) acc = 0;
    current = JSON.parse(world.state());
  }
  draw();
  updateHud();
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
  if (x !== lastMove[0] || z !== lastMove[1]) {
    world.set_move(x, z);
    lastMove = [x, z];
    if (x || z) target = null;
  }
}

function bindInput() {
  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
    if (key === " ") { paused = !paused; el.pause.textContent = paused ? "继续" : "暂停"; return; }
    if (key === "r") { resetWorld(); return; }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      keys.add(key); syncMove();
    }
  });
  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
    syncMove();
  });
  window.addEventListener("blur", () => { keys.clear(); syncMove(); });
  canvas.addEventListener("click", (event) => {
    if (!world) return;
    const rect = canvas.getBoundingClientRect();
    const sx = (event.clientX - rect.left) * W / rect.width;
    const sy = (event.clientY - rect.top) * H / rect.height;
    const [wx, wz] = map().toWorld(sx, sy);
    if (!isInsideZone(wx, wz)) return;
    target = [wx, wz];
    world.move_to(wx, wz);
    current = JSON.parse(world.state());
  });
  el.pause.addEventListener("click", () => { paused = !paused; el.pause.textContent = paused ? "继续" : "暂停"; });
  el.route.addEventListener("click", () => {
    if (!world) return;
    paused = false;
    el.pause.textContent = "暂停";
    target = [8, 6];
    world.move_to(8, 6);
    current = JSON.parse(world.state());
  });
  el.reset.addEventListener("click", resetWorld);
}

function resetWorld() {
  if (!world) return;
  world.reset();
  current = JSON.parse(world.state());
  target = null;
  trail = [];
  lastMove = [0, 0];
  paused = false;
  el.pause.textContent = "暂停";
  error = "";
  syncMove();
}

async function boot() {
  try {
    const response = await fetch(PACK_URL);
    if (!response.ok) throw new Error(`pack HTTP ${response.status}`);
    const text = await response.text();
    pack = JSON.parse(text);
    zone = pack.zones[pack.manifest.entry.start_zone];
    nav = pack.navs?.[zone.nav] ?? null;
    await init();
    world = new PreviewWorld(text);
    current = JSON.parse(world.state());
    bindInput();
    requestAnimationFrame(frame);
  } catch (error) {
    error = `L0 demo failed: ${error}`;
    el.event.textContent = error;
    el.mode.textContent = "ERROR";
    console.error(error);
  }
}

boot();
