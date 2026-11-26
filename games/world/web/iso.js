import init, { PreviewWorld } from "./pkg/world_wasm.js";

const TICK_US = 16666;
const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const el = {
  loading: document.getElementById("loading"),
  subtitle: document.getElementById("scene-subtitle"),
  questTitle: document.getElementById("quest-title"),
  objectives: document.getElementById("quest-objectives"),
  inventory: document.getElementById("inventory"),
  flags: document.getElementById("flags"),
  clock: document.getElementById("clock"),
  tick: document.getElementById("tick"),
  hash: document.getElementById("hash"),
  footPack: document.getElementById("foot-pack"),
  hint: document.getElementById("hint"),
  toast: document.getElementById("toast"),
  dialogue: document.getElementById("dialogue"),
  dialogueSpeaker: document.getElementById("dialogue-speaker"),
  dialogueText: document.getElementById("dialogue-text"),
  pause: document.getElementById("btn-pause"),
};

const DEMOS = {
  market: {
    pack: "demo.market.data",
    title: "霓虹夜市",
    subtitle: "夜市场景 · 2.5D 等距 · 同一份 wasm 世界",
    kind: "market",
  },
  greenhouse: {
    pack: "demo.greenhouse.data",
    title: "温室协议",
    subtitle: "植物温室 · 2.5D 等距 · 同一份 wasm 世界",
    kind: "greenhouse",
  },
};

const params = new URLSearchParams(location.search);
const demoId = DEMOS[params.get("demo")] ? params.get("demo") : "market";
const demo = DEMOS[demoId];

let world;
let pack;
let current;
let paused = false;
let last = performance.now();
let acc = 0;
let W = innerWidth;
let H = innerHeight;
let S = 40;
let CX = 0;
let CY = 0;
let ground;
let groundCtx;
let themeDark = document.documentElement.dataset.theme === "dark";
let toastTimer = 0;
let dialogueTimer = 0;
let hudTimer = 0;
let lastState = null;
let particles = [];
let keys = new Set();
let moving = false;
let pointerStart = null;
let hits = [];
let hover = null;
const doorAnim = new Map();
const movingKeys = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);

function palette() {
  if (demo.kind === "market") {
    return themeDark
      ? { sky1: "#0a1520", sky2: "#02060a", floorA: "#17282e", floorB: "#1b3036", line: "#2b474b", wall: "#0b171d", wall2: "#112630", accent: "#ffb15c", accent2: "#5ce3cf", ink: "#eaf5f0", muted: "#9bb5b1", glow: "#ffb15c", shadow: "rgba(0,0,0,.45)" }
      : { sky1: "#a9c4c1", sky2: "#d8d3c2", floorA: "#9eaaa1", floorB: "#aeb8ad", line: "#7f9189", wall: "#465e5d", wall2: "#5f7774", accent: "#b95d2c", accent2: "#0f766e", ink: "#1b2b28", muted: "#526763", glow: "#d6944e", shadow: "rgba(40,60,55,.22)" };
  }
  return themeDark
    ? { sky1: "#0b1d1b", sky2: "#03080a", floorA: "#132522", floorB: "#182e29", line: "#2c4b42", wall: "#0a1715", wall2: "#112923", accent: "#79e6b3", accent2: "#d5a5ff", ink: "#e7f7ea", muted: "#9bb9aa", glow: "#79e6b3", shadow: "rgba(0,0,0,.4)" }
    : { sky1: "#b7d4bf", sky2: "#e6dfc9", floorA: "#97ac91", floorB: "#a9bda1", line: "#728b76", wall: "#3e5a4d", wall2: "#557466", accent: "#197a55", accent2: "#7a4f9e", ink: "#1b2d24", muted: "#52695d", glow: "#4fa978", shadow: "rgba(40,65,50,.22)" };
}

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

function translate(text) {
  if (typeof text !== "string") return text;
  if (!text.startsWith("loc:")) return text;
  return current?.loc?.[text.slice(4)] ?? text.slice(4);
}

function nameOf(contentId) {
  if (!contentId) return "?";
  if (contentId === "player") return "你";
  return translate(current?.names?.[contentId] ?? contentId);
}

function clockText(minutes) {
  const m = ((Number(minutes) || 0) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function zoneId() {
  return current?.state?.zone_id ?? Object.keys(current?.zones ?? {})[0];
}

function resize() {
  W = innerWidth;
  H = innerHeight;
  const dpr = Math.min(devicePixelRatio, 2);
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const zone = current?.zones?.[zoneId() ?? ""] ?? null;
  const b = zone?.bounds ?? { min: [-16, 0, -16], max: [16, 10, 16] };
  const spanX = b.max[0] - b.min[0];
  const spanZ = b.max[2] - b.min[2];
  const span = Math.max(spanX + spanZ, 8);
  S = Math.min((W - 120) / span, (H - 220) / (span * 0.5));
  S = Math.max(16, Math.min(S, 58));
  const midX = (b.min[0] + b.max[0]) / 2;
  const midZ = (b.min[2] + b.max[2]) / 2;
  CX = W / 2;
  CY = H * 0.47;
  project.setBase(midX, midZ);
  buildGround();
  buildParticles();
}

const project = {
  midX: 0,
  midZ: 0,
  setBase(x, z) { this.midX = x; this.midZ = z; },
  to(x, z) {
    return [
      CX + ((x - this.midX) - (z - this.midZ)) * S,
      CY + ((x - this.midX) + (z - this.midZ)) * S * 0.5,
    ];
  },
  from(sx, sy) {
    const u = (sx - CX) / S;
    const v = (sy - CY) / (S * 0.5);
    return [this.midX + (u + v) / 2, this.midZ + (v - u) / 2];
  },
};

function buildParticles() {
  particles = [];
  const count = demo.kind === "market" ? 70 : 50;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 8,
      vy: -(4 + Math.random() * 12),
      r: 0.8 + Math.random() * 1.8,
      a: 0.15 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

function diamond(g, x, z, size, fill, stroke, lineWidth = 1) {
  const p = [
    project.to(x, z), project.to(x + size, z), project.to(x + size, z + size), project.to(x, z + size),
  ];
  g.beginPath();
  g.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < 4; i++) g.lineTo(p[i][0], p[i][1]);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lineWidth; g.stroke(); }
}

function buildGround() {
  const zone = current?.zones?.[zoneId() ?? ""] ?? null;
  const b = zone?.bounds ?? { min: [-16, 0, -16], max: [16, 10, 16] };
  ground = document.createElement("canvas");
  const dpr = Math.min(devicePixelRatio, 2);
  ground.width = Math.floor(W * dpr);
  ground.height = Math.floor(H * dpr);
  groundCtx = ground.getContext("2d");
  groundCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = groundCtx;
  const p = palette();
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, p.sky1);
  grad.addColorStop(1, p.sky2);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  // 远景 / 屋顶。
  if (demo.kind === "market") {
    g.fillStyle = "rgba(4, 12, 18, 0.8)";
    for (let i = 0; i < 12; i++) {
      const bw = 30 + (i * 37) % 80;
      const bh = 80 + (i * 53) % 160;
      g.fillRect((i * 137) % W, H * 0.27 - bh, bw, bh);
    }
    for (let i = 0; i < 30; i++) {
      g.fillStyle = i % 3 ? "rgba(255, 177, 92, .35)" : "rgba(92, 227, 207, .3)";
      g.fillRect((i * 91) % W, H * 0.24 + (i * 17) % 90, 3, 3);
    }
  } else {
    g.strokeStyle = "rgba(140, 220, 180, .16)";
    g.lineWidth = 2;
    for (let x = -2; x <= 2; x++) {
      const a = [W / 2 + x * 160, H * 0.12];
      const c = [W / 2 + x * 260, H * 0.76];
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke();
    }
  }

  const minX = Math.floor(b.min[0]);
  const maxX = Math.ceil(b.max[0]);
  const minZ = Math.floor(b.min[2]);
  const maxZ = Math.ceil(b.max[2]);
  // 地面。
  for (let z = minZ; z < maxZ; z++) {
    for (let x = minX; x < maxX; x++) {
      const alt = ((x + z) & 1) === 0;
      diamond(g, x, z, 1, alt ? p.floorA : p.floorB, "rgba(0,0,0,0.08)", 0.7);
    }
  }
  // 中央通道 / 水渠。
  for (let z = minZ; z < maxZ; z++) {
    for (let x = Math.max(minX, -2); x < Math.min(maxX, 2); x++) {
      diamond(g, x, z, 1, demo.kind === "market" ? "rgba(255,177,92,0.05)" : "rgba(121,230,179,0.06)", null);
    }
  }
  if (demo.kind === "greenhouse") {
    for (let z = minZ; z < maxZ; z++) {
      diamond(g, -1, z, 2, "rgba(80,190,170,0.16)", null);
    }
  }

  // 中央地毯 / 场地标识。
  if (demo.kind === "market") {
    diamond(g, -3.6, -3.6, 7.2, "rgba(255, 177, 92, 0.075)", "rgba(255, 177, 92, 0.25)", 1.5);
    diamond(g, -2.6, -2.6, 5.2, null, "rgba(255, 177, 92, 0.18)", 1);
    const [lx, ly] = project.to(0, 0);
    g.fillStyle = "rgba(255, 177, 92, 0.36)";
    g.font = "800 10px ui-monospace, monospace";
    g.textAlign = "center";
    g.fillText("NIGHT MARKET · BAY 07", lx, ly + 76);
  }

  // 边界墙。
  if (demo.kind === "market") {
    drawWall(g, b.min[0], b.max[2], b.max[0], b.max[2], 2.6, p.wall, p.wall2);
    drawWall(g, b.max[0], b.max[2], b.max[0], b.min[2], 1.8, p.wall2, p.wall);
    // 背街店面：给等距平台一个“城市边缘”。
    for (let sx = Math.ceil(b.min[0]); sx < b.max[0]; sx += 4) {
      const a = project.to(sx, b.max[2]);
      const c = project.to(Math.min(sx + 3.4, b.max[0]), b.max[2]);
      const top = 2.8 * S * 0.7;
      g.fillStyle = "rgba(8, 18, 24, 0.9)";
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.lineTo(c[0], c[1] - top); g.lineTo(a[0], a[1] - top); g.closePath(); g.fill();
      g.fillStyle = "rgba(255, 177, 92, 0.18)";
      g.fillRect(a[0] + 8, a[1] - top + 18, Math.max(10, (c[0] - a[0]) - 16), 12);
      g.fillStyle = "rgba(92, 227, 207, 0.14)";
      g.fillRect(a[0] + 8, a[1] - top + 38, Math.max(8, (c[0] - a[0]) * 0.45), 8);
    }
  } else {
    drawGlass(g, b.min[0], b.max[2], b.max[0], b.max[2], 3.2, p);
    drawGlass(g, b.max[0], b.max[2], b.max[0], b.min[2], 2.4, p);
  }

  // 光池 / 水洼。
  const pools = demo.kind === "market"
    ? [[-7, -6, 170], [7, 1, 120], [-2, 5, 100], [9, -7, 90]]
    : [[-7, -5, 130], [8, 2, 110], [0, 5, 150]];
  for (const [x, z, r] of pools) {
    const [sx, sy] = project.to(x, z);
    const rg = g.createRadialGradient(sx, sy, 0, sx, sy, r * 0.45);
    rg.addColorStop(0, demo.kind === "market" ? "rgba(255,177,92,0.13)" : "rgba(121,230,179,0.12)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg;
    g.beginPath(); g.ellipse(sx, sy, r * 0.55, r * 0.28, 0, 0, Math.PI * 2); g.fill();
  }
  if (demo.kind === "market") {
    for (const [x, z, r] of [[-4, 1, 1.2], [5, 4, 0.8]]) {
      const [sx, sy] = project.to(x, z);
      g.fillStyle = "rgba(92, 170, 190, 0.10)";
      g.beginPath(); g.ellipse(sx, sy, r * S, r * S * 0.38, 0, 0, Math.PI * 2); g.fill();
    }
  }
}

function drawWall(g, x1, z1, x2, z2, height, top, side) {
  const a = project.to(x1, z1);
  const b = project.to(x2, z2);
  g.fillStyle = side;
  g.beginPath();
  g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(b[0], b[1] - height * S * 0.7); g.lineTo(a[0], a[1] - height * S * 0.7); g.closePath(); g.fill();
  g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 1; g.stroke();
  g.fillStyle = top;
  g.beginPath();
  g.moveTo(a[0], a[1] - height * S * 0.7); g.lineTo(b[0], b[1] - height * S * 0.7); g.lineTo(b[0] + 8, b[1] - height * S * 0.7 - 6); g.lineTo(a[0] + 8, a[1] - height * S * 0.7 - 6); g.closePath(); g.fill();
}

function drawGlass(g, x1, z1, x2, z2, height, p) {
  const a = project.to(x1, z1);
  const b = project.to(x2, z2);
  g.strokeStyle = "rgba(140,235,205,0.24)";
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a[0], a[1] - height * S * 0.7); g.lineTo(b[0], b[1] - height * S * 0.7); g.lineTo(b[0], b[1]); g.stroke();
  g.strokeStyle = "rgba(140,235,205,0.1)";
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    const ax = a[0] + (b[0] - a[0]) * t;
    const ay = a[1] + (b[1] - a[1]) * t;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, ay - height * S * 0.7); g.stroke();
  }
}

function drawScene(time) {
  const p = palette();
  ctx.clearRect(0, 0, W, H);
  if (ground) ctx.drawImage(ground, 0, 0, W, H);

  const s = current.state;
  const player = s.entities.find((e) => e.content_id === "player");
  const playerPos = player ? [player.transform.position[0], player.transform.position[2]] : [0, 0];

  drawAmbient(ctx, time);

  // 静态装饰 + 实体统一按深度排序。
  const objects = [];
  for (const d of decor()) objects.push({ depth: d.x + d.z, draw: () => d.draw(ctx, time) });
  for (const entity of s.entities) objects.push({ depth: entity.transform.position[0] + entity.transform.position[2], draw: () => drawEntity(ctx, entity, time) });
  objects.sort((a, b) => a.depth - b.depth);

  drawPath(ctx, s);
  hits = [];
  for (const obj of objects) obj.draw();

  // 玩家脚下光。
  if (player) {
    const [sx, sy] = project.to(playerPos[0], playerPos[1]);
    const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 130);
    rg.addColorStop(0, demo.kind === "market" ? "rgba(255,177,92,0.10)" : "rgba(121,230,179,0.09)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.ellipse(sx, sy, 140, 62, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function decor() {
  if (demo.kind === "market") {
    return [
      { x: -10, z: -7, draw: (g) => stall(g, -10, -7, "#8d3e2d", "#e7a052", "灯笼铺") },
      { x: -10, z: 0, draw: (g) => stall(g, -10, 0, "#1d5c58", "#66cdb8", "夜宵") },
      { x: 8, z: -8, draw: (g) => stall(g, 8, -8, "#5a3d7a", "#c58ce8", "旧物") },
      { x: 8, z: 5, draw: (g) => stall(g, 8, 5, "#7a5b25", "#f0cf78", "茶摊") },
      { x: -5, z: -4, draw: (g) => crates(g, -5, -4) },
      { x: 6, z: 3, draw: (g) => crates(g, 6, 3) },
    ];
  }
  return [
    { x: -8, z: -6, draw: (g) => planter(g, -8, -6, 2.6, 1.1) },
    { x: -8, z: 2, draw: (g) => planter(g, -8, 2, 2.6, 1.1) },
    { x: 8, z: -5, draw: (g) => planter(g, 8, -5, 2.6, 1.1) },
    { x: 7, z: 4, draw: (g) => planter(g, 7, 4, 2.2, 1.0) },
    { x: -3, z: -6, draw: (g) => fern(g, -3, -6) },
    { x: 4, z: 6, draw: (g) => fern(g, 4, 6) },
  ];
}

function drawAmbient(g, t) {
  const p = palette();
  if (demo.kind === "market") {
    g.strokeStyle = "rgba(255, 177, 92, 0.18)";
    g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = H * 0.10 + i * 26;
      g.beginPath();
      for (let x = 0; x <= W; x += 24) {
        const yy = y + Math.sin(x * 0.012 + t * 0.7 + i) * 7;
        if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
      }
      g.stroke();
      for (let x = 40 + (i * 83) % 160; x < W; x += 210) {
        const yy = y + Math.sin(x * 0.012 + t * 0.7 + i) * 7;
        g.fillStyle = i % 2 ? "#ffb15c" : "#5ce3cf";
        g.globalAlpha = 0.35;
        g.beginPath(); g.arc(x, yy + 5, 2.4, 0, Math.PI * 2); g.fill();
      }
    }
    g.globalAlpha = 1;
  } else {
    g.fillStyle = "rgba(140,235,205,0.035)";
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(W * 0.2 + i * 190, 0);
      g.lineTo(W * 0.35 + i * 190, 0);
      g.lineTo(W * 0.6 + i * 160, H);
      g.lineTo(W * 0.45 + i * 160, H);
      g.closePath(); g.fill();
    }
  }
  for (const particle of particles) {
    particle.x += particle.vx * 0.016;
    particle.y += particle.vy * 0.016;
    if (particle.y < -10) { particle.y = H + 10; particle.x = Math.random() * W; }
    if (particle.x < -10) particle.x = W + 10;
    if (particle.x > W + 10) particle.x = -10;
    g.globalAlpha = particle.a * (0.6 + 0.4 * Math.sin(t * 2 + particle.phase));
    g.fillStyle = p.glow;
    g.beginPath(); g.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
}

function stall(g, x, z, cloth, light, label) {
  const [sx, sy] = project.to(x, z);
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath(); g.ellipse(sx, sy + 4, 52, 16, 0, 0, Math.PI * 2); g.fill();
  // 台面
  g.fillStyle = "#3b2a22";
  g.beginPath();
  g.moveTo(sx - 54, sy - 8); g.lineTo(sx, sy + 20); g.lineTo(sx + 54, sy - 8); g.lineTo(sx, sy - 36); g.closePath(); g.fill();
  g.fillStyle = "#5a3b2a";
  g.fillRect(sx - 52, sy - 10, 104, 30);
  // 顶棚条纹
  for (let i = 0; i < 5; i++) {
    g.fillStyle = i % 2 ? cloth : light;
    g.beginPath();
    g.moveTo(sx - 60 + i * 24, sy - 70);
    g.lineTo(sx - 48 + i * 24, sy - 70);
    g.lineTo(sx - 20 + i * 24, sy - 30);
    g.lineTo(sx - 32 + i * 24, sy - 30);
    g.closePath(); g.fill();
  }
  // 灯笼
  g.fillStyle = light;
  g.beginPath(); g.arc(sx - 48, sy - 54, 7, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(sx + 48, sy - 54, 6, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.14)";
  g.fillRect(sx - 42, sy - 6, 14, 18);
  g.font = "600 11px ui-sans-serif, system-ui, sans-serif";
  g.fillStyle = "#f0dfc8";
  g.textAlign = "center";
  g.fillText(label, sx, sy - 78);
}

function crates(g, x, z) {
  const [sx, sy] = project.to(x, z);
  for (let i = 0; i < 3; i++) {
    g.fillStyle = i % 2 ? "#4a3524" : "#5a3e28";
    g.fillRect(sx - 20 + i * 12, sy - 18 - i * 8, 16, 20);
    g.strokeStyle = "rgba(255,177,92,0.35)";
    g.strokeRect(sx - 20 + i * 12, sy - 18 - i * 8, 16, 20);
  }
}

function planter(g, x, z, w, h) {
  const [sx, sy] = project.to(x, z);
  g.fillStyle = "rgba(0,0,0,0.3)";
  g.beginPath(); g.ellipse(sx, sy + 6, 60, 18, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#385142";
  g.fillRect(sx - 52, sy - 12, 104, 22);
  g.fillStyle = "#5ca878";
  for (let i = 0; i < 7; i++) {
    const px = sx - 42 + i * 14;
    const ph = 20 + (i * 13) % 34;
    g.beginPath(); g.moveTo(px, sy - 12); g.quadraticCurveTo(px - 8, sy - 12 - ph, px + 4, sy - 12 - ph); g.strokeStyle = "#6fcf91"; g.lineWidth = 3; g.stroke();
    g.fillStyle = i % 2 ? "#9ff2bc" : "#74d5a2";
    g.beginPath(); g.arc(px + 4, sy - 12 - ph, 5, 0, Math.PI * 2); g.fill();
  }
}

function fern(g, x, z) {
  const [sx, sy] = project.to(x, z);
  g.strokeStyle = "rgba(121,230,179,0.75)";
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + (i - 2.5) * 0.28;
    g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + Math.cos(angle) * 20, sy + Math.sin(angle) * 30, sx + Math.cos(angle) * 36, sy + Math.sin(angle) * 44); g.stroke();
  }
}

function drawEntity(g, entity, t) {
  const x = entity.transform.position[0];
  const z = entity.transform.position[2];
  const [sx, sy] = project.to(x, z);
  if (entity.kind === "player") {
    drawPerson(g, sx, sy, "player", t, entity);
    return;
  }
  if (entity.kind === "actor") {
    drawPerson(g, sx, sy, entity.content_id.includes("botanist") ? "botanist" : "vendor", t, entity);
    return;
  }
  if (entity.kind === "item") {
    drawItem(g, sx, sy, entity, t);
    return;
  }
  if (entity.door) {
    drawDoor(g, sx, sy, entity, t);
    return;
  }
}

function drawPerson(g, sx, sy, kind, t, entity) {
  const p = palette();
  const isPlayer = kind === "player";
  const isBotanist = kind === "botanist";
  const isVendor = kind === "vendor";
  const bob = Math.sin(t * 2 + (entity.id?.index ?? 0)) * 1.2;
  const y = sy + bob;
  g.fillStyle = p.shadow;
  g.beginPath(); g.ellipse(sx, sy + 3, 24, 8, 0, 0, Math.PI * 2); g.fill();
  // 腿
  g.strokeStyle = isPlayer ? "#172c33" : isBotanist ? "#284a38" : "#3a2620";
  g.lineWidth = 6;
  g.beginPath(); g.moveTo(sx - 7, y - 4); g.lineTo(sx - 8, y + 16); g.moveTo(sx + 7, y - 4); g.lineTo(sx + 8, y + 16); g.stroke();
  // 身体
  g.fillStyle = isPlayer ? "#2b7776" : isBotanist ? "#467a58" : "#8c3e2c";
  roundRect(g, sx - 15, y - 44, 30, 42, 9); g.fill();
  // 围裙 / 背包
  if (isVendor) {
    g.fillStyle = "#dda052"; roundRect(g, sx - 9, y - 34, 18, 25, 4); g.fill();
    g.fillStyle = "#f2d9a0"; g.fillRect(sx - 6, y - 25, 12, 3);
  }
  if (isBotanist) {
    g.fillStyle = "#9be0b2"; roundRect(g, sx - 8, y - 32, 16, 16, 3); g.fill();
    g.strokeStyle = "#bff7c8"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx, y - 32); g.lineTo(sx, y - 45); g.stroke();
  }
  if (isPlayer) {
    g.fillStyle = "#17383e"; roundRect(g, sx - 18, y - 32, 12, 22, 3); g.fill();
    g.fillStyle = "#65e3ce"; g.fillRect(sx - 16, y - 27, 3, 12);
  }
  // 手臂
  g.strokeStyle = isPlayer ? "#2b7776" : isBotanist ? "#467a58" : "#8c3e2c";
  g.lineWidth = 5;
  g.beginPath(); g.moveTo(sx - 14, y - 37); g.lineTo(sx - 22, y - 20); g.moveTo(sx + 14, y - 37); g.lineTo(sx + 22, y - 20); g.stroke();
  // 头
  g.fillStyle = isBotanist ? "#c79b78" : "#b88766";
  g.beginPath(); g.arc(sx, y - 53, 9, 0, Math.PI * 2); g.fill();
  // 帽子/护目镜
  if (isVendor) {
    g.fillStyle = "#2b201b"; g.beginPath(); g.ellipse(sx, y - 60, 11, 3.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#e0a35b"; g.fillRect(sx - 10, y - 67, 20, 4);
  } else if (isBotanist) {
    g.strokeStyle = "#c9f7d7"; g.lineWidth = 2; g.strokeRect(sx - 8, y - 57, 16, 6);
  } else {
    g.fillStyle = "#bdeee6"; g.beginPath(); g.arc(sx + 3, y - 54, 5, 0, Math.PI * 2); g.fill();
  }
  // 名字
  if (!isPlayer) {
    g.font = "600 11px ui-sans-serif, system-ui, sans-serif";
    g.textAlign = "center";
    const text = nameOf(entity.content_id);
    const tw = g.measureText(text).width + 16;
    g.fillStyle = "rgba(5,15,18,0.76)";
    roundRect(g, sx - tw / 2, y - 92, tw, 18, 8); g.fill();
    g.fillStyle = p.ink; g.fillText(text, sx, y - 79);
  }
  const dist = Math.hypot((entity.transform.position[0] - (current.state.entities.find((e) => e.content_id === "player")?.transform.position[0] ?? 0)), (entity.transform.position[2] - (current.state.entities.find((e) => e.content_id === "player")?.transform.position[2] ?? 0)));
  if (dist < 6.5) {
    g.strokeStyle = isPlayer ? p.accent2 : p.accent;
    g.globalAlpha = 0.35 + 0.15 * Math.sin(t * 2.5);
    g.lineWidth = 2;
    g.beginPath(); g.ellipse(sx, sy + 2, 24, 8, 0, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1;
  }
  if (!isPlayer) hits.push({ id: entity.content_id, x: sx, y: y - 50, r: 32 });
}

function drawItem(g, sx, sy, entity, t) {
  const p = palette();
  const y = sy - 30 + Math.sin(t * 2) * 5;
  g.fillStyle = p.shadow;
  g.beginPath(); g.ellipse(sx, sy + 3, 16, 6, 0, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 0.18;
  g.fillStyle = p.accent2;
  g.beginPath(); g.moveTo(sx, y - 14); g.lineTo(sx + 14, y); g.lineTo(sx, y + 14); g.lineTo(sx - 14, y); g.closePath(); g.fill();
  g.globalAlpha = 1;
  g.fillStyle = demo.kind === "market" ? "#7ef0dc" : "#a0ffbd";
  g.beginPath(); g.moveTo(sx, y - 9); g.lineTo(sx + 9, y); g.lineTo(sx, y + 9); g.lineTo(sx - 9, y); g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 1; g.stroke();
  g.strokeStyle = p.accent2; g.globalAlpha = 0.35; g.beginPath(); g.ellipse(sx, sy, 20, 7, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  hits.push({ id: entity.content_id, x: sx, y: y, r: 24 });
}

function drawDoor(g, sx, sy, entity, t) {
  const p = palette();
  const open = !!entity.door?.open;
  const d = doorAnim.get(entity.content_id) ?? (open ? 1 : 0);
  const target = open ? 1 : 0;
  doorAnim.set(entity.content_id, d + (target - d) * 0.08);
  const prog = doorAnim.get(entity.content_id);
  g.fillStyle = p.shadow;
  g.beginPath(); g.ellipse(sx, sy + 3, 46, 13, 0, 0, Math.PI * 2); g.fill();
  // 立柱
  g.fillStyle = p.wall2;
  g.fillRect(sx - 42, sy - 82, 9, 80);
  g.fillRect(sx + 33, sy - 82, 9, 80);
  // 顶梁
  g.fillRect(sx - 48, sy - 92, 96, 10);
  // 门板
  const panel = 30 * (1 - prog * 0.65);
  g.fillStyle = open ? "#1e453d" : "#1b2a31";
  g.fillRect(sx - 33, sy - 80, panel, 72);
  g.fillRect(sx + 33 - panel, sy - 80, panel, 72);
  // 门缝光
  if (open) {
    const grd = g.createLinearGradient(sx, sy - 80, sx, sy);
    grd.addColorStop(0, "rgba(92,227,207,0.42)");
    grd.addColorStop(1, "rgba(92,227,207,0.02)");
    g.fillStyle = grd;
    g.fillRect(sx - 5, sy - 80, 10, 72);
  } else {
    g.fillStyle = p.accent;
    g.beginPath(); g.arc(sx, sy - 72, 3.5, 0, Math.PI * 2); g.fill();
  }
  // 门禁灯
  g.fillStyle = open ? "#5ce3cf" : "#ff7a5c";
  g.beginPath(); g.arc(sx, sy - 98, 3.5, 0, Math.PI * 2); g.fill();
  // 标签
  g.font = "600 10px ui-sans-serif, system-ui, sans-serif";
  g.textAlign = "center";
  g.fillStyle = p.ink;
  g.fillText(nameOf(entity.content_id), sx, sy - 106);
  hits.push({ id: entity.content_id, x: sx, y: sy - 50, r: 48 });
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function drawPath(g, s) {
  const path = s.path ?? [];
  if (!path.length) return;
  const player = s.entities.find((e) => e.content_id === "player");
  const p = palette();
  g.save();
  g.setLineDash([6, 7]);
  g.strokeStyle = p.accent2;
  g.globalAlpha = 0.55;
  g.lineWidth = 2;
  g.beginPath();
  const start = project.to(player.transform.position[0], player.transform.position[2]);
  g.moveTo(start[0], start[1]);
  for (let i = Math.max(0, s.path_index ?? 0); i < path.length; i++) {
    const q = project.to(path[i][0], path[i][1]);
    g.lineTo(q[0], q[1]);
  }
  g.stroke();
  g.restore();
}

function hitAt(sx, sy) {
  let best = null;
  for (const h of hits) {
    const d = Math.hypot(sx - h.x, sy - h.y);
    if (d <= h.r && (!best || d < best.d)) best = { id: h.id, d };
  }
  return best?.id ?? null;
}

function actionFor(contentId) {
  const entity = current.state.entities.find((e) => e.content_id === contentId);
  const player = current.state.entities.find((e) => e.content_id === "player");
  if (!entity || !player) return;
  const dist = Math.hypot(entity.transform.position[0] - player.transform.position[0], entity.transform.position[2] - player.transform.position[2]);
  if (dist > 7) { showToast(`太远了（${dist.toFixed(1)}m）`); return; }
  const verbs = entity.interactable?.verbs ?? [];
  try {
    if (verbs.includes("pickup")) world.pickup("player", contentId);
    else if (verbs.includes("talk")) world.talk("player", contentId);
    else world.interact("player", contentId);
  } catch (error) { showToast(String(error)); }
}

function nearestAction(verb) {
  const player = current.state.entities.find((e) => e.content_id === "player");
  let best = null;
  for (const entity of current.state.entities) {
    if (!(entity.interactable?.verbs ?? []).includes(verb)) continue;
    const dist = Math.hypot(entity.transform.position[0] - player.transform.position[0], entity.transform.position[2] - player.transform.position[2]);
    if (dist <= 7 && (!best || dist < best.dist)) best = { id: entity.content_id, dist };
  }
  if (best) actionFor(best.id);
  else showToast(verb === "pickup" ? "附近没有可拾取物" : verb === "talk" ? "附近没有可对话的人" : "附近没有可交互物");
}

function updateHud() {
  if (!current) return;
  const s = current.state;
  const player = s.entities.find((e) => e.content_id === "player");
  const questId = Object.keys(pack.quests ?? {})[0];
  const quest = questId ? s.quests?.[questId] : null;
  const definition = questId ? pack.quests[questId] : null;
  el.questTitle.textContent = definition ? translate(definition.title) : "自由探索";
  el.objectives.replaceChildren();
  if (definition) {
    const done = !!quest?.completed;
    for (const obj of definition.objectives ?? []) {
      const li = document.createElement("li");
      li.className = done ? "done" : "";
      li.textContent = obj.kind === "talk" ? `和${nameOf(obj.target)}说话` : obj.kind === "flag" ? `完成：${obj.flag}` : obj.kind;
      el.objectives.append(li);
    }
  }
  el.inventory.replaceChildren();
  const items = player?.inventory ?? [];
  if (!items.length) el.inventory.innerHTML = '<span class="empty">背包为空</span>';
  else for (const item of items) {
    const row = document.createElement("div");
    row.textContent = `${translate(current.names?.[item.item] ?? item.item)} ×${item.count}`;
    el.inventory.append(row);
  }
  el.flags.textContent = Object.keys(s.flags ?? {}).length ? Object.entries(s.flags).map(([k, v]) => `${k} = ${v}`).join(" · ") : "没有标记";
  el.clock.textContent = clockText(s.clock_minutes);
  el.tick.textContent = String(s.tick);
  el.hash.textContent = current.final_hash;
  el.footPack.textContent = current.pack_id;
  el.hint.textContent = s.flags?.["flag.gate.open"] || s.flags?.["flag.vault.open"] || s.flags?.["flag.reactor.open"]
    ? "门已开 · 点击地面走进去 · E/F/T 交互"
    : "WASD 移动 · 点击地面寻路 · 点击实体交互 · E/F/T";
}

function showToast(text, duration = 2600) {
  el.toast.textContent = text;
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), duration);
}

function showDialogue(speaker, text) {
  el.dialogueSpeaker.textContent = speaker;
  el.dialogueText.textContent = text;
  el.dialogue.hidden = false;
  clearTimeout(dialogueTimer);
  dialogueTimer = setTimeout(() => { el.dialogue.hidden = true; }, 5200);
}

function handleEvents(events) {
  for (const event of events) {
    const data = event.data ?? {};
    if (event.kind === "toast") showToast(translate(data.text));
    else if (event.kind === "dialogue_started") showDialogue(nameOf(data.speaker), translate(data.text));
    else if (event.kind === "item_acquired") showToast(`获得 ${nameOf(data.item)} ×${data.count}`);
    else if (event.kind === "quest_completed") showToast("任务完成");
    else if (event.kind === "gate.opened" || event.kind === "vault.opened" || event.kind === "reactor.opened") showToast("门已开启");
  }
}

function updateMove() {
  let x = 0;
  let z = 0;
  if (keys.has("w") || keys.has("arrowup")) z -= 1;
  if (keys.has("s") || keys.has("arrowdown")) z += 1;
  if (keys.has("a") || keys.has("arrowleft")) x -= 1;
  if (keys.has("d") || keys.has("arrowright")) x += 1;
  const len = Math.hypot(x, z);
  if (len > 0) { moving = true; world.set_move(x / len, z / len); }
  else if (moving) { moving = false; world.set_move(0, 0); }
}

function bindInput() {
  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    const key = event.key.toLowerCase();
    if (movingKeys.has(key)) { event.preventDefault(); keys.add(key); updateMove(); return; }
    if (key === "e") nearestAction("interact");
    if (key === "f") nearestAction("pickup");
    if (key === "t") nearestAction("talk");
    if (key === "p") togglePause();
    if (key === "r") resetWorld();
  });
  window.addEventListener("keyup", (event) => {
    if (movingKeys.has(event.key.toLowerCase())) { keys.delete(event.key.toLowerCase()); updateMove(); }
  });
  window.addEventListener("blur", () => { keys.clear(); updateMove(); });
  canvas.addEventListener("pointerdown", (event) => { pointerStart = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;
    const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (moved > 6) return;
    const hit = hitAt(event.clientX, event.clientY);
    if (hit) { actionFor(hit); return; }
    const [x, z] = project.from(event.clientX, event.clientY);
    const bounds = current.zones[zoneId()]?.bounds;
    if (bounds && (x < bounds.min[0] || x > bounds.max[0] || z < bounds.min[2] || z > bounds.max[2])) return;
    try { world.move_to(x, z); showToast(`寻路到 ${x.toFixed(1)}, ${z.toFixed(1)}`); } catch (error) { showToast(String(error)); }
  });
}

function togglePause() {
  paused = !paused;
  el.pause.textContent = paused ? "继续" : "暂停";
}

function resetWorld() {
  world.reset();
  current = JSON.parse(world.state());
  doorAnim.clear();
  updateHud();
  showToast("世界已重置");
}

function bindUi() {
  document.getElementById("btn-interact").addEventListener("click", () => nearestAction("interact"));
  document.getElementById("btn-pickup").addEventListener("click", () => nearestAction("pickup"));
  document.getElementById("btn-talk").addEventListener("click", () => nearestAction("talk"));
  document.getElementById("btn-reset").addEventListener("click", resetWorld);
  el.pause.addEventListener("click", togglePause);
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!paused) {
    acc += dt * 1_000_000;
    while (acc >= TICK_US) { world.tick(TICK_US); acc -= TICK_US; }
  }
  current = JSON.parse(world.state());
  const events = JSON.parse(world.poll_events());
  if (events.length) handleEvents(events);
  drawScene(now / 1000);
  hudTimer += dt;
  if (hudTimer > 0.1) { updateHud(); hudTimer = 0; }
}

async function boot() {
  try {
    el.subtitle.textContent = demo.subtitle;
    document.title = `RefuWorld · ${demo.title} · 2.5D`;
    await init();
    const text = await fetch(`./packs/${demo.pack}`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    });
    pack = JSON.parse(text);
    world = new PreviewWorld(text);
    current = JSON.parse(world.state());
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("refu-theme", (event) => { themeDark = event.detail.dark; buildGround(); });
    bindInput();
    bindUi();
    updateHud();
    el.loading.classList.add("hidden");
    last = performance.now();
    requestAnimationFrame(animate);
  } catch (error) {
    el.loading.innerHTML = `<p>2.5D 场景启动失败：${esc(String(error))}</p><p class="muted">请先运行 ./web/build.sh，并通过本地服务器打开。</p>`;
    console.error(error);
  }
}

boot();
