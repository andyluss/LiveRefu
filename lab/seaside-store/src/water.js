// water.js · 海面、浪花、积水倒影与涟漪
import * as THREE from 'three';
import { canvasTexture, lit, ringMap, rng } from './kit.js';

const FOG = new THREE.Color('#d9a99b');

export function buildSea(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const uniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color('#2c6d87') },
    uMid: { value: new THREE.Color('#4a97a8') },
    uShallow: { value: new THREE.Color('#7fc9c4') },
    uSky: { value: new THREE.Color('#ffcfae') },
    uSun: { value: new THREE.Color('#ffd9a4') },
    uSunDir: { value: new THREE.Vector3(-0.42, 0.05, -0.9).normalize() },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vWave;
      void main() {
        vUv = uv;
        vec3 p = position;
        // 靠岸更平缓，离岸浪稍大
        float shore = smoothstep(0.0, 0.35, uv.y);
        float w = sin(p.x * 0.95 + uTime * 1.05) * 0.034
                + sin(p.x * 2.2 - uTime * 0.8 + p.y * 1.9) * 0.018
                + sin(p.y * 3.0 + uTime * 0.55) * 0.012;
        w *= mix(0.35, 1.0, shore);
        p.z += w;
        vWave = w;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 uDeep, uMid, uShallow, uSky, uSun, uSunDir;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vWave;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      // 与顶点位移一致的解析法线
      vec3 waveNormal(vec2 xz) {
        float dx = cos(xz.x * 0.95 + uTime * 1.05) * 0.95 * 0.034
                 + cos(xz.x * 2.2 - uTime * 0.8 + xz.y * 1.9) * 2.2 * 0.018;
        float dz = cos(xz.x * 2.2 - uTime * 0.8 + xz.y * 1.9) * 1.9 * 0.018
                 + cos(xz.y * 3.0 + uTime * 0.55) * 3.0 * 0.012;
        return normalize(vec3(-dx, 1.0, -dz));
      }

      void main() {
        // vUv.y: 0 = 近岸，1 = 远海
        float shore = 1.0 - smoothstep(0.0, 0.22, vUv.y);
        vec3 base = mix(uMid, uDeep, smoothstep(0.08, 0.9, vUv.y));
        base = mix(base, uShallow, shore * 0.55);

        vec3 n = waveNormal(vWorld.xz);
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 L = normalize(uSunDir);

        float diff = clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
        base *= 0.9 + 0.16 * diff;

        // 轻微的天光反射，保留海水的蓝绿色
        float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0);
        base = mix(base, uSky, fres * 0.18);

        // 夕阳碎金
        vec3 R = reflect(-L, n);
        float spec = pow(max(dot(R, V), 0.0), 220.0);
        base += uSun * smoothstep(0.5, 0.95, spec) * 0.5;
        float glitter = step(0.997, hash(floor(vec2(vWorld.x, vWorld.z) * 26.0) + floor(uTime * 2.0)));
        base += uSun * glitter * 0.08;

        // 细长的浪纹
        float w1 = sin(vWorld.z * 6.0 + vWorld.x * 0.4 - uTime * 0.9) * 0.5 + 0.5;
        float waveCrest = smoothstep(0.9, 0.995, w1);
        base += vec3(0.10, 0.20, 0.20) * waveCrest * (1.0 - shore) * 0.12;

        // 夕阳在水面拉出的一条金线
        float path = exp(-pow((vWorld.x + 13.0) / 4.0, 2.0)) * smoothstep(0.2, 0.95, vUv.y);
        base += uSun * path * 0.15 * (0.6 + 0.4 * sin(uTime * 0.4));

        // 近岸泡沫：两道来回的白色细边
        float n1 = hash(floor(vec2(vWorld.x * 18.0, vWorld.z * 40.0 + uTime * 4.0)));
        float wash = smoothstep(0.12, 0.0, vUv.y) * (0.62 + 0.38 * sin(uTime * 1.2 + vWorld.x * 0.7));
        float lace = smoothstep(0.52, 0.95, sin(vUv.x * 130.0 + sin(vUv.x * 8.0 + uTime) * 2.0) * 0.5 + 0.5);
        float foam = wash * (0.45 + 0.55 * step(0.3, n1)) + lace * 0.14 * smoothstep(0.22, 0.0, vUv.y);
        base = mix(base, vec3(0.97, 0.98, 0.95), clamp(foam, 0.0, 0.95));

        // 零星白浪，别做成整片泡沫
        float cap = step(0.9965, hash(floor(vec2(vWorld.x, vWorld.z) * 9.0) + floor(uTime * 0.6)));
        base = mix(base, vec3(0.93, 0.98, 0.96), cap * smoothstep(0.15, 0.6, vUv.y) * 0.28);

        // 与远处雾色轻微融合
        vec3 fogCol = vec3(0.86, 0.68, 0.63);
        base = mix(base, fogCol, smoothstep(0.85, 1.0, vUv.y) * 0.08);

        float alpha = 0.94 - shore * 0.14;
        gl_FragColor = vec4(base, alpha);
        #include <colorspace_fragment>
      }`,
  });

  const geo = new THREE.PlaneGeometry(36, 6.0, 110, 36);
  const sea = new THREE.Mesh(geo, mat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.42, -15.0);
  sea.receiveShadow = false;
  group.add(sea);

  // 半透明树脂水体（底座切面）
  const volume = new THREE.Mesh(
    new THREE.BoxGeometry(36, 0.66, 6.0),
    new THREE.MeshPhysicalMaterial({
      color: '#4c9ba8', transparent: true, opacity: 0.38, roughness: 0.15,
      metalness: 0, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  volume.position.set(0, -0.77, -15.0);
  volume.renderOrder = 1;
  group.add(volume);

  // 底座北缘的水体切面：像一层半透明树脂，能看到水色分层与顶部泡沫
  const cutTex = canvasTexture(1024, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(198,247,241,.98)');
    g.addColorStop(0.08, 'rgba(112,206,208,.95)');
    g.addColorStop(0.45, 'rgba(60,143,164,.95)');
    g.addColorStop(1, 'rgba(26,70,92,.98)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 顶部泡沫
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.fillRect(0, 0, w, 7);
    // 水层细纹
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.03 + (i % 3) * 0.02})`;
      ctx.fillRect(0, 18 + i * 14 + (i % 2) * 4, w, 2);
    }
    // 细小气泡
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(230,255,255,${0.1 + (i % 3) * 0.08})`;
      ctx.beginPath();
      ctx.arc((i * 137) % w, 12 + ((i * 53) % (h - 20)), 1 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    // 底部沉积
    ctx.fillStyle = 'rgba(20,40,52,.35)';
    ctx.fillRect(0, h - 12, w, 12);
  });
  const cutMat = new THREE.MeshBasicMaterial({
    map: cutTex, transparent: true, opacity: 0.92, side: THREE.DoubleSide,
    depthWrite: false, toneMapped: false,
  });
  const cutFace = new THREE.Mesh(new THREE.PlaneGeometry(36, 0.7), cutMat);
  cutFace.position.set(0, -0.77, -18.025);
  cutFace.rotation.y = Math.PI;
  cutFace.renderOrder = 4;
  group.add(cutFace);

  // 浪花贴岸的白色泡沫带
  const foamMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main(){
        float x = vUv.x;
        float edge = 0.5 + 0.5 * sin(x * 9.0 + uTime * 0.8) * sin(x * 23.0 - uTime * 0.5);
        float wash = smoothstep(0.7, 0.0, abs(vUv.y - (0.5 + 0.22 * sin(uTime * 1.1 + x * 6.0)))) ;
        float n = hash(floor(vec2(x * 150.0, vUv.y * 22.0 + uTime * 5.0)));
        float a = wash * smoothstep(0.35, 0.9, n) * (0.45 + 0.55 * edge);
        vec3 col = mix(vec3(0.86,0.95,0.95), vec3(1.0,0.99,0.94), a);
        gl_FragColor = vec4(col, a * 0.9);
        #include <colorspace_fragment>
      }`,
  });
  // 贴岸的白色泡沫细线（独立一层，保证远处也能看见）
  const foamLineTex = canvasTexture(768, 96, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 150; i++) {
      const x = (i / 150) * w + Math.sin(i * 2.1) * 8;
      const y = h * 0.5 + Math.sin(i * 0.7) * h * 0.16;
      const r = 4 + (i % 5) * 3;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
      g.addColorStop(0, 'rgba(255,255,255,.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, r * 2.4, r, 0, 0, Math.PI * 2); ctx.fill();
    }
  });
  foamLineTex.wrapS = foamLineTex.wrapT = THREE.RepeatWrapping;
  const foamLineMat = new THREE.MeshBasicMaterial({
    map: foamLineTex, color: '#f7fbf4', transparent: true, opacity: 0.72,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const foamLine = new THREE.Mesh(new THREE.PlaneGeometry(36, 0.52), foamLineMat);
  foamLine.rotation.x = -Math.PI / 2;
  foamLine.position.set(0, -0.397, -11.7);
  foamLine.renderOrder = 5;
  group.add(foamLine);
  const foamLine2 = new THREE.Mesh(new THREE.PlaneGeometry(36, 0.3), foamLineMat.clone());
  foamLine2.material.opacity = 0.4;
  foamLine2.rotation.x = -Math.PI / 2;
  foamLine2.position.set(0, -0.405, -11.92);
  foamLine2.renderOrder = 4;
  group.add(foamLine2);

  const foam = new THREE.Mesh(new THREE.PlaneGeometry(36, 1.5, 1, 1), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, -0.335, -11.45);
  foam.renderOrder = 3;
  group.add(foam);

  return {
    group,
    update(t) {
      uniforms.uTime.value = t;
      foamMat.uniforms.uTime.value = t;
      foamLineTex.offset.x = t * 0.006;
      foamLineMat.opacity = 0.62 + Math.sin(t * 0.9) * 0.1;
    },
  };
}

// 地面上的浅水洼：映晚霞、灯色与细碎波纹
export function buildPuddle(scene, { x, z, rx, rz, y = 0.012, tint = '#ffb08a', warm = '#ffcf8a', seed = 1 }) {
  const uniforms = {
    uTime: { value: 0 },
    uTint: { value: new THREE.Color(tint) },
    uWarm: { value: new THREE.Color(warm) },
    uCool: { value: new THREE.Color('#6e93b1') },
    uSeed: { value: seed },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uSeed;
      uniform vec3 uTint, uWarm, uCool;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main(){
        vec2 p = vUv - 0.5;
        float r = length(p);
        float edge = smoothstep(0.5, 0.32, r);
        // 上半映晚霞、下半映天空的柔和过渡
        vec3 col = mix(uCool, uTint, 0.38 + smoothstep(0.1, 0.9, vUv.y) * 0.34);
        // 灯影/招牌倒影的纵向长条
        float streak = smoothstep(0.26, 0.02, abs(p.x - 0.04)) * smoothstep(0.5, 0.08, r);
        col = mix(col, uWarm, streak * 0.52);
        // 极细的涟漪与碎光
        float ripple = sin(length(p * vec2(1.0, 1.7)) * 42.0 - uTime * 1.35 + uSeed) * 0.5 + 0.5;
        col += vec3(0.72, 0.86, 0.9) * smoothstep(0.94, 1.0, ripple) * 0.16;
        float spark = step(0.992, hash(floor(vUv * 48.0) + floor(uTime * 2.0)));
        col += vec3(1.0, 0.9, 0.72) * spark * 0.3;
        float breathe = 0.9 + 0.1 * sin(uTime * 0.6 + uSeed * 3.0);
        gl_FragColor = vec4(col * breathe, edge * 0.55);
        #include <colorspace_fragment>
      }`,
  });
  const g = new THREE.CircleGeometry(1, 40);
  // 轻微的不规则形，避免完美圆
  const pos = g.attributes.position;
  const r = rng(seed * 17 + 3);
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getY(i), pos.getX(i));
    const k = 1 + Math.sin(a * 3 + seed) * 0.08 + (r() - 0.5) * 0.06;
    pos.setXY(i, pos.getX(i) * k, pos.getY(i) * k);
  }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(rx, rz, 1);
  mesh.position.set(x, y, z);
  mesh.renderOrder = 2;
  scene.add(mesh);
  return {
    mesh,
    update(t) { uniforms.uTime.value = t; },
  };
}

// 路面/湿地上的暖色反光条
export function reflectionStreak(scene, x, z, w, len, color = '#ffc98f', opacity = 0.35) {
  const tex = canvasTexture(128, 256, (ctx, cw, ch) => {
    const g = ctx.createRadialGradient(cw / 2, 0, 4, cw / 2, 0, ch);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.35, 'rgba(255,255,255,.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
  });
  const mat = new THREE.MeshBasicMaterial({
    map: tex, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.019, z);
  m.renderOrder = 2;
  scene.add(m);
  return m;
}

// 水滴涟漪：从中心扩散的柔环
export function buildRipples(scene, max = 12) {
  const items = [];
  for (let i = 0; i < max; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: ringMap, color: '#f3ffff', transparent: true, opacity: 0,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    m.renderOrder = 4;
    scene.add(m);
    items.push({ mesh: m, age: 0, life: 0, active: false, size: 1 });
  }
  let next = 0;
  return {
    spawn(x, y, z, size = 1) {
      const it = items[next++ % items.length];
      it.mesh.position.set(x, y, z);
      it.mesh.visible = true;
      it.age = 0; it.life = 2.2; it.size = size; it.active = true;
    },
    update(dt) {
      for (const it of items) {
        if (!it.active) continue;
        it.age += dt;
        const t = it.age / it.life;
        if (t >= 1) { it.active = false; it.mesh.visible = false; continue; }
        const s = (0.25 + t * 1.7) * it.size;
        it.mesh.scale.set(s, s, 1);
        it.mesh.material.opacity = (1 - t) * 0.55;
      }
    },
  };
}
