/* ============================================================
   交互 / UI / 任务 / 点单 / 许愿 / 拍照 / 移动端
   ============================================================ */
const $stage = $('#stage');
const $hud = $('#hud');
const $prompt = $('#prompt');
const $toast = $('#toast');
const $cross = $('#crosshair');
const $start = $('#startScreen');
const $warm = (() => {
  const d = document.createElement('div');
  d.id = 'warmFlash';
  d.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;transition:opacity 1.4s ease;background:radial-gradient(90% 80% at 50% 40%,rgba(255,178,104,.34),rgba(255,140,80,.12) 55%,transparent 80%)';
  document.body.appendChild(d);
  return d;
})();

let toastTimer = 0;
let raycaster = new THREE.Raycaster();
raycaster.layers.enable(1);
let centerNDC = new THREE.Vector2(0, 0);
let hoverHelper = null;
let lastHoverCheck = 0;
let orderTimer = 0;
let wishCount = 0;
const photoFilters = ['none', 'warm', 'cool', 'mono'];
const ORDER_NAMES = { pour: '手冲咖啡', latte: '海盐拿铁', soda: '玻璃汽水', cake: '今日蛋糕' };

function showToast(text, ms = 2400) {
  if (!$toast) return;
  $toast.textContent = text;
  $toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('visible'), ms);
}
function updateHUDStatus() {
  if (!state.started && !state.shot) return;
  const tl = timeLabel(state.time);
  const $tl = $('#timeLabel'), $tv = $('#timeValue'), $sl = $('#timeSlider');
  if ($tl) $tl.textContent = tl.text;
  if ($tv) $tv.textContent = tl.hhmm;
  if ($sl && document.activeElement !== $sl) $sl.value = state.time;
  const wl = $('#weatherLabel');
  if (wl) wl.textContent = state.weather === 'rain' ? '雨 · 潮声渐密' : '晴 · 海雾';
  const tl2 = $('#tideLabel');
  if (tl2) tl2.textContent = `${state.tide > .55 ? '涨潮' : '退潮'} · ${state.tide.toFixed(2)}`;
  $$('#timeChips .chip').forEach((b) => b.classList.toggle('active', Math.abs(parseFloat(b.dataset.time) - state.time) < .035));
  $$('[data-weather]').forEach((b) => b.classList.toggle('active', b.dataset.weather === state.weather));
  const ls = $('#lightSwitch');
  if (ls) ls.classList.toggle('on', state.lightsOn);
  const sb = $('#soundBtn');
  if (sb) { sb.textContent = state.sound ? '♪' : '∅'; sb.style.opacity = state.sound ? 1 : .5; }
  const cb = $('#taskCoffee');
  if (cb) {
    cb.classList.toggle('done', state.hasCoffee);
    cb.querySelector('.count').textContent = state.hasCoffee ? '✓' : (state.orderPending ? '制作中' : '—');
  }
  const sb2 = $('#taskShells');
  if (sb2) {
    sb2.classList.toggle('done', state.shells >= 5);
    sb2.querySelector('.count').textContent = `${state.shells} / 5`;
    sb2.querySelector('.box').textContent = state.shells >= 5 ? '✓' : '';
  }
  const wb = $('#taskWish');
  if (wb) {
    wb.classList.toggle('done', state.wishes > 0);
    wb.querySelector('.count').textContent = state.wishes > 0 ? '✓' : '—';
  }
}
function showModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('hidden');
  state.modalOpen = true;
  hidePrompt();
  if (document.pointerLockElement) document.exitPointerLock();
  if (id === 'wishModal') setTimeout(() => $('#wishInput')?.focus(), 80);
}
function hideModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('hidden');
  const any = $$('.modal').some((x) => !x.classList.contains('hidden'));
  state.modalOpen = any;
  if (!any && state.started && !IS_MOBILE) {
    // 不自动抢回鼠标，避免用户刚点完按钮就被锁住
  }
}
function hideAllModals() {
  $$('.modal').forEach((m) => m.classList.add('hidden'));
  state.modalOpen = false;
}
function hidePrompt() { if ($prompt) $prompt.classList.remove('visible'); }

/* ---------------- 点单 ---------------- */
function openMenu() {
  if (state.orderPending) { showToast('老板娘正在做上一杯，稍等一下。'); return; }
  showModal('menuModal');
}
function orderItem(type) {
  hideModal('menuModal');
  if (state.orderPending) return;
  state.orderPending = true;
  state.coffeeType = type;
  const name = ORDER_NAMES[type] || '咖啡';
  showToast(`点了一杯${name}。正在磨豆、注水…`, 3000);
  updateHUDStatus();
  AUDIO.ensure(); AUDIO.grind();
  setTimeout(() => AUDIO.pour(), 2500);
  setTimeout(() => AUDIO.steam(), 5200);
  clearTimeout(orderTimer);
  orderTimer = setTimeout(() => {
    state.orderPending = false;
    state.hasCoffee = true;
    if (refs.cupInHand) refs.cupInHand.visible = true;
    AUDIO.bell();
    showToast(`${name}好了，去窗边或露台坐下吧。`, 3600);
    updateHUDStatus();
    if (state.seated) showToast('咖啡放在手边了。按 E 喝一口。', 3200);
  }, 8000);
}
function drinkCoffee() {
  if (!state.hasCoffee) { showToast('先去菜单点一杯咖啡吧。'); return; }
  if (!state.seated) { showToast('找个位置坐下，再慢慢喝。'); return; }
  state.coffeeDone = true;
  $warm.style.opacity = '.42';
  setTimeout(() => { $warm.style.opacity = '0'; }, 1800);
  AUDIO.steam(); AUDIO.blip(520, .5, 'sine', .03);
  if (refs.cupInHand) refs.cupInHand.visible = false;
  showToast('咖啡很暖，海风刚好。', 3000);
  updateHUDStatus();
}

/* ---------------- 座位 ---------------- */
function sitAt(seat) {
  if (state.photo) return;
  if (state.seated) { standUp(); return; }
  state.seatReturn = { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch };
  state.seated = seat;
  player.vx = player.vz = 0;
  if (refs.cupInHand) refs.cupInHand.visible = state.hasCoffee && !state.coffeeDone;
  if (state.hasCoffee && !state.coffeeDone) showToast('按 E 喝咖啡，或 ESC 起身。', 3200);
  else showToast('坐下歇一会。按 ESC 起身。', 2600);
  hidePrompt();
}
function standUp() {
  if (!state.seated) return;
  state.seated = null;
  if (state.seatReturn) {
    player.x = state.seatReturn.x; player.z = state.seatReturn.z;
    player.yaw = state.seatReturn.yaw; player.pitch = state.seatReturn.pitch;
    player.y = groundHeight(player.x, player.z);
  }
  if (refs.cupInHand) refs.cupInHand.visible = false;
  showToast('起身，继续听海。', 1600);
}

/* ---------------- 场景交互动作 ---------------- */
function toggleDoor() {
  state.doorOpen = !state.doorOpen;
  const d = refs.cafe?.door;
  if (d) {
    d.target = state.doorOpen ? 1 : 0;
    if (d.collider) d.collider.disabled = state.doorOpen;
  }
  AUDIO.door(state.doorOpen);
  showToast(state.doorOpen ? '门开了，海风进来了一点。' : '门关上了，潮声被挡在门外。', 2100);
}
function ringChime() {
  AUDIO.chime();
  const c = refs.cafe?.chime;
  if (c) {
    c.userData.swing = 1;
    c.traverse((o) => { if (o.isMesh && o.geometry?.type === 'CylinderGeometry') o.rotation.z = .2; });
  }
  showToast('风铃响了一声，很轻。', 1800);
}
function toggleLights() {
  state.lightsOn = !state.lightsOn;
  applyTime(state.time);
  updateHUDStatus();
  showToast(state.lightsOn ? '室内灯亮了，木头的颜色暖起来。' : '灯关了，只剩窗外海光。', 2200);
}
function toggleRecord() {
  state.musicOn = !state.musicOn;
  AUDIO.ensure(); AUDIO.start();
  AUDIO.setMusic(state.musicOn);
  if (!state.musicOn) AUDIO.stopMusic();
  showToast(state.musicOn ? '唱片开始转，音乐像潮水一样漫进来。' : '唱片停了，只剩海浪。', 2400);
}
function toggleUmbrella() {
  state.umbrellaOpen = !state.umbrellaOpen;
  if (refs.cafe?.umbrella) refs.cafe.umbrella.target = state.umbrellaOpen ? 1 : 0;
  if (refs.cafe?.umbrella) refs.cafe.umbrella.open = state.umbrellaOpen;
  showToast(state.umbrellaOpen ? '遮阳伞撑开了。' : '遮阳伞收起来了。', 2000);
}
function petCat() {
  const cat = refs.cat;
  if (!cat || cat.petCooldown > 0) return;
  cat.petCooldown = 2.5;
  cat.purr = 2.2;
  cat.paused = 2.2;
  AUDIO.ensure(); AUDIO.meow(); AUDIO.purr();
  showToast('小潮发出呼噜声，尾巴慢慢摆。', 2600);
}
function ringBike() {
  AUDIO.ensure(); AUDIO.bell();
  showToast('叮铃。旧自行车的声音很清亮。', 1800);
}
function collectShell(i) {
  const sh = refs.shells[i];
  if (!sh || sh.taken) return;
  sh.taken = true;
  sh.group.visible = false;
  const item = interactables.find((x) => x.name === `shell${i}`);
  if (item) item.enabled = false;
  state.shells++;
  AUDIO.ensure(); AUDIO.shell();
  updateHUDStatus();
  showToast(`拾起一枚贝壳。${state.shells >= 5 ? '五枚都找到了，潮声像是收好了。' : `（${state.shells} / 5）`}`, 2600);
}
function scareGull(ground) {
  if (!refs.gulls || refs.gulls.scared) return;
  refs.gulls.scared = true;
  const item = interactables.find((x) => x.name === 'gull');
  if (item) item.enabled = false;
  AUDIO.ensure(); AUDIO.blip(760, .1, 'sine', .05); AUDIO.blip(980, .12, 'sine', .04, .08);
  showToast('海鸥拍拍翅膀，飞向海面。', 2200);
}
function buyVending() {
  const item = interactables.find((x) => x.name === 'vending');
  if (item && item.cooldown > 0) return;
  if (item) item.cooldown = 1.6;
  AUDIO.ensure(); AUDIO.vending();
  state.vending++;
  const canMat = std({ color: '#c96a5d', roughness: .35, metalness: .5 });
  const can = cylinder(root, .035, .035, .11, 9.4, .12, 13.2, canMat, { seg: 10, cast: true });
  can.rotation.z = .08;
  showToast('哐当。一瓶冰汽水落进取物口。', 2400);
}
function openWish() {
  showModal('wishModal');
}
function submitWish() {
  const input = $('#wishInput');
  const text = (input?.value || '').trim();
  if (!text) { showToast('写一句再挂上去吧。'); input?.focus(); return; }
  addEma(text);
  state.wishes++;
  input.value = '';
  hideModal('wishModal');
  AUDIO.ensure(); AUDIO.wishBell();
  updateHUDStatus();
  showToast('绘马挂上去了。海风会替你读。', 3400);
}
function addEma(text) {
  const rack = refs.shrine?.rack;
  if (!rack) return;
  const tex = canvasTexture(256, 192, (ctx, w, h) => {
    ctx.fillStyle = '#d8bb8d'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) { ctx.strokeStyle = 'rgba(110,80,45,.12)'; ctx.beginPath(); ctx.moveTo(0, i * 11); ctx.bezierCurveTo(w * .4, i * 11 + rand(-2, 2), w * .6, i * 11 + rand(-2, 2), w, i * 11); ctx.stroke(); }
    ctx.fillStyle = '#5b3b25'; ctx.textAlign = 'center'; ctx.font = `500 18px ${JP_SERIF}`; ctx.fillText('絵馬', w - 34, 30);
    ctx.font = `500 22px ${JP_SERIF}`; ctx.fillStyle = '#3f2d1e';
    const lines = [];
    for (let i = 0; i < text.length; i += 8) lines.push(text.slice(i, i + 8));
    lines.slice(0, 4).forEach((l, i) => ctx.fillText(l, w / 2, 84 + i * 30));
  });
  const p = plane(rack, .28, .21, -1.05 + (wishCount % 5) * .3, 1.97 + Math.floor(wishCount / 5) * .24, .035, std({ map: tex, roughness: .9, side: THREE.DoubleSide }), { receive: true });
  p.rotation.z = rand(-.06, .06);
  wishCount++;
}

/* ---------------- 拍照 ---------------- */
function applyPhotoFilter(name) {
  state.filter = name;
  $stage.classList.remove('filter-warm', 'filter-cool', 'filter-mono');
  if (name === 'warm') $stage.classList.add('filter-warm');
  if (name === 'cool') $stage.classList.add('filter-cool');
  if (name === 'mono') $stage.classList.add('filter-mono');
  $$('#photoBar [data-filter]').forEach((b) => b.classList.toggle('active', b.dataset.filter === name));
}
function togglePhoto(force) {
  if (!state.started && !state.shot) return;
  const next = typeof force === 'boolean' ? force : !state.photo;
  if (next === state.photo) return;
  state.photo = next;
  document.body.classList.toggle('photo', next);
  if (next) {
    if (state.seated) standUp();
    state.photoReturn = { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch, y: player.y };
    player.x = camera.position.x; player.y = camera.position.y; player.z = camera.position.z;
    if (document.pointerLockElement) document.exitPointerLock();
    $('#photoBar')?.classList.remove('hidden');
    $hud.classList.remove('visible');
    hidePrompt();
    showToast('拍照模式：WASD + Q/E 升降，1–4 切换滤镜，P 退出。', 3800);
    applyPhotoFilter(state.filter);
    AUDIO.ensure(); AUDIO.camera();
  } else {
    $('#photoBar')?.classList.add('hidden');
    if (state.started) $hud.classList.add('visible');
    showToast('回到咖啡馆。', 1800);
    if (state.photoReturn) {
      player.x = state.photoReturn.x; player.z = state.photoReturn.z;
      player.yaw = state.photoReturn.yaw; player.pitch = state.photoReturn.pitch;
      player.y = state.photoReturn.y;
    }
  }
}

/* ---------------- 画质 / 声音 ---------------- */
function setQuality(q) {
  state.quality = q;
  renderer.shadowMap.enabled = q !== 'low';
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q === 'low' ? 1 : (IS_MOBILE ? 1.35 : 1.75)));
  scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  showToast(q === 'low' ? '已切换为省电画质。' : '已切换为精致画质。', 1800);
}
function toggleSound() {
  state.sound = !state.sound;
  AUDIO.ensure(); if (state.sound) AUDIO.start();
  AUDIO.setMuted(!state.sound);
  updateHUDStatus();
  showToast(state.sound ? '声音开了。' : '声音关了。', 1600);
}

/* ---------------- Hover / 拾取 ---------------- */
function ensureHoverHelper() {
  if (hoverHelper) return hoverHelper;
  const b = new THREE.Box3(new THREE.Vector3(-.5, 0, -.5), new THREE.Vector3(.5, 1, .5));
  hoverHelper = new THREE.Box3Helper(b, 0xc29a5b);
  hoverHelper.material.transparent = true;
  hoverHelper.material.opacity = .75;
  hoverHelper.material.depthTest = false;
  hoverHelper.renderOrder = 20;
  hoverHelper.visible = false;
  scene.add(hoverHelper);
  return hoverHelper;
}
function updateInteractions(dt, t) {
  if (state.modalOpen || state.photo || !state.started || state.shotCam) {
    if (hoverHelper) hoverHelper.visible = false;
    hidePrompt();
    return;
  }
  // 冷却 & 动态命中盒
  for (const it of interactables) {
    if (it.cooldown > 0) it.cooldown = Math.max(0, it.cooldown - dt);
    if (it.dynamic && it.enabled && it.object) {
      it.object.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(it.object);
      const c = b.getCenter(new THREE.Vector3());
      it.hitbox.position.copy(c);
      it.box = b;
    }
  }
  if (state.seated) {
    $cross.classList.remove('active');
    if (hoverHelper) hoverHelper.visible = false;
    $prompt.innerHTML = state.hasCoffee && !state.coffeeDone
      ? `<kbd>E</kbd> 喝咖啡　　<kbd>ESC</kbd> 起身`
      : `<kbd>ESC</kbd> 起身`;
    $prompt.classList.add('visible');
    return;
  }
  lastHoverCheck += dt;
  if (lastHoverCheck < .08) {
    if (hovered) showHoverPrompt(hovered);
    return;
  }
  lastHoverCheck = 0;
  raycaster.setFromCamera(centerNDC, camera);
  raycaster.far = 4.2;
  const meshes = [];
  for (const it of interactables) if (it.enabled && it.hitbox) meshes.push(it.hitbox);
  const hits = raycaster.intersectObjects(meshes, false);
  let found = null;
  for (const h of hits) {
    const it = h.object.userData.item;
    if (!it || !it.enabled) continue;
    if (h.distance <= it.max) { found = it; break; }
  }
  hovered = found;
  if (found) {
    const b = new THREE.Box3().setFromObject(found.object);
    const h = ensureHoverHelper();
    h.box.copy(b); h.visible = true; h.updateMatrixWorld(true);
    $cross.classList.add('active');
    showHoverPrompt(found);
  } else {
    if (hoverHelper) hoverHelper.visible = false;
    $cross.classList.remove('active');
    hidePrompt();
  }
}
function showHoverPrompt(it) {
  if (state.modalOpen || state.photo || state.seated) return;
  const key = IS_MOBILE ? '互动' : 'E';
  $prompt.innerHTML = `<kbd>${key}</kbd> ${it.label}`;
  $prompt.classList.add('visible');
}
function interactHovered() {
  if (state.modalOpen || state.photo || !state.started) return;
  if (state.seated) {
    if (state.hasCoffee && !state.coffeeDone) drinkCoffee();
    else standUp();
    return;
  }
  if (!hovered || !hovered.enabled || hovered.cooldown > 0) {
    if (!hovered) showToast('走近一点，对准想碰的东西。', 1500);
    return;
  }
  const it = hovered;
  it.cooldown = it.cooldown || 0;
  try { it.action(); } catch (e) { console.error(e); }
}

/* ---------------- 开始 / 移动端 / 事件 ---------------- */
function startGame(opts = {}) {
  if (state.started) return;
  state.started = true;
  document.body.classList.add('started');
  $start.classList.add('hidden');
  $hud.classList.add('visible');
  if (IS_MOBILE) {
    const mc = $('#mobileControls');
    if (mc) mc.style.display = 'block';
  }
  player.x = -13.2; player.z = 2.2; player.yaw = -Math.PI / 2; player.pitch = -0.03;
  player.y = groundHeight(player.x, player.z);
  applyTime(state.time);
  applyWeather(state.weather);
  AUDIO.start();
  updateHUDStatus();
  if (!IS_MOBILE && canvas.requestPointerLock) { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { player.dragLook = true; }); }
  if (!opts.silent) showToast('欢迎来到海風珈琲。先点一杯，再去海边坐坐。', 3800);
  setTimeout(() => { hideModal('helpModal'); }, 0);
}
function setupUI() {
  // 按钮
  $('#startBtn')?.addEventListener('click', () => startGame());
  $('#startHelpBtn')?.addEventListener('click', () => showModal('helpModal'));
  $('#soundBtn')?.addEventListener('click', toggleSound);
  $('#weatherBtn')?.addEventListener('click', () => {
    const p = $('#weatherPanel'); if (!p) return;
    p.classList.toggle('hidden');
    updateHUDStatus();
  });
  $('#photoBtn')?.addEventListener('click', () => togglePhoto());
  $('#photoExit')?.addEventListener('click', () => togglePhoto(false));
  $('#helpBtn')?.addEventListener('click', () => showModal('helpModal'));
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => hideModal(b.dataset.close)));
  $$('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) hideModal(m.id); }));
  $('#startScreen')?.addEventListener('click', (e) => { if (e.target === $('#startScreen') && state.started) startGame(); });

  // 时间 / 天气
  const slider = $('#timeSlider');
  slider?.addEventListener('input', () => { applyTime(parseFloat(slider.value)); });
  $$('#timeChips .chip').forEach((b) => b.addEventListener('click', () => { applyTime(parseFloat(b.dataset.time)); }));
  $$('[data-weather]').forEach((b) => b.addEventListener('click', () => { applyWeather(b.dataset.weather); }));
  $('#lightSwitch')?.addEventListener('click', toggleLights);
  // 画质行（在天气面板里追加，避免改动初始 HTML 结构）
  const wp = $('#weatherPanel');
  if (wp && !$('#qualityRow')) {
    const row = document.createElement('div'); row.id = 'qualityRow'; row.className = 'toggle-row';
    row.innerHTML = '<span>画质</span><button class="switch on" id="qualitySwitch" aria-label="画质切换"></button>';
    wp.appendChild(row);
    $('#qualitySwitch').addEventListener('click', () => {
      const q = state.quality === 'high' ? 'low' : 'high';
      state.quality = q;
      $('#qualitySwitch').classList.toggle('on', q === 'high');
      setQuality(q);
    });
  }

  // 菜单
  $$('[data-order]').forEach((b) => b.addEventListener('click', () => orderItem(b.dataset.order)));
  // 许愿
  $('#wishSubmit')?.addEventListener('click', submitWish);
  $('#wishInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitWish(); });
  // 拍照滤镜
  $$('#photoBar [data-filter]').forEach((b) => b.addEventListener('click', () => { applyPhotoFilter(b.dataset.filter); AUDIO.camera(); }));

  $('#actionBtn')?.addEventListener('click', interactHovered);

  // 键盘
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'KeyE') { interactHovered(); return; }
    if (e.code === 'KeyP') { togglePhoto(); return; }
    if (e.code === 'Escape') {
      if (state.photo) togglePhoto(false);
      else if (state.seated) standUp();
      else if (state.modalOpen) hideAllModals();
    }
    if (state.photo) {
      const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
      if (i >= 0) applyPhotoFilter(photoFilters[i]);
    }
  });

  // 指针锁定失败 / 提示
  document.addEventListener('pointerlockchange', () => {
    player.locked = document.pointerLockElement === canvas;
    $('#hint')?.classList.toggle('hidden', player.locked || IS_MOBILE);
    if (player.locked) showToast('视角已锁定。ESC 释放鼠标。', 1800);
  });
  document.addEventListener('pointerlockerror', () => {
    player.dragLook = true;
    showToast('鼠标锁定失败：按住画面拖动也能环视。', 2600);
  });

  // 移动端摇杆
  setupMobile();
  updateHUDStatus();
}

function setupMobile() {
  const joy = $('#joystick'), knob = joy?.querySelector('.knob'), pad = $('#lookPad');
  if (!joy || !pad) return;
  let jid = null, jx = 0, jy = 0;
  const rect = () => joy.getBoundingClientRect();
  const move = (e) => {
    const r = rect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const max = r.width * .32, d = Math.hypot(dx, dy);
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    jx = dx / max; jy = dy / max;
  };
  joy.addEventListener('pointerdown', (e) => { jid = e.pointerId; joy.setPointerCapture(e.pointerId); move(e); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === jid) move(e); });
  const end = () => { jid = null; jx = 0; jy = 0; knob.style.transform = 'translate(-50%,-50%)'; };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  window.__joy = () => ({ x: jx, y: jy });

  let lid = null, lx = 0, ly = 0;
  pad.addEventListener('pointerdown', (e) => { lid = e.pointerId; lx = e.clientX; ly = e.clientY; pad.setPointerCapture(e.pointerId); });
  pad.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lid) return;
    player.yaw -= (e.clientX - lx) * .0045;
    player.pitch = clamp(player.pitch - (e.clientY - ly) * .0038, -1.15, 1.1);
    lx = e.clientX; ly = e.clientY;
  });
  pad.addEventListener('pointerup', () => { lid = null; });
  pad.addEventListener('pointercancel', () => { lid = null; });
}
