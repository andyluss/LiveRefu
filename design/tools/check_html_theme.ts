#!/usr/bin/env node
/**
 * R-016 生成式 HTML 三态检查器。
 *
 * 检查：
 *   1. <html> 存在，统一使用 lrds-theme；
 *   2. head 内联预绘制脚本先于样式表；
 *   3. system / light / dark 三态控件齐全且顺序正确；
 *   4. 控件有 aria-pressed；
 *   5. 有 prefers-color-scheme、data-theme / dataset.theme、color-scheme；
 *   6. 有打印浅色规则；
 *   7. 未使用页面级 theme localStorage key。
 *
 * 用法：
 *   node design/tools/check_html_theme.ts                     # 检查受管页面
 *   node design/tools/check_html_theme.ts path/a.html ...     # 检查指定页面
 *   node design/tools/check_html_theme.ts --self-test
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../..')
const SELF_TEST = process.argv.includes('--self-test')
const args = process.argv.slice(2).filter((a) => a !== '--self-test')

const MANAGED = [
  'HUB.html',
  'design/HUB.html',
  'design/GUIDE.html',
  'games/refu-game-001/HUB.html',
  'games/refu-game-001/GUIDE.html',
  'games/future-debris/briefing/HUB.html',
  'games/future-debris/briefing/GUIDE.html',
  ...spacetimePages(),
  ...threeDPages(),
  ...slowGoodPages(),
]

function spacetimePages(): string[] {
  const dir = join(ROOT, 'design/lab/spacetime')
  const pages = ['design/lab/spacetime/index.html']
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && e.name !== '3d' && existsSync(join(dir, e.name, 'index.html'))) {
      pages.push(`design/lab/spacetime/${e.name}/index.html`)
    }
  }
  return pages
}

function threeDPages(): string[] {
  const dir = join(ROOT, 'design/lab/spacetime/3d')
  const pages = ['design/lab/spacetime/3d/index.html']
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && existsSync(join(dir, e.name, 'index.html'))) {
      pages.push(`design/lab/spacetime/3d/${e.name}/index.html`)
    }
  }
  return pages
}

function slowGoodPages(): string[] {
  const dir = join(ROOT, 'design/lab/spacetime/慢好三生Demo')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.html'))
    .sort()
    .map((f) => `design/lab/spacetime/慢好三生Demo/${f}`)
}

function philosophyPages(): string[] {
  const dir = join(ROOT, 'design/philosophy/html')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.html'))
    .sort()
    .map((f) => `design/philosophy/html/${f}`)
}

export function validate(text: string, linkedCss = ''): string[] {
  const errors: string[] = []
  const styleText = `${text}\n${linkedCss}`
  if (!/<html[\s>]/i.test(text)) errors.push('缺少 <html>')
  if (!/lrds-theme/.test(text)) errors.push('未使用统一存储键 lrds-theme')
  if (!/prefers-color-scheme/.test(text)) errors.push('缺少 prefers-color-scheme 响应')
  if (!/aria-pressed/.test(text)) errors.push('三态控件缺少 aria-pressed')
  if (!/color-scheme\s*:/i.test(styleText)) errors.push('缺少 color-scheme')
  if (!/@media\s+print/i.test(styleText)) errors.push('缺少 @media print 浅色规则')
  if (!/(?:dataset\.theme|data-theme(?:\s|=|>))/i.test(text)) errors.push('未设置 data-theme')

  const attrs = [...text.matchAll(/data-theme-(?:choice|set)=["'](system|light|dark)["']/g)].map((m) => m[1] as 'system' | 'light' | 'dark')
  for (const mode of ['system', 'light', 'dark'] as const) {
    if (!attrs.includes(mode)) errors.push(`缺少三态控件：${mode}`)
  }
  const first = new Map<string, number>()
  for (const m of text.matchAll(/data-theme-(?:choice|set)=["'](system|light|dark)["']/g)) {
    if (!first.has(m[1])) first.set(m[1], m.index ?? 0)
  }
  if (first.has('system') && first.has('light') && first.has('dark')) {
    const order = ['system', 'light', 'dark'].map((m) => first.get(m)!)
    if (!(order[0] < order[1] && order[1] < order[2])) errors.push('三态控件顺序必须是 system → light → dark')
  }

  const themePos = text.search(/lrds-theme/)
  const cssPositions = [text.search(/<style[\s>]/i), text.search(/<link\b[^>]*rel=["']stylesheet["']/i)].filter((n) => n >= 0)
  if (themePos < 0) {
    // already reported
  } else if (cssPositions.length && themePos > Math.min(...cssPositions)) {
    errors.push('预绘制脚本必须早于样式表/内联 CSS')
  }

  for (const m of text.matchAll(/localStorage\.(?:getItem|setItem)\(\s*["']([^"']+)["']/g)) {
    if (m[1].includes('theme') && m[1] !== 'lrds-theme') errors.push(`使用了页面级主题键：${m[1]}`)
  }

  return errors
}

function linkedCss(abs: string, text: string): string {
  let css = ''
  for (const m of text.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = m[1]
    if (/^(?:https?:)?\/\//i.test(href) || href.startsWith('data:')) continue
    const p = resolve(dirname(abs), href.split('#')[0].split('?')[0])
    if (existsSync(p)) css += `\n${readFileSync(p, 'utf8')}`
    else css += `\n/* missing stylesheet: ${href} */`
  }
  return css
}

function checkFiles(files: string[]): number {
  let failures = 0
  for (const file of files) {
    const abs = resolve(ROOT, file)
    let text = ''
    try {
      text = readFileSync(abs, 'utf8')
    } catch (e) {
      console.error(`✗ ${file}\n  · 读取失败: ${(e as Error).message}`)
      failures++
      continue
    }
    const errors = validate(text, linkedCss(abs, text))
    if (errors.length) {
      failures++
      console.error(`✗ ${file}`)
      for (const err of errors) console.error(`  · ${err}`)
    } else {
      console.log(`✓ ${file}`)
    }
  }
  return failures
}

function runSelfTest(): number {
  const good = `<!doctype html><html><head>
<script>var KEY='lrds-theme';localStorage.getItem(KEY);document.documentElement.dataset.theme='light';matchMedia('(prefers-color-scheme: dark)')</script>
<style>:root{color-scheme:light}@media print{body{background:#fff}}</style></head>
<body><button data-theme-choice="system" aria-pressed="true">系统</button><button data-theme-choice="light" aria-pressed="false">浅色</button><button data-theme-choice="dark" aria-pressed="false">深色</button></body></html>`
  const cases: Array<[string, boolean, string]> = [
    ['完整页面通过', validate(good).length === 0, '不得误报'],
    ['缺 light 控件被拦住', validate(good.replace('data-theme-choice="light" aria-pressed="false"', '')).some((e) => e.includes('light')), '三态必须齐全'],
    ['缺 prefers-color-scheme 被拦住', validate(good.replace('prefers-color-scheme', 'prefers-reduced-motion')).some((e) => e.includes('prefers-color-scheme')), '系统态响应必须存在'],
    ['缺打印规则被拦住', validate(good.replace('@media print{body{background:#fff}}', '')).some((e) => e.includes('print')), '打印浅色必须存在'],
    ['脚本晚于样式被拦住', validate(good.replace('<script>', '<style>x{}</style><script>')).some((e) => e.includes('预绘制')), '预绘制必须先于 CSS'],
    ['页面级 theme key 被拦住', validate(good.replace("localStorage.getItem(KEY)", "localStorage.getItem('page-theme')")).some((e) => e.includes('页面级')), '不得新增页面级 key'],
  ]
  let failed = 0
  for (const [name, pass, why] of cases) {
    if (pass) console.log(`✓ self-test: ${name}`)
    else { failed++; console.error(`✗ self-test: ${name}（${why}）`) }
  }
  return failed
}

if (SELF_TEST) {
  const failed = runSelfTest()
  if (failed) process.exit(1)
  console.log('\n✓ R-016 检查器自检通过')
  process.exit(0)
}

const files = args.length ? args : [...MANAGED, ...philosophyPages()]
const failures = checkFiles(files)
if (failures) {
  console.error(`\n✗ R-016 检查失败：${failures}/${files.length} 个页面不合规`)
  process.exit(1)
}
console.log(`\n✓ R-016 检查通过：${files.length} 个受管页面`)
