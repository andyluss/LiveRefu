// kit.js · 共享的卡通材质、几何小工具与画布贴图工厂
import * as THREE from 'three';

// ---------- 可复现的随机数（商品/贝壳/草丛排布） ----------
export function rng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- 三渲二渐变色阶 ----------
const toonSteps = new Uint8Array([92, 158, 214, 255]);
export const gradientMap = new THREE.DataTexture(toonSteps, toonSteps.length, 1, THREE.RedFormat);
gradientMap.minFilter = THREE.NearestFilter;
gradientMap.magFilter = THREE.NearestFilter;
gradientMap.generateMipmaps = false;
gradientMap.needsUpdate = true;

const ink = new THREE.MeshBasicMaterial({ color: '#1b2430', side: THREE.BackSide });

// 卡通材质。options: map / emissive / emissiveIntensity / transparent / opacity / side / flat
export function toon(color, o = {}) {
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap,
    map: o.map || null,
    emissive: o.emissive || '#000000',
    emissiveMap: o.emissiveMap || null,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    transparent: !!o.transparent,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
  });
  if (o.depthWrite === false) m.depthWrite = false;
  return m;
}

export function lit(color, o = {}) {
  const m = new THREE.MeshBasicMaterial({
    color,
    map: o.map || null,
    transparent: !!o.transparent,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
    blending: o.blending ?? THREE.NormalBlending,
    depthWrite: o.depthWrite ?? true,
    toneMapped: o.toneMapped ?? false,
  });
  return m;
}

export function glass(o = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: o.color || '#bfe4e8',
    transparent: true,
    opacity: o.opacity ?? 0.16,
    roughness: o.roughness ?? 0.08,
    metalness: 0,
    transmission: 0,
    side: o.side ?? THREE.DoubleSide,
    depthWrite: false,
  });
}

// ---------- 几何 ----------
export function box(parent, w, h, d, x, y, z, mat, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  parent.add(m);
  if (o.outline) outline(m, o.outline === true ? 1.012 : o.outline);
  return m;
}

export function cyl(parent, rt, rb, h, x, y, z, mat, o = {}) {
  const g = new THREE.CylinderGeometry(rt, rb, h, o.seg || 16, o.hSeg || 1, o.open || false);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  parent.add(m);
  if (o.outline) outline(m, o.outline === true ? 1.03 : o.outline);
  return m;
}

export function sph(parent, r, x, y, z, mat, o = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 16, o.seg2 || 12), mat);
  m.position.set(x, y, z);
  if (o.scale) m.scale.set(o.scale[0], o.scale[1], o.scale[2]);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  parent.add(m);
  if (o.outline) outline(m, o.outline === true ? 1.03 : o.outline);
  return m;
}

export function plane(parent, w, h, x, y, z, mat, o = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, o.seg || 1, o.seg2 || 1), mat);
  m.position.set(x, y, z);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  m.receiveShadow = o.receive ?? true;
  parent.add(m);
  return m;
}

// 反向外壳描边：只给需要“墨线”的大形体使用
export function outline(mesh, scale = 1.015) {
  const o = new THREE.Mesh(mesh.geometry, ink);
  o.scale.setScalar(scale);
  o.castShadow = false;
  o.receiveShadow = false;
  o.renderOrder = -1;
  mesh.add(o);
  return o;
}

// 圆角矩形贴图底板（招牌、路牌、海报共用）
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ---------- 画布贴图 ----------
export function canvasTexture(w, h, draw, o = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  if (o.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(o.repeat[0], o.repeat[1]);
  }
  if (o.clamp !== false) {
    t.wrapS = o.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.wrapT = o.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  }
  return t;
}

const JP_FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans JP","Avenir Next",sans-serif';
const EN_FONT = '"Avenir Next","Helvetica Neue",Helvetica,Arial,sans-serif';

export function jp(ctx, size, weight = 'bold') { ctx.font = `${weight} ${size}px ${JP_FONT}`; }
export function en(ctx, size, weight = '600') { ctx.font = `${weight} ${size}px ${EN_FONT}`; }

// 让一行文字自动缩到给定宽度
export function fitText(ctx, text, maxW, size, font = jp, weight = 'bold') {
  let s = size;
  font(ctx, s, weight);
  while (ctx.measureText(text).width > maxW && s > 8) {
    s -= 2;
    font(ctx, s, weight);
  }
  return s;
}

// 柔和径向光晕（Sprite 用）
export const glowMap = canvasTexture(256, 256, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,.72)');
  g.addColorStop(0.46, 'rgba(255,255,255,.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});

// 柔边雾团
export const mistMap = canvasTexture(128, 128, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,.9)');
  g.addColorStop(0.45, 'rgba(235,248,255,.4)');
  g.addColorStop(1, 'rgba(220,245,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});

// 水波/涟漪用的环
export const ringMap = canvasTexture(128, 128, (ctx, w, h) => {
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.28, 0, Math.PI * 2);
  ctx.stroke();
});

export function sprite(parent, map, color, size, x, y, z, o = {}) {
  const m = new THREE.SpriteMaterial({
    map,
    color,
    transparent: true,
    opacity: o.opacity ?? 0.8,
    blending: o.blending ?? THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  s.position.set(x, y, z);
  s.userData.baseOpacity = m.opacity;
  parent.add(s);
  return s;
}

// 梯形/异形体：用 Shape + Extrude 做简单轮廓
export function extrude(parent, shape, depth, x, y, z, mat, o = {}) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: o.bevel !== false, bevelThickness: o.bevelSize || 0.03,
    bevelSize: o.bevelSize || 0.03, bevelSegments: 1, curveSegments: o.curveSegments || 6,
  });
  g.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  if (o.outline) outline(m, o.outline === true ? 1.01 : o.outline);
  return m;
}

// 一条悬垂的线（电线、绳）
export function sagLine(parent, a, b, sag, color = '#20242b', mid = 24, opacity = 1) {
  const pts = [];
  for (let i = 0; i <= mid; i++) {
    const t = i / mid;
    const x = lerp(a.x, b.x, t);
    const z = lerp(a.z, b.z, t);
    const y = lerp(a.y, b.y, t) - Math.sin(Math.PI * t) * sag;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, toneMapped: false });
  const l = new THREE.Line(g, mat);
  parent.add(l);
  return l;
}

// 简单的重复点线（用于低矮护栏）
export function instancedBoxes(parent, geometry, material, transforms) {
  const im = new THREE.InstancedMesh(geometry, material, transforms.length);
  const m = new THREE.Matrix4();
  transforms.forEach((t, i) => {
    m.compose(t.pos, t.quat || new THREE.Quaternion(), t.scale || new THREE.Vector3(1, 1, 1));
    im.setMatrixAt(i, m);
  });
  im.castShadow = true; im.receiveShadow = true;
  im.instanceMatrix.needsUpdate = true;
  parent.add(im);
  return im;
}

// 让网格整体不投影（细碎商品用）
export function noShadow(root) {
  root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return root;
}
