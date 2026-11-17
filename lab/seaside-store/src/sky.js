// sky.js · 远处的薄云与归鸟（天幕本身是 main.js 里的全屏黄昏背景）
import * as THREE from 'three';
import { mistMap, rng, sprite } from './kit.js';

export function buildSky(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const sunDir = new THREE.Vector3(-0.42, 0.045, -0.9).normalize();
  const r = rng(21);

  // 远处薄云：只在模型后方露出一点，给背景加空气
  const clouds = [];
  const cloudDefs = [
    [-150, 34, -205, 70, 0.1], [-42, 48, -245, 92, 0.08], [70, 30, -225, 76, 0.09],
    [164, 56, -245, 100, 0.065], [-210, 26, -185, 60, 0.075], [24, 22, -210, 54, 0.065],
  ];
  for (const [x, y, z, s, o] of cloudDefs) {
    const c = sprite(group, mistMap, r() > 0.5 ? '#ffc3a1' : '#e0a6b0', s, x, y, z, { opacity: o });
    c.material.blending = THREE.AdditiveBlending;
    c.scale.set(s * 2.2, s * 0.5, 1);
    c.userData = { baseX: x, speed: 0.8 + r() * 0.9 };
    clouds.push(c);
  }

  // 归鸟：几笔 V 字，慢慢掠过
  const birds = [];
  const birdMat = new THREE.LineBasicMaterial({ color: '#2c3444', transparent: true, opacity: 0.42 });
  for (let i = 0; i < 5; i++) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0.12, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.5, 0.12, 0),
    ]);
    const b = new THREE.Line(g, birdMat);
    b.position.set(-40 + i * 9, 30 + (i % 3) * 2.2, -118 - (i % 2) * 8);
    b.userData = { y0: b.position.y, ph: i * 1.7, sp: 0.8 + i * 0.12 };
    group.add(b);
    birds.push(b);
  }

  return {
    group,
    sunDir,
    update(t) {
      for (const c of clouds) {
        c.position.x = c.userData.baseX + Math.sin(t * 0.012 * c.userData.speed) * 8;
      }
      for (const b of birds) {
        b.position.x += 0.012 * b.userData.sp;
        if (b.position.x > 60) b.position.x = -60;
        b.position.y = b.userData.y0 + Math.sin(t * 0.5 + b.userData.ph) * 0.6;
        b.rotation.z = Math.sin(t * 1.6 + b.userData.ph) * 0.18;
      }
    },
  };
}
