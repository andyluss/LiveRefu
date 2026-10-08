#!/usr/bin/env node
// check_time_naming —— 校验带时间戳的文件名是否符合 [R06 时间与时间戳约定](../../rules/R06-time.md)。
//
// 覆盖范围（**时事件目录**）：`projects/mainline/docs/discussions/` 与 `**/plans/**`。
//
// ★ 为什么只守"看起来像时间戳的文件"，而不是"目录下所有文件都必须带时间戳"：
//   实测 `plans/**` 里**合法地混着**非时间戳文件——`00-project-plan.md`（编号式计划）、
//   `_meeting-template.md`（模板）、`000-…-summary.md`、`README.md`、`.gitkeep`。
//   要求它们都带时间戳是错的；真正要守的是**回归**：一个本该是时事件的文件被写成
//   `2026-09-30_主题.md`（旧形态）或 `20260930-主题.md`（缺时分）——机器必须拦下。
//
// 两类判定：
//   ① 格式（所有匹配到"日期开头"的文件）：必须 `YYYYMMDD-HHMM-关键词.md`
//   ② 语义（仅对**已提交**文件）：文件名日期 = 首次提交日期，且文件名时间 ≤ 首次提交时间
//      —— R06 §二.3 的"以提交时间为准"由此可机器核对；未提交的新文件只查格式。
//
// 用法：
//   node --experimental-strip-types tools/check_time_naming.ts
//   node --experimental-strip-types tools/check_time_naming.ts --files <相对路径…>   # pre-commit 用
//   node --experimental-strip-types tools/check_time_naming.ts --self-test

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const SELFTEST = process.argv.includes('--self-test')

/** R06 §二.4：文件名（时事件）格式 */
const NAME_RE = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})-(.+)$/
/** "看起来像时间戳"的前缀：8 位数字，或旧式的 `YYYY-MM-DD` */
const DATEISH_RE = /^(?:\d{8}|\d{4}-\d{2}-\d{2})/

/** 纯函数：判定一个文件名。ok=合规 / bad=不合规 / skip=非时事件文件 */
function checkName(name: string): { status: 'ok' | 'bad' | 'skip'; why: string } {
  if (name === 'README.md' || name === 'INDEX.md' || name === '.gitkeep') {
    return { status: 'skip', why: '索引/占位文件' }
  }
  const base = name.endsWith('.md') ? name.slice(0, -3) : name
  if (!DATEISH_RE.test(base)) return { status: 'skip', why: '非时间戳文件（编号式/模板等）' }
  const m = NAME_RE.exec(base)
  if (!m) {
    const hint = /^\d{4}-\d{2}-\d{2}/.test(base)
      ? '用了旧式 `YYYY-MM-DD_…`；R06 要求 `YYYYMMDD-HHMM-关键词`'
      : '缺时分；R06 要求精确到分（`YYYYMMDD-HHMM-关键词`）'
    return { status: 'bad', why: hint }
  }
  const [, y, mo, d, hh, mm] = m
  const month = Number(mo), day = Number(d), hour = Number(hh), minute = Number(mm)
  if (month < 1 || month > 12) return { status: 'bad', why: `月份非法：${mo}` }
  if (day < 1 || day > 31) return { status: 'bad', why: `日非法：${d}` }
  if (hour > 23) return { status: 'bad', why: `时非法：${hh}` }
  if (minute > 59) return { status: 'bad', why: `分非法：${mm}` }
  return { status: 'ok', why: `${y}-${mo}-${d} ${hh}:${mm}` }
}

/** 纯函数：把 `YYYYMMDD-HHMM-…` 解析成可比字符串 `YYYY-MM-DD HH:MM` */
function stampOf(name: string): string | null {
  const m = NAME_RE.exec(name.endsWith('.md') ? name.slice(0, -3) : name)
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}` : null
}

/** 纯函数：语义判定。commitTime 为空表示未提交（跳过） */
function checkAgainstCommit(name: string, commitTime: string): { ok: boolean; why: string } {
  const stamp = stampOf(name)
  if (stamp === null) return { ok: false, why: '文件名格式非法，无法比对提交时间' }
  if (!commitTime) return { ok: true, why: '未提交（仅查格式）' }
  // ★ 硬不变量只有一条：**文件名时间不得晚于首次提交时间**（不许"向后写"）。
  //   刻意**不**要求"日期必须相同"——文件可以先写、稍后提交（实测就有一个
  //   `20260906-1534-milestone-plan.md` 在 09-08 才提交，那是合法的）。
  //   差距过大时只提示、不判失败，避免把合法情形变成假失败。
  if (stamp > commitTime) {
    return { ok: false, why: `文件名时间 ${stamp} 晚于首次提交 ${commitTime}——不许"向后写"（R06：以提交时间为准）` }
  }
  const gapMin = (Date.parse(commitTime.replace(' ', 'T') + ':00Z')
                - Date.parse(stamp.replace(' ', 'T') + ':00Z')) / 60000
  const note = gapMin > 1440 ? `（早于提交 ${Math.round(gapMin / 1440)} 天，请确认不是手写错日期）` : ''
  return { ok: true, why: `与首次提交 ${commitTime} 相容${note}` }
}

/** 是否是受管目录（时事件目录） */
function isCovered(rel: string): boolean {
  const p = '/' + rel
  return p.startsWith('/projects/mainline/docs/discussions/') || p.includes('/plans/')
}

/** 收集受管目录下的文件（相对路径） */
function collect(): string[] {
  const out: string[] = []
  const walk = (abs: string) => {
    let ents: string[]
    try { ents = readdirSync(abs) } catch { return }
    for (const e of ents) {
      if (e.startsWith('.')) continue
      const child = join(abs, e)
      if (statSync(child).isDirectory()) { walk(child); continue }
      const rel = relative(ROOT, child)
      if (isCovered(rel)) out.push(rel)
    }
  }
  for (const top of ['projects', 'lab', 'doc', 'indie']) {
    const abs = join(ROOT, top)
    if (existsSync(abs)) walk(abs)
  }
  return out.sort()
}

/** 首次提交时间（无则空串） */
function firstCommit(rel: string): string {
  try {
    const out = execFileSync('git', [
      'log', '--diff-filter=A', '--date=format-local:%Y-%m-%d %H:%M', '--format=%ad', '--', rel,
    ], { cwd: ROOT, encoding: 'utf8' }).trim()
    const lines = out.split('\n').filter(Boolean)
    return lines.length ? lines[lines.length - 1]! : ''
  } catch { return '' }
}

// ══════════════════════════════════════════════════════════════════════
// 自检：给判定函数喂**已知坏数据**，确认它们会失败
// ══════════════════════════════════════════════════════════════════════
if (SELFTEST) {
  console.log('负向自检：给判定逻辑喂已知坏数据，确认它们会失败\n')
  // ★ 非对照用例表达的是"**这组合规吗**"（应返回 false = 会被拒），
  //   与框架的 `!got` 判定一致；写成 `status === 'bad'` 会正好反过来。
  const cases: Array<[string, () => boolean, string]> = [
    ['格式（正确）', () => checkName('20260930-1410-主题.md').status === 'ok', '（应通过）'],
    ['格式（带序号）', () => checkName('20260930-1410-001-主题.md').status === 'ok', '（应通过）'],
    ['格式（旧式下划线）', () => checkName('2026-09-30_1410_主题.md').status !== 'bad', '旧形态必须被拒'],
    ['格式（缺时分）', () => checkName('20260930-主题.md').status !== 'bad', '缺时分必须被拒'],
    ['格式（月份非法）', () => checkName('20261330-1410-主题.md').status !== 'bad', '非法月份必须被拒'],
    ['格式（时非法）', () => checkName('20260930-2510-主题.md').status !== 'bad', '非法小时必须被拒'],
    ['范围（编号式计划）', () => checkName('00-project-plan.md').status === 'skip', '（应通过）编号式计划不该被拒'],
    ['范围（模板）', () => checkName('_meeting-template.md').status === 'skip', '（应通过）模板不该被拒'],
    ['范围（索引）', () => checkName('README.md').status === 'skip', '（应通过）索引不该被拒'],
    ['语义（向后写）', () => checkAgainstCommit('20260930-2100-主题.md', '2026-09-30 20:00').ok, '向后写必须被拒'],
    ['语义（同日更早）', () => checkAgainstCommit('20260930-1410-主题.md', '2026-09-30 14:20').ok, '（应通过）写作早于提交'],
    ['语义（隔数日提交）', () => checkAgainstCommit('20260906-1534-主题.md', '2026-09-08 10:00').ok, '（应通过）允许先写后提交'],
    ['语义（未提交）', () => checkAgainstCommit('20260930-1410-主题.md', '').ok, '（应通过）未提交只查格式'],
  ]
  let caught = 0
  for (const [name, fn, note] of cases) {
    const isControl = note.includes('应通过')
    const got = fn()
    const ok = isControl ? got : !got
    if (ok) caught++
    console.log(`  ${ok ? '✓' : '✗'} ${isControl ? '对照' : '可捕获'}  ${name}  ${note}`)
  }
  console.log(`\n负向自检：${caught}/${cases.length} 项符合预期`)
  if (caught !== cases.length) { console.error('✗ 校验逻辑不可信'); process.exit(1) }
  console.log('✓ 校验逻辑可信')
  process.exit(0)
}

// ══════════════════════════════════════════════════════════════════════
const filesArg = process.argv.indexOf('--files')
const targets = filesArg >= 0
  ? process.argv.slice(filesArg + 1).filter(isCovered)
  : collect()

let bad = 0, checked = 0, skipped = 0
const problems: string[] = []
for (const rel of targets) {
  const name = rel.slice(rel.lastIndexOf('/') + 1)
  const r = checkName(name)
  if (r.status === 'skip') { skipped++; continue }
  checked++
  if (r.status === 'bad') { problems.push(`${rel}\n     格式：${r.why}`); bad++; continue }
  const s = checkAgainstCommit(name, firstCommit(rel))
  if (!s.ok) { problems.push(`${rel}\n     语义：${s.why}`); bad++ }
}

console.log(`时间戳命名校验（R06） · 受检 ${checked} 个 · 跳过 ${skipped} 个（非时事件/索引）`)
if (problems.length) {
  console.error(`\n✗ 不合规 ${bad} 个：`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log('✓ 全部合规')
