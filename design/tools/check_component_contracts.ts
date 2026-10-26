#!/usr/bin/env node
/**
 * 组件契约闸门。
 *
 * 检查每个 design/components/*.md（README 除外）：
 *   1. 五节齐全：解剖 / 状态 / 键盘与无障碍 / Do / Don't / 跨端；
 *   2. 所有 --lr-* 引用都能在 token 源里找到；
 *   3. 不出现裸色值（#hex / rgb / rgba）或裸尺寸（NNpx）；
 *   4. 至少 5 个 token 引用；
 *   5. 状态小节覆盖 default / focus / disabled 三个关键词。
 *
 * 用法：
 *   node design/tools/check_component_contracts.ts
 *   node design/tools/check_component_contracts.ts --self-test
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import {
  DESIGN_ROOT,
  cssVar,
  loadTokens,
  productCssVar,
  type TokenMap,
} from './token_lib.ts'

const CONTRACTS = join(DESIGN_ROOT, 'components')
const COMPONENT_CSS = join(DESIGN_ROOT, 'kits/web/components.css')
const SELF_TEST = process.argv.includes('--self-test')

const REQUIRED_HEADINGS = [
  '## 一、解剖',
  '## 二、状态',
  '## 三、键盘与无障碍',
  "## 四、Do / Don't",
  '## 五、跨端',
]

const RAW_VALUE = /#[0-9A-Fa-f]{3,8}\b|\brgba?\(|\b\d+px\b/g

function knownCssVars(tokens: TokenMap): Set<string> {
  const set = new Set<string>()
  for (const path of tokens.keys()) {
    set.add(cssVar(path))
    if (path.startsWith('product.')) set.add(productCssVar(path))
  }
  return set
}

export function checkContract(text: string, known: Set<string>): string[] {
  const errors: string[] = []

  for (const heading of REQUIRED_HEADINGS) {
    if (!text.includes(heading)) errors.push(`缺少小节：${heading}`)
  }

  const refs = [...new Set(text.match(/--lr-[a-z0-9-]+/g) ?? [])]
  if (refs.length < 5) errors.push(`token 引用不足：${refs.length} 个（至少 5 个）`)
  for (const ref of refs) {
    if (!known.has(ref)) errors.push(`未知 token：${ref}`)
  }

  const raw = [...new Set(text.match(RAW_VALUE) ?? [])]
  for (const value of raw) {
    errors.push(`裸值：${value}（改用 --lr-*）`)
  }

  for (const state of ['default', 'focus', 'disabled']) {
    if (!new RegExp(`\\b${state}\\b`, 'i').test(text)) {
      errors.push(`状态缺少：${state}`)
    }
  }

  return errors
}

export function checkComponentCss(text: string, known: Set<string>): string[] {
  const errors: string[] = []
  const refs = [...new Set(text.match(/--lr-[a-z0-9-]+/g) ?? [])]
  if (refs.length < 10) errors.push(`CSS token 引用不足：${refs.length} 个（至少 10 个）`)
  for (const ref of refs) {
    if (!known.has(ref)) errors.push(`未知 token：${ref}`)
  }
  const raw = [...new Set(text.match(RAW_VALUE) ?? [])]
  for (const value of raw) errors.push(`裸值：${value}（改用 --lr-*）`)
  for (const selector of ['.lr-button', '.lr-panel', '.lr-field']) {
    if (!text.includes(selector)) errors.push(`缺少组件选择器：${selector}`)
  }
  return errors
}

function runSelfTest(): number {
  console.log('[self-test] 组件契约检查器')
  const known = new Set([
    '--lr-color-bg-surface',
    '--lr-color-text-primary',
    '--lr-color-focus-ring',
    '--lr-color-line-strong',
    '--lr-size-touch-min',
  ])
  const valid = `# X · 契约

## 一、解剖
--lr-color-bg-surface --lr-color-text-primary
## 二、状态
default / focus / disabled
## 三、键盘与无障碍
--lr-color-focus-ring
## 四、Do / Don't
--lr-color-line-strong
## 五、跨端
--lr-size-touch-min
`

  const cases: Array<[string, boolean, string]> = [
    ['完整契约 → 通过', checkContract(valid, known).length === 0, '好契约不得误报'],
    [
      '缺小节 → 报错',
      checkContract(valid.replace('## 五、跨端', ''), known).some(e => e.includes('缺少小节')),
      '五节必须齐全',
    ],
    [
      '未知 token → 报错',
      checkContract(`${valid}\n--lr-color-nope`, known).some(e => e.includes('未知 token')),
      '拼错 token 必须被拦住',
    ],
    [
      '裸 hex → 报错',
      checkContract(`${valid}\n#FFFFFF`, known).some(e => e.includes('裸值')),
      '契约不得写裸色值',
    ],
    [
      '裸 px → 报错',
      checkContract(`${valid}\n44px`, known).some(e => e.includes('裸值')),
      '契约不得写裸尺寸',
    ],
    [
      '缺 focus 状态 → 报错',
      checkContract(valid.replace(/focus/gi, 'hover'), known).some(e => e.includes('状态缺少')),
      '状态必须覆盖 focus',
    ],
    [
      '组件 CSS 裸 px → 报错',
      checkComponentCss('.lr-button{min-height:40px}', known).some(e => e.includes('裸值')),
      'CSS 不得写裸尺寸',
    ],
    [
      '组件 CSS 未知 token → 报错',
      checkComponentCss('.lr-button{color:var(--lr-color-nope)}', known).some(e =>
        e.includes('未知 token'),
      ),
      'CSS 的 token 必须存在',
    ],
  ]

  let passed = 0
  for (const [name, ok, why] of cases) {
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
  const known = knownCssVars(loaded.tokens)

  const files = readdirSync(CONTRACTS)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map(f => join(CONTRACTS, f))
    .filter(f => statSync(f).isFile())

  if (files.length === 0) {
    console.error('✗ 没有找到组件契约（design/components/*.md）')
    return 1
  }

  let failures = 0
  console.log(`组件契约检查 · ${files.length} 个`)
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    const errors = checkContract(text, known)
    const label = relative(DESIGN_ROOT, file)
    if (errors.length) {
      failures++
      console.error(`\n✗ ${label}（${errors.length} 项）`)
      for (const e of errors) console.error(`  - ${e}`)
    } else {
      const refs = new Set(text.match(/--lr-[a-z0-9-]+/g) ?? []).size
      console.log(`  ✓ ${label}（${refs} 个 token 引用）`)
    }
  }

  if (failures) {
    console.error(`\n✗ ${failures}/${files.length} 个契约不合规`)
    return 1
  }

  const cssErrors = checkComponentCss(readFileSync(COMPONENT_CSS, 'utf8'), known)
  if (cssErrors.length) {
    console.error(`\n✗ 组件 CSS 不合规（${cssErrors.length} 项）：`)
    for (const e of cssErrors) console.error(`  - ${e}`)
    return 1
  }
  console.log(`  ✓ kits/web/components.css`)

  console.log(`\n✓ ${files.length} 个组件契约 + 组件 CSS 全部合规`)
  return 0
}

process.exit(main())
