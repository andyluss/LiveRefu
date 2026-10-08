#!/usr/bin/env node
// meta_rules_scope —— 把元规则 M1（文件组织）+ M2（命名/类型词表）的机器校验
// **从"只覆盖 rules/ 与 lab/"扩到工作区各关注点**，并且**把尚未覆盖的缺口写在明处**。
//
// 为什么需要它：
//   此前 M1/M2 只有 `rules/` 与 `lab/formal-system` 写了判定配置，于是
//   **"在项目里另立一套命名"不会被任何检查发现**——2026-10-08 就真的发生了
//   （讨论记录用了 `YYYY-MM-DD_HHMM_主题`，而 M2 规定 `YYYYMMDD-HHMM-关键词`）。
//   但反过来"一次全开"也不行：实测用通用配置跑 `projects/` 会产出上百条**因配置不全而来的假阳性**，
//   闸门一旦变成噪声，人就开始绕过它。所以采用**分级**：
//
//     block   → 纳入闸门（必须 0 违规；需专门配置）        —— 目前：rules/、projects/mainline/
//     report  → 只报告不拦截（用通用配置估欠账规模）      —— 其余在研/文档关注点
//     pending → 尚未配置（只登记在案，不跑）              —— 尚无
//     exempt  → 按 rules/README.md §三 豁免               —— indie/、lab/
//
// 覆盖清单在 [workspace-scope.json](workspace-scope.json)（**缺口因此可见，而不是隐形**）。
//
// 用法：
//   node --experimental-strip-types rules/meta/tools/meta_rules_scope.ts              # 全量（CI 用）
//   node --experimental-strip-types rules/meta/tools/meta_rules_scope.ts --block-only # 只跑纳入闸门的（pre-commit 用）
//   node --experimental-strip-types rules/meta/tools/meta_rules_scope.ts --self-test

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..', '..', '..')
const SELFTEST = process.argv.includes('--self-test')
const BLOCK_ONLY = process.argv.includes('--block-only')
const CHECKER = resolve(import.meta.dirname, 'meta_rules_check.ts')
const SCOPE = resolve(import.meta.dirname, 'workspace-scope.json')

type Mode = 'block' | 'report' | 'pending' | 'exempt'
interface Concern { path: string; mode: Mode; config?: string; why: string }

/** 纯函数：从检查器输出里取"违规数"；取不到返回 null（**不当作 0**——那会造成静默假通过） */
function parseViolations(out: string): number | null {
  const m = /判定:\s*合规项\s*\d+\s*·\s*违规\s*(\d+)/.exec(out)
  return m ? Number(m[1]) : null
}

/** 纯函数：整体判定。block 条目必须全部"跑成功且 0 违规"才算通过 */
function verdict(rows: Array<{ mode: Mode; violations: number | null }>): { ok: boolean; blocked: string[] } {
  const blocked: string[] = []
  for (const r of rows) {
    if (r.mode !== 'block') continue
    if (r.violations === null || r.violations > 0) blocked.push(String(r.violations))
  }
  return { ok: blocked.length === 0, blocked }
}

// ══════════════════════════════════════════════════════════════════════
if (SELFTEST) {
  console.log('负向自检：给判定逻辑喂已知坏数据，确认它们会失败\n')
  const cases: Array<[string, () => boolean, string]> = [
    ['block 全 0 → 通过', () => verdict([{ mode: 'block', violations: 0 }]).ok, '（应通过）'],
    ['block 有违规 → 拒', () => verdict([{ mode: 'block', violations: 3 }]).ok, 'block 有违规必须被拒'],
    ['block 取不到数 → 拒', () => verdict([{ mode: 'block', violations: null }]).ok, '**取不到违规数不得当作 0**（防静默假通过）'],
    ['report 有违规 → 仍通过', () => verdict([{ mode: 'report', violations: 107 }]).ok, '（应通过）report 不拦截'],
    ['exempt 有违规 → 仍通过', () => verdict([{ mode: 'exempt', violations: 9 }]).ok, '（应通过）exempt 不拦截'],
    ['解析真实输出', () => parseViolations('判定: 合规项 44 · 违规 0   [代码类豁免命名: —]') === 0, '（应通过）'],
    // 表达式按框架约定写成"**这算违规吗**"（返回 false = 判定正确）
    ['解析异常输出', () => parseViolations('完全不是检查器的输出') !== null, '解析不到必须返回 null，而不是 0'],
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
const manifest = JSON.parse(readFileSync(SCOPE, 'utf8'))
const concerns: Concern[] = manifest.concerns

function runOne(c: Concern): number | null {
  if (!c.config) return null
  try {
    const out = execFileSync('node', [
      '--experimental-strip-types', CHECKER,
      '--root', c.path,
      '--config', resolve(ROOT, c.config),
    ], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return parseViolations(out)
  } catch (e: any) {
    // 检查器以非 0 退出时，stdout 仍带着判定行
    const out = String(e?.stdout ?? '')
    return parseViolations(out)
  }
}

const rows: Array<{ c: Concern; violations: number | null }> = []
for (const c of concerns) {
  if (BLOCK_ONLY && c.mode !== 'block') continue
  if (c.mode === 'exempt' || c.mode === 'pending') { rows.push({ c, violations: null }); continue }
  rows.push({ c, violations: runOne(c) })
}

console.log(`元规则覆盖检查（M1+M2）· ${BLOCK_ONLY ? '仅纳入闸门的关注点' : '工作区全量'} · 清单 ${SCOPE.replace(ROOT + '/', '')}\n`)
const byMode: Record<string, string[]> = { block: [], report: [], pending: [], exempt: [] }
for (const { c, violations } of rows) {
  if (c.mode === 'block') {
    const label = violations === null ? '**取不到违规数（视为失败）**' : violations === 0 ? '0 违规 ✔' : `${violations} 违规 ✘`
    byMode.block!.push(`  ● ${c.path.padEnd(28)} ${label}`)
  } else if (c.mode === 'report') {
    byMode.report!.push(`  ○ ${c.path.padEnd(28)} 欠账粗估 ${violations === null ? '取不到' : violations} 条（不拦截）  ← ${c.why}`)
  } else if (c.mode === 'pending') {
    byMode.pending!.push(`  · ${c.path.padEnd(28)} 尚未配置  ← ${c.why}`)
  } else {
    byMode.exempt!.push(`  – ${c.path.padEnd(28)} 豁免  ← ${c.why}`)
  }
}

console.log(`纳入闸门（block，${byMode.block!.length} 个）：`)
for (const l of byMode.block!) console.log(l)
if (byMode.report!.length) {
  console.log(`\n只报告不拦截（report，${byMode.report!.length} 个）——**这是已知覆盖缺口**，达标后应移入 block：`)
  for (const l of byMode.report!) console.log(l)
}
if (byMode.pending!.length) {
  console.log(`\n尚未配置（pending，${byMode.pending!.length} 个）：`)
  for (const l of byMode.pending!) console.log(l)
}
if (byMode.exempt!.length) {
  console.log(`\n豁免（exempt，${byMode.exempt!.length} 个）：`)
  for (const l of byMode.exempt!) console.log(l)
}

const v = verdict(rows.map(r => ({ mode: r.c.mode, violations: r.violations })))
console.log()
if (!v.ok) {
  console.error('✗ 纳入闸门的关注点存在 M1/M2 违规（或检查未产出判定），已拦截。')
  console.error('  参考: rules/meta/M1-file-organization.md / M2-naming-vocabulary.md')
  process.exit(1)
}
console.log('✓ 纳入闸门的关注点全部合规')
