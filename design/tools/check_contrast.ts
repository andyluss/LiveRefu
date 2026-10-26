#!/usr/bin/env node
/**
 * 对比度与层级闸门（第二道闸门）。
 *
 * 为什么单做这一项：对比度是**唯一可以纯计算判定**的无障碍维度。
 * 只查对比度还不够——还要查“层级亮度顺序”，否则颜色达标但主次被压平。
 * 另外单列 focus：它不得复用 action / feedback 的颜色。
 *
 * 口径（WCAG 2.2）：
 *   普通文字 ≥ 4.5:1 ｜ 大字 ≥ 3:1 ｜ 非文字 UI（边框/焦点）≥ 3:1
 *
 * 用法：
 *   node design/tools/check_contrast.ts
 *   node design/tools/check_contrast.ts --verbose
 *   node design/tools/check_contrast.ts --self-test
 */

import {
  DESIGN_ROOT,
  contrast,
  getColor,
  loadTokens,
  relativeLuminance,
  round2,
  type TokenMap,
} from './token_lib.ts'

const SELF_TEST = process.argv.includes('--self-test')
const VERBOSE = process.argv.includes('--verbose')

type Kind = 'normal' | 'large' | 'ui'
interface Pair {
  label: string
  fg: string
  bg: string
  kind: Kind
}

const THRESHOLD: Record<Kind, number> = { normal: 4.5, large: 3, ui: 3 }

function buildPairs(): Pair[] {
  const pairs: Pair[] = []
  const add = (label: string, fg: string, bg: string, kind: Kind) =>
    pairs.push({ label, fg, bg, kind })

  // ── 系统语义 ──────────────────────────────────────────────
  for (const fg of ['primary', 'secondary', 'muted']) {
    for (const bg of ['base', 'surface', 'raised']) {
      add(`sys.text.${fg} on bg.${bg}`, `sys.color.text.${fg}`, `sys.color.bg.${bg}`, 'normal')
    }
  }
  add('sys.text.inverse on action.primary', 'sys.color.text.inverse', 'sys.color.action.primary', 'normal')
  for (const bg of ['base', 'surface', 'raised']) {
    add(`sys.line.strong on bg.${bg}`, 'sys.color.line.strong', `sys.color.bg.${bg}`, 'ui')
    add(`sys.action.primary on bg.${bg}`, 'sys.color.action.primary', `sys.color.bg.${bg}`, 'ui')
    add(`sys.focus.ring on bg.${bg}`, 'sys.color.focus.ring', `sys.color.bg.${bg}`, 'ui')
  }
  for (const fg of ['success', 'warning', 'danger']) {
    add(`sys.feedback.${fg} on bg.base`, `sys.color.feedback.${fg}`, 'sys.color.bg.base', 'normal')
  }

  // ── 未来档案 ──────────────────────────────────────────────
  const fa = 'product.future-archive.color.'
  for (const fg of ['text', 'textDim', 'textFaint']) {
    for (const bg of ['bg', 'bgElev', 'bgElev2']) {
      add(`archive.${fg} on ${bg}`, `${fa}${fg}`, `${fa}${bg}`, 'normal')
    }
  }
  for (const bg of ['bg', 'bgElev', 'bgElev2']) {
    add(`archive.lineStrong on ${bg}`, `${fa}lineStrong`, `${fa}${bg}`, 'ui')
    add(`archive.focus on ${bg}`, `${fa}focus`, `${fa}${bg}`, 'ui')
  }
  for (const fg of ['teal', 'tealBright', 'cream', 'amber', 'rust']) {
    for (const bg of ['bg', 'bgElev']) {
      add(`archive.${fg} on ${bg}`, `${fa}${fg}`, `${fa}${bg}`, 'normal')
    }
  }
  add('archive.bg on archive.amber（搜索高亮）', `${fa}bg`, `${fa}amber`, 'normal')

  // ── 未来残片 ──────────────────────────────────────────────
  const fd = 'product.future-debris.color.'
  for (const fg of ['text', 'textDim', 'textFaint']) {
    for (const bg of ['bgBase', 'bgElev1', 'bgElev2']) {
      add(`debris.${fg} on ${bg}`, `${fd}${fg}`, `${fd}${bg}`, 'normal')
    }
  }
  for (const bg of ['bgBase', 'bgElev1', 'bgElev2']) {
    add(`debris.lineStrong on ${bg}`, `${fd}lineStrong`, `${fd}${bg}`, 'ui')
    add(`debris.focus on ${bg}`, `${fd}focus`, `${fd}${bg}`, 'ui')
  }
  for (const fg of ['power', 'residue', 'warn', 'ok']) {
    add(`debris.${fg} on bgBase`, `${fd}${fg}`, `${fd}bgBase`, 'normal')
  }
  add('debris.accent on bgBase（按钮底）', `${fd}accent`, `${fd}bgBase`, 'ui')

  return pairs
}

function checkPairs(pairs: Pair[], colorOf: (path: string) => string): string[] {
  const errors: string[] = []
  for (const p of pairs) {
    const fg = colorOf(p.fg)
    const bg = colorOf(p.bg)
    const r = contrast(fg, bg)
    if (r < THRESHOLD[p.kind]) {
      errors.push(
        `${p.label}：${round2(r)}:1 < ${THRESHOLD[p.kind]}:1（fg=${fg} bg=${bg}）`,
      )
    }
  }
  return errors
}

interface Hierarchy {
  label: string
  paths: string[]
}

function buildHierarchies(): Hierarchy[] {
  const fa = 'product.future-archive.color.'
  const fd = 'product.future-debris.color.'
  return [
    { label: 'sys 背景由深到浅', paths: ['sys.color.bg.base', 'sys.color.bg.surface', 'sys.color.bg.raised'] },
    { label: 'sys 文字由淡到亮', paths: ['sys.color.text.muted', 'sys.color.text.secondary', 'sys.color.text.primary'] },
    { label: 'sys 线由弱到强', paths: ['sys.color.line.subtle', 'sys.color.line.strong'] },
    { label: 'archive 背景由深到浅', paths: [`${fa}bg`, `${fa}bgElev`, `${fa}bgElev2`] },
    { label: 'archive 文字由淡到亮', paths: [`${fa}textFaint`, `${fa}textDim`, `${fa}text`] },
    { label: 'debris 背景由深到浅', paths: [`${fd}bgBase`, `${fd}bgElev1`, `${fd}bgElev2`] },
    { label: 'debris 文字由淡到亮', paths: [`${fd}textFaint`, `${fd}textDim`, `${fd}text`] },
  ]
}

function checkHierarchies(hierarchies: Hierarchy[], colorOf: (path: string) => string): string[] {
  const errors: string[] = []
  for (const h of hierarchies) {
    const vals = h.paths.map(p => ({ p, l: relativeLuminance(colorOf(p)) }))
    const ascending = vals.every((v, i) => i === 0 || v.l > vals[i - 1]!.l)
    if (!ascending) {
      errors.push(
        `${h.label}：${vals.map(v => `${v.p}=${v.l.toFixed(4)}`).join(' < ')}（必须严格递增）`,
      )
    }
  }
  return errors
}

interface FocusRule {
  label: string
  focus: string
  forbidden: string[]
}

function buildFocusRules(): FocusRule[] {
  const fa = 'product.future-archive.color.'
  const fd = 'product.future-debris.color.'
  return [
    {
      label: 'sys focus 不得复用 action / feedback',
      focus: 'sys.color.focus.ring',
      forbidden: [
        'sys.color.action.primary',
        'sys.color.feedback.success',
        'sys.color.feedback.warning',
        'sys.color.feedback.danger',
      ],
    },
    {
      label: 'archive focus 不得复用强调/状态色',
      focus: `${fa}focus`,
      forbidden: [`${fa}teal`, `${fa}tealBright`, `${fa}amber`, `${fa}rust`],
    },
    {
      label: 'debris focus 不得复用玩法/状态色',
      focus: `${fd}focus`,
      forbidden: [`${fd}power`, `${fd}residue`, `${fd}accent`, `${fd}warn`, `${fd}ok`],
    },
  ]
}

function checkFocus(rules: FocusRule[], colorOf: (path: string) => string): string[] {
  const errors: string[] = []
  for (const rule of rules) {
    const focus = colorOf(rule.focus)
    for (const forbidden of rule.forbidden) {
      if (focus.toLowerCase() === colorOf(forbidden).toLowerCase()) {
        errors.push(`${rule.label}：${rule.focus} 与 ${forbidden} 同为 ${focus}`)
      }
    }
  }
  return errors
}

function runSelfTest(): number {
  console.log('[self-test] 用已知好坏数据断言对比度/层级/焦点检查会正确失败\n')
  const fake = new Map<string, string>([
    ['good.fg', '#FFFFFF'],
    ['good.bg', '#000000'],
    ['bad.fg', '#777777'],
    ['bad.bg', '#888888'],
    ['hier.a', '#111111'],
    ['hier.b', '#222222'],
    ['hier.c', '#333333'],
    ['focus', '#8AB4F8'],
    ['action', '#4FD1C5'],
  ])
  const colorOf = (p: string) => {
    const v = fake.get(p)
    if (!v) throw new Error(`self-test 缺 ${p}`)
    return v
  }

  const cases: Array<[string, () => boolean, string]> = [
    ['黑白对比 = 21:1', () => round2(contrast('#000000', '#FFFFFF')) === 21, 'WCAG 极值'],
    ['同色对比 = 1:1', () => round2(contrast('#777777', '#777777')) === 1, '同色必须为 1'],
    [
      '低对比 pair 会被报错',
      () =>
        checkPairs(
          [{ label: 'bad', fg: 'bad.fg', bg: 'bad.bg', kind: 'normal' }],
          colorOf,
        ).length === 1,
      '坏组合必须被检出',
    ],
    [
      '好对比 pair 不报错',
      () =>
        checkPairs(
          [{ label: 'good', fg: 'good.fg', bg: 'good.bg', kind: 'normal' }],
          colorOf,
        ).length === 0,
      '好组合不得误报',
    ],
    [
      '层级反序会被报错',
      () =>
        checkHierarchies(
          [{ label: 'reversed', paths: ['hier.c', 'hier.b', 'hier.a'] }],
          colorOf,
        ).length === 1,
      '亮度顺序必须被守',
    ],
    [
      'focus 与 action 同色会被报错',
      () =>
        checkFocus(
          [{ label: 'bad focus', focus: 'action', forbidden: ['action'] }],
          colorOf,
        ).length === 1,
      '焦点不得复用强调色',
    ],
    [
      'focus 与 action 不同色不报错',
      () =>
        checkFocus(
          [{ label: 'good focus', focus: 'focus', forbidden: ['action'] }],
          colorOf,
        ).length === 0,
      '不同色不得误报',
    ],
  ]

  let passed = 0
  for (const [name, fn, why] of cases) {
    const ok = fn()
    console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : `  ← ${why}`}`)
    if (ok) passed++
  }
  console.log(`\n[self-test] ${passed}/${cases.length} 通过`)
  return passed === cases.length ? 0 : 1
}

function main(): number {
  if (SELF_TEST) return runSelfTest()

  const loaded = loadTokens(DESIGN_ROOT)
  if (loaded.errors.length) {
    console.error('✗ token 源有错误，先修 token：')
    for (const e of loaded.errors) console.error(`  - ${e}`)
    return 1
  }

  const colorOf = (path: string) => getColor(loaded.tokens, path)
  const pairs = buildPairs()
  const hierarchies = buildHierarchies()
  const focusRules = buildFocusRules()

  const pairErrors = checkPairs(pairs, colorOf)
  const hierErrors = checkHierarchies(hierarchies, colorOf)
  const focusErrors = checkFocus(focusRules, colorOf)

  if (VERBOSE) {
    console.log('全部组合：')
    for (const p of pairs) {
      const r = round2(contrast(colorOf(p.fg), colorOf(p.bg)))
      console.log(
        `  ${r >= THRESHOLD[p.kind] ? '✓' : '✗'} ${String(r).padStart(6)}:1 (需 ≥${THRESHOLD[p.kind]})  ${p.label}`,
      )
    }
    console.log('')
  }

  console.log(
    `对比度审计 · ${pairs.length} 个组合（普通文字 ${pairs.filter(p => p.kind === 'normal').length} / 大字 ${pairs.filter(p => p.kind === 'large').length} / UI ${pairs.filter(p => p.kind === 'ui').length}）`,
  )

  const errors = [...pairErrors, ...hierErrors, ...focusErrors]
  if (errors.length) {
    console.error('\n✗ 未达标：')
    for (const e of errors) console.error(`  - ${e}`)
    return 1
  }

  const lowest = [...pairs]
    .map(p => ({ p, r: contrast(colorOf(p.fg), colorOf(p.bg)) }))
    .sort((a, b) => a.r - b.r)[0]!
  console.log(`✓ 全部 ${pairs.length} 个组合达 WCAG AA（最低：${lowest.p.label} = ${round2(lowest.r)}:1）`)
  console.log(`✓ ${hierarchies.length} 组层级亮度顺序正确`)
  console.log(`✓ ${focusRules.length} 组 focus 与强调/状态色分离`)
  return 0
}

process.exit(main())
