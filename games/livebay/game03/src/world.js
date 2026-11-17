// Slow Cabin · 三层大宅
// 坐标：x -11..11，z -8..8；每层 3.2m。房间是半开放布局，门洞不装门，方便自由走动。
import * as THREE from 'three';

export const FLOOR_H = 3.2;
export const EYE = 1.62;
export const FLOORS = 3;

export const ROOMS = [
  { id: 'foyer', floor: 0, name: '门厅', x0: -3.5, x1: 3.5, z0: 3, z1: 8 },
  { id: 'living', floor: 0, name: '客厅', x0: -11, x1: -3.5, z0: 2, z1: 8 },
  { id: 'kitchen', floor: 0, name: '厨房 / 餐区', x0: 3.5, x1: 11, z0: 2, z1: 8 },
  { id: 'hall', floor: 0, name: '中央走廊', x0: -3.5, x1: 3.5, z0: -2, z1: 3 },
  { id: 'bath', floor: 0, name: '浴室', x0: 7, x1: 11, z0: -8, z1: -2 },
  { id: 'guest', floor: 0, name: '客房', x0: -11, x1: -7, z0: -8, z1: -2 },
  { id: 'north', floor: 0, name: '北廊', x0: -7, x1: 7, z0: -8, z1: -2 },
  { id: 'study', floor: 1, name: '书房', x0: -11, x1: -3.5, z0: 2, z1: 8 },
  { id: 'library', floor: 1, name: '图书室', x0: -11, x1: -3.5, z0: -8, z1: 2 },
  { id: 'bedroom', floor: 1, name: '卧室', x0: 3.5, x1: 11, z0: 2, z1: 8 },
  { id: 'bath1', floor: 1, name: '二层浴室', x0: 7, x1: 11, z0: -8, z1: -2 },
  { id: 'landing1', floor: 1, name: '二层楼梯厅', x0: -3.5, x1: 7, z0: -2, z1: 2 },
  { id: 'observatory', floor: 2, name: '观星室', x0: -11, x1: -3.5, z0: -8, z1: 2 },
  { id: 'greenhouse', floor: 2, name: '温室', x0: -11, x1: -3.5, z0: 2, z1: 8 },
  { id: 'music', floor: 2, name: '音乐室', x0: 3.5, x1: 11, z0: -8, z1: 2 },
  { id: 'lounge', floor: 2, name: '顶层休息区', x0: 3.5, x1: 11, z0: 2, z1: 8 },
  { id: 'landing2', floor: 2, name: '三层楼梯厅', x0: -3.5, x1: 3.5, z0: -2, z1: 2 },
];

export const STAIRS = [
  { id: 'east', from: 0, to: 1, x0: 8.5, x1: 10.5, zBottom: -2, zTop: 3 },
  { id: 'west', from: 1, to: 2, x0: -10.5, x1: -8.5, zBottom: 3, zTop: -2 },
];

export function buildWorld() {
  const group = new THREE.Group();
  const colliders = [[], [], []];
  const lights = [];
  const fixtures = {};
  const interactables = {};

  const mat = (color, roughness = .86, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const M = {
    wall: mat('#ddd3bf', .93), wall2: mat('#c9c0ae', .95), floor: mat('#6e4b36', .8),
    floor2: mat('#7c573e', .8), wood: mat('#5c3d2e', .78), wood2: mat('#8a6243', .72),
    dark: mat('#1c2522', .8), metal: mat('#919181', .35, .65), brass: mat('#b98c4f', .3, .65),
    cream: mat('#eee2ca', .9), sage: mat('#7d9872', .9), leaf: mat('#5f8a5d', .92),
    leaf2: mat('#88a977', .92), cat: mat('#b58a63', .96), catDark: mat('#5d4532', .96),
    rug: mat('#933f36', 1), rug2: mat('#bd7050', 1), blue: mat('#456172', .8),
    glass: new THREE.MeshPhysicalMaterial({ color: '#9fc6c9', transparent: true, opacity: .14, roughness: .1 }),
  };

  const box = (w, h, d, m, x, y, z, parent = group, shadow = true) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); b.castShadow = shadow; b.receiveShadow = true; parent.add(b); return b;
  };
  const cyl = (rt, rb, h, m, x, y, z, parent = group, seg = 16) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
    c.position.set(x, y, z); c.castShadow = true; c.receiveShadow = true; parent.add(c); return c;
  };
  const sph = (r, m, x, y, z, parent = group) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m);
    s.position.set(x, y, z); s.castShadow = true; s.receiveShadow = true; parent.add(s); return s;
  };
  const mark = (obj, key) => { obj.userData.interact = key; obj.traverse(o => { o.userData.interact = key; }); interactables[key] = obj; return obj; };
  const collide = (floor, x0, x1, z0, z1) => colliders[floor].push({ x0, x1, z0, z1 });

  const base = (f) => f * FLOOR_H;

  // floor slabs（二层/三层留出楼梯洞）
  function slabRect(f, x0, x1, z0, z1) {
    box(x1 - x0, .16, z1 - z0, f === 1 ? M.floor2 : M.floor, (x0 + x1) / 2, base(f) - .08, (z0 + z1) / 2);
  }
  slabRect(0, -11, 11, -8, 8);
  slabRect(1, -11, 8.5, -8, 8); slabRect(1, 10.5, 11, -8, 8);
  slabRect(1, 8.5, 10.5, -8, -2); slabRect(1, 8.5, 10.5, 3, 8);
  slabRect(2, -11, -10.5, -8, 8); slabRect(2, -8.5, 11, -8, 8);
  slabRect(2, -10.5, -8.5, -8, -2); slabRect(2, -10.5, -8.5, 3, 8);

  // walls with door gaps
  function wallX(f, x, z0, z1, gaps = []) {
    let cuts = [[z0, z1]];
    for (const [a, b] of gaps) {
      const next = [];
      for (const [s, e] of cuts) {
        if (b <= s || a >= e) { next.push([s, e]); continue; }
        if (a > s) next.push([s, a]);
        if (b < e) next.push([b, e]);
      }
      cuts = next;
    }
    for (const [a, b] of cuts) {
      if (b - a < .05) continue;
      box(.18, FLOOR_H, b - a, M.wall2, x, base(f) + FLOOR_H / 2, (a + b) / 2);
      collide(f, x - .14, x + .14, a, b);
    }
  }
  function wallZ(f, z, x0, x1, gaps = []) {
    let cuts = [[x0, x1]];
    for (const [a, b] of gaps) {
      const next = [];
      for (const [s, e] of cuts) {
        if (b <= s || a >= e) { next.push([s, e]); continue; }
        if (a > s) next.push([s, a]);
        if (b < e) next.push([b, e]);
      }
      cuts = next;
    }
    for (const [a, b] of cuts) {
      if (b - a < .05) continue;
      box(b - a, FLOOR_H, .18, M.wall2, (a + b) / 2, base(f) + FLOOR_H / 2, z);
      collide(f, a, b, z - .14, z + .14);
    }
  }

  for (let f = 0; f < FLOORS; f++) {
    // 外墙
    wallZ(f, -8, -11, 11); wallZ(f, 8, -11, 11);
    wallX(f, -11, -8, 8); wallX(f, 11, -8, 8);
  }
  // 一层隔断（门洞）
  wallX(0, -3.5, 2, 8, [[3.2, 6.8]]);
  wallX(0, 3.5, 2, 8, [[3.2, 6.8]]);
  wallZ(0, 2, -11, 7, [[-9.2, -7.2], [-1, 1], [4.2, 6.2]]);
  wallX(0, 7, -8, 2, [[-6.0, -4.4]]);
  wallX(0, -7, -8, -2, [[-6.0, -4.4]]);
  // 二层隔断
  wallX(1, -3.5, 2, 8, [[3.2, 6.8]]);
  wallX(1, 3.5, 2, 8, [[3.2, 6.8]]);
  wallZ(1, 2, -11, 3.5, [[-10.7, -8.3], [-6.0, -4.0], [4.2, 6.0]]);
  wallX(1, 7, -8, -2, [[-6.0, -4.4]]);
  // 三层隔断
  wallX(2, -3.5, 2, 8, [[3.2, 6.8]]);
  wallX(2, 3.5, 2, 8, [[3.2, 6.8]]);
  wallZ(2, 2, -11, 11, [[-10.7, -8.3], [-6.0, -4.0], [4.2, 6.0]]);

  // windows / exterior light panels
  const windowMat = new THREE.MeshStandardMaterial({ color: '#17333a', emissive: '#1f5960', emissiveIntensity: .45, roughness: .5 });
  const windows = [];
  for (let f = 0; f < FLOORS; f++) {
    for (const [x, z, rot] of [[-8, -7.88, 0], [0, -7.88, 0], [8, -7.88, 0], [-8, 7.88, Math.PI], [0, 7.88, Math.PI], [8, 7.88, Math.PI]]) {
      const g = new THREE.Group(); g.position.set(x, base(f) + 1.75, z); g.rotation.y = rot; group.add(g);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.45), windowMat); g.add(pane);
      const frame = new THREE.Group(); g.add(frame);
      box(2.1, .07, .08, M.dark, 0, .75, .02, frame); box(2.1, .07, .08, M.dark, 0, -.75, .02, frame);
      box(.07, 1.55, .08, M.dark, -.98, 0, .02, frame); box(.07, 1.55, .08, M.dark, .98, 0, .02, frame);
      box(.05, 1.45, .05, M.dark, 0, 0, .02, frame);
      windows.push(g);
    }
  }

  // staircases
  function buildStair(s) {
    const steps = 18, width = s.x1 - s.x0, len = s.zTop - s.zBottom;
    for (let i = 0; i < steps; i++) {
      const z = s.zBottom + (i + .5) * len / steps;
      const y = base(s.from) + (i + 1) * FLOOR_H / steps;
      box(width, .10, Math.abs(len) / steps * 1.01, M.wood2, (s.x0 + s.x1) / 2, y, z);
    }
    // railings
    for (const x of [s.x0 + .05, s.x1 - .05]) {
      box(.05, 1.0, Math.abs(len), M.metal, x, base(s.from) + 1.2, (s.zBottom + s.zTop) / 2);
    }
  }
  buildStair(STAIRS[0]); buildStair(STAIRS[1]);

  // ---------- furniture / rooms ----------
  const line = (x, z, w, d, f, m = M.wood2) => box(w, .08, d, m, x, base(f) + .7, z);
  const rug = (x, z, w, d, f, m = M.rug) => box(w, .02, d, m, x, base(f) + .02, z);

  function sofa(x, z, f, rot = 0, color = M.sage) {
    const g = new THREE.Group(); g.position.set(x, base(f), z); g.rotation.y = rot; group.add(g);
    box(2.2, .38, .85, color, 0, .35, 0, g); box(2.2, .7, .2, color, 0, .68, .38, g);
    box(.18, .55, .78, color, -1.02, .45, 0, g); box(.18, .55, .78, color, 1.02, .45, 0, g);
    collide(f, x - 1.2, x + 1.2, z - .55, z + .55);
  }
  function table(x, z, f, w = 2.4, d = 1.1, m = M.wood2) {
    box(w, .1, d, m, x, base(f) + .72, z);
    for (const a of [-w / 2 + .15, w / 2 - .15]) for (const b of [-d / 2 + .12, d / 2 - .12]) cyl(.05, .05, .7, M.wood, x + a, base(f) + .36, z + b);
    collide(f, x - w / 2, x + w / 2, z - d / 2, z + d / 2);
  }
  function bed(x, z, f, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, base(f), z); g.rotation.y = rot; group.add(g);
    box(2.2, .35, 3.0, M.wood, 0, .25, 0, g); box(2.0, .25, 2.8, M.cream, 0, .5, 0, g);
    box(2.1, .18, .7, M.blue, 0, .68, -.95, g);
    collide(f, x - 1.2, x + 1.2, z - 1.6, z + 1.6);
  }
  function bookshelf(x, z, f, w = 2.6, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, base(f), z); g.rotation.y = rot; group.add(g);
    box(w, 2.3, .35, M.wood, 0, 1.15, 0, g);
    const cols = ['#9b5b43', '#587b73', '#c3a16a', '#6b4a3e', '#8aa17c'];
    for (let i = 0; i < 5; i++) box(.38, .05, .42, M.wood2, -.9 + i * .45, .6, .05, g);
    for (let i = 0; i < 16; i++) box(.1 + (i % 2) * .035, .32 + (i % 3) * .03, .22, mat(cols[i % cols.length]), -.82 + (i % 5) * .41, .55 + Math.floor(i / 5) * .38, .1, g);
    collide(f, x - w / 2, x + w / 2, z - .4, z + .4);
  }
  function plant(x, z, f, scale = 1) {
    const g = new THREE.Group(); g.position.set(x, base(f), z); g.scale.setScalar(scale); group.add(g);
    cyl(.28, .36, .4, mat('#8c5d43'), 0, .2, 0, g);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const stem = cyl(.012, .022, .6 + (i % 3) * .15, M.leaf, Math.cos(a) * .12, .65, Math.sin(a) * .12, g);
      stem.rotation.z = Math.cos(a) * .32; stem.rotation.x = Math.sin(a) * .32;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(.16 + (i % 3) * .025, 9, 7), i % 2 ? M.leaf2 : M.leaf);
      leaf.scale.set(1.25, .45, .75); leaf.position.set(Math.cos(a) * (.35 + (i % 3) * .06), .9 + (i % 3) * .13, Math.sin(a) * (.35 + (i % 3) * .06)); g.add(leaf);
    }
    collide(f, x - .35 * scale, x + .35 * scale, z - .35 * scale, z + .35 * scale);
    return g;
  }
  function lamp(x, z, f) {
    const g = new THREE.Group(); g.position.set(x, base(f) + .78, z); group.add(g);
    cyl(.14, .18, .04, M.brass, 0, 0, 0, g); cyl(.03, .03, .58, M.brass, 0, .28, 0, g);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(.32, .32, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#d8b77c', side: THREE.DoubleSide, emissive: '#8a5a25', emissiveIntensity: .3 }));
    shade.position.set(0, .62, 0); shade.rotation.x = Math.PI; g.add(shade);
    const light = new THREE.PointLight('#ffb86b', 1.4, 6, 1.8); light.position.set(0, .7, 0); g.add(light);
    lights.push({ light, base: 1.4 });
    return { group: g, shade, light };
  }

  // 一层
  rug(0, 5.8, 5.4, 3.2, 0, M.rug2); rug(-7, 5.2, 5.2, 3.8, 0, M.rug); rug(7, 5.2, 5.2, 3.8, 0, M.rug2);
  sofa(-7, 6.4, 0, Math.PI); table(-7, 4.8, 0, 2.2, 1.0); plant(-9.6, 2.6, 0, 1.1); bookshelf(-9.7, 3.4, 0, 2.2, Math.PI / 2);
  table(7, 5.2, 0, 2.4, 1.2); for (const [x, z] of [[6, 4.2], [8, 4.2], [6, 6.2], [8, 6.2]]) collide(0, x - .2, x + .2, z - .2, z + .2), box(.16, .8, .16, M.wood, x, base(0) + .4, z);
  box(3.4, .88, .7, M.wood2, 9.0, base(0) + .44, 3.0); box(3.6, .08, .8, M.cream, 9.0, base(0) + .9, 3.0); collide(0, 7.2, 10.8, 2.6, 3.4);
  box(1.2, .65, .55, M.cream, 9.0, base(0) + .33, 1.0); box(1.2, .65, .55, M.cream, 7.0, base(0) + .33, 1.0);
  bed(-9.2, -5.6, 0, 0); box(1.0, .55, .5, M.wood, -9.4, base(0) + .3, -7.2); collide(0, -9.9, -8.9, -7.5, -6.9);
  // bath
  box(2.0, .55, 1.1, M.cream, 9.2, base(0) + .3, -6.4); box(.7, .35, .6, M.cream, 7.7, base(0) + .2, -7.2); collide(0, 8.1, 10.3, -7.0, -5.8);

  // 二层 · 书房（核心交互区）
  rug(-7, 5.0, 5.8, 4.0, 1, M.rug2);
  box(3.3, .12, 1.35, M.wood2, -7.1, base(1) + .84, 4.3);
  for (const [x, z] of [[-8.6, 3.7], [-5.6, 3.7], [-8.6, 4.9], [-5.6, 4.9]]) box(.12, .8, .12, M.wood, x, base(1) + .42, z);
  collide(1, -8.8, -5.4, 3.6, 5.0);
  const laptop = new THREE.Group(); laptop.position.set(-7.1, base(1) + .95, 4.1); group.add(laptop);
  box(.9, .05, .6, M.dark, 0, 0, 0, laptop); box(.88, .55, .035, new THREE.MeshStandardMaterial({ color: '#244d49', emissive: '#1c6b61', emissiveIntensity: .7 }), 0, .28, -.28, laptop).rotation.x = -.14; mark(laptop, 'laptop');
  const lampObj = lamp(-5.9, 4.7, 1); mark(lampObj.group, 'lamp'); fixtures.lamp = lampObj;
  const mug = cyl(.1, .13, .15, M.cream, -6.5, base(1) + .97, 4.55); mark(mug, 'mug');
  const chair = new THREE.Group(); chair.position.set(-7.1, base(1), 5.15); group.add(chair);
  box(.85, .1, .7, M.wood2, 0, .52, 0, chair); box(.85, .55, .1, M.wood, 0, .8, .3, chair);
  for (const [x, z] of [[-.32, -.26], [.32, -.26], [-.32, .26], [.32, .26]]) cyl(.04, .04, .5, M.metal, x, .26, z, chair);
  mark(chair, 'chair'); collide(1, -7.55, -6.65, 4.8, 5.5);
  const plantObj = plant(-9.5, 6.7, 1, 1.1); mark(plantObj, 'plant'); fixtures.plant = plantObj;
  bookshelf(-10.6, 3.0, 1, 2.5, Math.PI / 2); bookshelf(-10.6, 6.2, 1, 2.5, Math.PI / 2);
  const speaker = new THREE.Group(); speaker.position.set(-4.3, base(1), 5.8); group.add(speaker);
  box(.6, .8, .48, M.wood, 0, .4, 0, speaker); for (const y of [.28, .6]) { const c = cyl(.15, .15, .02, M.dark, 0, y, .25, speaker); c.rotation.x = Math.PI / 2; }
  mark(speaker, 'speaker'); collide(1, -4.6, -4.0, 5.5, 6.1);

  // study window (interaction)
  const win = new THREE.Group(); win.position.set(-10.9, base(1) + 1.7, 5.2); win.rotation.y = Math.PI / 2; group.add(win);
  const winPane = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.4), windowMat); win.add(winPane);
  box(2.2, .07, .08, M.dark, 0, .74, .03, win); box(2.2, .07, .08, M.dark, 0, -.74, .03, win); box(.06, 1.5, .08, M.dark, 0, 0, .03, win);
  mark(win, 'window');

  // cat on the study rug
  const cat = new THREE.Group(); cat.position.set(-8.1, base(1), 6.2); cat.rotation.y = .5; group.add(cat);
  const catBody = sph(.3, M.cat, 0, .3, 0, cat); catBody.scale.set(1.35, .85, 1);
  sph(.24, M.cat, -.25, .53, -.04, cat); sph(.03, M.dark, -.36, .58, .16, cat); sph(.03, M.dark, -.16, .58, .16, cat);
  const earL = new THREE.Mesh(new THREE.ConeGeometry(.08, .2, 4), M.catDark); earL.position.set(-.38, .75, -.08); earL.rotation.z = .2; cat.add(earL);
  const earR = new THREE.Mesh(new THREE.ConeGeometry(.08, .2, 4), M.catDark); earR.position.set(-.12, .75, -.08); earR.rotation.z = -.2; cat.add(earR);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(.03, .05, .75, 8), M.catDark); tail.position.set(.45, .28, .12); tail.rotation.z = -1.1; cat.add(tail);
  mark(cat, 'cat'); fixtures.cat = cat; fixtures.tail = tail;

  // library
  rug(-7, -4.0, 5.0, 3.6, 1); bookshelf(-10.7, -5.5, 1, 3.0, Math.PI / 2); bookshelf(-10.7, -2.2, 1, 2.5, Math.PI / 2);
  sofa(-7.2, -6.3, 1, 0, M.rug2); table(-7.2, -4.3, 1, 2.0, .9); plant(-4.3, -6.7, 1, .9);

  // bedroom
  rug(7, 4.7, 5.2, 4.0, 1); bed(8.2, 5.2, 1); box(2.0, 1.0, .6, M.wood, 8.2, base(1) + .5, 7.3); collide(1, 7.2, 9.2, 7.0, 7.6);
  plant(10.0, 2.7, 1, 1.0); box(1.0, .55, .45, M.cream, 4.7, base(1) + .3, 7.2);

  // 三层 · 观星室 / 温室 / 音乐室 / 休息区
  rug(-7, -3.5, 5.4, 4.0, 2, M.rug2);
  // telescope
  const tele = new THREE.Group(); tele.position.set(-7.5, base(2), -5.4); group.add(tele);
  cyl(.06, .08, 1.9, M.metal, 0, .95, 0, tele); const tube = cyl(.13, .18, 1.5, M.dark, 0, 1.8, 0, tele); tube.rotation.z = .6;
  for (const [x, z] of [[-.35, -.2], [.35, -.2], [0, .35]]) cyl(.04, .04, .65, M.metal, x, .32, z, tele);
  collide(2, -8.1, -6.9, -6.0, -4.8);
  sofa(-4.3, -5.5, 2, -Math.PI / 2, M.blue); plant(-10.2, -6.5, 2, 1.1);
  // greenhouse
  for (const [x, z, s] of [[-9.4, 4.0, 1.0], [-9.4, 6.2, .85], [-6.8, 5.6, 1.15], [-5.1, 3.6, .8], [-6.8, 7.1, .9]]) plant(x, z, 2, s);
  box(3.2, .12, 1.0, M.wood2, -7.3, base(2) + .75, 4.9); for (const [x, z] of [[-8.6, 4.5], [-6.0, 4.5], [-8.6, 5.3], [-6.0, 5.3]]) box(.1, .7, .1, M.wood, x, base(2) + .38, z);
  // music
  rug(7, -3.0, 5.2, 4.0, 2, M.rug);
  box(3.0, .75, 1.0, M.dark, 7.5, base(2) + .4, -5.8); box(2.8, .1, .5, M.cream, 7.5, base(2) + .85, -5.3); box(2.6, .25, .35, M.cream, 7.5, base(2) + 1.0, -5.8); collide(2, 6.0, 9.0, -6.3, -5.3);
  const speaker2 = new THREE.Group(); speaker2.position.set(5.2, base(2), -6.5); group.add(speaker2); box(.6, .8, .5, M.wood, 0, .4, 0, speaker2); mark(speaker2, 'speaker');
  plant(10.0, -2.7, 2, 1.0);
  // lounge
  sofa(7, 5.5, 2, Math.PI, M.sage); table(7, 3.8, 2, 2.0, 1.0); plant(10.0, 6.5, 2, 1.1); rug(7, 5.0, 5.0, 3.5, 2, M.rug2);
  // stair landing / foyer bench
  box(2.4, .42, .45, M.wood, 0, base(0) + .22, 7.6); box(1.2, .7, .35, M.wood2, -2.8, base(0) + .35, 7.5);
  plant(2.8, 7.4, 0, .8);
  box(2.2, .42, .45, M.wood, 0, base(0) + .22, -7.6);

  // wall art / architectural details
  const artCols = ['#9d5a43', '#4e7472', '#b39155', '#677f65'];
  for (let i = 0; i < 4; i++) {
    const x = -1.8 + i * 2.3;
    box(1.25, .8, .06, M.dark, x, base(0) + 1.85, -7.86);
    box(1.1, .66, .02, mat(artCols[i]), x, base(0) + 1.85, -7.82);
  }
  for (const [x, z, f] of [[0, 5.0, 0], [-7, 5.0, 0], [7, 5.0, 0], [0, 0, 0], [-7, 4.8, 1], [7, 4.8, 1], [-7, 4.5, 2], [7, 4.5, 2]]) {
    const g = new THREE.Group(); g.position.set(x, base(f) + 2.75, z); group.add(g);
    cyl(.02, .02, .35, M.metal, 0, -.18, 0, g);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(.3, .23, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#d9b777', side: THREE.DoubleSide, emissive: '#7a4b1d', emissiveIntensity: .3 }));
    shade.rotation.x = Math.PI; shade.position.y = -.38; g.add(shade);
    const pl = new THREE.PointLight('#ffce8c', .45, 6, 1.7); pl.position.y = -.5; g.add(pl); lights.push({ light: pl, base: .45 });
  }

  // hallway / room lights
  for (const [x, z, f, color, intensity] of [[0, 5, 0, '#ffd9a0', .6], [-7, 5, 0, '#ffcf8a', .7], [7, 5, 0, '#ffd9a0', .7], [0, 0, 0, '#b9d6c9', .45], [-7, 4, 1, '#ffd39a', .8], [-7, -4, 1, '#ffc987', .6], [7, 4, 1, '#ffc987', .55], [0, 0, 1, '#b9d6c9', .35], [-7, -4, 2, '#a6c9d5', .55], [-7, 5, 2, '#a6d6a8', .5], [7, -4, 2, '#ffc987', .55], [7, 5, 2, '#ffd39a', .5]]) {
    const l = new THREE.PointLight(color, intensity, 9, 1.6); l.position.set(x, base(f) + 2.5, z); group.add(l); lights.push({ light: l, base: intensity });
  }

  return {
    group, colliders, rooms: ROOMS, stairs: STAIRS, lights, fixtures, interactables, windowMat,
    stairHeight(x, z, floor = null) {
      for (const s of STAIRS) {
        if (floor !== null && floor !== s.from && floor !== s.to) continue;
        if (x >= s.x0 && x <= s.x1 && z >= Math.min(s.zBottom, s.zTop) && z <= Math.max(s.zBottom, s.zTop)) {
          const t = Math.max(0, Math.min(1, (z - s.zBottom) / (s.zTop - s.zBottom)));
          return { floor: t >= .5 ? s.to : s.from, height: base(s.from) + t * FLOOR_H, stair: s };
        }
      }
      return null;
    },
    roomAt(floor, x, z) {
      return ROOMS.find(r => r.floor === floor && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) || null;
    },
    blocked(floor, x, z, radius = .28) {
      for (const c of colliders[floor] || []) {
        if (x + radius > c.x0 && x - radius < c.x1 && z + radius > c.z0 && z - radius < c.z1) return true;
      }
      return false;
    },
    spawn: { x: 0, z: 5.4, floor: 0 },
  };
}
