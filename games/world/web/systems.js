import init, { PreviewWorld } from "./pkg/world_wasm.js";

const W = 900;
const H = 650;
const TICK_US = 16666;
const PACK_URL = "./packs/demo.systems.data";
const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const el = {
  mode: document.getElementById("mode"), clock: document.getElementById("clock"), weather: document.getElementById("weather"),
  generation: document.getElementById("generation"), load: document.getElementById("load"), net: document.getElementById("net"),
  aiLoad: document.getElementById("ai-load"), batteryPct: document.getElementById("battery-pct"), batteryBar: document.getElementById("battery-bar"),
  batteryValue: document.getElementById("battery-value"), waterPct: document.getElementById("water-pct"), waterBar: document.getElementById("water-bar"),
  waterValue: document.getElementById("water-value"), policies: document.getElementById("policies"),
  pause: document.getElementById("pause"), speed: document.getElementById("speed"), reset: document.getElementById("reset"),
  event: document.getElementById("event-line"), events: document.getElementById("events"),
  l1: document.getElementById("l1-proof"), l2: document.getElementById("l2-proof"), l3: document.getElementById("l3-proof"), l4: document.getElementById("l4-proof"),
};

let world = null;
let pack = null;
let current = null;
let paused = false;
let simSpeed = 60;
let acc = 0;
let last = performance.now();
let logs = [];
let error = "";
let lastWeather = "";
let tickPhase = 0;

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
function clock(minutes) { const m = ((Number(minutes) || 0) % 1440 + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`; }
function daylight(minutes) {
  const hour = ((Number(minutes) || 0) % 1440) / 60;
  const x = Math.min(Math.max(((hour - 6) / 12) * Math.PI, 0), Math.PI);
  return Math.max(Math.sin(x), 0);
}
function systems() { return current?.state?.systems ?? null; }
function logEvent(event) {
  if (event.kind === "energy_updated") return;
  let detail = "";
  if (event.kind === "weather_changed") detail = ` · ${event.data.weather}`;
  if (event.kind === "system_policy_changed") detail = ` · ${event.data.policy}`;
  if (event.kind === "system_warning") detail = ` · ${event.data.system} ${event.data.pct?.toFixed?.(1) ?? event.data.pct}%`;
  logs.push(`${String(current?.state?.tick ?? 0).padStart(5, "0")}  ${event.kind}${detail}`);
  logs = logs.slice(-12);
  el.events.textContent = logs.length ? logs.join("\n") : "—";
}
function drainEvents() {
  try {
    for (const event of JSON.parse(world.poll_events())) {
      if (event.kind === "energy_updated") lastWeather = event.data.weather ?? lastWeather;
      logEvent(event);
    }
  } catch {}
}
function updateHud() {
  if (!current) return;
  const s = systems();
  if (!s) return;
  const batteryPct = s.battery_kwh / Math.max(1, pack.world.systems.battery_kwh) * 100;
  const waterPct = s.water_m3 / Math.max(1, pack.world.systems.water_m3) * 100;
  const net = s.solar_kw + s.wind_kw - s.load_kw;
  const ai = pack.world.systems.ai_count * 1.8 + (s.policy === "compute" ? pack.world.systems.ai_count * 0.8 : 0);
  el.clock.textContent = clock(current.state.clock_minutes);
  el.weather.textContent = s.weather;
  el.generation.textContent = `${s.solar_kw.toFixed(0)} / ${s.wind_kw.toFixed(0)} kW`;
  el.load.textContent = `${s.load_kw.toFixed(1)} kW`;
  el.net.textContent = `${net >= 0 ? "+" : ""}${net.toFixed(1)} kW`;
  el.net.className = net < 0 ? "negative" : "";
  el.aiLoad.textContent = `${ai.toFixed(1)} kW`;
  el.batteryPct.textContent = `${batteryPct.toFixed(0)}%`;
  el.waterPct.textContent = `${waterPct.toFixed(0)}%`;
  el.batteryBar.style.width = `${Math.max(0, Math.min(100, batteryPct))}%`;
  el.waterBar.style.width = `${Math.max(0, Math.min(100, waterPct))}%`;
  el.batteryValue.textContent = `${s.battery_kwh.toFixed(1)} / ${pack.world.systems.battery_kwh} kWh`;
  el.waterValue.textContent = `${s.water_m3.toFixed(1)} / ${pack.world.systems.water_m3} m³`;
  el.mode.textContent = `${paused ? "PAUSED" : "SIM"} ×${simSpeed} · 60 Hz`;
  el.l1.textContent = "0 commands · 0 actors";
  el.l2.textContent = "0 schedules · 0 actors";
  el.l3.textContent = "0 flags · 0 quests";
  el.l4.textContent = "absent";
  el.l4.classList.add("absent");
  el.event.textContent = error || (logs.at(-1) ?? (waterPct < 10 ? "水储量偏低，注意灌溉。" : "系统稳定"));
  el.policies.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.policy === s.policy));
}
function drawBattery(x, y, w, h, pct, c) {
  ctx.strokeStyle = c.line; ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "rgba(131,237,172,.16)";
  const fill = Math.max(0, Math.min(1, pct / 100));
  ctx.fillRect(x + 3, y + 3, (w - 6) * fill, h - 6);
  ctx.fillStyle = c.green; ctx.fillRect(x + 3, y + 3 + (h - 6) * (1 - fill), 3, (h - 6) * fill);
  ctx.fillStyle = c.faint; ctx.font = "9px ui-monospace, monospace"; ctx.fillText(`BATTERY ${pct.toFixed(0)}%`, x, y - 7);
}
function drawTank(x, y, w, h, pct, c) {
  ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  const fill = Math.max(0, Math.min(1, pct / 100));
  ctx.fillStyle = "rgba(94,231,255,.15)"; ctx.fillRect(x + 2, y + 2 + (h - 4) * (1 - fill), w - 4, (h - 4) * fill);
  ctx.fillStyle = c.cyan; ctx.fillText(`WATER ${pct.toFixed(0)}%`, x, y - 7);
}
function drawPanel(x, y, w, h, fraction, c) {
  ctx.fillStyle = "rgba(255,195,106,.12)"; ctx.strokeStyle = c.amber; ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + (w / 4) * i, y); ctx.lineTo(x + (w / 4) * i, y + h); ctx.stroke(); }
  for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x, y + (h / 3) * i); ctx.lineTo(x + w, y + (h / 3) * i); ctx.stroke(); }
  ctx.fillStyle = c.amber; ctx.font = "9px ui-monospace, monospace"; ctx.fillText(`SOLAR ${(fraction * 100).toFixed(0)}%`, x, y - 7);
}
function draw() {
  const c = palette();
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = c.line; ctx.lineWidth = 1;
  for (let x = 30; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 30; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const s = systems();
  if (!s) return;
  const config = pack.world.systems;
  const batteryPct = s.battery_kwh / Math.max(1, config.battery_kwh) * 100;
  const waterPct = s.water_m3 / Math.max(1, config.water_m3) * 100;
  const solarFrac = s.solar_kw / Math.max(1, config.solar_kw);
  const windFrac = s.wind_kw / Math.max(1, config.wind_kw);
  const loadFrac = s.load_kw / Math.max(1, config.base_load_kw + config.ai_count * 1.8 + 20);
  const day = daylight(current.state.clock_minutes);

  // Sun / weather
  const sunX = 135, sunY = 130;
  ctx.fillStyle = `rgba(255,195,106,${0.25 + day * 0.75})`; ctx.shadowColor = c.amber; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.arc(sunX, sunY, 20, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    ctx.strokeStyle = `rgba(255,195,106,${0.2 + day * 0.5})`; ctx.beginPath(); ctx.moveTo(sunX + Math.cos(a) * 28, sunY + Math.sin(a) * 28); ctx.lineTo(sunX + Math.cos(a) * 38, sunY + Math.sin(a) * 38); ctx.stroke();
  }
  ctx.fillStyle = c.faint; ctx.font = "9px ui-monospace, monospace"; ctx.fillText(`${s.weather.toUpperCase()} · daylight ${(day * 100).toFixed(0)}%`, 70, 195);
  if (s.weather === "rain") {
    ctx.strokeStyle = "rgba(94,231,255,.55)"; ctx.lineWidth = 1;
    for (let i = 0; i < 35; i++) { const x = 60 + ((i * 47 + tickPhase * 2) % 270); const y = 70 + ((i * 31 + tickPhase * 7) % 150); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 10); ctx.stroke(); }
  } else if (s.weather === "cloudy" || s.weather === "breezy") {
    ctx.fillStyle = "rgba(143,168,189,.12)"; ctx.beginPath(); ctx.ellipse(190, 90, 70, 18, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Solar array
  drawPanel(50, 255, 210, 74, solarFrac, c);
  ctx.fillStyle = c.faint; ctx.font = "9px ui-monospace, monospace"; ctx.fillText(`${s.solar_kw.toFixed(0)} kW`, 50, 350);

  // Wind turbines
  for (let i = 0; i < 3; i++) {
    const x = 420 + i * 95; const y = 215 + (i % 2) * 22;
    ctx.strokeStyle = c.cyan; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + 92); ctx.lineTo(x, y); ctx.stroke();
    const angle = tickPhase * 0.03 + i;
    for (let b = 0; b < 3; b++) {
      const a = angle + (Math.PI * 2 * b) / 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 34, y + Math.sin(a) * 34); ctx.stroke();
    }
    ctx.fillStyle = c.faint; ctx.font = "8px ui-monospace, monospace"; ctx.fillText(`${(s.wind_kw / 3).toFixed(0)} kW`, x - 14, y + 108);
  }

  // flows: generation -> battery/load
  const centerX = 610, centerY = 340;
  function flow(x1, y1, x2, y2, active, color, width = 2) {
    ctx.strokeStyle = color; ctx.globalAlpha = active ? .7 : .18; ctx.lineWidth = width; ctx.setLineDash([5, 7]); ctx.lineDashOffset = -tickPhase * 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  flow(260, 292, centerX - 50, centerY, solarFrac > .05, c.amber);
  flow(650, 215, centerX + 30, centerY - 60, windFrac > .05, c.cyan);
  flow(centerX + 55, centerY, 760, 345, true, c.green);
  flow(centerX + 55, centerY, 760, 500, s.load_kw > 0, c.pink);

  // battery
  drawBattery(centerX - 55, centerY - 55, 110, 110, batteryPct, c);
  ctx.fillStyle = c.faint; ctx.font = "9px ui-monospace, monospace"; ctx.fillText(`${s.battery_kwh.toFixed(0)} kWh`, centerX - 48, centerY + 72);
  ctx.fillStyle = c.green; ctx.fillText(`NET ${(s.solar_kw + s.wind_kw - s.load_kw).toFixed(0)} kW`, centerX - 48, centerY + 86);

  // water tank
  drawTank(760, 280, 82, 140, waterPct, c);
  ctx.fillStyle = c.faint; ctx.font = "9px ui-monospace, monospace"; ctx.fillText(`${s.water_m3.toFixed(0)} m³`, 760, 438);

  // AI + load
  ctx.fillStyle = "rgba(255,109,158,.12)"; ctx.strokeStyle = c.pink; ctx.lineWidth = 1; ctx.fillRect(640, 470, 100, 70); ctx.strokeRect(640, 470, 100, 70);
  ctx.fillStyle = c.pink; ctx.font = "9px ui-monospace, monospace"; ctx.fillText("AI COMPUTE", 650, 490);
  ctx.fillStyle = c.faint; ctx.fillText(`4 nodes · ${(config.ai_count * 1.8).toFixed(1)} kW`, 650, 507);
  ctx.fillStyle = "rgba(255,109,158,.16)"; ctx.fillRect(650, 518, 80 * Math.min(1, s.load_kw / 80), 8);
  ctx.fillStyle = c.faint; ctx.font = "9px ui-monospace, monospace"; ctx.fillText(`LOAD ${s.load_kw.toFixed(1)} kW`, 640, 562);

  // policy + clock
  ctx.fillStyle = c.faint; ctx.font = "10px ui-monospace, monospace";
  ctx.fillText(`POLICY ${s.policy.toUpperCase()} · CLOCK ${clock(current.state.clock_minutes)} · TICK ${current.state.tick}`, 50, 600);
  ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.fillStyle = c.faint; ctx.font = "9px ui-monospace, monospace"; ctx.fillText("L5 · WEATHER / ENERGY / WATER / AI LOAD", 44, 54);
}
function advanceTicks(count) {
  if (!world) return;
  try {
    for (let i = 0; i < count; i++) world.tick(TICK_US);
    current = JSON.parse(world.state());
    tickPhase += count;
    drainEvents();
  } catch (error) { error = String(error); }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(now - last, 100); last = now;
  if (!paused && world) {
    acc += dt; let guard = 0;
    while (acc >= TICK_US / 1000 && guard < 6) { advanceTicks(simSpeed); acc -= TICK_US / 1000; guard++; }
    if (guard >= 6) acc = 0;
  }
  draw(); updateHud();
}
function setPolicy(policy) {
  if (!world) return;
  world.set_system_policy(policy);
  advanceTicks(2);
  current = JSON.parse(world.state());
}
function reset() {
  if (!world) return;
  world.reset(); current = JSON.parse(world.state()); logs = []; paused = false; simSpeed = 60; acc = 0; tickPhase = 0; lastWeather = ""; error = "";
  el.speed.textContent = "×60"; el.events.textContent = "—"; el.pause.textContent = "暂停";
}
function bind() {
  window.addEventListener("keydown", (event) => {
    const k = event.key.toLowerCase();
    if (k === " ") { event.preventDefault(); paused = !paused; el.pause.textContent = paused ? "继续" : "暂停"; }
    if (k === "r") reset();
  });
  el.policies.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => setPolicy(button.dataset.policy)));
  el.pause.addEventListener("click", () => { paused = !paused; el.pause.textContent = paused ? "继续" : "暂停"; });
  el.speed.addEventListener("click", () => { simSpeed = simSpeed === 1 ? 60 : simSpeed === 60 ? 300 : 1; el.speed.textContent = `×${simSpeed}`; });
  el.reset.addEventListener("click", reset);
}
async function boot() {
  try {
    const response = await fetch(PACK_URL);
    if (!response.ok) throw new Error(`pack HTTP ${response.status}`);
    const text = await response.text();
    pack = JSON.parse(text);
    await init();
    world = new PreviewWorld(text);
    current = JSON.parse(world.state());
    bind();
    requestAnimationFrame(frame);
  } catch (error) {
    error = `L5 demo failed: ${error}`; el.event.textContent = error; el.mode.textContent = "ERROR"; console.error(error);
  }
}
boot();
