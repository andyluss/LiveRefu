/* Spacetime 3D — 无依赖 Canvas 3D 投影引擎（经典 script，file:// 可用）。 */
(function () {
  'use strict';
  const RAD = Math.PI / 180;

  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0,
    ];
  }
  function lookAt(eye, center, up) {
    let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1,
    ];
  }
  function mul(a, b) {
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function xf(m, v) {
    return [
      m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3],
      m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3],
      m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3],
      m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3],
    ];
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  class Camera {
    constructor() {
      this.yaw = 0.68;
      this.pitch = 0.38;
      this.distance = 24;
      this.target = [0, 0, 0];
      this.fov = 42 * RAD;
      this.auto = true;
      this.minDistance = 8;
      this.maxDistance = 48;
    }
    eye() {
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      return [
        this.target[0] + this.distance * cp * Math.sin(this.yaw),
        this.target[1] + this.distance * sp,
        this.target[2] + this.distance * cp * Math.cos(this.yaw),
      ];
    }
    matrix(w, h) {
      const p = perspective(this.fov, w / h, 0.1, 200);
      const v = lookAt(this.eye(), this.target, [0, 1, 0]);
      return mul(p, v);
    }
    reset() {
      this.yaw = 0.68; this.pitch = 0.38; this.distance = 24; this.target = [0, 0, 0]; this.auto = true;
    }
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.camera = new Camera();
      this.queue = [];
      this.labels = [];
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = 0; this.h = 0;
      this.pointer = null;
      this.colors = {};
      this.readPalette();
      this.bind();
      this.resize();
      window.addEventListener('resize', () => this.resize());
      document.addEventListener('themechange', () => this.readPalette());
    }
    readPalette() {
      const cs = getComputedStyle(document.documentElement);
      const get = (k) => cs.getPropertyValue(k).trim();
      this.colors = {
        bg: get('--bg'), bg2: get('--bg2'), panel: get('--panel'), ink: get('--ink'),
        body: get('--body'), muted: get('--muted'), line: get('--line'), line2: get('--line2'),
        teal: get('--teal'), teal2: get('--teal2'), orange: get('--orange'), orange2: get('--orange2'),
        gold: get('--gold'), blue: get('--blue'),
      };
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    bind() {
      const c = this.canvas;
      c.addEventListener('pointerdown', (e) => {
        this.pointer = { x: e.clientX, y: e.clientY, yaw: this.camera.yaw, pitch: this.camera.pitch };
        c.setPointerCapture(e.pointerId); c.style.cursor = 'grabbing';
      });
      c.addEventListener('pointermove', (e) => {
        if (!this.pointer) return;
        this.camera.auto = false;
        this.camera.yaw = this.pointer.yaw - (e.clientX - this.pointer.x) * 0.008;
        this.camera.pitch = clamp(this.pointer.pitch + (e.clientY - this.pointer.y) * 0.006, -0.15, 1.32);
      });
      const up = (e) => { if (this.pointer) { this.pointer = null; c.style.cursor = 'grab'; } };
      c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
      c.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.camera.distance = clamp(this.camera.distance + e.deltaY * 0.025, this.camera.minDistance, this.camera.maxDistance);
      }, { passive: false });
      c.style.cursor = 'grab';
    }
    begin() {
      this.resize();
      this.queue = []; this.labels = [];
      this.ctx.clearRect(0, 0, this.w, this.h);
      this.viewProj = this.camera.matrix(this.w, this.h);
    }
    project(p) {
      const c = xf(this.viewProj, [p[0], p[1], p[2], 1]);
      if (c[3] <= 0.15) return null;
      return {
        x: (c[0] / c[3] * 0.5 + 0.5) * this.w,
        y: (-c[1] / c[3] * 0.5 + 0.5) * this.h,
        depth: c[3],
      };
    }
    poly(points, style = {}) {
      const ps = points.map((p) => this.project(p));
      if (ps.some((p) => !p)) return;
      const depth = ps.reduce((s, p) => s + p.depth, 0) / ps.length;
      this.queue.push({ kind: 'poly', ps, depth, style });
    }
    line(a, b, style = {}) {
      const pa = this.project(a), pb = this.project(b);
      if (!pa || !pb) return;
      this.queue.push({ kind: 'line', pa, pb, depth: (pa.depth + pb.depth) / 2, style });
    }
    dot(p, style = {}) {
      const pp = this.project(p);
      if (!pp) return;
      this.queue.push({ kind: 'dot', pp, depth: pp.depth, style });
    }
    text(p, text, style = {}) {
      const pp = this.project(p);
      if (!pp) return;
      this.labels.push({ pp, text, style, depth: pp.depth });
    }
    drawItem(it) {
      const ctx = this.ctx;
      const st = it.style;
      ctx.save();
      ctx.globalAlpha = st.alpha == null ? 1 : st.alpha;
      if (it.kind === 'poly') {
        ctx.beginPath();
        it.ps.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.closePath();
        if (st.fill !== false) { ctx.fillStyle = st.fill || 'transparent'; ctx.fill(); }
        if (st.stroke) { ctx.strokeStyle = st.stroke; ctx.lineWidth = st.lineWidth || 1; ctx.stroke(); }
      } else if (it.kind === 'line') {
        ctx.beginPath(); ctx.moveTo(it.pa.x, it.pa.y); ctx.lineTo(it.pb.x, it.pb.y);
        ctx.strokeStyle = st.stroke || '#888'; ctx.lineWidth = st.lineWidth || 1; ctx.setLineDash(st.dash || []); ctx.stroke();
      } else if (it.kind === 'dot') {
        ctx.beginPath(); ctx.arc(it.pp.x, it.pp.y, st.r || 3, 0, Math.PI * 2);
        ctx.fillStyle = st.fill || '#888'; ctx.fill();
        if (st.stroke) { ctx.strokeStyle = st.stroke; ctx.lineWidth = st.lineWidth || 1; ctx.stroke(); }
      }
      ctx.restore();
    }
    flush() {
      this.queue.sort((a, b) => b.depth - a.depth);
      this.queue.forEach((it) => this.drawItem(it));
      this.labels.sort((a, b) => b.depth - a.depth).forEach((it) => {
        const ctx = this.ctx;
        ctx.save();
        ctx.font = it.style.font || '10px Menlo, monospace';
        ctx.fillStyle = it.style.fill || this.colors.ink;
        ctx.globalAlpha = it.style.alpha == null ? 1 : it.style.alpha;
        ctx.textAlign = it.style.align || 'left';
        ctx.textBaseline = it.style.baseline || 'middle';
        ctx.fillText(it.text, it.pp.x + (it.style.dx || 0), it.pp.y + (it.style.dy || 0));
        ctx.restore();
      });
    }
    loop(fn) {
      let last = performance.now();
      const tick = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (this.camera.auto && !this.pointer) this.camera.yaw += dt * 0.14;
        this.begin();
        fn(dt, now / 1000);
        this.flush();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  function grid(r, y, size, step, color, alpha) {
    for (let i = -size; i <= size; i += step) {
      r.line([i, y, -size], [i, y, size], { stroke: color, lineWidth: 1, alpha: alpha || 0.18 });
      r.line([-size, y, i], [size, y, i], { stroke: color, lineWidth: 1, alpha: alpha || 0.18 });
    }
  }
  function vecLerp(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

  window.Space3D = { Camera, Renderer, grid, lerp, vecLerp, clamp, perspective, lookAt, mul, xf };
})();
