import { TetrisGame, COLORS, COLS, ROWS, cellsOf } from "./logic.mjs";
import { AudioEngine } from "./audio.mjs";

const $ = (id) => document.getElementById(id);
const boardCanvas = $("board");
const holdCanvas = $("hold");
const nextCanvas = $("next");
const overlay = $("overlay");
const primary = $("primary");
const secondary = $("secondary");
const ui = {
  score: $("score"), best: $("best"), level: $("level"), lines: $("lines"), time: $("time"),
  combo: $("combo"), b2b: $("b2b"), pps: $("pps"), message: $("message"), status: $("status"), levelMobile: $("level-mobile"), linesMobile: $("lines-mobile"), timeMobile: $("time-mobile"),
  sound: $("sound"), seed: $("seed-label"), live: $("live"), title: $("overlay-title"),
  copy: $("overlay-copy"), kicker: $("overlay-kicker"), shell: $("board-shell"),
};

const CELL = 30;
const HOLD_CELL = 23;
const NEXT_CELL = 21;
const DAS_MS = 150;
const ARR_MS = 35;
const SOFT_REPEAT_MS = 45;

let game;
let seed;
let audio;
let last = performance.now();
let dasDir = 0;
let dasTimer = 0;
let arrTimer = 0;
let softHeld = false;
let softTimer = 0;
let palette;
let lastClearKey = "";
let messageTimer = 0;
let particles = [];
let rowFlashes = [];
let shakeUntil = 0;
let effectsTime = 0;
let bestScore = 0;

function readPalette() {
  const s = getComputedStyle(document.documentElement);
  const get = (name, fallback) => s.getPropertyValue(name).trim() || fallback;
  return {
    board: get("--panel-solid", "#0c1424"),
    ink: get("--ink", "#eff8ff"),
    dim: get("--dim", "#8da6bd"),
    line: get("--line", "rgba(128,211,238,.18)"),
    cyan: get("--cyan", "#5ee7ff"),
    pink: get("--pink", "#ff6d9e"),
    violet: get("--violet", "#9b8cff"),
    amber: get("--amber", "#ffc36a"),
  };
}

function setupCanvas(canvas, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

let boardCtx, holdCtx, nextCtx;

function setupCtx() {
  boardCtx = setupCanvas(boardCanvas, COLS * CELL, ROWS * CELL);
  holdCtx = setupCanvas(holdCanvas, 4 * HOLD_CELL, 4 * HOLD_CELL);
  nextCtx = setupCanvas(nextCanvas, 4 * NEXT_CELL, 5 * 4 * NEXT_CELL);
  palette = readPalette();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawBlock(ctx, px, py, size, color, alpha = 1, ghost = false) {
  const pad = Math.max(1, size * 0.065);
  const x = px + pad, y = py + pad, s = size - pad * 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (ghost) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.globalAlpha = 0.34;
    roundRect(ctx, x, y, s, s, size * 0.16); ctx.stroke();
    ctx.restore(); return;
  }
  const grad = ctx.createLinearGradient(x, y, x + s, y + s);
  grad.addColorStop(0, color);
  grad.addColorStop(1, shade(color, -28));
  ctx.shadowColor = color; ctx.shadowBlur = size * 0.28;
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, s, s, size * 0.16); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x + s * 0.12, y + s * 0.12, s * 0.76, s * 0.12, s * 0.05); ctx.fill();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#000";
  roundRect(ctx, x + s * 0.12, y + s * 0.72, s * 0.76, s * 0.12, s * 0.05); ctx.fill();
  ctx.restore();
}

function shade(hex, delta) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const v = parseInt(n, 16);
  const r = Math.max(0, Math.min(255, ((v >> 16) & 255) + delta));
  const g = Math.max(0, Math.min(255, ((v >> 8) & 255) + delta));
  const b = Math.max(0, Math.min(255, (v & 255) + delta));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawBoard() {
  const w = COLS * CELL, h = ROWS * CELL;
  boardCtx.clearRect(0, 0, w, h);
  const bg = boardCtx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, palette.board);
  bg.addColorStop(1, shade(palette.board, 14));
  boardCtx.fillStyle = bg; boardCtx.fillRect(0, 0, w, h);
  boardCtx.strokeStyle = palette.line; boardCtx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) { boardCtx.beginPath(); boardCtx.moveTo(x * CELL, 0); boardCtx.lineTo(x * CELL, h); boardCtx.stroke(); }
  for (let y = 1; y < ROWS; y++) { boardCtx.beginPath(); boardCtx.moveTo(0, y * CELL); boardCtx.lineTo(w, y * CELL); boardCtx.stroke(); }

  if (!game || game.state === "menu") return;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const type = game.board[y][x];
    if (type) drawBlock(boardCtx, x * CELL, y * CELL, CELL, COLORS[type], 1);
  }
  if (game.state === "playing" || game.state === "paused") {
    for (const [x, y] of game.ghostCells()) if (y >= 0) drawBlock(boardCtx, x * CELL, y * CELL, CELL, COLORS[game.current.type], 1, true);
    if (game.current) for (const [x, y] of game.cells()) if (y >= 0) drawBlock(boardCtx, x * CELL, y * CELL, CELL, COLORS[game.current.type], 1);
  }

  for (const flash of rowFlashes) {
    const alpha = Math.max(0, flash.life / 280);
    boardCtx.save();
    boardCtx.globalAlpha = alpha * 0.8;
    boardCtx.fillStyle = flash.color;
    boardCtx.shadowColor = flash.color; boardCtx.shadowBlur = 28;
    boardCtx.fillRect(0, flash.row * CELL, w, CELL);
    boardCtx.restore();
  }
  for (const p of particles) {
    const a = Math.max(0, p.life / p.total);
    boardCtx.save(); boardCtx.globalAlpha = a; boardCtx.fillStyle = p.color;
    boardCtx.shadowColor = p.color; boardCtx.shadowBlur = 10;
    boardCtx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    boardCtx.restore();
  }
}

function drawPreview(ctx, type, w, h, cellSize, center = true) {
  ctx.clearRect(0, 0, w, h);
  if (!type) return;
  const cells = cellsOf({ type, rot: 0, x: 0, y: 0 });
  const xs = cells.map(([x]) => x), ys = cells.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const bw = (maxX - minX + 1) * cellSize, bh = (maxY - minY + 1) * cellSize;
  const ox = (w - bw) / 2 - minX * cellSize, oy = (h - bh) / 2 - minY * cellSize;
  for (const [x, y] of cells) drawBlock(ctx, ox + x * cellSize, oy + y * cellSize, cellSize, COLORS[type], 1);
}

function drawSidePanels() {
  drawPreview(holdCtx, game?.hold, 4 * HOLD_CELL, 4 * HOLD_CELL, HOLD_CELL);
  nextCtx.clearRect(0, 0, 4 * NEXT_CELL, 5 * 4 * NEXT_CELL);
  const queue = game?.nextQueue ?? [];
  queue.forEach((type, i) => {
    const y = i * 4 * NEXT_CELL;
    drawPreviewAt(nextCtx, type, y, 4 * NEXT_CELL, 4 * NEXT_CELL, NEXT_CELL);
  });
}
function drawPreviewAt(ctx, type, y, w, h, cellSize) {
  if (!type) return;
  const cells = cellsOf({ type, rot: 0, x: 0, y: 0 });
  const xs = cells.map(([x]) => x), ys = cells.map(([, y2]) => y2);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const bw = (maxX - minX + 1) * cellSize, bh = (maxY - minY + 1) * cellSize;
  const ox = (w - bw) / 2 - minX * cellSize, oy = y + (h - bh) / 2 - minY * cellSize;
  for (const [x, y2] of cells) drawBlock(ctx, ox + x * cellSize, oy + y2 * cellSize, cellSize, COLORS[type], .9);
}

function format(n) { return Number(n || 0).toLocaleString("en-US"); }
function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function setMessage(text, hold = 1800) { ui.message.textContent = text; messageTimer = hold; }
function announce(text) { ui.live.textContent = text; }

function updateHud() {
  if (!game) return;
  ui.score.textContent = format(game.score);
  ui.level.textContent = String(game.level).padStart(2, "0");
  ui.lines.textContent = String(game.lines);
  ui.levelMobile.textContent = String(game.level).padStart(2, "0");
  ui.linesMobile.textContent = String(game.lines);
  ui.combo.textContent = game.combo > 0 ? `×${game.combo}` : "—";
  ui.b2b.textContent = game.b2b > 1 ? `×${game.b2b}` : "—";
  const elapsed = game.state === "playing" ? (game.elapsedMs / 1000) : (game.elapsedMs / 1000);
  ui.time.textContent = clock(elapsed);
  ui.timeMobile.textContent = clock(elapsed);
  ui.pps.textContent = elapsed > 0.5 ? (game.pieces / elapsed).toFixed(1) : "0.0";
  ui.status.textContent = game.state === "menu" ? "READY" : game.state === "playing" ? "LIVE" : game.state === "paused" ? "PAUSED" : "OVER";
  if (game.state === "over" || game.state === "playing") {
    if (game.score > bestScore) { bestScore = game.score; try { localStorage.setItem("neon-drift-best", String(bestScore)); } catch {} }
  }
  ui.best.textContent = format(bestScore);
}

function showOverlay(kind) {
  overlay.hidden = false;
  secondary.hidden = true;
  if (kind === "menu") {
    ui.kicker.textContent = "REFUWORLD LAB / 001";
    ui.title.innerHTML = "NEON<br><em>DRIFT</em>";
    ui.copy.textContent = "稳住。清行。让霓虹继续下落。";
    primary.textContent = "开始游戏"; primary.innerHTML = '开始游戏 <kbd>↵</kbd>';
    secondary.hidden = true;
  } else if (kind === "paused") {
    ui.kicker.textContent = "PAUSED / SIGNAL HELD";
    ui.title.innerHTML = "HOLD<br><em>THE LINE</em>";
    ui.copy.textContent = "世界暂停了，但霓虹不会自己消失。";
    primary.textContent = "继续";
    secondary.textContent = "重新开始"; secondary.hidden = false;
  } else if (kind === "over") {
    ui.kicker.textContent = "RUN ENDED / SIGNAL LOST";
    ui.title.innerHTML = "GAME<br><em>OVER</em>";
    ui.copy.textContent = `得分 ${format(game.score)} · ${game.lines} 行 · ${clock(game.elapsedMs / 1000)}。再来一次？`;
    primary.textContent = "再来一局";
    secondary.textContent = "回到封面"; secondary.hidden = false;
  }
}
function hideOverlay() { overlay.hidden = true; }

function startGame() {
  game.start(seed);
  lastClearKey = "";
  particles = []; rowFlashes = [];
  hideOverlay();
  ui.message.textContent = "SRS · HOLD · T-SPIN · B2B";
  announce("游戏开始");
  audio?.level();
}
function resumeGame() { if (game.state === "paused") { game.pause(); hideOverlay(); } }
function pauseGame() {
  if (game.state === "playing") { game.pause(); showOverlay("paused"); announce("已暂停"); }
  else if (game.state === "paused") { game.pause(); hideOverlay(); announce("继续"); }
}
function restart() { startGame(); }
function menu() { game.reset(); showOverlay("menu"); updateHud(); drawBoard(); drawSidePanels(); }

function handleClear() {
  if (!game) return;
  const lc = game.lastClear;
  const key = `${game.pieces}:${lc.count}:${lc.points}:${lc.tspin}`;
  if (key === lastClearKey) return;
  lastClearKey = key;
  if (!lc.count) return;
  const color = lc.tspin ? palette.violet : lc.count === 4 ? palette.cyan : palette.amber;
  for (const row of lc.rows) {
    rowFlashes.push({ row, life: 280, color });
    for (let i = 0; i < 5; i++) particles.push({ x: Math.random() * COLS * CELL, y: row * CELL + CELL / 2, vx: (Math.random() - .5) * .18, vy: -.08 - Math.random() * .14, size: 2 + Math.random() * 4, life: 500 + Math.random() * 400, total: 800, color });
  }
  if (lc.tspin) { setMessage(`T-SPIN ×${lc.count}  +${format(lc.points)}`, 2200); audio?.tspin(); announce("T-Spin"); }
  else if (lc.count === 4) { setMessage(`TETRIS  +${format(lc.points)}`, 2200); audio?.tetris(); }
  else { setMessage(`${lc.count === 3 ? "TRIPLE" : lc.count === 2 ? "DOUBLE" : "SINGLE"}  +${format(lc.points)}`, 1600); audio?.clear(lc.count); }
  if (lc.perfect) { setMessage(`PERFECT CLEAR  +${format(lc.points)}`, 2600); }
  if (lc.levelUp) { setMessage(`LEVEL ${String(game.level).padStart(2, "0")}  SPEED UP`, 1800); audio?.level(); }
  if (lc.count >= 3) { ui.shell.classList.remove("shake"); void ui.shell.offsetWidth; ui.shell.classList.add("shake"); shakeUntil = performance.now() + 260; }
}
function syncState() {
  if (!game) return;
  if (game.state === "over" && overlay.hidden) { showOverlay("over"); audio?.gameover(); announce("游戏结束"); }
  if (game.state === "paused" && overlay.hidden) showOverlay("paused");
}

function action(name) {
  if (!game || game.state !== "playing") return;
  if (name === "left") { if (game.move(-1)) audio?.move(); }
  if (name === "right") { if (game.move(1)) audio?.move(); }
  if (name === "rotate") { if (game.rotate(1)) audio?.rotate(); }
  if (name === "down") { if (game.softDrop()) audio?.drop(); }
  if (name === "hold") { if (game.holdPiece()) audio?.rotate(); }
  if (name === "drop") { const d = game.hardDrop(); if (d) audio?.drop(); audio?.lock(); }
  updateHud(); drawSidePanels();
}

function inputLoop(dt) {
  if (!game || game.state !== "playing") return;
  if (dasDir) {
    dasTimer += dt;
    if (dasTimer >= DAS_MS) {
      arrTimer += dt;
      while (arrTimer >= ARR_MS) { arrTimer -= ARR_MS; if (game.move(dasDir)) audio?.move(); }
    }
  }
  if (softHeld) {
    softTimer += dt;
    while (softTimer >= SOFT_REPEAT_MS) { softTimer -= SOFT_REPEAT_MS; if (game.softDrop()) audio?.drop(); }
  }
}

function keyDown(e) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  const k = e.key;
  if (k === "Enter" && !overlay.hidden) { e.preventDefault(); primary.click(); return; }
  if (k === "r" || k === "R") { e.preventDefault(); restart(); return; }
  if (k === "p" || k === "P" || k === "Escape") { e.preventDefault(); pauseGame(); return; }
  if (overlay.hidden === false) return;
  if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(k) || ["z", "Z", "x", "X", "c", "C"].includes(k)) e.preventDefault();
  if (k === "ArrowLeft") { if (dasDir !== -1) { dasDir = -1; dasTimer = 0; arrTimer = 0; if (game.move(-1)) audio?.move(); } return; }
  if (k === "ArrowRight") { if (dasDir !== 1) { dasDir = 1; dasTimer = 0; arrTimer = 0; if (game.move(1)) audio?.move(); } return; }
  if (k === "ArrowDown") { softHeld = true; softTimer = 0; if (game.softDrop()) audio?.drop(); return; }
  if (k === "z" || k === "Z") { if (game.rotate(-1)) audio?.rotate(); updateHud(); return; }
  if (k === "x" || k === "X" || k === "ArrowUp") { if (game.rotate(1)) audio?.rotate(); updateHud(); return; }
  if (k === "c" || k === "C") { if (game.holdPiece()) audio?.rotate(); updateHud(); drawSidePanels(); return; }
  if (k === " ") { const d = game.hardDrop(); if (d) audio?.drop(); audio?.lock(); updateHud(); }
}
function keyUp(e) {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") { dasDir = 0; dasTimer = 0; arrTimer = 0; }
  if (e.key === "ArrowDown") softHeld = false;
}

function bindTouch() {
  const buttons = document.querySelectorAll("[data-action]");
  for (const btn of buttons) {
    let repeat = null;
    const start = (e) => {
      e.preventDefault();
      const a = btn.dataset.action;
      action(a);
      if (["left", "right", "down"].includes(a)) {
        const delay = a === "down" ? 120 : 180;
        repeat = setTimeout(() => {
          repeat = setInterval(() => action(a), a === "down" ? 45 : 48);
        }, delay);
      }
    };
    const stop = () => { if (repeat) { clearTimeout(repeat); clearInterval(repeat); repeat = null; } };
    btn.addEventListener("pointerdown", start);
    btn.addEventListener("pointerup", stop);
    btn.addEventListener("pointercancel", stop);
    btn.addEventListener("pointerleave", stop);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(now - last, 50); last = now;
  effectsTime += dt;
  if (game && game.state === "playing") { game.update(dt); inputLoop(dt); }
  handleClear(); syncState(); updateHud();
  rowFlashes = rowFlashes.filter((f) => (f.life -= dt) > 0);
  for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.00035 * dt; }
  particles = particles.filter((p) => p.life > 0);
  drawBoard(); drawSidePanels();
  if (messageTimer > 0) { messageTimer -= dt; if (messageTimer <= 0 && game) ui.message.textContent = game.state === "playing" ? "SRS · HOLD · T-SPIN · B2B" : ""; }
  if (shakeUntil && now > shakeUntil) { ui.shell.classList.remove("shake"); shakeUntil = 0; }
}

function setupTheme() {
  document.querySelectorAll("[data-theme-choice]").forEach((b) => {
    b.addEventListener("click", () => {
      const mode = b.dataset.themeChoice;
      const dark = mode === "dark" || (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.dataset.themeMode = mode;
      try { localStorage.setItem("lrds-theme", mode); } catch {}
      document.querySelectorAll("[data-theme-choice]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.themeChoice === mode)));
      const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = dark ? "#070a12" : "#f3eee4";
      palette = readPalette(); drawBoard(); drawSidePanels();
    });
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (document.documentElement.dataset.themeMode === "system") {
      const dark = matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      palette = readPalette(); drawBoard(); drawSidePanels();
    }
  });
}

function setupAudio() {
  audio = new AudioEngine();
  ui.sound.addEventListener("click", async () => {
    const on = ui.sound.getAttribute("aria-pressed") !== "true";
    if (on) await audio.enable(); else audio.disable();
    ui.sound.setAttribute("aria-pressed", String(on));
    ui.sound.textContent = on ? "声音：开" : "声音：关";
  });
}

function boot() {
  setupCtx(); setupTheme(); setupAudio(); bindTouch();
  const stored = Number(localStorage.getItem("neon-drift-best") || 0);
  bestScore = Number.isFinite(stored) ? stored : 0;
  seed = (crypto.getRandomValues(new Uint32Array(1))[0] >>> 0);
  ui.seed.textContent = `SEED ${seed.toString(16).toUpperCase().padStart(8, "0")}`;
  game = new TetrisGame({ seed });
  game.reset();
  showOverlay("menu");
  updateHud(); drawBoard(); drawSidePanels();
  primary.addEventListener("click", () => {
    if (game.state === "paused") resumeGame();
    else startGame();
  });
  secondary.addEventListener("click", () => {
    if (game.state === "paused") restart(); else menu();
  });
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", () => { if (game.state === "playing") { game.pause(); showOverlay("paused"); } });
  document.addEventListener("visibilitychange", () => { if (document.hidden && game.state === "playing") { game.pause(); showOverlay("paused"); } });
  window.addEventListener("resize", () => { palette = readPalette(); });
  requestAnimationFrame(frame);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}
boot();
