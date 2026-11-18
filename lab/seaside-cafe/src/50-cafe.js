/* ============================================================
   海風珈琲：建筑、露台、室内、猫与咖啡道具
   ============================================================ */
MAT.oak = std({ color: '#a77a51', roughness: .52, metalness: .02 });
MAT.oakDark = std({ color: '#76502f', roughness: .62 });
MAT.coffee = std({ color: '#3a2418', roughness: .4 });
MAT.bean = std({ color: '#4b2b18', roughness: .72 });
MAT.creamFabric = std({ color: '#e6d7bd', roughness: .98 });
MAT.tileFloor = std({ color: '#b9b3a5', map: TEX.stone, roughness: .8 });
MAT.stringBulb = std({ color: '#fff6df', emissive: '#ffd39a', emissiveIntensity: 1.8, roughness: .4 });

const CUP_MATS = new Map();
const JAR_MATS = new Map();
const BOTTLE_MATS = new Map();
function cupMat(color) { if (!CUP_MATS.has(color)) CUP_MATS.set(color, std({ color, roughness: .4 })); return CUP_MATS.get(color); }
function jarMat(color) { if (!JAR_MATS.has(color)) JAR_MATS.set(color, std({ color, roughness: .8 })); return JAR_MATS.get(color); }
function bottleMat(color) { if (!BOTTLE_MATS.has(color)) BOTTLE_MATS.set(color, std({ color, transparent: true, opacity: .72, roughness: .2 })); return BOTTLE_MATS.get(color); }
function mergeLocalChildren(group, keep = new Set()) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  const inKeep = (o) => { let p = o; while (p && p !== group) { if (keep.has(p)) return true; p = p.parent; } return false; };
  group.traverse((o) => {
    if (o === group || !o.isMesh || o.isInstancedMesh) return;
    if (!o.visible || !o.geometry || o.userData.item) return;
    if (Array.isArray(o.material) || !o.material) return;
    if (o.material.transparent || o.material.isShaderMaterial || o.material.colorWrite === false) return;
    if (inKeep(o)) return;
    const key = o.material.uuid;
    let b = buckets.get(key);
    if (!b) { b = { material: o.material, pos: [], nor: [], uv: [], total: 0, meshes: [] }; buckets.set(key, b); }
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    const local = new THREE.Matrix4().copy(inv).multiply(o.matrixWorld);
    g.applyMatrix4(local);
    const pa = g.attributes.position.array, na = g.attributes.normal ? g.attributes.normal.array : null, ua = g.attributes.uv ? g.attributes.uv.array : null;
    const n = g.attributes.position.count;
    const pArr = new Float32Array(pa); b.pos.push(pArr); b.total += n;
    b.nor.push(na ? new Float32Array(na) : new Float32Array(n * 3));
    b.uv.push(ua ? new Float32Array(ua) : new Float32Array(n * 2));
    b.meshes.push(o);
  });
  for (const b of buckets.values()) {
    if (b.meshes.length < 2) continue;
    const pos = new Float32Array(b.total * 3), nor = new Float32Array(b.total * 3), uv = new Float32Array(b.total * 2);
    let o1 = 0, o2 = 0;
    for (let i = 0; i < b.pos.length; i++) { pos.set(b.pos[i], o1); nor.set(b.nor[i], o1); uv.set(b.uv[i], o2); o1 += b.pos[i].length; o2 += b.uv[i].length; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, b.material);
    mesh.castShadow = false; mesh.receiveShadow = true;
    group.add(mesh);
    for (const o of b.meshes) o.visible = false;
  }
}

function makeCup(parent, x, y, z, color = '#efe6d4', scale = 1) {
  const g = group(parent, x, y, z);
  cylinder(g, .045 * scale, .038 * scale, .075 * scale, 0, .037 * scale, 0, cupMat(color), { seg: 12 });
  cylinder(g, .038 * scale, .038 * scale, .006 * scale, 0, .075 * scale, 0, MAT.coffee, { seg: 12 });
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.028 * scale, .008 * scale, 5, 10), cupMat(color));
  handle.position.set(.045 * scale, .04 * scale, 0); g.add(handle);
  return g;
}
function makeJar(parent, x, y, z, fill = '#5b3924', h = .16) {
  const g = group(parent, x, y, z);
  cylinder(g, .055, .055, h, 0, h / 2, 0, MAT.glass, { seg: 12, cast: false });
  cylinder(g, .048, .048, h * .72, 0, h * .4, 0, jarMat(fill), { seg: 10 });
  cylinder(g, .03, .03, .018, 0, h + .008, 0, MAT.brass, { seg: 8 });
  return g;
}
function makeBottle(parent, x, y, z, color = '#6d8e78') {
  const g = group(parent, x, y, z);
  cylinder(g, .045, .055, .18, 0, .09, 0, bottleMat(color), { seg: 10 });
  cylinder(g, .025, .03, .06, 0, .2, 0, MAT.glassBlue, { seg: 8 });
  cylinder(g, .026, .026, .018, 0, .235, 0, MAT.brass, { seg: 8 });
  return g;
}

function buildCafe() {
  const g = new THREE.Group();
  root.add(g);
  const F = .8; // 室内地坪
  const CX = 0, CZ = 0;
  const W = 8, D = 6;
  const x0 = -4, x1 = 4, z0 = -3, z1 = 3;

  /* ---------- 基座 / 地板 / 露台 ---------- */
  box(g, W + .5, .76, D + .5, CX, .38, CZ, MAT.concrete, { receive: true, cast: true });
  box(g, W - .2, .06, D - .2, CX, F - .01, CZ, MAT.woodFloor, { receive: true });
  // 入口石
  box(g, .75, .05, 1.7, -3.72, F + .01, .6, MAT.stone, { receive: true });
  // 露台
  box(g, 5, .45, 6, -6.5, .225, 0, std({ color: '#b58a62', map: TEX.wood, roughness: .8 }), { receive: true, cast: true });
  // 露台木板缝
  for (let z = -2.8; z <= 2.8; z += .42) box(g, 4.9, .012, .018, -6.5, .455, z, MAT.woodDark, { receive: true });
  // 门口两级石阶（露台 .45 → 室内 .8）
  box(g, .55, .18, 1.9, -4.28, .54, .6, MAT.stone, { receive: true });
  box(g, .35, .18, 1.9, -4.08, .70, .6, MAT.stone, { receive: true });

  /* ---------- 外墙 / 一层 ---------- */
  const wallH = 2.85;
  // 侧墙 / 后墙
  box(g, .18, wallH + .8, D + .2, x1, F + wallH / 2, CZ, MAT.wood, { cast: true, receive: true });
  box(g, W + .2, wallH + .8, .18, CX, F + wallH / 2, z0, MAT.wood, { cast: true, receive: true });
  box(g, W + .2, wallH + .8, .18, CX, F + wallH / 2, z1, MAT.wood, { cast: true, receive: true });
  // 二层白灰泥
  box(g, .18, 2.35, D + .2, x0, 4.8, CZ, MAT.plaster, { cast: true, receive: true });
  box(g, .18, 2.35, D + .2, x1, 4.8, CZ, MAT.plaster, { cast: true, receive: true });
  box(g, W + .2, 2.35, .18, CX, 4.8, z0, MAT.plaster, { cast: true, receive: true });
  box(g, W + .2, 2.35, .18, CX, 4.8, z1, MAT.plaster, { cast: true, receive: true });
  // 外墙木格栅装饰
  for (let z = -2.7; z <= 2.7; z += .55) {
    box(g, .03, .65, .04, x0 - .105, 1.7, z, MAT.woodDark);
    box(g, .03, .65, .04, x1 + .105, 1.7, z, MAT.woodDark);
  }
  // 南侧墙的小窗 / 爬藤 / 雨落管
  plane(g, 1.0, .75, 0.0, 2.1, 3.045, std({ color: '#f2d2a2', emissive: '#ffbd7c', emissiveIntensity: .42, roughness: .8 }), { receive: false });
  box(g, 1.16, .06, .07, 0, 2.5, 3.06, MAT.woodDark, { receive: false });
  box(g, 1.16, .06, .07, 0, 1.7, 3.06, MAT.woodDark, { receive: false });
  box(g, .06, .86, .07, -.55, 2.1, 3.06, MAT.woodDark, { receive: false });
  box(g, .06, .86, .07, .55, 2.1, 3.06, MAT.woodDark, { receive: false });
  const sidePlanter = group(g, 0, 1.56, 3.12);
  box(sidePlanter, .26, .2, 1.1, 0, 0, 0, MAT.woodDark, { cast: true, receive: true });
  for (let i = 0; i < 5; i++) {
    sphere(sidePlanter, .1, .04, .15, -.42 + i * .21, MAT.leafLight, { seg: 6 });
    sphere(sidePlanter, .04, .1, .22, -.42 + i * .21, i % 2 ? MAT.coral : MAT.clothWhite, { seg: 6 });
  }
  for (let i = 0; i < 4; i++) box(g, 1.05, .035, .04, 0, 1.82 + i * .18, 3.06, MAT.woodDark, { receive: false });
  for (let i = 0; i < 3; i++) box(g, .035, .75, .04, -.4 + i * .4, 2.1, 3.06, MAT.woodDark, { receive: false });
  cylinder(g, .055, .055, 2.4, 3.2, 1.2, 3.18, MAT.iron, { seg: 6 });
  // 南墙的爬藤：贴着墙的扁平叶片
  for (let i = 0; i < 9; i++) {
    const lf = new THREE.Mesh(new THREE.PlaneGeometry(.16, .22), i % 2 ? MAT.leaf : MAT.leafLight);
    lf.position.set(-1.9 + Math.sin(i * 1.7) * .3, 1.0 + i * .24, 3.08);
    lf.rotation.z = i * .9; g.add(lf);
  }
  // 防潮基座灰色带
  // 外墙防潮带只做四周，不能盖住室内地板
  box(g, W + .55, .18, .12, CX, .82, z0 - .3, MAT.concrete, { receive: true });
  box(g, W + .55, .18, .12, CX, .82, z1 + .3, MAT.concrete, { receive: true });
  box(g, .12, .18, D + .55, x0 - .3, .82, CZ, MAT.concrete, { receive: true });
  box(g, .12, .18, D + .55, x1 + .3, .82, CZ, MAT.concrete, { receive: true });

  /* ---------- 正面：玻璃 / 门 / 窗框 ---------- */
  // 底槛 / 顶梁
  box(g, .16, .35, 2.7, x0, F + .175, -1.65, MAT.woodDark, { receive: true });
  box(g, .16, .35, 1.5, x0, F + .175, 2.25, MAT.woodDark, { receive: true });
  box(g, .16, .6, D, x0, F + wallH - .3, CZ, MAT.woodDark, { receive: true });
  // 木柱
  for (const z of [-3, -2.72, -.3, 1.5, 2.72, 3]) {
    box(g, .18, wallH + .05, .13, x0, F + wallH / 2, z, MAT.woodDark, { cast: true });
  }
  // 玻璃窗（南、北两段）
  for (const [za, zb] of [[-2.7, -.33], [1.53, 2.68]]) {
    const zc = (za + zb) / 2, ww = zb - za;
    plane(g, ww, 1.95, x0 - .012, F + 1.85, zc, MAT.glass, { rot: [0, -Math.PI / 2, 0], receive: false });
    // 木格 6×4
    for (let i = 1; i < 4; i++) box(g, .05, .045, ww, x0 - .02, F + 1.0 + i * .44, zc, MAT.woodDark, { receive: false });
    for (let i = 1; i < 6; i++) box(g, .05, 1.95, .045, x0 - .02, F + 1.85, za + i * ww / 6, MAT.woodDark, { receive: false });
    box(g, .22, .09, ww + .16, x0 - .04, F + .92, zc, MAT.woodDark, { receive: true });
  }
  // 自动门框
  const door = new THREE.Group();
  door.position.set(x0 - .03, F, .6);
  g.add(door);
  box(door, .16, 2.4, .08, 0, 1.2, -.94, MAT.woodDark, { cast: true });
  box(door, .16, 2.4, .08, 0, 1.2, .94, MAT.woodDark, { cast: true });
  box(door, .16, .1, 1.96, 0, 2.35, 0, MAT.woodDark);
  const panelL = group(door, 0, 0, -.45), panelR = group(door, 0, 0, .45);
  for (const [panel, off] of [[panelL, -.45], [panelR, .45]]) {
    plane(panel, .86, 2.2, 0, 1.16, 0, MAT.glass, { rot: [0, -Math.PI / 2, 0], receive: false });
    for (let i = 0; i < 4; i++) box(panel, .04, .045, .82, -.015, .52 + i * .58, 0, MAT.woodDark, { receive: false });
    box(panel, .05, 2.25, .06, 0, 1.15, -.43, MAT.woodDark, { receive: false });
    box(panel, .05, 2.25, .06, 0, 1.15, .43, MAT.woodDark, { receive: false });
    // 玻璃门把手
    box(panel, .045, .04, .24, -.07, 1.15, .38, MAT.brass, { receive: false });
  }
  mergeLocalChildren(panelL); mergeLocalChildren(panelR);
  const doorHit = group(door, 0, 1.1, -.45);
  box(doorHit, .3, 2.4, 1.9, 0, 0, .45, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }), { receive: false });

  // 门楣招牌 / 暖帘
  // 招牌后的一小段木墙（不挡住整面玻璃）
  box(g, .06, 1.02, 1.5, x0 - .015, F + 2.05, -1.65, MAT.woodDark, { receive: true });
  const sign = group(g, x0 - .12, F + 2.1, -1.65, -Math.PI / 2);
  box(sign, 1.42, .9, .07, 0, 0, -.03, MAT.woodDark, { cast: true });
  plane(sign, 1.3, .78, 0, 0, .025, MAT.sign, { receive: false });
  const norenGeo = new THREE.PlaneGeometry(1.8, .78, 14, 4);
  const noren = new THREE.Mesh(norenGeo, MAT.noren);
  noren.position.set(x0 - .09, F + 2.53, .6);
  noren.rotation.y = -Math.PI / 2;
  g.add(noren);
  const norenBase = norenGeo.attributes.position.array.slice();

  /* ---------- 屋顶 / 二层窗 ---------- */
  // 山墙三角
  const tri = new THREE.Shape();
  tri.moveTo(-4, 6.0); tri.lineTo(4, 6.0); tri.lineTo(0, 8.25); tri.closePath();
  const gableMat = MAT.plaster;
  for (const [z, ry] of [[z0 - .08, Math.PI], [z1 + .08, 0]]) {
    const gm = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ map: TEX.plaster, color: '#f0e9da', roughness: .95, side: THREE.DoubleSide }));
    gm.position.set(0, 0, z); gm.rotation.y = ry; g.add(gm);
  }
  // 两片坡屋顶
  const roofL = box(g, 5.35, .16, 8.7, -2.55, 7.1, -.05, MAT.roof, { rot: [0, 0, .4], cast: true, receive: true });
  const roofR = box(g, 5.35, .16, 8.7, 2.55, 7.1, -.05, MAT.roof, { rot: [0, 0, -.4], cast: true, receive: true });
  box(g, .28, .2, 8.75, 0, 8.18, -.05, MAT.roof, { cast: true });
  // 檐口木封边
  box(g, .16, .22, 8.8, -5.2, 6.02, -.05, MAT.woodDark, { cast: true });
  box(g, .16, .22, 8.8, 5.2, 6.02, -.05, MAT.woodDark, { cast: true });
  // 二层窗
  for (const zc of [-1.55, 1.55]) {
    plane(g, 1.25, 1.05, x0 - .1, 4.95, zc, MAT.glass, { rot: [0, -Math.PI / 2, 0], receive: false });
    for (let i = 0; i < 4; i++) box(g, .04, 1.08, .05, x0 - .11, 4.95, zc - .55 + i * .36, MAT.woodDark, { receive: false });
    for (let i = 0; i < 3; i++) box(g, .04, .045, 1.25, x0 - .11, 4.5 + i * .38, zc, MAT.woodDark, { receive: false });
    box(g, .2, .12, 1.45, x0 - .14, 4.38, zc, MAT.woodDark, { receive: true });
  }
  // 内侧檐下木椽
  for (let z = -3; z <= 3; z += .6) box(g, 1.2, .05, .07, -4.55, 5.98, z, MAT.woodDark, { receive: false });

  // 二层窗口暖光 / 窗帘
  for (const zc of [-1.55, 1.55]) {
    plane(g, 1.02, .9, x0 - .055, 4.95, zc, std({ color: '#f0cf9f', emissive: '#ffb46a', emissiveIntensity: .10, roughness: .9 }), { rot: [0, -Math.PI / 2, 0], receive: false });
    plane(g, .3, 1.0, x0 - .065, 4.95, zc - .45, std({ color: '#6d4a38', roughness: .95 }), { rot: [0, -Math.PI / 2, 0], receive: false });
    plane(g, .3, 1.0, x0 - .065, 4.95, zc + .45, std({ color: '#6d4a38', roughness: .95 }), { rot: [0, -Math.PI / 2, 0], receive: false });
  }
  // 窗台花箱
  const flowerBox = (x, y, z, len, ry = 0) => {
    const fb = group(g, x, y, z, ry);
    box(fb, .26, .22, len, 0, 0, 0, MAT.woodDark, { cast: true, receive: true });
    for (let i = 0; i < Math.max(3, Math.round(len / .25)); i++) {
      const zz = -len / 2 + .12 + i * (len - .24) / Math.max(1, Math.round(len / .25) - 1);
      sphere(fb, .11, .04, .15, zz, MAT.leafLight, { sx: 1.1, sy: .7, sz: 1.1, seg: 6 });
      sphere(fb, .045, .1, .24, zz, i % 2 ? MAT.coral : MAT.clothWhite, { seg: 6 });
    }
  };
  flowerBox(x0 - .19, 4.18, -1.55, 1.25);
  flowerBox(x0 - .19, 4.18, 1.55, 1.25);
  flowerBox(x0 - .2, .98, -1.5, 1.15);
  flowerBox(x0 - .2, .98, 2.1, 1.05);
  // 壁灯（左右各一）
  for (const zz of [-2.3, 2.3]) {
    const wl = group(g, x0 - .22, 2.35, zz);
    box(wl, .18, .05, .28, 0, .18, 0, MAT.iron);
    box(wl, .2, .3, .2, 0, 0, 0, MAT.blackMetal);
    box(wl, .13, .2, .13, -.02, 0, 0, EMI.warmSoft, { receive: false });
    const pl = new THREE.PointLight('#ffc47c', 2.6, 4, 2);
    pl.position.set(x0 - .5, 2.35, zz); g.add(pl);
    refs.lamps.push({ light: pl, base: 4.2, mat: null, on: true });
  }
  // 门楣上方的吊灯
  const eaveLamp = group(g, x0 - .36, 2.95, .6);
  cylinder(eaveLamp, .02, .02, .35, 0, .17, 0, MAT.iron, { seg: 6 });
  box(eaveLamp, .24, .26, .24, 0, -.05, 0, MAT.blackMetal);
  box(eaveLamp, .15, .18, .15, 0, -.05, 0, EMI.warm, { receive: false });
  const eavePl = new THREE.PointLight('#ffc985', 5.0, 6, 2);
  eavePl.position.set(x0 - .9, 2.85, .6); g.add(eavePl);
  refs.lamps.push({ light: eavePl, base: 9, mat: null, on: true });
  const facadeWash = new THREE.PointLight('#ffb477', 5.5, 10, 2);
  facadeWash.position.set(-7.5, 3.6, 1.0); g.add(facadeWash);
  // 侧挂小招牌
  const hang = group(g, x0 - .52, 2.55, -2.45, -Math.PI / 2);
  box(hang, .06, .06, .55, 0, .28, .26, MAT.iron);
  box(hang, .06, .45, .06, 0, .06, .5, MAT.iron);
  const hangTex = canvasTexture(192, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e8dfcb'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#6b5139'; ctx.lineWidth = 4; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#26334d'; ctx.textAlign = 'center'; ctx.font = `600 52px ${JP_SERIF}`;
    ctx.fillText('珈', w / 2, 82); ctx.fillText('琲', w / 2, 146);
    ctx.font = `400 16px ${JP_SANS}`; ctx.fillStyle = '#7b5a3c'; ctx.fillText('COFFEE', w / 2, 202);
  });
  box(hang, .04, .75, .55, 0, -.35, .55, MAT.woodDark, { cast: true });
  plane(hang, .48, .68, .03, -.35, .55, std({ map: hangTex, roughness: .85, emissive: '#ffdfb2', emissiveMap: hangTex, emissiveIntensity: .18 }), { receive: false });
  // 露台 A 字菜单牌
  const aframe = group(g, -5.3, .45, 1.95);
  for (const sgn of [-1, 1]) {
    const board = box(aframe, .55, .85, .04, 0, .45, sgn * .16, MAT.woodDark, { rot: [sgn * .16, 0, 0], cast: true });
    plane(aframe, .46, .72, 0, .48, sgn * .19, MAT.chalk, { rot: [sgn * .16, sgn > 0 ? 0 : Math.PI, 0], receive: false });
  }
  registerInteract('menu_aframe', aframe, '看今日菜单', () => openMenu(), { max: 2.6 });

  /* ---------- 露台家具 ---------- */
  // 栏杆
  const railMat = std({ color: '#7a5538', roughness: .8 });
  const post = (x, z, h = .95) => { cylinder(g, .045, .06, h, x, .45 + h / 2, z, railMat, { seg: 7 }); };
  const rail = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const m = box(g, .055, .055, len, (x1 + x2) / 2, 1.32, (z1 + z2) / 2, railMat, { receive: false });
    m.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    const m2 = box(g, .04, .04, len, (x1 + x2) / 2, .92, (z1 + z2) / 2, railMat, { receive: false });
    m2.rotation.y = Math.atan2(x2 - x1, z2 - z1);
  };
  for (const z of [-2.8, -1.6, -.4, 1.4, 2.8]) post(-8.95, z);
  rail(-8.95, -3, -8.95, -.45); rail(-8.95, 1.45, -8.95, 3);
  for (const z of [-3, 3]) { for (const x of [-8.9, -6.5, -4.1]) post(x, z); rail(-8.9, z, -4.1, z); }
  addCollider(-9.15, -8.85, -3.2, .45, 0, 2, 'rail');
  addCollider(-9.15, -8.85, 1.35, 3.2, 0, 2, 'rail');
  addCollider(-9.2, -4, 2.85, 3.2, 0, 2, 'rail');
  addCollider(-9.2, -4, -3.2, -2.85, 0, 2, 'rail');

  // 两张矮桌 / 坐垫
  const seats = [];
  const table = (x, z, r, yaw = 0) => {
    const y = .45;
    cylinder(g, .04, .05, .34, x, y + .17, z, MAT.woodDark, { seg: 8 });
    cylinder(g, .48, .48, .055, x, y + .36, z, MAT.oak, { seg: 20, receive: true });
    for (const [sx, sz, ry] of [[-.8, 0, Math.PI / 2], [.8, 0, -Math.PI / 2], [0, -.8, 0], [0, .8, Math.PI]]) {
      const cx = x + Math.cos(yaw) * sx + Math.sin(yaw) * sz, cz = z - Math.sin(yaw) * sx + Math.cos(yaw) * sz;
      box(g, .55, .1, .55, cx, y + .07, cz, MAT.ceramic, { receive: true });
      box(g, .48, .12, .48, cx, y + .13, cz, MAT.creamFabric, { receive: true });
      seats.push({ x: cx, z: cz, y, yaw: ry + yaw, kind: 'terrace' });
      registerInteract(`seat_t${seats.length}`, box(g, .4, .04, .4, cx, y + .21, cz, MAT.creamFabric, { receive: true }), '坐下看海', () => sitAt(seats[seats.length - 1]), { max: 2.4 });
    }
    // 桌面小物
    const ash = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .025, 14), MAT.ceramic);
    ash.position.set(x - .16, y + .4, z + .1); g.add(ash);
    sphere(g, .025, x - .16, y + .42, z + .1, MAT.shell || MAT.ceramic, { seg: 8 });
    makeCup(g, x + .2, y + .39, z - .12, '#e9dfce', .8);
  };
  table(-7.25, -1.15, .5, 0);
  table(-6.35, 1.55, .5, 0.2);
  // 遮阳伞
  const umb = group(g, -7.8, .45, 2.3);
  cylinder(umb, .035, .045, 2.2, 0, 1.1, 0, MAT.woodLight, { seg: 8 });
  const canopy = new THREE.Group(); canopy.position.y = 2.2; umb.add(canopy);
  const ctop = new THREE.Mesh(new THREE.ConeGeometry(1.45, .4, 12), std({ color: '#ece3d0', roughness: .9, side: THREE.DoubleSide }));
  ctop.position.y = .18; canopy.add(ctop);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    box(canopy, .035, .035, 1.45, Math.cos(a) * .72, .1, Math.sin(a) * .72, MAT.woodLight, { rot: [0, -a, 0.18] });
  }
  mergeLocalChildren(canopy);
  const umbState = { open: true, target: 1, anim: 1, group: umb, canopy };
  registerInteract('umbrella', umb, '收起遮阳伞', () => toggleUmbrella(), { max: 3.2 });

  // 冲浪板架
  for (let i = 0; i < 3; i++) {
    const board = new THREE.Mesh(new THREE.CapsuleGeometry(.16, 1.55, 5, 10), [MAT.coral, MAT.cream, std({ color: '#5c8f9e', roughness: .5 })][i]);
    board.scale.set(1, 1, .22);
    board.position.set(-5.1, .95, -2.55 + i * .32);
    board.rotation.z = .12 + i * .03;
    board.castShadow = true; g.add(board);
    box(g, .05, 1.3, .02, -5.1, .95, -2.54 + i * .32, i === 1 ? MAT.woodDark : MAT.cream, { receive: false });
  }
  addCollider(-5.4, -4.8, -2.8, -2.0, 0, 2, 'surf');
  // 自行车
  const bike = group(g, -5.2, .45, -1.35, .18);
  for (const z of [-.5, .5]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(.32, .032, 6, 16), MAT.iron);
    w.rotation.y = Math.PI / 2; w.position.set(0, .33, z); bike.add(w);
  }
  box(bike, .04, .04, 1.0, 0, .62, 0, MAT.iron, { rot: [.08, 0, 0] });
  box(bike, .04, .04, .62, 0, .5, -.22, MAT.iron, { rot: [.55, 0, 0] });
  box(bike, .3, .06, .18, 0, .76, -.48, MAT.woodDark);
  box(bike, .26, .04, .24, 0, .78, .48, MAT.woodLight);
  const bell = sphere(bike, .05, 0, .84, .38, MAT.brass, { seg: 8 });
  registerInteract('bike', bike, '按一下车铃', () => ringBike(), { max: 2.6 });

  // 鞋柜 / 拖鞋 / 地垫
  box(g, .55, .72, 1.3, -4.55, .81, -2.3, MAT.wood, { cast: true, receive: true });
  box(g, .5, .06, 1.2, -4.55, 1.18, -2.3, MAT.woodDark);
  for (const [x, z, ry] of [[-.28, .3, .2], [-.15, .44, -.1]]) {
    const sl = group(g, x - 4.5, .82, z + .55, ry);
    box(sl, .1, .03, .24, 0, 0, 0, MAT.coral, { receive: false });
    box(sl, .03, .02, .1, 0, .03, -.02, MAT.cream, { receive: false });
  }
  // 植物
  const plant = (x, z, scale = 1) => {
    const y = .45;
    cylinder(g, .24 * scale, .17 * scale, .32 * scale, x, y + .16 * scale, z, MAT.coral, { seg: 10 });
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(.07 * scale, .55 * scale, 4), i % 2 ? MAT.leaf : MAT.leafLight);
      leaf.position.set(x + Math.cos(i * 1.7) * .12, y + .5 * scale, z + Math.sin(i * 1.7) * .12);
      leaf.rotation.set(Math.sin(i * 1.7) * .45, i, Math.cos(i * 1.7) * .45);
      leaf.castShadow = false; g.add(leaf);
    }
  };
  plant(-8.45, -2.4, 1.1); plant(-8.35, 2.35, .9);
  // 猫爬架 / 水碗
  const catTree = group(g, -8.3, .45, -1.2);
  cylinder(catTree, .07, .1, 1.2, 0, .6, 0, MAT.wood, { seg: 8 });
  box(catTree, .9, .08, .55, 0, .44, 0, MAT.creamFabric);
  box(catTree, .8, .08, .5, .2, 1.0, 0, MAT.creamFabric);
  box(catTree, .55, .5, .5, -.2, .95, 0, MAT.creamFabric);
  // 串灯
  const stringPts = [];
  for (let i = 0; i <= 18; i++) {
    const x = lerp(-8.85, -4.15, i / 18);
    stringPts.push(new THREE.Vector3(x, 1.62 + Math.sin(i * .9) * .08, 2.95));
  }
  const stringGeo = new THREE.BufferGeometry().setFromPoints(stringPts);
  g.add(new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: '#3b3128', transparent: true, opacity: .65 })));
  for (let i = 1; i < 18; i += 2) {
    sphere(g, .045, stringPts[i].x, stringPts[i].y - .1, stringPts[i].z, MAT.stringBulb, { seg: 7 });
  }
  refs.stringLights.push({ mat: MAT.stringBulb });
  // 露台小灯
  for (const x of [-8.55, -4.6]) {
    const lg = group(g, x, .45, 2.55);
    cylinder(lg, .05, .07, .45, 0, .22, 0, MAT.iron, { seg: 7 });
    box(lg, .18, .2, .18, 0, .55, 0, EMI.warmSoft, { receive: false });
    const pl = new THREE.PointLight('#ffc985', 2.2, 3.5, 2);
    pl.position.set(x, .95, 2.55); g.add(pl);
    refs.lamps.push({ light: pl, base: 2.2, mat: null });
  }

  /* ---------- 室内 ---------- */
  // 天花板
  plane(g, W - .25, D - .25, 0, 3.62, 0, MAT.woodLight, { rot: [Math.PI / 2, 0, 0], receive: true });
  // 吧台 L 形
  const counterTop = MAT.oak;
  box(g, .72, .85, 2.8, 2.94, F + .425, -1.05, MAT.woodDark, { cast: true, receive: true });
  box(g, .78, .07, 2.9, 2.94, F + .88, -1.05, counterTop, { receive: true });
  box(g, 1.8, .85, .62, 1.65, F + .425, -2.48, MAT.woodDark, { cast: true, receive: true });
  box(g, 1.9, .07, .68, 1.65, F + .88, -2.48, counterTop, { receive: true });
  addCollider(2.55, 3.35, -2.55, .4, .8, 2.2, 'counter');
  addCollider(.75, 2.55, -2.8, -2.1, .8, 2.2, 'counter2');
  // 台面工具
  // 手冲架 + 滤杯
  box(g, .06, .6, .06, 2.9, F + 1.2, -.1, MAT.iron);
  box(g, .06, .6, .06, 2.9, F + 1.2, .3, MAT.iron);
  box(g, .32, .05, .5, 2.9, F + 1.48, .1, MAT.woodLight);
  cylinder(g, .11, .07, .16, 2.9, F + 1.36, .1, MAT.ceramic, { seg: 12 });
  cylinder(g, .1, .1, .2, 2.9, F + 1.15, .1, MAT.glass, { seg: 12 });
  // 磨豆机
  cylinder(g, .075, .07, .28, 2.8, F + 1.05, .62, MAT.iron, { seg: 10 });
  cylinder(g, .055, .055, .06, 2.8, F + 1.22, .62, MAT.brass, { seg: 10 });
  box(g, .2, .03, .03, 2.8, F + 1.27, .68, MAT.woodDark);
  // 电子秤
  box(g, .26, .04, .2, 2.9, F + .94, .65, MAT.blackMetal);
  plane(g, .16, .08, 2.9, F + .965, .65, EMI.screen, { rot: [-Math.PI / 2, 0, 0], receive: false });
  // 铜壶
  cylinder(g, .1, .12, .2, 2.7, F + 1.02, -.35, MAT.copper, { seg: 12 });
  box(g, .04, .18, .04, 2.7, F + 1.13, -.46, MAT.copper);
  // 分享壶 / 杯子
  makeCup(g, 2.95, F + .92, -1.5, '#eee7d6', 1.1);
  makeCup(g, 2.75, F + .92, -1.8, '#e4d7c2', .9);
  // 虹吸壶
  cylinder(g, .07, .09, .25, 3.1, F + 1.06, .9, MAT.glass, { seg: 10 });
  sphere(g, .085, 3.1, F + 1.25, .9, MAT.glass, { seg: 10 });
  // 咖啡豆玻璃罐 6
  for (let i = 0; i < 6; i++) makeJar(g, 2.55 + i * .12, F + .94, -2.28, ['#4b2b18', '#6b4426', '#3f2416', '#7a5030', '#51301b', '#624027'][i], .16);
  addCollider(2.4, 3.4, -2.4, -2.1, .8, 2.2, 'jars');
  // 吧台后墙的杯架与瓶子
  for (let sh = 0; sh < 2; sh++) {
    box(g, .28, .04, 2.2, 3.78, 2.25 + sh * .5, -.75, MAT.woodDark, { receive: true });
    for (let i = 0; i < 6; i++) {
      const z = -1.6 + i * .34;
      if (sh === 0) {
        makeCup(g, 3.68, 2.28, z, '#e9dfca', .9);
      } else {
        makeBottle(g, 3.68, 2.5, z, ['#6d8e78', '#b78a55', '#8f6c86'][i % 3]);
      }
    }
  }
  // 吧台正面竖木条与脚踢
  for (let i = 0; i < 12; i++) box(g, .035, .78, .06, 2.56, F + .45, -2.35 + i * .22, MAT.woodDark, { receive: false });
  box(g, .06, .12, 2.75, 2.55, F + .1, -1.05, MAT.woodDark, { receive: false });
  // 台面小植物 / 菜单卡
  cylinder(g, .06, .075, .1, 2.62, F + .98, .28, MAT.coral, { seg: 8 });
  sphere(g, .09, 2.62, F + 1.08, .28, MAT.leafLight, { seg: 8 });
  box(g, .18, .24, .02, 2.6, F + 1.0, -.7, MAT.paper, { rot: [0, -.4, 0] });
  // 榻榻米上的织毯
  box(g, 1.4, .018, .9, 2.35, F + .055, 2.1, std({ color: '#7d5f4e', roughness: 1 }), { receive: true });

  // 收银 / 铜铃 / 小费罐
  box(g, .34, .24, .28, 3.1, F + 1.03, -1.9, MAT.woodDark);
  box(g, .24, .16, .04, 3.1, F + 1.12, -2.02, EMI.screen);
  sphere(g, .055, 2.85, F + 1.03, -1.9, MAT.brass, { seg: 8 });
  cylinder(g, .07, .06, .13, 2.6, F + .98, -1.65, MAT.glass, { seg: 10 });
  // 甜品柜
  const caseG = group(g, 2.95, F + .92, .15);
  box(caseG, .5, .04, .9, 0, .02, 0, MAT.woodDark);
  box(caseG, .5, .5, .9, 0, .27, 0, MAT.glassCase, { receive: false });
  box(caseG, .46, .05, .84, 0, .52, 0, MAT.glassCase, { receive: false });
  for (let i = 0; i < 3; i++) {
    const cake = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .08, 8), [MAT.cream, MAT.coral, std({ color: '#d6b56e' })][i]);
    cake.position.set(0, .1, -.28 + i * .28); caseG.add(cake);
  }
  // 黑菜单（北墙）
  const chalk = group(g, .5, 2.55, -2.93);
  box(chalk, 2.3, 1.3, .07, 0, 0, 0, MAT.woodDark);
  plane(chalk, 2.1, 1.12, 0, 0, .04, MAT.chalk, { receive: false });
  registerInteract('menu', chalk, '看菜单 / 点单', () => openMenu(), { max: 3.4 });
  // 菜单立牌
  const menuStand = group(g, 3.35, F + .92, -2.3);
  box(menuStand, .26, .35, .04, 0, .18, 0, MAT.woodDark, { rot: [-.2, 0, 0] });
  plane(menuStand, .22, .3, 0, .19, .025, MAT.paper, { rot: [-.2, 0, 0], receive: false });
  registerInteract('menu2', menuStand, '看菜单 / 点单', () => openMenu(), { max: 3.0 });
  // 书架（南墙）
  const shelf = group(g, -2.9, F, 2.72);
  box(shelf, 2.0, 1.9, .32, 0, .95, 0, MAT.woodDark, { cast: true, receive: true });
  for (let i = 0; i < 3; i++) box(shelf, 1.9, .05, .28, 0, .5 + i * .45, 0, MAT.woodLight);
  for (let i = 0; i < 14; i++) {
    const bw = rand(.12, .26), bh = rand(.25, .42);
    box(shelf, bw, bh, .18, -.8 + (i % 7) * .26, .62 + Math.floor(i / 7) * .45, .04, [MAT.coral, MAT.cream, MAT.indigoLight, MAT.leaf][i % 4], { receive: false });
  }
  addCollider(-4, -1.8, 2.45, 2.9, .8, 2.2, 'shelf');
  // 榻榻米角
  const tat = group(g, 2.4, F, 2.1);
  box(tat, 2.5, .05, 1.1, 0, .025, 0, MAT.tatami, { receive: true });
  box(tat, 1.0, .25, .7, 0, .18, 0, MAT.woodDark, { receive: true });
  box(tat, 1.05, .05, .75, 0, .32, 0, MAT.oak);
  for (const [x, z] of [[-.65, -.4], [.65, -.4], [-.65, .4], [.65, .4]]) {
    box(tat, .42, .1, .42, x, .1, z, MAT.creamFabric);
    registerInteract(`seat_tatami_${x}_${z}`, box(tat, .32, .03, .32, x, .16, z, MAT.creamFabric), '在榻榻米坐下', () => sitAt({ x: 2.4 + x, z: 2.1 + z, y: .8, yaw: Math.PI / 2, kind: 'tatami' }), { max: 2.2 });
  }
  // 纸灯笼
  const lantern = group(g, 2.65, 2.9, 2.55);
  cylinder(lantern, .16, .16, .3, 0, 0, 0, MAT.paperLantern || std({ color: '#f2e4c8', emissive: '#ffca86', emissiveIntensity: 1.0, roughness: .9 }), { seg: 14 });
  const lanternLight = new THREE.PointLight('#ffc47f', 2.0, 4.5, 2);
  lanternLight.position.set(2.65, 2.8, 2.55); g.add(lanternLight);
  refs.interiorLights.push(Object.assign(lanternLight, { userData: { base: 2.0 } }));
  // 唱片机
  const rec = group(g, -3.1, F, -2.3);
  box(rec, 1.1, .55, .6, 0, .28, 0, MAT.woodDark, { cast: true, receive: true });
  box(rec, 1.05, .04, .55, 0, .57, 0, MAT.woodLight);
  const platter = new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .02, 24), MAT.record);
  platter.position.set(-.1, .6, 0); rec.add(platter);
  const recordDisc = new THREE.Mesh(new THREE.CylinderGeometry(.23, .23, .012, 24), MAT.record);
  recordDisc.position.set(-.1, .618, 0); rec.add(recordDisc);
  box(rec, .04, .25, .04, .35, .72, 0, MAT.iron);
  box(rec, .03, .03, .4, .1, .8, 0, MAT.iron);
  registerInteract('record', rec, '播放 / 停止唱片', () => toggleRecord(), { max: 2.8 });
  addCollider(-3.7, -2.5, -2.6, -1.9, .8, 2.2, 'record');
  // 窗边长桌 + 高脚凳
  box(g, .55, .05, 3.4, -3.55, 1.68, -.6, MAT.oak, { receive: true });
  for (const z of [-2.2, -1.3, 1.6, 2.3]) {
    cylinder(g, .045, .05, .7, -3.55, 1.15, z, MAT.iron, { seg: 7 });
    cylinder(g, .2, .18, .06, -3.55, 1.52, z, MAT.creamFabric, { seg: 12 });
    registerInteract(`seat_window_${z}`, cylinder(g, .16, .16, .04, -3.55, 1.57, z, MAT.creamFabric, { seg: 12 }), '坐在窗边', () => sitAt({ x: -2.95, z, y: .8, yaw: Math.PI / 2, kind: 'window' }), { max: 2.2 });
  }
  addCollider(-3.9, -3.2, -2.4, 2.5, .8, 2.2, 'windowTable');
  // 冰箱 / 水槽
  box(g, 1.0, 1.9, .7, 3.35, F + .95, 1.9, std({ color: '#d6d4c8', roughness: .5, metalness: .2 }), { cast: true, receive: true });
  box(g, .06, .5, .04, 2.9, F + 1.2, 1.92, MAT.iron);
  box(g, .9, .15, .55, 3.35, F + 1.98, 1.9, MAT.woodDark);
  addCollider(2.8, 3.9, 1.5, 2.35, .8, 2.2, 'fridge');
  // 猫窝 / 猫碗
  box(g, .85, .18, .7, -1.1, F + .1, 2.55, MAT.creamFabric, { receive: true });
  box(g, .9, .35, .08, -1.1, F + .25, 2.88, MAT.creamFabric);
  box(g, .5, .06, .32, -1.8, F + .03, 2.45, MAT.ceramic);
  sphere(g, .1, -1.9, F + .08, 2.45, MAT.coral, { seg: 8 });
  // 墙面装饰
  const poster1 = plane(g, .8, 1.1, -3.0, 2.2, 2.87, std({ map: TEX.poster1, roughness: .9 }), { rot: [0, Math.PI, 0], receive: false });
  const poster2 = plane(g, .72, 1.0, 3.88, 2.3, -1.0, std({ map: TEX.poster2, roughness: .9 }), { rot: [0, -Math.PI / 2, 0], receive: false });
  // WiFi 牌 / 钟
  plane(g, .5, .3, -3.87, 2.95, -1.0, std({ color: '#f1e7d4', roughness: .8 }), { rot: [0, Math.PI / 2, 0], receive: false });
  const clock = new THREE.Mesh(new THREE.CircleGeometry(.22, 24), std({ color: '#eee7d8', roughness: .6 }));
  clock.position.set(.8, 3.15, -2.92); g.add(clock);
  cylinder(g, .018, .018, .3, .8, 3.15, -2.9, MAT.iron, { seg: 6, rot: [Math.PI / 2, 0, 0] });
  // 吊灯
  for (const [x, z] of [[-1.1, .2], [1.8, -1.1]]) {
    cylinder(g, .02, .02, 1.1, x, 3.05, z, MAT.iron, { seg: 6 });
    const shade = new THREE.Mesh(new THREE.ConeGeometry(.32, .26, 14), std({ color: '#b98e5e', roughness: .9, side: THREE.DoubleSide }));
    shade.position.set(x, 2.55, z); shade.rotation.x = Math.PI; g.add(shade);
    sphere(g, .12, x, 2.45, z, EMI.warm, { seg: 10 });
  }
  // 轨道灯
  for (const [x, z] of [[-2.8, -1.8], [0, -1.8], [2.2, -1.8]]) {
    box(g, .12, .1, .12, x, 3.58, z, MAT.blackMetal);
    sphere(g, .05, x, 3.48, z, EMI.warmSoft, { seg: 8 });
  }
  // 吊扇
  const fan = group(g, 0, 3.45, 0);
  cylinder(fan, .06, .06, .2, 0, .1, 0, MAT.iron, { seg: 8 });
  const fanBlades = group(fan, 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const b = box(fanBlades, 1.2, .025, .16, .6, 0, 0, MAT.woodLight, { rot: [0, i * Math.PI / 2, 0] });
  }
  const fanLight = new THREE.PointLight('#ffd2a0', 4, 6, 2);
  fanLight.position.set(0, 3.3, 0); g.add(fanLight);
  refs.interiorLights.push(Object.assign(fanLight, { userData: { base: 4 } }));

  // 室内主光
  for (const [x, z, base] of [[-1.8, .6, 9], [1.8, -1.0, 10], [2.6, 1.6, 6], [-3.0, -1.8, 5]]) {
    const pl = new THREE.PointLight('#ffc27c', base, 8, 2);
    pl.position.set(x, 3.05, z); g.add(pl);
    refs.interiorLights.push(Object.assign(pl, { userData: { base } }));
  }
  const coolWindow = new THREE.PointLight('#bcd8e0', 3.2, 6, 2);
  coolWindow.position.set(-3.4, 2.2, 1.0); g.add(coolWindow);
  // 门口和招牌的暖光
  const doorGlow = new THREE.PointLight('#ffc27d', 4.2, 4.5, 2);
  doorGlow.position.set(-4.7, 2.5, .6); g.add(doorGlow);
  const signLight = new THREE.PointLight('#ffc27d', 5.5, 5, 2);
  signLight.position.set(-4.7, 2.4, -1.5); g.add(signLight);
  const norenLight = new THREE.PointLight('#ffc27d', 4.5, 4.5, 2);
  norenLight.position.set(-4.8, 2.2, .55); g.add(norenLight);

  /* ---------- 咖啡杯 / 猫 ---------- */
  const cup = group(camera, .3, -.27, -.58);
  makeCup(cup, 0, 0, 0, '#f0e7d6', 1.35);
  cup.visible = false;
  refs.cupInHand = cup;

  const cat = buildCat(g);
  refs.cat = cat;

  // 交互：门 / 风铃 / 灯开关 / 窗 / 菜单
  refs.cafe = {
    group: g, door: { group: door, left: panelL, right: panelR, open: false, target: 0, anim: 0, collider: null },
    noren: { mesh: noren, base: norenBase }, chime: null, umbrella: umbState, umbrellaGroup: canopy,
    seats, cat, recordDisc, fanBlades, poster1, poster2,
  };
  registerInteract('door', door, '推开门 / 关上门', () => toggleDoor(), { max: 3.0 });
  const doorCol = { x0: -4.18, x1: -3.86, z0: -.32, z1: 1.52, minY: 0, maxY: 5, tag: 'door', disabled: false };
  colliders.push(doorCol); refs.cafe.door.collider = doorCol;
  addCollider(-4.2, -3.8, -3.1, -.32, .5, 6, 'frontWallS');
  addCollider(-4.2, -3.8, 1.52, 3.1, .5, 6, 'frontWallN');
  addCollider(3.8, 4.2, -3.1, 3.1, .5, 6, 'eastWall');
  addCollider(-4.2, 4.2, -3.1, -2.8, .5, 6, 'northWall');
  addCollider(-4.2, 4.2, 2.8, 3.1, .5, 6, 'southWall');
  // 风铃
  const chime = group(g, -4.65, 2.62, -1.0);
  cylinder(chime, .16, .12, .05, 0, 0, 0, MAT.cream, { seg: 12 });
  for (let i = 0; i < 3; i++) {
    const t = group(chime, Math.cos(i * 2.1) * .12, -.32 - i * .04, Math.sin(i * 2.1) * .12);
    cylinder(t, .012, .012, .3, 0, -.15, 0, MAT.glass, { seg: 6 });
    box(t, .07, .1, .012, 0, -.34, 0, MAT.cream, { receive: false });
    chime.userData[`t${i}`] = t;
  }
  refs.cafe.chime = chime;
  registerInteract('chime', chime, '碰一下风铃', () => ringChime(), { max: 3.2 });
  // 灯开关
  const sw = group(g, -3.86, 1.55, 1.85);
  box(sw, .12, .24, .03, 0, 0, 0, MAT.cream);
  box(sw, .05, .1, .025, 0, 0, .02, MAT.brass);
  registerInteract('lights', sw, '开关室内灯', () => toggleLights(), { max: 2.4 });

  // 室内座位：窗边已在上面注册；露台座位已注册
  // 猫初始位置
  cat.group.position.set(-8.45, .45, 2.55);
  return refs.cafe;
}

/* ---------------- 猫 ---------------- */
function buildCat(parent) {
  const g = new THREE.Group();
  const fur = MAT.catFur;
  const body = sphere(g, .22, 0, .26, 0, fur, { sx: 1.5, sy: .85, sz: .9, seg: 12, cast: true });
  const head = sphere(g, .16, .3, .42, 0, fur, { sx: 1, sy: .95, sz: 1, seg: 12, cast: true });
  for (const z of [-.1, .1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(.07, .16, 4), fur);
    ear.position.set(.32, .57, z); ear.rotation.z = .1; g.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(.035, .09, 4), std({ color: '#c98c82', roughness: .9 }));
    inner.position.set(.32, .57, z); inner.rotation.z = .1; g.add(inner);
  }
  for (const z of [-.055, .055]) sphere(g, .022, .44, .44, z, std({ color: '#2d2a25', roughness: .3 }), { seg: 6 });
  sphere(g, .018, .46, .4, 0, std({ color: '#b9766b', roughness: .5 }), { seg: 6 });
  // 尾巴
  const tail = [];
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.025 - i * .003, .028 - i * .003, .18, 6), fur);
    t.position.set(-.35 - i * .12, .3 + i * .06, 0);
    t.rotation.z = -.6 + i * .15; t.castShadow = true;
    g.add(t); tail.push(t);
  }
  // 腿
  for (const [x, z] of [[-.2, -.12], [-.2, .12], [.18, -.12], [.18, .12]]) {
    const leg = cylinder(g, .035, .04, .22, x, .12, z, fur, { seg: 6 });
  }
  // 项圈
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.16, .018, 5, 12), MAT.coral);
  collar.position.set(.28, .33, 0); collar.rotation.y = Math.PI / 2; g.add(collar);
  sphere(g, .025, .28, .27, .16, MAT.brass, { seg: 6 });
  g.scale.setScalar(.9);
  g.rotation.y = .6;
  g.position.set(-8.45, .45, 2.55);
  parent.add(g);
  const waypoints = [
    { x: -8.45, z: 2.55, pause: 3 },
    { x: -5.15, z: .95, pause: 2 },
    { x: -3.3, z: .7, pause: 1 },
    { x: -2.4, z: 2.25, pause: 4 },
    { x: -3.3, z: .7, pause: 1 },
    { x: -5.15, z: .95, pause: 2 },
  ];
  const cat = {
    group: g, waypoints, index: 1, wait: 1, speed: .42, purr: 0,
    tail, hearts: [], petCooldown: 0, paused: 0,
  };
  // 爱心粒子贴图
  const heartTex = canvasTexture(64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#e58b84';
    ctx.beginPath(); ctx.moveTo(32, 56); ctx.bezierCurveTo(4, 34, 28, 6, 32, 24); ctx.bezierCurveTo(36, 6, 60, 34, 32, 56); ctx.fill();
  });
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, opacity: 0, depthWrite: false, color: '#ffb3a8' }));
    s.scale.set(.18, .18, 1); s.visible = false; g.add(s); cat.hearts.push(s);
  }
  mergeLocalChildren(g, new Set(tail));
  registerInteract('cat', g, '摸摸小潮', () => petCat(), { max: 3.2, dynamic: true });
  return cat;
}

/* ---------------- 咖啡馆更新 ---------------- */
function updateCafe(dt, t) {
  const c = refs.cafe;
  if (!c) return;
  // 门
  const d = c.door;
  d.anim = damp(d.anim, d.target, 5, dt);
  const open = d.anim;
  d.left.position.z = -.45 - open * .82;
  d.right.position.z = .45 + open * .82;
  // 暖帘
  const pos = c.noren.mesh.geometry.attributes.position;
  const base = c.noren.base;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3], y = base[i * 3 + 1];
    pos.setZ(i, Math.sin(x * 2.6 + t * 1.25 + y * 1.5) * .045 * (.4 + y) + Math.sin(t * .8) * .012);
  }
  pos.needsUpdate = true;
  // 风铃
  if (c.chime) {
    for (let i = 0; i < 3; i++) {
      const tube = c.chime.userData[`t${i}`];
      if (tube) { tube.rotation.z = Math.sin(t * 1.2 + i * .7) * .22; tube.rotation.x = Math.cos(t * .9 + i) * .1; }
    }
  }
  // 遮阳伞
  const umb = c.umbrella;
  umb.anim = damp(umb.anim ?? 1, umb.target, 4, dt);
  const scale = .16 + .84 * umb.anim;
  if (c.umbrellaGroup) {
    c.umbrellaGroup.scale.set(scale, 1, scale);
    c.umbrellaGroup.visible = umb.anim > .02;
  }
  // 唱片
  if (c.recordDisc && state.musicOn) c.recordDisc.rotation.y += dt * 2.2;
  // 吊扇
  if (c.fanBlades) c.fanBlades.rotation.y += dt * .7;
  // 猫
  updateCat(dt, t);
}

function updateCat(dt, t) {
  const cat = refs.cat;
  if (!cat) return;
  cat.petCooldown = Math.max(0, cat.petCooldown - dt);
  if (cat.paused > 0) cat.paused -= dt;
  if (cat.paused <= 0) {
    const wp = cat.waypoints[cat.index % cat.waypoints.length];
    const dx = wp.x - cat.group.position.x, dz = wp.z - cat.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < .12) {
      cat.wait -= dt;
      if (cat.wait <= 0) { cat.index++; cat.wait = 2 + Math.random() * 2.5; }
    } else {
      const step = Math.min(dist, cat.speed * dt);
      cat.group.position.x += dx / dist * step;
      cat.group.position.z += dz / dist * step;
      cat.group.rotation.y = dampAngle(cat.group.rotation.y, Math.atan2(dx, dz), 4, dt);
    }
  }
  cat.group.position.y = groundHeight(cat.group.position.x, cat.group.position.z) + .02;
  // 尾巴
  cat.tail.forEach((seg, i) => { seg.rotation.z = -.6 + i * .15 + Math.sin(t * 2 + i * .5 + cat.index) * .12; });
  // 爱心
  cat.hearts.forEach((h, i) => {
    if (cat.purr > 0) {
      h.visible = true;
      const p = (t * .35 + i * .18) % 1;
      h.position.set(Math.sin(i * 2.1) * .25 + p * .3, .55 + p * .8, Math.cos(i * 2.1) * .2);
      h.material.opacity = Math.sin(p * Math.PI) * .85;
    } else { h.material.opacity = damp(h.material.opacity, 0, 4, dt); if (h.material.opacity < .02) h.visible = false; }
  });
  cat.purr = Math.max(0, cat.purr - dt);
}
