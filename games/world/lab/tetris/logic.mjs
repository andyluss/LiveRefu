// NEON DRIFT · pure deterministic falling-block game logic.
// No DOM, no timers, no external dependencies. The UI owns animation/time.

export const COLS = 10;
export const ROWS = 20;
export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;

const SHAPES = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  J: [
    [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]],
  ],
  L: [
    [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
    [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  O: [
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  ],
  S: [
    [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
    [[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]],
    [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  T: [
    [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  Z: [
    [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]],
  ],
};

export const TYPES = Object.keys(SHAPES);
export const COLORS = {
  I: "#5ee7ff", J: "#6b8cff", L: "#ffb45e", O: "#ffe36e",
  S: "#7ded9b", T: "#d38bff", Z: "#ff6d8f",
};

// SRS kick offsets, expressed in board coordinates (y grows downward).
const JLSTZ_KICKS = {
  "0>1": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "1>0": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  "1>2": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  "2>1": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "2>3": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  "3>2": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "3>0": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "0>3": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
};
const I_KICKS = {
  "0>1": [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  "1>0": [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  "1>2": [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  "2>1": [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  "2>3": [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  "3>2": [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  "3>0": [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  "0>3": [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
};

export class Rng {
  constructor(seed = 0x9e3779b9) { this.state = seed >>> 0; }
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n) { return Math.floor(this.next() * n); }
}

export class PieceBag {
  constructor(rng = new Rng()) { this.rng = rng; this.bag = []; this.refill(); }
  refill() {
    const bag = [...TYPES];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    this.bag = bag;
  }
  take() {
    if (this.bag.length === 0) this.refill();
    return this.bag.pop();
  }
}

export function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function cellsOf(piece) {
  const out = [];
  const state = SHAPES[piece.type][piece.rot];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    if (state[y][x]) out.push([piece.x + x, piece.y + y]);
  }
  return out;
}

export function spawnPiece(type) {
  return { type, rot: 0, x: type === "I" ? 3 : 3, y: type === "O" ? 0 : -1 };
}

export class TetrisGame {
  constructor({ seed = Date.now() >>> 0, rng } = {}) {
    this.rng = rng ?? new Rng(seed);
    this.seed = seed;
    this.reset();
  }

  reset() {
    this.board = emptyBoard();
    this.state = "menu";
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.b2b = 0;
    this.current = null;
    this.hold = null;
    this.canHold = true;
    this.nextQueue = [];
    this.gravityAcc = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.lastAction = null;
    this.lastKick = 0;
    this.lastClear = { rows: [], count: 0, tspin: false, perfect: false, b2b: false, points: 0 };
    this.pieces = 0;
    this.startedAt = 0;
    this.elapsedMs = 0;
    this.bag = new PieceBag(this.rng);
    this.queue = [];
    this.refillQueue();
  }

  start(seed = this.seed) {
    this.rng = new Rng(seed);
    this.seed = seed;
    this.reset();
    this.state = "playing";
    this.startedAt = Date.now();
    this.spawn();
    return this;
  }

  refillQueue() {
    while (this.queue.length < 6) this.queue.push(this.bag.take());
    this.nextQueue = this.queue.slice(0, 5);
  }
  takeNext() {
    const type = this.queue.shift() ?? this.bag.take();
    this.refillQueue();
    return type;
  }

  spawn(type = this.takeNext()) {
    const piece = spawnPiece(type);
    if (this.collides(piece)) {
      this.current = piece;
      this.state = "over";
      this.gameOver = true;
      return false;
    }
    this.current = piece;
    this.gravityAcc = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.lastAction = "spawn";
    this.lastKick = 0;
    this.pieces++;
    return true;
  }

  collides(piece) {
    for (const [x, y] of cellsOf(piece)) {
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && this.board[y][x]) return true;
    }
    return false;
  }

  grounded(piece = this.current) {
    if (!piece) return false;
    return this.collides({ ...piece, y: piece.y + 1 });
  }

  move(dx) {
    if (this.state !== "playing" || !this.current) return false;
    const next = { ...this.current, x: this.current.x + dx };
    if (this.collides(next)) return false;
    this.current = next;
    this.lastAction = "move";
    this.resetLockIfGrounded();
    return true;
  }

  rotate(dir = 1) {
    if (this.state !== "playing" || !this.current) return false;
    const from = this.current.rot;
    const to = (from + dir + 4) % 4;
    const kicks = this.current.type === "I" ? I_KICKS : JLSTZ_KICKS;
    const offsets = kicks[`${from}>${to}`] ?? [[0, 0]];
    for (const [kx, ky] of offsets) {
      const candidate = { ...this.current, rot: to, x: this.current.x + kx, y: this.current.y + ky };
      if (!this.collides(candidate)) {
        this.current = candidate;
        this.lastAction = "rotate";
        this.lastKick = Math.max(0, offsets.indexOf([kx, ky]));
        this.resetLockIfGrounded();
        return true;
      }
    }
    return false;
  }

  resetLockIfGrounded() {
    if (this.grounded() && this.lockResets < MAX_LOCK_RESETS) {
      this.lockTimer = 0;
      this.lockResets++;
    }
  }

  softDrop() {
    if (this.state !== "playing" || !this.current) return false;
    const next = { ...this.current, y: this.current.y + 1 };
    if (!this.collides(next)) {
      this.current = next;
      this.score += 1;
      this.lastAction = "drop";
      this.lockTimer = 0;
      return true;
    }
    return false;
  }

  hardDrop() {
    if (this.state !== "playing" || !this.current) return 0;
    let distance = 0;
    while (!this.collides({ ...this.current, y: this.current.y + 1 })) {
      this.current.y++;
      distance++;
    }
    this.score += distance * 2;
    this.lastAction = "harddrop";
    this.lock();
    return distance;
  }

  holdPiece() {
    if (this.state !== "playing" || !this.current || !this.canHold) return false;
    const currentType = this.current.type;
    if (this.hold) {
      const swap = this.hold;
      this.hold = currentType;
      this.canHold = false;
      this.spawn(swap);
    } else {
      this.hold = currentType;
      this.canHold = false;
      this.spawn();
    }
    return true;
  }

  gravityInterval() {
    const table = [800, 717, 633, 550, 467, 383, 300, 217, 133, 100, 83, 83, 83, 67, 67, 67, 50, 50, 50, 33];
    return table[Math.min(this.level - 1, table.length - 1)];
  }

  update(dt) {
    if (this.state !== "playing" || !this.current) return;
    this.elapsedMs += dt;
    if (this.grounded()) {
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY_MS) this.lock();
      return;
    }
    this.lockTimer = 0;
    this.gravityAcc += dt;
    const interval = this.gravityInterval();
    while (this.gravityAcc >= interval) {
      this.gravityAcc -= interval;
      const next = { ...this.current, y: this.current.y + 1 };
      if (!this.collides(next)) {
        this.current = next;
        this.lastAction = "gravity";
      } else break;
    }
  }

  tspin() {
    if (!this.current || this.current.type !== "T" || this.lastAction !== "rotate") return false;
    const centerX = this.current.x + 1;
    const centerY = this.current.y + 1;
    let corners = 0;
    for (const [dx, dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
      const x = centerX + dx, y = centerY + dy;
      if (x < 0 || x >= COLS || y >= ROWS || (y >= 0 && this.board[y][x])) corners++;
    }
    return corners >= 3;
  }

  lock() {
    if (!this.current) return;
    const isT = this.tspin();
    let topOut = false;
    for (const [x, y] of cellsOf(this.current)) {
      if (y < 0) { topOut = true; continue; }
      if (y < ROWS && x >= 0 && x < COLS) this.board[y][x] = this.current.type;
    }
    const cleared = this.clearLines();
    this.applyScore(cleared.length, isT);
    this.lastClear.rows = cleared;
    this.current = null;
    this.canHold = true;
    if (topOut) {
      this.state = "over";
      this.gameOver = true;
      return;
    }
    this.spawn();
  }

  clearLines() {
    const rows = [];
    for (let y = 0; y < ROWS; y++) {
      if (this.board[y].every(Boolean)) rows.push(y);
    }
    if (!rows.length) return rows;
    const kept = this.board.filter((_, y) => !rows.includes(y));
    while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
    this.board = kept;
    return rows;
  }

  applyScore(count, isT) {
    let points = 0;
    let difficult = false;
    if (count > 0) {
      const base = [0, 100, 300, 500, 800][count] * this.level;
      const tspinBase = [0, 800, 1200, 1600][count] * this.level;
      points = isT ? tspinBase : base;
      difficult = count === 4 || isT;
      if (difficult && this.b2b > 0) points = Math.floor(points * 1.5);
      this.combo++;
      if (this.combo > 0) points += 50 * this.combo * this.level;
      this.b2b = difficult ? this.b2b + 1 : 0;
      this.lines += count;
      const oldLevel = this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.lastClear = { rows: [], count, tspin: isT, perfect: false, b2b: difficult && this.b2b > 1, points, levelUp: this.level > oldLevel };
    } else {
      this.combo = -1;
      this.b2b = 0;
      this.lastClear = { rows: [], count: 0, tspin: false, perfect: false, b2b: false, points: 0 };
    }
    if (count > 0 && this.board.every((row) => row.every((c) => !c))) {
      points += 2000 * this.level;
      this.lastClear.perfect = true;
    }
    this.score += points;
    this.lastClear.points = points;
    return points;
  }

  ghost() {
    if (!this.current) return null;
    let y = this.current.y;
    while (!this.collides({ ...this.current, y: y + 1 })) y++;
    return { ...this.current, y };
  }

  cells(piece = this.current) { return piece ? cellsOf(piece) : []; }
  ghostCells() { const ghost = this.ghost(); return ghost ? cellsOf(ghost) : []; }

  pause() { if (this.state === "playing") { this.state = "paused"; return true; } if (this.state === "paused") { this.state = "playing"; return true; } return false; }
}
