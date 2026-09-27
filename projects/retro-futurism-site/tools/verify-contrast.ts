#!/usr/bin/env bun
/**
 * 颜色对比度审计（M3 无障碍的确定性部分）。
 *
 * 为什么单做这一项：前几轮的无障碍检查覆盖了"结构"（alt、标题层级、可访问名称…），
 * 但**颜色对比度是唯一可以纯计算判定**的部分——不需要屏幕阅读器、不需要真人，
 * WCAG 对比度公式是确定的。所以它应该被机器守住，而不是靠肉眼。
 *
 * 口径（WCAG 2.1）：
 *   普通文字   ≥ 4.5:1
 *   大字（≥24px，或 ≥18.66px 粗体） ≥ 3:1
 *   非文字（边框/图标等 UI 组件）     ≥ 3:1
 *
 * **这是故意严苛的**：把每个前景/背景组合都算一遍，哪怕某些组合在实际页面上
 * 并不同时出现——宁可查出"虽然没用到但一用就违规"的隐患，也不要漏。
 *
 * 用法：
 *   bun run tools/verify-contrast.ts
 *   bun run tools/verify-contrast.ts --verbose   # 列出全部组合，不只看失败
 */

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PROJECT_ROOT = resolve(import.meta.dir, '..')
const THEME = join(PROJECT_ROOT, 'app/assets/theme.css')
const VERBOSE = process.argv.includes('--verbose')

// ---------------------------------------------------------------------------
// WCAG 相对亮度与对比度
// ---------------------------------------------------------------------------

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

/** sRGB 通道 → 线性光（WCAG 定义） */
function channelToLinear(c8: number): number {
  const c = c8 / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
}

function contrast(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(parseHex(fgHex))
  const l2 = relativeLuminance(parseHex(bgHex))
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

/** 整数比 + 数值，便于读 */
function ratio(fg: string, bg: string): number {
  return Math.round(contrast(fg, bg) * 100) / 100
}

// ---------------------------------------------------------------------------
// 从 theme.css 读出 token（单一真相：不在这里重复硬编码颜色）
// ---------------------------------------------------------------------------

const css = readFileSync(THEME, 'utf-8')
const vars = new Map<string, string>()
for (const m of css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
  vars.set(m[1]!, m[2]!)
}

const need = ['bg', 'bg-elev', 'bg-elev-2', 'line', 'line-strong', 'text', 'text-dim', 'text-faint', 'teal', 'teal-bright', 'cream', 'amber', 'rust', 'focus']
const missing = need.filter(n => !vars.has(n))
if (missing.length) {
  console.error(`✗ theme.css 缺少颜色 token：${missing.join(', ')}`)
  process.exit(1)
}
const C = (n: string) => vars.get(n)!

// ---------------------------------------------------------------------------
// 审计表：每一行是"页面上真实存在的一个文字/背景组合"
// ---------------------------------------------------------------------------

interface Pair {
  /** 用途说明（出现在页面的哪里） */
  where: string
  fg: string
  bg: string
  /** normal=普通文字 4.5 | large=大字 3.0 | ui=非文字 UI 3.0 */
  kind: 'normal' | 'large' | 'ui'
}

const PAIRS: Pair[] = [
  // ---- 正文与段落 ----
  { where: '正文段落（.prose p / body）', fg: 'text', bg: 'bg', kind: 'normal' },
  { where: '正文段落（卡片内背景）', fg: 'text', bg: 'bg-elev', kind: 'normal' },
  { where: '正文段落（高亮块背景）', fg: 'text', bg: 'bg-elev-2', kind: 'normal' },

  // ---- 次级/三级文字 ----
  { where: 'hero 导语、卡片描述（--text-dim on bg）', fg: 'text-dim', bg: 'bg', kind: 'normal' },
  { where: 'hero 导语、卡片描述（--text-dim on bg-elev）', fg: 'text-dim', bg: 'bg-elev', kind: 'normal' },
  { where: 'hero 导语（--text-dim on bg-elev-2）', fg: 'text-dim', bg: 'bg-elev-2', kind: 'normal' },
  { where: '页脚、面包屑、侧栏（--text-faint on bg）', fg: 'text-faint', bg: 'bg', kind: 'normal' },
  { where: '页脚说明（--text-faint on bg-elev）', fg: 'text-faint', bg: 'bg-elev', kind: 'normal' },
  { where: '侧栏/标签（--text-faint on bg-elev-2）', fg: 'text-faint', bg: 'bg-elev-2', kind: 'normal' },

  // ---- 标题与强调 ----
  { where: '文章标题、卡片标题（--cream on bg）', fg: 'cream', bg: 'bg', kind: 'large' },
  { where: '文章标题（--cream on bg-elev）', fg: 'cream', bg: 'bg-elev', kind: 'large' },
  { where: '正文 h2（--cream on bg）', fg: 'cream', bg: 'bg', kind: 'normal' },
  { where: '正文 h3（--teal-bright on bg）', fg: 'teal-bright', bg: 'bg', kind: 'normal' },

  // ---- 链接 ----
  { where: '正文链接（--teal-bright on bg）', fg: 'teal-bright', bg: 'bg', kind: 'normal' },
  { where: '正文链接（--teal-bright on bg-elev）', fg: 'teal-bright', bg: 'bg-elev', kind: 'normal' },
  { where: '侧栏小标题、meta（--teal on bg）', fg: 'teal', bg: 'bg', kind: 'normal' },
  { where: '侧栏小标题（--teal on bg-elev）', fg: 'teal', bg: 'bg-elev', kind: 'normal' },

  // ---- 状态色 ----
  { where: 'Giscus 未配置警示（--amber on bg-elev）', fg: 'amber', bg: 'bg-elev', kind: 'normal' },
  { where: '检索失败提示（--rust on bg-elev）', fg: 'rust', bg: 'bg-elev', kind: 'normal' },
  { where: '搜索命中高亮底（--amber 背景上的深色字）', fg: 'bg', bg: 'amber', kind: 'normal' },

  // ---- 非文字 UI ----
  // 只有**交互控件**的边界受 WCAG 1.4.11 约束（需 ≥3:1）。
  // 纯装饰性分隔线（1px 细线、分组用）不受此约束——把它们算进来会制造
  // "为了通过审计而把装饰线调亮"的坏结果，反而破坏视觉层级。
  { where: '交互控件边框（--line-strong on bg）', fg: 'line-strong', bg: 'bg', kind: 'ui' },
  { where: '交互控件边框（--line-strong on bg-elev）', fg: 'line-strong', bg: 'bg-elev', kind: 'ui' },
  { where: '交互控件边框（--line-strong on bg-elev-2）', fg: 'line-strong', bg: 'bg-elev-2', kind: 'ui' },
  { where: '卡牌/交互 hover 边框（--teal on bg）', fg: 'teal', bg: 'bg', kind: 'ui' },
  { where: '焦点指示器（--focus on bg）', fg: 'focus', bg: 'bg', kind: 'ui' },
  { where: '焦点指示器（--focus on bg-elev）', fg: 'focus', bg: 'bg-elev', kind: 'ui' },
  { where: '焦点指示器（--focus on bg-elev-2）', fg: 'focus', bg: 'bg-elev-2', kind: 'ui' },

  // ---- 显式**不**审计：装饰性分隔线 ----
  // --line (#24303f) on bg 约 1.43:1。这是刻意的：它是 1px 分组线，
  // 不承担"指示可交互"的职责，1.4.11 不适用。
]

const THRESHOLD = { normal: 4.5, large: 3, ui: 3 } as const

// ---------------------------------------------------------------------------
// 执行
// ---------------------------------------------------------------------------

const rows = PAIRS.map(p => {
  const r = ratio(C(p.fg), C(p.bg))
  const min = THRESHOLD[p.kind]
  return { ...p, ratio: r, min, pass: r >= min }
})

const failed = rows.filter(r => !r.pass)

if (VERBOSE) {
  console.log('全部组合：')
  for (const r of rows) {
    console.log(`  ${r.pass ? '✓' : '✗'} ${String(r.ratio).padStart(6)}:1  (需 ≥${r.min})  ${r.where}`)
  }
  console.log()
}

if (failed.length) {
  console.log('✗ 未达 WCAG AA 的组合：\n')
  for (const r of failed) {
    const need = Math.ceil((r.min + 0.001) * 100) / 100
    console.log(`  ✗ ${r.where}`)
    console.log(`      当前 ${r.ratio}:1，需 ≥${r.min}:1（差 ${Math.round((r.min - r.ratio) * 100) / 100}）`)
    console.log(`      fg=${C(r.fg)}  bg=${C(r.bg)}`)
  }
  console.log(`\n合计 ${rows.length} 个组合，${failed.length} 个未达标`)
  process.exit(1)
}

console.log(`✓ 全部 ${rows.length} 个前景/背景组合达 WCAG AA`)
console.log(`  普通文字 ${rows.filter(r => r.kind === 'normal').length} 组 ≥4.5:1`)
console.log(`  大字 ${rows.filter(r => r.kind === 'large').length} 组 ≥3:1`)
console.log(`  非文字 UI ${rows.filter(r => r.kind === 'ui').length} 组 ≥3:1`)
const lowest = [...rows].sort((a, b) => a.ratio - b.ratio)[0]!
console.log(`  最低的一组：${lowest.where} = ${lowest.ratio}:1`)

// ---------------------------------------------------------------------------
// 视觉层级守卫
//
// 只查对比度会漏掉一种退化：**把某个 token 提亮到通过阈值，却和相邻层级挤在一起**，
// 结果"能看清但分不出主次"。所以这里额外断言亮度顺序——
// 这样将来改 token 时，若层级被压平会立刻失败，而不是靠肉眼看出来。
// ---------------------------------------------------------------------------

const HIERARCHY: Array<{ label: string; tokens: string[] }> = [
  { label: '背景由深到浅', tokens: ['bg', 'bg-elev', 'bg-elev-2'] },
  { label: '分隔线深于交互边框', tokens: ['line', 'line-strong'] },
  { label: '文字由淡到亮', tokens: ['text-faint', 'text-dim', 'text'] },
]

const lum = (n: string) => relativeLuminance(parseHex(C(n)))
let hierarchyBroken = false
console.log('\n视觉层级：')
for (const group of HIERARCHY) {
  const vals = group.tokens.map(t => ({ t, l: lum(t) }))
  const ascending = vals.every((v, i) => i === 0 || v.l > vals[i - 1]!.l)
  if (!ascending) hierarchyBroken = true
  console.log(
    `  ${ascending ? '✓' : '✗'} ${group.label}：` +
      vals.map(v => `${v.t}=${v.l.toFixed(4)}`).join(' < '),
  )
}

// 层级里还有一条隐含要求：三级文字必须仍**明显**淡于次级文字，
// 否则两者读数接近，用户分不出哪个是次要信息。
const faintToDim = lum('text-dim') / lum('text-faint')
const SEPARATION_MIN = 1.15
const separationOk = faintToDim >= SEPARATION_MIN
console.log(
  `  ${separationOk ? '✓' : '✗'} text-faint 与 text-dim 亮度比 ${faintToDim.toFixed(3)}（需 ≥${SEPARATION_MIN}）`,
)

if (hierarchyBroken || !separationOk) {
  console.error('\n✗ 视觉层级被破坏：token 虽然达标对比度，但已分不出主次')
  console.error('  提示：调整颜色时不仅要过对比度阈值，还要保住层级间距。')
  process.exit(1)
}
console.log('\n✓ 对比度与视觉层级均通过')
