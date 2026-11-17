import * as THREE from 'three';
import { AmbientAudio } from './audio.js';
import {
  DURATIONS, DEFAULT_DURATION, createSession, startSession, pauseSession,
  resetSession, tickSession, progress, formatTime, moodFor, recordSession, loadState,
} from './session.js';

const $ = (sel) => document.querySelector(sel);
const SAVE_KEY = 'slow-cabin-state-v1';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function readSaved() {
  try { return loadState(JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')); }
  catch { return loadState(null); }
}
let state = readSaved();
let session = createSession(state.duration);
let selectedDuration = state.duration;
let intention = state.intention;
let entered = false;
let audio = new AmbientAudio();
let currentObject = null;
let toastTimer = 0;
let sceneTime = 0;
let hoverName = '';
let lampOn = true;

const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a1210');
scene.fog = new THREE.Fog('#0a1210', 8, 18);
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, .1, 100);
const target = new THREE.Vector3(0, 1.25, 0);
let cam = { theta: .58, phi: 1.12, radius: 7.4 };

function updateCamera() {
  const p = Math.max(.55, Math.min(1.55, cam.phi));
  const r = Math.max(4.6, Math.min(9.5, cam.radius));
  camera.position.set(
    target.x + r * Math.sin(p) * Math.sin(cam.theta),
    target.y + r * Math.cos(p),
    target.z + r * Math.sin(p) * Math.cos(cam.theta),
  );
  camera.lookAt(target);
}
updateCamera();

scene.add(new THREE.HemisphereLight('#95b8a4', '#2a1d16', 1.15));
const ambient = new THREE.AmbientLight('#6d8d7d', .45);
scene.add(ambient);
const windowLight = new THREE.DirectionalLight('#9dc5d0', 1.25);
windowLight.position.set(4, 5, -5);
windowLight.castShadow = true;
windowLight.shadow.mapSize.set(1024, 1024);
scene.add(windowLight);
const lampLight = new THREE.PointLight('#ffb86b', 2.1, 6.5, 1.8);
lampLight.position.set(1.35, 1.55, -.05);
lampLight.castShadow = true;
lampLight.shadow.mapSize.set(512, 512);
scene.add(lampLight);
const fill = new THREE.PointLight('#79c4b7', .55, 7, 1.5);
fill.position.set(-2.4, 2.4, 1.8);
scene.add(fill);

const M = {
  wood: new THREE.MeshStandardMaterial({ color: '#4e3428', roughness: .76, metalness: .04 }),
  woodLight: new THREE.MeshStandardMaterial({ color: '#7b5438', roughness: .7 }),
  dark: new THREE.MeshStandardMaterial({ color: '#1b2421', roughness: .82 }),
  wall: new THREE.MeshStandardMaterial({ color: '#22322b', roughness: .9 }),
  wall2: new THREE.MeshStandardMaterial({ color: '#1b2924', roughness: .9 }),
  metal: new THREE.MeshStandardMaterial({ color: '#8c8c7a', roughness: .35, metalness: .75 }),
  brass: new THREE.MeshStandardMaterial({ color: '#b68a49', roughness: .32, metalness: .75 }),
  cream: new THREE.MeshStandardMaterial({ color: '#d8cbb1', roughness: .8 }),
  sage: new THREE.MeshStandardMaterial({ color: '#78936e', roughness: .85 }),
  leaf: new THREE.MeshStandardMaterial({ color: '#6f956b', roughness: .9 }),
  leaf2: new THREE.MeshStandardMaterial({ color: '#89a874', roughness: .9 }),
  cat: new THREE.MeshStandardMaterial({ color: '#b58b64', roughness: .95 }),
  catDark: new THREE.MeshStandardMaterial({ color: '#5f4634', roughness: .95 }),
  rug: new THREE.MeshStandardMaterial({ color: '#6b3e35', roughness: 1 }),
  rug2: new THREE.MeshStandardMaterial({ color: '#a76b4d', roughness: 1 }),
  paper: new THREE.MeshStandardMaterial({ color: '#e5d7bb', roughness: .95 }),
  screen: new THREE.MeshStandardMaterial({ color: '#203d3a', emissive: '#1b5c55', emissiveIntensity: .5, roughness: .4 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#183a3b', transparent: true, opacity: .22, roughness: .15, metalness: .1 }),
  planet: new THREE.MeshStandardMaterial({ color: '#87b8b0', emissive: '#2f6762', emissiveIntensity: .55, roughness: .7 }),
  windowFrame: new THREE.MeshStandardMaterial({ color: '#101916', roughness: .7 }),
};

const room = new THREE.Group();
scene.add(room);

function box(w, h, d, mat, x, y, z, parent = room, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}
function cyl(rt, rb, h, mat, x, y, z, parent = room, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function sph(r, mat, x, y, z, parent = room) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function mark(obj, key) {
  obj.userData.interact = key;
  obj.traverse(o => { o.userData.interact = key; });
  return obj;
}

// floor / rug
box(8.6, .12, 6.2, M.wood, 0, -.06, 0);
const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, .025, 48), M.rug);
rug.position.set(-.8, .025, 1.15); rug.receiveShadow = true; room.add(rug);
const rugInner = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, .027, 48), M.rug2);
rugInner.position.set(-.8, .028, 1.15); room.add(rugInner);

// walls with a real window opening (back z=-3.12)
box(4.2, 3.3, .16, M.wall, -2.0, 1.6, -3.12);
box(1.8, 3.3, .16, M.wall, 3.3, 1.6, -3.12);
box(2.4, .4, .16, M.wall, 1.25, 3.0, -3.12);
box(2.4, 1.3, .16, M.wall, 1.25, .65, -3.12);
box(.16, 3.3, 6.2, M.wall2, -4.28, 1.6, 0);
box(.16, 3.3, 6.2, M.wall2, 4.28, 1.6, 0);
// window opening cover: punch visual with dark recess and frame; wall remains behind but recess panel covers
const winGroup = new THREE.Group();
winGroup.position.set(1.25, 2.05, -3.02);
room.add(winGroup);
const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), M.glass);
glass.position.set(0, 0, .03); winGroup.add(glass);
box(2.6, .08, .12, M.windowFrame, 1.25, 2.84, -2.94);
box(2.6, .08, .12, M.windowFrame, 1.25, 1.28, -2.94);
box(.08, 1.65, .12, M.windowFrame, .02, 2.06, -2.94);
box(.08, 1.65, .12, M.windowFrame, 2.48, 2.06, -2.94);
box(.05, 1.4, .05, M.windowFrame, 1.25, 2.06, -2.9);
box(2.2, .05, .05, M.windowFrame, 1.25, 2.06, -2.9);
mark(winGroup, 'window');

// planet / stars outside
const planet = sph(.58, M.planet, 1.45, 2.25, -5.8);
const ring = new THREE.Mesh(new THREE.TorusGeometry(.92, .018, 8, 64), new THREE.MeshBasicMaterial({ color: '#b9a06a', transparent: true, opacity: .55 }));
ring.position.set(1.45, 2.25, -5.8); ring.rotation.set(1.15, .2, .5); room.add(ring);
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 130; i++) starPos.push((Math.random() - .5) * 7, 1 + Math.random() * 3.2, -6.2 - Math.random() * 2);
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#d7e6db', size: .025, transparent: true, opacity: .8 }));
room.add(stars);

// desk
const desk = new THREE.Group(); room.add(desk);
box(3.15, .12, 1.25, M.woodLight, .1, .86, .22, desk);
for (const [x, z] of [[-1.35, -.26], [1.5, -.26], [-1.35, .7], [1.5, .7]]) box(.12, .8, .12, M.wood, x, .42, z, desk);
box(2.9, .06, .05, M.wood, .1, .3, .75, desk);
// laptop
const laptop = new THREE.Group(); laptop.position.set(.35, .94, .15); desk.add(laptop);
box(.92, .055, .62, M.dark, 0, 0, 0, laptop);
const screen = box(.9, .58, .035, M.screen, 0, .3, -.29, laptop);
screen.rotation.x = -.13;
mark(laptop, 'laptop');
// lamp
const lamp = new THREE.Group(); lamp.position.set(1.45, .94, -.1); desk.add(lamp);
cyl(.16, .2, .04, M.brass, 0, 0, 0, lamp);
cyl(.035, .035, .62, M.brass, 0, .32, 0, lamp);
const shade = new THREE.Mesh(new THREE.ConeGeometry(.34, .34, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#d2b47b', roughness: .8, side: THREE.DoubleSide, emissive: '#8a5a25', emissiveIntensity: .25 }));
shade.position.set(0, .68, 0); shade.rotation.x = Math.PI; lamp.add(shade);
mark(lamp, 'lamp');
// mug / notebook
const mug = cyl(.095, .11, .16, M.cream, .95, .96, .55, desk);
mark(mug, 'mug');
box(.42, .035, .55, M.paper, -.58, .9, .38, desk).rotation.y = -.08;
box(.05, .16, .05, M.dark, -.42, .98, .38, desk).rotation.z = .3;
// chair
const chair = new THREE.Group(); chair.position.set(-.05, 0, 1.25); room.add(chair);
box(.85, .1, .72, M.woodLight, 0, .52, 0, chair);
box(.85, .55, .1, M.wood, 0, .8, .3, chair);
for (const [x, z] of [[-.32, -.26], [.32, -.26], [-.32, .26], [.32, .26]]) cyl(.04, .04, .52, M.metal, x, .26, z, chair);
mark(chair, 'chair');

// shelf / books
const shelf = new THREE.Group(); shelf.position.set(-3.95, 2.0, -1.0); room.add(shelf);
box(.18, 2.2, 2.4, M.wood, 0, 0, 0, shelf);
for (let i = 0; i < 3; i++) box(.55, .04, 2.2, M.woodLight, .1, -.65 + i * .65, 0, shelf);
const bookCols = ['#a76b4d', '#6b8d83', '#b9a06a', '#6b4a3e', '#8aa17c'];
for (let i = 0; i < 14; i++) {
  const b = box(.12, .34 + (i % 3) * .04, .22, new THREE.MeshStandardMaterial({ color: bookCols[i % bookCols.length], roughness: .8 }), .16 + (i % 2) * .03, -.45 + Math.floor(i / 5) * .62, -.78 + (i % 5) * .34, shelf);
  b.rotation.z = .02 * (i % 3);
}

// plant
const plant = new THREE.Group(); plant.position.set(-2.7, 0, -1.65); room.add(plant);
cyl(.3, .38, .42, new THREE.MeshStandardMaterial({ color: '#8e5d42', roughness: .9 }), 0, .21, 0, plant);
for (let i = 0; i < 9; i++) {
  const a = i / 9 * Math.PI * 2;
  const stem = cyl(.015, .025, .62 + (i % 3) * .18, M.leaf, Math.cos(a) * .12, .62 + (i % 3) * .09, Math.sin(a) * .12, plant);
  stem.rotation.z = Math.cos(a) * .28; stem.rotation.x = Math.sin(a) * .28;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(.17 + (i % 3) * .03, 10, 8), i % 2 ? M.leaf2 : M.leaf);
  leaf.scale.set(1.3, .45, .8); leaf.position.set(Math.cos(a) * (.35 + (i % 3) * .06), .88 + (i % 3) * .14, Math.sin(a) * (.35 + (i % 3) * .06)); plant.add(leaf);
}
mark(plant, 'plant');

// speaker
const speaker = new THREE.Group(); speaker.position.set(2.65, 0, 1.15); room.add(speaker);
box(.62, .78, .48, M.wood, 0, .39, 0, speaker);
for (const y of [.27, .58]) {
  const c = cyl(.15, .15, .02, M.dark, 0, y, .25, speaker);
  c.rotation.x = Math.PI / 2;
}
mark(speaker, 'speaker');

// cat
const cat = new THREE.Group(); cat.position.set(-1.65, 0, 1.45); cat.rotation.y = .38; room.add(cat);
const catBody = sph(.34, M.cat, 0, .34, 0, cat); catBody.scale.set(1.35, .85, 1);
const catHead = sph(.27, M.cat, -.28, .58, -.05, cat);
const earL = new THREE.Mesh(new THREE.ConeGeometry(.09, .22, 4), M.catDark); earL.position.set(-.42, .8, -.1); earL.rotation.z = .2; cat.add(earL);
const earR = new THREE.Mesh(new THREE.ConeGeometry(.09, .22, 4), M.catDark); earR.position.set(-.14, .8, -.1); earR.rotation.z = -.2; cat.add(earR);
const tail = new THREE.Mesh(new THREE.CylinderGeometry(.035, .055, .8, 8), M.catDark);
tail.position.set(.48, .3, .15); tail.rotation.z = -1.1; cat.add(tail);
sph(.035, M.dark, -.4, .64, .18, cat); sph(.035, M.dark, -.18, .64, .18, cat);
sph(.025, M.catDark, -.3, .57, .24, cat);
mark(cat, 'cat');

// dust
const dustGeo = new THREE.BufferGeometry();
const dustPos = [];
for (let i = 0; i < 90; i++) dustPos.push((Math.random() - .5) * 7, .3 + Math.random() * 2.8, (Math.random() - .5) * 5);
dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#e7d9b8', size: .022, transparent: true, opacity: .38, depthWrite: false }));
room.add(dust);

// interaction
const raycaster = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let drag = null;
const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, theta: cam.theta, phi: cam.phi }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (drag) {
    cam.theta = drag.theta + (e.clientX - drag.x) * .007;
    cam.phi = Math.max(.6, Math.min(1.45, drag.phi + (e.clientY - drag.y) * .004));
    updateCamera();
    return;
  }
  const hit = pick(e);
  const name = hit && OBJECTS[hit] ? OBJECTS[hit].name : '';
  if (name !== hoverName) {
    hoverName = name;
    $('#hover-label').textContent = name;
    $('#hover-label').classList.toggle('show', !!name);
    canvas.style.cursor = name ? 'pointer' : 'grab';
  }
});
canvas.addEventListener('pointerup', e => {
  const moved = drag && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 5;
  drag = null;
  if (moved) return;
  const hit = pick(e); if (hit) openObject(hit);
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  cam.radius = Math.max(4.6, Math.min(9.5, cam.radius + (e.deltaY > 0 ? .45 : -.45)));
  updateCamera();
}, { passive: false });

function pick(e) {
  const r = canvas.getBoundingClientRect();
  ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(ptr, camera);
  const hits = raycaster.intersectObjects(room.children, true);
  for (const h of hits) {
    let o = h.object;
    while (o && o !== room) {
      if (o.userData && o.userData.interact) return o.userData.interact;
      o = o.parent;
    }
  }
  return '';
}

const OBJECTS = {
  lamp: { name: '黄铜台灯', desc: '光不刺眼。它不催你，只把桌面照得刚好够用。', action: '开关灯', run: () => { lampOn = !lampOn; lampLight.intensity = lampOn ? 2.1 : .08; shade.material.emissiveIntensity = lampOn ? .25 : 0; toast(lampOn ? '灯亮了。' : '只留下窗外的光。'); } },
  plant: { name: '窗边植物', desc: '它长得不快，但每一次专注都会留下一点新叶。', action: '浇水', run: () => { state.plantLevel = Math.min(4, state.plantLevel + 1); save(); applyPlant(); toast('浇了一点水。'); } },
  cat: { name: '猫', desc: '它不提供效率。它只是在这里，呼吸，偶尔看你一眼。', action: '摸一摸', run: () => { catWiggle = 1.2; toast('呼噜声。'); } },
  window: { name: '舷窗', desc: '外面是夜航中的城市。没有任务，只有很远的光。', action: '换一个夜', run: () => { nightMode = !nightMode; applyNight(); toast(nightMode ? '切到夜航。' : '切到雨夜。'); } },
  speaker: { name: '唱机', desc: '没有歌单，只有一层很轻的低鸣。', action: '开关环境声', run: () => { toggleSound(); } },
  mug: { name: '茶杯', desc: '已经凉了，但还可以再坐一会儿。', action: '放下', run: () => { toast('茶还温着。'); } },
  chair: { name: '椅子', desc: '坐在这里，不必马上开始。', action: '坐下', run: () => { toast('先坐一会儿，也算开始。'); } },
  laptop: { name: '笔记本', desc: '屏幕没有通知。它只等你写下第一句话。', action: '开始专注', run: () => { if (!session.running) toggleSession(); } },
};

function openObject(key) {
  currentObject = key;
  const o = OBJECTS[key]; if (!o) return;
  $('#object-kicker').textContent = 'OBJECT / ' + key.toUpperCase();
  $('#object-name').textContent = o.name;
  $('#object-desc').textContent = o.desc;
  $('#object-action').textContent = o.action;
  $('#object-card').hidden = false;
}
$('#object-close').addEventListener('click', () => { $('#object-card').hidden = true; });
$('#object-action').addEventListener('click', () => { if (currentObject) OBJECTS[currentObject].run(); });

let catWiggle = 0;
let nightMode = true;

function applyPlant() {
  const s = 1 + state.plantLevel * .08;
  plant.scale.set(s, s, s);
  $('#plant-level').textContent = state.plantLevel;
  $('#comfort-plant').textContent = ['醒着', '新芽', '舒展', '有光', '茂盛'][state.plantLevel];
}
function applyNight() {
  const c = nightMode ? '#0a1210' : '#152022';
  scene.background.set(c); scene.fog.color.set(c);
  planet.material.color.set(nightMode ? '#87b8b0' : '#b7a58a');
  planet.material.emissive.set(nightMode ? '#2f6762' : '#5e4b39');
  stars.material.opacity = nightMode ? .8 : .2;
  windowLight.intensity = nightMode ? 1.25 : .6;
}
function toast(text) {
  const el = $('#toast'); el.textContent = text; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// UI
$('#intention').value = intention;
$('#intention').addEventListener('input', e => { intention = e.target.value; state.intention = intention; save(); });
document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
  intention = b.dataset.preset; $('#intention').value = intention; state.intention = intention; save();
}));
document.querySelectorAll('[data-min]').forEach(b => b.addEventListener('click', () => {
  if (session.running) { toast('先暂停或重置，再换时长。'); return; }
  selectedDuration = Number(b.dataset.min);
  session = createSession(selectedDuration);
  updateUI();
}));
$('#start').addEventListener('click', toggleSession);
$('#reset').addEventListener('click', () => { session = resetSession(session); updateUI(); toast('重新开始。'); });
$('#sound').addEventListener('click', toggleSound);
$('#help').addEventListener('click', () => { $('#welcome').hidden = false; $('#welcome-close').hidden = !entered; });
$('#welcome-close').addEventListener('click', () => { $('#welcome').hidden = true; });
$('#enter').addEventListener('click', async () => {
  $('#welcome').hidden = true; entered = true;
  await startAudio();
  toast('欢迎回来。先坐一会儿，也算开始。');
});
$('#sound').setAttribute('aria-pressed', 'false');

async function startAudio() {
  if (!audio.started) {
    try { await audio.start(); audio.setAll(state.audio); updateSound(); }
    catch { toast('浏览器阻止了声音；交互后可再试。'); }
  }
}
function toggleSound() {
  if (!audio.started) { startAudio(); state.audio.muted = false; updateSound(); return; }
  state.audio.muted = !state.audio.muted;
  audio.set('muted', state.audio.muted);
  updateSound(); save();
}
function updateSound() {
  const b = $('#sound');
  b.textContent = !audio.started ? '声音：关' : (state.audio.muted ? '声音：关' : '声音：开');
  b.setAttribute('aria-pressed', state.audio.muted ? 'true' : 'false');
}

const sliders = ['rain', 'wind', 'vinyl', 'hum'];
sliders.forEach(key => {
  const input = $('#' + key), out = $('#' + key + '-out');
  input.value = state.audio[key] ?? .2;
  out.textContent = Math.round(input.value * 100) + '%';
  input.addEventListener('input', () => {
    state.audio[key] = Number(input.value);
    out.textContent = Math.round(input.value * 100) + '%';
    audio.set(key, Number(input.value)); save();
  });
});

function toggleSession() {
  if (!entered) { $('#welcome').hidden = false; return; }
  if (session.completed) session = createSession(selectedDuration);
  if (session.running) { session = pauseSession(session); toast('先停一下。'); }
  else { session = startSession(session); startAudio(); toast('这一会儿，只做这一件事。'); }
  updateUI();
}
function finishSession() {
  const minutes = Math.round(session.duration / 60);
  state = recordSession(state, minutes, intention);
  save(); audio.chime();
  applyPlant();
  session = createSession(selectedDuration);
  updateUI();
  toast('这一班结束了。谢谢你坐在这里。');
  $('#log').innerHTML = logHTML();
}
function save() {
  state.duration = selectedDuration;
  state.intention = intention;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
}
function updateUI() {
  const p = progress(session);
  $('#ring').style.setProperty('--p', (p * 100).toFixed(1));
  $('#timer').textContent = formatTime(session.remaining);
  $('#start').textContent = session.running ? '暂停' : (session.elapsed > 0 ? '继续' : '开始专注');
  $('#pause').hidden = true;
  const mood = moodFor(p);
  const labels = { arrive: '准备好了吗？', settle: '安定下来。', deep: '正在深处。', return: '慢慢回来。' };
  $('#timer-label').textContent = session.completed ? '完成了。' : labels[mood];
  $('#focus-state').textContent = session.running ? '专注中' : (session.elapsed > 0 ? '已暂停' : '未开始');
  $('#phase').textContent = '夜航 · ' + ['到达', '安定', '深入', '回来'][Math.min(3, Math.floor(p * 4))];
  document.querySelectorAll('[data-min]').forEach(b => b.classList.toggle('on', Number(b.dataset.min) === selectedDuration));
  $('#total-min').textContent = state.totalMinutes || 0;
  $('#plant-level').textContent = state.plantLevel || 0;
  $('#comfort-light').textContent = lampOn ? '暖' : '只留窗光';
  $('#comfort-quiet').textContent = audio.state.muted ? '静音' : '高';
  $('#caption').textContent = session.running ? ['灯亮着，城市在窗外呼吸。', '让呼吸慢一点。', '你不是机器。', '快回来了。'][Math.min(3, Math.floor(p * 4))] : '灯亮着，城市在窗外呼吸。';
  if ($('#log').querySelector('.empty') === null && state.sessions.length === 0) $('#log').innerHTML = logHTML();
}
function logHTML() {
  if (!state.sessions.length) return '<li class="empty">还没有记录。第一盏灯从今晚开始。</li>';
  return state.sessions.slice(0, 4).map(s => `<li><b>${String(s.minutes).padStart(2, '0')}′</b><span>${escapeHTML(s.intention)}<br><span style="color:var(--faint)">${new Date(s.at).toLocaleDateString('zh-CN')}</span></span></li>`).join('');
}
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
$('#log').innerHTML = logHTML();
applyPlant(); applyNight(); updateSound(); updateUI();

// keyboard
window.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.code === 'Space') { e.preventDefault(); toggleSession(); }
  else if (e.key.toLowerCase() === 'r') { session = resetSession(session); updateUI(); }
  else if (e.key.toLowerCase() === 'm') toggleSound();
  else if (['1', '2', '3', '4'].includes(e.key)) {
    const b = document.querySelector(`[data-min="${DURATIONS[Number(e.key) - 1]}"]`); if (b) b.click();
  } else if (e.key.toLowerCase() === 'h') { $('#welcome').hidden = false; $('#welcome-close').hidden = !entered; }
});

// animation
let lastUI = '';
let lastFrame = performance.now();
function animate(now) {
  const t = typeof now === 'number' ? now : performance.now();
  const dt = Math.min((t - lastFrame) / 1000, .05);
  lastFrame = t;
  sceneTime += dt;
  if (session.running) {
    session = tickSession(session, dt);
    if (session.completed) finishSession();
    else {
      const key = formatTime(session.remaining);
      if (key !== lastUI) { lastUI = key; updateUI(); }
      else { $('#ring').style.setProperty('--p', (progress(session) * 100).toFixed(1)); }
    }
  }
  cat.rotation.z = Math.sin(sceneTime * .8) * .015;
  tail.rotation.x = Math.sin(sceneTime * 1.7) * .18 + (catWiggle > 0 ? Math.sin(sceneTime * 18) * .4 : 0);
  catWiggle = Math.max(0, catWiggle - dt);
  if (!reduced) {
    dust.rotation.y = Math.sin(sceneTime * .06) * .08;
    dust.position.y = Math.sin(sceneTime * .18) * .04;
    planet.rotation.y += dt * .02;
    ring.rotation.z += dt * .01;
  }
  lampLight.intensity = lampOn ? 2.0 + Math.sin(sceneTime * 2.1) * .05 : .08;
  shade.material.emissiveIntensity = lampOn ? .22 + Math.sin(sceneTime * 1.7) * .03 : 0;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// optional gentle welcome if no sessions
if (!state.sessions.length) $('#welcome-close').hidden = true;
// 调试/截图入口：?skipwelcome=1 直接进入房间（不启动音频）
if (new URLSearchParams(location.search).has('skipwelcome')) {
  entered = true; $('#welcome').hidden = true;
}
