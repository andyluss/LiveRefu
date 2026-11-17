// store.js · 便利店：外观、招牌、店内陈设、自动门与生活痕迹
import * as THREE from 'three';
import {
  toon, lit, glass, box, cyl, sph, plane, outline, sprite, rng, pick, clamp,
  glowMap, mistMap, noShadow,
} from './kit.js';
import {
  storeSignTexture, verticalSignTexture, vendingFrontTexture, trashLabelTexture,
  magazineTextures, aisleSignTexture, decalTexture, menuBoardTexture,
  posterFireworksTexture, posterFestivalTexture, posterIceTexture, posterBeachTexture,
  tileTexture, woodTexture, sideSignTexture, horizonSignTexture,
} from './textures.js';
import { buildPuddle } from './water.js';

const R = rng(197);

export function buildStore(scene, { ripples } = {}) {
  const group = new THREE.Group();
  scene.add(group);

  const M = {
    wall: toon('#e9dcc2'),
    wallWarm: toon('#eadcc2'),
    wallInner: toon('#d8c9ab'),
    trim: toon('#9fc9b4'),
    teal: toon('#2c7a76'),
    tealDark: toon('#225e5c'),
    coral: toon('#ec8269'),
    cream: toon('#f8f0dc'),
    floor: toon('#a9a08c', { map: tileTexture() }),
    wood: toon('#ffffff', { map: woodTexture() }),
    woodDark: toon('#7b5438'),
    metal: toon('#aebac0'),
    metalDark: toon('#59686f'),
    concrete: toon('#cfc9ba'),
    dark: toon('#2c383e'),
    glass: glass({ color: '#c9e9ea', opacity: 0.13 }),
    glassClear: glass({ color: '#dff1ef', opacity: 0.09 }),
    fridgeGlass: glass({ color: '#d9f3f7', opacity: 0.18 }),
    lightPanel: lit('#fff3cf'),
    lightPanelCool: lit('#eefbff'),
    screen: lit('#9be3cf'),
    rubber: toon('#2a2f33'),
    white: toon('#f6f2e6'),
    mint: toon('#a9d8c0'),
    peach: toon('#ffc39a'),
    blue: toon('#8fc6e0'),
    red: toon('#d9604f'),
    yellow: toon('#f0cb76'),
    leaf: toon('#5f8f63'),
    leafLight: toon('#7fae74'),
    roof: toon('#56625c'),
  };

  // ---------------- 建筑外壳 ----------------
  const shell = new THREE.Group();
  group.add(shell);
  const X0 = -8.9, X1 = 2.9, Z0 = -6.4, Z1 = 1.4;
  const W = X1 - X0, D = Z1 - Z0, CX = (X0 + X1) / 2, CZ = (Z0 + Z1) / 2;

  // 基础与地面
  box(shell, W + 0.4, 0.24, D + 0.4, CX, 0.16, CZ, M.cream, { outline: 1.004 });
  box(shell, W - 0.2, 0.04, D - 0.2, CX, 0.335, CZ, M.floor, { cast: false });
  // 门口踏台
  box(shell, 4.2, 0.08, 1.4, -0.8, 0.34, 2.0, M.concrete, { cast: false });
  // 店内入口地垫
  box(shell, 2.6, 0.03, 1.2, -0.8, 0.375, 0.85, M.tealDark, { cast: false });
  // 门外两级踏步
  box(shell, 4.4, 0.16, 1.15, -0.8, 0.22, 2.15, M.concrete, { cast: false });
  box(shell, 4.4, 0.06, 0.55, -0.8, 0.325, 1.9, M.concrete, { cast: false });

  // 室内地面细节：导视线
  for (let i = 0; i < 2; i++) {
    plane(shell, 0.18, 3.6, -3.1 + i * 1.6, 0.361, -2.0, lit('#7fc7b0', { transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }), { rot: [-Math.PI / 2, 0, 0] });
  }
  plane(shell, 1.6, 0.7, -6.7, 0.362, 0.9, lit('#ffffff', { map: decalTexture(['↓', 'お会計'], '#2c7a76', 70), transparent: true, depthWrite: false, toneMapped: false }), { rot: [-Math.PI / 2, 0, 0] });

  // 后墙、侧墙
  box(shell, W, 3.9, 0.18, CX, 2.1, Z0, M.wall, { outline: 1.01 });
  box(shell, 0.18, 3.9, D, X0, 2.1, CZ, M.wall, { outline: 1.01 });
  box(shell, 0.18, 3.9, D, X1, 2.1, CZ, M.wall, { outline: 1.01 });
  // 内墙面包边
  box(shell, W - 0.36, 3.6, 0.04, CX, 2.0, Z0 + 0.11, M.wallInner, { cast: false });
  box(shell, 0.04, 3.6, D - 0.36, X0 + 0.11, 2.0, CZ, M.wallInner, { cast: false });
  box(shell, 0.04, 3.6, D - 0.36, X1 - 0.11, 2.0, CZ, M.wallInner, { cast: false });

  // 前立面：踢脚 + 玻璃 + 门头
  box(shell, W, 0.32, 0.16, CX, 0.48, Z1, M.teal, { outline: 1.004 });
  box(shell, W, 0.72, 0.2, CX, 3.82, Z1, M.wallWarm, { outline: 1.004 });
  // 门头小字
  plane(shell, 4.0, 0.4, -3.0, 3.82, Z1 + 0.11, lit('#ffffff', { map: decalTexture(['WELCOME  /  NAGISA MART'], '#2c7a76', 44), transparent: true, toneMapped: false }), { receive: false });

  // 玻璃幕墙（门洞 x -2.45..0.85）
  const glassY0 = 0.64, glassY1 = 3.46;
  const panes = [[X0 + 0.05, -5.85], [-5.7, -2.55], [0.9, X1 - 0.05]];
  for (const [a, b] of panes) {
    const w = b - a;
    plane(shell, w, glassY1 - glassY0, (a + b) / 2, (glassY0 + glassY1) / 2, Z1 + 0.02, M.glass, { receive: false });
  }
  // 竖向框
  for (const x of [X0 + 0.05, -5.85, -2.55, 0.9, X1 - 0.05]) {
    box(shell, 0.09, glassY1 - glassY0 + 0.1, 0.12, x, (glassY0 + glassY1) / 2, Z1 + 0.02, M.metalDark, { cast: false });
  }
  // 横梁
  box(shell, W, 0.08, 0.1, CX, 2.62, Z1 + 0.02, M.metalDark, { cast: false });
  box(shell, W, 0.08, 0.1, CX, 0.64, Z1 + 0.02, M.metalDark, { cast: false });

  // 自动门
  const doorGroup = new THREE.Group();
  group.add(doorGroup);
  const doorL = new THREE.Group();
  const doorR = new THREE.Group();
  doorGroup.add(doorL, doorR);
  const makeDoor = (g, xCenter, w) => {
    plane(g, w, 2.8, xCenter, 2.05, Z1 + 0.06, M.glassClear, { receive: false });
    box(g, 0.08, 2.86, 0.1, xCenter - w / 2, 2.05, Z1 + 0.08, M.metalDark, { cast: false });
    box(g, 0.08, 2.86, 0.1, xCenter + w / 2, 2.05, Z1 + 0.08, M.metalDark, { cast: false });
    box(g, w, 0.08, 0.1, xCenter, 3.45, Z1 + 0.08, M.metalDark, { cast: false });
    box(g, w, 0.08, 0.1, xCenter, 0.66, Z1 + 0.08, M.metalDark, { cast: false });
    // 门贴
    plane(g, 0.5, 0.9, xCenter, 2.1, Z1 + 0.115, lit('#ffffff', {
      map: decalTexture(['自動', 'ドア'], '#2c7a76', 46), transparent: true, toneMapped: false,
    }), { receive: false });
  };
  makeDoor(doorL, -1.6, 1.6);
  makeDoor(doorR, 0.05, 1.6);

  // 檐口雨棚
  const canopy = new THREE.Group();
  canopy.position.set(0, 3.5, Z1 + 0.75);
  canopy.rotation.x = -0.1;
  group.add(canopy);
  box(canopy, W + 0.2, 0.11, 1.5, 0, 0, 0, M.cream, { outline: 1.006 });
  // 雨棚条纹
  for (let i = 0; i < 5; i++) {
    box(canopy, 1.9, 0.012, 1.42, -4.0 + i * 2.0, 0.062, 0, i % 2 ? M.trim : M.cream, { cast: false });
  }
  // 雨棚小灯
  for (let i = 0; i < 4; i++) {
    box(canopy, 0.34, 0.04, 0.1, -4.5 + i * 3.0, -0.085, 0.3, M.lightPanel, { cast: false });
  }
  // 雨棚前沿的珊瑚色帷幔 + 波浪边
  box(group, W + 0.15, 0.2, 0.09, 0, 3.42, Z1 + 1.52, M.coral, { cast: false });
  for (let i = 0; i < 13; i++) {
    const x = -W / 2 + 0.25 + i * (W - 0.5) / 12;
    box(group, (W - 0.4) / 13, 0.16, 0.07, x, 3.29, Z1 + 1.53, i % 2 ? M.cream : M.mint, { cast: false });
  }
  // 雨棚下的暖光条
  box(group, W - 0.8, 0.04, 0.08, -0.2, 3.36, Z1 + 0.95, M.lightPanel, { cast: false });
  // 斜撑
  for (const x of [-4.8, 0.2, 4.2]) {
    box(group, 0.1, 0.1, 1.9, x, 3.55, Z1 + 0.7, M.metalDark, { rot: [0.35, 0, 0], cast: false });
  }
  // 雨棚边缘的暖光
  const canopyGlow = new THREE.PointLight('#ffd9a4', 26, 9, 2);
  canopyGlow.position.set(-0.6, 3.3, Z1 + 1.2);
  group.add(canopyGlow);

  // 屋顶
  box(shell, W + 0.6, 0.24, D + 0.6, CX, 4.12, CZ, M.roof, { outline: 1.01 });
  // 屋面：浅灰防水层 + 天窗 + 排气管 + 检修口
  box(shell, W + 0.2, 0.03, D + 0.2, CX, 4.245, CZ, M.roof, { cast: false });
  box(shell, 2.5, 0.14, 1.5, -5.2, 4.33, -1.6, M.metalDark, { cast: false });
  box(shell, 2.3, 0.04, 1.3, -5.2, 4.4, -1.6, glass({ color: '#cfe9ee', opacity: 0.35 }), { cast: false });
  for (const [vx, vz] of [[-7.6, -4.6], [-7.1, -4.6], [-6.6, -4.6]]) {
    cyl(shell, 0.1, 0.12, 0.55, vx, 4.52, vz, M.metal, { seg: 8 });
    cyl(shell, 0.18, 0.18, 0.06, vx, 4.8, vz, M.metalDark, { seg: 8, cast: false });
  }
  box(shell, 1.1, 0.55, 1.1, 1.2, 4.5, -4.9, M.cream, { outline: 1.01 });
  box(shell, 0.7, 0.75, 0.05, 1.2, 4.6, -4.33, M.teal, { cast: false });
  // 后排护栏
  for (let rx = -8; rx <= 2.2; rx += 1.4) {
    cyl(shell, 0.025, 0.025, 0.5, rx, 4.5, Z0 + 0.15, M.metalDark, { seg: 5, cast: false });
  }
  box(shell, 10.4, 0.035, 0.035, -2.9, 4.75, Z0 + 0.15, M.metalDark, { cast: false });
  box(shell, W + 0.66, 0.1, 0.18, CX, 4.27, Z1 + 0.3, M.trim, { cast: false });
  box(shell, W + 0.66, 0.1, 0.18, CX, 4.27, Z0 - 0.3, M.trim, { cast: false });
  // 屋顶设备
  box(shell, 1.6, 0.7, 1.0, -8.0, 4.55, -5.0, M.metal, { outline: 1.01 });
  cyl(shell, 0.28, 0.28, 0.16, -8.0, 4.94, -5.0, M.metalDark, { seg: 12 });
  box(shell, 0.8, 0.5, 0.6, 0.8, 4.5, -5.4, M.cream, { cast: false });
  // 招牌背架
  box(shell, W + 0.2, 1.5, 0.24, CX, 4.95, Z1 - 0.1, M.cream, { outline: 1.006 });

  // ---------------- 招牌 ----------------
  const signMat = lit('#ffffff', { map: storeSignTexture(), toneMapped: false });
  const sign = plane(shell, W + 0.3, 1.32, CX, 4.96, Z1 + 0.04, signMat, { receive: false });
  sign.renderOrder = 3;
  // 招牌边框
  box(shell, W + 0.45, 0.1, 0.1, CX, 5.66, Z1 + 0.02, M.coral, { cast: false });
  box(shell, W + 0.45, 0.09, 0.1, CX, 4.27, Z1 + 0.02, M.teal, { cast: false });
  const signGlow = sprite(group, glowMap, '#ffe0ad', 13, CX, 5.0, Z1 + 1.2, { opacity: 0.2 });
  signGlow.scale.set(15, 6, 1);
  // 店内暖光在玻璃前的柔光
  const shopHaze = sprite(group, glowMap, '#ffcf8f', 8, CX, 1.9, Z1 + 1.1, { opacity: 0.1 });
  shopHaze.scale.set(13, 4.8, 1);

  // 竖招牌（转角）
  const vSignMat = lit('#ffffff', { map: verticalSignTexture(), toneMapped: false });
  const vs = new THREE.Group();
  vs.position.set(X1 + 0.32, 4.9, Z1 + 0.18);
  group.add(vs);
  box(vs, 0.92, 3.3, 0.32, 0, 0, 0, M.cream, { outline: 1.01 });
  const vp = plane(vs, 0.84, 3.1, 0, 0, 0.17, vSignMat, { receive: false });
  vp.renderOrder = 3;
  for (const [px, ry] of [[0.47, Math.PI / 2], [-0.47, -Math.PI / 2]]) {
    const p = plane(vs, 0.28, 3.1, px, 0, 0, vSignMat, { receive: false, rot: [0, ry, 0] });
    p.renderOrder = 3;
  }
  const vGlow = sprite(group, glowMap, '#ffdca4', 3.4, X1 + 0.6, 4.9, Z1 + 0.5, { opacity: 0.25 });

  // ---------------- 店内照明 ----------------
  // 天花板
  plane(shell, W - 0.4, D - 0.4, CX, 3.66, CZ, M.wallInner, { rot: [Math.PI / 2, 0, 0] });
  // 灯管
  for (let ix = 0; ix < 3; ix++) {
    for (let iz = 0; iz < 2; iz++) {
      box(shell, 2.2, 0.05, 0.3, -6.6 + ix * 3.0, 3.6, -4.6 + iz * 3.1, M.lightPanel, { cast: false });
      sprite(shell, glowMap, '#ffe8bb', 1.8, -6.6 + ix * 3.0, 3.55, -4.6 + iz * 3.1, { opacity: 0.18 });
    }
  }
  // 店内暖光
  for (const [x, z] of [[-6.8, -4.2], [-6.8, -1.2], [-1.4, -4.0], [-1.4, -0.8], [1.7, -3.0]]) {
    const l = new THREE.PointLight('#ffc27c', 15, 7.5, 2);
    l.position.set(x, 3.25, z);
    group.add(l);
  }
  // 冰箱冷光
  const cold = new THREE.PointLight('#d8f4ff', 12, 5, 2);
  cold.position.set(-4.4, 2.2, -5.2);
  group.add(cold);

  // ---------------- 冷柜 / 饮料柜 ----------------
  const fridge = buildFridge(group, M);
  // ---------------- 货架 ----------------
  const shelves = buildShelves(group, M);
  // ---------------- 收银台 ----------------
  const counter = buildCounter(group, M);
  // ---------------- 冷冻柜 ----------------
  buildIceFreezer(group, M);
  // ---------------- 夏日限定陈列 ----------------
  buildSummerDisplay(group, M);
  // ---------------- 杂志架 ----------------
  buildMagazineRack(group, M);
  // ---------------- 便当区 ----------------
  buildBentoCase(group, M);
  // ---------------- 后场门 / 储物柜 ----------------
  buildBackroom(group, M);
  // ---------------- 吊牌 ----------------
  buildHangingSigns(group, M);
  // ---------------- 海报与贴纸 ----------------
  buildInteriorPosters(group, M);

  // ---------------- 店外 ----------------
  buildSideWall(group, M);
  buildBackWall(group, M);
  const vending = buildVending(group, M);
  buildTrashBins(group, M);
  const bike = buildBicycle(group, M);
  buildSurfboards(group, M);
  const ac = buildAC(group, M);
  const chime = buildWindChime(group, M);
  buildEntranceDetails(group, M);
  const dripPuddle = buildPuddle(group, { x: -9.65, z: -4.85, rx: 0.75, rz: 1.1, y: 0.12, seed: 17, tint: '#d9a08e' });

  // ---------------- 动效 ----------------
  const state = { door: 0, doorTarget: 0, nextDoor: 7.5, drip: 0, flicker: 0 };
  const spillMat = lit('#ffcf8e', { transparent: true, opacity: 0.0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  const spill = plane(group, 3.0, 1.8, -0.8, 0.355, 2.4, spillMat, { rot: [-Math.PI / 2, 0, 0] });
  spill.renderOrder = 4;
  const doorLight = new THREE.PointLight('#ffcf8e', 10, 5, 2);
  doorLight.position.set(-0.8, 2.3, 2.0);
  group.add(doorLight);

  const mist = [];
  for (let i = 0; i < 10; i++) {
    const m = sprite(group, mistMap, '#e8fbff', 0.7, -7.9 + i * 0.8, 0.8 + R() * 1.9, -5.35, { opacity: 0.0 });
    m.material.blending = THREE.NormalBlending;
    m.userData = { ph: R() * 6.28, sp: 0.06 + R() * 0.05, x: m.position.x, y: m.position.y };
    mist.push(m);
  }

  const chimeTubes = chime.tubes;
  const fan = counter.fan;

  return {
    group,
    update(t, dt) {
      // 自动门：每 11 秒开合一次，遇到“有人”经过的错觉
      state.nextDoor -= dt;
      if (state.nextDoor <= 0) {
        state.doorTarget = state.doorTarget > 0.5 ? 0 : 1;
        state.nextDoor = state.doorTarget > 0.5 ? 5.0 : 9.0;
      }
      state.door += (state.doorTarget - state.door) * Math.min(1, dt * 2.4);
      const open = state.door;
      doorL.position.x = -open * 1.28;
      doorR.position.x = open * 1.28;
      spillMat.opacity = open * 0.5;
      doorLight.intensity = 10 + open * 18;
      canopyGlow.intensity = 26 + Math.sin(t * 0.8) * 1.2;

      // 招牌轻微闪烁
      state.flicker = 0.94 + 0.06 * Math.sin(t * 13.0) * Math.sin(t * 3.1 + 1.0) + (Math.sin(t * 0.37) > 0.997 ? -0.18 : 0);
      const k = clamp(state.flicker, 0.7, 1);
      signMat.color.setRGB(k, k, k * 0.98);
      signGlow.material.opacity = 0.2 * k;
      vSignMat.color.setRGB(k, k, k * 0.98);
      vGlow.material.opacity = 0.25 * k;

      // 冷柜白雾缓缓下沉
      for (const m of mist) {
        const p = ((t * m.userData.sp + m.userData.ph) % 1);
        m.position.y = 0.55 + (1 - p) * 2.0;
        m.position.x = m.userData.x + Math.sin(t * 0.4 + m.userData.ph) * 0.1;
        m.material.opacity = Math.sin(p * Math.PI) * 0.14;
      }

      // 收银台小风扇
      fan.rotation.z -= dt * 4.2;

      // 风铃
      chimeTubes.forEach((tube, i) => {
        tube.rotation.z = Math.sin(t * 1.1 + i * 0.7) * 0.16;
        tube.rotation.x = Math.cos(t * 0.9 + i * 0.5) * 0.08;
      });
      chime.bell.rotation.z = Math.sin(t * 1.15) * 0.2;

      // 空调外机滴水
      state.drip += dt;
      if (state.drip > 1.7) {
        state.drip = 0;
        if (ripples) ripples.spawn(-9.65, 0.128, -4.85, 0.8);
        if (ac.drops.length < 6) ac.spawn();
      }
      ac.update(t, dt);
      dripPuddle.update(t);

      fridge.update(t);
      vending.update(t);
      bike.update(t);
      shelves.update(t);
      counter.update(t);
    },
  };
}

// ---------------- 饮料柜 ----------------
function buildFridge(parent, M) {
  const g = new THREE.Group();
  g.position.set(-4.55, 0.36, -6.0);
  parent.add(g);

  box(g, 7.5, 2.55, 0.9, 0, 1.28, 0, M.cream, { outline: 1.006 });
  // 内胆
  box(g, 7.2, 2.25, 0.7, 0, 1.25, 0.06, toon('#dff0ef'), { cast: false });
  plane(g, 7.1, 2.2, 0, 1.25, 0.42, lit('#e9fbff'), { receive: false });
  // 顶部灯带
  box(g, 7.0, 0.06, 0.12, 0, 2.3, 0.36, M.lightPanelCool, { cast: false });

  // 货架与饮料
  const colors = ['#ef8a76', '#f2c96c', '#7fc7a8', '#89b9e0', '#e88fb0', '#f6ecd2', '#b8d67a', '#e9a06a', '#9ad7dd'];
  const canGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.22, 8);
  const canMat = toon('#ffffff');
  for (let unit = 0; unit < 4; unit++) {
    const ux = -2.75 + unit * 1.85;
    for (let row = 0; row < 4; row++) {
      const y = 0.52 + row * 0.5;
      box(g, 1.72, 0.045, 0.55, ux, y - 0.13, 0.18, M.metal, { cast: false });
      // 一排饮料
      const items = [];
      for (let i = 0; i < 9; i++) {
        items.push({
          x: ux - 0.68 + i * 0.17,
          y: y + 0.02,
          z: 0.22,
          s: 0.8 + (i % 3) * 0.12,
          c: colors[(unit * 7 + row * 5 + i) % colors.length],
        });
      }
      const im = new THREE.InstancedMesh(canGeo, canMat, items.length);
      const mtx = new THREE.Matrix4();
      items.forEach((it, i) => {
        mtx.compose(new THREE.Vector3(it.x, it.y, it.z), new THREE.Quaternion(), new THREE.Vector3(1, it.s, 1));
        im.setMatrixAt(i, mtx);
        im.setColorAt(i, new THREE.Color(it.c));
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = false; im.receiveShadow = true;
      g.add(im);
    }
    // 玻璃门与门框
    plane(g, 1.72, 2.1, ux, 1.3, 0.5, M.fridgeGlass, { receive: false });
    for (const sx of [-0.87, 0.87]) box(g, 0.05, 2.2, 0.06, ux + sx, 1.3, 0.5, M.metalDark, { cast: false });
    box(g, 1.8, 0.06, 0.06, ux, 2.4, 0.5, M.metalDark, { cast: false });
    box(g, 1.8, 0.06, 0.06, ux, 0.2, 0.5, M.metalDark, { cast: false });
    // 门把手
    box(g, 0.04, 0.6, 0.05, ux + 0.62, 1.35, 0.56, M.metal, { cast: false });
    // 价格/分类条
    box(g, 1.6, 0.12, 0.03, ux, 2.52, 0.46, M.teal, { cast: false });
  }
  // 柜顶小招牌
  plane(g, 3.4, 0.34, -1.0, 2.72, 0.5, lit('#ffffff', { map: decalTexture(['つめたい飲みもの'], '#2c7a76', 52), transparent: true, toneMapped: false }), { receive: false });

  // 冷雾
  const mist = [];
  for (let i = 0; i < 8; i++) {
    const s = sprite(g, mistMap, '#dff8ff', 0.55, -3.4 + i * 1.0, 0.6 + (i % 4) * 0.45, 0.58, { opacity: 0.08 });
    s.material.blending = THREE.NormalBlending;
    s.userData = { ph: i * 0.9, x: s.position.x, y0: s.position.y };
    mist.push(s);
  }
  return {
    group: g,
    update(t) {
      for (const s of mist) {
        const p = (t * 0.09 + s.userData.ph) % 1;
        s.position.y = s.userData.y0 + (1 - p) * 1.1;
        s.position.x = s.userData.x + Math.sin(t * 0.5 + s.userData.ph) * 0.12;
        s.material.opacity = Math.sin(p * Math.PI) * 0.1;
      }
    },
  };
}

// ---------------- 中岛货架 ----------------
function buildShelves(parent, M) {
  const g = new THREE.Group();
  parent.add(g);
  const rows = [-4.25, -2.85, -1.45];
  const colors = ['#ef8a76', '#f2c96c', '#7fc7a8', '#89b9e0', '#e88fb0', '#f6ecd2', '#b8d67a', '#e9a06a', '#a9d6df', '#d9a0b8'];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const canGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8);
  const prodMat = toon('#ffffff');
  const levels = [0.48, 0.91, 1.32];

  for (const z of rows) {
    // 货架主体
    box(g, 6.1, 0.5, 0.8, -4.0, 0.62, z, M.wood, { outline: 1.006 });
    box(g, 6.12, 0.12, 0.82, -4.0, 0.53, z, M.teal, { cast: false });
    box(g, 6.1, 0.18, 0.82, -4.0, 0.9, z, M.teal, { cast: false });
    for (const y of [1.06, 1.46]) box(g, 6.1, 0.05, 0.8, -4.0, y, z, M.metal, { cast: false });
    // 端头档板
    for (const sx of [-3.05, 3.05]) box(g, 0.06, 1.25, 0.82, -4.0 + sx, 1.05, z, M.teal, { cast: false });
    // 价格条
    for (const y of [0.9, 1.07, 1.47]) {
      box(g, 5.9, 0.06, 0.03, -4.0, y, z + 0.41, M.cream, { cast: false });
    }
    // 每层商品
    for (let li = 0; li < 3; li++) {
      const y = levels[li];
      const items = [];
      for (let i = 0; i < 15; i++) {
        const x = -6.8 + i * 0.4 + (R() - 0.5) * 0.08;
        const isCan = (i + li) % 4 === 0;
        items.push({
          x, y: y + (isCan ? 0.1 : 0.1), z: z + 0.12 + R() * 0.12,
          s: 0.75 + R() * 0.55, h: isCan ? 1.0 : 0.9 + R() * 0.5,
          c: colors[(i + li * 3 + Math.round(z * 2)) % colors.length],
          can: isCan,
        });
      }
      const cans = items.filter((it) => it.can);
      const boxes = items.filter((it) => !it.can);
      for (const [geo, list] of [[boxGeo, boxes], [canGeo, cans]]) {
        if (!list.length) continue;
        const im = new THREE.InstancedMesh(geo, prodMat, list.length);
        const mtx = new THREE.Matrix4();
        list.forEach((it, i) => {
          const scale = geo === boxGeo ? new THREE.Vector3(0.24 * it.s, 0.2 * it.h, 0.18) : new THREE.Vector3(1, it.h, 1);
          mtx.compose(new THREE.Vector3(it.x, it.y, it.z), new THREE.Quaternion(), scale);
          im.setMatrixAt(i, mtx);
          im.setColorAt(i, new THREE.Color(it.c));
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.castShadow = false; im.receiveShadow = true;
        g.add(im);
      }
    }
    // 货架小牌
    const tags = ['おにぎり', 'パン', 'お菓子'];
    const tag = tags[Math.round(z * 2 + 10) % 3];
    plane(g, 0.7, 0.22, -3.04, 1.75, z + 0.42, lit('#ffffff', {
      map: decalTexture([tag], '#2c7a76', 40), transparent: true, toneMapped: false,
    }), { receive: false });
  }
  return { group: g, update() {} };
}

// ---------------- 收银台 ----------------
function buildCounter(parent, M) {
  const g = new THREE.Group();
  parent.add(g);
  // L 型柜台
  box(g, 1.0, 1.02, 3.0, 1.55, 0.87, -2.9, M.wood, { outline: 1.006 });
  box(g, 2.4, 1.02, 0.7, 0.6, 0.87, -4.35, M.wood, { outline: 1.006 });
  box(g, 1.02, 0.1, 3.02, 1.55, 1.4, -2.9, M.wood, { cast: false });
  box(g, 2.42, 0.1, 0.72, 0.6, 1.4, -4.35, M.wood, { cast: false });
  // 柜台面板
  box(g, 0.04, 0.5, 2.6, 1.03, 0.95, -2.9, M.teal, { cast: false });
  box(g, 2.4, 0.5, 0.04, 0.6, 0.95, -3.99, M.teal, { cast: false });
  // 收银机
  const reg = new THREE.Group();
  reg.position.set(1.5, 1.45, -2.5);
  g.add(reg);
  box(reg, 0.52, 0.16, 0.46, 0, 0.08, 0, M.dark, { outline: 1.01 });
  box(reg, 0.4, 0.3, 0.06, 0, 0.3, -0.16, M.dark, { rot: [-0.25, 0, 0] });
  plane(reg, 0.34, 0.22, 0, 0.3, -0.12, lit('#9be3cf'), { rot: [-0.25, 0, 0], receive: false });
  for (let i = 0; i < 9; i++) box(reg, 0.07, 0.02, 0.05, -0.15 + (i % 3) * 0.12, 0.17, 0.1 + Math.floor(i / 3) * 0.08, M.metal, { cast: false });
  // 客显
  box(g, 0.07, 0.5, 0.07, 1.5, 1.65, -3.9, M.metalDark, { cast: false });
  box(g, 0.5, 0.28, 0.06, 1.5, 1.88, -3.9, M.dark, { cast: false });
  plane(g, 0.44, 0.22, 1.5, 1.88, -3.86, lit('#9be3cf'), { receive: false });
  // 咖啡机
  const coffee = new THREE.Group();
  coffee.position.set(2.2, 1.45, -3.55);
  g.add(coffee);
  box(coffee, 0.48, 0.72, 0.44, 0, 0.36, 0, M.metalDark, { outline: 1.015 });
  box(coffee, 0.42, 0.26, 0.03, 0, 0.5, 0.225, M.screen, { cast: false });
  box(coffee, 0.16, 0.16, 0.16, 0, 0.16, 0.22, M.dark, { cast: false });
  for (let i = 0; i < 3; i++) cyl(coffee, 0.035, 0.035, 0.06, -0.1 + i * 0.1, 0.02, 0.16, M.cream, { seg: 8, cast: false });
  // 热食柜
  const warmer = new THREE.Group();
  warmer.position.set(1.45, 1.45, -4.0);
  g.add(warmer);
  box(warmer, 0.75, 0.38, 0.55, 0, 0.19, 0, M.cream, { outline: 1.01 });
  box(warmer, 0.65, 0.28, 0.45, 0, 0.22, 0, glass({ color: '#f8e6c8', opacity: 0.3 }), { cast: false });
  for (let i = 0; i < 4; i++) cyl(warmer, 0.06, 0.06, 0.3, -0.22 + i * 0.15, 0.2, 0, M.coral, { seg: 8, rot: [0, 0, Math.PI / 2], cast: false });
  // 小风扇
  const fan = new THREE.Group();
  fan.position.set(2.25, 1.52, -2.1);
  g.add(fan);
  cyl(fan, 0.1, 0.12, 0.06, 0, 0, 0, M.cream, { seg: 10 });
  box(fan, 0.3, 0.02, 0.02, 0, 0.34, 0, M.metalDark, { cast: false });
  const fanHead = new THREE.Group();
  fanHead.position.y = 0.35;
  fanHead.rotation.x = 0.16;
  g.add(fanHead);
  const blades = new THREE.Group();
  fanHead.add(blades);
  for (let i = 0; i < 4; i++) {
    const b = box(blades, 0.3, 0.15, 0.02, 0.14, 0, 0, M.cream, { cast: false });
    b.rotation.z = (i * Math.PI) / 2;
    b.position.set(Math.cos(i * Math.PI / 2) * 0.13, Math.sin(i * Math.PI / 2) * 0.13, 0);
  }
  const cage = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.018, 6, 20), M.metal);
  fanHead.add(cage);
  // 让 blades 旋转；cage 固定
  fanHead.position.y = 0.35;

  // 购物篮与小物
  box(g, 0.5, 0.3, 0.36, 0.65, 1.6, -3.2, M.coral, { cast: false, outline: 1.01 });
  cyl(g, 0.05, 0.06, 0.12, 0.75, 1.52, -2.9, M.cream, { seg: 8, cast: false });
  box(g, 0.3, 0.04, 0.22, 1.55, 1.47, -3.5, M.dark, { cast: false });

  // 柜台上方的菜单牌
  const menu = plane(g, 1.6, 0.5, 1.6, 2.55, -3.9, lit('#ffffff', { map: menuBoardTexture(), toneMapped: false }), { receive: false });
  box(g, 1.66, 0.56, 0.05, 1.6, 2.55, -3.93, M.woodDark, { cast: false });
  // 柜台上的彩色小物
  for (let i = 0; i < 4; i++) {
    box(g, 0.16, 0.22, 0.14, 0.85 + i * 0.2, 1.55, -2.0, [M.coral, M.mint, M.yellow, M.blue][i], { cast: false });
    box(g, 0.12, 0.04, 0.1, 0.85 + i * 0.2, 1.68, -2.0, M.cream, { cast: false });
  }
  // 柜台后的地面垫
  box(g, 2.4, 0.03, 1.6, 1.5, 0.375, -1.0, M.tealDark, { cast: false });

  return {
    group: g,
    fan: blades,
    update(t) {
      // 收银机屏幕呼吸
    },
  };
}

// ---------------- 冰淇淋柜 ----------------
function buildIceFreezer(parent, M) {
  const g = new THREE.Group();
  g.position.set(-7.1, 0.36, 0.55);
  parent.add(g);
  box(g, 2.1, 0.86, 1.1, 0, 0.43, 0, M.cream, { outline: 1.008 });
  box(g, 1.94, 0.1, 0.96, 0, 0.9, 0, lit('#dff8ff'), { cast: false });
  plane(g, 1.9, 0.92, 0, 0.905, 0, lit('#dff8ff', { transparent: true, opacity: 0.55 }), { rot: [-Math.PI / 2, 0, 0], receive: false });
  // 柜内冰淇淋
  for (let i = 0; i < 12; i++) {
    const x = -0.82 + (i % 6) * 0.28;
    const z = -0.28 + Math.floor(i / 6) * 0.3;
    box(g, 0.18, 0.14, 0.16, x, 0.78, z, pick(R, [M.peach, M.mint, M.blue, M.coral, M.yellow]), { cast: false });
  }
  // 价格牌
  box(g, 2.0, 0.1, 0.03, 0, 0.88, 0.56, M.teal, { cast: false });
  plane(g, 1.7, 0.2, 0, 0.88, 0.58, lit('#ffffff', { map: decalTexture(['アイス ・ 全品 10% OFF'], '#ffffff', 36), transparent: true, toneMapped: false }), { receive: false });
  // 顶部小招牌
  const sign = new THREE.Group();
  sign.position.set(0, 1.15, 0.62);
  g.add(sign);
  box(sign, 2.0, 0.34, 0.08, 0, 0, 0, M.coral, { cast: false });
  plane(sign, 1.9, 0.26, 0, 0, 0.05, lit('#ffffff', { map: decalTexture(['ICE CREAM'], '#ffffff', 70), transparent: true, toneMapped: false }), { receive: false });
  // 冷雾
  const mist = [];
  for (let i = 0; i < 4; i++) {
    const s = sprite(g, mistMap, '#d8f8ff', 0.5, -0.7 + i * 0.45, 0.7, 0.5, { opacity: 0.08 });
    s.material.blending = THREE.NormalBlending;
    s.userData = { ph: i * 1.3 };
    mist.push(s);
  }
  return g;
}

// ---------------- 夏日限定陈列 ----------------
function buildSummerDisplay(parent, M) {
  const g = new THREE.Group();
  g.position.set(-4.1, 0.36, 0.25);
  parent.add(g);
  // 两层桌台
  box(g, 2.3, 0.62, 0.9, 0, 0.31, 0, M.wood, { outline: 1.006 });
  box(g, 2.34, 0.06, 0.94, 0, 0.64, 0, M.cream, { cast: false });
  box(g, 1.4, 0.22, 0.7, 0, 0.77, -0.06, M.cream, { outline: 1.01 });
  // 烟花盒
  for (let i = 0; i < 4; i++) {
    const x = -0.85 + i * 0.24;
    cyl(g, 0.07, 0.08, 0.3, x, 0.82, 0.22, i % 2 ? M.coral : M.blue, { seg: 8, cast: false });
    cyl(g, 0.04, 0.04, 0.1, x, 1.02, 0.22, M.cream, { seg: 6, cast: false });
  }
  // 蚊香盒
  box(g, 0.34, 0.1, 0.28, 0.55, 0.72, 0.2, M.mint, { cast: false });
  // 防晒霜
  for (let i = 0; i < 3; i++) {
    cyl(g, 0.06, 0.07, 0.24, 0.78 + i * 0.14, 0.79, -0.12, [M.cream, M.peach, M.blue][i], { seg: 8, cast: false });
    cyl(g, 0.03, 0.03, 0.06, 0.78 + i * 0.14, 0.93, -0.12, M.teal, { seg: 6, cast: false });
  }
  // 沙滩球
  const ball = sph(g, 0.16, -0.55, 1.0, -0.2, M.cream, { seg: 14 });
  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.161, 0.03, 6, 12, Math.PI / 2), [M.coral, M.teal, M.yellow, M.blue][i]);
    band.rotation.set(i * 0.8, i * 1.2, 0.3);
    band.position.copy(ball.position);
    g.add(band);
  }
  // 游泳圈
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 8, 18), M.coral);
  ring.position.set(-0.2, 0.78, -0.12);
  ring.rotation.x = -Math.PI / 2;
  ring.castShadow = true;
  g.add(ring);
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.092, 6, 4, 0.5), M.cream);
    seg.position.copy(ring.position); seg.rotation.copy(ring.rotation); seg.rotation.z = i * 1.5;
    g.add(seg);
  }
  // 沙滩桶与小铲
  const bucket = cyl(g, 0.12, 0.1, 0.2, 0.25, 0.79, -0.2, M.blue, { seg: 10, cast: false });
  box(g, 0.05, 0.04, 0.28, 0.42, 0.77, -0.24, M.yellow, { cast: false, rot: [0, 0.3, 0] });
  // 陈列牌
  box(g, 0.7, 0.04, 0.4, 0, 0.73, 0.45, M.coral, { cast: false });
  plane(g, 0.66, 0.34, 0, 0.75, 0.66, lit('#ffffff', { map: decalTexture(['夏限定'], '#ffffff', 58), transparent: true, toneMapped: false }), { receive: false, rot: [-0.5, 0, 0] });
  return g;
}

// ---------------- 杂志架 ----------------
function buildMagazineRack(parent, M) {
  const g = new THREE.Group();
  g.position.set(1.65, 0.36, 0.5);
  g.rotation.y = -0.2;
  parent.add(g);
  box(g, 1.9, 0.9, 0.5, 0, 0.45, 0, M.wood, { outline: 1.006 });
  box(g, 1.9, 0.06, 0.52, 0, 0.93, 0, M.cream, { cast: false });
  const covers = magazineTextures();
  for (let i = 0; i < 6; i++) {
    const x = -0.78 + (i % 3) * 0.52;
    const y = 0.98 + Math.floor(i / 3) * 0.36;
    plane(g, 0.34, 0.45, x, y, 0.27, lit('#ffffff', { map: covers[i], toneMapped: false }), { rot: [-0.28, 0, 0], receive: false });
    box(g, 0.36, 0.02, 0.04, x, y - 0.24, 0.24, M.metal, { cast: false, rot: [-0.28, 0, 0] });
  }
  // 顶部标牌
  plane(g, 1.2, 0.22, 0, 1.45, 0.28, lit('#ffffff', { map: decalTexture(['雑誌・本'], '#2c7a76', 48), transparent: true, toneMapped: false }), { receive: false });
  return g;
}

// ---------------- 便当区 ----------------
function buildBentoCase(parent, M) {
  const g = new THREE.Group();
  g.position.set(-8.15, 0.36, -2.8);
  parent.add(g);
  box(g, 0.9, 0.62, 3.2, 0, 0.31, 0, M.cream, { outline: 1.006 });
  box(g, 0.94, 0.06, 3.24, 0, 0.64, 0, M.cream, { cast: false });
  // 三层便当
  for (let row = 0; row < 3; row++) {
    const z = -1.1 + row * 0.75;
    for (let i = 0; i < 3; i++) {
      const y = 0.66 + row * 0.12;
      box(g, 0.5, 0.1, 0.55, 0.1, 0.72, z - 0.2 + i * 0.22, M.cream, { cast: false });
      box(g, 0.3, 0.03, 0.24, 0.05, 0.78, z - 0.24 + i * 0.22, i % 2 ? M.coral : M.yellow, { cast: false });
      box(g, 0.2, 0.03, 0.16, 0.2, 0.78, z - 0.24 + i * 0.22, M.mint, { cast: false });
    }
  }
  // 饭团
  for (let i = 0; i < 5; i++) {
    const z = -0.9 + i * 0.4;
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.22, 3), M.cream);
    r.position.set(0.32, 0.78, z);
    r.rotation.y = Math.PI / 3;
    r.castShadow = false;
    g.add(r);
    box(g, 0.12, 0.1, 0.03, 0.32, 0.74, z + 0.13, M.dark, { cast: false });
  }
  // 标牌
  plane(g, 1.4, 0.3, 0.5, 0.55, 0.6, lit('#ffffff', { map: decalTexture(['おにぎり・お弁当'], '#2c7a76', 42), transparent: true, toneMapped: false }), { rot: [0, Math.PI / 2, 0], receive: false });
  return g;
}

// ---------------- 后场 ----------------
function buildBackroom(parent, M) {
  const g = new THREE.Group();
  parent.add(g);
  // 后门
  box(g, 0.08, 2.2, 1.0, -8.78, 1.45, -4.6, M.tealDark, { cast: false });
  box(g, 0.05, 0.5, 0.4, -8.74, 1.9, -4.6, lit('#cfe9e0'), { cast: false });
  box(g, 0.06, 0.05, 0.1, -8.73, 1.45, -4.2, M.metal, { cast: false });
  plane(g, 0.6, 0.18, -8.72, 2.45, -4.6, lit('#ffffff', { map: decalTexture(['STAFF ONLY'], '#ffffff', 38), transparent: true, toneMapped: false }), { rot: [0, Math.PI / 2, 0], receive: false });
  // 储物柜
  const lock = new THREE.Group();
  lock.position.set(-8.5, 0.36, -3.3);
  g.add(lock);
  box(lock, 0.5, 1.8, 1.0, 0, 0.9, 0, M.metal, { outline: 1.01 });
  for (let i = 0; i < 2; i++) {
    box(lock, 0.03, 0.82, 0.44, 0.27, 0.5, -0.23 + i * 0.46, M.metalDark, { cast: false });
    box(lock, 0.04, 0.08, 0.06, 0.3, 0.9, -0.23 + i * 0.46, M.metalDark, { cast: false });
  }
  // 拖把与水桶
  cyl(g, 0.18, 0.16, 0.4, -8.2, 0.56, -1.7, M.blue, { seg: 10, cast: false });
  cyl(g, 0.025, 0.025, 1.5, -8.2, 1.3, -1.7, M.wood, { seg: 6, cast: false });
  // 后场暖光
  const l = new THREE.PointLight('#ffd59b', 8, 4, 2);
  l.position.set(-8.0, 2.0, -3.8);
  g.add(l);
  return g;
}

// ---------------- 吊牌 ----------------
function buildHangingSigns(parent, M) {
  const defs = [
    ['おにぎり・お弁当', 'RICE & BENTO', '米', -6.4, -3.4],
    ['飲料・お酒', 'DRINKS', '飲', -3.8, -2.2],
    ['アイス・冷凍', 'FROZEN', '氷', -1.4, -1.2],
  ];
  for (const [main, sub, icon, x, z] of defs) {
    const g = new THREE.Group();
    g.position.set(x, 3.0, z);
    parent.add(g);
    // 吊线
    for (const sx of [-0.7, 0.7]) box(g, 0.012, 0.55, 0.012, sx, 0.3, 0, M.metal, { cast: false });
    plane(g, 1.8, 0.55, 0, 0, 0.03, lit('#ffffff', { map: aisleSignTexture(main, sub, icon), toneMapped: false }), { receive: false });
    box(g, 1.84, 0.59, 0.05, 0, 0, -0.01, M.cream, { cast: false });
  }
}

// ---------------- 店内海报 ----------------
function buildInteriorPosters(parent, M) {
  // 东墙菜单板
  const menu = new THREE.Group();
  menu.position.set(2.78, 2.0, -3.4);
  menu.rotation.y = -Math.PI / 2;
  parent.add(menu);
  plane(menu, 1.6, 1.6, 0, 0, 0.05, lit('#ffffff', { map: menuBoardTexture(), toneMapped: false }), { receive: false });
  box(menu, 1.7, 1.7, 0.06, 0, 0, 0, M.woodDark, { cast: false });
  // 海报：花火 / 夏祭
  const p1 = plane(parent, 0.9, 1.2, -8.72, 2.3, -1.1, lit('#ffffff', { map: posterFireworksTexture(), toneMapped: false }), { rot: [0, Math.PI / 2, 0], receive: false });
  const p2 = plane(parent, 0.9, 1.2, 2.72, 2.5, -1.9, lit('#ffffff', { map: posterFestivalTexture(), toneMapped: false }), { rot: [0, -Math.PI / 2, 0], receive: false });
  // 玻璃上的贴纸
  const decal = (tex, x, y, w, h) => {
    const p = plane(parent, w, h, x, y, 1.43, lit('#ffffff', { map: tex, transparent: true, toneMapped: false, depthWrite: false }), { receive: false });
    p.renderOrder = 5;
    return p;
  };
  decal(decalTexture(['冷やし中華', 'はじめました'], '#d95545', 56), -6.7, 2.5, 2.2, 1.1);
  decal(decalTexture(['夏の大感謝祭  SALE'], '#ffffff', 44), -7.35, 3.05, 2.2, 0.42);
  decal(decalTexture(['24H'], '#2c7a76', 96), 2.2, 2.9, 0.8, 0.6);
  decal(decalTexture(['ATM', 'コピー'], '#2c7a76', 64), 1.6, 2.0, 0.8, 0.7);
  // 小海报
  plane(parent, 0.75, 1.0, -5.35, 2.35, 1.44, lit('#ffffff', { map: posterIceTexture(), toneMapped: false }), { receive: false });
  plane(parent, 0.65, 0.86, 0.2, 2.45, 1.44, lit('#ffffff', { map: posterBeachTexture(), toneMapped: false }), { receive: false });
}

// ---------------- 北侧后墙（面朝海） ----------------
function buildBackWall(parent, M) {
  const z = -6.525;
  const northPlane = (w, h, x, y, tex, extra = {}) => {
    const p = plane(parent, w, h, x, y, z - 0.015, lit('#ffffff', { map: tex, toneMapped: false, ...extra }), { rot: [0, Math.PI, 0], receive: false });
    return p;
  };
  // 后门
  box(parent, 1.15, 2.18, 0.06, -5.5, 1.4, z, M.tealDark, { outline: 1.01 });
  box(parent, 0.62, 0.72, 0.04, -5.5, 1.86, z - 0.045, lit('#cfe9e0'), { cast: false });
  box(parent, 0.07, 0.22, 0.08, -5.5, 1.25, z - 0.08, M.metal, { cast: false });
  // 门头灯
  box(parent, 0.3, 0.1, 0.12, -5.5, 2.55, z - 0.06, M.metalDark, { cast: false });
  const lamp = sph(parent, 0.1, -5.5, 2.44, z - 0.08, lit('#ffd8a0'), { seg: 8, cast: false });
  const glow = sprite(parent, glowMap, '#ffd49a', 1.6, -5.5, 2.4, z - 0.25, { opacity: 0.5 });
  const backLight = new THREE.PointLight('#ffcf96', 7, 4.5, 2);
  backLight.position.set(-5.5, 2.3, z - 0.5);
  parent.add(backLight);
  // 后墙品牌小牌
  northPlane(2.6, 0.5, -1.2, 3.35, decalTexture(['NAGISA MART ・ 海辺店'], '#2c7a76', 46));
  // 后场小窗
  box(parent, 1.3, 0.8, 0.07, -0.3, 2.25, z, M.metalDark, { cast: false });
  northPlane(1.1, 0.62, -0.3, 2.25, decalTexture(['STAFF'], '#2c7a76', 56));
  // 通风百叶
  box(parent, 1.25, 0.72, 0.07, 1.9, 2.5, z, M.metalDark, { cast: false });
  for (let i = 0; i < 7; i++) box(parent, 1.12, 0.035, 0.03, 1.9, 2.22 + i * 0.09, z - 0.06, M.metal, { cast: false });
  // 落水管与支架
  cyl(parent, 0.055, 0.055, 3.7, 2.55, 1.95, z - 0.06, M.metalDark, { seg: 6, cast: false });
  for (const y of [0.4, 1.5, 2.6]) box(parent, 0.14, 0.04, 0.05, 2.55, y, z - 0.08, M.metalDark, { cast: false });
  // 墙脚的电表与软管
  box(parent, 0.5, 0.62, 0.16, 1.0, 0.62, z - 0.05, M.metal, { outline: 1.02 });
  box(parent, 0.22, 0.2, 0.02, 1.0, 0.7, z - 0.15, lit('#9be3cf'), { cast: false });
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 6, 14), M.metalDark);
  hose.position.set(-2.2, 0.55, z - 0.08);
  hose.rotation.y = Math.PI / 2;
  parent.add(hose);
  // 后门边的木箱与气瓶
  box(parent, 0.52, 0.36, 0.42, -7.1, 0.18, -7.0, M.wood, { outline: 1.02 });
  box(parent, 0.46, 0.32, 0.38, -7.1, 0.52, -7.0, M.wood, { outline: 1.02, rot: [0, 0.18, 0] });
  box(parent, 0.54, 0.03, 0.44, -7.1, 0.36, -7.0, M.woodDark, { cast: false });
  for (const [x, zz] of [[-6.4, -6.9], [-6.1, -7.15]]) {
    cyl(parent, 0.13, 0.14, 0.56, x, 0.28, zz, M.metal, { seg: 10 });
    cyl(parent, 0.13, 0.13, 0.07, x, 0.58, zz, M.coral, { seg: 10, cast: false });
    cyl(parent, 0.04, 0.04, 0.08, x, 0.66, zz, M.metalDark, { seg: 6, cast: false });
  }
  // 后墙根的小推车/拖把
  box(parent, 0.32, 0.5, 0.28, -8.2, 0.25, -6.85, M.blue, { cast: false });
  cyl(parent, 0.025, 0.025, 1.4, -8.2, 0.95, -6.85, M.wood, { seg: 6, cast: false });
  // 地面小石板
  box(parent, 2.2, 0.06, 1.0, -5.6, 0.03, -7.0, M.concrete, { cast: false });
}

// ---------------- 西侧墙（小巷一侧） ----------------
function buildSideWall(parent, M) {
  const wallX = -9.0;
  // 侧墙品牌灯箱
  const sign = new THREE.Group();
  sign.position.set(wallX - 0.012, 2.55, -0.4);
  sign.rotation.y = -Math.PI / 2;
  parent.add(sign);
  box(sign, 3.9, 1.02, 0.08, 0, 0, -0.02, M.cream, { outline: 1.008 });
  box(sign, 3.98, 0.1, 0.1, 0, 0.54, 0, M.coral, { cast: false });
  box(sign, 3.98, 0.08, 0.1, 0, -0.54, 0, M.teal, { cast: false });
  const face = plane(sign, 3.72, 0.92, 0, 0, 0.03, lit('#ffffff', { map: sideSignTexture(), toneMapped: false }), { receive: false });
  face.renderOrder = 3;
  const glow = sprite(sign, glowMap, '#ffe0ad', 3.6, 0, 0, 0.5, { opacity: 0.2 });
  glow.scale.set(5.0, 1.8, 1);
  // 墙面小灯
  box(parent, 0.12, 0.22, 0.12, wallX - 0.12, 3.45, -0.4, M.metalDark, { cast: false });
  const lampMat = lit('#ffd8a0');
  sph(parent, 0.12, wallX - 0.12, 3.34, -0.4, lampMat, { seg: 8, cast: false });
  const lampGlow = sprite(parent, glowMap, '#ffd49a', 1.6, wallX - 0.22, 3.28, -0.4, { opacity: 0.5 });
  const lampLight = new THREE.PointLight('#ffd09a', 9, 5, 2);
  lampLight.position.set(wallX - 0.4, 3.2, -0.4);
  parent.add(lampLight);
  // 落水管
  const pipe = cyl(parent, 0.055, 0.055, 3.8, wallX - 0.06, 2.0, 1.05, M.metalDark, { seg: 6, cast: false });
  for (const y of [0.45, 1.4, 2.4, 3.4]) {
    box(parent, 0.14, 0.04, 0.04, wallX - 0.1, y, 1.05, M.metalDark, { cast: false });
  }
  cyl(parent, 0.07, 0.07, 0.14, wallX - 0.06, 0.09, 1.05, M.metalDark, { seg: 6, cast: false });
  // 通风百叶
  box(parent, 0.07, 0.72, 1.1, wallX - 0.02, 3.15, -3.3, M.metalDark, { cast: false });
  for (let i = 0; i < 8; i++) {
    box(parent, 0.03, 0.04, 1.02, wallX - 0.06, 2.85 + i * 0.08, -3.3, M.metal, { cast: false });
  }
  // 电表箱
  box(parent, 0.14, 0.62, 0.52, wallX - 0.05, 1.42, -5.45, M.metal, { outline: 1.02 });
  box(parent, 0.03, 0.2, 0.26, wallX - 0.13, 1.5, -5.45, lit('#9be3cf'), { cast: false });
  // 后门（外侧）
  box(parent, 0.06, 2.1, 0.95, wallX - 0.02, 1.25, -4.35, M.tealDark, { outline: 1.01 });
  box(parent, 0.02, 0.32, 0.28, wallX - 0.06, 1.8, -4.35, lit('#cfe9e0'), { cast: false });
  box(parent, 0.06, 0.04, 0.12, wallX - 0.08, 1.2, -4.0, M.metal, { cast: false });
  plane(parent, 0.62, 0.15, wallX - 0.055, 2.42, -4.35, lit('#ffffff', { map: decalTexture(['STAFF ONLY'], '#ffffff', 34), transparent: true, toneMapped: false }), { rot: [0, -Math.PI / 2, 0], receive: false });
  // 侧墙海报
  plane(parent, 0.72, 0.96, wallX - 0.03, 2.15, -2.7, lit('#ffffff', { map: posterFestivalTexture(), toneMapped: false }), { rot: [0, -Math.PI / 2, 0], receive: false });
  // 墙根盆栽与木箱
  cyl(parent, 0.19, 0.15, 0.34, wallX - 0.28, 0.29, 0.6, M.coral, { seg: 10, cast: false });
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 4), i % 2 ? M.leaf : M.leafLight);
    leaf.position.set(wallX - 0.28 + Math.cos(i * 1.6) * 0.07, 0.55, 0.6 + Math.sin(i * 1.6) * 0.07);
    leaf.rotation.z = Math.cos(i * 1.6) * 0.35;
    leaf.castShadow = false;
    parent.add(leaf);
  }
}

// ---------------- 自动贩卖机 ----------------
function buildVending(parent, M) {
  const g = new THREE.Group();
  g.position.set(4.05, 0.12, 0.25);
  parent.add(g);
  box(g, 1.1, 1.95, 0.78, 0, 0.98, 0, toon('#2f7f8c'), { outline: 1.008 });
  const front = lit('#ffffff', { map: vendingFrontTexture(), toneMapped: false });
  plane(g, 0.94, 1.75, 0, 1.02, 0.4, front, { receive: false });
  // 侧面
  box(g, 0.06, 1.75, 0.6, -0.56, 1.02, 0, M.cream, { cast: false });
  // 顶部
  box(g, 1.14, 0.08, 0.82, 0, 1.99, 0, M.cream, { cast: false });
  // 底部取货口
  box(g, 0.8, 0.18, 0.3, 0, 0.25, 0.38, M.dark, { cast: false });
  // 夜光与点光
  const glow = sprite(g, glowMap, '#9fe8ff', 2.2, 0, 1.2, 0.45, { opacity: 0.3 });
  const l = new THREE.PointLight('#bfeaff', 9, 4.5, 2);
  l.position.set(0, 1.5, 0.6);
  g.add(l);
  // 旁边的回收箱
  box(g, 0.5, 0.7, 0.4, -0.9, 0.47, 0, M.blue, { outline: 1.01 });
  box(g, 0.36, 0.05, 0.3, -0.9, 0.8, 0, M.dark, { cast: false });
  return {
    group: g,
    update(t) {
      const k = 0.92 + 0.08 * Math.sin(t * 2.1) * Math.sin(t * 0.7 + 2);
      front.color.setScalar(k);
      glow.material.opacity = 0.24 + 0.06 * Math.sin(t * 1.7);
    },
  };
}

// ---------------- 分类垃圾桶 ----------------
function buildTrashBins(parent, M) {
  const g = new THREE.Group();
  g.position.set(2.55, 0.12, 2.25);
  parent.add(g);
  const defs = [
    ['burn', M.coral],
    ['plastic', M.blue],
    ['bottle', M.mint],
  ];
  defs.forEach(([kind, mat], i) => {
    const b = new THREE.Group();
    b.position.set(-0.55 + i * 0.55, 0, 0);
    g.add(b);
    box(b, 0.46, 0.72, 0.46, 0, 0.36, 0, mat, { outline: 1.025 });
    box(b, 0.5, 0.07, 0.5, 0, 0.75, 0, M.cream, { cast: false });
    box(b, 0.34, 0.12, 0.02, 0, 0.47, 0.235, M.cream, { cast: false });
    plane(b, 0.3, 0.1, 0, 0.47, 0.25, lit('#ffffff', { map: trashLabelTexture(kind), toneMapped: false }), { receive: false });
    // 投入口
    box(b, 0.26, 0.04, 0.06, 0, 0.72, 0.22, M.dark, { cast: false });
  });
  return g;
}

// ---------------- 自行车 ----------------
function buildBicycle(parent, M) {
  const g = new THREE.Group();
  g.position.set(-9.55, 0.12, -1.3);
  g.rotation.y = Math.PI / 2;
  g.rotation.z = 0.06;
  parent.add(g);

  const frame = toon('#d9b44a');
  const wheelGeo = new THREE.TorusGeometry(0.33, 0.035, 8, 20);
  const wheelMat = M.rubber;
  // 车轮沿 x 方向（旋转后贴墙）
  for (const x of [-0.55, 0.58]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, 0.36, 0);
    w.rotation.y = 0;
    w.castShadow = true;
    g.add(w);
    const hub = cyl(g, 0.04, 0.04, 0.06, x, 0.36, 0, M.metal, { seg: 8, rot: [Math.PI / 2, 0, 0], cast: false });
    for (let i = 0; i < 8; i++) {
      const s = box(g, 0.01, 0.62, 0.01, x, 0.36, 0, M.metal, { cast: false });
      s.rotation.z = (i / 8) * Math.PI;
    }
  }
  // 车架
  const tube = (x1, y1, x2, y2, r = 0.028) => {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const t = cyl(g, r, r, len, (x1 + x2) / 2, (y1 + y2) / 2, 0, frame, { seg: 7 });
    t.rotation.z = Math.atan2(dx, dy) * -1;
    return t;
  };
  tube(-0.55, 0.36, -0.05, 0.86);
  tube(-0.05, 0.86, 0.45, 0.86);
  tube(0.45, 0.86, 0.58, 0.36);
  tube(-0.55, 0.36, 0.05, 0.42);
  tube(0.05, 0.42, 0.45, 0.86);
  tube(0.45, 0.86, 0.5, 1.05);
  // 车把与座
  box(g, 0.06, 0.06, 0.45, 0.5, 1.06, 0, M.metalDark, { cast: false });
  box(g, 0.32, 0.07, 0.18, -0.08, 0.95, 0, M.dark, { cast: false });
  // 前筐
  const basket = new THREE.Group();
  basket.position.set(0.62, 0.9, 0);
  g.add(basket);
  box(basket, 0.36, 0.26, 0.3, 0, 0, 0, lit('#c8b184', { transparent: true, opacity: 0.6 }), { cast: false });
  for (let i = 0; i < 5; i++) box(basket, 0.01, 0.26, 0.3, -0.16 + i * 0.08, 0, 0, M.woodDark, { cast: false });
  for (let i = 0; i < 4; i++) box(basket, 0.36, 0.01, 0.01, 0, -0.1 + i * 0.07, 0.15, M.woodDark, { cast: false });
  // 筐里的甜瓜与纸袋
  sph(basket, 0.11, 0, 0.12, 0, toon('#9fc26a'), { seg: 10, cast: false });
  box(basket, 0.16, 0.2, 0.12, 0.08, 0.1, 0.02, M.cream, { cast: false });
  // 停车支架
  box(g, 0.03, 0.32, 0.03, -0.35, 0.16, 0.12, M.metalDark, { cast: false, rot: [0.2, 0, 0] });
  return { group: g, update() {} };
}

// ---------------- 冲浪板 ----------------
function buildSurfboards(parent, M) {
  // 墙边板架
  const rack = new THREE.Group();
  rack.position.set(-9.5, 0.12, -3.0);
  rack.rotation.y = 0.06;
  parent.add(rack);
  for (const z of [-0.7, 0.7]) {
    box(rack, 0.1, 1.9, 0.1, 0, 0.95, z, M.metalDark, { cast: false });
    box(rack, 0.5, 0.08, 0.08, 0.2, 1.6, z, M.metalDark, { cast: false });
  }
  const boardMat = [toon('#f3ead2'), toon('#e9a08c')];
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Group();
    b.position.set(0.2, 0.85, -0.35 + i * 0.7);
    b.rotation.z = i ? 0.12 : -0.1;
    rack.add(b);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 1.8, 6, 12), boardMat[i]);
    body.scale.set(1, 1, 0.24);
    body.castShadow = true;
    b.add(body);
    box(b, 0.05, 1.3, 0.02, 0, 0.1, 0.05, i ? M.cream : M.teal, { cast: false });
    box(b, 0.13, 0.18, 0.03, 0, 1.0, 0.05, M.coral, { cast: false });
  }
  // 店门口斜靠的冲浪板（带水光）
  const lean = new THREE.Group();
  lean.position.set(-3.4, 0.12, 1.72);
  lean.rotation.set(0.18, -0.25, 0.1);
  parent.add(lean);
  const board = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 2.1, 8, 14), new THREE.MeshPhysicalMaterial({
    color: '#f2e7cd', roughness: 0.18, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12,
  }));
  board.scale.set(1, 1, 0.22);
  board.position.y = 1.2;
  board.castShadow = true;
  lean.add(board);
  // 板上的珊瑚色条纹
  box(lean, 0.08, 1.75, 0.03, 0, 1.15, 0.06, M.coral, { cast: false });
  box(lean, 0.3, 0.22, 0.04, 0, 2.18, 0.055, M.teal, { cast: false });
  // 板尾鳍
  box(lean, 0.03, 0.22, 0.16, 0, 0.08, -0.05, M.dark, { cast: false });
  // 板边的水光
  plane(parent, 0.8, 1.4, -3.4, 0.126, 2.1, lit('#b8d8da', { transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false }), { rot: [-Math.PI / 2, 0, 0] });
}

// ---------------- 空调外机 ----------------
function buildAC(parent, M) {
  const g = new THREE.Group();
  parent.add(g);
  const units = [];
  for (let i = 0; i < 2; i++) {
    const u = new THREE.Group();
    u.position.set(-9.45, 0.5, -5.0 + i * 1.1);
    g.add(u);
    box(u, 0.32, 0.55, 0.8, 0, 0, 0, M.cream, { outline: 1.02 });
    const grille = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 14), M.metalDark);
    grille.rotation.y = Math.PI / 2;
    grille.position.x = 0.17;
    u.add(grille);
    const blade = new THREE.Group();
    blade.position.set(0.17, 0, 0);
    for (let k = 0; k < 3; k++) {
      const b = box(blade, 0.02, 0.3, 0.08, 0, 0, 0, M.metalDark, { cast: false });
      b.rotation.x = (k / 3) * Math.PI * 2;
      b.position.set(0, Math.sin((k / 3) * Math.PI * 2) * 0.08, Math.cos((k / 3) * Math.PI * 2) * 0.08);
    }
    u.add(blade);
    // 支架与滴水软管
    box(u, 0.4, 0.05, 0.1, 0, -0.32, 0, M.metal, { cast: false });
    cyl(u, 0.015, 0.015, 0.75, 0, -0.68, 0.2, M.cream, { seg: 5, cast: false });
    units.push(blade);
  }
  // 水滴（小水珠精灵/球）
  const drops = [];
  const dropMat = lit('#cfeff3');
  for (let i = 0; i < 6; i++) {
    const d = sph(g, 0.025, 0, 0, 0, dropMat, { seg: 6, cast: false });
    d.visible = false;
    drops.push({ mesh: d, y: 0, vy: 0, active: false, x: -9.45, z: -4.8 });
  }
  return {
    drops,
    spawn() {
      const d = drops.find((o) => !o.active);
      if (!d) return;
      d.active = true;
      d.mesh.visible = true;
      d.y = 0.38;
      d.vy = 0;
      d.mesh.position.set(d.x, d.y, d.z);
    },
    update(t, dt) {
      for (const d of drops) {
        if (!d.active) continue;
        d.vy -= 4.8 * dt;
        d.y += d.vy * dt;
        d.mesh.position.y = d.y;
        if (d.y < 0.13) {
          d.active = false;
          d.mesh.visible = false;
        }
      }
      // 风扇缓慢转动
      units.forEach((b, i) => { b.rotation.x += dt * (0.6 + i * 0.2); });
    },
  };
}

// ---------------- 风铃 ----------------
function buildWindChime(parent, M) {
  const g = new THREE.Group();
  g.position.set(-6.35, 3.42, 2.25);
  parent.add(g);
  // 顶部玻璃罩/挂盘
  cyl(g, 0.16, 0.12, 0.06, 0, 0, 0, M.cream, { seg: 12, cast: false });
  const bell = new THREE.Group();
  bell.position.y = -0.28;
  g.add(bell);
  sph(bell, 0.1, 0, 0, 0, glass({ color: '#cfeaf0', opacity: 0.55 }), { seg: 10, cast: false });
  cyl(bell, 0.015, 0.015, 0.06, 0, 0.1, 0, M.cream, { seg: 5, cast: false });
  const tubes = [];
  for (let i = 0; i < 3; i++) {
    const tube = new THREE.Group();
    tube.position.set(Math.cos(i * 2.1) * 0.12, -0.45 - i * 0.04, Math.sin(i * 2.1) * 0.12);
    g.add(tube);
    cyl(tube, 0.012, 0.012, 0.32, 0, -0.16, 0, glass({ color: '#dff2f5', opacity: 0.65 }), { seg: 6, cast: false });
    cyl(tube, 0.015, 0.015, 0.03, 0, 0, 0, M.cream, { seg: 5, cast: false });
    // 短纸片
    box(tube, 0.07, 0.12, 0.012, 0, -0.36, 0, M.cream, { cast: false });
    tubes.push(tube);
  }
  return { group: g, tubes, bell };
}

// ---------------- 门口细节 ----------------
function buildEntranceDetails(parent, M) {
  // 地垫
  const mat = new THREE.Group();
  mat.position.set(-0.8, 0.315, 2.05);
  parent.add(mat);
  box(mat, 2.0, 0.04, 1.1, 0, 0, 0, M.tealDark, { cast: false });
  for (let i = 0; i < 4; i++) box(mat, 1.85, 0.012, 0.13, 0, 0.026, -0.36 + i * 0.24, M.cream, { cast: false });
  // 沙滩拖鞋
  for (const [dx, dz, ry] of [[0.4, 0.1, 0.2], [0.62, 0.24, -0.1]]) {
    const s = new THREE.Group();
    s.position.set(-1.1 + dx, 0.325, 2.5 + dz);
    s.rotation.y = ry;
    parent.add(s);
    box(s, 0.11, 0.03, 0.26, 0, 0, 0, M.coral, { cast: false });
    box(s, 0.03, 0.02, 0.12, 0, 0.03, -0.04, M.cream, { cast: false, rot: [0.4, 0, 0] });
    box(s, 0.03, 0.02, 0.12, 0, 0.03, 0.04, M.cream, { cast: false, rot: [-0.4, 0, 0] });
  }

  // A 字营业牌
  const af = new THREE.Group();
  af.position.set(-4.4, 0.12, 3.1);
  af.rotation.y = 0.3;
  parent.add(af);
  for (const dz of [-0.16, 0.16]) {
    const panel = new THREE.Group();
    panel.position.z = dz;
    panel.rotation.x = dz > 0 ? -0.28 : 0.28;
    af.add(panel);
    box(panel, 0.56, 0.8, 0.04, 0, 0.4, 0, M.cream, { cast: false });
    plane(panel, 0.48, 0.68, 0, 0.4, dz > 0 ? 0.03 : -0.03, lit('#ffffff', {
      map: decalTexture(['営業中', 'OPEN'], '#2c7a76', 54), transparent: true, toneMapped: false,
    }), { rot: [0, dz > 0 ? 0 : Math.PI, 0], receive: false });
  }
  // 后巷的木箱
  box(parent, 0.5, 0.34, 0.42, -9.55, 0.29, 3.4, M.wood, { outline: 1.02 });
  box(parent, 0.44, 0.3, 0.38, -9.55, 0.62, 3.38, M.wood, { outline: 1.02, rot: [0, 0.2, 0] });
  box(parent, 0.5, 0.03, 0.42, -9.55, 0.47, 3.4, M.woodDark, { cast: false });

  // 门口小盆栽
  const pot = new THREE.Group();
  pot.position.set(0.95, 0.36, 1.85);
  parent.add(pot);
  cyl(pot, 0.2, 0.15, 0.3, 0, 0.15, 0, M.coral, { seg: 10, cast: false });
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.45, 4), i % 2 ? M.leaf : M.leafLight);
    leaf.position.set(Math.cos(i * 1.3) * 0.08, 0.45, Math.sin(i * 1.3) * 0.08);
    leaf.rotation.z = Math.cos(i * 1.3) * 0.4;
    leaf.rotation.x = Math.sin(i * 1.3) * 0.4;
    leaf.castShadow = false;
    pot.add(leaf);
  }
  // 软管水枪/水桶：生活痕迹
  box(parent, 0.34, 0.26, 0.3, -9.35, 0.25, 2.6, M.blue, { cast: false });
  // 门口侧面的小台阶与排水
  box(parent, 3.4, 0.06, 0.3, -0.8, 0.34, 1.62, M.concrete, { cast: false });
}
