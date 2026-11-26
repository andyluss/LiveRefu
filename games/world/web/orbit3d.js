import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import init, { PreviewWorld } from "./pkg/world_wasm.js";

const TICK_US = 16666;
const canvas = document.getElementById("scene");
const el = {
  loading: document.getElementById("loading"),
  questTitle: document.getElementById("quest-title"),
  objectives: document.getElementById("quest-objectives"),
  inventory: document.getElementById("inventory"),
  flags: document.getElementById("flags"),
  clock: document.getElementById("clock"),
  tick: document.getElementById("tick"),
  hash: document.getElementById("hash"),
  footHash: document.getElementById("foot-hash"),
  hint: document.getElementById("hint"),
  toast: document.getElementById("toast"),
  dialogue: document.getElementById("dialogue"),
  dialogueSpeaker: document.getElementById("dialogue-speaker"),
  dialogueText: document.getElementById("dialogue-text"),
  pause: document.getElementById("btn-pause"),
};

let renderer, scene, camera, controls, composer, bloom;
let world, pack, current;
let paused = false;
let last = performance.now();
let acc = 0;
let intro = 0;
let introStart = performance.now();
let toastTimer = 0;
let dialogueTimer = 0;
let hudTimer = 0;
let moving = false;
let pointerStart = null;
let themeDark = document.documentElement.dataset.theme === "dark";
const keys = new Set();
const moveKeys = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
const pickables = [];
let playerGroup, commanderGroup, doorGroup, doorPanels = [], badgeGroup, holoGroup, holoRings = [], planet, ring, stars, pathLine, playerLight, doorLight, hemi, sun;
let doorAnim = 0;
const M = {};

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smooth(t) { return t * t * (3 - 2 * t); }

function translate(text) {
  if (typeof text !== "string") return text;
  if (!text.startsWith("loc:")) return text;
  return current?.loc?.[text.slice(4)] ?? text.slice(4);
}
function nameOf(id) {
  if (!id) return "?";
  if (id === "player") return "你";
  return translate(current?.names?.[id] ?? id);
}
function clockText(minutes) {
  const m = ((Number(minutes) || 0) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function textSprite(text, color = "#dff8f2", accent = "#5ce3cf") {
  const map = canvasTexture(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(4, 12, 18, 0.82)"; g.beginPath(); g.roundRect(8, 22, w - 16, h - 44, 26); g.fill();
    g.strokeStyle = accent; g.lineWidth = 3; g.stroke();
    g.fillStyle = color; g.font = "700 40px ui-sans-serif, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 2);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
  sprite.scale.set(2.2, 0.55, 1); return sprite;
}
function screenTexture() {
  return canvasTexture(512, 320, (g, w, h) => {
    g.fillStyle = "#04161b"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#1f5c60"; g.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = "#54e0c2"; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i < 28; i++) { const x = i * 18 + 8; const y = h * 0.55 + Math.sin(i * 0.4) * 34; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
    g.fillStyle = "#a9f7e6"; g.font = "700 24px ui-monospace, monospace"; g.fillText("ORBITAL RING / 07", 22, 40);
    g.fillStyle = "#f0a06e"; g.font = "700 18px ui-monospace, monospace"; g.fillText("CORE  94%   O2 21%", 22, 70);
    g.fillStyle = "#78bfb3"; g.font = "16px ui-monospace, monospace";
    ["Reactor ....... LOCKED", "Beacon ........ OK", "Rotation ...... 0.08g"].forEach((line, i) => g.fillText(line, 22, 112 + i * 26));
  });
}

function box(parent, w, h, d, mat, x, y, z, rounded = true) {
  const geo = rounded ? new RoundedBoxGeometry(w, h, d, 3, 0.04) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent, rt, rb, h, mat, x, y, z, seg = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function glow(parent, w, h, d, mat, x, y, z) { return box(parent, w, h, d, mat, x, y, z, false); }

function makeMaterials() {
  M.floor = new THREE.MeshStandardMaterial({ color: 0x12252b, roughness: 0.28, metalness: 0.65, envMapIntensity: 0.9 });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x0a1116, roughness: 0.5, metalness: 0.5 });
  M.metal = new THREE.MeshStandardMaterial({ color: 0x6b8588, roughness: 0.25, metalness: 0.9 });
  M.white = new THREE.MeshStandardMaterial({ color: 0xb9d3d3, roughness: 0.35, metalness: 0.2 });
  M.suit = new THREE.MeshStandardMaterial({ color: 0x2b6a70, roughness: 0.5, metalness: 0.2 });
  M.orange = new THREE.MeshStandardMaterial({ color: 0xa85a32, roughness: 0.55, metalness: 0.2 });
  M.cyan = new THREE.MeshStandardMaterial({ color: 0x062a2c, emissive: 0x5ce3cf, emissiveIntensity: 1.5, roughness: 0.25 });
  M.amber = new THREE.MeshStandardMaterial({ color: 0x4a2710, emissive: 0xf0a06e, emissiveIntensity: 1.4, roughness: 0.3 });
  M.magenta = new THREE.MeshStandardMaterial({ color: 0x2b1630, emissive: 0xc25cff, emissiveIntensity: 1.2, roughness: 0.3 });
  M.screen = new THREE.MeshStandardMaterial({ map: screenTexture(), emissive: 0x2b8f88, emissiveIntensity: 0.5, roughness: 0.3 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0x83cfe0, transparent: true, opacity: 0.06, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
}

function makeSpace() {
  const bg = new THREE.Group(); scene.add(bg);
  const planetMat = new THREE.MeshStandardMaterial({ color: 0x1c4f6b, emissive: 0x071522, emissiveIntensity: 0.5, roughness: 0.7, metalness: 0.1 });
  planet = new THREE.Mesh(new THREE.SphereGeometry(13, 48, 32), planetMat);
  planet.position.set(19, 8, 40); bg.add(planet);
  const haze = new THREE.Mesh(new THREE.SphereGeometry(13.35, 48, 32), new THREE.MeshBasicMaterial({ color: 0x4fa8c8, transparent: true, opacity: 0.06, side: THREE.BackSide, depthWrite: false }));
  haze.position.copy(planet.position); bg.add(haze);
  ring = new THREE.Mesh(new THREE.TorusGeometry(20, 0.16, 8, 120), new THREE.MeshStandardMaterial({ color: 0x9bc8d8, emissive: 0x2f5f72, emissiveIntensity: 0.4, roughness: 0.5 }));
  ring.position.copy(planet.position); ring.rotation.set(1.25, 0.2, 0.1); bg.add(ring);
  const starGeo = new THREE.BufferGeometry();
  const count = 2200;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 45 + Math.random() * 45;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    pos[i * 3 + 1] = Math.cos(phi) * r;
    pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfefff, size: 0.18, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(stars);
}

function makeStation() {
  const room = new THREE.Group(); scene.add(room);
  cylinder(room, 14, 14.2, 0.3, M.floor, 0, -0.15, 0, 64).receiveShadow = true;
  for (const r of [4.2, 8.2, 12.2]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 6, 128), r === 8.2 ? M.cyan : M.amber);
    t.rotation.x = Math.PI / 2; t.position.y = 0.06; room.add(t);
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x = Math.cos(a) * 14.1;
    const z = Math.sin(a) * 14.1;
    box(room, 0.22, 8.2, 0.22, M.dark, x, 4.1, z, false);
    if (i % 2 === 0) glow(room, 0.05, 3.8, 0.05, M.cyan, x * 0.985, 3.0, z * 0.985);
  }
  for (const y of [2.2, 5.8, 8.1]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(14.15, 0.07, 6, 128), y === 2.2 ? M.cyan : M.metal);
    t.rotation.x = Math.PI / 2; t.position.y = y; room.add(t);
  }
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(14.25, 14.25, 8.2, 64, 1, true), M.glass);
  glass.position.y = 4.1; room.add(glass);

  // 中央全息台。
  holoGroup = new THREE.Group(); holoGroup.position.set(-3.8, 0, 1.8); room.add(holoGroup);
  cylinder(holoGroup, 1.5, 1.7, 0.35, M.dark, 0, 0.2, 0, 32);
  cylinder(holoGroup, 1.1, 1.1, 0.12, M.cyan, 0, 0.45, 0, 32);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 18), new THREE.MeshBasicMaterial({ color: 0x9fffe9 }));
  orb.position.y = 1.4; holoGroup.add(orb);
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.75 + i * 0.28, 0.018, 6, 64), i === 1 ? M.magenta : M.cyan);
    t.position.y = 1.4; t.rotation.x = 0.4 + i * 0.5; holoGroup.add(t); holoRings.push(t);
  }
  const holo = new THREE.PointLight(0x6fffe0, 4, 8, 2); holo.position.y = 1.5; holoGroup.add(holo);

  // 控制台。
  for (const [x, z, ry] of [[7.5, 0.5, -0.5], [-7.5, 4.0, 0.6]]) {
    const console = new THREE.Group(); console.position.set(x, 0, z); console.rotation.y = ry; room.add(console);
    box(console, 2.4, 0.12, 1.0, M.metal, 0, 0.95, 0);
    box(console, 0.1, 0.9, 0.1, M.dark, -1.0, 0.45, 0.3);
    box(console, 0.1, 0.9, 0.1, M.dark, 1.0, 0.45, 0.3);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), M.screen);
    screen.position.set(0, 1.55, -0.25); screen.rotation.y = Math.PI; console.add(screen);
  }

  // 反应堆闸门。
  doorGroup = new THREE.Group(); doorGroup.position.set(0, 0, 8); scene.add(doorGroup);
  box(doorGroup, 0.35, 3.9, 0.6, M.dark, -1.7, 1.95, 0, false);
  box(doorGroup, 0.35, 3.9, 0.6, M.dark, 1.7, 1.95, 0, false);
  box(doorGroup, 3.75, 0.4, 0.6, M.dark, 0, 3.9, 0, false);
  box(doorGroup, 3.5, 0.1, 0.12, M.cyan, 0, 3.65, -0.35);
  for (const side of [-1, 1]) {
    const panel = new THREE.Group(); panel.position.set(side * 0.82, 1.9, 0); panel.userData.side = side;
    const shell = new THREE.Mesh(new RoundedBoxGeometry(1.55, 3.5, 0.22, 3, 0.06), M.metal);
    shell.castShadow = true; panel.add(shell);
    const window = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 32), M.cyan);
    window.rotation.x = Math.PI / 2; window.position.set(0, 0.4, -0.14); panel.add(window);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 8, 32), M.dark);
    rim.position.set(0, 0.4, -0.13); panel.add(rim);
    doorGroup.add(panel); doorPanels.push(panel);
    panel.traverse((c) => { if (c.isMesh) { c.userData.contentId = "demo.reactor"; pickables.push(c); } });
  }
  const sign = textSprite("REACTOR 07", "#dff8f2", "#f0a06e"); sign.position.set(0, 4.5, 0); doorGroup.add(sign);
  const status = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshStandardMaterial({ color: 0x2a0904, emissive: 0xff5a3c, emissiveIntensity: 4 }));
  status.position.set(0, 3.25, -0.36); doorGroup.add(status); doorGroup.userData.status = status;
  doorLight = new THREE.PointLight(0xff6a4a, 2.5, 6, 2); doorLight.position.set(0, 3.1, 1.2); doorGroup.add(doorLight);

  // 指挥官、徽章、玩家。
  commanderGroup = makeAstronaut("commander"); commanderGroup.position.set(4, 0, -2); commanderGroup.rotation.y = Math.PI; scene.add(commanderGroup);
  commanderGroup.userData.contentId = "demo.commander";
  commanderGroup.traverse((c) => { if (c.isMesh) { c.userData.contentId = "demo.commander"; pickables.push(c); } });

  badgeGroup = new THREE.Group(); badgeGroup.position.set(2, 1.2, 2); scene.add(badgeGroup);
  const badge = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.26, 0.04, 3, 0.03), new THREE.MeshStandardMaterial({ color: 0x153238, emissive: 0x5ce3cf, emissiveIntensity: 0.6, metalness: 0.5, roughness: 0.25 }));
  badgeGroup.add(badge);
  const badgeStrip = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.035, 0.05), M.amber); badgeStrip.position.set(0, 0.06, 0.03); badgeGroup.add(badgeStrip);
  const badgeLight = new THREE.PointLight(0x6fffe0, 4, 3, 2); badgeGroup.add(badgeLight);
  const badgeRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.012, 8, 48), M.cyan); badgeRing.rotation.x = Math.PI / 2; badgeRing.position.y = -1.2; badgeGroup.add(badgeRing);
  badgeGroup.userData.contentId = "item.badge";
  badgeGroup.traverse((c) => { if (c.isMesh) { c.userData.contentId = "item.badge"; pickables.push(c); } });

  playerGroup = makeAstronaut("player"); scene.add(playerGroup);
  playerLight = new THREE.PointLight(0x8fefff, 2.2, 5, 2); playerLight.position.set(0, 1.9, -0.2); playerGroup.add(playerLight);

  const pathGeo = new THREE.BufferGeometry();
  pathGeo.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
  pathLine = new THREE.Line(pathGeo, new THREE.LineDashedMaterial({ color: 0x6ff0d8, dashSize: 0.3, gapSize: 0.18, transparent: true, opacity: 0.6 }));
  pathLine.visible = false; scene.add(pathLine);
}

function makeAstronaut(kind) {
  const isPlayer = kind === "player";
  const g = new THREE.Group();
  const suit = isPlayer ? M.suit : M.white;
  const accent = isPlayer ? M.orange : M.amber;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.8, 4, 12), suit); torso.position.y = 1.3; torso.castShadow = true; g.add(torso);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.3), M.dark); pack.position.set(0, 1.35, 0.35); g.add(pack);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.62, 3, 8), M.dark); leg.position.set(side * 0.18, 0.48, 0); g.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.4), M.dark); boot.position.set(side * 0.18, 0.1, 0.05); g.add(boot);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.58, 3, 8), suit); arm.position.set(side * 0.43, 1.25, 0); arm.rotation.z = side * 0.14; g.add(arm);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.03), accent); strip.position.set(side * 0.22, 1.3, -0.34); g.add(strip);
  }
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16), M.white); helmet.position.y = 2.02; helmet.castShadow = true; g.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.245, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), new THREE.MeshStandardMaterial({ color: 0x062328, emissive: isPlayer ? 0x41e0c8 : 0xf0a06e, emissiveIntensity: 2.4, roughness: 0.12, metalness: 0.4 }));
  visor.position.set(0, 2.03, -0.13); visor.rotation.x = -Math.PI / 2; g.add(visor);
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.03), accent); badge.position.set(0.2, 1.55, -0.33); g.add(badge);
  if (!isPlayer) {
    const tag = textSprite("值班指挥官", "#eaf7f3", "#f0a06e"); tag.position.set(0, 2.8, 0); tag.scale.set(1.8, 0.45, 1); g.add(tag);
  }
  return g;
}

function initScene() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene(); scene.background = new THREE.Color(0x02050a); scene.fog = new THREE.FogExp2(0x02050a, 0.008);
  camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 140);
  camera.position.set(7.5, 4.8, -8.5);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.4, 2);
  controls.enableDamping = true; controls.dampingFactor = 0.06; controls.enablePan = false;
  controls.minDistance = 3.2; controls.maxDistance = 13; controls.maxPolarAngle = Math.PI * 0.49;

  makeMaterials();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.Scene(), 0.04).texture;
  scene.environmentIntensity = 0.2;
  pmrem.dispose();
  makeSpace();
  makeStation();

  hemi = new THREE.HemisphereLight(0x6fb7c9, 0x120b16, 0.5); scene.add(hemi);
  sun = new THREE.DirectionalLight(0x8fd8ff, 2.2); sun.position.set(-8, 9, -5); sun.target.position.set(0, 1.5, 2); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -15; sun.shadow.camera.right = 15; sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -15; scene.add(sun, sun.target);
  const p1 = new THREE.PointLight(0x5ce3cf, 18, 12, 2); p1.position.set(-6, 4.5, 2); scene.add(p1);
  const p2 = new THREE.PointLight(0xc25cff, 12, 10, 2); p2.position.set(7, 3.8, -4); scene.add(p2);
  const p3 = new THREE.PointLight(0xf0a06e, 10, 8, 2); p3.position.set(0, 2.5, 7); scene.add(p3);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.38, 0.4, 0.98);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  window.addEventListener("resize", onResize);
  window.addEventListener("refu-theme", (event) => applyTheme(event.detail.dark));
  applyTheme(document.documentElement.dataset.theme === "dark");
}

function onResize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); bloom.setSize(innerWidth, innerHeight);
}

function applyTheme(dark) {
  themeDark = dark;
  if (!scene) return;
  scene.background.set(dark ? 0x02050a : 0x9eb8c2);
  scene.fog.color.set(dark ? 0x02050a : 0x8faeb8);
  hemi.intensity = dark ? 0.5 : 1.2;
  sun.intensity = dark ? 2.2 : 3.4;
  if (bloom) bloom.strength = dark ? 0.38 : 0.18;
  renderer.toneMappingExposure = dark ? 0.98 : 1.0;
}

function updateState() {
  current = JSON.parse(world.state());
  const s = current.state;
  const player = s.entities.find((e) => e.content_id === "player");
  const actor = s.entities.find((e) => e.kind === "actor");
  const prop = s.entities.find((e) => e.door);
  const item = s.entities.find((e) => e.kind === "item");
  if (player) {
    playerGroup.position.set(player.transform.position[0], 0, player.transform.position[2]);
    playerGroup.rotation.y = THREE.MathUtils.degToRad(player.transform.yaw || 0) + Math.PI;
    let facing = null;
    const path = s.path ?? [];
    if (path.length) {
      const p = path[Math.min(s.path_index ?? 0, path.length - 1)];
      const dx = p[0] - player.transform.position[0]; const dz = p[1] - player.transform.position[2];
      if (dx * dx + dz * dz > 0.0001) facing = Math.atan2(dx, dz) + Math.PI;
    } else if (Array.isArray(s.move_intent) && Math.hypot(s.move_intent[0], s.move_intent[1]) > 0.01) {
      facing = Math.atan2(s.move_intent[0], s.move_intent[1]) + Math.PI;
    }
    if (facing !== null) playerGroup.rotation.y = lerp(playerGroup.rotation.y, facing, 0.18);
  }
  if (actor) {
    commanderGroup.position.set(actor.transform.position[0], 0, actor.transform.position[2]);
    const dx = playerGroup.position.x - commanderGroup.position.x;
    const dz = playerGroup.position.z - commanderGroup.position.z;
    if (dx * dx + dz * dz < 40) commanderGroup.rotation.y = lerp(commanderGroup.rotation.y, Math.atan2(dx, dz) + Math.PI, 0.04);
  }
  if (prop) {
    doorGroup.userData.open = !!prop.door.open;
    doorGroup.userData.status.material.emissive.setHex(prop.door.open ? 0x5ce3cf : 0xff5a3c);
    doorLight.color.setHex(prop.door.open ? 0x5ce3cf : 0xff5a3c);
  }
  if (item) { badgeGroup.visible = true; badgeGroup.position.set(item.transform.position[0], 1.2 + Math.sin(performance.now() * 0.002) * 0.05, item.transform.position[2]); }
  else badgeGroup.visible = false;
  updatePath(s);
}

function updatePath(s) {
  if (!pathLine) return;
  const path = s.path ?? [];
  if (!path.length) { pathLine.visible = false; return; }
  const player = s.entities.find((e) => e.content_id === "player");
  const pts = [new THREE.Vector3(player.transform.position[0], 0.06, player.transform.position[2])];
  for (let i = Math.max(0, s.path_index ?? 0); i < path.length; i++) pts.push(new THREE.Vector3(path[i][0], 0.06, path[i][1]));
  pathLine.geometry.setFromPoints(pts); pathLine.computeLineDistances(); pathLine.visible = pts.length > 1;
}

function updateHud() {
  if (!current) return;
  const s = current.state;
  const player = s.entities.find((e) => e.content_id === "player");
  const questId = Object.keys(pack.quests ?? {})[0];
  const quest = questId ? s.quests?.[questId] : null;
  const def = questId ? pack.quests[questId] : null;
  el.questTitle.textContent = def ? translate(def.title) : "自由探索";
  el.objectives.replaceChildren();
  if (def) {
    const done = !!quest?.completed;
    for (const obj of def.objectives ?? []) {
      const li = document.createElement("li"); li.className = done ? "done" : "";
      li.textContent = obj.kind === "talk" ? `和${nameOf(obj.target)}说话` : obj.kind === "flag" ? `完成：${obj.flag}` : obj.kind;
      el.objectives.append(li);
    }
  }
  el.inventory.replaceChildren();
  const items = player?.inventory ?? [];
  if (!items.length) el.inventory.innerHTML = '<span class="empty">背包为空</span>';
  else for (const item of items) { const div = document.createElement("div"); div.textContent = `${translate(current.names?.[item.item] ?? item.item)} ×${item.count}`; el.inventory.append(div); }
  el.flags.textContent = Object.keys(s.flags ?? {}).length ? Object.entries(s.flags).map(([k, v]) => `${k} = ${v}`).join(" · ") : "没有标记";
  el.clock.textContent = clockText(s.clock_minutes); el.tick.textContent = String(s.tick); el.hash.textContent = current.final_hash; el.footHash.textContent = current.final_hash;
  el.hint.textContent = s.flags?.["flag.reactor.open"] ? "闸门已开 · 点击地面走进反应堆 · E/F/T 交互" : "WASD 移动 · 点击地面寻路 · 拖动旋转 · 滚轮缩放";
}

function showToast(text, duration = 2600) { el.toast.textContent = text; el.toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.toast.classList.remove("show"), duration); }
function showDialogue(speaker, text) { el.dialogueSpeaker.textContent = speaker; el.dialogueText.textContent = text; el.dialogue.hidden = false; clearTimeout(dialogueTimer); dialogueTimer = setTimeout(() => { el.dialogue.hidden = true; }, 5200); }
function handleEvents(events) {
  for (const e of events) {
    const d = e.data ?? {};
    if (e.kind === "toast") showToast(translate(d.text));
    else if (e.kind === "dialogue_started") showDialogue(nameOf(d.speaker), translate(d.text));
    else if (e.kind === "item_acquired") showToast(`获得 ${nameOf(d.item)} ×${d.count}`);
    else if (e.kind === "quest_completed") showToast("任务完成：环形站夜班");
    else if (e.kind === "reactor.opened") showToast("反应堆闸门已开启");
  }
}

function actionFor(id) {
  const entity = current.state.entities.find((e) => e.content_id === id);
  const player = current.state.entities.find((e) => e.content_id === "player");
  if (!entity || !player) return;
  const dist = Math.hypot(entity.transform.position[0] - player.transform.position[0], entity.transform.position[2] - player.transform.position[2]);
  if (dist > 7) { showToast(`太远了（${dist.toFixed(1)}m）`); return; }
  const verbs = entity.interactable?.verbs ?? [];
  try { if (verbs.includes("pickup")) world.pickup("player", id); else if (verbs.includes("talk")) world.talk("player", id); else world.interact("player", id); }
  catch (err) { showToast(String(err)); }
}
function nearestAction(verb) {
  const player = current.state.entities.find((e) => e.content_id === "player");
  let best = null;
  for (const e of current.state.entities) {
    if (!(e.interactable?.verbs ?? []).includes(verb)) continue;
    const dist = Math.hypot(e.transform.position[0] - player.transform.position[0], e.transform.position[2] - player.transform.position[2]);
    if (dist <= 7 && (!best || dist < best.dist)) best = { id: e.content_id, dist };
  }
  if (best) actionFor(best.id); else showToast(verb === "pickup" ? "附近没有可拾取物" : verb === "talk" ? "附近没有可对话的人" : "附近没有可交互物");
}

function updateMove() {
  let x = 0, z = 0;
  if (keys.has("w") || keys.has("arrowup")) z += 1;
  if (keys.has("s") || keys.has("arrowdown")) z -= 1;
  if (keys.has("a") || keys.has("arrowleft")) x -= 1;
  if (keys.has("d") || keys.has("arrowright")) x += 1;
  const len = Math.hypot(x, z);
  if (len) { moving = true; world.set_move(x / len, z / len); } else if (moving) { moving = false; world.set_move(0, 0); }
}
function bindInput() {
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const key = e.key.toLowerCase();
    if (moveKeys.has(key)) { e.preventDefault(); keys.add(key); updateMove(); return; }
    if (key === "e") nearestAction("interact"); if (key === "f") nearestAction("pickup"); if (key === "t") nearestAction("talk");
    if (key === "p") togglePause(); if (key === "r") resetWorld();
  });
  window.addEventListener("keyup", (e) => { if (moveKeys.has(e.key.toLowerCase())) { keys.delete(e.key.toLowerCase()); updateMove(); } });
  window.addEventListener("blur", () => { keys.clear(); updateMove(); });
  const ray = new THREE.Raycaster(); const pointer = new THREE.Vector2();
  canvas.addEventListener("pointerdown", (e) => { pointerStart = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", (e) => {
    if (!pointerStart) return;
    const moved = Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y);
    pointerStart = null; if (moved > 6) return;
    pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(pointer, camera);
    const hits = ray.intersectObjects(pickables, false);
    if (hits.length) { const id = hits[0].object.userData.contentId; if (id) actionFor(id); return; }
    const floor = ray.intersectObjects([scene.children.find((c) => c === holoGroup) ?? holoGroup], false);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(plane, hit)) {
      try { world.move_to(hit.x, hit.z); showToast(`寻路到 ${hit.x.toFixed(1)}, ${hit.z.toFixed(1)}`); } catch (err) { showToast(String(err)); }
    }
  });
}
function togglePause() { paused = !paused; el.pause.textContent = paused ? "继续" : "暂停"; }
function resetWorld() { world.reset(); current = JSON.parse(world.state()); doorAnim = 0; updateHud(); showToast("世界已重置"); }
function bindUi() {
  document.getElementById("btn-interact").addEventListener("click", () => nearestAction("interact"));
  document.getElementById("btn-pickup").addEventListener("click", () => nearestAction("pickup"));
  document.getElementById("btn-talk").addEventListener("click", () => nearestAction("talk"));
  document.getElementById("btn-reset").addEventListener("click", resetWorld);
  el.pause.addEventListener("click", togglePause);
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!paused) { acc += dt * 1_000_000; while (acc >= TICK_US) { world.tick(TICK_US); acc -= TICK_US; } }
  updateState();
  const events = JSON.parse(world.poll_events()); if (events.length) handleEvents(events);
  const open = doorGroup.userData.open ? 1 : 0;
  doorAnim = lerp(doorAnim, open, 0.08);
  for (const panel of doorPanels) panel.position.x = panel.userData.side * (0.82 + doorAnim * 0.85);
  if (doorGroup.userData.status) { doorGroup.userData.status.material.emissive.setHex(open ? 0x5ce3cf : 0xff5a3c); doorLight.color.setHex(open ? 0x5ce3cf : 0xff5a3c); }
  if (holoRings.length) holoRings.forEach((r, i) => { r.rotation.z += dt * (0.25 + i * 0.12); r.rotation.y += dt * 0.08; });
  if (planet) planet.rotation.y += dt * 0.008;
  if (ring) ring.rotation.z += dt * 0.01;
  if (stars) stars.rotation.y += dt * 0.002;
  if (badgeGroup?.visible) badgeGroup.rotation.y += dt * 0.9;
  if (playerGroup) playerGroup.position.y = Math.sin(now * 0.0014) * 0.012;
  hudTimer += dt; if (hudTimer > 0.1) { updateHud(); hudTimer = 0; }
  if (intro < 1) {
    intro = clamp((now - introStart) / 2600, 0, 1); const e = smooth(intro);
    camera.position.lerpVectors(new THREE.Vector3(8.2, 5.4, -7.4), new THREE.Vector3(7.5, 4.8, -8.5), e);
    controls.target.lerpVectors(new THREE.Vector3(0, 2.0, 2), new THREE.Vector3(0, 1.4, 2), e);
  } else {
    const target = new THREE.Vector3(playerGroup.position.x, 1.4, playerGroup.position.z);
    const delta = target.clone().sub(controls.target); controls.target.add(delta.multiplyScalar(0.12)); camera.position.add(delta.multiplyScalar(0.12));
  }
  controls.update(); composer.render();
}

async function boot() {
  try {
    await init();
    const text = await fetch("./packs/demo.orbit.data").then((r) => r.text());
    pack = JSON.parse(text); world = new PreviewWorld(text); current = JSON.parse(world.state());
    initScene();
    updateHud(); bindInput(); bindUi();
    el.loading.classList.add("hidden"); last = performance.now(); animate();
  } catch (err) {
    el.loading.innerHTML = `<p>环形站启动失败：${String(err)}</p><p class="muted">请先运行 ./web/build.sh，并通过本地服务器打开。</p>`;
    console.error(err);
  }
}
boot();
