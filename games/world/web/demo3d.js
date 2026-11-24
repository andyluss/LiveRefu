import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
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
  replay: document.getElementById("replay-result"),
  toast: document.getElementById("toast"),
  dialogue: document.getElementById("dialogue"),
  dialogueSpeaker: document.getElementById("dialogue-speaker"),
  dialogueText: document.getElementById("dialogue-text"),
  pause: document.getElementById("btn-pause"),
  sound: document.getElementById("sound-toggle"),
};

let renderer;
let scene;
let camera;
let controls;
let composer;
let bloom;
let clock;
let world;
let pack;
let current;
let paused = false;
let last = performance.now();
let acc = 0;
let intro = 0;
let introStart = performance.now();
let toastTimer = 0;
let dialogueTimer = 0;
let hudTimer = 0;
let moving = false;
let audio = null;
const keys = new Set();
const moveKeys = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
const pickables = [];
const animated = [];
const lamps = [];
let floorMesh;
let playerGroup;
let keeperGroup;
let doorGroup;
let doorPanels = [];
let doorLight;
let cardGroup;
let pathLine;
let rain;
let rainSpeeds = [];
let dust;
let water;
let waterBase = [];
let lighthouseBeam;
let playerLight;
let windowLight;
let hemi;
let sun;
let themeDark = true;
let pointerStart = null;

const M = {};

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function lerpAngle(a, b, t) {
  let delta = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * t;
}
function lerp(a, b, t) { return a + (b - a) * t; }
function smooth(t) { return t * t * (3 - 2 * t); }
function rand(a, b) { return a + Math.random() * (b - a); }

function translate(text) {
  if (typeof text !== "string") return text;
  if (!text.startsWith("loc:")) return text;
  return current?.loc?.[text.slice(4)] ?? text.slice(4);
}

function nameOf(contentId) {
  if (!contentId) return "?";
  if (contentId === "player") return "你";
  return translate(current?.names?.[contentId] ?? contentId);
}

function clockText(minutes) {
  const m = ((Number(minutes) || 0) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function canvasTexture(width, height, draw) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  draw(c.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function textSprite(text, color = "#e8f4f1", accent = "#d78a4a") {
  const texture = canvasTexture(512, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(4, 14, 18, 0.82)";
    ctx.beginPath();
    ctx.roundRect(8, 20, w - 16, h - 40, 28);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "600 42px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(2.2, 0.55, 1);
  return sprite;
}

function screenTexture(lines = true) {
  return canvasTexture(512, 320, (ctx, w, h) => {
    ctx.fillStyle = "#04161b";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#1f5c60";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.strokeStyle = "#54e0c2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 30; i++) {
      const x = i * 17 + 8;
      const y = h * 0.55 + Math.sin(i * 0.6) * 38 + Math.sin(i * 0.17) * 24;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#a9f7e6";
    ctx.font = "700 24px ui-monospace, monospace";
    ctx.fillText("HARBOR / O2", 22, 40);
    ctx.fillStyle = "#d78a4a";
    ctx.font = "700 18px ui-monospace, monospace";
    ctx.fillText("WIND 12.4  TIDE 0.8", 22, 70);
    if (lines) {
      ctx.fillStyle = "#78bfb3";
      ctx.font = "16px ui-monospace, monospace";
      ["Airlock ........ LOCKED", "Pressure ...... 1.02", "Beacon ........ OK"].forEach((line, i) => ctx.fillText(line, 22, 112 + i * 26));
    }
  });
}

function hazardTexture() {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = "#d8a33c";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#15120c";
    for (let x = -h; x < w + h; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 24, 0);
      ctx.lineTo(x + 24 - h, h);
      ctx.lineTo(x - h, h);
      ctx.closePath();
      ctx.fill();
    }
  });
}

function floorTexture() {
  const texture = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#33484a";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const px = x * 128;
        const py = y * 128;
        ctx.fillStyle = (x + y) % 2 ? "#2b3f41" : "#304749";
        ctx.fillRect(px + 2, py + 2, 124, 124);
        ctx.strokeStyle = "#101d20";
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 2, py + 2, 124, 124);
        ctx.fillStyle = "rgba(190, 225, 220, 0.16)";
        for (const [bx, by] of [[14, 14], [110, 14], [14, 110], [110, 110]]) {
          ctx.beginPath(); ctx.arc(px + bx, py + by, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(12, 24, 26, ${rand(0.12, 0.3)})`;
      ctx.lineWidth = rand(0.5, 2);
      const x = rand(0, w), y = rand(0, h);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rand(-40, 40), y + rand(-8, 8)); ctx.stroke();
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function wallTexture() {
  const texture = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#3e5556";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) {
      ctx.fillStyle = x % 128 ? "#3a5051" : "#425b5c";
      ctx.fillRect(x, 0, 62, h);
      ctx.strokeStyle = "rgba(10, 20, 22, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 0, 62, h);
      ctx.fillStyle = "rgba(190, 230, 225, 0.16)";
      for (let y = 22; y < h; y += 58) {
        ctx.beginPath(); ctx.arc(x + 31, y, 1.7, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = `rgba(8, 18, 20, ${rand(0.05, 0.16)})`;
      ctx.fillRect(rand(0, w), rand(0, h), rand(4, 28), rand(2, 10));
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1.2);
  return texture;
}

function decalTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(230, 170, 80, 0.65)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 188, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(220, 238, 232, 0.55)";
    ctx.font = "800 92px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("07", w / 2, h / 2 - 12);
    ctx.font = "600 24px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "rgba(215, 138, 74, 0.8)";
    ctx.fillText("HARBOR / BAY", w / 2, h / 2 + 74);
    ctx.fillStyle = "rgba(120, 210, 195, 0.55)";
    ctx.font = "500 18px ui-monospace, monospace";
    ctx.fillText("KEEP CLEAR", w / 2, h / 2 + 112);
  });
}

function makeMaterials() {
  const floorMap = floorTexture();
  const wallMap = wallTexture();
  M.floor = new THREE.MeshStandardMaterial({ color: 0x18272b, map: floorMap, roughness: 0.3, metalness: 0.55, envMapIntensity: 0.8 });
  M.floorDark = new THREE.MeshStandardMaterial({ color: 0x0b1316, roughness: 0.55, metalness: 0.35 });
  M.wall = new THREE.MeshStandardMaterial({ color: 0x1b2e33, map: wallMap, roughness: 0.68, metalness: 0.25 });
  M.wallInset = new THREE.MeshStandardMaterial({ color: 0x102126, roughness: 0.55, metalness: 0.45 });
  M.metal = new THREE.MeshStandardMaterial({ color: 0x40565b, roughness: 0.34, metalness: 0.85 });
  M.darkMetal = new THREE.MeshStandardMaterial({ color: 0x1b2529, roughness: 0.4, metalness: 0.8 });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x0c1113, roughness: 0.9, metalness: 0.05 });
  M.amber = new THREE.MeshStandardMaterial({ color: 0x5a2c14, emissive: 0xff8a3c, emissiveIntensity: 2.2, roughness: 0.35 });
  M.cyan = new THREE.MeshStandardMaterial({ color: 0x08282a, emissive: 0x42e8cc, emissiveIntensity: 2.2, roughness: 0.3 });
  M.teal = new THREE.MeshStandardMaterial({ color: 0x2a6666, roughness: 0.45, metalness: 0.5 });
  M.orange = new THREE.MeshStandardMaterial({ color: 0x8b4a22, roughness: 0.55, metalness: 0.25 });
  M.skin = new THREE.MeshStandardMaterial({ color: 0x9a6e52, roughness: 0.8 });
  M.coat = new THREE.MeshStandardMaterial({ color: 0x1b3b43, roughness: 0.7, metalness: 0.15 });
  M.glass = new THREE.MeshPhysicalMaterial({
    color: 0x7fc4d4, transparent: true, opacity: 0.035, roughness: 0.08,
    metalness: 0.15, side: THREE.DoubleSide, depthWrite: false,
  });
  M.water = new THREE.MeshStandardMaterial({
    color: 0x031b2b, roughness: 0.2, metalness: 0.75,
    emissive: 0x02131f, emissiveIntensity: 0.7,
  });
  M.hazard = new THREE.MeshStandardMaterial({ map: hazardTexture(), roughness: 0.55, metalness: 0.2 });
  M.screen = new THREE.MeshStandardMaterial({ map: screenTexture(), emissive: 0x2b8f88, emissiveIntensity: 0.55, roughness: 0.3 });
  M.screenDim = new THREE.MeshStandardMaterial({ map: screenTexture(false), emissive: 0x175855, emissiveIntensity: 0.4, roughness: 0.35 });
  M.puddle = new THREE.MeshPhysicalMaterial({
    color: 0x0a2026, roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.38,
    envMapIntensity: 1.2,
  });
}

function box(parent, w, h, d, material, x, y, z, options = {}) {
  const geometry = options.rounded
    ? new RoundedBoxGeometry(w, h, d, 3, options.radius ?? 0.04)
    : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.castShadow = options.shadow !== false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, rTop, rBottom, height, material, x, y, z, segments = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, height, segments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function glowStrip(parent, w, h, d, material, x, y, z) {
  return box(parent, w, h, d, material, x, y, z, { shadow: false });
}

function makeRoom() {
  const room = new THREE.Group();
  scene.add(room);

  box(room, 19.6, 0.3, 19.6, M.floor, 0, -0.15, 1.2);
  box(room, 17.8, 0.02, 17.8, M.floorDark, 0, 0.005, 1.2);
  const grid = new THREE.GridHelper(19.2, 24, 0x3c666b, 0x1b3439);
  grid.position.set(0, 0.025, 1.2);
  grid.material.opacity = 0.3;
  grid.material.transparent = true;
  room.add(grid);

  // 左侧舷窗：一整面海。
  box(room, 0.4, 1.2, 19, M.wall, -9.7, 0.6, 1.2);
  box(room, 0.4, 1.5, 19, M.wall, -9.7, 4.9, 1.2);
  box(room, 0.4, 3.0, 5.0, M.wall, -9.7, 2.55, -6.1);
  box(room, 0.4, 3.0, 4.0, M.wall, -9.7, 2.55, 8.6);
  box(room, 0.08, 3.0, 10.5, M.glass, -9.48, 2.55, 1.3);
  for (const z of [-3.6, -0.9, 1.8, 4.5, 6.7]) {
    box(room, 0.22, 3.2, 0.18, M.metal, -9.42, 2.55, z);
  }
  box(room, 0.26, 0.24, 10.8, M.metal, -9.42, 4.1, 1.3);
  box(room, 0.26, 0.24, 10.8, M.metal, -9.42, 0.96, 1.3);
  box(room, 0.5, 1.0, 19.4, M.wallInset, -9.5, 0.5, 1.2);

  // 右侧、后侧、前侧墙体与天花板。
  box(room, 0.4, 5.8, 19, M.wall, 9.7, 2.9, 1.2);
  box(room, 19.8, 5.8, 0.4, M.wall, 0, 2.9, 10.5);
  box(room, 19.8, 5.8, 0.4, M.wallInset, 0, 2.9, -8.5);
  box(room, 19.8, 0.34, 19.4, M.wallInset, 0, 5.65, 1.2);
  const ceilingPanel = new THREE.MeshStandardMaterial({ color: 0x132329, emissive: 0x0a3338, emissiveIntensity: 0.45, roughness: 0.5 });
  for (const x of [-5.4, 0, 5.4]) {
    for (const z of [-3.5, 2.0, 7.5]) {
      box(room, 3.6, 0.05, 3.8, ceilingPanel, x, 5.44, z, { shadow: false });
    }
  }

  // 从平台到气闸的地面引导线。
  for (const x of [-1.05, 1.05]) {
    glowStrip(room, 0.035, 0.012, 4.4, M.amber, x, 0.055, 4.0);
  }

  // 墙体嵌条与灯带。
  for (const z of [-5, -1, 3, 7]) {
    glowStrip(room, 0.05, 2.2, 0.06, M.cyan, 9.46, 2.75, z);
    glowStrip(room, 0.05, 2.2, 0.06, M.amber, 9.46, 2.75, z + 1.0);
  }
  for (const z of [-6, -2, 2, 6]) {
    box(room, 18.6, 0.14, 0.12, M.darkMetal, 0, 5.3, z);
  }
  // 天花板管线。
  for (const x of [-7.3, -6.8, 7.1, 7.6]) {
    cylinder(room, 0.09, 0.09, 18.5, M.darkMetal, x, 4.95, 1.2, 12).rotation.x = Math.PI / 2;
  }
  for (const x of [-7.3, -6.8, 7.1, 7.6]) {
    glowStrip(room, 0.02, 0.02, 18.2, M.cyan, x + 0.1, 4.83, 1.2);
  }

  // 地面潮湿反光与水洼。
  for (const [x, z, r] of [[-5.5, 2.0, 1.5], [2.8, -3.2, 1.1], [-1.8, 7.1, 0.9]]) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(r, 40), M.puddle);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(x, 0.035, z);
    room.add(puddle);
  }
  const hazard = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.55), M.hazard);
  hazard.rotation.x = -Math.PI / 2;
  hazard.position.set(0, 0.045, 7.1);
  room.add(hazard);

  // 中央圆形检修平台与地灯。
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.35, 0.07, 64), M.darkMetal);
  platform.position.set(0, 0.04, 0);
  platform.receiveShadow = true;
  room.add(platform);
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), new THREE.MeshBasicMaterial({
    map: decalTexture(), transparent: true, opacity: 0.5, depthWrite: false,
  }));
  decal.rotation.x = -Math.PI / 2;
  decal.position.set(-3.2, 0.052, -3.8);
  room.add(decal);
  const platformRing = new THREE.Mesh(new THREE.TorusGeometry(2.18, 0.015, 6, 80), M.amber);
  platformRing.rotation.x = Math.PI / 2;
  platformRing.position.set(0, 0.085, 0);
  room.add(platformRing);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.015, 0.22), M.cyan);
    lamp.position.set(Math.cos(angle) * 1.85, 0.09, Math.sin(angle) * 1.85);
    lamp.rotation.y = -angle;
    room.add(lamp);
  }

  // 从控制台到气闸的地面线缆。
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(8.1, 0.06, 1.3),
    new THREE.Vector3(5.8, 0.06, 3.6),
    new THREE.Vector3(2.2, 0.06, 5.4),
    new THREE.Vector3(1.20, 0.06, 6.1),
  ]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 48, 0.035, 6, false), M.rubber);
  cable.castShadow = true;
  room.add(cable);

  floorMesh = box(room, 19.4, 0.1, 19.4, new THREE.MeshBasicMaterial({ visible: false }), 0, -0.02, 1.2);
  floorMesh.userData.floor = true;

  return room;
}

function makeLamp(x, z, color = 0xffb26d) {
  const group = new THREE.Group();
  group.position.set(x, 5.1, z);
  scene.add(group);
  cylinder(group, 0.03, 0.03, 0.8, M.darkMetal, 0, 0.4, 0, 8);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.28, 24, 1, true), M.darkMetal);
  shade.position.y = 0.0;
  shade.rotation.x = Math.PI;
  shade.castShadow = true;
  group.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshStandardMaterial({
    color: 0x4a2710, emissive: color, emissiveIntensity: 3, roughness: 0.2,
  }));
  bulb.position.y = -0.12;
  group.add(bulb);
  const light = new THREE.PointLight(color, 18, 9.5, 2);
  light.position.y = -0.25;
  group.add(light);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.3, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.035, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, -5.05, 0);
  group.add(pool);
  lamps.push(light);
  animated.push({ kind: "lamp", bulb, light, phase: Math.random() * Math.PI * 2 });
}

function makeDoor() {
  doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, 6);
  scene.add(doorGroup);
  const frameMat = M.darkMetal;
  box(doorGroup, 0.26, 3.3, 0.55, frameMat, -1.32, 1.65, 0);
  box(doorGroup, 0.26, 3.3, 0.55, frameMat, 1.32, 1.65, 0);
  box(doorGroup, 2.9, 0.3, 0.55, frameMat, 0, 3.35, 0);
  box(doorGroup, 2.75, 0.08, 0.1, M.cyan, 0, 3.18, -0.3);
  const hazard = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.5), M.hazard);
  hazard.rotation.x = -Math.PI / 2;
  hazard.position.set(0, 0.04, 0.38);
  doorGroup.add(hazard);

  for (const side of [-1, 1]) {
    const panel = new THREE.Group();
    panel.position.set(side * 0.58, 1.62, 0);
    const shell = new THREE.Mesh(new RoundedBoxGeometry(1.12, 2.95, 0.2, 3, 0.06), M.metal);
    shell.castShadow = true;
    shell.receiveShadow = true;
    panel.add(shell);
    const inset = new THREE.Mesh(new THREE.BoxGeometry(0.86, 2.55, 0.03), M.wallInset);
    inset.position.z = -0.12;
    panel.add(inset);
    const port = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 24), M.glass);
    port.rotation.x = Math.PI / 2;
    port.position.set(0, 0.35, -0.14);
    panel.add(port);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 8, 24), M.metal);
    rim.position.set(0, 0.35, -0.13);
    panel.add(rim);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.04), M.cyan);
    bar.position.set(0, -0.75, -0.13);
    panel.add(bar);
    panel.userData.side = side;
    doorPanels.push(panel);
    doorGroup.add(panel);
    panel.traverse((child) => {
      child.userData.contentId = "demo.airlock";
      if (child.isMesh) pickables.push(child);
    });
  }
  box(doorGroup, 0.08, 2.9, 0.03, M.hazard, -1.17, 1.55, -0.29);
  box(doorGroup, 0.08, 2.9, 0.03, M.hazard, 1.17, 1.55, -0.29);
  const sign = textSprite("AIRLOCK 01", "#dff8f2", "#d78a4a");
  sign.position.set(0, 3.75, 0);
  doorGroup.add(sign);
  const status = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshStandardMaterial({
    color: 0x2a0904, emissive: 0xff4a2a, emissiveIntensity: 5,
  }));
  status.position.set(0, 3.0, -0.34);
  doorGroup.add(status);
  doorGroup.userData.status = status;
  doorLight = new THREE.PointLight(0xff4a2a, 7, 5, 2);
  doorLight.position.set(0, 2.8, 1.0);
  doorGroup.add(doorLight);
  doorGroup.traverse((child) => {
    child.userData.contentId = child.userData.contentId ?? "demo.airlock";
  });
}

function makeKeeper() {
  keeperGroup = new THREE.Group();
  keeperGroup.position.set(4, 0, -2);
  keeperGroup.rotation.y = Math.PI;
  scene.add(keeperGroup);

  const coat = M.coat;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.82, 4, 12), coat);
  torso.position.y = 1.3;
  torso.castShadow = true;
  keeperGroup.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 16), M.skin);
  head.position.y = 2.05;
  head.castShadow = true;
  keeperGroup.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.12, 20), M.darkMetal);
  cap.position.y = 2.24;
  keeperGroup.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 0.28), M.darkMetal);
  brim.position.set(0, 2.18, -0.2);
  keeperGroup.add(brim);
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.03), M.amber);
  badge.position.set(0.23, 1.55, -0.32);
  keeperGroup.add(badge);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), new THREE.MeshBasicMaterial({ color: 0x101010 }));
    eye.position.set(side * 0.1, 2.07, -0.253);
    keeperGroup.add(eye);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.02), M.amber);
    strip.position.set(side * 0.26, 1.3, -0.335);
    strip.material = new THREE.MeshStandardMaterial({ color: 0x4a2a10, emissive: 0xff9a45, emissiveIntensity: 0.8 });
    keeperGroup.add(strip);
  }

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.65, 3, 8), M.darkMetal);
    leg.position.set(side * 0.18, 0.5, 0);
    keeperGroup.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.4), M.rubber);
    boot.position.set(side * 0.18, 0.1, 0.06);
    keeperGroup.add(boot);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.62, 3, 8), coat);
    arm.position.set(side * 0.44, 1.25, 0);
    arm.rotation.z = side * 0.18;
    keeperGroup.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), M.skin);
    hand.position.set(side * 0.5, 0.87, 0);
    keeperGroup.add(hand);
  }
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.025), M.screenDim);
  tablet.position.set(0.28, 1.15, -0.38);
  tablet.rotation.set(-0.3, -0.2, 0.15);
  keeperGroup.add(tablet);
  // 名字由 HUD/toast 提供；不在 3D 里放容易贴边裁切的名牌。

  keeperGroup.userData.contentId = "demo.keeper";
  keeperGroup.userData.baseY = 0;
  keeperGroup.traverse((child) => {
    if (child.isMesh) {
      child.userData.contentId = "demo.keeper";
      pickables.push(child);
    }
  });
}

function makePlayer() {
  playerGroup = new THREE.Group();
  scene.add(playerGroup);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.8, 4, 12), M.orange);
  body.position.y = 1.25;
  body.castShadow = true;
  playerGroup.add(body);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.3), M.darkMetal);
  pack.position.set(0, 1.35, 0.36);
  playerGroup.add(pack);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.65, 12), M.metal);
  tank.position.set(0.18, 1.5, 0.5);
  playerGroup.add(tank);
  box(playerGroup, 0.06, 0.56, 0.03, M.cyan, -0.2, 1.38, 0.53, { shadow: false });
  box(playerGroup, 0.06, 0.56, 0.03, M.amber, 0.2, 1.38, 0.53, { shadow: false });
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8), M.metal);
  antenna.position.set(-0.22, 1.9, 0.45);
  antenna.rotation.z = 0.2;
  playerGroup.add(antenna);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), M.darkMetal);
  helmet.position.y = 2.03;
  helmet.castShadow = true;
  playerGroup.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.235, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), new THREE.MeshStandardMaterial({
    color: 0x062328, emissive: 0x41e0c8, emissiveIntensity: 2.6, roughness: 0.15, metalness: 0.4,
  }));
  visor.position.set(0, 2.03, -0.12);
  visor.rotation.x = -Math.PI / 2;
  playerGroup.add(visor);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.6, 3, 8), M.darkMetal);
    leg.position.set(side * 0.17, 0.48, 0);
    playerGroup.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.16, 0.38), M.rubber);
    boot.position.set(side * 0.17, 0.08, -0.04);
    playerGroup.add(boot);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.6, 3, 8), M.orange);
    arm.position.set(side * 0.43, 1.25, 0);
    arm.rotation.z = side * 0.12;
    playerGroup.add(arm);
  }
  playerLight = new THREE.SpotLight(0xd8f4ff, 8, 8, Math.PI / 6.5, 0.55, 1.6);
  playerLight.position.set(0, 1.85, -0.15);
  playerLight.target.position.set(0, 0.2, -4);
  playerGroup.add(playerLight);
  playerGroup.add(playerLight.target);
  playerGroup.userData.walk = 0;
}

function makeKeycard() {
  cardGroup = new THREE.Group();
  cardGroup.position.set(2, 1.15, 2);
  scene.add(cardGroup);
  const card = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.32, 0.035, 3, 0.03), new THREE.MeshStandardMaterial({
    color: 0x18383d, emissive: 0x2bd8c0, emissiveIntensity: 0.65, metalness: 0.5, roughness: 0.25,
  }));
  card.castShadow = true;
  cardGroup.add(card);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.04), M.amber);
  stripe.position.set(0, 0.08, 0.03);
  cardGroup.add(stripe);
  const glow = new THREE.PointLight(0x5ff3db, 5, 3, 2);
  cardGroup.add(glow);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.012, 8, 48), M.cyan);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.1;
  cardGroup.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.5, 1.1, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x57e6cf, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  beam.position.y = -0.55;
  cardGroup.add(beam);
  cardGroup.userData.contentId = "item.keycard";
  cardGroup.traverse((child) => {
    if (child.isMesh) {
      child.userData.contentId = "item.keycard";
      pickables.push(child);
    }
  });
}

function makeConsole() {
  const group = new THREE.Group();
  group.position.set(8.2, 0, 1.4);
  group.rotation.y = -0.35;
  scene.add(group);
  box(group, 2.6, 0.12, 1.1, M.metal, 0, 0.95, 0);
  box(group, 0.1, 0.95, 0.1, M.darkMetal, -1.1, 0.48, 0.35);
  box(group, 0.1, 0.95, 0.1, M.darkMetal, 1.1, 0.48, 0.35);
  for (const [x, mat] of [[-0.62, M.screen], [0.25, M.screenDim]]) {
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.52), mat);
    screen.position.set(x, 1.5, -0.2);
    screen.rotation.set(-0.22, Math.PI, 0);
    group.add(screen);
    box(group, 0.96, 0.06, 0.06, M.darkMetal, x, 1.22, -0.18);
  }
  box(group, 1.2, 0.03, 0.38, M.darkMetal, 0, 1.02, 0.18);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.16, 16), M.amber);
  mug.position.set(0.95, 1.07, 0.12);
  group.add(mug);
  const chair = new THREE.Group();
  chair.position.set(0, 0, 1.1);
  box(chair, 0.65, 0.1, 0.55, M.darkMetal, 0, 0.55, 0);
  box(chair, 0.55, 0.85, 0.08, M.darkMetal, 0, 0.98, 0.25);
  cylinder(chair, 0.04, 0.04, 0.4, M.metal, 0, 0.3, 0, 8);
  group.add(chair);
}

function makeProps() {
  const group = new THREE.Group();
  scene.add(group);
  const crate = (x, z, s) => {
    const c = new THREE.Mesh(new RoundedBoxGeometry(s, s * 0.8, s, 3, 0.05), M.wallInset);
    c.position.set(x, s * 0.4, z);
    c.castShadow = true;
    c.receiveShadow = true;
    group.add(c);
    box(group, s * 0.85, 0.04, s * 0.04, M.hazard, x, s * 0.52, z - s * 0.46);
  };
  crate(-6.7, -4.5, 1.0);
  crate(-5.5, -5.0, 0.7);
  crate(-6.2, -3.3, 0.55);
  for (const [x, z] of [[6.6, -5.4], [7.2, -4.8], [-6.8, 7.8]]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.0, 20), M.teal);
    barrel.position.set(x, 0.5, z);
    barrel.castShadow = true;
    group.add(barrel);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.025, 6, 24), M.amber);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.75, z);
    group.add(ring);
  }
  // 右侧工具墙。
  for (let i = 0; i < 4; i++) {
    box(group, 0.08, 0.5, 0.16, M.metal, 9.3, 1.7 + i * 0.45, -3.2 + i * 0.45);
  }
  // 气闸旁的管线。
  for (const x of [-2.2, 2.2]) {
    const pipe = cylinder(group, 0.08, 0.08, 3.6, M.darkMetal, x, 3.9, 8.6, 12);
    pipe.rotation.x = Math.PI / 2;
  }
}

function makeWater() {
  const geometry = new THREE.PlaneGeometry(58, 62, 40, 48);
  geometry.rotateX(-Math.PI / 2);
  water = new THREE.Mesh(geometry, M.water);
  water.position.set(-32, -1.3, 1.2);
  water.receiveShadow = true;
  scene.add(water);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) waterBase.push(0);
}

function makeSky() {
  const geometry = new THREE.PlaneGeometry(90, 55);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color(0x123a4d) },
      bottom: { value: new THREE.Color(0x02080d) },
      glow: { value: new THREE.Color(0x2d7f86) },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform vec3 top; uniform vec3 bottom; uniform vec3 glow; void main(){ float h=smoothstep(0.0,1.0,vUv.y); vec3 c=mix(bottom,top,h); float haze=exp(-pow((vUv.y-0.22)*9.0,2.0)); c+=glow*haze*0.5; gl_FragColor=vec4(c,1.0); }`,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.position.set(-48, 14, 1);
  sky.rotation.y = Math.PI / 2;
  scene.add(sky);

  // 远处港口剪影。
  const city = new THREE.Group();
  city.position.set(-28, -1.2, 0);
  scene.add(city);
  for (let i = 0; i < 18; i++) {
    const w = rand(1.2, 3.2);
    const h = rand(1.5, 6.5);
    const d = rand(2, 5);
    const b = box(city, w, h, d, M.wallInset, rand(-8, 8), h / 2, rand(-24, 24), { shadow: false });
    b.material = new THREE.MeshStandardMaterial({ color: 0x07141a, roughness: 0.8, metalness: 0.1 });
    for (let j = 0; j < 3; j++) {
      const light = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), new THREE.MeshBasicMaterial({ color: j % 2 ? 0xffb36b : 0x62d8d8 }));
      light.position.set(b.position.x + rand(-w / 3, w / 3), rand(0.4, h - 0.4), b.position.z + d / 2 + 0.02);
      city.add(light);
    }
  }
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.7, 32, 24), new THREE.MeshBasicMaterial({ color: 0xcfeef2 }));
  moon.position.set(-28, 6.2, -5);
  scene.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: canvasTexture(256, 256, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(190,240,245,0.55)");
      g.addColorStop(1, "rgba(190,240,245,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  halo.scale.set(11, 11, 1);
  halo.position.set(-28, 6.2, -5);
  scene.add(halo);

  // 灯塔与旋转光束。
  const tower = cylinder(scene, 0.7, 1.2, 8, M.darkMetal, -23, 2.7, 10, 12);
  tower.material = new THREE.MeshStandardMaterial({ color: 0x0c1a20, roughness: 0.6 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe0a0 }));
  lamp.position.set(-23, 7.1, 10);
  scene.add(lamp);
  lighthouseBeam = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 36, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  lighthouseBeam.position.set(-23, 7.0, 10);
  lighthouseBeam.rotation.z = Math.PI / 2;
  scene.add(lighthouseBeam);
}

function makeShip() {
  const ship = new THREE.Group();
  ship.position.set(-14.5, -0.6, 3.2);
  ship.rotation.y = 0.12;
  scene.add(ship);
  const hull = box(ship, 11, 1.2, 3.4, new THREE.MeshStandardMaterial({ color: 0x101b20, roughness: 0.6, metalness: 0.4 }), 0, 0.6, 0, { shadow: false });
  hull.rotation.z = -0.02;
  box(ship, 2.8, 1.5, 2.6, new THREE.MeshStandardMaterial({ color: 0x172a2f, roughness: 0.6, metalness: 0.3 }), 2.2, 1.75, 0, { shadow: false });
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 2; j++) {
      const color = [0x6b3b20, 0x1f4a4b, 0x5a4a22, 0x2b3540][(i + j) % 4];
      box(ship, 1.2, 0.7, 1.0, new THREE.MeshStandardMaterial({ color, roughness: 0.7 }), -3.8 + i * 1.5, 1.5 + j * 0.75, -0.8 + j * 1.6, { shadow: false });
    }
  }
  cylinder(ship, 0.06, 0.06, 3.2, M.darkMetal, 0.2, 3.0, 0, 8);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffb15c }));
  beacon.position.set(0.2, 4.7, 0);
  ship.add(beacon);
  const cabinLights = new THREE.MeshBasicMaterial({ color: 0xffcf8a });
  for (let i = 0; i < 4; i++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.1), cabinLights);
    win.position.set(1.2 + i * 0.32, 1.9, -1.32);
    ship.add(win);
  }
  const mast = new THREE.PointLight(0xffb15c, 3, 8, 2);
  mast.position.set(0.2, 4.6, 0);
  ship.add(mast);
}

function makeRain() {
  const count = 1200;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = rand(-42, -9.6);
    positions[i * 3 + 1] = rand(0.2, 15);
    positions[i * 3 + 2] = rand(-18, 20);
    rainSpeeds.push(rand(3.5, 7.5));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xbfe8f0, size: 0.06, transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  rain = new THREE.Points(geometry, material);
  scene.add(rain);
}

function makeDust() {
  const count = 260;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = rand(-8.5, 8.5);
    positions[i * 3 + 1] = rand(0.4, 4.6);
    positions[i * 3 + 2] = rand(-7.5, 9.5);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  dust = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xb9e7df, size: 0.018, transparent: true, opacity: 0.38,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);
}

function makePathLine() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
  pathLine = new THREE.Line(geometry, new THREE.LineDashedMaterial({
    color: 0x6ff0d8, dashSize: 0.22, gapSize: 0.14, transparent: true, opacity: 0.7,
  }));
  pathLine.visible = false;
  scene.add(pathLine);
}

function makeEnvironment() {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.3;
  pmrem.dispose();
}

function initScene() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03070b);
  scene.fog = new THREE.FogExp2(0x06131c, 0.014);

  camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 120);
  camera.position.set(2.0, 3.4, -7.0);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0.4, 1.25, 2.0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 3.2;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.7;

  makeMaterials();
  makeEnvironment();
  makeRoom();
  makeDoor();
  makeKeeper();
  makePlayer();
  makeKeycard();
  makeConsole();
  makeProps();
  makeWater();
  makeSky();
  makeShip();
  makeRain();
  makeDust();
  makePathLine();

  hemi = new THREE.HemisphereLight(0x7ec9d2, 0x160f0a, 0.8);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xa9dcff, 3.2);
  sun.position.set(-7.5, 7.5, 1.5);
  sun.target.position.set(0, 1, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 32;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  windowLight = new THREE.PointLight(0x55c7e5, 26, 14, 2);
  windowLight.position.set(-7.2, 2.6, 1.2);
  scene.add(windowLight);

  makeLamp(-4.2, -2.5);
  makeLamp(3.8, 3.6);
  makeLamp(-1.2, 7.0);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.45, 0.95);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  window.addEventListener("resize", onResize);
  window.addEventListener("refu-theme", (event) => applyTheme(event.detail.dark));
  applyTheme(document.documentElement.dataset.theme === "dark");
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
}

function applyTheme(dark) {
  themeDark = dark;
  if (!scene) return;
  const bg = dark ? 0x03070b : 0x9abec4;
  scene.background.set(bg);
  scene.fog.color.set(dark ? 0x06131c : 0x91b4ba);
  hemi.intensity = dark ? 0.65 : 1.45;
  if (M.floor) {
    M.floor.color.set(dark ? 0x18272b : 0x536d6d);
    M.floorDark.color.set(dark ? 0x0b1316 : 0x3c5656);
    M.wall.color.set(dark ? 0x1b2e33 : 0x789294);
    M.wallInset.color.set(dark ? 0x102126 : 0x4c6868);
    M.darkMetal.color.set(dark ? 0x1b2529 : 0x364d4e);
  }
  sun.intensity = dark ? 2.6 : 3.8;
  sun.color.set(dark ? 0xa9dcff : 0xfff1d2);
  windowLight.intensity = dark ? 18 : 10;
  for (const lamp of lamps) lamp.intensity = dark ? 22 : 10;
  if (bloom) bloom.strength = dark ? 0.55 : 0.24;
  renderer.toneMappingExposure = dark ? 1.08 : 1.0;
  renderer.setClearColor(bg, 1);
  if (doorLight) doorLight.intensity = dark ? 4 : 2;
  if (playerLight) playerLight.intensity = dark ? 8 : 4;
  if (water) {
    water.material.color.set(dark ? 0x031b2b : 0x185465);
    water.material.emissiveIntensity = dark ? 0.7 : 0.2;
  }
}

function updateState() {
  current = JSON.parse(world.state());
  const s = current.state;
  const player = s.entities.find((e) => e.content_id === "player");
  if (player) {
    playerGroup.position.set(player.transform.position[0], 0, player.transform.position[2]);
    playerGroup.rotation.y = THREE.MathUtils.degToRad(player.transform.yaw || 0) + Math.PI;
    let facing = null;
    const path = s.path ?? [];
    if (path.length > 0) {
      const waypoint = path[Math.min(s.path_index ?? 0, path.length - 1)];
      const dx = waypoint[0] - player.transform.position[0];
      const dz = waypoint[1] - player.transform.position[2];
      if (dx * dx + dz * dz > 0.0001) facing = Math.atan2(dx, dz) + Math.PI;
    } else if (Array.isArray(s.move_intent) && Math.hypot(s.move_intent[0], s.move_intent[1]) > 0.01) {
      facing = Math.atan2(s.move_intent[0], s.move_intent[1]) + Math.PI;
    }
    if (facing !== null) playerGroup.rotation.y = lerpAngle(playerGroup.rotation.y, facing, 0.18);
    const speed = player.speed || 0;
    const walking = Math.abs(player.transform.position[0] - playerGroup.userData.lastX || 0) > 0.0001
      || Math.abs(player.transform.position[2] - playerGroup.userData.lastZ || 0) > 0.0001;
    playerGroup.userData.walking = walking && speed > 0;
    playerGroup.userData.lastX = player.transform.position[0];
    playerGroup.userData.lastZ = player.transform.position[2];
  }
  for (const id of ["demo.keeper", "demo.airlock", "item.keycard"]) {
    const entity = s.entities.find((e) => e.content_id === id);
    if (id === "item.keycard" && cardGroup) {
      const holder = s.entities.find((e) => e.content_id === "player");
      cardGroup.visible = !!entity;
      if (entity) cardGroup.position.set(entity.transform.position[0], 1.15 + Math.sin(performance.now() * 0.002) * 0.05, entity.transform.position[2]);
    }
    if (id === "demo.airlock" && doorGroup) {
      doorGroup.userData.open = !!entity?.door?.open;
    }
  }
  const keeper = s.entities.find((e) => e.content_id === "demo.keeper");
  if (keeper) {
    keeperGroup.position.set(keeper.transform.position[0], 0, keeper.transform.position[2]);
    keeperGroup.rotation.y = THREE.MathUtils.degToRad(keeper.transform.yaw || 0);
    const dx = playerGroup.position.x - keeperGroup.position.x;
    const dz = playerGroup.position.z - keeperGroup.position.z;
    if (player && dx * dx + dz * dz < 36) {
      const target = Math.atan2(dx, dz) + Math.PI;
      keeperGroup.rotation.y = lerp(keeperGroup.rotation.y, target, 0.04);
    }
  }
  updatePath(s);
}

function updatePath(s) {
  if (!pathLine) return;
  const path = s.path ?? [];
  if (path.length === 0) {
    pathLine.visible = false;
    return;
  }
  const player = s.entities.find((e) => e.content_id === "player");
  const points = [new THREE.Vector3(player.transform.position[0], 0.05, player.transform.position[2])];
  for (let i = Math.max(0, s.path_index ?? 0); i < path.length; i++) {
    points.push(new THREE.Vector3(path[i][0], 0.05, path[i][1]));
  }
  pathLine.geometry.setFromPoints(points);
  pathLine.computeLineDistances();
  pathLine.visible = points.length > 1;
}

function updateHud() {
  if (!current) return;
  const s = current.state;
  const player = s.entities.find((e) => e.content_id === "player");
  const questId = "quest.first_shift";
  const quest = s.quests?.[questId];
  const definition = pack.quests?.[questId];
  el.questTitle.textContent = translate(definition?.title ?? questId);
  el.objectives.replaceChildren();
  if (definition) {
    const done = !!quest?.completed;
    for (const objective of definition.objectives ?? []) {
      const li = document.createElement("li");
      li.className = done ? "done" : "";
      li.textContent = objective.kind === "talk"
        ? `和${nameOf(objective.target)}说话`
        : objective.kind === "flag"
          ? `完成：${objective.flag}`
          : objective.kind;
      el.objectives.append(li);
    }
  }
  el.inventory.replaceChildren();
  const items = player?.inventory ?? [];
  if (items.length === 0) {
    el.inventory.innerHTML = '<span class="empty">背包为空</span>';
  } else {
    for (const item of items) {
      const row = document.createElement("div");
      row.textContent = `${translate(current.names?.[item.item] ?? item.item)} ×${item.count}`;
      el.inventory.append(row);
    }
  }
  el.flags.textContent = Object.keys(s.flags ?? {}).length ? Object.entries(s.flags).map(([k, v]) => `${k} = ${v}`).join(" · ") : "没有标记";
  el.clock.textContent = clockText(s.clock_minutes);
  el.tick.textContent = String(s.tick);
  el.hash.textContent = current.final_hash;
  el.footHash.textContent = current.final_hash;
  el.hint.textContent = s.flags?.["flag.airlock.open"]
    ? "气闸已开 · 点击地面走进门后 · E/F/T 交互"
    : "WASD 移动 · 点击地面寻路 · 拖动旋转视角 · 滚轮缩放";
}

function updateAnimation(dt, t) {
  for (const item of animated) {
    if (item.kind === "lamp") {
      item.light.intensity = (themeDark ? 18 : 9) + Math.sin(t * 1.7 + item.phase) * 0.9;
    }
  }
  if (doorGroup) {
    const target = doorGroup.userData.open ? 1 : 0;
    doorGroup.userData.anim = lerp(doorGroup.userData.anim ?? 0, target, 1 - Math.pow(0.001, dt));
    const open = doorGroup.userData.anim;
    for (const panel of doorPanels) {
      panel.position.x = panel.userData.side * (0.58 + open * 0.75);
    }
    if (doorGroup.userData.status) {
      doorGroup.userData.status.material.emissive.setHex(open > 0.5 ? 0x3dff9a : 0xff4a2a);
      doorGroup.userData.status.material.emissiveIntensity = 4.5;
    }
    doorLight.color.setHex(open > 0.5 ? 0x3dff9a : 0xff4a2a);
    doorLight.intensity = (themeDark ? 7 : 3) * (0.5 + open * 0.5);
  }
  if (cardGroup?.visible) {
    cardGroup.rotation.y += dt * 0.9;
    cardGroup.position.y = 1.15 + Math.sin(t * 2.0) * 0.06;
  }
  if (keeperGroup) {
    keeperGroup.position.y = Math.sin(t * 1.1) * 0.012;
    keeperGroup.userData.breath = Math.sin(t * 1.3) * 0.01;
  }
  if (playerGroup) {
    const walking = playerGroup.userData.walking;
    playerGroup.userData.walk += dt * (walking ? 9 : 2);
    const bob = Math.sin(playerGroup.userData.walk) * (walking ? 0.035 : 0.008);
    playerGroup.position.y = bob;
    // 身体整体上下浮动即可；腿部在低模里不单独做 IK。
  }
  if (lighthouseBeam) {
    lighthouseBeam.rotation.y = t * 0.12;
    lighthouseBeam.material.opacity = 0.045 + Math.sin(t * 1.2) * 0.015;
  }
  if (water) {
    const pos = water.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const wave = Math.sin(x * 0.22 + t * 0.7) * 0.09 + Math.sin(z * 0.35 - t * 1.0) * 0.05;
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
  }
  if (rain) {
    const pos = rain.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - rainSpeeds[i] * dt;
      if (y < 0) y = 15;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }
  if (dust) {
    dust.rotation.y = t * 0.01;
    dust.position.y = Math.sin(t * 0.2) * 0.08;
  }
}

function renderHud() {
  updateHud();
}

function showToast(text, duration = 2600) {
  el.toast.textContent = text;
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), duration);
}

function showDialogue(speaker, text) {
  el.dialogueSpeaker.textContent = speaker;
  el.dialogueText.textContent = text;
  el.dialogue.hidden = false;
  clearTimeout(dialogueTimer);
  dialogueTimer = setTimeout(() => { el.dialogue.hidden = true; }, 5200);
}

function handleEvents(events) {
  for (const event of events) {
    const data = event.data ?? {};
    switch (event.kind) {
      case "toast": showToast(translate(data.text)); break;
      case "dialogue_started": showDialogue(nameOf(data.speaker), translate(data.text)); break;
      case "item_acquired": showToast(`获得 ${nameOf(data.item)} ×${data.count}`); break;
      case "quest_completed": showToast(`任务完成：${translate(current?.quest_titles?.[data.quest] ?? data.quest)}`); break;
      case "door_opened": showToast("气闸开启"); break;
      case "schedule_changed":
        if (data.entity === "demo.keeper") showToast(`值班员 · ${data.behavior}`);
        break;
      default: break;
    }
  }
}

function actionFor(contentId) {
  const entity = current?.state.entities.find((e) => e.content_id === contentId);
  if (!entity) return;
  const player = current.state.entities.find((e) => e.content_id === "player");
  const dist = Math.hypot(entity.transform.position[0] - player.transform.position[0], entity.transform.position[2] - player.transform.position[2]);
  if (dist > 6.5) {
    showToast(`太远了（${dist.toFixed(1)}m）`);
    return;
  }
  const verbs = entity.interactable?.verbs ?? [];
  try {
    if (verbs.includes("pickup")) world.pickup("player", contentId);
    else if (verbs.includes("talk")) world.talk("player", contentId);
    else world.interact("player", contentId);
  } catch (error) {
    showToast(String(error));
  }
}

function nearestAction(verb) {
  const player = current?.state.entities.find((e) => e.content_id === "player");
  if (!player) return;
  let best = null;
  for (const entity of current.state.entities) {
    const verbs = entity.interactable?.verbs ?? [];
    if (!verbs.includes(verb)) continue;
    const dist = Math.hypot(entity.transform.position[0] - player.transform.position[0], entity.transform.position[2] - player.transform.position[2]);
    if (dist <= 6.5 && (!best || dist < best.dist)) best = { id: entity.content_id, dist };
  }
  if (best) actionFor(best.id);
  else showToast(verb === "pickup" ? "附近没有可拾取物" : verb === "talk" ? "附近没有可对话的人" : "附近没有可交互物");
}

function updateMove() {
  let x = 0;
  let z = 0;
  if (keys.has("w") || keys.has("arrowup")) z += 1;
  if (keys.has("s") || keys.has("arrowdown")) z -= 1;
  if (keys.has("a") || keys.has("arrowleft")) x -= 1;
  if (keys.has("d") || keys.has("arrowright")) x += 1;
  const len = Math.hypot(x, z);
  if (len > 0) {
    moving = true;
    world.set_move(x / len, z / len);
  } else if (moving) {
    moving = false;
    world.set_move(0, 0);
  }
}

function bindInput() {
  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    const key = event.key.toLowerCase();
    if (moveKeys.has(key)) {
      event.preventDefault();
      keys.add(key);
      updateMove();
      return;
    }
    if (key === "e") nearestAction("interact");
    if (key === "f") nearestAction("pickup");
    if (key === "t") nearestAction("talk");
    if (key === "p") togglePause();
    if (key === "r") resetWorld();
  });
  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (moveKeys.has(key)) {
      keys.delete(key);
      updateMove();
    }
  });
  window.addEventListener("blur", () => { keys.clear(); updateMove(); });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  canvas.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;
    const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (moved > 6) return;
    pointer.x = (event.clientX / innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (hits.length > 0) {
      const contentId = hits[0].object.userData.contentId;
      if (contentId) actionFor(contentId);
      return;
    }
    const floorHit = raycaster.intersectObject(floorMesh, false);
    if (floorHit.length > 0) {
      const p = floorHit[0].point;
      try {
        world.move_to(p.x, p.z);
        showToast(`寻路到 ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
      } catch (error) {
        showToast(String(error));
      }
    }
  });
}

function togglePause() {
  paused = !paused;
  el.pause.textContent = paused ? "继续" : "暂停";
}

function resetWorld() {
  world.reset();
  updateState();
  showToast("世界已重置");
}

async function replayTrace() {
  try {
    const trace = await fetch("./m0.trace.json").then((r) => r.text());
    const hash = world.replay(trace);
    el.replay.textContent = `M0 replay：${hash} ${hash === "0xc840fe2090a0a085" ? "PASS" : "FAIL"}`;
  } catch (error) {
    el.replay.textContent = `回放失败：${error}`;
  }
}

function bindUi() {
  document.getElementById("btn-interact").addEventListener("click", () => nearestAction("interact"));
  document.getElementById("btn-pickup").addEventListener("click", () => nearestAction("pickup"));
  document.getElementById("btn-talk").addEventListener("click", () => nearestAction("talk"));
  document.getElementById("btn-reset").addEventListener("click", resetWorld);
  el.pause.addEventListener("click", togglePause);
  document.getElementById("btn-replay").addEventListener("click", replayTrace);
  el.sound.addEventListener("click", toggleSound);
}

function toggleSound() {
  if (audio) {
    audio.ctx.close();
    audio = null;
    el.sound.textContent = "声音：关";
    el.sound.setAttribute("aria-pressed", "false");
    return;
  }
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = 0.045;
  master.connect(ctx.destination);
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 500;
  noise.connect(filter).connect(master);
  noise.start();
  const hum = ctx.createOscillator();
  hum.type = "sine";
  hum.frequency.value = 55;
  const humGain = ctx.createGain();
  humGain.gain.value = 0.3;
  hum.connect(humGain).connect(master);
  hum.start();
  audio = { ctx, master };
  el.sound.textContent = "声音：开";
  el.sound.setAttribute("aria-pressed", "true");
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (!paused) {
    acc += dt * 1_000_000;
    while (acc >= TICK_US) {
      world.tick(TICK_US);
      acc -= TICK_US;
    }
  }
  updateState();
  const events = JSON.parse(world.poll_events());
  if (events.length) handleEvents(events);
  updateAnimation(dt, t);
  hudTimer += dt;
  if (hudTimer > 0.1) {
    updateHud();
    hudTimer = 0;
  }

  if (intro < 1) {
    intro = clamp((now - introStart) / 2600, 0, 1);
    const e = smooth(intro);
    camera.position.lerpVectors(new THREE.Vector3(1.5, 4.4, -6.0), new THREE.Vector3(2.0, 3.4, -7.0), e);
    controls.target.lerpVectors(new THREE.Vector3(0.2, 1.8, 2), new THREE.Vector3(0.4, 1.25, 2.0), e);
  } else {
    const target = new THREE.Vector3(playerGroup.position.x, 1.35, playerGroup.position.z);
    const delta = target.clone().sub(controls.target);
    controls.target.add(delta.multiplyScalar(0.12));
    camera.position.add(delta.multiplyScalar(0.12));
  }
  controls.update();
  if (playerLight) {
    playerLight.target.position.set(
      Math.sin(playerGroup.rotation.y) * -2,
      0.2,
      Math.cos(playerGroup.rotation.y) * -2,
    );
    playerLight.target.updateMatrixWorld();
  }
  composer.render();
}

async function boot() {
  try {
    await init();
    const packText = await fetch("./pack.data").then((r) => r.text());
    pack = JSON.parse(packText);
    world = new PreviewWorld(packText);
    initScene();
    current = JSON.parse(world.state());
    updateState();
    bindInput();
    bindUi();
    updateState();
    updateHud();
    el.loading.classList.add("hidden");
    last = performance.now();
    animate();
  } catch (error) {
    el.loading.innerHTML = `<p>3D 场景启动失败：${String(error)}</p><p class="muted">请确认 WebGL 可用，并通过本地服务器打开。</p>`;
    console.error(error);
  }
}

boot();
