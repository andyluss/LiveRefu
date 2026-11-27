import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import init, { PreviewWorld } from "./pkg/world_wasm.js";

const TICK_US = 16666;
const canvas = document.getElementById("scene");
const el = Object.fromEntries(["quest-title","quest-objectives","inventory","flags","clock","tick","hash","toast","dialogue","dialogue-speaker","dialogue-text","loading","status-text","btn-pause"].map((id) => [id, document.getElementById(id)]));
let world, current, renderer, scene, camera, controls;
let paused = false, last = performance.now(), acc = 0, toastTimer = 0, dialogTimer = 0, intro = 0;
let controlsAuto = false;
const keys = new Set();
const views = new Map();
const gate = { panels: [], light: null, open: 0 };
const rain = [];
let water, craneHook, stars;

const COLORS = { player: 0x65e2d3, actor: 0xffb15c, prop: 0x78908f, item: 0xffd56a };
const TICK_KEYS = new Set(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"]);

function mat(color, roughness = 0.6, metalness = 0.15, emissive = 0, intensity = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: intensity });
}

function box(name, w, h, d, x, y, z, material, parent = scene, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.name = name; mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

function textTexture(lines, options = {}) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = options.bg || "#07161a"; ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = options.line || "#2e5d5d"; ctx.lineWidth = 8; ctx.strokeRect(10, 10, 492, 236);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = options.ink || "#d9f2eb";
  ctx.font = `700 ${options.size || 54}px -apple-system, "PingFang SC", sans-serif`;
  lines.forEach((line, i) => ctx.fillText(line, 256, 108 + i * 58));
  if (options.sub) { ctx.fillStyle = options.accent || "#6fe7dc"; ctx.font = "500 22px Menlo, monospace"; ctx.fillText(options.sub, 256, 218); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}

function sign(text, sub, x, y, z, w, h, ry = 0) {
  const tex = textTexture([text], { sub, size: text.length > 5 ? 44 : 54 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = Math.PI + ry; scene.add(m); return m;
}

function container(x, z, color, label, ry = 0) {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = ry; scene.add(group);
  box("container", 5.4, 2.6, 2.4, 0, 1.3, 0, mat(color, 0.72, 0.35), group);
  const dark = mat(0x101f22, 0.8, 0.3);
  for (let i = -2; i <= 2; i++) {
    box("rib", 0.12, 2.35, 2.46, i * 1.05, 1.3, 0, dark, group, false);
  }
  box("top", 5.45, 0.12, 2.45, 0, 2.66, 0, dark, group, false);
  const tex = textTexture([label], { bg: "#0b1b1c", line: "#466b68", ink: "#d9e7e2", sub: "DOCK 07 / CARGO", size: 68 });
  const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.35), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  labelMesh.position.set(0, 1.45, 1.23); group.add(labelMesh);
  return group;
}

function makeWorker(kind) {
  const g = new THREE.Group();
  const skin = mat(0xc98e6c, 0.62, 0.05);
  const coat = mat(kind === "player" ? 0x1d5655 : 0x6d3c26, 0.7, 0.12);
  const vest = mat(kind === "player" ? 0x62d7c2 : 0xffb15c, 0.6, 0.1, 0x1b4946, 0.15);
  const pants = mat(0x15272c, 0.78, 0.15);
  const boot = mat(0x101b1e, 0.8, 0.2);
  const hardhat = mat(0xf0c15b, 0.45, 0.35);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.72, 4, 10), coat); torso.position.y = 1.12; torso.castShadow = true; g.add(torso);
  const vestMesh = box("vest", 0.5, 0.52, 0.32, 0, 1.18, -0.02, vest, g); vestMesh.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 16), skin); head.position.y = 1.72; head.castShadow = true; g.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hardhat); helmet.position.y = 1.79; helmet.castShadow = true; g.add(helmet);
  box("helmet-brim", 0.42, 0.045, 0.3, 0, 1.75, 0.09, hardhat, g);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.62, 3, 7), pants); leg.position.set(side * 0.13, 0.48, 0); leg.castShadow = true; g.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.32), boot); shoe.position.set(side * 0.13, 0.1, 0.04); shoe.castShadow = true; g.add(shoe);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.55, 3, 7), coat); arm.position.set(side * 0.33, 1.05, 0); arm.rotation.z = side * 0.12; arm.castShadow = true; g.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), skin); hand.position.set(side * 0.37, 0.76, 0); g.add(hand);
  }
  // reflective strips
  box("strip-a", 0.5, 0.06, 0.34, 0, 1.34, -0.02, mat(0xe5e8dc, 0.4, 0.2, 0xe5e8dc, 0.25), g, false);
  box("strip-b", 0.5, 0.06, 0.34, 0, 1.06, -0.02, mat(0xe5e8dc, 0.4, 0.2, 0xe5e8dc, 0.25), g, false);
  if (kind === "guide") {
    const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.03), mat(0x1a4d54, 0.3, 0.2, 0x2ec7c0, 0.35));
    tablet.position.set(0.28, 1.02, -0.28); tablet.rotation.x = -0.35; g.add(tablet);
  }
  return g;
}

function makeKeycard() {
  const g = new THREE.Group();
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.26, 0.035), mat(0xe3d8b8, 0.42, 0.2, 0xffd56a, 0.25));
  card.rotation.x = -0.25; g.add(card);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.04), mat(0xffb15c, 0.4, 0.2, 0xffb15c, 0.5)); strip.position.y = -0.06; g.add(strip);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.48, 32), new THREE.MeshBasicMaterial({ color: 0xffd56a, side: THREE.DoubleSide, transparent: true, opacity: 0.45 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = -0.3; g.add(ring);
  g.position.y = 0.7; return g;
}

function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030b10);
  scene.fog = new THREE.FogExp2(0x061318, 0.026);
  camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 140);
  camera.position.set(13, 9, -14);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.4, 4);
  controls.enableDamping = true; controls.dampingFactor = 0.05;
  controls.minDistance = 3.5; controls.maxDistance = 22; controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotateSpeed = 0.4;

  scene.add(new THREE.HemisphereLight(0x9bd5d5, 0x081014, 2.1));
  const moon = new THREE.DirectionalLight(0xa9c9e8, 2.3); moon.position.set(-8, 14, -6); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.camera.left = -18; moon.shadow.camera.right = 18; moon.shadow.camera.top = 18; moon.shadow.camera.bottom = -18; scene.add(moon);
  const gateLight = new THREE.SpotLight(0xffb15c, 130, 22, Math.PI / 4.5, 0.55, 1.4); gateLight.position.set(0, 7, 1.5); gateLight.target.position.set(0, 0, 6); scene.add(gateLight, gateLight.target);
  const sideLight = new THREE.PointLight(0x64e1da, 18, 18); sideLight.position.set(-7, 4, 2); scene.add(sideLight);
  const warm = new THREE.PointLight(0xffa04d, 12, 12); warm.position.set(7, 3, -5); scene.add(warm);
  const quayFill = new THREE.PointLight(0x5ee0d8, 16, 20); quayFill.position.set(-3, 5, 1); scene.add(quayFill);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(52, 52), mat(0x0a1a1d, 0.34, 0.5));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(26, 0.6, 0.5), mat(0x132b2e, 0.5, 0.35)); edge.position.set(0, 0.3, 13); edge.castShadow = true; edge.receiveShadow = true; scene.add(edge);
  for (const x of [-10, -5, 0, 5, 10]) { box("bollard", 0.28, 0.7, 0.28, x, 0.35, 12.8, mat(0x1c3538, 0.45, 0.5)); }

  water = new THREE.Mesh(new THREE.PlaneGeometry(100, 38, 1, 1), mat(0x03151c, 0.18, 0.85));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.65, 22); water.receiveShadow = true; scene.add(water);
  for (let i = 0; i < 20; i++) {
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(1.5 + Math.random() * 3, 0.035), new THREE.MeshBasicMaterial({ color: 0x4d9da1, transparent: true, opacity: 0.12 + Math.random() * 0.1 }));
    foam.rotation.x = -Math.PI / 2; foam.position.set(-24 + Math.random() * 48, -0.62, 14 + Math.random() * 14); scene.add(foam);
  }

  // warehouse / gate wall
  box("warehouse-back", 31, 7, 0.7, 0, 3.5, 11.5, mat(0x0b1b20, 0.7, 0.25));
  for (const x of [-13, -8, -3, 3, 8, 13]) box("column", 0.32, 6.2, 0.5, x, 3.1, 10.9, mat(0x1e3435, 0.6, 0.4));
  box("warehouse-roof", 31, 0.35, 4.5, 0, 7.0, 9.5, mat(0x071216, 0.78, 0.3));
  for (let i = 0; i < 12; i++) box("roof-rib", 0.16, 0.1, 4.4, -14.5 + i * 2.6, 7.22, 9.5, mat(0x21494d, 0.5, 0.4), scene, false);

  // cargo gate (B-07)
  const gateGroup = new THREE.Group(); gateGroup.position.set(0, 0, 5.8); scene.add(gateGroup);
  box("gate-frame-l", 0.3, 4.4, 0.35, -2.05, 2.2, 0, mat(0x355257, 0.5, 0.5), gateGroup);
  box("gate-frame-r", 0.3, 4.4, 0.35, 2.05, 2.2, 0, mat(0x355257, 0.5, 0.5), gateGroup);
  box("gate-top", 4.4, 0.32, 0.35, 0, 4.35, 0, mat(0x355257, 0.5, 0.5), gateGroup);
  const panelMat = mat(0x234247, 0.55, 0.45);
  for (const side of [-1, 1]) {
    const panel = new THREE.Group(); panel.position.set(side * 1.02, 2.15, 0); gateGroup.add(panel); gate.panels.push(panel);
    box("panel", 1.85, 4.0, 0.22, 0, 0, 0, panelMat, panel);
    for (let i = -3; i <= 3; i++) box("panel-rib", 1.7, 0.035, 0.05, 0, i * 0.52, 0.14, mat(0x0b171a, 0.8, 0.2), panel, false);
    box("warn", 0.45, 0.12, 0.06, side * 0.65, -1.25, 0.15, mat(0xd46a35, 0.42, 0.2, 0xd46a35, 0.25), panel, false);
  }
  gate.light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 8), new THREE.MeshBasicMaterial({ color: 0xd95b4c })); gate.light.position.set(0, 4.55, 0.2); gateGroup.add(gate.light);
  sign("B-07", "RESTRICTED CARGO", 0, 4.9, 5.65, 3.2, 0.78);
  box("gate-threshold", 4.2, 0.06, 1.2, 0, 0.03, 6.2, mat(0x234247, 0.55, 0.45));

  // container yard
  container(-8.3, -3.5, 0x1f4f52, "K-217");
  container(-8.3, -0.6, 0x6c3f29, "M-114", 0.03);
  container(-8.3, 2.2, 0x254b5e, "A-908", -0.02);
  container(-8.3, -3.5, 0x5b3b2a, "H-021", 0.02).position.y = 2.65;
  container(8.6, 3.7, 0x334f45, "C-330", Math.PI);
  container(8.6, 0.9, 0x6c3f29, "V-087", Math.PI);
  container(8.6, 3.7, 0x1e4a5e, "D-712", Math.PI).position.y = 2.65;

  // gantry crane
  const crane = new THREE.Group(); crane.position.set(-12.2, 0, -2.8); scene.add(crane);
  const steel = mat(0x4d6b70, 0.48, 0.72);
  for (const side of [-1, 1]) box("crane-leg", 0.32, 8.5, 0.32, side * 3.2, 4.25, 0, steel, crane);
  box("crane-beam", 7.0, 0.38, 0.42, 0, 8.35, 0, steel, crane);
  for (let i = 0; i < 5; i++) { const brace = box("brace", 0.12, 2.0, 0.12, -2.6 + i * 1.3, 6.4, 0, steel, crane); brace.rotation.z = 0.55; }
  const trolley = box("trolley", 0.8, 0.5, 0.7, 1.2, 8.0, 0, mat(0xffa04d, 0.55, 0.3, 0xffa04d, 0.15), crane);
  craneHook = new THREE.Group(); craneHook.position.set(1.2, 5.4, 0); crane.add(craneHook);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.6, 6), mat(0x8ba5a0, 0.4, 0.8)); cable.position.y = 1.3; craneHook.add(cable);
  box("hook", 0.22, 0.22, 0.22, 0, -0.05, 0, mat(0xffa04d, 0.4, 0.5), craneHook);

  // ship silhouette
  const ship = new THREE.Group(); ship.position.set(18, 0, 24); ship.rotation.y = -0.1; scene.add(ship);
  box("hull", 18, 3.2, 5.2, 0, 0.8, 0, mat(0x14262a, 0.6, 0.4), ship);
  box("bridge", 4.5, 4.0, 4.3, 3.6, 4.0, 0, mat(0x1d3032, 0.55, 0.45), ship);
  box("funnel", 1.0, 2.2, 1.0, 4.4, 7.0, 0, mat(0x182b2c, 0.6, 0.5), ship);
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc46b })); p.position.set(-5 + i * 3, 2.7, 2.7); ship.add(p); }

  // dock lamps + puddles
  for (const x of [-7, 7]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 6.2, 8), mat(0x38585c, 0.4, 0.65)); pole.position.set(x, 3.1, -2.5); pole.castShadow = true; scene.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 8), new THREE.MeshBasicMaterial({ color: 0xffbd72 })); lamp.position.set(x, 6.0, -2.5); scene.add(lamp);
    const glow = new THREE.PointLight(0xffa95c, 8, 9); glow.position.set(x, 5.8, -2.5); scene.add(glow);
  }
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 2.0, 32), new THREE.MeshBasicMaterial({ color: 0x102c31, transparent: true, opacity: 0.38, side: THREE.DoubleSide }));
    p.rotation.x = -Math.PI / 2; p.position.set(-7 + Math.random() * 14, 0.012, -5 + Math.random() * 12); scene.add(p);
  }

  // rain / stars
  const rainGeo = new THREE.BufferGeometry(); const rp = [];
  for (let i = 0; i < 900; i++) rp.push(-22 + Math.random() * 44, Math.random() * 16, -12 + Math.random() * 32);
  rainGeo.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3));
  const rainMesh = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x9bc7c9, size: 0.035, transparent: true, opacity: 0.42, depthWrite: false }));
  scene.add(rainMesh); rain.push({ mesh: rainMesh, speed: 12 });
  const starGeo = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 260; i++) sp.push(-60 + Math.random() * 120, 12 + Math.random() * 30, -40 + Math.random() * 80);
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3)); stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x83a8b0, size: 0.12, transparent: true, opacity: 0.55 })); scene.add(stars);

  sign("DOCK 07", "NIGHT FREIGHT / REFUWORLD", -8.8, 5.2, 10.8, 4.2, 1.15, 0);
  sign("CARGO B", "AUTHORIZED PERSONNEL", 8.8, 4.2, 10.8, 3.4, 1.0, 0);

  window.addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
}

function makeView(entity) {
  if (entity.content_id === "demo.dock.door") return null;
  let group;
  if (entity.content_id === "player") group = makeWorker("player");
  else if (entity.content_id === "demo.dock.guide") group = makeWorker("guide");
  else if (entity.kind === "item") group = makeKeycard();
  else {
    group = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat(COLORS.prop, 0.6, 0.25)); m.position.y = 0.4; m.castShadow = true; group.add(m);
  }
  scene.add(group);
  return group;
}

function syncViews() {
  const alive = new Set();
  for (const entity of current.state.entities) {
    if (entity.content_id === "demo.dock.door") continue;
    const key = `${entity.id.index}:${entity.id.generation}`; alive.add(key);
    let group = views.get(key);
    if (!group) { group = makeView(entity); if (!group) continue; views.set(key, group); }
    const p = entity.transform.position;
    group.position.lerp(new THREE.Vector3(p[0], 0, p[2]), 0.35);
    group.rotation.y = entity.transform.yaw ?? 0;
  }
  for (const [key, group] of views) { if (!alive.has(key)) { scene.remove(group); views.delete(key); } }
}

function playerEntity() {
  return current?.state?.entities?.find((e) => e.id.index === current.state.player.index && e.id.generation === current.state.player.generation);
}
function nearest(kind) {
  const p = playerEntity(); if (!p) return null;
  let best = null, bestD = 3.2; const a = new THREE.Vector3(p.transform.position[0], 0, p.transform.position[2]);
  for (const e of current.state.entities) { if (e.kind !== kind) continue; const d = a.distanceTo(new THREE.Vector3(e.transform.position[0], 0, e.transform.position[2])); if (d < bestD) { best = e; bestD = d; } }
  return best;
}
function t(text) {
  if (typeof text !== "string") return text ?? "";
  if (!text.startsWith("loc:")) return text;
  return current?.loc?.[text.slice(4)] ?? text.slice(4);
}
function nameOf(id) { return id === "player" ? "你" : t(current?.names?.[id] ?? id); }
function act(kind, method) {
  const target = nearest(kind);
  if (!target) { showToast("再靠近一点"); return; }
  if (world[method]("player", target.content_id)) showToast(`${method === "talk" ? "对话" : method === "pickup" ? "拾取" : "交互"}：${nameOf(target.content_id)}`);
}
function showToast(text) { if (!text) return; el.toast.textContent = text; el.toast.classList.add("show"); toastTimer = 2.6; }
function showDialogue(event) {
  el["dialogue-speaker"].textContent = nameOf(event.data?.speaker ?? "demo.dock.guide");
  el["dialogue-text"].textContent = event.data?.text ?? "……";
  el.dialogue.hidden = false; dialogTimer = 4.5;
}

function renderHud() {
  if (!current) return;
  const state = current.state;
  const quests = Object.entries(state.quests ?? {});
  const active = quests.filter(([, q]) => q.active && !q.completed);
  const done = quests.filter(([, q]) => q.completed);
  el["quest-title"].textContent = active.length ? (current.quest_titles ? t(current.quest_titles[active[0][0]]) : active[0][0]) : done.length ? "已完成" : "自由探索";
  const q = active[0]?.[1] ?? done[0]?.[1];
  const progress = q?.progress ?? {};
  const objectives = [
    { key: "talk:demo.dock.guide", label: "与调度员报到" },
    { key: "flag:flag.dock.open", label: "用通行证打开 B 舱门" },
  ];
  el["quest-objectives"].innerHTML = quests.length
    ? objectives.map((o) => `<li class="${progress[o.key] ? "done" : ""}">${progress[o.key] ? "✓ " : "● "}${o.label}</li>`).join("")
    : '<li class="empty">没有任务</li>';

  const player = playerEntity();
  const inv = player?.inventory ?? [];
  el.inventory.innerHTML = inv.length ? inv.map((s) => `<span>${t(current.names?.[s.item] ?? s.item)} ×${s.count}</span>`).join("") : '<span class="empty">空</span>';
  const flags = Object.entries(state.flags ?? {}).filter(([, v]) => v).slice(0, 3);
  el.flags.innerHTML = flags.map(([k]) => `<span>${k.replace("flag.", "")}</span>`).join("");
  const minutes = ((state.clock_minutes ?? 0) % 1440 + 1440) % 1440;
  el.clock.textContent = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  el.tick.textContent = String(state.tick ?? 0); el.hash.textContent = current.final_hash ?? "—";
  const door = state.entities.find((e) => e.content_id === "demo.dock.door")?.door;
  gate.open += ((door?.open ? 1 : 0) - gate.open) * 0.12;
  for (const panel of gate.panels) panel.position.y = 2.15 + gate.open * 4.05;
  if (gate.light) gate.light.material.color.setHex(door?.open ? 0x6fe7dc : 0xd95b4c);
  el["status-text"].textContent = door?.open ? "B 舱门已开启" : "B 舱门锁定";
}

function bindUi() {
  document.getElementById("btn-interact").addEventListener("click", () => act("prop", "interact"));
  document.getElementById("btn-pickup").addEventListener("click", () => act("item", "pickup"));
  document.getElementById("btn-talk").addEventListener("click", () => act("actor", "talk"));
  document.getElementById("btn-reset").addEventListener("click", () => { world.reset(); current = JSON.parse(world.state()); views.forEach((g) => scene.remove(g)); views.clear(); syncViews(); renderHud(); });
  el["btn-pause"].addEventListener("click", () => { paused = !paused; el["btn-pause"].textContent = paused ? "继续" : "暂停"; });
  document.getElementById("btn-camera").addEventListener("click", (e) => { controlsAuto = !controlsAuto; controls.autoRotate = controlsAuto; e.currentTarget.setAttribute("aria-pressed", String(controlsAuto)); });
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const k = e.key.toLowerCase();
    if (TICK_KEYS.has(k)) { keys.add(k); e.preventDefault(); return; }
    if (k === "e") act("prop", "interact");
    if (k === "f") act("item", "pickup");
    if (k === "t") act("actor", "talk");
    if (k === "p") el["btn-pause"].click();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
}

function handleEvents() {
  let events; try { events = JSON.parse(world.poll_events()); } catch { return; }
  for (const event of events) {
    if (event.kind === "toast") showToast(event.data?.text ?? "");
    else if (event.kind === "dialogue_started") showDialogue(event);
    else if (event.kind === "item_acquired") showToast(`获得：${String(event.data?.item ?? "").replace("item.dock.", "")}`);
    else if (event.kind === "door_opened") showToast("B 舱门开启");
  }
}

function animate(dt, now) {
  const rv = rain[0]; if (rv) { const pos = rv.mesh.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { let y = pos.getY(i) - rv.speed * dt; if (y < 0) y = 15; pos.setY(i, y); } pos.needsUpdate = true; }
  if (stars) stars.rotation.y += dt * 0.003;
  if (craneHook) craneHook.position.y = 5.4 + Math.sin(now * 0.0003) * 0.15;
  for (const p of gate.panels) p.rotation.z = Math.sin(now * 0.001) * 0.0015;
  if (intro < 1) {
    intro = Math.min(1, intro + dt / 2.8);
    const e = 1 - Math.pow(1 - intro, 3);
    camera.position.lerpVectors(new THREE.Vector3(13, 9, -14), new THREE.Vector3(8, 5.2, -9), e);
    controls.target.lerpVectors(new THREE.Vector3(0, 1.4, 4), new THREE.Vector3(0, 1.4, 2.5), e);
  }
  const p = playerEntity();
  if (p) controls.target.lerp(new THREE.Vector3(p.transform.position[0], 1.4, p.transform.position[2] + 2.8), 0.06);
}

function loop(now) {
  requestAnimationFrame(loop);
  if (!world) return;
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  if (!paused) {
    const mx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    const mz = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
    world.set_move(mx, mz);
    acc += dt * 1000; let n = 0;
    while (acc >= TICK_US && n < 4) { world.tick(TICK_US); acc -= TICK_US; n++; }
    current = JSON.parse(world.state()); handleEvents(); renderHud(); syncViews();
  }
  controls.update();
  animate(dt, now);
  renderer.render(scene, camera);
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) el.toast.classList.remove("show"); }
  if (dialogTimer > 0) { dialogTimer -= dt; if (dialogTimer <= 0) el.dialogue.hidden = true; }
}

async function boot() {
  try {
    await init();
    const res = await fetch("./packs/demo.dock.data");
    if (!res.ok) throw new Error(`packs/demo.dock.data HTTP ${res.status}`);
    world = new PreviewWorld(await res.text());
    current = JSON.parse(world.state());
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
