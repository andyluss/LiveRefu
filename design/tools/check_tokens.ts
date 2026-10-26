#!/usr/bin/env node
/**
 * Token 结构与取值校验（第一道闸门）。
 *
 * 检查：
 *   1. 每个 token 都有 $value / $type，类型合法；
 *   2. 颜色是 #RRGGBB、尺寸是 NNpx、时长是 NNms、缓动是 4 个 0–1 的 x；
 *   3. 别名可解析、无环、目标存在、类型一致；
 *   4. 必需的系统语义齐全；UI 恰好 5 级、Editorial 恰好 7 级；
 *   5. 间距阶梯恰好 4/8/12/16/24/32；
 *   6. 两个产品风格卡存在，且产品颜色层只允许 color。
 *
 * 用法：
 *   node design/tools/check_tokens.ts
 *   node design/tools/check_tokens.ts --self-test
 */

import {
  DESIGN_ROOT,
  loadTokens,
  resolveAliases,
  validateStructure,
  validateTokenValue,
  type Token,
  type TokenMap,
  type TokenType,
} from './token_lib.ts'

const SELF_TEST = process.argv.includes('--self-test')

function mk(path: string, type: TokenType, raw: unknown): Token {
  return { path, type, value: raw, raw, file: '<self-test>' }
}

function runSelfTest(real: TokenMap): number {
  console.log('[self-test] 用故意坏掉的 token 断言检查器会失败，并断言错误类型\n')
  const cases: Array<[string, () => boolean, string]> = []

  const badColor = validateTokenValue(mk('t.color', 'color', '#12345'))
  cases.push(['坏颜色 #12345 → 报“颜色值”', () => !!badColor && badColor.includes('颜色值'), '不得把 5 位色值当合法'])

  const badDimension = validateTokenValue(mk('t.dim', 'dimension', '4'))
  cases.push(['缺 px 的尺寸 → 报“尺寸”', () => !!badDimension && badDimension.includes('尺寸'), '尺寸必须有单位'])

  const badWeight = validateTokenValue(mk('t.weight', 'fontWeight', '700'))
  cases.push(['字重是字符串 → 报“字重”', () => !!badWeight && badWeight.includes('字重'), '字重必须是 number'])

  // 删除一个必需系统 token，结构校验必须报“缺少必需”
  const missing = new Map(real)
  missing.delete('sys.color.bg.base')
  const missingErrors = validateStructure(missing)
  cases.push([
    '删掉 sys.color.bg.base → 报“缺少必需”',
    () => missingErrors.some(e => e.includes('缺少必需')),
    '必需语义缺失必须被拦住',
  ])

  // UI 少一级
  const shortUi = new Map(real)
  shortUi.delete('sys.type.ui.caption.size')
  const shortErrors = validateStructure(shortUi)
  cases.push([
    'UI 少一级 → 报“UI 字号”',
    () => shortErrors.some(e => e.includes('UI 字号')),
    '字号阶梯不得被悄悄增删',
  ])

  // 别名成环
  const cycle: TokenMap = new Map()
  cycle.set('ref.a', mk('ref.a', 'color', '{ref.b}'))
  cycle.set('ref.b', mk('ref.b', 'color', '{ref.a}'))
  const cycleErrors: string[] = []
  resolveAliases(cycle, cycleErrors, [])
  cases.push([
    '别名成环 a→b→a → 报“别名成环”',
    () => cycleErrors.some(e => e.includes('别名成环')),
    '环必须被检出，不能栈溢出',
  ])

  // 别名目标不存在
  const dangling: TokenMap = new Map()
  dangling.set('ref.a', mk('ref.a', 'color', '{ref.nope}'))
  const danglingErrors: string[] = []
  resolveAliases(dangling, danglingErrors, [])
  cases.push([
    '别名指向不存在 → 报“别名目标不存在”',
    () => danglingErrors.some(e => e.includes('别名目标不存在')),
    '拼错路径必须被拦住',
  ])

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
  const loaded = loadTokens(DESIGN_ROOT)

  if (SELF_TEST) {
    const code = runSelfTest(loaded.tokens)
    if (code !== 0) return code
    if (loaded.errors.length) {
      console.error('✗ 真实 token 源本身有错误，自检不能替代真实校验：')
      for (const e of loaded.errors) console.error(`  - ${e}`)
      return 1
    }
    console.log('\n✓ 自检通过，且真实 token 源无错误')
    return 0
  }

  const refCount = [...loaded.tokens.keys()].filter(p => p.startsWith('ref.')).length
  const sysCount = [...loaded.tokens.keys()].filter(p => p.startsWith('sys.')).length
  const productCount = [...loaded.tokens.keys()].filter(p => p.startsWith('product.')).length

  console.log(`Token 校验 · ${loaded.tokens.size} 个 token（ref ${refCount} / sys ${sysCount} / product ${productCount}）`)
  for (const w of loaded.warnings) console.log(`  [WARN] ${w}`)

  if (loaded.errors.length) {
    console.error('\n✗ Token 校验失败：')
    for (const e of loaded.errors) console.error(`  - ${e}`)
    return 1
  }

  console.log('✓ 结构、类型、别名、字阶、间距、产品层全部合规')
  return 0
}

process.exit(main())
