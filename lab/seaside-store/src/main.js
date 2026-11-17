// main.js · 渲染器、自由环绕相机与动画循环
import * as THREE from 'three';
import { buildSky } from './sky.js';
import { buildSea, buildRipples } from './water.js';
import { buildWorld } from './world.js';
import { buildStore } from './store.js';
import { clamp } from './kit.js';

const params = new URLSearchParams(location.search);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------- 渲染器 ----------------
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = params.get('noshadow') !== '1';
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.autoClear = false;
renderer.domElement.setAttribute('aria-label', '盛夏黄昏的海边便利店微缩模型，可拖拽旋转、滚轮缩放');
renderer.domElement.setAttribute('role', 'img');
renderer.domElement.tabIndex = 0;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 900);
camera.rotation.order = 'YXZ';

// ---------------- 光 ----------------
// 主光：刚沉入海平线的落日，从西北方贴近水面照来
const sun = new THREE.DirectionalLight('#ffa064', 1.85);
sun.position.set(-27, 14, -24);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -24;
sun.shadow.camera.right = 24;
sun.shadow.camera.top = 24;
sun.shadow.camera.bottom = -24;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 90;
sun.shadow.bias = -0.00015;
sun.shadow.normalBias = 0.09;
scene.add(sun);

// 南侧冷色补光：让店面和街角保持在清凉的蓝调里
const fill = new THREE.DirectionalLight('#a9d8ec', 1.6);
fill.position.set(20, 16, 32);
scene.add(fill);

// 天光：上暖下冷
scene.add(new THREE.HemisphereLight('#bfe0f2', '#5a5b52', 1.38));
scene.add(new THREE.AmbientLight('#6f8ba0', 0.32));

// ---------------- 全屏黄昏背景 ----------------
// 天幕是屏幕空间的设计背景：暖光集中在模型后方，四周收进靛青，
// 这样相机怎么环绕，画面都保持“展示级模型摄影”的黄昏氛围。
const bgScene = new THREE.Scene();
const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const bgUniforms = {
  uAspect: { value: window.innerWidth / window.innerHeight },
  uTime: { value: 0 },
};
const bgMat = new THREE.ShaderMaterial({
  uniforms: bgUniforms,
  depthTest: false,
  depthWrite: false,
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform float uAspect, uTime;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      float y = uv.y;
      vec3 col = vec3(0.055, 0.085, 0.16);
      col = mix(col, vec3(0.12, 0.16, 0.27), smoothstep(0.0, 0.20, y));
      col = mix(col, vec3(0.55, 0.38, 0.42), smoothstep(0.20, 0.36, y));
      col = mix(col, vec3(0.94, 0.62, 0.45), smoothstep(0.34, 0.46, y));
      col = mix(col, vec3(1.00, 0.78, 0.56), smoothstep(0.42, 0.55, y));
      col = mix(col, vec3(0.84, 0.57, 0.55), smoothstep(0.55, 0.68, y));
      col = mix(col, vec3(0.42, 0.42, 0.58), smoothstep(0.68, 0.82, y));
      col = mix(col, vec3(0.16, 0.22, 0.38), smoothstep(0.82, 1.0, y));

      // 中心偏上的夕照光晕
      vec2 p = vec2((uv.x - 0.5) * uAspect, uv.y - 0.47);
      float d = length(p);
      col += vec3(1.0, 0.52, 0.30) * exp(-d * d * 9.0) * 0.20;
      // 轻微横向霞带
      col += vec3(1.0, 0.65, 0.48) * (sin(y * 34.0 + sin(uv.x * 5.0 + uTime * 0.02) * 1.2) * 0.5 + 0.5) * 0.008;
      // 暗角
      float vig = smoothstep(0.35, 0.92, length(vec2((uv.x - 0.5) * uAspect, (uv.y - 0.5) * 1.15)));
      col *= 1.0 - vig * 0.35;
      // 抖动，防色带
      col += (hash(gl_FragCoord.xy) - 0.5) * 0.01;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
bgMesh.frustumCulled = false;
bgScene.add(bgMesh);

// ---------------- 场景 ----------------
const sky = buildSky(scene);
const sea = buildSea(scene);
const ripples = buildRipples(scene, 16);
const world = buildWorld(scene);
const store = buildStore(scene, { ripples });

// ---------------- 相机与自由环绕 ----------------
const VIEWS = {
  hero: { theta: -0.48, phi: 1.045, radius: 67, target: [0, 1.8, -1.4] },
  front: { theta: 0.02, phi: 1.08, radius: 78, target: [0, 1.7, -0.3] },
  aerial: { theta: -0.55, phi: 0.7, radius: 74, target: [0, 0.6, -0.2] },
  alley: { theta: -0.98, phi: 1.03, radius: 47, target: [-5.2, 1.2, -1.8] },
  sea: { theta: 2.85, phi: 1.12, radius: 40, target: [-7, 0.2, -12] },
  store: { theta: -0.4, phi: 1.05, radius: 30, target: [-2, 2.0, 0.5] },
  street: { theta: 0.62, phi: 1.12, radius: 55, target: [1.2, 1.2, 0.6] },
  detail: { theta: -0.28, phi: 1.02, radius: 38, target: [-0.4, 2.4, 0.6] },
  corner: { theta: 0.5, phi: 1.12, radius: 32, target: [8, 0.8, 7] },
};
const initialView = VIEWS[params.get('view')] || VIEWS.hero;

const target = new THREE.Vector3(...initialView.target);
const goal = { theta: initialView.theta, phi: initialView.phi, radius: initialView.radius };
const cur = { theta: goal.theta, phi: goal.phi, radius: goal.radius };
let goalTarget = target.clone();

function placeCamera(s) {
  const sp = Math.sin(s.phi), cp = Math.cos(s.phi);
  camera.position.set(
    target.x + s.radius * sp * Math.sin(s.theta),
    target.y + s.radius * cp,
    target.z + s.radius * sp * Math.cos(s.theta),
  );
  camera.lookAt(target);
}
placeCamera(cur);

function setView(name, instant = false) {
  const v = VIEWS[name] || VIEWS.hero;
  goal.theta = v.theta; goal.phi = v.phi; goal.radius = v.radius;
  goalTarget.set(...v.target);
  if (instant) {
    cur.theta = v.theta; cur.phi = v.phi; cur.radius = v.radius;
    target.copy(goalTarget);
    placeCamera(cur);
  }
}
if (params.get('view')) setView(params.get('view'), true);

// 鼠标 / 触摸
const el = renderer.domElement;
let dragging = false;
let lastX = 0, lastY = 0;
const pointers = new Map();
let pinchStart = 0, pinchRadius = 0;

el.addEventListener('pointerdown', (e) => {
  el.setPointerCapture?.(e.pointerId);
  el.focus({ preventScroll: true });
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    dragging = true;
    lastX = e.clientX; lastY = e.clientY;
    el.style.cursor = 'grabbing';
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
    pinchRadius = goal.radius;
  }
});
el.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchStart > 0) goal.radius = clamp(pinchRadius * (pinchStart / Math.max(1, d)), 30, 120);
    return;
  }
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  goal.theta -= dx * 0.0052;
  goal.phi = clamp(goal.phi - dy * 0.0045, 0.2, 1.33);
});
const endPointer = (e) => {
  pointers.delete(e.pointerId);
  if (pointers.size === 0) {
    dragging = false;
    el.style.cursor = 'grab';
    pinchStart = 0;
  }
};
el.addEventListener('pointerup', endPointer);
el.addEventListener('pointercancel', endPointer);
el.addEventListener('pointerleave', (e) => { if (pointers.size === 0) el.style.cursor = 'grab'; });
el.addEventListener('wheel', (e) => {
  e.preventDefault();
  goal.radius = clamp(goal.radius * Math.exp(e.deltaY * 0.0011), 30, 120);
}, { passive: false });
el.addEventListener('contextmenu', (e) => e.preventDefault());
el.style.cursor = 'grab';

// 双击回到默认视点
el.addEventListener('dblclick', () => setView('hero'));

// 键盘：方向键旋转、+/- 缩放、Home 复位
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') goal.theta += 0.06;
  else if (e.key === 'ArrowRight') goal.theta -= 0.06;
  else if (e.key === 'ArrowUp') goal.phi = clamp(goal.phi - 0.04, 0.2, 1.33);
  else if (e.key === 'ArrowDown') goal.phi = clamp(goal.phi + 0.04, 0.2, 1.33);
  else if (e.key === '+' || e.key === '=') goal.radius = clamp(goal.radius * 0.94, 30, 120);
  else if (e.key === '-' || e.key === '_') goal.radius = clamp(goal.radius * 1.06, 30, 120);
  else if (e.key === 'Home' || e.key === '0') setView('hero');
});

// ---------------- 循环 ----------------
const tOffset = parseFloat(params.get('t') || '0') || 0;
let elapsed = tOffset;
let last = performance.now();
let firstRender = true;

function frame(now) {
  const rawDt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  const dt = reduced ? 0.0001 : rawDt;
  elapsed += dt;
  const t = elapsed;

  // 相机阻尼（避免拖拽突跳）
  const k = 1 - Math.pow(0.0025, dt);
  cur.theta += (goal.theta - cur.theta) * k;
  cur.phi += (goal.phi - cur.phi) * k;
  cur.radius += (goal.radius - cur.radius) * k;
  target.lerp(goalTarget, k);
  placeCamera(cur);

  sky.update(t);
  sea.update(t);
  world.update(t, dt);
  store.update(t, dt);
  ripples.update(dt);

  bgUniforms.uTime.value = t;
  renderer.clear();
  renderer.render(bgScene, bgCam);
  renderer.render(scene, camera);

  if (firstRender) {
    firstRender = false;
    document.documentElement.dataset.ready = '1';
    window.__DIORAMA_READY__ = true;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------------- 自适应 ----------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  bgUniforms.uAspect.value = window.innerWidth / window.innerHeight;
});

// 供调试/截图使用
window.__DIORAMA__ = { scene, camera, renderer, store, world, setView, VIEWS };
