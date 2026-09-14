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

// 族专属挑战卡（25 号文档）：按"战力折损"折算，分数越高折损越大；band = 允许的胜率跌幅（百分点）
interface FactionCard { id: string; name: string; faction: string; score: number; playerMul: number; playerMulPure: number; pureDeck: string; band: [number, number]; }
const FACTION_CHALLENGES: FactionCard[] = [
  { id: "ANV-CHL-01", name: "弹药禁令", faction: "铁砧", score: 3, playerMul: 0.92, playerMulPure: 0.85, pureDeck: "纯弹药卡组", band: [0.12, 0.25] },
  { id: "ANV-CHL-02", name: "工事超载", faction: "铁砧", score: 2, playerMul: 0.96, playerMulPure: 0.9, pureDeck: "纯工事卡组", band: [0.05, 0.12] },
  { id: "ANV-CHL-03", name: "补给短缺", faction: "铁砧", score: 3, playerMul: 0.93, playerMulPure: 0.88, pureDeck: "资源重卡组", band: [0.12, 0.25] },
  { id: "TID-CHL-01", name: "腐蚀逆流", faction: "涌潮", score: 3, playerMul: 0.92, playerMulPure: 0.85, pureDeck: "纯腐蚀卡组", band: [0.12, 0.25] },
  { id: "TID-CHL-02", name: "孵化抑制", faction: "涌潮", score: 2, playerMul: 0.96, playerMulPure: 0.91, pureDeck: "纯孵化卡组", band: [0.05, 0.12] },
  { id: "TID-CHL-03", name: "巢群饥荒", faction: "涌潮", score: 3, playerMul: 0.93, playerMulPure: 0.89, pureDeck: "纯召唤卡组", band: [0.12, 0.25] },
  { id: "AST-CHL-01", name: "共鸣干扰", faction: "星辉", score: 3, playerMul: 0.93, playerMulPure: 0.85, pureDeck: "纯共鸣卡组", band: [0.12, 0.25] },
  { id: "AST-CHL-02", name: "护盾过载", faction: "星辉", score: 2, playerMul: 0.96, playerMulPure: 0.92, pureDeck: "纯护盾卡组", band: [0.05, 0.12] },
  { id: "AST-CHL-03", name: "能量税", faction: "星辉", score: 3, playerMul: 0.93, playerMulPure: 0.88, pureDeck: "技能重卡组", band: [0.12, 0.25] },
];
const FACTION_BASE_B = 205;
const FACTION_BASE_P = 1.08;
const FACTION_PURE_CEILING = 0.35; // 纯流派卡组的最大跌幅（超过即视为"一张卡杀死一套牌"）

// 对空 9 宫格：三档空袭预算 × 三族（AA 适配系数体现各族对空质量差异）
const AIR_WAVE_B = [120, 180, 240];
const FACTION_AA: { faction: string; factor: number }[] = [
  { faction: "铁砧", factor: 1.0 },
  { faction: "涌潮", factor: 0.97 },
  { faction: "星辉", factor: 1.03 },
];
const AIR_FAIRNESS_PP = 0.15; // 同一空袭档位内，三族胜率极差上限

// 空地混编三形态（airShare = 空中单位占比）与验收阈值
const AIR_MIX = [
  { name: "纯空军", share: 1.0, spreadMax: 0.15 },
  { name: "混编", share: 0.6, spreadMax: 0.12 },
  { name: "纯地面", share: 0.0, spreadMax: 0.05 },
];
const AIR_MIX_B = 180;

// 远征永久修饰卡（PMOD，23 号文档）：正收益双口径（平均卡组 / 契合流派）
interface Pmod { id: string; name: string; playerMul: number; playerMulPure: number; pureDeck: string; band: [number, number]; }
const PMODS: Pmod[] = [
  { id: "PMOD-01", name: "加压涂层", playerMul: 1.06, playerMulPure: 1.1, pureDeck: "纯弹药卡组", band: [0.06, 0.12] },
  { id: "PMOD-02", name: "扩建基座", playerMul: 1.05, playerMulPure: 1.08, pureDeck: "多塔卡组", band: [0.06, 0.12] },
  { id: "PMOD-03", name: "备用电源", playerMul: 1.04, playerMulPure: 1.07, pureDeck: "能量重卡组", band: [0.06, 0.12] },
  { id: "PMOD-04", name: "首放免费", playerMul: 1.05, playerMulPure: 1.09, pureDeck: "低费卡组", band: [0.06, 0.12] },
  { id: "PMOD-05", name: "羁绊加速", playerMul: 1.06, playerMulPure: 1.11, pureDeck: "纯标签卡组", band: [0.06, 0.12] },
];
const PMOD_BASE_B = 205;
const PMOD_BASE_P = 1.08;
const PMOD_PURE_CEILING = 0.2;

// 对空覆盖：每族卡池中"可攻击空中单位"的卡（用于 verifyAntiAir）
interface AirCard { id: string; name: string; faction: string; kind: "塔" | "单位" | "技能"; air: boolean; }
const AIR_CARDS: AirCard[] = [
  { id: "ANV-T01", name: "模块炮塔", faction: "铁砧", kind: "塔", air: true },
  { id: "ANV-T02", name: "交叉火力网", faction: "铁砧", kind: "塔", air: true },
  { id: "ANV-T03", name: "磁轨钉枪", faction: "铁砧", kind: "塔", air: false },
  { id: "ANV-T04", name: "路障工事", faction: "铁砧", kind: "塔", air: false },
  { id: "TID-T01", name: "孵化巢", faction: "涌潮", kind: "塔", air: true },
  { id: "TID-T02", name: "腐蚀喷口", faction: "涌潮", kind: "塔", air: false },
  { id: "TID-T03", name: "酸液喷射者", faction: "涌潮", kind: "塔", air: true },
  { id: "TID-T04", name: "群落粘网", faction: "涌潮", kind: "塔", air: false },
  { id: "AST-T01", name: "棱镜哨塔", faction: "星辉", kind: "塔", air: true },
  { id: "AST-T02", name: "共鸣方尖碑", faction: "星辉", kind: "塔", air: false },
  { id: "AST-T03", name: "相位炮台", faction: "星辉", kind: "塔", air: true },
  { id: "AST-T04", name: "棱光屏障", faction: "星辉", kind: "塔", air: false },
];

// 远征抽取池（24 号文档）与排行榜比较器（26 号验收用例）
const MAP_POOL: { id: string; weight: number; single: boolean }[] = [
  { id: "MAP-ANV-01", weight: 25, single: true },
  { id: "MAP-ANV-02", weight: 12, single: false },
  { id: "MAP-TID-01", weight: 20, single: false },
  { id: "MAP-AST-01", weight: 18, single: true },
  { id: "MAP-AST-02", weight: 10, single: false },
  { id: "MAP-MULTI-01", weight: 15, single: false },
];
function drawRun(seed: number): string[] {
  const rng = mulberry32(seed);
  const pool = MAP_POOL.slice();
  const picked: string[] = [];
  // 节点 1：只抽单入口图
  const singles = pool.filter((m) => m.single);
  const first = weightedPick(rng, singles);
  picked.push(first);
  pool.splice(pool.findIndex((m) => m.id === first), 1);
  // 池耗尽前不重复；耗尽后按权重重启（第 7–8 节点可能与前面重复）
  while (picked.length < 8) {
    if (pool.length === 0) pool.push(...MAP_POOL.filter((m) => m.id !== picked[picked.length - 1]));
    const next = weightedPick(rng, pool);
    picked.push(next);
    pool.splice(pool.findIndex((m) => m.id === next), 1);
  }
  return picked;
}
function weightedPick(rng: () => number, list: { id: string; weight: number }[]): string {
  const total = list.reduce((a, m) => a + m.weight, 0);
  let r = rng() * total;
  for (const m of list) { r -= m.weight; if (r <= 0) return m.id; }
  return list[list.length - 1].id;
}
function compareRank(a: [number, number, number], b: [number, number, number]): number {
  // [完成节点数, 难度分, 用时(越小越好)]
  if (a[0] !== b[0]) return b[0] - a[0];
  if (a[1] !== b[1]) return b[1] - a[1];
  return a[2] - b[2];
}

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

function selftestFailures(): string[] {
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
  return failures;
}
function selftest(): number {
  const failures = selftestFailures();
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

function verifyFaction(): number {
  const baseD = (FACTION_BASE_B / B_REF) / FACTION_BASE_P;
  const baseWin = poissonBelow(LAMBDA0 * Math.pow(baseD, GAMMA), CAP);
  let bad = 0;
  console.log(`faction card check（基准关 B=${FACTION_BASE_B} P=${FACTION_BASE_P} 基准胜率 ${pct(baseWin)}）:`);
  for (const c of FACTION_CHALLENGES) {
    const win = (mul: number) => poissonBelow(LAMBDA0 * Math.pow((FACTION_BASE_B / B_REF) / (FACTION_BASE_P * mul), GAMMA), CAP);
    const avgDrop = baseWin - win(c.playerMul);
    const pureDrop = baseWin - win(c.playerMulPure);
    const okAvg = avgDrop >= c.band[0] && avgDrop <= c.band[1];
    const okPure = pureDrop <= FACTION_PURE_CEILING && pureDrop > avgDrop;
    if (!okAvg || !okPure) bad++;
    console.log(`  ${c.id} ${c.name}（${c.faction}/分${c.score}）: 平均跌幅 ${(avgDrop * 100).toFixed(1)}pp（允许 ${pct(c.band[0])}–${pct(c.band[1])}）${okAvg ? "PASS" : "FAIL"}；${c.pureDeck} 跌幅 ${(pureDrop * 100).toFixed(1)}pp（上限 ${pct(FACTION_PURE_CEILING)}）${okPure ? "PASS" : "FAIL"}`);
  }
  console.log("faction card check: " + (bad ? "FAIL" : "PASS"));
  return bad ? 1 : 0;
}
function airMatrix(): { faction: string; B: number; D: number; win: number }[] {
  const rows: { faction: string; B: number; D: number; win: number }[] = [];
  for (const B of AIR_WAVE_B) for (const f of FACTION_AA) {
    const D = (B / B_REF) / f.factor;
    rows.push({ faction: f.faction, B, D, win: poissonBelow(LAMBDA0 * Math.pow(D, GAMMA), CAP) });
  }
  return rows;
}
function verifyAirMatrix(): number {
  const rows = airMatrix();
  let bad = 0;
  console.log("air-wave × faction matrix（三档空袭预算 × 三族）:");
  console.log("| 空袭 B | 铁砧 | 涌潮 | 星辉 | 极差 | 判定 |");
  console.log("| --- | --- | --- | --- | --- | --- |");
  for (const B of AIR_WAVE_B) {
    const cells = rows.filter((r) => r.B === B);
    const wins = cells.map((c) => c.win);
    const spread = Math.max(...wins) - Math.min(...wins);
    const ok = spread <= AIR_FAIRNESS_PP;
    if (!ok) bad++;
    console.log(`| ${B} | ${cells.map((c) => pct(c.win)).join(" | ")} | ${(spread * 100).toFixed(1)}pp | ${ok ? "PASS" : "FAIL"} |`);
  }
  console.log("air-wave matrix: " + (bad ? "FAIL" : "PASS"));
  return bad ? 1 : 0;
}
function seedChecks(): { bad: string[]; sample: string[] } {
  const bad: string[] = [];
  const s1 = drawRun(20260914);
  const s2 = drawRun(20260914);
  if (s1.join(",") !== s2.join(",")) bad.push("同种子不可复现");
  if (drawRun(1).join(",") === drawRun(2).join(",")) bad.push("不同种子结果相同");
  if (new Set(s1.slice(0, 6)).size !== 6) bad.push("池耗尽前（前 6 节点）出现重复地图");
  if (!MAP_POOL.find((m) => m.id === s1[0])?.single) bad.push("节点 1 未限制为单入口图");
  const counts = new Map<string, number>();
  const N = 1000;
  for (let s = 0; s < N; s++) {
    const run = drawRun(1000 + s);
    if (new Set(run.slice(0, 6)).size !== 6) bad.push(`seed=${1000 + s} 前 6 节点不是加权排列`);
    for (const id of run) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const m of MAP_POOL) if (!counts.has(m.id)) bad.push(`${m.id} 从未被抽中`);
  const cases: [string, [number, number, number], [number, number, number], number][] = [
    ["同深度同分比用时（用时少者优先）", [8, 12, 100], [8, 12, 90], 1],
    ["深度优先于分数", [8, 15, 200], [7, 20, 10], -1],
    ["完全相同时相等", [6, 15, 50], [6, 15, 50], 0],
  ];
  for (const [name, a, b, expect] of cases) {
    const got = compareRank(a, b);
    const ok = (expect < 0 && got < 0) || (expect > 0 && got > 0) || (expect === 0 && got === 0);
    if (!ok) bad.push(`排行榜用例失败：${name}`);
  }
  return { bad, sample: s1 };
}
function verifySeed(): number {
  const { bad, sample } = seedChecks();
  console.log("seed/ranking check（同种子复现、分布、节点1限制、排行比较器）:");
  console.log(`  样例局（seed=20260914）: ${sample.join(" → ")}`);
  console.log("seed/ranking check: " + (bad.length ? "FAIL" : "PASS"));
  for (const b of bad) console.log("  - " + b);
  return bad.length ? 1 : 0;
}
function airMixRows(): { formation: string; rows: { faction: string; win: number }[]; spread: number }[] {
  return AIR_MIX.map((mix) => {
    const rows = FACTION_AA.map((f) => {
      const factorEff = 1 + (f.factor - 1) * mix.share;
      const D = (AIR_MIX_B / B_REF) / factorEff;
      return { faction: f.faction, win: poissonBelow(LAMBDA0 * Math.pow(D, GAMMA), CAP) };
    });
    const wins = rows.map((r) => r.win);
    return { formation: mix.name, rows, spread: Math.max(...wins) - Math.min(...wins) };
  });
}
function verifyAirMix(): number {
  const rows = airMixRows();
  let bad = 0;
  console.log(`air/ground mix check（B=${AIR_MIX_B}，三形态 × 三族）:`);
  console.log("| 形态 | 铁砧 | 涌潮 | 星辉 | 极差 | 上限 | 判定 |");
  console.log("| --- | --- | --- | --- | --- | --- | --- |");
  AIR_MIX.forEach((mix, i) => {
    const r = rows[i];
    const ok = r.spread <= mix.spreadMax;
    if (!ok) bad++;
    console.log(`| ${r.formation} | ${r.rows.map((x) => pct(x.win)).join(" | ")} | ${(r.spread * 100).toFixed(1)}pp | ${pct(mix.spreadMax)} | ${ok ? "PASS" : "FAIL"} |`);
  });
  console.log("air/ground mix check: " + (bad ? "FAIL" : "PASS"));
  return bad ? 1 : 0;
}
function verifyPmod(): number {
  const baseWin = poissonBelow(LAMBDA0 * Math.pow((PMOD_BASE_B / B_REF) / PMOD_BASE_P, GAMMA), CAP);
  const gainOf = (mul: number) => poissonBelow(LAMBDA0 * Math.pow((PMOD_BASE_B / B_REF) / (PMOD_BASE_P * mul), GAMMA), CAP) - baseWin;
  let bad = 0;
  console.log(`pmod check（基准关 B=${PMOD_BASE_B} P=${PMOD_BASE_P} 基准胜率 ${pct(baseWin)}）:`);
  for (const p of PMODS) {
    const avg = gainOf(p.playerMul);
    const pure = gainOf(p.playerMulPure);
    const okAvg = avg >= p.band[0] && avg <= p.band[1];
    const okPure = pure >= avg && pure <= PMOD_PURE_CEILING;
    if (!okAvg || !okPure) bad++;
    console.log(`  ${p.id} ${p.name}: 平均增益 ${(avg * 100).toFixed(1)}pp（允许 ${pct(p.band[0])}–${pct(p.band[1])}）${okAvg ? "PASS" : "FAIL"}；${p.pureDeck} 增益 ${(pure * 100).toFixed(1)}pp（≥平均且 ≤${pct(PMOD_PURE_CEILING)}）${okPure ? "PASS" : "FAIL"}`);
  }
  console.log("pmod check: " + (bad ? "FAIL" : "PASS"));
  return bad ? 1 : 0;
}
function verifyAntiAir(): number {
  const factions = ["铁砧", "涌潮", "星辉"];
  let bad = 0;
  console.log("anti-air coverage check（每族需 ≥2 张可对空卡，其中 ≥1 张塔卡）:");
  for (const f of factions) {
    const list = AIR_CARDS.filter((c) => c.faction === f);
    const air = list.filter((c) => c.air);
    const towers = air.filter((c) => c.kind === "塔");
    const ok = air.length >= 2 && towers.length >= 1;
    if (!ok) bad++;
    console.log(`  ${f}: 可对空 ${air.length}/${list.length}（塔 ${towers.length}）→ ${air.map((c) => c.id).join(", ") || "无"} ${ok ? "PASS" : "FAIL"}`);
  }
  console.log("anti-air coverage check: " + (bad ? "FAIL" : "PASS"));
  return bad ? 1 : 0;
}

function buildReport(): string {
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date());
  const L: string[] = [];
  L.push("# Refu Game 001 · 数值体检报告（自动生成）", "");
  L.push(`> 生成日期（东八区）：${date} ｜ 参数：n=${RUNS} seed=${SEED} λ0=${LAMBDA0} γ=${GAMMA} cap=${CAP} B_ref=${B_REF}`);
  L.push("> 本报告由 `tools/sim_refu_game_001.ts --report` 生成；改动数值后重跑并刷新本文件。", "");
  L.push("## 一、模型自检", "");
  const st = selftestFailures();
  L.push(st.length ? `- ❌ FAIL：${st.join("；")}` : "- ✅ PASS（种子可复现、单调性、模拟/解析一致）", "");
  L.push("## 二、主线章节带位", "");
  L.push("| 章节 | α | 平均 D | 模拟胜率 | 目标带 | 判定 |");
  L.push("| --- | --- | --- | --- | --- | --- |");
  const stages = stageList([]);
  CHAPTERS.forEach((ch, ci) => {
    const list = stages.filter((s) => s.chIndex === ci);
    const avgD = list.reduce((a, s) => a + s.D, 0) / list.length;
    const avgS = list.reduce((a, s) => a + simulate(LAMBDA0 * Math.pow(s.D, GAMMA), s.waves, 2000, seedFor(ci, s.index)), 0) / list.length;
    L.push(`| ${ch.name} | ${fmt(ch.alpha)} | ${fmt(avgD)} | ${pct(avgS)} | ${pct(ch.band[0])}–${pct(ch.band[1])} | ${verdict(avgS, ch.band)} |`);
  });
  L.push("", "## 三、远征 8 节点带位", "");
  L.push("| 节点 | B | D | 模拟胜率 | 目标带 | 判定 |");
  L.push("| --- | --- | --- | --- | --- | --- |");
  for (const r of rogueRows()) L.push(`| ${r.i}${r.i === 8 ? "（BOSS）" : ""} | ${r.B} | ${fmt(r.D)} | ${pct(r.sim)} | ${pct(r.band[0])}–${pct(r.band[1])} | ${verdict(r.sim, r.band)} |`);
  L.push("", "## 四、族专属挑战卡（双口径）", "");
  const baseF = poissonBelow(LAMBDA0 * Math.pow((FACTION_BASE_B / B_REF) / FACTION_BASE_P, GAMMA), CAP);
  const fWin = (mul: number) => poissonBelow(LAMBDA0 * Math.pow((FACTION_BASE_B / B_REF) / (FACTION_BASE_P * mul), GAMMA), CAP);
  L.push("| 卡 | 分 | 平均跌幅 | 纯流派跌幅 | 判定 |");
  L.push("| --- | --- | --- | --- | --- |");
  for (const c of FACTION_CHALLENGES) {
    const avg = (baseF - fWin(c.playerMul)) * 100;
    const pure = (baseF - fWin(c.playerMulPure)) * 100;
    const ok = avg >= c.band[0] * 100 && avg <= c.band[1] * 100 && pure <= FACTION_PURE_CEILING * 100;
    L.push(`| ${c.name} | ${c.score} | ${avg.toFixed(1)}pp | ${pure.toFixed(1)}pp | ${ok ? "✅" : "❌"} |`);
  }
  L.push("", "## 五、永久修饰卡 PMOD（双口径）", "");
  const baseP = poissonBelow(LAMBDA0 * Math.pow((PMOD_BASE_B / B_REF) / PMOD_BASE_P, GAMMA), CAP);
  const pGain = (mul: number) => (poissonBelow(LAMBDA0 * Math.pow((PMOD_BASE_B / B_REF) / (PMOD_BASE_P * mul), GAMMA), CAP) - baseP) * 100;
  L.push("| 卡 | 平均增益 | 契合流派增益 | 判定 |");
  L.push("| --- | --- | --- | --- |");
  for (const p of PMODS) {
    const a = pGain(p.playerMul);
    const u = pGain(p.playerMulPure);
    const ok = a >= p.band[0] * 100 && a <= p.band[1] * 100 && u >= a && u <= PMOD_PURE_CEILING * 100;
    L.push(`| ${p.name} | ${a.toFixed(1)}pp | ${u.toFixed(1)}pp | ${ok ? "✅" : "❌"} |`);
  }
  L.push("", "## 六、对空覆盖与空袭公平性", "");
  for (const f of ["铁砧", "涌潮", "星辉"]) {
    const air = AIR_CARDS.filter((c) => c.faction === f && c.air);
    L.push(`- ${f}：可对空 ${air.length} 张（${air.map((c) => c.id).join(", ")}）`);
  }
  L.push("");
  L.push("| 空袭 B | 铁砧 | 涌潮 | 星辉 | 极差 | 判定 |");
  L.push("| --- | --- | --- | --- | --- | --- |");
  for (const B of AIR_WAVE_B) {
    const cells = airMatrix().filter((r) => r.B === B);
    const spread = Math.max(...cells.map((c) => c.win)) - Math.min(...cells.map((c) => c.win));
    L.push(`| ${B} | ${cells.map((c) => pct(c.win)).join(" | ")} | ${(spread * 100).toFixed(1)}pp | ${spread <= AIR_FAIRNESS_PP ? "✅" : "❌"} |`);
  }
  L.push("", "| 形态 | 铁砧 | 涌潮 | 星辉 | 极差 | 判定 |");
  L.push("| --- | --- | --- | --- | --- | --- |");
  for (const r of airMixRows()) {
    const mix = AIR_MIX.find((m) => m.name === r.formation)!;
    L.push(`| ${r.formation} | ${r.rows.map((x) => pct(x.win)).join(" | ")} | ${(r.spread * 100).toFixed(1)}pp | ${r.spread <= mix.spreadMax ? "✅" : "❌"} |`);
  }
  L.push("", "## 七、种子与排行榜", "");
  const seed = seedChecks();
  L.push(`- 样例局（seed=20260914）：${seed.sample.join(" → ")}`);
  L.push(seed.bad.length ? `- ❌ ${seed.bad.join("；")}` : "- ✅ TC-01…TC-08 全部通过");
  return L.join("\n");
}

async function main(): Promise<void> {
  if (flag("verify-air-mix")) { process.exitCode = verifyAirMix(); return; }
  if (flag("verify-pmod")) { process.exitCode = verifyPmod(); return; }
  if (flag("report")) {
    const md = buildReport();
    const out = arg("out", "");
    if (out) {
      const fs = await import("node:fs");
      fs.writeFileSync(out, md + "\n", "utf8");
      console.log("[report written] " + out);
    } else console.log(md);
    return;
  }
  if (flag("verify-faction")) { process.exitCode = verifyFaction(); return; }
  if (flag("verify-seed")) { process.exitCode = verifySeed(); return; }
  if (flag("verify-anti-air")) { process.exitCode = verifyAntiAir(); return; }
  if (flag("verify-air-matrix")) { process.exitCode = verifyAirMatrix(); return; }
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
