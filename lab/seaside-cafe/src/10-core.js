/* ============================================================
   海風珈琲・潮音の庭 — 核心工具 / 状态 / 渲染器
   ============================================================ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const R = rng(20261118);
const dampAngle = (a, b, l, dt) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * (1 - Math.exp(-l * dt)); };
const params = new URLSearchParams(location.search);
const IS_MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 820;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  started: false,
  shot: params.get('shot') || '',
  time: params.has('t') ? clamp(parseFloat(params.get('t')), 0, 1) : 0.70,
  weather: params.get('weather') === 'rain' ? 'rain' : 'clear',
  tide: 0.6,
  sound: true,
  lightsOn: true,
  musicOn: false,
  doorOpen: false,
  hasCoffee: false,
  coffeeType: '',
  seated: null,
  shells: 0,
  wishes: 0,
  photo: false,
  filter: 'none',
  menuOpen: false,
  modalOpen: false,
  quality: 'high',
  orderPending: false,
  coffeeDone: false,
  umbrellaOpen: true,
  shotCam: false,
  purr: 0,
  vending: 0,
  timeAuto: false,
};

const WORLD = {
  // 海在西侧（-x）。数值按提示词的海/沙/步道比例保留。
  seaEdge: -36,
  beachFar: -36,
  beachNear: -18,
  promenadeFar: -18,
  promenadeNear: -10,
  bounds: { minX: -47, maxX: 30, minZ: -40, maxZ: 28 },
  cafe: { x0: -4, x1: 4, z0: -3, z1: 3, floor: 0.45, eave: 6.0, ridge: 8.0 },
  terrace: { x0: -9, x1: -4, z0: -3, z1: 3, y: 0.45 },
};

/* ---------- renderer / scene / camera ---------- */
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1.35 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.34;
renderer.shadowMap.enabled = params.get('shadows') !== '0';
renderer.shadowMap.type = THREE.PCFShadowMap;
stage.appendChild(renderer.domElement);
const canvas = renderer.domElement;
canvas.setAttribute('role', 'application');
canvas.setAttribute('aria-label', '海風珈琲第一人称三维场景');
canvas.tabIndex = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1d2b35');
scene.fog = new THREE.FogExp2('#a9a99a', 0.0065);
const camera = new THREE.PerspectiveCamera(IS_MOBILE ? 66 : 62, innerWidth / innerHeight, 0.05, 420);
camera.rotation.order = 'YXZ';
const root = new THREE.Group();
scene.add(root);

/* ---------- 碰撞 / 交互 / 全局引用 ---------- */
const colliders = [];
const addCollider = (x0, x1, z0, z1, minY = -10, maxY = 20, tag = '') => {
  colliders.push({ x0, x1, z0, z1, minY, maxY, tag });
};
const interactables = [];
let hovered = null;

const refs = {
  scene, camera, renderer, root, colliders, interactables,
  sun: null, hemi: null, ambient: null, sky: null, sea: null, rain: null,
  interiorLights: [], lamps: [], stringLights: [], lighthouse: null,
  cat: null, cupInHand: null, seatReturn: null, gulls: [], shells: [],
  noren: null, chime: null, umbrella: null, record: null,
};

const player = {
  x: -13.2, z: 2.2, y: 0.05, yaw: -Math.PI / 2, pitch: -0.05,
  height: 1.68, radius: 0.28, speed: 3.2, vx: 0, vz: 0,
  bob: 0, moving: false, locked: false, dragLook: false,
};

/* ---------- 共享几何缓存 ---------- */
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 16, 12),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  plane: new THREE.PlaneGeometry(1, 1),
  circle: new THREE.CircleGeometry(1, 24),
};

/* ---------- 几何辅助 ---------- */
function box(parent, w, h, d, x, y, z, material, o = {}) {
  const m = new THREE.Mesh(GEO.box, material);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  m.castShadow = o.cast ?? false;
  m.receiveShadow = o.receive ?? true;
  parent.add(m);
  return m;
}
function cylinder(parent, rt, rb, h, x, y, z, material, o = {}) {
  const g = new THREE.CylinderGeometry(rt, rb, h, o.seg || 12, 1, o.open || false);
  const m = new THREE.Mesh(g, material);
  m.position.set(x, y, z);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  m.castShadow = o.cast ?? false;
  m.receiveShadow = o.receive ?? true;
  parent.add(m);
  return m;
}
function sphere(parent, r, x, y, z, material, o = {}) {
  const m = new THREE.Mesh(GEO.sphere, material);
  m.scale.set(r * (o.sx || 1), r * (o.sy || 1), r * (o.sz || 1));
  m.position.set(x, y, z);
  m.castShadow = o.cast ?? false;
  m.receiveShadow = o.receive ?? true;
  parent.add(m);
  return m;
}
function plane(parent, w, h, x, y, z, material, o = {}) {
  const m = new THREE.Mesh(GEO.plane, material);
  m.scale.set(w, h, 1);
  m.position.set(x, y, z);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  m.receiveShadow = o.receive ?? true;
  parent.add(m);
  return m;
}
function group(parent, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}
function circlePlane(parent, r, x, y, z, material, o = {}) {
  const m = new THREE.Mesh(GEO.circle, material);
  m.scale.set(r, r, 1);
  m.position.set(x, y, z);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  parent.add(m);
  return m;
}

/* ---------- 文本 / 画布 ---------- */
const JP_SERIF = '"Hiragino Mincho ProN","Yu Mincho","Songti SC",serif';
const JP_SANS = '"Hiragino Sans","Yu Gothic","Noto Sans JP",sans-serif';
function canvasTexture(w, h, draw, o = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  return t;
}
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr); ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
}
function glowTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(.25, 'rgba(255,255,255,.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}
const GLOW_TEX = glowTexture();

function sprite(parent, map, color, size, x, y, z, opacity = .5, blending = THREE.AdditiveBlending) {
  const m = new THREE.SpriteMaterial({ map, color, transparent: true, opacity, blending, depthWrite: false, toneMapped: false });
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  s.position.set(x, y, z);
  parent.add(s);
  return s;
}

/* ---------- 地形高度 / 碰撞 ---------- */
function groundHeight(x, z) {
  // 咖啡馆室内与露台
  if (x > -4.05 && x < 4.05 && z > -3.05 && z < 3.05) return 0.8;
  if (x > -9.05 && x < -4 && z > -3.05 && z < 3.05) return 0.45;
  // 露台台阶（坡道感）
  if (x >= -10.6 && x <= -9.05 && z > -1.5 && z < 1.5) return lerp(0.05, 0.45, smoothstep(-10.6, -9.05, x));
  if (x >= -4.6 && x <= -4 && z > -0.4 && z < 1.6) return 0.78;
  // 神社小丘
  if (x > 11 && x < 29 && z > -9 && z < 11) {
    const dx = (x - 20) / 9, dz = (z - 1) / 7;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 1) return 0.05 + (1 - d * d) * 2.6;
  }
  // 北侧渔港木栈桥
  if (x > -42 && x < -30 && z > -38 && z < -28) return 0.22;
  // 沙滩：从步道向海缓慢下降
  if (x < -18 && x > -36.2) {
    const t = smoothstep(-18, -36, x);
    return lerp(0.05, -0.33, t) + Math.sin(z * .18) * .04;
  }
  return 0.05;
}
function collidesAt(x, z, y) {
  if (x < WORLD.bounds.minX + .3 || x > WORLD.bounds.maxX - .3 || z < WORLD.bounds.minZ + .3 || z > WORLD.bounds.maxZ - .3) return true;
  // 下水线：北侧渔港木台允许走到海面上
  if (x < WORLD.seaEdge + .45 && !(z > -38.5 && z < -27.5 && x > -43)) return true;
  for (const c of colliders) {
    if (c.disabled) continue;
    if (y < c.minY || y > c.maxY) continue;
    const nx = clamp(x, c.x0, c.x1), nz = clamp(z, c.z0, c.z1);
    if ((x - nx) ** 2 + (z - nz) ** 2 < player.radius ** 2) return true;
  }
  return false;
}
function floorAt(x, z) {
  let y = groundHeight(x, z);
  // 露台栏杆 / 台阶处不额外处理
  return y;
}

/* ---------- 交互注册 ---------- */
function registerInteract(name, object3D, label, action, options = {}) {
  object3D.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(object3D);
  const size = b.getSize(new THREE.Vector3());
  const center = b.getCenter(new THREE.Vector3());
  const geo = new THREE.BoxGeometry(Math.max(size.x, .18), Math.max(size.y, .18), Math.max(size.z, .18));
  const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
  mat.visible = false;
  const hit = new THREE.Mesh(geo, mat);
  hit.position.copy(center);
  hit.castShadow = false; hit.receiveShadow = false;
  hit.userData.interact = name;
  hit.layers.set(1);
  root.add(hit);
  const item = {
    name, object: object3D, hitbox: hit, label, action,
    max: options.max ?? 3.2, cooldown: 0, dynamic: !!options.dynamic,
    enabled: options.enabled !== false, box: b,
  };
  hit.userData.item = item;
  interactables.push(item);
  return item;
}

/* ---------- 时间标签 ---------- */
function timeLabel(t) {
  const mins = Math.round((5 + t * 24 * 60) % (24 * 60));
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  let name = '深夜';
  if (t < .2) name = '清晨';
  else if (t < .4) name = '上午';
  else if (t < .55) name = '正午';
  else if (t < .72) name = '午后';
  else if (t < .86) name = '黄昏';
  else name = '夜晚';
  return { text: `${name} ${hh}:${mm}`, hhmm: `${hh}:${mm}` };
}
