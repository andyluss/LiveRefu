#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PRODUCT = join(HERE, '..')
const WORKSPACE = join(PRODUCT, '..', '..')
const APP_TOKENS = join(WORKSPACE, 'design/tokens/dist/app/tokens.json')
const SKINS = join(PRODUCT, 'design/skins.json')
const OUT = join(PRODUCT, 'web/tokens.css')
const CHECK = process.argv.includes('--check')
const SELF_TEST = process.argv.includes('--self-test')

const REQUIRED = ['bg','bg2','surface','raised','text','muted','line','lineStrong','accent','onAccent','accentSoft','warning','danger','focus','key','keyOp','keyAccent','display']
const app = JSON.parse(readFileSync(APP_TOKENS, 'utf8'))
const source = JSON.parse(readFileSync(SKINS, 'utf8'))

function validate() {
  const errors = []
  if (!source.skins?.length) errors.push('至少一套皮肤')
  const ids = new Set()
  for (const s of source.skins || []) {
    if (!s.id || ids.has(s.id)) errors.push(`皮肤 id 缺失/重复：${s.id}`)
    ids.add(s.id)
    for (const k of REQUIRED) if (!s.palette?.[k]) errors.push(`${s.id} 缺少 ${k}`)
  }
  if (!ids.has(source.default)) errors.push(`默认皮肤不存在：${source.default}`)
  return errors
}

function hexToRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function luminance(hex) {
  const c = hexToRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
function contrast(a, b) {
  const A = luminance(a), B = luminance(b)
  return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05)
}

function generate() {
  const errors = validate()
  for (const s of source.skins) {
    const p = s.palette
    if (contrast(p.text, p.bg) < 4.5) errors.push(`${s.id} 正文对比度不足`)
    if (contrast(p.muted, p.bg) < 3) errors.push(`${s.id} 次要文字对比度不足`)
    if (contrast(p.accent, p.onAccent) < 3) errors.push(`${s.id} 行动色对比度不足`)
  }
  if (errors.length) throw new Error(errors.join('\n'))
  const colors = app.colors
  const lines = [
    '/* 由 products/calculator/tools/build-theme.js 生成；不要手改。 */',
    '/* 源：design/tokens/dist/app/tokens.json + products/calculator/design/skins.json */',
    ':root{',
    `  --app-bg:${colors['bg.base']};--app-surface:${colors['bg.surface']};--app-raised:${colors['bg.raised']};`,
    `  --app-text:${colors['text.primary']};--app-muted:${colors['text.muted']};--app-line:${colors['line.subtle']};--app-line-strong:${colors['line.strong']};`,
    `  --app-accent:${colors['action.primary']};--app-on-accent:${colors['action.onPrimary']};--app-focus:${colors['focus.ring']};`,
    `  --app-danger:${colors['feedback.danger']};--app-warning:${colors['feedback.warning']};--app-success:${colors['feedback.success']};`,
    `  --app-touch-min:${app.size.touch.min}px;--app-radius-control:${app.radius.control}px;--app-radius-panel:${app.radius.panel}px;`,
    `  --app-space-1:${app.space[0]}px;--app-space-2:${app.space[1]}px;--app-space-3:${app.space[2]}px;--app-space-4:${app.space[3]}px;--app-space-5:${app.space[4]}px;--app-space-6:${app.space[5]}px;`,
    `  --app-type-title:${app.type.find(t => t.token === 'title-1').size}px;--app-type-body:${app.type.find(t => t.token === 'body').size}px;--app-type-caption:${app.type.find(t => t.token === 'caption').size}px;--app-type-number:${app.type.find(t => t.token === 'number-lg').size}px;`,
    '}',
  ]
  for (const s of source.skins) {
    lines.push(`html[data-skin="${s.id}"]{`)
    for (const k of REQUIRED) lines.push(`  --calc-${k}:${s.palette[k]};`)
    lines.push('}')
  }
  lines.push(`/* default skin: ${source.default} */`)
  return lines.join('\n') + '\n'
}

if (SELF_TEST) {
  const errors = validate()
  for (const s of source.skins) {
    for (const k of ['text','muted','accent']) {
      if (contrast(s.palette[k], s.palette.bg) < (k === 'text' ? 4.5 : 3)) errors.push(`${s.id} ${k} contrast`)
    }
  }
  if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
  console.log(`✓ skins self-test: ${source.skins.length} 套皮肤，${REQUIRED.length} 个 color role`)
  process.exit(0)
}

try {
  const css = generate()
  if (CHECK) {
    if (!existsSync(OUT)) { console.error('✗ 缺少 web/tokens.css'); process.exit(1) }
    if (readFileSync(OUT, 'utf8') !== css) { console.error('✗ web/tokens.css 已过期，运行 node tools/build-theme.js'); process.exit(1) }
    console.log(`✓ tokens.css 与源一致（${(css.length / 1024).toFixed(1)} KB）`)
  } else {
    writeFileSync(OUT, css)
    console.log(`✓ 已生成 web/tokens.css（${(css.length / 1024).toFixed(1)} KB）`)
  }
} catch (e) {
  console.error(`✗ ${e.message}`)
  process.exit(1)
}
