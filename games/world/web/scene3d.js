import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import init, { PreviewWorld } from "./pkg/world_wasm.js";

const SCENES = {
  "demo.dock": { title: "夜班货运 · 3D", ground: 0x18383a, accent: 0x62d7c2, fog: 0x091a20 },
  "demo.tram": { title: "末班电车 · 3D", ground: 0x2b302d, accent: 0xe8b46a, fog: 0x111713 },
  "demo.station": { title: "信号站 · 3D", ground: 0x202c3a, accent: 0x84c7ff, fog: 0x0b1520 },
  "demo.blackout": { title: "停电夜 · 3D", ground: 0x26252c, accent: 0xff9a62, fog: 0x0d0b12 },
  "demo.archive": { title: "档案室 · 3D", ground: 0x2d2930, accent: 0xd4bd8a, fog: 0x111016 },
};
const TICK_US = 16666;
const params = new URLSearchParams(location.search);
const sceneId = params.get("demo") || "demo.dock";
const sceneMeta = SCENES[sceneId] ?? SCENES["demo.dock"];
const canvas = document.getElementById("scene");
const el = {
  subtitle: document.getElementById("scene-subtitle"),
  title: document.getElementById("quest-title"),
  objectives: document.getElementById("quest-objectives"),
  inventory: document.getElementById("inventory"),
  flags: document.getElementById("flags"),
  clock: document.getElementById("clock"),
  tick: document.getElementById("tick"),
  hash: document.getElementById("hash"),
  hint: document.getElementById("hint"),
  loading: document.getElementById("loading"),
  toast: document.getElementById("toast"),
  dialogue: document.getElementById("dialogue"),
  dialogueSpeaker: document.getElementById("dialogue-speaker"),
  dialogueText: document.getElementById("dialogue-text"),
  footPack: document.getElementById("foot-pack"),
  pause: document.getElementById("btn-pause"),
};

let renderer, scene, camera, controls;
let world, current;
let paused = false, last = performance.now(), acc = 0;
let toastTimer = 0, dialogTimer = 0;
const views = new Map();
const keys = new Set();
const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
const COLORS = { player: 0x62d7c2, actor: 0xe8b46a, prop: 0x8197a0, item: 0xf7d477 };

function t(text) {
  if (typeof text !== "string") return text;
  if (!text.startsWith("loc:")) return text;
  return current?.loc?.[text.slice(4)] ?? text.slice(4);
}
function nameOf(id) {
  if (!id) return "?";
  if (id === "player") return "你";
  return t(current?.names?.[id] ?? id);
}
function clock(minutes) {
  const m = ((Number(minutes) || 0) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function entityPosition(entity) {
  return new THREE.Vector3(entity.transform.position[0], 0, entity.transform.position[2]);
}
function playerEntity() {
  return current?.state?.entities?.find((e) => e.id.index === current.state.player.index && e.id.generation === current.state.player.generation);
}
function nearest(kind) {
  const player = playerEntity();
  if (!player) return null;
  let best = null, bestDist = 2.8;
  for (const entity of current.state.entities) {
    if (entity.kind !== kind) continue;
    const d = entityPosition(entity).distanceTo(entityPosition(player));
    if (d < bestDist) { best = entity; bestDist = d; }
  }
  return best;
}
function act(entity, op) {
  if (!entity) { showToast("靠近目标再操作"); return; }
  const method = op === "talk" ? "talk" : op === "pickup" ? "pickup" : "interact";
  if (world[method]("player", entity.content_id)) {
    showToast(`${op === "talk" ? "对话" : op === "pickup" ? "拾取" : "交互"}：${nameOf(entity.content_id)}`);
  }
}
function showToast(text) {
  if (!text) return;
  el.toast.textContent = text;
  el.toast.classList.add("show");
  toastTimer = 2.4;
}
function showDialogue(event) {
  const speaker = event.data?.speaker ?? event.data?.target ?? "场景";
  const text = event.data?.text ?? event.data?.node ?? "……";
  el.dialogueSpeaker.textContent = nameOf(speaker);
  el.dialogueText.textContent = t(text);
  el.dialogue.hidden = false;
  dialogTimer = 4.0;
}
function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(sceneMeta.fog);
  scene.fog = new THREE.Fog(sceneMeta.fog, 18, 48);
  camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 120);
  camera.position.set(9, 9, 12);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 4;
  controls.maxDistance = 28;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 0.8, 0);

  scene.add(new THREE.HemisphereLight(0xc9e8e3, 0x1a2425, 1.5));
  const sun = new THREE.DirectionalLight(0xffd9b0, 2.1);
  sun.position.set(8, 14, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  const fill = new THREE.PointLight(sceneMeta.accent, 18, 24);
  fill.position.set(-5, 4, -3);
  scene.add(fill);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), new THREE.MeshStandardMaterial({ color: sceneMeta.ground, roughness: 0.86, metalness: 0.08 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(48, 24, sceneMeta.accent, sceneMeta.accent);
  grid.material.opacity = 0.12;
  grid.material.transparent = true;
  grid.position.y = 0.01;
  scene.add(grid);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x263c40, roughness: 0.72, metalness: 0.22 });
  for (const x of [-11.5, 11.5]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 22), wallMat);
    wall.position.set(x, 2.1, 0); wall.castShadow = true; wall.receiveShadow = true; scene.add(wall);
  }
  for (const z of [-11.5, 11.5]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(22, 4.2, 0.4), wallMat);
    wall.position.set(0, 2.1, z); wall.castShadow = true; wall.receiveShadow = true; scene.add(wall);
  }
  for (const x of [-8, 0, 8]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.35), new THREE.MeshBasicMaterial({ color: sceneMeta.accent }));
    lamp.position.set(x, 4.0, -7.5); scene.add(lamp);
  }
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}
function makeView(entity) {
  const group = new THREE.Group();
  const color = COLORS[entity.kind] ?? 0xffffff;
  let geometry;
  if (entity.kind === "player" || entity.kind === "actor") geometry = new THREE.CapsuleGeometry(0.34, 0.82, 4, 12);
  else if (entity.kind === "item") geometry = new THREE.OctahedronGeometry(0.28, 0);
  else geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.2, emissive: color, emissiveIntensity: entity.kind === "item" ? 0.35 : 0.06 }));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.position.y = entity.kind === "item" ? 0.42 : entity.kind === "prop" ? 0.55 : 0.78;
  group.add(mesh);
  if (entity.interactable || entity.kind === "item") {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.65, 28), new THREE.MeshBasicMaterial({ color: 0xf7d477, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; group.add(ring);
  }
  scene.add(group);
  return group;
}
function syncViews() {
  const alive = new Set();
  for (const entity of current.state.entities) {
    const key = `${entity.id.index}:${entity.id.generation}`;
    alive.add(key);
    let group = views.get(key);
    if (!group) { group = makeView(entity); views.set(key, group); }
    const p = entityPosition(entity);
    group.position.lerp(new THREE.Vector3(p.x, 0, p.z), 0.35);
    group.rotation.y = entity.transform.yaw ?? 0;
  }
  for (const [key, group] of views) {
    if (!alive.has(key)) { scene.remove(group); views.delete(key); }
  }
}
function renderHud() {
  if (!current) return;
  const state = current.state;
  const player = playerEntity();
  const quests = Object.entries(state.quests ?? {});
  const active = quests.filter(([, q]) => q.active && !q.completed);
  const done = quests.filter(([, q]) => q.completed);
  el.title.textContent = active.length ? t(current.quest_titles?.[active[0][0]] ?? active[0][0]) : (done.length ? "已完成" : "自由探索");
  el.objectives.innerHTML = quests.length
    ? quests.map(([id, q]) => `<li class="${q.completed ? "done" : ""}">${q.completed ? "✓ " : "● "}${t(current.quest_titles?.[id] ?? id)}</li>`).join("")
    : '<li class="empty">没有任务</li>';
  const inv = player?.inventory ?? [];
  el.inventory.innerHTML = inv.length ? inv.map((s) => `<span>${t(current.names?.[s.item] ?? s.item)} ×${s.count}</span>`).join("") : '<span class="empty">空</span>';
  const flags = Object.entries(state.flags ?? {}).filter(([, v]) => v).slice(0, 4);
  el.flags.innerHTML = flags.length ? flags.map(([k]) => `<span>${k}</span>`).join("") : "";
  el.clock.textContent = clock(state.clock_minutes);
  el.tick.textContent = String(state.tick ?? 0);
  el.hash.textContent = current.final_hash ?? "—";
  el.footPack.textContent = current.pack_id ?? "—";
}
function handleEvents() {
  let events;
  try { events = JSON.parse(world.poll_events()); } catch { return; }
  for (const event of events) {
    if (event.kind === "toast") showToast(t(event.data?.text ?? ""));
    else if (event.kind === "dialogue_started") showDialogue(event);
    else if (event.kind === "item_acquired") showToast(`获得：${nameOf(event.data?.item ?? "")}`);
  }
}
function loop(now) {
  requestAnimationFrame(loop);
  if (!world) return;
  const dt = Math.min(now - last, 100); last = now;
  if (!paused) {
    const mx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    const mz = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
    world.set_move(mx, mz);
    acc += dt * 1000;
    let n = 0;
    while (acc >= TICK_US && n < 4) { world.tick(TICK_US); acc -= TICK_US; n++; }
    current = JSON.parse(world.state());
    handleEvents();
    renderHud();
    syncViews();
  }
  const player = playerEntity();
  if (player) {
    const p = entityPosition(player);
    controls.target.lerp(new THREE.Vector3(p.x, 1.0, p.z), 0.1);
  }
  controls.update();
  renderer.render(scene, camera);
  if (toastTimer > 0) { toastTimer -= dt / 1000; if (toastTimer <= 0) el.toast.classList.remove("show"); }
  if (dialogTimer > 0) { dialogTimer -= dt / 1000; if (dialogTimer <= 0) el.dialogue.hidden = true; }
}
function bindUi() {
  el.pause.addEventListener("click", () => { paused = !paused; el.pause.textContent = paused ? "继续" : "暂停"; });
  document.getElementById("btn-interact").addEventListener("click", () => act(nearest("prop"), "interact"));
  document.getElementById("btn-pickup").addEventListener("click", () => act(nearest("item"), "pickup"));
  document.getElementById("btn-talk").addEventListener("click", () => act(nearest("actor"), "talk"));
  document.getElementById("btn-reset").addEventListener("click", () => { world.reset(); current = JSON.parse(world.state()); views.forEach((g) => scene.remove(g)); views.clear(); syncViews(); renderHud(); });
  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    const key = event.key.toLowerCase();
    if (MOVE_KEYS.has(key)) { keys.add(key); event.preventDefault(); return; }
    if (key === "e") act(nearest("prop"), "interact");
    if (key === "f") act(nearest("item"), "pickup");
    if (key === "t") act(nearest("actor"), "talk");
    if (key === "p") el.pause.click();
  });
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
}
async function boot() {
  try {
    await init();
    const response = await fetch(`./packs/${sceneId}.data`);
    if (!response.ok) throw new Error(`packs/${sceneId}.data HTTP ${response.status}`);
    world = new PreviewWorld(await response.text());
    current = JSON.parse(world.state());
    el.subtitle.textContent = `${sceneMeta.title} · 同一份 wasm 世界状态`;
    document.title = `${sceneMeta.title} · RefuWorld`;
    buildScene();
    bindUi();
    syncViews();
    renderHud();
    el.loading.classList.add("hidden");
    requestAnimationFrame(loop);
  } catch (error) {
    el.loading.innerHTML = `<p style="color:#ffb4a0">加载失败：${String(error)}</p>`;
    console.error(error);
  }
}
boot();
