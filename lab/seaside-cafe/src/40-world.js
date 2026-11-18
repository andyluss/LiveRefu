/* ============================================================
   世界：天空 / 光 / 地形 / 海 / 海滨步道 / 灯塔 / 神社 / 渔港
   ============================================================ */

/* ---------------- 天空 ---------------- */
function buildSky() {
  const g = new THREE.Group();
  root.add(g);
  const uniforms = {
    uTop: { value: new THREE.Color('#26334d') },
    uMid: { value: new THREE.Color('#b97068') },
    uHorizon: { value: new THREE.Color('#f39a68') },
    uSun: { value: new THREE.Color('#ffb36b') },
    uSunDir: { value: new THREE.Vector3(-.8, .1, -.3).normalize() },
    uNight: { value: 0 },
    uRain: { value: 0 },
    uTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uTop, uMid, uHorizon, uSun, uSunDir;
      uniform float uNight, uRain, uTime;
      varying vec3 vDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.2, 1.0);
        vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.24, h));
        col = mix(col, uTop, smoothstep(0.18, 0.82, h));
        // 低空海雾
        col = mix(col, mix(uHorizon, vec3(.72,.78,.77), .45), smoothstep(.02, -.06, h) * .45);

        vec3 sd = normalize(uSunDir);
        float sunDot = max(dot(d, sd), 0.0);
        float halo = pow(sunDot, 5.0);
        float disc = smoothstep(.9991, .9997, sunDot);
        float horizonMask = smoothstep(-.14, .02, h) * (1.0 - smoothstep(.45, .84, h));
        col += uSun * halo * .22 * (1. - uNight * .72) * (1. - uRain * .7) * horizonMask;
        col = mix(col, uSun, disc * (1. - uNight) * (1. - uRain * .8) * .92);

        // 夜晚的月亮
        float moonDot = max(dot(d, normalize(vec3(-sd.x, max(.22, -sd.y), -sd.z))), 0.0);
        float moon = smoothstep(.9994, .9998, moonDot);
        col += uSun * moon * uNight * .55;
        col = mix(col, vec3(.92,.95,1.), moon * uNight * .85);

        // 星
        float starZone = smoothstep(.06, .42, h);
        vec2 sp = floor(d.xz * 150.0);
        float st = step(.9963, hash(sp)) * (.55 + .45 * sin(uTime * .6 + hash(sp + 9.) * 30.));
        col += vec3(.92,.96,1.) * st * starZone * uNight * .7 * (1. - uRain);

        col += (hash(gl_FragCoord.xy) - .5) * .009;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(250, 32, 20), mat);
  dome.frustumCulled = false;
  g.add(dome);

  // 太阳 / 月亮光晕
  const sunSprite = sprite(g, GLOW_TEX, '#ffd2a0', 26, -100, 9, -60, .42);
  const moonSprite = sprite(g, GLOW_TEX, '#dce8ff', 10, 80, 60, -120, 0);
  // 云：低多边形柔片
  const cloudTex = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      const x = 28 + Math.random() * (w - 56), y = 42 + Math.random() * (h - 60), r = 15 + Math.random() * 28;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,.42)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  });
  const clouds = [];
  const cloudDefs = [[-80, 38, -60, 50, .26], [-20, 46, -90, 66, .22], [60, 52, -80, 55, .18], [120, 34, -40, 48, .16], [-130, 30, -20, 44, .14]];
  for (const [x, y, z, s, o] of cloudDefs) {
    const m = new THREE.SpriteMaterial({ map: cloudTex, color: '#f5e8d8', transparent: true, opacity: o, depthWrite: false, fog: false });
    const sp = new THREE.Sprite(m);
    sp.position.set(x, y, z); sp.scale.set(s * 2.2, s * .65, 1);
    clouds.push(sp);
  }

  // 星空
  const starCount = 700, pos = [];
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2, y = Math.random() * .9 + .05, r = Math.sqrt(1 - y * y);
    pos.push(Math.cos(a) * r * 230, y * 230, Math.sin(a) * r * 230);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#e8f1ff', size: .8, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true, fog: false }));
  g.add(stars);

  refs.sky = { group: g, uniforms, sunSprite, moonSprite, clouds, stars, dome };
  return refs.sky;
}

function buildLighting() {
  const sun = new THREE.DirectionalLight('#fff1d6', 2.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  sun.shadow.camera.near = .5; sun.shadow.camera.far = 160;
  sun.shadow.bias = -.0003; sun.shadow.normalBias = .055;
  sun.target.position.set(0, 0, 0);
  scene.add(sun); scene.add(sun.target);
  refs.sun = sun;

  const fill = new THREE.DirectionalLight('#9cc7d8', .42);
  fill.position.set(30, 28, 20);
  scene.add(fill);
  refs.fill = fill;

  const hemi = new THREE.HemisphereLight('#d6e5e8', '#4a4438', .78);
  scene.add(hemi);
  refs.hemi = hemi;
  const ambient = new THREE.AmbientLight('#5d6b75', .22);
  scene.add(ambient);
  refs.ambient = ambient;
}

/* ---------------- 地形 ---------------- */
function beachY(x, z) {
  const t = smoothstep(-18, -36, x);
  return lerp(.05, -.33, t) + Math.sin(z * .16) * .025 + Math.cos(z * .05 + x * .1) * .015;
}

function buildTerrain() {
  const g = new THREE.Group();
  root.add(g);

  // 大陆地台（步道 / 咖啡馆 / 神社）
  box(g, 48, .14, 68, 6, -.08, -6, MAT.land, { receive: true });
  // 海滨步道（石板）
  box(g, 7.8, .06, 62, -14.1, .03, -4, MAT.stone, { receive: true });
  // 南部道路
  box(g, 47, .04, 10, 6, .02, 16, std({ color: '#39434c', roughness: .96 }), { receive: true });
  // 道路边线
  const lineMat = std({ color: '#d8d3c4', roughness: .8 });
  for (let x = -10; x < 30; x += 4) box(g, 1.7, .012, .14, x, .045, 16, lineMat);
  box(g, 47, .012, .1, 6, .045, 11.1, lineMat);
  box(g, 47, .012, .1, 6, .045, 20.9, lineMat);
  // 巴士停靠区
  box(g, 12, .05, 5, 17, .03, 13.7, std({ color: '#4b545b', roughness: .94 }), { receive: true });
  // 咖啡馆前的石板前庭（只做近处，不铺满整个场地）
  box(g, 7.2, .045, 5.6, -1.7, .035, 2.1, MAT.stone, { receive: true });
  // 从露台到沙滩木栈道的踏步石
  for (let i = 0; i < 5; i++) box(g, .85, .04, 1.1, -9.8 - i * 1.0, .055, 4.6, MAT.stone, { receive: true });
  // 石板路：步道 → 露台
  box(g, 4.2, .05, 2.2, -11.5, .05, .6, MAT.stone, { receive: true });
  // 石板路：咖啡馆 → 神社
  for (let i = 0; i < 10; i++) box(g, 1.0, .05, 1.8, 4.7 + i * .8, .05, .9 + Math.sin(i * .8) * .12, MAT.stone, { receive: true });
  // 海岸挡土石墙
  for (const [z0, z1] of [[-35, -4.2], [7.6, 25]]) {
    const len = z1 - z0;
    box(g, .5, .32, len, -18.15, .14, (z0 + z1) / 2, MAT.stone, { receive: true, cast: true });
    box(g, .62, .08, len + .1, -18.15, .32, (z0 + z1) / 2, MAT.stoneDark, { receive: true });
  }


  // 沙滩自定义网格
  const segX = 58, segZ = 72;
  const geo = new THREE.BufferGeometry();
  const pos = [], uv = [], idx = [];
  for (let ix = 0; ix <= segX; ix++) {
    for (let iz = 0; iz <= segZ; iz++) {
      const x = lerp(-36, -18, ix / segX), z = lerp(-40, 28, iz / segZ);
      pos.push(x, beachY(x, z), z);
      uv.push(ix / segX * 8, iz / segZ * 12);
    }
  }
  for (let ix = 0; ix < segX; ix++) for (let iz = 0; iz < segZ; iz++) {
    const a = ix * (segZ + 1) + iz, b = a + 1, c = a + segZ + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const sand = new THREE.Mesh(geo, MAT.sand);
  sand.receiveShadow = true;
  g.add(sand);

  // 湿沙带（贴合海岸坡度）
  {
    const wSegX = 4, wSegZ = 40;
    const wg = new THREE.BufferGeometry(); const wp = [], wuv = [], wi = [];
    for (let ix = 0; ix <= wSegX; ix++) for (let iz = 0; iz <= wSegZ; iz++) {
      const x = lerp(-36, -33.2, ix / wSegX), z = lerp(-40, 28, iz / wSegZ);
      wp.push(x, beachY(x, z) + .008, z); wuv.push(ix / wSegX, iz / wSegZ);
    }
    for (let ix = 0; ix < wSegX; ix++) for (let iz = 0; iz < wSegZ; iz++) {
      const a = ix * (wSegZ + 1) + iz, b = a + 1, c = a + wSegZ + 1, d = c + 1; wi.push(a, c, b, b, c, d);
    }
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    wg.setAttribute('uv', new THREE.Float32BufferAttribute(wuv, 2));
    wg.setIndex(wi); wg.computeVertexNormals();
    const wet = new THREE.Mesh(wg, std({ color: '#9e866c', map: TEX.sand, roughness: .62, metalness: .04 }));
    wet.receiveShadow = true; g.add(wet);
  }

  // 神社小丘
  const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), std({ color: '#687b58', roughness: 1 }));
  hill.scale.set(9.5, 3.2, 7.5);
  hill.position.set(20, -.55, 1);
  hill.receiveShadow = true; hill.castShadow = true;
  g.add(hill);
  // 丘顶台地
  cylinder(g, 4.2, 4.6, .22, 20, 2.36, 1, MAT.stone, { seg: 28, receive: true });
  // 上丘石阶
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    box(g, 2.1, .12, .8, lerp(12.4, 16.8, t), lerp(.05, 2.2, t), .2, MAT.stone, { receive: true });
  }
  // 石板小径（咖啡店到神社）
  for (let i = 0; i < 12; i++) {
    const x = 4.8 + i * .75;
    const z = .3 + Math.sin(i * .7) * .22;
    box(g, .65, .045, 1.4, x, .05, z, MAT.stone, { receive: true });
  }

  // 地被以纹理和灌木为主，避免密密麻麻的锥形草刺

  // 沙丘草
  {
    const duneGeo = new THREE.ConeGeometry(.07, .7, 4); duneGeo.translate(0, .35, 0);
    const duneMat = std({ color: '#9aa274', roughness: 1 });
    const dune = new THREE.InstancedMesh(duneGeo, duneMat, 140);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < 140; i++) {
      const x = rand(-31, -18.8), z = rand(-34, 25);
      p.set(x, beachY(x, z), z);
      e.set(rand(-.15, .15), rand(0, 6.28), rand(-.15, .15)); q.setFromEuler(e);
      const s = rand(.45, .9); sc.set(s, s, s); m4.compose(p, q, sc); dune.setMatrixAt(i, m4);
    }
    dune.instanceMatrix.needsUpdate = true; dune.castShadow = false; dune.receiveShadow = true; g.add(dune);
  }
  // 低矮灌木
  {
    const bushGeo = new THREE.IcosahedronGeometry(1, 0);
    const bushMat = std({ color: '#5f7753', roughness: 1 });
    const bush = new THREE.InstancedMesh(bushGeo, bushMat, 40);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    const cols = [new THREE.Color('#5e7952'), new THREE.Color('#6f855b'), new THREE.Color('#4d6748')];
    for (let i = 0; i < 40; i++) {
      let x, z;
      do { x = rand(-17, 29); z = rand(-33, 25); } while ((x > -10 && x < 9 && z > -6 && z < 11) || (x > 10 && x < 29 && z > -9 && z < 11));
      p.set(x, groundHeight(x, z) + .1, z);
      e.set(0, rand(0, 6.28), 0); q.setFromEuler(e);
      const s = rand(.18, .45); sc.set(s * 1.25, s * .65, s); m4.compose(p, q, sc); bush.setMatrixAt(i, m4);
      bush.setColorAt(i, cols[i % 3]);
    }
    bush.instanceMatrix.needsUpdate = true; if (bush.instanceColor) bush.instanceColor.needsUpdate = true;
    bush.castShadow = false; bush.receiveShadow = true; g.add(bush);
  }
  // 野花
  {
    const fg = new THREE.SphereGeometry(.06, 5, 4);
    const fm = std({ color: '#e3d8c2', roughness: .8 });
    const flowers = new THREE.InstancedMesh(fg, fm, 90);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < 90; i++) {
      let x, z;
      do { x = rand(-16, 29); z = rand(-30, 24); } while (x > -9 && x < 8 && z > -5 && z < 10);
      p.set(x, groundHeight(x, z) + rand(.18, .32), z); m4.compose(p, q, sc); flowers.setMatrixAt(i, m4);
    }
    flowers.instanceMatrix.needsUpdate = true; g.add(flowers);
  }

  // 灌木 / 棕榈 / 松树
  const treeMat = std({ color: '#4f6b4c', roughness: 1 });
  const treeMat2 = std({ color: '#6d865c', roughness: 1 });
  for (const [x, z, s] of [[9, -8, 1], [25, 9, .8], [-16, 8, .7], [3, -8, .9], [-17, -26, .8], [12, 8, .7]]) {
    const y = groundHeight(x, z);
    cylinder(g, .13 * s, .22 * s, 2.4 * s, x, y + 1.2 * s, z, MAT.trunk, { seg: 8 });
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry((1.2 - i * .25) * s, 1.7 * s, 9), i % 2 ? treeMat : treeMat2);
      cone.position.set(x, y + 2.2 * s + i * .7 * s, z);
      cone.castShadow = true; cone.receiveShadow = true;
      g.add(cone);
    }
  }
  // 海岸低矮松
  for (const [x, z, s] of [[-20, -10, .9], [-21, 4, .7], [-27, -22, .7]]) {
    const y = groundHeight(x, z);
    cylinder(g, .08, .14, 2.0 * s, x, y + 1.0 * s, z, MAT.trunk, { seg: 6 });
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry((1.6 - i * .28) * s, .9 * s, 8), i % 2 ? treeMat : treeMat2);
      c.position.set(x, y + 1.7 * s + i * .45 * s, z);
      c.castShadow = false; g.add(c);
    }
  }
  return g;
}

/* ---------------- 海 ---------------- */
function buildSea() {
  const g = new THREE.Group();
  root.add(g);
  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(-.8, .1, -.3).normalize() },
    uSunColor: { value: new THREE.Color('#ffd5a0') },
    uDeep: { value: new THREE.Color('#1e4552') },
    uMid: { value: new THREE.Color('#386f7a') },
    uShallow: { value: new THREE.Color('#659e9b') },
    uFoam: { value: new THREE.Color('#eef6ec') },
    uRain: { value: 0 },
    uNight: { value: 0 },
    uTide: { value: .6 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec2 vUv; varying vec3 vWorld; varying float vWave;
      void main() {
        vUv = uv;
        vec3 p = position;
        float shore = 1.0 - smoothstep(.75, 1.0, uv.x);
        float w = sin(p.x * .7 + uTime * .85) * .055
                + sin(p.x * 1.9 - uTime * .62 + p.y * .5) * .028
                + sin(p.y * 1.2 + uTime * .4) * .022;
        w *= mix(.3, 1., shore);
        p.z += w;
        vWave = w;
        vec4 wp = modelMatrix * vec4(p, 1.);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSunDir, uSunColor, uDeep, uMid, uShallow, uFoam;
      uniform float uTime, uRain, uNight, uTide;
      varying vec2 vUv; varying vec3 vWorld; varying float vWave;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main() {
        // uv.x: 0 = 远海，1 = 岸边
        float d = 1.0 - vUv.x;
        float shore = smoothstep(.66, 1.0, vUv.x);
        vec3 base = mix(uShallow, uMid, smoothstep(0., .3, d));
        base = mix(base, uDeep, smoothstep(.28, .95, d));
        vec3 n = normalize(vec3(
          -cos(vWorld.x * .9 + uTime * .7) * .035,
          1.0,
          -cos(vWorld.z * 1.2 - uTime * .55) * .025
        ));
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 L = normalize(uSunDir);
        float diff = clamp(dot(n, L) * .5 + .5, 0., 1.);
        base *= .9 + diff * .13;
        // 夕阳碎金：克制
        vec3 R = reflect(-L, n);
        float spec = pow(max(dot(R, V), 0.), 320.);
        base += uSunColor * smoothstep(.86, .995, spec) * .10 * (1. - uNight);
        // 细碎浪纹：只留很淡的颜色起伏
        float ripple = sin(vWorld.z * 2.2 + vWorld.x * .35 - uTime * .6) * .5 + .5;
        base += vec3(.012, .025, .025) * smoothstep(.8, 1., ripple) * (1. - shore) * .18;
        // 掠射天光
        float fres = pow(1. - max(dot(n, V), 0.), 4.);
        base = mix(base, vec3(.62, .73, .75), fres * .05);
        // 近岸泡沫
        float n1 = hash(floor(vec2(vWorld.z * 16., uTime * 2.5)));
        float foam = smoothstep(.05, 0., d) * (.35 + .65 * step(.62, n1));
        base = mix(base, uFoam, clamp(foam, 0., 1.) * .26);
        // 远处海雾
        vec3 fog = vec3(.72, .70, .68);
        base = mix(base, fog, smoothstep(.55, 1., d) * .8);
        base = mix(base, vec3(.3, .38, .4), uRain * .3);
        base *= 1. - uNight * .45;
        gl_FragColor = vec4(base, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const geo = new THREE.PlaneGeometry(59, 90, 70, 60);
  const sea = new THREE.Mesh(geo, mat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-65.5, -.34, -6);
  sea.receiveShadow = false;
  g.add(sea);

  // 岸边泡沫线
  const foamMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){ float n=hash(floor(vec2(vUv.x*160.,uTime*2.)));
        float a=smoothstep(.6,0.,abs(vUv.y-.5))*(.35+.65*step(.55,n));
        gl_FragColor=vec4(vec3(.96,.99,.94),a*.24); }`,
  });
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(.8, 90), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(-36.15, -.335, -6);
  foam.renderOrder = 3;
  g.add(foam);

  // 潮池
  const pools = [];
  for (const [x, z, r] of [[-30, -11, 1.55], [-27, 13, 1.2]]) {
    const poolMat = std({ color: '#4f8b95', emissive: '#2f5e68', emissiveIntensity: .45, transparent: true, opacity: .72, roughness: .12, metalness: .08 });
    const p = new THREE.Mesh(new THREE.CircleGeometry(r, 28), poolMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, beachY(x, z) + .014, z);
    p.receiveShadow = false;
    g.add(p); pools.push(p);
    const rim = new THREE.Mesh(new THREE.RingGeometry(r * .92, r * 1.04, 28), std({ color: '#d8e5da', transparent: true, opacity: .22, roughness: .7, side: THREE.DoubleSide }));
    rim.rotation.x = -Math.PI / 2; rim.position.set(x, beachY(x, z) + .02, z); g.add(rim);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + .4;
      const rr = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.1, .22), 0), MAT.stoneDark);
      rr.position.set(x + Math.cos(a) * r * 1.15, beachY(x, z) + .05, z + Math.sin(a) * r * 1.15);
      rr.rotation.set(rand(0, 2), rand(0, 3), rand(0, 2)); g.add(rr);
    }
  }

  refs.sea = { group: g, mesh: sea, mat, foam, foamMat, pools };
  return refs.sea;
}

/* ---------------- 海岸小物 / 灯塔 ---------------- */
function makeTetrapod(parent, x, y, z, s, ry = 0) {
  const g = group(parent, x, y, z, ry);
  const dirs = [
    new THREE.Vector3(1, 1, 1).normalize(), new THREE.Vector3(-1, 1, -1).normalize(),
    new THREE.Vector3(1, -1, -1).normalize(), new THREE.Vector3(-1, -1, 1).normalize(),
  ];
  for (const d of dirs) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.12, .3, 1, 6), MAT.concrete);
    leg.position.copy(d).multiplyScalar(.4);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    leg.castShadow = true; leg.receiveShadow = true;
    g.add(leg);
  }
  g.scale.setScalar(s);
  return g;
}

function buildShoreProps() {
  const g = new THREE.Group();
  root.add(g);
  const r = rng(404);
  // 礁石
  for (const [x, z, s] of [[-35.6, -22, 1.2], [-34.2, -17, .8], [-35.4, -8, 1], [-36.2, 3, 1.4], [-34.8, 10, .7], [-35.9, 18, 1.1], [-37, -1, .9]]) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), MAT.stoneDark);
    rock.position.set(x, beachY(x, z) + .05, z);
    rock.scale.set(1.25, .62, .9);
    rock.rotation.set(r() * 2, r() * 3, r());
    rock.castShadow = true; rock.receiveShadow = true;
    g.add(rock);
  }
  // 消波块
  for (const [x, z, s, ry] of [[-36.8, -13, .9, .3], [-36.5, -6, 1.1, 1.1], [-36.8, 16, .8, 2.2], [-37.1, 8, 1, .7]]) {
    makeTetrapod(g, x, -.12, z, s, ry);
  }
  // 海岸消波块 / 礁石带（不做成整齐的箱子）
  for (let z = -20; z <= 18; z += 3.4) {
    const x = -36.1 + Math.sin(z * .7) * .5;
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.35, .7), 0), MAT.stoneDark);
    r.position.set(x, beachY(x, z) + rand(.05, .25), z);
    r.scale.set(1.4, .9, 1.1); r.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    r.castShadow = true; r.receiveShadow = true; g.add(r);
  }
  for (const [z, s] of [[-14, .55], [-3, .65], [9, .55], [17, .5]]) makeTetrapod(g, -36.0, -.08, z, s, z * .13);
  // 漂流木
  const log = cylinder(g, .11, .16, 2.4, -31, beachY(-31, 4) + .12, 4, MAT.woodDark, { seg: 7, rot: [0, 0, Math.PI / 2] });
  log.rotation.y = .4;
  // 海藻
  for (let i = 0; i < 18; i++) {
    const x = rand(-35, -28), z = rand(-32, 24);
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(.22, rand(.5, 1.2)), std({ color: i % 2 ? '#415c43' : '#6d6a43', side: THREE.DoubleSide, roughness: 1 }));
    blade.rotation.x = -Math.PI / 2 + rand(-.1, .1); blade.rotation.z = rand(0, Math.PI);
    blade.position.set(x, beachY(x, z) + .02, z);
    g.add(blade);
  }
  // 贝壳（装饰）
  const shellGeos = [new THREE.ConeGeometry(.1, .16, 7), new THREE.SphereGeometry(.08, 8, 5)];
  const shellMat = std({ color: '#e4cbb4', roughness: .7 });
  for (let i = 0; i < 32; i++) {
    const x = rand(-35.5, -19), z = rand(-35, 25);
    const m = new THREE.Mesh(shellGeos[i % 2], shellMat);
    m.position.set(x, beachY(x, z) + .03, z);
    m.rotation.set(rand(0, 2), rand(0, 6), rand(0, 2));
    m.scale.set(rand(.5, 1.3), rand(.35, .7), rand(.5, 1.3));
    g.add(m);
  }
  // 脚印
  const footMat = std({ color: '#b29876', roughness: 1 });
  for (let i = 0; i < 16; i++) {
    const x = lerp(-20, -27, i / 15) + (i % 2 ? .18 : -.18), z = 8 + i * .48;
    const f = new THREE.Mesh(new THREE.CircleGeometry(.07, 7), footMat);
    f.rotation.x = -Math.PI / 2; f.scale.set(.8, 1.5, 1);
    f.position.set(x, beachY(x, z) + .02, z);
    g.add(f);
  }
  // 南侧沙滩：遮阳伞 / 躺椅
  for (const [x, z] of [[-27, 21], [-31, 18]]) {
    const y = beachY(x, z);
    cylinder(g, .05, .06, 2.4, x, y + 1.2, z, MAT.woodLight, { seg: 7 });
    const canopy = cylinder(g, .04, 1.45, .5, x, y + 2.35, z, MAT.clothWhite, { seg: 12, receive: true });
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2;
      box(g, .04, .04, 1.4, x + Math.cos(a) * .55, y + 2.1, z + Math.sin(a) * .55, MAT.coral, { rot: [.12, a, 0] });
    }
    box(g, .7, .08, 1.8, x - 1.5, y + .18, z + .2, MAT.woodLight, { rot: [0, .15, 0], receive: true });
    box(g, .7, .45, .1, x - 2.1, y + .42, z + .1, MAT.woodLight, { rot: [-.35, .15, 0] });
  }
  // 沙滩木栈道：从步道下到海边
  {
    const z0 = 4.6;
    for (let i = 0; i < 15; i++) {
      const x = -18.4 - i * 1.15;
      const y = beachY(x, z0);
      const plank = box(g, 1.08, .07, 2.4, x, y + .1, z0, MAT.wood, { receive: true, cast: true });
      plank.rotation.y = .02;
      if (i % 2 === 0) {
        cylinder(g, .05, .06, .85, x - .52, y + .42, z0 - 1.15, MAT.woodDark, { seg: 6 });
        cylinder(g, .05, .06, .85, x - .52, y + .42, z0 + 1.15, MAT.woodDark, { seg: 6 });
        box(g, .04, .04, 2.3, x - .52, y + .8, z0, MAT.woodDark, { receive: false });
      }
    }
    // 入口小台阶
    for (let s = 0; s < 3; s++) box(g, .35, .12, 2.4, -18.2 - s * .34, .28 - s * .09, z0, MAT.stone, { receive: true });
  }
  // 救生员塔
  {
    const lg = group(g, -26, beachY(-26, -8), -8, .15);
    for (const [x, z] of [[-.8, -.8], [.8, -.8], [-.8, .8], [.8, .8]]) {
      const leg = box(lg, .09, 2.5, .09, x, 1.25, z, MAT.woodDark, { cast: true });
      leg.rotation.z = x * .08; leg.rotation.x = -z * .08;
    }
    box(lg, 2.0, .12, 2.0, 0, 2.4, 0, MAT.wood, { cast: true, receive: true });
    box(lg, 1.6, .55, .5, 0, 2.75, -.55, MAT.coral, { receive: true });
    box(lg, 1.6, .1, .5, 0, 2.5, -.55, MAT.woodLight);
    for (let i = 0; i < 3; i++) box(lg, 1.4, .04, .08, 0, 1.3 + i * .38, .75, MAT.woodDark);
    cylinder(lg, .025, .025, 2.2, .75, 3.5, .6, MAT.iron, { seg: 6 });
    box(lg, .55, .35, .03, 1.0, 4.4, .6, MAT.coral, { receive: false });
    registerInteract('lifeguard', lg, '看一下救生员塔', () => showToast('红白旗在风里响，今天浪不大。', 2200), { max: 3.2 });
  }
  // 沙丘篱笆
  for (let z = -12; z <= 22; z += 2.2) {
    if (z > 1 && z < 8) continue;
    const x = -19.4, y = beachY(x, z);
    box(g, .08, .8, .08, x, y + .4, z, MAT.woodDark, { receive: false });
    if (z < 20) box(g, .03, .03, 2.2, x, y + .56, z + 1.1, MAT.woodDark, { receive: false });
  }
  return g;
}

function buildLighthouse() {
  const g = new THREE.Group();
  g.position.set(-80, 0, -30);
  root.add(g);
  const rockMat = MAT.stoneDark;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.9, 1.8), 0), rockMat);
    rock.position.set(Math.cos(a) * rand(1.2, 3.2), rand(-.2, .9), Math.sin(a) * rand(1.2, 3));
    rock.scale.set(1.3, .8, 1);
    rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    g.add(rock);
  }
  cylinder(g, 1.3, 1.7, .5, 0, .35, 0, MAT.concrete, { seg: 18, receive: true });
  cylinder(g, .75, 1.05, 7.2, 0, 4.2, 0, std({ color: '#e8e1d4', roughness: .7 }), { seg: 22, cast: true });
  cylinder(g, .82, .9, 1.2, 0, 2.4, 0, std({ color: '#b84f43', roughness: .75 }), { seg: 22 });
  cylinder(g, .7, .76, .8, 0, 6.7, 0, std({ color: '#b84f43', roughness: .75 }), { seg: 22 });
  cylinder(g, 1.15, 1.15, .2, 0, 8.0, 0, MAT.iron, { seg: 22 });
  cylinder(g, .62, .62, 1.1, 0, 8.55, 0, MAT.glass, { seg: 16, cast: false });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    box(g, .05, 1.1, .05, Math.cos(a) * .62, 8.55, Math.sin(a) * .62, MAT.blackMetal);
  }
  sphere(g, .28, 0, 8.55, 0, EMI.lighthouse, { seg: 12 });
  const glow = sprite(g, GLOW_TEX, '#ffe4b0', 5, 0, 8.55, 0, .65);
  cylinder(g, .05, .95, .8, 0, 9.35, 0, std({ color: '#a84c40', roughness: .7 }), { seg: 18 });
  sphere(g, .1, 0, 9.8, 0, MAT.iron, { seg: 8 });
  const light = new THREE.PointLight('#ffd9a0', 8, 28, 2);
  light.position.set(0, 8.55, 0); g.add(light);

  // 旋转光束：四片柔光楔形
  const beamGroup = new THREE.Group();
  beamGroup.position.set(0, 8.55, 0);
  g.add(beamGroup);
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, -.1, 0, 0, .1, 0, 18, -2.4, 0, 18, 2.4, 0], 3));
  beamGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 0, 1, 1], 2));
  beamGeo.setIndex([0, 1, 2, 1, 3, 2]);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#ffe0a8') } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 uColor; varying vec2 vUv;
      void main(){ float u=vUv.x; float edge=smoothstep(0.,.18,vUv.y)*smoothstep(1.,.82,vUv.y);
        float fade=smoothstep(0.,.05,u)*pow(max(1.-u,0.),1.4); gl_FragColor=vec4(uColor,fade*edge*.24); }`,
  });
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Mesh(beamGeo, beamMat);
    b.rotation.x = i / 2 * Math.PI;
    beamGroup.add(b);
  }
  refs.lighthouse = { group: g, beamGroup, beamMat, light, glow, beamOn: true };
  return g;
}

/* ---------------- 神社 ---------------- */
function buildShrine() {
  const g = new THREE.Group();
  root.add(g);
  const yBase = groundHeight(20, 1);
  // 鸟居（石）
  const torii = group(g, 13.2, groundHeight(13.2, 0), 0, 0);
  for (const z of [-1.45, 1.45]) {
    cylinder(torii, .19, .25, 3.1, 0, 1.55, z, MAT.stone, { seg: 10, cast: true });
    cylinder(torii, .27, .3, .16, 0, .08, z, MAT.stoneDark, { seg: 10 });
  }
  box(torii, .4, .3, 3.7, 0, 3.05, 0, MAT.stone, { cast: true });
  box(torii, .32, .18, 3.3, 0, 3.33, 0, MAT.stoneDark, { cast: true });
  box(torii, .55, .18, .3, 0, 2.55, 0, MAT.stone, { cast: true });
  addCollider(12.7, 13.7, 1.3, 1.6, -1, 5, 'torii');
  addCollider(12.7, 13.7, -1.6, -1.3, -1, 5, 'torii');

  // 石灯笼
  const lanterns = [];
  for (const [x, z] of [[17.2, -2.6], [17.2, 3.2]]) {
    const y = groundHeight(x, z);
    const lg = group(g, x, y, z);
    cylinder(lg, .25, .32, .3, 0, .15, 0, MAT.stone, { seg: 8 });
    cylinder(lg, .13, .16, 1.1, 0, .8, 0, MAT.stone, { seg: 8 });
    box(lg, .55, .5, .55, 0, 1.55, 0, MAT.stone, { receive: true });
    const lamp = box(lg, .32, .28, .32, 0, 1.56, 0, EMI.warmSoft, { receive: false });
    box(lg, .7, .12, .7, 0, 1.86, 0, MAT.stoneDark);
    const pl = new THREE.PointLight('#ffc27d', 2.4, 5, 2);
    pl.position.set(x, y + 1.6, z); g.add(pl);
    lanterns.push({ light: pl, mat: lamp.material });
  }

  // 小祠
  const shrine = group(g, 23.5, yBase, 1);
  box(shrine, 3.4, .45, 2.6, 0, .22, 0, MAT.stone, { receive: true });
  box(shrine, 2.9, 2.1, 2.2, 0, 1.45, 0, MAT.wood, { cast: true, receive: true });
  box(shrine, 2.2, 1.3, .06, -1.48, 1.3, 0, MAT.woodDark);
  // 屋顶
  const roofL = box(shrine, 2.1, .12, 3.1, -1.0, 2.85, 0, MAT.roof, { rot: [0, 0, .43], cast: true });
  const roofR = box(shrine, 2.1, .12, 3.1, 1.0, 2.85, 0, MAT.roof, { rot: [0, 0, -.43], cast: true });
  box(shrine, 3.8, .12, .2, 0, 3.32, 0, MAT.woodDark);
  // 赛钱箱
  const offering = group(g, 20.2, groundHeight(20.2, 1), 1);
  box(offering, 1.1, .7, .7, 0, .35, 0, MAT.woodDark, { cast: true });
  for (let i = 0; i < 7; i++) box(offering, .9, .035, .05, 0, .52, -.3 + i * .1, MAT.woodLight);
  // 绘马架
  const rack = group(g, 21.5, groundHeight(21.5, -3.4), -3.4);
  for (const x of [-.9, .9]) cylinder(rack, .05, .06, 1.9, x, .95, 0, MAT.woodDark, { seg: 6 });
  box(rack, 2.0, .06, .06, 0, 1.85, 0, MAT.woodDark);
  box(rack, 2.0, .05, .06, 0, 1.45, 0, MAT.woodDark);
  for (let i = 0; i < 6; i++) {
    const ema = plane(rack, .32, .24, -.75 + i * .3, 1.62 + (i % 2) * .16, .03, std({ map: TEX.ema, roughness: .9 }), { receive: true });
    ema.rotation.z = rand(-.08, .08);
  }
  addCollider(22, 25, -.2, 2.2, yBase - 1, yBase + 4, 'shrine');

  refs.shrine = { group: g, lanterns, offering, rack, shrine };
  registerInteract('wish', offering, '在神社许愿', () => openWish(), { max: 2.6 });
  return g;
}

/* ---------------- 渔港 ---------------- */
function buildPort() {
  const g = new THREE.Group();
  root.add(g);
  // 木栈台
  box(g, 13, .22, 9, -35, .12, -32, MAT.wood, { receive: true, cast: true });
  for (let x = -41; x <= -30; x += 2.2) {
    cylinder(g, .12, .14, 1.2, x, -.35, -28.2, MAT.woodDark, { seg: 7 });
    cylinder(g, .12, .14, 1.2, x, -.35, -35.8, MAT.woodDark, { seg: 7 });
  }
  // 木栈桥延伸入海
  box(g, 8, .16, 2.4, -47, .18, -32, MAT.wood, { receive: true });
  for (let x = -50; x <= -44; x += 2) {
    for (const z of [-32.9, -31.1]) cylinder(g, .1, .12, 1.2, x, -.35, z, MAT.woodDark, { seg: 6 });
  }
  // 渔船
  const boats = [];
  for (const [x, z, c] of [[-47, -37, '#e5dfcf'], [-50, -27, '#7f9ba0']]) {
    const b = group(g, x, -.1, z, .2);
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(.9, .65, 3.6, 8, 1, false, 0, Math.PI), std({ color: c, roughness: .6 }));
    hull.rotation.z = Math.PI / 2; hull.rotation.y = Math.PI / 2;
    hull.position.y = .1; hull.scale.set(1, 1, .62); hull.castShadow = true;
    b.add(hull);
    box(b, 3.0, .12, 1.2, 0, .35, 0, MAT.woodDark);
    box(b, .8, .8, .8, -.8, .8, 0, std({ color: c, roughness: .8 }), { cast: true });
    cylinder(b, .04, .05, 3.2, .5, 2.0, 0, MAT.woodDark, { seg: 6 });
    const net = plane(b, 2.2, 1.0, 0, 1.35, .65, std({ color: '#737f66', transparent: true, opacity: .65, side: THREE.DoubleSide, roughness: 1 }), { receive: false });
    net.rotation.x = -.3;
    boats.push(b);
  }
  // 渔网 / 浮标 / 木箱
  for (let i = 0; i < 5; i++) {
    const x = -40 + i * 1.3, z = -30.6 + (i % 2) * .8;
    const b = sphere(g, .14, x, .43, z, i % 2 ? MAT.coral : MAT.cream, { seg: 8 });
  }
  const crate = group(g, -39.5, .22, -34.3, .2);
  for (let i = 0; i < 3; i++) box(crate, .7, .5, .6, (i % 2) * .7, .25 + Math.floor(i / 2) * .5, 0, MAT.wood, { cast: true });
  // 灯
  const portLight = new THREE.PointLight('#ffc985', 5, 12, 2);
  portLight.position.set(-35, 3, -32); g.add(portLight);
  refs.port = { group: g, boats, light: portLight };
  return g;
}

/* ---------------- 巴士站 / 自动贩卖机 / 冲浪店 ---------------- */
function buildSouthSide() {
  const g = new THREE.Group();
  root.add(g);
  // 巴士站小屋
  const bus = group(g, 5.5, .05, 14.2, 0);
  for (const x of [-1.5, 1.5]) for (const z of [-1.1, 1.1]) cylinder(bus, .08, .1, 2.6, x, 1.3, z, MAT.woodDark, { seg: 6 });
  box(bus, 3.6, .12, 2.8, 0, 2.55, 0, MAT.roof, { cast: true });
  box(bus, 3.2, .08, 2.1, 0, 2.9, 0, MAT.woodDark, { rot: [.05, 0, 0] });
  box(bus, 3.2, .08, .8, 0, .55, 0, MAT.woodLight, { receive: true });
  box(bus, 3.2, .4, .08, 0, .35, 1.1, MAT.woodDark);
  plane(bus, 1.0, 1.3, 1.75, 1.4, 1.15, std({ map: TEX.bus, roughness: .85, side: THREE.DoubleSide }), { receive: false });
  // 自动贩卖机
  const vm = group(g, 10.2, .05, 13.3, -Math.PI / 2);
  box(vm, 1.2, 2.0, .82, 0, 1.0, 0, std({ color: '#2f6f83', roughness: .7 }), { cast: true });
  plane(vm, 1.06, 1.8, 0, 1.02, .42, std({ map: TEX.vending, roughness: .55, emissive: '#203a42', emissiveIntensity: .25 }), { receive: false });
  box(vm, .6, .18, .3, 0, .26, .42, MAT.blackMetal);
  const vGlow = sprite(vm, GLOW_TEX, '#9fe4f4', 2.4, 0, 1.4, .55, .18);
  const vLight = new THREE.PointLight('#c6efff', 3.5, 5, 2);
  vLight.position.set(0, 1.5, .9); vm.add(vLight);
  registerInteract('vending', vm, '买一瓶冰汽水', () => buyVending(), { max: 2.9 });

  // 冲浪店（低模）
  const shop = group(g, 18, .05, 20.5, -.08);
  box(shop, 8, 3.0, 5.2, 0, 1.5, 0, std({ color: '#d9cfb8', roughness: .9 }), { cast: true, receive: true });
  box(shop, 8.3, .2, 2.0, 0, 3.15, -2.8, MAT.roof, { cast: true, rot: [-.08, 0, 0] });
  plane(shop, 3.2, .8, 0, 2.5, 2.63, std({ color: '#f2ead8', roughness: .8, map: null }), { receive: false });
  const surfSign = canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e8dfcc'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2f4c5a'; ctx.textAlign = 'center';
    ctx.font = `600 50px ${JP_SERIF}`; ctx.fillText('海風サーフ', w / 2, 72);
    ctx.font = `400 22px ${JP_SANS}`; ctx.fillText('SURF & RENTAL', w / 2, 104);
  });
  plane(shop, 3.4, .84, 0, 2.55, 2.66, std({ map: surfSign, roughness: .8 }), { receive: false });
  for (let i = 0; i < 3; i++) {
    const board = new THREE.Mesh(new THREE.CapsuleGeometry(.18, 1.5, 5, 8), i % 2 ? MAT.coral : MAT.cream);
    board.scale.set(1, 1, .22); board.position.set(-2.2 + i * .55, .85, 2.7); board.rotation.z = .08;
    board.castShadow = true; shop.add(board);
  }
  // 停车位
  for (let i = 0; i < 4; i++) box(g, .1, .012, 4.6, 13.5 + i * 2.4, .04, 22, std({ color: '#d8d3c4', roughness: .8 }));
  // 自行车租借架
  for (let i = 0; i < 3; i++) {
    const bx = 9 + i * .9, bz = 20.5;
    cylinder(g, .32, .32, .05, bx, .38, bz, MAT.iron, { rot: [Math.PI / 2, 0, 0], seg: 12 });
    cylinder(g, .32, .32, .05, bx + .8, .38, bz, MAT.iron, { rot: [Math.PI / 2, 0, 0], seg: 12 });
    box(g, .8, .05, .08, bx + .4, .4, bz, MAT.coral);
  }
  refs.south = { group: g, vending: vm };
  return g;
}

/* ---------------- 海鸥 / 贝壳 / 雨 ---------------- */
function buildGulls() {
  const g = new THREE.Group(); root.add(g);
  const birds = [];
  for (let i = 0; i < 1; i++) {
    const b = new THREE.Group();
    const body = sphere(b, .14, 0, 0, 0, MAT.white, { sx: 1.7, sy: .7, sz: .9, seg: 8 });
    sphere(b, .085, .2, .04, 0, MAT.white, { seg: 7 });
    box(b, .1, .03, .03, .3, .04, 0, EMI.warm, { receive: false });
    const wl = new THREE.Group(), wr = new THREE.Group();
    wl.position.set(0, .04, .08); wr.position.set(0, .04, -.08); b.add(wl, wr);
    for (const [grp, dz] of [[wl, 1], [wr, -1]]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(.66, .22), std({ color: '#e9ece5', side: THREE.DoubleSide, roughness: .9 }));
      w.rotation.x = Math.PI / 2; w.position.set(-.18, 0, dz * .1); grp.add(w);
      const tip = new THREE.Mesh(new THREE.PlaneGeometry(.22, .18), std({ color: '#4b5658', side: THREE.DoubleSide }));
      tip.rotation.x = Math.PI / 2; tip.position.set(-.52, 0, dz * .1); grp.add(tip);
    }
    const a = i / 3 * Math.PI * 2;
    b.position.set(-28 + Math.cos(a) * 14, 15 + i * 1.2, -4 + Math.sin(a) * 10);
    mergeLocalChildren(b, new Set([wl, wr]));
    b.userData = { wl, wr, a, r: 12 + i * 1.5, y: b.position.y, sp: .05 + i * .006, ph: i * 1.7 };
    g.add(b); birds.push(b);
  }
  // 一只停在地面的海鸥（可点击飞走）
  const ground = new THREE.Group();
  ground.position.set(-18.5, .18, -5.2);
  sphere(ground, .15, 0, 0, 0, MAT.white, { sx: 1.5, sy: .9, sz: 1, seg: 8 });
  sphere(ground, .09, .18, .1, 0, MAT.white, { seg: 7 });
  box(ground, .1, .03, .03, .28, .1, 0, EMI.warm);
  g.add(ground);
  registerInteract('gull', ground, '惊起海鸥', () => scareGull(ground), { max: 3.2 });
  refs.gulls = { group: g, birds, ground };
  return g;
}

function buildShells() {
  const coords = [[-23, 6], [-31, -9], [-37, 14], [-26, 20], [-41, -18]];
  const g = new THREE.Group(); root.add(g);
  const meshMat = std({ color: '#efd7bd', roughness: .55, metalness: .05 });
  coords.forEach(([x, z], i) => {
    const shell = new THREE.Group();
    shell.position.set(x, beachY(x, z) + .04, z);
    const c = new THREE.Mesh(new THREE.ConeGeometry(.12, .16, 8), meshMat);
    c.rotation.x = .5; c.rotation.z = .2; shell.add(c);
    const glow = null;
    g.add(shell);
    refs.shells.push({ group: shell, glow, taken: false, i });
    registerInteract(`shell${i}`, shell, '拾起贝壳', () => collectShell(i), { max: 3.0 });
  });
  refs.shellGroup = g;
  return g;
}

function buildRain() {
  const count = IS_MOBILE ? 700 : 1200;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = rand(-30, 30); pos[i * 3 + 1] = rand(0, 24); pos[i * 3 + 2] = rand(-30, 30);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rainTex = canvasTexture(32, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.18, 'rgba(230,248,255,.85)'); gr.addColorStop(.8, 'rgba(200,232,240,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(w * .42, 0, w * .16, h);
  });
  const mat = new THREE.PointsMaterial({ color: '#cfe8ee', map: rainTex, size: .32, transparent: true, opacity: .0, depthWrite: false, sizeAttenuation: true, alphaTest: .01 });
  const rain = new THREE.Points(geo, mat);
  rain.frustumCulled = false;
  scene.add(rain);
  rain.visible = state.weather === 'rain';
  refs.rain = { points: rain, mat, pos, count };
  return rain;
}

/* ---------------- 时间 / 天气 ---------------- */
const SKY_KEYS = [
  { t: 0.00, top: '#0a1424', mid: '#1a2a3d', hor: '#344251', sun: '#c9dcff', fog: '#1a2530', sunI: .02 },
  { t: .12, top: '#3e5c78', mid: '#a89090', hor: '#f3c7a4', sun: '#ffd4a5', fog: '#b9aea0', sunI: .55 },
  { t: .30, top: '#4c86a8', mid: '#9dc3c8', hor: '#d9e6e0', sun: '#fff9e7', fog: '#c9d7d0', sunI: 2.1 },
  { t: .48, top: '#4f7d9a', mid: '#b8a59a', hor: '#e8c2a1', sun: '#ffd9a0', fog: '#c6b6a3', sunI: 1.6 },
  { t: .68, top: '#2f415e', mid: '#9e6a6c', hor: '#ee9169', sun: '#ffb36b', fog: '#9a7d72', sunI: .8 },
  { t: .78, top: '#26334d', mid: '#8d5c65', hor: '#e37f5d', sun: '#ffad62', fog: '#846a68', sunI: .15 },
  { t: .88, top: '#0d1728', mid: '#2d3b55', hor: '#4d5968', sun: '#cfe0ff', fog: '#26313c', sunI: .03 },
  { t: 1.00, top: '#050b16', mid: '#101e2f', hor: '#1d2c3c', sun: '#cfe0ff', fog: '#111a24', sunI: 0 },
];
function _c(hex) { return new THREE.Color(hex); }
function mixKey(a, b, t) {
  return {
    top: _c(a.top).lerp(_c(b.top), t), mid: _c(a.mid).lerp(_c(b.mid), t),
    hor: _c(a.hor).lerp(_c(b.hor), t), sun: _c(a.sun).lerp(_c(b.sun), t),
    fog: _c(a.fog).lerp(_c(b.fog), t), sunI: lerp(a.sunI, b.sunI, t),
  };
}
function sampleSky(t) {
  t = ((t % 1) + 1) % 1;
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    if (t >= SKY_KEYS[i].t && t <= SKY_KEYS[i + 1].t) {
      const k = (t - SKY_KEYS[i].t) / (SKY_KEYS[i + 1].t - SKY_KEYS[i].t);
      return mixKey(SKY_KEYS[i], SKY_KEYS[i + 1], k);
    }
  }
  return mixKey(SKY_KEYS[0], SKY_KEYS[0], 0);
}
function sunDirection(t) {
  const a = (t - .25) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a), Math.sin(a), -.32).normalize();
}
function applyTime(t) {
  state.time = ((t % 1) + 1) % 1;
  const k = sampleSky(state.time);
  const rain = state.weather === 'rain' ? 1 : 0;
  const night = smoothstep(.78, .92, state.time) + smoothstep(.15, .02, state.time);
  const sunDir = sunDirection(state.time);
  const sunUp = Math.max(0, sunDir.y);
  const gray = (c) => c.lerp(new THREE.Color('#67777c'), rain * .55);
  const top = gray(k.top.clone()), mid = gray(k.mid.clone()), hor = gray(k.hor.clone()), sunCol = gray(k.sun.clone());
  // sky
  if (refs.sky) {
    const u = refs.sky.uniforms;
    u.uTop.value.copy(top); u.uMid.value.copy(mid); u.uHorizon.value.copy(hor); u.uSun.value.copy(sunCol);
    u.uSunDir.value.copy(sunDir); u.uNight.value = clamp(night, 0, 1); u.uRain.value = rain;
    const pos = sunDir.clone().multiplyScalar(225);
    refs.sky.sunSprite.position.copy(pos);
    refs.sky.sunSprite.material.color.copy(sunCol);
    refs.sky.sunSprite.material.opacity = (1 - clamp(night, 0, 1)) * (rain ? .12 : .45) * smoothstep(-.05, .05, sunDir.y);
    refs.sky.sunSprite.visible = refs.sky.sunSprite.material.opacity > .02;
    const moonPos = new THREE.Vector3(-sunDir.x, Math.max(.28, -sunDir.y + .3), -sunDir.z).normalize().multiplyScalar(225);
    refs.sky.moonSprite.position.copy(moonPos);
    refs.sky.moonSprite.material.opacity = clamp(night, 0, 1) * .35;
    refs.sky.moonSprite.visible = night > .08;
    refs.sky.stars.visible = night > .08;
    refs.sky.stars.material.opacity = clamp(night, 0, 1) * (rain ? .08 : .75);
    refs.sky.clouds.forEach((c, i) => {
      c.material.color.copy(new THREE.Color(i % 2 ? '#d9c7bc' : '#e9dfd3')).lerp(new THREE.Color('#69777b'), rain * .6);
      c.material.opacity = (.1 + .16 * (i % 3)) * (1 - night * .5) * (rain ? 1.5 : 1);
    });
  }
  // lights
  if (refs.sun) {
    refs.sun.position.copy(sunDir).multiplyScalar(65);
    refs.sun.color.copy(sunCol);
    const moon = clamp(night, 0, 1);
    refs.sun.intensity = Math.min(2.9, k.sunI * 2.2) * (rain ? .2 : 1) * (1 - moon * .6) + moon * .18;
    refs.sun.castShadow = true;
    refs.hemi.color.copy(hor).lerp(top, .32);
    refs.hemi.groundColor.set('#49453a');
    refs.hemi.intensity = .68 + sunUp * .26 + moon * .3;
    refs.ambient.intensity = .36 + moon * .12;
    refs.fill.intensity = .62 + sunUp * .18;
    refs.fill.color.copy(new THREE.Color('#ffb27a').lerp(new THREE.Color('#9cc7d8'), clamp(sunUp * 1.2, 0, 1)));
    refs.fill.position.set(-26, 14, 18);
  }
  // fog
  scene.fog.color.copy(k.fog).lerp(new THREE.Color('#64757a'), rain * .5);
  scene.fog.density = .0035 + rain * .004 + clamp(night, 0, 1) * .0016;
  scene.background.copy(k.fog);
  // sea
  if (refs.sea) {
    const u = refs.sea.mat.uniforms;
    u.uSunDir.value.copy(sunDir); u.uSunColor.value.copy(sunCol); u.uRain.value = rain;
    u.uNight.value = clamp(night, 0, 1);
    u.uDeep.value.copy(new THREE.Color('#2f5f6d')).lerp(new THREE.Color('#1a3444'), night);
    u.uMid.value.copy(new THREE.Color('#4b8791')).lerp(new THREE.Color('#2d4f5c'), night);
    u.uShallow.value.copy(new THREE.Color('#7eb6b1')).lerp(new THREE.Color('#426b70'), night);
  }
  // lamps / string lights
  const lampOn = state.lightsOn && (state.time > .55 || night > .4 || rain);
  refs.lamps.forEach((l) => { l.on = lampOn; l.light.intensity = lampOn ? l.base : 0; if (l.mat) l.mat.emissiveIntensity = lampOn ? 2.4 : .1; if (l.glow) l.glow.material.opacity = lampOn ? .45 : .02; });
  refs.stringLights.forEach((s) => { s.mat.emissiveIntensity = lampOn ? 1.8 : .05; s.mat.opacity = 1; });
  // interior lights
  const interior = state.lightsOn ? (night > .25 ? 1.35 : .7) : 0;
  refs.interiorLights.forEach((l) => { l.intensity = l.userData.base * interior; });
  // lighthouse
  if (refs.lighthouse) {
    const on = state.time > .6 || night > .35 || rain;
    refs.lighthouse.beamMat.opacity = on ? .3 : .02;
    refs.lighthouse.light.intensity = on ? 7 : 1.5;
  }
  // UI
  if (typeof updateHUDStatus === 'function') updateHUDStatus();
}
function applyWeather(w) {
  state.weather = w === 'rain' ? 'rain' : 'clear';
  document.body.classList.toggle('weather-rain', state.weather === 'rain');
  if (AUDIO) AUDIO.setWeather(state.weather);
  applyTime(state.time);
  if (typeof updateHUDStatus === 'function') updateHUDStatus();
}
function setTide(v) {
  state.tide = clamp(v, 0, 1);
  if (refs.sea) {
    refs.sea.mesh.position.y = -.34 + (state.tide - .5) * .1;
    refs.sea.foam.position.y = -.335 + (state.tide - .5) * .1;
    refs.sea.pools.forEach((p, i) => {
      p.position.y = beachY(p.position.x, p.position.z) + .012 + (state.tide - .5) * .06;
      p.material.opacity = .42 + state.tide * .25;
      p.scale.setScalar(.92 + state.tide * .12);
    });
  }
  if (typeof updateHUDStatus === 'function') updateHUDStatus();
}

/* ---------------- 世界更新 ---------------- */
let _tideTimer = 0, _worldTime = 0;
function updateWorld(dt, t) {
  _worldTime = t;
  if (refs.sky) {
    refs.sky.uniforms.uTime.value = t;
    refs.sky.clouds.forEach((c, i) => { c.position.x += dt * (.15 + i * .03); if (c.position.x > 150) c.position.x = -150; });
  }
  if (refs.sea) {
    refs.sea.mat.uniforms.uTime.value = t;
    refs.sea.foamMat.uniforms.uTime.value = t;
  }
  if (refs.lighthouse) {
    const on = state.time > .6 || state.time > .9 || state.weather === 'rain';
    refs.lighthouse.beamGroup.rotation.y = Math.sin(t * .12) * .55 + .4;
    refs.lighthouse.glow.material.opacity = .4 + Math.sin(t * 1.7) * .08;
    refs.lighthouse.beamMat.opacity = on ? .24 + Math.sin(t * 1.1) * .04 : .01;
  }
  // 潮汐缓慢变化
  _tideTimer += dt;
  if (_tideTimer > .5) {
    _tideTimer = 0;
    const tide = .5 + .32 * Math.sin(t * .02 + .7);
    if (Math.abs(tide - state.tide) > .002) setTide(tide);
  }
  // 雨
  if (refs.rain) {
    const r = refs.rain;
    const vis = state.weather === 'rain';
    r.mat.opacity = damp(r.mat.opacity, vis ? .82 : 0, 4, dt);
    r.points.visible = r.mat.opacity > .01;
    if (vis) {
      for (let i = 0; i < r.count; i++) {
        r.pos[i * 3 + 1] -= dt * (12 + (i % 5));
        r.pos[i * 3] += dt * 1.1;
        if (r.pos[i * 3 + 1] < 0) {
          r.pos[i * 3] = camera.position.x + rand(-25, 25);
          r.pos[i * 3 + 1] = rand(14, 26);
          r.pos[i * 3 + 2] = camera.position.z + rand(-25, 25);
        }
      }
      r.points.geometry.attributes.position.needsUpdate = true;
    }
  }
  updateSpecial(dt, t);
  // 海鸥
  if (refs.gulls) {
    refs.gulls.birds.forEach((b) => {
      const u = b.userData;
      u.a += dt * u.sp;
      b.position.x = -28 + Math.cos(u.a) * u.r;
      b.position.z = -4 + Math.sin(u.a) * u.r;
      b.position.y = u.y + Math.sin(t * .7 + u.ph) * .35;
      b.rotation.y = -u.a + Math.PI / 2;
      const flap = Math.sin(t * 5 + u.ph) * .35;
      u.wl.rotation.x = flap; u.wr.rotation.x = -flap;
    });
  }
}

/* ---------------- 海滨步道家具 / 路灯 / 长椅 ---------------- */
function buildPromenadeFurniture() {
  const g = new THREE.Group();
  root.add(g);
  // 路灯
  const lampBulbMat = std({ color: '#fff4da', emissive: '#ffd29a', emissiveIntensity: .2, roughness: .5 });
  for (const z of [-27, -15, -3, 21]) {
    const lg = group(g, -10.8, .05, z);
    cylinder(lg, .08, .11, 4.3, 0, 2.15, 0, MAT.iron, { seg: 8, cast: true });
    cylinder(lg, .2, .25, .12, 0, .06, 0, MAT.stone, { seg: 8 });
    const arm = new THREE.Mesh(new THREE.TorusGeometry(.65, .045, 6, 12, Math.PI / 2), MAT.iron);
    arm.position.set(.65, 4.25, 0); arm.rotation.z = Math.PI / 2; lg.add(arm);
    box(lg, 1.1, .06, .06, .55, 4.28, 0, MAT.iron);
    box(lg, .28, .3, .28, 1.05, 4.08, 0, MAT.blackMetal, { cast: true });
    const bulbMat = lampBulbMat;
    box(lg, .18, .06, .18, 1.05, 3.94, 0, bulbMat, { receive: false });
    const light = new THREE.PointLight('#ffd09a', 11, 15, 2);
    light.position.set(1.05, 3.9, 0); g.add(light);
    refs.lamps.push({ light, base: 11, mat: bulbMat, on: false });
    addCollider(-11, -10.6, z - .2, z + .2, 0, 5, 'lamp');
  }
  // 长椅
  for (const z of [-18, 2, 18]) {
    const b = group(g, -12.2, .05, z);
    for (let i = 0; i < 4; i++) box(b, 1.9, .07, .12, 0, .5, -.24 + i * .16, MAT.wood, { receive: true });
    for (let i = 0; i < 3; i++) box(b, 1.9, .12, .06, 0, .7 + i * .14, .3, MAT.wood, { receive: true });
    for (const x of [-.8, .8]) {
      box(b, .08, .48, .4, x, .24, .02, MAT.iron);
      box(b, .08, .5, .06, x, .72, .3, MAT.iron);
    }
    addCollider(-13.2, -11.2, z - .5, z + .5, 0, 1.2, 'bench');
    registerInteract(`bench${z}`, b, '坐下休息', () => sitAt({ x: -12.2, z, y: .05, yaw: Math.PI / 2, kind: 'bench' }), { max: 2.4 });
  }
  // 垃圾桶 / 邮筒 / 指示牌
  for (const [x, z, c] of [[-10.4, -6, '#c47a65'], [-10.4, 8, '#547d88'], [-10.4, 20, '#7a9a72']]) {
    box(g, .42, .7, .42, x, .4, z, std({ color: c, roughness: .85 }), { cast: true, receive: true });
    box(g, .48, .06, .48, x, .78, z, MAT.cream);
  }
  const mailbox = group(g, -10.6, .05, 13.5);
  cylinder(mailbox, .25, .25, 1.2, 0, .6, 0, std({ color: '#b84f43', roughness: .7 }), { seg: 12, cast: true });
  box(mailbox, .5, .16, .5, 0, 1.2, 0, MAT.coral);
  box(mailbox, .35, .03, .03, 0, .95, .25, MAT.blackMetal);
  // 潮风线站牌
  const sign = group(g, -10.2, .05, -1);
  cylinder(sign, .05, .06, 2.2, 0, 1.1, 0, MAT.iron, { seg: 7 });
  box(sign, .7, .9, .05, 0, 2.0, 0, std({ color: '#f1e7d4', roughness: .8 }));
  plane(sign, .62, .8, 0, 2.0, .035, std({ map: TEX.bus, roughness: .85 }), { receive: false });
  // 南侧公共淋浴 / 公厕（低模）
  const bath = group(g, 24, .05, 22.5, -.2);
  box(bath, 6, 3.0, 4.2, 0, 1.5, 0, std({ color: '#ddd4c1', roughness: .92 }), { cast: true, receive: true });
  box(bath, 6.2, .2, 1.2, 0, 3.05, -1.6, MAT.roof, { cast: true });
  for (let i = 0; i < 2; i++) {
    box(bath, .8, 2.0, .06, -1.5 + i * 3, 1.1, 2.14, MAT.woodDark);
    plane(bath, .4, .6, -1.5 + i * 3, 1.8, 2.18, MAT.glass, { receive: false });
  }
  // 沙滩台阶旁指示
  const beachSign = group(g, -18.6, .05, 6);
  cylinder(beachSign, .05, .06, 1.8, 0, .9, 0, MAT.woodDark, { seg: 6 });
  box(beachSign, .9, .4, .06, 0, 1.6, 0, MAT.cream);
  plane(beachSign, .82, .32, 0, 1.6, .04, std({ color: '#f3ead8', roughness: .8 }), { receive: false });
  refs.promenade = { group: g };
  return g;
}

/* ---------------- 海鸥受惊 / 灯光闪烁补充 ---------------- */
function updateSpecial(dt, t) {
  if (refs.gulls && refs.gulls.scared) {
    const gg = refs.gulls.ground;
    gg.position.y += dt * 3.2;
    gg.position.x -= dt * 2.4;
    gg.rotation.z = Math.sin(t * 9) * .3;
    if (gg.position.y > 16) { gg.visible = false; refs.gulls.scared = false; }
  }
  // 路灯轻微呼吸
  refs.lamps.forEach((l, i) => {
    if (l.on) l.light.intensity = l.base * (0.94 + Math.sin(t * 3.7 + i * 1.9) * .06);
  });
}
