import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.getElementById("scene");
const loading = document.getElementById("loading");
const toast = document.getElementById("toast");
let renderer, scene, camera, controls;
let model, clock, elapsed = 0, waveUntil = 0, toastTimer = 0;
let autoRotate = true;
const animated = {};
const particles = [];

function makeEnvironment() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030b10);
  scene.fog = new THREE.FogExp2(0x031018, 0.055);
  camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 80);
  camera.position.set(1.55, 1.32, 3.15);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.95, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 2.3;
  controls.maxDistance = 7.2;
  controls.maxPolarAngle = Math.PI * 0.53;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;

  scene.add(new THREE.HemisphereLight(0x9ddbd4, 0x071014, 1.8));
  const key = new THREE.DirectionalLight(0xffd9b0, 3.1);
  key.position.set(3.2, 5.2, 3.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -3; key.shadow.camera.right = 3;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -1;
  scene.add(key);
  const rim = new THREE.PointLight(0x52e6da, 16, 12);
  rim.position.set(-2.2, 2.3, -1.6); scene.add(rim);
  const fill = new THREE.PointLight(0x3d7fa8, 10, 10);
  fill.position.set(2.2, 1.2, -2.5); scene.add(fill);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(5.2, 96), new THREE.MeshStandardMaterial({ color: 0x061a22, roughness: 0.38, metalness: 0.5 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(1.8, 64), new THREE.MeshStandardMaterial({ color: 0x0b2c33, roughness: 0.28, metalness: 0.6 }));
  inner.rotation.x = -Math.PI / 2; inner.position.y = 0.006; scene.add(inner);
  for (const r of [1.9, 2.6, 3.5, 4.6]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.012, 128), new THREE.MeshBasicMaterial({ color: 0x47c9c0, transparent: true, opacity: 0.2, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012; scene.add(ring);
  }
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 64), new THREE.MeshBasicMaterial({ color: 0x6fe7dc, transparent: true, opacity: 0.08 }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.01; scene.add(glow);

  const particleMat = new THREE.PointsMaterial({ color: 0x8ef6e8, size: 0.025, transparent: true, opacity: 0.65, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 220; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * 4.6;
    const pos = new THREE.Vector3(Math.cos(a) * r, Math.random() * 3.4, Math.sin(a) * r);
    const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([pos.x, pos.y, pos.z], 3)), particleMat.clone());
    pts.userData = { base: pos.clone(), speed: 0.08 + Math.random() * 0.22, phase: Math.random() * Math.PI * 2 };
    scene.add(pts); particles.push(pts);
  }

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function findByFragment(root, fragment) {
  let found = null;
  root.traverse((o) => { if (!found && o.name && o.name.includes(fragment)) found = o; });
  return found;
}

function setupModel(gltf) {
  model = gltf.scene;
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      if (o.material) {
        o.material.envMapIntensity = 1.2;
        if (o.material.transparent) o.material.depthWrite = false;
      }
    }
  });
  scene.add(model);
  // Make the character face the initial camera (+Z) and sit on the platform.
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const minY = box.min.y;
  model.position.y -= minY;
  model.position.x -= center.x;
  model.position.z -= center.z;
  animated.tail = findByFragment(model, "Tail_Root");
  animated.tailFin = findByFragment(model, "Tail_Fin");
  animated.ahoge = findByFragment(model, "Ahoge");
  animated.hairL = findByFragment(model, "Hair_Outer_-1") || findByFragment(model, "Hair_Outer_1");
  animated.hairR = findByFragment(model, "Hair_Outer_1") || findByFragment(model, "Hair_Side_1");
  document.getElementById("loading").classList.add("hidden");
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  toastTimer = 2.8;
}

function bindUi() {
  document.getElementById("btn-rotate").addEventListener("click", (e) => {
    autoRotate = !autoRotate;
    controls.autoRotate = autoRotate;
    e.currentTarget.setAttribute("aria-pressed", String(autoRotate));
  });
  document.getElementById("btn-wave").addEventListener("click", () => {
    waveUntil = 1.5;
    showToast("小鲸鱼娘：鱼片，别催。让我先吃完这碗饭。");
  });
}

function animate(dt) {
  elapsed += dt;
  if (animated.tail) {
    animated.tail.rotation.y = Math.sin(elapsed * 1.2) * 0.08;
    animated.tail.rotation.z = Math.sin(elapsed * 0.85 + 1.4) * 0.05;
  }
  if (animated.tailFin) animated.tailFin.rotation.z = Math.sin(elapsed * 1.1 + 0.5) * 0.1;
  if (animated.ahoge) animated.ahoge.rotation.z = Math.sin(elapsed * 2.2) * 0.06;
  if (animated.hairL) animated.hairL.rotation.z = Math.sin(elapsed * 0.9) * 0.025;
  if (animated.hairR) animated.hairR.rotation.z = Math.sin(elapsed * 0.9 + 1.1) * 0.025;
  if (model) model.position.y = Math.sin(elapsed * 1.4) * 0.008;
  if (waveUntil > 0) {
    waveUntil -= dt;
    if (animated.hairL) animated.hairL.rotation.z += Math.sin(elapsed * 12) * 0.02;
  }
  for (const p of particles) {
    p.position.y = p.userData.base.y + Math.sin(elapsed * p.userData.speed + p.userData.phase) * 0.35;
    p.position.x = p.userData.base.x + Math.cos(elapsed * p.userData.speed + p.userData.phase) * 0.08;
  }
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  controls.update();
  animate(dt);
  renderer.render(scene, camera);
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toast.classList.remove("show"); }
}

async function boot() {
  try {
    makeEnvironment();
    bindUi();
    clock = new THREE.Clock();
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync("./models/deepseek-whale-girl.glb");
    setupModel(gltf);
    loading.classList.add("hidden");
    requestAnimationFrame(loop);
  } catch (error) {
    loading.innerHTML = `<p style="color:#ffb4a0">加载失败：${String(error)}</p>`;
    console.error(error);
  }
}
boot();
