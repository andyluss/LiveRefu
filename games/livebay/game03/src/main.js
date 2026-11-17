import * as THREE from 'three';
import { AmbientAudio, TRACKS, TRACK_IDS } from './audio.js';
import { buildWorld, FLOOR_H, EYE, ROOMS } from './world.js';
import {
  DURATIONS, createSession, startSession, pauseSession, resetSession,
  syncSession, progress, formatTime, moodFor, recordSession, loadState,
} from './session.js';

const $ = (sel) => document.querySelector(sel);
const SAVE_KEY = 'slow-cabin-state-v1';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SCENES = {
  night: { label: '夜航', note: '夜航 · 城市在窗外呼吸', bg: '#0a1210', fog: '#0a1210', sky: '#17333a', glow: '#1f5960', factor: 1.0, quote: '灯亮着，城市在窗外呼吸。' },
  rain: { label: '雨港', note: '雨港 · 雨落在舷窗上', bg: '#071315', fog: '#071315', sky: '#10282c', glow: '#174148', factor: .78, quote: '雨落在舷窗上，城市变得很远。' },
  dawn: { label: '晨光', note: '晨光 · 天慢慢亮了', bg: '#17110f', fog: '#17110f', sky: '#35221c', glow: '#9b5c3f', factor: 1.2, quote: '灯还没关，天已经慢慢亮了。' },
};
const SCENE_IDS = ['night', 'rain', 'dawn'];

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
let lampOn = true;
let sceneTime = 0;
let catWiggle = 0;
let lastUI = '';
let lastFrame = performance.now();
let toastTimer = 0;
let hoverKey = '';
let keys = {};

// ---------- renderer / scene ----------
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a1210');
scene.fog = new THREE.Fog('#0a1210', 10, 34);
const camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, .05, 100);
camera.rotation.order = 'YXZ';
scene.add(new THREE.HemisphereLight('#9bb7a5', '#2a1d16', 1.35));
const ambient = new THREE.AmbientLight('#789084', .55);
scene.add(ambient);
const sun = new THREE.DirectionalLight('#a9cbd2', 1.3);
sun.position.set(8, 12, -6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
scene.add(sun);

const world = buildWorld();
scene.add(world.group);

// ---------- player ----------
const player = { x: world.spawn.x, z: world.spawn.z, floor: world.spawn.floor, height: 0, yaw: Math.PI / 2, pitch: 0 };
const spawn = { ...player };

function stairAt(x, z, floor = player.floor) { return world.stairHeight(x, z, floor); }
function vertical() {
  const s = stairAt(player.x, player.z);
  if (s) { player.height = s.height; player.floor = s.floor; }
  else player.height = player.floor * FLOOR_H;
  camera.position.set(player.x, player.height + EYE, player.z);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}
function roomNow() {
  if (stairAt(player.x, player.z)) return '楼梯';
  const r = world.roomAt(player.floor, player.x, player.z);
  return r ? r.name : '走廊';
}
function updatePlaceUI() {
  $('#room-label').textContent = roomNow();
  $('#floor-label').textContent = String(player.floor + 1) + 'F';
}

function canStand(x, z) {
  if (x < -10.65 || x > 10.65 || z < -7.65 || z > 7.65) return false;
  const s = stairAt(x, z);
  if (s) return x >= s.stair.x0 + .3 && x <= s.stair.x1 - .3;
  return !world.blocked(player.floor, x, z, .28);
}
function movePlayer(dx, dz) {
  if (!dx && !dz) return;
  if (canStand(player.x + dx, player.z)) player.x += dx;
  if (canStand(player.x, player.z + dz)) player.z += dz;
  vertical();
}

// ---------- look / pointer lock ----------
const canvas = renderer.domElement;
let pointerLocked = false;
let dragging = false;
let lastX = 0, lastY = 0;
canvas.addEventListener('click', () => {
  if (!pointerLocked && canvas.requestPointerLock) canvas.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  $('#walk-hint').classList.toggle('hide', pointerLocked);
});
canvas.addEventListener('pointerdown', e => {
  if (pointerLocked) return;
  dragging = true; lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('pointerup', () => { dragging = false; });
document.addEventListener('mousemove', e => {
  if (pointerLocked) {
    player.yaw -= e.movementX * .0022;
    player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - e.movementY * .0022));
  } else if (dragging) {
    player.yaw -= (e.clientX - lastX) * .004;
    player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - (e.clientY - lastY) * .004));
    lastX = e.clientX; lastY = e.clientY;
  }
  vertical();
});

// ---------- interaction ----------
const ray = new THREE.Raycaster(); ray.far = 3.8;
function findInteractable() {
  camera.updateMatrixWorld();
  world.group.updateMatrixWorld(true);
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const groups = Object.values(world.interactables);
  const hits = ray.intersectObjects(groups, true);
  for (const h of hits) {
    let o = h.object;
    while (o) { if (o.userData && o.userData.interact) return o.userData.interact; o = o.parent; }
  }
  return '';
}
const OBJECTS = {
  lamp: { name: '黄铜台灯', run: () => { lampOn = !lampOn; world.fixtures.lamp.light.intensity = lampOn ? 1.4 : .02; world.fixtures.lamp.shade.material.emissiveIntensity = lampOn ? .3 : 0; toast(lampOn ? '灯亮了。' : '只留下窗外的光。'); } },
  plant: { name: '植物', run: () => { state.plantLevel = Math.min(4, state.plantLevel + 1); save(); applyPlant(); toast('浇了一点水。'); } },
  cat: { name: '猫', run: () => { catWiggle = 1.2; toast('呼噜声。'); } },
  window: { name: '舷窗', run: () => cycleScene() },
  speaker: { name: '唱机', run: () => cycleTrack() },
  mug: { name: '茶杯', run: () => toast('茶还温着。') },
  chair: { name: '椅子', run: () => toast('先坐一会儿，也算开始。') },
  laptop: { name: '笔记本', run: () => { if (!session.running) toggleSession(); } },
};
function interact() {
  if (!entered) { $('#welcome').hidden = false; return; }
  const key = findInteractable();
  if (key && OBJECTS[key]) OBJECTS[key].run();
  else toast('这里没有可互动的东西。');
}
function updatePrompt() {
  const key = entered ? findInteractable() : '';
  if (key === hoverKey) return;
  hoverKey = key;
  const el = $('#interact-prompt');
  if (key && OBJECTS[key]) { el.textContent = 'E · ' + OBJECTS[key].name; el.classList.add('show'); }
  else { el.classList.remove('show'); }
}

// ---------- scenes / music ----------
function applyScene(id) {
  const key = SCENES[id] ? id : 'night';
  const cfg = SCENES[key];
  state.scene = key;
  scene.background.set(cfg.bg); scene.fog.color.set(cfg.fog);
  world.windowMat.color.set(cfg.sky); world.windowMat.emissive.set(cfg.glow);
  world.lights.forEach(l => { l.light.intensity = l.base * cfg.factor; });
  if (!lampOn) world.fixtures.lamp.light.intensity = .02;
  $('#scene-note').textContent = cfg.note;
  document.querySelectorAll('[data-scene]').forEach(b => b.classList.toggle('on', b.dataset.scene === key));
  if (!session.running) $('#caption').textContent = cfg.quote;
}
function setScene(id) {
  const key = SCENES[id] ? id : 'night';
  applyScene(key); save(); toast('场景：' + SCENES[key].label);
}
function cycleScene() {
  const i = Math.max(0, SCENE_IDS.indexOf(state.scene));
  setScene(SCENE_IDS[(i + 1) % SCENE_IDS.length]);
}
function applyTrack(id) {
  const key = TRACKS[id] ? id : 'night';
  state.audio.track = key;
  if (audio.started) audio.setTrack(key);
  document.querySelectorAll('[data-track]').forEach(b => b.classList.toggle('on', b.dataset.track === key));
  save();
}
function setTrack(id) {
  const key = TRACKS[id] ? id : 'night';
  applyTrack(key);
  toast('唱片：' + TRACKS[key].label + ' · ' + TRACKS[key].sub);
}
function cycleTrack() {
  const i = Math.max(0, TRACK_IDS.indexOf(state.audio.track));
  setTrack(TRACK_IDS[(i + 1) % TRACK_IDS.length]);
}

function applyPlant() {
  const s = 1 + (state.plantLevel || 0) * .07;
  world.fixtures.plant.scale.set(s, s, s);
  $('#plant-level').textContent = state.plantLevel || 0;
  $('#comfort-plant').textContent = ['醒着', '新芽', '舒展', '有光', '茂盛'][state.plantLevel || 0];
}
function toast(text) {
  const el = $('#toast'); el.textContent = text; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------- UI ----------
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
function toggleImmersive() {
  const hidden = document.body.classList.toggle('ui-hidden');
  $('#immerse').textContent = hidden ? '还原面板' : '沉浸';
  $('#walk-hint').classList.toggle('hide', hidden || pointerLocked);
}
$('#immerse').addEventListener('click', toggleImmersive);
$('#help').addEventListener('click', () => { $('#welcome').hidden = false; $('#welcome-close').hidden = !entered; });
$('#welcome-close').addEventListener('click', () => { $('#welcome').hidden = true; });
$('#enter').addEventListener('click', async () => {
  $('#welcome').hidden = true; entered = true;
  await startAudio();
  toast('欢迎回来。先走一走，或者坐下。');
});
$('#sound').setAttribute('aria-pressed', 'false');

async function startAudio() {
  if (!audio.started) {
    try {
      await audio.start(); audio.setAll(state.audio); audio.setTrack(state.audio.track || 'night');
      updateSound();
      document.querySelectorAll('[data-track]').forEach(b => b.classList.toggle('on', b.dataset.track === state.audio.track));
    } catch { toast('浏览器阻止了声音；交互后可再试。'); }
  }
}
function toggleSound() {
  if (!audio.started) { startAudio(); state.audio.muted = false; updateSound(); return; }
  state.audio.muted = !state.audio.muted;
  audio.set('muted', state.audio.muted); updateSound(); save();
}
function updateSound() {
  const b = $('#sound');
  b.textContent = !audio.started ? '声音：关' : (state.audio.muted ? '声音：关' : '声音：开');
  b.setAttribute('aria-pressed', state.audio.muted ? 'true' : 'false');
}
const sliders = ['rain', 'wind', 'vinyl', 'hum', 'melody'];
sliders.forEach(key => {
  const input = $('#' + key), out = $('#' + key + '-out');
  if (!input) return;
  input.value = state.audio[key] ?? .2;
  out.textContent = Math.round(input.value * 100) + '%';
  input.addEventListener('input', () => {
    state.audio[key] = Number(input.value); out.textContent = Math.round(input.value * 100) + '%';
    audio.set(key, Number(input.value)); save();
  });
});
document.querySelectorAll('[data-scene]').forEach(b => b.addEventListener('click', () => setScene(b.dataset.scene)));
document.querySelectorAll('[data-track]').forEach(b => b.addEventListener('click', () => setTrack(b.dataset.track)));

function toggleSession() {
  if (!entered) { $('#welcome').hidden = false; return; }
  if (session.completed) session = createSession(selectedDuration);
  if (session.running) { session = pauseSession(session, Date.now()); toast('先停一下。'); }
  else { session = startSession(session, Date.now()); startAudio(); toast('这一会儿，只做这一件事。'); }
  updateUI();
}
function finishSession() {
  const minutes = Math.round(session.duration / 60);
  state = recordSession(state, minutes, intention);
  save(); audio.chime(); applyPlant();
  session = createSession(selectedDuration); updateUI();
  toast('这一班结束了。谢谢你坐在这里。');
  $('#log').innerHTML = logHTML();
}
function save() {
  state.duration = selectedDuration; state.intention = intention; state.scene = state.scene || 'night';
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
}
function updateUI() {
  const p = progress(session);
  $('#ring').style.setProperty('--p', (p * 100).toFixed(1));
  $('#timer').textContent = formatTime(session.remaining);
  $('#start').textContent = session.running ? '暂停' : (session.elapsed > 0 ? '继续' : '开始专注');
  $('#timer-label').textContent = labels[p > .9 ? 'return' : p > .55 ? 'deep' : p > 0 ? 'settle' : 'arrive'];
  $('#focus-state').textContent = session.running ? '专注中' : (session.elapsed > 0 ? '已暂停' : '未开始');
  $('#phase').textContent = (SCENES[state.scene]?.label || '夜航') + ' · ' + ['到达', '安定', '深入', '回来'][Math.min(3, Math.floor(p * 4))];
  updatePlaceUI();
  document.querySelectorAll('[data-min]').forEach(b => b.classList.toggle('on', Number(b.dataset.min) === selectedDuration));
  $('#total-min').textContent = state.totalMinutes || 0;
  $('#plant-level').textContent = state.plantLevel || 0;
  $('#comfort-light').textContent = lampOn ? '暖' : '只留窗光';
  $('#comfort-quiet').textContent = audio.state.muted ? '静音' : '高';
  $('#caption').textContent = session.running ? ['让呼吸慢一点。', '让呼吸慢一点。', '你不是机器。', '快回来了。'][Math.min(3, Math.floor(p * 4))] : (SCENES[state.scene]?.quote || '灯亮着，城市在窗外呼吸。');
}
const labels = { arrive: '准备好了吗？', settle: '安定下来。', deep: '正在深处。', return: '慢慢回来。' };
function logHTML() {
  if (!state.sessions.length) return '<li class="empty">还没有记录。第一盏灯从今晚开始。</li>';
  return state.sessions.slice(0, 4).map(s => `<li><b>${String(s.minutes).padStart(2, '0')}′</b><span>${escapeHTML(s.intention)}<br><span style="color:var(--faint)">${new Date(s.at).toLocaleDateString('zh-CN')}</span></span></li>`).join('');
}
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
$('#log').innerHTML = logHTML();
applyPlant(); applyScene(state.scene || 'night'); applyTrack(state.audio.track || 'night'); updateSound(); updateUI();
vertical();

// ---------- keyboard ----------
window.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  keys[e.code] = true;
  if (e.code === 'KeyE') { e.preventDefault(); interact(); }
  else if (e.code === 'Space') { e.preventDefault(); toggleSession(); }
  else if (e.code === 'KeyR') { session = resetSession(session); updateUI(); }
  else if (e.code === 'KeyM') toggleSound();
  else if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
    const b = document.querySelector(`[data-min="${DURATIONS[Number(e.code.slice(-1)) - 1]}"]`); if (b) b.click();
  } else if (e.code === 'KeyH') { $('#welcome').hidden = false; $('#welcome-close').hidden = !entered; }
  else if (e.code === 'Tab') { e.preventDefault(); toggleImmersive(); }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { keys = {}; });

// ---------- background session sync ----------
function backgroundTick() {
  if (!session.running) return;
  session = syncSession(session, Date.now());
  if (session.completed) finishSession();
  else updateUI();
}
setInterval(backgroundTick, 500);
document.addEventListener('visibilitychange', () => { if (!document.hidden) backgroundTick(); });
window.addEventListener('focus', backgroundTick);
window.addEventListener('pageshow', backgroundTick);

// ---------- loop ----------
function animate(now) {
  const t = typeof now === 'number' ? now : performance.now();
  const rawDt = Math.max(0, (t - lastFrame) / 1000);
  const dt = Math.min(rawDt, .05);
  lastFrame = t; sceneTime += dt;
  if (session.running) {
    session = syncSession(session, Date.now());
    if (session.completed) finishSession();
    else {
      const key = formatTime(session.remaining);
      if (key !== lastUI) { lastUI = key; updateUI(); }
      else $('#ring').style.setProperty('--p', (progress(session) * 100).toFixed(1));
    }
  }
  const speed = keys.ShiftLeft || keys.ShiftRight ? 4.6 : 3.05;
  let forward = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  let strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  if (forward || strafe) {
    const len = Math.hypot(forward, strafe); forward /= len; strafe /= len;
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
    movePlayer((fx * forward + rx * strafe) * speed * dt, (fz * forward + rz * strafe) * speed * dt);
    $('#walk-hint').classList.add('hide');
  }
  vertical();
  updatePrompt();
  $('#room-label').textContent = roomNow();
  $('#floor-label').textContent = String(player.floor + 1) + 'F';
  if (!reduced) {
    world.fixtures.cat.rotation.z = Math.sin(sceneTime * .8) * .012;
    world.fixtures.tail.rotation.x = Math.sin(sceneTime * 1.7) * .15 + (catWiggle > 0 ? Math.sin(sceneTime * 18) * .35 : 0);
    catWiggle = Math.max(0, catWiggle - dt);
  }
  if (lampOn) world.fixtures.lamp.light.intensity = 1.4 + Math.sin(sceneTime * 2.1) * .04;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

if (!state.sessions.length) $('#welcome-close').hidden = true;
if (new URLSearchParams(location.search).has('skipwelcome')) {
  entered = true; $('#welcome').hidden = true;
}

// 浏览器自动检查入口
window.__slowCabin = {
  get session() { return session; },
  get state() { return state; },
  get player() { return player; },
  audio, world, setScene, setTrack, movePlayer, vertical, findInteractable, interact,
};
