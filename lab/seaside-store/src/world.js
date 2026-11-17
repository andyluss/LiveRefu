// world.js · 正方形微缩底座、街角道路、停车场、沙滩与浅海、灯塔与街道设施
import * as THREE from 'three';
import {
  toon, lit, glass, box, cyl, sph, plane, outline, sprite, sagLine, rng, pick, lerp, clamp,
  glowMap, mistMap, ringMap, noShadow, canvasTexture,
} from './kit.js';
import {
  asphaltTexture, concreteTexture, sandTexture, tileTexture, woodTexture,
  parkingSignTexture, roadSignTexture, plaqueTexture, posterFireworksTexture,
  posterFestivalTexture,
  posterHiyashiTexture, posterBeachTexture, posterNoticeTexture, corkTexture,
  sunfadedPoster, decalTexture,
} from './textures.js';
import { buildPuddle, reflectionStreak } from './water.js';

const R = rng(73);

export function buildWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // ---------------- 材质 ----------------
  const sandTex = sandTexture();
  const concreteTex = concreteTexture();
  const asphaltTex = asphaltTexture();
  const woodTex = woodTexture();
  const corkTex = corkTexture();
  const tileTex = tileTexture();

  const M = {
    sand: toon('#e9d1a6', { map: sandTex }),
    wetSand: toon('#b99a72', { map: sandTex }),
    asphalt: toon('#e0e9f4', { map: asphaltTex }),
    concrete: toon('#d9d0be', { map: concreteTex }),
    concreteDark: toon('#a9a394'),
    pavement: toon('#d5cebd', { map: concreteTex }),
    stone: toon('#9a9384'),
    stoneDark: toon('#6f766f'),
    wood: toon('#ffffff', { map: woodTex }),
    woodDark: toon('#7b5438'),
    woodPale: toon('#c7a97f'),
    slate: toon('#4d5a62'),
    soil: toon('#b99f7d'),
    white: toon('#f4efe2'),
    cream: toon('#f6ead0'),
    mint: toon('#8fc9b0'),
    teal: toon('#2b7a76'),
    coral: toon('#ec8269'),
    peach: toon('#ffc596'),
    metal: toon('#aebac0'),
    metalDark: toon('#5d6b72'),
    dark: toon('#2e3a40'),
    rubber: toon('#2b2f33'),
    glassBlue: glass({ color: '#b8e3e8', opacity: 0.18 }),
    windowDark: toon('#456a7c'),
    grass: toon('#6f8f60', { flat: true }),
    grassLight: toon('#88a970', { flat: true }),
    hedge: toon('#5c7f56', { flat: true }),
    leaf: toon('#5f8f63', { flat: true }),
    leafLight: toon('#7fae74', { flat: true }),
    trunk: toon('#7b5a40'),
    rock: toon('#767c78', { flat: true }),
    red: toon('#d9604f'),
    whiteLine: lit('#f6f2e4'),
    yellowLine: lit('#f3cf7a'),
    buoyRed: toon('#d95f53'),
    lighthouse: toon('#f4f0e4'),
    lighthouseRed: toon('#d96550'),
  };

  // ---------------- 底座 ----------------
  const base = new THREE.Group();
  group.add(base);

  // 胡桃木展示台
  box(base, 36.9, 0.55, 36.9, 0, -1.825, 0, toon('#8a6244'), { cast: false, outline: 1.006 });
  box(base, 36.4, 0.06, 36.4, 0, -1.56, 0, toon('#c7a264'), { cast: false });
  // 木台倒角线
  box(base, 36.95, 0.06, 36.95, 0, -1.59, 0, toon('#8a6748'), { cast: false });
  box(base, 36.95, 0.06, 36.95, 0, -2.06, 0, toon('#4e3525'), { cast: false });

  // 黄铜铭牌
  const plaque = plane(base, 9.6, 2.4, 0, -1.825, 18.462, lit('#ffffff', { map: plaqueTexture(), toneMapped: false }));
  plaque.castShadow = false;

  // 陆地：z -8..18
  box(base, 36, 1.1, 26, 0, -1.0, 5, M.slate, { cast: false });
  box(base, 36, 0.45, 26, 0, -0.225, 5, M.soil, { cast: false });
  // 沙滩：z -12..-8，低 0.3m
  box(base, 36, 0.75, 4.0, 0, -1.175, -10.0, M.slate, { cast: false });
  box(base, 36, 0.5, 4.0, 0, -0.55, -10.0, M.soil, { cast: false });
  // 海床
  box(base, 36, 0.5, 6.0, 0, -1.3, -15.0, M.slate, { cast: false });

  // 沙滩表层
  plane(base, 36, 3.95, 0, -0.294, -10.0, M.sand, { rot: [-Math.PI / 2, 0, 0] }).receiveShadow = true;
  // 湿沙带
  plane(base, 36, 0.8, 0, -0.291, -11.35, M.wetSand, { rot: [-Math.PI / 2, 0, 0], });
  // 从沙滩到水线的浅坡
  slopeStrip(base, 36, -11.2, -12.0, -0.294, -0.46, M.sand);
  // 海床表面
  plane(base, 36, 6.0, 0, -1.045, -15.0, toon('#b7a382', { map: sandTex }), { rot: [-Math.PI / 2, 0, 0] });

  // 街道地面
  // 主路（东西向）
  box(base, 36, 0.1, 6.0, 0, -0.046, 11.6, M.asphalt, { cast: false });
  // 侧路（南北向，只铺到交叉口以北）
  box(base, 6, 0.1, 11.2, 15, -0.046, 3.0, M.asphalt, { cast: false });
  // 店前人行道
  box(base, 20.8, 0.12, 5.6, 1.6, 0.06, 4.4, M.concrete, { cast: false });
  // 主路人行道
  box(base, 30, 0.12, 1.4, -3, 0.06, 7.9, M.concrete, { cast: false });
  // 黄色点状盲道（日本街道的日常细节）
  const tactileTex = canvasTexture(128, 32, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(240,203,100,.92)';
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.beginPath();
        ctx.arc(10 + i * 21, 9 + j * 14, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, { repeat: [30, 1] });
  const tactile = plane(base, 28, 0.34, -3.2, 0.126, 7.45, lit('#ffffff', {
    map: tactileTex, transparent: true, depthWrite: false, toneMapped: false,
  }), { rot: [-Math.PI / 2, 0, 0] });
  tactile.renderOrder = 2;
  const tactileBranch = plane(base, 0.34, 4.2, -0.8, 0.127, 5.1, lit('#ffffff', {
    map: tactileTex, transparent: true, depthWrite: false, toneMapped: false,
  }), { rot: [-Math.PI / 2, 0, 0] });
  tactileBranch.renderOrder = 2;
  // 南侧前庭
  box(base, 36, 0.12, 3.2, 0, 0.06, 16.2, M.concrete, { cast: false });
  // 停车场
  box(base, 7.5, 0.02, 5.6, 7.75, 0.12, 4.4, M.asphalt, { cast: false });
  // 小巷铺装
  box(base, 5.8, 0.08, 15.2, -12.5, 0.04, -0.4, M.pavement, { cast: false });
  // 西侧草地
  box(base, 2.6, 0.1, 15.2, -16.7, 0.04, -0.4, M.grass, { cast: false });
  // 东侧沙丘/草地
  box(base, 6, 0.1, 5.3, 15, 0.02, -5.35, M.grass, { cast: false });
  // 南侧草带
  box(base, 36, 0.1, 0.7, 0, 0.06, 17.4, M.grass, { cast: false });

  // 小巷中线排水沟
  box(base, 0.34, 0.03, 14.6, -12.5, 0.083, -0.4, M.metalDark, { cast: false });
  for (let z = -7; z < 7; z += 0.9) {
    box(base, 0.3, 0.012, 0.46, -12.5, 0.095, z, M.dark, { cast: false });
  }

  // 路面排水沟
  for (const x of [-1.2, 3.6, 9.2]) {
    box(base, 1.1, 0.02, 0.42, x, 0.012, 8.62, M.metalDark, { cast: false });
    for (let i = 0; i < 5; i++) box(base, 0.08, 0.012, 0.36, x - 0.42 + i * 0.2, 0.026, 8.62, M.dark, { cast: false });
  }
  // 井盖
  for (const [x, z] of [[2.4, 11.2], [-12.9, 1.6], [15.4, 0.2]]) {
    cyl(base, 0.46, 0.46, 0.02, x, 0.012, z, M.metalDark, { cast: false, seg: 24 });
    cyl(base, 0.38, 0.38, 0.025, x, 0.024, z, M.metal, { cast: false, seg: 24 });
  }

  // 路缘石
  const curb = (w, d, x, z, h = 0.14) => box(base, w, h, d, x, h / 2, z, M.stone, { cast: false });
  curb(25.6, 0.24, -5.2, 8.62);
  curb(1.0, 0.24, 11.7, 8.62);
  curb(0.24, 10.8, 11.88, 2.8);
  curb(24.0, 0.24, -6, 14.72);
  // 台阶式路缘（斑马线处下沉）
  box(base, 4.2, 0.05, 0.24, 8.8, 0.025, 8.62, M.stone, { cast: false });

  // ---------------- 道路标线 ----------------
  const whiteStrip = (w, d, x, z, rotY = 0, yy = 0.009) =>
    plane(base, w, d, x, yy, z, M.whiteLine, { rot: [-Math.PI / 2, 0, rotY] });

  // 主路中线（黄白虚线）
  for (let x = -17.2; x < 10.5; x += 3.0) whiteStrip(1.8, 0.16, x, 11.6);
  // 主路边线
  whiteStrip(34.4, 0.12, 0, 9.1); whiteStrip(34.4, 0.12, 0, 14.15);
  // 侧路中线
  for (let z = -2.0; z < 8.2; z += 3.0) whiteStrip(0.16, 1.8, 15, z);
  whiteStrip(0.12, 10.2, 12.35, 3.0);
  // 主路斑马线（x 7.2..10.8）
  for (let z = 8.95; z <= 14.15; z += 0.92) whiteStrip(3.5, 0.44, 9.0, z);
  // 侧路斑马线（z -0.8..2.2）
  for (let x = 12.35; x <= 17.65; x += 0.92) whiteStrip(0.44, 2.9, x, 0.7);
  // 停车位
  for (const x of [4.2, 6.7, 9.2, 11.55]) whiteStrip(0.12, 5.2, x, 4.35, 0, 0.135);
  whiteStrip(7.35, 0.1, 7.85, 6.9, 0, 0.135);
  // 停止线
  whiteStrip(5.2, 0.32, 15, 8.15);
  // 车止石
  for (const x of [5.45, 7.95, 10.4]) box(base, 0.5, 0.16, 0.24, x, 0.21, 6.55, M.concreteDark, { cast: false });

  // 停止线文字
  const tomare = plane(base, 2.6, 1.0, 15, 0.014, 5.6, lit('#ffffff', { map: decalTexture(['止まれ'], '#f2efe1', 92), transparent: true, depthWrite: false, toneMapped: false }), { rot: [-Math.PI / 2, 0, Math.PI] });
  tomare.renderOrder = 2;

  // ---------------- 岸线：矮墙、台阶、扶手、防波堤 ----------------
  // 高差挡墙（z=-8），中间留出台阶
  box(base, 3.8, 0.44, 0.4, -16.1, -0.08, -8.0, M.concreteDark, { cast: false });
  box(base, 25.6, 0.44, 0.4, 2.4, -0.08, -8.0, M.concreteDark, { cast: false });
  // 压顶
  box(base, 3.9, 0.08, 0.55, -16.1, 0.18, -8.0, M.stone, { cast: false });
  box(base, 25.7, 0.08, 0.55, 2.4, 0.18, -8.0, M.stone, { cast: false });

  // 木台阶（小巷尽头下到沙滩）
  const stepG = new THREE.Group();
  stepG.position.set(-12.5, 0, -8.0);
  group.add(stepG);
  for (let i = 0; i < 5; i++) {
    const y = 0.04 - i * 0.085;
    const z = -0.2 - i * 0.34;
    box(stepG, 3.5, 0.09, 0.36, 0, y, z, M.wood, { outline: 1.01 });
    // 侧板
    box(stepG, 0.12, 0.3 + i * 0.06, 0.36, -1.78, y - 0.12, z, M.woodDark, { cast: false });
    box(stepG, 0.12, 0.3 + i * 0.06, 0.36, 1.78, y - 0.12, z, M.woodDark, { cast: false });
  }
  // 台阶扶手
  for (const sx of [-1.86, 1.86]) {
    for (let i = 0; i < 2; i++) {
      const z = -0.3 - i * 0.55;
      const y = 0.55 - i * 0.11;
      cyl(stepG, 0.045, 0.05, 1.15, sx, y, z, M.woodDark, { seg: 8, outline: 1.05 });
    }
    const rail = box(stepG, 0.07, 0.07, 1.75, sx, 0.98, -0.9, M.wood, { rot: [Math.atan2(0.32, 1.7), 0, 0] });
  }

  // 岸边低矮金属扶手（台阶两侧）
  for (const [x0, x1] of [[-18, -14.35], [-10.65, 12]]) {
    const len = x1 - x0;
    if (len < 0.5) continue;
    for (let x = x0; x <= x1; x += 1.6) {
      cyl(base, 0.04, 0.05, 1.0, x, 0.62, -7.7, M.metal, { seg: 8 });
    }
    box(base, len, 0.06, 0.06, (x0 + x1) / 2, 1.1, -7.7, M.metal, { cast: false });
    box(base, len, 0.04, 0.04, (x0 + x1) / 2, 0.72, -7.7, M.metal, { cast: false });
  }

  // 防波堤（沙滩上，三段）
  for (const [x, w] of [[6.8, 4.2], [11.4, 3.6], [15.4, 2.6]]) {
    box(base, w, 0.58, 0.75, x, 0.0, -10.95, M.concreteDark, { outline: 1.01 });
    box(base, w + 0.1, 0.1, 0.85, x, 0.34, -10.95, M.stone, { cast: false });
  }
  // 消波块
  for (const [x, z, s, ry] of [[7.8, -12.35, 1.1, 0.4], [10.8, -12.75, 1.3, 1.1], [13.6, -12.4, 1.0, 2.2], [9.2, -12.85, 1.25, 0.7]]) {
    tetrapod(group, x, -0.28, z, s, M.rock, ry);
  }
  // 岸边礁石
  for (const [x, z, s, ry] of [[-11.5, -11.8, 0.8, 0.2], [8.2, -11.9, 0.7, 1.4], [9.4, -11.5, 0.45, 0.7]]) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), M.rock);
    rock.position.set(x, -0.2, z);
    rock.scale.set(1.2, 0.55, 0.9);
    rock.rotation.y = ry;
    rock.castShadow = true; rock.receiveShadow = true;
    group.add(rock);
  }

  // ---------------- 灯塔 ----------------
  const lighthouse = buildLighthouse(group, M);
  // 浮标
  const buoy = buildBuoy(group, M);
  // 海边长椅
  const bench = buildBench(group, 15.2, -4.5, 0.18, M);
  buildBench(group, -6.6, 16.3, 0.12, M);
  // 沙丘木栅栏
  for (let x = 12.6; x <= 17.4; x += 0.8) {
    box(group, 0.07, 0.8, 0.07, x, 0.22, -4.0, M.woodDark, { cast: false });
  }
  box(group, 5.0, 0.06, 0.06, 15, 0.56, -4.0, M.wood, { cast: false });
  box(group, 5.0, 0.06, 0.06, 15, 0.3, -4.0, M.wood, { cast: false });

  // 沙滩上的生活痕迹
  buildBeachDetails(group, M);

  // ---------------- 街道设施 ----------------
  const lamps = [];
  lamps.push(buildStreetLamp(group, -9.6, 6.2, 0.12, 5.0, M, 1.0));
  lamps.push(buildStreetLamp(group, -10.15, -7.2, 0.12, 4.2, M, 0.75));
  lamps.push(buildStreetLamp(group, 11.0, 2.6, 0.1, 4.4, M, 0.7));

  const poles = [];
  poles.push(buildUtilityPole(group, 5.9, 5.4, 8.3, M, 1));
  poles.push(buildUtilityPole(group, 13.5, 8.0, 8.7, M, 2));
  poles.push(buildUtilityPole(group, -14.6, 6.4, 8.2, M, 3));
  wirePoles(group, poles);

  const traffic = buildTrafficLight(group, 11.5, 9.2, M);
  buildCornerGuardrail(group, M);

  // 路牌
  buildRoadSigns(group, M);
  // 公告栏
  buildNoticeBoard(group, M, corkTex);
  // 路灯下的反光
  reflectionStreak(group, -9.6, 7.1, 1.5, 5.2, '#ffcf8f', 0.26);
  reflectionStreak(group, 9.0, 10.8, 1.5, 6.0, '#ffd7a2', 0.2);
  reflectionStreak(group, 5.9, 9.8, 0.8, 4.0, '#ffd1a0', 0.16);
  reflectionStreak(group, -2.0, 10.4, 3.0, 8.0, '#ffb27a', 0.075);
  reflectionStreak(group, -0.4, 10.2, 1.6, 6.0, '#9fd0e8', 0.05);
  reflectionStreak(group, -7.2, 16.0, 2.0, 4.5, '#ffd0a0', 0.12);

  // 树
  const trees = [];
  trees.push(palmTree(group, -14.5, -5.3, 5.8, M, 1));
  trees.push(palmTree(group, -14.7, 1.5, 4.9, M, 2));
  trees.push(palmTree(group, 14.3, -5.1, 5.2, M, 3));
  trees.push(pineTree(group, -15.5, 9.2, 5.0, M, 5));

  // 前景：两组低矮花池，不再用整齐的绿篱球
  buildPlanters(group, M);
  // 草丛（实例化）
  const tufts = [];
  const bladeGeo = new THREE.PlaneGeometry(0.055, 0.52);
  bladeGeo.translate(0, 0.26, 0);
  const bladeMat = toon('#7f9e68', { side: THREE.DoubleSide, flat: true });
  for (let i = 0; i < 260; i++) {
    let x, z, y;
    const zone = R();
    if (zone < 0.45) { x = 2.5 + R() * 9.0; z = -7.5 + R() * 3.4; y = 0.02; }
    else if (zone < 0.7) { x = -17.6 + R() * 2.6; z = -7.6 + R() * 14.5; y = 0.1; }
    else { x = -16.6 + R() * 26; z = 16.9 + R() * 0.9; y = 0.12; }
    if (x > 11.5 && z > -7.5 && z < 3.5) continue;
    tufts.push({ x, y, z, ry: R() * Math.PI, s: 0.5 + R() * 0.9 });
  }
  // 一株多叶，用 InstancedMesh 一次画完（避免上千个 draw call）
  const grass = new THREE.InstancedMesh(bladeGeo, bladeMat, tufts.length * 4);
  const gm = new THREE.Matrix4();
  const gq = new THREE.Quaternion();
  const ge = new THREE.Euler();
  const gs = new THREE.Vector3();
  const gp = new THREE.Vector3();
  const green = ['#7f9e68', '#8fae77', '#6f9160', '#9ab77d'];
  let gi = 0;
  for (const t of tufts) {
    for (let i = 0; i < 4; i++) {
      gp.set(t.x + (R() - 0.5) * 0.2, t.y, t.z + (R() - 0.5) * 0.2);
      ge.set((R() - 0.5) * 0.55, t.ry + R() * Math.PI, (R() - 0.5) * 0.5);
      gq.setFromEuler(ge);
      const sc = t.s * (0.7 + R() * 0.55);
      gs.set(sc, sc, sc);
      gm.compose(gp, gq, gs);
      grass.setMatrixAt(gi, gm);
      grass.setColorAt(gi, new THREE.Color(green[gi % green.length]));
      gi++;
    }
  }
  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  grass.castShadow = false;
  grass.receiveShadow = true;
  group.add(grass);

  // 小货车
  const truck = buildTruck(group, 7.1, 4.5, 0.13, M);

  // 积水
  const puddles = [
    buildPuddle(group, { x: -4.4, z: 4.9, rx: 1.5, rz: 0.8, y: 0.125, seed: 2, tint: '#ffb08a' }),
    buildPuddle(group, { x: 4.6, z: 10.4, rx: 2.1, rz: 1.0, y: 0.012, seed: 5, tint: '#e9a08c' }),
    buildPuddle(group, { x: -12.6, z: 1.2, rx: 1.1, rz: 2.2, y: 0.089, seed: 9, tint: '#e7a18c' }),
    buildPuddle(group, { x: -12.9, z: -5.6, rx: 0.9, rz: 1.2, y: 0.089, seed: 12, tint: '#d99c8e' }),
    buildPuddle(group, { x: -10.2, z: 16.35, rx: 1.3, rz: 0.55, y: 0.125, seed: 21, tint: '#ffb59a' }),
    buildPuddle(group, { x: -2.4, z: 12.3, rx: 1.5, rz: 0.7, y: 0.012, seed: 33, tint: '#ffaf92' }),
  ];

  // 车辙水光
  plane(base, 1.1, 3.4, 7.1, 0.111, 4.4, lit('#9bb6bc', { transparent: true, opacity: 0.08, depthWrite: false, toneMapped: false }), { rot: [-Math.PI / 2, 0, 0] });

  // 台阶处的小暖灯
  const stepLight = new THREE.PointLight('#ffd29a', 8, 5, 2);
  stepLight.position.set(-12.5, 1.2, -7.6);
  group.add(stepLight);

  // ---------------- 动效 ----------------
  const spin = { t: 0 };
  return {
    group,
    lighthouse,
    buoy,
    lamps,
    trees,
    truck,
    traffic,
    stepLight,
    update(t, dt) {
      for (const tr of trees) tr.update(t);
      traffic.update(t);
      lighthouse.update(t, dt);
      buoy.update(t);
      for (const p of puddles) p.update(t);
      // 招牌/路灯的轻微呼吸
      for (const l of lamps) l.update(t);
      truck.update(t);
    },
  };
}

// ---------------- 基础几何辅助 ----------------
function slopeStrip(parent, width, zNear, zFar, yNear, yFar, mat) {
  const hw = width / 2;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array([
    -hw, yNear, zNear, hw, yNear, zNear, hw, yFar, zFar, -hw, yFar, zFar,
  ]);
  const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function tetrapod(parent, x, y, z, s, mat, ry) {
  const g = new THREE.Group();
  const dirs = [
    new THREE.Vector3(1, 1, 1).normalize(),
    new THREE.Vector3(-1, 1, -1).normalize(),
    new THREE.Vector3(1, -1, -1).normalize(),
    new THREE.Vector3(-1, -1, 1).normalize(),
  ];
  for (const d of dirs) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.0, 6), mat);
    leg.position.copy(d).multiplyScalar(0.42);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    leg.castShadow = true; leg.receiveShadow = true;
    g.add(leg);
  }
  g.position.set(x, y, z);
  g.rotation.y = ry;
  g.scale.setScalar(s);
  parent.add(g);
  return g;
}

// ---------------- 灯塔 ----------------
function buildLighthouse(parent, M) {
  const g = new THREE.Group();
  g.position.set(-14.5, 0, -15.55);
  parent.add(g);

  // 礁石基座
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + R() * 0.3;
    const rr = 0.8 + R() * 0.8;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 + R() * 0.5, 0), M.rock);
    rock.position.set(Math.cos(a) * rr, -0.55 + R() * 0.55, Math.sin(a) * rr);
    rock.scale.set(1.2, 0.7, 1.0);
    rock.rotation.set(R(), R(), R());
    rock.castShadow = true; rock.receiveShadow = true;
    g.add(rock);
  }
  // 混凝土台
  cyl(g, 1.5, 1.75, 0.55, 0, 0.15, 0, M.concreteDark, { seg: 14, outline: 1.01 });
  cyl(g, 1.25, 1.35, 0.18, 0, 0.5, 0, M.stone, { seg: 14 });

  // 塔身
  const tower = cyl(g, 0.62, 0.95, 4.6, 0, 2.8, 0, M.lighthouse, { seg: 20, outline: 1.012 });
  // 红色环带
  cyl(g, 0.79, 0.85, 0.65, 0, 2.0, 0, M.lighthouseRed, { seg: 20, cast: false });
  cyl(g, 0.68, 0.72, 0.55, 0, 4.42, 0, M.lighthouseRed, { seg: 20, cast: false });
  // 小窗
  for (const y of [1.7, 3.3]) {
    box(g, 0.24, 0.4, 0.08, 0, y, 0.72, M.dark, { cast: false });
    box(g, 0.3, 0.46, 0.04, 0, y, 0.77, M.cream, { cast: false });
  }
  // 观景廊
  cyl(g, 1.15, 1.15, 0.16, 0, 5.16, 0, M.stone, { seg: 20, outline: 1.01 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    box(g, 0.04, 0.45, 0.04, Math.cos(a) * 1.05, 5.45, Math.sin(a) * 1.05, M.metalDark, { cast: false });
  }
  // 灯室
  cyl(g, 0.58, 0.58, 0.95, 0, 5.72, 0, glass({ color: '#ffe0a8', opacity: 0.35 }), { seg: 14, cast: false });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    box(g, 0.04, 0.95, 0.04, Math.cos(a) * 0.58, 5.72, Math.sin(a) * 0.58, M.metalDark, { cast: false });
  }
  // 灯芯
  const lampCore = sph(g, 0.3, 0, 5.72, 0, lit('#fff0c0'), { seg: 12, cast: false });
  const glow = sprite(g, glowMap, '#ffdca2', 4.0, 0, 5.72, 0, { opacity: 0.66 });
  // 屋顶
  cyl(g, 0.05, 0.9, 0.75, 0, 6.58, 0, M.lighthouseRed, { seg: 18, outline: 1.02 });
  sph(g, 0.1, 0, 7.02, 0, M.metalDark, { seg: 8 });

  // 旋转光束：从灯室水平扫过海面的三渲二体积光
  // 由四片绕光束轴旋转的楔形面组成，从任何水平视角都能看到柔和的光束，
  // 不再是贴在镜头上的平面贴图。
  const BEAM_LEN = 8.5;
  const BEAM_W = 2.7;
  const beamGroup = new THREE.Group();
  beamGroup.position.set(0, 5.72, 0);
  g.add(beamGroup);

  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, -0.045, 0, 0, 0.045, 0, BEAM_LEN, -BEAM_W / 2, 0, BEAM_LEN, BEAM_W / 2, 0,
  ]), 3));
  beamGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0, 1, 1, 0, 1, 1,
  ]), 2));
  beamGeo.setIndex([0, 1, 2, 1, 3, 2]);

  const beamUniforms = {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color('#fff1cd') },
    uColorB: { value: new THREE.Color('#ffb15f') },
    uOpacity: { value: 0.34 },
  };
  const beamMat = new THREE.ShaderMaterial({
    uniforms: beamUniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uOpacity;
      uniform vec3 uColorA, uColorB;
      varying vec2 vUv;
      void main() {
        float u = vUv.x;
        float edge = smoothstep(0.0, 0.17, vUv.y) * smoothstep(1.0, 0.83, vUv.y);
        float fade = smoothstep(0.0, 0.06, u) * pow(max(1.0 - u, 0.0), 1.35);
        float flick = 0.92 + 0.08 * sin(uTime * 1.7 + u * 7.0);
        vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 1.0, u));
        gl_FragColor = vec4(col, fade * edge * uOpacity * flick);
      }`,
  });
  for (let i = 0; i < 4; i++) {
    const bm = new THREE.Mesh(beamGeo, beamMat);
    bm.rotation.x = (i / 4) * Math.PI;
    bm.renderOrder = 9;
    beamGroup.add(bm);
  }

  const light = new THREE.PointLight('#ffdca2', 6, 14, 2);
  light.position.set(0, 5.8, 0);
  g.add(light);

  return {
    group: g,
    update(t, dt) {
      // 只在海面上方缓慢扫动，避免光束越过底座边缘
      beamGroup.rotation.y = Math.sin(t * 0.16) * 0.20;
      const pulse = 0.9 + Math.sin(t * 1.3) * 0.1;
      beamUniforms.uTime.value = t;
      beamUniforms.uOpacity.value = 0.34 * pulse;
      lampCore.material.color.setScalar(1);
      glow.material.opacity = 0.54 + Math.sin(t * 2.0) * 0.08;
    },
  };
}

// ---------------- 浮标 ----------------
function buildBuoy(parent, M) {
  const g = new THREE.Group();
  g.position.set(-10.8, -0.5, -15.2);
  parent.add(g);
  cyl(g, 0.28, 0.34, 1.05, 0, 0.3, 0, M.buoyRed, { seg: 12, outline: 1.03 });
  cyl(g, 0.29, 0.29, 0.22, 0, 0.63, 0, M.cream, { seg: 12, cast: false });
  cyl(g, 0.02, 0.02, 0.6, 0, 1.05, 0, M.metalDark, { seg: 6, cast: false });
  sph(g, 0.07, 0, 1.36, 0, M.coral, { seg: 8, cast: false });
  const glow = sprite(g, glowMap, '#ff9b7c', 0.7, 0, 0.7, 0, { opacity: 0.18 });
  return {
    group: g,
    update(t) {
      g.position.y = -0.5 + Math.sin(t * 1.1) * 0.05;
      g.rotation.z = Math.sin(t * 0.85) * 0.1;
      g.rotation.x = Math.cos(t * 0.7) * 0.06;
    },
  };
}

// ---------------- 前景花池 ----------------
function buildPlanters(parent, M) {
  const defs = [
    [-11.2, 2.9, 0.95],
    [6.8, 3.4, 1.0],
    [16.6, 1.6, 0.9],
  ];
  for (const [x, w, h] of defs) {
    const g = new THREE.Group();
    g.position.set(x, 0.12, 16.55);
    parent.add(g);
    box(g, w, 0.42, 0.8, 0, 0.21, 0, M.concrete, { outline: 1.01 });
    box(g, w - 0.12, 0.08, 0.68, 0, 0.44, 0, M.soil, { cast: false });
    const n = 3 + Math.floor(w);
    for (let i = 0; i < n; i++) {
      const s = 0.28 + R() * 0.2;
      const px = -w / 2 + 0.35 + (i / Math.max(1, n - 1)) * (w - 0.7);
      const bush = sph(g, s, px, 0.52 + R() * 0.12, (R() - 0.5) * 0.18, R() > 0.5 ? M.hedge : M.grassLight, { scale: [1.1, 0.9, 1.0], seg: 9, cast: false });
    }
    // 花池边沿的草
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.32, 4), M.grass);
      b.position.set((R() - 0.5) * (w - 0.4), 0.56, (R() - 0.5) * 0.5);
      b.castShadow = false;
      g.add(b);
    }
  }
}

// ---------------- 长椅 ----------------
function buildBench(parent, x, z, y, M) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  for (let i = 0; i < 4; i++) box(g, 2.2, 0.08, 0.16, 0, 0.5, -0.27 + i * 0.18, M.wood, { outline: 1.01 });
  for (let i = 0; i < 3; i++) box(g, 2.2, 0.16, 0.07, 0, 0.76 + i * 0.16, 0.34, M.wood, { outline: 1.01 });
  for (const sx of [-0.85, 0.85]) {
    box(g, 0.1, 0.52, 0.45, sx, 0.26, 0.02, M.metalDark);
    box(g, 0.1, 0.55, 0.08, sx, 0.78, 0.36, M.metalDark);
  }
  return g;
}

// ---------------- 沙滩小物 ----------------
function buildBeachDetails(parent, M) {
  // 救生圈：木柱 + 红白环
  const post = new THREE.Group();
  post.position.set(4.3, -0.3, -8.9);
  parent.add(post);
  box(post, 0.1, 1.45, 0.1, 0, 0.72, 0, M.woodDark, { outline: 1.02 });
  box(post, 0.7, 0.1, 0.08, 0.3, 1.42, 0, M.wood, { cast: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.085, 10, 24), M.cream);
  ring.position.set(0.3, 1.1, 0.02);
  ring.castShadow = true;
  post.add(ring);
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.088, 8, 6, Math.PI / 4), M.coral);
    seg.position.copy(ring.position); seg.position.z += 0.005;
    seg.rotation.z = i * Math.PI / 2;
    post.add(seg);
  }

  // 收起的沙滩伞
  const um = new THREE.Group();
  um.position.set(9.2, -0.3, -9.8);
  um.rotation.z = 0.2;
  parent.add(um);
  cyl(um, 0.035, 0.045, 2.0, 0, 1.0, 0, M.woodPale, { seg: 8 });
  const canopy = cyl(um, 0.05, 0.3, 1.55, 0, 1.1, 0, M.coral, { seg: 10, cast: false });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    box(um, 0.025, 1.45, 0.025, Math.cos(a) * 0.2, 1.12, Math.sin(a) * 0.2, M.cream, { cast: false });
  }
  cyl(um, 0.08, 0.1, 0.12, 0, 0.12, 0, M.woodDark, { seg: 8 });

  // 漂流木
  const log = cyl(parent, 0.11, 0.15, 2.2, 8.2, -0.18, -9.5, M.woodPale, { seg: 7 });
  log.rotation.z = Math.PI / 2; log.rotation.y = 0.4;

  // 贝壳、海玻璃
  const shellMat = [M.cream, M.peach, toon('#e7c9b4'), toon('#f3e3d0')];
  for (let i = 0; i < 26; i++) {
    const x = -16.5 + R() * 26, z = -11.6 + R() * 3.4;
    const s = 0.04 + R() * 0.06;
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 7, 5), pick(R, shellMat));
    m.position.set(x, -0.28, z);
    m.scale.set(1.4, 0.45, 1.0);
    m.rotation.y = R() * Math.PI;
    m.castShadow = false;
    parent.add(m);
  }
  const glassMat = [lit('#8fc9c0'), lit('#b8d98f'), lit('#f2c7a0'), lit('#a9c9e0')];
  for (let i = 0; i < 18; i++) {
    const x = -15.5 + R() * 24, z = -11.9 + R() * 3.7;
    const g = new THREE.Mesh(new THREE.TetrahedronGeometry(0.045 + R() * 0.04, 0), pick(R, glassMat));
    g.position.set(x, -0.275, z);
    g.rotation.set(R() * 3, R() * 3, R() * 3);
    g.castShadow = false;
    parent.add(g);
  }
  // 小水洼
  plane(parent, 0.5, 0.3, 5.0, -0.286, -11.2, lit('#bfe4e4', { transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }), { rot: [-Math.PI / 2, 0, 0] });

  // 湿沙上的脚印：有人刚刚走向海边
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const fx = -10.6 + t * 2.2 + (i % 2 ? 0.16 : -0.16);
    const fz = -9.0 - t * 1.5;
    const foot = new THREE.Mesh(new THREE.CircleGeometry(0.075, 7), toon('#b48a60'));
    foot.rotation.x = -Math.PI / 2;
    foot.scale.set(0.8, 1.5, 1);
    foot.position.set(fx, -0.283, fz);
    foot.receiveShadow = false;
    parent.add(foot);
  }
  // 海鸥（静止的两只）
  for (const [x, z, ry] of [[-13.2, -11.2, 0.3], [7.2, -10.7, -0.6]]) {
    const bird = new THREE.Group();
    bird.position.set(x, z === -10.7 ? 0.48 : -0.16, z);
    bird.rotation.y = ry;
    parent.add(bird);
    sph(bird, 0.16, 0, 0, 0, M.cream, { scale: [1.5, 1.0, 1.0], seg: 10 });
    sph(bird, 0.1, 0.2, 0.1, 0, M.cream, { seg: 8 });
    box(bird, 0.12, 0.035, 0.03, 0.31, 0.1, 0, lit('#e7a05c'), { cast: false });
    const wing = box(bird, 0.28, 0.03, 0.16, -0.05, 0.07, 0.1, M.stone, { cast: false, rot: [0, 0.2, 0] });
    box(bird, 0.28, 0.03, 0.16, -0.05, 0.07, -0.1, M.stone, { cast: false, rot: [0, -0.2, 0] });
    box(bird, 0.03, 0.14, 0.03, 0.02, -0.12, 0.05, lit('#e7a05c'), { cast: false });
    box(bird, 0.03, 0.14, 0.03, 0.02, -0.12, -0.05, lit('#e7a05c'), { cast: false });
  }
}

// ---------------- 路灯 ----------------
function buildStreetLamp(parent, x, z, y, h, M, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  parent.add(g);
  cyl(g, 0.09, 0.13, h, 0, h / 2, 0, M.metalDark, { seg: 10, outline: 1.03 });
  cyl(g, 0.2, 0.24, 0.14, 0, 0.07, 0, M.stone, { seg: 10, cast: false });
  // 弯臂
  const arm = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.06, 8, 16, Math.PI / 2), M.metalDark);
  arm.position.set(0.8, h - 0.8, 0);
  arm.rotation.z = Math.PI / 2;
  arm.castShadow = true;
  g.add(arm);
  box(g, 1.55, 0.08, 0.08, 0.75, h - 0.06, 0, M.metalDark);
  // 灯罩
  const shade = cyl(g, 0.22, 0.34, 0.38, 1.45, h - 0.22, 0, M.metalDark, { seg: 10, outline: 1.03 });
  const bulbMat = lit('#ffe4b0');
  cyl(g, 0.16, 0.16, 0.06, 1.45, h - 0.43, 0, bulbMat, { seg: 10, cast: false });
  const glow = sprite(g, glowMap, '#ffd79a', 2.2, 1.45, h - 0.45, 0, { opacity: 0.55 });
  const light = new THREE.PointLight('#ffd39a', 22, 9, 2);
  light.position.set(1.45, h - 0.5, 0);
  g.add(light);
  // 小广告牌
  if (scale > 0.9) {
    box(g, 0.5, 0.7, 0.05, 0, 2.4, 0.12, M.cream, { cast: false });
    plane(g, 0.42, 0.58, 0, 2.4, 0.15, lit('#ffffff', { map: decalTexture(['海', '辺'], '#2b7a76', 42), transparent: true, toneMapped: false }), { receive: false });
  }
  return {
    group: g,
    update(t) {
      const f = 0.96 + 0.04 * Math.sin(t * 7.3 + x) + 0.02 * Math.sin(t * 17.0 + z);
      light.intensity = 22 * f;
      glow.material.opacity = 0.55 * f;
    },
  };
}

// ---------------- 电线杆 ----------------
function buildUtilityPole(parent, x, z, h, M, seed) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  cyl(g, 0.15, 0.22, h, 0, h / 2, 0, toon('#b7afa2'), { seg: 10, outline: 1.02 });
  // 横担
  for (const yy of [h - 1.0, h - 1.9]) {
    box(g, 2.3, 0.12, 0.14, 0, yy, 0, M.woodDark, { cast: true });
    for (const sx of [-0.95, 0, 0.95]) {
      cyl(g, 0.06, 0.07, 0.18, sx, yy + 0.14, 0, M.cream, { seg: 8, cast: false });
    }
  }
  // 变压器
  if (seed === 1) {
    cyl(g, 0.3, 0.3, 0.85, 0.55, h - 3.0, 0.2, M.metal, { seg: 12, outline: 1.03 });
    box(g, 0.5, 0.12, 0.5, 0.55, h - 2.55, 0.2, M.metalDark, { cast: false });
  }
  // 爬梯与编号牌
  for (let i = 0; i < 6; i++) box(g, 0.5, 0.04, 0.04, 0, 2.0 + i * 0.6, 0.19, M.metalDark, { cast: false });
  box(g, 0.22, 0.4, 0.06, 0, 2.4, 0.22, M.cream, { cast: false });
  // 电线
  const lines = [];
  for (const sx of [-0.95, 0, 0.95]) lines.push({ x: sx, y: h - 0.86, z: 0 });
  for (const sx of [-0.95, 0.95]) lines.push({ x: sx, y: h - 1.76, z: 0 });
  return { group: g, x, z, h, lines, seed };
}

function wirePoles(parent, poles) {
  const pairs = [[poles[0], poles[1]], [poles[1], poles[2]]];
  for (const [a, b] of pairs) {
    for (let i = 0; i < 2; i++) {
      const la = a.lines[i], lb = b.lines[i];
      sagLine(parent, new THREE.Vector3(a.x + la.x, la.y, a.z + la.z), new THREE.Vector3(b.x + lb.x, lb.y, b.z + lb.z), 0.55 + i * 0.12, '#20262d', 26, 0.9);
    }
  }
}

// ---------------- 街角护栏 ----------------
function buildCornerGuardrail(parent, M) {
  const g = new THREE.Group();
  parent.add(g);
  const white = toon('#f1eee2');
  // 侧路西缘的一段白色人行护栏
  for (let z = -1.0; z <= 4.6; z += 1.4) {
    cyl(g, 0.035, 0.045, 1.0, 11.66, 0.62, z, white, { seg: 7, cast: false });
    cyl(g, 0.05, 0.05, 0.05, 11.66, 1.14, z, white, { seg: 7, cast: false });
  }
  box(g, 0.055, 0.05, 5.8, 11.66, 1.12, 1.8, white, { cast: false });
  box(g, 0.045, 0.04, 5.8, 11.66, 0.68, 1.8, white, { cast: false });
  // 转角处的一小段
  for (const x of [10.95, 11.65]) {
    cyl(g, 0.035, 0.045, 1.0, x, 0.62, 8.42, white, { seg: 7, cast: false });
    cyl(g, 0.05, 0.05, 0.05, x, 1.14, 8.42, white, { seg: 7, cast: false });
  }
  box(g, 0.8, 0.05, 0.055, 11.3, 1.12, 8.42, white, { cast: false });
  box(g, 0.8, 0.04, 0.045, 11.3, 0.68, 8.42, white, { cast: false });
  // 反光条
  for (const z of [-0.4, 2.2]) box(g, 0.06, 0.1, 0.12, 11.7, 0.95, z, M.coral, { cast: false });
}

// ---------------- 信号灯 ----------------
function buildTrafficLight(parent, x, z, M) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  cyl(g, 0.09, 0.12, 5.2, 0, 2.6, 0, M.metalDark, { seg: 10, outline: 1.02 });
  box(g, 2.4, 0.1, 0.1, -1.2, 5.05, 0, M.metalDark);
  // 横臂上的信号灯（面向南）
  const head = new THREE.Group();
  head.position.set(-2.1, 4.55, 0.1);
  g.add(head);
  box(head, 0.7, 1.8, 0.32, 0, 0, 0, M.metalDark, { outline: 1.02 });
  const lenses = [];
  const cols = ['#d85f54', '#e7c46d', '#7fc7a8'];
  for (let i = 0; i < 3; i++) {
    const mat = lit(cols[i]);
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), mat);
    l.position.set(0, 0.55 - i * 0.55, 0.17);
    head.add(l);
    lenses.push(l);
    box(head, 0.52, 0.12, 0.24, 0, 0.55 - i * 0.55 + 0.26, 0.14, M.metalDark, { cast: false, rot: [0.3, 0, 0] });
  }
  const glow = sprite(head, glowMap, '#8fe0b8', 1.4, 0, 0.4, 0.25, { opacity: 0.32 });
  lightOn(false, false, true, lenses, glow);
  // 行人灯
  box(g, 0.48, 0.9, 0.26, -0.75, 3.1, 0.1, M.metalDark, { cast: false });
  const ped = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), lit('#7fc7a8'));
  ped.position.set(-0.75, 3.2, 0.24); g.add(ped);

  let phase = 0;
  return {
    group: g,
    update(t) {
      const p = (t + 2.0) % 14;
      phase = p < 6 ? 0 : p < 7.2 ? 1 : 2;
      const [r, y, gg] = [phase === 0, phase === 1, phase === 2];
      lightOn(r, y, gg, lenses, glow);
      glow.material.color.set(gg ? '#8fe0b8' : y ? '#ffe1a0' : '#ff9e8f');
      ped.material.color.set(gg ? '#7fc7a8' : '#c46a5e');
    },
  };
  function lightOn(r, y, gg, lenses, glow) {
    const vals = [r, y, gg];
    lenses.forEach((l, i) => {
      l.material.color.set(vals[i] ? ['#ff8174', '#ffe08a', '#7ff0bd'][i] : '#2f3838');
      l.material.opacity = 1;
      l.material.transparent = false;
    });
    glow.visible = r || y || gg;
  }
}

// ---------------- 路牌与公告栏 ----------------
function buildRoadSigns(parent, M) {
  // 蓝色方向牌
  const g = new THREE.Group();
  g.position.set(10.4, 0.12, 7.9);
  parent.add(g);
  cyl(g, 0.07, 0.09, 3.6, 0, 1.8, 0, M.metal, { seg: 8 });
  const t1 = lit('#ffffff', { map: roadSignTexture('海浜公園', 'NAGISA BEACH PARK', '↑'), toneMapped: false });
  plane(g, 2.0, 0.75, 0, 3.2, 0.06, t1, {}).castShadow = false;
  box(g, 2.04, 0.79, 0.06, 0, 3.2, 0.02, M.metal, { cast: false });
  const t2 = lit('#ffffff', { map: roadSignTexture('灯台', 'LIGHTHOUSE  →', '→'), toneMapped: false });
  plane(g, 2.0, 0.75, 0, 2.35, 0.06, t2, {}).castShadow = false;
  box(g, 2.04, 0.79, 0.06, 0, 2.35, 0.02, M.metal, { cast: false });

  // 小巷口的木牌：海へ
  const seaSign = new THREE.Group();
  seaSign.position.set(-9.25, 0.12, 3.1);
  seaSign.rotation.y = 0.18;
  parent.add(seaSign);
  box(seaSign, 0.09, 2.1, 0.09, 0, 1.05, 0, M.woodDark, { outline: 1.02 });
  box(seaSign, 1.24, 0.44, 0.08, 0, 1.86, 0.03, M.cream, { outline: 1.01 });
  plane(seaSign, 1.16, 0.36, 0, 1.86, 0.08, lit('#ffffff', {
    map: decalTexture(['海へ  →'], '#2c7a76', 62), transparent: true, toneMapped: false,
  }), { receive: false });

  // 停车牌
  const p = new THREE.Group();
  p.position.set(4.15, 0.1, 2.0);
  parent.add(p);
  cyl(p, 0.05, 0.06, 2.3, 0, 1.15, 0, M.metal, { seg: 8 });
  plane(p, 0.7, 0.7, 0, 2.2, 0.04, lit('#ffffff', { map: parkingSignTexture(), toneMapped: false }), {});
  box(p, 0.74, 0.74, 0.05, 0, 2.2, 0, M.metal, { cast: false });
}

function buildNoticeBoard(parent, M, corkTex) {
  const g = new THREE.Group();
  g.position.set(-12.2, 0.12, 6.35);
  g.rotation.y = 0.35;
  parent.add(g);
  // 立柱
  for (const sx of [-1.55, 1.55]) {
    box(g, 0.14, 2.9, 0.14, sx, 1.45, 0, M.woodDark, { outline: 1.02 });
  }
  // 板面
  box(g, 3.5, 2.0, 0.12, 0, 2.0, 0, M.wood, { outline: 1.01 });
  plane(g, 3.2, 1.72, 0, 2.0, 0.075, lit('#ffffff', { map: corkTex, toneMapped: false }), {});
  // 小屋顶
  box(g, 3.9, 0.1, 0.5, 0, 3.12, 0.12, M.coral, { rot: [0.18, 0, 0] });
  // 四张海报
  const ps = [
    [posterFireworksTexture(), -0.75, 2.32, 0.86, 1.12],
    [posterFestivalTexture(), 0.35, 2.28, 0.86, 1.12],
    [posterHiyashiTexture(), -0.75, 1.5, 0.7, 0.9],
    [posterBeachTexture(), 0.35, 1.48, 0.7, 0.9],
  ];
  ps.forEach(([tex, x, y, w, h], i) => {
    plane(g, w, h, x, y, 0.083, lit('#ffffff', { map: tex, toneMapped: false }), { rot: [0, 0, (i % 2 ? 1 : -1) * 0.012] });
  });
  // 图钉
  for (const [x, y] of [[-0.75, 2.85], [0.35, 2.8], [-0.75, 1.92], [0.35, 1.9]]) {
    sph(g, 0.035, x, y, 0.1, M.coral, { seg: 6, cast: false });
  }
}

// ---------------- 植物 ----------------
function palmLeafGeometry(len, width) {
  const seg = 10;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const x = t * len;
    const y = -Math.pow(t, 1.75) * 0.72 * len;
    const w = Math.sin(Math.PI * Math.min(1, t * 1.12)) * width;
    pos.push(x, y, -w, x, y, w);
    uv.push(t, 0, t, 1);
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function palmTree(parent, x, z, h, M, seed) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  const r = rng(seed * 31 + 7);
  // 弯曲树干
  const segs = 9;
  let px = 0, py = 0, pz = 0;
  const lean = 0.12 + r() * 0.12;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const nx = Math.sin(t * 1.7) * h * lean;
    const ny = t * h * 0.97;
    const nz = Math.sin(t * 1.1) * h * 0.05;
    const mid = new THREE.Vector3((px + nx) / 2, (py + ny) / 2, (pz + nz) / 2);
    const dir = new THREE.Vector3(nx - px, ny - py, nz - pz);
    const len = dir.length();
    const c = cyl(g, 0.15 - t * 0.06, 0.2 - t * 0.06, len, mid.x, mid.y, mid.z, M.trunk, { seg: 8, outline: 1.025 });
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    if (i % 2 === 0) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17 - t * 0.06, 0.014, 4, 8), M.woodDark);
      ring.position.copy(mid); ring.quaternion.copy(c.quaternion);
      g.add(ring);
    }
    px = nx; py = ny; pz = nz;
  }
  // 树冠
  const crown = new THREE.Group();
  crown.position.set(px, py, pz);
  g.add(crown);
  sph(crown, 0.22, 0, 0, 0, toon('#6f8f5b'), { seg: 9, cast: false });
  const leafMats = [toon('#5f8f63', { side: THREE.DoubleSide }), toon('#7fae74', { side: THREE.DoubleSide }), toon('#4f7d58', { side: THREE.DoubleSide })];
  const N = 11;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + r() * 0.35;
    const len = 2.3 + r() * 1.1;
    const width = 0.28 + r() * 0.14;
    const frond = new THREE.Mesh(palmLeafGeometry(len, width), leafMats[i % leafMats.length]);
    frond.position.set(0, 0.04, 0);
    frond.rotation.y = a;
    frond.rotation.z = i < 4 ? 0.25 + r() * 0.25 : -0.02 + r() * 0.12;
    frond.castShadow = true;
    crown.add(frond);
    // 叶脉
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, len * 0.95, 4), M.leaf);
    rib.rotation.z = Math.PI / 2;
    rib.position.set(len / 2, -0.18, 0);
    rib.rotation.y = 0;
    // 简化：把脉放在叶下
    crown.add(rib);
    rib.position.set(Math.cos(a) * len / 2, -0.22, -Math.sin(a) * len / 2);
    rib.rotation.set(0, -a, Math.PI / 2 - 0.12);
  }
  // 椰子
  for (let i = 0; i < 3; i++) {
    sph(crown, 0.11, (r() - 0.5) * 0.3, -0.14, (r() - 0.5) * 0.3, M.woodDark, { seg: 8 });
  }
  // 基部草丛
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), M.grass);
    b.position.set((r() - 0.5) * 0.9, 0.2, (r() - 0.5) * 0.9);
    b.rotation.z = (r() - 0.5) * 0.5;
    g.add(b);
  }
  return {
    group: g,
    update(t) {
      crown.rotation.z = Math.sin(t * 0.55 + seed) * 0.035 + 0.045;
      crown.rotation.x = Math.cos(t * 0.43 + seed) * 0.025;
    },
  };
}

function pineTree(parent, x, z, h, M, seed) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  cyl(g, 0.16, 0.28, h * 0.55, 0, h * 0.28, 0, M.trunk, { seg: 8, outline: 1.02 });
  const crown = new THREE.Group();
  crown.position.y = h * 0.35;
  g.add(crown);
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const rad = 1.55 * (1 - t * 0.72);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, 1.35, 9), i % 2 ? M.leaf : M.leafLight);
    cone.position.set(Math.sin(t * 3 + seed) * 0.2, t * h * 0.52 + 0.4, Math.cos(t * 2) * 0.15);
    cone.castShadow = true; cone.receiveShadow = true;
    crown.add(cone);
  }
  // 几簇松针
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 5), M.leaf);
    b.position.set((R() - 0.5) * 1.5, h * 0.5 + R() * 1.2, (R() - 0.5) * 1.2);
    b.rotation.z = (R() - 0.5) * 1.2;
    crown.add(b);
  }
  return {
    group: g,
    update(t) {
      crown.rotation.z = Math.sin(t * 0.5 + seed) * 0.03;
    },
  };
}

// ---------------- 小货车 ----------------
function buildTruck(parent, x, z, ry, M, y = 0.13) {
  const g = new THREE.Group();
  g.position.set(x, y || 0.13, z);
  g.rotation.y = ry;
  parent.add(g);

  const body = toon('#a9d4e0');
  const bodyDark = toon('#8bbcc9');
  const cream = toon('#f3ecda');

  // 底盘
  box(g, 3.3, 0.2, 1.42, 0, 0.45, 0, M.metalDark, { outline: 1.01 });
  // 车斗
  box(g, 1.75, 0.55, 1.42, -0.65, 0.78, 0, body, { outline: 1.015 });
  box(g, 1.75, 0.08, 1.46, -0.65, 1.06, 0, bodyDark, { cast: false });
  // 车斗内货物：保温箱和折叠椅
  box(g, 0.6, 0.42, 0.7, -0.95, 1.12, 0, M.cream, { outline: 1.02 });
  box(g, 0.6, 0.06, 0.7, -0.95, 1.35, 0, M.coral, { cast: false });
  box(g, 0.5, 0.2, 0.45, -0.3, 1.16, 0.1, M.mint, { cast: false });
  box(g, 0.12, 0.6, 0.12, -0.15, 1.32, -0.4, M.metalDark, { cast: false });
  // 驾驶室
  box(g, 1.35, 1.0, 1.42, 1.0, 1.0, 0, body, { outline: 1.015 });
  // 车窗
  box(g, 0.05, 0.52, 1.18, 1.69, 1.26, 0, M.windowDark, { cast: false, outline: 1.01 });
  box(g, 0.62, 0.48, 0.04, 1.0, 1.25, 0.72, M.windowDark, { cast: false });
  box(g, 0.62, 0.48, 0.04, 1.0, 1.25, -0.72, M.windowDark, { cast: false });
  // 车顶
  box(g, 1.35, 0.1, 1.46, 1.0, 1.53, 0, cream, { cast: false });
  // 前脸
  box(g, 0.1, 0.5, 1.3, 1.71, 0.82, 0, bodyDark, { cast: false });
  for (const sz of [-0.48, 0.48]) {
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), lit('#fff3c8'));
    hl.position.set(1.77, 0.86, sz); hl.rotation.y = Math.PI / 2; g.add(hl);
    const tl = new THREE.Mesh(new THREE.CircleGeometry(0.08, 10), lit('#ef7c6c'));
    tl.position.set(-1.53, 0.9, sz); tl.rotation.y = -Math.PI / 2; g.add(tl);
  }
  // 保险杠
  box(g, 0.12, 0.16, 1.5, 1.78, 0.55, 0, M.metal, { cast: false });
  box(g, 0.12, 0.16, 1.5, -1.55, 0.55, 0, M.metal, { cast: false });
  // 轮子
  for (const [wx, wz] of [[1.0, 0.72], [1.0, -0.72], [-0.95, 0.72], [-0.95, -0.72]]) {
    const wheel = cyl(g, 0.34, 0.34, 0.24, wx, 0.34, wz, M.rubber, { seg: 14, rot: [Math.PI / 2, 0, 0], outline: 1.02 });
    cyl(g, 0.18, 0.18, 0.26, wx, 0.34, wz, M.metal, { seg: 10, rot: [Math.PI / 2, 0, 0], cast: false });
  }
  // 后视镜
  for (const sz of [-0.82, 0.82]) {
    box(g, 0.04, 0.2, 0.04, 1.55, 1.3, sz, M.metalDark, { cast: false });
    box(g, 0.12, 0.2, 0.08, 1.55, 1.38, sz * 1.06, M.bodyDark || M.metalDark, { cast: false });
  }
  // 车牌
  plane(g, 0.32, 0.16, 1.8, 0.64, 0, lit('#f4f0dc'), { rot: [0, Math.PI / 2, 0] });
  // 轮后的湿痕
  plane(g, 0.45, 3.5, 0.8, 0.004, 0, lit('#8faeb4', { transparent: true, opacity: 0.11, depthWrite: false, toneMapped: false }), { rot: [-Math.PI / 2, 0, 0] });
  return {
    group: g,
    update(t) {
      // 停着的车：只有极轻的悬挂呼吸，避免死板
      g.position.y = 0.13 + Math.sin(t * 0.9) * 0.002;
    },
  };
}
