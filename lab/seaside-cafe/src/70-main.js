/* ============================================================
   组装、第一人称控制、相机、循环与截图视角
   ============================================================ */
const keys = Object.create(null);
let elapsed = 0, last = performance.now(), running = false;
let mouseDown = false, dragged = 0, lastMX = 0, lastMY = 0;
let requestedLock = false;
let wasPhoto = false, wasSeated = false;
let hudHintTimer = 0;
let loggedInfo = false;

/* ---------- 静态几何合并：把同材质小物件合批，控制 draw call ---------- */
function mergeStaticScene() {
  const dyn = new Set();
  const add = (o) => { if (o) dyn.add(o); };
  add(refs.cafe?.door?.left); add(refs.cafe?.door?.right); add(refs.cafe?.noren?.mesh); add(refs.cafe?.chime);
  add(refs.cafe?.umbrellaGroup); add(refs.cafe?.recordDisc); add(refs.cafe?.fanBlades);
  add(refs.cat?.group); add(refs.gulls?.group); add(refs.lighthouse?.beamGroup);
  add(refs.rain?.points); add(refs.sea?.mesh); add(refs.sea?.foam);
  add(refs.sky?.dome); add(refs.sky?.sunSprite); add(refs.sky?.moonSprite); add(refs.sky?.stars);
  (refs.sea?.pools || []).forEach(add);
  (refs.shells || []).forEach((s) => add(s.group));
  root.updateMatrixWorld(true);
  const isDynamic = (o) => { let p = o; while (p) { if (dyn.has(p)) return true; p = p.parent; } return false; };
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSprite || o.isPoints || o.isLine) return;
    if (!o.visible || !o.geometry) return;
    if (o.userData.item || o.userData.noMerge) return;
    if (o.isSkinnedMesh || o.geometry.morphAttributes && Object.keys(o.geometry.morphAttributes).length) return;
    if (Array.isArray(o.material) || !o.material) return;
    if (o.material.isShaderMaterial) return;
    if (o.material.visible === false || o.material.colorWrite === false) return;
    if (o.material.blending !== undefined && o.material.blending !== THREE.NormalBlending) return;
    if (isDynamic(o)) return;
    const cast = !o.material.transparent && (o.material === MAT.roof || o.material === MAT.plaster || o.material === MAT.wood || o.material === MAT.woodDark || o.material === MAT.stone);
    const receive = true;
    const key = `${o.material.uuid}|${o.material.transparent ? 1 : 0}`;
    let b = buckets.get(key);
    if (!b) { b = { material: o.material, cast, receive, positions: [], normals: [], uvs: [], total: 0, meshes: [] }; buckets.set(key, b); }
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(o.matrixWorld);
    const p = g.attributes.position;
    if (!p) return;
    const n = g.attributes.normal, uv = g.attributes.uv;
    const count = p.count;
    const pa = new Float32Array(count * 3), na = new Float32Array(count * 3), ua = new Float32Array(count * 2);
    pa.set(p.array.subarray(0, count * 3));
    if (n) na.set(n.array.subarray(0, count * 3));
    if (uv) ua.set(uv.array.subarray(0, count * 2));
    b.positions.push(pa); b.normals.push(na); b.uvs.push(ua); b.total += count; b.meshes.push(o);
  });
  let mergedMeshes = 0, mergedSource = 0;
  for (const b of buckets.values()) {
    if (b.meshes.length < 2) continue;
    const pos = new Float32Array(b.total * 3), nor = new Float32Array(b.total * 3), uvs = new Float32Array(b.total * 2);
    let off = 0, off2 = 0;
    for (let i = 0; i < b.positions.length; i++) {
      pos.set(b.positions[i], off); nor.set(b.normals[i], off); uvs.set(b.uvs[i], off2);
      off += b.positions[i].length; off2 += b.uvs[i].length;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, b.material);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.receive;
    if (b.material.transparent) { mesh.renderOrder = 2; mesh.castShadow = false; }
    root.add(mesh);
    for (const o of b.meshes) o.visible = false;
    mergedMeshes++; mergedSource += b.meshes.length;
  }
  console.log(`[海風珈琲] MERGE ${mergedSource} meshes -> ${mergedMeshes} batches`);
}

function buildContactShadows() {
  const defs = [
    [0, 0, 6.8, 4.8, .30], [-6.5, 0, 3.6, 3.2, .26],
    [9, -8, 2.2, 2.0, .24], [25, 9, 2.2, 2.0, .24], [-16, 8, 1.8, 1.6, .2],
    [3, -8, 2.0, 1.8, .22], [-17, -26, 1.6, 1.4, .2], [12, 8, 1.6, 1.4, .2],
    [20, 1, 7.5, 6.0, .28], [23.5, 1, 2.6, 2.2, .26],
    [-35, -32, 7.5, 5.2, .22], [5.5, 14, 2.6, 2.2, .22], [18, 20.5, 4.5, 3.2, .22],
    [-10.8, -27, .8, .8, .18], [-10.8, -15, .8, .8, .18], [-10.8, -3, .8, .8, .18], [-10.8, 9, .8, .8, .18], [-10.8, 21, .8, .8, .18],
  ];
  const positions = [], uvs = [], indices = [];
  let base = 0;
  const circle = new THREE.CircleGeometry(1, 14).toNonIndexed();
  const cp = circle.attributes.position.array, cu = circle.attributes.uv.array;
  for (const [x, z, sx, sz, op] of defs) {
    for (let i = 0; i < cp.length; i += 3) {
      positions.push(x + cp[i] * sx, .045 + (op - .25) * .02, z + cp[i + 1] * sz);
      uvs.push(cu[(i / 3) * 2], cu[(i / 3) * 2 + 1]);
    }
    base += cp.length / 3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  const mat = new THREE.MeshBasicMaterial({ map: GLOW_TEX, color: '#1b1712', transparent: true, opacity: .38, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = 1;
  // 因为平面已旋转，顶点 y 用 0.045，上面的坐标系是世界 x/z
  m.position.y = 0;
  root.add(m);
}

/* ---------- 构建世界 ---------- */
if (params.get('noshadow') === '1') renderer.shadowMap.enabled = false;
buildLighting();
buildSky();
buildTerrain();
buildSea();
buildShoreProps();
buildLighthouse();
buildShrine();
buildPort();
buildSouthSide();
buildPromenadeFurniture();
buildGulls();
buildShells();
buildRain();
buildCafe();
mergeStaticScene();
buildContactShadows();
scene.add(camera);
setupUI();
applyTime(state.time);
applyWeather(state.weather);
setTide(state.tide);
player.y = groundHeight(player.x, player.z);
camera.position.set(-17.2, 4.5, 12.4);
camera.lookAt(0, 2.5, 0);

/* ---------- 截图视角 ---------- */
const SHOT_VIEWS = {
  hero: { pos: [-12.2, 3.35, 9.4], look: [-2.6, 2.05, 0.1], time: .70, fov: 55 },
  terrace: { pos: [-10.0, 2.8, 6.6], look: [-2.8, 2.0, 0.4], time: .70, fov: 58 },
  interior: { pos: [-2.9, 2.2, -2.2], look: [3.2, 1.6, .4], time: .8, fov: 60 },
  window: { pos: [2.9, 2.3, 2.2], look: [-4.0, 1.75, -.2], time: .70, fov: 66 },
  beach: { pos: [-25, 3.2, 10], look: [-62, 1.2, 0], time: .70, fov: 55 },
  shrine: { pos: [8.5, 4.4, 9], look: [21.5, 2.6, 1], time: .70, fov: 55 },
  port: { pos: [-21, 3.2, -20], look: [-38.5, 1.8, -32], time: .70, fov: 55 },
  night: { pos: [-50, 8, 18], look: [-3.2, 2.2, 0], time: .92, fov: 35 },
  rain: { pos: [-12.2, 3.35, 9.4], look: [-2.6, 2.05, 0.1], time: .68, weather: 'rain', fov: 55 },
  sea: { pos: [-28, 3.4, 1], look: [-72, 1.6, -10], time: .70, fov: 55 },
  start: null,
};
function setupShot() {
  const shot = params.get('shot');
  const camParam = params.get('cam');
  const lookParam = params.get('look');
  if (camParam && lookParam) {
    state.shotCam = true; state.started = true;
    document.body.classList.add('started');
    $('#startScreen')?.classList.add('hidden');
    $('#loading')?.classList.add('hidden');
    const p = camParam.split(',').map(Number), l = lookParam.split(',').map(Number);
    camera.position.set(...p); camera.lookAt(...l);
    if (params.get('fov')) { camera.fov = parseFloat(params.get('fov')); camera.updateProjectionMatrix(); }
    $('#hud')?.classList.toggle('visible', params.get('hud') === '1');
    return;
  }
  if (!shot) {
    $('#startScreen')?.classList.remove('hidden');
    $('#hud')?.classList.remove('visible');
    $('#loading')?.classList.add('hidden');
    return;
  }
  $('#loading')?.classList.add('hidden');
  if (shot === 'start') {
    state.started = false;
    state.shot = 'start';
    state.shotCam = false;
    $('#startScreen')?.classList.remove('hidden');
    $('#hud')?.classList.remove('visible');
    camera.position.set(-17.2, 4.5, 12.4); camera.lookAt(0, 2.5, 0);
    return;
  }
  const v = SHOT_VIEWS[shot] || SHOT_VIEWS.hero;
  state.shot = shot;
  state.shotCam = true;
  state.started = true;
  document.body.classList.add('started');
  $('#startScreen')?.classList.add('hidden');
  $('#mobileControls') && ($('#mobileControls').style.display = 'none');
  if (v.weather) applyWeather(v.weather);
  if (v.time != null) applyTime(params.has('t') ? parseFloat(params.get('t')) : v.time);
  if (v.pos) {
    camera.position.set(...v.pos);
    camera.lookAt(...v.look);
  }
  if (v.fov) { camera.fov = v.fov; camera.updateProjectionMatrix(); }
  const showHud = params.get('hud') === '1';
  $('#hud')?.classList.toggle('visible', showHud);
  updateHUDStatus();
}

/* ---------- 指针 / 环视 ---------- */
function requestLock() {
  if (IS_MOBILE || state.photo || state.shotCam || !state.started) return;
  if (!canvas.requestPointerLock) { player.dragLook = true; return; }
  try {
    const p = canvas.requestPointerLock();
    if (p && typeof p.catch === 'function') p.catch(() => { player.dragLook = true; });
    requestedLock = true;
  } catch (e) { player.dragLook = true; }
}
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') return;
  if (!state.started || state.modalOpen || state.shotCam) return;
  if (state.photo) { mouseDown = true; dragged = 0; lastMX = e.clientX; lastMY = e.clientY; return; }
  if (!document.pointerLockElement && !player.dragLook && !IS_MOBILE) requestLock();
  mouseDown = true; dragged = 0; lastMX = e.clientX; lastMY = e.clientY;
  e.preventDefault();
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  if (document.pointerLockElement === canvas) {
    player.yaw -= e.movementX * .0022;
    player.pitch = clamp(player.pitch - e.movementY * .0020, -1.15, 1.05);
    return;
  }
  if (!mouseDown) return;
  const dx = e.clientX - lastMX, dy = e.clientY - lastMY;
  lastMX = e.clientX; lastMY = e.clientY;
  dragged += Math.abs(dx) + Math.abs(dy);
  if (dragged > 3 || player.dragLook) {
    player.yaw -= dx * .0034;
    player.pitch = clamp(player.pitch - dy * .0028, -1.15, 1.05);
  }
});
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'touch') return;
  const wasDrag = dragged > 7;
  mouseDown = false;
  if (!wasDrag && player.dragLook && state.started && !state.modalOpen && !state.photo) interactHovered();
});
canvas.addEventListener('click', () => {
  if (!state.started || state.modalOpen || state.photo || state.shotCam) return;
  if (document.pointerLockElement === canvas) interactHovered();
  else if (!player.dragLook && !IS_MOBILE) requestLock();
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerlockchange', () => {
  player.locked = document.pointerLockElement === canvas;
  if (player.locked) { player.dragLook = false; showToast('视角已锁定。ESC 释放鼠标。', 1600); }
});
document.addEventListener('pointerlockerror', () => { player.dragLook = true; showToast('鼠标锁定失败：按住画面拖动也能环视。', 2600); });
window.addEventListener('keydown', (e) => {
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  keys[e.code] = true;
  if (e.code === 'Escape' && state.seated) { standUp(); e.preventDefault(); }
  if (e.code === 'KeyP') { togglePhoto(); e.preventDefault(); }
  if (state.photo) {
    const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
    if (idx >= 0) applyPhotoFilter(photoFilters[idx]);
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

/* ---------- 移动 ---------- */
function movePlayer(dt) {
  if (state.seated || state.shotCam) return;
  if (state.photo) {
    const dir = new THREE.Vector3(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const r = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    const u = (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0);
    const speed = 6.5;
    player.x += (dir.x * f + right.x * r) * speed * dt;
    player.y += (dir.y * f + u) * speed * dt;
    player.z += (dir.z * f + right.z * r) * speed * dt;
    player.y = clamp(player.y, .2, 18);
    return;
  }
  const joy = window.__joy ? window.__joy() : { x: 0, y: 0 };
  let f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.y;
  let r = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x;
  const len = Math.hypot(f, r);
  if (len > 1) { f /= len; r /= len; }
  const speed = (keys.ShiftLeft || keys.ShiftRight ? 5.0 : 3.15) * (IS_MOBILE ? .9 : 1);
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  const dx = (fx * f + rx * r) * speed * dt;
  const dz = (fz * f + rz * r) * speed * dt;
  const moving = Math.abs(dx) + Math.abs(dz) > .0001;
  const ground = groundHeight(player.x, player.z);
  if (moving) {
    const nx = player.x + dx, nz = player.z + dz;
    if (!collidesAt(nx, player.z, ground)) player.x = nx;
    if (!collidesAt(player.x, nz, ground)) player.z = nz;
    player.bob += dt * (speed * 2.2);
  } else {
    player.bob += dt * .8;
  }
  player.moving = moving;
  const gh = groundHeight(player.x, player.z);
  player.y = damp(player.y, gh, 14, dt);
  // 室内外过渡 / 台阶的平滑
  if (Math.abs(gh - player.y) > 1.2) player.y = gh;
}
function updateCamera(dt, t) {
  if (state.shotCam) return;
  if (!state.started) {
    // 开始页的缓慢展示镜头
    const a = Math.sin(t * .06) * .12;
    camera.position.set(-17.2 + a * 2.2, 4.5 + Math.sin(t * .08) * .15, 12.4 + a * 1.2);
    camera.lookAt(-.5, 2.45, 0);
    return;
  }
  if (state.seated) {
    const s = state.seated;
    const eye = s.y + (s.kind === 'window' ? 1.18 : s.kind === 'tatami' ? 1.05 : 1.08);
    camera.position.lerp(new THREE.Vector3(s.x, eye, s.z), 1 - Math.exp(-6 * dt));
    player.yaw = dampAngle(player.yaw, s.yaw, 5, dt);
    player.pitch = damp(player.pitch, -.04, 5, dt);
    camera.rotation.set(player.pitch, player.yaw, 0);
    return;
  }
  if (state.photo) {
    camera.position.set(player.x, player.y, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
    return;
  }
  const bob = player.moving ? Math.sin(player.bob) * .025 : 0;
  const side = player.moving ? Math.cos(player.bob * .5) * .012 : 0;
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  camera.position.set(player.x + fx * side, player.y + player.height + bob, player.z + fz * side);
  camera.rotation.set(player.pitch, player.yaw, 0);
}

/* ---------- 主循环 ---------- */
function frame(now) {
  const dt = Math.min(.05, Math.max(.0005, (now - last) / 1000));
  last = now;
  elapsed += dt;
  const t = elapsed;
  if (state.started && !state.shotCam && !state.modalOpen) movePlayer(dt);
  if (state.photo && !wasPhoto) {
    wasPhoto = true;
  } else if (!state.photo && wasPhoto) wasPhoto = false;
  updateCamera(dt, t);
  updateCafe(dt, t);
  updateWorld(dt, t);
  updateInteractions(dt, t);
  updateHUDStatus();
  renderer.render(scene, camera);
  if (!loggedInfo) {
    loggedInfo = true;
    console.log('[海風珈琲] INFO ' + JSON.stringify({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }));
  }
  requestAnimationFrame(frame);
}

/* ---------- 初始化 ---------- */
setupShot();
if (!params.get('shot')) {
  $('#loading')?.classList.add('hidden');
}
// 让开始按钮在场景加载后可用
const startBtn = $('#startBtn');
if (startBtn) { startBtn.disabled = false; startBtn.removeAttribute('aria-disabled'); }
if (params.get('selftest') === '1') {
  setTimeout(() => {
    const out = [];
    try {
      // 无用户手势的 headless 环境：禁用音频初始化，避免 autoplay 警告；真实入口仍会启动音频
      AUDIO.ctx = null; AUDIO.ensure = () => null;
      startGame({ silent: true });
      out.push('start');
      toggleDoor(); out.push('door:' + state.doorOpen);
      ringChime(); out.push('chime');
      openMenu(); out.push('menu');
      hideAllModals();
      orderItem('pour'); out.push('order');
      state.orderPending = false; state.hasCoffee = true;
      if (refs.cupInHand) refs.cupInHand.visible = true;
      sitAt({ x: -7, z: -1.1, y: .45, yaw: Math.PI / 2, kind: 'terrace' }); out.push('sit');
      drinkCoffee(); out.push('drink:' + !!state.coffeeDone);
      standUp(); out.push('stand');
      for (let i = 0; i < 5; i++) collectShell(i);
      out.push('shells:' + state.shells);
      petCat(); out.push('cat');
      buyVending(); out.push('vending:' + state.vending);
      ringBike(); out.push('bike');
      toggleRecord(); out.push('music:' + state.musicOn);
      toggleRecord();
      toggleLights(); out.push('lights:' + state.lightsOn);
      toggleUmbrella(); out.push('umbrella');
      const wi = $('#wishInput'); if (wi) wi.value = '愿海风把今天吹得慢一点';
      submitWish(); out.push('wishes:' + state.wishes);
      scareGull(); out.push('gull');
      applyWeather('rain'); applyTime(.92); out.push('weather:' + state.weather);
      togglePhoto(true); out.push('photo:' + state.photo);
      togglePhoto(false); out.push('photoOff');
      applyWeather('clear'); applyTime(.70);
      out.push('calls:' + renderer.info.render.calls);
      console.log('[海風珈琲] SELFTEST ' + JSON.stringify({ ok: true, out, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, shells: state.shells, wishes: state.wishes }));
      document.title = 'SELFTEST OK calls=' + renderer.info.render.calls;
    } catch (err) {
      console.log('[海風珈琲] SELFTEST FAIL ' + (err && err.stack || err));
      document.title = 'SELFTEST FAIL';
    }
  }, 700);
}
requestAnimationFrame((n) => { last = n; frame(n); });

/* ---------- 自适应 ---------- */
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, state.quality === 'low' ? 1 : (IS_MOBILE ? 1.35 : 1.75)));
});

/* ---------- 调试与验收接口 ---------- */
window.__CAFE__ = {
  THREE, scene, camera, renderer, state, player, refs, interactables, colliders,
  setTime: applyTime, setWeather: applyWeather, setTide,
  start: () => startGame({ silent: true }),
  togglePhoto, setQuality, get hovered() { return hovered; },
  interact: (name) => {
    const it = interactables.find((x) => x.name === name);
    if (it && it.enabled) { it.action(); return true; }
    return false;
  },
  shot: (name) => {
    const v = SHOT_VIEWS[name] || SHOT_VIEWS.hero;
    if (!v) return false;
    state.shotCam = true; state.started = true;
    if (v.time != null) applyTime(v.time);
    if (v.weather) applyWeather(v.weather);
    camera.position.set(...v.pos); camera.lookAt(...v.look);
    return true;
  },
  info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }),
};
console.log('[海風珈琲] ready', window.__CAFE__.info());
