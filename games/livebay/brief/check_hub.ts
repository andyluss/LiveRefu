#!/usr/bin/env node
/**
 * check_hub.ts —— 核对 LiveBay HUB 里的数字与工程实际是否一致，并检查素材存在。
 *
 * 数字来源全部现读：data/*.json、run_sim.gd、test_expansions.gd、design01 HTML、CHANGELOG。
 * HUB 里要核对的数字写成 <span data-fact="towers">3</span>；同一 fact 可多次出现。
 * 推导不出真实值时直接报错，绝不静默跳过。
 */
import * as fs from 'node:fs';
import * as pathMod from 'node:path';

const HERE = import.meta.dirname;
const FD = pathMod.resolve(HERE, '..');
const DATA = pathMod.join(FD, 'game', 'data');
const HUB = pathMod.join(HERE, 'HUB.html');

function parseHubFacts(html: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const m of html.matchAll(/data-fact="([a-z0-9_]+)"\s*>([^<]*)</g)) {
    (out[m[1]] ??= []).push(m[2].trim());
  }
  return out;
}

function compare(facts: Record<string, string>, hub: Record<string, string[]>): string[] {
  const problems: string[] = [];
  for (const [name, values] of Object.entries(hub).sort()) {
    const real = facts[name];
    if (real === undefined) {
      problems.push(`data-fact="${name}" 在 HUB 里出现，但检查器不知道它的真实来源`);
      continue;
    }
    for (const v of values) {
      if (v !== String(real)) problems.push(`data-fact="${name}"：页面写 ${v}，实际是 ${real}`);
    }
  }
  for (const name of Object.keys(facts).sort()) {
    if (!(name in hub)) problems.push(`真实值 ${name}=${facts[name]} 未出现在 HUB 里`);
  }
  return problems;
}

function checkAssets(html: string, base: string): string[] {
  const problems: string[] = [];
  for (const m of html.matchAll(/(?:src|poster)="([^"]+)"/g)) {
    const ref = m[1];
    if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('data:')) continue;
    if (!fs.existsSync(pathMod.join(base, ref))) problems.push(`素材缺失：${ref}`);
  }
  return problems;
}

function load(name: string): any {
  const p = pathMod.join(DATA, name);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function checkCount(file: string): number | null {
  if (!fs.existsSync(file)) return null;
  const src = fs.readFileSync(file, 'utf8');
  const n = (src.match(/\b_check\(/g) ?? []).length;
  return src.includes('func _check(') ? n - 1 : n;
}

function deriveFacts(): { facts: Record<string, string>; problems: string[] } {
  const facts: Record<string, string> = {};
  const problems: string[] = [];
  const towers = load('towers.json');
  const enemies = load('enemies.json');
  const waves = load('waves.json');
  const mapdata = load('map_bay01.json');
  for (const [key, value] of [['towers', towers], ['enemies', enemies], ['waves', waves]] as const) {
    if (Array.isArray(value)) facts[key] = String(value.length);
    else problems.push(`无法从 data/${key}.json 推导 ${key}`);
  }
  if (mapdata && Array.isArray(mapdata.slots)) facts.slots = String(mapdata.slots.length);
  else problems.push('无法从 map_bay01.json 推导 slots');
  const maps = fs.readdirSync(DATA).filter((f) => /^map_.*\.json$/.test(f));
  facts.maps = String(maps.length);
  const professions = fs.readdirSync(DATA).filter((f) => /^profession_.*\.json$/.test(f));
  facts.professions = String(professions.length);
  const expDir = pathMod.join(FD, 'game', 'expansions');
  facts.l1_variants = String(fs.existsSync(expDir) ? fs.readdirSync(expDir).filter((d) => fs.existsSync(pathMod.join(expDir, d, 'pack.json'))).length : 0);

  const tests = checkCount(pathMod.join(FD, 'game', 'tests', 'run_sim.gd'));
  if (tests !== null) facts.tests = String(tests);
  else problems.push('找不到 game/tests/run_sim.gd');
  const exp = checkCount(pathMod.join(FD, 'game', 'tests', 'test_expansions.gd'));
  if (exp !== null) facts.expansions = String(exp);
  else problems.push('找不到 game/tests/test_expansions.gd');

  const htmlDir = pathMod.join(FD, 'docs-ai', 'design01', 'html');
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(pathMod.join(dir, e.name)) : (e.name.endsWith('.html') ? [pathMod.join(dir, e.name)] : [])
  );
  facts.doc_pages = String(fs.existsSync(htmlDir) ? walk(htmlDir).length : 0);

  const changelog = pathMod.join(FD, 'CHANGELOG.md');
  if (fs.existsSync(changelog)) {
    const m = fs.readFileSync(changelog, 'utf8').match(/^## \[([0-9.]+)\]/m);
    if (m) facts.version = m[1];
    else problems.push('CHANGELOG 找不到版本头');
  } else problems.push('找不到 CHANGELOG.md');
  return { facts, problems };
}

function selfTest(): number {
  const cases: Array<[string, () => boolean, boolean]> = [
    ['解析正常', () => JSON.stringify(parseHubFacts('<i data-fact="towers">3</i>')) === JSON.stringify({ towers: ['3'] }), true],
    ['同 fact 多处', () => JSON.stringify(parseHubFacts('<i data-fact="towers">3</i><i data-fact="towers">3</i>')) === JSON.stringify({ towers: ['3', '3'] }), true],
    ['比对一致', () => compare({ towers: '3' }, { towers: ['3'] }).length === 0, true],
    ['比对不符', () => compare({ towers: '3' }, { towers: ['4'] }).length === 0, false],
    ['同 fact 只改一处', () => compare({ towers: '3' }, { towers: ['3', '4'] }).length === 0, false],
    ['无来源 fact', () => compare({}, { x: ['1'] }).length === 0, false],
    ['真实值缺失', () => compare({ towers: '3' }, {}).length === 0, false],
    ['素材缺失', () => checkAssets('<img src="nope.png">', '/nope').length === 0, false],
    ['外链跳过', () => checkAssets('<img src="https://x/y.png">', '/nope').length === 0, true],
  ];
  let passed = 0;
  for (const [name, fn, expectOk] of cases) {
    let ok = false;
    try { ok = fn() === expectOk; } catch { ok = false; }
    if (ok) passed++;
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  }
  console.log(`[self-test] ${passed === cases.length ? 'PASS' : 'FAIL'}：${passed}/${cases.length}`);
  return passed === cases.length ? 0 : 1;
}

function main(): number {
  if (process.argv.includes('--self-test')) return selfTest();
  if (!fs.existsSync(HUB)) {
    console.log(`FAIL 找不到 ${HUB}`);
    return 1;
  }
  const { facts, problems } = deriveFacts();
  const html = fs.readFileSync(HUB, 'utf8');
  const hub = parseHubFacts(html);
  problems.push(...compare(facts, hub));
  problems.push(...checkAssets(html, HERE));
  if (problems.length) {
    console.log('HUB 检查失败：');
    for (const p of problems) console.log('  -', p);
    return 1;
  }
  console.log(`HUB 检查通过：${Object.keys(hub).length} 个 fact / ${Object.keys(facts).length} 个真实值`);
  console.log('  ' + Object.keys(facts).sort().map((k) => `${k}=${facts[k]}`).join(' · '));
  return 0;
}

process.exitCode = main();
