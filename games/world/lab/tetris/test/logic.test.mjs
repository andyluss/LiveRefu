import assert from "node:assert/strict";
import { PieceBag, Rng, TetrisGame, TYPES, cellsOf, emptyBoard, COLS, ROWS } from "../logic.mjs";

let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

test("7-bag contains each tetromino exactly once per seven", () => {
  const bag = new PieceBag(new Rng(42));
  const seen = [];
  for (let i = 0; i < 7; i++) seen.push(bag.take());
  assert.deepEqual([...seen].sort(), [...TYPES].sort());
  assert.equal(new Set(seen).size, 7);
});

test("seeded RNG is deterministic", () => {
  const a = new Rng(7); const b = new Rng(7);
  for (let i = 0; i < 20; i++) assert.equal(a.next(), b.next());
});

test("piece has four cells and spawn queue has five previews", () => {
  const game = new TetrisGame({ seed: 1 }).start(1);
  assert.equal(cellsOf(game.current).length, 4);
  assert.equal(game.nextQueue.length, 5);
  assert.equal(game.board.length, ROWS);
  assert.equal(game.board[0].length, COLS);
});

test("line clear removes a full row and keeps board height", () => {
  const game = new TetrisGame({ seed: 1 });
  game.board = emptyBoard();
  game.board[ROWS - 1] = Array(COLS).fill("I");
  game.board[ROWS - 2][0] = "T";
  const rows = game.clearLines();
  assert.deepEqual(rows, [ROWS - 1]);
  assert.equal(game.board.length, ROWS);
  assert.equal(game.board[ROWS - 1][0], "T");
  assert.equal(game.board[ROWS - 1][1], null);
});

test("hard drop locks and scores", () => {
  const game = new TetrisGame({ seed: 1 }).start(1);
  game.current = { type: "O", rot: 0, x: 4, y: 0 };
  const distance = game.hardDrop();
  assert.ok(distance >= 0);
  assert.ok(game.score >= distance * 2);
  assert.ok(game.board.some((row) => row.some(Boolean)));
});

test("hold swaps once and resets after lock", () => {
  const game = new TetrisGame({ seed: 1 }).start(1);
  const first = game.current.type;
  assert.equal(game.holdPiece(), true);
  assert.equal(game.hold, first);
  assert.equal(game.canHold, false);
  assert.equal(game.holdPiece(), false);
});

test("pause toggles only playing/paused", () => {
  const game = new TetrisGame({ seed: 1 }).start(1);
  assert.equal(game.pause(), true);
  assert.equal(game.state, "paused");
  assert.equal(game.pause(), true);
  assert.equal(game.state, "playing");
});

test("gravity moves a piece down over time", () => {
  const game = new TetrisGame({ seed: 1 }).start(1);
  game.current = { type: "O", rot: 0, x: 4, y: 0 };
  const y = game.current.y;
  game.update(1000);
  assert.ok(game.current.y > y);
});

test("T-spin detection requires T, last rotation and 3 corners", () => {
  const game = new TetrisGame({ seed: 1 }).start(1);
  game.board = emptyBoard();
  for (const [x, y] of [[3,0],[5,0],[3,2],[5,2]]) game.board[y][x] = "I";
  game.current = { type: "T", rot: 1, x: 3, y: 0 };
  game.lastAction = "rotate";
  assert.equal(game.tspin(), true);
  game.lastAction = "move";
  assert.equal(game.tspin(), false);
});

test("top out ends the game", () => {
  const game = new TetrisGame({ seed: 1 });
  game.state = "playing";
  game.board = emptyBoard();
  for (let y = 0; y < 4; y++) for (let x = 0; x < COLS; x++) game.board[y][x] = "I";
  game.spawn("O");
  assert.equal(game.state, "over");
});

console.log(`\nlogic PASS: ${passed} tests`);
