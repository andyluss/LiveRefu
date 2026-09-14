#!/usr/bin/env node
// sim_refu_game_001 —— Refu Game 001 难度模型模拟脚本（跨运行时 TypeScript：node/deno/bun 直跑）
//
// 用途：把 doc/refu-game-001/21_模拟验算表_章节胜率矩阵.md 的胜率模型从"解析估算"
//       升级为"可复算的蒙特卡洛模拟"，并输出可直接粘贴的 Markdown 表格。
//
// 模型（与 21 号文档同源）：
//   D        = (B' / B_ref) / P'                  // 难度比，B_ref = 158
//   λ_total  = LAMBDA0 * D^GAMMA                  // 全关"漏怪"期望（泊松）
//   每波      = Poisson(λ_total / 波数)            // 波次独立
//   胜利      = 累计漏怪 < LEAK_CAP                // LEAK_CAP = 3（抽象基地生命）
//   解析胜率  = P(Poisson(λ_total) < LEAK_CAP)
//
// 用法：
//   node --experimental-strip-types tools/sim_refu_game_001.ts --run
//   node --experimental-strip-types tools/sim_refu_game_001.ts --selftest
//   node --experimental-strip-types tools/sim_refu_game_001.ts --run --n 20000 --md /tmp/out.md
//   node --experimental-strip-types tools/sim_refu_game_001.ts --stage 218 --p 1.3 --challenge 双流,加压
//
// 参数：--n（每关局数，默认 5000）--seed（默认 20260914）--b-ref（默认 158）
//       --lambda0（默认 1.35）--gamma（默认 3）--cap（默认 3）--sim-ratio（双流同时段占比，默认 0.667）--md（输出文件）

interface Chapter { name: string; P: number; waves: number; alpha: number; B: number[]; band: [number, number]; }
interface Stage { chIndex: number; chapter: string; index: number; B: number; P: number; waves: number; D: number; }
interface Challenge { id: string; name: string; score: number; hpMul: number; playerMul: number; simultaneous: boolean; }

const B_REF_DEFAULT = 158;
const LAMBDA0_DEFAULT = 1.35;
const GAMMA_DEFAULT = 3;
const CAP_DEFAULT = 3;

const CHAPTERS: Chapter[] = [
  { name: "第 1 章", P: 0.6, waves: 6, alpha: 1.0, B: [60, 70, 80, 85, 90], band: [0.8, 1.0] },
  { name: "第 2 章", P: 0.8, waves: 6, alpha: 1.06, B: [115, 120, 125, 130, 135, 140], band: [0.65, 0.8] },
  { name: "第 3 章", P: 1.0, waves: 8, alpha: 1.06, B: [158, 162, 166, 170, 174, 178, 184, 190], band: [0.55, 0.7] },
  { name: "第 4 章", P: 1.2, waves: 10, alpha: 1.0, B: [209, 213, 217, 221, 225, 229, 233, 237, 242, 247], band: [0.45, 0.6] },
  { name: "第 5 章", P: 1.4, waves: 12, alpha: 1.0, B: [265, 269, 273, 277, 281, 285, 289, 293, 297, 301, 306, 310], band: [0.4, 0.55] },
];

const CHALLENGES: Challenge[] = [
  { id: "CHL-01", name: "加压", score: 3, hpMul: 1.3, playerMul: 1.0, simultaneous: false },
  { id: "CHL-02", name: "断供", score: 4, hpMul: 1.0, playerMul: 0.85, simultaneous: false },
  { id: "CHL-03", name: "封锁", score: 3, hpMul: 1.0, playerMul: 0.9, simultaneous: false },
  { id: "CHL-04", name: "双流", score: 5, hpMul: 1.0, playerMul: 1.0, simultaneous: true },
  { id: "CHL-05", name: "疾行", score: 2, hpMul: 1.15, playerMul: 1.05, simultaneous: false },
];

// Roguelike 远征：8 节点（D11）。B_i 由 170.6×(0.9+0.10i) 取整；P 取 1.08（永久修饰的等效战力增长）
const ROGUE_P = 1.08;
interface RogueNode { i: number; B: number; band: [number, number]; }
const ROGUE_NODES: RogueNode[] = Array.from({ length: 8 }, (_, k) => {
  const i = k + 1;
  return { i, B: Math.round(170.6 * (0.9 + 0.1 * i)), band: i <= 2 ? [0.7, 0.9] : i <= 4 ? [0.4, 0.65] : i <= 6 ? [0.12, 0.3] : [0.03, 0.12] };
});

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}
function flag(name: string): boolean { return process.argv.includes("--" + name); }
function num(name: string, fallback: number): number { return Number(arg(name, String(fallback))); }

const RUNS = num("n", 5000);
const SEED = num("seed", 20260914);
const B_REF = num("b-ref", B_REF_DEFAULT);
const LAMBDA0 = num("lambda0", LAMBDA0_DEFAULT);
const GAMMA = num("gamma", GAMMA_DEFAULT);
const CAP = num("cap", CAP_DEFAULT);
const SIM_RATIO = num("sim-ratio", 0.667);

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function poisson(rng: () => number, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}
function poissonBelow(lambda: number, cap: number): number {
  let term = Math.exp(-lambda);
  let sum = term;
  for (let k = 1; k < cap; k++) { term = (term * lambda) / k; sum += term; }
  return sum;
}

// 挑战卡折算：双流仅按"两路同时活跃"的波次占比放大（×1.4 → 有效 ×(1+0.4×ratio)）
function applyChallenges(B: number, P: number, names: string[]): { B: number; P: number; score: number; D: number } {
  let b = B;
  let p = P;
  let score = 0;
  for (const n of names) {
    const c = CHALLENGES.find((x) => x.name === n);
    if (!c) continue;
    score += c.score;
    b *= c.hpMul;
    p *= c.playerMul;
    if (c.simultaneous) b *= 1 + 0.4 * SIM_RATIO;
  }
  return { B: b, P: p, score, D: b / B_REF / p };
}
function simulate(lambdaTotal: number, waves: number, runs: number, seed: number): number {
  const rng = mulberry32(seed);
  let wins = 0;
  for (let r = 0; r < runs; r++) {
    let leaks = 0;
    for (let w = 0; w < waves; w++) leaks += poisson(rng, lambdaTotal / waves);
    if (leaks < CAP) wins++;
  }
  return wins / runs;
}
function stageList(names: string[]): Stage[] {
  const out: Stage[] = [];
  CHAPTERS.forEach((ch, ci) => {
    ch.B.forEach((B, i) => {
      const eff = applyChallenges(B, ch.P, names);
      out.push({ chIndex: ci, chapter: ch.name, index: i + 1, B, P: ch.P, waves: ch.waves, D: eff.D * ch.alpha });
    });
  });
  return out;
}
function seedFor(ci: number, i: number): number { return SEED + ci * 1000 + i; }

function fmt(x: number, d = 2): string { return x.toFixed(d); }
function pct(x: number): string { return (x * 100).toFixed(1) + "%"; }
function verdict(win: number, band: [number, number]): string {
  if (win > band[1]) return "⚠ 偏易";
  if (win < band[0]) return "⚠ 偏难";
  return "✅ 命中";
}
function renderMarkdown(names: string[]): string {
  const stages = stageList(names);
  const lines: string[] = [];
  const title = names.length ? `挑战卡：${names.join(" + ")}` : "无挑战卡（主线）";
  lines.push(`### 实测（脚本）· ${title}`, "");
  lines.push("| 章节 | 关卡 | B | P | D | 解析胜率 | 模拟胜率 | 目标带 | 判定 |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const s of stages) {
    const lambda = LAMBDA0 * Math.pow(s.D, GAMMA);
    const analytics = poissonBelow(lambda, CAP);
    const sim = simulate(lambda, s.waves, RUNS, seedFor(s.chIndex, s.index));
    const band = CHAPTERS[s.chIndex].band;
    lines.push(`| ${s.chapter} | ${s.index} | ${s.B} | ${fmt(s.P)} | ${fmt(s.D)} | ${pct(analytics)} | ${pct(sim)} | ${pct(band[0])}–${pct(band[1])} | ${verdict(sim, band)} |`);
  }
  lines.push("");
  lines.push("| 章节 | α | 平均 D | 解析均值 | 模拟均值 | 目标带 | 判定 |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  CHAPTERS.forEach((ch, ci) => {
    const list = stages.filter((s) => s.chIndex === ci);
    const avgD = list.reduce((a, s) => a + s.D, 0) / list.length;
    const avgA = list.reduce((a, s) => a + poissonBelow(LAMBDA0 * Math.pow(s.D, GAMMA), CAP), 0) / list.length;
    const avgS = list.reduce((a, s) => a + simulate(LAMBDA0 * Math.pow(s.D, GAMMA), s.waves, RUNS, seedFor(ci, s.index)), 0) / list.length;
    lines.push(`| ${ch.name} | ${fmt(ch.alpha)} | ${fmt(avgD)} | ${pct(avgA)} | ${pct(avgS)} | ${pct(ch.band[0])}–${pct(ch.band[1])} | ${verdict(avgS, ch.band)} |`);
  });
  return lines.join("\n");
}

function selftest(): number {
  const failures: string[] = [];
  const a = simulate(1.35, 6, 2000, 42);
  const b = simulate(1.35, 6, 2000, 42);
  if (a !== b) failures.push(`种子不可复现：${a} vs ${b}`);
  const ref = poissonBelow(LAMBDA0 * Math.pow(1, GAMMA), CAP);
  if (!(ref >= 0.82 && ref <= 0.87)) failures.push(`基准关解析胜率越界：${pct(ref)}（期望 82–87%）`);
  const w10 = poissonBelow(LAMBDA0 * Math.pow(1.0, GAMMA), CAP);
  const w12 = poissonBelow(LAMBDA0 * Math.pow(1.2, GAMMA), CAP);
  const w14 = poissonBelow(LAMBDA0 * Math.pow(1.4, GAMMA), CAP);
  if (!(w10 > w12 && w12 > w14)) failures.push("单调性失败：D 升高胜率未下降");
  const big = simulate(LAMBDA0 * Math.pow(1.1, GAMMA), 8, 20000, 7);
  const ana = poissonBelow(LAMBDA0 * Math.pow(1.1, GAMMA), CAP);
  if (Math.abs(big - ana) > 0.015) failures.push(`模拟/解析偏差过大：${pct(big)} vs ${pct(ana)}`);
  console.log("selftest: " + (failures.length ? "FAIL" : "PASS"));
  for (const f of failures) console.log("  - " + f);
  return failures.length ? 1 : 0;
}

function verifyBands(): number {  const stages = stageList([]);
  let bad = 0;
  console.log("band check（章节均值是否落在目标带）:");
  CHAPTERS.forEach((ch, ci) => {
    const list = stages.filter((s) => s.chIndex === ci);
    const avgS = list.reduce((a, s) => a + simulate(LAMBDA0 * Math.pow(s.D, GAMMA), s.waves, RUNS, seedFor(ci, s.index)), 0) / list.length;
    const ok = avgS >= ch.band[0] && avgS <= ch.band[1];
    if (!ok) bad++;
    console.log(`  ${ch.name}: ${pct(avgS)} (目标 ${pct(ch.band[0])}–${pct(ch.band[1])}) ${ok ? "PASS" : "FAIL"}`);
  });
  console.log("band check: " + (bad ? "FAIL" : "PASS"));
  return bad ? 1 : 0;
}

function rogueRows(): { i: number; B: number; D: number; analytic: number; sim: number; band: [number, number] }[] {
  return ROGUE_NODES.map((n) => {
    const D = (n.B / B_REF) / ROGUE_P;
    const lambda = LAMBDA0 * Math.pow(D, GAMMA);
    return { i: n.i, B: n.B, D, analytic: poissonBelow(lambda, CAP), sim: simulate(lambda, 8, RUNS, SEED + 900 + n.i), band: n.band };
  });
}
function renderRogue(): string {
  const rows = rogueRows();
  const lines: string[] = [];
  lines.push("### 远征 8 节点带位（脚本）", "");
  lines.push("| 节点 | B | D | 解析胜率 | 模拟胜率 | 目标带 | 判定 |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const r of rows) lines.push(`| ${r.i}${r.i === 8 ? "（BOSS）" : ""} | ${r.B} | ${fmt(r.D)} | ${pct(r.analytic)} | ${pct(r.sim)} | ${pct(r.band[0])}–${pct(r.band[1])} | ${verdict(r.sim, r.band)} |`);
  return lines.join("\n");
}
function verifyRogue(): number {
  const rows = rogueRows();
  let bad = 0;
  console.log("rogue band check（8 节点，P=" + fmt(ROGUE_P) + "）:");
  for (const r of rows) {
    const ok = r.sim >= r.band[0] && r.sim <= r.band[1];
    if (!ok) bad++;
    console.log(`  节点 ${r.i}: D=${fmt(r.D)} 胜率=${pct(r.sim)} (目标 ${pct(r.band[0])}–${pct(r.band[1])}) ${ok ? "PASS" : "FAIL"}`);
  }
  console.log("rogue band check: " + (bad ? "FAIL" : "PASS"));
  return bad ? 1 : 0;
}

async function main(): Promise<void> {
  if (flag("verify-rogue")) { process.exitCode = verifyRogue(); return; }
  if (flag("rogue")) { console.log("# Refu Game 001 · 远征节点难度（D11）\n"); console.log(renderRogue()); return; }
  if (flag("verify-bands")) { process.exitCode = verifyBands(); return; }
  if (flag("selftest")) { process.exitCode = selftest(); return; }
  if (flag("stage")) {
    const B = num("stage", 158);
    const P = num("p", 1);
    const names = arg("challenge", "").split(",").map((s) => s.trim()).filter(Boolean);
    const eff = applyChallenges(B, P, names);
    const alpha = num("alpha", 1);
    const lambda = LAMBDA0 * Math.pow(eff.D * alpha, GAMMA);
    const analytics = poissonBelow(lambda, CAP);
    const sim = simulate(lambda, 6, RUNS, SEED);
    console.log(`stage: B=${B} P=${P} α=${alpha} 挑战=[${names.join("+") || "无"}] → B'=${fmt(eff.B)} P'=${fmt(eff.P)} D=${fmt(eff.D * alpha)} 难度分=${eff.score}`);
    console.log(`解析胜率=${pct(analytics)} 模拟胜率=${pct(sim)}（N=${RUNS}） 掉落系数=1+0.05×${eff.score}=${fmt(1 + 0.05 * eff.score)}`);
    return;
  }
  const md = renderMarkdown([]);
  console.log("# Refu Game 001 · 难度模拟（主线）\n");
  console.log(md);
  const challengeMd = renderMarkdown(["双流", "加压"]);
  console.log("\n# 挑战关示例（双流 + 加压）\n");
  console.log(challengeMd);
  const out = arg("md", "");
  if (out) {
    const body = "# Refu Game 001 · 难度模拟输出\n\n> 由 `tools/sim_refu_game_001.ts` 生成；参数：n=" + RUNS + " seed=" + SEED + " λ0=" + LAMBDA0 + " γ=" + GAMMA + " cap=" + CAP + "\n\n" + md + "\n\n" + challengeMd + "\n";
    const fs = await import("node:fs");
    fs.writeFileSync(out, body, "utf8");
    console.log("\n[written] " + out);
  }
}

await main();
